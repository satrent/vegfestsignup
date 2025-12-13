import express, { Request, Response } from 'express';
import multer from 'multer';
import { storageService } from '../services/storage.service';
import { Registration } from '../models/Registration';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// Configure multer to store in memory so we can pass buffer to storageService
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});

interface MulterRequest extends Request {
    file?: Express.Multer.File;
    user?: any;
}

// POST /api/upload
// Body: { documentType: 'Food License' | 'COI' | 'ST-19' }
router.post(
    '/',
    authenticate,
    upload.single('file'),
    async (req: MulterRequest, res: Response): Promise<void> => {
        try {
            if (!req.file) {
                res.status(400).json({ message: 'No file uploaded' });
                return;
            }

            const { documentType } = req.body;
            if (!documentType) {
                res.status(400).json({ message: 'Document type is required' });
                return;
            }

            const allowedTypes = ['Food License', 'COI', 'ST-19'];
            if (!allowedTypes.includes(documentType)) {
                res.status(400).json({ message: 'Invalid document type' });
                return;
            }

            const user = (req as any).user;
            if (!user) {
                res.status(401).json({ message: 'User not found' });
                return;
            }

            // Find registration for this user
            const registration = await Registration.findOne({ userId: user.userId });
            if (!registration) {
                res.status(404).json({ message: 'Registration not found' });
                return;
            }

            // Upload to storage provider
            // We categorize files into folders by registration ID for organization
            const folder = `registrations/${registration._id}/documents`;
            const storedFile = await storageService.upload(
                {
                    filename: req.file.originalname,
                    mimetype: req.file.mimetype,
                    size: req.file.size,
                    buffer: req.file.buffer,
                },
                folder
            );

            // Add to registration documents
            // Check if document of this type already exists, if so replace it or mark as previous?
            // For now, let's append new ones, but maybe we should remove old "Pending" ones of same type?
            // User requirements didn't specify versioning, so let's just push to array.
            // Actually, cleaner to remove previous pending/rejected of same type so we don't accumulate junk?
            // Let's just push for now to be safe and specific.

            registration.documents.push({
                type: documentType,
                name: storedFile.name,
                key: storedFile.key,
                location: storedFile.location,
                status: 'Pending',
                uploadedAt: new Date()
            });

            await registration.save();

            res.status(200).json({
                message: 'File uploaded successfully',
                document: {
                    type: documentType,
                    location: storedFile.location,
                    status: 'Pending'
                }
            });
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ message: 'File upload failed' });
        }
    }
);

// GET /api/upload/url
// Query: key (e.g., registrations/123/documents/abc.pdf)
router.get(
    '/url',
    authenticate,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { key } = req.query;
            if (!key || typeof key !== 'string') {
                res.status(400).json({ message: 'File key is required' });
                return;
            }

            // Security Check: Extraction of Registration ID from Key
            // Expected format: registrations/{registrationId}/documents/...
            const match = key.match(/^registrations\/([^\/]+)\//);
            if (!match) {
                // If it doesn't match the expected structure, only Admins should access it, or block it.
                // For now, let's assume all valid uploads follow this structure.
                if (req.user!.role !== 'ADMIN') {
                    res.status(403).json({ message: 'Access denied' });
                    return;
                }
            } else {
                const registrationId = match[1];

                // If not admin, verify ownership
                if (req.user!.role !== 'ADMIN') {
                    const registration = await Registration.findOne({
                        _id: registrationId,
                        userId: req.user!.userId
                    });

                    if (!registration) {
                        res.status(403).json({ message: 'Access denied' });
                        return;
                    }
                }
            }

            const url = await storageService.getUrl(key);
            res.json({ url });
        } catch (error) {
            console.error('Error generating signed URL:', error);
            res.status(500).json({ message: 'Failed to generate access URL' });
        }
    }
);

export default router;
