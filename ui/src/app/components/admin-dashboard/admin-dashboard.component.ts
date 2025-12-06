import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Added import
import { Router } from '@angular/router';
import { StorageService, Registration } from '../../services/storage.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule], // Added FormsModule
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  private storageService = inject(StorageService);
  private authService = inject(AuthService);
  private router = inject(Router);

  registrations: Registration[] = [];
  loading = true;
  error = '';

  ngOnInit(): void {
    this.loadRegistrations();
  }

  loadRegistrations(): void {
    this.loading = true;
    this.error = '';

    this.storageService.loadRegistrations().subscribe({
      next: (data) => {
        this.registrations = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load registrations';
        this.loading = false;
        console.error('Error loading registrations:', err);
      }
    });
  }

  updateStatus(id: string, status: 'Pending' | 'Approved' | 'Rejected'): void {
    if (!id) {
      console.error('No registration ID provided');
      return;
    }

    this.storageService.updateRegistrationStatus(id, status).subscribe({
      next: (updatedRegistration) => {
        // Update the local array
        const index = this.registrations.findIndex(r => r._id === id);
        if (index !== -1) {
          this.registrations[index] = updatedRegistration;
        }
      },
      error: (err) => {
        alert('Failed to update status');
        console.error('Error updating status:', err);
      }
    });
  }

  updateInvoiceNumber(registration: Registration): void {
    if (!registration._id || registration.invoiceNumber === undefined) return;

    this.storageService.updateInvoiceNumber(registration._id, registration.invoiceNumber).subscribe({
      next: (updatedRegistration) => {
        // Update local object if needed, though ngModel probably kept it in sync
        const index = this.registrations.findIndex(r => r._id === updatedRegistration._id);
        if (index !== -1) {
          this.registrations[index].invoiceNumber = updatedRegistration.invoiceNumber;
        }
        alert('Invoice number saved');
      },
      error: (err) => {
        console.error('Error updating invoice number:', err);
        alert('Failed to update invoice number');
      }
    });
  }

  exportToQuickBooks(): void {
    this.storageService.exportQuickBooks().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vegfest_export_quickbooks.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error exporting to QuickBooks:', err);
        alert('Failed to export to QuickBooks');
      }
    });
  }

  // Log Modal
  selectedLogs: any[] = [];
  showLogModal = false;
  selectedRegistrationName = '';

  viewLogs(registration: Registration) {
    if (!registration._id) return;

    this.selectedRegistrationName = registration.organizationName;
    this.storageService.getRegistrationLogs(registration._id).subscribe({
      next: (logs) => {
        this.selectedLogs = logs;
        this.showLogModal = true;
      },
      error: (err) => {
        console.error('Error loading logs:', err);
        alert('Failed to load logs');
      }
    });
  }

  closeLogModal() {
    this.showLogModal = false;
    this.selectedLogs = [];
    this.selectedRegistrationName = '';
  }

  get pendingCount(): number {
    return this.registrations.filter(r => r.status === 'Pending').length;
  }

  get approvedCount(): number {
    return this.registrations.filter(r => r.status === 'Approved').length;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
