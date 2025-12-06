import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Registration } from '../models/Registration';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Get all registrations (admin only)
router.get('/', authenticate, requireAdmin, async (_req: Request, res: Response) => {
    try {
        const registrations = await Registration.find()
            .populate('userId', 'email firstName lastName')
            .sort({ createdAt: -1 });

        res.json(registrations);
    } catch (error) {
        console.error('Error fetching registrations:', error);
        res.status(500).json({ error: 'Failed to fetch registrations' });
    }
});

// Get user's own registrations
router.get('/my-registrations', authenticate, async (req: Request, res: Response) => {
    try {
        const registrations = await Registration.find({ userId: req.user!.userId })
            .sort({ createdAt: -1 });

        res.json(registrations);
    } catch (error) {
        console.error('Error fetching user registrations:', error);
        res.status(500).json({ error: 'Failed to fetch registrations' });
    }
});

// Get user's latest registration
router.get('/latest', authenticate, async (req: Request, res: Response) => {
    try {
        let registration = await Registration.findOne({ userId: req.user!.userId })
            .sort({ createdAt: -1 });

        // If not found by userId, try finding by email (in case user account was recreated)
        if (!registration && req.user!.email) {
            registration = await Registration.findOne({ email: req.user!.email })
                .sort({ createdAt: -1 });

            // If found by email, update the userId to link it to the current user
            if (registration) {
                registration.userId = req.user!.userId as any;
                await registration.save();
            }
        }

        if (!registration) {
            res.status(404).json({ error: 'No registration found' });
            return;
        }

        res.json(registration);
    } catch (error) {
        console.error('Error fetching latest registration:', error);
        res.status(500).json({ error: 'Failed to fetch registration' });
    }
});

// Create registration
// Create registration (Simplified Initial Signup)
router.post(
    '/',
    authenticate,
    [
        body('organizationName').trim().notEmpty(),
        body('firstName').trim().notEmpty(),
        body('lastName').trim().notEmpty(),
        body('email').isEmail().normalizeEmail({ gmail_remove_subaddress: false }),
        body('phone').optional().trim(),
        body('type').isIn(['Exhibitor', 'Sponsor', 'Both']),
    ],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const registration = await Registration.create({
                ...req.body,
                userId: req.user!.userId,
                // sectionStatus will be initialized by default values in schema
            });

            res.status(201).json(registration);
        } catch (error) {
            console.error('Error creating registration:', error);
            res.status(500).json({ error: 'Failed to create registration' });
        }
    }
);

// Export to QuickBooks (Admin only)
router.get('/export/quickbooks', authenticate, requireAdmin, async (_req: Request, res: Response) => {
    try {
        // Filter out registrations that already have an invoice number
        const registrations = await Registration.find({
            $or: [
                { invoiceNumber: { $exists: false } },
                { invoiceNumber: null },
                { invoiceNumber: '' }
            ]
        }).sort({ createdAt: -1 });

        // CSV Header
        let csv = 'Organization Name,First Name,Last Name,Email,Phone,Line 1,City,State,Postal Code,Notes\n';

        registrations.forEach(r => {
            // Calculate Invoice Amount
            const base = 200;
            // "Extra Site" logic: $100 for each tent beyond the first one (assuming 1 is included)
            // Using max(0, ...) to ensure no negative cost if 0 tents
            const extraSiteCost = Math.max(0, (r.numTents || 0) - 1) * 100;
            const tablesCost = (r.numTables || 0) * 20;
            const chairsCost = (r.numChairs || 0) * 5;
            const total = base + extraSiteCost + tablesCost + chairsCost;

            const calculationNotes = `Total: $${total} (Base: $200, Extra Sites: $${extraSiteCost}, Tables: $${tablesCost}, Chairs: $${chairsCost})`;

            // Escape fields for CSV
            const escape = (field: string | undefined) => {
                if (!field) return '';
                const stringField = String(field);
                if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
                    return `"${stringField.replace(/"/g, '""')}"`;
                }
                return stringField;
            };

            csv += `${escape(r.organizationName)},${escape(r.firstName)},${escape(r.lastName)},${escape(r.email)},${escape(r.phone)},${escape(r.address)},${escape(r.city)},${escape(r.state)},${escape(r.zip)},${escape(calculationNotes)}\n`;
        });

        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename="vegfest_export_quickbooks.csv"');
        res.send(csv);

    } catch (error) {
        console.error('Error exporting to QuickBooks:', error);
        res.status(500).json({ error: 'Failed to export to QuickBooks' });
    }
});

