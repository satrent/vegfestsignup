import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User';
import { authenticate, requireAdmin, requireSuperAdmin } from '../middleware/auth.middleware';

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

// Update user role and permissions (Super Admin only)
router.patch(
    '/:id/role',
    authenticate,
    requireSuperAdmin,
    [
        body('role').optional().isIn(['PARTICIPANT', 'ADMIN', 'WEB_ADMIN']),
        body('isSuperAdmin').optional().isBoolean(),
        body('isApprover').optional().isBoolean(),
    ],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { id } = req.params;
            const { role, isSuperAdmin, isApprover } = req.body;

            const updateData: any = {};
            if (role) updateData.role = role;
            if (isSuperAdmin !== undefined) updateData.isSuperAdmin = isSuperAdmin;
            if (isApprover !== undefined) updateData.isApprover = isApprover;

            const user = await User.findByIdAndUpdate(
                id,
                updateData,
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

// Create new user (Super Admin only)
router.post(
    '/',
    authenticate,
    requireSuperAdmin,
    [
        body('email').isEmail().normalizeEmail(),
        body('role').isIn(['ADMIN', 'WEB_ADMIN']),
        body('isSuperAdmin').optional().isBoolean(),
        body('isApprover').optional().isBoolean(),
        body('firstName').optional().trim(),
        body('lastName').optional().trim(),
    ],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { email, firstName, lastName, role, isSuperAdmin, isApprover } = req.body;

            // Check if user already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                res.status(409).json({ error: 'User with this email already exists' });
                return;
            }

            // Create new user
            const user = new User({
                email,
                firstName,
                lastName,
                role,
                isSuperAdmin: isSuperAdmin || false,
                isApprover: isApprover || false,
                emailVerified: false,
                isActive: true,
            });

            await user.save();

            res.status(201).json(user);
        } catch (error) {
            console.error('Error creating user:', error);
            res.status(500).json({ error: 'Failed to create user' });
        }
    }
);

// Update user (admin only)
router.put(
    '/:id',
    authenticate,
    requireAdmin,
    [
        body('email').optional().isEmail().normalizeEmail(),
        body('firstName').optional().trim(),
        body('lastName').optional().trim(),
        body('role').optional().isIn(['ADMIN', 'WEB_ADMIN']),
    ],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { id } = req.params;
            const { email, firstName, lastName, role } = req.body;

            // If email is being changed, check for conflicts
            if (email) {
                const existingUser = await User.findOne({ email, _id: { $ne: id } });
                if (existingUser) {
                    res.status(409).json({ error: 'User with this email already exists' });
                    return;
                }
            }

            const user = await User.findByIdAndUpdate(
                id,
                { email, firstName, lastName, role },
                { new: true, runValidators: true }
            ).select('-__v');

            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            res.json(user);
        } catch (error) {
            console.error('Error updating user:', error);
            res.status(500).json({ error: 'Failed to update user' });
        }
    }
);

// Delete user (admin only)
router.delete(
    '/:id',
    authenticate,
    requireAdmin,
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            // Prevent deleting yourself
            if (req.user && req.user.userId === id) {
                res.status(400).json({ error: 'Cannot delete your own account' });
                return;
            }

            const user = await User.findByIdAndDelete(id);

            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            res.json({ message: 'User deleted successfully', user });
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({ error: 'Failed to delete user' });
        }
    }
);

export default router;
