import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { StorageService, Registration } from '../../services/storage.service';
import { AuthService } from '../../services/auth.service';
import { RegistrationDetailsComponent } from './registration-details/registration-details.component';
import { exhibitorCategory, EXHIBITOR_CATEGORIES, ExhibitorCategory } from '../../utils/exhibitor-category';
import { requiredDocTypes } from '../../utils/required-docs';
import { isPaidInFull } from '../../utils/payment-status';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RegistrationDetailsComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  private storageService = inject(StorageService);
  public authService = inject(AuthService);
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
  filterStatus: 'all' | 'In Progress' | 'Pending' | 'Approved' | 'Declined' | 'Cancelled' | 'Ready to Add' = 'Pending';
  filterTodosOpen = false;
  filterTag = '';
  filterDemographic = '';
  filterAlphaGroup: '' | 'A-J' | 'K-S' | 'T-Z' = '';
  filterTest: 'exclude' | 'only' | 'all' = 'exclude';
  filterExhibitorCategory: '' | ExhibitorCategory = '';
  availableTags: string[] = [];

  readonly exhibitorCategories = EXHIBITOR_CATEGORIES;

  // Sort Properties
  sortAlpha = false;

  get filteredRegistrations(): Registration[] {
    const filtered = this.allRegistrations.filter(reg => {
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
        // "Ready to Add to Website" = approved, paid in full, docs complete,
        // and not already on the site. All four must hold — previously this
        // only checked "any amount paid", so it surfaced people with missing
        // docs who weren't paid in full.
        statusMatch = reg.status === 'Approved' &&
          this.paidInFull(reg) &&
          this.docsComplete(reg) &&
          reg.websiteStatus !== 'Added';
      } else {
        statusMatch = this.filterStatus === 'all' || reg.status === this.filterStatus;
      }

      // Tag Filter
      const tagMatch = !this.filterTag || (reg.tags && reg.tags.includes(this.filterTag));

      // Demographic Filter
      const demographicMatch = !this.filterDemographic ||
        (reg.ownerDemographics && reg.ownerDemographics.includes(this.filterDemographic));

      // Todos Filter
      const todosMatch = !this.filterTodosOpen || (reg.todoItems?.some(t => !t.isCompleted) || false);

      // Alpha Group Filter
      let alphaGroupMatch = true;
      if (this.filterAlphaGroup) {
        const firstChar = reg.organizationName.trim().charAt(0).toUpperCase();
        const isLetter = /[A-Z]/.test(firstChar);
        if (this.filterAlphaGroup === 'A-J') {
          alphaGroupMatch = isLetter && firstChar >= 'A' && firstChar <= 'J';
        } else if (this.filterAlphaGroup === 'K-S') {
          alphaGroupMatch = isLetter && firstChar >= 'K' && firstChar <= 'S';
        } else if (this.filterAlphaGroup === 'T-Z') {
          alphaGroupMatch = !isLetter || (firstChar >= 'T' && firstChar <= 'Z');
        }
      }

      // Test Records Filter
      const testMatch = this.filterTest === 'all' ||
        (this.filterTest === 'exclude' && !reg.isTest) ||
        (this.filterTest === 'only' && !!reg.isTest);

      // Exhibitor Category Filter
      const exhibitorCategoryMatch = !this.filterExhibitorCategory ||
        exhibitorCategory(reg) === this.filterExhibitorCategory;

      return nameMatch && invoicedMatch && statusMatch && tagMatch && demographicMatch && todosMatch && alphaGroupMatch && testMatch && exhibitorCategoryMatch;
    });

    if (this.sortAlpha) {
      return [...filtered].sort((a, b) =>
        a.organizationName.localeCompare(b.organizationName, undefined, { sensitivity: 'base' })
      );
    }

    return filtered;
  }

  get hasActiveFilters(): boolean {
    return !!this.filterName || this.filterInvoiced !== 'all' || this.filterStatus !== 'all' || this.filterTodosOpen || !!this.filterTag || !!this.filterDemographic || !!this.filterAlphaGroup || this.filterTest !== 'exclude' || !!this.filterExhibitorCategory || this.sortAlpha;
  }

  toggleSortAlpha(): void {
    this.sortAlpha = !this.sortAlpha;
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.currentUserId = user.id;
      }
    });
    this.loadRegistrations();
    this.loadTags();
  }

  loadTags(): void {
    this.storageService.getTags().subscribe(tags => {
      this.availableTags = tags;
    });
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

  updateStatus(id: string, status: 'Pending' | 'Approved' | 'Declined' | 'Cancelled'): void {
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
    this.loadTags();
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
    this.filterTodosOpen = false;
    this.filterTag = '';
    this.filterDemographic = '';
    this.filterAlphaGroup = '';
    this.filterTest = 'exclude';
    this.filterExhibitorCategory = '';
    this.sortAlpha = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Only the latest document of each type matters — older entries are
  // superseded by re-uploads. Types with no approval workflow (menus,
  // photos, logos) are always created as 'Pending' and must not pin a badge.
  // Docs are sorted by uploadedAt so the result doesn't rely on array order.
  private latestDocStatusByType(reg: Registration): Map<string, string> {
    const nonApprovalTypes = ['menu', 'product-photo', 'logo', 'coupon logo'];
    const latestByType = new Map<string, string>();
    const docs = [...(reg.documents || [])].sort(
      (a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
    );
    for (const doc of docs) {
      if (!doc.type || nonApprovalTypes.includes(doc.type.toLowerCase())) continue;
      latestByType.set(doc.type, doc.status);
    }
    return latestByType;
  }

  hasPendingDocuments(reg: Registration): boolean {
    return [...this.latestDocStatusByType(reg).values()].some(status => status === 'Pending');
  }

  hasRejectedDocuments(reg: Registration): boolean {
    // The badge clears automatically once a newer doc of the same type is
    // uploaded (Pending) or approved, since only the latest status per type counts.
    return [...this.latestDocStatusByType(reg).values()].some(status => status === 'Rejected');
  }

  // An exhibitor is "docs complete" when every required document is present
  // and its latest version is Approved. Missing or still-Pending/Rejected
  // required docs leave it incomplete (the Pending/Rejected badges cover those).
  docsComplete(reg: Registration): boolean {
    const latest = this.latestDocStatusByType(reg);
    return requiredDocTypes(reg).every(type => latest.get(type) === 'Approved');
  }

  // Derived "paid in full" (invoiced + amount paid >= invoice amount). Replaces
  // the manual PAID tag; see ui/src/app/utils/payment-status.ts.
  paidInFull(reg: Registration): boolean {
    return isPaidInFull(reg);
  }

  hasOpenTodos(reg: Registration): boolean {
    return !!reg.todoItems?.some(t => !t.isCompleted);
  }

  // Add Sponsor Modal
  showAddSponsorModal = false;
  addSponsorLoading = false;
  addSponsorError = '';
  // Set when the API rejects the add because the email is already registered.
  // Drives the "already registered" callout with a link to that registration.
  addSponsorDuplicate: {
    _id: string;
    organizationName: string;
    firstName: string;
    lastName: string;
    email: string;
    type: string;
    status: string;
  } | null = null;
  // Confirmation shown on the dashboard after a successful add — the modal
  // simply closing was ambiguous, especially when filters hide the new row.
  addSponsorSuccess: Registration | null = null;
  addSponsorForm = {
    organizationName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    type: 'Sponsor' as 'Exhibitor' | 'Sponsor' | 'Both',
  };

  openAddSponsorModal(): void {
    this.addSponsorForm = { organizationName: '', firstName: '', lastName: '', email: '', phone: '', type: 'Sponsor' };
    this.clearAddSponsorError();
    this.showAddSponsorModal = true;
  }

  closeAddSponsorModal(): void {
    this.showAddSponsorModal = false;
    this.clearAddSponsorError();
  }

  private clearAddSponsorError(): void {
    this.addSponsorError = '';
    this.addSponsorDuplicate = null;
  }

  // Open the registration that's blocking the add. The dashboard may be
  // filtered so the row isn't in `registrations`; fall back to the full list.
  openDuplicateRegistration(): void {
    const id = this.addSponsorDuplicate?._id;
    if (!id) return;
    const existing = this.allRegistrations.find(r => r._id === id);
    if (!existing) {
      // Shouldn't happen (allRegistrations is unfiltered), but don't close the
      // modal on a dead end — leave the admin with something to act on.
      this.addSponsorError = 'That registration could not be opened. Refresh the dashboard and search for the email address.';
      return;
    }
    this.closeAddSponsorModal();
    this.openEditModal(existing);
  }

  // True when the just-added registration is filtered out of the visible list,
  // so the confirmation can explain why she can't see the new row.
  get addSponsorSuccessHidden(): boolean {
    const id = this.addSponsorSuccess?._id;
    return !!id && !this.filteredRegistrations.some(r => r._id === id);
  }

  // Live duplicate check against the already-loaded registrations so the admin
  // sees the conflict while typing, before ever hitting Create.
  get addSponsorEmailMatch(): Registration | null {
    const email = this.addSponsorForm.email.trim().toLowerCase();
    if (!email) return null;
    return this.allRegistrations.find(r => (r.email || '').trim().toLowerCase() === email) ?? null;
  }

  // Field labels used to turn API validation errors into something an admin
  // can act on ("Phone is required") instead of a generic failure message.
  private static readonly ADD_SPONSOR_LABELS: Record<string, string> = {
    organizationName: 'Organization Name',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    phone: 'Phone',
    type: 'Type',
  };

  // Mirrors the API's express-validator rules so we can fail fast with a
  // specific message rather than round-tripping to get an opaque 400.
  private validateAddSponsorForm(): string {
    const missing = Object.keys(AdminDashboardComponent.ADD_SPONSOR_LABELS)
      .filter(key => !String((this.addSponsorForm as any)[key] ?? '').trim())
      .map(key => AdminDashboardComponent.ADD_SPONSOR_LABELS[key]);

    if (missing.length) {
      return `Please fill in: ${missing.join(', ')}.`;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.addSponsorForm.email.trim())) {
      return 'Please enter a valid email address.';
    }
    return '';
  }

  // The API returns { error } for handled failures but { errors: [...] } for
  // validation rejections, so reading only `error.error` swallowed the reason.
  private addSponsorErrorMessage(err: any): string {
    const body = err?.error;

    if (typeof body === 'string' && body.trim()) return body;
    if (typeof body?.error === 'string' && body.error.trim()) return body.error;

    if (Array.isArray(body?.errors) && body.errors.length) {
      // Prefer the API's own per-rule messages; fall back to naming the fields.
      const messages = body.errors.map((e: any) => e?.msg).filter((m: string) => !!m && m !== 'Invalid value');
      if (messages.length) {
        return [...new Set<string>(messages)].join('. ') + '.';
      }
      const fields = body.errors
        .map((e: any) => AdminDashboardComponent.ADD_SPONSOR_LABELS[e?.path ?? e?.param] ?? e?.path ?? e?.param)
        .filter((f: string) => !!f);
      if (fields.length) {
        return `Please check these fields: ${[...new Set(fields)].join(', ')}.`;
      }
      return 'Some of the details entered are not valid. Please review and try again.';
    }

    if (err?.status === 0) {
      return 'Could not reach the server. Check your connection and try again.';
    }
    if (err?.status === 401) {
      return 'Your session has expired. Sign in again and retry.';
    }
    if (err?.status === 403) {
      return 'You do not have permission to add registrations (this requires a Super Admin account).';
    }
    if (err?.status === 413) {
      return 'The request was too large for the server to accept.';
    }
    // Last resort: never show a bare failure. Include whatever the server gave
    // us plus the status code so it can be matched to the server log.
    const statusText = err?.status ? ` (HTTP ${err.status}${err.statusText ? ' ' + err.statusText : ''})` : '';
    const detail = typeof err?.message === 'string' && err.message.trim() ? ` ${err.message.trim()}` : '';
    return `Failed to create registration${statusText}.${detail} Please try again, or check the server logs if it keeps happening.`;
  }

  submitAddSponsor(): void {
    const validationError = this.validateAddSponsorForm();
    if (validationError) {
      this.addSponsorError = validationError;
      this.addSponsorDuplicate = null;
      this.scrollAddSponsorErrorIntoView();
      return;
    }

    this.addSponsorLoading = true;
    this.clearAddSponsorError();
    // Trim before sending: a trailing space on the email fails the API's
    // isEmail check, which read as an unexplained failure.
    const payload = {
      ...this.addSponsorForm,
      organizationName: this.addSponsorForm.organizationName.trim(),
      firstName: this.addSponsorForm.firstName.trim(),
      lastName: this.addSponsorForm.lastName.trim(),
      email: this.addSponsorForm.email.trim(),
      phone: this.addSponsorForm.phone.trim(),
    };
    this.storageService.adminCreateRegistration(payload).subscribe({
      next: (reg) => {
        this.allRegistrations.unshift(reg);
        this.addSponsorLoading = false;
        this.addSponsorSuccess = reg;
        this.closeAddSponsorModal();
      },
      error: (err) => {
        this.addSponsorError = this.addSponsorErrorMessage(err);
        this.addSponsorDuplicate = err?.error?.code === 'DUPLICATE_EMAIL' ? err.error.existing ?? null : null;
        this.addSponsorLoading = false;
        // The modal body scrolls, so a banner rendered at the top can sit
        // off-screen from the footer button the admin just clicked.
        this.scrollAddSponsorErrorIntoView();
      }
    });
  }

  private scrollAddSponsorErrorIntoView(): void {
    setTimeout(() => {
      document
        .querySelector('.add-sponsor-modal .add-sponsor-error')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  // Reject Modal
  showRejectModal = false;
  rejectionTargetId: string | null = null;

  hasApproved(reg: Registration): boolean {
    if (!reg.approvedBy || !this.currentUserId) return false;
    return reg.approvedBy.includes(this.currentUserId);
  }

  canApprove(reg: Registration): boolean {
    if (reg.status === 'Approved' || reg.status === 'Declined' || reg.status === 'In Progress' || reg.status === 'Cancelled') {
      return false;
    }
    // Allow approving Pending or legacy Waiting for Approval
    return reg.status === 'Pending' || reg.status === 'Waiting for Approval';
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
