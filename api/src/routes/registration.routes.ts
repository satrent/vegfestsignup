import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Registration } from '../models/Registration';
import { authenticate, requireAdmin, requireApprover, requireSuperAdmin } from '../middleware/auth.middleware';
import { AuditService } from '../services/audit.service';
import { FeeService } from '../services/fee.service';

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

// Export to QuickBooks (Super Admin only)
router.get('/export/quickbooks', authenticate, requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
        // Filter out registrations that are already invoiced and only export approved ones
        const registrations = await Registration.find({
            invoiced: { $ne: true },
            status: 'Approved'
        }).sort({ createdAt: -1 });

        // Create bulk operations array
        const bulkOps = [];

        // CSV Header
        let csv = 'Organization Name,First Name,Last Name,Email,Phone,Line 1,City,State,Postal Code,Notes\n';

        // Process registrations sequentially to respect API rate limits
        for (const r of registrations) {
            
            // Calculate fees and distance internally (with live distance API check)
            const feeData = await FeeService.calculateRegistrationFees(r, false);

            // Escape fields for CSV
            const escape = (field: string | undefined | null) => {
                if (!field) return '';
                const stringField = String(field);
                if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
                    return `"${stringField.replace(/"/g, '""')}"`;
                }
                return stringField;
            };

            csv += `${escape(r.organizationName)},${escape(r.firstName)},${escape(r.lastName)},${escape(r.email)},${escape(r.phone)},${escape(r.address)},${escape(r.city)},${escape(r.state)},${escape(r.zip)},${escape(feeData.calculationNotes)}\n`;

            bulkOps.push({
                updateOne: {
                    filter: { _id: r._id },
                    update: {
                        $set: {
                            invoiced: true,
                            initialInvoiceAmount: feeData.total,
                            invoiceBreakdown: {
                                baseFee: feeData.baseFee,
                                discountAmount: feeData.discountAmount,
                                discountNotes: feeData.discountNotes,
                                securityDeposit: feeData.securityDeposit,
                                extraSiteCost: feeData.extraSiteCost,
                                equipmentCost: feeData.equipmentCost,
                                specialPowerFee: feeData.specialPowerFee
                            },
                            travelingOver100Miles: feeData.isOver100 // Optionally update the record with the verified status
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

// Get Electricity Requirements Report (Admin only)
router.get('/reports/electricity', authenticate, requireAdmin, async (_req: Request, res: Response) => {
    try {
        const registrations = await Registration.find({
            powerNeeds: { $exists: true, $ne: 'None' },
            status: 'Approved'
        }).sort({ organizationName: 1 }).select('organizationName firstName lastName email phone powerNeeds householdElectric electricNeedsDescription status equipmentList isTest');

        res.json(registrations);
    } catch (error) {
        console.error('Error fetching electricity report:', error);
        res.status(500).json({ error: 'Failed to fetch electricity report' });
    }
});

// Get To-Do Report (Admin only)
router.get('/reports/todos', authenticate, requireAdmin, async (_req: Request, res: Response) => {
    try {
        // Find registrations that have at least one uncompleted todo item
        const registrations = await Registration.find({
            'todoItems.isCompleted': false
        }).sort({ organizationName: 1 }).select('organizationName firstName lastName email phone todoItems status isTest');

        // Filter out completed todos from the response so the report only shows outstanding ones
        const filteredRegistrations = registrations.map(reg => {
            const r = reg.toObject();
            if (r.todoItems) {
                r.todoItems = r.todoItems.filter((t: any) => !t.isCompleted);
            }
            return r;
        });

        res.json(filteredRegistrations);
    } catch (error) {
        console.error('Error fetching to-do report:', error);
        res.status(500).json({ error: 'Failed to fetch to-do report' });
    }
});

// Get Rental Equipment Report (Admin only)
router.get('/reports/rental-equipment', authenticate, requireAdmin, async (_req: Request, res: Response) => {
    try {
        const registrations = await Registration.find({
            status: 'Approved',
            $or: [
                { numTables: { $gt: 0 } },
                { numChairs: { $gt: 0 } },
                { numTents: { $gt: 0 } },
                { numWeights: { $gt: 0 } }
            ]
        }).sort({ organizationName: 1 }).select('organizationName firstName lastName email phone numTables numChairs numTents numWeights status isTest');

        res.json(registrations);
    } catch (error) {
        console.error('Error fetching rental equipment report:', error);
        res.status(500).json({ error: 'Failed to fetch rental equipment report' });
    }
});

// Get Invoicing Report (Admin only)
router.get('/reports/invoicing', authenticate, requireAdmin, async (_req: Request, res: Response) => {
    try {
        const registrations = await Registration.find({
            status: 'Approved'
        }).sort({ organizationName: 1 }).lean();

        // Calculate missing breakdown on the fly for preview purposes (skip slow distance lookup)
        const mappedRegistrations = await Promise.all(registrations.map(async (r: any) => {
            if (!r.invoiced || !r.invoiceBreakdown || (r.invoiceBreakdown.baseFee === 0 && r.invoiceBreakdown.securityDeposit === 0)) {
                const computedFees = await FeeService.calculateRegistrationFees(r, true);
                return {
                    ...r,
                    initialInvoiceAmount: computedFees.total, // Override zero/old invoice with computed total
                    invoiceBreakdown: {
                        baseFee: computedFees.baseFee,
                        discountAmount: computedFees.discountAmount,
                        discountNotes: computedFees.discountNotes,
                        securityDeposit: computedFees.securityDeposit,
                        extraSiteCost: computedFees.extraSiteCost,
                        equipmentCost: computedFees.equipmentCost,
                        specialPowerFee: computedFees.specialPowerFee
                    }
                };
            }
            return r;
        }));

        res.json(mappedRegistrations);
    } catch (error) {
        console.error('Error fetching invoicing report:', error);
        res.status(500).json({ error: 'Failed to fetch invoicing report' });
    }
});

// Get Contact Info Report (Admin only)
router.get('/reports/contact-info', authenticate, requireAdmin, async (_req: Request, res: Response) => {
    try {
        const registrations = await Registration.find({})
            .sort({ organizationName: 1 })
            .select('organizationName firstName lastName status email phone facebook instagram isTest');

        res.json(registrations);
    } catch (error) {
        console.error('Error fetching contact info report:', error);
        res.status(500).json({ error: 'Failed to fetch contact info report' });
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

            // Clean up optional enum fields that might be sent as empty strings from front-end
            const optionalEnums = [
                'onSite', 'powerNeeds', 'loadInVehicle', 'foodOfferings',
                'menuOption', 'coiOption', 'st19Option', 'swagDistributionInterest'
            ];
            optionalEnums.forEach(field => {
                if (updates[field] === '') {
                    updates[field] = null;
                }
            });

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
                delete updates.quickbooksInvoiceLink;
            }

            // Also protect status if user doesn't have approval permissions
            if (updates.status && (!req.user?.isApprover && !req.user?.isSuperAdmin && req.user?.role !== 'WEB_ADMIN')) {
                delete updates.status;
            }

            // Prevent non-super admins from creating new tags
            if (updates.tags && (!req.user?.isSuperAdmin && req.user?.role !== 'WEB_ADMIN')) {
                const existingTags = await Registration.distinct('tags');
                const lowercaseExistingTags = existingTags.filter(t => t).map((t: string) => t.toLowerCase());

                for (const tag of updates.tags) {
                    if (!lowercaseExistingTags.includes(tag.toLowerCase())) {
                        res.status(403).json({ error: 'Only Super Admins can create new tags' });
                        return;
                    }
                }
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

            // AUTO-SEND APPROVAL EMAIL LOGIC
            if (
                registration.status === 'Approved' &&
                registration.initialInvoiceAmount !== undefined && registration.initialInvoiceAmount > 0 &&
                registration.quickbooksInvoiceLink &&
                !originalRegistration.approvalEmailSent &&
                updates.approvalEmailSent !== true
            ) {
                try {
                    await import('../services/email.service').then(m =>
                        m.emailService.sendApprovalEmail(registration)
                    );
                    registration.approvalEmailSent = true;
                    await registration.save();
                    await AuditService.log({
                        actorName: 'System',
                        entityId: registration._id as any,
                        entityType: 'Registration',
                        action: 'SEND_EMAIL',
                        target: 'Welcome to Twin Cities Veg Fest',
                        details: `Approval email sent to ${registration.email}`
                    });
                } catch (emailError) {
                    console.error('Error auto-sending approval email:', emailError);
                }
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

                                if (newDoc.status === 'Rejected') {
                                    import('../services/email.service').then(m =>
                                        m.emailService.sendDocumentRejectionEmail(
                                            registration.email,
                                            registration.firstName,
                                            newDoc.type,
                                            newDoc.rejectionReason || ''
                                        )
                                    ).then(() => {
                                        AuditService.log({
                                            adminId: req.user!.userId,
                                            actorName: adminName,
                                            entityId: registration._id as any,
                                            entityType: 'Registration',
                                            action: 'SEND_EMAIL',
                                            target: `${newDoc.type} Document Rejected`,
                                            details: `Rejection email sent to ${registration.email}${newDoc.rejectionReason ? `: ${newDoc.rejectionReason}` : ''}`
                                        });
                                    }).catch(err => console.error('Failed to send rejection email:', err));
                                }
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
    [body('status').isIn(['Pending', 'Approved', 'Declined'])],
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
                newStatus = 'Approved';
                actionDetails = 'Registration Approved';

                // We can clear the approvedBy array or just ignore it, 
                // but let's clear it to be clean, or treating it as "who approved it" is handled by audit logs.
                // The audit log captures who did it.

            } else if (status === 'Pending') {
                newStatus = 'Pending';
                actionDetails = 'Reset to Pending';
            } else if (status === 'Declined') {
                newStatus = 'Declined';
                actionDetails = 'Registration Declined';
            }

            // Update the status
            registration.status = newStatus;
            await registration.save();

            // Send approval email if status changed to Approved and criteria met
            if (newStatus === 'Approved' && previousStatus !== 'Approved' && registration.email) {
                if (registration.initialInvoiceAmount && registration.initialInvoiceAmount > 0 && registration.quickbooksInvoiceLink && !registration.approvalEmailSent) {
                    try {
                        await import('../services/email.service').then(m =>
                            m.emailService.sendApprovalEmail(registration)
                        );
                        registration.approvalEmailSent = true;
                        await registration.save();
                        await AuditService.log({
                            actorName: 'System',
                            entityId: registration._id as any,
                            entityType: 'Registration',
                            action: 'SEND_EMAIL',
                            target: 'Welcome to Twin Cities Veg Fest',
                            details: `Approval email sent to ${registration.email}`
                        });
                    } catch (emailError) {
                        console.error('Error sending approval email:', emailError);
                    }
                }
            }

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

// Manually add an email history entry (admin only)
router.post(
    '/:id/logs',
    authenticate,
    requireAdmin,
    [body('subject').trim().notEmpty()],
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const registration = await Registration.findById(id);
            if (!registration) {
                res.status(404).json({ error: 'Registration not found' });
                return;
            }

            const adminUser = await import('../models/User').then(m => m.User.findById(req.user!.userId));
            const adminName = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Unknown Admin';

            const log = await AuditService.log({
                adminId: req.user!.userId,
                actorName: adminName,
                entityId: id,
                entityType: 'Registration',
                action: 'SEND_EMAIL',
                target: req.body.subject,
                details: req.body.details || undefined,
            });

            res.status(201).json(log);
        } catch (error) {
            console.error('Error adding email log:', error);
            res.status(500).json({ error: 'Failed to add email log' });
        }
    }
);

// Send document reminder email
router.post(
    '/:id/send-reminder',
    authenticate,
    requireAdmin,
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { missingDocuments } = req.body;

            const registration = await Registration.findById(id);
            if (!registration) {
                res.status(404).json({ error: 'Registration not found' });
                return;
            }

            // We could re-calculate missing docs here for security, 
            // but relying on the frontend's list is acceptable for now as it's just an email content.
            // Ideally should be validated.

            // Double check email availability
            if (!registration.email) {
                res.status(400).json({ error: 'Registration has no email address' });
                return;
            }

            await import('../services/email.service').then(m =>
                m.emailService.sendDocumentReminder(
                    registration.email,
                    registration.firstName,
                    missingDocuments || ['Required Documents']
                )
            );

            registration.lastReminderSent = new Date();
            await registration.save();

            // Log it
            const adminUser = await import('../models/User').then(m => m.User.findById(req.user!.userId));
            const adminName = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Unknown Admin';

            await AuditService.log({
                adminId: req.user!.userId,
                actorName: adminName,
                entityId: registration._id as any,
                entityType: 'Registration',
                action: 'SEND_EMAIL',
                target: 'Action Required: Missing Documents for Veg Fest',
                details: `Document reminder sent to ${registration.email}. Missing: ${missingDocuments?.join(', ')}`
            });

            res.json(registration);
        } catch (error) {
            console.error('Error sending reminder:', error);
            res.status(500).json({ error: 'Failed to send reminder' });
        }
    }
);

// Add a To-Do item (Admin only)
router.post(
    '/:id/todos',
    authenticate,
    requireAdmin,
    [body('text').trim().notEmpty()],
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { text } = req.body;

            const registration = await Registration.findById(id);
            if (!registration) {
                res.status(404).json({ error: 'Registration not found' });
                return;
            }

            if (!registration.todoItems) {
                registration.todoItems = [];
            }

            registration.todoItems.push({ text, isCompleted: false });
            await registration.save();

            res.status(201).json(registration.todoItems[registration.todoItems.length - 1]);
        } catch (error) {
            console.error('Error adding to-do:', error);
            res.status(500).json({ error: 'Failed to add to-do' });
        }
    }
);

// Update a To-Do item (Admin only)
router.patch(
    '/:id/todos/:todoId',
    authenticate,
    requireAdmin,
    [body('isCompleted').isBoolean()],
    async (req: Request, res: Response) => {
        try {
            const { id, todoId } = req.params;
            const { isCompleted } = req.body;

            const registration = await Registration.findById(id);
            if (!registration) {
                res.status(404).json({ error: 'Registration not found' });
                return;
            }

            if (!registration.todoItems) {
                res.status(404).json({ error: 'To-Do item not found' });
                return;
            }

            const todo = registration.todoItems.find(t => t._id?.toString() === todoId);
            if (!todo) {
                res.status(404).json({ error: 'To-Do item not found' });
                return;
            }

            todo.isCompleted = isCompleted;
            await registration.save();

            res.json(todo);
        } catch (error) {
            console.error('Error updating to-do:', error);
            res.status(500).json({ error: 'Failed to update to-do' });
        }
    }
);

// Delete a To-Do item (Admin only)
router.delete(
    '/:id/todos/:todoId',
    authenticate,
    requireAdmin,
    async (req: Request, res: Response) => {
        try {
            const { id, todoId } = req.params;

            const registration = await Registration.findById(id);
            if (!registration) {
                res.status(404).json({ error: 'Registration not found' });
                return;
            }

            if (!registration.todoItems) {
                res.status(404).json({ error: 'To-Do item not found' });
                return;
            }

            registration.todoItems = registration.todoItems.filter(t => t._id?.toString() !== todoId);
            await registration.save();

            res.json({ message: 'To-Do item deleted' });
        } catch (error) {
            console.error('Error deleting to-do:', error);
            res.status(500).json({ error: 'Failed to delete to-do' });
        }
    }
);

export default router;
