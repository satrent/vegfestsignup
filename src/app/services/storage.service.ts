import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Registration {
  id: string;
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
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly STORAGE_KEY = 'vegfest_registrations';
  private registrationsSubject = new BehaviorSubject<Registration[]>([]);

  registrations$ = this.registrationsSubject.asObservable();

  constructor() {
    this.loadRegistrations();
  }

  private loadRegistrations() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (data) {
      this.registrationsSubject.next(JSON.parse(data));
    }
  }

  addRegistration(registration: Omit<Registration, 'id' | 'timestamp' | 'status'>) {
    const newRegistration: Registration = {
      ...registration,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      status: 'Pending'
    };

    const current = this.registrationsSubject.value;
    const updated = [...current, newRegistration];
    this.save(updated);
  }

  updateStatus(id: string, status: Registration['status']) {
    const current = this.registrationsSubject.value;
    const updated = current.map(r => r.id === id ? { ...r, status } : r);
    this.save(updated);
  }

  updateWebsiteStatus(id: string, websiteStatus: Registration['websiteStatus']) {
    const current = this.registrationsSubject.value;
    const updated = current.map(r => r.id === id ? { ...r, websiteStatus } : r);
    this.save(updated);
  }

  private save(registrations: Registration[]) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(registrations));
    this.registrationsSubject.next(registrations);
  }
}
