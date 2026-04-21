import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../services/storage.service';

@Component({
    selector: 'app-zero-waste-report',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    templateUrl: './zero-waste-report.component.html',
    styleUrls: ['./zero-waste-report.component.scss']
})
export class ZeroWasteReportComponent implements OnInit {
    private storageService = inject(StorageService);

    loading = true;
    error = '';
    reportData: any[] = [];
    today = new Date();

    filterAlphaGroup: '' | 'A-J' | 'K-S' | 'T-Z' = '';
    sortAlpha = false;
    includeTest = false;

    get filteredData(): any[] {
        const filtered = this.reportData.filter(row => {
            if (!this.includeTest && row.isTest) return false;

            let alphaGroupMatch = true;
            if (this.filterAlphaGroup) {
                const firstChar = (row.organizationName || '').trim().charAt(0).toUpperCase();
                const isLetter = /[A-Z]/.test(firstChar);
                if (this.filterAlphaGroup === 'A-J') {
                    alphaGroupMatch = isLetter && firstChar >= 'A' && firstChar <= 'J';
                } else if (this.filterAlphaGroup === 'K-S') {
                    alphaGroupMatch = isLetter && firstChar >= 'K' && firstChar <= 'S';
                } else if (this.filterAlphaGroup === 'T-Z') {
                    alphaGroupMatch = !isLetter || (firstChar >= 'T' && firstChar <= 'Z');
                }
            }

            return alphaGroupMatch;
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

    isFoodVendor(row: any): boolean {
        return (row.organizationCategory || '').toLowerCase().includes('food');
    }

    ngOnInit(): void {
        this.loadReport();
    }

    loadReport(): void {
        this.loading = true;
        this.error = '';

        this.storageService.getZeroWasteReport().subscribe({
            next: (data) => {
                this.reportData = data;
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading zero waste report:', err);
                this.error = 'Failed to load report data.';
                this.loading = false;
            }
        });
    }

    printReport(): void {
        window.print();
    }

    exportCsv(): void {
        if (this.filteredData.length === 0) return;

        const headers = [
            'Organization Name', 'Contact Name', 'Email', 'Phone', 'Category',
            'Products Description', 'Materials Ack', 'Vegan Food Ack',
            'Drink Vessels', 'BPI Container Brand',
            'Compostable Serviceware Ack', 'Bottled Water Ack'
        ];

        let csvContent = headers.join(',') + '\n';

        this.filteredData.forEach(row => {
            const drinkVessels = (row.drinkVessels || []).join('; ');
            csvContent += [
                this.escapeCsv(row.organizationName),
                this.escapeCsv(`${row.firstName} ${row.lastName}`),
                this.escapeCsv(row.email),
                this.escapeCsv(row.phone),
                this.escapeCsv(row.organizationCategory),
                this.escapeCsv(row.productsDescription),
                row.materialsAck ? 'Yes' : 'No',
                row.veganFoodAck ? 'Yes' : 'No',
                this.escapeCsv(drinkVessels),
                this.escapeCsv(row.bpiContainerBrand),
                row.compostableServicewareAck ? 'Yes' : 'No',
                row.bottledWaterAck ? 'Yes' : 'No'
            ].join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `vegfest_zero_waste_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    private escapeCsv(field: any): string {
        if (field === null || field === undefined) return '';
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
    }
}
