import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../services/storage.service';

@Component({
    selector: 'app-image-download-report',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    templateUrl: './image-download-report.component.html',
    styleUrls: ['./image-download-report.component.scss']
})
export class ImageDownloadReportComponent implements OnInit {
    private storageService = inject(StorageService);

    loading = true;
    error = '';
    reportData: any[] = [];
    today = new Date();

    filterStatus: 'all' | 'In Progress' | 'Pending' | 'Approved' | 'Declined' | 'Cancelled' = 'all';
    sortAlpha = false;
    includeTest = false;

    downloading = false;
    downloadError = '';

    get filteredData(): any[] {
        const filtered = this.reportData.filter(row => {
            if (!this.includeTest && row.isTest) return false;
            return this.filterStatus === 'all' || row.status === this.filterStatus;
        });

        if (this.sortAlpha) {
            return [...filtered].sort((a, b) =>
                a.organizationName.localeCompare(b.organizationName, undefined, { sensitivity: 'base' })
            );
        }
        return filtered;
    }

    get totalImages(): number {
        return this.filteredData.reduce((sum, row) => sum + (row.imageCount || 0), 0);
    }

    get participantsWithImages(): number {
        return this.filteredData.filter(row => (row.imageCount || 0) > 0).length;
    }

    get hasActiveFilters(): boolean {
        return this.filterStatus !== 'all' || this.sortAlpha || this.includeTest;
    }

    clearFilters(): void {
        this.filterStatus = 'all';
        this.sortAlpha = false;
        this.includeTest = false;
    }

    ngOnInit(): void {
        this.loadReport();
    }

    loadReport(): void {
        this.loading = true;
        this.error = '';

        this.storageService.getImagesReport().subscribe({
            next: (data) => {
                this.reportData = data;
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading images report:', err);
                this.error = 'Failed to load report data.';
                this.loading = false;
            }
        });
    }

    downloadImages(): void {
        if (this.downloading || this.participantsWithImages === 0) return;

        this.downloading = true;
        this.downloadError = '';

        this.storageService.downloadExhibitorImages({
            status: this.filterStatus,
            includeTest: this.includeTest
        }).subscribe({
            next: (blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', `vegfest_exhibitor_images_${new Date().toISOString().split('T')[0]}.zip`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                this.downloading = false;
            },
            error: (err) => {
                console.error('Error downloading exhibitor images:', err);
                this.downloadError = 'Failed to download images. Please try again.';
                this.downloading = false;
            }
        });
    }

    getStatusClass(status: string): string {
        return (status || '').toLowerCase().replace(/\s+/g, '-');
    }
}
