import { AuditLog, IAuditLog } from '../models/AuditLog';
import mongoose from 'mongoose';

export interface AuditLogParams {
    adminId?: string | mongoose.Types.ObjectId;
    actorName: string;
    entityId: string | mongoose.Types.ObjectId;
    entityType: string;
    action: string;
    target?: string;
    changes?: any;
    details?: string;
}

export class AuditService {
    static async log(params: AuditLogParams): Promise<IAuditLog> {
        try {
            const logEntry = new AuditLog({
                adminId: params.adminId ? new mongoose.Types.ObjectId(params.adminId) : undefined,
                actorName: params.actorName,
                entityId: new mongoose.Types.ObjectId(params.entityId),
                entityType: params.entityType,
                action: params.action,
                target: params.target,
                changes: params.changes,
                details: params.details,
            });

            return await logEntry.save();
        } catch (error) {
            console.error('Failed to create audit log:', error);
            // We usually don't want to fail the main request if logging fails, 
            // but we should definitely know about it.
            throw error;
        }
    }

    /**
     * Compares two objects and returns the differences.
     * Useful for tracking what changed in a registration update.
     */
    static diff(original: any, updated: any, ignoredFields: string[] = []): Record<string, { old: any, new: any }> | null {
        const changes: Record<string, { old: any, new: any }> = {};
        const allKeys = new Set([...Object.keys(original), ...Object.keys(updated)]);

        // Fields to always ignore
        const systemIgnored = ['_id', '__v', 'createdAt', 'updatedAt', 'userId', ...ignoredFields];

        let hasChanges = false;

        for (const key of allKeys) {
            if (systemIgnored.includes(key)) continue;

            const oldVal = original[key];
            const newVal = updated[key];

            // Simple equality check (can be improved for deep objects/arrays if needed)
            // For now, most registration fields are primitives or simple arrays
            if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {

                // Special handling for specific complex fields if necessary
                // For example, if 'documents' array changes, we might want to handle it separately
                // But typically we handle document status changes explicitly in the controller.

                changes[key] = {
                    old: oldVal,
                    new: newVal
                };
                hasChanges = true;
            }
        }

        return hasChanges ? changes : null;
    }
}
