import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  CdkDragDrop,
  moveItemInArray,
  CdkDrag,
  CdkDropList,
  CdkDropListGroup,
} from '@angular/cdk/drag-drop';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { BoothService, Booth, BoothArea, UnassignedRegistration } from '../../services/booth.service';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-booth-assignment',
  standalone: true,
  imports: [CommonModule, FormsModule, CdkDropList, CdkDrag, CdkDropListGroup, CdkScrollable, RouterLink],
  templateUrl: './booth-assignment.component.html',
  styleUrls: ['./booth-assignment.component.scss']
})
export class BoothAssignmentComponent implements OnInit {
  booths: Booth[] = [];
  boothAreas: BoothArea[] = [];
  unassignedParticipants: UnassignedRegistration[] = [];

  // Filter state
  availableTags: string[] = [];
  selectedTag = '';
  private storageService = inject(StorageService);

  // Editor mode state
  isSpotEditorMode = false;
  isAreaEditorMode = false;
  isDrawingArea = false;

  newBoothNumber: number | null = null;
  newSpotType: 'regular' | 'foodTruck' = 'regular';
  draggedBooth: Booth | null = null;
  hoveredBoothId: string | null = null;
  isDraggingSpot = false;
  isDraggingVendor = false;

  // Drawing state
  currentDrawingPolygon: { xPercentage: number, yPercentage: number }[] = [];
  currentMousePos: { x: number, y: number } | null = null;

  loading = true;
  error = '';

  // Zoom state
  zoomLevel = 100;

  // Pan state
  isPanning = false;
  startX = 0;
  startY = 0;
  scrollLeft = 0;
  scrollTop = 0;

  constructor(private boothService: BoothService) { }

  zoomIn() {
    this.zoomLevel = Math.min(400, this.zoomLevel + 20);
  }

  zoomOut() {
    this.zoomLevel = Math.max(100, this.zoomLevel - 20);
  }

  resetZoom() {
    this.zoomLevel = 100;
  }

  onMapScroll(event: WheelEvent) {
    // Only zoom if they are scrolling over the map container specifically
    event.preventDefault(); // Prevent page scrolling
    if (event.deltaY < 0) {
      this.zoomIn();
    } else {
      this.zoomOut();
    }
  }

  // Pan handlers
  onPanStart(event: MouseEvent) {
    // Only pan if we aren't clicking a button or drawing
    if (this.isDrawingArea || this.isSpotEditorMode || this.isDraggingSpot) return;

    // Only pan if zoom > 100
    if (this.zoomLevel <= 100) return;

    this.isPanning = true;
    this.startX = event.pageX;
    this.startY = event.pageY;

    // Get current scroll position of the viewport
    const viewport = event.currentTarget as HTMLElement;
    this.scrollLeft = viewport.scrollLeft;
    this.scrollTop = viewport.scrollTop;
  }

  onPanMove(event: MouseEvent) {
    if (!this.isPanning) return;

    event.preventDefault(); // Prevent text selection
    const x = event.pageX - this.startX;
    const y = event.pageY - this.startY;

    const viewport = event.currentTarget as HTMLElement;
    viewport.scrollLeft = this.scrollLeft - x;
    viewport.scrollTop = this.scrollTop - y;
  }

  onPanEnd() {
    this.isPanning = false;
  }

  ngOnInit() {
    this.loadData();
    this.loadTags();
  }

  loadTags() {
    this.storageService.getTags().subscribe(tags => {
      this.availableTags = tags;
    });
  }

