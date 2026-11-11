import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const screenshotsDir = path.resolve('public/screenshots');
  const artifactDir = '/.aistudio/artifacts/brain/a0c0b78f-d701-42b4-9ab9-c3ecdb39a1da';

  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const chromePath = '/app/applet/chrome-headless-shell/linux-157.0.8103.50/chrome-headless-shell-linux64/chrome-headless-shell';

  const targets = [
    {
      name: 'screen1_en_desktop.png',
      width: 1280,
      height: 800,
      url: 'http://localhost:3000/explore?lang=en',
    },
    {
      name: 'screen1_en_mobile.png',
      width: 390,
      height: 844,
      url: 'http://localhost:3000/explore?lang=en',
    },
    {
      name: 'screen1_ar_desktop.png',
      width: 1280,
      height: 800,
      url: 'http://localhost:3000/explore?lang=ar',
    },
    {
      name: 'screen1_ar_mobile.png',
      width: 390,
      height: 844,
      url: 'http://localhost:3000/explore?lang=ar',
    },
    {
      name: 'screen1_en_hover_desktop.png',
      width: 1280,
      height: 800,
      url: 'http://localhost:3000/explore?lang=en&hover=1',
    },
    {
      name: 'screen1_ar_hover_desktop.png',
      width: 1280,
      height: 800,
      url: 'http://localhost:3000/explore?lang=ar&hover=1',
    },
  ];

  for (const t of targets) {
    const outPath = path.join(screenshotsDir, t.name);
    console.log(`Capturing ${t.name} (${t.width}x${t.height}) from ${t.url}...`);

    try {
      const cmd = `"${chromePath}" --headless --no-sandbox --disable-gpu --disable-dev-shm-usage --window-size=${t.width},${t.height} --hide-scrollbars --screenshot="${outPath}" "${t.url}"`;
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

  console.log('Finished capturing Screen 1 screenshots.');
}

main().catch(console.error);
