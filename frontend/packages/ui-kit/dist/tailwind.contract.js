/**
 * @wati/ui-kit — Tailwind Token Contract
 *
 * Every app consuming @wati/ui-kit MUST define these semantic tokens
 * in its tailwind.config.js to ensure components render correctly.
 *
 * Usage in tailwind.config.js:
 *
 *   module.exports = {
 *     theme: {
 *       extend: {
 *         colors: {
 *           // --- Required @wati/ui-kit tokens ---
 *           'ui-primary':       '<your-primary>',       // Main brand color (buttons, accents)
 *           'ui-primary-hover': '<your-primary-hover>',  // Hover state for primary
 *           'ui-surface':       '<your-surface>',        // Background surfaces
 *           'ui-foreground':    '<your-foreground>',     // Primary text color
 *           'ui-muted':         '<your-muted>',          // Secondary/muted text
 *           'ui-border':        '<your-border>',         // Default border color
 *           'ui-accent':        '<your-accent>',         // Focus rings, highlights
 *           'ui-accent-hover':  '<your-accent-hover>',   // Hover state for accent
 *         },
 *       },
 *     },
 *   };
 *
 * Additionally, define these CSS custom properties in your global CSS
 * (index.css or equivalent) for gradient support:
 *
 *   :root {
 *     --ui-gradient-from: <start-color>;
 *     --ui-gradient-to:   <end-color>;
 *   }
 *
 * Example for Wati:
 *   colors: {
 *     'ui-primary':       '#82A082',  // brand-sage
 *     'ui-primary-hover': '#40916C',  // brand-teal
 *     'ui-surface':       '#FDFCF8',  // brand-cream
 *     'ui-foreground':    '#1B4332',  // brand-forest
 *     'ui-muted':         '#57635E',  // brand-text-muted
 *     'ui-border':        'rgba(130, 160, 130, 0.2)', // brand-sage/20
 *     'ui-accent':        '#74C69D',  // brand-mint
 *     'ui-accent-hover':  '#40916C',  // brand-teal
 *   }
 *   --ui-gradient-from: var(--brand-sage);
 *   --ui-gradient-to:   var(--brand-teal);
 */
export const UI_KIT_REQUIRED_TOKENS = [
    'ui-primary',
    'ui-primary-hover',
    'ui-surface',
    'ui-foreground',
    'ui-muted',
    'ui-border',
    'ui-accent',
    'ui-accent-hover',
];
export const UI_KIT_REQUIRED_CSS_VARS = [
    '--ui-gradient-from',
    '--ui-gradient-to',
];
//# sourceMappingURL=tailwind.contract.js.map