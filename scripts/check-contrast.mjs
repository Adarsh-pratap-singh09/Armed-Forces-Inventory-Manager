/**
 * Contrast Checker Script (WCAG 2.1 compliance)
 * Tests WCAG contrast ratios across defined theme tokens and surface pairs.
 * Target: >= 4.5:1 for body text, >= 3.0:1 for large text/headings/icons/controls.
 */

function hexToRgb(hex) {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function getLuminance({ r, g, b }) {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function getContrastRatio(hex1, hex2) {
  const lum1 = getLuminance(hexToRgb(hex1));
  const lum2 = getLuminance(hexToRgb(hex2));
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (brighter + 0.05) / (darker + 0.05);
}

// Surfaces
const surfaces = {
  'Page BG': '#0c110d',
  'Panel Surface': '#182118',
  'Raised Surface': '#212d21',
  'Input Surface': '#2a382a'
};

// Text & Accents
const texts = {
  'Primary Text (#f1f4e8)': '#f1f4e8',
  'Secondary Text (#c9d1b8)': '#c9d1b8',
  'Muted Text (#a3ad94)': '#a3ad94',
  'Sage Accent (#a9c486)': '#a9c486',
  'Sand Accent (#d8cb9f)': '#d8cb9f',
  'Amber Accent (#e0a947)': '#e0a947',
  'Brick Accent (#d4705a)': '#d4705a',
  'Brick Light (#e07d67)': '#e07d67',
  'Steel Accent (#86a9cc)': '#86a9cc'
};

console.log('='.repeat(80));
console.log('WCAG 2.1 THEME CONTRAST COMPLIANCE AUDIT');
console.log('='.repeat(80));

let failures = 0;
let totalTests = 0;

console.log('\n--- 1. STANDARD TEXT HIERARCHY ON SURFACES (Threshold >= 4.5:1) ---');
const standardTexts = ['Primary Text (#f1f4e8)', 'Secondary Text (#c9d1b8)', 'Muted Text (#a3ad94)'];

for (const [sName, sHex] of Object.entries(surfaces)) {
  for (const tName of standardTexts) {
    const tHex = texts[tName];
    const ratio = getContrastRatio(tHex, sHex);
    totalTests++;
    const pass = ratio >= 4.5;
    if (!pass) failures++;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${tName.padEnd(26)} on ${sName.padEnd(16)}: ${ratio.toFixed(2)}:1 (Min 4.5:1)`);
  }
}

console.log('\n--- 2. BUTTON CONTRAST RATIOS ---');
// Primary Button: Sand #d8cb9f with Dark Text #1a1f14
const primaryBtnRatio = getContrastRatio('#d8cb9f', '#1a1f14');
totalTests++;
const pBtnPass = primaryBtnRatio >= 4.5;
if (!pBtnPass) failures++;
console.log(`[${pBtnPass ? 'PASS' : 'FAIL'}] Primary Button (Dark text #1a1f14 on Sand #d8cb9f): ${primaryBtnRatio.toFixed(2)}:1 (Min 4.5:1)`);

// Secondary Button: Light text #f1f4e8 on Transparent (over surfaces)
for (const [sName, sHex] of Object.entries(surfaces)) {
  const ratio = getContrastRatio('#f1f4e8', sHex);
  totalTests++;
  const pass = ratio >= 4.5;
  if (!pass) failures++;
  console.log(`[${pass ? 'PASS' : 'FAIL'}] Secondary Button (Light text #f1f4e8 on ${sName}): ${ratio.toFixed(2)}:1 (Min 4.5:1)`);
}

console.log('\n--- 3. ACCENTS ON SURFACES (Headings / Badges / Chips / Accents) ---');
for (const [sName, sHex] of Object.entries(surfaces)) {
  for (const [aName, aHex] of Object.entries(texts)) {
    if (standardTexts.includes(aName)) continue;
    const ratio = getContrastRatio(aHex, sHex);
    totalTests++;
    // WCAG AA for UI components & graphical objects is >= 3.0:1, text >= 4.5:1
    const pass = ratio >= 3.0;
    if (!pass) failures++;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${aName.padEnd(26)} on ${sName.padEnd(16)}: ${ratio.toFixed(2)}:1 (UI min 3.0:1)`);
  }
}

console.log('\n--- 4. FORM PLACEHOLDER CONTRAST (Threshold >= 3.0:1) ---');
const placeholderHex = '#8d9780';
for (const [sName, sHex] of Object.entries(surfaces)) {
  const ratio = getContrastRatio(placeholderHex, sHex);
  totalTests++;
  const pass = ratio >= 3.0;
  if (!pass) failures++;
  console.log(`[${pass ? 'PASS' : 'FAIL'}] Placeholder (#8d9780) on ${sName.padEnd(16)}: ${ratio.toFixed(2)}:1 (Min 3.0:1)`);
}

console.log('\n' + '='.repeat(80));
console.log(`SUMMARY: Total Tests: ${totalTests} | Passed: ${totalTests - failures} | Failed: ${failures}`);
console.log('='.repeat(80));

if (failures > 0) {
  process.exit(1);
} else {
  console.log('ALL WCAG CONTRAST CHECKS PASSED SUCCESSFULLY!\n');
}
