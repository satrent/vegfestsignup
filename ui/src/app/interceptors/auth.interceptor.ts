import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    // Get token from localStorage
    const token = localStorage.getItem('auth_token');

    // Skip adding token for login/public endpoints
    const isAuthEndpoint = req.url.includes('/auth/request-code') ||
        req.url.includes('/auth/verify-code') ||
        req.url.includes('/auth/google');

    if (token && !isAuthEndpoint) {
        // Clone request and add authorization header
        const authReq = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
        return next(authReq);
    }

    return next(req);
};
