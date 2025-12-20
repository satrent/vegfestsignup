import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '../../services/storage.service';

@Component({
    selector: 'app-values',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './values.component.html',
    styleUrls: ['./values.component.scss']
})
export class ValuesComponent implements OnInit {
    private fb = inject(FormBuilder);
    private storageService = inject(StorageService);
    private router = inject(Router);

    form: FormGroup;
    saving = false;
    registrationId: string = '';
    isFoodVendor = false;

    constructor() {
        this.form = this.fb.group({
            valuesDescription: ['', Validators.required],
            materialsAck: [false], // For non-food
            veganFoodAck: [false]  // For food
        });
    }

    ngOnInit(): void {
        this.storageService.getLatestRegistration().subscribe(reg => {
            if (reg && reg._id) {
                this.registrationId = reg._id;

                // Determine vendor type
                const category = (reg.organizationCategory || '').toLowerCase();
                this.isFoodVendor = category.includes('food');

                // Set validators dynamically
                if (this.isFoodVendor) {
                    this.form.get('veganFoodAck')?.setValidators(Validators.requiredTrue);
                    this.form.get('materialsAck')?.clearValidators();
                } else {
                    this.form.get('materialsAck')?.setValidators(Validators.requiredTrue);
                    this.form.get('veganFoodAck')?.clearValidators();
                }
                this.form.updateValueAndValidity();

                this.form.patchValue({
                    valuesDescription: reg.valuesDescription || '',
                    materialsAck: reg.materialsAck || false,
                    veganFoodAck: reg.veganFoodAck || false
                });

                if (reg.status !== 'In Progress') {
                    this.form.disable();
                    this.saving = true;
                }
            }
        });
    }

    onSubmit() {
        if (this.form.valid && this.registrationId) {
            this.saving = true;
            const updates = {
                ...this.form.value,
                'sectionStatus.values': true
            };

            this.storageService.updateRegistration(this.registrationId, updates).subscribe({
                next: () => {
                    this.saving = false;
                    this.router.navigate(['/dashboard']);
                },
                error: (err) => {
                    console.error('Error saving values:', err);
                    this.saving = false;
                    alert('Failed to save. Please try again.');
                }
            });
        } else {
            this.form.markAllAsTouched();
        }
    }

    cancel() {
        this.router.navigate(['/dashboard']);
    }
}
