import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StorageService } from '../../services/storage.service';

@Component({
    selector: 'app-electricity-report',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './electricity-report.component.html',
    styleUrls: ['./electricity-report.component.scss']
})
export class ElectricityReportComponent implements OnInit {
    private storageService = inject(StorageService);

    loading = true;
    error = '';
    reportData: any[] = [];
    today = new Date();

    ngOnInit(): void {
        this.loadReport();
    }

    loadReport(): void {
        this.loading = true;
        this.error = '';

        this.storageService.getElectricityReport().subscribe({
            next: (data) => {
                this.reportData = data;
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading electricity report:', err);
                this.error = 'Failed to load report data.';
                this.loading = false;
            }
        });
    }

    printReport(): void {
        window.print();
    }
}
