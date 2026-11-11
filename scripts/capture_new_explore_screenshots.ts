import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const screenshotsDir = path.resolve('public/screenshots');
  const artifactDir = '/.aistudio/artifacts/brain/c4e950a0-97bf-419a-ba45-edd5c3d0aa38';

  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const chromePath = '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell';

  const targets = [
    {
      name: 'explorer_desktop_1440.png',
      width: 1440,
      height: 900,
      url: 'http://localhost:3000/explore?case=case-barnards-star&lang=en',
    },
    {
      name: 'explorer_desktop_1280.png',
      width: 1280,
      height: 800,
      url: 'http://localhost:3000/explore?case=case-barnards-star&lang=en',
    },
    {
      name: 'explorer_mobile_390.png',
      width: 390,
      height: 844,
      url: 'http://localhost:3000/explore?case=case-barnards-star&lang=en',
    },
    {
      name: 'explorer_mobile_360.png',
      width: 360,
      height: 800,
      url: 'http://localhost:3000/explore?case=case-barnards-star&lang=en',
    },
    {
      name: 'scientist_desktop_1440.png',
      width: 1440,
      height: 900,
      url: 'http://localhost:3000/explore?case=case-barnards-star&mode=scientist&lang=en',
    },
    {
      name: 'explorer_arabic_desktop.png',
      width: 1440,
      height: 900,
      url: 'http://localhost:3000/explore?case=case-barnards-star&lang=ar',
    },
    {
      name: 'explorer_arabic_mobile.png',
      width: 390,
      height: 844,
      url: 'http://localhost:3000/explore?case=case-barnards-star&lang=ar',
    },
    {
      name: 'explorer_wise_0855.png',
      width: 1440,
      height: 900,
      url: 'http://localhost:3000/explore?case=case-wise-0855&lang=en',
    },
    {
      name: 'explorer_spex_companion.png',
      width: 1440,
      height: 900,
      url: 'http://localhost:3000/explore?case=case-barnards-star&lang=en',
    },
  ];

  for (const t of targets) {
    const outPath = path.join(screenshotsDir, t.name);
    console.log(`Capturing ${t.name} (${t.width}x${t.height}) from ${t.url}...`);

    try {
      const cmd = `"${chromePath}" --headless --no-sandbox --disable-gpu --disable-dev-shm-usage --window-size=${t.width},${t.height} --hide-scrollbars --virtual-time-budget=3500 --screenshot="${outPath}" "${t.url}"`;
      execSync(cmd, { stdio: 'pipe' });
      console.log(`Saved ${outPath}`);

      if (fs.existsSync(artifactDir)) {
        const artifactPath = path.join(artifactDir, t.name);
        fs.copyFileSync(outPath, artifactPath);
        console.log(`Copied to artifact dir: ${artifactPath}`);
      }
    } catch (err: any) {
      console.error(`Failed to capture ${t.name}:`, err.message);
    }
  }

  console.log('Finished capturing all Explore screenshots.');
}

main().catch(console.error);
