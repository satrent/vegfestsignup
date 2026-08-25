import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../services/storage.service';

@Component({
    selector: 'app-food-vendor-report',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    templateUrl: './food-vendor-report.component.html',
    styleUrls: ['./food-vendor-report.component.scss']
})
export class FoodVendorReportComponent implements OnInit {
    private storageService = inject(StorageService);

    loading = true;
    error = '';
    reportData: any[] = [];
    today = new Date();

    filterAlphaGroup: '' | 'A-J' | 'K-S' | 'T-Z' = '';
    filterStatus = '';
    filterType: '' | 'food' | 'thc' = '';
    onlyFlagged = false;
    sortAlpha = false;
    includeTest = false;
    includeInactive = false;

    // Anything other than an explicit "100% Vegan" is worth a look: "Mixed" is a
    // policy violation, and a blank means they never answered the question.
    isVeganFlagged(row: any): boolean {
        return row.foodOfferings !== '100% Vegan';
    }

    // THC vendors owe no food permit, so an unapproved one isn't a problem
    // for them -- only the on-site food-prep categories get flagged.
    isPermitFlagged(row: any): boolean {
        return row.needsFoodPermit && row.permitStatus !== 'Approved';
    }

    vendorTypeLabel(row: any): string {
        return row.needsFoodPermit ? 'Food' : 'THC';
    }

    isFlagged(row: any): boolean {
        return this.isVeganFlagged(row) || this.isPermitFlagged(row);
    }

    veganLabel(row: any): string {
        if (row.foodOfferings === '100% Vegan') return '100% Vegan';
        if (row.foodOfferings === 'Mixed') return 'Not all vegan';
        return 'Not answered';
    }

    veganBadgeClass(row: any): string {
        if (row.foodOfferings === '100% Vegan') return 'badge-ok';
        if (row.foodOfferings === 'Mixed') return 'badge-danger';
        return 'badge-neutral';
    }

    permitBadgeClass(row: any): string {
        switch (row.permitStatus) {
            case 'Approved': return 'badge-ok';
            case 'Pending':
            case 'Requested':
            case 'Request Pending': return 'badge-warn';
            case 'Rejected':
            case 'Missing': return 'badge-danger';
            case 'Not required': return 'badge-neutral';
            default: return 'badge-neutral';
        }
    }

    get filteredData(): any[] {
        const filtered = this.reportData.filter(row => {
            if (!this.includeTest && row.isTest) return false;
            if (!this.includeInactive && (row.status === 'Declined' || row.status === 'Cancelled')) return false;
            if (this.filterStatus && row.status !== this.filterStatus) return false;
            if (this.filterType === 'food' && !row.needsFoodPermit) return false;
            if (this.filterType === 'thc' && row.needsFoodPermit) return false;
            if (this.onlyFlagged && !this.isFlagged(row)) return false;
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
                (a.organizationName || '').localeCompare(b.organizationName || '', undefined, { sensitivity: 'base' })
            );
        }
        return filtered;
    }

    get notFullyVeganCount(): number {
        return this.filteredData.filter(r => r.foodOfferings === 'Mixed').length;
    }

    get unansweredVeganCount(): number {
        return this.filteredData.filter(r => !r.foodOfferings).length;
    }

    get missingPermitCount(): number {
        return this.filteredData.filter(r => this.isPermitFlagged(r)).length;
    }

    get hasActiveFilters(): boolean {
        return !!this.filterAlphaGroup || !!this.filterStatus || !!this.filterType || this.onlyFlagged
            || this.sortAlpha || this.includeTest || this.includeInactive;
    }

    clearFilters(): void {
        this.filterAlphaGroup = '';
        this.filterStatus = '';
        this.filterType = '';
        this.onlyFlagged = false;
        this.sortAlpha = false;
        this.includeTest = false;
        this.includeInactive = false;
    }

    ngOnInit(): void {
        this.loadReport();
    }

    loadReport(): void {
        this.loading = true;
        this.error = '';

        this.storageService.getFoodVendorReport().subscribe({
            next: (data) => {
                this.reportData = data;
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading food vendor report:', err);
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

        let csvContent = 'Organization Name,First Name,Last Name,Email,Phone,Status,Vendor Type,Category,Menu 100% Vegan,Cooking On Site,Food Truck,Permit Option,Permit Status\n';

        this.filteredData.forEach(row => {
            csvContent += [
                this.escapeCsv(row.organizationName),
                this.escapeCsv(row.firstName),
                this.escapeCsv(row.lastName),
                this.escapeCsv(row.email),
                this.escapeCsv(row.phone),
                this.escapeCsv(row.status),
                this.escapeCsv(this.vendorTypeLabel(row)),
                this.escapeCsv(row.organizationCategory),
                this.escapeCsv(this.veganLabel(row)),
                row.cookingOnSite ? 'Yes' : 'No',
                row.isFoodTruck ? 'Yes' : 'No',
                this.escapeCsv(this.permitOptionLabel(row)),
                this.escapeCsv(row.permitStatus)
            ].join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `vegfest_food_vendor_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    permitOptionLabel(row: any): string {
        if (!row.needsFoodPermit) return 'N/A';
        if (row.foodPermitOption === 'upload_now') return 'Uploading their own';
        if (row.foodPermitOption === 'request') return 'Requested via us';
        return 'Not chosen';
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
