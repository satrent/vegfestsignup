import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../services/storage.service';

@Component({
    selector: 'app-website-export-report',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    templateUrl: './website-export-report.component.html',
    styleUrls: ['./website-export-report.component.scss']
})
export class WebsiteExportReportComponent implements OnInit {
    private storageService = inject(StorageService);

    loading = true;
    marking = false;
    error = '';
    reportData: any[] = [];
    today = new Date();

    filterAlphaGroup: '' | 'A-J' | 'K-S' | 'T-Z' = '';
    sortAlpha = false;
    includeTest = false;

    get filteredData(): any[] {
        const filtered = this.reportData.filter(row => {
            if (!this.includeTest && row.isTest) return false;
            if (!this.filterAlphaGroup) return true;
            const firstChar = (row.organizationName || '').trim().charAt(0).toUpperCase();
            const isLetter = /[A-Z]/.test(firstChar);
            if (this.filterAlphaGroup === 'A-J') return isLetter && firstChar >= 'A' && firstChar <= 'J';
            if (this.filterAlphaGroup === 'K-S') return isLetter && firstChar >= 'K' && firstChar <= 'S';
            if (this.filterAlphaGroup === 'T-Z') return !isLetter || (firstChar >= 'T' && firstChar <= 'Z');
            return true;
        });

        if (this.sortAlpha) {
            return [...filtered].sort((a, b) =>
                a.organizationName.localeCompare(b.organizationName, undefined, { sensitivity: 'base' })
            );
        }
        return filtered;
    }

    get hasActiveFilters(): boolean {
        return !!this.filterAlphaGroup || this.sortAlpha || this.includeTest;
    }

    clearFilters(): void {
        this.filterAlphaGroup = '';
        this.sortAlpha = false;
        this.includeTest = false;
    }

    ngOnInit(): void {
        this.loadReport();
    }

    loadReport(): void {
        this.loading = true;
        this.error = '';

        this.storageService.getWebsiteExportReport().subscribe({
            next: (data) => {
                this.reportData = data;
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading website export report:', err);
                this.error = 'Failed to load report data.';
                this.loading = false;
            }
        });
    }

    printReport(): void {
        window.print();
    }

    // After exporting and importing into Wix, flip everyone currently shown to
    // "Added to Website" in one click so they drop off this list next time.
    markAllAsAdded(): void {
        const ids = this.filteredData.map(row => row._id).filter(Boolean);
        if (ids.length === 0) return;

        const count = ids.length;
        if (!confirm(
            `Mark ${count} participant${count === 1 ? '' : 's'} as Added to Website? ` +
            `They'll drop off this export list.`
        )) return;

        this.marking = true;
        this.storageService.bulkUpdateWebsiteStatus(ids, 'Added').subscribe({
            next: () => {
                this.marking = false;
                this.loadReport();
            },
            error: (err) => {
                this.marking = false;
                console.error('Error marking participants as added:', err);
                alert('Failed to mark participants as added to website.');
            }
        });
    }

    exportCsv(): void {
        if (this.filteredData.length === 0) return;

        let csvContent = 'Organization Name,Contact Name,Type,Email,Phone,Website,Product Description,Facebook,Instagram\n';

        this.filteredData.forEach(row => {
            const contactName = `${row.firstName} ${row.lastName}`;
            csvContent += `${this.escapeCsv(row.organizationName)},${this.escapeCsv(contactName)},${this.escapeCsv(row.type)},${this.escapeCsv(row.email)},${this.escapeCsv(row.phone)},${this.escapeCsv(row.website)},${this.escapeCsv(row.productsDescription)},${this.escapeCsv(row.facebook)},${this.escapeCsv(row.instagram)}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `vegfest_website_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    private escapeCsv(field: string): string {
        if (!field) return '';
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
    }
}
