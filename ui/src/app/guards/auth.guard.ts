import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return authService.checkAuth().pipe(
        take(1),
        map(isAuthenticated => {
            if (isAuthenticated) {
                return true;
            }
            // Redirect to login page
            router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
            return false;
        })
    );
};
