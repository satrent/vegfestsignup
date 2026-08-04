import mongoose, { Document, Schema } from 'mongoose';

/**
 * Application-wide settings. This is a singleton collection — there is only ever
 * one document, fetched via AppSettings.getSettings(). New site-wide toggles go
 * here rather than becoming their own collection.
 */
export interface IAppSettings extends Document {
    registrationsOpen: boolean;
    closedMessage: string;
    submissionsOpen: boolean;
    submissionsClosedMessage: string;
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export const DEFAULT_CLOSED_MESSAGE =
    'Registration for this year is now closed. If you already have a registration, ' +
    'you can still sign in to view and update it.';

export const DEFAULT_SUBMISSIONS_CLOSED_MESSAGE =
    'Final submission is paused right now. You can keep filling out and saving your ' +
    'sections — we will let you know as soon as applications can be submitted again.';

const appSettingsSchema = new Schema<IAppSettings>(
    {
        registrationsOpen: {
            type: Boolean,
            default: true,
        },
        closedMessage: {
            type: String,
            default: DEFAULT_CLOSED_MESSAGE,
            trim: true,
        },
        submissionsOpen: {
            type: Boolean,
            default: true,
        },
        submissionsClosedMessage: {
            type: String,
            default: DEFAULT_SUBMISSIONS_CLOSED_MESSAGE,
            trim: true,
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

interface AppSettingsModel extends mongoose.Model<IAppSettings> {
    getSettings(): Promise<IAppSettings>;
}

/**
 * Returns the single settings document, creating it with defaults on first use.
 */
appSettingsSchema.statics.getSettings = async function (): Promise<IAppSettings> {
    const existing = await this.findOne();
    if (existing) {
        return existing;
    }
    return this.create({});
};

export const AppSettings = mongoose.model<IAppSettings, AppSettingsModel>(
    'AppSettings',
    appSettingsSchema
);
