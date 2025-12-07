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

  allRegistrations: Registration[] = [];
  loading = true;
  error = '';

  // Filter Properties
  showFilterModal = false;
  filterName = '';
  filterInvoiced: 'all' | 'yes' | 'no' = 'all';
  filterWebsite: 'all' | 'pending' | 'added' = 'all';

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

      // Website Filter (assuming websiteStatus exists or checking website field presence)
      // If websiteStatus is fully implemented on backend/frontend model, use it.
      // Falls back to checking if website string exists for 'added' logic if status not reliable, 
      // but USER asked for "website" filter, likely meaning "Website Status".
      // Let's stick to the websiteStatus field which is in the model.
      const websiteMatch = this.filterWebsite === 'all' ||
        (this.filterWebsite === 'added' && reg.websiteStatus === 'Added') ||
        (this.filterWebsite === 'pending' && (!reg.websiteStatus || reg.websiteStatus === 'Pending'));

      return nameMatch && invoicedMatch && websiteMatch;
    });
  }

  get hasActiveFilters(): boolean {
    return !!this.filterName || this.filterInvoiced !== 'all' || this.filterWebsite !== 'all';
  }

  ngOnInit(): void {
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

  updateStatus(id: string, status: 'Pending' | 'Approved' | 'Rejected'): void {
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

  // Edit Modal
  showEditModal = false;
  editingRegistration: Registration | null = null;
  activeTab = 'admin';

  openEditModal(registration: Registration): void {
    // Create a deep copy to avoid modifying the list view immediately
    this.editingRegistration = JSON.parse(JSON.stringify(registration));
    this.showEditModal = true;
    this.activeTab = 'admin';
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingRegistration = null;
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  saveEdit(): void {
    if (!this.editingRegistration || !this.editingRegistration._id) return;

    this.storageService.updateRegistration(this.editingRegistration._id, this.editingRegistration).subscribe({
      next: (updatedReg) => {
        // Update the item in the list
        const index = this.allRegistrations.findIndex(r => r._id === updatedReg._id);
        if (index !== -1) {
          this.allRegistrations[index] = updatedReg;
        }
        this.closeEditModal();
        alert('Registration updated successfully');
      },
      error: (err) => {
        console.error('Error updating registration:', err);
        alert('Failed to update registration');
      }
    });
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
    this.filterWebsite = 'all';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
