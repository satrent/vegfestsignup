import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService, UserRole } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const requiredRoles = (route.data['roles'] || []) as UserRole[];
    const requiresSuperAdmin = !!route.data['requiresSuperAdmin'];

    if (requiresSuperAdmin) {
        if (authService.isSuperAdmin()) {
            return true;
        }
        // Redirect strictly to admin dashboard if failing super admin check, avoiding infinite loop if already on admin
        // But roleGuard is usually on child routes or specific routes.
        router.navigate(['/admin']);
        return false;
    }

    if (authService.hasRole(requiredRoles)) {
        return true;
    }

    // Redirect to unauthorized page or login
    router.navigate(['/login']);
    return false;
};
