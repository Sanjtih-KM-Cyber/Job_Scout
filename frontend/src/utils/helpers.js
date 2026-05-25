// frontend/src/utils/scrubInput.js
/**
 * Strip junk from recruiter-style job titles while preserving multi-word phrases.
 * e.g. "SDE - Immediate!!!, bangalore," → "SDE  bangalore"
 */
export function scrubInput(value) {
  return value
    .replace(/[,!@#$%^&*(){}\[\]|<>?;:'"]/g, '') // strip junk chars
    .replace(/\s{2,}/g, ' ')                       // collapse multiple spaces
    .replace(/^\s+/, '');                           // no leading spaces
}

// frontend/src/utils/buildLink.js
/**
 * Build a parametric deep-link to the job on the source portal.
 * Uses the real-time query approach — no static URLs that can 404.
 */
export function buildLink(portal, title, company, city) {
  const q = encodeURIComponent(`${title} ${company}`);
  const l = encodeURIComponent(city);

  switch (portal) {
    case 'linkedin':
      return `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${l}`;
    case 'indeed':
      return `https://in.indeed.com/jobs?q=${q}&l=${l}`;
    case 'naukri': {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const citySlug = city.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return `https://www.naukri.com/${slug}-jobs-in-${citySlug}?k=${q}`;
    }
    default:
      return '#';
  }
}
