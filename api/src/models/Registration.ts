import mongoose, { Document, Schema } from 'mongoose';

export type RegistrationType = 'Exhibitor' | 'Sponsor' | 'Both';
export type RegistrationStatus = 'In Progress' | 'Pending' | 'Approved' | 'Declined';
export type WebsiteStatus = 'Pending' | 'Added';

export interface IRegistration extends Document {
    userId: mongoose.Types.ObjectId;
    // Section 1
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
    facebookPage?: string;
    instagramPage?: string;
    tiktokPage?: string;
    otherSocials?: string;

    // Section 2
    productsDescription?: string;
    cbdThcProducts?: string;
    sellingDrinks?: boolean;
    distributingSamples?: boolean;
    sampleSizeOption?: boolean;
    containersAndUtensils?: string;
    compostableBrand?: string;
    foodAllergies?: string;
    animalProductFreeAck?: boolean;
    veganFoodAck?: boolean;
    compostableAck?: boolean;

    // Section 3
    loadInDay?: string;
    tablesChairs?: string[];
    otherEquipment?: string;
    vehicleDetails?: string;
    suppliesOrdered?: string[];
    suppliesQuantity?: string;
    amperageDraw?: string;
    standardPower?: boolean;
    electricalEquipment?: string;
    powerNeeds?: string;
    propaneAmount?: string;
    sunlightProtection?: string;
    fireExtinguisherAck?: boolean;
    propaneFireExtinguisherAck?: boolean;
    loadOutAck?: boolean;

    // Section 4
    foodLicenseUrl?: string;
    insuranceUrl?: string;
    st19Url?: string;
    st19SubmissionMethod?: string;

    // Section 5
    participatedBefore?: boolean;
    organizationCategory?: string;
    organizationYear?: string;
    promotesValues?: string[];
    valuesEmbodiment?: string;
    slidingScaleDiscount?: string;
    bipgmOwned?: boolean;
    culturalIdentity?: string;
    adaNeeds?: string;
    travelingOver100Miles?: boolean;
    soldElsewhere?: string;
    cookingDemo?: boolean;
    otherInfo?: string;

    // Section 6
    sponsorshipInterest?: boolean;
    sponsorExhibiting?: boolean;
    logoUrl?: string;
    couponBookParticipation?: boolean;
    couponOffer?: string;
    couponValidity?: string;
    couponForms?: string[];
    couponCode?: string;
    couponLogoUrl?: string;
    couponOtherInfo?: string;
    sponsorshipLevel?: string;

    // Admin Fields
    invoiced?: boolean;

    // Logistics Counts (Explicit fields for calculation)
    numTables?: number;
    numChairs?: number;
    numTents?: number;
    numWeights?: number;
    numExtraSpots?: number;

    type: RegistrationType;
    status: RegistrationStatus;
    websiteStatus?: WebsiteStatus;
    sectionStatus: {
        contact: boolean;
        products: boolean;
        logistics: boolean;
        documents: boolean;
        profile: boolean;
        sponsorship: boolean;
    };
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
        // Section 1: Contact & Basic Info
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
        facebookPage: String,
        instagramPage: String,
        tiktokPage: String,
        otherSocials: String,

        // Section 2: Products & Festival Guidelines
        productsDescription: String,
        cbdThcProducts: String,
        sellingDrinks: Boolean,
        distributingSamples: Boolean,
        sampleSizeOption: Boolean, // Agreement
        containersAndUtensils: String,
        compostableBrand: String,
        foodAllergies: String,
        animalProductFreeAck: Boolean,
        veganFoodAck: Boolean,
        compostableAck: Boolean,

        // Section 3: Logistics & Equipment
        loadInDay: String,
        tablesChairs: [String], // Checkbox items (Legacy/Visual)
        numTables: { type: Number, default: 0 },
        numChairs: { type: Number, default: 0 },
        numTents: { type: Number, default: 0 },
        numWeights: { type: Number, default: 0 },
        numExtraSpots: { type: Number, default: 0 },
        otherEquipment: String,
        vehicleDetails: String, // Dimensions if bringing vehicle
        suppliesOrdered: [String],
        suppliesQuantity: String, // Explanation if > 1
        amperageDraw: String,
        standardPower: Boolean,
        electricalEquipment: String,
        powerNeeds: String,
        propaneAmount: String,
        sunlightProtection: String,
        fireExtinguisherAck: Boolean,
        propaneFireExtinguisherAck: Boolean,
        loadOutAck: Boolean,

        // Section 4: Licensing & Insurance
        foodLicenseUrl: String,
        insuranceUrl: String,
        st19Url: String,
        st19SubmissionMethod: String,

        // Section 5: Exhibitor Profile & Event Participation
        participatedBefore: Boolean,
        organizationCategory: String,
        organizationYear: String,
        promotesValues: [String], // Grouped values
        valuesEmbodiment: String,
        slidingScaleDiscount: String,
        bipgmOwned: Boolean,
        culturalIdentity: String,
        adaNeeds: String,
        travelingOver100Miles: Boolean,
        soldElsewhere: String,
        cookingDemo: Boolean,
        otherInfo: String,

        // Section 6: Sponsorship & Marketing
        sponsorshipInterest: Boolean,
        sponsorExhibiting: Boolean,
        logoUrl: String,
        couponBookParticipation: Boolean,
        couponOffer: String,
        couponValidity: String, // Where valid
        couponForms: [String],
        couponCode: String,
        couponLogoUrl: String,
        couponOtherInfo: String,
        sponsorshipLevel: String,

        // Admin Fields
        invoiced: {
            type: Boolean,
            default: false,
            index: true
        },

        type: {
            type: String,
            enum: ['Exhibitor', 'Sponsor', 'Both'],
            required: true,
            default: 'Exhibitor'
        },
        status: {
            type: String,
            enum: ['In Progress', 'Pending', 'Approved', 'Declined'],
            default: 'In Progress',
        },
        websiteStatus: {
            type: String,
            enum: ['Pending', 'Added'],
            default: 'Pending',
        },
        sectionStatus: {
            contact: { type: Boolean, default: false },
            products: { type: Boolean, default: false },
            logistics: { type: Boolean, default: false },
            documents: { type: Boolean, default: false },
            profile: { type: Boolean, default: false },
            sponsorship: { type: Boolean, default: false },
        }
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
