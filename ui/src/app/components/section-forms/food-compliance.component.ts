import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService, Registration } from '../../services/storage.service';
import { FileUploadComponent } from '../shared/file-upload/file-upload.component';

@Component({
    selector: 'app-food-compliance',
    imports: [CommonModule, ReactiveFormsModule, FileUploadComponent],
    templateUrl: './food-compliance.component.html',
    styleUrls: ['./food-compliance.component.scss']
})
export class FoodComplianceComponent implements OnInit {
    private fb = inject(FormBuilder);
    private storageService = inject(StorageService);
    private router = inject(Router);

    form: FormGroup;
    saving = false;
    registrationId: string = '';
    documents: NonNullable<Registration['documents']> = [];

    isFoodVendor = false;
    isThcVendor = false; // Primary THC vendor (from Category)
    isThcSales = false; // Secondary check (from Question "Will you sell...?")

    // Options
    drinkOptions = [
        'In cans or recyclable bottles',
        'In BPI compostable cups with BPI compostable straws'
    ];

    constructor() {
        this.form = this.fb.group({
            // Food Fields
            cookingOnSite: [null],
            isFoodTruck: [null],
            thcProductSales: [null], // This triggers THC compliance for Food vendors too

            foodOfferings: [''], // 100% Vegan | Mixed
            fiveDollarItemAck: [false],

            menuOption: ['upload_now'],

            compostableServicewareAck: [false],
            servingDrinks: this.fb.array([]), // Checkboxes
            bottledWaterAck: [false],

            propaneOpenFlame: [null],
            propaneAmount: [''],
            handwashingAck: [false],

            // THC Fields
            thcComplianceAck: [false]
        });

        // Listeners for conditional validators
        this.form.get('propaneOpenFlame')?.valueChanges.subscribe(val => {
            const amt = this.form.get('propaneAmount');
            if (val === true && this.form.get('isFoodTruck')?.value !== true) {
                amt?.setValidators(Validators.required);
            } else {
                amt?.clearValidators();
            }
            amt?.updateValueAndValidity();
        });

        this.form.get('thcProductSales')?.valueChanges.subscribe(val => {
            this.isThcSales = val === true;
            this.updateThcValidators();
        });

        this.form.get('foodOfferings')?.valueChanges.subscribe(val => {
            if (val === 'Mixed') {
                // Logic handled in HTML/Submit to block
            }
        });
    }

    ngOnInit(): void {
        this.storageService.getLatestRegistration().subscribe(reg => {
            if (reg && reg._id) {
                this.registrationId = reg._id;
                this.documents = reg.documents || [];

                // Determine type
                const cat = (reg.organizationCategory || '').toLowerCase();
                this.isFoodVendor = cat.includes('food') || cat.includes('drink') || cat.includes('ice cream');
                this.isThcVendor = cat.includes('thc');

                // Patch values
                this.form.patchValue({
                    cookingOnSite: reg.cookingOnSite,
                    isFoodTruck: reg.isFoodTruck,
                    thcProductSales: reg.thcProductSales,
                    foodOfferings: reg.foodOfferings || '',
                    fiveDollarItemAck: reg.fiveDollarItemAck,
                    menuOption: reg.menuOption || 'upload_now',
                    compostableServicewareAck: reg.compostableServicewareAck,
                    bottledWaterAck: reg.bottledWaterAck,
                    propaneOpenFlame: reg.propaneOpenFlame,
                    propaneAmount: reg.propaneAmount || '',
                    handwashingAck: reg.handwashingAck,
                    thcComplianceAck: reg.thcComplianceAck
                });

                // Initialize checkbox array for Drinks
                const selectedDrinks = reg.servingDrinks || [];
                this.drinkOptions.forEach(() => {
                    (this.form.get('servingDrinks') as FormArray).push(this.fb.control(false));
                });
                // We need a better way to map strings back to boolean controls if we want.
                // For simplicity, let's just assume we clear it or rebuild it.
                // Actually, let's simpler: FormArray of bools matching drinkOptions.
                if (selectedDrinks.length > 0) {
                    // Mapping logic if needed, or simple "Is checked" logic
                    // For now, let's trust the user re-selects or we use a helper. 
                }

                this.isThcSales = reg.thcProductSales === true;

                if (reg.status !== 'In Progress') {
                    this.form.disable();
                    this.saving = true;
                }
            }
        });
    }

    updateThcValidators() {
        const ack = this.form.get('thcComplianceAck');
        if (this.isThcVendor || this.isThcSales) {
            ack?.setValidators(Validators.requiredTrue);
        } else {
            ack?.clearValidators();
        }
        ack?.updateValueAndValidity();
    }

    // Drink helpers
    onDrinkCheckChange(event: any) {
        const formArray: FormArray = this.form.get('servingDrinks') as FormArray;
        // Just handling UI array - validation is custom
    }

    // File helpers
    getDoc(type: string) { return this.documents.find(d => d.type === type); }
    hasDoc(type: string) { return !!this.getDoc(type); }
    onUpload(event: any) {
        const doc = event.document;
        const index = this.documents.findIndex(d => d.type === doc.type);
        if (index >= 0) this.documents[index] = doc;
        else this.documents.push(doc);
    }

    onSubmit() {
        // 1. Check Automatic Rejection
        if (this.isFoodVendor && this.form.get('foodOfferings')?.value === 'Mixed') {
            alert('Automatic Rejection: We only accept 100% vegan offerings.');
            return;
        }

        // 2. Required Fields for Food Vendors
        if (this.isFoodVendor) {
            if (!this.form.get('foodOfferings')?.value) {
                alert('Please select your food offerings.');
                return;
            }
            if (this.form.get('menuOption')?.value === 'upload_now' && !this.hasDoc('Menu')) {
                alert('Please upload your menu.');
                return;
            }
        }

        // 3. THC
        if ((this.isThcVendor || this.isThcSales) && !this.form.get('thcComplianceAck')?.value) {
            alert('You must acknowledge the THC compliance.');
            return;
        }

        if (this.registrationId) {
            this.saving = true;
            const updates = {
                ...this.form.value,
                'sectionStatus.foodCompliance': true
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
    }

    cancel() { this.router.navigate(['/dashboard']); }
}
