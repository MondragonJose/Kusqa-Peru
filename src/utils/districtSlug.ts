/**
 * Client-side helper to convert a district display name to its canonical slug.
 *
 * Mirrors the server-side `kusqa_district_slugify(raw text)` SQL function so the
 * client can build deep-links to /app/distrito/$slug without an extra round trip.
 * Used by the feed/map/index surfaces to render district chips.
 *
 * If the user's input does not match a known district, the function still
 * returns a deterministic slug — the route loader will resolve "not found"
 * gracefully.
 */
export function districtSlugify(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining marks
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}
