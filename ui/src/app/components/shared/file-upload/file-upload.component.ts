import { Component, Input, Output, EventEmitter, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StorageService } from '../../../services/storage.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-file-upload',
  imports: [CommonModule],
  template: `
    <div class="file-upload-container">
      <input #fileInput type="file" (change)="onFileSelected($event)" style="display: none">

      @if (!currentFile) {
        <div
          class="drop-zone"
          [class.dragging]="isDragging"
          (dragover)="onDragOver($event)"
          (dragenter)="onDragOver($event)"
          (dragleave)="onDragLeave($event)"
          (drop)="onDrop($event)"
          (click)="fileInput.click()"
          >
          @if (!isUploading) {
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
        </div>
      }

      @if (currentFile) {
        <div class="file-info-container">
          @if (isImageUrl(secureUrl || currentFile.location)) {
            <div class="image-preview">
              @if (!disabled) {
                <button type="button" class="remove-btn" (click)="removeFile($event)">&times;</button>
              }
              <img [src]="secureUrl || currentFile.location" alt="Preview">
            </div>
          } @else {
            @if (!disabled) {
              <button type="button" class="remove-btn" (click)="removeFile($event)">&times;</button>
            }
          }
          <div class="file-details">
            <div class="status-badge" [ngClass]="currentFile.status.toLowerCase()">
              {{ currentFile.status }}
            </div>
            <p class="filename">{{ currentFile.name }}</p>
            <div class="file-actions">
              <a [href]="secureUrl || currentFile.location" target="_blank" (click)="$event.stopPropagation()">View Document</a>
              @if (!disabled) {
                <button type="button" class="change-btn" (click)="fileInput.click(); $event.stopPropagation()">Change Document</button>
              }
            </div>
          </div>
        </div>
      }

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
      background: #718096;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      cursor: pointer;
      font-size: 0.875rem;
      border-radius: 4px;
      font-weight: 600;
      transition: background 0.2s;
    }
    .change-btn:hover {
        background: #4a5568;
    }
    .error-message {
      color: #dc3545;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
    span { color: #007bff; text-decoration: underline; }
    
    .file-info-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 1.5rem;
      flex-wrap: wrap;
      margin-top: 1rem;
      padding: 1rem;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .remove-btn {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #e53e3e;
      color: white;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      font-size: 1rem;
      line-height: 1;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    .remove-btn:hover {
        background: #c53030;
    }
    .image-preview {
      position: relative;
    }
    .image-preview img {
      width: 100px;
      height: 100px;
      object-fit: cover;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      display: block;
    }
    .file-details {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
    .file-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
  `]
})
export class FileUploadComponent implements OnInit, OnChanges {
  @Input() documentType!: string;
  @Input() currentFile?: { name: string; location: string; status: string; key?: string };
  @Input() disabled = false;
  @Output() uploadComplete = new EventEmitter<any>();
  @Output() fileRemoved = new EventEmitter<string>();

  secureUrl: string | null = null;

  isDragging = false;
  isUploading = false;
  selectedFile: File | null = null;
  errorMessage = '';

  private storageService = inject(StorageService);

  ngOnInit() {
    this.resolveSecureUrl();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['currentFile']) {
      this.resolveSecureUrl();
    }
  }

  resolveSecureUrl() {
    if (!this.currentFile) {
      this.secureUrl = null;
      return;
    }

    const locOrKey = this.currentFile.key || this.currentFile.location;
    if (!locOrKey) return;

    if (locOrKey.startsWith('http') && !locOrKey.includes('amazonaws.com')) {
      this.secureUrl = locOrKey;
      return;
    }

    let key = locOrKey;
    if (locOrKey.includes('amazonaws.com/')) {
      key = locOrKey.split('amazonaws.com/')[1];
    } else if (locOrKey.includes('/uploads/')) {
      key = locOrKey.split('/uploads/')[1];
    }

    this.storageService.getDocumentUrl(key).subscribe({
      next: (res) => {
        let finalUrl = res.url;
        if (finalUrl.startsWith('/')) {
          const baseUrl = environment.apiUrl.replace('/api', '');
          finalUrl = `${baseUrl}${finalUrl}`;
        }
        this.secureUrl = finalUrl;
      },
      error: () => this.secureUrl = null
    });
  }

  isImageUrl(url: string | null): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    // Some urls from the secure endpoint might not have the extension at the end 
    // but the backend limits file uploads. We rely on the stored document name.
    if (this.currentFile?.name) {
      const nameLower = this.currentFile.name.toLowerCase();
      return nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg') || nameLower.endsWith('.png');
    }
    return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png');
  }

  get supportedFormats(): string {
    const imageTypes = ['product-photo', 'Logo', 'logo', 'Coupon Logo'];
    if (imageTypes.includes(this.documentType)) {
      return 'JPG, PNG';
    }
    return 'PDF, JPG, PNG';
  }

  removeFile(event: Event) {
    event.stopPropagation();
    if (this.disabled) return;
    this.currentFile = undefined;
    this.secureUrl = null;
    this.fileRemoved.emit(this.documentType);
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
          status: res.document.status,
          key: res.document.key || res.document.location
        };
        this.resolveSecureUrl();
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
