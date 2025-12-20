import mongoose, { Document, Schema } from 'mongoose';

export type RegistrationType = 'Exhibitor' | 'Sponsor' | 'Both';
export type RegistrationStatus = 'In Progress' | 'Pending' | 'Waiting for Approval' | 'Approved' | 'Declined';
export type WebsiteStatus = 'Pending' | 'Added';

export interface IRegistration extends Document {
    userId: mongoose.Types.ObjectId;
    // Section 1
    // Section 1 - Basics
    firstName: string;
    lastName: string;
    onSite?: 'yes' | 'no' | 'unsure';
    onSiteContact?: {
        firstName: string;
        lastName: string;
        phone: string;
        email: string;
    };
    organizationName: string;
    establishedDate?: string;
    email: string;
    phone: string;
    website?: string;
    instagram?: string;
    facebook?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;

    participatedBefore?: boolean;
    soldElsewhere?: string;
    ownerDemographics?: string[];
    isVeganOwners?: boolean;
    isVeganProducts?: boolean;


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
    st19SubmissionMethod?: string; // @deprecated
    documents: {
        type: string; // 'Food License', 'COI', 'ST-19'
        name: string;
        key: string;
        location: string;
        status: 'Pending' | 'Approved' | 'Rejected';
        uploadedAt: Date;
    }[];

    // Section 5
    // participatedBefore moved to Section 1
    organizationCategory?: string;
    organizationYear?: string;
    promotesValues?: string[];
    valuesEmbodiment?: string;
    slidingScaleDiscount?: string;
    bipgmOwned?: boolean;
    culturalIdentity?: string;
    adaNeeds?: string;
    travelingOver100Miles?: boolean;
    // soldElsewhere moved to Section 1
    cookingDemo?: boolean;
    otherInfo?: string;


    // Section 6
    sponsorshipInterest?: boolean;
    sponsorExhibiting?: boolean;
    isProductSponsor?: boolean;
    productSponsorDetails?: string;
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

    // Billing
    initialInvoiceAmount?: number;
    amountPaid?: number;

    type: RegistrationType;
    status: RegistrationStatus;
    approvedBy?: mongoose.Types.ObjectId[];
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
        // Section 1: Bascis & Contact
        // Contact Name
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
        // On Site
        onSite: {
            type: String,
            enum: ['yes', 'no', 'unsure'],
            // required: true, // Making optional for now to avoid breaking existing drafts if any, but UI will enforce
        },
        onSiteContact: {
            firstName: String,
            lastName: String,
            phone: String,
            email: String,
        },
        // Org Info
        organizationName: {
            type: String,
            required: true,
            trim: true,
        },
        establishedDate: String,
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        phone: {
            type: String,
            required: true,
            trim: true,
        },
        // Website/Socials
        website: String,
        instagram: String, // Renaming or mapping 'instagramPage' to 'instagram' for consistency if easier, or keeping 'instagramPage'
        facebook: String, // Renaming 'facebookPage' to 'facebook'

        // Address
        address: String,
        city: String,
        state: String,
        zip: String,

        // History
        participatedBefore: Boolean, // Moved from Section 5
        soldElsewhere: String, // Moved from Section 5 (only if no on TCVF)

        // Demographics
        ownerDemographics: [String], // African or Black, Asian, etc.

        // Vegan Status
        isVeganOwners: Boolean,
        isVeganProducts: Boolean,


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
        foodLicenseUrl: String, // @deprecated
        insuranceUrl: String, // @deprecated
        st19Url: String, // @deprecated
        st19SubmissionMethod: String, // @deprecated
        documents: [{
            type: { type: String, required: true }, // 'Food License', 'COI', 'ST-19'
            name: { type: String, required: true },
            key: { type: String, required: true },
            location: { type: String, required: true },
            status: {
                type: String,
                enum: ['Pending', 'Approved', 'Rejected'],
                default: 'Pending'
            },
            uploadedAt: { type: Date, default: Date.now }
        }],

        // Section 5: Exhibitor Profile & Event Participation
        // Section 5: Exhibitor Profile & Event Participation
        // participatedBefore: Boolean, // Moved
        organizationCategory: String,
        organizationYear: String,
        promotesValues: [String], // Grouped values
        valuesEmbodiment: String,
        slidingScaleDiscount: String,
        bipgmOwned: Boolean,
        culturalIdentity: String,
        adaNeeds: String,
        travelingOver100Miles: Boolean,
        // soldElsewhere: String, // Moved
        cookingDemo: Boolean,
        otherInfo: String,


        // Section 6: Sponsorship & Marketing
        sponsorshipInterest: Boolean,
        sponsorExhibiting: Boolean,
        isProductSponsor: Boolean,
        productSponsorDetails: String,
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
        initialInvoiceAmount: {
            type: Number,
            default: 0
        },
        amountPaid: {
            type: Number,
            default: 0
        },

        type: {
            type: String,
            enum: ['Exhibitor', 'Sponsor', 'Both'],
            required: true,
            default: 'Exhibitor'
        },
        status: {
            type: String,
            enum: ['In Progress', 'Pending', 'Waiting for Approval', 'Approved', 'Declined'],
            default: 'In Progress',
        },
        approvedBy: [{
            type: Schema.Types.ObjectId,
            ref: 'User'
        }],
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
