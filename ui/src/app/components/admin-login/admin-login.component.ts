import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-admin-login',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './admin-login.component.html',
    styleUrls: ['./admin-login.component.scss']
})
export class AdminLoginComponent implements OnInit {
    private authService = inject(AuthService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);

    error = '';

    ngOnInit(): void {
        // Check if we're coming back from OAuth callback with a token
        this.route.queryParams.subscribe(params => {
            if (params['token']) {
                // Store token and navigate to admin dashboard
                localStorage.setItem('auth_token', params['token']);
                this.router.navigate(['/admin']);
            } else if (params['error']) {
                this.error = params['error'];
            }
        });
    }

    loginWithGoogle(): void {
        this.authService.loginWithGoogle();
    }

    goToParticipantLogin(): void {
        this.router.navigate(['/login']);
    }
}
