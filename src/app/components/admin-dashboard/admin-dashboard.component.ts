import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StorageService, Registration } from '../../services/storage.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <h2>Admin Dashboard</h2>
      
      <div class="stats">
        <div class="stat-card">
          <h3>Total</h3>
          <div class="value">{{ (registrations$ | async)?.length }}</div>
        </div>
        <div class="stat-card">
          <h3>Pending</h3>
          <div class="value">{{ getPendingCount(registrations$ | async) }}</div>
        </div>
      </div>

      <div class="registrations-list">
        <div *ngFor="let reg of registrations$ | async" class="registration-card" [class.approved]="reg.status === 'Approved'">
          <div class="card-header">
            <span class="type-badge" 
                  [class.sponsor]="reg.type === 'Sponsor'"
                  [class.both]="reg.type === 'Both'">
              {{ reg.type }}
            </span>
            <span class="status-badge" [ngClass]="reg.status.toLowerCase()">{{ reg.status }}</span>
          </div>
          
          <div class="card-body">
            <div class="logo-container" *ngIf="reg.logoUrl">
              <img [src]="reg.logoUrl" alt="Organization Logo">
            </div>
            
            <div class="details">
              <h3>{{ reg.organizationName }}</h3>
              
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">Contact:</span>
                  {{ reg.firstName }} {{ reg.lastName }}
                </div>
                <div class="info-item">
                  <span class="label">Email:</span>
                  <a [href]="'mailto:' + reg.email">{{ reg.email }}</a>
                </div>
                <div class="info-item" *ngIf="reg.phone">
                  <span class="label">Phone:</span>
                  {{ reg.phone }}
                </div>
                <div class="info-item" *ngIf="reg.website">
                  <span class="label">Website:</span>
                  <a [href]="reg.website" target="_blank">{{ reg.website }}</a>
                </div>
                <div class="info-item full-width" *ngIf="reg.address">
                  <span class="label">Address:</span>
                  {{ reg.address }}, {{ reg.city }}, {{ reg.state }} {{ reg.zip }}
                </div>
                <div class="info-item full-width" *ngIf="reg.description">
                  <span class="label">Description:</span>
                  <p class="description-text">{{ reg.description }}</p>
                </div>
                <div class="info-item full-width" *ngIf="reg.participatedBefore">
                  <span class="tag">Returning Participant</span>
                </div>
              </div>

              <p class="date">Registered: {{ reg.timestamp | date:'medium' }}</p>
            </div>
          </div>
          
          <div class="actions" *ngIf="reg.status === 'Pending'">
            <button (click)="approve(reg.id)" class="approve-btn">Approve</button>
            <button (click)="reject(reg.id)" class="reject-btn">Reject</button>
          </div>
        </div>
        
        <div *ngIf="(registrations$ | async)?.length === 0" class="empty-state">
          No registrations yet.
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
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      text-align: center;
    }
    .stat-card h3 {
      margin: 0;
      color: #666;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .stat-card .value {
      font-size: 2rem;
      font-weight: 700;
      color: #2c3e50;
      margin-top: 0.5rem;
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
      border-left: 5px solid #cbd5e0;
      transition: transform 0.2s;
    }
    .registration-card:hover {
      transform: translateY(-2px);
    }
    .registration-card.approved {
      border-left-color: #48bb78;
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
    .logo-container {
      flex-shrink: 0;
      width: 100px;
      height: 100px;
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
    .details {
      flex-grow: 1;
    }
    .type-badge {
      background: #ebf8ff;
      color: #4299e1;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .type-badge.sponsor {
      background: #faf5ff;
      color: #805ad5;
    }
    .type-badge.both {
      background: #fff5f7;
      color: #d53f8c;
    }
    .status-badge {
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
    }
    .status-badge.pending { background: #fffaf0; color: #dd6b20; }
    .status-badge.approved { background: #f0fff4; color: #38a169; }
    .status-badge.rejected { background: #fff5f5; color: #e53e3e; }
    
    h3 { margin: 0 0 1rem 0; color: #2d3748; font-size: 1.4rem; }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .info-item {
      font-size: 0.95rem;
      color: #4a5568;
    }
    .info-item.full-width {
      grid-column: 1 / -1;
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
    
    .date { color: #a0aec0; font-size: 0.85rem; margin-top: 1rem; }
    
    .actions {
      margin-top: 1.5rem;
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      border-top: 1px solid #edf2f7;
      padding-top: 1rem;
    }
    button {
      padding: 0.5rem 1.5rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.2s;
    }
    .approve-btn { background: #48bb78; color: white; }
    .approve-btn:hover { background: #38a169; }
    .reject-btn { background: #fc8181; color: white; }
    .reject-btn:hover { background: #f56565; }
    
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
export class AdminDashboardComponent {
  private storageService = inject(StorageService);
  registrations$ = this.storageService.registrations$;

  getPendingCount(registrations: Registration[] | null): number {
    return registrations?.filter(r => r.status === 'Pending').length || 0;
  }

  approve(id: string) {
    this.storageService.updateStatus(id, 'Approved');
  }

  reject(id: string) {
    this.storageService.updateStatus(id, 'Rejected');
  }
}
