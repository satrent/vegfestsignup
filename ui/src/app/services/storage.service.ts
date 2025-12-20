import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';

export interface Registration {
  _id?: string;
  userId?: string;
  // Section 1
  organizationName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  onSite?: 'yes' | 'no' | 'unsure';
  onSiteContact?: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };
  establishedDate?: string;

  website?: string;
  instagram?: string; // or instagramPage
  facebook?: string; // or facebookPage

  address?: string;
  city?: string;
  state?: string;
  zip?: string;

  // social/legacy mapped to above or kept optional
  facebookPage?: string;
  instagramPage?: string;
  tiktokPage?: string;
  otherSocials?: string;


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

  // Section 3: Values
  valuesDescription?: string;
  materialsAck?: boolean;

  // Section 4 (formerly 3)
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

  // Section 4
  foodLicenseUrl?: string;
  insuranceUrl?: string;
  st19Url?: string;
  st19SubmissionMethod?: string;
  documents?: {
    type: string;
    name: string;
    key: string;
    location: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    uploadedAt: Date;
  }[];

  // Section 5
  participatedBefore?: boolean;
  soldElsewhere?: string; // Moved/Shared

  ownerDemographics?: string[];
  isVeganOwners?: boolean;
  isVeganProducts?: boolean;

  // organizationCategory moved to Section 2

  organizationYear?: string;
  promotesValues?: string[];
  valuesEmbodiment?: string;
  slidingScaleDiscount?: string;
  bipgmOwned?: boolean;
  culturalIdentity?: string;
  adaNeeds?: string;
  travelingOver100Miles?: boolean;
  // soldElsewhere used to be here
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

  // Admin Fields
  invoiced?: boolean;
  approvedBy?: string[];


  // Billing
  initialInvoiceAmount?: number;
  amountPaid?: number;

  type: 'Exhibitor' | 'Sponsor' | 'Both';
  status: 'In Progress' | 'Pending' | 'Waiting for Approval' | 'Approved' | 'Declined';
  websiteStatus?: 'Pending' | 'Added';
  sectionStatus?: {
    contact: boolean;
    products: boolean;
    values: boolean;
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
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  // Get all registrations (admin only)
  loadRegistrations(): Observable<Registration[]> {
    return this.api.get<Registration[]>('/registrations');
  }

  // Export to QuickBooks
  exportQuickBooks(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/registrations/export/quickbooks`, { responseType: 'blob' });
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

  // Submit registration (change status to Pending)
  submitRegistration(id: string): Observable<Registration> {
    return this.api.post<Registration>(`/registrations/${id}/submit`, {});
  }

  // Update registration (partial update)
  updateRegistration(id: string, updates: Partial<Registration>): Observable<Registration> {
    return this.api.patch<Registration>(`/registrations/${id}`, updates);
  }

  // Update registration status (admin only)
  updateRegistrationStatus(id: string, status: 'Pending' | 'Approved' | 'Declined'): Observable<Registration> {
    return this.api.patch<Registration>(`/registrations/${id}/status`, { status });
  }




  // Upload a document
  uploadDocument(file: File, documentType: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    return this.http.post(`${this.baseUrl}/upload`, formData);
  }

  // Get signed URL for a document
  getDocumentUrl(key: string): Observable<{ url: string }> {
    return this.api.get<{ url: string }>(`/upload/url?key=${encodeURIComponent(key)}`);
  }

  // Update website status (web admin only)
  updateWebsiteStatus(id: string, websiteStatus: 'Pending' | 'Added'): Observable<Registration> {
    return this.api.patch<Registration>(`/registrations/${id}/website-status`, { websiteStatus });
  }

  getRegistrationLogs(id: string): Observable<any[]> {
    return this.api.get<any[]>(`/registrations/${id}/logs`);
  }
}
