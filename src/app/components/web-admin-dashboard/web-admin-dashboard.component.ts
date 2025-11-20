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
  templateUrl: './web-admin-dashboard.component.html',
  styleUrls: ['./web-admin-dashboard.component.scss']
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
