import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StorageService, Registration } from '../../services/storage.service';
import { StripeService, NgxStripeModule, StripePaymentElementComponent, StripeElementsDirective, injectStripe } from 'ngx-stripe';
import { StripeElementsOptions, StripePaymentElementOptions, StripeElements } from '@stripe/stripe-js';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-payment',
    standalone: true,
    imports: [CommonModule, NgxStripeModule, StripePaymentElementComponent, StripeElementsDirective],
    templateUrl: './payment.component.html',
    styleUrls: ['./payment.component.scss']
})
export class PaymentComponent implements OnInit {
    private storageService = inject(StorageService);
    private router = inject(Router);
    private stripeService = inject(StripeService);

    stripe = injectStripe(environment.stripePublishableKey);
    elements: StripeElements | undefined;

    registration: Registration | null = null;
    loading = true;
    processing = false;
    error = '';

    applicationFee = 0;
    sponsorshipFee = 0;
    totalDue = 0;

    elementsOptions: StripeElementsOptions = {
        locale: 'en',
        appearance: {
            theme: 'stripe',
        },
    };

    ngOnInit(): void {
        this.storageService.getLatestRegistration().subscribe({
            next: (reg) => {
                this.registration = reg;
                this.calculateFees();

                // If not paid and fees exist, create payment intent
                if (!reg.sectionStatus?.payment && this.totalDue > 0) {
                    this.createPaymentIntent();
                } else {
                    this.loading = false;
                }
            },
            error: (err) => {
                console.error('Error loading registration for payment:', err);
                this.loading = false;
                this.error = 'Failed to load registration.';
            }
        });
    }

    calculateFees(): void {
        if (!this.registration) return;

        // 1. Application Fee
        const isExhibitor = this.registration.type === 'Exhibitor' || this.registration.type === 'Both';
        if (isExhibitor) {
            this.applicationFee = 50;
        } else {
            this.applicationFee = 0;
        }

        // 2. Sponsorship Fee
        if (this.registration.sponsorshipLevel) {
            const level = this.registration.sponsorshipLevel.toLowerCase();
            switch (level) {
                case 'product': this.sponsorshipFee = 0; break;
                case 'bronze': this.sponsorshipFee = 500; break;
                case 'silver': this.sponsorshipFee = 1000; break;
                case 'gold': this.sponsorshipFee = 2500; break;
                case 'platinum': this.sponsorshipFee = 5000; break;
                case 'presenting': this.sponsorshipFee = 10000; break;
                default: this.sponsorshipFee = 0;
            }
        }

        this.totalDue = this.applicationFee + this.sponsorshipFee;
    }

    createPaymentIntent() {
        this.storageService.createPaymentIntent().subscribe({
            next: (res) => {
                // Immutable update to trigger change detection if needed
                this.elementsOptions = {
                    ...this.elementsOptions,
                    clientSecret: res.clientSecret
                } as StripeElementsOptions;
                this.loading = false;
            },
            error: (err) => {
                console.error('Error creating payment intent:', err);
                this.error = err.error?.message || 'Failed to initialize payment. Please try again.';
                this.loading = false;
            }
        });
    }

    onElementsChange(elements: StripeElements) {
        this.elements = elements;
    }

    pay(): void {
        if (this.processing) return;

        if (!this.elements) {
            this.error = 'Payment elements not loaded yet.';
            return;
        }

        this.processing = true;
        this.error = '';

        this.stripe.confirmPayment({
            elements: this.elements,
            redirect: 'if_required', // Avoid full page redirect if possible
            confirmParams: {
                return_url: window.location.origin + '/dashboard', // Fallback
                payment_method_data: {
                    billing_details: {
                        name: this.registration?.organizationName || 'Exhibitor',
                        email: this.registration?.email
                    }
                }
            }
        }).subscribe({
            next: (result) => {
                this.processing = false;
                if (result.error) {
                    this.error = result.error.message || 'Payment failed';
                } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
                    // Payment successful!
                    this.handleSuccess(result.paymentIntent);
                }
            },
            error: (err) => {
                this.processing = false;
                this.error = 'An unexpected error occurred.';
                console.error(err);
            }
        });
    }

    handleSuccess(paymentIntent: any) {
        if (!this.registration || !this.registration._id) return;

        const updates: any = {
            'sectionStatus.payment': true,
            'paymentId': paymentIntent.id,
            'paymentReceipt': 'Stripe', // Using placeholder logic or paymentIntent.id for now
            'paymentDate': new Date()
        };

        this.storageService.updateRegistration(this.registration._id, updates).subscribe({
            next: () => {
                this.router.navigate(['/dashboard']);
            },
            error: (err) => {
                console.error('Error saving payment status:', err);
                // Payment was successful but save failed. Rare edge case.
                // Maybe show a specific message.
                alert('Payment successful, but failed to update record. Please contact support.');
            }
        });
    }

    cancel(): void {
        this.router.navigate(['/dashboard']);
    }
}
