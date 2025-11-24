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

// Create registration
router.post(
    '/',
    authenticate,
    [
        body('organizationName').trim().notEmpty(),
        body('firstName').trim().notEmpty(),
        body('lastName').trim().notEmpty(),
        body('email').isEmail().normalizeEmail(),
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
            });

            res.status(201).json(registration);
        } catch (error) {
            console.error('Error creating registration:', error);
            res.status(500).json({ error: 'Failed to create registration' });
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

            const registration = await Registration.findByIdAndUpdate(
                id,
                { status },
                { new: true }
            );

            if (!registration) {
                res.status(404).json({ error: 'Registration not found' });
                return;
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

export default router;
