import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StorageService, Registration } from '../../services/storage.service';

@Component({
    selector: 'app-payment',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './payment.component.html',
    styleUrls: ['./payment.component.scss']
})
export class PaymentComponent implements OnInit {
    private storageService = inject(StorageService);
    private router = inject(Router);

    registration: Registration | null = null;
    loading = true;
    processing = false;

    applicationFee = 0;
    sponsorshipFee = 0;
    totalDue = 0;

    ngOnInit(): void {
        this.storageService.getLatestRegistration().subscribe({
            next: (reg) => {
                this.registration = reg;
                this.calculateFees();
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading registration for payment:', err);
                this.loading = false;
            }
        });
    }

    calculateFees(): void {
        if (!this.registration) return;

        // 1. Application Fee
        // Exhibitors pay $50. Sponsors might not, or it's included? 
        // "initial $50 application fee for exhibitors"
        // If type is 'Exhibitor' or 'Both', assuming they pay the fee.
        // If type is 'Sponsor' only, maybe not? Sticking to "Exhibitor" logic for now.

        // Check if they are an exhibitor (or Both)
        const isExhibitor = this.registration.type === 'Exhibitor' || this.registration.type === 'Both';

        if (isExhibitor) {
            this.applicationFee = 50;
        } else {
            this.applicationFee = 0;
        }

        // 2. Sponsorship Fee
        // "sponsorship fee for sponsors"
        // Based on sponsorshipLevel
        // Values: "product, bronze, silver, gold, platinum, presenting"
        // Placeholder values for now as requested.
        if (this.registration.sponsorshipLevel) {
            const level = this.registration.sponsorshipLevel.toLowerCase();
            switch (level) {
                case 'product':
                    this.sponsorshipFee = 0; // Assuming product is in-kind?
                    break;
                case 'bronze':
                    this.sponsorshipFee = 500;
                    break;
                case 'silver':
                    this.sponsorshipFee = 1000;
                    break;
                case 'gold':
                    this.sponsorshipFee = 2500;
                    break;
                case 'platinum':
                    this.sponsorshipFee = 5000;
                    break;
                case 'presenting':
                    this.sponsorshipFee = 10000;
                    break;
                default:
                    this.sponsorshipFee = 0;
            }
        }

        this.totalDue = this.applicationFee + this.sponsorshipFee;
    }

    proceedToPay(): void {
        if (!this.registration || !this.registration._id) return;

        this.processing = true;

        // TODO: Integrate Stripe Payment here
        // For now, we mark the section as complete and maybe simulate a paid status?
        // "final completed section" -> implies we just mark this section complete so they can submit.

        // Simulate a really cool receipt number
        const fakeReceipt = 'rcpt_' + Math.random().toString(36).substr(2, 9).toUpperCase();

        const updates: any = {
            'sectionStatus.payment': true,
            'paymentId': 'pi_simulated_' + Math.random().toString(36).substr(2, 9),
            'paymentReceipt': fakeReceipt,
            'paymentDate': new Date()
        };

        // NOTE: In a real flow, we might wait for webhook or client-side confirmation.

        this.storageService.updateRegistration(this.registration._id, updates).subscribe({
            next: () => {
                this.processing = false;
                // Navigate back to dashboard to finally submit? or auto-submit?
                // "last thing to complete before the final submit"
                this.router.navigate(['/dashboard']);
            },
            error: (err) => {
                console.error('Error saving payment status:', err);
                this.processing = false;
            }
        });
    }

    cancel(): void {
        this.router.navigate(['/dashboard']);
    }
}
