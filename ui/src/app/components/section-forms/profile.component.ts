import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="section-container">
      <h2>Exhibitor Profile & Event Participation</h2>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        
        <div class="form-group checkbox-group">
          <input id="participatedBefore" type="checkbox" formControlName="participatedBefore">
          <label for="participatedBefore">Have you participated in Twin Cities Veg Fest before?</label>
        </div>

        <div class="form-group">
          <label for="organizationCategory">Which category best describes your organization?</label>
          <select id="organizationCategory" formControlName="organizationCategory">
            <option value="">Select category</option>
            <option value="Non-profit">Non-profit</option>
            <option value="Business">Business</option>
            <option value="Artist">Artist</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div class="form-group">
          <label for="organizationYear">What year did your organization begin?</label>
          <input id="organizationYear" type="text" formControlName="organizationYear">
        </div>

        <div class="form-group">
          <label>Does your organization actively promote...</label>
          <div class="checkbox-list">
            <div *ngFor="let val of promoteValues">
              <input type="checkbox" [value]="val" (change)="onValuesChange($event, val)" [checked]="isValueSelected(val)">
              <label>{{ val }}</label>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label for="valuesEmbodiment">How does your organization encourage or embody the values listed above?</label>
          <textarea id="valuesEmbodiment" formControlName="valuesEmbodiment" rows="3"></textarea>
        </div>

        <div class="form-group">
          <label for="slidingScaleDiscount">If your organization started in 2023 or later, what level of sliding scale discount on the base exhibitor fee (up to 50%) would you like?</label>
          <input id="slidingScaleDiscount" type="text" formControlName="slidingScaleDiscount">
        </div>

        <div class="form-group checkbox-group">
          <input id="bipgmOwned" type="checkbox" formControlName="bipgmOwned">
          <label for="bipgmOwned">Is your organization owned by someone who identifies as Black, Indigenous, or a Person of the Global Majority (BIPGM)?</label>
        </div>

        <div class="form-group">
          <label for="culturalIdentity">Please specify your cultural identity or identities.</label>
          <input id="culturalIdentity" type="text" formControlName="culturalIdentity">
        </div>

        <div class="form-group">
          <label for="adaNeeds">If you have ADA or other special needs, please describe them here.</label>
          <textarea id="adaNeeds" formControlName="adaNeeds" rows="2"></textarea>
        </div>

        <div class="form-group checkbox-group">
          <input id="travelingOver100Miles" type="checkbox" formControlName="travelingOver100Miles">
          <label for="travelingOver100Miles">Will you be travelling more than 100 miles to attend the festival?</label>
        </div>

        <div class="form-group">
          <label for="soldElsewhere">Have you sold your products elsewhere? Where?</label>
          <textarea id="soldElsewhere" formControlName="soldElsewhere" rows="2"></textarea>
        </div>

        <div class="form-group checkbox-group">
          <input id="cookingDemo" type="checkbox" formControlName="cookingDemo">
          <label for="cookingDemo">Would you be willing to do a cooking demonstration on television?</label>
        </div>

        <div class="form-group">
          <label for="otherInfo">Anything else we should know?</label>
          <textarea id="otherInfo" formControlName="otherInfo" rows="2"></textarea>
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
      margin: 2rem auto;
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .form-group { margin-bottom: 1.5rem; }
    .checkbox-group { display: flex; align-items: flex-start; gap: 0.5rem; }
    .checkbox-group input { width: auto; margin-top: 0.3rem; }
    .checkbox-list { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
    .checkbox-list div { display: flex; align-items: center; gap: 0.5rem; }
    label { display: block; margin-bottom: 0.5rem; font-weight: 500; }
    input[type="text"], textarea, select { width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; }
    .actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; }
    button { padding: 0.5rem 1.5rem; border-radius: 4px; cursor: pointer; border: none; background: #007bff; color: white; }
    button.secondary { background: #6c757d; }
    button:disabled { opacity: 0.7; cursor: not-allowed; }
  `]
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private storageService = inject(StorageService);
  private router = inject(Router);

  form: FormGroup;
  saving = false;
  registrationId: string = '';

  promoteValues = ['Plant-based eating', 'Animal well-being', "Our planet's well-being", 'Human health or well-being'];

  constructor() {
    this.form = this.fb.group({
      participatedBefore: [false],
      organizationCategory: [''],
      organizationYear: [''],
      promotesValues: [[]],
      valuesEmbodiment: [''],
      slidingScaleDiscount: [''],
      bipgmOwned: [false],
      culturalIdentity: [''],
      adaNeeds: [''],
      travelingOver100Miles: [false],
      soldElsewhere: [''],
      cookingDemo: [false],
      otherInfo: ['']
    });
  }

  ngOnInit(): void {
    this.storageService.getLatestRegistration().subscribe(reg => {
      if (reg && reg._id) {
        this.registrationId = reg._id;
        this.form.patchValue(reg);
      }
    });
  }

  isValueSelected(val: string): boolean {
    const selected = this.form.get('promotesValues')?.value as string[];
    return selected ? selected.includes(val) : false;
  }

  onValuesChange(event: Event, val: string) {
    const checkbox = event.target as HTMLInputElement;
    const current = this.form.get('promotesValues')?.value as string[] || [];

    if (checkbox.checked) {
      this.form.patchValue({ promotesValues: [...current, val] });
    } else {
      this.form.patchValue({ promotesValues: current.filter(v => v !== val) });
    }
  }

  onSubmit() {
    if (this.form.valid && this.registrationId) {
      this.saving = true;
      const updates: any = {
        ...this.form.value,
        'sectionStatus.profile': true
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
