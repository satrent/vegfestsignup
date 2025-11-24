import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent {
    private authService = inject(AuthService);
    private router = inject(Router);

    email = '';
    code = '';
    codeSent = false;
    loading = false;
    error = '';
    success = '';

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
                this.success = 'Verification code sent! Check your email (or console in dev mode).';
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

        this.authService.verifyCode(this.email, this.code).subscribe({
            next: (response) => {
                this.loading = false;
                if (response.success) {
                    // Navigate to signup form
                    this.router.navigate(['/signup']);
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
