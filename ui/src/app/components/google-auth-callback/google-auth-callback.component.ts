import { Component, OnInit, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';


@Component({
    selector: 'app-google-auth-callback',
    template: `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh;">
          <div style="text-align: center;">
            <h2>Signing you in...</h2>
            @if (error) {
              <p style="color: red;">{{ error }}</p>
            }
          </div>
        </div>
        `,
    imports: []
})
export class GoogleAuthCallbackComponent implements OnInit {
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private authService = inject(AuthService);

    error = '';

    ngOnInit(): void {
        console.log('GoogleAuthCallbackComponent initialized');

        // Check query params for error
        this.route.queryParams.subscribe(params => {
            console.log('Query params:', params);
            const error = params['error'];

            if (error) {
                console.error('Auth error:', error);
                this.error = 'Authentication failed. Please try again.';
                setTimeout(() => this.router.navigate(['/admin-login']), 2000);
                return;
            }

            console.log('Attempting to fetch user data (using cookie)...');

            // Fetch user data to confirm login
            this.authService.getCurrentUser().subscribe({
                next: (user) => {
                    console.log('User data loaded:', user);

                    // Redirect based on role
                    if (user.role === 'WEB_ADMIN') {
                        console.log('Redirecting to /web-admin');
                        this.router.navigate(['/web-admin']);
                    } else if (user.role === 'ADMIN') {
                        console.log('Redirecting to /admin');
                        this.router.navigate(['/admin']);
                    } else {
                        console.log('Redirecting to /signup');
                        this.router.navigate(['/signup']);
                    }
                },
                error: (err) => {
                    console.error('Failed to load user data:', err);
                    this.error = 'Authentication failed. Please try again.';
                    setTimeout(() => this.router.navigate(['/admin-login']), 2000);
                }
            });
        });
    }
}
