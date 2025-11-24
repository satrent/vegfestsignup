import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { User, UserRole } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private api = inject(ApiService);

    // Get all users (admin only)
    getAllUsers(): Observable<User[]> {
        return this.api.get<User[]>('/admin/users');
    }

    // Update user role (admin only)
    updateUserRole(userId: string, role: UserRole): Observable<User> {
        return this.api.patch<User>(`/admin/users/${userId}/role`, { role });
    }

    // Deactivate user (admin only)
    deactivateUser(userId: string): Observable<User> {
        return this.api.patch<User>(`/admin/users/${userId}/deactivate`, {});
    }
}
