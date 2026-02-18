import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Registration } from '../models/Registration';
import { authenticate, requireAdmin, requireApprover } from '../middleware/auth.middleware';
import { AuditService } from '../services/audit.service';
import { DistanceService } from '../services/distance.service';

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

// Get all tags (admin only)
router.get('/tags', authenticate, requireAdmin, async (_req: Request, res: Response) => {
    try {
        const tags = await Registration.distinct('tags');
        res.json(tags.filter(t => t)); // Filter out any null/empty
    } catch (error) {
        console.error('Error fetching tags:', error);
        res.status(500).json({ error: 'Failed to fetch tags' });
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
        // Filter out registrations that are already invoiced
        const registrations = await Registration.find({
            invoiced: { $ne: true }
        }).sort({ createdAt: -1 });

        // Create bulk operations array
        const bulkOps = [];

        // CSV Header
        let csv = 'Organization Name,First Name,Last Name,Email,Phone,Line 1,City,State,Postal Code,Notes\n';

        // Process registrations sequentially to respect API rate limits
        for (const r of registrations) {
            // Determine distance
            // We default to the checkbox if we can't calculate, or prioritize calculation?
            // User asked to "determine if the address... is 100 miles or more".
            // We'll try to calculate logic.

            let isOver100 = r.travelingOver100Miles || false;
            let distanceNote = '';

            // Attempt to verify distance if address is present
            if (r.address && r.city && r.state && r.zip) {
                // Rate limit: OpenStreetMap Nominatim requires 1 second between requests
                await new Promise(resolve => setTimeout(resolve, 1100));

                const distance = await DistanceService.getDistanceInMiles(r.address, r.city, r.state, r.zip);

                if (distance !== null) {
                    isOver100 = distance >= 100;
                    distanceNote = ` (Dist: ${distance.toFixed(1)} mi)`;
                }
            }

            // Calculate Invoice Amount
            let base = 200;
            if (isOver100) {
                base = base * 0.5; // 50% Discount
            }

            const extraSiteCost = Math.max(0, (r.numTents || 0) - 1) * 100;
            const tablesCost = (r.numTables || 0) * 20;
            const chairsCost = (r.numChairs || 0) * 5;
            const total = base + extraSiteCost + tablesCost + chairsCost;

            const baseNote = isOver100 ? 'Base: $100 (50% Dist Disc)' : 'Base: $200';
            const calculationNotes = `Total: $${total} (${baseNote}, Extra Sites: $${extraSiteCost}, Tables: $${tablesCost}, Chairs: $${chairsCost})${distanceNote}`;

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

            bulkOps.push({
                updateOne: {
                    filter: { _id: r._id },
                    update: {
                        $set: {
                            invoiced: true,
                            initialInvoiceAmount: total,
                            travelingOver100Miles: isOver100 // Optionally update the record with the verified status
                        }
                    }
                }
            });
        }

        // Perform bulk writes
        if (bulkOps.length > 0) {
            await Registration.bulkWrite(bulkOps);
        }

        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename="vegfest_export_quickbooks.csv"');
        res.send(csv);

    } catch (error) {
        console.error('Error exporting to QuickBooks:', error);
        res.status(500).json({ error: 'Failed to export to QuickBooks' });
    }
});



