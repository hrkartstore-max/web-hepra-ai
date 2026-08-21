export type PlatformId = "SHOPIFY" | "WORDPRESS" | "PHP";

export interface PlatformDefinition {
  id: PlatformId;
  label: string;
  description: string;
  capabilities: string[];
  fileTypes: string[];
  /** Rules injected into the AI prompt so generated output matches platform conventions. */
  generationRules: string;
  /** Required top-level folders/files a valid project of this platform should contain. */
  expectedStructure: string[];
}

export const PLATFORM_DEFINITIONS: Record<PlatformId, PlatformDefinition> = {
  SHOPIFY: {
    id: "SHOPIFY",
    label: "Shopify",
    description: "Generate a Shopify-compatible theme.",
    capabilities: ["Liquid", "JSON Templates", "Sections", "Snippets"],
    fileTypes: [".liquid", ".json", ".css", ".js"],
    generationRules: `Generate a Shopify Online Store 2.0 theme.
Required folders: layout/, templates/, sections/, snippets/, assets/, config/, locales/.
- layout/theme.liquid must be the main HTML shell with {{ content_for_header }} and {{ content_for_layout }}.
- templates/index.json must reference sections by id.
- Sections go in sections/*.liquid with {% schema %} JSON blocks.
- Use Liquid objects (product, collection, shop) correctly; do not invent nonexistent Liquid filters.
- config/settings_schema.json must be a valid JSON array of setting groups.
- All asset references must use the 'asset_url' filter.`,
    expectedStructure: [
      "layout/theme.liquid",
      "templates/index.json",
      "sections",
      "snippets",
      "assets",
      "config/settings_schema.json",
      "locales/en.default.json",
    ],
  },
  WORDPRESS: {
    id: "WORDPRESS",
    label: "WordPress",
    description: "Generate an installable WordPress theme.",
    capabilities: ["PHP", "CSS", "JavaScript", "Theme Configuration"],
    fileTypes: [".php", ".css", ".js"],
    generationRules: `Generate a classic installable WordPress theme (not a block/FSE theme).
Required files: style.css (with a valid WordPress theme header comment block: Theme Name, Author, Version, etc.),
index.php, header.php, footer.php, functions.php, front-page.php or home.php.
- functions.php must enqueue styles/scripts via wp_enqueue_style/wp_enqueue_script hooked to 'wp_enqueue_scripts'.
- Use get_header()/get_footer()/wp_head()/wp_footer() correctly.
- Escape all dynamic output with esc_html()/esc_attr()/esc_url().
- Do not hardcode absolute paths; use get_template_directory_uri().`,
    expectedStructure: [
      "style.css",
      "index.php",
      "header.php",
      "footer.php",
      "functions.php",
    ],
  },
  PHP: {
    id: "PHP",
    label: "PHP",
    description: "Generate a standalone PHP website.",
    capabilities: ["PHP", "HTML", "CSS", "JavaScript"],
    fileTypes: [".php", ".html", ".css", ".js"],
    generationRules: `Generate a standalone multi-page PHP + HTML + CSS + JS website (no framework required).
Required files: index.php, assets/css/style.css, assets/js/main.js.
- Use plain PHP (no Composer dependencies) so it runs on any shared-hosting LAMP stack.
- All forms must be submitted via POST and inputs must be validated/sanitized server-side.
- Keep pages linked together with relative hrefs.`,
    expectedStructure: ["index.php", "assets/css/style.css", "assets/js/main.js"],
  },
};

export function getPlatformDefinition(id: string): PlatformDefinition {
  const def = PLATFORM_DEFINITIONS[id as PlatformId];
  if (!def) throw new Error(`Unknown platform: ${id}`);
  return def;
}

export const PLATFORM_LIST = Object.values(PLATFORM_DEFINITIONS);
