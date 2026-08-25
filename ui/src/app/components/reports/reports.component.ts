import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-reports',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './reports.component.html',
    styleUrls: ['./reports.component.scss']
})
export class ReportsComponent {
    reports = [
        {
            id: 'electricity',
            title: 'Electricity Requirements',
            description: 'View participants who have requested electrical hookups, including power needs and descriptions.',
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m11 7-3 5h4l-3 5"></path><path d="M21 12h-4l-3-5h-4l-3 5H3"></path></svg>`
        },
        {
            id: 'invoicing',
            title: 'Invoicing Report',
            description: 'List of all approved participants with their invoiced status, payment amounts, and QuickBooks link.',
        },
        {
            id: 'rental-equipment',
            title: 'Rental Equipment',
            description: 'View participants who have requested rental equipment like tables, chairs, tents, or weights.',
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10z"/><polygon points="2 10 22 10 18 2 6 2 2 10"/><line x1="12" y1="10" x2="12" y2="22"/><line x1="8" y1="10" x2="8" y2="22"/><line x1="16" y1="10" x2="16" y2="22"/></svg>`
        },
        {
            id: 'todos',
            title: 'Outstanding To-Dos',
            description: 'List of all participants with uncompleted to-do items.',
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`
        },
        {
            id: 'contact-info',
            title: 'Contact Info',
            description: 'Contact details for all participants including name, organization, status, email, phone, and social media accounts.',
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`
        },
        {
            id: 'website-export',
            title: 'Website Export',
            description: 'Approved participants who are paid in full and docs complete but not yet on the website. Export to import into the site, then mark them added in one click so they drop off the list.',
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`
        },
        {
            id: 'recognition-todos',
            title: 'Recognition To-Dos',
            description: 'Open recognition to-dos for approved exhibitors and sponsors, filterable by category. Check off items directly from the report.',
        },
        {
            id: 'exhibitor-images',
            title: 'Exhibitor Images',
            description: 'Bulk-download every uploaded exhibitor image as a ZIP, organized into a folder per organization so files stay tied to the vendor name.',
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`
        },
        {
            id: 'food-vendor',
            title: 'Food Vendor Report',
            description: 'On-site food and THC vendors with their answer to the 100% vegan menu question, plus food permit status for the vendors who need one. Flags anyone who said their menu will not be fully vegan or is still missing a permit.',
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h1a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>`
        },
        {
            id: 'zero-waste',
            title: 'Zero Waste Report',
            description: 'Exhibitor info and all zero waste compliance responses including drink vessel types, BPI container brands, and serviceware acknowledgments.',
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/><path d="M12 11v6"/><path d="M9 11l.5 6"/><path d="M15 11l-.5 6"/></svg>`
        }
    ];
}
