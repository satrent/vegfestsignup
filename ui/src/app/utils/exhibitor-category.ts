// Maps an applicant to one of Laura's exhibitor categories.
//
// Source of truth confirmed with Laura (Basecamp, Jun 23):
//  - "Sponsor" reflects ONLY people who are `Both` (sponsoring AND exhibiting,
//    so they'll physically be on-site). Standalone sponsors are reviewed via
//    the Reports feature, not this filter, so they get no category here.
//  - THC vendors, small nonprofits (<=$50k / half table), and
//    bookseller/artist/student groups are each their own category.
//
// Used by both the admin dashboard filter and the booth-mapping tool card badge
// so the two stay consistent.

export type ExhibitorCategory =
  | 'Sponsor'
  | 'Food Vendor'
  | 'For Profit'
  | 'THC Vendor'
  | 'General Non Profit'
  | 'Small Nonprofit'
  | 'Animal Advocacy'
  | 'Bookseller / Artist / Student'
  | 'Unassigned';

// Ordered list for populating the filter dropdown.
export const EXHIBITOR_CATEGORIES: ExhibitorCategory[] = [
  'Sponsor',
  'Food Vendor',
  'For Profit',
  'THC Vendor',
  'General Non Profit',
  'Small Nonprofit',
  'Animal Advocacy',
  'Bookseller / Artist / Student',
  'Unassigned',
];

/**
 * Returns the exhibitor category for a registration, or `null` when the
 * applicant intentionally has no category (a standalone Sponsor — handled via
 * Reports, per Laura).
 */
export function exhibitorCategory(
  reg: { type?: string; organizationCategory?: string }
): ExhibitorCategory | null {
  // Sponsors who also exhibit ("Both") surface as Sponsor — the label wins
  // over their org type.
  if (reg.type === 'Both') return 'Sponsor';

  // Standalone sponsors don't exhibit; they're reviewed via Reports, not here.
  if (reg.type === 'Sponsor') return null;

  const cat = (reg.organizationCategory || '').trim().toLowerCase();
  // An exhibitor who hasn't picked an org type yet.
  if (!cat) return 'Unassigned';

  if (cat.includes('thc')) return 'THC Vendor';
  if (cat.includes('animal-focused')) return 'Animal Advocacy';
  if (cat.includes('bookseller')) return 'Bookseller / Artist / Student';
  if (cat.includes('on-site food prep')) return 'Food Vendor';
  if (cat.includes('for-profit')) return 'For Profit';
  // Check the small-nonprofit variant before the general nonprofit match,
  // since its label also contains "nonprofit".
  if (cat.includes('nonprofit with annual expenses') || cat.includes('half table')) {
    return 'Small Nonprofit';
  }
  if (cat.includes('nonprofit')) return 'General Non Profit';

  // Unrecognized org type string — treat as not-yet-categorized.
  return 'Unassigned';
}
