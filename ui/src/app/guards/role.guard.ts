import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService, UserRole } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const requiredRoles = route.data['roles'] as UserRole[];

    if (authService.hasRole(requiredRoles)) {
        return true;
    }

    // Redirect to unauthorized page or login
    router.navigate(['/login']);
    return false;
};
