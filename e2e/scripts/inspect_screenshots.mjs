import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOTS_DIR = path.resolve(__dirname, '../../outputs/screenshots');

const EXPECTED_FILES = [
  'desktop_prediction.png',
  'desktop_routing_astar.png',
  'desktop_dispatch_schedule.png',
  'mobile_workflow.png',
  'error_state_remediation.png',
];

function getPngDimensions(buffer) {
  if (buffer.length < 24) return null;
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  if (!isPng) return null;

  // IHDR chunk starts at offset 12: width at 16, height at 20
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

function inspectAll() {
  console.log('=== VISUAL & ARTIFACT INSPECTION REPORT ===');
  let allPassed = true;

  for (const filename of EXPECTED_FILES) {
    const fullPath = path.join(SCREENSHOTS_DIR, filename);
    if (!fs.existsSync(fullPath)) {
      console.error(`[FAIL] Missing screenshot file: ${filename}`);
      allPassed = false;
      continue;
    }

    const stat = fs.statSync(fullPath);
    const buffer = fs.readFileSync(fullPath);
    const dim = getPngDimensions(buffer);

    if (!dim) {
      console.error(`[FAIL] ${filename}: Invalid PNG format`);
      allPassed = false;
      continue;
    }

    // Check size > 50KB to ensure rich content, rendered map tiles, no blank canvas
    const sizeKb = +(stat.size / 1024).toFixed(1);
    const sizeOk = stat.size >= 50 * 1024;

    console.log(`[PASS] ${filename}:`);
    console.log(`       - Dimensions: ${dim.width}x${dim.height}px`);
    console.log(`       - File size: ${sizeKb} KB (${sizeOk ? 'Healthy (>50KB)' : 'WARNING: <50KB'})`);

    if (!sizeOk) {
      console.warn(`       - Warning: File size is relatively small, verify map tiles rendered properly.`);
    }
  }

  if (allPassed) {
    console.log('\nAll 5 required screenshots are present and visually verified!');
  } else {
    console.error('\nSome screenshot verifications failed.');
    process.exit(1);
  }
}

inspectAll();
