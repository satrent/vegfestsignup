// Server-side mirror of the UI's required-docs / docs-complete logic
// (ui/src/app/utils/required-docs.ts + the admin dashboard's docsComplete()).
// Kept here so the API can evaluate "docs complete" at trigger time — e.g. when
// deciding whether to auto-generate the "Add exhibitor to website" to-do.

// The two org categories that require a State of Minnesota food permit. Exact-
// match labels straight from the signup form (mirrors email.service.ts), not a
// fuzzy contains() check, so we only ask for a permit from on-site food prep.
const FOOD_PERMIT_CATEGORIES = [
  'On-site food prep & sales $600',
  'Food business with on-site food prep — not a restaurant or food truck $350',
];

// Document types that have no approval workflow — they're always created as
// 'Pending' and must never count toward (or against) docs-complete.
const NON_APPROVAL_TYPES = ['menu', 'product-photo', 'logo', 'coupon logo'];

interface DocLike {
  type?: string;
  status?: string;
  uploadedAt?: Date | string;
}

interface RegLike {
  organizationCategory?: string;
  documents?: DocLike[];
}

/**
 * Returns the document types a given exhibitor must provide.
 * ST-19 and COI are required of everyone; a Food Permit is added for on-site
 * food-prep vendors.
 */
export function requiredDocTypes(reg: RegLike): string[] {
  const types = ['ST-19', 'COI'];
  if (FOOD_PERMIT_CATEGORIES.includes(reg.organizationCategory || '')) {
    types.push('Food Permit');
  }
  return types;
}

// Latest status per document type, ignoring types with no approval workflow.
// Docs are sorted by uploadedAt so re-uploads supersede older versions.
function latestDocStatusByType(reg: RegLike): Map<string, string> {
  const latestByType = new Map<string, string>();
  const docs = [...(reg.documents || [])].sort(
    (a, b) => new Date(a.uploadedAt || 0).getTime() - new Date(b.uploadedAt || 0).getTime()
  );
  for (const doc of docs) {
    if (!doc.type || NON_APPROVAL_TYPES.includes(doc.type.toLowerCase())) continue;
    latestByType.set(doc.type, doc.status || '');
  }
  return latestByType;
}

/**
 * An exhibitor is "docs complete" when every required document is present and
 * its latest version is Approved. Missing or still-Pending/Rejected required
 * docs leave it incomplete.
 */
export function docsComplete(reg: RegLike): boolean {
  const latest = latestDocStatusByType(reg);
  return requiredDocTypes(reg).every(type => latest.get(type) === 'Approved');
}
