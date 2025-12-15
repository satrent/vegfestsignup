import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
    adminId?: mongoose.Types.ObjectId; // Optional: System actions might not have an adminId
    actorName: string; // "System", or Admin Name, or User Name
    entityId: mongoose.Types.ObjectId;
    entityType: string; // 'Registration', 'User', etc.
    action: string; // 'UPDATE_STATUS', 'APPROVE_DOCUMENT', 'UPLOAD_FILE', 'UPDATE_REGISTRATION'
    target?: string; // Specific field or sub-entity: 'Food License', 'Organization Name'
    changes?: any; // { field: { old: 'val', new: 'val' } }
    details?: string; // Human readable summary
    timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
    {
        adminId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            index: true,
        },
        actorName: {
            type: String,
            required: true,
        },
        entityId: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        entityType: {
            type: String,
            required: true,
            index: true,
        },
        action: {
            type: String,
            required: true,
            index: true,
        },
        target: String,
        changes: Schema.Types.Mixed,
        details: String,
        timestamp: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    {
        timestamps: true, // Adds createdAt (same as timestamp basically) and updatedAt
    }
);

// Index for efficient querying by entity
auditLogSchema.index({ entityId: 1, timestamp: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
