import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Get all users (admin only)
router.get('/', authenticate, requireAdmin, async (_req: Request, res: Response) => {
    try {
        const users = await User.find()
            .select('-__v')
            .sort({ createdAt: -1 });

        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Update user role (admin only)
router.patch(
    '/:id/role',
    authenticate,
    requireAdmin,
    [body('role').isIn(['PARTICIPANT', 'ADMIN', 'WEB_ADMIN'])],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { id } = req.params;
            const { role } = req.body;

            const user = await User.findByIdAndUpdate(
                id,
                { role },
                { new: true }
            ).select('-__v');

            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            res.json(user);
        } catch (error) {
            console.error('Error updating user role:', error);
            res.status(500).json({ error: 'Failed to update user role' });
        }
    }
);

// Deactivate user (admin only)
router.patch(
    '/:id/deactivate',
    authenticate,
    requireAdmin,
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const user = await User.findByIdAndUpdate(
                id,
                { isActive: false },
                { new: true }
            ).select('-__v');

            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            res.json(user);
        } catch (error) {
            console.error('Error deactivating user:', error);
            res.status(500).json({ error: 'Failed to deactivate user' });
        }
    }
);

export default router;
