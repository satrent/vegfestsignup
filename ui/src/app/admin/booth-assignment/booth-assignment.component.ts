import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
  CdkDrag,
  CdkDropList,
} from '@angular/cdk/drag-drop';
import { BoothService, Booth, UnassignedRegistration } from '../../services/booth.service';

@Component({
  selector: 'app-booth-assignment',
  standalone: true,
  imports: [CommonModule, FormsModule, CdkDropList, CdkDrag],
  templateUrl: './booth-assignment.component.html',
  styleUrls: ['./booth-assignment.component.scss']
})
export class BoothAssignmentComponent implements OnInit {
  booths: Booth[] = [];
  unassignedParticipants: UnassignedRegistration[] = [];

  // Editor mode state
  isEditorMode = false;
  newBoothNumber: number | null = null;
  draggedBooth: Booth | null = null;
  isDraggingSpot = false;

  loading = true;
  error = '';

  constructor(private boothService: BoothService) { }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.boothService.getBooths().subscribe({
      next: (booths) => {
        this.booths = booths;
        this.loadUnassigned();
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load booth spots.';
        this.loading = false;
      }
    });
  }

  loadUnassigned() {
    this.boothService.getUnassignedRegistrations().subscribe({
      next: (participants) => {
        this.unassignedParticipants = participants;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load participants.';
        this.loading = false;
      }
    });
  }

  toggleEditorMode() {
    this.isEditorMode = !this.isEditorMode;
  }

  onSpotDragStarted() {
    this.isDraggingSpot = true;
  }

  // Map Click to create a spot
  onMapClick(event: MouseEvent) {
    if (!this.isEditorMode) return;

    // Only trigger if map area is clicked, not existing spots
    const target = event.target as HTMLElement;
    if (target.classList.contains('booth-spot') || target.closest('.booth-spot')) {
      return;
    }

    const mapArea = document.querySelector('.map-container') as HTMLElement;
    if (!mapArea) return;

    const rect = mapArea.getBoundingClientRect();
    const xPercentage = ((event.clientX - rect.left) / rect.width) * 100;
    const yPercentage = ((event.clientY - rect.top) / rect.height) * 100;

    let bNum = this.newBoothNumber;
    if (bNum === null || bNum === undefined) {
      // auto generate next number based on max existing
      const maxNum = this.booths.length > 0 ? Math.max(...this.booths.map(b => b.boothNumber)) : 0;
      bNum = maxNum + 1;
    }

    this.boothService.createBooth(bNum, xPercentage, yPercentage).subscribe({
      next: (booth) => {
        this.booths.push(booth);
        this.newBoothNumber = bNum + 1;
      },
      error: (err) => {
        console.error(err);
        alert('Failed to create spot: ' + (err.error?.error || err.message));
      }
    });
  }

  // Spot dragging in editor mode
  onSpotDragEnd(event: any, booth: Booth) {
    if (!this.isEditorMode) return;

    const sourceEl = event.source.element.nativeElement;
    const mapArea = document.querySelector('.map-container') as HTMLElement;
    const rect = mapArea.getBoundingClientRect();

    // Get new transform coords
    const transform = event.source.getFreeDragPosition();

    // Convert transform to percentage and add to existing
    const currentX = (booth.xPercentage / 100) * rect.width;
    const currentY = (booth.yPercentage / 100) * rect.height;

    const newX = currentX + transform.x;
    const newY = currentY + transform.y;

    const newXPercentage = (newX / rect.width) * 100;
    const newYPercentage = (newY / rect.height) * 100;

    this.boothService.updateBoothCoords(booth._id, newXPercentage, newYPercentage).subscribe({
      next: (updatedBooth) => {
        booth.xPercentage = updatedBooth.xPercentage;
        booth.yPercentage = updatedBooth.yPercentage;
        // reset drag transform
        event.source.reset();
      },
      error: (err) => {
        console.error(err);
        alert('Failed to save spot position');
        event.source.reset(); // Snap back
      }
    });
  }

  deleteSpot(booth: Booth, event: Event) {
    event.stopPropagation();
    if (confirm(`Remove spot #${booth.boothNumber}?`)) {
      this.boothService.deleteBooth(booth._id).subscribe({
        next: () => {
          this.booths = this.booths.filter(b => b._id !== booth._id);
          this.loadUnassigned(); // refresh unassigned list if this spot had a participant
        },
        error: (err) => {
          console.error(err);
          alert('Failed to delete spot');
        }
      });
    }
  }

  // Drag and drop assignment logic
  dropVendor(event: CdkDragDrop<any>) {
    // If dropped in the same container, handle list reordering if needed (optional)
    if (event.previousContainer === event.container && event.container.id === 'unassignedList') {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    // We can't drag FROM a spot TO another spot easily yet, so let's stick to Unassigned -> Spot
    if (event.previousContainer.id === 'unassignedList' && event.container.id.startsWith('spot-')) {
      const participant = event.previousContainer.data[event.previousIndex];
      const boothIdMap = event.container.id.replace('spot-', '');

      const booth = this.booths.find(b => b._id === boothIdMap);
      if (booth && !booth.registrationId) {
        this.boothService.assignRegistration(booth._id, participant._id).subscribe({
          next: (updatedBooth) => {
            const idx = this.booths.findIndex(b => b._id === updatedBooth._id);
            if (idx > -1) {
              this.booths[idx] = updatedBooth;
            }
            this.loadUnassigned(); // refresh unassigned list to properly reflect state 
            // (we might only want to remove it if they filled all requested booth spots)
          },
          error: (err) => {
            console.error(err);
            alert('Assignment failed: ' + (err.error?.error || err.message));
          }
        });
      }
    }
  }

  // The spots on the map can't accept CdkDropList easily if we use absolute positioning unless we wrap each one,
  // which we will do in the template `<div cdkDropList ...>`

  unassignVendor(booth: Booth, event: Event) {
    event.stopPropagation();
    this.boothService.unassignRegistration(booth._id).subscribe({
      next: (updatedBooth) => {
        const idx = this.booths.findIndex(b => b._id === updatedBooth._id);
        if (idx > -1) {
          this.booths[idx] = updatedBooth;
        }
        this.loadUnassigned(); // refresh to bring them back if needed
      },
      error: (err) => {
        console.error(err);
        alert('Failed to unassign.');
      }
    });
  }
}
