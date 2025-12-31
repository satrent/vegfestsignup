import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { StorageService, Registration } from '../../services/storage.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-dashboard',
    imports: [CommonModule, RouterModule],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
    private storageService = inject(StorageService);
    private authService = inject(AuthService);
    private router = inject(Router);

    registration: Registration | null = null;
    loading = true;
    error = '';
    sections: any[] = [];

    private readonly allSections = [
        { id: 'contact', title: 'Contact & Basic Information', route: 'contact' },
        { id: 'products', title: 'Category & offering', route: 'products' },
        { id: 'values', title: 'Values', route: 'values' },
        { id: 'logistics', title: 'Booth & logistics', route: 'logistics' },
        { id: 'foodCompliance', title: 'Food/THC compliance', route: 'food-compliance' },
        { id: 'documents', title: 'Documents', route: 'documents' },
        { id: 'expectations', title: 'Expectations & Terms', route: 'expectations' },
        { id: 'payment', title: 'Payment', route: 'payment' }
    ];

    get isFoodVendor(): boolean {
        const cat = this.registration?.organizationCategory || '';
        return cat.toLowerCase().includes('food') || cat.toLowerCase().includes('drink') || cat.toLowerCase().includes('ice cream');
    }

    get isThcVendor(): boolean {
        const cat = this.registration?.organizationCategory || '';
        return cat.toLowerCase().includes('thc');
    }

    isSectionVisible(sectionId: string): boolean {
        if (!this.registration) return false;

        if (sectionId === 'foodCompliance') {
            return this.isFoodVendor || this.isThcVendor;
        }

        // Payment is always visible at the end?
        // Or specific conditions? "final registration section" -> seems general.
        // Assuming always visible for now, or we could hide if fees are 0?
        // But "refunded if declined" implies fees.

        return true;
    }

    private updateSections(): void {
        if (!this.registration) {
            this.sections = [];
            return;
        }

        let visibleSections = this.allSections.filter(s => this.isSectionVisible(s.id));

        if (this.registration.type === 'Sponsor') {
            visibleSections = visibleSections.filter(s => ['contact', 'products', 'payment'].includes(s.id));
            // Rename 'Category & offering' to 'Logo Upload' for sponsors
            visibleSections = visibleSections.map(s => {
                if (s.id === 'products') {
                    return { ...s, title: 'Logo Upload' };
                }
                return s;
            });
        }

        this.sections = visibleSections;
    }

    getSectionStatus(sectionId: string): 'locked' | 'complete' | 'active' | 'pending' {
        if (!this.registration) return 'locked';

        if (!this.isSectionVisible(sectionId)) return 'locked';

        if (this.isSectionComplete(sectionId)) return 'complete';

        // START: Sequential Enforcement Logic
        const visibleSections = this.sections;
        const currentIndex = visibleSections.findIndex(s => s.id === sectionId);

        // If it's the first section, it's always active (if visible)
        if (currentIndex === 0) return 'active';

        // Check if previous section is complete
        if (currentIndex > 0) {
            const previousSection = visibleSections[currentIndex - 1];
            if (!this.isSectionComplete(previousSection.id)) {
                return 'locked';
            }
        }
        // END: Sequential Enforcement Logic

        return 'active';
    }

    ngOnInit(): void {
        this.loadRegistration();
    }

    loadRegistration(): void {
        this.loading = true;
        this.storageService.getLatestRegistration().subscribe({
            next: (registration) => {
                this.registration = registration;
                this.updateSections();
                this.loading = false;
            },
            error: (err) => {
                this.loading = false;
                if (err.status === 404) {
                    this.router.navigate(['/signup']);
                } else {
                    this.error = 'Failed to load registration.';
                }
            }
        });
    }

    isSectionComplete(sectionId: string): boolean {
        if (!this.registration || !this.registration.sectionStatus) return false;
        return (this.registration.sectionStatus as any)[sectionId] === true;
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }

    getStatusClass(status: string): string {
        switch (status) {
            case 'Approved':
                return 'status-approved';
            case 'Declined':
                return 'status-rejected';
            case 'Pending':
                return 'status-pending';
            case 'In Progress':
                return 'status-in-progress';
            default:
                return 'status-pending';
        }
    }

    get canSubmit(): boolean {
        if (!this.registration || !this.registration.sectionStatus) return false;
        const s = this.registration.sectionStatus;

        if (this.registration.type === 'Sponsor') {
            return s.contact && s.products && s.payment;
        }

        // Basic requirements
        let complete = s.contact && s.products && s.logistics && s.documents && s.expectations && s.payment;

        // Conditional requirements
        if (this.isSectionVisible('foodCompliance')) {
            complete = complete && s.foodCompliance;
        }

        return complete;
    }

    submitApplication(): void {
        if (!this.registration || !this.registration._id) return;

        // Note: confirm() dialog is blocked by browser automation, removed for now
        // TODO: Add custom modal confirmation if needed

        this.loading = true;
        this.storageService.submitRegistration(this.registration._id).subscribe({
            next: (updatedReg) => {
                this.registration = updatedReg;
                this.updateSections();
                this.loading = false;
                // Scroll to top to see status change
                window.scrollTo(0, 0);
            },
            error: (err) => {
                console.error('Error submitting application:', err);
                this.loading = false;
                this.error = 'Failed to submit application. Please try again.';
            }
        });
    }

    navigateToSection(sectionId: string): void {
        const status = this.getSectionStatus(sectionId);
        if (status === 'locked') {
            return;
        }

        const section = this.sections.find(s => s.id === sectionId);
        if (section) {
            this.router.navigate(['/dashboard', section.route]);
        }
    }
}
