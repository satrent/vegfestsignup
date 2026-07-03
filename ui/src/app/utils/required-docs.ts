// Single source of truth for which documents an exhibitor is required to
// provide. Used by both the signup Documents section (to gate what the
// applicant is asked to upload) and the admin dashboard "Docs Complete" badge
// (to decide when everything is in and approved). Keeping both on this helper
// guarantees the admin never flags a doc the applicant was never asked for.

// The two org categories that require a State of Minnesota food permit. These
// are exact-match labels straight from the signup form, not a fuzzy contains()
// check, so we only ask for a permit from the vendors who actually prep food.
const FOOD_PERMIT_CATEGORIES = [
  'On-site food prep & sales $600',
  'Food business with on-site food prep — not a restaurant or food truck $350',
];

/**
 * Returns the document types a given exhibitor must provide.
 * ST-19 and COI are required of everyone; a Food Permit is added for on-site
 * food-prep vendors.
 */
export function requiredDocTypes(
  reg: { organizationCategory?: string }
): string[] {
  const types = ['ST-19', 'COI'];
  if (FOOD_PERMIT_CATEGORIES.includes(reg.organizationCategory || '')) {
    types.push('Food Permit');
  }
  return types;
}
