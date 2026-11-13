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

    // 3. Preset opens Explore in Explorer default mode with frames
    let hasCanvas = false;
    try {
      const presetBtn = page.locator('button', { hasText: "Barnard's Star" }).first();
      await presetBtn.click();
      await page.waitForSelector('canvas[aria-label*="SPHEREx"], [role="alert"]', { timeout: 45000 });
      hasCanvas = (await page.locator('canvas[aria-label*="SPHEREx"]').count()) > 0;
      const explorerBtn = page.getByTestId('mode-explorer-btn');
      await explorerBtn.waitFor({ state: 'visible', timeout: 5000 });
      const explorerPressed = await explorerBtn.getAttribute('aria-pressed');
      const detectorSelectCount = await page
        .locator('select[aria-label="Select SPHEREx detector array (D1 to D6 or Auto)"]')
        .count();
      const ok = hasCanvas && explorerPressed === 'true' && detectorSelectCount === 0;
      record(
        'Explorer default mode + frames',
        ok,
        `hasCanvas=${hasCanvas}, explorerPressed=${explorerPressed}, scientistControlsHidden=${detectorSelectCount === 0}`
      );
    } catch (err) {
      record('Explorer default mode + frames', false, err.message);
    }

    // 4. Explorer 3 big buttons (Play the sky, Show what changed, Ask SPEX) + canvas tap explain
    try {
      if (!hasCanvas) throw new Error('Canvas not loaded');
      const playSkyBtn = page.getByTestId('explorer-play-btn');
      await playSkyBtn.waitFor({ state: 'visible', timeout: 5000 });
      await playSkyBtn.click();
      const playPressedAfterClick = await playSkyBtn.getAttribute('aria-pressed');
      await playSkyBtn.click();

      const diffBtn = page.getByTestId('explorer-diff-btn');
      await diffBtn.waitFor({ state: 'visible', timeout: 5000 });
      await diffBtn.click();
      const diffPressedAfterClick = await diffBtn.getAttribute('aria-pressed');
      await diffBtn.click();

      // Click center of canvas to trigger pixel->sky + /api/spex/explain
      const canvas = page.locator('canvas[aria-label*="SPHEREx"]').first();
      const box = await canvas.boundingBox();
      assert.ok(box && box.width > 0 && box.height > 0, 'Canvas bounding box missing');
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

      const guidePanel = page.getByTestId('spex-guide-panel');
      await guidePanel.waitFor({ state: 'visible', timeout: 10000 });
      const answerBubble = page.getByTestId('spex-answer-bubble').first();
      await answerBubble.waitFor({ state: 'visible', timeout: 15000 });
      const answerText = (await answerBubble.textContent()) || '';

      const highlightBadge = page.getByTestId('spex-canvas-highlight').first();
      await highlightBadge.waitFor({ state: 'visible', timeout: 5000 });

      const askBtnVisible = await page.getByTestId('explorer-ask-spex-btn').isVisible();
      // Close guide panel cleanly so UI stays unobstructed for next checks
      await guidePanel.locator('button[aria-label*="Close"], button[aria-label*="إغلاق"]').click();

      const ok =
        playPressedAfterClick === 'true' &&
        diffPressedAfterClick === 'true' &&
        askBtnVisible &&
        answerText.trim().length > 15;
      record('Explorer 3 buttons & SPEX Canvas Guide', ok, `answerLen=${answerText.trim().length}`);
    } catch (err) {
      record('Explorer 3 buttons & SPEX Canvas Guide', false, err.message);
    }

    // 5. Mission 1 completion + What you learned + Postcard button
    try {
      if (!hasCanvas) throw new Error('Canvas not loaded');
      const learnedCard = page.getByTestId('mission-learned-card');
      await learnedCard.waitFor({ state: 'visible', timeout: 10000 });
      const postcardBtn = page.getByTestId('mission-postcard-btn');
      const hasPostcardBtn = await postcardBtn.isVisible();
      record('Explorer Mission completion card', hasPostcardBtn, 'Mission 1 completed with What you learned + Postcard CTA');
    } catch (err) {
      record('Explorer Mission completion card', false, err.message);
    }

    // 6. Switch to Scientist mode + verify Play/Pause, Blink, Detector selector
    try {
      if (!hasCanvas) throw new Error('Canvas not loaded');
      const sciBtn = page.getByTestId('mode-scientist-btn');
      await sciBtn.click();
      const sciPressed = await sciBtn.getAttribute('aria-pressed');

      const playBtn = page.locator('button[aria-label="Play playback (Space)"]').first();
      await playBtn.waitFor({ state: 'visible', timeout: 10000 });
      await playBtn.click();
      const pauseBtn = page.locator('button[aria-label="Pause playback (Space)"]').first();
      await pauseBtn.waitFor({ state: 'visible', timeout: 5000 });
      await pauseBtn.click();
      const backToPlay = await playBtn.isVisible();

      const blinkBtn = page.locator('button[aria-label="Toggle Blink 1 to Last epoch (Shortcut: B)"]').first();
      await blinkBtn.waitFor({ state: 'visible', timeout: 5000 });
      const blinkBefore = await blinkBtn.getAttribute('aria-pressed');
      await blinkBtn.click();
      const blinkAfter = await blinkBtn.getAttribute('aria-pressed');

      const detSelect = page.locator('select[aria-label="Select SPHEREx detector array (D1 to D6 or Auto)"]').first();
      await detSelect.waitFor({ state: 'visible', timeout: 5000 });
      const optionCount = await detSelect.locator('option').count();
      await detSelect.selectOption('D3');
      const selectedVal = await detSelect.inputValue();

      const ok =
        sciPressed === 'true' &&
        backToPlay &&
        blinkBefore === 'false' &&
        blinkAfter === 'true' &&
        optionCount >= 6 &&
        selectedVal === 'D3';
      record('Scientist mode controls (Play, Blink, D1-D6)', ok, `selected=${selectedVal}, options=${optionCount}`);
    } catch (err) {
      record('Scientist mode controls (Play, Blink, D1-D6)', false, err.message);
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

    // 8. 360px Mobile Viewport in Explorer Mode (zero horizontal overflow)
    try {
      const expBtn = page.getByTestId('mode-explorer-btn');
      await expBtn.click();
      await page.setViewportSize({ width: 360, height: 800 });
      await page.waitForTimeout(300);
      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      const ok = metrics.scrollWidth <= metrics.innerWidth;
      record(
        'Mobile 360px Explorer layout',
        ok,
        `scrollWidth=${metrics.scrollWidth} <= innerWidth=${metrics.innerWidth}`
      );
    } catch (err) {
      record('Mobile 360px Explorer layout', false, err.message);
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
