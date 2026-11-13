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

  const checks = [];
  const record = (name, passed, detail = '') => {
    checks.push({ name, passed, detail });
    console.log(`${passed ? '[PASS]' : '[FAIL]'} ${name}${detail ? ` — ${detail}` : ''}`);
  };

  const pageErrors = [];

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    const page = await context.newPage();
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // 1. Home loads
    try {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('h1', { timeout: 15000 });
      const homeText = (await page.textContent('body')) || '';
      const ok =
        homeText.includes("Barnard's Star") &&
        homeText.includes('WISE 0855') &&
        homeText.includes('Open Explorer');
      record('Home loads', ok, ok ? 'Hero + 5 challenge presets rendered' : 'Missing expected Home text');
    } catch (err) {
      record('Home loads', false, err.message);
    }

    // 2. SPEX visible
    try {
      const spexImg = page.locator('img[alt*="SPEX"]').first();
      await spexImg.waitFor({ state: 'visible', timeout: 10000 });
      const visible = await spexImg.isVisible();
      record('SPEX visible', visible, visible ? 'SPEX companion avatar visible' : 'SPEX avatar hidden');
    } catch (err) {
      record('SPEX visible', false, err.message);
    }

    // 3. Preset opens Explore with frames
    let hasCanvas = false;
    try {
      const presetBtn = page.locator('button', { hasText: "Barnard's Star" }).first();
      await presetBtn.click();
      await page.waitForSelector('canvas[aria-label*="SPHEREx"], [role="alert"]', { timeout: 45000 });
      hasCanvas = (await page.locator('canvas[aria-label*="SPHEREx"]').count()) > 0;
      record('Preset opens Explore with frames', hasCanvas, hasCanvas ? 'Cutout canvas rendered' : 'Archive error/empty state rendered');
    } catch (err) {
      record('Preset opens Explore with frames', false, err.message);
    }

    // 4. Play/pause
    try {
      if (!hasCanvas) throw new Error('Canvas not loaded');
      const playBtn = page.locator('button[aria-label="Play playback (Space)"]').first();
      await playBtn.waitFor({ state: 'visible', timeout: 10000 });
      await playBtn.click();
      const pauseBtn = page.locator('button[aria-label="Pause playback (Space)"]').first();
      await pauseBtn.waitFor({ state: 'visible', timeout: 5000 });
      await pauseBtn.click();
      const backToPlay = await playBtn.isVisible();
      record('Play/Pause', backToPlay, 'Toggled Play -> Pause -> Play');
    } catch (err) {
      record('Play/Pause', false, err.message);
    }

    // 5. Blink
    try {
      if (!hasCanvas) throw new Error('Canvas not loaded');
      const blinkBtn = page.locator('button[aria-label="Toggle Blink 1 to Last epoch (Shortcut: B)"]').first();
      await blinkBtn.waitFor({ state: 'visible', timeout: 5000 });
      const before = await blinkBtn.getAttribute('aria-pressed');
      await blinkBtn.click();
      const after = await blinkBtn.getAttribute('aria-pressed');
      const toggled = before === 'false' && after === 'true';
      record('Blink toggle', toggled, `aria-pressed ${before} -> ${after}`);
    } catch (err) {
      record('Blink toggle', false, err.message);
    }

    // 6. Detector selector
    try {
      if (!hasCanvas) throw new Error('Canvas not loaded');
      const detSelect = page.locator('select[aria-label="Select SPHEREx detector array (D1 to D6 or Auto)"]').first();
      await detSelect.waitFor({ state: 'visible', timeout: 5000 });
      const optionCount = await detSelect.locator('option').count();
      await detSelect.selectOption('D3');
      const selectedVal = await detSelect.inputValue();
      const ok = optionCount >= 6 && selectedVal === 'D3';
      record('Detector selector', ok, `${optionCount} options, selected=${selectedVal}`);
    } catch (err) {
      record('Detector selector', false, err.message);
    }

    // 7. Language toggle
    try {
      const langBtn = page.locator('button[aria-label="Toggle language"]').first();
      await langBtn.waitFor({ state: 'visible', timeout: 5000 });
      await langBtn.click();
      await page.waitForSelector('div[dir="rtl"]', { timeout: 5000 });
      const rtlCount = await page.locator('div[dir="rtl"]').count();
      await langBtn.click();
      await page.waitForSelector('div[dir="ltr"]', { timeout: 5000 });
      record('Language toggle', rtlCount > 0, 'Switched EN -> AR (RTL) -> EN (LTR)');
    } catch (err) {
      record('Language toggle', false, err.message);
    }

    const failed = checks.filter((c) => !c.passed);
    assert.equal(pageErrors.length, 0, `Uncaught page errors: ${pageErrors.join('; ')}`);
    assert.equal(failed.length, 0, `${failed.length} E2E checks failed`);
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('E2E smoke failed:', err.message || err);
  process.exit(1);
});