  loadData() {
    this.loading = true;
    this.boothService.getAreas().subscribe({
      next: (areas) => {
        console.log("Loaded Areas from API:", areas);
        this.boothAreas = areas;
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
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load map areas.';
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

  isBoothFilteredOut(booth: Booth): boolean {
    if (!this.selectedTag) return false;
    
    // If it has no vendor, it's filtered out because we're looking for vendors with this tag
    if (!booth.registrationId) return true;

    // If they have no tags array or it doesn't include the selected tag, filter out
    const tags = booth.registrationId.tags || [];
    return !tags.includes(this.selectedTag);
  }

  toggleSpotEditorMode() {
    this.isSpotEditorMode = !this.isSpotEditorMode;
    this.isAreaEditorMode = false;
    if (!this.isSpotEditorMode) {
      this.cancelDrawing();
    }
  }

  toggleAreaEditorMode() {
    this.isAreaEditorMode = !this.isAreaEditorMode;
    this.isSpotEditorMode = false;
    if (!this.isAreaEditorMode) {
      this.cancelDrawing();
    }
  }

  onSpotDragStarted() {
    this.isDraggingSpot = true;
  }

  getBoothDisplayLabel(booth: Booth): string {
    return booth.boothNumber.toString();
  }

  // ==== AREA DRAWING LOGIC ====

  startDrawing() {
    this.isDrawingArea = true;
    this.currentDrawingPolygon = [];
    this.currentMousePos = null;
  }

  cancelDrawing() {
    this.isDrawingArea = false;
    this.currentDrawingPolygon = [];
    this.currentMousePos = null;
  }

  completeDrawing(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }

    if (this.currentDrawingPolygon.length < 3) {
      alert("An area must have at least 3 points.");
      return;
    }

    const name = prompt("Enter a name or letter for this Area (e.g., 'A', 'Food'):");
    if (!name || name.trim() === '') {
      return; // Cancelled
    }

    this.boothService.createArea(name.trim(), this.currentDrawingPolygon).subscribe({
      next: (area) => {
        this.boothAreas.push(area);
        this.cancelDrawing();
      },
      error: (err) => {
        console.error(err);
        alert('Failed to save area: ' + (err.error?.error || err.message));
      }
    });
  }

  getPolygonPoints(polygon: { xPercentage: number, yPercentage: number }[]): string {
    if (!polygon || !Array.isArray(polygon)) return '';
    return polygon.map(p => {
      // Handle potential string parsing if data comes back formatted oddly 
      const x = typeof p.xPercentage === 'string' ? parseFloat(p.xPercentage) : p.xPercentage;
      const y = typeof p.yPercentage === 'string' ? parseFloat(p.yPercentage) : p.yPercentage;
      return `${x},${y}`;
    }).join(' ');
  }

  getDrawingPolygonPoints(): string {
    return this.getPolygonPoints(this.currentDrawingPolygon);
  }

  getCentroid(polygon: { xPercentage: number, yPercentage: number }[]) {
    if (!polygon || polygon.length === 0) return { x: 0, y: 0 };
    let x = 0, y = 0;
    polygon.forEach(p => {
      x += p.xPercentage;
      y += p.yPercentage;
    });
    return { x: x / polygon.length, y: y / polygon.length };
  }

  onMapMouseMove(event: MouseEvent) {
    if (!this.isAreaEditorMode || !this.isDrawingArea) return;

    const mapArea = document.querySelector('.map-container') as HTMLElement;
    if (!mapArea) return;

    const rect = mapArea.getBoundingClientRect();
    this.currentMousePos = {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100
    };
  }

  onAreaClick(area: BoothArea, event: MouseEvent) {
    if (this.isAreaEditorMode && !this.isDrawingArea) {
      event.stopPropagation();
      if (confirm(`Delete Area '${area.name}'? Existing spots will remain but lose area grouping.`)) {
        this.boothService.deleteArea(area._id).subscribe({
          next: () => {
            this.boothAreas = this.boothAreas.filter(a => a._id !== area._id);
            // Reload spots since some spots might have lost their areaId
            this.loadData();
          },
          error: (err) => {
            console.error(err);
            alert('Failed to delete area.');
          }
        });
      }
    }
  }

  // ==== COLLISION / POINT IN POLYGON ====

  // Ray-Casting algorithm to check if a point is inside a polygon
  isPointInPolygon(point: { x: number, y: number }, polygon: { xPercentage: number, yPercentage: number }[]) {
    let x = point.x, y = point.y;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      let xi = polygon[i].xPercentage, yi = polygon[i].yPercentage;
      let xj = polygon[j].xPercentage, yj = polygon[j].yPercentage;

      // Ensure denominator is never strictly zero (prevent divide by zero edge cases)
      let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 0.000001) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // Finds which area (if any) a given X,Y percentage belongs to
  findAreaForPoint(xPercentage: number, yPercentage: number): BoothArea | undefined {
    return this.boothAreas.find(area => this.isPointInPolygon({ x: xPercentage, y: yPercentage }, area.polygon));
  }

  // Map Click to create a spot or draw an area point
  onMapClick(event: MouseEvent) {
    if (!this.isSpotEditorMode && !this.isAreaEditorMode) return;

    // Reject click if we clicked an existing spot
    const target = event.target as HTMLElement;
    if (target.classList.contains('booth-spot') || target.closest('.booth-spot') || target.tagName === 'polygon') {
      // (If polygon clicked, we handled it in onAreaClick, or it's just the overlay)
    }

    const mapArea = document.querySelector('.map-container') as HTMLElement;
    if (!mapArea) return;

    const rect = mapArea.getBoundingClientRect();
    const xPercentage = ((event.clientX - rect.left) / rect.width) * 100;
    const yPercentage = ((event.clientY - rect.top) / rect.height) * 100;

    // Handle Area Drawing Mode
    if (this.isAreaEditorMode && this.isDrawingArea) {
      this.currentDrawingPolygon.push({ xPercentage, yPercentage });
      return;
    }

    // Handle Spot Creation Mode
    if (this.isSpotEditorMode) {
      // Check which area we clicked in
      let parentArea = this.findAreaForPoint(xPercentage, yPercentage);

      if (!parentArea) {
        alert("You must place a spot inside a defined Area zone. Use the Area Editor to create zones first.");
        return;
      }

      let bNum = this.newBoothNumber;
      if (bNum === null || bNum === undefined) {
        // Find highest number in this specific area
        const spotsInArea = this.booths.filter(b => b.areaId && b.areaId._id === parentArea!._id);
        const maxNum = spotsInArea.length > 0 ? Math.max(...spotsInArea.map(b => b.boothNumber)) : 0;
        bNum = maxNum + 1;
      }

      this.boothService.createBooth(bNum, this.newSpotType, parentArea._id, xPercentage, yPercentage).subscribe({
        next: (booth) => {
          // We might want to populate the area immediately locally so it renders "A1" instead of just "1" 
          // if the API didn't populate it. (API does populate areaId though)
          this.booths.push(booth);
          this.newBoothNumber = bNum! + 1;
        },
        error: (err) => {
          console.error(err);
          alert('Failed to create spot: ' + (err.error?.error || err.message));
        }
      });
    }
  }

  // Spot dragging in editor mode
  onSpotDragEnd(event: any, booth: Booth) {
    if (!this.isSpotEditorMode) return;

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

    // Verify it's still inside an area
    const newArea = this.findAreaForPoint(newXPercentage, newYPercentage);
    if (!newArea) {
      alert("Spots must remain inside a defined Area zone.");
      event.source.reset();
      return;
    }

    // If area changed, we shouldn't change the booth number without asking, but we should update area
    // Actually our backend route for updating handles X/Y, but what about areaId? 
    // Usually spots don't change areas, but if they do, we'd need to update it.
    // For now the backend only expects x/y percentage on update. We'll leave area fixed unless backend updated.

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
    console.log('--- dropVendor triggered ---');
    console.log('Event item data:', event.item.data);
    console.log('Previous container ID:', event.previousContainer.id);
    console.log('Target container ID:', event.container.id);

    // If dropped in the same container, handle list reordering if needed (optional)
    if (event.previousContainer === event.container && event.container.id === 'unassignedList') {
      console.log('Dropped inside same container (unassignedList). Reordering.');
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    // We can't drag FROM a spot TO another spot easily yet, so let's stick to Unassigned -> Spot
    if (event.previousContainer.id === 'unassignedList') {
      console.log('Dragging from Unassigned List to...', event.container.id);
      
      const participant = event.item.data || event.previousContainer.data[event.previousIndex];
      const boothIdMap = event.container.id.replace('spot-', '');

      const booth = this.booths.find(b => b._id === boothIdMap);
      console.log('Resolved booth:', booth);
      
      if (event.container.id.startsWith('spot-')) {
        if (booth && !booth.registrationId) {
          console.log(`Assigning registration ${participant._id} to booth ${booth._id}`);
          this.boothService.assignRegistration(booth._id, participant._id).subscribe({
            next: (updatedBooth) => {
              console.log('Successfully assigned:', updatedBooth);
              const idx = this.booths.findIndex(b => b._id === updatedBooth._id);
              if (idx > -1) {
                this.booths[idx] = updatedBooth;
              }
              this.loadUnassigned(); // refresh unassigned list to properly reflect state 
            },
            error: (err) => {
              console.error('Assignment failed:', err);
              alert('Assignment failed: ' + (err.error?.error || err.message));
            }
          });
        } else {
          console.warn('Booth not found or already has a registrationId. Booth:', booth);
        }
      } else {
        console.warn('Target container ID does not start with "spot-". Target ID:', event.container.id);
      }
    } else {
      console.warn('Dropped from container other than unassignedList. Previous:', event.previousContainer.id);
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
