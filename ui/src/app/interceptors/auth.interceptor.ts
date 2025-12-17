import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    // Always send credentials (cookies)
    const authReq = req.clone({
        withCredentials: true
    });

    return next(authReq);
};
