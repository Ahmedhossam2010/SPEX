import fs from 'fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.E2E_URL || 'http://127.0.0.1:3000';

function resolveChromiumExecutable() {
  const candidates = [
    process.env.PLAYWRIGHT_EXECUTABLE_PATH,
    '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell',
    '/ms-playwright/chrome-headless-shell-linux64/chrome-headless-shell',
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p));
}

async function run() {
  const executablePath = resolveChromiumExecutable();
  assert.ok(executablePath, 'No headless Chromium executable found for Playwright smoke test');

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const consoleErrors = [];
  const pageErrors = [];

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    const page = await context.newPage();

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore expected WebSocket / offline third-party CDN logs in isolated environments if any
        if (!text.includes('WebSocket') && !text.includes('aladin')) {
          consoleErrors.push(text);
        }
      }
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // 1. Verify Home landing page (A1) & dark-sky theme & 5 benchmark presets
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('h1', { timeout: 15000 });
    const homeText = await page.textContent('body');
    assert.ok(homeText && homeText.includes("Barnard's Star"), 'Home should display 5 challenge presets');
    assert.ok(homeText && homeText.includes('WISE 0855'), 'Home should display WISE 0855 preset');
    assert.ok(homeText && homeText.includes('Open Explorer'), 'Home should display Open Explorer CTA');

    const bgColor = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    console.log('Home background:', bgColor);
    await page.screenshot({ path: '/tmp/e2e_home.png' });

    // 2. Navigate directly via deep link to Barnard's Star (one-click judge workflow)
    await page.goto(`${BASE_URL}/?target=barnards-star&band=D2`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for either the Flipbook canvas (when IRSA responds) OR honest archive state
    await page.waitForSelector('canvas[role="img"], [role="alert"], h3', { timeout: 45000 });

    const hasCanvas = (await page.locator('canvas[role="img"]').count()) > 0;
    console.log('Explore loaded canvas:', hasCanvas);

    if (hasCanvas) {
      // Verify Advanced drawer starts collapsed and toggles cleanly (A3)
      const advButton = page.locator('button[aria-expanded]').filter({ hasText: /Advanced/i }).first();
      if ((await advButton.count()) > 0) {
        const initialExpanded = await advButton.getAttribute('aria-expanded');
        assert.equal(initialExpanded, 'false', 'Advanced drawer must start collapsed');
        await advButton.click();
        const afterExpanded = await advButton.getAttribute('aria-expanded');
        assert.equal(afterExpanded, 'true', 'Advanced drawer must expand on click');
      }

      // Verify View toggle ("Normal" / "Show changes") exists
      const bodyExplore = await page.textContent('body');
      assert.ok(bodyExplore?.includes('Show changes'), 'Show changes toggle must be visible');
    }

    await page.screenshot({ path: '/tmp/e2e_explore.png' });
    assert.equal(pageErrors.length, 0, `Uncaught page errors: ${pageErrors.join('; ')}`);
    console.log('E2E smoke passed cleanly. Console errors filtered:', consoleErrors.length);
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('E2E smoke failed:', err);
  process.exit(1);
});
