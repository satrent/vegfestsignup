import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { StorageService } from '../../services/storage.service';
import { SettingsService } from '../../services/settings.service';

@Component({
    selector: 'app-login',
    imports: [FormsModule],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
    private authService = inject(AuthService);
    private storageService = inject(StorageService);
    private settingsService = inject(SettingsService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);

    email = '';
    code = '';
    stayLoggedIn = false;
    codeSent = false;
    loading = false;
    error = '';
    success = '';
    registrationsOpen = true;
    closedMessage = '';

    ngOnInit(): void {
        // Let anyone without a registration know up front, before they spend a code.
        this.settingsService.getPublicSettings().subscribe(settings => {
            this.registrationsOpen = settings.registrationsOpen;
            this.closedMessage = settings.closedMessage;
        });

        this.route.queryParams.subscribe(params => {
            if (params['email'] && params['code']) {
                this.email = params['email'];
                this.code = params['code'];
                this.codeSent = true;
                this.success = 'Verification code auto-filled from link.';
            }
        });
    }

    requestCode(): void {
        if (!this.email) {
            this.error = 'Please enter your email address';
            return;
        }

        this.loading = true;
        this.error = '';
        this.success = '';

        this.authService.requestCode(this.email).subscribe({
            next: (response) => {
                this.loading = false;
                this.codeSent = true;
                this.success = 'Verification code sent! Check your email.';
            },
            error: (err) => {
                this.loading = false;
                this.error = err.message || 'Failed to send verification code';
            }
        });
    }

    verifyCode(): void {
        if (!this.code) {
            this.error = 'Please enter the verification code';
            return;
        }

        this.loading = true;
        this.error = '';

        this.authService.verifyCode(this.email, this.code, this.stayLoggedIn).subscribe({
            next: (response) => {
                if (response.success) {
                    // Check if user has existing registration
                    this.storageService.getLatestRegistration().subscribe({
                        next: (registration) => {
                            this.loading = false;
                            // User has a registration, show status view
                            this.router.navigate(['/dashboard']);
                        },
                        error: (err) => {
                            this.loading = false;
                            if (err.status === 404) {
                                // No registration found, go to signup
                                this.router.navigate(['/signup']);
                            } else {
                                // Other error, default to signup
                                this.router.navigate(['/signup']);
                            }
                        }
                    });
                }
            },
            error: (err) => {
                this.loading = false;
                this.error = err.message || 'Invalid verification code';
            }
        });
    }

    goToAdminLogin(): void {
        this.router.navigate(['/admin-login']);
    }
}
