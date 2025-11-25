import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'PARTICIPANT' | 'ADMIN' | 'WEB_ADMIN';

export interface IUser extends Document {
    email: string;
    firstName?: string;
    lastName?: string;
    role: UserRole;
    emailVerified: boolean;
    googleId?: string;
    createdAt: Date;
    lastLoginAt: Date;
    isActive: boolean;
}

const userSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        firstName: {
            type: String,
            trim: true,
        },
        lastName: {
            type: String,
            trim: true,
        },
        role: {
            type: String,
            enum: ['PARTICIPANT', 'ADMIN', 'WEB_ADMIN'],
            default: 'PARTICIPANT',
        },
        emailVerified: {
            type: Boolean,
            default: false,
        },
        googleId: {
            type: String,
            sparse: true,
            unique: true,
        },
        lastLoginAt: {
            type: Date,
            default: Date.now,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ role: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function () {
    if (this.firstName && this.lastName) {
        return `${this.firstName} ${this.lastName}`;
    }
    return this.firstName || this.lastName || this.email;
});

// Ensure virtuals are included in JSON
userSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret: any) => {
        delete ret.__v;
        return ret;
    },
});

export const User = mongoose.model<IUser>('User', userSchema);
