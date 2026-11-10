import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Helper script to run headless chromium and capture screenshots
async function main() {
  const screenshotsDir = path.resolve('public/screenshots');
  const artifactDir = '/.aistudio/artifacts/brain/7756e73e-01e6-422a-ae5f-8f5396d564d7';

  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const targets = [
    {
      name: 'screen2_en_desktop.png',
      width: 1280,
      height: 800,
      url: 'http://localhost:3000/explore?case=case-barnards-star&lang=en',
    },
    {
      name: 'screen2_en_mobile.png',
      width: 390,
      height: 844,
      url: 'http://localhost:3000/explore?case=case-barnards-star&lang=en',
    },
    {
      name: 'screen2_ar_desktop.png',
      width: 1280,
      height: 800,
      url: 'http://localhost:3000/explore?case=case-barnards-star&lang=ar',
    },
    {
      name: 'screen2_ar_mobile.png',
      width: 390,
      height: 844,
      url: 'http://localhost:3000/explore?case=case-barnards-star&lang=ar',
    },
    {
      name: 'screen2_curtain_desktop.png',
      width: 1280,
      height: 800,
      url: 'http://localhost:3000/explore?case=case-nep-var-01&lang=en',
    },
  ];

  for (const t of targets) {
    const outPath = path.join(screenshotsDir, t.name);
    console.log(`Capturing ${t.name} (${t.width}x${t.height}) from ${t.url}...`);

    try {
      // Chromium headless capture command
      const cmd = `chromium --headless --no-sandbox --disable-gpu --disable-dev-shm-usage --window-size=${t.width},${t.height} --hide-scrollbars --screenshot="${outPath}" --virtual-time-budget=3500 "${t.url}"`;
      execSync(cmd, { stdio: 'inherit' });
      console.log(`Successfully saved ${outPath}`);

      // Copy to artifact dir as well
      const artifactPath = path.join(artifactDir, t.name);
      fs.copyFileSync(outPath, artifactPath);
      console.log(`Copied to artifact dir ${artifactPath}`);
    } catch (err: any) {
      console.error(`Failed to capture ${t.name}:`, err.message);
    }
  }

  console.log('Finished capturing all Screen 2 screenshots.');
}

main().catch(console.error);
