import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '../../services/storage.service';

function atLeastOneSelected(control: AbstractControl): ValidationErrors | null {
    const arr = control as FormArray;
    return arr.controls.some(c => c.value === true) ? null : { required: true };
}

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

    drinkVesselOptions = ['Cans', 'Glass bottles', 'Compostable cups', 'Recyclable cups'];

    get drinkVesselsArray(): FormArray {
        return this.form.get('drinkVessels') as FormArray;
    }

    get hasRecyclableCups(): boolean {
        const recyclableIndex = this.drinkVesselOptions.indexOf('Recyclable cups');
        return this.drinkVesselsArray.at(recyclableIndex)?.value === true;
    }

    constructor() {
        this.form = this.fb.group({
            valuesDescription: ['', Validators.required],
            materialsAck: [false],
            veganFoodAck: [false],
            drinkVessels: this.fb.array(this.drinkVesselOptions.map(() => this.fb.control(false))),
            bpiContainerBrand: [''],
            endorsePlantBasedMeals: [false]
        });
    }

    ngOnInit(): void {
        this.storageService.getLatestRegistration().subscribe(reg => {
            if (reg && reg._id) {
                this.registrationId = reg._id;

                const category = reg.organizationCategory || '';
                this.isFoodVendor = category === 'On-site food prep & sales $600' ||
                    category === 'Food business with on-site food prep — not a restaurant or food truck $350';

                if (this.isFoodVendor) {
                    this.form.get('veganFoodAck')?.setValidators(Validators.requiredTrue);
                    this.form.get('materialsAck')?.clearValidators();
                    this.drinkVesselsArray.setValidators(atLeastOneSelected);
                    this.form.get('bpiContainerBrand')?.setValidators(Validators.required);
                } else {
                    this.form.get('materialsAck')?.setValidators(Validators.requiredTrue);
                    this.form.get('veganFoodAck')?.clearValidators();
                    this.drinkVesselsArray.clearValidators();
                    this.form.get('bpiContainerBrand')?.clearValidators();
                }
                this.form.updateValueAndValidity();

                // Patch drinkVessels array from saved string[]
                const savedVessels: string[] = reg.drinkVessels || [];
                this.drinkVesselOptions.forEach((opt, i) => {
                    this.drinkVesselsArray.at(i).setValue(savedVessels.includes(opt));
                });

                this.form.patchValue({
                    valuesDescription: reg.valuesDescription || '',
                    materialsAck: reg.materialsAck || false,
                    veganFoodAck: reg.veganFoodAck || false,
                    bpiContainerBrand: reg.bpiContainerBrand || '',
                    endorsePlantBasedMeals: reg.endorsePlantBasedMeals || false
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

            const selectedVessels = this.drinkVesselOptions.filter((_, i) => this.drinkVesselsArray.at(i).value);

            const updates = {
                valuesDescription: this.form.value.valuesDescription,
                materialsAck: this.form.value.materialsAck,
                veganFoodAck: this.form.value.veganFoodAck,
                drinkVessels: selectedVessels,
                bpiContainerBrand: this.form.value.bpiContainerBrand,
                endorsePlantBasedMeals: this.form.value.endorsePlantBasedMeals,
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
