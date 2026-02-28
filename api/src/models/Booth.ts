import mongoose, { Document, Schema } from 'mongoose';

export interface IBooth extends Document {
    boothNumber: number;
    type: 'regular' | 'foodTruck';
    areaId?: mongoose.Types.ObjectId;
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
            index: true // Removed unique because numbers reset per area (A1, B1)
        },
        type: {
            type: String,
            enum: ['regular', 'foodTruck'],
            default: 'regular'
        },
        areaId: {
            type: Schema.Types.ObjectId,
            ref: 'BoothArea',
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
