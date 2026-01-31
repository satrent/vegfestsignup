import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-logistics',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './logistics.component.html',
  styleUrls: ['./logistics.component.scss']
})
export class LogisticsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private storageService = inject(StorageService);
  private router = inject(Router);

  form: FormGroup;
  saving = false;
  registrationId: string = '';

  powerOptions = ['None', '5A ($60)', '10A ($80)', '15A ($100)', '20A ($120)'];
  vehicleOptions = ['Car', 'SUV', 'Van', 'Box truck', 'Other'];
  loadInOptions = [
    '2pm to 5pm September 19 (security provided)',
    'Event morning window (6am-8am)',
    'Will decide later'
  ];

  constructor() {
    this.form = this.fb.group({
      // Booth & Rentals
      numBoothSpaces: [0, [Validators.min(0)]],
      numTables: [0, [Validators.min(0)]],
      numChairs: [0, [Validators.min(0)]],
      numTents: [0, [Validators.min(0)]],

      // Power
      powerNeeds: ['None', Validators.required],
      householdElectric: [null], // Radio Yes/No
      electricNeedsDescription: [''],

      // Sales
      onSiteSales: [null, Validators.required],
      priceRange: [''],

      // Load-in
      loadInVehicle: [''],
      vehicleDimensions: [''],
      loadInAvailability: ['']
    });

    // Validations triggers
    this.form.get('powerNeeds')?.valueChanges.subscribe(val => {
      this.updatePowerValidators(val);
    });

    this.form.get('householdElectric')?.valueChanges.subscribe(val => {
      const descControl = this.form.get('electricNeedsDescription');
      if (val === false) { // Assuming false means "No" to household outlets
        descControl?.setValidators(Validators.required);
      } else {
        descControl?.clearValidators();
      }
      descControl?.updateValueAndValidity();
    });

    this.form.get('onSiteSales')?.valueChanges.subscribe(val => {
      const priceControl = this.form.get('priceRange');
      // Optional either way based on spec ("Typical price range (min-max) [Optional]"),
      // but let's clear it if hidden.
      if (!val) {
        priceControl?.setValue('');
      }
    });
  }

  ngOnInit(): void {
    this.storageService.getLatestRegistration().subscribe(reg => {
      if (reg && reg._id) {
        this.registrationId = reg._id;
        this.form.patchValue({
          numBoothSpaces: reg.numBoothSpaces || 0,
          numTables: reg.numTables || 0,
          numChairs: reg.numChairs || 0,
          numTents: reg.numTents || 0,

          powerNeeds: reg.powerNeeds || 'None',
          householdElectric: reg.householdElectric,
          electricNeedsDescription: reg.electricNeedsDescription || '',

          onSiteSales: reg.onSiteSales,
          priceRange: reg.priceRange || '',

          loadInVehicle: reg.loadInVehicle || '',
          vehicleDimensions: reg.vehicleDimensions || '',
          loadInAvailability: reg.loadInAvailability || ''
        });

        // Trigger updates
        this.updatePowerValidators(reg.powerNeeds || 'None');

        if (reg.status !== 'In Progress') {
          this.form.disable();
          this.saving = true;
        }
      }
    });
  }

  updatePowerValidators(powerVal: string) {
    // If power needed (not None), we might check householdElectric
    const householdCtrl = this.form.get('householdElectric');
    const descCtrl = this.form.get('electricNeedsDescription');

    if (powerVal && powerVal !== 'None') {
      // "If electricity needed: Can your equipment be plugged into household outlets?"
      // No strict required validator on householdElectric was requested in text ("If electricity needed..."), 
      // but typically sub-questions should be valid. Let's make logic robust.
    } else {
      householdCtrl?.setValue(null);
      descCtrl?.setValue('');
      descCtrl?.clearValidators();
      descCtrl?.updateValueAndValidity();
    }
  }

  get showElectricQuestions(): boolean {
    const val = this.form.get('powerNeeds')?.value;
    return val && val !== 'None';
  }

  get showPriceRange(): boolean {
    return this.form.get('onSiteSales')?.value === true;
  }

  get showVehicleDimensions(): boolean {
    const val = this.form.get('loadInVehicle')?.value;
    return val && val !== 'Car' && val !== 'SUV' && val !== 'Van'; // Show for Box Truck, Other, etc.
  }

  onSubmit() {
    if (this.form.valid && this.registrationId) {
      this.saving = true;
      const updates = {
        ...this.form.value,
        'sectionStatus.logistics': true
      };

      this.storageService.updateRegistration(this.registrationId, updates).subscribe({
        next: () => {
          this.saving = false;
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          console.error('Error saving logistics:', err);
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
