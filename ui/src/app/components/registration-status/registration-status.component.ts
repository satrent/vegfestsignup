import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StorageService, Registration } from '../../services/storage.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-registration-status',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './registration-status.component.html',
    styleUrls: ['./registration-status.component.scss']
})
export class RegistrationStatusComponent implements OnInit {
    private storageService = inject(StorageService);
    private authService = inject(AuthService);
    private router = inject(Router);

    registration: Registration | null = null;
    loading = true;
    error = '';

    ngOnInit(): void {
        this.loadRegistration();
    }

    loadRegistration(): void {
        this.loading = true;
        this.error = '';

        this.storageService.getLatestRegistration().subscribe({
            next: (registration) => {
                this.registration = registration;
                this.loading = false;
            },
            error: (err) => {
                this.loading = false;
                if (err.status === 404) {
                    // No registration found, redirect to signup
                    this.router.navigate(['/signup']);
                } else {
                    this.error = 'Failed to load registration. Please try again.';
                }
            }
        });
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }

    getStatusClass(status: string): string {
        switch (status) {
            case 'Approved':
                return 'status-approved';
            case 'Rejected':
                return 'status-rejected';
            case 'Pending':
            default:
                return 'status-pending';
        }
    }
}
