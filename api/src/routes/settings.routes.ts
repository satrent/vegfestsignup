import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AppSettings } from '../models/AppSettings';
import { User } from '../models/User';
import { authenticate, requireAdmin, requireSuperAdmin } from '../middleware/auth.middleware';
import { AuditService } from '../services/audit.service';

const router = Router();

// Public settings — no auth. The login page reads this so a would-be new
// participant sees the closed notice before spending a verification code.
router.get('/public', async (_req: Request, res: Response) => {
    try {
        const settings = await AppSettings.getSettings();
        res.json({
            registrationsOpen: settings.registrationsOpen,
            closedMessage: settings.closedMessage,
            submissionsOpen: settings.submissionsOpen,
            submissionsClosedMessage: settings.submissionsClosedMessage,
        });
    } catch (error) {
        console.error('Error fetching public settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Full settings (admin only)
router.get('/', authenticate, requireAdmin, async (_req: Request, res: Response) => {
    try {
        const settings = await AppSettings.getSettings();
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Update settings (Super Admin only)
router.patch(
    '/',
    authenticate,
    requireSuperAdmin,
    [
        body('registrationsOpen').optional().isBoolean(),
        body('closedMessage').optional().isString().trim(),
        body('submissionsOpen').optional().isBoolean(),
        body('submissionsClosedMessage').optional().isString().trim(),
    ],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const {
                registrationsOpen,
                closedMessage,
                submissionsOpen,
                submissionsClosedMessage,
            } = req.body;

            const settings = await AppSettings.getSettings();
            // Snapshot before mutating — the settings form always sends every
            // field, so only genuine value changes should reach the audit log.
            const previous = {
                registrationsOpen: settings.registrationsOpen,
                closedMessage: settings.closedMessage,
                submissionsOpen: settings.submissionsOpen,
                submissionsClosedMessage: settings.submissionsClosedMessage,
            };

            if (registrationsOpen !== undefined) {
                settings.registrationsOpen = registrationsOpen;
            }
            if (closedMessage !== undefined) {
                settings.closedMessage = closedMessage;
            }
            if (submissionsOpen !== undefined) {
                settings.submissionsOpen = submissionsOpen;
            }
            if (submissionsClosedMessage !== undefined) {
                settings.submissionsClosedMessage = submissionsClosedMessage;
            }
            settings.updatedBy = req.user!.userId as any;
            await settings.save();

            const adminUser = await User.findById(req.user!.userId);
            const adminName = adminUser
                ? `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || adminUser.email
                : 'Unknown Admin';

            const changeSummary: string[] = [];
            if (settings.registrationsOpen !== previous.registrationsOpen) {
                changeSummary.push(
                    `New registrations ${settings.registrationsOpen ? 'opened' : 'closed'}`
                );
            }
            if (settings.closedMessage !== previous.closedMessage) {
                changeSummary.push('Registrations closed message updated');
            }
            if (settings.submissionsOpen !== previous.submissionsOpen) {
                changeSummary.push(
                    `Application submissions ${settings.submissionsOpen ? 'enabled' : 'paused'}`
                );
            }
            if (settings.submissionsClosedMessage !== previous.submissionsClosedMessage) {
                changeSummary.push('Submissions paused message updated');
            }

            if (changeSummary.length > 0) {
                await AuditService.log({
                    adminId: req.user!.userId,
                    actorName: adminName,
                    entityId: settings._id as any,
                    entityType: 'AppSettings',
                    action: 'UPDATE_SETTINGS',
                    details: changeSummary.join('; '),
                });
            }

            res.json(settings);
        } catch (error) {
            console.error('Error updating settings:', error);
            res.status(500).json({ error: 'Failed to update settings' });
        }
    }
);

export default router;