// Update registration (for saving sections)
// Modified to prevent regular users from updating invoiced status

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

            // Sanitize social handles
            if (updates.instagram) {
                updates.instagram = updates.instagram.replace(/^(?:https?:\/\/)?(?:www\.)?(?:instagram\.com\/)?@?([a-zA-Z0-9._]+)\/?$/, '$1');
            }
            if (updates.facebook) {
                updates.facebook = updates.facebook.replace(/^(?:https?:\/\/)?(?:www\.)?(?:facebook\.com\/)?@?([a-zA-Z0-9._-]+)\/?$/, '$1');
            }

            // Protect invoiced from being updated here by regular users
            if (req.user?.role !== 'ADMIN') {
                delete updates.invoiced;
            }

            // Protect status and websiteStatus from being updated here by regular users.
            if (req.user?.role !== 'ADMIN') {
                delete updates.status;
                delete updates.websiteStatus;
                delete updates.initialInvoiceAmount;
                delete updates.amountPaid;
            }

            // Also protect status if user doesn't have approval permissions
            if (updates.status && (!req.user?.isApprover && !req.user?.isSuperAdmin && req.user?.role !== 'WEB_ADMIN')) {
                delete updates.status;
            }

            // Construct the query based on user role
            const query: any = { _id: id };
            // If not admin, restrict to own registration
            if (req.user?.role !== 'ADMIN') {
                query.userId = req.user!.userId;
            }

            // 1. Fetch original document first to diff later
            const originalRegistration = await Registration.findOne(query).lean();
            if (!originalRegistration) {
                res.status(404).json({ error: 'Registration not found' });
                return;
            }

            // 2. Perform the update
            const registration = await Registration.findOneAndUpdate(
                query,
                { $set: updates },
                { new: true, runValidators: true }
            );

            if (!registration) {
                res.status(404).json({ error: 'Registration not found' });
                return;
            }

            // 3. Log Audit Events (Admin Only)
            if (req.user?.role === 'ADMIN') {
                try {
                    // Fetch admin info for logging
                    const adminUser = await import('../models/User').then(m => m.User.findById(req.user!.userId));
                    const adminName = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Unknown Admin';

                    // Check for Document Status Changes
                    if (updates.documents) {
                        const originalDocs = (originalRegistration as any).documents || [];
                        const newDocs = registration.documents || [];

                        // Map by key for easy comparison
                        const oldDocsMap = new Map(originalDocs.map((d: any) => [d.key, d]));

                        newDocs.forEach((newDoc: any) => {
                            const oldDoc = oldDocsMap.get(newDoc.key) as any;
                            if (oldDoc && oldDoc.status !== newDoc.status) {
                                AuditService.log({
                                    adminId: req.user!.userId,
                                    actorName: adminName,
                                    entityId: registration._id as any,
                                    entityType: 'Registration',
                                    action: newDoc.status === 'Approved' ? 'APPROVE_DOCUMENT' : 'REJECT_DOCUMENT',
                                    target: newDoc.type,
                                    details: `Changed ${newDoc.type} status from ${oldDoc.status} to ${newDoc.status}`,
                                    changes: {
                                        field: `documents.${newDoc.type}.status`,
                                        old: oldDoc.status,
                                        new: newDoc.status
                                    }
                                });
                            }
                        });
                    }

                    // Check for General Field Updates
                    // We treat the "updates" object as the source of truth for what we attempted to change
                    // We can diff against originalRegistration for verification
                    const diff = AuditService.diff(originalRegistration, registration.toObject(), ['documents', 'sectionStatus']);
                    if (diff) {
                        AuditService.log({
                            adminId: req.user!.userId,
                            actorName: adminName,
                            entityId: registration._id as any,
                            entityType: 'Registration',
                            action: 'UPDATE_REGISTRATION',
                            details: 'Updated registration details',
                            changes: diff
                        });
                    }

                } catch (logError) {
                    console.error('Error creating audit logs:', logError);
                }
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
    requireApprover,
    [body('status').isIn(['Pending', 'Approved', 'Declined', 'Waiting for Approval'])],
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const adminId = req.user!.userId;

            // Find the registration
            const registration = await Registration.findById(id);

            if (!registration) {
                res.status(404).json({ error: 'Registration not found' });
                return;
            }

            const previousStatus = registration.status;
            let newStatus = status;
            let actionDetails = '';

            // Approval Logic
            if (status === 'Approved') {
                // Initialize array if missing
                if (!registration.approvedBy) {
                    registration.approvedBy = [];
                }

                // Check if already approved by this admin
                // Convert ObjectIds to strings for comparison
                const alreadyApproved = registration.approvedBy.some(id => id.toString() === adminId);

                if (alreadyApproved) {
                    // If previously declined or pending, maybe they want to re-approve?
                    // But if currently Waiting for Approval, they can't double vote.
                    if (registration.status === 'Waiting for Approval' || registration.status === 'Approved') {
                        return res.status(400).json({ error: 'You have already approved this registration.' });
                    }
                    // If it was somehow reset but their ID stuck ( shouldn't happen if we clean up), let them proceed?
                    // Let's assume strict check.
                }

                if (!alreadyApproved) {
                    registration.approvedBy.push(adminId as any);
                }

                // Determine Status
                if (registration.approvedBy.length >= 2) {
                    newStatus = 'Approved';
                    actionDetails = 'Final Approval (2/2)';
                } else {
                    newStatus = 'Waiting for Approval';
                    actionDetails = 'Partial Approval (1/2)';
                }
            } else if (status === 'Pending') {
                // Reset approvals if moving back to Pending
                registration.approvedBy = [];
                newStatus = 'Pending';
                actionDetails = 'Reset to Pending';
            } else if (status === 'Declined') {
                newStatus = 'Declined';
                actionDetails = 'Registration Declined';
                // We don't necessarily clear approvals, so we know who might have vouched for it before rejection.
            }

            // Update the status
            registration.status = newStatus;
            await registration.save();

            // Log the action
            try {
                // Fetch admin user to get their name
                const adminUser = await import('../models/User').then(m => m.User.findById(adminId));
                const adminName = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Unknown Admin';

                await AuditService.log({
                    adminId: adminId,
                    actorName: adminName,
                    entityId: registration._id as any,
                    entityType: 'Registration',
                    action: status === 'Approved' ? 'APPROVE_REGISTRATION' : status === 'Declined' ? 'DECLINE_REGISTRATION' : 'UPDATE_STATUS',
                    details: `${actionDetails}. Changed status from ${previousStatus} to ${newStatus}`,
                    changes: {
                        field: 'status',
                        old: previousStatus,
                        new: newStatus
                    }
                });
            } catch (logError) {
                console.error('Error creating approval log:', logError);
            }

            return res.json(registration);
        } catch (error) {
            console.error('Error updating registration status:', error);
            res.status(500).json({ error: 'Failed to update status' });
            return;
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

            // Use the new AuditLog model
            const { AuditLog } = await import('../models/AuditLog');

            // Find logs for this entity
            const logs = await AuditLog.find({ entityId: id })
                .sort({ timestamp: -1 });

            res.json(logs);
        } catch (error) {
            console.error('Error fetching registration logs:', error);
            res.status(500).json({ error: 'Failed to fetch logs' });
        }
    }
);

export default router;
