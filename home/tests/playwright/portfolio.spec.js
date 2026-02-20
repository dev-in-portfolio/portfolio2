const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'http://localhost:8080';

const PAGES = [
  '/',
  '/about/',
  '/case-studies/',
  '/readme/',
  '/help/',
  '/404.html',
  '/health/',
  '/apps/coverage-compass/',
  '/apps/ubr/',
  '/apps/alibi/',
  '/apps/agents/',
];

test.describe('Portfolio smoke', () => {
  for (const path of PAGES) {
    test(`loads ${path} without console errors`, async ({ page }) => {
      const errors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      const res = await page.goto(BASE + path, { waitUntil: 'networkidle' });
      expect(res && res.ok()).toBeTruthy();

      // Basic sanity: top nav exists on most pages
      const navCount = await page.locator('nav').count();
      expect(navCount).toBeGreaterThan(0);

      // No console errors
      expect(errors, errors.join('\n')).toEqual([]);
    });
  }
});
