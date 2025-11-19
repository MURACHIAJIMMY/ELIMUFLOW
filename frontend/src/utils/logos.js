// Centralized helper for accessing school logos

/**
 * Safely get the school logo URL from schoolInfo object.
 * @param {Object} schoolInfo - The school object returned from backend.
 * @param {string|null} fallback - Optional fallback logo URL.
 * @returns {string|null} - The logo URL or fallback if not available.
 */
export function getSchoolLogo(schoolInfo, fallback = null) {
  return schoolInfo?.logo?.[0]?.url || fallback;
}

/**
 * Get the Cloudinary public_id for the school logo.
 * Useful if you need to delete or replace the logo.
 * @param {Object} schoolInfo
 * @returns {string|null}
 */
export function getSchoolLogoId(schoolInfo) {
  return schoolInfo?.logo?.[0]?.public_id || null;
}
