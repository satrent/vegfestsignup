import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BoothArea {
  _id: string;
  name: string;
  polygon: { xPercentage: number, yPercentage: number }[];
}

export interface Booth {
  _id: string;
  boothNumber: number;
  type: 'regular' | 'foodTruck';
  areaId?: BoothArea; // populated with area details
  xPercentage: number;
  yPercentage: number;
  registrationId?: any; // populated with registration details (including tags)
  createdAt?: string;
  updatedAt?: string;
}

export interface UnassignedRegistration {
  _id: string;
  organizationName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  numBoothSpaces: number;
  assignedBoothIds: string[];
  type?: 'Exhibitor' | 'Sponsor' | 'Both';
  sponsorshipLevel?: string;
  sponsorshipInterest?: boolean;
  tags?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class BoothService {
  private apiUrl = `${environment.apiUrl}/booths`;
  private areaApiUrl = `${environment.apiUrl}/booth-areas`;

  constructor(private http: HttpClient) { }

  getBooths(): Observable<Booth[]> {
    return this.http.get<Booth[]>(this.apiUrl);
  }

  createBooth(boothNumber: number, type: 'regular' | 'foodTruck', areaId: string | null, xPercentage: number, yPercentage: number): Observable<Booth> {
    return this.http.post<Booth>(this.apiUrl, { boothNumber, type, areaId, xPercentage, yPercentage });
  }

  updateBoothCoords(id: string, xPercentage: number, yPercentage: number): Observable<Booth> {
    return this.http.put<Booth>(`${this.apiUrl}/${id}`, { xPercentage, yPercentage });
  }

  deleteBooth(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  assignRegistration(boothId: string, registrationId: string): Observable<Booth> {
    return this.http.put<Booth>(`${this.apiUrl}/${boothId}/assign`, { registrationId });
  }

  unassignRegistration(boothId: string): Observable<Booth> {
    return this.http.put<Booth>(`${this.apiUrl}/${boothId}/unassign`, {});
  }

  getUnassignedRegistrations(): Observable<UnassignedRegistration[]> {
    return this.http.get<UnassignedRegistration[]>(`${this.apiUrl}/unassigned`);
  }

  // ==== AREA METHODS ====
  getAreas(): Observable<BoothArea[]> {
    return this.http.get<BoothArea[]>(this.areaApiUrl);
  }

  createArea(name: string, polygon: { xPercentage: number, yPercentage: number }[]): Observable<BoothArea> {
    return this.http.post<BoothArea>(this.areaApiUrl, { name, polygon });
  }

  deleteArea(id: string): Observable<any> {
    return this.http.delete(`${this.areaApiUrl}/${id}`);
  }
}
