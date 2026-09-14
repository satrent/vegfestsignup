import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticate, requireSuperAdmin } from '../middleware/auth.middleware';
import { Booth } from '../models/Booth';
import { Registration } from '../models/Registration';
import mongoose from 'mongoose';

const router = Router();

// Ensure only super admin can access booth management
router.use(authenticate, requireSuperAdmin);

const csvEscape = (value: unknown): string => {
    if (value === null || value === undefined) {
        return '';
    }

    const text = String(value);
    if (/[",\n\r]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
};

const boothAreaName = (booth: any): string => booth.areaId?.name || '';

const sortBoothsByMapSpot = (a: any, b: any): number => {
    const areaCompare = boothAreaName(a).localeCompare(boothAreaName(b), undefined, {
        numeric: true,
        sensitivity: 'base',
    });
    if (areaCompare !== 0) {
        return areaCompare;
    }

    return (a.boothNumber || 0) - (b.boothNumber || 0);
};

// Get all booth spots
router.get('/', async (_req: Request, res: Response) => {
    try {
        const booths = await Booth.find()
            .populate({
                path: 'registrationId',
                select: 'organizationName firstName lastName email phone numBoothSpaces tags'
            })
            .populate('areaId');
        res.json(booths);
    } catch (error) {
        console.error('Error fetching booths:', error);
        res.status(500).json({ error: 'Failed to fetch booths' });
    }
});

// Export booth assignments as a spreadsheet-friendly CSV
router.get('/export/assignments', async (_req: Request, res: Response) => {
    try {
        const booths = await Booth.find()
            .populate({
                path: 'registrationId',
                select: 'organizationName firstName lastName email phone numBoothSpaces assignedBoothIds tags type organizationCategory'
            })
            .populate('areaId')
            .lean();

        const headers = [
            'Area',
            'Spot',
            'Spot Type',
            'Assigned',
            'Organization',
            'Contact First Name',
            'Contact Last Name',
            'Email',
            'Phone',
            'Registration Type',
            'Category',
            'Requested Spots',
            'Assigned Spots',
            'Tags',
            'Map X %',
            'Map Y %',
        ];

        const rows = booths.sort(sortBoothsByMapSpot).map((booth: any) => {
            const registration = booth.registrationId;
            const areaName = boothAreaName(booth);
            const spotLabel = `${areaName}${booth.boothNumber}`;

            return [
                areaName,
                spotLabel,
                booth.type === 'foodTruck' ? 'Food Truck' : 'Regular',
                registration ? 'Yes' : 'No',
                registration?.organizationName || '',
                registration?.firstName || '',
                registration?.lastName || '',
                registration?.email || '',
                registration?.phone || '',
                registration?.type || '',
                registration?.organizationCategory || '',
                registration?.numBoothSpaces ?? '',
                Array.isArray(registration?.assignedBoothIds) ? registration.assignedBoothIds.length : '',
                Array.isArray(registration?.tags) ? registration.tags.join('; ') : '',
                booth.xPercentage,
                booth.yPercentage,
            ];
        });

        const csv = [
            headers.map(csvEscape).join(','),
            ...rows.map(row => row.map(csvEscape).join(',')),
        ].join('\n');

        const today = new Date().toISOString().slice(0, 10);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="booth-assignments-${today}.csv"`);
        res.send(csv);
    } catch (error) {
        console.error('Error exporting booth assignments:', error);
        res.status(500).json({ error: 'Failed to export booth assignments' });
    }
});

// Create a new booth spot
router.post(
    '/',
    [
        body('boothNumber').isNumeric(),
        body('type').optional().isIn(['regular', 'foodTruck']),
        body('areaId').optional().isMongoId(),
        body('xPercentage').isNumeric(),
        body('yPercentage').isNumeric()
    ],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { boothNumber, type, areaId, xPercentage, yPercentage } = req.body;

            // Optional: we removed the global 'unique' constraint in the model,
            // but we might want to enforce uniqueness per area. Let's do that.
            let existingBooth;
            if (areaId) {
                existingBooth = await Booth.findOne({ boothNumber, areaId });
            } else {
                existingBooth = await Booth.findOne({ boothNumber, areaId: null });
            }

            if (existingBooth) {
                res.status(400).json({ error: 'Booth number already exists in this area' });
                return;
            }

            const newBooth = new Booth({
                boothNumber,
                type: type || 'regular',
                areaId: areaId || null,
                xPercentage,
                yPercentage
            });

            await newBooth.save();
            res.status(201).json(newBooth);
        } catch (error) {
            console.error('Error creating booth:', error);
            res.status(500).json({ error: 'Failed to create booth' });
        }
    }
);

// Update booth coordinates
router.put(
    '/:id',
    [
        param('id').isMongoId(),
        body('xPercentage').optional().isNumeric(),
        body('yPercentage').optional().isNumeric()
    ],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { xPercentage, yPercentage } = req.body;
            const booth = await Booth.findById(req.params.id);

            if (!booth) {
                res.status(404).json({ error: 'Booth not found' });
                return;
            }

            if (xPercentage !== undefined) booth.xPercentage = xPercentage;
            if (yPercentage !== undefined) booth.yPercentage = yPercentage;

            await booth.save();
            res.json(booth);
        } catch (error) {
            console.error('Error updating booth:', error);
            res.status(500).json({ error: 'Failed to update booth' });
        }
    }
);

// Delete a booth spot
router.delete('/:id', param('id').isMongoId(), async (req: Request, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        const booth = await Booth.findById(req.params.id);
        if (!booth) {
            res.status(404).json({ error: 'Booth not found' });
            return;
        }

        // Unassign registration if assigned
        if (booth.registrationId) {
            await Registration.findByIdAndUpdate(booth.registrationId, {
                $pull: { assignedBoothIds: booth._id }
            });
        }

        await booth.deleteOne();
        res.json({ message: 'Booth deleted successfully' });
    } catch (error) {
        console.error('Error deleting booth:', error);
        res.status(500).json({ error: 'Failed to delete booth' });
    }
});

// Assign a registration to a booth
router.put(
    '/:id/assign',
    [
        param('id').isMongoId(),
        body('registrationId').isMongoId()
    ],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const booth = await Booth.findById(req.params.id);
            if (!booth) {
                res.status(404).json({ error: 'Booth not found' });
                return;
            }

            if (booth.registrationId) {
                res.status(400).json({ error: 'Booth is already assigned' });
                return;
            }

            const registration = await Registration.findById(req.body.registrationId);
            if (!registration) {
                res.status(404).json({ error: 'Registration not found' });
                return;
            }

            // check if they already have max spaces
            if (registration.assignedBoothIds && registration.assignedBoothIds.length >= (registration.numBoothSpaces || 0)) {
                // If they have 0 requested spots or reached the max, we should probably still allow assignment but give a warning in UI, 
                // but let's just let it happen on the backend or limit it. Let's just allow it for now.
            }

            // Add booth to registration
            if (!registration.assignedBoothIds) {
                registration.assignedBoothIds = [];
            }
            registration.assignedBoothIds.push(booth._id as mongoose.Types.ObjectId);
            await registration.save();

            // Set registration to booth
            booth.registrationId = registration._id as mongoose.Types.ObjectId;
            await booth.save();

            const populatedBooth = await Booth.findById(booth._id)
                .populate({
                    path: 'registrationId',
                    select: 'organizationName firstName lastName email phone numBoothSpaces tags'
                })
                .populate('areaId');

            res.json(populatedBooth);
        } catch (error) {
            console.error('Error assigning booth:', error);
            res.status(500).json({ error: 'Failed to assign booth' });
        }
    }
);

// Unassign a registration from a booth
router.put(
    '/:id/unassign',
    param('id').isMongoId(),
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const booth = await Booth.findById(req.params.id);
            if (!booth) {
                res.status(404).json({ error: 'Booth not found' });
                return;
            }

            if (!booth.registrationId) {
                res.json(booth);
                return;
            }

            // Remove booth from registration
            await Registration.findByIdAndUpdate(booth.registrationId, {
                $pull: { assignedBoothIds: booth._id }
            });

            // Clear booth's registration
            booth.registrationId = undefined;
            await booth.save();

            res.json(booth);
        } catch (error) {
            console.error('Error unassigning booth:', error);
            res.status(500).json({ error: 'Failed to unassign booth' });
        }
    }
);

// Get all approved vendors (for manual assignment, regardless of requested spaces)
router.get('/all-vendors', async (_req: Request, res: Response) => {
    try {
        const vendors = await Registration.find({ status: 'Approved' })
            .select('organizationName firstName lastName email phone numBoothSpaces assignedBoothIds type organizationCategory sponsorshipLevel sponsorshipInterest tags')
            .sort({ organizationName: 1 })
            .lean();
        res.json(vendors);
    } catch (error) {
        console.error('Error fetching all vendors:', error);
        res.status(500).json({ error: 'Failed to fetch vendors' });
    }
});

// Get unassigned participants
router.get('/unassigned', async (_req: Request, res: Response) => {
    try {
        const query = {
            status: 'Approved',
            numBoothSpaces: { $gt: 0 }
            // Mongoose array length query or missing/empty array
            // It's a bit complicated, so we can fetch all and filter in memory, or use aggregation
        };

        const allApprovedReqs = await Registration.find(query).select('organizationName firstName lastName email phone numBoothSpaces assignedBoothIds type organizationCategory sponsorshipLevel sponsorshipInterest tags').lean();

        // Filter those who haven't fulfilled their requested number of spaces
        const unassignedList = allApprovedReqs.filter(r =>
            !r.assignedBoothIds || r.assignedBoothIds.length < (r.numBoothSpaces || 1)
        );

        res.json(unassignedList);
    } catch (error) {
        console.error('Error fetching unassigned lists:', error);
        res.status(500).json({ error: 'Failed to fetch unassigned list' });
    }
});

export default router;
