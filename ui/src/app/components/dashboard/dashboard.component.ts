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

    private readonly allSections = [
        { id: 'contact', title: 'Contact & Basic Information', route: 'contact' },
        { id: 'products', title: 'Category & offering', route: 'products' },
        { id: 'values', title: 'Values', route: 'values' },
        { id: 'logistics', title: 'Logistics & Equipment', route: 'logistics' },
        { id: 'documents', title: 'Licensing & Insurance', route: 'documents' },
        { id: 'profile', title: 'Exhibitor Profile', route: 'profile' },
        { id: 'sponsorship', title: 'Sponsorship & Marketing', route: 'sponsorship' }
    ];

    get sections() {
        if (this.registration && this.registration.type === 'Sponsor') {
            return this.allSections.filter(s => ['contact', 'sponsorship'].includes(s.id));
        }

        return this.allSections;
    }

    ngOnInit(): void {
        this.loadRegistration();
    }

    loadRegistration(): void {
        this.loading = true;
        this.storageService.getLatestRegistration().subscribe({
            next: (registration) => {
                this.registration = registration;
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
            return s.contact && s.sponsorship;
        }

        return s.contact && s.products && s.logistics && s.documents && s.profile;
    }

    submitApplication(): void {
        if (!this.registration || !this.registration._id) return;

        // Note: confirm() dialog is blocked by browser automation, removed for now
        // TODO: Add custom modal confirmation if needed

        this.loading = true;
        this.storageService.submitRegistration(this.registration._id).subscribe({
            next: (updatedReg) => {
                this.registration = updatedReg;
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
        const section = this.sections.find(s => s.id === sectionId);
        if (section) {
            this.router.navigate(['/dashboard', section.route]);
        }
    }
}
