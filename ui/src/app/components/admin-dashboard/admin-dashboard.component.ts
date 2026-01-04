import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { StorageService, Registration } from '../../services/storage.service';
import { AuthService } from '../../services/auth.service';
import { RegistrationDetailsComponent } from './registration-details/registration-details.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RegistrationDetailsComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  private storageService = inject(StorageService);
  private authService = inject(AuthService);
  private router = inject(Router);

  allRegistrations: Registration[] = [];
  cachedAllRegistrations: Registration[] = [];

  currentUserId: string | undefined;
  loading = true;
  error = '';

  // Filter Properties
  showFilterModal = false;
  filterName = '';
  filterInvoiced: 'all' | 'yes' | 'no' = 'all';
  filterStatus: 'all' | 'In Progress' | 'Pending' | 'Approved' | 'Declined' | 'Ready to Add' = 'all';

  get filteredRegistrations(): Registration[] {
    return this.allRegistrations.filter(reg => {
      // Name Filter (Organization or Contact Name)
      const search = this.filterName.toLowerCase();
      const nameMatch = !search ||
        reg.organizationName.toLowerCase().includes(search) ||
        reg.firstName.toLowerCase().includes(search) ||
        reg.lastName.toLowerCase().includes(search);

      // Invoiced Filter
      const invoicedMatch = this.filterInvoiced === 'all' ||
        (this.filterInvoiced === 'yes' && reg.invoiced) ||
        (this.filterInvoiced === 'no' && !reg.invoiced);

      // Status Filter
      let statusMatch = true;
      if (this.filterStatus === 'Ready to Add') {
        statusMatch = reg.status === 'Approved' &&
          (reg.amountPaid || 0) > 0 &&
          reg.websiteStatus !== 'Added';
      } else {
        statusMatch = this.filterStatus === 'all' || reg.status === this.filterStatus;
      }

      return nameMatch && invoicedMatch && statusMatch;
    });
  }

  get hasActiveFilters(): boolean {
    return !!this.filterName || this.filterInvoiced !== 'all' || this.filterStatus !== 'all';
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.currentUserId = user.id;
      }
    });
    this.loadRegistrations();
  }

  loadRegistrations(): void {
    this.loading = true;
    this.error = '';

    this.storageService.loadRegistrations().subscribe({
      next: (data) => {
        this.allRegistrations = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load registrations';
        this.loading = false;
        console.error('Error loading registrations:', err);
      }
    });
  }

  updateStatus(id: string, status: 'Pending' | 'Approved' | 'Declined'): void {
    if (!id) {
      console.error('No registration ID provided');
      return;
    }

    this.storageService.updateRegistrationStatus(id, status).subscribe({
      next: (updatedRegistration) => {
        // Update the local array
        const index = this.allRegistrations.findIndex(r => r._id === id);
        if (index !== -1) {
          this.allRegistrations[index] = updatedRegistration;
        }
      },
      error: (err) => {
        alert('Failed to update status');
        console.error('Error updating status:', err);
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

  // Edit / Details Slide-out
  showDetailsPanel = false;
  selectedRegistration: Registration | null = null;
  // Previously we had 'editingRegistration' and 'showEditModal', mapping them here:

  openEditModal(registration: Registration): void {
    // We pass the raw registration to the component.
    // The component makes a copy for editing, so we can pass the live object here.
    // Ideally we might want to refresh it from server to get latest, but passing local is fine for now.
    this.selectedRegistration = registration;
    this.showDetailsPanel = true;
  }

  closeDetailsPanel(): void {
    this.showDetailsPanel = false;
    this.selectedRegistration = null;
  }

  onRegistrationUpdated(updated: Registration): void {
    const index = this.allRegistrations.findIndex(r => r._id === updated._id);
    if (index !== -1) {
      this.allRegistrations[index] = updated;
    }
  }


  get pendingCount(): number {
    return this.allRegistrations.filter(r => r.status === 'Pending').length;
  }

  get approvedCount(): number {
    return this.allRegistrations.filter(r => r.status === 'Approved').length;
  }

  // Filter Modal Methods
  openFilterModal(): void {
    this.showFilterModal = true;
  }

  closeFilterModal(): void {
    this.showFilterModal = false;
  }

  clearFilters(): void {
    this.filterName = '';
    this.filterInvoiced = 'all';
    this.filterStatus = 'all';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  hasPendingDocuments(reg: Registration): boolean {
    return !!reg.documents?.some(doc => doc.status === 'Pending');
  }

  // Reject Modal
  showRejectModal = false;
  rejectionTargetId: string | null = null;

  hasApproved(reg: Registration): boolean {
    if (!reg.approvedBy || !this.currentUserId) return false;
    return reg.approvedBy.includes(this.currentUserId);
  }

  canApprove(reg: Registration): boolean {
    if (reg.status === 'Approved' || reg.status === 'Declined' || reg.status === 'In Progress') {
      return false;
    }
    // If Waiting for Approval, can only approve if haven't already
    if (reg.status === 'Waiting for Approval') {
      return !this.hasApproved(reg);
    }
    // If Pending, can approve
    return true;
  }

  openRejectModal(id: string): void {
    console.log('Opening Reject Modal for ID:', id);
    if (!id) {
      console.error('No ID provided to openRejectModal');
      return;
    }
    this.rejectionTargetId = id;
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.rejectionTargetId = null;
  }

  confirmReject(): void {
    if (this.rejectionTargetId) {
      const id = this.rejectionTargetId;
      console.log('Confirming rejection for ID:', id);

      this.closeRejectModal();
      this.updateStatus(id, 'Declined');

      // If we differ the update to the slide-out, we might need to handle it there too
      // but updateStatus updates the list, which propagates to the slide out if it was bound?
      // Actually if the slideout is open, it has a copy. The slideout would need to know.
      // But typically we don't reject from the dashboard *while* the slideout is open,
      // UNLESS the reject button is INSIDE the slideout.
      // The current slideout implementation has its own status dropdown, so manual rejection there works.
      // The dashboard reject button works on the list item.
    }
  }
}
