import { Component, OnInit, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '../../services/storage.service';

@Component({
    selector: 'app-expectations',
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './expectations.component.html',
    styleUrls: ['./expectations.component.scss']
})
export class ExpectationsComponent implements OnInit {
    private fb = inject(FormBuilder);
    private storageService = inject(StorageService);
    private router = inject(Router);

    form: FormGroup;
    saving = false;
    registrationId: string = '';

    hasScrolledToBottom = false;

    orientationOptions = [
        'Sat 9/5 9:00am',
        'Sun 9/6 7:00pm',
        'Mon 9/7 12:00pm',
        'Mon 9/7 7:30pm'
    ];

    constructor() {
        this.form = this.fb.group({
            orientationSession: ['', Validators.required],
            termsAgreement: [{ value: false, disabled: true }, Validators.requiredTrue],
            signature: ['', Validators.required]
        });
    }

    ngOnInit(): void {
        this.storageService.getLatestRegistration().subscribe(reg => {
            if (reg && reg._id) {
                this.registrationId = reg._id;

                this.form.patchValue({
                    orientationSession: reg.orientationSession || '',
                    signature: reg.signature || ''
                });

                if (reg.termsAgreement) {
                    this.hasScrolledToBottom = true;
                    this.form.get('termsAgreement')?.enable();
                    this.form.patchValue({ termsAgreement: true });
                }

                if (reg.status !== 'In Progress') {
                    this.form.disable();
                    this.saving = true; // effectively read-only state
                }
            }
        });
    }

    onTermsScroll(event: Event) {
        if (this.hasScrolledToBottom) return;

        const element = event.target as HTMLElement;
        // Check if scrolled to bottom (within 20px)
        if (element.scrollHeight - element.scrollTop <= element.clientHeight + 20) {
            this.hasScrolledToBottom = true;
            this.form.get('termsAgreement')?.enable();
        }
    }

    onSubmit() {
        if (this.form.invalid) return;

        this.saving = true;
        const updates = {
            ...this.form.value,
            'sectionStatus.expectations': true
        };

        this.storageService.updateRegistration(this.registrationId, updates).subscribe({
            next: () => {
                this.saving = false;
                this.router.navigate(['/dashboard']);
            },
            error: (err) => {
                console.error(err);
                this.saving = false;
                alert('Failed to save.');
            }
        });
    }

    cancel() {
        this.router.navigate(['/dashboard']);
    }
}
