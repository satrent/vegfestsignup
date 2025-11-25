import mongoose, { Document, Schema } from 'mongoose';

export interface IVerificationCode extends Document {
    email: string;
    code: string;
    expiresAt: Date;
    attempts: number;
    verified: boolean;
    createdAt: Date;
    isExpired(): boolean;
    maxAttemptsReached(): boolean;
}

const verificationCodeSchema = new Schema<IVerificationCode>(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        code: {
            type: String,
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 }, // TTL index - auto-delete expired documents
        },
        attempts: {
            type: Number,
            default: 0,
        },
        verified: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Index for quick lookup
verificationCodeSchema.index({ email: 1, code: 1 });

// Method to check if code is expired
verificationCodeSchema.methods.isExpired = function (): boolean {
    return this.expiresAt < new Date();
};

// Method to check if max attempts reached
verificationCodeSchema.methods.maxAttemptsReached = function (): boolean {
    return this.attempts >= 5;
};

export const VerificationCode = mongoose.model<IVerificationCode>(
    'VerificationCode',
    verificationCodeSchema
);
