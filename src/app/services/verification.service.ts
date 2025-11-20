import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';

export interface VerificationResult {
    found: boolean;
    url?: string;
    lastChecked: Date;
}

@Injectable({
    providedIn: 'root'
})
export class VerificationService {

    verifyExhibitor(name: string): Observable<VerificationResult> {
        // Simulate network delay
        const delayMs = 500 + Math.random() * 1000;

        // Mock logic: "Trent's Vegan Stuff" is not found, everyone else is found.
        const isFound = name.toLowerCase() !== "trent's vegan stuff";

        const result: VerificationResult = {
            found: isFound,
            url: isFound ? 'https://tcvegfest.com/exhibitors/' : undefined,
            lastChecked: new Date()
        };

        return of(result).pipe(delay(delayMs));
    }
}
