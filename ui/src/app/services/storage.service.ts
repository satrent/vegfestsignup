import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface Registration {
  _id?: string;
  userId?: string;
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

  type: 'Exhibitor' | 'Sponsor' | 'Both';
  status: 'Pending' | 'Approved' | 'Rejected';
  websiteStatus?: 'Pending' | 'Added';
  sectionStatus?: {
    contact: boolean;
    products: boolean;
    logistics: boolean;
    documents: boolean;
    profile: boolean;
    sponsorship: boolean;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private api = inject(ApiService);

  // Get all registrations (admin only)
  loadRegistrations(): Observable<Registration[]> {
    return this.api.get<Registration[]>('/registrations');
  }

  // Get current user's registrations
  getMyRegistrations(): Observable<Registration[]> {
    return this.api.get<Registration[]>('/registrations/my-registrations');
  }

  // Get current user's latest registration
  getLatestRegistration(): Observable<Registration> {
    return this.api.get<Registration>('/registrations/latest');
  }

  // Create new registration
  saveRegistration(registration: Registration): Observable<Registration> {
    return this.api.post<Registration>('/registrations', registration);
  }

  // Update registration (partial update)
  updateRegistration(id: string, updates: Partial<Registration>): Observable<Registration> {
    return this.api.patch<Registration>(`/registrations/${id}`, updates);
  }

  // Update registration status (admin only)
  updateRegistrationStatus(id: string, status: 'Pending' | 'Approved' | 'Rejected'): Observable<Registration> {
    return this.api.patch<Registration>(`/registrations/${id}/status`, { status });
  }

  // Update website status (web admin only)
  updateWebsiteStatus(id: string, websiteStatus: 'Pending' | 'Added'): Observable<Registration> {
    return this.api.patch<Registration>(`/registrations/${id}/website-status`, { websiteStatus });
  }
}
