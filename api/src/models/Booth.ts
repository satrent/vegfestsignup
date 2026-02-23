import mongoose, { Document, Schema } from 'mongoose';

export interface IBooth extends Document {
    boothNumber: number;
    xPercentage: number;
    yPercentage: number;
    registrationId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const boothSchema = new Schema<IBooth>(
    {
        boothNumber: {
            type: Number,
            required: true,
            unique: true,
            index: true
        },
        xPercentage: {
            type: Number,
            required: true
        },
        yPercentage: {
            type: Number,
            required: true
        },
        registrationId: {
            type: Schema.Types.ObjectId,
            ref: 'Registration',
            index: true,
            default: null
        }
    },
    {
        timestamps: true,
    }
);

export const Booth = mongoose.model<IBooth>('Booth', boothSchema);
