import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of, tap, filter, map, switchMap, take } from 'rxjs';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';

export type UserRole = 'PARTICIPANT' | 'ADMIN' | 'WEB_ADMIN';

export interface User {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: UserRole;
    emailVerified: boolean;
}

export interface AuthResponse {
    success: boolean;
    token?: string;
    user?: User;
    message?: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private api = inject(ApiService);
    private currentUserSubject = new BehaviorSubject<User | null>(null);
    public currentUser$ = this.currentUserSubject.asObservable();
    private initialized = new BehaviorSubject<boolean>(false);
    public initialized$ = this.initialized.asObservable();

    constructor() {
        // Check if user is already logged in by calling the API
        // The cookie will be sent automatically
        this.checkAuthStatus();
    }

    private checkAuthStatus(): void {
        this.getCurrentUser().subscribe({
            next: (user) => {
                this.currentUserSubject.next(user);
                this.initialized.next(true);
            },
            error: () => {
                this.currentUserSubject.next(null);
                this.initialized.next(true);
            }
        });
    }

    // Request verification code for email login
    requestCode(email: string): Observable<AuthResponse> {
        return this.api.post<AuthResponse>('/auth/request-code', { email });
    }

    // Verify code and login
    verifyCode(email: string, code: string, rememberMe: boolean = false): Observable<AuthResponse> {
        return this.api.post<AuthResponse>('/auth/verify-code', { email, code }).pipe(
            tap((response) => {
                if (response.success && response.user) {
                    // Token is now handled via httpOnly cookie
                    this.currentUserSubject.next(response.user);
                }
            })
        );
    }

    // Get current user info from backend
    getCurrentUser(): Observable<User> {
        return this.api.get<User>('/auth/me').pipe(
            tap((user) => {
                this.currentUserSubject.next(user);
            })
        );
    }

    // Logout
    logout(): void {
        this.api.post('/auth/logout', {}).subscribe({
            next: () => {
                this.currentUserSubject.next(null);
                // Optional: Redirect to login or home
            },
            error: () => {
                // Even if logout fails server-side, clear local state
                this.currentUserSubject.next(null);
            }
        });
    }

    // Check if user is authenticated (synchronous - based on last known state)
    isAuthenticated(): boolean {
        return !!this.currentUserSubject.value;
    }

    // Check auth status asynchronously, waiting for initialization
    checkAuth(): Observable<boolean> {
        return this.initialized.pipe(
            filter(init => init),
            take(1),
            map(() => this.isAuthenticated())
        );
    }

    // Get current user role
    getUserRole(): UserRole | null {
        return this.currentUserSubject.value?.role || null;
    }

    // Check if user has specific role
    hasRole(roles: UserRole[]): boolean {
        const userRole = this.getUserRole();
        return userRole ? roles.includes(userRole) : false;
    }

    // Google OAuth login (redirects to backend)
    loginWithGoogle(): void {
        window.location.href = `${environment.apiUrl}/auth/google`;
    }
}
