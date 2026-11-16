/**
 * PostCSS configuration for Tailwind CSS v4.
 *
 * Plugin:
 * - @tailwindcss/postcss - Official Tailwind v4 PostCSS plugin
 *
 * Tailwind v4 requires the @tailwindcss/postcss plugin for CSS-first
 * configuration. This plugin processes @import "tailwindcss" directives
 * and @theme blocks in CSS files.
 *
 * @type {import('postcss-load-config').Config}
 */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
