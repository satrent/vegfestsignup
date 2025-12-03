import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of, tap, filter, map, switchMap, take } from 'rxjs';
import { ApiService } from './api.service';

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
        // Check if user is already logged in
        this.loadUserFromToken();
    }

    private loadUserFromToken(): void {
        const token = localStorage.getItem('auth_token');
        if (token) {
            // Decode JWT to get user info
            try {
                const payload = this.decodeToken(token);
                if (payload && !this.isTokenExpired(payload)) {
                    // Fetch full user details from backend
                    this.getCurrentUser().subscribe({
                        next: (user) => {
                            this.currentUserSubject.next(user);
                            this.initialized.next(true);
                        },
                        error: () => {
                            this.logout();
                            this.initialized.next(true);
                        }
                    });
                } else {
                    this.logout();
                    this.initialized.next(true);
                }
            } catch (error) {
                this.logout();
                this.initialized.next(true);
            }
        } else {
            this.initialized.next(true);
        }
    }

    private decodeToken(token: string): any {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(jsonPayload);
        } catch (error) {
            return null;
        }
    }

    private isTokenExpired(payload: any): boolean {
        if (!payload.exp) return false;
        const expirationDate = new Date(payload.exp * 1000);
        return expirationDate < new Date();
    }

    // Request verification code for email login
    requestCode(email: string): Observable<AuthResponse> {
        return this.api.post<AuthResponse>('/auth/request-code', { email });
    }

    // Verify code and login
    verifyCode(email: string, code: string): Observable<AuthResponse> {
        return this.api.post<AuthResponse>('/auth/verify-code', { email, code }).pipe(
            tap((response) => {
                if (response.success && response.token && response.user) {
                    localStorage.setItem('auth_token', response.token);
                    this.currentUserSubject.next(response.user);
                }
            })
        );
    }

    // Get current user info from backend
    getCurrentUser(): Observable<User> {
        return this.api.get<User>('/auth/me').pipe(
            tap((user) => {
                console.log('Setting currentUserSubject:', user);
                this.currentUserSubject.next(user);
            })
        );
    }

    // Logout
    logout(): void {
        localStorage.removeItem('auth_token');
        this.currentUserSubject.next(null);
    }

    // Check if user is authenticated (synchronous)
    isAuthenticated(): boolean {
        return !!localStorage.getItem('auth_token') && !!this.currentUserSubject.value;
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
        window.location.href = 'http://localhost:3000/api/auth/google';
    }
}
