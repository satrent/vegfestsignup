import mongoose, { Document, Schema } from 'mongoose';

export interface IParticipantApprovalLog extends Document {
    adminId: mongoose.Types.ObjectId;
    adminName: string;
    registrationId: mongoose.Types.ObjectId;
    participantName: string;
    action: 'Approve' | 'Reject' | 'Pending';
    previousStatus: string;
    newStatus: string;
    timestamp: Date;
}

const participantApprovalLogSchema = new Schema<IParticipantApprovalLog>(
    {
        adminId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        adminName: {
            type: String,
            required: true,
        },
        registrationId: {
            type: Schema.Types.ObjectId,
            ref: 'Registration',
            required: true,
            index: true,
        },
        participantName: {
            type: String,
            required: true,
        },
        action: {
            type: String,
            enum: ['Approve', 'Reject', 'Pending'],
            required: true,
        },
        previousStatus: {
            type: String,
            required: true,
        },
        newStatus: {
            type: String,
            required: true,
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt automatically
    }
);

export const ParticipantApprovalLog = mongoose.model<IParticipantApprovalLog>(
    'ParticipantApprovalLog',
    participantApprovalLogSchema
);
