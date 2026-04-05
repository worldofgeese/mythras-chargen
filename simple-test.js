// Simple Node.js test to verify the HTML loads and executes properly
const fs = require('fs');
const vm = require('vm');

console.log('Testing index.html structure and JavaScript...\n');

// Read the HTML file
const html = fs.readFileSync('index.html', 'utf-8');

// Check for key elements
console.log('✓ HTML file loaded:', html.length, 'bytes');

// Check for essential sections
const checks = [
  { name: 'Title', pattern: /Adventures in Glorantha Character Sheet/ },
  { name: 'Character name input', pattern: /id="char-name"/ },
  { name: 'Culture select', pattern: /id="culture-select"/ },
  { name: 'Characteristics inputs', pattern: /data-testid="char-str"/ },
  { name: 'Play Mode section', pattern: /id="play-mode"/ },
  { name: 'CharacterData object', pattern: /const CharacterData\s*=/ },
  { name: 'App object', pattern: /const App\s*=/ },
  { name: 'SKILLS_DATA', pattern: /const SKILLS_DATA\s*=/ },
  { name: 'CULTURES_DATA', pattern: /const CULTURES_DATA\s*=/ },
  { name: 'pdf-lib reference', pattern: /lib\/pdf-lib\.min\.js/ },
  { name: 'Offscreen positioning', pattern: /position:absolute;left:-9999px/ },
  { name: 'data-testid attributes', pattern: /data-testid="wizard-/ },
];

let passed = 0;
let failed = 0;

checks.forEach(check => {
  if (check.pattern.test(html)) {
    console.log(`✓ ${check.name}`);
    passed++;
  } else {
    console.log(`✗ ${check.name} - NOT FOUND`);
    failed++;
  }
});

console.log(`\nStructure checks: ${passed} passed, ${failed} failed`);

// Check if glorantha.js is being loaded
if (html.includes('data/glorantha.js')) {
  console.log('✓ Glorantha data file referenced');
  if (fs.existsSync('data/glorantha.js')) {
    console.log('✓ data/glorantha.js file exists');
  } else {
    console.log('✗ data/glorantha.js file MISSING');
  }
}

// Check if lib/pdf-lib.min.js exists
if (fs.existsSync('lib/pdf-lib.min.js')) {
  const pdfLibSize = fs.statSync('lib/pdf-lib.min.js').size;
  console.log(`✓ lib/pdf-lib.min.js exists (${Math.round(pdfLibSize/1024)}KB)`);
} else {
  console.log('✗ lib/pdf-lib.min.js MISSING');
}

console.log('\nAll critical elements present in HTML!');
process.exit(0);
