import mongoose, { Document, Schema } from 'mongoose';

export type RegistrationType = 'Exhibitor' | 'Sponsor' | 'Both';
export type RegistrationStatus = 'Pending' | 'Approved' | 'Rejected';
export type WebsiteStatus = 'Pending' | 'Added';

export interface IRegistration extends Document {
    userId: mongoose.Types.ObjectId;
    organizationName: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    website?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    description?: string;
    logoUrl?: string;
    participatedBefore?: boolean;
    type: RegistrationType;
    status: RegistrationStatus;
    websiteStatus?: WebsiteStatus;
    createdAt: Date;
    updatedAt: Date;
}

const registrationSchema = new Schema<IRegistration>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        organizationName: {
            type: String,
            required: true,
            trim: true,
        },
        firstName: {
            type: String,
            required: true,
            trim: true,
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        phone: String,
        website: String,
        address: String,
        city: String,
        state: String,
        zip: String,
        description: String,
        logoUrl: String,
        participatedBefore: Boolean,
        type: {
            type: String,
            enum: ['Exhibitor', 'Sponsor', 'Both'],
            required: true,
        },
        status: {
            type: String,
            enum: ['Pending', 'Approved', 'Rejected'],
            default: 'Pending',
        },
        websiteStatus: {
            type: String,
            enum: ['Pending', 'Added'],
            default: 'Pending',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
registrationSchema.index({ userId: 1 });
registrationSchema.index({ status: 1 });
registrationSchema.index({ websiteStatus: 1 });
registrationSchema.index({ email: 1 });

export const Registration = mongoose.model<IRegistration>(
    'Registration',
    registrationSchema
);
