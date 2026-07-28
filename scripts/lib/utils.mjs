/**
 * lib/utils.mjs — Shared helpers for build scripts.
 */

/**
 * Generate a URL-safe slug from a title string.
 */
export function slugify(title) {
  return title
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Format an ISO date string for display (Spanish / Argentina locale).
 * Parses YYYY-MM-DD directly from components — no timezone conversion.
 */
export function formatDate(iso) {
  // Validate strict YYYY-MM-DD format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    throw new Error(`Invalid date format: "${iso}" — expected YYYY-MM-DD`);
  }
  const [y, m, d] = iso.split("-").map(Number);
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  return `${d} de ${months[m - 1]} de ${y}`;
}

/**
 * Escape HTML special characters in a string.
 */
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Minimal template renderer.
 * Supports {{var}} substitution and {{#key}}...{{/key}} conditional blocks.
 * Variable values are HTML-escaped by default.
 */
export function renderTemplate(template, vars) {
  // Conditional blocks: {{#key}}...{{/key}}
  let result = template.replace(
    /\{\{#(\w+)}}([\s\S]*?)\{\{\/\1}}/g,
    (_, key, block) => {
      const val = vars[key];
      if (val === undefined || val === null || val === false || val === "") {
        return "";
      }
      if (typeof val === "object" && !Array.isArray(val)) {
        return renderTemplate(block, { ...vars, ...val });
      }
      return renderTemplate(block, vars);
    },
  );

  // Raw variable replacement: {{{var}}} — no escaping (for pre-rendered HTML)
  result = result.replace(/\{\{\{(\w+)}}}/g, (_, key) => {
    const val = vars[key];
    return val !== undefined && val !== null ? String(val) : "";
  });

  // Variable replacement with HTML escaping: {{var}}
  // GLOBAL_PLAYER is a post-build injection marker — pass through untouched
  result = result.replace(/\{\{GLOBAL_PLAYER}}/g, "{{GLOBAL_PLAYER}}");
  result = result.replace(/\{\{(\w+)}}/g, (_, key) => {
    if (key === "GLOBAL_PLAYER") return "{{GLOBAL_PLAYER}}";
    const val = vars[key];
    return val !== undefined && val !== null ? escapeHtml(String(val)) : "";
  });

  return result;
}

/**
 * Format a tag slug for display: "realismo-magico" → "Realismo mágico".
 */
export function formatTag(tag) {
  return tag
    .replace(/-/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}
