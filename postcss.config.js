const path = require('path');
const { createRequire } = require('module');

// Resolve from repo root even when Turbopack runs PostCSS from %LOCALAPPDATA%\adpa-next-cache (dev:cache junction).
const projectRequire = createRequire(path.join(__dirname, 'package.json'));

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: [projectRequire('tailwindcss'), projectRequire('autoprefixer')],
};

module.exports = config;
