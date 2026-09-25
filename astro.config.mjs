// @ts-check
import fs from 'node:fs';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// 개발 서버에서만 로컬 설정(astro.local.mjs)의 통합을 추가
const isDev = process.argv.includes('dev');
const localIntegrations = isDev && fs.existsSync('./astro.local.mjs') ? (await import('./astro.local.mjs')).default : [];

export default defineConfig({
  site: 'https://kkokkiyo.github.io',
  integrations: [mdx(), sitemap(), ...localIntegrations],
  vite: { plugins: [tailwindcss()] },
  devToolbar: { enabled: false },
});
