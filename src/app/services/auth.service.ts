import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type UserRole = 'GUEST' | 'PARTICIPANT' | 'ADMIN' | 'WEB_ADMIN';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private roleSubject = new BehaviorSubject<UserRole>('GUEST');
    currentRole$ = this.roleSubject.asObservable();

    setRole(role: UserRole) {
        this.roleSubject.next(role);
    }

    getRole(): UserRole {
        return this.roleSubject.value;
    }
}
