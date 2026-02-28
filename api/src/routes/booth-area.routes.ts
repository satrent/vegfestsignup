import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticate, requireSuperAdmin } from '../middleware/auth.middleware';
import { BoothArea } from '../models/BoothArea';

const router = Router();

// Ensure only super admin can access area management
router.use(authenticate, requireSuperAdmin);

// Get all areas
router.get('/', async (_req: Request, res: Response) => {
    try {
        const areas = await BoothArea.find().sort('name');
        res.json(areas);
    } catch (error) {
        console.error('Error fetching areas:', error);
        res.status(500).json({ error: 'Failed to fetch areas' });
    }
});

// Create a new area
router.post(
    '/',
    [
        body('name').isString().notEmpty(),
        body('polygon').isArray({ min: 3 }),
        body('polygon.*.xPercentage').isNumeric(),
        body('polygon.*.yPercentage').isNumeric()
    ],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { name, polygon } = req.body;

            const existingArea = await BoothArea.findOne({ name });
            if (existingArea) {
                res.status(400).json({ error: 'Area name already exists' });
                return;
            }

            const newArea = new BoothArea({ name, polygon });
            await newArea.save();

            res.status(201).json(newArea);
        } catch (error) {
            console.error('Error creating area:', error);
            res.status(500).json({ error: 'Failed to create area' });
        }
    }
);

// Delete an area
router.delete('/:id', param('id').isMongoId(), async (req: Request, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        const area = await BoothArea.findById(req.params.id);
        if (!area) {
            res.status(404).json({ error: 'Area not found' });
            return;
        }

        // Ideally, we'd also check if booths are using this area and warn the user,
        // or just cascade the delete. For now, we will simply allow deletion, which leaves 
        // the booths with an orphaned areaId (or we can unset them).
        // Let's unset them as a safe fallback:
        const { Booth } = await import('../models/Booth');
        await Booth.updateMany({ areaId: area._id }, { $unset: { areaId: 1 } });

        await area.deleteOne();

        res.json({ message: 'Area deleted successfully' });
    } catch (error) {
        console.error('Error deleting area:', error);
        res.status(500).json({ error: 'Failed to delete area' });
    }
});

export default router;
