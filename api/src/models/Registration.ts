import mongoose, { Document, Schema } from 'mongoose';

export type RegistrationType = 'Exhibitor' | 'Sponsor' | 'Both';
export type RegistrationStatus = 'In Progress' | 'Pending' | 'Approved' | 'Declined';
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
    establishedDate?: string; // Deprecated
    establishedMonth?: string;
    establishedYear?: string;
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
    isVeganProductsSome?: boolean;


    // Section 2
    organizationCategory?: string;
    productsDescription?: string;
    productPhotos?: string[];

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

    // Section 3: Values (New)
    valuesDescription?: string;
    materialsAck?: boolean;

    // Section 3: Logistics & Equipment (Now Section 4)
    // Section 4: Booth & Logistics
    numBoothSpaces?: number;
    numTables?: number;
    numChairs?: number;
    numTents?: number;

    powerNeeds?: string;
    householdElectric?: boolean;
    electricNeedsDescription?: string;

    onSiteSales?: boolean;
    priceRange?: string;

    loadInVehicle?: string;
    vehicleDimensions?: string;
    loadInAvailability?: string;

    // Section 5: Food/THC Compliance
    cookingOnSite?: boolean;
    isFoodTruck?: boolean;
    thcProductSales?: boolean;
    foodOfferings?: '100% Vegan' | 'Mixed';
    foodOfferingsRejectAck?: boolean;
    fiveDollarItemAck?: boolean;
    menuOption?: 'upload_now' | 'later';
    compostableServicewareAck?: boolean;
    servingDrinks?: string[];
    bottledWaterAck?: boolean;
    propaneOpenFlame?: boolean;
    propaneAmount?: string;
    handwashingAck?: boolean;
    thcComplianceAck?: boolean;

    // Section 7: Expectations & Terms
    orientationSession?: string;
    termsAgreement?: boolean;
    signature?: string;

    // Section 4 (Documents)
    foodLicenseUrl?: string; // @deprecated
    insuranceUrl?: string;
    coiOption?: 'upload_now' | 'later';
    st19Url?: string;
    st19Option?: 'upload_now' | 'later';
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
    // organizationCategory moved to Section 2

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
    sponsoredBefore?: boolean;
    swagBagParticipation?: boolean;
    swagDistributionInterest?: 'coupons' | 'products';
    swagDistributionItem?: string;
    palletsDonation?: boolean;

    // Admin Fields
    invoiced?: boolean;

    // Logistics Counts (Explicit fields for calculation)
    numWeights?: number;
    numExtraSpots?: number;

    // Billing
    initialInvoiceAmount?: number;
    amountPaid?: number;
    paymentId?: string;
    paymentReceipt?: string;
    paymentDate?: Date;

    type: RegistrationType;
    status: RegistrationStatus;
    approvedBy?: mongoose.Types.ObjectId[];
    websiteStatus?: WebsiteStatus;
    sectionStatus: {
        contact: boolean;
        products: boolean;
        values: boolean;
        logistics: boolean;
        documents: boolean;
        foodCompliance: boolean;
        profile: boolean;
        sponsorship: boolean;
        expectations: boolean;
        payment: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
    tags?: string[];
    lastReminderSent?: Date;
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
        establishedDate: String, // Deprecated
        establishedMonth: String,
        establishedYear: String,
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
        instagram: String,
        facebook: String,

        // Address
        address: String,
        city: String,
        state: String,
        zip: String,

        // History
        participatedBefore: Boolean,
        soldElsewhere: String,

        // Demographics
        ownerDemographics: [String],

        // Vegan Status
        isVeganOwners: Boolean,
        isVeganProducts: Boolean,
        isVeganProductsSome: Boolean,


        // Section 2: Products & Festival Guidelines
        organizationCategory: String, // Moved/Centralized here
        productsDescription: String,
        productPhotos: [String], // URL(s) of uploaded photos
        // Legacy/Removed from UI but keeping in schema for safety if needed, or user said they'd clear DB

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

        // Section 4: Booth & Logistics
        numBoothSpaces: { type: Number, default: 0 },
        numTables: { type: Number, default: 0 },
        numChairs: { type: Number, default: 0 },
        numTents: { type: Number, default: 0 },

        powerNeeds: {
            type: String,
            enum: ['None', '5A', '10A', '15A', '20A'],
            default: 'None'
        },
        householdElectric: Boolean,
        electricNeedsDescription: String,

        onSiteSales: { type: Boolean, default: false },
        priceRange: String,

        loadInVehicle: {
            type: String,
            enum: ['Car', 'SUV', 'Van', 'Box truck', 'Other']
        },
        vehicleDimensions: String,
        loadInAvailability: String, // '2pm to 5pm September 19', 'Event morning window'

        // Section 5: Food/THC Compliance
        cookingOnSite: Boolean,
        isFoodTruck: Boolean,
        thcProductSales: Boolean, // "Will you sell food products containing THC?"
        foodOfferings: {
            type: String,
            enum: ['100% Vegan', 'Mixed']
        },
        foodOfferingsRejectAck: Boolean, // System flag if they tried to submit Mixed
        fiveDollarItemAck: Boolean,
        menuOption: {
            type: String,
            enum: ['upload_now', 'later'],
            default: 'upload_now'
        },
        // reusing documents.type='Menu' for the file

        compostableServicewareAck: Boolean,
        servingDrinks: [String],
        bottledWaterAck: Boolean,

        propaneOpenFlame: Boolean,
        propaneAmount: String,
        handwashingAck: Boolean,

        thcComplianceAck: Boolean,

        // Section 7: Expectations & Terms
        orientationSession: String,
        termsAgreement: Boolean,
        signature: String,

        // Section 6: Documents
        foodLicenseUrl: String, // @deprecated
        insuranceUrl: String,
        coiOption: {
            type: String,
            enum: ['upload_now', 'later'],
            default: 'upload_now' // Default to upload now for existing data compatibility or strictness
        },
        st19Url: String,
        st19Option: {
            type: String,
            enum: ['upload_now', 'later'],
            default: 'upload_now'
        },
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
        // organizationCategory moved to Section 2 group above

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
        sponsoredBefore: Boolean,
        swagBagParticipation: Boolean,
        swagDistributionInterest: {
            type: String,
            enum: ['coupons', 'products']
        },
        swagDistributionItem: String,
        palletsDonation: Boolean,

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
        paymentId: String,
        paymentReceipt: String,
        paymentDate: Date,

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
            values: { type: Boolean, default: false },
            logistics: { type: Boolean, default: false },
            foodCompliance: { type: Boolean, default: false },
            documents: { type: Boolean, default: false },
            expectations: { type: Boolean, default: false },
            payment: { type: Boolean, default: false },
        },
        tags: [String],
        lastReminderSent: Date
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
