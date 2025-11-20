import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StorageService, Registration } from '../../services/storage.service';
import { VerificationService, VerificationResult } from '../../services/verification.service';
import { map } from 'rxjs/operators';

interface RegistrationWithVerification extends Registration {
  verification?: VerificationResult;
  isVerifying?: boolean;
}

@Component({
  selector: 'app-web-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <h2>Web Admin Dashboard</h2>
      
      <div class="filters">
        <button 
          [class.active]="currentFilter === 'Pending'"
          (click)="setFilter('Pending')">
          Needs Website Update ({{ (pendingCount$ | async) || 0 }})
        </button>
        <button 
          [class.active]="currentFilter === 'Added'"
          (click)="setFilter('Added')">
          Added to Website ({{ (addedCount$ | async) || 0 }})
        </button>
      </div>

      <div class="actions-bar" *ngIf="currentFilter === 'Added'">
        <button class="verify-all-btn" (click)="verifyAll()" [disabled]="isVerifyingAll">
          {{ isVerifyingAll ? 'Verifying...' : 'Verify Website Listings' }}
        </button>
      </div>

      <div class="registrations-list">
        <div *ngFor="let reg of filteredRegistrations$ | async" class="registration-card">
          <div class="card-header">
            <span class="type-badge" 
                  [class.sponsor]="reg.type === 'Sponsor'"
                  [class.both]="reg.type === 'Both'">
              {{ reg.type }}
            </span>
            <span class="status-badge approved">Approved</span>
          </div>

          <div class="verification-status" *ngIf="reg.verification">
            <div class="status-row" [class.found]="reg.verification.found" [class.missing]="!reg.verification.found">
              <span class="icon">{{ reg.verification.found ? '✅' : '❌' }}</span>
              <span class="text">
                {{ reg.verification.found ? 'Verified on Live Site' : 'Not Found on Live Site' }}
              </span>
              <span class="time">Checked: {{ reg.verification.lastChecked | date:'mediumTime' }}</span>
            </div>
          </div>
          
          <div class="card-body">
            <div class="logo-container" *ngIf="reg.logoUrl">
              <img [src]="reg.logoUrl" alt="Organization Logo">
            </div>
            <div class="logo-placeholder" *ngIf="!reg.logoUrl">
              No Logo
            </div>
            
            <div class="details">
              <h3>{{ reg.organizationName }}</h3>
              
              <div class="info-grid">
                <div class="info-item full-width" *ngIf="reg.description">
                  <span class="label">Description:</span>
                  <p class="description-text">{{ reg.description }}</p>
                </div>
                <div class="info-item" *ngIf="reg.website">
                  <span class="label">Website:</span>
                  <a [href]="reg.website" target="_blank">{{ reg.website }}</a>
                </div>
                <div class="info-item" *ngIf="reg.participatedBefore">
                  <span class="tag">Returning Participant</span>
                </div>
              </div>

              <div class="actions">
                <button *ngIf="!reg.websiteStatus || reg.websiteStatus === 'Pending'" 
                        (click)="markAsAdded(reg.id)" 
                        class="action-btn add-btn">
                  Mark as Added to Website
                </button>
                <button *ngIf="reg.websiteStatus === 'Added'" 
                        (click)="markAsPending(reg.id)" 
                        class="action-btn undo-btn">
                  Undo (Mark as Pending)
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div *ngIf="(filteredRegistrations$ | async)?.length === 0" class="empty-state">
          No registrations found for this filter.
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      max-width: 800px;
      margin: 2rem auto;
      padding: 0 1rem;
    }
    h2 {
      color: #2c3e50;
      margin-bottom: 2rem;
    }
    .filters {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .filters button {
      padding: 0.75rem 1.5rem;
      border: 1px solid #e2e8f0;
      background: white;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      color: #4a5568;
      transition: all 0.2s;
    }
    .filters button.active {
      background: #4299e1;
      color: white;
      border-color: #4299e1;
    }
    
    .actions-bar {
      margin-bottom: 1.5rem;
      display: flex;
      justify-content: flex-end;
    }
    .verify-all-btn {
      background: #805ad5;
      color: white;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .verify-all-btn:hover:not(:disabled) {
      background: #6b46c1;
    }
    .verify-all-btn:disabled {
      background: #d6bcfa;
      cursor: wait;
    }

    .verification-status {
      margin-bottom: 1rem;
      padding: 0.75rem;
      border-radius: 6px;
      background: #f7fafc;
      border: 1px solid #edf2f7;
    }
    .status-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      font-weight: 600;
    }
    .status-row.found { color: #38a169; }
    .status-row.missing { color: #e53e3e; }
    .status-row .time { 
      margin-left: auto; 
      color: #a0aec0; 
      font-weight: normal;
      font-size: 0.8rem;
    }

    .registrations-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .registration-card {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      border-left: 5px solid #4299e1;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1rem;
    }
    .card-body {
      display: flex;
      gap: 1.5rem;
    }
    .logo-container, .logo-placeholder {
      flex-shrink: 0;
      width: 120px;
      height: 120px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
    }
    .logo-container img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .logo-placeholder {
      color: #a0aec0;
      font-size: 0.9rem;
      font-style: italic;
    }
    .details {
      flex-grow: 1;
    }
    h3 { margin: 0 0 1rem 0; color: #2d3748; font-size: 1.4rem; }
    
    .info-grid {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }
    .label {
      font-weight: 600;
      color: #718096;
      margin-right: 0.25rem;
    }
    .description-text {
      margin: 0.25rem 0 0;
      color: #4a5568;
      line-height: 1.5;
    }
    .tag {
      display: inline-block;
      background: #edf2f7;
      color: #4a5568;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.85rem;
    }
    
    .type-badge {
      background: #ebf8ff;
      color: #4299e1;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .type-badge.sponsor { background: #faf5ff; color: #805ad5; }
    .type-badge.both { background: #fff5f7; color: #d53f8c; }
    
    .status-badge {
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      background: #f0fff4;
      color: #38a169;
    }
    
    .actions {
      border-top: 1px solid #edf2f7;
      padding-top: 1rem;
    }
    .action-btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.2s;
    }
    .add-btn {
      background: #4299e1;
      color: white;
    }
    .add-btn:hover {
      background: #3182ce;
    }
    .undo-btn {
      background: #cbd5e0;
      color: #4a5568;
    }
    .undo-btn:hover {
      background: #a0aec0;
    }
    .empty-state {
      text-align: center;
      padding: 3rem;
      color: #a0aec0;
      background: white;
      border-radius: 12px;
    }
      margin-bottom: 2rem;
    }
    .filters {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .filters button {
      padding: 0.75rem 1.5rem;
      border: 1px solid #e2e8f0;
      background: white;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      color: #4a5568;
      transition: all 0.2s;
    }
    .filters button.active {
      background: #4299e1;
      color: white;
      border-color: #4299e1;
    }
    
    .actions-bar {
      margin-bottom: 1.5rem;
      display: flex;
      justify-content: flex-end;
    }
    .verify-all-btn {
      background: #805ad5;
      color: white;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .verify-all-btn:hover:not(:disabled) {
      background: #6b46c1;
    }
    .verify-all-btn:disabled {
      background: #d6bcfa;
      cursor: wait;
    }

    .verification-status {
      margin-bottom: 1rem;
      padding: 0.75rem;
      border-radius: 6px;
      background: #f7fafc;
      border: 1px solid #edf2f7;
    }
    .status-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      font-weight: 600;
    }
    .status-row.found { color: #38a169; }
    .status-row.missing { color: #e53e3e; }
    .status-row .time { 
      margin-left: auto; 
      color: #a0aec0; 
      font-weight: normal;
      font-size: 0.8rem;
    }

    .registrations-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .registration-card {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      border-left: 5px solid #4299e1;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1rem;
    }
    .card-body {
      display: flex;
      gap: 1.5rem;
    }
    .logo-container, .logo-placeholder {
      flex-shrink: 0;
      width: 120px;
      height: 120px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
    }
    .logo-container img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .logo-placeholder {
      color: #a0aec0;
      font-size: 0.9rem;
      font-style: italic;
    }
    .details {
      flex-grow: 1;
    }
    h3 { margin: 0 0 1rem 0; color: #2d3748; font-size: 1.4rem; }
    
    .info-grid {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }
    .label {
      font-weight: 600;
      color: #718096;
      margin-right: 0.25rem;
    }
    .description-text {
      margin: 0.25rem 0 0;
      color: #4a5568;
      line-height: 1.5;
    }
    .tag {
      display: inline-block;
      background: #edf2f7;
      color: #4a5568;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.85rem;
    }
    
    .type-badge {
      background: #ebf8ff;
      color: #4299e1;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .type-badge.sponsor { background: #faf5ff; color: #805ad5; }
    .type-badge.both { background: #fff5f7; color: #d53f8c; }
    
    .status-badge {
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      background: #f0fff4;
      color: #38a169;
    }
    
    .actions {
      border-top: 1px solid #edf2f7;
      padding-top: 1rem;
    }
    .action-btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.2s;
    }
    .add-btn {
      background: #4299e1;
      color: white;
    }
    .add-btn:hover {
      background: #3182ce;
    }
    .undo-btn {
      background: #cbd5e0;
      color: #4a5568;
    }
    .undo-btn:hover {
      background: #a0aec0;
    }
    .empty-state {
      text-align: center;
      padding: 3rem;
      color: #a0aec0;
      background: white;
      border-radius: 12px;
    }
    a { color: #4299e1; text-decoration: none; }
    a:hover { text-decoration: underline; }
  `]
})
export class WebAdminDashboardComponent {
  private storageService = inject(StorageService);
  private verificationService = inject(VerificationService);

  currentFilter: 'Pending' | 'Added' = 'Pending';
  isVerifyingAll = false;

  // Local state to store verification results
  verificationResults = new Map<string, VerificationResult>();

  // Base observable of all approved registrations
  approvedRegistrations$ = this.storageService.registrations$.pipe(
    map(regs => regs.filter(r => r.status === 'Approved'))
  );

  // Filtered list based on current selection, merged with verification results
  filteredRegistrations$ = this.approvedRegistrations$.pipe(
    map(regs => {
      const filtered = regs.filter(r => {
        const status = r.websiteStatus || 'Pending';
        return status === this.currentFilter;
      });

      return filtered.map(r => ({
        ...r,
        verification: this.verificationResults.get(r.id)
      } as RegistrationWithVerification));
    })
  );

  // Counts for the buttons
  pendingCount$ = this.approvedRegistrations$.pipe(
    map(regs => regs.filter(r => (r.websiteStatus || 'Pending') === 'Pending').length)
  );

  addedCount$ = this.approvedRegistrations$.pipe(
    map(regs => regs.filter(r => r.websiteStatus === 'Added').length)
  );

  setFilter(filter: 'Pending' | 'Added') {
    this.currentFilter = filter;
    // Force update by re-assigning (simple trigger)
    this.triggerUpdate();
  }

  triggerUpdate() {
    this.filteredRegistrations$ = this.approvedRegistrations$.pipe(
      map(regs => {
        const filtered = regs.filter(r => {
          const status = r.websiteStatus || 'Pending';
          return status === this.currentFilter;
        });

        return filtered.map(r => ({
          ...r,
          verification: this.verificationResults.get(r.id)
        } as RegistrationWithVerification));
      })
    );
  }

  markAsAdded(id: string) {
    this.storageService.updateWebsiteStatus(id, 'Added');
    this.triggerUpdate();
  }

  markAsPending(id: string) {
    this.storageService.updateWebsiteStatus(id, 'Pending');
    this.verificationResults.delete(id); // Clear verification if moved back
    this.triggerUpdate();
  }

  verifyAll() {
    this.isVerifyingAll = true;

    // Get current list of "Added" registrations
    this.approvedRegistrations$.subscribe(regs => {
      const addedRegs = regs.filter(r => r.websiteStatus === 'Added');
      let completed = 0;

      if (addedRegs.length === 0) {
        this.isVerifyingAll = false;
        return;
      }

      addedRegs.forEach(reg => {
        this.verificationService.verifyExhibitor(reg.organizationName).subscribe(result => {
          this.verificationResults.set(reg.id, result);
          completed++;

          if (completed === addedRegs.length) {
            this.isVerifyingAll = false;
            this.triggerUpdate();
          }
        });
      });
    });
  }
}
