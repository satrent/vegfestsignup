import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface Registration {
  _id?: string;
  userId?: string;
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
  type: 'Exhibitor' | 'Sponsor' | 'Both';
  status: 'Pending' | 'Approved' | 'Rejected';
  websiteStatus?: 'Pending' | 'Added';
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

  // Create new registration
  saveRegistration(registration: Registration): Observable<Registration> {
    return this.api.post<Registration>('/registrations', registration);
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
