import mongoose, { Document, Schema } from 'mongoose';

export interface IBoothArea extends Document {
    name: string; // e.g., 'A', 'B', 'Food'
    polygon: { xPercentage: number; yPercentage: number }[]; // Array of points making up the drawn region
    createdAt: Date;
    updatedAt: Date;
}

const boothAreaSchema = new Schema<IBoothArea>(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        polygon: [{
            xPercentage: { type: Number, required: true },
            yPercentage: { type: Number, required: true }
        }]
    },
    {
        timestamps: true,
    }
);

export const BoothArea = mongoose.model<IBoothArea>('BoothArea', boothAreaSchema);
