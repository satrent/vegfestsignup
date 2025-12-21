import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StorageService } from '../../../services/storage.service';

@Component({
  selector: 'app-file-upload',
  imports: [CommonModule],
  template: `
    <div class="file-upload-container">
      <div
        class="drop-zone"
        [class.dragging]="isDragging"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        (click)="fileInput.click()"
        >
        <input #fileInput type="file" (change)="onFileSelected($event)" style="display: none">
    
        @if (!currentFile && !isUploading) {
          <div>
            <p>Drag & Drop your file here or <span>click to upload</span></p>
            <small>Supported formats: {{ supportedFormats }} (Max 20MB)</small>
          </div>
        }
    
        @if (isUploading) {
          <div>
            <p>Uploading {{ selectedFile?.name }}...</p>
            <div class="spinner"></div>
          </div>
        }
    
        @if (currentFile) {
          <div class="file-info">
            <div class="status-badge" [ngClass]="currentFile.status.toLowerCase()">
              {{ currentFile.status }}
            </div>
            <p class="filename">{{ currentFile.name }}</p>
            <a [href]="currentFile.location" target="_blank" (click)="$event.stopPropagation()">View Document</a>
            @if (!disabled) {
              <button class="change-btn" (click)="fileInput.click(); $event.stopPropagation()">Change</button>
            }
          </div>
        }
      </div>
      @if (errorMessage) {
        <div class="error-message">
          {{ errorMessage }}
        </div>
      }
    </div>
    `,
  styles: [`
    .file-upload-container {
      margin-bottom: 1rem;
    }
    .drop-zone {
      border: 2px dashed #ccc;
      border-radius: 8px;
      padding: 1.5rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      background: #f9f9f9;
    }
    .drop-zone:hover, .drop-zone.dragging {
      border-color: #007bff;
      background: #eef7ff;
    }
    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #007bff;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      animation: spin 1s linear infinite;
      margin: 0.5rem auto;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 0.5rem;
    }
    .status-badge.pending { background: #fff3cd; color: #856404; }
    .status-badge.approved { background: #d4edda; color: #155724; }
    .status-badge.rejected { background: #f8d7da; color: #721c24; }
    .change-btn {
      margin-left: 1rem;
      background: none;
      border: 1px solid #ccc;
      padding: 0.2rem 0.5rem;
      cursor: pointer;
      font-size: 0.8rem;
      border-radius: 4px;
    }
    .error-message {
      color: #dc3545;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
    span { color: #007bff; text-decoration: underline; }
  `]
})
export class FileUploadComponent {
  @Input() documentType!: string;
  @Input() currentFile?: { name: string; location: string; status: string };
  @Input() disabled = false;
  @Output() uploadComplete = new EventEmitter<any>();

  isDragging = false;
  isUploading = false;
  selectedFile: File | null = null;
  errorMessage = '';

  private storageService = inject(StorageService);

  get supportedFormats(): string {
    const imageTypes = ['product-photo', 'Logo', 'logo', 'Coupon Logo'];
    if (imageTypes.includes(this.documentType)) {
      return 'JPG, PNG';
    }
    return 'PDF, JPG, PNG';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (!this.disabled) this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    if (this.disabled) return;

    if (event.dataTransfer?.files.length) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: any) {
    if (event.target.files.length) {
      this.handleFile(event.target.files[0]);
    }
  }

  handleFile(file: File) {
    // Size validation (20MB)
    if (file.size > 20 * 1024 * 1024) {
      this.errorMessage = 'File is too large (Max 20MB)';
      return;
    }

    // Type validation
    const imageTypes = ['product-photo', 'Logo', 'logo', 'Coupon Logo'];
    // Note: 'logo' included for safety, though we should standardize on 'Logo'

    const isImage = file.type === 'image/jpeg' || file.type === 'image/png';
    const isPdf = file.type === 'application/pdf';

    if (imageTypes.includes(this.documentType)) {
      if (!isImage) {
        this.errorMessage = 'Invalid file type. Only JPG and PNG are allowed.';
        return;
      }
    } else {
      if (!isImage && !isPdf) {
        this.errorMessage = 'Invalid file type. Only PDF, JPG, and PNG are allowed.';
        return;
      }
    }

    this.selectedFile = file;
    this.uploadFile(file);
  }

  uploadFile(file: File) {
    this.isUploading = true;
    this.errorMessage = '';

    this.storageService.uploadDocument(file, this.documentType).subscribe({
      next: (res) => {
        this.isUploading = false;
        this.currentFile = {
          name: file.name,
          location: res.document.location,
          status: res.document.status
        };
        this.uploadComplete.emit(res);
      },
      error: (err) => {
        this.isUploading = false;
        this.errorMessage = 'Upload failed. Please try again.';
        console.error(err);
      }
    });
  }
}
