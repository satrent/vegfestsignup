import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="section-container">
      <h2>Products & Festival Guidelines</h2>
      <div *ngIf="form.disabled" class="alert alert-warning">
        This application has been submitted and is currently locked.
      </div>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        
        <div class="form-group">
          <label for="productsDescription">Please describe what you plan to sell or distribute at the festival.</label>
          <textarea id="productsDescription" formControlName="productsDescription" rows="4"></textarea>
        </div>

        <div class="form-group">
          <label for="cbdThcProducts">CBD and THC: Products I sell or distribute...</label>
          <select id="cbdThcProducts" formControlName="cbdThcProducts">
            <option value="">Select an option</option>
            <option value="None">Do not contain CBD or THC</option>
            <option value="CBD">Contain CBD only</option>
            <option value="THC">Contain THC</option>
            <option value="Both">Contain both CBD and THC</option>
          </select>
        </div>

        <div class="form-group checkbox-group">
          <input id="sellingDrinks" type="checkbox" formControlName="sellingDrinks">
          <label for="sellingDrinks">Will you sell or distribute drinks?</label>
        </div>

        <div class="form-group checkbox-group">
          <input id="distributingSamples" type="checkbox" formControlName="distributingSamples">
          <label for="distributingSamples">Will you be distributing samples or candy to attendees?</label>
        </div>

        <div class="form-group checkbox-group" *ngIf="isFoodVendor">
          <input id="sampleSizeOption" type="checkbox" formControlName="sampleSizeOption">
          <label for="sampleSizeOption">We require food vendors to include a sample size $5 or less option on their menus for the festival. I agree.</label>
        </div>

        <div class="form-group" *ngIf="isFoodVendor || form.get('sellingDrinks')?.value || form.get('distributingSamples')?.value">
          <label for="containersAndUtensils">If you plan to distribute food or drinks to be consumed on site, please tell us what containers and utensils you will use.</label>
          <textarea id="containersAndUtensils" formControlName="containersAndUtensils" rows="2"></textarea>
        </div>

        <div class="form-group" *ngIf="isFoodVendor || form.get('sellingDrinks')?.value || form.get('distributingSamples')?.value">
          <label for="compostableBrand">Please tell us what BRAND of BPI-Certified compostable products you will use.</label>
          <input id="compostableBrand" type="text" formControlName="compostableBrand">
        </div>

        <div class="form-group">
          <label for="foodAllergies">Food Allergies and Sensitivities (Please list any common allergens in your products)</label>
          <textarea id="foodAllergies" formControlName="foodAllergies" rows="2"></textarea>
        </div>

        <h3>Acknowledgements</h3>
        
        <div class="form-group checkbox-group">
          <input id="animalProductFreeAck" type="checkbox" formControlName="animalProductFreeAck">
          <label for="animalProductFreeAck">If you plan to sell or distribute products, please acknowledge that they must not contain any animal products (meat, dairy, eggs, honey, beeswax, wool, silk, etc.).</label>
        </div>

        <div class="form-group checkbox-group">
          <input id="veganFoodAck" type="checkbox" formControlName="veganFoodAck">
          <label for="veganFoodAck">If you plan to sell or distribute food, drinks, or candy, please acknowledge that only vegan food can be advertised and sold or distributed.</label>
        </div>

        <div class="form-group checkbox-group">
          <input id="compostableAck" type="checkbox" formControlName="compostableAck">
          <label for="compostableAck">All of the products I listed above... WILL BE BPI-CERTIFIED COMPOSTABLE.</label>
        </div>

        <div class="actions">
          <button type="button" class="secondary" (click)="cancel()">Cancel</button>
          <button type="submit" [disabled]="form.invalid || saving">
            {{ saving ? 'Saving...' : 'Save & Complete' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .section-container {
      max-width: 800px;
    button.secondary { background: #6c757d; }
    button:disabled { opacity: 0.7; cursor: not-allowed; }
  `]
})
export class ProductsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private storageService = inject(StorageService);
  private router = inject(Router);

  form: FormGroup;
  saving = false;
  registrationId: string = '';
  isFoodVendor = false; // Logic to determine if they are a food vendor could be based on type or answers

  constructor() {
    this.form = this.fb.group({
      productsDescription: ['', Validators.required],
      cbdThcProducts: [''],
      sellingDrinks: [false],
      distributingSamples: [false],
      sampleSizeOption: [false],
      containersAndUtensils: [''],
      compostableBrand: [''],
      foodAllergies: [''],
      animalProductFreeAck: [false, Validators.requiredTrue],
      veganFoodAck: [false, Validators.requiredTrue],
      compostableAck: [false, Validators.requiredTrue]
    });
  }

  ngOnInit(): void {
    this.storageService.getLatestRegistration().subscribe(reg => {
      if (reg && reg._id) {
        this.registrationId = reg._id;
        this.form.patchValue(reg);

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
      const updates: any = {
        ...this.form.value,
        'sectionStatus.products': true
      };

      this.storageService.updateRegistration(this.registrationId, updates).subscribe({
        next: () => {
          this.saving = false;
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          console.error('Error saving section:', err);
          this.saving = false;
          alert('Failed to save. Please try again.');
        }
      });
    }
  }

  cancel() {
    this.router.navigate(['/dashboard']);
  }
}