// Update invoice number (Admin only)
router.patch(
    '/:id/invoice',
    authenticate,
    requireAdmin,
    [body('invoiceNumber').trim()],
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { invoiceNumber } = req.body;

            const registration = await Registration.findByIdAndUpdate(
                id,
                { invoiceNumber },
                { new: true }
            );

            if (!registration) {
                res.status(404).json({ error: 'Registration not found' });
                return;
            }

            res.json(registration);
        } catch (error) {
            console.error('Error updating invoice number:', error);
            res.status(500).json({ error: 'Failed to update invoice number' });
        }
    }
);

// Update registration (for saving sections)
// Modified to prevent regular users from updating invoiceNumber

router.patch(
    '/:id',
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            // Prevent updating sensitive fields via this endpoint
            delete updates.userId;
            delete updates.createdAt;
            delete updates.updatedAt;

            // Protect invoiceNumber from being updated here by regular users
            if (req.user?.role !== 'ADMIN') {
                delete updates.invoiceNumber;
            }

            // Protect status and websiteStatus from being updated here by regular users.
            if (req.user?.role !== 'ADMIN') {
                delete updates.status;
                delete updates.websiteStatus;
            }

            const registration = await Registration.findOneAndUpdate(
                { _id: id, userId: req.user!.userId }, // Ensure user owns the registration
                { $set: updates },
                { new: true, runValidators: true }
            );

            if (!registration) {
                res.status(404).json({ error: 'Registration not found' });
                return;
            }

            res.json(registration);
        } catch (error) {
            console.error('Error updating registration:', error);
            res.status(500).json({ error: 'Failed to update registration' });
        }
    }
);

// Submit registration (change status to Pending)
router.post(
    '/:id/submit',
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const registration = await Registration.findOne({
                _id: id,
                userId: req.user!.userId
            });

            if (!registration) {
                res.status(404).json({ error: 'Registration not found' });
                return;
            }

            // Optional: Validate that all sections are complete before allowing submission
            // For now, we'll trust the frontend check, but ideally we should check here too.

            registration.status = 'Pending';
            await registration.save();

            res.json(registration);
        } catch (error) {
            console.error('Error submitting registration:', error);
            res.status(500).json({ error: 'Failed to submit registration' });
        }
    }
);

// Update registration status (admin only)
router.patch(
    '/:id/status',
    authenticate,
    requireAdmin,
    [body('status').isIn(['Pending', 'Approved', 'Rejected'])],
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            // Find the registration first to get previous status
            const registration = await Registration.findById(id);

            if (!registration) {
                res.status(404).json({ error: 'Registration not found' });
                return;
            }

            const previousStatus = registration.status;

            // Update the status
            registration.status = status;
            await registration.save();

            // Log the action
            try {
                // Fetch admin user to get their name
                const adminUser = await import('../models/User').then(m => m.User.findById(req.user!.userId));
                const adminName = adminUser ? (adminUser.firstName && adminUser.lastName ? `${adminUser.firstName} ${adminUser.lastName}` : adminUser.firstName || adminUser.email) : 'Unknown Admin';

                await import('../models/ParticipantApprovalLog').then(m => m.ParticipantApprovalLog.create({
                    adminId: req.user!.userId,
                    adminName: adminName,
                    registrationId: registration._id,
                    participantName: `${registration.firstName} ${registration.lastName}`,
                    action: status === 'Approved' ? 'Approve' : status === 'Rejected' ? 'Reject' : 'Pending',
                    previousStatus: previousStatus,
                    newStatus: status
                }));
            } catch (logError) {
                console.error('Error creating approval log:', logError);
                // Don't fail the request if logging fails
            }

            res.json(registration);
        } catch (error) {
            console.error('Error updating registration status:', error);
            res.status(500).json({ error: 'Failed to update status' });
        }
    }
);

// Update website status (admin only)
router.patch(
    '/:id/website-status',
    authenticate,
    requireAdmin,
    [body('websiteStatus').isIn(['Pending', 'Added'])],
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { websiteStatus } = req.body;

            const registration = await Registration.findByIdAndUpdate(
                id,
                { websiteStatus },
                { new: true }
            );

            if (!registration) {
                res.status(404).json({ error: 'Registration not found' });
                return;
            }

            res.json(registration);
        } catch (error) {
            console.error('Error updating website status:', error);
            res.status(500).json({ error: 'Failed to update website status' });
        }
    }
);

// Get logs for a registration (admin only)
router.get(
    '/:id/logs',
    authenticate,
    requireAdmin,
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            // Dynamic import to avoid circular dependency issues if any, though not strictly needed here
            const { ParticipantApprovalLog } = await import('../models/ParticipantApprovalLog');

            const logs = await ParticipantApprovalLog.find({ registrationId: id })
                .sort({ timestamp: -1 });

            res.json(logs);
        } catch (error) {
            console.error('Error fetching registration logs:', error);
            res.status(500).json({ error: 'Failed to fetch logs' });
        }
    }
);

export default router;
