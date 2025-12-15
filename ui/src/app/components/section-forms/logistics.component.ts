import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-logistics',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="section-container">
      <h2>Logistics & Equipment</h2>
      <div *ngIf="form.disabled" class="alert alert-warning">
        This application has been submitted and is currently locked.
      </div>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        
        <div class="form-group">
          <label for="loadInDay">Please select your preferred day for loading supplies onto the field.</label>
          <select id="loadInDay" formControlName="loadInDay">
            <option value="">Select a day</option>
            <option value="Saturday">Saturday</option>
            <option value="Sunday">Sunday</option>
          </select>
        </div>

        <div class="form-group">
          <label>Please check off items you will have in your 10x10 space.</label>
          <div class="checkbox-list">
            <div *ngFor="let item of equipmentOptions">
              <input type="checkbox" [value]="item" (change)="onEquipmentChange($event, item)" [checked]="isEquipmentSelected(item)">
              <label>{{ item }}</label>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label for="otherEquipment">If you will have other equipment that needs more space, please explain what you plan to bring and how much space you'll need.</label>
          <textarea id="otherEquipment" formControlName="otherEquipment" rows="2"></textarea>
        </div>

        <div class="form-group">
          <label for="vehicleDetails">Are you bringing a food truck, truck, van, or trailer? If yes, please provide the length, width, and height of your vehicle.</label>
          <textarea id="vehicleDetails" formControlName="vehicleDetails" rows="2"></textarea>
        </div>

        <h3>Supplies Order</h3>
        <p>All exhibitors are required to have a 10x10 tent. Please indicate how many of each supply you'd like to order:</p>
        
        <div class="form-group inline-number">
          <input id="numTables" type="number" formControlName="numTables" min="0">
          <label for="numTables">Tables ($15 each)</label>
        </div>

        <div class="form-group inline-number">
          <input id="numChairs" type="number" formControlName="numChairs" min="0">
          <label for="numChairs">Chairs ($5 each)</label>
        </div>

        <div class="form-group inline-number">
          <input id="numTents" type="number" formControlName="numTents" min="0">
          <label for="numTents">Tents ($150 each)</label>
        </div>

        <div class="form-group inline-number">
          <input id="numWeights" type="number" formControlName="numWeights" min="0">
          <label for="numWeights">Set of 4 Weights (50 lbs each) - ($30/set)</label>
        </div>

        <div class="form-group inline-number">
          <input id="numExtraSpots" type="number" formControlName="numExtraSpots" min="0">
          <label for="numExtraSpots">Extra Tent Spot (10'x20' total plot) - ($50)</label>
        </div>

        <h3>Power Needs</h3>
        <div class="form-group">
          <label for="amperageDraw">Please add up all the amperage draw of the equipment you will be using and select the range you will be needing:</label>
          <select id="amperageDraw" formControlName="amperageDraw">
            <option value="">Select range</option>
            <option value="1-5">1-5 Amps ($50)</option>
            <option value="6-10">6-10 Amps ($125)</option>
            <option value="11-15">11-15 Amps ($200)</option>
            <option value="16-20">16-20 Amps ($275)</option>
            <option value="21-25">21-25 Amps ($350)</option>
            <option value="26-30">26-30 Amps ($425)</option>
            <option value="30+">Over 30 Amps ($500)</option>
          </select>
        </div>

        <div class="form-group checkbox-group">
          <input id="standardPower" type="checkbox" formControlName="standardPower">
          <label for="standardPower">Will standard home 120V power outlets be sufficient for you?</label>
        </div>

        <div class="form-group">
          <label for="electricalEquipment">Please list all the equipment that draws electricity you will be using. If you need power different than standard home 120V power, please explain what type of power you need.</label>
          <textarea id="electricalEquipment" formControlName="electricalEquipment" rows="2"></textarea>
        </div>

        <div class="form-group">
          <label for="propaneAmount">If you are bringing propane, how much, in pounds, will you bring?</label>
          <input id="propaneAmount" type="text" formControlName="propaneAmount">
        </div>

        <div class="form-group">
          <label for="sunlightProtection">Are you selling a product that needs protection from direct sunlight? If yes, please tell us more.</label>
          <textarea id="sunlightProtection" formControlName="sunlightProtection" rows="2"></textarea>
        </div>

        <h3>Safety Acknowledgements</h3>
        <div class="form-group checkbox-group">
          <input id="fireExtinguisherAck" type="checkbox" formControlName="fireExtinguisherAck">
          <label for="fireExtinguisherAck">Please acknowledge that if you will be cooking with oil, you will need a K-class fire extinguisher.</label>
        </div>

        <div class="form-group checkbox-group">
          <input id="propaneFireExtinguisherAck" type="checkbox" formControlName="propaneFireExtinguisherAck">
          <label for="propaneFireExtinguisherAck">Please acknowledge that if you bring propane, you will need a 2A-10 BC fire extinguisher.</label>
        </div>

        <div class="form-group checkbox-group">
          <input id="loadOutAck" type="checkbox" formControlName="loadOutAck">
          <label for="loadOutAck">I understand that for safety reasons the field needs to be cleared of attendees before I can load out.</label>
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
    .alert { padding: 1rem; margin-bottom: 1rem; border-radius: 4px; }
    .alert-warning { background-color: #fff3cd; color: #856404; border: 1px solid #ffeeba; }
    .form-group { margin-bottom: 1.5rem; }
    .inline-number { display: flex; align-items: center; gap: 1rem; }
    .inline-number label { margin-bottom: 0; }
    .inline-number input { width: 60px; }
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
export class LogisticsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private storageService = inject(StorageService);
  private router = inject(Router);

  form: FormGroup;
  saving = false;
  registrationId: string = '';

  equipmentOptions = ['Tent', 'Table', 'Chairs', 'Display Rack', 'Signage'];

  constructor() {
    this.form = this.fb.group({
      loadInDay: [''],
      tablesChairs: [[]], // Array of strings
      otherEquipment: [''],
      vehicleDetails: [''],
      numTables: [0],
      numChairs: [0],
      numTents: [0],
      numWeights: [0],
      numExtraSpots: [0],
      amperageDraw: [''],
      standardPower: [false],
      electricalEquipment: [''],
      powerNeeds: [''],
      propaneAmount: [''],
      sunlightProtection: [''],
      fireExtinguisherAck: [false],
      propaneFireExtinguisherAck: [false],
      loadOutAck: [false, Validators.requiredTrue]
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

  isEquipmentSelected(item: string): boolean {
    const selected = this.form.get('tablesChairs')?.value as string[];
    return selected ? selected.includes(item) : false;
  }

  onEquipmentChange(event: Event, item: string) {
    const checkbox = event.target as HTMLInputElement;
    const current = this.form.get('tablesChairs')?.value as string[] || [];

    if (checkbox.checked) {
      this.form.patchValue({ tablesChairs: [...current, item] });
    } else {
      this.form.patchValue({ tablesChairs: current.filter(i => i !== item) });
    }
  }



  onSubmit() {
    if (this.form.valid && this.registrationId) {
      this.saving = true;
      const updates: any = {
        ...this.form.value,
        'sectionStatus.logistics': true
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
