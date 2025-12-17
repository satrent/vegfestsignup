import { Component, OnInit, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-google-auth-callback',
    template: `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh;">
            <div style="text-align: center;">
                <h2>Signing you in...</h2>
                <p *ngIf="error" style="color: red;">{{ error }}</p>
            </div>
        </div>
    `,
    imports: [CommonModule]
})
export class GoogleAuthCallbackComponent implements OnInit {
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private authService = inject(AuthService);

    error = '';

    ngOnInit(): void {
        console.log('GoogleAuthCallbackComponent initialized');

        // Get token from query params
        this.route.queryParams.subscribe(params => {
            console.log('Query params:', params);
            const token = params['token'];
            const error = params['error'];

            if (error) {
                console.error('Auth error:', error);
                this.error = 'Authentication failed. Please try again.';
                setTimeout(() => this.router.navigate(['/admin-login']), 2000);
                return;
            }

            if (token) {
                console.log('Token received, storing and fetching user data...');

                // Store the token
                localStorage.setItem('auth_token', token);

                // Decode token to get user role
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    console.log('Token payload:', payload);
                    const role = payload.role;

                    // Fetch user data to populate AuthService
                    this.authService.getCurrentUser().subscribe({
                        next: (user) => {
                            console.log('User data loaded:', user);

                            // Redirect based on role
                            if (role === 'WEB_ADMIN') {
                                console.log('Redirecting to /web-admin');
                                this.router.navigate(['/web-admin']);
                            } else if (role === 'ADMIN') {
                                console.log('Redirecting to /admin');
                                this.router.navigate(['/admin']);
                            } else {
                                console.log('Redirecting to /signup');
                                this.router.navigate(['/signup']);
                            }
                        },
                        error: (err) => {
                            console.error('Failed to load user data:', err);
                            this.error = 'Failed to load user data. Please try again.';
                            setTimeout(() => this.router.navigate(['/admin-login']), 2000);
                        }
                    });
                } catch (e) {
                    console.error('Failed to decode token:', e);
                    this.error = 'Invalid token. Please try again.';
                    setTimeout(() => this.router.navigate(['/admin-login']), 2000);
                }
            } else {
                console.error('No token received');
                this.error = 'No token received. Please try again.';
                setTimeout(() => this.router.navigate(['/admin-login']), 2000);
            }
        });
    }
}
