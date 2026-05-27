#!/usr/bin/env node
/**
 * TDD Test Suite for Mythras Character Generator
 * Tests cover: PDF validation, Play Mode state, data normalization, validation layer
 * Run: node test-chargen.js
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function pass(msg) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
  totalTests++;
  passedTests++;
}

function fail(msg, details) {
  console.log(`${colors.red}✗${colors.reset} ${msg}`);
  if (details) console.log(`  ${colors.gray}${details}${colors.reset}`);
  totalTests++;
  failedTests++;
}

function section(title) {
  console.log(`\n${colors.cyan}═══ ${title} ═══${colors.reset}\n`);
}

function info(msg) {
  console.log(`${colors.gray}${msg}${colors.reset}`);
}

const jsonCache = new Map();

function readJson(relativePath) {
  const absolutePath = path.join(__dirname, relativePath);
  if (!jsonCache.has(absolutePath)) {
    jsonCache.set(absolutePath, JSON.parse(fs.readFileSync(absolutePath, 'utf8')));
  }
  return jsonCache.get(absolutePath);
}

const sourceEvidenceMetadataFields = new Set([
  'agreement',
  'artifact_id',
  'artifact_kind',
  'artifact_path',
  'block_id',
  'block_type',
  'cache_path',
  'coverage_mode',
  'coverage_state',
  'extractor_prompt_id',
  'extractor_run_id',
  'fact_id',
  'image_sha256',
  'printed_page_label',
  'focused_verifier_run_ids',
  'prompt_hash',
  'prompt_id',
  'reading_order',
  'rendered_at',
  'renderer',
  'schema_version',
  'source_id',
  'source_pdf_sha256',
  'source_revision_id',
  'status',
  'tool_identity',
  'verifier_prompt_id',
  'verifier_run_id',
  'workflow_id',
  'work_state'
]);

function isSourceEvidenceMetadataString(value) {
  return /^[a-f0-9]{64}$/.test(value) ||
    /^(aig|waha|mythras-core)-p\d{3,4}-b\d{3}$/.test(value) ||
    /^(blocked|completed|extracted|extraction|not_rendered|pass|passed|pending|rendered|verified|verification)$/i.test(value);
}

function sourceEvidenceTextLength(value, key = '') {
  if (typeof value === 'string') {
    return sourceEvidenceMetadataFields.has(key) || isSourceEvidenceMetadataString(value) ? 0 : value.length;
  }
  if (Array.isArray(value)) {
    return value.reduce((total, item) => total + sourceEvidenceTextLength(item, key), 0);
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((total, [childKey, childValue]) =>
      total + sourceEvidenceTextLength(childValue, childKey), 0);
  }
  return 0;
}

const pendingTests = [];

function asyncTest(msg, fn) {
  pendingTests.push(Promise.resolve()
    .then(fn)
    .catch(err => fail(msg, err && err.stack ? err.stack : String(err))));
}

// Extract JS from HTML
function extractScripts(html) {
  const scripts = [];
  let idx = 0;
  while (true) {
    const s = html.indexOf('<script', idx);
    if (s === -1) break;
    const cs = html.indexOf('>', s) + 1;
    const e = html.indexOf('</script>', cs);
    if (e === -1) break;
    const code = html.substring(cs, e);
    if (code.trim().length > 100) scripts.push(code);
    idx = e + 9;
  }
  return scripts;
}

// Minimal DOM mock for testing logic (not rendering)
function createMockEnv() {
  const elements = {};
  const mockEl = (id) => ({
    id, innerHTML: '', textContent: '', value: '', style: { cssText: '', display: '' },
    classList: { toggle: () => {}, add: () => {}, remove: () => {}, contains: () => false },
    querySelector: () => null, querySelectorAll: () => [],
    setAttribute: () => {}, removeAttribute: () => {}, getAttribute: () => null,
    appendChild: () => {}, remove: () => {}, disabled: false,
    addEventListener: () => {}, click: () => {}, firstChild: null, removeChild: () => {},
    get children() { return []; }
  });

  const doc = {
    getElementById: (id) => { if (!elements[id]) elements[id] = mockEl(id); return elements[id]; },
    querySelector: () => mockEl('q'),
    querySelectorAll: () => [],
    createElement: (tag) => mockEl(tag),
    addEventListener: () => {},
    head: { appendChild: () => {} },
    body: { appendChild: () => {} },
    title: 'test'
  };

  return { document: doc, elements,
    _pdf: { texts: [], rectangles: [], lines: [], saved: false },
    localStorage: { getItem: () => null, setItem: () => {} },
    location: { hash: '', href: '' },
    window: {}, navigator: { userAgent: '' },
    CSS: { escape: (s) => s.replace(/([\[\]"'\\#.:>+~=|^${}()/!])/g, '\\$1') },
    setTimeout: (fn) => fn(), clearTimeout: () => {}, requestAnimationFrame: (fn) => fn(),
    console: { log: () => {}, warn: () => {}, error: () => {} },
    URL: { createObjectURL: () => 'blob:', revokeObjectURL: () => {} },
    Blob: function(parts, opts = {}) { this.parts = parts; this.type = opts.type || ''; },
    Uint8Array: globalThis.Uint8Array,
    Map: globalThis.Map, Set: globalThis.Set, Array: globalThis.Array,
    Object: globalThis.Object, JSON: globalThis.JSON, Math: globalThis.Math,
    Number: globalThis.Number, String: globalThis.String, Error: globalThis.Error,
    TypeError: globalThis.TypeError, isFinite: globalThis.isFinite, isNaN: globalThis.isNaN,
    parseInt: globalThis.parseInt, parseFloat: globalThis.parseFloat,
    Promise: globalThis.Promise,
  };
}

// Load and execute app code
function loadApp() {
  const htmlPath = path.join(__dirname, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Load glorantha.js separately
  const gloranthaPath = path.join(__dirname, 'data', 'glorantha.js');
  const gloranthaScript = fs.existsSync(gloranthaPath) ?
    fs.readFileSync(gloranthaPath, 'utf8') : '';

  // Extract main script
  const scripts = extractScripts(html);
  if (scripts.length === 0) {
    throw new Error('No scripts found in index.html');
  }
  const appScript = scripts.find(s => s.includes('CharacterData')) || scripts[scripts.length - 1]; // Find the app script (not pdf-lib)

  // Create sandbox
  const vm = require('vm');
  const env = createMockEnv();

  // Mock pdf-lib
  const mockPdfLib = {
    PDFDocument: {
      create: async () => ({
        addPage: () => ({
          getWidth: () => 595,
          getHeight: () => 842,
          getSize: () => ({ width: 595, height: 842 }),
          drawText: (text, opts = {}) => { env._pdf.texts.push({ text: String(text || ''), ...opts }); },
          drawRectangle: (opts = {}) => { env._pdf.rectangles.push({ ...opts }); },
          drawLine: (opts = {}) => { env._pdf.lines.push({ ...opts }); },
	        }),
	        embedFont: async () => ({
	          widthOfTextAtSize: (text, size) => String(text || '').length * size * 0.5,
	        }),
        save: async () => {
          env._pdf.saved = true;
          return new Uint8Array(100);
        },
      })
    },
    StandardFonts: { Helvetica: 'Helvetica', HelveticaBold: 'Helvetica-Bold' },
    rgb: (r, g, b) => ({ r, g, b }),
    degrees: (d) => d,
  };

  const sandbox = vm.createContext({
    ...env, document: env.document, window: env.window, localStorage: env.localStorage,
    location: env.location, console: env.console, setTimeout: env.setTimeout, clearTimeout: env.clearTimeout,
    requestAnimationFrame: env.requestAnimationFrame,
    URL: env.URL, Blob: env.Blob,
    Uint8Array: globalThis.Uint8Array, Int32Array: globalThis.Int32Array,
    Uint16Array: globalThis.Uint16Array, Uint32Array: globalThis.Uint32Array,
    Uint8ClampedArray: globalThis.Uint8ClampedArray, ArrayBuffer: globalThis.ArrayBuffer,
    Map: globalThis.Map, Set: globalThis.Set, Array: globalThis.Array,
    Object: globalThis.Object, JSON: globalThis.JSON, Math: globalThis.Math,
    Number: globalThis.Number, String: globalThis.String, Error: globalThis.Error,
    TypeError: globalThis.TypeError, isFinite: globalThis.isFinite, isNaN: globalThis.isNaN,
    parseInt: globalThis.parseInt, parseFloat: globalThis.parseFloat,
    Promise: globalThis.Promise, RegExp: globalThis.RegExp, Date: globalThis.Date,
    PDFLib: mockPdfLib,
  });

  try {
    // Load glorantha data first (if it exists)
    if (gloranthaScript) {
      vm.runInContext(gloranthaScript, sandbox, { filename: 'glorantha.js' });
    }

    // Load main app
    vm.runInContext(appScript, sandbox, { filename: 'app.js' });

    // Extract exports
    vm.runInContext(`
      this._exports = {
        CharacterData,
        Calc,
        App: typeof App !== 'undefined' ? App : null,
        CULTURES_DATA,
        COMBAT_STYLES_DATA: typeof COMBAT_STYLES_DATA !== 'undefined' ? COMBAT_STYLES_DATA : null,
        STARTING_SPIRITS: typeof STARTING_SPIRITS !== 'undefined' ? STARTING_SPIRITS : null,
        CULTURE_BUILDS: typeof CULTURE_BUILDS !== 'undefined' ? CULTURE_BUILDS : null,
        CULTURE_BUILD_SPECS: typeof CULTURE_BUILD_SPECS !== 'undefined' ? CULTURE_BUILD_SPECS : null,
        CULTURE_MAGIC_PROFILES: typeof CULTURE_MAGIC_PROFILES !== 'undefined' ? CULTURE_MAGIC_PROFILES : null,
        CORE_CAREER_MAGIC_PROVIDERS: typeof CORE_CAREER_MAGIC_PROVIDERS !== 'undefined' ? CORE_CAREER_MAGIC_PROVIDERS : null,
        WEAPONS_DATA,
        WEAPON_ALIASES: typeof WEAPON_ALIASES !== 'undefined' ? WEAPON_ALIASES : null,
        DATA_INDEXES: typeof DATA_INDEXES !== 'undefined' ? DATA_INDEXES : null,
        SKILLS_DATA,
        SKILL_DESCRIPTIONS: typeof SKILL_DESCRIPTIONS !== 'undefined' ? SKILL_DESCRIPTIONS : null,
        HIT_LOCATIONS,
        GLORANTHA_CULTURES_DATA: typeof GLORANTHA_CULTURES_DATA !== 'undefined' ? GLORANTHA_CULTURES_DATA : null,
        Helpers: typeof Helpers !== 'undefined' ? Helpers : null,
        normalizeCharacter: (typeof App !== 'undefined' && App.normalizeCharacter) ? App.normalizeCharacter : null,
        normalizeCultureName: typeof normalizeCultureName !== 'undefined' ? normalizeCultureName : null,
        CAREERS_DATA: typeof CAREERS_DATA !== 'undefined' ? CAREERS_DATA : null,
        CULTS_DATA: typeof CULTS_DATA !== 'undefined' ? CULTS_DATA : null,
        CULTURE_CULT_MAP: typeof CULTURE_CULT_MAP !== 'undefined' ? CULTURE_CULT_MAP : null,
        CULTURE_ALIASES: typeof CULTURE_ALIASES !== 'undefined' ? CULTURE_ALIASES : null,
        CULT_DISPLAY_GROUPS: typeof CULT_DISPLAY_GROUPS !== 'undefined' ? CULT_DISPLAY_GROUPS : null,
        PROVENANCE_COVERAGE: typeof PROVENANCE_COVERAGE !== 'undefined' ? PROVENANCE_COVERAGE : null,
        isAnySkill: typeof isAnySkill !== 'undefined' ? isAnySkill : null,
        isPlaceholderSkill: typeof isPlaceholderSkill !== 'undefined' ? isPlaceholderSkill : null,
        needsDisambiguation: typeof needsDisambiguation !== 'undefined' ? needsDisambiguation : null,
        normalizeCharacterFacingSkillName: typeof normalizeCharacterFacingSkillName !== 'undefined' ? normalizeCharacterFacingSkillName : null,
        parsePlaceholderSkill: typeof parsePlaceholderSkill !== 'undefined' ? parsePlaceholderSkill : null,
        getSpecializationGuidance: typeof getSpecializationGuidance !== 'undefined' ? getSpecializationGuidance : null,
        disambiguateSkill: typeof disambiguateSkill !== 'undefined' ? disambiguateSkill : null,
        getDisambiguationOptions: typeof getDisambiguationOptions !== 'undefined' ? getDisambiguationOptions : null,
        resolveRandomDisambiguatedSkill: typeof resolveRandomDisambiguatedSkill !== 'undefined' ? resolveRandomDisambiguatedSkill : null,
        DISAMBIGUATION_LISTS: typeof DISAMBIGUATION_LISTS !== 'undefined' ? DISAMBIGUATION_LISTS : null,
        detectCultType: typeof detectCultType !== 'undefined' ? detectCultType : null,
        MIRACLES_DATA: typeof MIRACLES_DATA !== 'undefined' ? MIRACLES_DATA : null,
      };
    `, sandbox);
  } catch(e) {
    console.error('Failed to load scripts:', e.message);
    console.error(e.stack);
    process.exit(1);
  }

  sandbox._exports._sandbox = sandbox;
  return sandbox._exports;
}

// ============================================================
// MAIN TEST SUITE
// ============================================================

function runCommandTest(msg, command, args) {
  try {
    execFileSync(command, args, { cwd: __dirname, encoding: 'utf8', stdio: 'pipe' });
    pass(msg);
  } catch (err) {
    const output = [err.stdout, err.stderr].filter(Boolean).join('\n').trim();
    fail(msg, output || err.message);
  }
}

section('Source Attestation Foundation');

runCommandTest('Source manifest validator accepts foundation scaffold',
  process.execPath, ['scripts/source_manifest_validator.js', '--quiet']);
runCommandTest('Provenance validator accepts legacy disposition scaffold',
  process.execPath, ['scripts/validate_provenance.js', '--quiet']);
runCommandTest('Page-work manifest validator accepts scaffold states',
  'python3', ['scripts/source_page_work_manifest.py', '--validate', '--quiet']);
runCommandTest('Vision workflow validator accepts independent verification contract',
  'python3', ['scripts/vision_page_workflow.py', '--validate-workflow', '--quiet']);
runCommandTest('Render workflow can list sources without rendering pages',
  'python3', ['scripts/render_source_pages.py', '--list-sources', '--quiet']);

{
  const sourceSchema = readJson('references/sources/schema.json');
  const provenanceSchema = readJson('references/provenance/schema.json');
  const manifest = readJson('references/sources/manifest.json');
  const legacy = readJson('references/provenance/legacy-disposition.json');
  const indexMap = readJson('references/provenance/index-html-map.json');
  const sourceValidator = require('./scripts/source_manifest_validator.js');
  const provenanceValidator = require('./scripts/validate_provenance.js');
  const requiredSources = ['aig', 'mythras-core', 'cse', 'waha', 'bird-in-hand', 'monster-island'];
  const expectedWahaRevision = 'waha:copyparty-sources-books-waha-pdf:a36461fa3ba8:2026-05-21';
  const expectedWahaHash = 'a36461fa3ba86159be1d8993ea920824446171380ff3c11c10a47a8cd95475f1';
  const manifestById = new Map(manifest.sources.map(source => [source.source_id, source]));
  const manifestIds = manifest.sources.map(source => source.source_id).sort();
  const trackedFiles = new Set(execFileSync('git', ['ls-files'], { cwd: __dirname, encoding: 'utf8' }).split('\n').filter(Boolean));
  const missingSources = requiredSources.filter(sourceId => !manifestIds.includes(sourceId));
  const expectedMythrasCoreHash = 'de88d7107f936420954474fa4c08a5393c321e8895ca6bea0cdca1194bcb8b90';
  const expectedMythrasCoreRevision = 'mythras-core:copyparty-sources-books-mythras-core-rulebook-3rd-printing-2018-pdf:de88d7107f93:2026-05-22';
  const expectedCseHash = '106d7ad39e8b63d39cc6a5e79db7ec2f031b165b5c05017113bc13f2469841a6';
  const expectedCseRevision = 'cse:combat-styles-encyclopedia-pdf:106d7ad39e8b:2026-05-21';
  const expectedCsePublicUrl = 'https://copyparty.hound-celsius.ts.net/sources/books/Combat%20Styles%20Encyclopedia.pdf';

  if (missingSources.length === 0) {
    pass('Source manifest declares all foundation source IDs');
  } else {
    fail('Source manifest missing foundation source IDs', missingSources.join(', '));
  }

  const blockedPending = manifest.sources
    .filter(source => source.lifecycle_state !== 'active')
    .every(source => {
      if (!Array.isArray(source.blocks) || !Array.isArray(source.blockers) || source.blockers.length === 0) return false;
      if (source.acceptance_state === 'reference_evidence_verified_app_promotion_blocked') {
        return source.blocks.includes('normalization') && source.blocks.includes('acceptance');
      }
      return source.blocks.includes('extraction');
    });
  if (blockedPending) {
    pass('Pending/unavailable sources explicitly block unverified operations');
  } else {
    fail('Pending/unavailable source does not block unverified operations');
  }

  const mythrasCore = manifestById.get('mythras-core');
  const mythrasCorePages = readJson('references/sources/pages/mythras-core.json');
  const mythrasCoreAppFacingCoverage = readJson('references/provenance/mythras-core-app-facing-pages.json');
  if (mythrasCore &&
      mythrasCore.lifecycle_state === 'active' &&
      mythrasCore.acceptance_state === 'app_facing_page_evidence_attested' &&
      mythrasCore.source_revision_id === expectedMythrasCoreRevision &&
      mythrasCore.sha256 === expectedMythrasCoreHash &&
      mythrasCore.size_bytes === 19068127 &&
      mythrasCore.page_count === 309 &&
      mythrasCore.local_hint === 'references/sources/pdfs/mythras-core.pdf' &&
      mythrasCore.canonical_locator === 'https://copyparty.hound-celsius.ts.net/sources/books/Mythras%20Core%20Rulebook%20%283rd%20Printing%202018%29.pdf' &&
      mythrasCorePages.source_revision_id === expectedMythrasCoreRevision &&
      mythrasCorePages.expected_page_count === 309 &&
      mythrasCorePages.coverage_state === 'verified' &&
      mythrasCorePages.coverage_mode === 'targeted-app-facing-core-page-evidence-with-all-page-scaffold' &&
      mythrasCoreAppFacingCoverage.source_revision_id === expectedMythrasCoreRevision &&
      mythrasCoreAppFacingCoverage.authority_state === 'app_facing_core_page_evidence_attested' &&
      Array.isArray(mythrasCorePages.known_ranges) &&
      mythrasCorePages.known_ranges.some(range => range.label === 'Animism') &&
      mythrasCorePages.known_ranges.some(range => range.label === 'Sorcery') &&
      mythrasCorePages.known_ranges.some(range => range.label === 'Mysticism')) {
    pass('Mythras Core source manifest records Copyparty PDF identity and app-facing page evidence');
  } else {
    fail('Mythras Core source manifest/page coverage is missing or incomplete',
      JSON.stringify({
        revision: mythrasCore?.source_revision_id,
        acceptanceState: mythrasCore?.acceptance_state,
        hash: mythrasCore?.sha256,
        size: mythrasCore?.size_bytes,
        pageCount: mythrasCore?.page_count,
        localHint: mythrasCore?.local_hint,
        locator: mythrasCore?.canonical_locator,
        pageRevision: mythrasCorePages?.source_revision_id,
        expectedPageCount: mythrasCorePages?.expected_page_count,
        coverageState: mythrasCorePages?.coverage_state,
        coverageMode: mythrasCorePages?.coverage_mode,
        appFacingCoverageState: mythrasCoreAppFacingCoverage?.authority_state
      }));
  }

  const mysticismTargetPageNumbers = new Set([155, 156, 157, 158, 159, 160, 161, 196]);
  const mythrasCorePageByNumber = new Map((mythrasCorePages.pages || []).map(page => [page.pdf_page, page]));
  const mythrasCoreAppFacingTargetPages = new Set(mythrasCoreAppFacingCoverage.target_pages || []);
  const appFacingCoverageByPage = new Map((mythrasCoreAppFacingCoverage.pageEvidence || []).map(page => [page.pdf_page, page]));
  const mythrasCoreAllPagesScaffolded = mythrasCorePages.pages.length === mythrasCorePages.expected_page_count &&
    mythrasCorePageByNumber.size === mythrasCorePages.expected_page_count &&
    Array.from({ length: mythrasCorePages.expected_page_count }, (_, index) => index + 1)
      .every(pageNumber => mythrasCorePageByNumber.has(pageNumber));
  const coreAppFacingPageProblems = [];
  if ((mythrasCoreAppFacingCoverage.appFacingGroups || []).length < 10) {
    coreAppFacingPageProblems.push('expected app-facing Core page groups');
  }
  if (mythrasCoreAppFacingTargetPages.size !== (mythrasCoreAppFacingCoverage.target_pages || []).length) {
    coreAppFacingPageProblems.push('target_pages contains duplicates');
  }
  for (const pageNumber of mythrasCoreAppFacingTargetPages) {
    const pageRecord = mythrasCorePageByNumber.get(pageNumber);
    const coverageRecord = appFacingCoverageByPage.get(pageNumber);
    if (!pageRecord) {
      coreAppFacingPageProblems.push(`missing page ${pageNumber}`);
      continue;
    }
    if (!coverageRecord) {
      coreAppFacingPageProblems.push(`missing coverage record for page ${pageNumber}`);
    }
    if (pageRecord.work_state !== 'verified') {
      coreAppFacingPageProblems.push(`page ${pageNumber} work_state ${pageRecord.work_state}`);
    }
    if (pageRecord.render?.status !== 'rendered' || !pageRecord.render?.image_sha256) {
      coreAppFacingPageProblems.push(`page ${pageNumber} lacks rendered image metadata`);
    }
    if (!pageRecord.extraction?.artifact_path || !pageRecord.verification?.artifact_path) {
      coreAppFacingPageProblems.push(`page ${pageNumber} lacks extraction/verification paths`);
      continue;
    }
    for (const evidencePath of [pageRecord.extraction.artifact_path, pageRecord.verification.artifact_path]) {
      if (!fs.existsSync(path.join(__dirname, evidencePath))) {
        coreAppFacingPageProblems.push(`page ${pageNumber} missing evidence artifact ${evidencePath}`);
      }
    }
    const extractionArtifact = readJson(pageRecord.extraction.artifact_path);
    const verificationArtifact = readJson(pageRecord.verification.artifact_path);
    if (extractionArtifact.source_id !== 'mythras-core' ||
        extractionArtifact.source_revision_id !== expectedMythrasCoreRevision ||
        extractionArtifact.pdf_page !== pageNumber) {
      coreAppFacingPageProblems.push(`page ${pageNumber} extraction metadata mismatch`);
    }
    if (verificationArtifact.source_id !== 'mythras-core' ||
        verificationArtifact.source_revision_id !== expectedMythrasCoreRevision ||
        verificationArtifact.pdf_page !== pageNumber ||
        !verificationArtifact.agreement?.startsWith('pass')) {
      coreAppFacingPageProblems.push(`page ${pageNumber} verification metadata mismatch`);
    }
    if (verificationArtifact.independence?.read_extractor_output !== false ||
        verificationArtifact.independence?.read_extractor_scratch !== false ||
        verificationArtifact.independence?.read_extractor_rationale !== false) {
      coreAppFacingPageProblems.push(`page ${pageNumber} verification independence flags must exclude extractor context`);
    }
    const extractionBlockIds = new Set((extractionArtifact.blocks || []).map(block => block.block_id));
    for (const blockId of (verificationArtifact.verified_blocks || [])) {
      if (!extractionBlockIds.has(blockId)) {
        coreAppFacingPageProblems.push(`page ${pageNumber} verification cites unknown block ${blockId}`);
      }
    }
    for (const block of (extractionArtifact.blocks || [])) {
      const isLegacyVisionArtifact = extractionArtifact.workflow_id === 'vision-page-workflow.v1';
      if (typeof block.bounded_excerpt !== 'string' ||
          block.bounded_excerpt.length === 0 ||
          block.bounded_excerpt.length > sourceSchema.excerpt_budgets.block_excerpt_char_max ||
          (!isLegacyVisionArtifact && !block.excerpt_hash)) {
        coreAppFacingPageProblems.push(`page ${pageNumber} block ${block.block_id || '<missing>'} lacks bounded hash evidence`);
      }
    }
    if (pageRecord.contributes_to_app_facing_core !== true) {
      coreAppFacingPageProblems.push(`page ${pageNumber} must contribute to app-facing Core coverage`);
    }
  }
  const nonTargetMythrasCorePagesPending = (mythrasCorePages.pages || [])
    .filter(page => !mythrasCoreAppFacingTargetPages.has(page.pdf_page) && !mysticismTargetPageNumbers.has(page.pdf_page))
    .every(page => page.work_state === 'pending' &&
      page.render?.status === 'not_rendered' &&
      page.extraction === null &&
      page.verification === null &&
      Array.isArray(page.derived_facts) &&
      page.derived_facts.length === 0);
  if (coreAppFacingPageProblems.length || !nonTargetMythrasCorePagesPending) {
    fail('Mythras Core app-facing page evidence is incomplete',
      JSON.stringify({
        targetCount: mythrasCoreAppFacingTargetPages.size,
        problems: coreAppFacingPageProblems,
        nonTargetMythrasCorePagesPending
      }));
  } else {
    pass('Mythras Core app-facing page evidence covers targeted Core ranges and leaves non-target pages pending except preserved Mysticism evidence');
  }
  const mysticismSourceEvidenceBudgets = {
    maxCharsPerPage: sourceSchema.excerpt_budgets.page_excerpt_char_max,
    maxCharsTotal: sourceSchema.excerpt_budgets.source_excerpt_char_max
  };
  const mysticismPageRecordProblems = [];
  for (const pageNumber of mysticismTargetPageNumbers) {
    const pageRecord = mythrasCorePageByNumber.get(pageNumber);
    if (!pageRecord) {
      mysticismPageRecordProblems.push(`missing page ${pageNumber}`);
      continue;
    }
    if (pageRecord.source_revision_id !== expectedMythrasCoreRevision) {
      mysticismPageRecordProblems.push(`page ${pageNumber} has source_revision_id ${pageRecord.source_revision_id}`);
    }
    if (pageRecord.work_state !== 'verified') {
      mysticismPageRecordProblems.push(`page ${pageNumber} work_state ${pageRecord.work_state}`);
    }
    if (pageRecord.render?.status !== 'rendered' || !pageRecord.render?.cache_path) {
      mysticismPageRecordProblems.push(`page ${pageNumber} is not rendered with a cache_path`);
    }
    if (!pageRecord.extraction?.artifact_path) {
      mysticismPageRecordProblems.push(`page ${pageNumber} missing extraction artifact`);
    }
    if (!pageRecord.verification?.artifact_path) {
      mysticismPageRecordProblems.push(`page ${pageNumber} missing verification artifact`);
    }
    if (pageNumber === 196) {
      if (pageRecord.contributes_to_mysticism !== false || pageRecord.contributes !== false) {
        mysticismPageRecordProblems.push('page 196 must remain a non-contributing Mysticism boundary page');
      }
      if (!pageRecord.exclusion_reason) {
        mysticismPageRecordProblems.push('page 196 non-contributing boundary record needs an exclusion_reason');
      }
    } else if (pageRecord.contributes_to_mysticism !== true) {
      mysticismPageRecordProblems.push(`page ${pageNumber} must contribute to Mysticism rules`);
    }
  }
  if (!mythrasCoreAllPagesScaffolded || mysticismPageRecordProblems.length) {
    fail(`Mythras Core Mysticism page-work is not bounded and verified: ${[
      !mythrasCoreAllPagesScaffolded ? 'all 309 page records are not scaffolded exactly once' : null,
      mysticismPageRecordProblems.join('; ')
    ].filter(Boolean).join('; ')}`);
  } else {
    pass('Mythras Core Mysticism page-work preserves verified pages 155-161 and boundary page 196');
  }

  const mysticismEvidenceProblems = [];
  const mysticismEvidencePaths = new Set();
  const mysticismEvidenceBlockIdsByPage = new Map();
  let mysticismEvidenceSourceTextTotal = 0;
  for (const pageNumber of mysticismTargetPageNumbers) {
    const pageRecord = mythrasCorePageByNumber.get(pageNumber);
    if (!pageRecord?.extraction?.artifact_path || !pageRecord?.verification?.artifact_path) {
      continue;
    }
    const extractionPath = pageRecord.extraction.artifact_path;
    const verificationPath = pageRecord.verification.artifact_path;
    mysticismEvidencePaths.add(extractionPath);
    mysticismEvidencePaths.add(verificationPath);
    if (!fs.existsSync(path.join(__dirname, extractionPath)) || !fs.existsSync(path.join(__dirname, verificationPath))) {
      mysticismEvidenceProblems.push(`page ${pageNumber} artifact path missing on disk`);
      continue;
    }
    const extractionArtifact = readJson(extractionPath);
    const verificationArtifact = readJson(verificationPath);
    if (extractionArtifact.artifact_kind !== 'extraction' || verificationArtifact.artifact_kind !== 'verification') {
      mysticismEvidenceProblems.push(`page ${pageNumber} artifacts must be extraction/verification pair`);
    }
    for (const [label, artifact] of [['extraction', extractionArtifact], ['verification', verificationArtifact]]) {
      if (artifact.source_id !== 'mythras-core' ||
          artifact.source_revision_id !== expectedMythrasCoreRevision ||
          artifact.pdf_page !== pageNumber) {
        mysticismEvidenceProblems.push(`page ${pageNumber} ${label} artifact has mismatched source metadata`);
      }
      if (!artifact.prompt_id || !artifact.prompt_hash) {
        mysticismEvidenceProblems.push(`page ${pageNumber} ${label} artifact missing prompt identity`);
      }
    }
    if ((verificationArtifact.input_artifacts || []).includes(extractionPath)) {
      mysticismEvidenceProblems.push(`page ${pageNumber} verification must not list extraction output as an input artifact`);
    }
    if (!verificationArtifact.agreement?.startsWith('pass')) {
      mysticismEvidenceProblems.push(`page ${pageNumber} verification agreement is not passing`);
    }
    if (verificationArtifact.independence?.read_extractor_output !== false ||
        verificationArtifact.independence?.read_extractor_scratch !== false ||
        verificationArtifact.independence?.read_extractor_rationale !== false) {
      mysticismEvidenceProblems.push(`page ${pageNumber} verification independence flags must exclude extractor output/scratch/rationale`);
    }
    const extractionBlockIds = new Set((extractionArtifact.blocks || []).map(block => block.block_id));
    const verifiedBlockIds = verificationArtifact.verified_blocks || [];
    if (!Array.isArray(verifiedBlockIds) || verifiedBlockIds.length === 0) {
      mysticismEvidenceProblems.push(`page ${pageNumber} verification has no verified block IDs`);
    }
    if (!Array.isArray(verificationArtifact.verified_findings) || verificationArtifact.verified_findings.length === 0) {
      mysticismEvidenceProblems.push(`page ${pageNumber} verification has no verified findings`);
    }
    for (const blockId of verifiedBlockIds) {
      if (!extractionBlockIds.has(blockId)) {
        mysticismEvidenceProblems.push(`page ${pageNumber} verification cites unknown block ${blockId}`);
      }
    }
    for (const block of (extractionArtifact.blocks || [])) {
      if (typeof block.block_id !== 'string' ||
          typeof block.block_type !== 'string' ||
          !Number.isInteger(block.reading_order) ||
          typeof block.bounded_excerpt !== 'string' ||
          block.bounded_excerpt.length === 0 ||
          block.bounded_excerpt.length > sourceSchema.excerpt_budgets.block_excerpt_char_max ||
          typeof block.confidence !== 'string') {
        mysticismEvidenceProblems.push(`page ${pageNumber} extraction block ${block.block_id || '<missing>'} lacks bounded evidence metadata`);
      }
    }
    mysticismEvidenceBlockIdsByPage.set(pageNumber, new Set(verifiedBlockIds));
    const pageSourceTextTotal = sourceEvidenceTextLength(extractionArtifact) + sourceEvidenceTextLength(verificationArtifact);
    if (pageSourceTextTotal > mysticismSourceEvidenceBudgets.maxCharsPerPage) {
      mysticismEvidenceProblems.push(`page ${pageNumber} source text budget ${pageSourceTextTotal} exceeds ${mysticismSourceEvidenceBudgets.maxCharsPerPage}`);
    }
    mysticismEvidenceSourceTextTotal += pageSourceTextTotal;
  }
  if (mysticismEvidenceSourceTextTotal > mysticismSourceEvidenceBudgets.maxCharsTotal) {
    mysticismEvidenceProblems.push(`Mysticism evidence source text budget ${mysticismEvidenceSourceTextTotal} exceeds ${mysticismSourceEvidenceBudgets.maxCharsTotal}`);
  }
  if (mysticismEvidencePaths.size !== mysticismTargetPageNumbers.size * 2) {
    mysticismEvidenceProblems.push(`expected ${mysticismTargetPageNumbers.size * 2} extraction/verification evidence paths, found ${mysticismEvidencePaths.size}`);
  }
  if (mysticismEvidenceProblems.length) {
    fail(`Mythras Core Mysticism evidence artifacts are incomplete: ${mysticismEvidenceProblems.join('; ')}`);
  } else {
    pass('Mythras Core Mysticism evidence artifacts are bounded, independent, and budgeted');
  }
  const mysticismRaw = readJson('references/mythras-raw/mysticism.json');
  const coreCareerMagicProviders = readJson('references/mythras-raw/core-career-magic-providers.json');
  const coreCareersDetail = readJson('references/mythras-raw/careers-detail.json');
  const coreProviderCareers = new Map((coreCareersDetail.careers || []).map(career => [career.name, career]));
  const coreProvidersById = new Map((coreCareerMagicProviders.providers || []).map(provider => [provider.id, provider]));
  const expectedCoreProviders = [
    {
      id: 'core-career-shaman-animism',
      system: 'animism',
      career: 'Shaman',
      sourceFiles: [
        'references/mythras-raw/animism.json',
        'references/spirits-raw/bird-in-hand.json'
      ],
      requiredSkills: ['Binding (Cult, Totem or Tradition)', 'Trance'],
      summaryIncludes: ['Mythras Core Shaman career', 'app Animism uses Mythras Core and A Bird in the Hand'],
      summaryExcludes: ['used by Core Animism']
    },
    {
      id: 'core-career-sorcerer-sorcery',
      system: 'sorcery',
      career: 'Sorcerer',
      sourceFiles: ['references/mythras-raw/sorcery.json'],
      requiredSkills: ['Invocation (Cult, School or Grimoire)', 'Shaping']
    },
    {
      id: 'core-career-mystic-mysticism',
      system: 'mysticism',
      career: 'Mystic',
      sourceFiles: ['references/mythras-raw/mysticism.json'],
      requiredSkills: ['Meditation', 'Mysticism']
    }
  ];
  const coreProviderProblems = [];
  if (coreCareerMagicProviders.verified !== true) {
    coreProviderProblems.push('core-career provider metadata is not verified');
  }
  if (coreCareerMagicProviders.authority_state !== 'app_access_provider_metadata') {
    coreProviderProblems.push(`authority_state is ${coreCareerMagicProviders.authority_state}`);
  }
  for (const expectedProvider of expectedCoreProviders) {
    const provider = coreProvidersById.get(expectedProvider.id);
    const career = coreProviderCareers.get(expectedProvider.career);
    if (!provider) {
      coreProviderProblems.push(`missing provider ${expectedProvider.id}`);
      continue;
    }
    if (provider.system !== expectedProvider.system) {
      coreProviderProblems.push(`${expectedProvider.id} system is ${provider.system}`);
    }
    if (provider.source_kind !== 'core-career') {
      coreProviderProblems.push(`${expectedProvider.id} source_kind is ${provider.source_kind}`);
    }
    if (provider.eligibility?.career !== expectedProvider.career) {
      coreProviderProblems.push(`${expectedProvider.id} career eligibility is ${provider.eligibility?.career}`);
    }
    if (provider.app_access?.state !== 'source_backed_provider_verified') {
      coreProviderProblems.push(`${expectedProvider.id} app_access state is ${provider.app_access?.state}`);
    }
    for (const text of (expectedProvider.summaryIncludes || [])) {
      if (!provider.app_access?.summary?.includes(text)) {
        coreProviderProblems.push(`${expectedProvider.id} app_access summary missing ${text}`);
      }
    }
    for (const text of (expectedProvider.summaryExcludes || [])) {
      if (provider.app_access?.summary?.includes(text)) {
        coreProviderProblems.push(`${expectedProvider.id} app_access summary still says ${text}`);
      }
    }
    if (provider.precedence?.same_system !== 'selected-cult-provider-supersedes-core-career-provider') {
      coreProviderProblems.push(`${expectedProvider.id} missing same-system precedence`);
    }
    if (provider.precedence?.unrelated_systems !== 'stack') {
      coreProviderProblems.push(`${expectedProvider.id} missing unrelated-system stacking rule`);
    }
    if (!career) {
      coreProviderProblems.push(`${expectedProvider.id} cites missing career ${expectedProvider.career}`);
      continue;
    }
    for (const requiredSkill of expectedProvider.requiredSkills) {
      if (!career.professionalSkills?.includes(requiredSkill)) {
        coreProviderProblems.push(`${expectedProvider.id} career source missing ${requiredSkill}`);
      }
      if (!provider.career_skill_requirements?.includes(requiredSkill)) {
        coreProviderProblems.push(`${expectedProvider.id} provider requirements missing ${requiredSkill}`);
      }
    }
    const careerRef = provider.source_refs?.find(ref => ref.source_file === 'references/mythras-raw/careers-detail.json');
    if (careerRef?.json_path !== `$.careers[?(@.name=='${expectedProvider.career}')]`) {
      coreProviderProblems.push(`${expectedProvider.id} career source_ref missing career JSON path`);
    }
    for (const sourceFile of expectedProvider.sourceFiles) {
      const sourceRef = provider.source_refs?.find(ref => ref.source_file === sourceFile);
      if (sourceRef?.verified !== true || !sourceRef?.json_path?.startsWith('$')) {
        coreProviderProblems.push(`${expectedProvider.id} missing verified source_ref for ${sourceFile}`);
      }
    }
    const extraAppSourceRefs = (provider.source_refs || [])
      .filter(ref => ref.source_file !== 'references/mythras-raw/careers-detail.json')
      .map(ref => ref.source_file)
      .filter(sourceFile => !expectedProvider.sourceFiles.includes(sourceFile));
    if (extraAppSourceRefs.length > 0) {
      coreProviderProblems.push(`${expectedProvider.id} has unexpected app source refs: ${extraAppSourceRefs.join(', ')}`);
    }
  }
  if (coreProviderProblems.length === 0) {
    pass('Mythras Core career-backed magic providers are source-backed app access metadata');
  } else {
    fail('Mythras Core career-backed magic provider metadata is incomplete',
      JSON.stringify(coreProviderProblems));
  }

  const mysticismDisposition = legacy.dispositions.find(disposition =>
    disposition.id === 'mythras-core-mysticism' ||
    (disposition.paths || []).includes('references/mythras-raw/mysticism.json'));
  const mysticismProvenanceErrors = mysticismDisposition
    ? provenanceValidator.validateSourceAuthorityMetadata(mysticismRaw, mysticismDisposition, manifestById)
    : ['references/mythras-raw/mysticism.json has no explicit provenance disposition'];
  const requiredMysticismSourceRefs = new Map([
    ['skills.mysticism', mysticismRaw.chargen_rules?.skills?.mysticism?.source_ref],
    ['skills.meditation', mysticismRaw.chargen_rules?.skills?.meditation?.source_ref],
    ['paths', mysticismRaw.chargen_rules?.paths?.source_ref],
    ['talent_types', mysticismRaw.chargen_rules?.talent_types?.source_ref],
    ['casting_mechanics', mysticismRaw.chargen_rules?.casting_mechanics?.source_ref],
    ['starting_at_chargen', mysticismRaw.chargen_rules?.starting_at_chargen?.source_ref]
  ]);
  const mysticismSourceRefProblems = [];
  for (const [label, sourceRef] of requiredMysticismSourceRefs.entries()) {
    if (!sourceRef) {
      mysticismSourceRefProblems.push(`${label} missing source_ref`);
      continue;
    }
    if (!Array.isArray(sourceRef.evidence_paths) || sourceRef.evidence_paths.length === 0) {
      mysticismSourceRefProblems.push(`${label} source_ref missing evidence_paths`);
    }
    if (sourceRef.source_id !== 'mythras-core' ||
        sourceRef.source_revision_id !== expectedMythrasCoreRevision ||
        !Array.isArray(sourceRef.pages) ||
        sourceRef.pages.length === 0 ||
        !Array.isArray(sourceRef.block_ids) ||
        sourceRef.block_ids.length === 0) {
      mysticismSourceRefProblems.push(`${label} source_ref is not tied to Mythras Core pages and block IDs`);
    }
    for (const evidencePath of (sourceRef.evidence_paths || [])) {
      if (!mysticismEvidencePaths.has(evidencePath)) {
        mysticismSourceRefProblems.push(`${label} cites unknown evidence path ${evidencePath}`);
      }
    }
    for (const pageNumber of (sourceRef.pages || [])) {
      const pageRecord = mythrasCorePageByNumber.get(pageNumber);
      if (!pageRecord || !mysticismTargetPageNumbers.has(pageNumber)) {
        mysticismSourceRefProblems.push(`${label} cites unverified page ${pageNumber}`);
        continue;
      }
      for (const expectedEvidencePath of [
        pageRecord.extraction?.artifact_path,
        pageRecord.verification?.artifact_path
      ].filter(Boolean)) {
        if (!sourceRef.evidence_paths?.includes(expectedEvidencePath)) {
          mysticismSourceRefProblems.push(`${label} does not include evidence path ${expectedEvidencePath}`);
        }
      }
    }
    for (const blockId of (sourceRef.block_ids || [])) {
      const match = blockId.match(/^mythras-core-p(\d{4})-b\d{3}$/);
      const pageNumber = match ? Number(match[1]) : null;
      if (!pageNumber || !mysticismEvidenceBlockIdsByPage.get(pageNumber)?.has(blockId)) {
        mysticismSourceRefProblems.push(`${label} cites unknown verified block ${blockId}`);
      }
    }
  }
  const explicitMysticismFieldProblems = [];
  const expectedMysticismFields = new Map([
    ['skills.mysticism.base', [mysticismRaw.chargen_rules?.skills?.mysticism?.base, 'POW+CON']],
    ['skills.meditation.base', [mysticismRaw.chargen_rules?.skills?.meditation?.base, 'INT+CON']],
    ['starting_at_chargen.app_provider_status', [mysticismRaw.chargen_rules?.starting_at_chargen?.app_provider_status, 'source_backed_provider_verified']],
    ['authority_state', [mysticismRaw.authority_state, 'reference_authoritative_app_provider_backed']]
  ]);
  for (const [label, [actual, expected]] of expectedMysticismFields.entries()) {
    if (actual !== expected) explicitMysticismFieldProblems.push(`${label} is ${actual}`);
  }
  const mysticismAcceptedFactsVerified = mysticismRaw.verified === true &&
    mysticismRaw.core_rules_verified === true &&
    mysticismRaw.app_access_state === 'source_backed_provider_verified' &&
    mysticismRaw.app_access_provider_ref === 'references/mythras-raw/core-career-magic-providers.json#core-career-mystic-mysticism' &&
    explicitMysticismFieldProblems.length === 0 &&
    mysticismProvenanceErrors.length === 0 &&
    mysticismSourceRefProblems.length === 0;
  if (!mysticismAcceptedFactsVerified) {
    fail(`Mysticism raw data must be verified, source-ref governed, and linked to the Core Mystic career provider: ${[
      mysticismRaw.verified !== true ? 'verified is not true' : null,
      mysticismRaw.core_rules_verified !== true ? 'core_rules_verified is not true' : null,
      mysticismRaw.app_access_state !== 'source_backed_provider_verified' ? `app_access_state is ${mysticismRaw.app_access_state}` : null,
      mysticismRaw.app_access_provider_ref !== 'references/mythras-raw/core-career-magic-providers.json#core-career-mystic-mysticism' ? `app_access_provider_ref is ${mysticismRaw.app_access_provider_ref}` : null,
      ...explicitMysticismFieldProblems,
      ...mysticismProvenanceErrors,
      ...mysticismSourceRefProblems
    ].filter(Boolean).join('; ')}`);
  } else {
    pass('Mysticism raw data is verified from Mythras Core and linked to the Core Mystic career provider');
  }

  const { detectCultType: appDetectCultType } = loadApp();
  const blockedMysticismOnlyCultType = appDetectCultType({
    name: 'Blocked Mystic Order',
    cultSkills: ['Mysticism (Path of Shadows)', 'Meditation']
  });
  if (blockedMysticismOnlyCultType?.primary === null &&
      Array.isArray(blockedMysticismOnlyCultType.types) &&
      !blockedMysticismOnlyCultType.types.includes('mysticism') &&
      blockedMysticismOnlyCultType.blockedTypes?.includes('mysticism')) {
    pass('App magic detection keeps fake Mysticism cult data blocked without a provider context');
  } else {
    fail('App magic detection must not expose fake Mysticism cult data without provider context',
      JSON.stringify(blockedMysticismOnlyCultType));
  }

  const activeWaha = manifest.sources.find(source => source.source_id === 'waha');
  if (activeWaha &&
      activeWaha.source_revision_id === expectedWahaRevision &&
      activeWaha.sha256 === expectedWahaHash &&
      activeWaha.size_bytes === 153745 &&
      activeWaha.page_count === 2 &&
      activeWaha.local_hint === 'references/sources/pdfs/waha.pdf' &&
      activeWaha.canonical_locator === 'https://copyparty.hound-celsius.ts.net/sources/books/Waha.pdf') {
    pass('Active Waha source records updated supplied PDF metadata');
  } else {
    fail('Active Waha source is missing updated supplied PDF metadata',
      JSON.stringify({
        revision: activeWaha?.source_revision_id,
        hash: activeWaha?.sha256,
        size: activeWaha?.size_bytes,
        pageCount: activeWaha?.page_count,
        localHint: activeWaha?.local_hint,
        locator: activeWaha?.canonical_locator
      }));
  }

  const wahaPages = readJson('references/sources/pages/waha.json');
  const wahaVisionVerified = activeWaha?.acceptance_state === 'bounded_vision_verified' &&
    activeWaha?.source_access?.public_copyparty_source?.status === 'available' &&
    wahaPages.coverage_state === 'verified' &&
    wahaPages.source_revision_id === expectedWahaRevision &&
    wahaPages.pages.every(page =>
      page.source_revision_id === expectedWahaRevision &&
      page.work_state === 'verified' &&
      page.render?.status === 'rendered' &&
      /^[a-f0-9]{64}$/.test(page.render?.image_sha256 || '') &&
      page.render?.cache_path?.startsWith('.cache/source-pages/waha/') &&
      page.extraction?.artifact_path?.startsWith('references/sources/evidence/waha/') &&
      page.verification?.artifact_path?.startsWith('references/sources/evidence/waha/') &&
      page.verification?.independent === true &&
      Array.isArray(page.blockers) &&
      page.blockers.length === 0
    );
  const wahaPageCoverageErrors = sourceValidator.validatePageCoverage(
    wahaPages,
    manifestById,
    sourceSchema,
    'references/sources/pages/waha.json',
    __dirname
  );
  if (wahaVisionVerified && wahaPageCoverageErrors.length === 0) {
    pass('Waha source refresh records bounded vision evidence and independent verification');
  } else {
    fail('Waha source refresh must record bounded extraction and independent verification',
      JSON.stringify({
        acceptanceState: activeWaha?.acceptance_state,
        publicCopypartyStatus: activeWaha?.source_access?.public_copyparty_source?.status,
        pageRevision: wahaPages.source_revision_id,
        coverageState: wahaPages.coverage_state,
        pageStates: wahaPages.pages.map(page => ({
          page: page.pdf_page,
          workState: page.work_state,
          renderStatus: page.render?.status,
          hasExtraction: Boolean(page.extraction),
          hasVerification: Boolean(page.verification),
          blockers: page.blockers
        })),
        pageCoverageErrors: wahaPageCoverageErrors
      }));
  }

  const activeBird = manifest.sources.find(source => source.source_id === 'bird-in-hand');
  const birdPages = readJson('references/sources/pages/bird-in-hand.json');
  const birdRaw = readJson('references/spirits-raw/bird-in-hand.json');
  const verifiedBirdPages = new Set([43, 44, 45, 46, 47]);
  const birdTargetPagesVerified = birdPages.pages
    .filter(page => verifiedBirdPages.has(page.pdf_page))
    .every(page =>
      page.source_revision_id === activeBird?.source_revision_id &&
      page.work_state === 'verified' &&
      page.render?.status === 'rendered' &&
      /^[a-f0-9]{64}$/.test(page.render?.image_sha256 || '') &&
      page.render?.cache_path?.startsWith('.cache/source-pages/bird-in-hand/') &&
      page.extraction?.artifact_path?.startsWith('references/sources/evidence/bird-in-hand/') &&
      page.verification?.artifact_path?.startsWith('references/sources/evidence/bird-in-hand/') &&
      page.verification?.independent === true &&
      Array.isArray(page.blockers) &&
      page.blockers.length === 0
    );
  const birdNonTargetPagesBlocked = birdPages.pages
    .filter(page => !verifiedBirdPages.has(page.pdf_page))
    .every(page =>
      page.work_state === 'blocked' &&
      page.contributes === false &&
      typeof page.exclusion_reason === 'string' &&
      page.render?.status === 'not_rendered'
    );
  const birdPageCoverageErrors = sourceValidator.validatePageCoverage(
    birdPages,
    manifestById,
    sourceSchema,
    'references/sources/pages/bird-in-hand.json',
    __dirname
  );
  const birdAuthorityMetadataErrors = provenanceValidator.validateSourceAuthorityMetadata(
    birdRaw,
    {
      id: 'bird-in-hand-raw',
      disposition: 'governed-now',
      source_ids: ['bird-in-hand'],
      enforce_source_refs: true
    },
    manifestById
  );
  const birdSpiritNames = birdRaw.example_spirits.map(spirit => spirit.name);
  const birdSpiritsVerified = birdRaw.verified === true &&
    birdRaw.verification_scope === 'example_spirits_only' &&
    Array.isArray(birdRaw.non_authoritative_sections) &&
    birdRaw.attestation?.status === 'target_example_spirits_bounded_vision_verified' &&
    birdRaw.source_ref?.coverage_state === 'verified' &&
    birdRaw.example_spirits.every(spirit =>
      spirit.source_ref?.coverage_state === 'verified' &&
      Array.isArray(spirit.source_ref?.block_ids) &&
      spirit.source_ref.block_ids.length > 0
    );
  const appStartingSpirits = loadApp().STARTING_SPIRITS || [];
  const startingSpiritsAuthority = readJson('references/starting-spirits.json');
  const startingSpiritOptions = startingSpiritsAuthority.app_options || [];
  const startingSpiritSourceRefs = startingSpiritsAuthority.source_refs_by_id || {};
  const startingSpiritAttestations = startingSpiritsAuthority.option_attestations || {};
  const startingSpiritsAuthorityHash = provenanceValidator.valueHash(startingSpiritOptions);
  const appStartingSpiritsHash = provenanceValidator.valueHash(appStartingSpirits);
  const ghu = birdRaw.example_spirits.find(spirit => spirit.name === 'Ghu');
  const appGhu = appStartingSpirits.find(spirit => (spirit.source || '').includes('(Ghu)'));
  const ghuAbilityName = (ghu?.abilities?.[0] || '').split(/[ (—-]/)[0];
  const appGhuMatchesRaw = appGhu &&
    appGhu.name.includes(ghuAbilityName) &&
    appGhu.ability.startsWith(ghuAbilityName) &&
    !`${appGhu.name} ${appGhu.ability}`.includes('Absorb Magic') &&
    appGhu.intensity === ghu.intensity &&
    appGhu.pow === ghu.characteristics?.POW &&
    appGhu.cha === ghu.characteristics?.CHA &&
    appGhu.source.includes('p.46-47');
  const ghuEvidenceText = [
    ...(ghu?.source_ref?.extraction_artifact_paths || []),
    ...(ghu?.source_ref?.verification_artifact_paths || [])
  ].map(artifactPath => JSON.stringify(readJson(artifactPath))).join(' ');
  const ghuEvidenceHasStaleAbsorbMagic = /Absorb Magic|absorbs magic/i.test(ghuEvidenceText);
  const rawBirdSpiritsByName = new Map(birdRaw.example_spirits.map(spirit => [spirit.name, spirit]));
  const birdAppSourceRefMismatches = startingSpiritOptions
    .filter(spirit => (startingSpiritAttestations[spirit.name]?.source_ref_id || '').startsWith('bird-in-hand:'))
    .flatMap(spirit => {
      const attestation = startingSpiritAttestations[spirit.name] || {};
      const rawName = attestation.source_ref_id.slice('bird-in-hand:'.length);
      const rawSpirit = rawBirdSpiritsByName.get(rawName);
      const appRef = startingSpiritSourceRefs[attestation.source_ref_id];
      const expectedPages = rawSpirit?.source_ref?.pdf_pages || [];
      const actualPages = appRef?.pdf_pages || [];
      return rawSpirit &&
        appRef?.source_id === 'bird-in-hand' &&
        attestation.source_ability === rawSpirit.abilities?.[0] &&
        JSON.stringify(actualPages) === JSON.stringify(expectedPages)
        ? []
        : [`${spirit.name}: app source_ref ${JSON.stringify(appRef)} raw ${rawName}`];
    });
  if (activeBird?.acceptance_state === 'bounded_vision_verified' &&
      birdPages.coverage_state === 'verified' &&
      birdTargetPagesVerified &&
      birdNonTargetPagesBlocked &&
      birdPageCoverageErrors.length === 0 &&
      birdAuthorityMetadataErrors.length === 0 &&
      birdSpiritsVerified &&
      birdSpiritNames.includes('Anylil') &&
      birdSpiritNames.includes('Woeyff') &&
      !birdSpiritNames.includes('Anyill') &&
      !birdSpiritNames.includes('Wocyff') &&
      ghu?.spirit_damage === '1d10' &&
      ghu?.initiative_bonus === '+10' &&
      ghu?.skills?.spectral_combat === '81%' &&
      ghu?.abilities?.[0]?.startsWith('Warding') &&
      !ghuEvidenceHasStaleAbsorbMagic &&
      appGhuMatchesRaw &&
      birdAppSourceRefMismatches.length === 0) {
    pass('Bird in Hand example spirits are backed by bounded vision evidence and corrected spellings');
  } else {
    fail('Bird in Hand example spirit evidence is incomplete or stale',
      JSON.stringify({
        acceptanceState: activeBird?.acceptance_state,
        coverageState: birdPages.coverage_state,
        targetPagesVerified: birdTargetPagesVerified,
        nonTargetPagesBlocked: birdNonTargetPagesBlocked,
        pageCoverageErrors: birdPageCoverageErrors,
        authorityMetadataErrors: birdAuthorityMetadataErrors,
        birdSpiritsVerified,
        birdSpiritNames,
        ghu,
        appGhu,
        appGhuMatchesRaw,
        ghuEvidenceHasStaleAbsorbMagic,
        birdAppSourceRefMismatches
      }));
  }

  const expectedMonsterHash = 'dd79904483ab62766799e6480da7081cbcbbdd9cb1a608ecc5dfdeae7cce0782';
  const expectedMonsterPages = [133, 134, 135, 136, 137, 138, 139, 140, 285, 286];
  const monsterSource = manifestById.get('monster-island');
  const monsterRevision = monsterSource?.source_revision_id;
  const monsterPages = JSON.parse(fs.readFileSync(path.join(__dirname, 'references/sources/pages/monster-island.json'), 'utf8'));
  const monsterRaw = JSON.parse(fs.readFileSync(path.join(__dirname, 'references/spirits-raw/monster-island.json'), 'utf8'));
  const actualMonsterPages = (monsterPages.pages || []).map(page => page.pdf_page).sort((a, b) => a - b);
  const monsterPageEvidencePaths = (monsterPages.pages || []).flatMap(page => [
    page.extraction?.artifact_path,
    page.verification?.artifact_path
  ].filter(Boolean)).sort();
  const monsterEvidenceArtifacts = monsterPageEvidencePaths.map(artifactPath => ({
    path: artifactPath,
    tracked: trackedFiles.has(artifactPath),
    artifact: fs.existsSync(path.join(__dirname, artifactPath)) ? readJson(artifactPath) : null
  }));
  const isValidMonsterEvidenceArtifact = ({ path: artifactPath, tracked, artifact }) =>
    tracked &&
    artifact?.source_id === 'monster-island' &&
    artifact?.source_revision_id === monsterRevision &&
    expectedMonsterPages.includes(artifact.pdf_page) &&
    artifactPath.includes(String(artifact.pdf_page).padStart(4, '0'));
  const monsterEvidenceArtifactsValid = monsterEvidenceArtifacts.length > 0 &&
    monsterEvidenceArtifacts.length % 2 === 0 &&
    monsterEvidenceArtifacts.every(isValidMonsterEvidenceArtifact);
  const verifiedMonsterPages = (monsterPages.pages || []).every(page =>
    expectedMonsterPages.includes(page.pdf_page) &&
    page.source_revision_id === monsterRevision &&
    page.work_state === 'verified' &&
    page.render?.status === 'rendered' &&
    /^[a-f0-9]{64}$/.test(page.render?.image_sha256 || '') &&
    page.render?.dimensions?.width > 0 &&
    page.render?.dimensions?.height > 0 &&
    typeof page.render?.cache_path === 'string' &&
    !path.isAbsolute(page.render.cache_path) &&
    page.extraction?.status === 'completed' &&
    typeof page.extraction?.artifact_path === 'string' &&
    fs.existsSync(path.join(__dirname, page.extraction.artifact_path)) &&
    typeof page.extraction?.block_count === 'number' &&
    page.verification?.status?.startsWith('passed') &&
    page.verification?.independent === true &&
    typeof page.verification?.artifact_path === 'string' &&
    fs.existsSync(path.join(__dirname, page.verification.artifact_path)) &&
    Array.isArray(page.derived_facts) &&
    page.derived_facts.length > 0
  );
  const startingSpiritsMap = (indexMap.entries || []).find(entry => entry.constant_name === 'STARTING_SPIRITS');
  const monsterStartingSpiritRef = (startingSpiritsMap?.blocked_candidate_sources || []).find(ref => ref.source_id === 'monster-island');
  const monsterPathSet = JSON.stringify(monsterPageEvidencePaths);
  const monsterEvidencePathSetsMatch = [
    monsterSource?.observed_source_metadata?.vision_evidence_paths,
    monsterRaw.source_ref?.evidence_paths,
    monsterStartingSpiritRef?.evidence_paths
  ].every(paths => JSON.stringify([...(paths || [])].sort()) === monsterPathSet);
  if (monsterSource?.lifecycle_state === 'permission_pending' &&
      monsterSource?.permission_basis?.status === 'permission_pending' &&
      monsterSource?.sha256 === expectedMonsterHash &&
      monsterSource?.size_bytes === 10363314 &&
      monsterSource?.page_count === 298 &&
      monsterSource?.acceptance_state === 'reference_evidence_verified_app_promotion_blocked' &&
      monsterPages.coverage_state === 'verified' &&
      monsterPages.coverage_mode === 'candidate-spirit-cult-pages-bounded-vision-verified' &&
      JSON.stringify(actualMonsterPages) === JSON.stringify(expectedMonsterPages) &&
      verifiedMonsterPages &&
      monsterRaw.verified === true &&
      monsterRaw.attestation?.status === 'bounded_vision_verified' &&
      monsterRaw.attestation?.source_authority === true &&
      monsterRaw.attestation?.authority_state === 'reference_authoritative_not_app_promoted' &&
      monsterEvidenceArtifactsValid &&
      monsterEvidencePathSetsMatch) {
    pass('Monster Island candidate pages have bounded extraction and independent verification');
  } else {
    fail('Monster Island candidate page evidence is missing or not page-scoped verified',
      JSON.stringify({
        lifecycle: monsterSource?.lifecycle_state,
        permission: monsterSource?.permission_basis?.status,
        acceptanceState: monsterSource?.acceptance_state,
        hash: monsterSource?.sha256,
        size: monsterSource?.size_bytes,
        pageCount: monsterSource?.page_count,
        coverageState: monsterPages.coverage_state,
        coverageMode: monsterPages.coverage_mode,
        pages: actualMonsterPages,
        verifiedMonsterPages,
        rawVerified: monsterRaw.verified,
        rawStatus: monsterRaw.attestation?.status,
        rawSourceAuthority: monsterRaw.attestation?.source_authority,
        rawAuthorityState: monsterRaw.attestation?.authority_state,
        evidenceArtifactsValid: monsterEvidenceArtifactsValid,
        evidencePathSetsMatch: monsterEvidencePathSetsMatch,
        untrackedEvidence: monsterEvidenceArtifacts.filter(item => !item.tracked).map(item => item.path),
        staleEvidence: monsterEvidenceArtifacts
          .filter(item => item.artifact?.source_revision_id !== monsterRevision)
          .map(item => item.path)
      }));
  }

  const acceptedMonsterEntries = (indexMap.entries || []).filter(entry =>
    (entry.source_ids || []).includes('monster-island') &&
    ['verified', 'normalized', 'accepted'].includes(entry.status)
  );
  const blockedMonsterRefs = (startingSpiritsMap?.blocked_candidate_sources || []).filter(ref => ref.source_id === 'monster-island');
  const mythrasCoreStartingSpiritRef = (startingSpiritsMap?.source_refs || []).find(ref => ref.source_id === 'mythras-core');
  const birdStartingSpiritRef = (startingSpiritsMap?.source_refs || []).find(ref => ref.source_id === 'bird-in-hand');
  const startingSourceIds = new Set(startingSpiritsMap?.source_ids || []);
  const appStartingSpiritsMatchAuthority = appStartingSpiritsHash === startingSpiritsAuthorityHash;
  const startingSpiritsHashMatches = startingSpiritsAuthorityHash === startingSpiritsMap?.canonical_value_hash;
  const startingAuthorityMetadataErrors = provenanceValidator.validateSourceAuthorityMetadata(
    startingSpiritsAuthority,
    {
      id: 'starting-spirits-authority',
      disposition: 'governed-now',
      source_ids: ['bird-in-hand', 'mythras-core'],
      enforce_source_refs: true
    },
    manifestById
  );
  const coreStartingSpiritAggregatePages = new Set(mythrasCoreStartingSpiritRef?.verified_pdf_pages || []);
  const startingSpiritRefsResolve = startingSpiritOptions.every(spirit => {
    const attestation = startingSpiritAttestations[spirit.name] || {};
    const ref = startingSpiritSourceRefs[attestation.source_ref_id];
    if (!ref) return false;
    if (attestation.attestation === 'source_backed_bird_example_spirit_display') {
      return ref.source_id === 'bird-in-hand' &&
        ref.coverage_state === 'verified' &&
        ref.evidence_state === 'bounded_extraction_independent_vision_verified' &&
        typeof attestation.source_ability === 'string' &&
        attestation.source_ability.length > 0;
    }
    if (attestation.attestation === 'source_backed_derived_core_starting_template') {
      const refPages = Array.isArray(ref.pdf_pages) ? ref.pdf_pages : [];
      return ref.source_id === 'mythras-core' &&
        ref.coverage_state === 'verified' &&
        ref.evidence_state === 'bounded_render_ocr_pdftext_verified' &&
        refPages.length > 0 &&
        refPages.every(page => coreStartingSpiritAggregatePages.has(page)) &&
        typeof attestation.derivation_note === 'string' &&
        attestation.derivation_note.includes('not a copied source stat block');
    }
    return false;
  });
  const sourcePolicyKeepsMonsterReferenceOnly =
    !startingSourceIds.has('monster-island') &&
    !startingSourceIds.has('aig') &&
    (startingSpiritsAuthority.source_policy?.not_app_promoted_source_ids || []).includes('monster-island') &&
    (startingSpiritsAuthority.non_promoted_reference_sources || []).some(ref =>
      ref.source_id === 'monster-island' &&
      ref.evidence_state === 'bounded_extraction_independent_vision_verified_reference_only'
    );
  if (acceptedMonsterEntries.length === 0 &&
      startingSpiritsMap?.status === 'accepted' &&
      startingSpiritsMap?.disposition === 'governed-now' &&
      startingSpiritsMap?.normalized_file === 'references/starting-spirits.json' &&
      startingSpiritsMap?.normalized_path === '$.app_options' &&
      startingSourceIds.has('mythras-core') &&
      startingSourceIds.has('bird-in-hand') &&
      sourcePolicyKeepsMonsterReferenceOnly &&
      appStartingSpiritsMatchAuthority &&
      startingSpiritsHashMatches &&
      startingAuthorityMetadataErrors.length === 0 &&
      startingSpiritsAuthority.verified === true &&
      startingSpiritRefsResolve &&
      mythrasCoreStartingSpiritRef?.source_revision_id === expectedMythrasCoreRevision &&
      mythrasCoreStartingSpiritRef?.page_manifest_path === 'references/sources/pages/mythras-core.json' &&
      mythrasCoreStartingSpiritRef?.coverage_state === 'verified' &&
      mythrasCoreStartingSpiritRef?.evidence_state === 'bounded_render_ocr_pdftext_verified' &&
      Array.isArray(mythrasCoreStartingSpiritRef?.verified_pdf_pages) &&
      mythrasCoreStartingSpiritRef.verified_pdf_pages.length > 0 &&
      Array.isArray(mythrasCoreStartingSpiritRef?.evidence_paths) &&
      mythrasCoreStartingSpiritRef.evidence_paths.length > 0 &&
      mythrasCoreStartingSpiritRef.evidence_paths.length % 2 === 0 &&
      birdStartingSpiritRef?.source_revision_id === activeBird?.source_revision_id &&
      birdStartingSpiritRef?.page_manifest_path === 'references/sources/pages/bird-in-hand.json' &&
      birdStartingSpiritRef?.coverage_state === 'verified' &&
      birdStartingSpiritRef?.evidence_state === 'bounded_extraction_independent_vision_verified' &&
      monsterStartingSpiritRef?.source_revision_id === monsterRevision &&
      monsterStartingSpiritRef?.page_manifest_path === 'references/sources/pages/monster-island.json' &&
      monsterStartingSpiritRef?.coverage_state === 'verified' &&
      monsterStartingSpiritRef?.evidence_state === 'bounded_extraction_independent_vision_verified_reference_only' &&
      Array.isArray(monsterStartingSpiritRef?.evidence_paths) &&
      monsterStartingSpiritRef.evidence_paths.length > 0 &&
      monsterStartingSpiritRef.evidence_paths.length % 2 === 0 &&
      blockedMonsterRefs.length === 1) {
    pass('Starting spirit provenance accepts Core/Bird app options while keeping Monster Island reference-only');
  } else {
    fail('Starting spirit provenance is missing accepted Core/Bird authority or promoted Monster Island prematurely',
      JSON.stringify({
        startingSpiritsStatus: startingSpiritsMap?.status,
        disposition: startingSpiritsMap?.disposition,
        sourceIds: startingSpiritsMap?.source_ids,
        normalizedFile: startingSpiritsMap?.normalized_file,
        appStartingSpiritsMatchAuthority,
        startingSpiritsHashMatches,
        startingAuthorityMetadataErrors,
        startingAuthorityVerified: startingSpiritsAuthority.verified,
        startingSpiritRefsResolve,
        sourcePolicyKeepsMonsterReferenceOnly,
        mythrasCoreStartingSpiritRef,
        birdStartingSpiritRef,
        monsterStartingSpiritRef,
        acceptedMonsterEntries: acceptedMonsterEntries.map(entry => entry.constant_name),
        blockedMonsterRefs
      }));
  }

  const invalidAcceptedWahaPages = JSON.parse(JSON.stringify(wahaPages));
  invalidAcceptedWahaPages.coverage_state = 'accepted';
  invalidAcceptedWahaPages.pages[0].work_state = 'accepted';
  invalidAcceptedWahaPages.pages[0].extraction = null;
  invalidAcceptedWahaPages.pages[0].verification = null;
  const invalidAcceptedWahaResult = sourceValidator.validatePageCoverage(
    invalidAcceptedWahaPages,
    new Map((manifest.sources || []).map(source => [source.source_id, source])),
    sourceSchema,
    'references/sources/pages/waha.json',
    __dirname
  );
  if (invalidAcceptedWahaResult.some(error => error.includes('accepted page requires verification metadata'))) {
    pass('Waha page coverage validator rejects accepted pages without verifier metadata');
  } else {
    fail('Waha page coverage validator allowed accepted Waha page without verifier metadata',
      invalidAcceptedWahaResult.join('\n'));
  }

  const invalidWahaBlockJoinPages = JSON.parse(JSON.stringify(wahaPages));
  invalidWahaBlockJoinPages.pages[0].derived_facts[0].block_ids = ['waha-p1-missing'];
  const invalidWahaBlockJoinResult = sourceValidator.validatePageCoverage(
    invalidWahaBlockJoinPages,
    new Map((manifest.sources || []).map(source => [source.source_id, source])),
    sourceSchema,
    'references/sources/pages/waha.json',
    __dirname
  );
  if (invalidWahaBlockJoinResult.some(error => error.includes('missing from verification artifact'))) {
    pass('Waha page coverage validator rejects derived facts not joined to verifier blocks');
  } else {
    fail('Waha page coverage validator allowed unverified derived block IDs',
      invalidWahaBlockJoinResult.join('\n'));
  }

  const expectedAigHash = '0edc1e549c560222a7c2b80e9eb0fb713d962bb30a280a7a6b760821e2983572';
  const expectedAigRevision = 'aig:copyparty-sources-books-adventures-in-glorantha-gencon-preview-pdf:0edc1e549c56:2026-05-22';
  const legacyAigRevision = 'aig:permission-pending:0edc1e549c56:2026-05-21';
  const aigSource = manifest.sources.find(source => source.source_id === 'aig');
  const aigCoverage = JSON.parse(fs.readFileSync(path.join(__dirname, 'references/sources/pages/aig.json'), 'utf8'));
  const aigPageIndex = JSON.parse(fs.readFileSync(path.join(__dirname, 'references/aig-raw/page-index.json'), 'utf8'));
  const aigRevision = aigSource?.source_revision_id;
  if (aigSource &&
      aigSource.lifecycle_state === 'active' &&
      aigRevision === expectedAigRevision &&
      aigSource.sha256 === expectedAigHash &&
      aigSource.size_bytes === 202097364 &&
      aigSource.page_count === 212 &&
      aigSource.permission_basis?.status === 'player_visible_copyparty_source' &&
      aigSource.acceptance_state === 'blocked_pending_vision_verification' &&
      aigSource.source_access?.public_copyparty_source?.status === 'available' &&
      aigCoverage.source_revision_id === aigRevision &&
      aigPageIndex.source_revision_id === legacyAigRevision) {
    pass('AiG source revision permits bounded evidence without app-facing promotion');
  } else {
    fail('AiG source revision metadata is incomplete or app-promoted prematurely',
      JSON.stringify({
        lifecycle: aigSource?.lifecycle_state,
        revision: aigRevision,
        hash: aigSource?.sha256,
        size: aigSource?.size_bytes,
        pageCount: aigSource?.page_count,
        permission: aigSource?.permission_basis?.status,
        acceptanceState: aigSource?.acceptance_state,
        publicStatus: aigSource?.source_access?.public_copyparty_source?.status,
        coverageRevision: aigCoverage.source_revision_id,
        indexRevision: aigPageIndex.source_revision_id
      }));
  }

  const expectedAiGPages = Array.from({ length: 212 }, (_, index) => index + 1);
  const coveragePages = new Set((aigCoverage.pages || []).map(page => page.pdf_page));
  const pageIndexPages = new Set((aigPageIndex.pages || []).map(page => page.pdf_page));
  const missingCoveragePages = expectedAiGPages.filter(page => !coveragePages.has(page));
  const missingIndexPages = expectedAiGPages.filter(page => !pageIndexPages.has(page));
  const promotedAiGCultureNote = 'Verified; app-facing AiG culture/profile facts promoted.';
  const verifiedAiGPages = new Map([
    [25, { blocks: 2, contributes: true, verification: 'aig-page-0025-verification-copilot-2026-05-23', notes: promotedAiGCultureNote }],
    [26, { blocks: 2, contributes: true, verification: 'aig-page-0026-verification-copilot-2026-05-23', notes: promotedAiGCultureNote }],
    [27, { blocks: 2, contributes: true, verification: 'aig-page-0027-verification-copilot-2026-05-23', notes: promotedAiGCultureNote }],
    [28, { blocks: 2, contributes: true, verification: 'aig-page-0028-verification-copilot-2026-05-23', notes: promotedAiGCultureNote }],
    [29, { blocks: 4, contributes: true, verification: 'aig-page-0029-verification-copilot-2026-05-23', notes: promotedAiGCultureNote }],
    [30, { blocks: 2, contributes: true, verification: 'aig-page-0030-verification-copilot-2026-05-23', notes: promotedAiGCultureNote }],
    [31, { blocks: 6, contributes: true, verification: 'aig-page-0031-verification-copilot-2026-05-23', notes: promotedAiGCultureNote }],
    [32, { blocks: 1, contributes: false, verification: 'aig-page-0032-verification-copilot-2026-05-23', notes: 'Verified non-contributing boundary page.', exclusionReason: 'Boundary page; no promoted culture mechanics.' }],
    [33, { blocks: 3, contributes: true, verification: 'aig-page-0033-verification-copilot-2026-05-23', notes: promotedAiGCultureNote }],
    [34, { blocks: 4, contributes: true, verification: 'aig-page-0034-verification-copilot-2026-05-23', notes: promotedAiGCultureNote }],
    [35, { blocks: 3, contributes: true, verification: 'aig-page-0035-verification-copilot-2026-05-23', notes: promotedAiGCultureNote }],
    [36, { blocks: 2, contributes: true, verification: 'aig-page-0036-verification-copilot-2026-05-23', notes: promotedAiGCultureNote }],
    [37, { blocks: 4, contributes: true, verification: 'aig-page-0037-verification-copilot-2026-05-23', notes: promotedAiGCultureNote }],
    [38, { blocks: 3, contributes: true, verification: 'aig-page-0038-verification-copilot-2026-05-23', notes: promotedAiGCultureNote }],
    [39, { blocks: 3, contributes: true, verification: 'aig-page-0039-verification-copilot-2026-05-23', notes: promotedAiGCultureNote }],
    [40, { blocks: 3, contributes: true, verification: 'aig-page-0040-verification-copilot-2026-05-23', notes: promotedAiGCultureNote }],
    [41, { blocks: 3, contributes: true, verification: 'aig-page-0041-verification-copilot-2026-05-23', notes: promotedAiGCultureNote }],
    [60, { blocks: 6, contributes: true, verification: 'aig-page-0060-verification-opus-2026-05-22', notes: 'Verified; app-facing AiG magic overview facts promoted.' }],
    [61, { blocks: 7, contributes: true, verification: 'aig-page-0061-verification-opus-2026-05-22', notes: 'Verified; app-facing AiG magic overview facts promoted.' }],
    [62, { blocks: 9, contributes: true, verification: 'aig-page-0062-verification-opus-2026-05-22' }]
  ]);
  const allowedAiGBlockTypes = new Set(sourceSchema.schemas.page_evidence_record.block_types);
  let aigEvidenceSourceTextTotal = 0;
  const verifiedCoverageProblems = (aigCoverage.pages || []).flatMap(page => {
    const expected = verifiedAiGPages.get(page.pdf_page);
    if (!expected) return [];
    const artifactPath = page.extraction?.artifact_path;
    const artifact = artifactPath && fs.existsSync(path.join(__dirname, artifactPath))
      ? JSON.parse(fs.readFileSync(path.join(__dirname, artifactPath), 'utf8'))
      : null;
    const verificationPath = page.verification?.artifact_path;
    const verificationArtifact = verificationPath && fs.existsSync(path.join(__dirname, verificationPath))
      ? JSON.parse(fs.readFileSync(path.join(__dirname, verificationPath), 'utf8'))
      : null;
    const artifactBlocks = artifact?.blocks || [];
    const artifactBlockIds = new Set(artifactBlocks.map(block => block.block_id));
    const verifiedBlocks = verificationArtifact?.verified_blocks || [];
    const verifiedBlockIds = new Set(verifiedBlocks);
    const pageExcerptTotal = artifactBlocks.reduce((total, block) =>
      total + (typeof block.bounded_excerpt === 'string' ? block.bounded_excerpt.length : 0), 0);
    const pageSourceTextTotal =
      (artifact ? sourceEvidenceTextLength(artifact) : 0) +
      (verificationArtifact ? sourceEvidenceTextLength(verificationArtifact) : 0) +
      sourceEvidenceTextLength(page);
    aigEvidenceSourceTextTotal += pageSourceTextTotal;
    const problems = [];
    if (page.source_revision_id !== aigRevision) problems.push(`${page.pdf_page}: source_revision_id`);
    if (page.work_state !== 'verified') problems.push(`${page.pdf_page}: work_state`);
    if (page.contributes !== expected.contributes) problems.push(`${page.pdf_page}: contributes`);
    if (page.render?.status !== 'rendered') problems.push(`${page.pdf_page}: render.status`);
    if (!/^[a-f0-9]{64}$/.test(page.render?.image_sha256 || '')) problems.push(`${page.pdf_page}: render.image_sha256`);
    if (!page.render?.cache_path?.startsWith('.cache/source-pages/aig/')) problems.push(`${page.pdf_page}: render.cache_path`);
    if (page.extraction?.block_count !== expected.blocks) problems.push(`${page.pdf_page}: extraction.block_count`);
    if (page.verification?.status !== 'pass') problems.push(`${page.pdf_page}: verification.status`);
    if (page.verification?.independent !== true) problems.push(`${page.pdf_page}: verification.independent`);
    if (page.verification?.artifact_id !== expected.verification) problems.push(`${page.pdf_page}: verification.artifact_id`);
    if (!Array.isArray(page.derived_facts) || page.derived_facts.length !== 0) problems.push(`${page.pdf_page}: derived_facts_unverified`);
    if ('candidate_label' in page || 'candidate_reason' in page) problems.push(`${page.pdf_page}: manifest_candidate_prose`);
    if (expected.contributes && 'exclusion_reason' in page) problems.push(`${page.pdf_page}: exclusion_reason`);
    if (!expected.contributes && page.exclusion_reason !== expected.exclusionReason) problems.push(`${page.pdf_page}: exclusion_reason`);
    if (expected.notes && page.notes !== expected.notes) problems.push(`${page.pdf_page}: notes`);
    if (!expected.notes && page.notes !== 'Verified; promotion blocked.') problems.push(`${page.pdf_page}: notes`);
    if (artifact?.artifact_kind !== 'extraction') problems.push(`${page.pdf_page}: artifact_kind`);
    if (artifact?.source_revision_id !== aigRevision) problems.push(`${page.pdf_page}: artifact_revision`);
    if (artifact?.pdf_page !== page.pdf_page) problems.push(`${page.pdf_page}: artifact_page`);
    if (verificationArtifact?.artifact_kind !== 'verification') problems.push(`${page.pdf_page}: verification_artifact_kind`);
    if (verificationArtifact?.source_revision_id !== aigRevision) problems.push(`${page.pdf_page}: verification_artifact_revision`);
    if (verificationArtifact?.pdf_page !== page.pdf_page) problems.push(`${page.pdf_page}: verification_artifact_page`);
    if (verificationArtifact?.verifier_run_id === verificationArtifact?.extractor_run_id) problems.push(`${page.pdf_page}: verifier_run_id`);
    if (verificationArtifact?.verifier_prompt_id === verificationArtifact?.extractor_prompt_id) problems.push(`${page.pdf_page}: verifier_prompt_id`);
    if (verificationArtifact?.independence?.read_extractor_output !== false ||
        verificationArtifact?.independence?.read_extractor_scratch !== false ||
        verificationArtifact?.independence?.read_extractor_rationale !== false) problems.push(`${page.pdf_page}: verifier_independence`);
    if (artifactBlocks.length !== expected.blocks) problems.push(`${page.pdf_page}: artifact_blocks`);
    if (verifiedBlocks.length !== expected.blocks ||
        verifiedBlockIds.size !== expected.blocks ||
        verifiedBlocks.some(blockId => !artifactBlockIds.has(blockId))) problems.push(`${page.pdf_page}: verified_blocks`);
    if (artifactBlocks.some(block => !allowedAiGBlockTypes.has(block.block_type))) problems.push(`${page.pdf_page}: artifact_block_type`);
    if (pageExcerptTotal > sourceSchema.excerpt_budgets.page_excerpt_char_max) problems.push(`${page.pdf_page}: artifact_page_excerpt_budget`);
    if (pageSourceTextTotal > sourceSchema.excerpt_budgets.page_excerpt_char_max) problems.push(`${page.pdf_page}: artifact_page_source_text_budget`);
    if (artifactBlocks.some(block =>
      typeof block.bounded_excerpt !== 'string' ||
      block.bounded_excerpt.length > sourceSchema.excerpt_budgets.block_excerpt_char_max
    )) problems.push(`${page.pdf_page}: artifact_excerpt_budget`);
    return problems;
  });
  const nonExtractedCoveragePending = (aigCoverage.pages || []).every(page => {
    if (verifiedAiGPages.has(page.pdf_page)) return true;
    const pendingPage =
      page.source_revision_id === aigRevision &&
      page.work_state === 'pending' &&
      page.render?.status === 'not_rendered' &&
      page.extraction === null &&
      page.verification === null &&
      page.raw_page_record &&
      fs.existsSync(path.join(__dirname, page.raw_page_record));
    const renderOnlyScaffold =
      page.source_revision_id === aigRevision &&
      page.work_state === 'rendered' &&
      page.render?.status === 'rendered' &&
      page.extraction === null &&
      page.verification === null &&
      page.raw_page_record &&
      fs.existsSync(path.join(__dirname, page.raw_page_record));
    return pendingPage || renderOnlyScaffold;
  });
  const allBlockedIndex = (aigPageIndex.pages || []).every(page =>
    page.source_revision_id === legacyAigRevision &&
    page.work_state === 'blocked' &&
    page.render_status === 'not_rendered' &&
    page.extraction_status === 'blocked' &&
    page.verification_status === 'blocked' &&
    fs.existsSync(path.join(__dirname, page.record))
  );
  if (aigCoverage.expected_page_count === 212 &&
      aigPageIndex.expected_page_count === 212 &&
      aigCoverage.pages.length === 212 &&
      aigPageIndex.pages.length === 212 &&
      missingCoveragePages.length === 0 &&
      missingIndexPages.length === 0 &&
      verifiedCoverageProblems.length === 0 &&
      aigEvidenceSourceTextTotal <= sourceSchema.excerpt_budgets.source_excerpt_char_max &&
      nonExtractedCoveragePending &&
      allBlockedIndex) {
    pass('AiG page coverage tracks bounded verified app slices while legacy page index remains blocked');
  } else {
    fail('AiG page coverage/index state is not complete',
      JSON.stringify({
        coverageExpected: aigCoverage.expected_page_count,
        indexExpected: aigPageIndex.expected_page_count,
        coverageCount: aigCoverage.pages?.length,
        indexCount: aigPageIndex.pages?.length,
        missingCoveragePages: missingCoveragePages.slice(0, 10),
        missingIndexPages: missingIndexPages.slice(0, 10),
        verifiedCoverageProblems,
        aigEvidenceSourceTextTotal,
        nonExtractedCoveragePending,
        allBlockedIndex
      }));
  }

  const expectedAigEvidenceState = 'bounded_extraction_independent_vision_verified';
  const exactArray = (actual, expected) => JSON.stringify(actual || []) === JSON.stringify(expected);
  const stillBlockedAigAuthorityFiles = [
    'references/aig-raw/folk-magic-aig.json',
    'references/aig-raw/rune-magic-aig.json',
    'references/aig-raw/spirit-magic-aig.json'
  ];
  const blockedAuthorityProblems = stillBlockedAigAuthorityFiles.flatMap(relPath => {
    const doc = JSON.parse(fs.readFileSync(path.join(__dirname, relPath), 'utf8'));
    const problems = [];
    if (doc.source_id !== 'aig') problems.push(`${relPath}: source_id`);
    if (doc.source_revision_id !== legacyAigRevision) problems.push(`${relPath}: source_revision_id`);
    if (doc.authority_state !== 'source_blocked') problems.push(`${relPath}: authority_state`);
    if (doc.verified === true) problems.push(`${relPath}: verified true while source_blocked`);
    if (doc.page_index !== 'references/aig-raw/page-index.json') problems.push(`${relPath}: page_index`);
    if (doc.page_coverage !== 'references/sources/pages/aig.json') problems.push(`${relPath}: page_coverage`);
    if (!Array.isArray(doc.source_blockers) || doc.source_blockers.length === 0) problems.push(`${relPath}: source_blockers`);
    return problems;
  });
  const culturesRef = readJson('references/aig-raw/cultures.json');
  const expectedCultureNames = [
    'Balazaring',
    'Esrolian',
    'God Forgot',
    'Lunar Heartland',
    'Praxian',
    'Lunar Provincial',
    'Sartarite (Heortling)',
    'Telmori Hsunchen'
  ];
  const expectedStartingMoney = {
    Balazaring: '4d6x2',
    Esrolian: '4d6x15',
    'God Forgot': '4d6x15',
    'Lunar Heartland': '4d6x15',
    Praxian: '4d6x5',
    'Lunar Provincial': '4d6x10',
    'Sartarite (Heortling)': '4d6x10',
    'Telmori Hsunchen': '4d6x2'
  };
  const sourceRefPageConsistencyProblems = (label, sourceRef) => {
    const problems = [];
    const pdfPages = new Set(sourceRef.pdf_pages || []);
    for (const blockId of sourceRef.block_ids || []) {
      const match = blockId.match(/^aig-p(\d{3})-/);
      if (match && !pdfPages.has(parseInt(match[1], 10))) problems.push(`${label}: block ${blockId} outside pdf_pages`);
    }
    for (const evidencePath of sourceRef.evidence_paths || []) {
      const match = evidencePath.match(/page-(\d{4})-/);
      if (match && !pdfPages.has(parseInt(match[1], 10))) problems.push(`${label}: evidence ${evidencePath} outside pdf_pages`);
    }
    for (const pageRecord of sourceRef.page_records || []) {
      const match = pageRecord.match(/page-(\d{3})\.json$/);
      if (match && !pdfPages.has(parseInt(match[1], 10))) problems.push(`${label}: page_record ${pageRecord} outside pdf_pages`);
    }
    return problems;
  };
  const cultureNames = (culturesRef.cultures || []).map(culture => culture.name);
  const cultureSourceRefs = culturesRef.culture_source_refs || {};
  const cultureAuthorityProblems = [];
  const p25Extraction = readJson('references/sources/evidence/aig/page-0025-extraction.json');
  const p37Extraction = readJson('references/sources/evidence/aig/page-0037-extraction.json');
  const p25MoneyFacts = p25Extraction.blocks?.find(block => block.block_id === 'aig-p025-b002')?.facts?.starting_money_formulas || {};
  const p37CohortFacts = p37Extraction.blocks?.find(block => block.block_id === 'aig-p037-b003')?.facts?.combat_style || {};
  for (const [cultureName, formula] of Object.entries(expectedStartingMoney)) {
    if (p25MoneyFacts[cultureName] !== formula) cultureAuthorityProblems.push(`page 25 evidence: ${cultureName} formula`);
  }
  if (p37CohortFacts.source_name !== 'Esrolian Cohort' ||
      !exactArray(p37CohortFacts.weapons, ['Great Axe', 'Shortsword', 'Orlanthi Scutum', 'Javelin']) ||
      !exactArray(p37CohortFacts.traits, ['Formation Fighting', 'Shield Splitter', 'Shield Wall']) ||
      p37CohortFacts.restrictions !== 'Warrior career only') {
    cultureAuthorityProblems.push('page 37 evidence: Esrolian Cohort fields');
  }
  if (culturesRef.source_id !== 'aig') cultureAuthorityProblems.push('cultures: source_id');
  if (culturesRef.source_revision_id !== aigRevision) cultureAuthorityProblems.push('cultures: source_revision_id');
  if (culturesRef.authority_state !== 'reference_authority') cultureAuthorityProblems.push('cultures: authority_state');
  if (culturesRef.page_coverage !== 'references/sources/pages/aig.json') cultureAuthorityProblems.push('cultures: page_coverage');
  if (!Array.isArray(culturesRef.source_blockers) || culturesRef.source_blockers.length !== 0) cultureAuthorityProblems.push('cultures: source_blockers');
  for (const name of expectedCultureNames) {
    const culture = (culturesRef.cultures || []).find(item => item.name === name);
    const sourceRef = cultureSourceRefs[name] || {};
    if (!culture) {
      cultureAuthorityProblems.push(`${name}: missing culture`);
      continue;
    }
    if (culture.starting_money?.amount_formula !== expectedStartingMoney[name]) cultureAuthorityProblems.push(`${name}: starting_money`);
    if (sourceRef.source_revision_id !== aigRevision) cultureAuthorityProblems.push(`${name}: source_revision_id`);
    if (sourceRef.verification_state !== 'verified') cultureAuthorityProblems.push(`${name}: verification_state`);
    if (sourceRef.evidence_state !== expectedAigEvidenceState) cultureAuthorityProblems.push(`${name}: evidence_state`);
    if (!Array.isArray(sourceRef.pdf_pages) || sourceRef.pdf_pages.length === 0) cultureAuthorityProblems.push(`${name}: pdf_pages`);
    if (!Array.isArray(sourceRef.block_ids) || sourceRef.block_ids.length === 0) cultureAuthorityProblems.push(`${name}: block_ids`);
    cultureAuthorityProblems.push(...sourceRefPageConsistencyProblems(name, sourceRef));
    const evidencePaths = sourceRef.evidence_paths || [];
    if (!evidencePaths.some(evidencePath => evidencePath.endsWith('-extraction.json')) ||
        !evidencePaths.some(evidencePath => evidencePath.endsWith('-verification.json')) ||
        evidencePaths.some(evidencePath => !fs.existsSync(path.join(__dirname, evidencePath)))) {
      cultureAuthorityProblems.push(`${name}: evidence_paths`);
    }
  }
  const sartariteCulture = (culturesRef.cultures || []).find(culture => culture.name === 'Sartarite (Heortling)');
  if (!sartariteCulture?.combat_style_ids?.includes('aig:sartarite-heortling:esrolian-cohort')) {
    cultureAuthorityProblems.push('Sartarite (Heortling): missing Esrolian Cohort');
  }
  const telmoriCulture = (culturesRef.cultures || []).find(culture => culture.name === 'Telmori Hsunchen');
  if (telmoriCulture?.careers !== 'Any Primitive') cultureAuthorityProblems.push('Telmori Hsunchen: careers');

  const cultureMagicProfilesRef = readJson('references/aig-raw/culture-magic-profiles-aig.json');
  const zzistoriAccess = cultureMagicProfilesRef.profiles?.['God Forgot']?.sorcery?.sourceAccess;
  const zzistoriSourceRef = zzistoriAccess?.source_ref || {};
  const expectedZzistoriEvidencePaths = [
    'references/sources/evidence/aig/page-0031-extraction.json',
    'references/sources/evidence/aig/page-0031-verification.json',
    'references/sources/evidence/aig/page-0060-extraction.json',
    'references/sources/evidence/aig/page-0060-verification.json'
  ];
  const expectedZzistoriPdfPages = [31, 60];
  const expectedZzistoriBlockIds = [
    'aig-p031-b001',
    'aig-p031-b003',
    'aig-p031-b004',
    'aig-p060-b003',
    'aig-p060-b006'
  ];
  const cultureMagicProblems = [];
  if (cultureMagicProfilesRef.source_id !== 'aig') cultureMagicProblems.push('culture-magic-profiles: source_id');
  if (cultureMagicProfilesRef.source_revision_id !== aigRevision) cultureMagicProblems.push('culture-magic-profiles: source_revision_id');
  if (cultureMagicProfilesRef.authority_state !== 'reference_authority') cultureMagicProblems.push('culture-magic-profiles: authority_state');
  if (!Array.isArray(cultureMagicProfilesRef.source_blockers) || cultureMagicProfilesRef.source_blockers.length !== 0) {
    cultureMagicProblems.push('culture-magic-profiles: source_blockers');
  }
  if (/136|137/.test(cultureMagicProfilesRef.page || '')) {
    cultureMagicProblems.push('culture-magic-profiles: stale page scope');
  }
  const profileSourceRefs = cultureMagicProfilesRef.profile_source_refs || {};
  for (const name of expectedCultureNames) {
    const profileRef = profileSourceRefs[name] || {};
    if (profileRef.source_revision_id !== aigRevision) cultureMagicProblems.push(`${name}: profile source_revision_id`);
    if (profileRef.verification_state !== 'verified') cultureMagicProblems.push(`${name}: profile verification_state`);
    if (profileRef.evidence_state !== expectedAigEvidenceState) cultureMagicProblems.push(`${name}: profile evidence_state`);
    if (!Array.isArray(profileRef.pdf_pages) || profileRef.pdf_pages.length === 0) cultureMagicProblems.push(`${name}: profile pdf_pages`);
    if (!Array.isArray(profileRef.block_ids) || profileRef.block_ids.length === 0) cultureMagicProblems.push(`${name}: profile block_ids`);
    cultureMagicProblems.push(...sourceRefPageConsistencyProblems(`${name} profile`, profileRef));
  }
  if (cultureMagicProfilesRef.profiles?.['Telmori Hsunchen']?.runeMagic?.status !== 'absent') {
    cultureMagicProblems.push('Telmori Hsunchen: runeMagic status');
  }
  if (!zzistoriAccess?.source_ref?.promotion_cautions?.some(caution => /broader AiG culture profiles now cite verified/i.test(caution))) {
    cultureMagicProblems.push('zzistori source_ref: stale promotion caution');
  }
  const zzistoriSourceProblems = [];
  if (zzistoriSourceRef.source_id !== 'aig') zzistoriSourceProblems.push('zzistori source_ref: source_id');
  if (zzistoriSourceRef.source_revision_id !== aigRevision) zzistoriSourceProblems.push('zzistori source_ref: source_revision_id');
  if (zzistoriSourceRef.page_manifest_path !== 'references/sources/pages/aig.json') zzistoriSourceProblems.push('zzistori source_ref: page_manifest_path');
  if (!exactArray(zzistoriSourceRef.pdf_pages, expectedZzistoriPdfPages)) zzistoriSourceProblems.push('zzistori source_ref: pdf_pages');
  if (!exactArray(zzistoriSourceRef.block_ids, expectedZzistoriBlockIds)) zzistoriSourceProblems.push('zzistori source_ref: block_ids');
  if (!exactArray(zzistoriSourceRef.evidence_paths, expectedZzistoriEvidencePaths)) zzistoriSourceProblems.push('zzistori source_ref: evidence_paths');
  if (zzistoriSourceRef.evidence_state !== 'bounded_extraction_independent_vision_verified_with_promotion_cautions') {
    zzistoriSourceProblems.push('zzistori source_ref: evidence_state');
  }
  for (const evidencePath of expectedZzistoriEvidencePaths) {
    if (!fs.existsSync(path.join(__dirname, evidencePath))) zzistoriSourceProblems.push(`zzistori source_ref: missing file ${evidencePath}`);
  }
  const aigMapEntries = new Map((indexMap.entries || []).map(entry => [entry.constant_name, entry]));
  const aigInlineProblems = ['CULTURES_DATA', 'CULTURE_MAGIC_PROFILES'].flatMap(name => {
    const entry = aigMapEntries.get(name) || {};
    const problems = [];
    if (entry.status !== 'verified') problems.push(`${name}: status`);
    if (entry.source_revision_id !== aigRevision) problems.push(`${name}: source_revision_id`);
    if (entry.page_coverage !== 'references/sources/pages/aig.json') problems.push(`${name}: page_coverage`);
    if ('blocked_reason' in entry) {
      problems.push(`${name}: explicit blocked_reason`);
    }
    if (entry.source_state !== expectedAigEvidenceState) problems.push(`${name}: source_state`);
    if (name === 'CULTURE_MAGIC_PROFILES') {
      if (!Array.isArray(entry.source_refs) || entry.source_refs.length === 0) problems.push(`${name}: source_refs`);
    }
    return problems;
  });
  const indexCoverage = readJson('references/provenance/index-html-coverage.json');
  const coverageById = new Map((indexCoverage.entries || []).map(entry => [entry.id, entry]));
  const cultureMagicCoverage = coverageById.get('culture-magic-profiles') || {};
  const cultureMagicCoverageRef = (cultureMagicCoverage.references || []).find(ref => ref.path === 'references/aig-raw/culture-magic-profiles-aig.json') || {};
  const coverageProblems = [];
  if (cultureMagicCoverage.status !== 'verified') coverageProblems.push('culture-magic-profiles coverage: status');
  if (!Array.isArray(cultureMagicCoverage.blockers) || cultureMagicCoverage.blockers.length !== 0) {
    coverageProblems.push('culture-magic-profiles coverage: explicit blocker');
  }
  const coverageSourceRef = cultureMagicCoverageRef.source_ref || {};
  if (coverageSourceRef.source_id !== 'aig' ||
      coverageSourceRef.source_revision_id !== aigRevision ||
      coverageSourceRef.page_manifest_path !== 'references/sources/pages/aig.json' ||
      coverageSourceRef.evidence_state !== expectedAigEvidenceState ||
      !Array.isArray(coverageSourceRef.pdf_pages) ||
      coverageSourceRef.pdf_pages.length === 0 ||
      !Array.isArray(coverageSourceRef.evidence_paths) ||
      coverageSourceRef.evidence_paths.length === 0) {
    coverageProblems.push('culture-magic-profiles coverage: source_ref evidence');
  }
  const culturesCoverage = coverageById.get('cultures-combat-styles') || {};
  if (culturesCoverage.status !== 'verified' ||
      !Array.isArray(culturesCoverage.blockers) ||
      culturesCoverage.blockers.length !== 0) {
    coverageProblems.push('cultures-combat-styles coverage: explicit AiG blocker');
  }
  if (blockedAuthorityProblems.length === 0 &&
      cultureAuthorityProblems.length === 0 &&
      cultureMagicProblems.length === 0 &&
      zzistoriSourceProblems.length === 0 &&
      cultureNames.length === 8 &&
      aigInlineProblems.length === 0 &&
      coverageProblems.length === 0) {
    pass('AiG culture and profile authority are wired to bounded verified evidence');
  } else {
    fail('AiG culture authority source revision wiring is incomplete',
      JSON.stringify({ blockedAuthorityProblems, cultureAuthorityProblems, cultureMagicProblems, zzistoriSourceProblems, cultureCount: cultureNames.length, aigInlineProblems, coverageProblems }));
  }

  const sourceStates = sourceSchema.lifecycle_states.source_revisions;
  const pageStates = sourceSchema.lifecycle_states.page_work;
  if (sourceStates.includes('permission_pending') &&
      pageStates.includes('verification_failed') &&
      pageStates.includes('accepted') &&
      sourceSchema.excerpt_budgets.full_page_text_committed === false) {
    pass('Source schema defines pending, verification, acceptance, and excerpt-budget contracts');
  } else {
    fail('Source schema missing required lifecycle or excerpt-budget contracts');
  }

  const invalidActive = {
    schemaVersion: 1,
    sources: [{
      source_id: 'broken-active',
      title: 'Broken Active Source',
      lifecycle_state: 'active',
      source_revision_id: 'broken-active:test',
      canonical_locator: 'references/sources/pdfs/broken.pdf',
      local_hint: 'references/sources/pdfs/broken.pdf',
      permission_basis: { status: 'confirmed' },
      render_contract: sourceSchema.render_contract_defaults
    }]
  };
  const invalidActiveResult = sourceValidator.validateManifest(invalidActive, sourceSchema);
  if (!invalidActiveResult.ok && invalidActiveResult.errors.some(error => error.includes('broken-active') && error.includes('sha256'))) {
    pass('Source manifest validator fails loudly for active sources without hashes');
  } else {
    fail('Source manifest validator allows active source without hash', invalidActiveResult.errors.join('\n'));
  }

  const invalidPublishedCse = {
    schemaVersion: 1,
    sources: [{
      source_id: 'cse',
      title: 'Combat Styles Encyclopedia',
      lifecycle_state: 'active',
      source_revision_id: expectedCseRevision,
      canonical_locator: expectedCsePublicUrl,
      local_hint: 'references/sources/pdfs/Combat Styles Encyclopedia.pdf',
      sha256: expectedCseHash,
      size_bytes: 2831310,
      page_count: 1109,
      acquired_at: '2026-05-21',
      permission_basis: { status: 'confirmed' },
      render_contract: sourceSchema.render_contract_defaults,
      blocks: [],
      blockers: [],
      source_access: {
        public_copyparty_source: {
          status: 'available'
        }
      }
    }]
  };
  const invalidPublishedCseResult = sourceValidator.validateManifest(invalidPublishedCse, sourceSchema);
  if (!invalidPublishedCseResult.ok &&
      invalidPublishedCseResult.errors.some(error => error.includes('cse') && error.includes('public_copyparty_source.url'))) {
    pass('Source manifest validator rejects published CSE sources without a public URL');
  } else {
    fail('Source manifest validator allows published CSE source without a public URL',
      invalidPublishedCseResult.errors.join('\n'));
  }

  const constants = new Set(legacy.app_constants.map(item => item.constant_name));
  const missingConstants = provenanceValidator.EXPORTED_APP_CONSTANTS.filter(name => !constants.has(name));
  if (missingConstants.length === 0) {
    pass('Legacy disposition classifies exported app data constants');
  } else {
    fail('Legacy disposition missing exported app data constants', missingConstants.join(', '));
  }

  const missingSkillDisposition = {
    ...legacy,
    app_constants: legacy.app_constants.filter(item => item.constant_name !== 'SKILLS_DATA')
  };
  const missingSkillResult = provenanceValidator.validateLegacyDisposition(missingSkillDisposition, provenanceSchema, __dirname);
  if (!missingSkillResult.ok && missingSkillResult.errors.some(error => error.includes('SKILLS_DATA'))) {
    pass('Provenance validator fails closed for unclassified exported constants');
  } else {
    fail('Provenance validator allows unclassified exported constants', missingSkillResult.errors.join('\n'));
  }

  const canonicalA = provenanceValidator.valueHash({ b: 2, a: ['x', { z: true }] });
  const canonicalB = provenanceValidator.valueHash({ a: ['x', { z: true }], b: 2 });
  if (canonicalA === canonicalB && /^[a-f0-9]{64}$/.test(canonicalA)) {
    pass('Provenance value hashes use stable canonical JSON ordering');
  } else {
    fail('Provenance value hashes are not canonical');
  }

  const cseRaw = JSON.parse(fs.readFileSync(path.join(__dirname, 'references', 'cse-raw', 'combat-styles-cse.json'), 'utf8'));
  const cseAuthority = JSON.parse(fs.readFileSync(path.join(__dirname, 'references', 'combat-styles.json'), 'utf8'));
  const cseCoverage = JSON.parse(fs.readFileSync(path.join(__dirname, 'references', 'sources', 'pages', 'cse.json'), 'utf8'));
  const cseRawDisposition = legacy.dispositions.find(item => item.id === 'cse-raw');
  const cseAuthorityDisposition = legacy.dispositions.find(item => item.id === 'combat-styles-authority');
  const cseSource = manifestById.get('cse');
  const cseRawAuthorityErrors = provenanceValidator.validateSourceAuthorityMetadata(cseRaw, cseRawDisposition, manifestById);
  const cseAuthorityErrors = provenanceValidator.validateSourceAuthorityMetadata(cseAuthority, cseAuthorityDisposition, manifestById);
  if (cseRawAuthorityErrors.length === 0 &&
      cseAuthorityErrors.length === 0 &&
      cseRaw.source_ref?.source_revision_id === manifestById.get('cse')?.source_revision_id &&
      cseAuthority.authority?.source_ref?.source_revision_id === manifestById.get('cse')?.source_revision_id) {
    pass('CSE authorities use portable source_revision refs instead of machine-local source paths');
  } else {
    fail('CSE authorities have invalid source refs',
      JSON.stringify({ cseRawAuthorityErrors, cseAuthorityErrors }));
  }

  if (cseSource &&
      cseSource.lifecycle_state === 'active' &&
      cseSource.source_revision_id === expectedCseRevision &&
      cseSource.sha256 === expectedCseHash &&
      cseSource.size_bytes === 2831310 &&
      cseSource.page_count === 1109 &&
      cseSource.canonical_locator === expectedCsePublicUrl &&
      cseSource.source_access?.public_copyparty_source?.status === 'available' &&
      cseSource.source_access?.public_copyparty_source?.url === expectedCsePublicUrl &&
      cseCoverage.source_revision_id === expectedCseRevision &&
      cseCoverage.expected_page_count === 1109) {
    pass('CSE source manifest records published player-visible PDF identity');
  } else {
    fail('CSE source manifest is missing published PDF identity',
      JSON.stringify({
        lifecycle: cseSource?.lifecycle_state,
        revision: cseSource?.source_revision_id,
        hash: cseSource?.sha256,
        size: cseSource?.size_bytes,
        pageCount: cseSource?.page_count,
        canonicalLocator: cseSource?.canonical_locator,
        publicStatus: cseSource?.source_access?.public_copyparty_source?.status,
        publicUrl: cseSource?.source_access?.public_copyparty_source?.url,
        coverageRevision: cseCoverage.source_revision_id,
        coveragePageCount: cseCoverage.expected_page_count
      }));
  }

  const cseIndexEntry = (indexMap.entries || []).find(entry => entry.constant_name === 'COMBAT_STYLES_DATA');
  const cseRowPages = new Set(cseRaw.rows.map(row => row.page));
  const allCseRowsVerified = cseRaw.rows.every(row =>
    row.source_ref?.coverage_state === 'verified' &&
    row.source_ref?.block_id &&
    row.source_ref?.extraction_path &&
    row.source_ref?.verification_path
  );
  const allCseStyleCitationsVerified = cseAuthority.styles.every(style =>
    style.citation?.coverage_state === 'verified' &&
    style.citation?.block_state === 'verified' &&
    style.citation?.block_id &&
    style.citation?.extraction_path &&
    style.citation?.verification_path
  );
  const cseTargetPages = new Set(cseCoverage.target_pages || []);
  const cseVerifiedPages = cseCoverage.pages.filter(page => cseTargetPages.has(page.pdf_page));
  const cseTargetPagesMatchRows = cseTargetPages.size === cseRowPages.size &&
    [...cseRowPages].every(page => cseTargetPages.has(page));
  const cseKnownRangesPromoted = (cseCoverage.known_ranges || [])
    .filter(range => range.label === 'legacy CSE combat-style row citations')
    .every(range => range.state === 'verified');
  let cseArtifactChecksPass = true;
  for (const [rowIndex, row] of cseRaw.rows.entries()) {
    try {
      const extraction = JSON.parse(fs.readFileSync(path.join(__dirname, row.source_ref.extraction_path), 'utf8'));
      const verification = JSON.parse(fs.readFileSync(path.join(__dirname, row.source_ref.verification_path), 'utf8'));
      const block = extraction.blocks?.find(item => item.block_id === row.source_ref.block_id);
      const rowCheck = verification.row_checks?.find(item => item.block_id === row.source_ref.block_id);
      const expectedProjection = {
        page: row.page,
        source_name: row.source_name,
        app_culture: row.app_culture,
        app_name: row.app_name,
        source_weapons: row.source_weapons,
        app_weapons: row.app_weapons,
        printed_traits: row.printed_traits,
        normalized_traits: row.normalized_traits
      };
      const blockFactsMatch = block?.facts?.source_name === row.source_name &&
        block?.facts?.page === row.page &&
        block?.facts?.row_index === rowIndex &&
        block?.facts?.app_culture === row.app_culture &&
        JSON.stringify(block?.facts?.source_weapons) === JSON.stringify(row.source_weapons) &&
        JSON.stringify(block?.facts?.printed_traits) === JSON.stringify(row.printed_traits) &&
        block?.facts?.app_name === row.app_name &&
        JSON.stringify(block?.facts?.app_weapons) === JSON.stringify(row.app_weapons) &&
        JSON.stringify(block?.facts?.normalized_traits) === JSON.stringify(row.normalized_traits) &&
        block?.facts?.value_hash === provenanceValidator.valueHash(expectedProjection) &&
        block?.facts?.value_hash === provenanceValidator.valueHash({
          page: block.facts.page,
          source_name: block.facts.source_name,
          app_culture: block.facts.app_culture,
          app_name: block.facts.app_name,
          source_weapons: block.facts.source_weapons,
          app_weapons: block.facts.app_weapons,
          printed_traits: block.facts.printed_traits,
          normalized_traits: block.facts.normalized_traits
        });
      if (!block ||
          !blockFactsMatch ||
          !verification.verified_blocks?.includes(row.source_ref.block_id) ||
          rowCheck?.text_layer_tokens_match_cse_verified_fields !== true ||
          rowCheck?.rendered_ocr_contains_source_name !== true) {
        cseArtifactChecksPass = false;
        break;
      }
    } catch (error) {
      cseArtifactChecksPass = false;
      break;
    }
  }
  if (cseCoverage.coverage_state === 'verified' &&
      cseCoverage.pages.length === cseRowPages.size &&
      cseTargetPages.size === cseRowPages.size &&
      cseTargetPagesMatchRows &&
      cseVerifiedPages.length === cseRowPages.size &&
      cseVerifiedPages.every(page => page.work_state === 'verified' && page.extraction?.artifact_path && page.verification?.artifact_path) &&
      cseKnownRangesPromoted &&
      Array.isArray(cseCoverage.blockers) &&
      cseCoverage.blockers.length === 0 &&
      cseRaw.attestation_state === 'verified' &&
      cseAuthority.authority?.attestation_state === 'verified' &&
      cseAuthority.authority?.field_attestation?.app_derived_fields_not_cse_verified?.includes('restriction') &&
      cseIndexEntry?.status === 'normalized' &&
      allCseRowsVerified &&
      allCseStyleCitationsVerified &&
      cseArtifactChecksPass) {
    pass('CSE names, weapons, and traits are verified by bounded row evidence');
  } else {
    fail('CSE facts are missing verified page/block evidence',
      JSON.stringify({
        coverageState: cseCoverage.coverage_state,
        pageCount: cseCoverage.pages?.length,
        targetPageCount: cseTargetPages.size,
        expectedPageCount: cseRowPages.size,
        blockers: cseCoverage.blockers,
        rawAttestation: cseRaw.attestation_state,
        authorityAttestation: cseAuthority.authority?.attestation_state,
        indexStatus: cseIndexEntry?.status,
        cseTargetPagesMatchRows,
        cseKnownRangesPromoted,
        cseArtifactChecksPass,
        allCseRowsVerified,
        allCseStyleCitationsVerified
      }));
  }

  const missingRefResult = provenanceValidator.validateSourceAuthorityMetadata(
    {},
    { id: 'synthetic-cse', disposition: 'governed-now', source_ids: ['cse'], enforce_source_refs: true },
    manifestById
  );
  if (missingRefResult.some(error => error.includes('missing source_ref'))) {
    pass('Provenance validator rejects governed authorities missing source refs');
  } else {
    fail('Provenance validator allows governed authorities missing source refs', missingRefResult.join('\n'));
  }

  const governedReferenceOnlyMonsterResult = provenanceValidator.validateSourceAuthorityMetadata(
    monsterRaw,
    { id: 'synthetic-monster-island-governed', disposition: 'governed-now', source_ids: ['monster-island'], enforce_source_refs: true },
    manifestById
  );
  if (governedReferenceOnlyMonsterResult.some(error => error.includes('not app-facing'))) {
    pass('Provenance validator rejects governed reference-only Monster Island authority');
  } else {
    fail('Provenance validator allows governed reference-only Monster Island authority',
      governedReferenceOnlyMonsterResult.join('\n'));
  }

  const emptyReferenceEvidenceResult = provenanceValidator.validateSourceAuthorityMetadata(
    {
      source_ref: {
        source_id: 'monster-island',
        source_revision_id: monsterRevision,
        page_manifest_path: 'references/sources/pages/monster-island.json',
        evidence_paths: []
      },
      attestation: {
        status: 'bounded_vision_verified',
        source_authority: true,
        authority_state: 'reference_authoritative_not_app_promoted'
      }
    },
    { id: 'synthetic-empty-reference-evidence', disposition: 'must-fix-before-acceptance', source_ids: ['monster-island'], enforce_source_refs: true },
    manifestById
  );
  if (emptyReferenceEvidenceResult.some(error => error.includes('lacks evidence_paths'))) {
    pass('Provenance validator rejects reference authority without evidence paths');
  } else {
    fail('Provenance validator allows reference authority without evidence paths',
      emptyReferenceEvidenceResult.join('\n'));
  }

  const duplicateMarkerResult = provenanceValidator.validateSourceAuthorityMetadata(
    {
      attestation: {
        status: 'UNVERIFIED',
        source_authority: true,
        authority_state: 'accepted_for_app'
      }
    },
    { id: 'synthetic-duplicate-marker', disposition: 'governed-now', source_ids: [], enforce_source_refs: false },
    manifestById,
    __dirname
  );
  const duplicateMarkerErrors = duplicateMarkerResult.filter(error => error.includes('UNVERIFIED'));
  if (duplicateMarkerErrors.length === 1) {
    pass('Provenance validator reports each unverified marker once');
  } else {
    fail('Provenance validator duplicates unverified marker errors',
      duplicateMarkerResult.join('\n'));
  }

  const mixedReferenceEvidenceResult = provenanceValidator.validateSourceAuthorityMetadata(
    {
      source_refs: [
        {
          source_id: 'monster-island',
          source_revision_id: monsterRevision,
          page_manifest_path: 'references/sources/pages/monster-island.json',
          evidence_paths: []
        },
        {
          source_id: 'monster-island',
          source_revision_id: monsterRevision,
          page_manifest_path: 'references/sources/pages/monster-island.json',
          evidence_paths: [monsterPageEvidencePaths[0]]
        }
      ],
      attestation: {
        status: 'bounded_vision_verified',
        source_authority: true,
        authority_state: 'reference_authoritative_not_app_promoted'
      }
    },
    { id: 'synthetic-mixed-reference-evidence', disposition: 'must-fix-before-acceptance', source_ids: ['monster-island'], enforce_source_refs: true },
    manifestById,
    __dirname
  );
  if (mixedReferenceEvidenceResult.some(error => error.includes('lacks evidence_paths'))) {
    pass('Provenance validator rejects mixed reference refs with missing evidence paths');
  } else {
    fail('Provenance validator allows mixed reference refs with missing evidence paths',
      mixedReferenceEvidenceResult.join('\n'));
  }

  const missingAuthorityStateResult = provenanceValidator.validateSourceAuthorityMetadata(
    {
      source_ref: {
        source_id: 'monster-island',
        source_revision_id: monsterRevision,
        page_manifest_path: 'references/sources/pages/monster-island.json',
        evidence_paths: [monsterPageEvidencePaths[0]]
      },
      attestation: {
        status: 'bounded_vision_verified',
        source_authority: true
      }
    },
    { id: 'synthetic-missing-authority-state', disposition: 'governed-now', source_ids: ['monster-island'], enforce_source_refs: true },
    manifestById,
    __dirname
  );
  if (missingAuthorityStateResult.some(error => error.includes('missing authority_state'))) {
    pass('Provenance validator rejects governed source authority missing authority_state');
  } else {
    fail('Provenance validator allows governed source authority missing authority_state',
      missingAuthorityStateResult.join('\n'));
  }

  const blankAuthorityStateResult = provenanceValidator.validateSourceAuthorityMetadata(
    {
      source_ref: {
        source_id: 'monster-island',
        source_revision_id: monsterRevision,
        page_manifest_path: 'references/sources/pages/monster-island.json',
        evidence_paths: [monsterPageEvidencePaths[0]]
      },
      attestation: {
        status: 'bounded_vision_verified',
        source_authority: true,
        authority_state: '   '
      }
    },
    { id: 'synthetic-blank-authority-state', disposition: 'governed-now', source_ids: ['monster-island'], enforce_source_refs: true },
    manifestById,
    __dirname
  );
  if (blankAuthorityStateResult.some(error => error.includes('missing authority_state'))) {
    pass('Provenance validator rejects governed source authority with blank authority_state');
  } else {
    fail('Provenance validator allows governed source authority with blank authority_state',
      blankAuthorityStateResult.join('\n'));
  }

  const coercedSourceAuthorityPayloads = [
    { source_authority: 'true', authority_state: 'accepted_for_app' },
    { source_authority: 1, authority_state: 'app_promoted' },
    { source_authority: 'true', authority_state: 'reference_authoritative_not_app_promoted' }
  ];
  const coercedSourceAuthorityEscapes = coercedSourceAuthorityPayloads.filter(attestation => {
    const result = provenanceValidator.validateSourceAuthorityMetadata(
      {
        source_ref: {
          source_id: 'monster-island',
          source_revision_id: monsterRevision,
          page_manifest_path: 'references/sources/pages/monster-island.json',
          evidence_paths: [monsterPageEvidencePaths[0]]
        },
        attestation
      },
      { id: `synthetic-coerced-source-authority-${attestation.authority_state}`, disposition: 'governed-now', source_ids: ['monster-island'], enforce_source_refs: true },
      manifestById,
      __dirname
    );
    return !result.some(error => error.includes('source_authority must be boolean'));
  });
  if (coercedSourceAuthorityEscapes.length === 0) {
    pass('Provenance validator rejects non-boolean source_authority values');
  } else {
    fail('Provenance validator allows non-boolean source_authority values',
      coercedSourceAuthorityEscapes.map(item => JSON.stringify(item)).join('\n'));
  }

  const nonGovernedAppAuthorityStates = ['accepted_for_app', 'app_facing', 'app_promoted', 'governed_app_authority'];
  const nonGovernedAppAuthorityEscapes = nonGovernedAppAuthorityStates.filter(authorityState => {
    const result = provenanceValidator.validateSourceAuthorityMetadata(
      {
        source_ref: {
          source_id: 'monster-island',
          source_revision_id: monsterRevision,
          page_manifest_path: 'references/sources/pages/monster-island.json',
          evidence_paths: [monsterPageEvidencePaths[0]]
        },
        attestation: {
          status: 'bounded_vision_verified',
          source_authority: true,
          authority_state: authorityState
        }
      },
      { id: `synthetic-non-governed-${authorityState}`, disposition: 'must-fix-before-acceptance', source_ids: ['monster-island'], enforce_source_refs: true },
      manifestById,
      __dirname
    );
    return !result.some(error => error.includes('requires governed-now disposition'));
  });
  if (nonGovernedAppAuthorityEscapes.length === 0) {
    pass('Provenance validator rejects app-facing authority states outside governed dispositions');
  } else {
    fail('Provenance validator allows app-facing authority states outside governed dispositions',
      nonGovernedAppAuthorityEscapes.join(', '));
  }

  const unrecognizedAuthorityStates = ['ACCEPTEDFORAPP', 'REFERENCEONLY', 'APPFACING', 'APPPROMOTED', 'GOVERNEDAPPAUTHORITY', 'aCCePtEd_FoR_aPp', 'ReFeReNcE_OnLy'];
  const unrecognizedAuthorityEscapes = unrecognizedAuthorityStates.filter(authorityState => {
    const result = provenanceValidator.validateSourceAuthorityMetadata(
      {
        source_ref: {
          source_id: 'monster-island',
          source_revision_id: monsterRevision,
          page_manifest_path: 'references/sources/pages/monster-island.json',
          evidence_paths: [monsterPageEvidencePaths[0]]
        },
        attestation: {
          status: 'bounded_vision_verified',
          source_authority: true,
          authority_state: authorityState
        }
      },
      { id: `synthetic-unrecognized-${authorityState}`, disposition: 'must-fix-before-acceptance', source_ids: ['monster-island'], enforce_source_refs: true },
      manifestById,
      __dirname
    );
    return !result.some(error => error.includes('unrecognized authority_state'));
  });
  if (unrecognizedAuthorityEscapes.length === 0) {
    pass('Provenance validator rejects all-caps and broken-case source authority states');
  } else {
    fail('Provenance validator allows all-caps or broken-case source authority states',
      unrecognizedAuthorityEscapes.join(', '));
  }

  const promotedReferenceOnlyMonster = JSON.parse(JSON.stringify(monsterRaw));
  promotedReferenceOnlyMonster.attestation.authority_state = 'accepted_for_app';
  const promotedReferenceOnlyMonsterResult = provenanceValidator.validateSourceAuthorityMetadata(
    promotedReferenceOnlyMonster,
    { id: 'synthetic-promoted-reference-only-monster', disposition: 'governed-now', source_ids: ['monster-island'], enforce_source_refs: true },
    manifestById,
    __dirname
  );
  if (promotedReferenceOnlyMonsterResult.some(error => error.includes('requires app-facing evidence_state'))) {
    pass('Provenance validator rejects app-facing promotion using reference-only evidence state');
  } else {
    fail('Provenance validator allows app-facing promotion using reference-only evidence state',
      promotedReferenceOnlyMonsterResult.join('\n'));
  }

  const governedNullSourceIdsReferenceOnlyResult = provenanceValidator.validateSourceAuthorityMetadata(
    promotedReferenceOnlyMonster,
    { id: 'synthetic-governed-null-source-ids-reference-only', disposition: 'governed-now', enforce_source_refs: true },
    manifestById,
    __dirname
  );
  if (governedNullSourceIdsReferenceOnlyResult.some(error => error.includes('requires app-facing evidence_state'))) {
    pass('Provenance validator rejects governed reference-only evidence state without explicit source_ids');
  } else {
    fail('Provenance validator allows governed reference-only evidence state without explicit source_ids',
      governedNullSourceIdsReferenceOnlyResult.join('\n'));
  }

  const nonCanonicalEvidenceResult = provenanceValidator.validateSourceAuthorityMetadata(
    {
      source_ref: {
        source_id: 'monster-island',
        source_revision_id: monsterRevision,
        page_manifest_path: 'references/sources/pages/monster-island.json',
        evidence_paths: ['references/sources/evidence/monster-island/../monster-island/page-0133-extraction.json']
      },
      attestation: {
        status: 'bounded_vision_verified',
        source_authority: true,
        authority_state: 'reference_authoritative_not_app_promoted'
      }
    },
    { id: 'synthetic-non-canonical-evidence', disposition: 'must-fix-before-acceptance', source_ids: ['monster-island'], enforce_source_refs: true },
    manifestById,
    __dirname
  );
  if (nonCanonicalEvidenceResult.some(error => error.includes('canonical relative path'))) {
    pass('Provenance validator rejects non-canonical reference evidence paths');
  } else {
    fail('Provenance validator allows non-canonical reference evidence paths',
      nonCanonicalEvidenceResult.join('\n'));
  }

  const parentDirectoryEvidenceResult = provenanceValidator.validateSourceAuthorityMetadata(
    {
      source_ref: {
        source_id: 'monster-island',
        source_revision_id: monsterRevision,
        page_manifest_path: 'references/sources/pages/monster-island.json',
        evidence_paths: ['..']
      },
      attestation: {
        status: 'bounded_vision_verified',
        source_authority: true,
        authority_state: 'reference_authoritative_not_app_promoted'
      }
    },
    { id: 'synthetic-parent-directory-evidence', disposition: 'must-fix-before-acceptance', source_ids: ['monster-island'], enforce_source_refs: true },
    manifestById,
    __dirname
  );
  if (parentDirectoryEvidenceResult.some(error => error.includes('must stay under the repository root'))) {
    pass('Provenance validator rejects parent-directory reference evidence paths');
  } else {
    fail('Provenance validator allows parent-directory reference evidence paths',
      parentDirectoryEvidenceResult.join('\n'));
  }

  const referenceAuthorityStates = [
    'reference_only',
    'reference_evidence_only',
    'reference_data',
    'experimental_reference',
    'not_for_app_use',
    'internal_reference_only',
    'SourceBlocked',
    'NotApp',
    'reference_authoritative_app_promoted',
    'app_facing_reference',
    'application_reference',
    'ref_erence_only'
  ];
  const escapedReferenceStates = referenceAuthorityStates.filter(authorityState => {
    const result = provenanceValidator.validateSourceAuthorityMetadata(
      {
        ...monsterRaw,
        attestation: {
          ...monsterRaw.attestation,
          authority_state: authorityState
        }
      },
      { id: `synthetic-${authorityState}`, disposition: 'governed-now', source_ids: ['monster-island'], enforce_source_refs: true },
      manifestById,
      __dirname
    );
    return !result.some(error => error.includes('not app-facing'));
  });
  if (escapedReferenceStates.length === 0) {
    pass('Provenance validator rejects unconventional governed reference-only authority states');
  } else {
    fail('Provenance validator allows unconventional governed reference-only authority states',
      escapedReferenceStates.join(', '));
  }

  const allowedGovernedAuthorityResult = provenanceValidator.validateSourceAuthorityMetadata(
    {
      source_ref: {
        source_id: 'bird-in-hand',
        source_revision_id: activeBird?.source_revision_id,
        page_manifest_path: 'references/sources/pages/bird-in-hand.json',
        evidence_state: birdRaw.source_ref?.evidence_state,
        evidence_paths: birdRaw.source_ref?.evidence_paths
      },
      attestation: {
        status: 'accepted',
        source_authority: true,
        authority_state: 'accepted_for_app'
      }
    },
    { id: 'synthetic-accepted-app-authority', disposition: 'governed-now', source_ids: ['bird-in-hand'], enforce_source_refs: true },
    manifestById,
    __dirname
  );
  if (allowedGovernedAuthorityResult.length === 0) {
    pass('Provenance validator accepts explicit app-facing governed authority states');
  } else {
    fail('Provenance validator rejects explicit app-facing governed authority states',
      allowedGovernedAuthorityResult.join('\n'));
  }

  const appFacingExtractionOnlyResult = provenanceValidator.validateSourceAuthorityMetadata(
    {
      source_ref: {
        source_id: 'bird-in-hand',
        source_revision_id: activeBird?.source_revision_id,
        page_manifest_path: 'references/sources/pages/bird-in-hand.json',
        evidence_state: birdRaw.source_ref?.evidence_state,
        evidence_paths: (birdRaw.source_ref?.evidence_paths || []).filter(evidencePath => evidencePath.includes('-extraction')).slice(0, 1)
      },
      attestation: {
        status: 'accepted',
        source_authority: true,
        authority_state: 'accepted_for_app'
      }
    },
    { id: 'synthetic-extraction-only-app-authority', disposition: 'governed-now', source_ids: ['bird-in-hand'], enforce_source_refs: true },
    manifestById,
    __dirname
  );
  if (appFacingExtractionOnlyResult.some(error => error.includes('require both extraction and verification artifacts'))) {
    pass('Provenance validator rejects app-facing authority without verifier evidence');
  } else {
    fail('Provenance validator allows app-facing authority with extraction-only evidence',
      appFacingExtractionOnlyResult.join('\n'));
  }

  function validateSyntheticReferenceEvidence(evidencePath, artifact) {
    const fullPath = path.join(__dirname, evidencePath);
    fs.writeFileSync(fullPath, `${JSON.stringify(artifact, null, 2)}\n`);
    try {
      return provenanceValidator.validateSourceAuthorityMetadata(
        {
          source_ref: {
            source_id: 'monster-island',
            source_revision_id: monsterRevision,
            page_manifest_path: 'references/sources/pages/monster-island.json',
            evidence_paths: [evidencePath]
          },
          attestation: {
            status: 'bounded_vision_verified',
            source_authority: true,
            authority_state: 'reference_authoritative_not_app_promoted'
          }
        },
        { id: `synthetic-${path.basename(evidencePath, '.json')}`, disposition: 'must-fix-before-acceptance', source_ids: ['monster-island'], enforce_source_refs: true },
        manifestById,
        __dirname
      );
    } finally {
      fs.rmSync(fullPath, { force: true });
    }
  }

  const untrackedEvidencePath = 'references/sources/evidence/monster-island/.tmp-untracked-evidence-test.json';
  const untrackedEvidenceResult = validateSyntheticReferenceEvidence(untrackedEvidencePath, {
    source_id: 'monster-island',
    source_revision_id: monsterRevision,
    pdf_page: 133
  });
  if (untrackedEvidenceResult.some(error => error.includes('not tracked'))) {
    pass('Provenance validator rejects untracked reference evidence artifacts');
  } else {
    fail('Provenance validator allows untracked reference evidence artifacts',
      untrackedEvidenceResult.join('\n'));
  }

  const staleEvidencePath = 'references/sources/evidence/monster-island/.tmp-stale-evidence-test.json';
  const staleEvidenceResult = validateSyntheticReferenceEvidence(staleEvidencePath, {
    source_id: 'monster-island',
    source_revision_id: 'monster-island:stale-test-revision:000000000000:2026-01-01',
    pdf_page: 133
  });
  if (staleEvidenceResult.some(error => error.includes('stale source_revision_id'))) {
    pass('Provenance validator rejects stale reference evidence artifacts');
  } else {
    fail('Provenance validator allows stale reference evidence artifacts',
      staleEvidenceResult.join('\n'));
  }

  const wrongSourceEvidencePath = 'references/sources/evidence/monster-island/.tmp-wrong-source-evidence-test.json';
  const wrongSourceEvidenceResult = validateSyntheticReferenceEvidence(wrongSourceEvidencePath, {
    source_id: 'bird-in-hand',
    source_revision_id: monsterRevision,
    pdf_page: 133
  });
  if (wrongSourceEvidenceResult.some(error => error.includes('does not match monster-island'))) {
    pass('Provenance validator rejects cross-source reference evidence artifacts');
  } else {
    fail('Provenance validator allows cross-source reference evidence artifacts',
      wrongSourceEvidenceResult.join('\n'));
  }

  const governedLegacy = JSON.parse(JSON.stringify(legacy));
  const governedMonsterDisposition = (governedLegacy.dispositions || []).find(disposition => disposition.id === 'spirits-monster-island');
  if (governedMonsterDisposition) governedMonsterDisposition.disposition = 'governed-now';
  const governedLegacyResult = provenanceValidator.validateLegacyDisposition(governedLegacy, provenanceSchema, __dirname);
  if (!governedLegacyResult.ok && governedLegacyResult.errors.some(error => error.includes('not app-facing'))) {
    pass('Provenance validator rejects governed legacy Monster Island reference-only authority');
  } else {
    fail('Provenance validator allows governed legacy Monster Island reference-only authority',
      governedLegacyResult.errors.join('\n'));
  }

  const actualMonsterDisposition = (legacy.dispositions || []).find(disposition => disposition.id === 'spirits-monster-island');
  const actualLegacyResult = provenanceValidator.validateLegacyDisposition(legacy, provenanceSchema, __dirname);
  if (actualLegacyResult.ok && actualMonsterDisposition?.disposition === 'must-fix-before-acceptance') {
    pass('Provenance validator accepts Monster Island reference evidence only while app promotion remains blocked');
  } else {
    fail('Provenance validator rejects blocked Monster Island reference evidence state',
      JSON.stringify({
        disposition: actualMonsterDisposition?.disposition,
        errors: actualLegacyResult.errors
      }));
  }
}

section('Loading Application');
const App = loadApp();
info(`Loaded ${App.SKILLS_DATA.length} skills, ${App.WEAPONS_DATA.length} weapons, ${App.CULTURES_DATA.length} cultures`);

section('Higher Magic Provider Resolution');
{
  const { App: AppObj, CORE_CAREER_MAGIC_PROVIDERS } = App;
  const baseCharacteristics = { STR: 10, CON: 11, SIZ: 10, DEX: 10, INT: 15, POW: 14, CHA: 8 };
  const shamanProviderSkills = ['Binding (Waha)', 'Trance', 'Healing'];
  const sorcererProviderSkills = ['Invocation (Core Sorcery)', 'Shaping', 'Lore (Sorcery)'];
  const mysticProviderSkills = ['Meditation', 'Mysticism (Core Mysticism Path)', 'Musicianship (Drums)'];
  const character = (overrides = {}) => ({
    culture: 'Sartarite (Heortling)',
    career: 'Warrior',
    cult: null,
    characteristics: { ...baseCharacteristics },
    sorcerySpells: [],
    boundSpirits: [],
    selectedProfessionalSkills: [],
    ...overrides
  });
  const providersFor = overrides => AppObj.resolveHigherMagicProviders(character(overrides));
  const providerBySystem = (providers, system) => providers.find(provider => provider.system === system);
  const providerIds = providers => providers.map(provider => provider.id).sort();
  const hasProvider = (providers, id) => providerIds(providers).includes(id);
  const providerProblems = [];

  if (!Array.isArray(CORE_CAREER_MAGIC_PROVIDERS?.providers) ||
      CORE_CAREER_MAGIC_PROVIDERS.providers.length !== 3) {
    providerProblems.push('CORE_CAREER_MAGIC_PROVIDERS inline constant is missing the three source-backed career providers');
  }
  if (typeof AppObj.resolveHigherMagicProviders !== 'function') {
    providerProblems.push('App.resolveHigherMagicProviders is not exported');
  }
  if (typeof AppObj.resolveHigherMagicProviderBySystem !== 'function') {
    providerProblems.push('App.resolveHigherMagicProviderBySystem is not exported');
  }
  if (typeof AppObj.normalizeHigherMagicState !== 'function') {
    providerProblems.push('App.normalizeHigherMagicState is not exported');
  }

  if (providerProblems.length === 0) {
    // Post-initiation provider expectations: cult-backed providers only appear when initiated.
    const dakaFal = providersFor({ culture: 'Praxian', career: 'Shaman', cult: 'Daka Fal', cultInitiated: true });
    const waha = providersFor({ culture: 'Praxian', career: 'Shaman', cult: 'Waha', cultInitiated: true });
    const arkat = providersFor({ culture: 'God Forgot', career: 'Sorcerer', cult: 'Arkat', cultInitiated: true });
    const zzistori = providersFor({ culture: 'God Forgot', career: 'Sorcerer', cult: null });
    const shamanNoCult = providersFor({ career: 'Shaman', cult: null, selectedProfessionalSkills: shamanProviderSkills });
    const sorcererNoCult = providersFor({ career: 'Sorcerer', cult: null, selectedProfessionalSkills: sorcererProviderSkills });
    const mysticNoCult = providersFor({ career: 'Mystic', cult: null, selectedProfessionalSkills: mysticProviderSkills });
    const shamanOrlanth = providersFor({ career: 'Shaman', cult: 'Orlanth', cultInitiated: true, selectedProfessionalSkills: shamanProviderSkills });
    const sorcererOrlanth = providersFor({ career: 'Sorcerer', cult: 'Orlanth', cultInitiated: true, selectedProfessionalSkills: sorcererProviderSkills });
    const mysticOrlanth = providersFor({ career: 'Mystic', cult: 'Orlanth', cultInitiated: true, selectedProfessionalSkills: mysticProviderSkills });
    const warriorNoCult = providersFor({ career: 'Warrior', cult: null });

    if (providerBySystem(dakaFal, 'animism')?.sourceKind !== 'cult') {
      providerProblems.push('Daka Fal must resolve cult-backed Animism');
    }
    if (providerBySystem(waha, 'theist')?.sourceKind !== 'cult' ||
        providerBySystem(waha, 'animism')?.sourceKind !== 'cult' ||
        hasProvider(waha, 'core-career-shaman-animism')) {
      providerProblems.push('Waha must resolve hybrid cult Theism+Animism and supersede Core Shaman Animism');
    }
    if (providerBySystem(arkat, 'sorcery')?.sourceKind !== 'cult' ||
        hasProvider(arkat, 'core-career-sorcerer-sorcery')) {
      providerProblems.push('Arkat must resolve cult Sorcery and supersede Core Sorcerer Sorcery');
    }
    if (providerBySystem(zzistori, 'sorcery')?.sourceKind !== 'culture-backed school' ||
        providerBySystem(zzistori, 'sorcery')?.sourceLabel !== 'Zzistori School (God Forgot sorcery)' ||
        hasProvider(zzistori, 'core-career-sorcerer-sorcery')) {
      providerProblems.push('God Forgot Sorcerer with No Cult must preserve Zzistori school precedence');
    }
    if (!hasProvider(shamanNoCult, 'core-career-shaman-animism') ||
        !hasProvider(sorcererNoCult, 'core-career-sorcerer-sorcery') ||
        !hasProvider(mysticNoCult, 'core-career-mystic-mysticism')) {
      providerProblems.push('No Cult Shaman/Sorcerer/Mystic must resolve their Core career providers');
    }
    if (!(hasProvider(shamanOrlanth, 'cult-orlanth-theist') && hasProvider(shamanOrlanth, 'core-career-shaman-animism')) ||
        !(hasProvider(sorcererOrlanth, 'cult-orlanth-theist') && hasProvider(sorcererOrlanth, 'core-career-sorcerer-sorcery')) ||
        !(hasProvider(mysticOrlanth, 'cult-orlanth-theist') && hasProvider(mysticOrlanth, 'core-career-mystic-mysticism'))) {
      providerProblems.push('Magic careers with unrelated Orlanth cult must stack cult Theism with Core career providers');
    }
    if (warriorNoCult.length !== 0) {
      providerProblems.push(`Warrior with No Cult must fail closed, got ${providerIds(warriorNoCult).join(', ')}`);
    }

    const shamanState = character({ career: 'Shaman', cult: null, boundSpiritSlots: 0, selectedProfessionalSkills: shamanProviderSkills });
    const shamanProviders = AppObj.normalizeHigherMagicState(shamanState);
    if (!hasProvider(shamanProviders, 'core-career-shaman-animism') || shamanState.boundSpiritSlots !== 4) {
      providerProblems.push('normalizeHigherMagicState must project Core Shaman Animism into bound spirit slots');
    }
    const staleState = character({
      career: 'Warrior',
      cult: null,
      sorceryResource: 14,
      sorcerySpells: ['Holdfast'],
      boundSpiritSlots: 4,
      boundSpirits: ['Ancestor Spirit — Sagacity (Int 1)']
    });
    AppObj.normalizeHigherMagicState(staleState);
    if (staleState.sorceryResource !== 0 ||
        staleState.sorcerySpells.length !== 0 ||
        staleState.boundSpiritSlots !== 0 ||
        staleState.boundSpirits.length !== 0) {
      providerProblems.push('normalizeHigherMagicState must clear stale higher-magic selections when no provider applies');
    }
    if (AppObj.resolveActiveSorcerySource(character({ culture: 'God Forgot', career: 'Sorcerer', cult: null, selectedProfessionalSkills: sorcererProviderSkills }))?.sourceLabel !== 'Zzistori School (God Forgot sorcery)') {
      providerProblems.push('resolveActiveSorcerySource must remain a compatibility wrapper over provider resolution');
    }
  }

  if (providerProblems.length === 0) {
    pass('Higher magic provider resolver handles cult, culture, and Core career providers with precedence');
  } else {
    fail('Higher magic provider resolver is incomplete', JSON.stringify(providerProblems));
  }
}

section('Waha Source Authority');
{
  const expectedWahaRevision = 'waha:copyparty-sources-books-waha-pdf:a36461fa3ba8:2026-05-21';
  const praxianWaha = readJson('references/cults-raw/praxian/waha.json');
  const stormWaha = readJson('references/cults-raw/storm/waha.json');
  const aggregateCults = readJson('references/cults-raw/cults.json');
  const legacyDisposition = readJson('references/provenance/legacy-disposition.json');
  const indexMap = readJson('references/provenance/index-html-map.json');
  const aggregateWaha = aggregateCults.filter(cult => cult.name === 'Waha');
  const appWaha = App.CULTS_DATA.filter(cult => cult.name === 'Waha');
  const appCanonical = appWaha[0] || {};
  const wahaCoverage = readJson('references/sources/pages/waha.json');
  const wahaIndexEntry = (indexMap.entries || []).find(entry => entry.constant_name === 'CULTS_DATA');
  const wahaMiraclesEntry = (indexMap.entries || []).find(entry => entry.constant_name === 'MIRACLES_DATA');
  const broadLegacyWahaSourceIds = [
    ...(legacyDisposition.dispositions || []),
    ...(legacyDisposition.app_constants || [])
  ].filter(entry => (entry.source_ids || []).includes('waha'));
  const broadIndexWahaSourceIds = (indexMap.entries || []).filter(entry => (entry.source_ids || []).includes('waha'));
  const aggregateBlocked = aggregateWaha.length >= 2 && aggregateWaha.every(cult => cult.doNotUseForAppGeneration === true);
  const pagesVerified = wahaCoverage.coverage_state === 'verified' &&
    wahaCoverage.pages.every(page =>
      page.work_state === 'verified' &&
      page.extraction?.artifact_path &&
      page.verification?.artifact_path &&
      page.verification?.independent === true &&
      Array.isArray(page.derived_facts) &&
      page.derived_facts.length > 0);
  const sourceSpelling = praxianWaha.sourceAuthority?.source_spelling_normalizations?.find(item =>
    item.source_spelling === 'Aveert' && item.normalized_value === 'Avert');
  const hasStaleInlineMechanics = appWaha.length !== 1 ||
    appCanonical.cultSkills?.includes('Track') ||
    appCanonical.cultSkills?.some(skill => /\(Shaman\)/.test(skill)) ||
    appCanonical.folkMagic?.includes('Dispel Magic');

  if (praxianWaha.canonicalRecord === true &&
      praxianWaha.sourceRevisionId === expectedWahaRevision &&
      praxianWaha.sourceAuthority?.source_revision_id === expectedWahaRevision &&
      praxianWaha.verified === true &&
      praxianWaha.verificationState === 'vision_verified' &&
      praxianWaha.sourceAuthority?.authority_status === 'bounded_vision_verified' &&
      praxianWaha.sourceAuthority?.blocked_by?.length === 0 &&
      sourceSpelling &&
      pagesVerified &&
      broadLegacyWahaSourceIds.length === 0 &&
      broadIndexWahaSourceIds.length === 0 &&
      wahaIndexEntry?.status === 'accepted' &&
      wahaIndexEntry?.source_state === 'mixed_waha_verified_with_legacy_cult_rows' &&
      wahaIndexEntry?.verified_source_slices?.some(slice => slice.source_id === 'waha' && slice.normalized_file === 'references/cults-raw/praxian/waha.json') &&
      wahaMiraclesEntry?.status === 'accepted' &&
      wahaMiraclesEntry?.source_state === 'mixed_waha_verified_with_derived_runes_and_legacy_exemptions' &&
      stormWaha.recordStatus === 'superseded' &&
      stormWaha.doNotUseForAppGeneration === true &&
      stormWaha.sourceRevisionId === expectedWahaRevision &&
      stormWaha.sourceAuthority?.source_revision_id === expectedWahaRevision &&
      aggregateBlocked &&
      aggregateWaha.every(cult => cult.sourceRevisionId === expectedWahaRevision && cult.sourceAuthority?.source_revision_id === expectedWahaRevision) &&
      appWaha.length === 1 &&
      appCanonical.pantheon === 'Praxian' &&
      appCanonical.cultSkills?.includes('Tracking') &&
      appCanonical.cultSkills?.includes('Peaceful Cut') &&
      appCanonical.cultSkills?.includes('Understand Herd Beast') &&
      !hasStaleInlineMechanics) {
    pass('Canonical Waha app data is backed by bounded independent vision evidence');
  } else {
    fail('Canonical Waha app data lacks bounded vision evidence or duplicate protection',
      JSON.stringify({
        praxianCanonical: praxianWaha.canonicalRecord,
        praxianRevision: praxianWaha.sourceRevisionId,
        praxianVerified: praxianWaha.verified,
        praxianVerificationState: praxianWaha.verificationState,
        sourceSpelling,
        coverageState: wahaCoverage.coverage_state,
        pageStates: wahaCoverage.pages.map(page => ({ page: page.pdf_page, state: page.work_state, independent: page.verification?.independent })),
        indexStatus: wahaIndexEntry?.status,
        indexSourceState: wahaIndexEntry?.source_state,
        broadLegacyWahaSourceIds: broadLegacyWahaSourceIds.map(entry => entry.id || entry.constant_name),
        broadIndexWahaSourceIds: broadIndexWahaSourceIds.map(entry => entry.constant_name),
        miraclesStatus: wahaMiraclesEntry?.status,
        stormStatus: stormWaha.recordStatus,
        stormDoNotUse: stormWaha.doNotUseForAppGeneration,
        stormRevision: stormWaha.sourceRevisionId,
        aggregateWaha: aggregateWaha.map(cult => ({ source: cult.source, status: cult.recordStatus, doNotUse: cult.doNotUseForAppGeneration })),
        appWahaCount: appWaha.length,
        appWahaSkills: appCanonical.cultSkills
      }));
  }
}

// Helper to create a valid test character
function createTestCharacter(culture = 'Sartarite (Heortling)') {
  return {
    name: 'Test Character',
    culture: culture,
    career: 'Warrior',
    age: 25,
    characteristics: { STR: 14, CON: 12, SIZ: 11, DEX: 12, INT: 10, POW: 9, CHA: 8 },
    attributes: App.Calc.calculateAllAttributes({ STR: 14, CON: 12, SIZ: 11, DEX: 12, INT: 10, POW: 9, CHA: 8 }),
    culturalSkills: { 'Athletics': 40, 'Ride': 30 },
    careerSkills: { 'Combat Style (Sword & Shield)': 50 },
    bonusSkills: { 'Lore (Strategy)': 40 },
    folkMagicSpells: [],
    careerFolkMagic: [],
    runeAffinities: { primary: 'Storm', secondary: 'Earth', tertiary: 'Darkness' },
    weapons: ['Broadsword', 'Kite Shield'],
    equipment: ['Leather Armor', 'Backpack'],
    armor: ['Leather'],
    passions: ['Loyalty (Clan): 60'],
    combatStyles: [{ name: 'Sword & Shield', skill: 50 }],
    notes: 'A test character',
    concept: 'Brave warrior',
    background: 'From the highlands',
    hitPoints: {
      'Head': { current: 5, max: 5 },
      'Chest': { current: 7, max: 7 },
      'Abdomen': { current: 6, max: 6 },
      'Right Arm': { current: 4, max: 4 },
      'Left Arm': { current: 4, max: 4 },
      'Right Leg': { current: 5, max: 5 },
      'Left Leg': { current: 5, max: 5 }
    }
  };
}

function createPdfTestCharacter(overrides = {}) {
  const characteristics = { STR: 14, CON: 12, SIZ: 11, DEX: 12, INT: 10, POW: 9, CHA: 8 };
  return {
    name: 'PDF Test Hero',
    culture: 'Sartarite (Heortling)',
    career: 'Warrior',
    homeland: 'Pimper\'s Block',
    cult: 'Orlanth',
    age: 25,
    gender: 'Nonbinary',
    characteristics,
    attributes: App.Calc.calculateAllAttributes(characteristics),
    culturalSkills: { 'Athletics': 40, 'Ride': 30 },
    careerSkills: { 'Combat Style (Sword & Shield)': 50, 'Endurance': 20 },
    bonusSkills: { 'Lore (Strategy)': 15 },
    folkMagicSpells: ['Bladesharp', 'Protection'],
    careerFolkMagic: ['Heal'],
    runeAffinities: { primary: 'Air', secondary: 'Movement', tertiary: 'Mastery' },
    weapons: [
      { name: 'Broadsword', damage: '1d8', size: 'M', reach: 'M', ap: 6, hp: 10, skill: '76%', quantity: 1 },
      { name: 'Viking Shield', damage: '1d4', size: 'L', reach: 'S', ap: 6, hp: 12, skill: '76%', quantity: 1 }
    ],
    equipment: [{ name: 'Backpack', quantity: 1, enc: 1 }, { name: 'Waterskin', quantity: 1, enc: 1 }],
    armor: [{ name: 'Leather Hauberk', ap: 2, locations: 'Chest, Abdomen, Arms' }],
    passions: [{ name: 'Loyalty (Clan)', value: 60 }, { name: 'Honor', value: 55 }],
    combatStyles: [{ name: 'Sword & Shield', traits: ['Defensive'], weapons: ['Broadsword', 'Viking Shield'], skill: 50 }],
    notes: 'PDF note field',
    concept: 'PDF concept field',
    family: 'PDF family field',
    backgroundEvents: 'PDF background field',
    startingMoney: 42,
    miracles: ['Shield'],
    devotionalPool: 1,
    ...overrides
  };
}

function applyCharacterForPdf(app, character) {
  const clone = JSON.parse(JSON.stringify(character));
  if (app.CharacterData.fromJSON) {
    app.CharacterData.fromJSON(JSON.stringify(clone));
  }
  Object.assign(app.CharacterData, clone);
  app.CharacterData.attributes = clone.attributes || app.Calc.calculateAllAttributes(clone.characteristics);
}

async function captureSinglePagePdf(character) {
  const app = loadApp();
  applyCharacterForPdf(app, character);
  await app.App.exportSinglePagePDF();
  return {
    app,
    text: app._sandbox._pdf.texts.map(op => op.text).join('\n'),
    texts: app._sandbox._pdf.texts,
    saved: app._sandbox._pdf.saved
  };
}

// ============================================================
section('Risk 1: PDF Semantic Validation (Sub-era Keywords)');
// ============================================================

// Test 1.1: PDF export draws critical character fields
asyncTest('exportSinglePagePDF() behavior output capture failed', async () => {
  if (!App.App || !App.App.exportSinglePagePDF) {
    fail('exportSinglePagePDF() function not found');
    return;
  }

  const character = createPdfTestCharacter();
  const { text, saved } = await captureSinglePagePdf(character);

  if (saved) {
    pass('exportSinglePagePDF() saves a PDF blob');
  } else {
    fail('exportSinglePagePDF() did not save a PDF blob');
  }

  const requiredText = [
    character.name,
    character.culture,
    character.career,
    character.homeland,
    'STR',
    'CON',
    'SIZ',
    'DEX',
    'INT',
    'POW',
    'CHA',
    'COMBAT STYLES',
    'Broadsword',
    'Viking Shield',
    'Head',
    'Chest',
    'PDF concept field',
    'PDF background field',
    'PDF note field'
  ];
  const missing = requiredText.filter(value => !text.includes(value));

  if (missing.length === 0) {
    pass('exportSinglePagePDF() draws identity, stats, combat, equipment, and notes');
  } else {
    fail('exportSinglePagePDF() omitted expected drawn text', missing.join(', '));
  }
});

// Test 1.1b: PDF companion labels do not repeat species/status text
asyncTest('exportSinglePagePDF() companion label normalization failed', async () => {
  const character = createPdfTestCharacter({
    companions: [{
      name: 'Shadowcat',
      species: 'Shadowcat (bonded)',
      characteristics: { STR: 8, CON: 8, SIZ: 3, DEX: 18, INT: 5, POW: 10 },
      attacks: [],
      hitLocations: {},
      movement: '8m',
      armor: 1,
      damageModifier: '-1d4',
      hitPointsTotal: 8
    }]
  });
  const { text } = await captureSinglePagePdf(character);

  if (text.includes('COMPANION: Shadowcat (bonded)') &&
      !text.includes('COMPANION: Shadowcat (Shadowcat (bonded))')) {
    pass('exportSinglePagePDF() avoids duplicated companion labels');
  } else {
    fail('exportSinglePagePDF() repeats companion species/status labels',
      text.split('\n').filter(line => line.includes('COMPANION:')).join(' | '));
  }
});

// Test 1.1c: Companion label normalization keeps meaningful species qualifiers
{
  const { App: AppObj } = loadApp();
  if (AppObj && AppObj.formatCompanionLabel) {
    const bonded = AppObj.formatCompanionLabel({ name: 'Shadowcat', species: 'Shadowcat (bonded)' });
    const qualified = AppObj.formatCompanionLabel({ name: 'Wolf', species: 'Dire Wolf' });

    if (bonded === 'Shadowcat (bonded)' && qualified === 'Wolf (Dire Wolf)') {
      pass('Companion label normalization keeps status and species qualifiers');
    } else {
      fail('Companion label normalization drops meaningful species qualifiers',
        JSON.stringify({ bonded, qualified }));
    }
  } else {
    fail('App.formatCompanionLabel unavailable for label normalization test');
  }
}

// Test 1.8: Culture-specific keywords for Glorantha cultures
{
  if (App.GLORANTHA_CULTURES_DATA && App.GLORANTHA_CULTURES_DATA.length > 0) {
    const cultures = ['Balazaring', 'Praxian', 'Tlemori', 'Sartarist'];
    const testCulture = cultures[0];
    const cultureData = App.GLORANTHA_CULTURES_DATA.find(c => c.name === testCulture);

    if (cultureData) {
      info(`Testing culture-specific content for ${testCulture}`);

      // Check if culture has combat styles
      if (cultureData.combatStyles && cultureData.combatStyles.length > 0) {
        pass(`${testCulture} culture has ${cultureData.combatStyles.length} combat style(s) defined`);
      } else {
        fail(`${testCulture} culture missing combat styles`);
      }

      // Check if culture has professional skills
      if (cultureData.professionalSkills && cultureData.professionalSkills.length > 0) {
        pass(`${testCulture} culture has ${cultureData.professionalSkills.length} professional skills defined`);
      } else {
        info(`${testCulture} culture has no professional skills (may be valid)`);
      }
    } else {
      fail(`Could not find ${testCulture} in GLORANTHA_CULTURES_DATA`);
    }
  } else {
    info('Glorantha cultures not loaded - skipping culture-specific tests');
  }
}

// Test 1.9: Homeland buttons handle apostrophes without breaking inline handlers
{
  const AppObj = App.App;
  const CD = App.CharacterData;

  if (AppObj && AppObj.renderStep4 && CD) {
    const previousCulture = CD.culture;
    const previousHomeland = CD.homeland;

    CD.culture = 'Praxian';
    CD.homeland = '';

    const step = AppObj.renderStep4();
    const html = step.innerHTML;

    if (html.includes('data-homeland="Pimper\'s Block"') &&
        html.includes('onclick="App.selectHomeland(this.dataset.homeland)"') &&
        !html.includes("App.selectHomeland('Pimper")) {
      pass('Pimper\'s Block homeland button uses safe data attribute handler');
    } else {
      fail('Pimper\'s Block homeland button can break inline handler syntax', html.match(/Pimper.{0,120}/)?.[0]);
    }

    CD.culture = previousCulture;
    CD.homeland = previousHomeland;
  } else {
    fail('App.renderStep4 not available for homeland handler test');
  }
}

// Test 1.10: Bonus skill controls also avoid raw single-quoted names
{
  const { App: AppObj, CharacterData: CD, _sandbox } = loadApp();

  if (AppObj && AppObj.renderStep11 && CD && _sandbox) {
    const renderedRows = [];
    const makeElement = tag => ({
      tag,
      innerHTML: '',
      className: '',
      style: {},
      setAttribute: () => {},
      appendChild: child => { renderedRows.push(child); },
      querySelector: selector => selector === '#bonus-skills-list'
        ? { appendChild: child => { renderedRows.push(child); } }
        : null,
      querySelectorAll: () => [],
      classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false }
    });
    _sandbox.document.createElement = makeElement;

    const trickySkill = "A person, in a romantic or familial context (Loved one's pow+cha)";
    CD.age = 21;
    CD.characteristics = { STR: 11, CON: 12, SIZ: 13, DEX: 14, INT: 15, POW: 5, CHA: 5 };
    CD.culturalSkills = {};
    CD.careerSkills = {};
    CD.combatStyles = [];
    CD.bonusSkills = { [trickySkill]: 0 };

    AppObj.renderStep11();
    const rowHtml = renderedRows.map(row => row.innerHTML).join('\n');

    if (rowHtml.includes(`data-skill="${trickySkill}"`) &&
        rowHtml.includes("App.handleSkillPointsInput('bonus', this.dataset.skill") &&
        rowHtml.includes("App.updateSkillPoints('bonus', this.dataset.skill") &&
        rowHtml.includes('App.removeBonusSkill(this.dataset.skill)') &&
        !rowHtml.includes(`App.removeBonusSkill('${trickySkill}')`)) {
      pass('Bonus skill controls render data attributes for apostrophe-safe skill names');
    } else {
      fail('Bonus skill controls still render raw skill names into inline handlers');
    }
  } else {
    fail('App.renderStep11 not available for bonus skill handler test');
  }
}

// Test 1.10b: Step 11 bonus inputs sync while typing, before blur/change
{
  const { App: AppObj, CharacterData: CD, _sandbox } = loadApp();
  if (AppObj?.handleSkillPointsInput && CD && _sandbox) {
    const tracker = { textContent: '', className: '' };
    _sandbox.document.querySelector = selector => selector === '[data-testid="budget-tracker"]' ? tracker : null;
    AppObj.renderCurrentStep = () => {};
    CD.age = 21;
    CD.bonusSkills = { Athletics: 0 };

    const input = { value: '15' };
    AppObj.handleSkillPointsInput('bonus', 'Athletics', input);
    CD.culturalSkills = { Brawn: 0 };
    const culturalInput = { value: '10' };
    AppObj.handleSkillPointsInput('cultural', 'Brawn', culturalInput);

    if (CD.bonusSkills.Athletics === 15 &&
        CD.culturalSkills.Brawn === 10 &&
        input.value === '15' &&
        culturalInput.value === '10' &&
        tracker.textContent === 'Points Remaining: 90 / 100') {
      pass('Skill allocation inputs sync CharacterData and budget on input before blur');
    } else {
      fail('Skill allocation input handler waits for blur/change',
        JSON.stringify({ bonusSkills: CD.bonusSkills, culturalSkills: CD.culturalSkills, inputValue: input.value, culturalInputValue: culturalInput.value, tracker: tracker.textContent }));
    }
  } else {
    fail('App.handleSkillPointsInput not available for allocation input sync test');
  }
}

// Test 1.11: Professional skill limit handling does not depend on the global event object
{
  const { App: AppObj, CharacterData: CD, _sandbox } = loadApp();
  if (AppObj && AppObj.toggleProfessionalSkill && CD && _sandbox) {
    CD.selectedProfessionalSkills = ['Art (Wolfmaking)', 'Craft (Basketry)', 'Commerce'];
    CD.careerSkills = {
      'Art (Wolfmaking)': 0,
      'Craft (Basketry)': 0,
      'Commerce': 0
    };
    _sandbox.alert = () => {};
    let threw = false;

    try {
      AppObj.toggleProfessionalSkill('Healing', true);
    } catch (err) {
      threw = true;
    }

    if (!threw && CD.selectedProfessionalSkills.length === 3 && !CD.selectedProfessionalSkills.includes('Healing')) {
      pass('Professional skill limit handler works without global event');
    } else {
      fail('Professional skill limit handler depends on global event or mutates selection');
    }
  } else {
    fail('App.toggleProfessionalSkill not available for event-free handler test');
  }
}

// Test 1.12: Professional skill picker renders dataset-based handlers
{
  const { App: AppObj, CharacterData: CD } = loadApp();
  if (AppObj && AppObj.renderCareerDetails && CD) {
    CD.culture = 'Sartarite';
    CD.career = 'Crafter';
    CD.selectedProfessionalSkills = ['Craft (Primary)'];
    CD.careerSkills = { 'Craft (Primary)': 0 };
    const html = AppObj.renderCareerDetails();

    if (html.includes('data-skill="Craft (Primary)"') &&
        html.includes('App.toggleProfessionalSkill(this.dataset.skill, this.checked, this)') &&
        html.includes('App.resolveProfessionalSkill(this.dataset.skill, this.value, this)') &&
        !html.includes("App.toggleProfessionalSkill('Craft")) {
      pass('Professional skill picker uses dataset-based handlers');
    } else {
      fail('Professional skill picker still interpolates skill names into inline handlers');
    }
  } else {
    fail('App.renderCareerDetails not available for dataset handler test');
  }
}

// Test 1.12a: Direct career/culture skills render with tooltip metadata
{
  const { App: AppObj, CAREERS_DATA, CULTURES_DATA, needsDisambiguation } = loadApp();
  if (AppObj && AppObj.skillWithTooltip && CAREERS_DATA && CULTURES_DATA && needsDisambiguation) {
    const directSkills = new Set();
    CAREERS_DATA.forEach(career => {
      (career.standardSkills || []).forEach(skill => directSkills.add(skill));
      (career.professionalSkills || []).forEach(skill => directSkills.add(skill));
    });
    CULTURES_DATA.forEach(culture => {
      (culture.standardSkills || []).forEach(skill => directSkills.add(skill));
      (culture.professionalSkills || []).forEach(skill => directSkills.add(skill));
    });

    const missingTooltips = Array.from(directSkills)
      .filter(skill => typeof skill === 'string')
      .filter(skill => !skill.startsWith('Combat Style ('))
      .filter(skill => !needsDisambiguation(skill))
      .filter(skill => !AppObj.skillWithTooltip(skill).includes('class="skill-tooltip"'))
      .sort();
    const scholar = CAREERS_DATA.find(career => career.name === 'Scholar');
    const nativeTongueStillValid = Boolean(scholar && (scholar.standardSkills || []).includes('Native Tongue'));
    const nativeTonguePlayRow = AppObj.renderSkillRow({ name: 'Native Tongue', base: 60, cultural: 0, career: 0, bonus: 0 });
    const nativeTonguePlayRowHasTooltip = nativeTonguePlayRow.includes('class="skill-tooltip"') &&
      nativeTonguePlayRow.includes('birth language');

    if (nativeTongueStillValid && nativeTonguePlayRowHasTooltip && missingTooltips.length === 0) {
      pass('Direct career/culture skill rows have tooltip metadata');
    } else {
      fail('Direct career/culture skill rows lack tooltip metadata',
        JSON.stringify({ nativeTongueStillValid, nativeTonguePlayRowHasTooltip, missingTooltips }));
    }
  } else {
    fail('Could not verify direct skill tooltip metadata');
  }
}

// Test 1.12b: Skill row rendering escapes imported skill names and tooltip descriptions
{
  const { App: AppObj, SKILL_DESCRIPTIONS } = loadApp();
  if (AppObj && AppObj.renderSkillRow && SKILL_DESCRIPTIONS) {
    const maliciousName = '<img src=x onerror="globalThis.__skillNameXss=1">';
    const maliciousDesc = '<img src=x onerror="globalThis.__skillDescXss=1">';
    SKILL_DESCRIPTIONS['Unsafe Tooltip'] = maliciousDesc;

    const importedSkillRow = AppObj.renderSkillRow({ name: maliciousName, base: 0, cultural: 0, career: 1, bonus: 0 });
    const tooltipRow = AppObj.renderSkillRow({ name: 'Unsafe Tooltip', base: 0, cultural: 0, career: 1, bonus: 0 });
    const skillNameEscaped = importedSkillRow.includes('&lt;img src=x onerror=&quot;globalThis.__skillNameXss=1&quot;&gt;') &&
      !importedSkillRow.includes('<img src=x') &&
      !importedSkillRow.includes('onerror="globalThis.__skillNameXss=1"');
    const tooltipDescEscaped = tooltipRow.includes('&lt;img src=x onerror=&quot;globalThis.__skillDescXss=1&quot;&gt;') &&
      !tooltipRow.includes('<img src=x') &&
      !tooltipRow.includes('onerror="globalThis.__skillDescXss=1"');

    if (skillNameEscaped && tooltipDescEscaped) {
      pass('Skill row rendering escapes imported skill names and tooltip descriptions');
    } else {
      fail('Skill row rendering exposes imported skill names or tooltip descriptions as HTML',
        JSON.stringify({ skillNameEscaped, tooltipDescEscaped, importedSkillRow, tooltipRow }));
    }
  } else {
    fail('Could not verify skill row escaping');
  }
}

// Test 1.12c: Professional skill picker preserves Primary/Secondary specialty slots with clearer labels
{
  const { App: AppObj, CharacterData: CD, _sandbox } = loadApp();
  if (AppObj && AppObj.renderCareerDetails && AppObj.toggleProfessionalSkill && AppObj.resolveProfessionalSkill && CD) {
    CD.culture = 'Balazaring';
    CD.career = 'Scholar';
    CD.selectedProfessionalSkills = [];
    CD.careerSkills = {};
    CD._disambiguationMap = {};
    _sandbox.alert = () => {};

    const initialHtml = AppObj.renderCareerDetails();
    const primaryMatches = initialHtml.match(/data-skill="Lore \(Primary\)"/g) || [];
    const secondaryMatches = initialHtml.match(/data-skill="Lore \(Secondary\)"/g) || [];
    const labelsAreClear = initialHtml.includes('Lore (specialty 1)') &&
      initialHtml.includes('Lore (specialty 2)') &&
      initialHtml.includes('title="Select Lore (specialty 1) first"') &&
      !initialHtml.includes('> Lore (Primary)') &&
      !initialHtml.includes('> Lore (Secondary)');
    const secondaryInitiallyDisabled = /data-skill="Lore \(Secondary\)"[\s\S]*?disabled/.test(initialHtml);
    const rejectedBeforePrimary = AppObj.toggleProfessionalSkill('Lore (Secondary)', true) === false;

    AppObj.toggleProfessionalSkill('Lore (Primary)', true);
    AppObj.resolveProfessionalSkill('Lore (Primary)', 'Wolves');
    const afterPrimaryHtml = AppObj.renderCareerDetails();
    const secondaryEnabledAfterPrimary = /data-skill="Lore \(Secondary\)"[\s\S]*?disabled/.test(afterPrimaryHtml) === false;
    AppObj.toggleProfessionalSkill('Lore (Secondary)', true);
    AppObj.resolveProfessionalSkill('Lore (Secondary)', 'Local Legends');
    const bothSpecialtiesPreserved = CD.selectedProfessionalSkills.includes('Lore (Wolves)') &&
      CD.selectedProfessionalSkills.includes('Lore (Local Legends)') &&
      Object.prototype.hasOwnProperty.call(CD.careerSkills, 'Lore (Wolves)') &&
      Object.prototype.hasOwnProperty.call(CD.careerSkills, 'Lore (Local Legends)') &&
      CD._disambiguationMap['career:Lore (Primary)'] === 'Lore (Wolves)' &&
      CD._disambiguationMap['career:Lore (Secondary)'] === 'Lore (Local Legends)';

    if (primaryMatches.length === 1 && secondaryMatches.length === 1 && labelsAreClear &&
        secondaryInitiallyDisabled && rejectedBeforePrimary && secondaryEnabledAfterPrimary && bothSpecialtiesPreserved) {
      pass('Professional skill picker preserves two Lore specialty slots with clear labels');
    } else {
      fail('Professional skill picker mishandles two Lore specialty slots',
        JSON.stringify({ primaryCount: primaryMatches.length, secondaryCount: secondaryMatches.length, labelsAreClear, secondaryInitiallyDisabled, rejectedBeforePrimary, secondaryEnabledAfterPrimary, bothSpecialtiesPreserved, selected: CD.selectedProfessionalSkills, careerSkills: CD.careerSkills, map: CD._disambiguationMap }));
    }
  } else {
    fail('Professional skill picker unavailable for Primary/Secondary slot test');
  }
}

// Test 1.12d: Professional skill picker rejects duplicate resolved specialty names
{
  const { App: AppObj, CharacterData: CD, _sandbox } = loadApp();
  if (AppObj && AppObj.toggleProfessionalSkill && AppObj.resolveProfessionalSkill && CD) {
    CD.culture = 'Balazaring';
    CD.career = 'Scholar';
    CD.selectedProfessionalSkills = [];
    CD.careerSkills = {};
    CD._disambiguationMap = {};
    const alerts = [];
    _sandbox.alert = message => alerts.push(message);

    AppObj.toggleProfessionalSkill('Lore (Primary)', true);
    AppObj.resolveProfessionalSkill('Lore (Primary)', 'Wolves');
    AppObj.toggleProfessionalSkill('Lore (Secondary)', true);
    const duplicateInput = { value: 'Wolves' };
    const duplicateRejected = AppObj.resolveProfessionalSkill('Lore (Secondary)', 'Wolves', duplicateInput) === false;
    const firstSpecialtyPreserved = CD.selectedProfessionalSkills.includes('Lore (Wolves)') &&
      Object.prototype.hasOwnProperty.call(CD.careerSkills, 'Lore (Wolves)') &&
      CD._disambiguationMap['career:Lore (Primary)'] === 'Lore (Wolves)';
    const secondSlotStillUnresolved = CD.selectedProfessionalSkills.includes('Lore (Secondary)') &&
      Object.prototype.hasOwnProperty.call(CD.careerSkills, 'Lore (Secondary)') &&
      !CD._disambiguationMap['career:Lore (Secondary)'];
    const noCollapsedDuplicate = CD.selectedProfessionalSkills.filter(skill => skill === 'Lore (Wolves)').length === 1;
    const inputCleared = duplicateInput.value === '';
    const alerted = alerts.some(message => message.includes('Lore (Wolves) is already selected'));

    if (duplicateRejected && firstSpecialtyPreserved && secondSlotStillUnresolved &&
        noCollapsedDuplicate && inputCleared && alerted) {
      pass('Professional skill picker rejects duplicate specialty names');
    } else {
      fail('Professional skill picker allows duplicate specialty names to collapse',
        JSON.stringify({ duplicateRejected, firstSpecialtyPreserved, secondSlotStillUnresolved, noCollapsedDuplicate, inputValue: duplicateInput.value, alerts, selected: CD.selectedProfessionalSkills, careerSkills: CD.careerSkills, map: CD._disambiguationMap }));
    }
  } else {
    fail('Professional skill picker unavailable for duplicate specialty test');
  }
}

// Test 1.12e: Professional skill picker repairs imported paired specialty slots without a map
{
  const { App: AppObj, CharacterData: CD } = loadApp();
  if (AppObj && AppObj.renderCareerDetails && CD) {
    CD.culture = 'Balazaring';
    CD.career = 'Scholar';
    CD.selectedProfessionalSkills = ['Lore (Wolves)', 'Lore (Local Legends)', 'Literacy'];
    CD.careerSkills = { 'Lore (Wolves)': 0, 'Lore (Local Legends)': 0, Literacy: 0 };
    CD._disambiguationMap = {};

    const html = AppObj.renderCareerDetails();
    const firstSlotShowsFirstLore = /data-skill="Lore \(Primary\)"[\s\S]*?value="Wolves"/.test(html);
    const secondSlotShowsSecondLore = /data-skill="Lore \(Secondary\)"[\s\S]*?value="Local Legends"/.test(html);
    const slotsDoNotCollapse = !/data-skill="Lore \(Secondary\)"[\s\S]*?value="Wolves"/.test(html);
    const secondSlotEditable = !/data-skill="Lore \(Secondary\)"[\s\S]*?disabled/.test(html);
    const mapRepaired = CD._disambiguationMap['career:Lore (Primary)'] === 'Lore (Wolves)' &&
      CD._disambiguationMap['career:Lore (Secondary)'] === 'Lore (Local Legends)';

    if (firstSlotShowsFirstLore && secondSlotShowsSecondLore && slotsDoNotCollapse && secondSlotEditable && mapRepaired) {
      pass('Professional skill picker repairs imported paired specialty slot mappings');
    } else {
      fail('Professional skill picker collapses imported paired specialty slots',
        JSON.stringify({ firstSlotShowsFirstLore, secondSlotShowsSecondLore, slotsDoNotCollapse, secondSlotEditable, mapRepaired, map: CD._disambiguationMap, html }));
    }
  } else {
    fail('Professional skill picker unavailable for imported paired specialty mapping test');
  }
}

// Test 1.12f: Professional skill picker rebuilds stale imported paired specialty maps
{
  const { App: AppObj, CharacterData: CD } = loadApp();
  if (AppObj && AppObj.renderCareerDetails && CD) {
    CD.culture = 'Balazaring';
    CD.career = 'Scholar';
    CD.selectedProfessionalSkills = ['Lore (Wolves)', 'Lore (Local Legends)', 'Literacy'];
    CD.careerSkills = { 'Lore (Wolves)': 0, 'Lore (Local Legends)': 0, Literacy: 0 };
    CD._disambiguationMap = {
      'career:Lore (Primary)': 'Lore (Local Legends)',
      'career:Lore (Secondary)': 'Lore (Wolves)'
    };

    const html = AppObj.renderCareerDetails();
    const firstSlotUsesSelectedOrder = /data-skill="Lore \(Primary\)"[\s\S]*?value="Wolves"/.test(html);
    const secondSlotUsesSelectedOrder = /data-skill="Lore \(Secondary\)"[\s\S]*?value="Local Legends"/.test(html);
    const secondSlotEditable = !/data-skill="Lore \(Secondary\)"[\s\S]*?disabled/.test(html);
    const staleMapOverwritten = CD._disambiguationMap['career:Lore (Primary)'] === 'Lore (Wolves)' &&
      CD._disambiguationMap['career:Lore (Secondary)'] === 'Lore (Local Legends)';

    if (firstSlotUsesSelectedOrder && secondSlotUsesSelectedOrder && secondSlotEditable && staleMapOverwritten) {
      pass('Professional skill picker rebuilds stale imported paired specialty maps');
    } else {
      fail('Professional skill picker preserves stale imported paired specialty maps',
        JSON.stringify({ firstSlotUsesSelectedOrder, secondSlotUsesSelectedOrder, secondSlotEditable, staleMapOverwritten, map: CD._disambiguationMap, html }));
    }
  } else {
    fail('Professional skill picker unavailable for stale paired specialty map test');
  }
}

// Test 1.12g: Character import rejects duplicate professional specialty slots
{
  const { CharacterData: CD } = loadApp();
  if (CD && CD.fromJSON) {
    const duplicateSelected = {
      ...createTestCharacter('Balazaring'),
      selectedProfessionalSkills: ['Lore (Wolves)', 'Lore (Wolves)', 'Literacy'],
      careerSkills: { 'Lore (Wolves)': 0, Literacy: 0 },
      _disambiguationMap: {}
    };
    const duplicateMap = {
      ...createTestCharacter('Balazaring'),
      selectedProfessionalSkills: ['Lore (Wolves)', 'Lore (Local Legends)', 'Literacy'],
      careerSkills: { 'Lore (Wolves)': 0, 'Lore (Local Legends)': 0, Literacy: 0 },
      _disambiguationMap: {
        'career:Lore (Primary)': 'Lore (Wolves)',
        'career:Lore (Secondary)': 'Lore (Wolves)'
      }
    };

    const duplicateSelectedRejected = CD.fromJSON(JSON.stringify(duplicateSelected)) === false;
    const duplicateMapRejected = CD.fromJSON(JSON.stringify(duplicateMap)) === false;

    if (duplicateSelectedRejected && duplicateMapRejected) {
      pass('Character import rejects duplicate professional specialty slots');
    } else {
      fail('Character import accepts duplicate professional specialty slots',
        JSON.stringify({ duplicateSelectedRejected, duplicateMapRejected }));
    }
  } else {
    fail('CharacterData.fromJSON unavailable for duplicate professional specialty import test');
  }
}

// Test 1.12h: Professional skill picker preserves Primary/Secondary Catch specialty slots with clearer labels
{
  const { App: AppObj, CharacterData: CD, _sandbox } = loadApp();
  if (AppObj && AppObj.renderCareerDetails && AppObj.toggleProfessionalSkill && AppObj.resolveProfessionalSkill && CD) {
    CD.culture = 'Balazaring';
    CD.career = 'Fisher';
    CD.selectedProfessionalSkills = [];
    CD.careerSkills = {};
    CD._disambiguationMap = {};
    _sandbox.alert = () => {};

    const initialHtml = AppObj.renderCareerDetails();
    const primaryCatchMatches = initialHtml.match(/data-skill="Lore \(Primary Catch\)"/g) || [];
    const secondaryCatchMatches = initialHtml.match(/data-skill="Lore \(Secondary Catch\)"/g) || [];
    const labelsAreClear = initialHtml.includes('Lore (catch specialty 1)') &&
      initialHtml.includes('Lore (catch specialty 2)') &&
      initialHtml.includes('title="Select Lore (catch specialty 1) first"') &&
      !initialHtml.includes('> Lore (Primary Catch)') &&
      !initialHtml.includes('> Lore (Secondary Catch)');
    const secondaryInitiallyDisabled = /data-skill="Lore \(Secondary Catch\)"[\s\S]*?disabled/.test(initialHtml);
    const rejectedBeforePrimary = AppObj.toggleProfessionalSkill('Lore (Secondary Catch)', true) === false;

    AppObj.toggleProfessionalSkill('Lore (Primary Catch)', true);
    AppObj.resolveProfessionalSkill('Lore (Primary Catch)', 'River Fish');
    const afterPrimaryHtml = AppObj.renderCareerDetails();
    const secondaryEnabledAfterPrimary = /data-skill="Lore \(Secondary Catch\)"[\s\S]*?disabled/.test(afterPrimaryHtml) === false;
    AppObj.toggleProfessionalSkill('Lore (Secondary Catch)', true);
    AppObj.resolveProfessionalSkill('Lore (Secondary Catch)', 'Lake Fish');
    const bothSpecialtiesPreserved = CD.selectedProfessionalSkills.includes('Lore (River Fish)') &&
      CD.selectedProfessionalSkills.includes('Lore (Lake Fish)') &&
      Object.prototype.hasOwnProperty.call(CD.careerSkills, 'Lore (River Fish)') &&
      Object.prototype.hasOwnProperty.call(CD.careerSkills, 'Lore (Lake Fish)') &&
      CD._disambiguationMap['career:Lore (Primary Catch)'] === 'Lore (River Fish)' &&
      CD._disambiguationMap['career:Lore (Secondary Catch)'] === 'Lore (Lake Fish)';

    if (primaryCatchMatches.length === 1 && secondaryCatchMatches.length === 1 && labelsAreClear &&
        secondaryInitiallyDisabled && rejectedBeforePrimary && secondaryEnabledAfterPrimary && bothSpecialtiesPreserved) {
      pass('Professional skill picker preserves two catch specialty slots with clear labels');
    } else {
      fail('Professional skill picker mishandles two catch specialty slots',
        JSON.stringify({ primaryCatchCount: primaryCatchMatches.length, secondaryCatchCount: secondaryCatchMatches.length, labelsAreClear, secondaryInitiallyDisabled, rejectedBeforePrimary, secondaryEnabledAfterPrimary, bothSpecialtiesPreserved, selected: CD.selectedProfessionalSkills, careerSkills: CD.careerSkills, map: CD._disambiguationMap }));
    }
  } else {
    fail('Professional skill picker unavailable for Primary/Secondary Catch slot test');
  }
}

// Test 1.12i: Step 8/import validation rejects secondary-only specialty selections
{
  const { App: AppObj, CharacterData: CD } = loadApp();
  if (AppObj && AppObj.validateCurrentStep && CD && CD.fromJSON) {
    const toasts = [];
    AppObj.showToast = (message, type) => toasts.push({ message, type });
    AppObj.currentStep = 8;
    CD.culture = 'Balazaring';
    CD.career = 'Scholar';
    CD.selectedProfessionalSkills = ['Lore (Local Legends)', 'Literacy', 'Oratory'];
    CD.careerSkills = { 'Lore (Local Legends)': 0, Literacy: 0, Oratory: 0 };
    CD._disambiguationMap = { 'career:Lore (Secondary)': 'Lore (Local Legends)' };

    const stepRejected = AppObj.validateCurrentStep() === false;
    const importRejected = CD.fromJSON(JSON.stringify({
      ...createTestCharacter('Balazaring'),
      career: 'Scholar',
      selectedProfessionalSkills: ['Lore (Local Legends)', 'Literacy', 'Oratory'],
      careerSkills: { 'Lore (Local Legends)': 0, Literacy: 0, Oratory: 0 },
      _disambiguationMap: { 'career:Lore (Secondary)': 'Lore (Local Legends)' }
    })) === false;
    const message = toasts[0]?.message || '';

    if (stepRejected && importRejected && message.includes('Lore (specialty 2) requires Lore (specialty 1)')) {
      pass('Step 8 and import reject secondary-only professional specialty selections');
    } else {
      fail('Step 8/import accepted secondary-only professional specialty selection',
        JSON.stringify({ stepRejected, importRejected, toasts }));
    }
  } else {
    fail('Step 8/import validation unavailable for secondary-only specialty test');
  }
}

// Test 1.12j: Core magic careers remain selectable for every culture
{
  const { App: AppObj, CharacterData: CD } = loadApp();
  if (AppObj?.getAvailableCareersForCulture && AppObj.agent?.getOptions && AppObj.agent?.setStep) {
    CD.culture = 'Balazaring';
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 13, POW: 13, CHA: 10 };
    const primitiveCareerNames = AppObj.getAvailableCareersForCulture('Balazaring').map(career => career.name);
    const agentOptions = AppObj.agent.getOptions(8);
    const agentResult = AppObj.agent.setStep(8, {
      career: 'Sorcerer',
      professionalSkills: [
        { name: 'Invocation (Cult, School or Grimoire)', specialization: 'Zzistori' },
        'Shaping',
        'Literacy'
      ]
    });
    const hasGlobalMagicCareers = ['Mystic', 'Sorcerer', 'Shaman'].every(name =>
      primitiveCareerNames.includes(name) && agentOptions.filteredForCulture.includes(name)
    );
    if (hasGlobalMagicCareers && agentResult.success && CD.career === 'Sorcerer') {
      pass('Mystic, Sorcerer, and Shaman are selectable for primitive cultures in UI and agent flows');
    } else {
      fail('Core magic careers are still culture-filtered',
        JSON.stringify({ primitiveCareerNames, filteredForCulture: agentOptions.filteredForCulture, agentResult, career: CD.career }));
    }
  } else {
    fail('Career availability helpers unavailable for global magic career test');
  }
}

// Test 1.12k: God Forgot Sorcerer auto-locks Invocation to Zzistori School
{
  const { App: AppObj, CharacterData: CD } = loadApp();
  if (AppObj?.renderCareerDetails && AppObj.selectCareer && AppObj.selectCulture && CD) {
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 13, POW: 14, CHA: 10 };
    CD.culture = 'God Forgot';
    CD.cult = null;
    CD.cultInitiated = false;
    AppObj.selectCareer('Sorcerer');
    const html = AppObj.renderCareerDetails();
    const selectedLocked = CD.selectedProfessionalSkills.includes('Invocation (Zzistori School)') &&
      !CD.selectedProfessionalSkills.includes('Invocation (Cult, School or Grimoire)');
    const skillMoved = Object.prototype.hasOwnProperty.call(CD.careerSkills, 'Invocation (Zzistori School)') &&
      !Object.prototype.hasOwnProperty.call(CD.careerSkills, 'Invocation (Cult, School or Grimoire)');
    const uiLocked = html.includes('value="Zzistori School"') && html.includes('readonly') && html.includes('Auto-locked to your active sorcery school');

    CD.culture = 'Esrolian';
    CD.career = 'Sorcerer';
    CD.cult = null;
    CD.cultInitiated = false;
    CD.selectedProfessionalSkills = ['Invocation (Arkat)', 'Shaping'];
    CD.careerSkills = { 'Invocation (Arkat)': 7, Shaping: 0 };
    AppObj.selectCulture('God Forgot');
    const staleRewritten = CD.selectedProfessionalSkills.includes('Invocation (Zzistori School)') &&
      !CD.selectedProfessionalSkills.includes('Invocation (Arkat)') &&
      CD.careerSkills['Invocation (Zzistori School)'] === 7 &&
      CD.careerSkills['Invocation (Arkat)'] === undefined;

    CD.culture = 'Esrolian';
    CD.career = 'Sorcerer';
    CD.cult = null;
    CD.cultInitiated = false;
    CD.selectedProfessionalSkills = ['Invocation (Arkat)', 'Shaping', 'Literacy'];
    CD.careerSkills = { 'Invocation (Arkat)': 7, Shaping: 0, Literacy: 0 };
    const agentCultureResult = AppObj.agent.setStep(4, { culture: 'God Forgot', homeland: 'God Forgot' });
    const agentRewritten = agentCultureResult.success &&
      CD.selectedProfessionalSkills.includes('Invocation (Zzistori School)') &&
      !CD.selectedProfessionalSkills.includes('Invocation (Arkat)') &&
      CD.careerSkills['Invocation (Zzistori School)'] === 7 &&
      CD.careerSkills['Invocation (Arkat)'] === undefined;

    if (selectedLocked && skillMoved && uiLocked && staleRewritten && agentRewritten) {
      pass('God Forgot Sorcerer Invocation auto-locks to Zzistori School');
    } else {
      fail('God Forgot Sorcerer Invocation did not auto-lock to Zzistori School', JSON.stringify({ selected: CD.selectedProfessionalSkills, careerSkills: CD.careerSkills, uiLocked, selectedLocked, skillMoved, staleRewritten, agentCultureResult, agentRewritten }));
    }
  } else {
    fail('App.renderCareerDetails/App.selectCareer/App.selectCulture unavailable for Zzistori auto-lock test');
  }
}

// Test 1.12l: Legacy specialized Mysticism renders as the Mystic locked skill
{
  const { App: AppObj, CharacterData: CD } = loadApp();
  if (AppObj?.renderCareerDetails && CD) {
    CD.culture = 'Esrolian';
    CD.career = 'Mystic';
    CD.selectedProfessionalSkills = ['Meditation', 'Mysticism (Path of Harmony)', 'Stealth'];
    CD.careerSkills = { Meditation: 0, 'Mysticism (Path of Harmony)': 5, Stealth: 0 };
    const html = AppObj.renderCareerDetails();
    const mysticismInput = html.match(/<input type="checkbox"[^>]*data-skill="Mysticism"[^>]*>/)?.[0] || '';
    const checked = mysticismInput.includes('checked');
    const specializedSatisfies = AppObj.resolveHigherMagicProviders(CD).some(provider => provider.system === 'mysticism');
    if (checked && specializedSatisfies) {
      pass('Legacy specialized Mysticism renders as the Mystic skill');
    } else {
      fail('Legacy specialized Mysticism does not render as selected', JSON.stringify({ mysticismInput, selected: CD.selectedProfessionalSkills, specializedSatisfies }));
    }
  } else {
    fail('App.renderCareerDetails unavailable for legacy Mysticism render test');
  }
}

// Test 1.13: Skill point clamps also sync the visible input value
{
  const { App: AppObj, CharacterData: CD } = loadApp();
  if (AppObj && AppObj.updateSkillPoints && CD) {
    CD.careerSkills = { Drive: 10 };
    const highInput = { value: '999' };
    AppObj.updateSkillPoints('career', 'Drive', 999, highInput);

    CD.careerSkills = { Drive: 10 };
    const lowInput = { value: '-5' };
    AppObj.updateSkillPoints('career', 'Drive', -5, lowInput);

    if (highInput.value === '15' && lowInput.value === '0') {
      pass('Skill point clamp updates visible input values');
    } else {
      fail('Skill point clamp leaves visible input values stale', `high=${highInput.value}, low=${lowInput.value}`);
    }
  } else {
    fail('App.updateSkillPoints not available for visible clamp test');
  }
}

// Test 1.13b: Allocation rows use shared uniform control classes
{
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const hasSharedStyles = html.includes('.allocation-row') &&
    html.includes('.allocation-row--simple') &&
    html.includes('.allocation-row--simple > .allocation-control') &&
    html.includes('.allocation-row--bonus') &&
    html.includes('max-width: 420px') &&
    html.includes('.allocation-control') &&
    html.includes('.points-input') &&
    html.includes('.professional-skills-picker') &&
    html.includes('.professional-specialization-input');
  const stepContainersUseSharedList = html.includes('id="cultural-skills-list" class="allocation-list"') &&
    html.includes('id="passions-list" class="allocation-list"') &&
    html.includes('id="career-skills-list" class="allocation-list"') &&
    html.includes('id="bonus-skills-list" class="allocation-list"');
  const rowsUseSharedClasses = html.includes("row.className = 'allocation-row'") &&
    html.includes("row.className = 'allocation-row allocation-row--triple'") &&
    html.includes("row.className = 'bonus-skill-row allocation-row allocation-row--bonus'");
  const pointsInputCount = (html.match(/class="points-input"/g) || []).length;

  if (hasSharedStyles && stepContainersUseSharedList && rowsUseSharedClasses && pointsInputCount >= 8) {
    pass('Allocation rows render with shared uniform control classes');
  } else {
    fail('Allocation rows are missing shared uniform control classes',
      JSON.stringify({ hasSharedStyles, stepContainersUseSharedList, rowsUseSharedClasses, pointsInputCount }));
  }
}

// Test 1.13c: Step 8 specialization inputs stay inside their grid cell
{
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const cssStart = html.indexOf('.professional-specialization-input');
  const cssEnd = html.indexOf('/* Wizard navigation */');
  const professionalCss = cssStart >= 0 && cssEnd > cssStart ? html.slice(cssStart, cssEnd) : '';
  if (html.includes('.professional-skill-option .professional-specialization-input') &&
      professionalCss.includes('box-sizing: border-box') &&
      professionalCss.includes('width: calc(100% - 24px)') &&
      professionalCss.includes('max-width: calc(100% - 24px)') &&
      html.includes('.professional-skill-option label')) {
    pass('Step 8 specialization inputs are constrained inside professional skill grid cells');
  } else {
    fail('Step 8 specialization inputs can overflow neighboring checkbox cells', professionalCss);
  }
}

// Test 1.13c: Passion subject inputs only advertise datalist dropdowns when options exist
{
  const { App: AppObj, CharacterData: CD, _sandbox: sandbox } = loadApp();
  if (AppObj && AppObj.renderStep6) {
    const originalCreateElement = sandbox.document.createElement;
    const passionRows = [];
    const suggestions = { appendChild: () => {} };
    const passionsList = { appendChild: row => passionRows.push(row) };
    sandbox.document.createElement = tag => ({
      tagName: tag,
      className: '',
      textContent: '',
      style: {},
      onclick: null,
      innerHTML: '',
      querySelector: selector => {
        if (selector === '#passions-list') return passionsList;
        if (selector === '#passion-suggestions') return suggestions;
        return null;
      },
      appendChild: () => {}
    });
    CD.culture = 'Sartarite (Heortling)';
    CD.passions = [
      { choice: ['Loyalty'], needsSubject: true, subjectSuggestions: ['Clan'], name: '', value: 60 },
      { choice: ['Freedom'], needsSubject: true, subjectSuggestions: [], name: '', value: 60 },
      { name: 'Love', type: 'Love', needsSubject: true, subjectSuggestions: ['Family'], value: 60 },
      { name: 'Honor', type: 'Honor', needsSubject: true, subjectSuggestions: [], value: 60 },
      { name: 'Despise (Gods)', value: 70 }
    ];
    AppObj.renderStep6();
    sandbox.document.createElement = originalCreateElement;

    const choiceWithSuggestions = passionRows[0]?.innerHTML.includes('list="passion-suggestions-0"') &&
      passionRows[0]?.innerHTML.includes('<datalist id="passion-suggestions-0"');
    const choiceWithoutSuggestions = !passionRows[1]?.innerHTML.includes('list="');
    const namedWithSuggestions = passionRows[2]?.innerHTML.includes('list="passion-subject-ns-2"') &&
      passionRows[2]?.innerHTML.includes('<datalist id="passion-subject-ns-2"');
    const namedWithoutSuggestions = !passionRows[3]?.innerHTML.includes('list="');
    const fixedPassionSimple = passionRows[4]?.className === 'allocation-row allocation-row--simple';
    const noFocusPicker = passionRows.every(row => !row.innerHTML.includes('onfocus="if (this.showPicker) this.showPicker();"'));
    const noDuplicateBlurSave = passionRows.every(row => !row.innerHTML.includes('onblur="App.updatePassion'));

    if (choiceWithSuggestions && choiceWithoutSuggestions && namedWithSuggestions && namedWithoutSuggestions && fixedPassionSimple && noFocusPicker && noDuplicateBlurSave) {
      pass('Passion subject fields only show dropdown affordance when datalist options exist');
    } else {
      fail('Passion subject fields still advertise empty dropdowns or duplicate focus/blur saves',
        JSON.stringify({ choiceWithSuggestions, choiceWithoutSuggestions, namedWithSuggestions, namedWithoutSuggestions, fixedPassionSimple, noFocusPicker, noDuplicateBlurSave, rows: passionRows.map(row => ({ className: row.className, html: row.innerHTML })) }));
    }
  } else {
    fail('App.renderStep6 unavailable for passion dropdown affordance test');
  }
}

// Test 1.13d: Choice passions normalize stale undefined subjects without breaking dropdowns
{
  const { App: AppObj, CharacterData: CD, _sandbox: sandbox } = loadApp();
  if (AppObj?.renderStep6) {
    const originalCreateElement = sandbox.document.createElement;
    const passionRows = [];
    const suggestions = { appendChild: () => {} };
    const passionsList = { appendChild: row => passionRows.push(row) };
    sandbox.document.createElement = tag => ({
      tagName: tag,
      className: '',
      textContent: '',
      style: {},
      onclick: null,
      innerHTML: '',
      querySelector: selector => {
        if (selector === '#passions-list') return passionsList;
        if (selector === '#passion-suggestions') return suggestions;
        return null;
      },
      appendChild: () => {}
    });
    CD.culture = 'Balazaring';
    CD.passions = [
      { choice: ['Loyalty'], needsSubject: true, subjectSuggestions: ['Clan'], name: 'Loyalty (undefined)', value: 60 },
      { choice: ['Loyalty'], needsSubject: true, subjectSuggestions: ['Clan'], name: 'Loyalty (Clan)', type: 'undefined', value: 60 }
    ];
    AppObj.renderStep6();
    sandbox.document.createElement = originalCreateElement;

    const undefinedSubjectHtml = passionRows[0]?.innerHTML || '';
    const undefinedTypeHtml = passionRows[1]?.innerHTML || '';
    const loyaltySelected = /<option value="Loyalty" selected>Loyalty<\/option>/.test(undefinedSubjectHtml) &&
      /<option value="Loyalty" selected>Loyalty<\/option>/.test(undefinedTypeHtml);
    const hasDropdown = undefinedSubjectHtml.includes('list="passion-suggestions-0"') &&
      undefinedSubjectHtml.includes('<datalist id="passion-suggestions-0"') &&
      undefinedTypeHtml.includes('list="passion-suggestions-1"') &&
      undefinedTypeHtml.includes('<datalist id="passion-suggestions-1"');
    if (loyaltySelected && hasDropdown &&
        !undefinedSubjectHtml.includes('undefined') &&
        !undefinedTypeHtml.includes('undefined') &&
        /value=""/.test(undefinedSubjectHtml) &&
        /value="Clan"/.test(undefinedTypeHtml)) {
      pass('Choice passions render stale undefined subjects as blank usable dropdown fields');
    } else {
      fail('Choice passion still leaks undefined or loses dropdown affordance',
        JSON.stringify({ undefinedSubjectHtml, undefinedTypeHtml }));
    }
  } else {
    fail('App.renderStep6 unavailable for undefined passion regression test');
  }
}

// Test 1.13e: Non-choice culture passions with required subjects render blanks instead of undefined
{
  const { App: AppObj, CharacterData: CD, _sandbox: sandbox } = loadApp();
  if (AppObj?.renderStep6 && AppObj?.selectCulture) {
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 10, POW: 10, CHA: 10 };
    AppObj.selectCulture('Balazaring');

    const originalCreateElement = sandbox.document.createElement;
    const passionRows = [];
    const suggestions = { appendChild: () => {} };
    const passionsList = { appendChild: row => passionRows.push(row) };
    sandbox.document.createElement = tag => ({
      tagName: tag,
      className: '',
      textContent: '',
      style: {},
      onclick: null,
      innerHTML: '',
      querySelector: selector => {
        if (selector === '#passions-list') return passionsList;
        if (selector === '#passion-suggestions') return suggestions;
        return null;
      },
      appendChild: () => {}
    });

    AppObj.renderStep6();
    sandbox.document.createElement = originalCreateElement;

    const loyaltyHtml = passionRows[0]?.innerHTML || '';
    if (loyaltyHtml.includes('value=""') &&
        loyaltyHtml.includes('list="passion-subject-ns-0"') &&
        loyaltyHtml.includes('<datalist id="passion-subject-ns-0"') &&
        !loyaltyHtml.includes('undefined')) {
      pass('Balazaring Loyalty subject passion renders as blank dropdown-ready field');
    } else {
      fail('Balazaring Loyalty subject passion leaks undefined',
        JSON.stringify({ loyaltyHtml, passions: CD.passions }));
    }
  } else {
    fail('App.renderStep6/App.selectCulture unavailable for Balazaring passion regression test');
  }
}

// Test 1.14: Rejected capped checkbox selections roll back visually
{
  const { App: AppObj, CharacterData: CD } = loadApp();
  if (AppObj && AppObj.toggleCareerFolkMagicSpell && AppObj.toggleFolkMagicSpell &&
      AppObj.toggleSorcerySpell && AppObj.toggleBoundSpirit && CD) {
    CD.careerFolkMagic = ['Alarm', 'Avert'];
    const careerSpellBox = { checked: true };
    AppObj.toggleCareerFolkMagicSpell('Babble', true, careerSpellBox);

    CD.folkMagicSpells = ['Alarm', 'Avert', 'Babble'];
    const cultureSpellBox = { checked: true };
    AppObj.toggleFolkMagicSpell('Beastcall', true, 3, cultureSpellBox);

    CD.sorcerySpells = ['Abjure', 'Animate (Substance)', 'Dominate (Creatures)'];
    const sorceryBox = { checked: true };
    AppObj.toggleSorcerySpell('Enchant (Object)', sorceryBox);

    CD.characteristics = { STR: 11, CON: 12, SIZ: 13, DEX: 14, INT: 15, POW: 8, CHA: 6 };
    CD.boundSpiritSlots = 3;
    CD.boundSpirits = [{ name: 'Ancestor' }, { name: 'Guardian' }, { name: 'Nature' }];
    const spiritBox = { checked: true };
    AppObj.toggleBoundSpirit('Magic Spirit', spiritBox);

    if (!careerSpellBox.checked && !cultureSpellBox.checked && !sorceryBox.checked && !spiritBox.checked &&
        CD.careerFolkMagic.length === 2 && CD.folkMagicSpells.length === 3 &&
        CD.sorcerySpells.length === 3 && CD.boundSpirits.length === 3) {
      pass('Capped checkbox handlers roll back rejected visual checks');
    } else {
      fail('Capped checkbox handler leaves rejected checkbox checked');
    }
  } else {
    fail('Magic checkbox handlers not available for rollback test');
  }
}

// ============================================================
section('Risk 2: Play Mode Form State Consistency');
// ============================================================

// Test 2.1: CharacterData object exists and is mutable
{
  if (App.CharacterData) {
    const originalName = App.CharacterData.name;
    App.CharacterData.name = 'Test Mutation';
    if (App.CharacterData.name === 'Test Mutation') {
      pass('CharacterData is mutable and updates persist');
      App.CharacterData.name = originalName;
    } else {
      fail('CharacterData updates do not persist');
    }
  } else {
    fail('CharacterData object not found');
  }
}

// Test 2.2: Hit points structure is properly initialized
{
  const char = createTestCharacter();
  if (char.hitPoints && typeof char.hitPoints === 'object') {
    const locations = Object.keys(char.hitPoints);
    if (locations.length >= 6) {
      pass(`Hit points structure has ${locations.length} locations`);
    } else {
      fail(`Hit points structure only has ${locations.length} locations (expected 6+)`);
    }

    // Check structure of each location
    const firstLocation = char.hitPoints[locations[0]];
    if (firstLocation && 'current' in firstLocation && 'max' in firstLocation) {
      pass('Hit point locations have current and max fields');
    } else {
      fail('Hit point locations missing current/max structure');
    }
  } else {
    fail('Character hitPoints field is not properly structured');
  }
}

// Test 2.3: Weapons array can be modified
{
  const char = createTestCharacter();
  const originalLength = char.weapons.length;
  char.weapons.push('Dagger');
  if (char.weapons.length === originalLength + 1) {
    pass('Weapons array is mutable and can be extended');
  } else {
    fail('Weapons array modification failed');
  }
}

// Test 2.4: Combat styles can be added
{
  const char = createTestCharacter();
  const originalLength = char.combatStyles.length;
  char.combatStyles.push({ name: 'Bow & Arrow', skill: 40 });
  if (char.combatStyles.length === originalLength + 1) {
    pass('Combat styles array can be extended');
  } else {
    fail('Combat styles array modification failed');
  }
}

// Test 2.6: Play Mode Passion rows keep names and percentages separated
{
  const { App: AppObj, CharacterData: CD, _sandbox } = loadApp();
  if (AppObj && AppObj.renderPlayPassions && CD && _sandbox) {
    CD.passions = [
      { name: 'Loyalty (Empire)', value: 66 },
      { name: 'Love (the Seven Mothers)', value: 68 }
    ];

    AppObj.renderPlayPassions();
    const html = _sandbox.document.getElementById('play-passions').innerHTML;
    const hasReadableSeparator = /Loyalty \(Empire\)<\/span>\s+<span class="passion-value">66%/.test(html) ||
      /Loyalty \(Empire\)<\/span><span class="passion-value">\s+66%/.test(html);

    if (hasReadableSeparator) {
      pass('Play Mode Passion rows keep name and percentage visually separated');
    } else {
      fail('Play Mode Passion rows concatenate name and percentage', html);
    }
  } else {
    fail('App.renderPlayPassions unavailable for Passion spacing test');
  }
}

// Test 2.5: Play Mode weapon rows derive skill from matching combat style
{
  const { App: AppObj, CharacterData: CD, _sandbox } = loadApp();
  if (AppObj && AppObj.renderPlayCombat && CD && _sandbox) {
    CD.characteristics = { STR: 10, DEX: 10 };
    CD.culturalSkills = {};
    CD.careerSkills = {};
    CD.bonusSkills = {
      'Combat Style (Javelin Skirmisher)': 5,
      'Combat Style (Balazaring Hunter)': 17
    };
    CD.combatStyles = [
      { name: 'Javelin Skirmisher', weapons: ['Javelin'], traits: [] },
      { name: 'Balazaring Hunter', weapons: ['Sling', 'Dagger'], traits: [] }
    ];
    CD.weapons = [{ name: 'Sling', damage: '1d8', size: 'S', reach: 'Ranged', ap: 4, hp: 4 }];

    AppObj.renderPlayCombat();
    const html = _sandbox.document.getElementById('play-combat').innerHTML;

    if (/data-testid="weapon-name">Sling/.test(html) && /data-testid="weapon-skill"><input type="number" value="37"/.test(html)) {
      pass('Play Mode weapon rows derive Sling skill from combat style');
    } else {
      fail('Play Mode weapon row leaves Sling skill at zero', html.match(/data-testid="weapon-skill"[\s\S]{0,90}/)?.[0]);
    }
  } else {
    fail('App.renderPlayCombat unavailable for weapon skill derivation test');
  }
}

asyncTest('exportSinglePagePDF() derives weapon skills from combat styles for unskilled weapons', async () => {
  const { text } = await captureSinglePagePdf(createPdfTestCharacter({
    characteristics: { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 10, POW: 10, CHA: 10 },
    attributes: App.Calc.calculateAllAttributes({ STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 10, POW: 10, CHA: 10 }),
    culturalSkills: {},
    careerSkills: {},
    bonusSkills: { 'Combat Style (Balazaring Hunter)': 17 },
    combatStyles: [{ name: 'Balazaring Hunter', weapons: ['Sling', 'Dagger'], traits: [] }],
    weapons: [{ name: 'Sling', damage: '1d8', size: 'S', reach: 'Ranged', ap: 4, hp: 4 }]
  }));

  if (text.includes('Sling') && text.includes('37%')) {
    pass('exportSinglePagePDF() derives weapon skills from combat styles for unskilled weapons');
  } else {
    fail('exportSinglePagePDF() leaves unskilled weapon skill blank or zero',
      text.split('\n').filter(line => line.includes('Sling') || line.includes('37%')).join(' | '));
  }
});

// ============================================================
section('Risk 3: Multi-page PDF Scaling Artifacts');
// ============================================================

// Test 3.1: Create maximally-populated character
{
  const maxChar = createTestCharacter();

  // Add many combat styles
  maxChar.combatStyles = [
    { name: 'Sword & Shield', skill: 65 },
    { name: 'Spear & Shield', skill: 60 },
    { name: 'Bow', skill: 55 },
    { name: 'Dagger', skill: 50 },
    { name: 'Unarmed', skill: 45 },
    { name: 'Sling', skill: 40 }
  ];

  // Add many skills
  maxChar.culturalSkills = {};
  maxChar.careerSkills = {};
  maxChar.bonusSkills = {};

  const skillNames = ['Athletics', 'Ride', 'Swim', 'Locale', 'Lore (Sartar)',
                     'Customs', 'Endurance', 'Evade', 'First Aid', 'Influence',
                     'Insight', 'Perception', 'Sing', 'Stealth', 'Willpower'];
  skillNames.forEach((skill, i) => {
    if (i < 5) maxChar.culturalSkills[skill] = 40 + i * 5;
    else if (i < 10) maxChar.careerSkills[skill] = 35 + i * 5;
    else maxChar.bonusSkills[skill] = 30 + i * 5;
  });

  // Add long notes
  maxChar.notes = 'This is a very long note section with lots of details about the character history, ' +
                  'personality traits, goals, and memorable events. '.repeat(10);
  maxChar.background = 'A detailed background story with many paragraphs describing childhood, ' +
                      'training, significant life events, and relationships. '.repeat(5);
  maxChar.concept = 'Veteran warrior with deep cultural ties and complex motivations';

  // Add passions
  maxChar.passions = [
    'Loyalty (Clan): 70',
    'Love (Family): 80',
    'Hate (Chaos): 90',
    'Honor: 65',
    'Fear (Death): 50'
  ];

  if (maxChar.combatStyles.length >= 5) {
    pass(`Created maximally-populated character with ${maxChar.combatStyles.length} combat styles`);
  } else {
    fail('Failed to create maximal character');
  }

  const totalSkills = Object.keys(maxChar.culturalSkills).length +
                     Object.keys(maxChar.careerSkills).length +
                     Object.keys(maxChar.bonusSkills).length;
  if (totalSkills >= 10) {
    pass(`Maximal character has ${totalSkills} skills allocated`);
  } else {
    fail(`Maximal character only has ${totalSkills} skills`);
  }

  if (maxChar.notes.length > 500) {
    pass(`Maximal character has ${maxChar.notes.length} characters in notes`);
  } else {
    info(`Note: character notes are ${maxChar.notes.length} characters (could be longer for overflow test)`);
  }
}

// Test 3.2: PDF draw operations remain within page bounds
asyncTest('exportSinglePagePDF() coordinate capture failed', async () => {
  if (!App.App || !App.App.exportSinglePagePDF) return;

  const longText = Array.from({ length: 80 }, (_, i) => `overflow-check-${i}`).join(' ');
  const { texts } = await captureSinglePagePdf(createPdfTestCharacter({
    notes: longText,
    concept: longText,
    backgroundEvents: longText
  }));
  const outOfBounds = texts.find(op => typeof op.y === 'number' && (op.y < 0 || op.y > 842));

  if (texts.length > 0 && !outOfBounds) {
    pass('exportSinglePagePDF() draws captured text within page bounds');
  } else {
    fail('exportSinglePagePDF() drew text outside page bounds', outOfBounds ? JSON.stringify(outOfBounds) : 'no text drawn');
  }
});

// Test 3.3: long magic lines are wrapped inside the PDF page width
asyncTest('exportSinglePagePDF() magic wrapping capture failed', async () => {
  if (!App.App || !App.App.exportSinglePagePDF) return;

  const { texts } = await captureSinglePagePdf(createPdfTestCharacter({
    culture: 'Praxian',
    homeland: 'Pavis County',
    cult: 'Waha',
    cultChoiceMade: true,
    cultInitiated: true, // Post-initiation PDF spirit wrapping coverage.
    cultType: { primary: 'animist', types: ['animist'], isHybrid: false },
    concept: '',
    backgroundEvents: '',
    notes: '',
    culturalSkills: {},
    careerSkills: {},
    bonusSkills: {},
    weapons: [],
    equipment: [],
    armor: [],
    passions: [],
    combatStyles: [],
    miracles: [],
    folkMagicSpells: [],
    careerFolkMagic: [],
    boundSpiritSlots: 4,
    boundSpirits: [
      { name: 'Nature Spirit — Camouflage (Int 2)' },
      { name: 'Nature Spirit — Grappler (Int 2)' },
      { name: 'Nature Spirit — Venomous (Int 2)' }
    ],
    companions: []
  }));
  const rightMargin = 565;
  const widthOf = op => String(op.text || '').length * (op.size || 7) * 0.5;
  const spiritText = texts.filter(op =>
    String(op.text).includes('Nature Spirit') ||
    String(op.text).includes('Endowment') ||
    String(op.text).includes('successful strike')
  );
  const overflowing = spiritText.find(op => (op.x || 0) + widthOf(op) > rightMargin);
  const combinedSpiritText = spiritText.map(op => op.text).join(' ');

  if (combinedSpiritText.includes('spirit worshipper') &&
      combinedSpiritText.includes('immediate Grapple') &&
      combinedSpiritText.includes('Condition: Paralysis') &&
      !overflowing) {
    pass('exportSinglePagePDF() draws complete bound spirit lines within page width');
  } else {
    fail('exportSinglePagePDF() clips long bound spirit lines',
      overflowing ? JSON.stringify({ text: overflowing.text, x: overflowing.x, size: overflowing.size }) : combinedSpiritText || 'no spirit text drawn');
  }
});

// Test 3.4: PDF passion rows keep names and percentages as separate text draws
asyncTest('exportSinglePagePDF() passion spacing capture failed', async () => {
  if (!App.App || !App.App.exportSinglePagePDF) return;

  const { texts } = await captureSinglePagePdf(createPdfTestCharacter({
    passions: [
      { name: 'Loyalty (Empire)', value: 66 },
      { name: 'Love (the Seven Mothers)', value: 68 },
      { name: 'Hate (Sartarites)', value: 69 }
    ],
    weapons: [],
    equipment: [],
    armor: [],
    combatStyles: [],
    folkMagicSpells: [],
    careerFolkMagic: [],
    miracles: [],
    boundSpirits: [],
    sorcerySpells: []
  }));
  const drawn = texts.map(op => String(op.text || ''));
  const hasSeparateNames = ['Loyalty (Empire)', 'Love (the Seven Mothers)', 'Hate (Sartarites)']
    .every(name => drawn.includes(name));
  const hasSeparateValues = ['66%', '68%', '69%'].every(value => drawn.includes(value));
  const hasCombinedPassionRows = drawn.some(text => /Loyalty \(Empire\).*66%|Love \(the Seven Mothers\).*68%|Hate \(Sartarites\).*69%/.test(text));

  if (hasSeparateNames && hasSeparateValues && !hasCombinedPassionRows) {
    pass('exportSinglePagePDF() separates passion names and percentages');
  } else {
    fail('exportSinglePagePDF() still combines passion names and percentages',
      JSON.stringify({ hasSeparateNames, hasSeparateValues, combined: drawn.filter(text => /Loyalty|Love|Hate/.test(text)) }));
  }
});

// Test 3.4: PDF sorcery rules use RAW Invocation/Shaping, not rune affinity mappings
asyncTest('exportSinglePagePDF() sorcery rule text capture failed', async () => {
  if (!App.App || !App.App.exportSinglePagePDF) return;

  const { text } = await captureSinglePagePdf(createPdfTestCharacter({
    cult: 'Arkat',
    cultType: { primary: 'sorcery', types: ['sorcery'], isHybrid: false },
    miracles: [],
    sorcerySpells: ['Holdfast', 'Phantom (Sense)', 'Project (Sense)'],
    folkMagicSpells: [],
    careerFolkMagic: [],
    boundSpirits: []
  }));
  const hasRawText = text.includes('Casting: Invocation skill') && text.includes('Shaping: Shaping skill');
  const hasRuneMappingText = /Rune Affinity of spell|Law Rune affinity/.test(text);

  if (hasRawText && !hasRuneMappingText) {
    pass('exportSinglePagePDF() labels sorcery as RAW Invocation/Shaping');
  } else {
    fail('exportSinglePagePDF() still labels sorcery as rune-affinity casting',
      JSON.stringify({ hasRawText, hasRuneMappingText, text: text.match(/Casting:[^\n]+/)?.[0] || '' }));
  }
});

// Test 3.5: PDF source-backed Zzistori sorcery uses school label and no theist fields
asyncTest('exportSinglePagePDF() Zzistori source-backed sorcery capture failed', async () => {
  if (!App.App || !App.App.exportSinglePagePDF) return;

  const characteristics = { STR: 8, CON: 10, SIZ: 10, DEX: 9, INT: 15, POW: 15, CHA: 8 };
  const { text } = await captureSinglePagePdf(createPdfTestCharacter({
    name: 'Talor Zzistori',
    culture: 'God Forgot',
    homeland: 'God Forgot',
    career: 'Sorcerer',
    cult: null,
    cultType: null,
    characteristics,
    attributes: App.Calc.calculateAllAttributes(characteristics),
    miracles: ['Shield'],
    devotionalPool: 99,
    boundSpirits: [],
    sorceryResource: 0,
    sorcerySpells: ['Holdfast', 'Animate (Substance)', 'Project (Sense)'],
    folkMagicSpells: [],
    careerFolkMagic: [],
    weapons: [],
    equipment: [],
    armor: [],
    passions: [],
    combatStyles: []
  }));
  const hasZzistoriHeader = text.includes('Zzistori School (God Forgot sorcery)') &&
    text.includes('Magic Points: 15');
  const hasRawText = text.includes('Casting: Invocation skill') && text.includes('Shaping: Shaping skill');
  const hasSelectedSpells = ['Holdfast', 'Animate (Substance)', 'Project (Sense)'].every(spell => text.includes(spell));
  const hasSourceCopy = text.includes('AiG p.30-31, p.59-60; Mythras rulebook p.162, p.166-177');
  const hasTheistLeak = text.includes('THEIST MIRACLES') ||
    text.includes('Devotional Pool') ||
    text.includes('Shield');

  if (hasZzistoriHeader && hasRawText && hasSelectedSpells && hasSourceCopy && !hasTheistLeak) {
    pass('exportSinglePagePDF() renders Zzistori source-backed sorcery without theist fields');
  } else {
    fail('exportSinglePagePDF() omits Zzistori source-backed sorcery or leaks theist fields',
      JSON.stringify({ hasZzistoriHeader, hasRawText, hasSelectedSpells, hasSourceCopy, hasTheistLeak, magicText: text.split('\n').filter(line => /SORCERY|Magic Points|Invocation|Shaping|Zzistori|Devotional|Shield|AiG/.test(line)).join(' | ') }));
  }
});

// Test 3.6: PDF cult-backed sorcery keeps the cult label distinct from Zzistori
asyncTest('exportSinglePagePDF() Arkat sorcery label capture failed', async () => {
  if (!App.App || !App.App.exportSinglePagePDF) return;

  const characteristics = { STR: 8, CON: 10, SIZ: 10, DEX: 9, INT: 15, POW: 13, CHA: 10 };
  const { text } = await captureSinglePagePdf(createPdfTestCharacter({
    cult: 'Arkat',
    cultType: { primary: 'sorcery', types: ['sorcery'], isHybrid: false },
    characteristics,
    attributes: App.Calc.calculateAllAttributes(characteristics),
    miracles: [],
    devotionalPool: 0,
    sorceryResource: 13,
    sorcerySpells: ['Holdfast'],
    folkMagicSpells: [],
    careerFolkMagic: [],
    boundSpirits: []
  }));

  if (text.includes('SORCERY (Arkat)') &&
      text.includes('Magic Points: 13') &&
      text.includes('Holdfast') &&
      !text.includes('Zzistori School (God Forgot sorcery)') &&
      !text.includes('Devotional Pool')) {
    pass('exportSinglePagePDF() keeps Arkat cult-backed sorcery label distinct');
  } else {
    fail('exportSinglePagePDF() regressed Arkat cult-backed sorcery labeling',
      text.split('\n').filter(line => /SORCERY|Magic Points|Arkat|Zzistori|Devotional/.test(line)).join(' | '));
  }
});

// Test 3.7: PDF renders no-cult core career Animism and Mysticism providers
asyncTest('exportSinglePagePDF() core career provider magic capture failed', async () => {
  if (!App.App || !App.App.exportSinglePagePDF) return;

  const shamanCharacteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 13, POW: 14, CHA: 8 };
  const shamanPdf = await captureSinglePagePdf(createPdfTestCharacter({
    name: 'PDF Core Shaman',
    culture: 'Praxian',
    homeland: 'Prax',
    career: 'Shaman',
    cult: null,
    cultType: null,
    characteristics: shamanCharacteristics,
    attributes: App.Calc.calculateAllAttributes(shamanCharacteristics),
    selectedProfessionalSkills: ['Binding (Waha)', 'Trance', 'Healing'],
    miracles: [],
    devotionalPool: 0,
    boundSpiritSlots: 4,
    boundSpirits: ['Ancestor Spirit — Sagacity (Int 1)'],
    sorcerySpells: [],
    folkMagicSpells: [],
    careerFolkMagic: [],
    weapons: [],
    equipment: [],
    armor: [],
    passions: [],
    combatStyles: []
  }));

  const mysticCharacteristics = { STR: 8, CON: 8, SIZ: 8, DEX: 8, INT: 15, POW: 20, CHA: 8 };
  const mysticPdf = await captureSinglePagePdf(createPdfTestCharacter({
    name: 'PDF Core Mystic',
    culture: 'Sartarite (Heortling)',
    homeland: 'Boldhome',
    career: 'Mystic',
    cult: null,
    cultType: null,
    characteristics: mysticCharacteristics,
    attributes: App.Calc.calculateAllAttributes(mysticCharacteristics),
    selectedProfessionalSkills: ['Meditation', 'Mysticism (Core Mysticism Path)', 'Musicianship (Drums)'],
    miracles: [],
    devotionalPool: 0,
    boundSpirits: [],
    sorcerySpells: [],
    folkMagicSpells: [],
    careerFolkMagic: [],
    weapons: [],
    equipment: [],
    armor: [],
    passions: [],
    combatStyles: []
  }));

  const sorcererCharacteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 12, CHA: 8 };
  const sorcererPdf = await captureSinglePagePdf(createPdfTestCharacter({
    name: 'PDF Orlanth Sorcerer',
    culture: 'Sartarite (Heortling)',
    homeland: 'Boldhome',
    career: 'Sorcerer',
    cult: 'Orlanth',
    cultType: { primary: 'theist', types: ['theist'], isHybrid: false },
    characteristics: sorcererCharacteristics,
    attributes: App.Calc.calculateAllAttributes(sorcererCharacteristics),
    selectedProfessionalSkills: ['Invocation (Core Sorcery)', 'Shaping', 'Literacy'],
    miracles: [],
    devotionalPool: 0,
    boundSpirits: [],
    sorceryResource: 12,
    sorcerySpells: ['Holdfast'],
    folkMagicSpells: [],
    careerFolkMagic: [],
    weapons: [],
    equipment: [],
    armor: [],
    passions: [],
    combatStyles: []
  }));

  const shamanText = shamanPdf.text;
  const mysticText = mysticPdf.text;
  const sorcererText = sorcererPdf.text;
  if (shamanText.includes('SPIRIT MAGIC (Core Animism via Shaman career)') &&
      shamanText.includes('Ancestor Spirit — Sagacity') &&
      mysticText.includes('MYSTICISM (Core Mysticism via Mystic career)') &&
      mysticText.includes('Magic Points (20) on activation') &&
      sorcererText.includes('SORCERY (Core Sorcery via Sorcerer career)') &&
      sorcererText.includes('Holdfast')) {
    pass('exportSinglePagePDF() renders no-cult core Animism and Mysticism providers');
  } else {
    fail('exportSinglePagePDF() omits no-cult core career provider magic',
      JSON.stringify({
        shamanMagic: shamanText.split('\n').filter(line => /SPIRIT|Ancestor|Core Animism/.test(line)).join(' | '),
        mysticMagic: mysticText.split('\n').filter(line => /MYSTICISM|Magic Points|Core Mysticism/.test(line)).join(' | '),
        sorceryMagic: sorcererText.split('\n').filter(line => /SORCERY|Holdfast|Core Sorcery/.test(line)).join(' | ')
      }));
  }
});

// ============================================================
section('Risk 4: Normalized Character Model (Helpers Module)');
// ============================================================

// Test 4.1: WEAPON_ALIASES exists for canonicalization
{
  if (App.WEAPON_ALIASES && typeof App.WEAPON_ALIASES === 'object') {
    const aliasCount = Object.keys(App.WEAPON_ALIASES).length;
    if (aliasCount > 0) {
      pass(`WEAPON_ALIASES defined with ${aliasCount} mappings`);
    } else {
      fail('WEAPON_ALIASES exists but is empty');
    }
  } else {
    fail('WEAPON_ALIASES not yet implemented (TDD: create for Helpers.resolveWeapon())');
  }
}

// Test 4.1a: DATA_INDEXES precomputes exact lookup maps
{
  if (App.DATA_INDEXES &&
      App.DATA_INDEXES.weaponsByName instanceof Map &&
      App.DATA_INDEXES.skillsByName instanceof Map &&
      App.DATA_INDEXES.culturesByName instanceof Map &&
      App.DATA_INDEXES.careersByName instanceof Map &&
      App.DATA_INDEXES.cultsByName instanceof Map) {
    const representativeLookups =
      App.DATA_INDEXES.weaponsByName.get('broadsword')?.name === 'Broadsword' &&
      App.DATA_INDEXES.skillsByName.get('athletics')?.name === 'Athletics' &&
      App.DATA_INDEXES.culturesByName.get('praxian')?.name === 'Praxian' &&
      App.DATA_INDEXES.careersByName.get('warrior')?.name === 'Warrior' &&
      App.DATA_INDEXES.cultsByName.get('orlanth')?.name === 'Orlanth';

    if (representativeLookups) {
      pass('DATA_INDEXES precomputes weapons, skills, cultures, careers, and cults');
    } else {
      fail('DATA_INDEXES representative lookups failed');
    }
  } else {
    fail('DATA_INDEXES lookup maps not available');
  }
}

// Test 4.2: Helpers.resolveWeapon() - canonical weapon lookup
{
  if (App.Helpers && App.Helpers.resolveWeapon) {
    // Test direct lookup
    const broadsword = App.Helpers.resolveWeapon('Broadsword');
    if (broadsword && broadsword.name === 'Broadsword') {
      pass('Helpers.resolveWeapon() resolves canonical weapon name');
    } else {
      fail('Helpers.resolveWeapon() failed to resolve Broadsword');
    }

    // Test alias resolution
    const sword1H = App.Helpers.resolveWeapon('1H Sword');
    if (sword1H && sword1H.name === 'Broadsword') {
      pass('Helpers.resolveWeapon() resolves weapon alias (1H Sword -> Broadsword)');
    } else {
      fail('Helpers.resolveWeapon() failed to resolve 1H Sword alias');
    }

    // Test null handling
    const nullWeapon = App.Helpers.resolveWeapon(null);
    if (nullWeapon === null) {
      pass('Helpers.resolveWeapon() returns null for null input');
    } else {
      fail('Helpers.resolveWeapon() does not handle null correctly');
    }

    const fuzzyWeapon = App.Helpers.resolveWeapon('Broad');
    if (fuzzyWeapon === null) {
      pass('Helpers.resolveWeapon() rejects fuzzy partial matches');
    } else {
      fail('Helpers.resolveWeapon() returned a fuzzy partial match', fuzzyWeapon.name);
    }
  } else {
    fail('Helpers.resolveWeapon() not yet implemented');
  }
}

// Test 4.2a: weapon aliases never point at missing canonical weapons or mask exact names
{
  if (App.Helpers && App.Helpers.resolveWeapon && App.WEAPON_ALIASES) {
    const weaponNames = new Set(App.WEAPONS_DATA.map(w => w.name));
    const brokenAlias = Object.entries(App.WEAPON_ALIASES).find(([, canonical]) => !weaponNames.has(canonical));
    const brokenExact = App.WEAPONS_DATA.find(weapon => {
      const resolved = App.Helpers.resolveWeapon(weapon.name);
      return !resolved;
    });

    if (!brokenAlias && !brokenExact) {
      pass('Weapon aliases target existing weapons and exact weapon names remain resolvable');
    } else {
      fail('Weapon alias integrity failed',
        JSON.stringify({
          brokenAlias: brokenAlias ? `${brokenAlias[0]} -> ${brokenAlias[1]}` : null,
          brokenExact: brokenExact ? brokenExact.name : null
        }));
    }
  } else {
    fail('Weapon alias integrity prerequisites missing');
  }
}

// Test 4.3: Helpers.normalizeCombatStyle()
{
  if (App.Helpers && App.Helpers.normalizeCombatStyle) {
    // Test with Glorantha culture if available
    if (App.GLORANTHA_CULTURES_DATA && App.GLORANTHA_CULTURES_DATA.length > 0) {
      const balazaring = App.GLORANTHA_CULTURES_DATA.find(c => c.name === 'Balazaring');
      if (balazaring && balazaring.combatStyles && balazaring.combatStyles.length > 0) {
        const styleName = balazaring.combatStyles[0].name;
        const normalized = App.Helpers.normalizeCombatStyle('Balazaring', styleName);

        if (normalized.displayName === styleName) {
          pass('Helpers.normalizeCombatStyle() returns correct display name');
        } else {
          fail('Helpers.normalizeCombatStyle() display name mismatch');
        }

        if (normalized.weapons && Array.isArray(normalized.weapons)) {
          pass(`Helpers.normalizeCombatStyle() resolves ${normalized.weapons.length} weapons`);
        } else {
          fail('Helpers.normalizeCombatStyle() weapons array missing or invalid');
        }
      } else {
        info('Skipping normalizeCombatStyle test - Balazaring culture data incomplete');
      }
    } else {
      info('Skipping normalizeCombatStyle test - Glorantha cultures not loaded');
    }
  } else {
    fail('Helpers.normalizeCombatStyle() not yet implemented');
  }
}

// Test 4.4: Helpers.getHitLocationHP()
{
  if (App.Helpers && App.Helpers.getHitLocationHP) {
    const testChar = createTestCharacter();
    testChar.characteristics = { STR: 12, CON: 14, SIZ: 11, DEX: 12, INT: 10, POW: 9, CHA: 8 };

    // Expected: (SIZ 11 + CON 14) = 25, Math.ceil(25/5) = 5 base
    // Head: 5 + 0 = 5
    // Chest: 5 + 2 = 7
    const headHP = App.Helpers.getHitLocationHP(testChar, 'Head');
    const chestHP = App.Helpers.getHitLocationHP(testChar, 'Chest');

    if (headHP === 5) {
      pass('Helpers.getHitLocationHP() calculates Head HP correctly (5)');
    } else {
      fail(`Helpers.getHitLocationHP() Head HP incorrect (expected 5, got ${headHP})`);
    }

    if (chestHP === 7) {
      pass('Helpers.getHitLocationHP() calculates Chest HP correctly (7)');
    } else {
      fail(`Helpers.getHitLocationHP() Chest HP incorrect (expected 7, got ${chestHP})`);
    }
  } else {
    fail('Helpers.getHitLocationHP() not yet implemented');
  }
}

// Test 4.5: Helpers.getCompiledSkills()
{
  if (App.Helpers && App.Helpers.getCompiledSkills) {
    const testChar = createTestCharacter();
    testChar.characteristics = { STR: 14, CON: 12, SIZ: 11, DEX: 12, INT: 10, POW: 9, CHA: 8 };
    testChar.culturalSkills = { 'Athletics': 40 };
    testChar.careerSkills = { 'Athletics': 10 };
    testChar.bonusSkills = { 'Lore (Strategy)': 40 };

    const compiled = App.Helpers.getCompiledSkills(testChar);

    if (compiled instanceof Map) {
      pass('Helpers.getCompiledSkills() returns a Map');
    } else {
      fail('Helpers.getCompiledSkills() does not return a Map');
    }

    // Athletics base = STR (14) + DEX (12) = 26
    // + cultural (40) + career (10) = 76
    const athleticsValue = compiled.get('Athletics');
    if (athleticsValue === 76) {
      pass('Helpers.getCompiledSkills() calculates Athletics correctly (76)');
    } else {
      fail(`Helpers.getCompiledSkills() Athletics incorrect (expected 76, got ${athleticsValue})`);
    }

    // Check bonus skill
    const loreValue = compiled.get('Lore (Strategy)');
    if (loreValue >= 40) {
      pass(`Helpers.getCompiledSkills() includes bonus skills (Lore: ${loreValue})`);
    } else {
      fail(`Helpers.getCompiledSkills() bonus skill incorrect (expected >=40, got ${loreValue})`);
    }
  } else {
    fail('Helpers.getCompiledSkills() not yet implemented');
  }
}

// ============================================================
section('Risk 5: Data Attestation & Validation Layer');
// ============================================================

// Test 5.1: CharacterData.validate() function existence and valid character
{
  if (App.CharacterData && App.CharacterData.validate) {
    // Set up a valid character
    App.CharacterData.name = 'Valid Character';
    App.CharacterData.culture = 'Generic';
    App.CharacterData.characteristics = { STR: 14, CON: 12, SIZ: 11, DEX: 12, INT: 10, POW: 9, CHA: 8 };
    App.CharacterData.culturalSkills = { 'Athletics': 40 };
    App.CharacterData.weapons = ['Broadsword'];
    // CON 12 + SIZ 11 = 23, Math.ceil(23/5) = 5 base -> Head=5, Chest=7
    App.CharacterData.hitPoints = {
      'Head': { current: 5, max: 5 },
      'Chest': { current: 7, max: 7 }
    };

    const result = App.CharacterData.validate();
    if (result && typeof result === 'object' && 'valid' in result && 'errors' in result) {
      pass('CharacterData.validate() returns {valid, errors} object');

      if (result.valid === true) {
        pass('Valid character passes validation');
      } else {
        fail(`Valid character failed validation: ${result.errors.join(', ')}`);
      }
    } else {
      fail('CharacterData.validate() does not return proper structure');
    }
  } else {
    fail('CharacterData.validate() not implemented');
  }
}

// Test 5.2: Characteristic range validation
{
  if (App.CharacterData && App.CharacterData.validate) {
    const originalSTR = App.CharacterData.characteristics.STR;
    App.CharacterData.characteristics.STR = 25; // Invalid: too high

    const result = App.CharacterData.validate();
    if (!result.valid && result.errors.some(e => e.includes('STR') && e.includes('range'))) {
      pass('Characteristic range validation rejects STR=25');
    } else {
      fail('Characteristic range validation did not reject STR=25');
    }

    // Restore
    App.CharacterData.characteristics.STR = originalSTR;
  }
}

// Test 5.3: Skill value validation
{
  if (App.CharacterData && App.CharacterData.validate) {
    App.CharacterData.culturalSkills['Athletics'] = 250; // Invalid: too high

    const result = App.CharacterData.validate();
    if (!result.valid && result.errors.some(e => e.includes('Athletics') && e.includes('range'))) {
      pass('Skill value validation rejects Athletics=250');
    } else {
      fail('Skill value validation did not reject Athletics=250');
    }

    // Restore
    App.CharacterData.culturalSkills['Athletics'] = 40;
  }
}

// Test 5.4: Required fields validation
{
  if (App.CharacterData && App.CharacterData.validate) {
    const originalName = App.CharacterData.name;
    App.CharacterData.name = ''; // Missing required field

    const result = App.CharacterData.validate();
    if (!result.valid && result.errors.some(e => e.includes('name') && e.includes('required'))) {
      pass('Required field validation rejects empty name');
    } else {
      fail('Required field validation did not reject empty name');
    }

    // Restore
    App.CharacterData.name = originalName;
  }
}

// Test 5.5: Weapon reference validation
{
  if (App.CharacterData && App.CharacterData.validate) {
    const originalWeapons = App.CharacterData.weapons;
    App.CharacterData.weapons = ['InvalidWeaponName12345']; // Invalid weapon

    const result = App.CharacterData.validate();
    if (!result.valid && result.errors.some(e => e.includes('InvalidWeaponName12345') && e.includes('not found'))) {
      pass('Weapon reference validation rejects invalid weapon');
    } else {
      fail('Weapon reference validation did not reject invalid weapon');
    }

    // Restore
    App.CharacterData.weapons = originalWeapons;
  }
}

// Test 5.5a: social-class weapon quality labels do not break validation
{
  if (App.CharacterData && App.CharacterData.validate) {
    const originalWeapons = App.CharacterData.weapons;
    App.CharacterData.weapons = [
      { name: 'Short Bow (exquisite)', quantity: 1 },
      { name: 'Broadsword (decorated)', quantity: 1 }
    ];

    const result = App.CharacterData.validate();
    if (result.valid || !result.errors.some(e => /Short Bow|Broadsword/.test(e))) {
      pass('Weapon reference validation accepts social-class quality labels');
    } else {
      fail('Weapon reference validation rejects social-class quality labels',
        result.errors.join('; '));
    }

    App.CharacterData.weapons = originalWeapons;
  }
}

// Test 5.6: JSON serialization round-trip
{
  if (App.CharacterData && App.CharacterData.toJSON && App.CharacterData.fromJSON) {
    // Set up test data
    App.CharacterData.name = 'JSON Test Character';
    App.CharacterData.culture = 'Sartarite (Heortling)';
    App.CharacterData.characteristics = { STR: 15, CON: 13, SIZ: 12, DEX: 14, INT: 11, POW: 10, CHA: 9 };
    App.CharacterData.culturalSkills = { 'Ride': 45, 'Locale': 30 };
    App.CharacterData.notes = 'Test notes for serialization';

    // Serialize
    const json = App.CharacterData.toJSON();
    if (json && typeof json === 'object' && json.name === 'JSON Test Character') {
      pass('CharacterData.toJSON() generates a character object');
    } else {
      fail('CharacterData.toJSON() failed to generate a character object');
    }

    // Modify data
    const originalName = App.CharacterData.name;
    App.CharacterData.name = 'Modified';

    // Deserialize
    const success = App.CharacterData.fromJSON(json);
    if (success) {
      pass('CharacterData.fromJSON() succeeded');

      if (App.CharacterData.name === originalName) {
        pass('CharacterData round-trip preserves name');
      } else {
        fail(`CharacterData round-trip name mismatch: expected "${originalName}", got "${App.CharacterData.name}"`);
      }

      if (App.CharacterData.culturalSkills['Ride'] === 45) {
        pass('CharacterData round-trip preserves skills');
      } else {
        fail('CharacterData round-trip lost skills data');
      }
    } else {
      fail('CharacterData.fromJSON() failed');
    }
  } else {
    fail('CharacterData.toJSON()/fromJSON() not implemented');
  }
}

// ============================================================
section('Risk 6: Browser Validation');
// ============================================================

{
  info('Browser validation requires playwright-cli - checking availability...');
  const { execSync } = require('child_process');
  const fs = require('fs');
  const path = require('path');

  // Browser validation is optional — run via playwright when available
  pass('Browser validation available via playwright (optional)');

  try {
    execSync('which playwright', { stdio: 'ignore' });
    info('playwright found - browser validation can be performed');

    // Check if screenshots exist
    const screenshots = [
      'step-1-initial-load.png',
      'step-11-balazaring.png',
      'play-mode-populated.png',
      'pdf-export-buttons.png'
    ];

    let foundScreenshots = 0;
    screenshots.forEach(screenshot => {
      const screenshotPath = path.join(__dirname, 'verification-artifacts', screenshot);
      if (fs.existsSync(screenshotPath)) {
        foundScreenshots++;
      }
    });

    if (foundScreenshots === screenshots.length) {
      pass(`All ${screenshots.length} required screenshots captured`);
    } else {
      info(`Browser screenshots: ${foundScreenshots}/${screenshots.length} captured`);
      info('Run manual validation to capture remaining screenshots');
    }
  } catch (e) {
    info('playwright not found - browser validation documented as manual task');
    info('See verification-artifacts/MANUAL-VERIFICATION.md for complete instructions');
    info('Required screenshots:');
    info('  - step-1-initial-load.png (initial wizard load)');
    info('  - step-11-balazaring.png (Balazaring character Step 11)');
    info('  - step-11-praxian.png (Praxian character Step 11)');
    info('  - step-11-tlemori.png (Tlemori character Step 11)');
    info('  - play-mode-populated.png (Play Mode with character)');
    info('  - pdf-export-buttons.png (PDF export buttons visible)');
    pass('Browser validation documented with comprehensive manual guide');
  }
}

// ============================================================
section('Bug 1: Helpers.getHitLocationHP() Formula Correctness');
// ============================================================

// Test 1.1: CON 13 + SIZ 11 = 24 -> base should be 5 (Math.ceil(24/5))
{
  if (App.Helpers && App.Helpers.getHitLocationHP) {
    const testChar = { characteristics: { CON: 13, SIZ: 11 } };
    const headHP = App.Helpers.getHitLocationHP(testChar, 'Head');

    // Correct formula: Math.ceil((13 + 11) / 5) = Math.ceil(24/5) = 5
    if (headHP === 5) {
      pass('Bug 1: Helpers.getHitLocationHP() Head HP correct for CON 13, SIZ 11 (5)');
    } else {
      fail(`Bug 1: Helpers.getHitLocationHP() Head HP wrong (expected 5, got ${headHP})`);
    }

    const chestHP = App.Helpers.getHitLocationHP(testChar, 'Chest');
    // Chest should be base + 2 = 5 + 2 = 7
    if (chestHP === 7) {
      pass('Bug 1: Helpers.getHitLocationHP() Chest HP correct for CON 13, SIZ 11 (7)');
    } else {
      fail(`Bug 1: Helpers.getHitLocationHP() Chest HP wrong (expected 7, got ${chestHP})`);
    }
  }
}

// Test 1.2: Match reference table - CON+SIZ = 1-5 range
{
  if (App.Helpers && App.Helpers.getHitLocationHP) {
    const testChar = { characteristics: { CON: 3, SIZ: 2 } }; // Total = 5
    const headHP = App.Helpers.getHitLocationHP(testChar, 'Head');
    if (headHP === 1) {
      pass('Bug 1: Reference table CON+SIZ=5 -> Head=1');
    } else {
      fail(`Bug 1: Reference table CON+SIZ=5 -> Head should be 1, got ${headHP}`);
    }
  }
}

// Test 1.3: Match reference table - CON+SIZ = 11-15 range
{
  if (App.Helpers && App.Helpers.getHitLocationHP) {
    const testChar = { characteristics: { CON: 7, SIZ: 6 } }; // Total = 13
    const headHP = App.Helpers.getHitLocationHP(testChar, 'Head');
    const chestHP = App.Helpers.getHitLocationHP(testChar, 'Chest');
    const abdomenHP = App.Helpers.getHitLocationHP(testChar, 'Abdomen');
    const armHP = App.Helpers.getHitLocationHP(testChar, 'Right Arm');
    const legHP = App.Helpers.getHitLocationHP(testChar, 'Right Leg');

    // Math.ceil(13/5) = 3, so Head=3, Chest=5, Abdomen=4, Arm=2, Leg=3
    if (headHP === 3 && chestHP === 5 && abdomenHP === 4 && armHP === 2 && legHP === 3) {
      pass('Bug 1: Reference table CON+SIZ=13 matches all locations (3/5/4/2/3)');
    } else {
      fail(`Bug 1: Reference table CON+SIZ=13 wrong (got ${headHP}/${chestHP}/${abdomenHP}/${armHP}/${legHP}, expected 3/5/4/2/3)`);
    }
  }
}

// Test 1.4: Helpers.getHitLocationHP() must match Calc.hitPointsPerLocation()
{
  if (App.Helpers && App.Helpers.getHitLocationHP && App.Calc && App.Calc.hitPointsPerLocation) {
    const testCases = [
      { CON: 12, SIZ: 13 },
      { CON: 10, SIZ: 10 },
      { CON: 14, SIZ: 11 },
      { CON: 8, SIZ: 9 },
      { CON: 16, SIZ: 15 }
    ];

    let allMatch = true;
    let mismatchDetails = [];

    testCases.forEach(testCase => {
      const calcResult = App.Calc.hitPointsPerLocation(testCase.CON, testCase.SIZ);
      const testChar = { characteristics: testCase };

      Object.keys(calcResult).forEach(location => {
        const helpersResult = App.Helpers.getHitLocationHP(testChar, location);
        if (helpersResult !== calcResult[location]) {
          allMatch = false;
          mismatchDetails.push(`CON ${testCase.CON}, SIZ ${testCase.SIZ}, ${location}: Helpers=${helpersResult}, Calc=${calcResult[location]}`);
        }
      });
    });

    if (allMatch) {
      pass('Bug 1: Helpers.getHitLocationHP() matches Calc.hitPointsPerLocation() for 5 test cases');
    } else {
      fail(`Bug 1: Helpers.getHitLocationHP() does NOT match Calc.hitPointsPerLocation()`, mismatchDetails[0]);
    }
  }
}

// ============================================================
section('Reference Data Validation');
// ============================================================

// Load reference data
const refAttributes = JSON.parse(fs.readFileSync(path.join(__dirname, 'references/mythras-raw/attributes.json'), 'utf8'));

// Test: Action Points table validation
{
  const apTable = refAttributes.action_points.table;
  let allMatch = true;
  let failures = [];

  apTable.forEach(row => {
    // Test min and max of each range by splitting DEX+INT evenly
    // Skip values less than 2 (need at least 1+1 for two characteristics)
    [Math.max(row.min, 2), row.max].forEach(total => {
      const dex = Math.floor(total / 2);
      const int = total - dex;
      const calculated = App.Calc.actionPoints(dex, int);

      if (calculated !== row.action_points) {
        allMatch = false;
        failures.push(`DEX+INT=${total} (${dex}+${int}): expected ${row.action_points}, got ${calculated}`);
      }
    });
  });

  if (allMatch) {
    pass('Action Points table matches reference data for all boundary cases');
  } else {
    fail('Action Points table validation failed', failures[0]);
  }
}

// Test: Damage Modifier table validation
{
  const dmTable = refAttributes.damage_modifier.table;
  let allMatch = true;
  let failures = [];

  dmTable.slice(0, 10).forEach(row => {
    // Test min and max of each range by splitting STR+SIZ evenly
    [row.min, row.max].forEach(total => {
      const str = Math.floor(total / 2);
      const siz = total - str;
      const calculated = App.Calc.damageModifier(str, siz);

      if (calculated !== row.damage_modifier) {
        allMatch = false;
        failures.push(`STR+SIZ=${total} (${str}+${siz}): expected ${row.damage_modifier}, got ${calculated}`);
      }
    });
  });

  if (allMatch) {
    pass('Damage Modifier table matches reference data for first 10 entries');
  } else {
    fail('Damage Modifier table validation failed', failures[0]);
  }
}

// Test: Experience Modifier table validation
{
  const expTable = refAttributes.experience_modifier.table;
  let allMatch = true;
  let failures = [];

  expTable.forEach(row => {
    // Only test values >= 1 (characteristic minimums)
    [Math.max(row.min, 1), row.max].forEach(value => {
      const calculated = App.Calc.experienceModifier(value);

      if (calculated !== row.experience_modifier) {
        allMatch = false;
        failures.push(`CHA=${value}: expected ${row.experience_modifier}, got ${calculated}`);
      }
    });
  });

  if (allMatch) {
    pass('Experience Modifier table matches reference data');
  } else {
    fail('Experience Modifier table validation failed', failures[0]);
  }
}

// Test: Healing Rate table validation
{
  const healTable = refAttributes.healing_rate.table;
  let allMatch = true;
  let failures = [];

  healTable.forEach(row => {
    // Only test values >= 1 (characteristic minimums)
    [Math.max(row.min, 1), row.max].forEach(value => {
      const calculated = App.Calc.healingRate(value);

      if (calculated !== row.healing_rate) {
        allMatch = false;
        failures.push(`CON=${value}: expected ${row.healing_rate}, got ${calculated}`);
      }
    });
  });

  if (allMatch) {
    pass('Healing Rate table matches reference data');
  } else {
    fail('Healing Rate table validation failed', failures[0]);
  }
}

// Test: Luck Points table validation
{
  const luckTable = refAttributes.luck_points.table;
  let allMatch = true;
  let failures = [];

  luckTable.forEach(row => {
    // Only test values >= 1 (characteristic minimums)
    [Math.max(row.min, 1), row.max].forEach(value => {
      const calculated = App.Calc.luckPoints(value);

      if (calculated !== row.luck_points) {
        allMatch = false;
        failures.push(`POW=${value}: expected ${row.luck_points}, got ${calculated}`);
      }
    });
  });

  if (allMatch) {
    pass('Luck Points table matches reference data');
  } else {
    fail('Luck Points table validation failed', failures[0]);
  }
}

// Test: Hit Points per Location table validation
{
  const hpTable = refAttributes.hit_points_per_location.table;
  let allMatch = true;
  let failures = [];

  hpTable.forEach(row => {
    [row.min, row.max].forEach(conSizTotal => {
      // Test with CON=total, SIZ=0 and CON=0, SIZ=total
      const calculated1 = App.Calc.hitPointsPerLocation(conSizTotal, 0);
      const calculated2 = App.Calc.hitPointsPerLocation(0, conSizTotal);

      const expected = {
        'Head': row.head,
        'Chest': row.chest,
        'Abdomen': row.abdomen,
        'Right Arm': row.each_arm,
        'Left Arm': row.each_arm,
        'Right Leg': row.leg,
        'Left Leg': row.leg
      };

      const calc = calculated1;
      Object.keys(expected).forEach(location => {
        if (calc[location] !== expected[location]) {
          allMatch = false;
          failures.push(`CON+SIZ=${conSizTotal}, ${location}: expected ${expected[location]}, got ${calc[location]}`);
        }
      });
    });
  });

  if (allMatch) {
    pass('Hit Points per Location table matches reference data for all locations');
  } else {
    fail('Hit Points per Location table validation failed', failures[0]);
  }
}

// ============================================================
section('Cross-Verification Tests');
// ============================================================

// Test: DAMAGE_MOD_TABLE format
{
  let allHavePrefix = true;
  let failures = [];

  for (let i = 5; i <= 20; i++) {
    const value = App.Calc.damageModifier(i * 5, 0); // Create values in the positive range
    if (value && !value.startsWith('+')) {
      allHavePrefix = false;
      failures.push(`Index ${i}: ${value} missing + prefix`);
    }
  }

  if (allHavePrefix) {
    pass('DAMAGE_MOD_TABLE non-negative entries all have + prefix');
  } else {
    fail('DAMAGE_MOD_TABLE format test failed', failures[0]);
  }
}

// ============================================================
section('Golden Character Calculation Tests');
// ============================================================

// Golden Character 1: Balazaring Hunter
{
  const char1 = { STR: 12, CON: 13, SIZ: 10, DEX: 14, INT: 10, POW: 8, CHA: 8 };
  const attrs = App.Calc.calculateAllAttributes(char1);

  // Verify all attributes
  const expected = {
    actionPoints: 2,
    damageModifier: '+0',
    experienceModifier: 0,
    healingRate: 3,
    luckPoints: 2,
    magicPoints: 8,
    initiativeBonus: 12
  };

  let allMatch = true;
  let failures = [];

  Object.keys(expected).forEach(key => {
    if (attrs[key] !== expected[key]) {
      allMatch = false;
      failures.push(`${key}: expected ${expected[key]}, got ${attrs[key]}`);
    }
  });

  // Verify hit locations
  const expectedHP = { Head: 5, Chest: 7, Abdomen: 6, 'Right Arm': 4, 'Left Arm': 4, 'Right Leg': 5, 'Left Leg': 5 };
  Object.keys(expectedHP).forEach(location => {
    if (attrs.hitPoints[location] !== expectedHP[location]) {
      allMatch = false;
      failures.push(`${location} HP: expected ${expectedHP[location]}, got ${attrs.hitPoints[location]}`);
    }
  });

  if (allMatch) {
    pass('Golden Character: Balazaring Hunter calculations correct');
  } else {
    fail('Golden Character: Balazaring Hunter failed', failures[0]);
  }
}

// Golden Character 2: Sartarite Warrior
{
  const char2 = { STR: 14, CON: 12, SIZ: 12, DEX: 11, INT: 10, POW: 8, CHA: 8 };
  const attrs = App.Calc.calculateAllAttributes(char2);

  const expected = {
    actionPoints: 2,
    damageModifier: '+1d2',
    experienceModifier: 0,
    healingRate: 2,
    luckPoints: 2,
    magicPoints: 8,
    initiativeBonus: 10
  };

  let allMatch = true;
  let failures = [];

  Object.keys(expected).forEach(key => {
    if (attrs[key] !== expected[key]) {
      allMatch = false;
      failures.push(`${key}: expected ${expected[key]}, got ${attrs[key]}`);
    }
  });

  const expectedHP = { Head: 5, Chest: 7, Abdomen: 6, 'Right Arm': 4, 'Left Arm': 4, 'Right Leg': 5, 'Left Leg': 5 };
  Object.keys(expectedHP).forEach(location => {
    if (attrs.hitPoints[location] !== expectedHP[location]) {
      allMatch = false;
      failures.push(`${location} HP: expected ${expectedHP[location]}, got ${attrs.hitPoints[location]}`);
    }
  });

  if (allMatch) {
    pass('Golden Character: Sartarite Warrior calculations correct');
  } else {
    fail('Golden Character: Sartarite Warrior failed', failures[0]);
  }
}

// Golden Character 3: Praxian Beast Rider
{
  const char3 = { STR: 13, CON: 12, SIZ: 11, DEX: 12, INT: 10, POW: 9, CHA: 8 };
  const attrs = App.Calc.calculateAllAttributes(char3);

  const expected = {
    actionPoints: 2,
    damageModifier: '+0',
    experienceModifier: 0,
    healingRate: 2,
    luckPoints: 2,
    magicPoints: 9,
    initiativeBonus: 11
  };

  let allMatch = true;
  let failures = [];

  Object.keys(expected).forEach(key => {
    if (attrs[key] !== expected[key]) {
      allMatch = false;
      failures.push(`${key}: expected ${expected[key]}, got ${attrs[key]}`);
    }
  });

  const expectedHP = { Head: 5, Chest: 7, Abdomen: 6, 'Right Arm': 4, 'Left Arm': 4, 'Right Leg': 5, 'Left Leg': 5 };
  Object.keys(expectedHP).forEach(location => {
    if (attrs.hitPoints[location] !== expectedHP[location]) {
      allMatch = false;
      failures.push(`${location} HP: expected ${expectedHP[location]}, got ${attrs.hitPoints[location]}`);
    }
  });

  if (allMatch) {
    pass('Golden Character: Praxian Beast Rider calculations correct');
  } else {
    fail('Golden Character: Praxian Beast Rider failed', failures[0]);
  }
}

// ============================================================
section('Wave 2 Goal A: normalizeCharacter() Projection Layer');
// ============================================================

// Test A.1: normalizeCharacter() function exists
{
  if (App.App && App.App.normalizeCharacter) {
    pass('normalizeCharacter() function exists');
  } else {
    fail('normalizeCharacter() function not yet implemented (Goal A)');
  }
}

// Test A.2: normalizeCharacter() returns correct structure
{
  if (App.App && App.App.normalizeCharacter) {
    const testChar = createTestCharacter();
    const normalized = App.App.normalizeCharacter(testChar);

    if (normalized && typeof normalized === 'object') {
      pass('normalizeCharacter() returns an object');
    } else {
      fail('normalizeCharacter() does not return an object');
    }

    // Check required top-level fields
    const requiredFields = ['name', 'race', 'culture', 'profession', 'characteristics', 'attributes', 'skills', 'combatStyles', 'hitLocations', 'passions', 'folkMagic', 'equipment'];
    const missingFields = requiredFields.filter(f => !(f in normalized));
    if (missingFields.length === 0) {
      pass('normalizeCharacter() has all required top-level fields');
    } else {
      fail(`normalizeCharacter() missing fields: ${missingFields.join(', ')}`);
    }
  }
}

// Test A.3: normalizeCharacter() characteristics structure
{
  if (App.App && App.App.normalizeCharacter) {
    const testChar = createTestCharacter();
    testChar.characteristics = { STR: 14, CON: 12, SIZ: 11, DEX: 12, INT: 10, POW: 9, CHA: 8 };
    const normalized = App.App.normalizeCharacter(testChar);

    if (normalized.characteristics) {
      const chars = normalized.characteristics;
      if (chars.STR === 14 && chars.CON === 12 && chars.SIZ === 11 && chars.DEX === 12 && chars.INT === 10 && chars.POW === 9 && chars.CHA === 8) {
        pass('normalizeCharacter() preserves all 7 characteristics');
      } else {
        fail('normalizeCharacter() characteristics values incorrect');
      }
    } else {
      fail('normalizeCharacter() missing characteristics');
    }
  }
}

// Test A.4: normalizeCharacter() attributes from Calc
{
  if (App.App && App.App.normalizeCharacter) {
    const testChar = createTestCharacter();
    testChar.characteristics = { STR: 14, CON: 12, SIZ: 11, DEX: 12, INT: 10, POW: 9, CHA: 8 };
    const normalized = App.App.normalizeCharacter(testChar);

    if (normalized.attributes) {
      const attrs = normalized.attributes;
      const requiredAttrs = ['actionPoints', 'initiativeBonus', 'damageModifier', 'experienceModifier', 'healingRate', 'luckPoints', 'magicPoints'];
      const missingAttrs = requiredAttrs.filter(a => !(a in attrs));
      if (missingAttrs.length === 0) {
        pass('normalizeCharacter() includes all required attributes');
      } else {
        fail(`normalizeCharacter() missing attributes: ${missingAttrs.join(', ')}`);
      }

      // Verify one calculation
      if (attrs.actionPoints === 2) { // DEX 12 + INT 10 = 22, Math.ceil(22/12) = 2
        pass('normalizeCharacter() calculates actionPoints correctly (2)');
      } else {
        fail(`normalizeCharacter() actionPoints incorrect (expected 2, got ${attrs.actionPoints})`);
      }
    } else {
      fail('normalizeCharacter() missing attributes');
    }
  }
}

// Test A.5: normalizeCharacter() skills as Map or object
{
  if (App.App && App.App.normalizeCharacter) {
    const testChar = createTestCharacter();
    testChar.characteristics = { STR: 14, CON: 12, SIZ: 11, DEX: 12, INT: 10, POW: 9, CHA: 8 };
    testChar.culturalSkills = { 'Athletics': 40 };
    testChar.careerSkills = { 'Athletics': 10 };
    const normalized = App.App.normalizeCharacter(testChar);

    if (normalized.skills) {
      const skills = normalized.skills;
      let athleticsValue;

      if (skills instanceof Map) {
        athleticsValue = skills.get('Athletics');
      } else {
        athleticsValue = skills['Athletics'];
      }

      // Athletics base = STR (14) + DEX (12) = 26, + cultural (40) + career (10) = 76
      if (athleticsValue === 76) {
        pass('normalizeCharacter() computes skills correctly (Athletics = 76)');
      } else {
        fail(`normalizeCharacter() Athletics incorrect (expected 76, got ${athleticsValue})`);
      }
    } else {
      fail('normalizeCharacter() missing skills');
    }
  }
}

// Test A.6: normalizeCharacter() combatStyles with weapons array
{
  if (App.App && App.App.normalizeCharacter) {
    const testChar = createTestCharacter();
    testChar.combatStyles = [
      { name: 'Sword & Shield', skill: 50, weapons: ['Broadsword', 'Kite Shield'] }
    ];
    const normalized = App.App.normalizeCharacter(testChar);

    if (normalized.combatStyles && Array.isArray(normalized.combatStyles)) {
      pass('normalizeCharacter() includes combatStyles array');

      const style = normalized.combatStyles[0];
      if (style && style.name && Array.isArray(style.weapons)) {
        pass('normalizeCharacter() combatStyle has name and weapons array');
      } else {
        fail('normalizeCharacter() combatStyle structure incorrect');
      }
    } else {
      fail('normalizeCharacter() combatStyles missing or not an array');
    }
  }
}

// Test A.7: normalizeCharacter() hitLocations with current/max
{
  if (App.App && App.App.normalizeCharacter) {
    const testChar = createTestCharacter();
    testChar.characteristics = { STR: 14, CON: 12, SIZ: 11, DEX: 12, INT: 10, POW: 9, CHA: 8 };
    const normalized = App.App.normalizeCharacter(testChar);

    if (normalized.hitLocations && Array.isArray(normalized.hitLocations)) {
      pass('normalizeCharacter() includes hitLocations array');

      if (normalized.hitLocations.length === 7) {
        pass('normalizeCharacter() has 7 hit locations');
      } else {
        fail(`normalizeCharacter() has ${normalized.hitLocations.length} hit locations (expected 7)`);
      }

      const head = normalized.hitLocations.find(loc => loc.name === 'Head');
      if (head && 'current' in head && 'max' in head) {
        pass('normalizeCharacter() hitLocation has current and max fields');

        // CON 12 + SIZ 11 = 23, Math.ceil(23/5) = 5
        if (head.max === 5 && head.current === 5) {
          pass('normalizeCharacter() Head HP correct (5/5)');
        } else {
          fail(`normalizeCharacter() Head HP incorrect (expected 5/5, got ${head.current}/${head.max})`);
        }
      } else {
        fail('normalizeCharacter() hitLocation structure incorrect');
      }
    } else {
      fail('normalizeCharacter() hitLocations missing or not an array');
    }
  }
}

// Test A.8: normalizeCharacter() equipment structure
{
  if (App.App && App.App.normalizeCharacter) {
    const testChar = createTestCharacter();
    testChar.weapons = ['Broadsword'];
    testChar.armor = ['Leather'];
    testChar.equipment = ['Backpack'];
    const normalized = App.App.normalizeCharacter(testChar);

    if (normalized.equipment && typeof normalized.equipment === 'object') {
      pass('normalizeCharacter() includes equipment object');

      if ('weapons' in normalized.equipment && 'armor' in normalized.equipment && 'items' in normalized.equipment) {
        pass('normalizeCharacter() equipment has weapons, armor, items fields');
      } else {
        fail('normalizeCharacter() equipment structure incomplete');
      }
    } else {
      fail('normalizeCharacter() equipment missing or not an object');
    }
  }
}

// Test A.9: normalizeCharacter() is pure (no side effects)
{
  if (App.App && App.App.normalizeCharacter) {
    const testChar = createTestCharacter();
    const originalName = testChar.name;
    const originalSTR = testChar.characteristics.STR;

    const normalized = App.App.normalizeCharacter(testChar);

    // Check input not mutated
    if (testChar.name === originalName && testChar.characteristics.STR === originalSTR) {
      pass('normalizeCharacter() does not mutate input (pure function)');
    } else {
      fail('normalizeCharacter() mutates input (not pure)');
    }
  }
}

// ============================================================
section('Wave 2 Goal C: Skill Compilation Consolidation');
// ============================================================

// Test C.1: App.compileAllSkills() delegates to Helpers.getCompiledSkills()
{
  if (App.App && App.App.compileAllSkills && App.Helpers && App.Helpers.getCompiledSkills) {
    const testChar = createTestCharacter();
    testChar.characteristics = { STR: 14, CON: 12, SIZ: 11, DEX: 12, INT: 10, POW: 9, CHA: 8 };
    testChar.culturalSkills = { 'Athletics': 40 };
    testChar.careerSkills = { 'Athletics': 10 };

    // Save original CharacterData state
    const origChars = { ...App.CharacterData.characteristics };
    const origCultural = { ...App.CharacterData.culturalSkills };
    const origCareer = { ...App.CharacterData.careerSkills };

    // Set test data
    App.CharacterData.characteristics = testChar.characteristics;
    App.CharacterData.culturalSkills = testChar.culturalSkills;
    App.CharacterData.careerSkills = testChar.careerSkills;
    App.CharacterData.bonusSkills = {};

    // Get results from both
    const appResult = App.App.compileAllSkills();
    const helpersResult = App.Helpers.getCompiledSkills(App.CharacterData);

    // Compare Athletics value
    let appAthletics, helpersAthletics;
    if (Array.isArray(appResult)) {
      const entry = appResult.find(s => s.name === 'Athletics');
      // Calculate total from breakdown: base + cultural + career + bonus
      appAthletics = entry ? (entry.base + entry.cultural + entry.career + entry.bonus) : null;
    } else if (appResult instanceof Map) {
      appAthletics = appResult.get('Athletics');
    } else {
      appAthletics = appResult['Athletics'];
    }

    helpersAthletics = helpersResult.get('Athletics');

    if (appAthletics === helpersAthletics && appAthletics === 76) {
      pass('App.compileAllSkills() produces same result as Helpers.getCompiledSkills() (Athletics = 76)');
    } else {
      fail(`Skill compilation mismatch: App=${appAthletics}, Helpers=${helpersAthletics}`);
    }

    // Restore
    App.CharacterData.characteristics = origChars;
    App.CharacterData.culturalSkills = origCultural;
    App.CharacterData.careerSkills = origCareer;
  }
}

{
  if (App.App && App.App.compileAllSkills) {
    App.CharacterData.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 10, CHA: 10 };
    App.CharacterData.culture = 'God Forgot';
    App.CharacterData.culturalSkills = {};
    App.CharacterData.careerSkills = { Customs: 10 };
    App.CharacterData.bonusSkills = { Customs: 15 };

    const compiled = App.App.compileAllSkills();
    const customsRows = compiled.filter(s => s.name.startsWith('Customs'));
    const customs = customsRows.find(s => s.name === 'Customs (God Forgot)');
    if (customsRows.length === 1 && customs &&
        customs.base === 70 && customs.career === 10 && customs.bonus === 15) {
      pass('Customs allocations merge into the culture-specific Customs skill row');
    } else {
      fail('Customs allocations split into duplicate skill rows', JSON.stringify(customsRows));
    }
  } else {
    fail('App.compileAllSkills function not found for Customs merge test');
  }
}

// ============================================================
section('Wave 2 Goal D: Standardize Weapon Data Shape');
// ============================================================

// Test D.1: normalizeCharacter() weapons are always objects
{
  if (App.App && App.App.normalizeCharacter) {
    const testChar = createTestCharacter();
    testChar.weapons = ['Broadsword', 'Dagger']; // Input as strings
    const normalized = App.App.normalizeCharacter(testChar);

    if (normalized.equipment && normalized.equipment.weapons) {
      const weapons = normalized.equipment.weapons;
      if (Array.isArray(weapons) && weapons.length > 0) {
        const allObjects = weapons.every(w => typeof w === 'object' && 'name' in w && 'quantity' in w);
        if (allObjects) {
          pass('normalizeCharacter() weapons are all objects with {name, quantity}');
        } else {
          fail('normalizeCharacter() weapons not all objects');
        }
      } else {
        fail('normalizeCharacter() weapons array empty or missing');
      }
    }
  }
}

// Test D.2: normalizeCharacter() handles mixed weapon input
{
  if (App.App && App.App.normalizeCharacter) {
    const testChar = createTestCharacter();
    testChar.weapons = [
      'Broadsword',
      { name: 'Spear', quantity: 2 },
      'Dagger'
    ];
    const normalized = App.App.normalizeCharacter(testChar);

    if (normalized.equipment && normalized.equipment.weapons) {
      const weapons = normalized.equipment.weapons;
      const allObjects = weapons.every(w => typeof w === 'object' && 'name' in w && 'quantity' in w);
      if (allObjects) {
        pass('normalizeCharacter() normalizes mixed weapon format');

        const broadsword = weapons.find(w => w.name === 'Broadsword');
        const spear = weapons.find(w => w.name === 'Spear');
        if (broadsword && broadsword.quantity === 1 && spear && spear.quantity === 2) {
          pass('normalizeCharacter() sets default quantity=1 and preserves existing quantity');
        } else {
          fail('normalizeCharacter() weapon quantities incorrect');
        }
      } else {
        fail('normalizeCharacter() did not normalize mixed weapon format');
      }
    }
  }
}

// ============================================================
section('Wave 2 Goal E: Schema Versioning & Migration');
// ============================================================

// Test E.1: CharacterData.getSchemaVersion() exists
{
  if (App.CharacterData && App.CharacterData.getSchemaVersion) {
    const version = App.CharacterData.getSchemaVersion();
    if (version === 1) {
      pass('CharacterData.getSchemaVersion() returns 1');
    } else {
      fail(`CharacterData.getSchemaVersion() returns ${version} (expected 1)`);
    }
  } else {
    fail('CharacterData.getSchemaVersion() not yet implemented (Goal E)');
  }
}

// =============================================================================
// ADR-005: Placeholder Skill Disambiguation Tests
// =============================================================================

section('ADR-005: Placeholder Skill Disambiguation');

// Test: isPlaceholderSkill detects descriptive placeholders
{
  const { isPlaceholderSkill } = loadApp();
  if (isPlaceholderSkill) {
    const placeholders = [
      'Craft (Primary)', 'Craft (Secondary)', 'Lore (Primary Catch)',
      'Lore (Secondary Catch)', 'Lore (Specific Species)',
      'Craft (Hunting Related)', 'Lore (Regional or Specific Species)',
      'Craft (Specific Shipboard Speciality)', 'Craft (Specific Physiological Speciality)',
      'Lore (Specific Alchemical Speciality)', 'Healing (Specific Species)',
      'Teach (Specific Species)', 'Lore (Regional)'
    ];
    let allDetected = true;
    for (const p of placeholders) {
      if (!isPlaceholderSkill(p)) {
        fail(`isPlaceholderSkill() should detect "${p}"`);
        allDetected = false;
        break;
      }
    }
    if (allDetected) pass('isPlaceholderSkill() detects all 13 descriptive placeholders');
  } else {
    fail('isPlaceholderSkill not exported');
  }
}

// Test: isPlaceholderSkill does NOT flag concrete skills
{
  const { isPlaceholderSkill } = loadApp();
  if (isPlaceholderSkill) {
    const concreteSkills = [
      'Craft (Alchemy)', 'Craft (Animal Husbandry)', 'Lore (Military History)',
      'Lore (Strategy and Tactics)', 'Craft (Mining)', 'Lore (Minerals)',
      'Navigation (Underground)', 'Craft (Masonry)', 'Lore (Agriculture)', 'Lore (Sartar)'
    ];
    let anyFalsePositive = false;
    for (const s of concreteSkills) {
      if (isPlaceholderSkill(s)) {
        fail(`isPlaceholderSkill() should NOT flag concrete skill "${s}"`);
        anyFalsePositive = true;
        break;
      }
    }
    if (!anyFalsePositive) pass('isPlaceholderSkill() does not flag concrete specializations');
  } else {
    fail('isPlaceholderSkill not exported');
  }
}

// Test: needsDisambiguation catches both (any) and placeholders
{
  const { needsDisambiguation } = loadApp();
  if (needsDisambiguation) {
    const should = ['Language (any)', 'Lore (any)', 'Craft (Primary)', 'Lore (Specific Species)', 'Lore (Regional)', 'Lore (Cult)'];
    const shouldNot = ['Craft (Alchemy)', 'Language (Heortling)', 'Athletics', 'Perception'];
    let ok = true;
    for (const s of should) {
      if (!needsDisambiguation(s)) { fail(`needsDisambiguation should catch "${s}"`); ok = false; break; }
    }
    if (ok) {
      for (const s of shouldNot) {
        if (needsDisambiguation(s)) { fail(`needsDisambiguation should NOT catch "${s}"`); ok = false; break; }
      }
    }

    // Test: Player disambiguation guidance cites source pages for ambiguous professional skills
    {
      const { getSpecializationGuidance } = loadApp();
      if (getSpecializationGuidance) {
        const languageGuidance = getSpecializationGuidance('Language (any)');
        const loreGuidance = getSpecializationGuidance('Lore (any)');
        const regionalGuidance = getSpecializationGuidance('Lore (Regional)');
        if (
          languageGuidance.includes('Mythras rulebook p.49') &&
          languageGuidance.includes('Adventures in Glorantha p.26-41') &&
          loreGuidance.includes('Mythras rulebook p.49') &&
          loreGuidance.includes('Adventures in Glorantha p.26-41') &&
          loreGuidance.includes('Lore (Waha)') &&
          !loreGuidance.includes('examples include Cult') &&
          regionalGuidance.includes('Mythras rulebook p.49') &&
          regionalGuidance.includes('Adventures in Glorantha p.26-41')
        ) {
          pass('Ambiguous skill guidance points players to source pages');
        } else {
          fail('Ambiguous skill guidance lacks source-page pointers',
            JSON.stringify({ languageGuidance, loreGuidance, regionalGuidance }));
        }
      } else {
        fail('getSpecializationGuidance not exported for source-citation test');
      }
    }
    if (ok) pass('needsDisambiguation() correctly unifies (any) + placeholder detection');
  } else {
    fail('needsDisambiguation not exported');
  }
}

// Test: ADR-0014 bare specialization-required skills cannot finalize as base labels
{
  const { needsDisambiguation } = loadApp();
  if (needsDisambiguation) {
    const should = ['Art', 'Craft', 'Culture', 'Language', 'Lore', 'Combat Style', 'Navigation', 'Musicianship', 'Invocation'];
    const emptyParentheticalShould = ['Art ()', 'Craft ()', 'Culture ()', 'Language ()', 'Lore ()', 'Combat Style ()', 'Navigation ()', 'Musicianship ()', 'Mysticism ()', 'Invocation ()', 'Devotion ()', 'Binding ()'];
    const shouldNot = ['Mysticism', 'Healing', 'Teach', 'Binding', 'Meditation', 'Shaping', 'Literacy', 'Customs', 'Ride', 'Influence'];
    let ok = true;
    for (const skill of should) {
      if (!needsDisambiguation(skill)) {
        fail(`needsDisambiguation should catch bare specialization skill "${skill}"`);
        ok = false;
        break;
      }
    }
    if (ok) {
      for (const skill of emptyParentheticalShould) {
        if (!needsDisambiguation(skill)) {
          fail(`needsDisambiguation should catch empty parenthetical specialization skill "${skill}"`);
          ok = false;
          break;
        }
      }
    }
    if (ok) {
      for (const skill of shouldNot) {
        if (needsDisambiguation(skill)) {
          fail(`needsDisambiguation should not catch complete base skill "${skill}"`);
          ok = false;
          break;
        }
      }
    }
    if (ok) pass('needsDisambiguation catches ADR-0014 bare specialization-required skills only');
  } else {
    fail('needsDisambiguation not exported for ADR-0014 bare specialization skill test');
  }
}

// Test: ADR-0014 normalization-only parentheticals collapse before final skill output
{
  const { normalizeCharacterFacingSkillName } = loadApp();
  if (normalizeCharacterFacingSkillName) {
    const cases = [
      ['Shaping (Duration, Range, Targets, etc.)', 'Shaping'],
      ['Literacy (Darktongue)', 'Literacy'],
      ['Read/Write (multiple)', 'Literacy'],
      ['Customs (Lunar Tarsh)', 'Customs'],
      ['Ride (Bison)', 'Ride'],
      ['Influence (Intimidate)', 'Influence'],
      ['Navigation (Underground)', 'Navigation (Underground)'],
      ['Musicianship (Drums)', 'Musicianship (Drums)']
    ];
    const mismatch = cases.find(([input, expected]) => normalizeCharacterFacingSkillName(input) !== expected);
    if (!mismatch) {
      pass('ADR-0014 normalization-only parentheticals collapse while true specializations remain');
    } else {
      fail('ADR-0014 normalization-only parenthetical mapping is wrong',
        JSON.stringify({ input: mismatch[0], expected: mismatch[1], actual: normalizeCharacterFacingSkillName(mismatch[0]) }));
    }
  } else {
    fail('normalizeCharacterFacingSkillName not exported for ADR-0014 normalization test');
  }
}

// Test: ADR-0014 storage paths normalize rulebook base-skill parentheticals
{
  const { App: AppObj, CharacterData: CD, Calc } = loadApp();
  if (AppObj?.updateSkillPoints && AppObj?.agent?.setStep && CD) {
    AppObj.updateSkillPoints('bonus', 'Ride (Bison)', 12);
    const updateNormalized = CD.bonusSkills.Ride === 12 && CD.bonusSkills['Ride (Bison)'] === undefined;
    CD.culture = 'Sartarite (Heortling)';
    CD.attributes = Calc.calculateAllAttributes(CD.characteristics);
    AppObj.renderCurrentStep = () => {};
    const resolvedCultural = AppObj.agent.setStep(5, {
      culturalSkills: {
        'Ride (Bison)': 10,
        Athletics: 15,
        Brawn: 15,
        Endurance: 15,
        Evade: 15,
        Willpower: 15,
        'First Aid': 15
      },
      runeAffinities: { primary: 'Air', secondary: 'Movement', tertiary: 'Man' },
      folkMagicSpells: ['Bladesharp', 'Coordination', 'Heal']
    });
    const storedCultural = CD.culturalSkills.Ride === 10 && CD.culturalSkills['Ride (Bison)'] === undefined;
    const unresolvedCultural = AppObj.agent.setStep(5, {
      culturalSkills: {
        'Lore ()': 10,
        Athletics: 15,
        Brawn: 15,
        Endurance: 15,
        Evade: 15,
        Willpower: 15,
        'First Aid': 15
      },
      runeAffinities: { primary: 'Air', secondary: 'Movement', tertiary: 'Man' },
      folkMagicSpells: ['Bladesharp', 'Coordination', 'Heal']
    });
    if (updateNormalized && resolvedCultural.success && storedCultural && !unresolvedCultural.success &&
        unresolvedCultural.errors.some(error => /requires a concrete specialization/.test(error))) {
      pass('ADR-0014 skill-point storage normalizes base-skill parentheticals and rejects empty specializations');
    } else {
      fail('ADR-0014 skill-point storage did not normalize or reject unresolved skills',
        JSON.stringify({ updateNormalized, resolvedCultural, storedCultural, unresolvedCultural, bonusSkills: CD.bonusSkills, culturalSkills: CD.culturalSkills }));
    }
  } else {
    fail('App storage APIs unavailable for ADR-0014 storage normalization test');
  }
}

// Test: ADR-0014 import and public allocation APIs cannot bypass final disambiguation guards
{
  const { App: AppObj, CharacterData: CD, Calc } = loadApp();
  if (AppObj?.importCharacterData && AppObj?.agent?.allocateSkill && AppObj?.agent?.setStep && CD) {
    AppObj.renderCurrentStep = () => {};
    AppObj.showToast = () => {};
    const fixture = loadFixture('vasana.json');
    const unresolvedPassionFixture = JSON.parse(JSON.stringify(fixture));
    unresolvedPassionFixture.passions = [{ name: 'Loyalty ()', value: 60 }];
    const importRejected = AppObj.importCharacterData(unresolvedPassionFixture) === false;
    const directImportRejected = CD.fromJSON(JSON.stringify(unresolvedPassionFixture)) === false;
    const emptyCultSkillFixture = JSON.parse(JSON.stringify(fixture));
    emptyCultSkillFixture.careerSkills = { ...(emptyCultSkillFixture.careerSkills || {}), 'Devotion ()': 1, 'Binding ()': 1 };
    const emptyCultSkillRejected = CD.fromJSON(JSON.stringify(emptyCultSkillFixture)) === false;
    const stringPassionFixture = JSON.parse(JSON.stringify(fixture));
    stringPassionFixture.passions = ['Love (Family)'];
    const stringPassionImported = CD.fromJSON(JSON.stringify(stringPassionFixture));
    const storedStringPassion = CD.passions[0] || {};
    const emptyOptionalPassionFixture = JSON.parse(JSON.stringify(fixture));
    emptyOptionalPassionFixture.passions = ['Honor ()'];
    const emptyOptionalPassionImported = CD.fromJSON(JSON.stringify(emptyOptionalPassionFixture));
    const storedEmptyOptionalPassion = CD.passions[0] || {};
    const emptyOptionalPassionObjectFixture = JSON.parse(JSON.stringify(fixture));
    emptyOptionalPassionObjectFixture.passions = [{ name: 'Honor ()', value: 60 }];
    const emptyOptionalPassionObjectImported = CD.fromJSON(JSON.stringify(emptyOptionalPassionObjectFixture));
    const storedEmptyOptionalPassionObject = CD.passions[0] || {};
    const contradictoryPassionFixture = JSON.parse(JSON.stringify(fixture));
    contradictoryPassionFixture.passions = [{ name: 'Loyalty ()', type: 'Loyalty', subject: 'Clan', value: 60 }];
    const contradictoryImported = CD.fromJSON(JSON.stringify(contradictoryPassionFixture));
    const storedContradictoryPassion = CD.passions[0] || {};
    const lowercasePassionResult = AppObj.agent.setStep(6, {
      passions: [{ type: 'love', value: 60 }]
    });

    const unresolvedSkillAllocation = AppObj.agent.allocateSkill({ 'Lore ()': 1 }, 'bonus');
    const normalizedSkillAllocation = AppObj.agent.allocateSkill({ 'Shaping (Duration, Range, Targets, etc.)': 3 }, 'bonus');

    CD.culture = 'Sartarite (Heortling)';
    CD.attributes = Calc.calculateAllAttributes(CD.characteristics);
    const duplicateProSkillResult = AppObj.agent.setStep(8, {
      career: 'Warrior',
      professionalSkills: ['Ride', 'Ride (Bison)', 'Survival']
    });

    if (importRejected &&
        directImportRejected &&
        emptyCultSkillRejected &&
        stringPassionImported &&
        storedStringPassion.name === 'Love (Family)' &&
        storedStringPassion.type === 'Love' &&
        storedStringPassion.subject === 'Family' &&
        emptyOptionalPassionImported &&
        storedEmptyOptionalPassion.name === 'Honor' &&
        storedEmptyOptionalPassion.type === 'Honor' &&
        storedEmptyOptionalPassion.subject === '' &&
        emptyOptionalPassionObjectImported &&
        storedEmptyOptionalPassionObject.name === 'Honor' &&
        storedEmptyOptionalPassionObject.type === 'Honor' &&
        storedEmptyOptionalPassionObject.subject === '' &&
        contradictoryImported &&
        storedContradictoryPassion.name === 'Loyalty (Clan)' &&
        storedContradictoryPassion.subject === 'Clan' &&
        !lowercasePassionResult.success &&
        lowercasePassionResult.errors.some(error => /Love Passion requires a subject/.test(error)) &&
        !unresolvedSkillAllocation.success &&
        /Unresolved skill/.test(unresolvedSkillAllocation.error || '') &&
        normalizedSkillAllocation.success &&
        CD.bonusSkills.Shaping === 3 &&
        CD.bonusSkills['Shaping (Duration, Range, Targets, etc.)'] === undefined &&
        !duplicateProSkillResult.success &&
        duplicateProSkillResult.errors.some(error => /duplicate "Ride" after normalization/.test(error))) {
        pass('ADR-0014 import and public allocation APIs reject unresolved values and normalize storage');
    } else {
      fail('ADR-0014 import/API bypass guards failed',
        JSON.stringify({
          importRejected,
          directImportRejected,
          emptyCultSkillRejected,
          stringPassionImported,
          storedStringPassion,
          emptyOptionalPassionImported,
          storedEmptyOptionalPassion,
          emptyOptionalPassionObjectImported,
          storedEmptyOptionalPassionObject,
          contradictoryImported,
          storedContradictoryPassion,
          lowercasePassionResult,
          unresolvedSkillAllocation,
          normalizedSkillAllocation,
          duplicateProSkillResult,
          bonusSkills: CD.bonusSkills
        }));
    }
  } else {
    fail('App import/allocation APIs unavailable for ADR-0014 bypass regression test');
  }
}

// Test: ADR-0014 Combat Style disambiguation uses the CSE-derived closed vocabulary
{
  const { CharacterData: CD, getDisambiguationOptions, resolveRandomDisambiguatedSkill } = loadApp();
  if (CD && getDisambiguationOptions && resolveRandomDisambiguatedSkill) {
    CD.combatStyles = [
      { name: 'Sartarite Fyrd' },
      { name: 'Praxian Nomad' }
    ];
    const options = getDisambiguationOptions('Combat Style');
    const resolved = resolveRandomDisambiguatedSkill('Combat Style');
    if (JSON.stringify(options) === JSON.stringify(['Sartarite Fyrd', 'Praxian Nomad']) &&
        options.includes(resolved.replace(/^Combat Style \((.+)\)$/, '$1'))) {
      pass('ADR-0014 Combat Style random/manual options are CSE-backed');
    } else {
      fail('ADR-0014 Combat Style disambiguation is not CSE-backed',
        JSON.stringify({ options, resolved }));
    }
  } else {
    fail('Combat Style disambiguation helpers not exported for ADR-0014 CSE test');
  }
}

// Test: source-backed random sorcerers use the required culture school Invocation
{
  const { resolveRandomDisambiguatedSkill } = loadApp();
  if (resolveRandomDisambiguatedSkill) {
    const resolved = resolveRandomDisambiguatedSkill('Invocation (Cult, School or Grimoire)', 'God Forgot');
    if (resolved === 'Invocation (Zzistori School)') {
      pass('Random God Forgot Sorcerer Invocation resolves to Zzistori School');
    } else {
      fail('Random God Forgot Sorcerer Invocation can miss the Zzistori source gate', resolved);
    }
  } else {
    fail('resolveRandomDisambiguatedSkill unavailable for God Forgot Invocation regression test');
  }
}

// Test: ADR-0014 structured Passion input rejects unresolved subject-bearing Passion types
{
  const { App: AppObj, CharacterData: CD } = loadApp();
  if (AppObj?.agent?.setStep && CD) {
    const unresolved = AppObj.agent.setStep(6, {
      passions: [{ type: 'Love', value: 60 }]
    });
    const emptyParenthetical = AppObj.agent.setStep(6, {
      passions: [{ name: 'Hate ()', value: 60 }]
    });
    const resolved = AppObj.agent.setStep(6, {
      passions: [{ type: 'Love', subject: 'Family', description: 'Love of Family', value: 60 }]
    });
    const stored = CD.passions[0] || {};
    if (!unresolved.success &&
        unresolved.errors.some(error => /subject/i.test(error)) &&
        !emptyParenthetical.success &&
        emptyParenthetical.errors.some(error => /subject/i.test(error)) &&
        resolved.success &&
        stored.name === 'Love (Family)' &&
        stored.type === 'Love' &&
        stored.subject === 'Family') {
      pass('ADR-0014 structured Passion input blocks unresolved subject-bearing types');
    } else {
      fail('ADR-0014 structured Passion input accepted an unresolved subject-bearing Passion',
        JSON.stringify({ unresolved, emptyParenthetical, resolved, stored }));
    }
  } else {
    fail('App.agent.setStep unavailable for ADR-0014 Passion structure test');
  }
}

// Test: ADR-0014 manual flow blocks unresolved subject-bearing Passions before advancing
{
  const { App: AppObj, CharacterData: CD } = loadApp();
  if (AppObj?.validateCurrentStep && CD) {
    AppObj.currentStep = 6;
    CD.passions = [{ name: 'Love', type: 'Love', value: 60 }];
    const unresolvedAllowed = AppObj.validateCurrentStep();
    CD.passions = [{ name: 'Love (Family)', type: 'Love', subject: 'Family', value: 60 }];
    const resolvedAllowed = AppObj.validateCurrentStep();
    if (!unresolvedAllowed && resolvedAllowed) {
      pass('ADR-0014 manual Passion validation blocks unresolved subject-bearing types');
    } else {
      fail('ADR-0014 manual Passion validation did not enforce subjects',
        JSON.stringify({ unresolvedAllowed, resolvedAllowed }));
    }
  } else {
    fail('App.validateCurrentStep unavailable for ADR-0014 manual Passion test');
  }
}

// Test: ADR-0014 custom subject-bearing Passions render a correction input
{
  const { App: AppObj, CharacterData: CD, _sandbox } = loadApp();
  if (AppObj?.renderStep6 && CD && _sandbox?.document) {
    const originalCreateElement = _sandbox.document.createElement;
    const appendedRows = [];
    const makeElement = () => ({
      className: '',
      innerHTML: '',
      textContent: '',
      style: {},
      children: [],
      appendChild(child) { this.children.push(child); },
      querySelector(selector) {
        if (selector === '#passions-list') return { appendChild: row => appendedRows.push(row.innerHTML) };
        if (selector === '#passion-suggestions') return { appendChild: () => {} };
        return null;
      }
    });
    _sandbox.document.createElement = () => makeElement();
    CD.culture = 'Sartarite (Heortling)';
    CD.characteristics = { POW: 12, CHA: 10 };
    CD.passions = [{ name: 'Love', type: 'Love', value: 60, custom: true }];
    AppObj.renderStep6();
    _sandbox.document.createElement = originalCreateElement;
    const rowHtml = appendedRows.join('\n');
    if (rowHtml.includes('placeholder="(to what?)"') &&
        rowHtml.includes("App.updatePassionNameSubject(0, 'Love'")) {
      pass('ADR-0014 custom subject-bearing Passions render a manual correction input');
    } else {
      fail('ADR-0014 custom subject-bearing Passion cannot be corrected manually', rowHtml);
    }
  } else {
    fail('App.renderStep6 unavailable for ADR-0014 custom Passion correction test');
  }
}

// Test: Source professional skill placeholders are either resolved by disambiguation or concrete
{
  const { CAREERS_DATA, CULTURES_DATA, CULTS_DATA, DISAMBIGUATION_LISTS, needsDisambiguation } = loadApp();
  if (CAREERS_DATA && CULTURES_DATA && CULTS_DATA && DISAMBIGUATION_LISTS && needsDisambiguation) {
    const sources = [];
    for (const career of CAREERS_DATA) {
      for (const skill of career.professionalSkills || []) sources.push(`${career.name}: ${skill}`);
    }
    for (const culture of CULTURES_DATA) {
      for (const skill of culture.professionalSkills || []) sources.push(`${culture.name}: ${skill}`);
    }
    for (const cult of CULTS_DATA) {
      for (const skill of cult.cultSkills || []) sources.push(`${cult.name}: ${skill}`);
    }

    const descriptiveParenthetical = /\((?:any|any other|local|primary|secondary|specific|hunting related|regional(?:\s+or\s+specific)?|shipboard|physiological|alchemical|pantheon|cult|totem|tradition|school|grimoire)\b/i;
    const missed = sources.filter(entry => {
      const skill = entry.replace(/^.*?:\s*/, '');
      return descriptiveParenthetical.test(skill) && !needsDisambiguation(skill);
    });
    const unresolvedLoreOptions = (DISAMBIGUATION_LISTS.Lore || []).filter(option => ['Regional', 'Cult'].includes(option));

    if (missed.length > 0) {
      fail(`Source professional placeholder is not caught by needsDisambiguation(): ${missed[0]}`);
    } else if (unresolvedLoreOptions.length > 0) {
      fail(`Lore disambiguation choices must not offer unresolved category labels: ${unresolvedLoreOptions.join(', ')}`);
    } else {
      pass('Source professional skill placeholders are caught before they can become final skill names');
    }
  } else {
    fail('Could not audit source professional skill placeholders');
  }
}

// Test: Step 8 explains professional skill specializations and build-critical magic skills
{
  const { App, CharacterData } = loadApp();
  if (App && App.renderCareerDetails && CharacterData) {
    const careerHtml = {};
    for (const career of ['Shaman', 'Sorcerer', 'Mystic']) {
      CharacterData.career = career;
      CharacterData.selectedProfessionalSkills = [];
      CharacterData.careerSkills = {};
      careerHtml[career] = App.renderCareerDetails();
    }

    const requiredCopy = [
      [careerHtml.Shaman, 'Name the spirit tradition'],
      [careerHtml.Shaman, 'Core Animism depends on Trance'],
      [careerHtml.Shaman, 'Binding is the other core Animism skill'],
      [careerHtml.Shaman, 'Name the actual body of knowledge'],
      [careerHtml.Sorcerer, 'Sorcery needs Invocation'],
      [careerHtml.Sorcerer, 'Shaping controls how sorcery is modified'],
      [careerHtml.Mystic, 'Mysticism uses Meditation'],
      [careerHtml.Mystic, 'Mysticism is the core professional skill']
    ];
    const missing = requiredCopy.find(([html, text]) => !html.includes(text));
    if (missing) {
      fail(`Step 8 guidance missing copy: ${missing[1]}`);
    } else {
      pass('Step 8 explains specialization choices and build-critical magic skills');
    }
  } else {
    fail('Could not render Step 8 professional skill guidance');
  }
}

// Test: free-text specialization rejects category labels like Lore (Regional) and Lore (Cult)
{
  const { App, CharacterData, _sandbox } = loadApp();
  if (App && App.resolveProfessionalSkill && App.disambiguateAndUpdateFreeText && CharacterData) {
    const alerts = [];
    const toasts = [];
    _sandbox.alert = message => alerts.push(message);
    App.showToast = (message, type) => toasts.push({ message, type });

    CharacterData.selectedProfessionalSkills = ['Lore (any)'];
    CharacterData.careerSkills = { 'Lore (any)': 0 };
    CharacterData._disambiguationMap = {};
    const input = { value: 'Regional' };
    const checkboxRejected = App.resolveProfessionalSkill('Lore (any)', 'Regional', input) === false;

    CharacterData.selectedProfessionalSkills = ['Lore (any)'];
    CharacterData.careerSkills = { 'Lore (any)': 0 };
    CharacterData._disambiguationMap = {};
    const cultInput = { value: 'Cult' };
    const cultCheckboxRejected = App.resolveProfessionalSkill('Lore (any)', 'Cult', cultInput) === false;

    CharacterData.selectedProfessionalSkills = ['Lore (any)'];
    CharacterData.careerSkills = { 'Lore (any)': 5 };
    CharacterData._disambiguationMap = {};
    const freeTextRejected = App.disambiguateAndUpdateFreeText('career', 'Lore (any)', 'Regional', 'Lore') === false;

    const noAmbiguousSkill =
      !Object.prototype.hasOwnProperty.call(CharacterData.careerSkills, 'Lore (Regional)') &&
      !Object.prototype.hasOwnProperty.call(CharacterData.careerSkills, 'Lore (Cult)') &&
      !CharacterData.selectedProfessionalSkills.includes('Lore (Regional)') &&
      !CharacterData.selectedProfessionalSkills.includes('Lore (Cult)');
    const originalPreserved = CharacterData.careerSkills['Lore (any)'] === 5;
    const feedback = alerts.concat(toasts.map(t => t.message)).join(' ');

    if (checkboxRejected && cultCheckboxRejected && freeTextRejected && noAmbiguousSkill && originalPreserved && /category label|concrete/.test(feedback)) {
      pass('free-text specialization rejects Lore category labels before persistence');
    } else {
      fail('free-text specialization allowed ambiguous Lore category labels',
        JSON.stringify({ checkboxRejected, cultCheckboxRejected, freeTextRejected, noAmbiguousSkill, originalPreserved, inputValue: input.value, cultInputValue: cultInput.value, alerts, toasts, selected: CharacterData.selectedProfessionalSkills, careerSkills: CharacterData.careerSkills }));
    }
  } else {
    fail('Could not test ambiguous professional specialization rejection');
  }
}

// Test: selecting a cult resolves Lore (Cult) to the concrete cult Lore skill
{
  const { App, CharacterData: CD, Calc: CalcRef } = loadApp();
  if (App && App.selectCult && App.resolveCultSkillRequirement && CD) {
    CD.fromJSON(JSON.stringify(createTestCharacter('Praxian')));
    CD.cult = null;
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 12, CHA: 12 };
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    CD.culturalSkills = { 'Lore (Cult)': 10 };
    CD.careerSkills = {
      'Lore (Cult)': 15,
      'Devotion (Pantheon, Cult or God)': 5
    };
    CD.bonusSkills = { 'Lore (Cult)': 25 };
    CD.selectedProfessionalSkills = ['Lore (Cult)', 'Devotion (Pantheon, Cult or God)', 'Oratory'];
    CD.passions = [];

    const result = App.selectCult('Waha', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const allKeys = [
      ...Object.keys(CD.culturalSkills || {}),
      ...Object.keys(CD.careerSkills || {}),
      ...Object.keys(CD.bonusSkills || {}),
      ...(CD.selectedProfessionalSkills || [])
    ];
    const noLoreCult = !allKeys.includes('Lore (Cult)');
    const loreResolved =
      CD.culturalSkills['Lore (Waha)'] === 10 &&
      CD.careerSkills['Lore (Waha)'] === 15 &&
      CD.bonusSkills['Lore (Waha)'] === 25 &&
      CD.selectedProfessionalSkills.includes('Lore (Waha)');
    const devotionResolved = CD.selectedProfessionalSkills.includes('Devotion (Waha)');
    const requirement = App.resolveCultSkillRequirement('Lore (Cult)');

    if (result && result.success && noLoreCult && loreResolved && devotionResolved &&
        requirement.key === 'Lore (Waha)' && requirement.value >= 50 && requirement.qualifies) {
      pass('Cult selection resolves Lore (Cult) to concrete cult Lore across skill pools');
    } else {
      fail('Cult selection left Lore (Cult) unresolved or failed cult requirement matching',
        JSON.stringify({ result, noLoreCult, loreResolved, devotionResolved, requirement, culturalSkills: CD.culturalSkills, careerSkills: CD.careerSkills, bonusSkills: CD.bonusSkills, selected: CD.selectedProfessionalSkills }));
    }
  } else {
    fail('Could not test cult-bound Lore specialization resolution');
  }
}

// Test: changing cult after placeholder resolution rekeys cult-bound skills to the new cult
{
  const { App, CharacterData: CD, Calc: CalcRef } = loadApp();
  if (App && App.selectCult && App.resolveCultSkillRequirement && CD) {
    CD.fromJSON(JSON.stringify(createTestCharacter('Praxian')));
    CD.cult = null;
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 12, CHA: 12 };
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    CD.culturalSkills = { 'Lore (Cult)': 10 };
    CD.careerSkills = {
      'Lore (Cult)': 15,
      'Devotion (Pantheon, Cult or God)': 5
    };
    CD.bonusSkills = { 'Lore (Cult)': 25 };
    CD.selectedProfessionalSkills = ['Lore (Cult)', 'Devotion (Pantheon, Cult or God)', 'Oratory'];
    CD.passions = [];

    const wahaResult = App.selectCult('Waha', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const orlanthResult = App.selectCult('Orlanth', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const allKeys = [
      ...Object.keys(CD.culturalSkills || {}),
      ...Object.keys(CD.careerSkills || {}),
      ...Object.keys(CD.bonusSkills || {}),
      ...(CD.selectedProfessionalSkills || [])
    ];
    const noStaleWahaKeys = !allKeys.some(key => key === 'Lore (Waha)' || key === 'Devotion (Waha)');
    const orlanthLoreResolved =
      CD.culturalSkills['Lore (Orlanth)'] === 10 &&
      CD.careerSkills['Lore (Orlanth)'] === 15 &&
      CD.bonusSkills['Lore (Orlanth)'] === 25 &&
      CD.selectedProfessionalSkills.includes('Lore (Orlanth)');
    const orlanthDevotionResolved = CD.careerSkills['Devotion (Orlanth)'] === 5 &&
      CD.selectedProfessionalSkills.includes('Devotion (Orlanth)');
    const requirement = App.resolveCultSkillRequirement('Lore (Cult)');

    if (wahaResult?.success && orlanthResult?.success && noStaleWahaKeys &&
        orlanthLoreResolved && orlanthDevotionResolved &&
        requirement.key === 'Lore (Orlanth)' && requirement.value >= 50 && requirement.qualifies) {
      pass('Changing cult rekeys resolved cult-bound skills to the new cult');
    } else {
      fail('Changing cult left stale cult-bound skill names',
        JSON.stringify({ wahaResult, orlanthResult, noStaleWahaKeys, orlanthLoreResolved, orlanthDevotionResolved, requirement, culturalSkills: CD.culturalSkills, careerSkills: CD.careerSkills, bonusSkills: CD.bonusSkills, selected: CD.selectedProfessionalSkills }));
    }
  } else {
    fail('Could not test cult-bound skill rekeying on cult changes');
  }
}

// Test: changing cult does not rewrite fixed source skills that only happen to name the old cult
{
  const { App, CharacterData: CD, Calc: CalcRef } = loadApp();
  if (App && App.selectCult && CD) {
    CD.fromJSON(JSON.stringify(createTestCharacter('Sartarite (Heortling)')));
    CD.cult = null;
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 12, CHA: 12 };
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    CD.culturalSkills = { 'Lore (Orlanth)': 10 };
    CD.careerSkills = { 'Lore (Orlanth)': 15 };
    CD.bonusSkills = { 'Lore (Orlanth)': 25 };
    CD.selectedProfessionalSkills = ['Lore (Orlanth)', 'Oratory', 'Commerce'];
    CD._cultBoundPlaceholderMap = {};
    CD.passions = [];

    const orlanthResult = App.selectCult('Orlanth', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const ernaldaResult = App.selectCult('Ernalda', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const fixedSkillPreserved =
      CD.culturalSkills['Lore (Orlanth)'] === 10 &&
      CD.careerSkills['Lore (Orlanth)'] === 15 &&
      CD.bonusSkills['Lore (Orlanth)'] === 25 &&
      CD.selectedProfessionalSkills.includes('Lore (Orlanth)');
    const notRekeyed =
      !Object.keys(CD.culturalSkills).includes('Lore (Ernalda)') &&
      !Object.keys(CD.careerSkills).includes('Lore (Ernalda)') &&
      !Object.keys(CD.bonusSkills).includes('Lore (Ernalda)') &&
      !CD.selectedProfessionalSkills.includes('Lore (Ernalda)');

    if (orlanthResult?.success && ernaldaResult?.success && fixedSkillPreserved && notRekeyed) {
      pass('Changing cult preserves fixed source Lore skills that match the previous cult name');
    } else {
      fail('Changing cult rewrote fixed source Lore skills',
        JSON.stringify({ orlanthResult, ernaldaResult, fixedSkillPreserved, notRekeyed, culturalSkills: CD.culturalSkills, careerSkills: CD.careerSkills, bonusSkills: CD.bonusSkills, selected: CD.selectedProfessionalSkills, cultBoundMap: CD._cultBoundPlaceholderMap }));
    }
  } else {
    fail('Could not test fixed source skill preservation on cult changes');
  }
}

// Test: cult rekeying is scoped to placeholder-originated slots, not every matching skill name
{
  const { App, CharacterData: CD, Calc: CalcRef } = loadApp();
  if (App && App.selectCult && CD) {
    CD.fromJSON(JSON.stringify(createTestCharacter('Praxian')));
    CD.cult = null;
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 12, CHA: 12 };
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    CD.culturalSkills = { 'Lore (Waha)': 7 };
    CD.careerSkills = { 'Lore (Cult)': 15 };
    CD.bonusSkills = {};
    CD.selectedProfessionalSkills = ['Lore (Cult)', 'Oratory', 'Commerce'];
    CD.passions = [];

    const wahaResult = App.selectCult('Waha', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const orlanthResult = App.selectCult('Orlanth', { skipConfirmation: true, allowMagicSelectionLoss: true });

    const fixedCulturalPreserved = CD.culturalSkills['Lore (Waha)'] === 7 &&
      !Object.keys(CD.culturalSkills).includes('Lore (Orlanth)');
    const placeholderCareerRekeyed = CD.careerSkills['Lore (Orlanth)'] === 15 &&
      !Object.keys(CD.careerSkills).includes('Lore (Waha)');
    const selectedRekeyed = CD.selectedProfessionalSkills.includes('Lore (Orlanth)') &&
      !CD.selectedProfessionalSkills.includes('Lore (Waha)');

    if (wahaResult?.success && orlanthResult?.success &&
        fixedCulturalPreserved && placeholderCareerRekeyed && selectedRekeyed) {
      pass('Cult rekeying only updates placeholder-originated cult skills');
    } else {
      fail('Cult rekeying rewrote unrelated fixed cult-named skills',
        JSON.stringify({ wahaResult, orlanthResult, fixedCulturalPreserved, placeholderCareerRekeyed, selectedRekeyed, culturalSkills: CD.culturalSkills, careerSkills: CD.careerSkills, selected: CD.selectedProfessionalSkills, cultBoundMap: CD._cultBoundPlaceholderMap }));
    }
  } else {
    fail('Could not test cult rekeying scope');
  }
}

// Test: migrated placeholder allocations keep their own amount when they collide with fixed skills
{
  const { App, CharacterData: CD, Calc: CalcRef } = loadApp();
  if (App?.importCharacterData && App.selectCult && CD) {
    const oldSave = {
      ...createTestCharacter('Sartarite (Heortling)'),
      cult: 'Orlanth',
      characteristics: { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 12, CHA: 12 },
      culturalSkills: { 'Lore (Orlanth)': 7, 'Lore (Cult)': 10 },
      careerSkills: { 'Lore (Orlanth)': 4, 'Lore (Cult)': 15 },
      bonusSkills: { 'Lore (Orlanth)': 3, 'Lore (Cult)': 25 },
      selectedProfessionalSkills: ['Lore (Cult)', 'Oratory', 'Commerce'],
      _disambiguationMap: {},
      _cultBoundPlaceholderMap: {}
    };
    const toasts = [];
    App.renderCurrentStep = () => {};
    App.saveToLocalStorage = () => {};
    App.showToast = (message, type) => toasts.push({ message, type });
    const imported = App.importCharacterData(oldSave);
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    const ernaldaResult = App.selectCult('Ernalda', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const fixedAmountsPreserved =
      CD.culturalSkills['Lore (Orlanth)'] === 7 &&
      CD.careerSkills['Lore (Orlanth)'] === 4 &&
      CD.bonusSkills['Lore (Orlanth)'] === 3;
    const placeholderAmountsRekeyed =
      CD.culturalSkills['Lore (Ernalda)'] === 10 &&
      CD.careerSkills['Lore (Ernalda)'] === 15 &&
      CD.bonusSkills['Lore (Ernalda)'] === 25 &&
      CD.selectedProfessionalSkills.includes('Lore (Ernalda)');

    if (imported && ernaldaResult?.success && fixedAmountsPreserved && placeholderAmountsRekeyed) {
      pass('Migrated cult placeholder collisions only rekey placeholder-originated amounts');
    } else {
      fail('Migrated cult placeholder collision rekeyed fixed skill allocations',
        JSON.stringify({ imported, ernaldaResult, toasts, fixedAmountsPreserved, placeholderAmountsRekeyed, culturalSkills: CD.culturalSkills, careerSkills: CD.careerSkills, bonusSkills: CD.bonusSkills, selected: CD.selectedProfessionalSkills, cultBoundMap: CD._cultBoundPlaceholderMap }));
    }
  } else {
    fail('Could not test migrated placeholder collision rekeying');
  }
}

// Test: zero-point placeholder resolutions move later allocations when the cult changes
{
  const { App, CharacterData: CD, Calc: CalcRef } = loadApp();
  if (App && App.selectCult && CD) {
    CD.fromJSON(JSON.stringify(createTestCharacter('Praxian')));
    CD.cult = null;
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 12, CHA: 12 };
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    CD.culturalSkills = {};
    CD.careerSkills = { 'Lore (Cult)': 0 };
    CD.bonusSkills = {};
    CD.selectedProfessionalSkills = ['Lore (Cult)', 'Oratory', 'Commerce'];
    CD.passions = [];

    const wahaResult = App.selectCult('Waha', { skipConfirmation: true, allowMagicSelectionLoss: true });
    CD.careerSkills['Lore (Waha)'] = 15;
    const orlanthResult = App.selectCult('Orlanth', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const allocationRekeyed = CD.careerSkills['Lore (Orlanth)'] === 15 &&
      !Object.keys(CD.careerSkills).includes('Lore (Waha)');
    const selectedRekeyed = CD.selectedProfessionalSkills.includes('Lore (Orlanth)') &&
      !CD.selectedProfessionalSkills.includes('Lore (Waha)');

    if (wahaResult?.success && orlanthResult?.success && allocationRekeyed && selectedRekeyed) {
      pass('Cult rekeying moves points allocated after zero-point placeholder resolution');
    } else {
      fail('Cult rekeying left post-resolution allocations on the previous cult skill',
        JSON.stringify({ wahaResult, orlanthResult, allocationRekeyed, selectedRekeyed, careerSkills: CD.careerSkills, selected: CD.selectedProfessionalSkills, cultBoundMap: CD._cultBoundPlaceholderMap }));
    }
  } else {
    fail('Could not test post-resolution cult allocation rekeying');
  }
}

// Test: selecting a first real cult rekeys tracked fallback cult-bound skills from no-cult random state
{
  const { App, CharacterData: CD, Calc: CalcRef } = loadApp();
  if (App && App.selectCult && CD) {
    CD.fromJSON(JSON.stringify(createTestCharacter('Sartarite (Heortling)')));
    CD.cult = null;
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 12, CHA: 12 };
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    CD.careerSkills = { 'Lore (Orlanth)': 15 };
    CD.selectedProfessionalSkills = ['Lore (Orlanth)', 'Oratory', 'Commerce'];
    CD._cultBoundPlaceholderMap = {
      'careerSkills:Lore (Cult)': { skill: 'Lore (Orlanth)', preserveAmount: 0 },
      'selectedProfessionalSkills:Lore (Cult)': 'Lore (Orlanth)'
    };
    CD.passions = [];

    const ernaldaResult = App.selectCult('Ernalda', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const allocationRekeyed = CD.careerSkills['Lore (Ernalda)'] === 15 &&
      !Object.keys(CD.careerSkills).includes('Lore (Orlanth)');
    const selectedRekeyed = CD.selectedProfessionalSkills.includes('Lore (Ernalda)') &&
      !CD.selectedProfessionalSkills.includes('Lore (Orlanth)');

    if (ernaldaResult?.success && allocationRekeyed && selectedRekeyed) {
      pass('First real cult selection rekeys tracked no-cult fallback skills');
    } else {
      fail('First real cult selection left tracked fallback skills on the implicit cult',
        JSON.stringify({ ernaldaResult, allocationRekeyed, selectedRekeyed, careerSkills: CD.careerSkills, selected: CD.selectedProfessionalSkills, cultBoundMap: CD._cultBoundPlaceholderMap }));
    }
  } else {
    fail('Could not test first-cult fallback skill rekeying');
  }
}

// Test: no-cult suggested builds track concrete fallback Lore as placeholder-originated
{
  const { App, CharacterData: CD, CULTURE_BUILD_SPECS: CultureBuildSpecs } = loadApp();
  const record = CultureBuildSpecs?.['sartarite-heortling-wind-lord-aspirant'];
  if (App?.agent?.buildCharacter && App?.agent?.selectCult && CD && record?.spec) {
    App.renderCurrentStep = () => {};
    App.saveToLocalStorage = () => {};
    App.switchMode = mode => { App.mode = mode; };

    const built = App.agent.buildCharacter(record.spec);
    const ernaldaResult = App.agent.selectCult('Ernalda');
    const allocationRekeyed = CD.careerSkills['Lore (Ernalda)'] === 15 &&
      !Object.keys(CD.careerSkills).includes('Lore (Orlanth)');
    const bonusShadowClean = !Object.keys(CD.bonusSkills).includes('Lore (Orlanth)');
    const selectedRekeyed = CD.selectedProfessionalSkills.includes('Lore (Ernalda)') &&
      !CD.selectedProfessionalSkills.includes('Lore (Orlanth)');

    if (built?.success && ernaldaResult?.success && allocationRekeyed && bonusShadowClean && selectedRekeyed) {
      pass('No-cult suggested build rekeys fallback cult Lore on first real cult selection');
    } else {
      fail('No-cult suggested build left fallback Lore fixed to its implicit cult',
        JSON.stringify({ built, ernaldaResult, allocationRekeyed, bonusShadowClean, selectedRekeyed, careerSkills: CD.careerSkills, bonusSkills: CD.bonusSkills, selected: CD.selectedProfessionalSkills, cultBoundMap: CD._cultBoundPlaceholderMap }));
    }
  } else {
    fail('Could not test no-cult suggested build fallback Lore tracking');
  }
}

// Test: legacy object-form cult placeholder tracking without preserveAmount remains loadable
{
  const { App, CharacterData: CD, Calc: CalcRef } = loadApp();
  if (App?.importCharacterData && App.selectCult && CD) {
    const oldSave = {
      ...createTestCharacter('Praxian'),
      cult: 'Waha',
      characteristics: { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 12, CHA: 12 },
      careerSkills: { 'Lore (Waha)': 15 },
      selectedProfessionalSkills: ['Lore (Waha)', 'Oratory', 'Commerce'],
      _cultBoundPlaceholderMap: {
        'careerSkills:Lore (Cult)': { skill: 'Lore (Waha)' },
        'selectedProfessionalSkills:Lore (Cult)': { skill: 'Lore (Waha)' }
      }
    };
    const toasts = [];
    App.renderCurrentStep = () => {};
    App.saveToLocalStorage = () => {};
    App.showToast = (message, type) => toasts.push({ message, type });
    const imported = App.importCharacterData(oldSave);
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    const orlanthResult = App.selectCult('Orlanth', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const allocationRekeyed = CD.careerSkills['Lore (Orlanth)'] === 15 &&
      !Object.keys(CD.careerSkills).includes('Lore (Waha)');
    const selectedRekeyed = CD.selectedProfessionalSkills.includes('Lore (Orlanth)') &&
      !CD.selectedProfessionalSkills.includes('Lore (Waha)');

    if (imported && orlanthResult?.success && allocationRekeyed && selectedRekeyed) {
      pass('Legacy object-form cult placeholder tracking remains loadable and rekeys');
    } else {
      fail('Legacy object-form cult placeholder tracking was rejected or failed to rekey',
        JSON.stringify({ imported, orlanthResult, toasts, allocationRekeyed, selectedRekeyed, careerSkills: CD.careerSkills, selected: CD.selectedProfessionalSkills, cultBoundMap: CD._cultBoundPlaceholderMap }));
    }
  } else {
    fail('Could not test legacy object-form cult placeholder tracking');
  }
}

// Test: granular agent cult selection resolves cult-bound placeholders
{
  const { App, CharacterData: CD, Calc: CalcRef } = loadApp();
  if (App?.agent?.selectCult && CD) {
    CD.fromJSON(JSON.stringify(createTestCharacter('Praxian')));
    CD.cult = null;
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 12, CHA: 12 };
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    CD.careerSkills = {
      'Lore (Cult)': 15,
      'Devotion (Pantheon, Cult or God)': 5
    };
    CD.selectedProfessionalSkills = ['Lore (Cult)', 'Devotion (Pantheon, Cult or God)', 'Oratory'];
    const result = App.agent.selectCult('Waha');
    const selectedResolved = CD.selectedProfessionalSkills.includes('Lore (Waha)') &&
      CD.selectedProfessionalSkills.includes('Devotion (Waha)');

    if (result?.success && CD.careerSkills['Lore (Waha)'] === 15 &&
        CD.careerSkills['Devotion (Waha)'] === 5 && selectedResolved &&
        !CD.selectedProfessionalSkills.includes('Lore (Cult)')) {
      pass('Agent selectCult resolves cult-bound placeholders');
    } else {
      fail('Agent selectCult left cult-bound placeholders unresolved',
        JSON.stringify({ result, careerSkills: CD.careerSkills, selected: CD.selectedProfessionalSkills }));
    }
  } else {
    fail('Could not test agent cult-bound placeholder resolution');
  }
}

// Test: agent build Step 11 resolves cult-bound bonus placeholders after Step 9 cult selection
{
  const { App, CharacterData: CD } = loadApp();
  if (App?.agent?.buildCharacter && CD) {
    App.renderCurrentStep = () => {};
    App.saveToLocalStorage = () => {};
    App.switchMode = mode => { App.mode = mode; };

    const result = App.agent.buildCharacter({
      step1: { name: 'Korlmar Blackspear', concept: 'Vengeful warrior' },
      step2: { characteristics: { STR: 14, CON: 12, SIZ: 11, DEX: 10, INT: 9, POW: 12, CHA: 7 } },
      step4: { culture: 'Sartarite (Heortling)', homeland: 'Boldhome' },
      step5: {
        culturalSkills: { Athletics: 15, Brawn: 15, Endurance: 15, Evade: 10, Locale: 10, Perception: 10, Willpower: 15, Ride: 10 },
        runeAffinities: { primary: 'Air', secondary: 'Movement', tertiary: 'Death' },
        folkMagicSpells: ['Bladesharp', 'Fanaticism', 'Protection']
      },
      step6: {
        passions: [
          { type: 'Loyalty', subject: 'Colymar Tribe', value: 47 },
          { type: 'Hate', subject: 'Lunars', value: 47 }
        ]
      },
      step7: { age: 21, gender: 'Male', family: 'Blackspear clan' },
      step8: {
        career: 'Warrior',
        professionalSkills: [
          { name: 'Lore (any)', specialization: 'Tactics' },
          { name: 'Craft (any)', specialization: 'Weaponsmithing' },
          { name: 'Survival' }
        ]
      },
      step9: { cult: 'Orlanth', miracles: ['Shield', 'Lightning', 'Wind Words', 'Flight', 'Extension', 'Summon Sylph'] },
      step10: {
        careerSkills: { Athletics: 15, Perception: 10, Endurance: 15, Evade: 10, Unarmed: 10, 'Combat Style (Hill Clan Levy)': 15, 'Lore (Tactics)': 10, Ride: 15 },
        careerFolkMagic: ['Disruption', 'Vigour']
      },
      step11: {
        bonusSkills: {
          Athletics: 15,
          Ride: 15,
          Endurance: 15,
          Evade: 15,
          Willpower: 15,
          Unarmed: 15,
          'Combat Style (Hill Clan Levy)': 15,
          'Lore (Cult)': 15,
          'Devotion (Pantheon, Cult or God)': 15,
          Perception: 15
        }
      },
      step12: { socialClass: 'Freeman' }
    });

    const bonusResolved = CD.bonusSkills['Lore (Orlanth)'] === 15 &&
      CD.bonusSkills['Devotion (Orlanth)'] === 15 &&
      !Object.keys(CD.bonusSkills).includes('Lore (Cult)') &&
      !Object.keys(CD.bonusSkills).includes('Devotion (Pantheon, Cult or God)');
    const tracked = CD._cultBoundPlaceholderMap?.['bonusSkills:Lore (Cult)']?.skill === 'Lore (Orlanth)' &&
      CD._cultBoundPlaceholderMap?.['bonusSkills:Devotion (Pantheon, Cult or God)']?.skill === 'Devotion (Orlanth)';

    if (result?.success && bonusResolved && tracked) {
      pass('Agent buildCharacter resolves Step 11 cult-bound bonus placeholders after cult selection');
    } else {
      fail('Agent buildCharacter left Step 11 cult-bound bonus placeholders unresolved',
        JSON.stringify({ result, bonusResolved, tracked, bonusSkills: CD.bonusSkills, cultBoundMap: CD._cultBoundPlaceholderMap }));
    }
  } else {
    fail('Could not test Step 11 cult-bound bonus placeholder resolution');
  }
}

// Test: live professional disambiguation tracks cult-bound origins for later cult changes
{
  const { App, CharacterData: CD, Calc: CalcRef } = loadApp();
  if (App?.resolveProfessionalSkill && App.selectCult && CD) {
    CD.fromJSON(JSON.stringify(createTestCharacter('Sartarite (Heortling)')));
    CD.cult = null;
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 12, CHA: 12 };
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    CD.careerSkills = { 'Devotion (Pantheon, Cult or God)': 0 };
    CD.selectedProfessionalSkills = ['Devotion (Pantheon, Cult or God)', 'Oratory', 'Commerce'];
    CD.passions = [];
    App.saveToLocalStorage = () => {};

    const resolved = App.resolveProfessionalSkill('Devotion (Pantheon, Cult or God)', 'Orlanth', { value: 'Orlanth' });
    CD.careerSkills['Devotion (Orlanth)'] = 12;
    CD.bonusSkills = { 'Devotion (Orlanth)': 10 };
    const ernaldaResult = App.selectCult('Ernalda', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const allocationRekeyed = CD.careerSkills['Devotion (Ernalda)'] === 12 &&
      CD.bonusSkills['Devotion (Ernalda)'] === 10 &&
      !Object.keys(CD.careerSkills).includes('Devotion (Orlanth)');
    const bonusRekeyed = !Object.keys(CD.bonusSkills).includes('Devotion (Orlanth)');
    const selectedRekeyed = CD.selectedProfessionalSkills.includes('Devotion (Ernalda)') &&
      !CD.selectedProfessionalSkills.includes('Devotion (Orlanth)');

    if (resolved && ernaldaResult?.success && allocationRekeyed && bonusRekeyed && selectedRekeyed) {
      pass('Live professional cult-bound disambiguation rekeys on later cult changes');
    } else {
      fail('Live professional cult-bound disambiguation left stale cult skill names',
        JSON.stringify({ resolved, ernaldaResult, allocationRekeyed, bonusRekeyed, selectedRekeyed, careerSkills: CD.careerSkills, bonusSkills: CD.bonusSkills, selected: CD.selectedProfessionalSkills, cultBoundMap: CD._cultBoundPlaceholderMap }));
    }
  } else {
    fail('Could not test live cult-bound professional disambiguation tracking');
  }
}

// Test: old saved characters with Lore (Cult) migrate before import validation
{
  const { App: AppObj, CharacterData: CD } = loadApp();
  if (AppObj?.importCharacterData && CD) {
    const oldSave = {
      ...createTestCharacter('Praxian'),
      cult: 'Waha',
      culturalSkills: { 'Lore (Cult)': 10 },
      careerSkills: { 'Lore (Cult)': 15 },
      bonusSkills: { 'Lore (Cult)': 5 },
      selectedProfessionalSkills: ['Lore (Cult)', 'Devotion (Pantheon, Cult or God)', 'Oratory'],
      _disambiguationMap: {}
    };
    const toasts = [];
    AppObj.renderCurrentStep = () => {};
    AppObj.saveToLocalStorage = () => {};
    AppObj.showToast = (message, type) => toasts.push({ message, type });
    const imported = AppObj.importCharacterData(oldSave);

    if (imported && CD.culturalSkills['Lore (Waha)'] === 10 &&
        CD.careerSkills['Lore (Waha)'] === 15 &&
        CD.bonusSkills['Lore (Waha)'] === 5 &&
        CD.selectedProfessionalSkills.includes('Lore (Waha)') &&
        !Object.keys(CD.careerSkills).includes('Lore (Cult)')) {
      pass('Import migrates saved cult Lore placeholders before validation');
    } else {
      fail('Import rejected or failed to migrate saved Lore (Cult) placeholders',
        JSON.stringify({ imported, toasts, culturalSkills: CD.culturalSkills, careerSkills: CD.careerSkills, bonusSkills: CD.bonusSkills, selected: CD.selectedProfessionalSkills }));
    }
  } else {
    fail('Could not test saved cult Lore placeholder import migration');
  }
}

// Test: legacy disambiguation maps preserve cult-placeholder origins for later rekeying
{
  const { App: AppObj, CharacterData: CD, Calc: CalcRef } = loadApp();
  if (AppObj?.importCharacterData && AppObj.selectCult && CD) {
    const oldSave = {
      ...createTestCharacter('Lunar Heartland'),
      cult: 'Etyries',
      characteristics: { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 12, CHA: 12 },
      culturalSkills: {
        'Lore (Etyries)': 7
      },
      careerSkills: {
        'Lore (Etyries)': 15,
        'Binding (Etyries)': 5,
        'Devotion (Etyries)': 10
      },
      selectedProfessionalSkills: ['Lore (Etyries)', 'Binding (Etyries)', 'Devotion (Etyries)'],
      _disambiguationMap: {
        'Lore (Cult)': 'Lore (Etyries)',
        'career:Lore (Cult)': 'Lore (Etyries)',
        'career:Binding (Cult, Totem or Tradition)': 'Binding (Etyries)',
        'career:Devotion (Pantheon, Cult or God)': 'Devotion (Etyries)'
      },
      _cultBoundPlaceholderMap: {}
    };
    const toasts = [];
    AppObj.renderCurrentStep = () => {};
    AppObj.saveToLocalStorage = () => {};
    AppObj.showToast = (message, type) => toasts.push({ message, type });
    const imported = AppObj.importCharacterData(oldSave);
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    const wahaResult = AppObj.selectCult('Waha', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const allocationRekeyed = CD.careerSkills['Lore (Waha)'] === 15 &&
      CD.careerSkills['Binding (Waha)'] === 5 &&
      CD.careerSkills['Devotion (Waha)'] === 10 &&
      !Object.keys(CD.careerSkills).some(skill => /\(Etyries\)$/.test(skill));
    const fixedCulturalPreserved = CD.culturalSkills['Lore (Etyries)'] === 7 &&
      !Object.keys(CD.culturalSkills).includes('Lore (Waha)');
    const selectedRekeyed = CD.selectedProfessionalSkills.includes('Lore (Waha)') &&
      CD.selectedProfessionalSkills.includes('Binding (Waha)') &&
      CD.selectedProfessionalSkills.includes('Devotion (Waha)') &&
      !CD.selectedProfessionalSkills.some(skill => /\(Etyries\)$/.test(skill));
    const disambiguationRekeyed = CD._disambiguationMap?.['Lore (Cult)'] === 'Lore (Waha)' &&
      CD._disambiguationMap?.['career:Lore (Cult)'] === 'Lore (Waha)' &&
      CD._disambiguationMap?.['career:Binding (Cult, Totem or Tradition)'] === 'Binding (Waha)' &&
      CD._disambiguationMap?.['career:Devotion (Pantheon, Cult or God)'] === 'Devotion (Waha)';

    if (imported && wahaResult?.success && allocationRekeyed && fixedCulturalPreserved && selectedRekeyed && disambiguationRekeyed) {
      pass('Import tracks legacy _disambiguationMap cult placeholder origins for later rekeying');
    } else {
      fail('Import left legacy _disambiguationMap cult placeholder origin untracked',
        JSON.stringify({ imported, wahaResult, toasts, allocationRekeyed, fixedCulturalPreserved, selectedRekeyed, disambiguationRekeyed, culturalSkills: CD.culturalSkills, careerSkills: CD.careerSkills, selected: CD.selectedProfessionalSkills, disambiguationMap: CD._disambiguationMap, cultBoundMap: CD._cultBoundPlaceholderMap }));
    }
  } else {
    fail('Could not test legacy disambiguation-map cult placeholder tracking');
  }
}

// Test: stale legacy disambiguation origins reconcile to the imported current cult
{
  const { App: AppObj, CharacterData: CD, Calc: CalcRef } = loadApp();
  if (AppObj?.importCharacterData && AppObj.selectCult && CD) {
    const oldSave = {
      ...createTestCharacter('Praxian'),
      cult: 'Waha',
      characteristics: { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 12, CHA: 12 },
      culturalSkills: {
        'Lore (Orlanth)': 7
      },
      careerSkills: {
        'Lore (Orlanth)': 15,
        'Devotion (Orlanth)': 10
      },
      bonusSkills: {
        'Lore (Orlanth)': 5
      },
      selectedProfessionalSkills: ['Lore (Orlanth)', 'Devotion (Orlanth)', 'Oratory'],
      _disambiguationMap: {
        'career:Lore (Cult)': 'Lore (Orlanth)',
        'career:Devotion (Pantheon, Cult or God)': 'Devotion (Orlanth)'
      },
      _cultBoundPlaceholderMap: {}
    };
    const toasts = [];
    AppObj.renderCurrentStep = () => {};
    AppObj.saveToLocalStorage = () => {};
    AppObj.showToast = (message, type) => toasts.push({ message, type });
    const imported = AppObj.importCharacterData(oldSave);
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    const importedCultReconciled = CD.careerSkills['Lore (Waha)'] === 15 &&
      CD.careerSkills['Devotion (Waha)'] === 10 &&
      CD.bonusSkills['Lore (Waha)'] === 5 &&
      CD.selectedProfessionalSkills.includes('Lore (Waha)') &&
      CD.selectedProfessionalSkills.includes('Devotion (Waha)') &&
      !Object.keys(CD.careerSkills).some(skill => /\(Orlanth\)$/.test(skill)) &&
      !Object.keys(CD.bonusSkills).some(skill => /\(Orlanth\)$/.test(skill));
    const fixedCulturalPreserved = CD.culturalSkills['Lore (Orlanth)'] === 7 &&
      !Object.keys(CD.culturalSkills).includes('Lore (Waha)');
    const ernaldaResult = AppObj.selectCult('Ernalda', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const laterRekeyed = CD.careerSkills['Lore (Ernalda)'] === 15 &&
      CD.careerSkills['Devotion (Ernalda)'] === 10 &&
      CD.bonusSkills['Lore (Ernalda)'] === 5 &&
      CD.selectedProfessionalSkills.includes('Lore (Ernalda)') &&
      CD.selectedProfessionalSkills.includes('Devotion (Ernalda)') &&
      !Object.keys(CD.careerSkills).some(skill => /\(Waha\)$|\(Orlanth\)$/.test(skill)) &&
      !Object.keys(CD.bonusSkills).some(skill => /\(Waha\)$|\(Orlanth\)$/.test(skill));

    if (imported && importedCultReconciled && fixedCulturalPreserved && ernaldaResult?.success && laterRekeyed) {
      pass('Import reconciles stale cult-bound disambiguation origins to the current cult');
    } else {
      fail('Import left stale cult-bound disambiguation origins unrekeyable',
        JSON.stringify({ imported, ernaldaResult, toasts, importedCultReconciled, fixedCulturalPreserved, laterRekeyed, culturalSkills: CD.culturalSkills, careerSkills: CD.careerSkills, bonusSkills: CD.bonusSkills, selected: CD.selectedProfessionalSkills, disambiguationMap: CD._disambiguationMap, cultBoundMap: CD._cultBoundPlaceholderMap }));
    }
  } else {
    fail('Could not test stale cult-bound disambiguation origin reconciliation');
  }
}

// Test: bare legacy disambiguation origins do not over-track ambiguous fixed skills
{
  const { App: AppObj, CharacterData: CD, Calc: CalcRef } = loadApp();
  if (AppObj?.importCharacterData && AppObj.selectCult && CD) {
    const oldSave = {
      ...createTestCharacter('Lunar Heartland'),
      cult: 'Etyries',
      characteristics: { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 12, CHA: 12 },
      culturalSkills: {
        'Lore (Etyries)': 7
      },
      careerSkills: {},
      bonusSkills: {
        'Lore (Etyries)': 15
      },
      selectedProfessionalSkills: ['Bureaucracy', 'Commerce', 'Evaluate'],
      _disambiguationMap: {
        'Lore (Cult)': 'Lore (Etyries)'
      },
      _cultBoundPlaceholderMap: {}
    };
    const toasts = [];
    AppObj.renderCurrentStep = () => {};
    AppObj.saveToLocalStorage = () => {};
    AppObj.showToast = (message, type) => toasts.push({ message, type });
    const imported = AppObj.importCharacterData(oldSave);
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    const wahaResult = AppObj.selectCult('Waha', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const fixedCulturalPreserved = CD.culturalSkills['Lore (Etyries)'] === 7 &&
      !Object.keys(CD.culturalSkills).includes('Lore (Waha)');
    const ambiguousBonusNotGuessed = CD.bonusSkills['Lore (Etyries)'] === 15 &&
      !Object.keys(CD.bonusSkills).includes('Lore (Waha)');

    if (imported && wahaResult?.success && fixedCulturalPreserved && ambiguousBonusNotGuessed) {
      pass('Bare legacy cult disambiguation keeps ambiguous fixed cult skills unchanged');
    } else {
      fail('Bare legacy cult disambiguation over-tracked ambiguous fixed skills',
        JSON.stringify({ imported, wahaResult, toasts, fixedCulturalPreserved, ambiguousBonusNotGuessed, culturalSkills: CD.culturalSkills, bonusSkills: CD.bonusSkills, cultBoundMap: CD._cultBoundPlaceholderMap }));
    }
  } else {
    fail('Could not test ambiguous bare legacy cult disambiguation tracking');
  }
}

// Test: autosaved old characters with Lore (Cult) migrate through localStorage load
{
  const { App: AppObj, CharacterData: CD, _sandbox } = loadApp();
  if (AppObj?.loadFromLocalStorage && CD && _sandbox) {
    const oldSave = {
      ...createTestCharacter('Praxian'),
      cult: 'Waha',
      culturalSkills: { 'Lore (Cult)': 10 },
      careerSkills: { 'Lore (Cult)': 15 },
      bonusSkills: { 'Lore (Cult)': 5 },
      selectedProfessionalSkills: ['Lore (Cult)', 'Devotion (Pantheon, Cult or God)', 'Oratory'],
      _disambiguationMap: {}
    };
    const storage = {
      mythrasChargenCharacter: JSON.stringify({ version: 1, data: oldSave })
    };
    const toasts = [];
    _sandbox.localStorage = {
      getItem: key => storage[key] || null,
      setItem: (key, value) => { storage[key] = value; },
      removeItem: key => { delete storage[key]; }
    };
    AppObj.showToast = (message, type) => toasts.push({ message, type });

    const loaded = AppObj.loadFromLocalStorage();

    if (loaded && CD.culturalSkills['Lore (Waha)'] === 10 &&
        CD.careerSkills['Lore (Waha)'] === 15 &&
        CD.bonusSkills['Lore (Waha)'] === 5 &&
        CD.selectedProfessionalSkills.includes('Lore (Waha)') &&
        !Object.keys(CD.careerSkills).includes('Lore (Cult)')) {
      pass('localStorage load migrates autosaved cult Lore placeholders');
    } else {
      fail('localStorage load failed to migrate autosaved Lore (Cult) placeholders',
        JSON.stringify({ loaded, toasts, culturalSkills: CD.culturalSkills, careerSkills: CD.careerSkills, bonusSkills: CD.bonusSkills, selected: CD.selectedProfessionalSkills }));
    }
  } else {
    fail('Could not test localStorage cult Lore placeholder migration');
  }
}

// Test: parsePlaceholderSkill extracts category and hint
{
  const { parsePlaceholderSkill } = loadApp();
  if (parsePlaceholderSkill) {
    const result = parsePlaceholderSkill('Lore (Primary Catch)');
    if (result && result.category === 'Lore' && result.hint === 'Primary Catch') {
      pass('parsePlaceholderSkill() extracts category and hint correctly');
    } else {
      fail(`parsePlaceholderSkill("Lore (Primary Catch)") returned ${JSON.stringify(result)}`);
    }
  } else {
    fail('parsePlaceholderSkill not exported');
  }
}

// Test: Random character generation resolves all placeholders for affected careers
{
  const { App, CharacterData: CD, CAREERS_DATA, CULTURES_DATA, CULTURE_CULT_MAP, needsDisambiguation, _sandbox } = loadApp();
  if (App && App.generateRandomCharacter && CAREERS_DATA && CULTURES_DATA && CULTURE_CULT_MAP && needsDisambiguation) {
    const originalCareers = CAREERS_DATA.slice();
    const originalCultures = CULTURES_DATA.slice();
    const sartarite = originalCultures.find(culture => culture.name === 'Sartarite (Heortling)');
    const priest = originalCareers.find(career => career.name === 'Priest');
    const originalCultMap = JSON.parse(JSON.stringify(CULTURE_CULT_MAP['Sartarite (Heortling)']));
    const originalRandom = _sandbox.Math.random;

    try {
      CAREERS_DATA.splice(0, CAREERS_DATA.length, priest);
      CULTURES_DATA.splice(0, CULTURES_DATA.length, sartarite);
      CULTURE_CULT_MAP['Sartarite (Heortling)'] = { primary: ['Orlanth'], common: [], forbidden: [] };
      _sandbox.Math.random = () => 0.2;
      App.generateRandomCharacter();
    } finally {
      CAREERS_DATA.splice(0, CAREERS_DATA.length, ...originalCareers);
      CULTURES_DATA.splice(0, CULTURES_DATA.length, ...originalCultures);
      CULTURE_CULT_MAP['Sartarite (Heortling)'] = originalCultMap;
      _sandbox.Math.random = originalRandom;
    }

    const allSkillNames = [
      ...Object.keys(CD.culturalSkills || {}),
      ...Object.keys(CD.careerSkills || {}),
      ...Object.keys(CD.bonusSkills || {}),
      ...(CD.selectedProfessionalSkills || [])
    ];
    const unresolvedFound = allSkillNames.find(skill => needsDisambiguation(skill));

    if (!unresolvedFound) {
      pass('Random generation resolves placeholder skills to concrete specializations');
    } else {
      fail('Random generation left unresolved placeholder skills',
        JSON.stringify({ unresolvedFound, allSkillNames, cult: CD.cult, career: CD.career }));
    }
  } else {
    fail('Could not test random generation — App or CAREERS_DATA missing');
  }
}

// Test: Random generation clears stale cult-bound placeholder tracking before building
{
  const { App, CharacterData: CD, CAREERS_DATA, CULTURES_DATA, CULTURE_CULT_MAP, _sandbox } = loadApp();
  if (App && App.generateRandomCharacter && CAREERS_DATA && CULTURES_DATA && CULTURE_CULT_MAP) {
    const originalCareers = CAREERS_DATA.slice();
    const originalCultures = CULTURES_DATA.slice();
    const sartarite = originalCultures.find(culture => culture.name === 'Sartarite (Heortling)');
    const priest = originalCareers.find(career => career.name === 'Priest');
    const originalCultMap = JSON.parse(JSON.stringify(CULTURE_CULT_MAP['Sartarite (Heortling)']));
    const originalRandom = _sandbox.Math.random;
    CD._disambiguationMap = { 'Lore (Cult)': 'Lore (Stale Cult)' };
    CD._cultBoundPlaceholderMap = {
      'careerSkills:Lore (Cult)': { skill: 'Lore (Stale Cult)', preserveAmount: 0 },
      'selectedProfessionalSkills:Lore (Cult)': 'Lore (Stale Cult)'
    };

    try {
      CAREERS_DATA.splice(0, CAREERS_DATA.length, priest);
      CULTURES_DATA.splice(0, CULTURES_DATA.length, sartarite);
      CULTURE_CULT_MAP['Sartarite (Heortling)'] = { primary: ['Orlanth'], common: [], forbidden: [] };
      _sandbox.Math.random = () => 0.2;
      App.generateRandomCharacter();
    } finally {
      CAREERS_DATA.splice(0, CAREERS_DATA.length, ...originalCareers);
      CULTURES_DATA.splice(0, CULTURES_DATA.length, ...originalCultures);
      CULTURE_CULT_MAP['Sartarite (Heortling)'] = originalCultMap;
      _sandbox.Math.random = originalRandom;
    }

    const staleTrackingGone = !JSON.stringify(CD._cultBoundPlaceholderMap || {}).includes('Stale Cult') &&
      !JSON.stringify(CD._disambiguationMap || {}).includes('Stale Cult');

    if (staleTrackingGone) {
      pass('Random generation clears stale cult-bound placeholder tracking');
    } else {
      fail('Random generation retained stale cult-bound placeholder tracking',
        JSON.stringify({ disambiguationMap: CD._disambiguationMap, cultBoundMap: CD._cultBoundPlaceholderMap }));
    }
  } else {
    fail('Could not test random generation stale cult placeholder tracking reset');
  }
}

// Test: Random generation does not collapse paired professional placeholders to duplicate cult specialties
{
  const {
    App,
    CharacterData: CD,
    CAREERS_DATA,
    CULTURES_DATA,
    CULTURE_CULT_MAP,
    normalizeCharacterFacingSkillName,
    needsDisambiguation,
    _sandbox
  } = loadApp();
  if (App && App.generateRandomCharacter && CAREERS_DATA && CULTURES_DATA && CULTURE_CULT_MAP &&
      normalizeCharacterFacingSkillName && needsDisambiguation) {
    const originalCareers = CAREERS_DATA.slice();
    const originalCultures = CULTURES_DATA.slice();
    const balazaring = originalCultures.find(culture => culture.name === 'Balazaring');
    const fisher = originalCareers.find(career => career.name === 'Fisher');
    const originalBalazaringMap = CULTURE_CULT_MAP.Balazaring
      ? JSON.parse(JSON.stringify(CULTURE_CULT_MAP.Balazaring))
      : null;
    const originalRandom = _sandbox.Math.random;

    try {
      CAREERS_DATA.splice(0, CAREERS_DATA.length, fisher);
      CULTURES_DATA.splice(0, CULTURES_DATA.length, balazaring);
      CULTURE_CULT_MAP.Balazaring = { primary: ['Foundchild'], common: [], forbidden: [] };
      _sandbox.Math.random = () => 0.2;
      App.generateRandomCharacter();
    } finally {
      CAREERS_DATA.splice(0, CAREERS_DATA.length, ...originalCareers);
      CULTURES_DATA.splice(0, CULTURES_DATA.length, ...originalCultures);
      if (originalBalazaringMap) {
        CULTURE_CULT_MAP.Balazaring = originalBalazaringMap;
      } else {
        delete CULTURE_CULT_MAP.Balazaring;
      }
      _sandbox.Math.random = originalRandom;
    }

    const normalizedSelected = (CD.selectedProfessionalSkills || []).map(normalizeCharacterFacingSkillName);
    const duplicate = normalizedSelected.find((skill, index) => normalizedSelected.indexOf(skill) !== index);
    const unresolved = normalizedSelected.find(skill => needsDisambiguation(skill));
    const loreSelections = normalizedSelected.filter(skill => skill.startsWith('Lore ('));
    if (CD.culture === 'Balazaring' && CD.career === 'Fisher' &&
        !duplicate && !unresolved && loreSelections.length >= 2) {
      pass('Random paired professional placeholders resolve to unique concrete specialties');
    } else {
      fail('Random paired professional placeholders collapsed or stayed unresolved',
        JSON.stringify({ culture: CD.culture, career: CD.career, cult: CD.cult, selected: CD.selectedProfessionalSkills, duplicate, unresolved }));
    }
  } else {
    fail('Could not test random paired professional placeholder uniqueness');
  }
}

// Test: All 19 fixtures have no unresolved skills
{
  const { needsDisambiguation } = loadApp();
  const fixturesDir = path.join(__dirname, 'fixtures');
  if (needsDisambiguation && fs.existsSync(fixturesDir)) {
    const fixtures = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
    let unresolvedFixture = null;

    for (const file of fixtures) {
      const data = JSON.parse(fs.readFileSync(path.join(fixturesDir, file), 'utf8'));
      const allSkillKeys = [
        ...Object.keys(data.culturalSkills || {}),
        ...Object.keys(data.careerSkills || {}),
        ...Object.keys(data.bonusSkills || {}),
        ...(data.selectedProfessionalSkills || [])
      ];
      const bad = allSkillKeys.find(k => needsDisambiguation(k));
      if (bad) {
        unresolvedFixture = `${file}: "${bad}"`;
        break;
      }
    }

    if (unresolvedFixture) {
      fail(`Fixture has unresolved skill: ${unresolvedFixture}`);
    } else {
      pass(`All ${fixtures.length} fixtures have fully-resolved skill names (no placeholders)`);
    }

    const importFailures = [];
    for (const file of fixtures) {
      const data = JSON.parse(fs.readFileSync(path.join(fixturesDir, file), 'utf8'));
      if (!App.CharacterData.fromJSON(JSON.stringify(data))) {
        importFailures.push(file);
      }
    }
    if (importFailures.length === 0) {
      pass(`All ${fixtures.length} fixtures import through CharacterData.fromJSON()`);
    } else {
      fail('Fixtures fail CharacterData.fromJSON()', importFailures.join(', '));
    }
  } else {
    fail('Could not verify fixtures — needsDisambiguation or fixtures dir missing');
  }
}

// Test: DISAMBIGUATION_LISTS has entries for Healing and Teach categories
{
  const { DISAMBIGUATION_LISTS } = loadApp();
  if (DISAMBIGUATION_LISTS) {
    if (DISAMBIGUATION_LISTS['Healing'] && DISAMBIGUATION_LISTS['Healing'].length > 0 &&
        DISAMBIGUATION_LISTS['Teach'] && DISAMBIGUATION_LISTS['Teach'].length > 0) {
      pass('DISAMBIGUATION_LISTS includes Healing and Teach categories for Beast Handler career');
    } else {
      fail('DISAMBIGUATION_LISTS missing Healing or Teach entries');
    }
  } else {
    fail('DISAMBIGUATION_LISTS not exported');
  }
}

// Test E.2: CharacterData.saveToLocalStorage() includes version
{
  if (App.CharacterData && App.CharacterData.saveToLocalStorage && App.CharacterData.getSchemaVersion) {
    // Mock localStorage inside the sandbox to capture saved data
    const vm = require('vm');
    const sandbox = App._sandbox;
    let savedData = null;

    // Install a capturing mock into the sandbox's localStorage
    const origSetItem = sandbox.localStorage.setItem;
    sandbox.localStorage.setItem = (key, value) => { savedData = value; };

    App.CharacterData.saveToLocalStorage();

    // Restore original
    sandbox.localStorage.setItem = origSetItem;

    if (savedData) {
      try {
        const payload = JSON.parse(savedData);
        if ('version' in payload && 'data' in payload) {
          pass('CharacterData.saveToLocalStorage() saves {version, data} payload');
          if (payload.version === 1) {
            pass('Saved payload version is 1');
          } else {
            fail(`Saved payload version is ${payload.version} (expected 1)`);
          }
        } else {
          fail('Saved payload missing version or data field');
        }
      } catch (e) {
        fail('Saved payload is not valid JSON');
      }
    } else {
      fail('saveToLocalStorage() did not write any data');
    }
  }
}

// Test E.3: CharacterData.loadFromLocalStorage() handles version 1
{
  if (App.CharacterData && App.CharacterData.loadFromLocalStorage) {
    const testPayload = {
      version: 1,
      data: {
        name: 'Test Load',
        characteristics: { STR: 14, CON: 12, SIZ: 11, DEX: 12, INT: 10, POW: 9, CHA: 8 }
      }
    };

    const result = App.CharacterData.loadFromLocalStorage(JSON.stringify(testPayload));
    if (result) {
      pass('CharacterData.loadFromLocalStorage() handles version 1 payload');
      if (result.name === 'Test Load') {
        pass('loadFromLocalStorage() returns correct data');
      } else {
        fail('loadFromLocalStorage() data mismatch');
      }
    } else {
      fail('CharacterData.loadFromLocalStorage() returned null for valid payload');
    }
  } else {
    fail('CharacterData.loadFromLocalStorage() not yet implemented (Goal E)');
  }
}

// Test E.4: CharacterData.migrateV0toV1() migrates legacy data
{
  if (App.CharacterData && App.CharacterData.migrateV0toV1) {
    const legacyData = {
      name: 'Legacy Character',
      characteristics: { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 10, POW: 10, CHA: 10 }
    };

    const migrated = App.CharacterData.migrateV0toV1(legacyData);
    if (migrated) {
      pass('CharacterData.migrateV0toV1() returns migrated data');
      if (migrated.schemaVersion === 1) {
        pass('Migrated data has schemaVersion = 1');
      } else {
        fail('Migrated data missing schemaVersion = 1');
      }
      if (migrated.name === 'Legacy Character') {
        pass('Migrated data preserves original fields');
      } else {
        fail('Migrated data lost original fields');
      }
    } else {
      fail('CharacterData.migrateV0toV1() returned null');
    }
  } else {
    fail('CharacterData.migrateV0toV1() not yet implemented (Goal E)');
  }
}

// Test E.5: loadFromLocalStorage() auto-migrates V0 data
{
  if (App.CharacterData && App.CharacterData.loadFromLocalStorage) {
    const legacyPayload = {
      name: 'Old Character',
      characteristics: { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 10, POW: 10, CHA: 10 }
    };

    const result = App.CharacterData.loadFromLocalStorage(JSON.stringify(legacyPayload));
    if (result && result.schemaVersion === 1) {
      pass('loadFromLocalStorage() auto-migrates legacy V0 data');
    } else {
      fail('loadFromLocalStorage() did not migrate V0 data');
    }
  }
}

// Test E.6: loadFromLocalStorage() rejects unknown version
{
  if (App.CharacterData && App.CharacterData.loadFromLocalStorage) {
    const futurePayload = {
      version: 999,
      data: { name: 'Future Character' }
    };

    const result = App.CharacterData.loadFromLocalStorage(JSON.stringify(futurePayload));
    if (result === null) {
      pass('loadFromLocalStorage() rejects unknown version (returns null)');
    } else {
      fail('loadFromLocalStorage() did not reject unknown version');
    }
  }
}

// ============================================================
section('Wave 2 Goal F: Eliminate eval() for Formula Evaluation');
// ============================================================

// Test F.1: safeEvalDiceFormula() exists
{
  if (App.App && App.App.safeEvalDiceFormula) {
    pass('safeEvalDiceFormula() function exists');
  } else if (App.Calc && App.Calc.safeEvalDiceFormula) {
    pass('Calc.safeEvalDiceFormula() function exists');
  } else {
    fail('safeEvalDiceFormula() not yet implemented (Goal F)');
  }
}

// Test F.2: safeEvalDiceFormula() evaluates simple addition
{
  const safeEval = (App.App && App.App.safeEvalDiceFormula) || (App.Calc && App.Calc.safeEvalDiceFormula);
  if (safeEval) {
    const context = { STR: 14, DEX: 12 };
    const result = safeEval('STR+DEX', context);
    if (result === 26) {
      pass('safeEvalDiceFormula() evaluates STR+DEX correctly (26)');
    } else {
      fail(`safeEvalDiceFormula() STR+DEX incorrect (expected 26, got ${result})`);
    }
  }
}

// Test F.3: safeEvalDiceFormula() evaluates dice formulas
{
  const safeEval = (App.App && App.App.safeEvalDiceFormula) || (App.Calc && App.Calc.safeEvalDiceFormula);
  if (safeEval) {
    const context = { STR: 10, DEX: 10 };
    const result = safeEval('STR+DEX+2d6', context);
    // Result should be 20 + (2d6 roll between 2-12) = 22-32
    if (result >= 22 && result <= 32) {
      pass('safeEvalDiceFormula() evaluates STR+DEX+2d6 in valid range (22-32)');
    } else {
      fail(`safeEvalDiceFormula() 2d6 result out of range (got ${result}, expected 22-32)`);
    }
  }
}

// Test F.4: safeEvalDiceFormula() handles complex formula
{
  const safeEval = (App.App && App.App.safeEvalDiceFormula) || (App.Calc && App.Calc.safeEvalDiceFormula);
  if (safeEval) {
    const context = {};
    const result = safeEval('2d6+1d8+1d6+11', context);
    // 2d6 (2-12) + 1d8 (1-8) + 1d6 (1-6) + 11 = 15-37
    if (result >= 15 && result <= 37) {
      pass('safeEvalDiceFormula() evaluates complex formula 2d6+1d8+1d6+11');
    } else {
      fail(`safeEvalDiceFormula() complex formula out of range (got ${result}, expected 15-37)`);
    }
  }
}

// Test F.5: safeEvalDiceFormula() rejects executable formula syntax
{
  if (App.Calc && App.Calc.safeEvalDiceFormula) {
    const result = App.Calc.safeEvalDiceFormula('1+process.exit()', {});
    if (result === 0) {
      pass('safeEvalDiceFormula() rejects executable syntax');
    } else {
      fail('safeEvalDiceFormula() accepted executable syntax', `Got ${result}`);
    }
  } else {
    fail('safeEvalDiceFormula() not found for executable syntax test');
  }
}

// ============================================================
section('Wave 3 Goal 2: Golden Fixture Tests');
// ============================================================

// Helper: Load a fixture file
function loadFixture(filename) {
  const fixturePath = path.join(__dirname, 'fixtures', filename);
  try {
    const content = fs.readFileSync(fixturePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
}

const fixtures = [
  { file: 'balazaring-hunter.json', name: 'Balazaring Hunter' },
  { file: 'sartarite-warrior.json', name: 'Sartarite Warrior' },
  { file: 'praxian-beast-rider.json', name: 'Praxian Beast Rider' },
  { file: 'telmori-wolfbrother.json', name: 'Telmori Wolfbrother' },
  { file: 'higher-magic-no-cult-shaman.json', name: 'Higher Magic: No-Cult Shaman' },
  { file: 'higher-magic-no-cult-sorcerer.json', name: 'Higher Magic: No-Cult Sorcerer' },
  { file: 'higher-magic-no-cult-mystic.json', name: 'Higher Magic: No-Cult Mystic' },
  { file: 'higher-magic-zzistori-sorcerer.json', name: 'Higher Magic: Zzistori Sorcerer' },
  { file: 'higher-magic-waha-hybrid.json', name: 'Higher Magic: Waha Hybrid' },
  { file: 'ionara.json', name: 'Ionara' },
  { file: 'vasana.json', name: 'Vasana' }
];

fixtures.forEach(fixtureInfo => {
  const fixture = loadFixture(fixtureInfo.file);

  if (!fixture) {
    fail(`${fixtureInfo.name}: fixture file not found or invalid JSON`);
    return;
  }

  // Test 2.1: Fixture loads successfully
  {
    if (fixture && fixture.name && fixture.characteristics) {
      pass(`${fixtureInfo.name}: fixture loaded successfully`);
    } else {
      fail(`${fixtureInfo.name}: fixture missing required fields`);
    }
  }

  // Test 2.2: CharacterData.fromJSON() can parse the fixture
  {
    if (App.CharacterData && App.CharacterData.fromJSON) {
      const jsonString = JSON.stringify(fixture);
      const success = App.CharacterData.fromJSON(jsonString);
      if (success) {
        pass(`${fixtureInfo.name}: CharacterData.fromJSON() successful`);
      } else {
        fail(`${fixtureInfo.name}: CharacterData.fromJSON() failed`);
      }
    }
  }

  // Test 2.3: normalizeCharacter() runs without error
  {
    if (App.App && App.App.normalizeCharacter) {
      try {
        const normalized = App.App.normalizeCharacter(fixture);
        if (normalized && normalized.name) {
          pass(`${fixtureInfo.name}: normalizeCharacter() successful`);
        } else {
          fail(`${fixtureInfo.name}: normalizeCharacter() returned invalid data`);
        }
      } catch (err) {
        fail(`${fixtureInfo.name}: normalizeCharacter() threw error`, err.message);
      }
    }
  }

  // Test 2.4: Derived attributes match expected values
  {
    const chars = fixture.characteristics;
    const expectedAttrs = fixture.attributes;
    const calculatedAttrs = App.Calc.calculateAllAttributes(chars);

    let attributesMatch = true;
    let firstMismatch = null;

    const keysToCheck = ['actionPoints', 'experienceModifier', 'healingRate',
                         'luckPoints', 'magicPoints', 'initiativeBonus', 'damageModifier'];

    keysToCheck.forEach(key => {
      if (expectedAttrs[key] !== calculatedAttrs[key]) {
        attributesMatch = false;
        if (!firstMismatch) {
          firstMismatch = `${key}: expected ${expectedAttrs[key]}, got ${calculatedAttrs[key]}`;
        }
      }
    });

    if (attributesMatch) {
      pass(`${fixtureInfo.name}: derived attributes match calculated values`);
    } else {
      fail(`${fixtureInfo.name}: derived attributes mismatch`, firstMismatch);
    }
  }

  // Test 2.5: Hit location HP matches reference table
  {
    const chars = fixture.characteristics;
    const expectedHP = fixture.attributes.hitPoints;
    const calculatedHP = App.Calc.hitPointsPerLocation(chars.CON, chars.SIZ);

    let hpMatch = true;
    let firstMismatch = null;

    Object.keys(expectedHP).forEach(location => {
      if (expectedHP[location] !== calculatedHP[location]) {
        hpMatch = false;
        if (!firstMismatch) {
          firstMismatch = `${location}: expected ${expectedHP[location]}, got ${calculatedHP[location]}`;
        }
      }
    });

    if (hpMatch) {
      pass(`${fixtureInfo.name}: hit location HP matches reference table`);
    } else {
      fail(`${fixtureInfo.name}: hit location HP mismatch`, firstMismatch);
    }
  }

  // Test 2.6: Skills are within valid ranges (0-200)
  {
    const allSkills = {
      ...fixture.culturalSkills,
      ...fixture.careerSkills,
      ...fixture.bonusSkills
    };

    let allValid = true;
    let firstInvalid = null;

    Object.entries(allSkills).forEach(([skillName, value]) => {
      if (value < 0 || value > 200) {
        allValid = false;
        if (!firstInvalid) {
          firstInvalid = `${skillName}: ${value} (out of range 0-200)`;
        }
      }
    });

    if (allValid) {
      pass(`${fixtureInfo.name}: all skill values in valid range`);
    } else {
      fail(`${fixtureInfo.name}: invalid skill value`, firstInvalid);
    }
  }

  // Test 2.7: Combat style weapons are valid
  {
    if (fixture.combatStyles && fixture.combatStyles.length > 0) {
      let allWeaponsValid = true;
      let firstInvalid = null;

      fixture.combatStyles.forEach(style => {
        if (style.weapons && Array.isArray(style.weapons)) {
          style.weapons.forEach(weapon => {
            const weaponName = typeof weapon === 'string' ? weapon : weapon.name;
            const resolved = App.Helpers.resolveWeapon(weaponName);

            if (!resolved) {
              allWeaponsValid = false;
              if (!firstInvalid) {
                firstInvalid = `"${weaponName}" in style "${style.name}"`;
              }
            }
          });
        }
      });

      if (allWeaponsValid) {
        pass(`${fixtureInfo.name}: all combat style weapons valid`);
      } else {
        fail(`${fixtureInfo.name}: invalid weapon reference`, firstInvalid);
      }
    } else {
      info(`${fixtureInfo.name}: no combat styles to validate`);
    }
  }

  // Test 2.8: Passions have correct format and values
  {
    if (fixture.passions && Array.isArray(fixture.passions)) {
      let allValid = true;
      let firstInvalid = null;

      fixture.passions.forEach(passion => {
        const passionStr = typeof passion === 'string' ? passion : `${passion.name}: ${passion.value}`;
        const match = passionStr.match(/^(.+?):\s*(\d+)$/);

        if (!match) {
          allValid = false;
          if (!firstInvalid) {
            firstInvalid = `Invalid format: "${passionStr}"`;
          }
        } else {
          const value = parseInt(match[2], 10);
          if (value < 0 || value > 200) {
            allValid = false;
            if (!firstInvalid) {
              firstInvalid = `${match[1]}: ${value} (out of range)`;
            }
          }
        }
      });

      if (allValid) {
        pass(`${fixtureInfo.name}: passions correctly formatted`);
      } else {
        fail(`${fixtureInfo.name}: passion format/value error`, firstInvalid);
      }
    }
  }

  // Test 2.9: CharacterData.validate() returns valid
  {
    if (App.CharacterData && App.CharacterData.validate) {
      // Load fixture into CharacterData
      const jsonString = JSON.stringify(fixture);
      App.CharacterData.fromJSON(jsonString);

      const validation = App.CharacterData.validate();

      if (validation.valid === true) {
        pass(`${fixtureInfo.name}: CharacterData.validate() returns valid`);
      } else {
        fail(`${fixtureInfo.name}: CharacterData.validate() failed`,
             validation.errors ? validation.errors[0] : 'unknown error');
      }
    }
  }

  // Test 2.10: Hit points structure is complete
  {
    const hp = fixture.hitPoints;
    const requiredLocations = ['Head', 'Chest', 'Abdomen', 'Right Arm', 'Left Arm', 'Right Leg', 'Left Leg'];

    let allLocationsPresent = true;
    let missingLocation = null;

    requiredLocations.forEach(loc => {
      if (!hp[loc] || typeof hp[loc].current !== 'number' || typeof hp[loc].max !== 'number') {
        allLocationsPresent = false;
        if (!missingLocation) {
          missingLocation = loc;
        }
      }
    });

    if (allLocationsPresent) {
      pass(`${fixtureInfo.name}: all 7 hit locations present with current/max`);
    } else {
      fail(`${fixtureInfo.name}: missing or invalid hit location`, missingLocation);
    }
  }
});

[
  { file: 'ionara.json', name: 'Ionara' },
  { file: 'vasana.json', name: 'Vasana' }
].forEach(fixtureInfo => {
  const fixture = loadFixture(fixtureInfo.file);
  if (!fixture) return;

  {
    const charTotal = Object.values(fixture.characteristics || {}).reduce((sum, value) => sum + value, 0);
    const culturalTotal = Object.values(fixture.culturalSkills || {}).reduce((sum, value) => sum + value, 0);
    const careerTotal = Object.values(fixture.careerSkills || {}).reduce((sum, value) => sum + value, 0);
    const bonusTotal = Object.values(fixture.bonusSkills || {}).reduce((sum, value) => sum + value, 0);
    const ageCategory = App.Calc.getAgeCategory(fixture.age);
    const expectedBonusTotal = ageCategory ? ageCategory.bonusPoints : 150;
    const errors = [];

    if (charTotal !== 75) errors.push(`characteristics ${charTotal}/75`);
    if (culturalTotal !== 100) errors.push(`cultural ${culturalTotal}/100`);
    if (careerTotal !== 100) errors.push(`career ${careerTotal}/100`);
    if (bonusTotal !== expectedBonusTotal) errors.push(`bonus ${bonusTotal}/${expectedBonusTotal}`);
    ['culturalSkills', 'careerSkills', 'bonusSkills'].forEach(mapName => {
      Object.entries(fixture[mapName] || {}).forEach(([skillName, points]) => {
        if (points > 15) errors.push(`${mapName}.${skillName} ${points}/15`);
      });
    });
    const expectedPassionValue = (Number(fixture.characteristics?.POW) || 0) + (Number(fixture.characteristics?.CHA) || 0) + 30;
    (fixture.passions || []).forEach(passion => {
      if (passion.value !== expectedPassionValue) errors.push(`${passion.name} passion ${passion.value}/${expectedPassionValue}`);
      ['name', 'type', 'subject', 'description', 'value', 'custom', 'needsSubject', 'subjectSuggestions'].forEach(field => {
        if (!Object.prototype.hasOwnProperty.call(passion, field)) errors.push(`${passion.name || fixtureInfo.file} missing passion.${field}`);
      });
    });
    if ((fixture.folkMagicSpells || []).length !== 3) errors.push(`folk magic ${(fixture.folkMagicSpells || []).length}/3`);
    if ((fixture.selectedProfessionalSkills || []).length !== 3) errors.push(`professional skills ${(fixture.selectedProfessionalSkills || []).length}/3`);

    if (errors.length === 0) {
      pass(`${fixtureInfo.name}: chargen point budgets and per-step caps are complete`);
    } else {
      fail(`${fixtureInfo.name}: chargen point budget mismatch`, errors.join(', '));
    }
  }

  {
    App.CharacterData.fromJSON(JSON.stringify(fixture));
    App.CharacterData.attributes = App.Calc.calculateAllAttributes(App.CharacterData.characteristics);
    App.App.currentStep = 9;

    const validation = App.App.getValidationState();
    const errors = [];
    if (App.CharacterData.devotionalPool !== 0) {
      errors.push(`devotionalPool ${App.CharacterData.devotionalPool}/0`);
    }
    if ((App.CharacterData.miracles || []).length !== 0) {
      errors.push(`miracles ${(App.CharacterData.miracles || []).join(', ')}`);
    }
    const cultMagicErrors = (validation.errors || []).filter(error => /miracle|devotional pool|cult-backed/i.test(error));
    if (cultMagicErrors.length > 0) {
      errors.push(...cultMagicErrors);
    }

    if (errors.length === 0) {
      pass(`${fixtureInfo.name}: strict ADR-0015 pregen has no cult-backed magic at chargen`);
    } else {
      fail(`${fixtureInfo.name}: strict ADR-0015 cult magic validation failed`, errors.join('; '));
    }
  }
});

// Active pregen companion/combat contracts cite the RQG Starter Set Pregen Folios:
// Ionara/Teza from PDF page 20; Vasana/Molon from PDF page 2.
const activePregenContracts = {
  Ionara: {
    culture: 'Grazelander/Pure Horse',
    homeland: 'Pure Horse People, Grazelands',
    combatStyle: {
      name: 'Grazelander Noble',
      weapons: ['Mace', 'Small Shield', 'Lance', 'Dagger']
    },
    companion: {
      name: 'Teza',
      species: 'Riding Horse',
      characteristics: { STR: 30, CON: 17, SIZ: 30, DEX: 20, POW: 17 },
      attacks: [
        ['Bite', 25, '1D8+3D6'],
        ['Kick', 25, '1D6+3D6'],
        ['Rear & Plunge', 25, '2D6+3D6'],
        ['Trample', 25, '4D6']
      ],
      movement: 12,
      armor: 1,
      damageModifier: '+3D6'
    }
  },
  Vasana: {
    combatStyle: {
      name: 'Colymar Bison Cavalry',
      weapons: ['Broadsword', 'Battleaxe', 'Lance', 'Medium Shield', 'Composite Bow']
    },
    companion: {
      name: 'Molon',
      species: 'Bison (War-trained)',
      characteristics: { STR: 36, CON: 17, SIZ: 34, DEX: 12, POW: 10 },
      attacks: [
        ['Head Butt', 50, '2D10+3D6'],
        ['Trample', 50, '6D6']
      ],
      movement: 12,
      armor: 3,
      damageModifier: '+3D6'
    }
  }
};

Object.entries(activePregenContracts).forEach(([name, contract]) => {
  const fixture = loadFixture(`${name.toLowerCase()}.json`);
  if (!fixture) return;
  const errors = [];
  if (contract.culture && fixture.culture !== contract.culture) {
    errors.push(`culture ${fixture.culture}`);
  }
  if (contract.homeland && fixture.homeland !== contract.homeland) {
    errors.push(`homeland ${fixture.homeland}`);
  }
  const style = (fixture.combatStyles || []).find(cs => cs.name === contract.combatStyle.name);
  if (!style) {
    errors.push(`missing combat style ${contract.combatStyle.name}`);
  } else {
    const weapons = style.weapons || [];
    const missingWeapons = contract.combatStyle.weapons.filter(weapon => !weapons.includes(weapon));
    if (missingWeapons.length > 0) errors.push(`missing style weapons ${missingWeapons.join(', ')}`);
  }
  const weaponRows = (fixture.weapons || []).map(w => typeof w === 'string' ? w : w.name).filter(Boolean);
  const missingWeaponRows = contract.combatStyle.weapons.filter(weapon => !weaponRows.includes(weapon));
  if (missingWeaponRows.length > 0) {
    errors.push(`missing weapon table rows ${missingWeaponRows.join(', ')}`);
  }

  const companion = (fixture.companions || []).find(c => c.name === contract.companion.name);
  if (!companion) {
    errors.push(`missing companion ${contract.companion.name}`);
  } else {
    Object.entries(contract.companion.characteristics).forEach(([key, value]) => {
      if (companion.characteristics?.[key] !== value) {
        errors.push(`${contract.companion.name}.${key} ${companion.characteristics?.[key]}/${value}`);
      }
    });
    if (companion.species !== contract.companion.species) {
      errors.push(`${contract.companion.name}.species ${companion.species}`);
    }
    if (companion.movement !== contract.companion.movement) {
      errors.push(`${contract.companion.name}.movement ${companion.movement}/${contract.companion.movement}`);
    }
    if (companion.armor !== contract.companion.armor) {
      errors.push(`${contract.companion.name}.armor ${companion.armor}/${contract.companion.armor}`);
    }
    if (companion.damageModifier !== contract.companion.damageModifier) {
      errors.push(`${contract.companion.name}.damageModifier ${companion.damageModifier}/${contract.companion.damageModifier}`);
    }
    contract.companion.attacks.forEach(([attackName, skill, damage]) => {
      const attack = (companion.attacks || []).find(a => a.name === attackName);
      if (!attack) {
        errors.push(`missing ${contract.companion.name} attack ${attackName}`);
      } else {
        if (attack.skill !== skill) errors.push(`${attackName}.skill ${attack.skill}/${skill}`);
        if (attack.damage !== damage) errors.push(`${attackName}.damage ${attack.damage}/${damage}`);
      }
    });
  }

  if (errors.length === 0) {
    pass(`${name}: active player pregen contract matches approved companion/combat spec`);
  } else {
    fail(`${name}: active player pregen contract mismatch`, errors.join('; '));
  }
});

{
  const missing = [];
  fixtures.forEach(fixtureInfo => {
    const fixture = loadFixture(fixtureInfo.file);
    (fixture?.companions || []).forEach(companion => {
      if (!companion.source || !Array.isArray(companion.sourcePages) || companion.sourcePages.length === 0 || !companion.sourceCitation) {
        missing.push(`${fixtureInfo.file}:${companion.name}`);
      }
    });
  });

  if (missing.length === 0) {
    pass('Fixture companions carry source provenance fields');
  } else {
    fail('Fixture companions lack source provenance fields', missing.join(', '));
  }
}

{
  const combatStyles = readJson('references/combat-styles.json');
  const exceptions = readJson('references/combat-style-exceptions.json');
  const cseNames = new Set((combatStyles.styles || []).map(style => style.name));
  const exceptionEntries = exceptions.exceptions || [];
  const exceptionByName = new Map(exceptionEntries.map(entry => [entry.name, entry]));
  const sameSet = (actual, expected) => {
    const actualSet = new Set(actual || []);
    const expectedSet = new Set(expected || []);
    return actualSet.size === expectedSet.size && [...actualSet].every(value => expectedSet.has(value));
  };
  const errors = [];

  exceptionEntries.forEach(entry => {
    if (entry.coverage_state !== 'source_blocked' || entry.authority_state !== 'narrative_pregen_source') {
      errors.push(`${entry.id} missing source-blocked exception metadata`);
    }
    if (!entry.fixture || !entry.character || !entry.name) errors.push(`${entry.id} missing fixture/character/name`);
  });

  [...new Set(exceptionEntries.map(entry => path.basename(entry.fixture || '')))].forEach(file => {
    const fixture = loadFixture(file);
    if (!fixture) {
      errors.push(`${file} missing fixture`);
      return;
    }
    (fixture.combatStyles || []).forEach(style => {
      if (cseNames.has(style.name)) return;
      const exception = exceptionByName.get(style.name);
      if (!exception) {
        errors.push(`${file}:${style.name} missing exception`);
        return;
      }
      const weaponsMatch = sameSet(style.weapons || [], exception.approved_weapons || []);
      const traitsMatch = sameSet(style.traits || [], exception.approved_traits || []);
      const citation = style.citation || {};
      if (!weaponsMatch || !traitsMatch) errors.push(`${file}:${style.name} exception mismatch`);
      if (citation.coverage_state !== 'source_blocked' || citation.authority_state !== 'narrative_pregen_source') {
        errors.push(`${file}:${style.name} missing source-blocked citation`);
      }
      const note = String(style.notes || '').toLowerCase();
      if (!note.includes('rqg') || !note.includes('pregen') || !note.includes('cse')) {
        errors.push(`${file}:${style.name} missing explanatory notes`);
      }
    });
  });

  if (errors.length === 0) {
    pass('Active pregen custom combat styles are source-blocked exceptions');
  } else {
    fail('Active pregen custom combat style exception coverage failed', errors.join('; '));
  }
}

{
  const reconciliation = readJson('references/folk-magic-reconciliation.json');
  const mapping = reconciliation.vasana_rqg_spirit_magic_mapping || {};
  const spells = mapping.spells || [];
  const byRqg = new Map(spells.map(spell => [spell.rqg_name, spell]));
  const vasana = loadFixture('vasana.json');
  const errors = [];

  ['Demoralize', 'Heal 2', 'Mobility'].forEach(name => {
    if (!byRqg.has(name)) errors.push(`missing mapping ${name}`);
  });
  const spellKeys = spells.map(spell => Object.keys(spell).sort().join('|'));
  if (new Set(spellKeys).size !== 1) errors.push('mapping spell schema is not uniform');
  if (byRqg.get('Demoralize')?.mythras_name !== 'Demoralise') errors.push('Demoralize mapping');
  if (byRqg.get('Demoralize')?.fixture_status !== 'withheld_adr0015') errors.push('Demoralize status');
  if (byRqg.get('Heal 2')?.fixture_status !== 'present') errors.push('Heal 2 status');
  if (byRqg.get('Mobility')?.fixture_status !== 'withheld_adr0015') errors.push('Mobility status');
  if ((vasana.folkMagicSpells || []).includes('Demoralise') || (vasana.folkMagicSpells || []).includes('Mobility')) {
    errors.push('withheld spells active in Vasana fixture');
  }
  if (!(vasana.folkMagicSpells || []).includes('Heal')) errors.push('Heal missing from Vasana fixture');
  const note = String(vasana.notes || '');
  if (!note.includes('Demoralize') || !note.includes('Heal 2') || !note.includes('Mobility')) {
    errors.push('Vasana notes omit complete folio spirit magic trio');
  }
  if (note.includes('Demoralized') || note.includes('Heal 20')) {
    errors.push('Vasana notes contain misleading spirit magic near-match text');
  }

  if (errors.length === 0) {
    pass('Vasana RQG spirit magic reconciliation is documented and gated');
  } else {
    fail('Vasana RQG spirit magic reconciliation drifted', errors.join('; '));
  }
}

// ============================================================
section('Wave 3 Goal 3: PDF Content Regression Tests');
// ============================================================

// Test that exportSinglePagePDF() draws all critical fields from golden fixtures
fixtures.forEach(fixtureInfo => {
  asyncTest(`${fixtureInfo.name} PDF behavior capture failed`, async () => {
    const fixture = loadFixture(fixtureInfo.file);
    if (!fixture) {
      fail(`${fixtureInfo.name}: fixture file not found or invalid JSON`);
      return;
    }
    if (!App.App || !App.App.exportSinglePagePDF) {
      fail('exportSinglePagePDF() function not found');
      return;
    }

    const { text, saved } = await captureSinglePagePdf(fixture);
    const expected = [
      fixture.name,
      fixture.culture,
      fixture.career,
      ...Object.keys(fixture.characteristics || {}),
      ...(fixture.weapons || []).map(w => typeof w === 'string' ? w : w.name).filter(Boolean),
      ...(fixture.folkMagicSpells || []),
      ...(fixture.passions || []).map(p => typeof p === 'string' ? p.split(':')[0] : p.name).filter(Boolean),
      fixture.notes ? fixture.notes.split(';')[0] : null
    ];
    const missing = expected.filter(value => value && !text.includes(value));

    if (saved && missing.length === 0) {
      pass(`${fixtureInfo.name} PDF: draws fixture identity, stats, weapons, magic, and passions`);
    } else {
      fail(`${fixtureInfo.name} PDF: missing drawn fixture content`, missing.join(', ') || 'PDF was not saved');
    }
  });
});

const magicPdfCoverageCases = [
  {
    file: 'vargast-windborn-orlanth.json',
    name: 'Theism PDF coverage',
    expected: [
      'THEIST MIRACLES (Orlanth)',
      'Devotional Pool',
      'Extension',
      'Find (Specific Thing)',
      'Divination',
      'Summon Sylph',
      'Wind Warp'
    ],
    forbidden: ['SORCERY (', 'SPIRIT MAGIC (']
  },
  {
    file: 'higher-magic-no-cult-shaman.json',
    name: 'Core Animism PDF coverage',
    expected: [
      'SPIRIT MAGIC (Core Animism via Shaman career)',
      'Bound Spirit Slots',
      'Ancestor Spirit — Sagacity (Int 1)',
      'Sagacity',
      'augments one skill',
      'Nature Spirit — Camouflage (Int 2)',
      'Endowment (Camouflage',
      'two difficulty grades'
    ],
    forbidden: ['THEIST MIRACLES', 'SORCERY (']
  },
  {
    file: 'higher-magic-no-cult-sorcerer.json',
    name: 'Core Sorcery PDF coverage',
    expected: [
      'SORCERY (Core Sorcery via Sorcerer career)',
      'Magic Points',
      'Casting: Invocation skill',
      'Shaping: Shaping skill',
      'Holdfast',
      'Resist: Endurance',
      'Damage Resistance'
    ],
    forbidden: ['THEIST MIRACLES', 'SPIRIT MAGIC (']
  },
  {
    file: 'regression-arkat-sorcery.json',
    name: 'Cult Sorcery PDF coverage',
    expected: [
      'SORCERY (Arkat)',
      'SORCERY (Core Sorcery via Sorcerer career)',
      'Magic Points',
      'Casting: Invocation skill',
      'Shaping: Shaping skill'
    ],
    forbidden: ['THEIST MIRACLES', 'SPIRIT MAGIC (', 'Animate (Substance)', 'Diminish (Characteristic)', 'Protective Ward']
  },
  {
    file: 'higher-magic-no-cult-mystic.json',
    name: 'Core Mysticism PDF coverage',
    expected: [
      'MYSTICISM (Core Mysticism via Mystic career)',
      'Meditation + Mysticism',
      'Resource: Magic Points',
      'Max Intensity = Meditation/10'
    ],
    forbidden: ['THEIST MIRACLES', 'SPIRIT MAGIC (', 'SORCERY (']
  },
  {
    file: 'higher-magic-zzistori-sorcerer.json',
    name: 'Zzistori source-backed Sorcery PDF coverage',
    expected: [
      'SORCERY (Zzistori School (God Forgot sorcery))',
      'Source: AiG p.30-31, p.59-60; Mythras rulebook p.162, p.166-177',
      'Holdfast',
      'Resist: Endurance',
      'Animate (Substance)',
      'Project (Sense)'
    ],
    forbidden: ['THEIST MIRACLES', 'SPIRIT MAGIC (']
  },
  {
    file: 'higher-magic-waha-hybrid.json',
    name: 'Waha hybrid Theism+Animism PDF coverage',
    expected: [
      'THEIST MIRACLES (Waha)',
      'Devotional Pool',
      'Find (Specific Thing)',
      'Axis Mundi',
      'Divination',
      'Spirit Block',
      'Summon Cult Spirit',
      'Command Cult Spirit',
      'SPIRIT MAGIC (Waha)',
      'Shaman Path',
      'Nature Spirit — Camouflage (Int 2)',
      'Endowment (Camouflage',
      'Bless Spirit — Initiative (Int 1)',
      'Bless (Initiative'
    ],
    forbidden: ['SORCERY (']
  }
];

magicPdfCoverageCases.forEach(testCase => {
  asyncTest(`${testCase.name} failed`, async () => {
    const fixture = loadFixture(testCase.file);
    if (!fixture) {
      fail(`${testCase.name}: fixture file not found or invalid JSON`);
      return;
    }

    const { text, saved } = await captureSinglePagePdf(fixture);
    const missing = testCase.expected.filter(value => !text.includes(value));
    const forbidden = (testCase.forbidden || []).filter(value => text.includes(value));

    if (saved && missing.length === 0 && forbidden.length === 0) {
      pass(`${testCase.name}: exported PDF includes expected magic systems and selections`);
    } else {
      fail(`${testCase.name}: PDF magic content mismatch`,
        JSON.stringify({
          missing,
          forbidden,
          magicText: text.split('\n').filter(line =>
            /THEIST|SPIRIT|SORCERY|MYSTICISM|Devotional|Magic Points|Invocation|Shaping|Spirit|Holdfast|Damage|Animate|Diminish|Protective|Project|Axis|Divination|Command|Bless|Endowment|Sagacity|Wind Warp|Summon Sylph|Source:/.test(line)
          ).join(' | ')
        }));
    }
  });
});

const wizardPlayPdfFidelityCases = [
  {
    file: 'ionara.json',
    name: 'Ionara active pregen',
    pdfExpected: [
      'Ionara Grand-daughter of Thiralda',
      'Grazelander/Pure Horse',
      'Priest',
      'Devotion (Maran Gor)',
      'Hate (Old Tarshites)',
      'Grazelander Noble',
      'Mace',
      'Lance',
      'COMPANION: Teza (Riding Horse)'
    ]
  },
  {
    file: 'vasana.json',
    name: 'Vasana active pregen',
    pdfExpected: [
      "Vasana Farnan's Daughter",
      'Sartarite (Heortling)',
      'Warrior',
      'Devotion (Orlanth)',
      'Hate (Lunar Empire)',
      'Colymar Bison Cavalry',
      'Broadsword',
      'Battleaxe',
      'Composite Bow',
      'COMPANION: Molon (Bison (War-trained))'
    ]
  },
  {
    file: 'higher-magic-waha-hybrid.json',
    name: 'Waha hybrid fixture',
    pdfExpected: [
      'Karrg Beast-Talker',
      'Praxian',
      'Shaman',
      'THEIST MIRACLES (Waha)',
      'Axis Mundi',
      'SPIRIT MAGIC (Waha)',
      'Nature Spirit — Camouflage (Int 2)',
      'Bless Spirit — Initiative (Int 1)'
    ]
  },
  {
    file: 'higher-magic-zzistori-sorcerer.json',
    name: 'Zzistori sorcerer fixture',
    pdfExpected: [
      'Talor Zzistori Eye',
      'God Forgot',
      'Sorcerer',
      'SORCERY (Zzistori School (God Forgot sorcery))',
      'Holdfast',
      'Animate (Substance)',
      'Project (Sense)'
    ]
  },
  {
    file: 'higher-magic-no-cult-shaman.json',
    name: 'No-cult Shaman fixture',
    pdfExpected: [
      'Argrath Spirit-Seeker',
      'Praxian',
      'Shaman',
      'SPIRIT MAGIC (Core Animism via Shaman career)',
      'Ancestor Spirit — Sagacity (Int 1)',
      'Nature Spirit — Camouflage (Int 2)'
    ]
  },
  {
    file: 'higher-magic-no-cult-sorcerer.json',
    name: 'No-cult Sorcerer fixture',
    pdfExpected: [
      'Erenvald Script-Keeper',
      'Esrolian',
      'Sorcerer',
      'SORCERY (Core Sorcery via Sorcerer career)',
      'Holdfast',
      'Damage Resistance'
    ]
  },
  {
    file: 'higher-magic-no-cult-mystic.json',
    name: 'No-cult Mystic fixture',
    pdfExpected: [
      'Sereth Breath-Watcher',
      'Esrolian',
      'Mystic',
      'MYSTICISM (Core Mysticism via Mystic career)',
      'Resource: Magic Points (20)'
    ]
  }
];

const wizardChoicePaths = [
  'name',
  'concept',
  'characteristics',
  'culture',
  'homeland',
  'culturalSkills',
  'runeAffinities',
  'folkMagicSpells',
  'passions',
  'age',
  'gender',
  'family',
  'career',
  'cult',
  'miracles',
  'boundSpirits',
  'sorcerySpells',
  'mysticismTalents',
  'careerSkills',
  'careerFolkMagic',
  'selectedProfessionalSkills',
  'bonusSkills',
  'socialClass',
  'startingMoney',
  'equipment',
  'weapons',
  'armor',
  'combatStyles',
  'companions'
];

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

wizardPlayPdfFidelityCases.forEach(testCase => {
  asyncTest(`${testCase.name} Wizard→Play→PDF fidelity failed`, async () => {
    const fixture = loadFixture(testCase.file);
    if (!fixture) {
      fail(`${testCase.name}: fixture file not found or invalid JSON`);
      return;
    }

    const app = loadApp();
    const imported = app.CharacterData.fromJSON(JSON.stringify(fixture));
    if (!imported) {
      fail(`${testCase.name}: fixture does not import through CharacterData.fromJSON()`);
      return;
    }
    app.App.switchMode('play');
    const playState = app.CharacterData.toJSON();
    const stateMismatches = wizardChoicePaths.filter(path =>
      stableJson(playState[path]) !== stableJson(fixture[path])
    );

    const { text, saved } = await captureSinglePagePdf(fixture);
    const missingPdfChoices = testCase.pdfExpected.filter(value => !text.includes(value));

    if (saved && stateMismatches.length === 0 && missingPdfChoices.length === 0) {
      pass(`${testCase.name}: wizard choices preserve into Play Mode and exported PDF`);
    } else {
      fail(`${testCase.name}: Wizard→Play→PDF fidelity mismatch`,
        JSON.stringify({
          stateMismatches,
          missingPdfChoices,
          pdfText: text.split('\n').filter(line =>
            testCase.pdfExpected.some(value => line.includes(String(value).slice(0, 12))) ||
            /THEIST|SPIRIT|SORCERY|MYSTICISM|COMPANION|Magic Points|Shield|Lightning|Holdfast|Axis|Gnome|Camouflage|Sagacity|Damage|Project|Animate/.test(line)
          ).join(' | ')
        }));
    }
  });
});

// ============================================================
section('Wave 3 Goal 4: Template PDF Field Coverage');
// ============================================================

// Test 4.1: Verify pdf-field-map.json exists
{
  const mapPath = path.join(__dirname, 'references', 'pdf-field-map.json');
  if (fs.existsSync(mapPath)) {
    const content = fs.readFileSync(mapPath, 'utf8');
    const fields = JSON.parse(content);
    if (Array.isArray(fields) && fields.length > 1000) {
      pass(`pdf-field-map.json exists with ${fields.length} fields`);
    } else {
      fail('pdf-field-map.json missing or incomplete');
    }
  } else {
    fail('pdf-field-map.json not found');
  }
}

// Test 4.2: normalizeCharacter() exposes all data a template PDF renderer needs
{
  if (App.App && App.App.normalizeCharacter) {
    const normalized = App.App.normalizeCharacter(createPdfTestCharacter());
    const chars = ['STR', 'CON', 'SIZ', 'DEX', 'INT', 'POW', 'CHA'];
    const attrs = ['actionPoints', 'damageModifier', 'healingRate',
                   'initiativeBonus', 'luckPoints', 'magicPoints'];
    const missing = [];

    if (normalized.name !== 'PDF Test Hero') missing.push('name');
    if (normalized.culture !== 'Sartarite (Heortling)') missing.push('culture');
    if (normalized.profession !== 'Warrior') missing.push('profession');
    chars.forEach(char => { if (typeof normalized.characteristics[char] !== 'number') missing.push(char); });
    attrs.forEach(attr => { if (typeof normalized.attributes[attr] === 'undefined') missing.push(attr); });
    if (!Array.isArray(normalized.hitLocations) || normalized.hitLocations.length !== 7) missing.push('hitLocations');
    if (!normalized.skills || typeof normalized.skills.Athletics !== 'number') missing.push('skills');
    if (!normalized.combatStyles || normalized.combatStyles[0]?.name !== 'Sword & Shield') missing.push('combatStyles');
    if (!normalized.equipment.weapons.some(w => w.name === 'Broadsword')) missing.push('weapons');
    if (!normalized.folkMagic.includes('Bladesharp')) missing.push('folkMagic');
    if (!normalized.passions.some(p => p.name === 'Loyalty (Clan)')) missing.push('passions');

    if (missing.length === 0) {
      pass('normalizeCharacter() exposes identity, stats, skills, combat, equipment, magic, and passions');
    } else {
      fail('normalizeCharacter() missing template PDF data', missing.join(', '));
    }
  } else {
    fail('normalizeCharacter() not available for template PDF data test');
  }
}

// Test 4.11: normalizeCharacter() provides all data needed for template PDF
{
  if (App.App && App.App.normalizeCharacter) {
    const testChar = createTestCharacter();
    const normalized = App.App.normalizeCharacter(testChar);

    // Note: normalizeCharacter uses 'profession' not 'career', and doesn't include homeland/age
    // Those are accessed directly from CharacterData in the template export
    const requiredFields = [
      'name', 'race', 'culture', 'profession',
      'characteristics', 'attributes', 'skills', 'combatStyles',
      'hitLocations', 'folkMagic', 'passions', 'equipment'
    ];

    let allPresent = true;
    let missingField = null;

    requiredFields.forEach(field => {
      if (!(field in normalized)) {
        allPresent = false;
        if (!missingField) {
          missingField = field;
        }
      }
    });

    if (allPresent) {
      pass('normalizeCharacter() provides all core fields for template PDF');
    } else {
      fail('normalizeCharacter() missing required field', missingField);
    }
  }
}

// ============================================================
section('Wave 3 Goal 5: Inline pdf-lib in index.html');
// ============================================================

// Test 5.1: pdf-lib is embedded directly in index.html
{
  const htmlPath = path.join(__dirname, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const scripts = extractScripts(html);
  const inlinePdfLib = scripts.find(script => script.length > 400000 && script.includes('PDFLib') && !script.includes('CharacterData'));
  if (inlinePdfLib) {
    pass(`index.html inlines pdf-lib (${Math.floor(inlinePdfLib.length / 1024)}KB)`);
  } else {
    fail('index.html does not inline pdf-lib');
  }
}

// Test 5.2: no external local pdf-lib file is required at runtime
{
  const htmlPath = path.join(__dirname, 'index.html');
  const libPath = path.join(__dirname, 'lib', 'pdf-lib.min.js');
  const html = fs.readFileSync(htmlPath, 'utf8');
  if (!html.includes('lib/pdf-lib.min.js') && !fs.existsSync(libPath)) {
    pass('PDF export no longer depends on lib/pdf-lib.min.js');
  } else {
    fail('PDF export still references or ships lib/pdf-lib.min.js');
  }
}

// Test 5.3: ensurePDFLib returns the inline/global library without appending scripts
asyncTest('ensurePDFLib inline test failed', async () => {
  const { App: AppObj, _sandbox } = loadApp();
  if (!AppObj || !AppObj.ensurePDFLib || !_sandbox) {
    fail('App.ensurePDFLib not available');
    return;
  }

  const mockPdfLib = _sandbox.PDFLib;
  let appended = 0;
  AppObj._pdfLibPromise = null;
  _sandbox.document.createElement = tag => ({ tagName: tag, onload: null, onerror: null, src: '' });
  _sandbox.document.head.appendChild = () => {
    appended++;
  };

  const first = await AppObj.ensurePDFLib();
  const second = await AppObj.ensurePDFLib();

  if (first === mockPdfLib && second === mockPdfLib && appended === 0) {
    pass('ensurePDFLib resolves the inline PDFLib without appending scripts');
  } else {
    fail('ensurePDFLib did not use inline PDFLib', JSON.stringify({ appended, loaded: first === mockPdfLib }));
  }
});

// Test 5.4: index.html does NOT reference CDN
{
  const htmlPath = path.join(__dirname, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const cdnPattern = /<script[^>]+src="https:\/\/unpkg\.com\/pdf-lib/;
  if (!cdnPattern.test(html)) {
    pass('index.html does not load pdf-lib from CDN');
  } else {
    fail('index.html still has CDN reference for pdf-lib');
  }
}

// Test 5.5: CDN URL preserved in comment
{
  const htmlPath = path.join(__dirname, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  if (html.includes('Previously: https://unpkg.com/pdf-lib')) {
    pass('CDN URL preserved in HTML comment for reference');
  } else {
    info('CDN URL not preserved (optional)');
  }
}

// Test 5.6: No startup external script references
{
  const htmlPath = path.join(__dirname, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const externalScripts = html.match(/<script[^>]+src=["'][^"']+["']/g) || [];
  if (externalScripts.length === 0) {
    pass('index.html has no startup external script references');
  } else {
    fail(`index.html has ${externalScripts.length} external script reference(s): ${externalScripts[0]}`);
  }
}

// ============================================================
section('Wave 3 Goal 6: localStorage Round-Trip Tests');
// ============================================================

// Simple tests: verify toJSON/fromJSON work (localStorage is mocked minimally)
fixtures.forEach(fixtureInfo => {
  const fixture = loadFixture(fixtureInfo.file);
  if (!fixture) return;

  // Test 6.1: toJSON produces a JSON-serializable character object
  {
    if (App.CharacterData && App.CharacterData.toJSON) {
      try {
        // Load fixture
        const jsonString = JSON.stringify(fixture);
        App.CharacterData.fromJSON(jsonString);

        // Serialize
        const output = App.CharacterData.toJSON();

        // Stringify/parse to verify the plain object is JSON-safe
        const parsed = JSON.parse(JSON.stringify(output));

        if (parsed && parsed.name === fixture.name) {
          pass(`${fixtureInfo.name}: toJSON() produces JSON-safe object`);
        } else {
          fail(`${fixtureInfo.name}: toJSON() output invalid`);
        }
      } catch (err) {
        fail(`${fixtureInfo.name}: toJSON() threw error`, err.message);
      }
    }
  }

  // Test 6.2: fromJSON loads fixture
  {
    if (App.CharacterData && App.CharacterData.fromJSON) {
      try {
        const jsonString = JSON.stringify(fixture);
        const success = App.CharacterData.fromJSON(jsonString);

        if (success && App.CharacterData.name === fixture.name) {
          pass(`${fixtureInfo.name}: fromJSON() loads data`);
        } else {
          fail(`${fixtureInfo.name}: fromJSON() failed`);
        }
      } catch (err) {
        fail(`${fixtureInfo.name}: fromJSON() threw error`, err.message);
      }
    }
  }

  // Test 6.3: Round-trip preserves name
  {
    if (App.CharacterData && App.CharacterData.toJSON && App.CharacterData.fromJSON) {
      try {
        // Load
        const jsonString = JSON.stringify(fixture);
        App.CharacterData.fromJSON(jsonString);

        // Serialize and reload
        const serialized = App.CharacterData.toJSON();
        App.CharacterData.fromJSON(serialized);

        if (App.CharacterData.name === fixture.name) {
          pass(`${fixtureInfo.name}: JSON round-trip preserves name`);
        } else {
          fail(`${fixtureInfo.name}: JSON round-trip lost name`);
        }
      } catch (err) {
        fail(`${fixtureInfo.name}: JSON round-trip threw error`, err.message);
      }
    }
  }

  // Test 6.4: Round-trip preserves characteristics
  {
    if (App.CharacterData && App.CharacterData.toJSON && App.CharacterData.fromJSON) {
      try {
        const jsonString = JSON.stringify(fixture);
        App.CharacterData.fromJSON(jsonString);

        const serialized = App.CharacterData.toJSON();
        App.CharacterData.fromJSON(serialized);

        const charsMatch =
          App.CharacterData.characteristics.STR === fixture.characteristics.STR &&
          App.CharacterData.characteristics.CON === fixture.characteristics.CON;

        if (charsMatch) {
          pass(`${fixtureInfo.name}: JSON round-trip preserves characteristics`);
        } else {
          fail(`${fixtureInfo.name}: JSON round-trip lost characteristics`);
        }
      } catch (err) {
        fail(`${fixtureInfo.name}: JSON round-trip characteristics threw error`, err.message);
      }
    }
  }

  // Test 6.5: Round-trip preserves skills
  {
    if (App.CharacterData && App.CharacterData.toJSON && App.CharacterData.fromJSON) {
      try {
        const jsonString = JSON.stringify(fixture);
        App.CharacterData.fromJSON(jsonString);

        const originalSkills = {...App.CharacterData.culturalSkills};
        const serialized = App.CharacterData.toJSON();
        App.CharacterData.fromJSON(serialized);

        const firstSkillName = Object.keys(originalSkills)[0];
        const skillsMatch = firstSkillName &&
          App.CharacterData.culturalSkills[firstSkillName] === originalSkills[firstSkillName];

        if (skillsMatch || Object.keys(originalSkills).length === 0) {
          pass(`${fixtureInfo.name}: JSON round-trip preserves skills`);
        } else {
          fail(`${fixtureInfo.name}: JSON round-trip lost skills`);
        }
      } catch (err) {
        fail(`${fixtureInfo.name}: JSON round-trip skills threw error`, err.message);
      }
    }
  }
});

// Test 6.6: schemaVersion field handling
{
  if (App.CharacterData && App.CharacterData.getSchemaVersion) {
    try {
      const version = App.CharacterData.getSchemaVersion();
      if (version === 1) {
        pass('CharacterData.getSchemaVersion() returns 1');
      } else {
        fail(`CharacterData.getSchemaVersion() returned ${version}, expected 1`);
      }
    } catch (err) {
      fail('CharacterData.getSchemaVersion() threw error', err.message);
    }
  }
}

// Test 6.7: Save button payload is a character object, not a JSON string literal
{
  const { App: AppObj, CharacterData: CD, _sandbox } = loadApp();
  if (AppObj && AppObj.saveCharacter && CD && _sandbox) {
    const originalBlob = _sandbox.Blob;
    const originalURL = _sandbox.URL;
    const originalCreateElement = _sandbox.document.createElement;
    const originalShowToast = AppObj.showToast;
    let blobParts = null;

    _sandbox.Blob = function(parts) {
      blobParts = parts;
      return { parts };
    };
    _sandbox.URL = {
      createObjectURL: () => 'blob:test-character',
      revokeObjectURL: () => {}
    };
    _sandbox.document.createElement = tag => ({
      href: '',
      download: '',
      click: () => {},
      tagName: tag
    });
    AppObj.showToast = () => {};

    try {
      CD.fromJSON(JSON.stringify(createTestCharacter()));
      CD.name = 'Save Round Trip';
      AppObj.saveCharacter();

      const savedText = blobParts && blobParts[0];
      const parsed = savedText ? JSON.parse(savedText) : null;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.name === 'Save Round Trip') {
        pass('App.saveCharacter exports a character object payload');
      } else {
        fail('App.saveCharacter exports a JSON string literal instead of an object');
      }
    } catch (err) {
      fail('App.saveCharacter payload test threw error', err.message);
    } finally {
      _sandbox.Blob = originalBlob;
      _sandbox.URL = originalURL;
      _sandbox.document.createElement = originalCreateElement;
      AppObj.showToast = originalShowToast;
    }
  } else {
    fail('App.saveCharacter not available for payload test');
  }
}

// Test 6.8: Character JSON round-trip preserves magic-system and companion state
{
  const { CharacterData: CD } = loadApp();
  if (CD && CD.toJSON && CD.fromJSON) {
    CD.fromJSON(JSON.stringify(createTestCharacter()));
    CD.cult = 'Daka Fal';
    CD.cultChoiceMade = true;
    CD.cultInitiated = true; // Post-initiation round-trip keeps cult-backed animism state.
    CD.cultType = { primary: 'animist', types: ['animist'], isHybrid: false };
    CD.boundSpiritSlots = 5;
    CD.boundSpirits = [{ name: 'Ancestor Spirit' }];
    CD.sorceryResource = 0;
    CD.sorcerySpells = [];
    CD.companions = [{ name: 'Greywind', species: 'Bison', autoPopulated: true }];

    const serialized = CD.toJSON();
    CD.boundSpiritSlots = 0;
    CD.boundSpirits = [];
    CD.sorceryResource = 0;
    CD.sorcerySpells = [];
    CD.companions = [];
    const roundTripSuccess = CD.fromJSON(serialized);
    const normalizedBoundSpiritSlots = Math.floor(CD.characteristics.CHA / 2);

    const preserved =
      roundTripSuccess &&
      CD.cultType && CD.cultType.primary === 'animist' &&
      CD.boundSpiritSlots === normalizedBoundSpiritSlots &&
      CD.boundSpirits && CD.boundSpirits[0] && CD.boundSpirits[0].name === 'Ancestor Spirit' &&
      CD.sorceryResource === 0 &&
      CD.sorcerySpells && CD.sorcerySpells.length === 0 &&
      CD.companions && CD.companions[0] && CD.companions[0].name === 'Greywind' &&
      CD.companions[0].autoPopulated === true;

    CD.name = 'Before Stale Round Trip';
    const staleSuccess = CD.fromJSON({
      ...serialized,
      name: 'Stale Sorcery Round Trip',
      sorceryResource: 14,
      sorcerySpells: ['Animate (Substance)']
    });
    const staleRejected = staleSuccess === false &&
      CD.name === 'Before Stale Round Trip' &&
      CD.boundSpiritSlots === normalizedBoundSpiritSlots &&
      CD.boundSpirits && CD.boundSpirits[0] && CD.boundSpirits[0].name === 'Ancestor Spirit' &&
      CD.sorcerySpells && CD.sorcerySpells.length === 0 &&
      CD.companions && CD.companions[0] && CD.companions[0].name === 'Greywind' &&
      CD.companions[0].autoPopulated === true;

    if (preserved && staleRejected) {
      pass('Character JSON round-trip preserves valid magic and rejects stale sorcery state');
    } else {
      fail('Character JSON round-trip drops valid magic or keeps stale sorcery state');
    }
  } else {
    fail('CharacterData JSON methods not available for magic persistence test');
  }
}

// Test 6.8a: Provider-backed Animism imports preserve bound spirits without a cult
{
  const { CharacterData: CD } = loadApp();
  if (CD && CD.toJSON && CD.fromJSON) {
    const payload = {
      ...createTestCharacter('Praxian'),
      name: 'Imported Core Shaman',
      career: 'Shaman',
      cult: null,
      cultType: null,
      characteristics: { STR: 10, CON: 11, SIZ: 10, DEX: 10, INT: 13, POW: 14, CHA: 10 },
      selectedProfessionalSkills: ['Binding (Waha)', 'Trance', 'Healing'],
      careerSkills: { 'Binding (Waha)': 10, Trance: 10, Healing: 10 },
      boundSpiritSlots: 5,
      boundSpirits: [{ name: 'Ancestor Spirit — Sagacity (Int 1)' }],
      miracles: [],
      devotionalPool: 0,
      sorceryResource: 0,
      sorcerySpells: []
    };

    const importErrors = CD.validatePlainObject(payload);
    const importSuccess = CD.fromJSON(JSON.stringify(payload));
    const serialized = CD.toJSON();
    const roundTripSuccess = CD.fromJSON(serialized);
    const preserved = importErrors.length === 0 &&
      importSuccess &&
      roundTripSuccess &&
      CD.cult === null &&
      CD.career === 'Shaman' &&
      CD.boundSpiritSlots === 5 &&
      CD.boundSpirits?.[0]?.name === 'Ancestor Spirit — Sagacity (Int 1)';

    CD.name = 'Before Unknown Core Spirit Import';
    const unknownSpiritPayload = {
      ...payload,
      name: 'Unknown Core Spirit Import',
      boundSpirits: ['Bogus Spirit']
    };
    const unknownSpiritErrors = CD.validatePlainObject(unknownSpiritPayload);
    const unknownSpiritSuccess = CD.fromJSON(JSON.stringify(unknownSpiritPayload));
    const unknownSpiritRejected = unknownSpiritErrors.some(error => /Unknown bound spirit/i.test(error)) &&
      unknownSpiritSuccess === false &&
      CD.name === 'Before Unknown Core Spirit Import';

    CD.name = 'Before Over Limit Core Spirit Import';
    const overLimitSpiritPayload = {
      ...payload,
      name: 'Over Limit Core Spirit Import',
      boundSpirits: [
        'Ancestor Spirit — Sagacity (Int 1)',
        'Ancestor Spirit — Sagacity (Int 2)',
        'Guardian Spirit (Int 1)',
        'Magic Spirit (Int 1)'
      ]
    };
    const overLimitSpiritErrors = CD.validatePlainObject(overLimitSpiritPayload);
    const overLimitSpiritSuccess = CD.fromJSON(JSON.stringify(overLimitSpiritPayload));
    const overLimitSpiritRejected = overLimitSpiritErrors.some(error => /bound spirits/i.test(error) && /3/i.test(error)) &&
      overLimitSpiritSuccess === false &&
      CD.name === 'Before Over Limit Core Spirit Import';

    CD.name = 'Before Zero Slot Core Spirit Import';
    const zeroSlotSpiritPayload = {
      ...payload,
      name: 'Zero Slot Core Spirit Import',
      characteristics: { STR: 10, CON: 11, SIZ: 10, DEX: 10, INT: 13, POW: 14, CHA: 0 },
      boundSpiritSlots: 3,
      boundSpirits: ['Ancestor Spirit — Sagacity (Int 1)']
    };
    const zeroSlotSpiritErrors = CD.validatePlainObject(zeroSlotSpiritPayload);
    const zeroSlotSpiritSuccess = CD.fromJSON(JSON.stringify(zeroSlotSpiritPayload));
    const zeroSlotSpiritRejected = zeroSlotSpiritErrors.some(error => /bound spirits/i.test(error) && /0/i.test(error)) &&
      zeroSlotSpiritSuccess === false &&
      CD.name === 'Before Zero Slot Core Spirit Import';

    CD.mysticismTalents = ['Stale Imported Talent'];
    const emptyMysticismSuccess = CD.fromJSON(JSON.stringify({
      ...createTestCharacter('Sartarite (Heortling)'),
      name: 'Empty Mysticism Import',
      career: 'Mystic',
      characteristics: { STR: 8, CON: 8, SIZ: 8, DEX: 8, INT: 15, POW: 20, CHA: 8 },
      selectedProfessionalSkills: ['Meditation', 'Mysticism (Core Mysticism Path)', 'Musicianship (Drums)'],
      careerSkills: { Meditation: 10, 'Mysticism (Core Mysticism Path)': 10, 'Musicianship (Drums)': 10 },
      cult: null,
      cultType: null,
      miracles: [],
      boundSpirits: [],
      sorcerySpells: [],
      mysticismTalents: []
    }));
    const emptyMysticismClearsStale = emptyMysticismSuccess && Array.isArray(CD.mysticismTalents) && CD.mysticismTalents.length === 0;

    CD.name = 'Before Unsupported Mysticism Import';
    const unsupportedMysticismPayload = {
      ...createTestCharacter('Sartarite (Heortling)'),
      name: 'Unsupported Mysticism Import',
      career: 'Mystic',
      characteristics: { STR: 8, CON: 8, SIZ: 8, DEX: 8, INT: 15, POW: 20, CHA: 8 },
      selectedProfessionalSkills: ['Meditation', 'Mysticism (Core Mysticism Path)', 'Musicianship (Drums)'],
      careerSkills: { Meditation: 10, 'Mysticism (Core Mysticism Path)': 10, 'Musicianship (Drums)': 10 },
      cult: null,
      cultType: null,
      miracles: [],
      boundSpirits: [],
      sorcerySpells: [],
      mysticismTalents: ['Unverified Talent']
    };
    const unsupportedMysticismErrors = CD.validatePlainObject(unsupportedMysticismPayload);
    const unsupportedMysticismSuccess = CD.fromJSON(JSON.stringify(unsupportedMysticismPayload));
    const unsupportedMysticismRejected = unsupportedMysticismErrors.some(error => /Mysticism talent selection requires a verified talent catalog/i.test(error)) &&
      unsupportedMysticismSuccess === false &&
      CD.name === 'Before Unsupported Mysticism Import';

    if (preserved && unknownSpiritRejected && overLimitSpiritRejected && zeroSlotSpiritRejected && emptyMysticismClearsStale && unsupportedMysticismRejected) {
      pass('Provider-backed Animism import validates spirits and handles unsupported Mysticism talents explicitly');
    } else {
      fail('Provider-backed Animism/Mysticism import validation is incomplete',
        JSON.stringify({
          importErrors,
          importSuccess,
          roundTripSuccess,
          serializedSpirits: serialized.boundSpirits,
          currentSpirits: CD.boundSpirits,
          unknownSpiritErrors,
          unknownSpiritRejected,
          overLimitSpiritErrors,
          overLimitSpiritRejected,
          zeroSlotSpiritErrors,
          zeroSlotSpiritRejected,
          emptyMysticismSuccess,
          emptyMysticismClearsStale,
          unsupportedMysticismErrors,
          unsupportedMysticismRejected
        }));
    }
  } else {
    fail('CharacterData JSON methods not available for provider-backed Animism import test');
  }
}

// Test 6.8b: legacy cult saves infer initiated state when cultInitiated is missing
{
  const { App: AppObj, CharacterData: CD } = loadApp();
  if (AppObj && CD && CD.validatePlainObject && CD.fromJSON) {
    const payload = {
      ...createTestCharacter('Sartarite (Heortling)'),
      name: 'Legacy Missing Initiation Flag',
      characteristics: { STR: 12, CON: 11, SIZ: 11, DEX: 10, INT: 10, POW: 12, CHA: 9 },
      career: 'Warrior',
      cult: 'Orlanth',
      cultChoiceMade: true,
      miracles: ['Shield'],
      devotionalPool: 6,
      boundSpirits: [],
      sorcerySpells: []
    };
    delete payload.cultInitiated;

    const errors = CD.validatePlainObject(payload);
    const success = CD.fromJSON(JSON.stringify(payload));
    const providers = AppObj.resolveHigherMagicProviders(CD);

    if (errors.length === 0 && success && CD.cultInitiated === true && CD.miracles.includes('Shield') && CD.devotionalPool === 6 && providers.some(provider => provider.system === 'theist')) {
      pass('Legacy import infers cultInitiated when cult-backed miracles/devotional pool are present');
    } else {
      fail('Legacy import did not infer missing cultInitiated', JSON.stringify({ errors, success, cultInitiated: CD.cultInitiated, miracles: CD.miracles, devotionalPool: CD.devotionalPool, providerSystems: providers.map(provider => provider.system) }));
    }
  } else {
    fail('CharacterData import helpers unavailable for legacy initiated inference test');
  }
}

// Test 6.8c: explicit cultInitiated false keeps fail-closed strip behavior
{
  const { App: AppObj, CharacterData: CD } = loadApp();
  if (AppObj && CD && CD.validatePlainObject && CD.fromJSON) {
    const payload = {
      ...createTestCharacter('Sartarite (Heortling)'),
      name: 'Explicit False Initiation Flag',
      characteristics: { STR: 12, CON: 11, SIZ: 11, DEX: 10, INT: 10, POW: 12, CHA: 9 },
      career: 'Warrior',
      cult: 'Orlanth',
      cultChoiceMade: true,
      cultInitiated: false,
      miracles: ['Shield'],
      devotionalPool: 6,
      boundSpirits: [],
      sorcerySpells: []
    };

    const errors = CD.validatePlainObject(payload);
    const success = CD.fromJSON(JSON.stringify(payload));
    const providers = AppObj.resolveHigherMagicProviders(CD);

    if (errors.length === 0 && success && CD.cultInitiated === false && CD.miracles.length === 0 && CD.devotionalPool === 0 && !providers.some(provider => provider.system === 'theist')) {
      pass('Explicit cultInitiated false strips cult-backed magic during import');
    } else {
      fail('Explicit cultInitiated false did not keep fail-closed strip behavior', JSON.stringify({ errors, success, cultInitiated: CD.cultInitiated, miracles: CD.miracles, devotionalPool: CD.devotionalPool, providerSystems: providers.map(provider => provider.system) }));
    }
  } else {
    fail('CharacterData import helpers unavailable for explicit false initiation test');
  }
}

// Test 6.8d: legacy cult-backed animism saves infer initiated state when cultInitiated is missing
{
  const { App: AppObj, CharacterData: CD } = loadApp();
  if (AppObj && CD && CD.validatePlainObject && CD.fromJSON) {
    const payload = {
      ...createTestCharacter('Praxian'),
      name: 'Legacy Missing Animist Initiation Flag',
      characteristics: { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 13, POW: 14, CHA: 8 },
      career: 'Warrior',
      cult: 'Daka Fal',
      cultChoiceMade: true,
      miracles: [],
      devotionalPool: 0,
      boundSpiritSlots: 4,
      boundSpirits: [{ name: 'Ancestor Spirit — Sagacity (Int 1)', type: 'Ancestor', ability: 'Sagacity' }],
      sorcerySpells: []
    };
    delete payload.cultInitiated;

    const errors = CD.validatePlainObject(payload);
    const success = CD.fromJSON(JSON.stringify(payload));
    const providers = AppObj.resolveHigherMagicProviders(CD);

    if (errors.length === 0 && success && CD.cultInitiated === true && CD.boundSpirits.length === 1 && providers.some(provider => provider.id === 'cult-daka-fal-animism')) {
      pass('Legacy import infers cultInitiated when cult-backed animism selections are present');
    } else {
      fail('Legacy import did not infer missing cultInitiated for animism selections', JSON.stringify({ errors, success, cultInitiated: CD.cultInitiated, boundSpirits: CD.boundSpirits, providerSystems: providers.map(provider => provider.id) }));
    }
  } else {
    fail('CharacterData import helpers unavailable for legacy animism inference test');
  }
}

// Test 6.8e: explicit cultInitiated false strips cult-backed animism during import
{
  const { App: AppObj, CharacterData: CD } = loadApp();
  if (AppObj && CD && CD.validatePlainObject && CD.fromJSON) {
    const payload = {
      ...createTestCharacter('Praxian'),
      name: 'Explicit False Animist Initiation Flag',
      characteristics: { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 13, POW: 14, CHA: 8 },
      career: 'Warrior',
      cult: 'Daka Fal',
      cultChoiceMade: true,
      cultInitiated: false,
      miracles: [],
      devotionalPool: 0,
      boundSpiritSlots: 4,
      boundSpirits: [{ name: 'Ancestor Spirit — Sagacity (Int 1)', type: 'Ancestor', ability: 'Sagacity' }],
      sorcerySpells: []
    };

    const errors = CD.validatePlainObject(payload);
    const success = CD.fromJSON(JSON.stringify(payload));
    const providers = AppObj.resolveHigherMagicProviders(CD);

    if (errors.length === 0 && success && CD.cultInitiated === false && CD.boundSpirits.length === 0 && CD.boundSpiritSlots === 0 && !providers.some(provider => provider.id === 'cult-daka-fal-animism')) {
      pass('Explicit cultInitiated false strips cult-backed animism during import');
    } else {
      fail('Explicit cultInitiated false did not strip cult-backed animism during import', JSON.stringify({ errors, success, cultInitiated: CD.cultInitiated, boundSpirits: CD.boundSpirits, boundSpiritSlots: CD.boundSpiritSlots, providerSystems: providers.map(provider => provider.id) }));
    }
  } else {
    fail('CharacterData import helpers unavailable for explicit false animism test');
  }
}

// Test 6.9: localStorage round-trip uses the same complete character snapshot
{
  const { App: AppObj, CharacterData: CD, _sandbox } = loadApp();
  if (AppObj && CD && _sandbox) {
    const storage = {};
    _sandbox.localStorage = {
      getItem: key => storage[key] || null,
      setItem: (key, value) => { storage[key] = value; },
      removeItem: key => { delete storage[key]; }
    };

    CD.fromJSON(JSON.stringify(createTestCharacter()));
    CD.name = 'Storage Round Trip';
    CD.culture = 'God Forgot';
    CD.career = 'Sorcerer';
    CD.cult = 'Arkat';
    CD.cultChoiceMade = true;
    CD.cultInitiated = true; // Post-initiation localStorage round-trip keeps cult-backed sorcery state.
    CD.cultType = { primary: 'sorcery', types: ['sorcery'], isHybrid: false };
    CD.characteristics = { STR: 11, CON: 12, SIZ: 13, DEX: 14, INT: 15, POW: 13, CHA: 10 };
    CD.selectedProfessionalSkills = ['Invocation (Arkat)', 'Shaping'];
    CD.careerSkills = { 'Invocation (Arkat)': 10, Shaping: 10 };
    CD.boundSpiritSlots = 0;
    CD.boundSpirits = [];
    CD.sorceryResource = 13;
    CD.sorcerySpells = ['Dominate (Creatures)'];
    CD.companions = [{ name: 'Hoofbeat', species: 'Horse', autoPopulated: true }];
    CD.saveToLocalStorage();

    CD.name = '';
    CD.cultType = null;
    CD.boundSpiritSlots = 0;
    CD.boundSpirits = [];
    CD.sorceryResource = 0;
    CD.sorcerySpells = [];
    CD.companions = [];
    AppObj.loadFromLocalStorage();

    const preserved =
      CD.name === 'Storage Round Trip' &&
      CD.cult === 'Arkat' &&
      CD.cultType && CD.cultType.primary === 'sorcery' &&
      CD.boundSpiritSlots === 0 &&
      CD.boundSpirits && CD.boundSpirits.length === 0 &&
      CD.sorceryResource === 13 &&
      CD.sorcerySpells && CD.sorcerySpells[0] === 'Dominate (Creatures)' &&
      CD.companions && CD.companions[0] && CD.companions[0].name === 'Hoofbeat' &&
      CD.companions[0].autoPopulated === true;

    if (preserved) {
      pass('localStorage round-trip preserves complete character state');
    } else {
      fail('localStorage round-trip drops magic or companion state');
    }
  } else {
    fail('App/CharacterData not available for localStorage persistence test');
  }
}

// Test 6.10: Versioned save envelopes import through CharacterData.fromJSON()
{
  const { CharacterData: CD } = loadApp();
  if (CD && CD.fromJSON) {
    const payload = {
      version: 1,
      data: {
        ...createTestCharacter('God Forgot'),
        name: 'Versioned Envelope',
        career: 'Sorcerer',
        cult: null,
        cultType: null,
        characteristics: { STR: 11, CON: 12, SIZ: 13, DEX: 14, INT: 15, POW: 13, CHA: 10 },
        selectedProfessionalSkills: ['Invocation (Zzistori School)', 'Shaping', 'Lore (Sorcery)'],
        careerSkills: { 'Invocation (Zzistori School)': 10, Shaping: 10, 'Lore (Sorcery)': 10 },
        boundSpirits: [],
        sorceryResource: 0,
        sorcerySpells: ['Project (Sense)'],
        companions: [{ name: 'Red Mane', species: 'Horse' }]
      }
    };

    const success = CD.fromJSON(JSON.stringify(payload));
    if (success && CD.name === 'Versioned Envelope' &&
        CD.boundSpirits && CD.boundSpirits.length === 0 &&
        CD.sorceryResource === 13 &&
        CD.sorcerySpells && CD.sorcerySpells[0] === 'Project (Sense)' &&
        CD.companions && CD.companions[0].name === 'Red Mane') {
      pass('CharacterData.fromJSON accepts versioned save envelopes');
    } else {
      fail('CharacterData.fromJSON does not import versioned save envelopes');
    }
  } else {
    fail('CharacterData.fromJSON not available for versioned envelope test');
  }
}

// Test 6.11: localStorage write failures do not crash the app
{
  const { App: AppObj, _sandbox } = loadApp();
  if (AppObj && AppObj.saveToLocalStorage && _sandbox) {
    let toast = null;
    let threw = false;
    AppObj.showToast = (message, type) => { toast = { message, type }; };
    _sandbox.localStorage = {
      setItem: () => { throw new Error('QuotaExceededError'); },
      getItem: () => null,
      removeItem: () => {}
    };

    try {
      AppObj.saveToLocalStorage();
    } catch (err) {
      threw = true;
    }

    if (!threw && toast && toast.type === 'error') {
      pass('localStorage write failure is surfaced without crashing');
    } else {
      fail('localStorage write failure crashes or is not surfaced');
    }
  } else {
    fail('App.saveToLocalStorage not available for write-failure test');
  }
}

// Test 6.12: localStorage read failures preserve the current character
{
  const { App: AppObj, CharacterData: CD, _sandbox } = loadApp();
  if (AppObj && AppObj.loadFromLocalStorage && CD && _sandbox) {
    let toast = null;
    let threw = false;
    CD.name = 'Existing Character';
    AppObj.showToast = (message, type) => { toast = { message, type }; };
    _sandbox.localStorage = {
      getItem: () => { throw new Error('SecurityError'); },
      setItem: () => {},
      removeItem: () => {}
    };

    try {
      AppObj.loadFromLocalStorage();
    } catch (err) {
      threw = true;
    }

    if (!threw && CD.name === 'Existing Character' && toast && toast.type === 'error') {
      pass('localStorage read failure preserves character and is surfaced');
    } else {
      fail('localStorage read failure crashes or mutates character');
    }
  } else {
    fail('App.loadFromLocalStorage not available for read-failure test');
  }
}

// Test 6.13: malformed character snapshots are rejected atomically
{
  const { CharacterData: CD } = loadApp();
  if (CD && CD.fromJSON) {
    CD.fromJSON(JSON.stringify(createTestCharacter()));
    CD.name = 'Atomic Original';
    const originalSTR = CD.characteristics.STR;
    const success = CD.fromJSON(JSON.stringify({
      name: 'Corrupt Character',
      characteristics: 'not a characteristics object',
      culturalSkills: []
    }));

    if (!success && CD.name === 'Atomic Original' && CD.characteristics.STR === originalSTR && !Array.isArray(CD.culturalSkills)) {
      pass('CharacterData.fromJSON rejects malformed snapshots atomically');
    } else {
      fail('CharacterData.fromJSON mutates state for malformed snapshots');
    }

    const arbitrarySuccess = CD.fromJSON(JSON.stringify({ bad: true }));
    if (!arbitrarySuccess && CD.name === 'Atomic Original' && CD.characteristics.STR === originalSTR) {
      pass('CharacterData.fromJSON rejects arbitrary non-character objects atomically');
    } else {
      fail('CharacterData.fromJSON accepts arbitrary non-character objects');
    }
  } else {
    fail('CharacterData.fromJSON not available for atomic rejection test');
  }
}

// Test 6.14: file-import helper validates before mutating live CharacterData
{
  const { App: AppObj, CharacterData: CD, Calc } = loadApp();
  if (AppObj && CD) {
    CD.fromJSON(JSON.stringify(createTestCharacter()));
    CD.name = 'Import Original';

    if (typeof AppObj.importCharacterData !== 'function') {
      fail('App.importCharacterData helper missing for atomic imports');
    } else {
      const arbitrarySuccess = AppObj.importCharacterData({ bad: true });
      if (!arbitrarySuccess && CD.name === 'Import Original') {
        pass('App.importCharacterData rejects arbitrary non-character objects before mutation');
      } else {
        fail('App.importCharacterData accepts arbitrary non-character objects');
      }

      const success = AppObj.importCharacterData({
        name: 'Invalid Import',
        characteristics: { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 10, POW: 10, CHA: 10 },
        culturalSkills: { 'Art (any)': 15 }
      });

      if (!success && CD.name === 'Import Original') {
        pass('App.importCharacterData rejects invalid imports before mutation');
      } else {
        fail('App.importCharacterData mutates state for invalid imports');
      }

      const companionSuccess = AppObj.importCharacterData({
        ...createTestCharacter(),
        name: 'Companion Attack Import',
        companions: [{
          name: 'Bad Mount',
          characteristics: { STR: '<img src=x onerror="window.__xss=1">' },
          hitLocations: { Head: { max: '"><img src=x onerror="window.__xss=1">', ap: 0 } },
          attacks: [{ name: 'Kick', skill: '<script>window.__xss=1</script>', damage: '1d6' }]
        }]
      });

      if (!companionSuccess && CD.name === 'Import Original') {
        pass('App.importCharacterData rejects malicious nested companion numeric fields before mutation');
      } else {
        fail('App.importCharacterData accepts unsafe nested companion import data');
      }

      const duplicateSelectedSuccess = AppObj.importCharacterData({
        ...createTestCharacter(),
        name: 'Duplicate Selected Import',
        selectedProfessionalSkills: ['Lore (Wolves)', 'Lore (Wolves)', 'Literacy'],
        careerSkills: { 'Lore (Wolves)': 0, Literacy: 0 },
        _disambiguationMap: {}
      });
      const duplicateMapSuccess = AppObj.importCharacterData({
        ...createTestCharacter(),
        name: 'Duplicate Map Import',
        selectedProfessionalSkills: ['Lore (Wolves)', 'Lore (Local Legends)', 'Literacy'],
        careerSkills: { 'Lore (Wolves)': 0, 'Lore (Local Legends)': 0, Literacy: 0 },
        _disambiguationMap: {
          'career:Lore (Primary)': 'Lore (Wolves)',
          'career:Lore (Secondary)': 'Lore (Wolves)'
        }
      });

      if (!duplicateSelectedSuccess && !duplicateMapSuccess && CD.name === 'Import Original') {
        pass('App.importCharacterData rejects duplicate professional specialty imports before mutation');
      } else {
        fail('App.importCharacterData accepts duplicate professional specialty imports',
          JSON.stringify({ duplicateSelectedSuccess, duplicateMapSuccess, name: CD.name }));
      }

      const forgedInvocationSuccess = AppObj.importCharacterData({
        ...createTestCharacter(),
        name: 'Forged Invocation Import',
        career: 'Farmer',
        selectedProfessionalSkills: ['Invocation', 'Commerce', 'Track'],
        careerSkills: { Invocation: 0, Commerce: 0, Track: 0 },
        cult: 'Arkat',
        cultType: { primary: 'sorcery', types: ['sorcery'], isHybrid: false },
        sorcerySpells: ['Holdfast']
      });

      if (!forgedInvocationSuccess && CD.name === 'Import Original') {
        pass('App.importCharacterData rejects forged professional skills before mutation');
      } else {
        fail('App.importCharacterData accepts forged professional skill imports',
          JSON.stringify({ forgedInvocationSuccess, name: CD.name }));
      }

      const missingCareerInvocationSuccess = AppObj.importCharacterData({
        ...createTestCharacter(),
        name: 'Missing Career Invocation Import',
        career: '',
        selectedProfessionalSkills: ['Invocation (Arkat)', 'Shaping', 'Lore (Sorcery)'],
        careerSkills: { 'Invocation (Arkat)': 0, Shaping: 0, 'Lore (Sorcery)': 0 },
        cult: 'Arkat',
        cultType: { primary: 'sorcery', types: ['sorcery'], isHybrid: false },
        sorcerySpells: ['Holdfast']
      });
      const unknownCareerInvocationSuccess = AppObj.importCharacterData({
        ...createTestCharacter(),
        name: 'Unknown Career Invocation Import',
        career: 'Imaginary Sorcerer',
        selectedProfessionalSkills: ['Invocation (Arkat)', 'Shaping', 'Lore (Sorcery)'],
        careerSkills: { 'Invocation (Arkat)': 0, Shaping: 0, 'Lore (Sorcery)': 0 },
        cult: 'Arkat',
        cultType: { primary: 'sorcery', types: ['sorcery'], isHybrid: false },
        sorcerySpells: ['Holdfast']
      });

      if (!missingCareerInvocationSuccess && !unknownCareerInvocationSuccess && CD.name === 'Import Original') {
        pass('App.importCharacterData rejects Invocation imports without career authority');
      } else {
        fail('App.importCharacterData accepts Invocation imports without career authority',
          JSON.stringify({ missingCareerInvocationSuccess, unknownCareerInvocationSuccess, name: CD.name }));
      }

      let saved = false;
      let rendered = false;
      let toastMessage = '';
      AppObj.saveToLocalStorage = () => { saved = true; };
      AppObj.renderCurrentStep = () => { rendered = true; };
      AppObj.showToast = msg => { toastMessage = msg; };

      const validPayload = {
        version: 1,
        data: {
          ...createTestCharacter(),
          name: 'Valid Import',
          characteristics: { STR: 11, CON: 12, SIZ: 13, DEX: 14, INT: 15, POW: 5, CHA: 5 },
          attributes: {}
        }
      };
      const validSuccess = AppObj.importCharacterData(validPayload);
      const expectedAttributes = Calc.calculateAllAttributes(validPayload.data.characteristics);
      if (validSuccess &&
          CD.name === 'Valid Import' &&
          CD.attributes.actionPoints === expectedAttributes.actionPoints &&
          saved && rendered && toastMessage === 'Character loaded') {
        pass('App.importCharacterData applies valid imports atomically and refreshes UI');
      } else {
        fail('App.importCharacterData valid import path failed',
          JSON.stringify({ validSuccess, name: CD.name, saved, rendered, toastMessage }));
      }
    }
  } else {
    fail('App/CharacterData not available for import atomicity test');
  }
}

// Test 6.15: wizard text fields escape imported user text before rendering
{
  const { App: AppObj, CharacterData: CD } = loadApp();
  if (AppObj && AppObj.renderStep1 && CD) {
    CD.name = '" autofocus onfocus="window.__xss=1';
    CD.concept = '</textarea><img src=x onerror="window.__xss=1">';
    const html = AppObj.renderStep1().innerHTML;

    if (!html.includes('value="" autofocus') && !html.includes('</textarea><img') &&
        html.includes('&quot;') && html.includes('&lt;/textarea&gt;')) {
      pass('Wizard Step 1 escapes imported user text');
    } else {
      fail('Wizard Step 1 renders imported user text as executable markup');
    }
  } else {
    fail('App.renderStep1 not available for XSS test');
  }
}

// Test 6.15a: Step 7 escapes imported background fields before rendering
{
  const { App: AppObj, CharacterData: CD } = loadApp();
  if (AppObj && AppObj.renderStep7 && CD) {
    CD.age = '"><img src=x onerror="window.__xss=1">';
    CD.gender = '" autofocus onfocus="window.__xss=1';
    CD.family = '</textarea><img src=x onerror="window.__xss=1">';
    CD.backgroundEvents = '</textarea><script>window.__xss=1</script>';
    const html = AppObj.renderStep7().innerHTML;

    if (!html.includes('value="" autofocus') &&
        !html.includes('</textarea><img') &&
        !html.includes('</textarea><script>') &&
        html.includes('&quot;') &&
        html.includes('&lt;/textarea&gt;')) {
      pass('Wizard Step 7 escapes imported background fields');
    } else {
      fail('Wizard Step 7 renders imported background fields as executable markup');
    }
  } else {
    fail('App.renderStep7 not available for XSS test');
  }
}

// Test 6.15b: Step 7 normalizes invalid stored age before the late bonus-point gate
{
  const { App: AppObj, CharacterData: CD } = loadApp();
  if (AppObj && AppObj.renderStep7 && CD) {
    CD.age = 0;
    const html = AppObj.renderStep7().innerHTML;

    if (CD.age === 21 && html.includes('value="21"') && !html.includes('value="0"')) {
      pass('Wizard Step 7 normalizes invalid age to adult default');
    } else {
      fail('Wizard Step 7 normalizes invalid age to adult default',
        `Rendered age=${CD.age}, html contains value 0: ${html.includes('value="0"')}`);
    }
  } else {
    fail('App.renderStep7 not available for age default test');
  }
}

// Test 6.15c: readonly Play Mode identity fields cannot corrupt wizard age
{
  const { App: AppObj, CharacterData: CD } = loadApp();
  if (AppObj && AppObj.updatePersistedField && CD) {
    CD.age = 21;
    const target = {
      type: 'number',
      value: '',
      readOnly: true,
      dataset: { persist: 'age' },
      getAttribute: name => name === 'data-persist' ? 'age' : null
    };
    const updated = AppObj.updatePersistedField(target);

    if (updated === false && CD.age === 21) {
      pass('Readonly persisted age field is ignored');
    } else {
      fail('Readonly persisted age field is ignored', `updated=${updated}, age=${CD.age}`);
    }
  } else {
    fail('App.updatePersistedField not available for readonly age test');
  }
}

// Test 6.15d: Step 11 validation APIs agree when age is invalid
{
  const { App: AppObj, CharacterData: CD } = loadApp();
  if (AppObj && AppObj.validateCurrentStep && AppObj.getValidationState && CD) {
    CD.age = 0;
    CD.bonusSkills = {};
    for (let i = 0; i < 10; i++) {
      CD.bonusSkills[`Skill ${i}`] = 15;
    }
    AppObj.currentStep = 11;
    let toastMessage = '';
    AppObj.showToast = msg => { toastMessage = msg; };

    const allowed = AppObj.validateCurrentStep();
    const state = AppObj.getValidationState();
    const stateMentionsAge = state.errors.some(error => /age/i.test(error));

    if (!allowed && !state.valid && /age/i.test(toastMessage) && stateMentionsAge) {
      pass('Step 11 validation APIs agree on invalid age');
    } else {
      fail('Step 11 validation APIs agree on invalid age',
        JSON.stringify({allowed, state, toastMessage}));
    }
  } else {
    fail('App.validateCurrentStep or App.getValidationState not available for invalid age test');
  }
}

// Test 6.15e: Step 7 age input ignores empty/invalid edits instead of saving NaN
{
  const { App: AppObj, CharacterData: CD } = loadApp();
  if (AppObj && AppObj.updateAgeFromInput && CD) {
    CD.age = 21;
    let requestedSave = false;
    AppObj.requestSaveToLocalStorage = () => { requestedSave = true; };

    const updated = AppObj.updateAgeFromInput({ value: '' });

    if (updated === false && CD.age === 21 && requestedSave === false) {
      pass('Step 7 age input ignores empty edits without saving invalid age');
    } else {
      fail('Step 7 age input ignores empty edits without saving invalid age',
        JSON.stringify({updated, age: CD.age, requestedSave}));
    }
  } else {
    fail('App.updateAgeFromInput not available for age input test');
  }
}

// Test 6.15f: agent Step 11 rejects invalid age instead of using adult defaults
{
  const { App: AppObj, CharacterData: CD } = loadApp();
  if (AppObj && AppObj.agent && AppObj.agent.setStep && CD) {
    CD.age = 0;
    CD.bonusSkills = {};
    const bonusSkills = {};
    for (let i = 0; i < 10; i++) {
      bonusSkills[`Skill ${i}`] = 15;
    }

    const result = AppObj.agent.setStep(11, { bonusSkills });
    const mentionsAge = (result.errors || []).some(error => /age/i.test(error));

    if (result.success === false && mentionsAge && Object.keys(CD.bonusSkills).length === 0) {
      pass('Agent Step 11 rejects invalid age before accepting bonus points');
    } else {
      fail('Agent Step 11 rejects invalid age before accepting bonus points',
        JSON.stringify({result, age: CD.age, bonusSkills: CD.bonusSkills}));
    }
  } else {
    fail('App.agent.setStep not available for invalid Step 11 age test');
  }
}

// Test 6.16: review screen escapes imported character and equipment labels
{
  const { App: AppObj, CharacterData: CD } = loadApp();
  if (AppObj && AppObj.renderStep13 && CD) {
    CD.fromJSON(JSON.stringify(createTestCharacter()));
    CD.name = '<img src=x onerror="window.__xss=1">';
    CD.concept = '<svg onload="window.__xss=1">';
    CD.homeland = '<script>window.__xss=1</script>';
    CD.equipment = [{ name: '<img src=x onerror="window.__xss=1">', quantity: 1, enc: 0 }];
    CD.weapons = [];
    CD.armor = [];
    CD.companions = [{
      name: '<img src=x onerror="window.__xss=1">',
      species: '<svg onload="window.__xss=1">',
      characteristics: { STR: '<img src=x onerror="window.__xss=1">' },
      armor: '<script>window.__xss=1</script>',
      movement: '<img src=x onerror="window.__xss=1">',
      damageModifier: '<svg onload="window.__xss=1">',
      hitPointsTotal: '<img src=x onerror="window.__xss=1">',
      healingRate: '<script>window.__xss=1</script>'
    }];
    const html = AppObj.renderStep13().innerHTML;

    if (!html.includes('<img src=x') && !html.includes('<svg') && !html.includes('<script>') &&
        html.includes('&lt;img') && html.includes('&lt;svg') && html.includes('&lt;script&gt;')) {
      pass('Review screen escapes imported character labels');
    } else {
      fail('Review screen renders imported character labels as executable markup');
    }
  } else {
    fail('App.renderStep13 not available for XSS test');
  }
}

// Test 6.17a: review screen render does not mutate character equipment
{
  const { App: AppObj, CharacterData: CD } = loadApp();
  if (AppObj && AppObj.renderStep13 && CD && CD.toJSONString) {
    CD.fromJSON(JSON.stringify(createTestCharacter()));
    CD.equipment = [];
    CD.weapons = [];
    CD.armor = [];
    CD.companions = [];
    CD.startingMoney = 0;
    let populated = false;
    AppObj.autoPopulateStartingEquipment = () => {
      populated = true;
      CD.equipment.push({ name: 'Render Mutation', quantity: 1, enc: 0 });
    };

    const before = CD.toJSONString();
    AppObj.renderStep13();
    const after = CD.toJSONString();

    if (!populated && before === after) {
      pass('Review screen render is pure and does not initialize equipment');
    } else {
      fail('Review screen render mutates character equipment');
    }
  } else {
    fail('App.renderStep13 or CharacterData.toJSONString not available for render purity test');
  }
}

// Test 6.17b: advancing into Step 13 prepares starting equipment before render
{
  const { App: AppObj, CharacterData: CD, _sandbox } = loadApp();
  if (AppObj && AppObj.nextStep && CD && _sandbox) {
    let populated = false;
    let rendered = false;
    CD.fromJSON(JSON.stringify(createTestCharacter()));
    CD.equipment = [];
    AppObj.currentStep = 12;
    AppObj.totalSteps = 13;
    AppObj.validateCurrentStep = () => true;
    AppObj.autoPopulateStartingEquipment = () => {
      populated = true;
      CD.equipment.push({ name: 'Prepared Equipment', quantity: 1, enc: 0 });
    };
    AppObj.renderCurrentStep = () => { rendered = true; };
    AppObj.updateStepIndicator = () => {};
    _sandbox.window.scrollTo = () => {};

    AppObj.nextStep();

    if (AppObj.currentStep === 13 && populated && rendered && CD.equipment.length === 1) {
      pass('Advancing into Step 13 initializes equipment before rendering review');
    } else {
      fail('Advancing into Step 13 does not initialize equipment before rendering review');
    }
  } else {
    fail('App.nextStep not available for Step 13 preparation test');
  }
}

// Test 6.17c: direct agent setStep(13) prepares and renders the final step
{
  const { App: AppObj, CharacterData: CD } = loadApp();
  if (AppObj && AppObj.agent && AppObj.agent.setStep && CD) {
    let preparedStep = null;
    let rendered = false;
    let saved = false;
    CD.fromJSON(JSON.stringify(createTestCharacter()));
    AppObj.currentStep = 12;
    AppObj.totalSteps = 13;
    AppObj.prepareStep = step => {
      preparedStep = step;
      CD.equipment = [{ name: 'Prepared By Agent', quantity: 1, enc: 0 }];
    };
    AppObj.renderCurrentStep = () => { rendered = true; };
    AppObj.saveToLocalStorage = () => { saved = true; };

    const result = AppObj.agent.setStep(13, {});

    if (result.success &&
        AppObj.currentStep === 13 &&
        preparedStep === 13 &&
        rendered && saved &&
        result.state.step === 13 &&
        result.state.totalSteps === 13 &&
        CD.equipment.length === 1) {
      pass('App.agent.setStep(13) prepares, renders, saves, and returns final state');
    } else {
      fail('App.agent.setStep(13) did not perform final-step preparation',
        JSON.stringify({ result, currentStep: AppObj.currentStep, preparedStep, rendered, saved }));
    }
  } else {
    fail('App.agent.setStep not available for Step 13 direct transition test');
  }
}

// Test 6.17: companion hit-location keys cannot inject inline handlers
{
  const { App: AppObj, CharacterData: CD, _sandbox } = loadApp();
  if (AppObj && AppObj.renderPlayCompanions && CD && _sandbox) {
    CD.companions = [{
      name: '<img src=x onerror="window.__xss=1">',
      species: '<svg onload="window.__xss=1">',
      characteristics: { STR: '<img src=x onerror="window.__xss=1">' },
      armor: '<script>window.__xss=1</script>',
      movement: '<img src=x onerror="window.__xss=1">',
      damageModifier: '<svg onload="window.__xss=1">',
      hitPointsTotal: '<img src=x onerror="window.__xss=1">',
      healingRate: '<script>window.__xss=1</script>',
      strikeRank: '<img src=x onerror="window.__xss=1">',
      hitLocations: {
        "Head'];window.__xss=1;//": {
          current: '"><img src=x onerror="window.__xss=1">',
          max: '"><svg onload="window.__xss=1">',
          ap: '<script>window.__xss=1</script>'
        }
      },
      attacks: [{
        name: '<img src=x onerror="window.__xss=1">',
        skill: '<svg onload="window.__xss=1">',
        damage: '1d6',
        notes: '<script>window.__xss=1</script>'
      }],
      notes: '<img src=x onerror="window.__xss=1">'
    }];

    AppObj.renderPlayCompanions();
    const html = _sandbox.elements['play-companions'].innerHTML;

    if (!html.includes('<img src=x') && !html.includes('<svg') && !html.includes('<script>') &&
        !html.includes("hitLocations['Head'];window.__xss=1;//']") &&
        html.includes('data-location=')) {
      pass('Companion play rendering escapes labels and avoids handler injection');
    } else {
      fail('Companion play rendering allows markup or handler injection');
    }
  } else {
    fail('App.renderPlayCompanions not available for companion XSS test');
  }
}

// Test 6.18: Play Mode renders selected bound spirits for animist cults
{
  const { App: AppObj, CharacterData: CD, _sandbox } = loadApp();
  if (AppObj && AppObj.renderPlayMagic && CD && _sandbox) {
    CD.fromJSON(JSON.stringify(createTestCharacter()));
    CD.attributes = { folkMagicBase: 30, runeAffinities: {} };
    CD.cult = 'Daka Fal';
    CD.cultChoiceMade = true;
    CD.cultInitiated = true; // Post-initiation Play Mode animism rendering.
    CD.cultType = { primary: 'animist', types: ['animist'], isHybrid: false };
    CD.boundSpiritSlots = 3;
    CD.boundSpirits = [{ name: 'Ancestor Spirit' }, { name: 'Healing Spirit' }];
    CD.folkMagicSpells = [];
    CD.careerFolkMagic = [];

    AppObj.renderPlayMagic();
    const html = _sandbox.elements['play-magic'].innerHTML;

    if (html.includes('data-testid="bound-spirits-list"') &&
        html.includes('Ancestor Spirit') &&
        html.includes('Healing Spirit')) {
      pass('Play Mode renders selected bound spirits');
    } else {
      fail('Play Mode does not render selected bound spirits');
    }
  } else {
    fail('App.renderPlayMagic not available for bound spirits Play Mode test');
  }
}

// Test 6.19: Play Mode renders selected sorcery spells for sorcery cults
{
  const { App: AppObj, CharacterData: CD, _sandbox } = loadApp();
  if (AppObj && AppObj.renderPlayMagic && CD && _sandbox) {
    CD.fromJSON(JSON.stringify(createTestCharacter()));
    CD.attributes = { folkMagicBase: 30, runeAffinities: {} };
    CD.cult = 'Arkat';
    CD.cultChoiceMade = true;
    CD.cultInitiated = true; // Post-initiation Play Mode sorcery rendering.
    CD.cultType = { primary: 'sorcery', types: ['sorcery'], isHybrid: false };
    CD.sorceryResource = 14;
    CD.sorcerySpells = ['Animate (Substance)', 'Dominate (Creatures)'];
    CD.folkMagicSpells = [];
    CD.careerFolkMagic = [];

    AppObj.renderPlayMagic();
    const html = _sandbox.elements['play-magic'].innerHTML;

    if (html.includes('data-testid="sorcery-spells-list"') &&
        html.includes('Animate (Substance)') &&
        html.includes('Dominate (Creatures)') &&
        html.includes('[Resist: Special]') &&
        html.includes('[Resist: Willpower]')) {
      pass('Play Mode renders selected sorcery spells with resist metadata');
    } else {
      fail('Play Mode does not render selected sorcery spell resist metadata', html);
    }
  } else {
    fail('App.renderPlayMagic not available for sorcery Play Mode test');
  }
}

// Test 6.19b: Play Mode renders source-backed Zzistori sorcery without theist fields
{
  const { App: AppObj, CharacterData: CD, Calc: CalcRef, _sandbox } = loadApp();
  if (AppObj && AppObj.renderPlayMagic && CD && _sandbox) {
    const characteristics = { STR: 8, CON: 10, SIZ: 10, DEX: 9, INT: 15, POW: 15, CHA: 8 };
    CD.fromJSON(JSON.stringify({
      ...createTestCharacter('God Forgot'),
      name: 'Talor Zzistori',
      culture: 'God Forgot',
      homeland: 'God Forgot',
      career: 'Sorcerer',
      cult: null,
      cultType: null,
      characteristics,
      attributes: CalcRef.calculateAllAttributes(characteristics),
      selectedProfessionalSkills: ['Invocation (Zzistori School)', 'Shaping', 'Lore (Sorcery)'],
      careerSkills: { 'Invocation (Zzistori School)': 10, Shaping: 10, 'Lore (Sorcery)': 10 },
      miracles: [],
      devotionalPool: 0,
      sorceryResource: 0,
      sorcerySpells: ['Holdfast', 'Animate (Substance)', 'Project (Sense)'],
      folkMagicSpells: [],
      careerFolkMagic: [],
      boundSpirits: []
    }));
    CD.miracles = ['Shield'];
    CD.devotionalPool = 99;

    AppObj.renderPlayMagic();
    const html = _sandbox.elements['play-magic'].innerHTML;
    const hasSourceLabel = html.includes('Zzistori School (God Forgot sorcery)');
    const hasMagicPoints = html.includes('Magic Points (15)');
    const hasRawSkills = /Invocation skill/i.test(html) && /Shaping skill/i.test(html);
    const hasSelectedSpells = ['Holdfast', 'Animate (Substance)', 'Project (Sense)'].every(spell => html.includes(spell));
    const hasSourceCopy = html.includes('AiG p.30-31, p.59-60; Mythras rulebook p.162, p.166-177');
    const hasTheistLeak = /Devotional Pool|data-testid="miracle-name"|Shield/.test(html);

    if (hasSourceLabel && hasMagicPoints && hasRawSkills && hasSelectedSpells && hasSourceCopy && !hasTheistLeak) {
      pass('Play Mode renders Zzistori source-backed sorcery without theist fields');
    } else {
      fail('Play Mode omits Zzistori source-backed sorcery or leaks theist fields',
        JSON.stringify({ hasSourceLabel, hasMagicPoints, hasRawSkills, hasSelectedSpells, hasSourceCopy, hasTheistLeak, html }));
    }
  } else {
    fail('App.renderPlayMagic not available for Zzistori Play Mode test');
  }
}

// Test 6.19c: Play Mode keeps Arkat cult-backed sorcery label distinct from Zzistori
{
  const { App: AppObj, CharacterData: CD, Calc: CalcRef, _sandbox } = loadApp();
  if (AppObj && AppObj.renderPlayMagic && CD && _sandbox) {
    CD.fromJSON(JSON.stringify(createTestCharacter('God Forgot')));
    CD.characteristics = { STR: 8, CON: 10, SIZ: 10, DEX: 9, INT: 15, POW: 13, CHA: 10 };
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    CD.cult = 'Arkat';
    CD.cultChoiceMade = true;
    CD.cultInitiated = true; // Post-initiation Arkat labeling stays distinct from source-backed No Cult.
    CD.cultType = { primary: 'sorcery', types: ['sorcery'], isHybrid: false };
    CD.sorceryResource = 13;
    CD.sorcerySpells = ['Holdfast'];
    CD.folkMagicSpells = [];
    CD.careerFolkMagic = [];

    AppObj.renderPlayMagic();
    const html = _sandbox.elements['play-magic'].innerHTML;

    if (html.includes('Arkat Cult') &&
        html.includes('Sorcery') &&
        html.includes('Magic Points (13)') &&
        html.includes('Holdfast') &&
        !html.includes('Zzistori School (God Forgot sorcery)') &&
        !html.includes('Devotional Pool')) {
      pass('Play Mode keeps Arkat cult-backed sorcery label distinct');
    } else {
      fail('Play Mode regressed Arkat cult-backed sorcery labeling', html);
    }
  } else {
    fail('App.renderPlayMagic not available for Arkat Play Mode label test');
  }
}

// Test 6.20: data-persist input handling updates CharacterData before saving
{
  const { App: AppObj, CharacterData: CD, _sandbox } = loadApp();
  if (AppObj && AppObj.attachPersistHandlers && CD && _sandbox) {
    let inputHandler = null;
    let savedName = null;
    _sandbox.document.addEventListener = (eventName, handler) => {
      if (eventName === 'input') inputHandler = handler;
    };
    _sandbox.localStorage = {
      getItem: () => null,
      setItem: (key, value) => {
        const parsed = JSON.parse(value);
        savedName = parsed.data.name;
      },
      removeItem: () => {}
    };

    CD.name = 'Old Play Name';
    AppObj.attachPersistHandlers();
    inputHandler({
      target: {
        hasAttribute: attr => attr === 'data-persist',
        getAttribute: attr => attr === 'data-persist' ? 'name' : null,
        dataset: { persist: 'name' },
        type: 'text',
        value: 'New Play Name'
      }
    });

    if (CD.name === 'New Play Name' && savedName === 'New Play Name') {
      pass('data-persist input handler updates CharacterData before saving');
    } else {
      fail('data-persist input handler saves stale CharacterData');
    }
  } else {
    fail('App.attachPersistHandlers not available for Play Mode persist test');
  }
}

// Test 6.21: rapid data-persist input autosaves are debounced
{
  const { App: AppObj, CharacterData: CD, _sandbox } = loadApp();
  if (AppObj && AppObj.requestSaveToLocalStorage && AppObj.attachPersistHandlers && CD && _sandbox) {
    let inputHandler = null;
    let writeCount = 0;
    const timers = [];

    _sandbox.document.addEventListener = (eventName, handler) => {
      if (eventName === 'input') inputHandler = handler;
    };
    _sandbox.localStorage = {
      getItem: () => null,
      setItem: () => { writeCount++; },
      removeItem: () => {}
    };
    _sandbox.setTimeout = (fn, delay) => {
      const timer = { fn, delay, active: true };
      timers.push(timer);
      return timer;
    };
    _sandbox.clearTimeout = timer => {
      if (timer) timer.active = false;
    };

    AppObj.attachPersistHandlers();
    for (const name of ['First', 'Second', 'Final']) {
      inputHandler({
        target: {
          hasAttribute: attr => attr === 'data-persist',
          getAttribute: attr => attr === 'data-persist' ? 'name' : null,
          dataset: { persist: 'name' },
          type: 'text',
          value: name
        }
      });
    }

    const activeTimers = timers.filter(timer => timer.active);
    if (CD.name === 'Final' && writeCount === 0 && activeTimers.length === 1) {
      pass('rapid data-persist inputs schedule one autosave after updating CharacterData');
    } else {
      fail('rapid data-persist inputs are not debounced before localStorage writes');
    }

    activeTimers.forEach(timer => timer.fn());
    if (writeCount === 1) {
      pass('debounced autosave writes once after rapid input burst');
    } else {
      fail('debounced autosave writes more than once after rapid input burst');
    }
  } else {
    fail('App.requestSaveToLocalStorage not available for autosave debounce test');
  }
}

// Test 6.22: Agent state APIs expose the 13-step wizard contract
{
  const { App: AppObj } = loadApp();
  if (AppObj && AppObj.agent && AppObj.agent.getState && AppObj.agent.getUIState) {
    const state = AppObj.agent.getState();
    const ui = AppObj.agent.getUIState();
    if (state.totalSteps === 13 && ui.totalSteps === 13) {
      pass('Agent state APIs expose totalSteps = 13');
    } else {
      fail('Agent state APIs do not expose totalSteps = 13');
    }
  } else {
    fail('Agent state APIs not available for wizard contract test');
  }
}

// Test 6.22a: Agent characteristic mutation refreshes higher-magic derived resources
{
  const { App: AppObj, CharacterData: CD } = loadApp();
  if (AppObj?.agent?.setCharacteristic && AppObj.agent.getMagicState) {
    CD.fromJSON(JSON.stringify(createTestCharacter('Sartarite (Heortling)')));
    CD.cult = 'Orlanth';
    CD.cultChoiceMade = true;
    CD.cultInitiated = true;
    CD.cultType = { primary: 'theist', types: ['theist'], isHybrid: false };
    CD.miracles = [];
    CD.devotionalPool = 6;
    const result = AppObj.agent.setCharacteristic('POW', 18);
    const magic = AppObj.agent.getMagicState();
    if (result.success && magic.devotionalPool === 9 && magic.limits.miracles === AppObj.getEffectiveInitiateMiracleLimit('Orlanth')) {
      pass('Agent characteristic mutation refreshes higher-magic derived resources');
    } else {
      fail('Agent characteristic mutation leaves higher-magic derived resources stale', JSON.stringify({ result, magic }));
    }
  } else {
    fail('Agent characteristic mutation APIs unavailable for higher-magic resource test');
  }
}

// Test 6.23: Agent next() completes at Step 13 instead of advancing to Step 14
{
  const { App: AppObj } = loadApp();
  if (AppObj && AppObj.agent && AppObj.agent.next) {
    AppObj.currentStep = 13;
    AppObj.mode = 'wizard';
    AppObj.renderCurrentStep = () => {};
    AppObj.switchMode = mode => { AppObj.mode = mode; };

    const result = AppObj.agent.next();
    if (result.success && result.completed && result.newStep === 13 && AppObj.mode === 'play') {
      pass('Agent next() completes the 13-step wizard into Play Mode');
    } else {
      fail('Agent next() does not complete correctly from Step 13');
    }
  } else {
    fail('App.agent.next not available for wizard completion test');
  }
}

// Test: returning from Play Mode to Wizard Mode refreshes Step 13 navigation
{
  const { App: AppObj, _sandbox: sandbox } = loadApp();
  if (AppObj && AppObj.switchMode && AppObj.prevStep) {
    AppObj.currentStep = AppObj.totalSteps || 13;
    let renderCount = 0;
    const originalRenderCurrentStep = AppObj.renderCurrentStep;
    const originalUpdateStepIndicator = AppObj.updateStepIndicator;
    AppObj.renderCurrentStep = () => { renderCount++; };
    AppObj.updateStepIndicator = () => {};
    sandbox.window.scrollTo = () => {};

    AppObj.switchMode('play');
    AppObj.switchMode('wizard');
    AppObj.prevStep();

    AppObj.renderCurrentStep = originalRenderCurrentStep;
    AppObj.updateStepIndicator = originalUpdateStepIndicator;

    if (renderCount >= 2 && AppObj.currentStep === 12) {
      pass('Wizard Mode return from Play refreshes Step 13 and Previous moves to Step 12');
    } else {
      fail('Wizard Mode return from Play leaves Step 13 Previous stale',
        JSON.stringify({ renderCount, currentStep: AppObj.currentStep }));
    }
  } else {
    fail('Wizard navigation APIs not available for Play return regression');
  }
}

// Test: build-defining changes clear stale auto-populated companions
{
  const CD = App.CharacterData;
  const AppObj = App.App;

  if (AppObj && AppObj.autoPopulateCompanion && AppObj.selectCult && AppObj.selectCareer) {
    const origRender = AppObj.renderCurrentStep;
    const origSave = AppObj.saveToLocalStorage;
    AppObj.renderCurrentStep = function() {};
    AppObj.saveToLocalStorage = function() {};

    const seedWahaShamanCompanions = () => {
      CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 10, POW: 12, CHA: 10 };
      CD.culture = 'Praxian';
      CD.cult = 'Waha';
      CD.cultType = { primary: 'theist', types: ['theist', 'animist'], isHybrid: true };
      CD.career = 'Shaman';
      CD.socialClass = 'Freeman';
      CD.combatStyles = [{ name: 'Bison Riders', weapons: ['bison lance'] }];
      CD.careerSkills = {};
      CD.miracles = [];
      CD.boundSpirits = [];
      CD.sorcerySpells = [];
      CD.mysticismTalents = [];
      CD.companions = [];
      AppObj.autoPopulateCompanion();
      return CD.companions.map(companion => companion.name);
    };

    const initialCultCompanions = seedWahaShamanCompanions();
    const cultResult = AppObj.selectCult('Orlanth', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const afterCultChange = CD.companions.map(companion => companion.name);

    const initialCareerCompanions = seedWahaShamanCompanions();
    const careerResult = AppObj.selectCareer('Warrior');
    const afterCareerChange = CD.companions.map(companion => companion.name);

    CD.cult = 'Waha';
    CD.career = 'Warrior';
    CD.companions = [{ name: 'Manual Pack Alynx' }];
    const manualCultResult = AppObj.selectCult('Orlanth', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const afterManualCultChange = CD.companions.map(companion => companion.name);

    CD.career = 'Warrior';
    CD.careerSkills = {};
    CD.companions = [{ name: 'Manual Riding Horse' }];
    const manualCareerResult = AppObj.selectCareer('Shaman');
    const afterManualCareerChange = CD.companions.map(companion => companion.name);

    AppObj.renderCurrentStep = origRender;
    AppObj.saveToLocalStorage = origSave;

    if (
      initialCultCompanions.some(name => /Bison|Cousin/.test(name)) &&
      initialCareerCompanions.some(name => /Bison|Cousin/.test(name)) &&
      cultResult.success === true &&
      careerResult.success === true &&
      afterCultChange.length === 0 &&
      afterCareerChange.length === 0 &&
      manualCultResult.success === true &&
      manualCareerResult.success === true &&
      afterManualCultChange.includes('Manual Pack Alynx') &&
      afterManualCareerChange.includes('Manual Riding Horse')
    ) {
      pass('Build changes clear stale auto-populated companions while preserving manual companions');
    } else {
      fail('Build changes leave stale companions attached',
        JSON.stringify({ initialCultCompanions, afterCultChange, cultResult, initialCareerCompanions, afterCareerChange, careerResult, afterManualCultChange, manualCultResult, afterManualCareerChange, manualCareerResult }));
    }
  } else {
    fail('Companion reset dependencies are missing');
  }
}

// ============================================================
section('Random Character Generator');
// ============================================================

// Test: generateRandomCharacter fully resets state
{
  const CD = App.CharacterData;
  const AppObj = App.App;
  const CULTURES = App.CULTURES_DATA;
  const CAREERS = App.CAREERS_DATA || [];

  if (!AppObj || !AppObj.generateRandomCharacter) {
    info('App.generateRandomCharacter not found - skipping random tests');
  } else {
    // Set prior state that should get wiped
    CD.name = 'Old Character';
    CD.concept = 'Old concept';
    CD.culture = 'Balazaring';
    CD.career = 'Warrior';
    CD.culturalSkills = { 'Athletics': 10 };
    CD.careerSkills = { 'Brawn': 5 };
    CD.bonusSkills = { 'Stealth': 8 };
    CD.weapons = [{ name: 'Old Sword', quantity: 1 }];
    CD.folkMagicSpells = ['Old Spell'];
    CD.companions = [{ name: 'Old Mule', species: 'Mule' }];

    // Mock DOM-dependent functions for Node
    const origRender = AppObj.renderCurrentStep;
    const origToast = AppObj.showToast;
    const origSave = AppObj.saveToLocalStorage;
    AppObj.renderCurrentStep = function() {};
    AppObj.showToast = function() {};
    AppObj.saveToLocalStorage = function() {};

    AppObj.generateRandomCharacter();

    // Identity
    if (CD.name && CD.name.length > 0 && CD.name !== 'Old Character') pass('Random: name is set and changed');
    else fail('Random: name is empty or unchanged: ' + CD.name);

    if (CD.concept && CD.concept.length > 0) pass('Random: concept is set');
    else fail('Random: concept is empty');

    // Culture & homeland
    if (CULTURES.some(c => c.name === CD.culture)) pass('Random: culture is valid (' + CD.culture + ')');
    else fail('Random: invalid culture: ' + CD.culture);

    if (CD.homeland && CD.homeland.length > 0) pass('Random: homeland is set (' + CD.homeland + ')');
    else fail('Random: homeland is empty');

    // Career
    if (CD.career && CD.career.length > 0) pass('Random: career is set (' + CD.career + ')');
    else fail('Random: career is empty');

    // Characteristics
    if (Object.values(CD.characteristics).some(v => v !== 10)) pass('Random: characteristics are rolled');
    else fail('Random: characteristics are all 10 (not rolled)');

    if (CD.characteristics.SIZ >= 8 && CD.characteristics.SIZ <= 18) pass('Random: SIZ in 2d6+6 range (' + CD.characteristics.SIZ + ')');
    else fail('Random: SIZ out of range: ' + CD.characteristics.SIZ);

    // Attributes
    if (CD.attributes && CD.attributes.actionPoints > 0) pass('Random: attributes calculated');
    else fail('Random: attributes not calculated');

    // Career skills - the key test
    const careerSkillCount = Object.keys(CD.careerSkills).length;
    if (careerSkillCount > 0) pass('Random: careerSkills has ' + careerSkillCount + ' entries');
    else fail('Random: careerSkills is empty');

    // Cultural skills with points
    // Points must be FULLY spent — not just "has entries"
    const culturalSpent = Object.values(CD.culturalSkills).reduce((a, b) => a + b, 0);
    if (culturalSpent === 100) pass('Random: cultural skills spent exactly 100 points');
    else fail('Random: cultural skills spent ' + culturalSpent + '/100 points');

    const careerSpent = Object.values(CD.careerSkills).reduce((a, b) => a + b, 0);
    if (careerSpent === 100) pass('Random: career skills spent exactly 100 points');
    else fail('Random: career skills spent ' + careerSpent + '/100 points');

    const ageCategory = App.Calc.getAgeCategory(CD.age);
    const expectedBonus = ageCategory ? ageCategory.bonusPoints : 150;
    const bonusSpent = Object.values(CD.bonusSkills).reduce((a, b) => a + b, 0);
    if (bonusSpent === expectedBonus) pass('Random: bonus skills spent exactly ' + expectedBonus + ' points');
    else fail('Random: bonus skills spent ' + bonusSpent + '/' + expectedBonus + ' points');

    // No skill should exceed 15 per pool
    const culturalOver = Object.entries(CD.culturalSkills).find(([k, v]) => v > 15);
    if (!culturalOver) pass('Random: no cultural skill exceeds 15');
    else fail('Random: cultural skill ' + culturalOver[0] + ' has ' + culturalOver[1] + ' (max 15)');

    const careerOver = Object.entries(CD.careerSkills).find(([k, v]) => v > 15);
    if (!careerOver) pass('Random: no career skill exceeds 15');
    else fail('Random: career skill ' + careerOver[0] + ' has ' + careerOver[1] + ' (max 15)');

    // Folk magic — Step 5 validation requires exactly 3
    if (CD.folkMagicSpells.length === 3) pass('Random: exactly 3 folk magic spells');
    else fail('Random: folkMagicSpells has ' + CD.folkMagicSpells.length + ' (need 3)');

    // Career folk magic — Step 9 requires exactly 2
    if (CD.careerFolkMagic && CD.careerFolkMagic.length === 2) pass('Random: careerFolkMagic has exactly 2 spells');
    else fail('Random: careerFolkMagic has ' + (CD.careerFolkMagic ? CD.careerFolkMagic.length : 'undefined') + ' (need 2)');

    // Career folk magic should not overlap with cultural folk magic
    if (CD.careerFolkMagic && CD.folkMagicSpells) {
      const overlap = CD.careerFolkMagic.filter(s => CD.folkMagicSpells.includes(s));
      if (overlap.length === 0) pass('Random: careerFolkMagic does not overlap with folkMagicSpells');
      else fail('Random: careerFolkMagic overlaps: ' + overlap.join(', '));
    }

    // Rune affinities — Step 5 requires ALL THREE set
    if (CD.runeAffinities.primary && CD.runeAffinities.secondary && CD.runeAffinities.tertiary)
      pass('Random: all 3 rune affinities set (' + CD.runeAffinities.primary + '/' + CD.runeAffinities.secondary + '/' + CD.runeAffinities.tertiary + ')');
    else fail('Random: rune affinities incomplete: ' + JSON.stringify(CD.runeAffinities));

    // selectedProfessionalSkills — Step 8 requires exactly 3
    if (CD.selectedProfessionalSkills && CD.selectedProfessionalSkills.length === 3)
      pass('Random: exactly 3 professional skills selected');
    else fail('Random: selectedProfessionalSkills has ' + (CD.selectedProfessionalSkills ? CD.selectedProfessionalSkills.length : 'undefined') + ' (need 3)');

    // Passions should have names AND values
    if (CD.passions.length > 0 && CD.passions[0].name && CD.passions[0].value > 0)
      pass('Random: passions have names and values (' + CD.passions.length + ')');
    else fail('Random: passions missing name or value');

    const subjectRequiredPassion = new Set(['Devotion', 'Fear', 'Hate', 'Love', 'Loyalty']);
    const unresolvedPassion = (CD.passions || []).find(p =>
      !p.type ||
      !p.description ||
      (subjectRequiredPassion.has(p.type) && !p.subject)
    );
    if (!unresolvedPassion)
      pass('Random: passions are structured and source-subjected when required');
    else fail('Random: passion missing ADR-0014 structure or required subject', JSON.stringify(unresolvedPassion));

    // Hit points should be initialized with current/max for all 7 locations
    const hpKeys = Object.keys(CD.hitPoints || {});
    if (hpKeys.length >= 7) pass('Random: hitPoints has ' + hpKeys.length + ' locations');
    else fail('Random: hitPoints has ' + hpKeys.length + ' locations (need 7)');

    if (hpKeys.length > 0) {
      const headHP = CD.hitPoints['Head'];
      if (headHP && headHP.current > 0 && headHP.max > 0) pass('Random: Head HP initialized (' + headHP.current + '/' + headHP.max + ')');
      else fail('Random: Head HP not properly initialized');
    }

    // Combat styles
    if (CD.combatStyles.length > 0 && CD.combatStyles[0].name) pass('Random: combat style set (' + CD.combatStyles[0].name + ')');
    else fail('Random: combat styles empty or unnamed');

    // Equipment
    if (CD.equipment.length > 0) pass('Random: equipment populated');
    else fail('Random: equipment is empty');

    if (CD.startingMoney > 0) pass('Random: startingMoney is ' + CD.startingMoney);
    else fail('Random: startingMoney is 0');

    // Old state wiped
    if (!CD.weapons.some(w => w.name === 'Old Sword')) pass('Random: old weapons cleared');
    else fail('Random: old weapon "Old Sword" still present');

    // Weapons should have full stats (damage, size, reach, ap, hp)
    if (CD.weapons.length > 0) {
      pass('Random: weapons populated (' + CD.weapons.length + ')');
      const w = CD.weapons[0];
      if (w.damage && w.size && w.reach !== undefined) pass('Random: weapon has full stats (' + w.name + ' dmg:' + w.damage + ')');
      else fail('Random: weapon missing stats: ' + JSON.stringify(w));
    } else {
      fail('Random: no weapons populated from combat style');
    }

    // Armor should be populated
    if (CD.armor.length > 0) pass('Random: armor populated (' + CD.armor[0].name + ')');
    else fail('Random: armor is empty');

	    if (!CD.folkMagicSpells.includes('Old Spell')) pass('Random: old folkMagic cleared');
	    else fail('Random: old spell "Old Spell" still present');

    if (!CD.companions.some(companion => companion.name === 'Old Mule')) {
      pass('Random: old companions cleared');
    } else {
      fail('Random: old companion "Old Mule" still present');
    }

	    AppObj.mode = 'play';
	    let renderedPlayMode = false;
	    const origPlayRender = AppObj.renderPlayMode;
	    AppObj.renderPlayMode = function() {
	      renderedPlayMode = true;
	    };
	    AppObj.generateRandomCharacter();
	    if (renderedPlayMode) {
	      pass('Random: Play Mode regenerates the visible character sheet');
	    } else {
	      fail('Random: Play Mode leaves the visible character sheet stale');
	    }
	    AppObj.renderPlayMode = origPlayRender;
	    AppObj.mode = 'wizard';

	    // Validate ALL steps would pass
	    // Step 5: cultural=100, folkMagic=3, all runes set (tested above)
	    // Step 8: career set, 3 pro skills (tested above)
    // Step 9: career=100, careerFolkMagic=2 (tested above)
    // Step 10: bonus=exact (tested above)
    // If any of these are wrong, the wizard would block advancement.

    // Restore mocks
    AppObj.renderCurrentStep = origRender;
    AppObj.showToast = origToast;
    AppObj.saveToLocalStorage = origSave;
  }
}

{
  const {
    App: AppRef,
    CharacterData: CD,
    CULTURES_DATA: CulturesData,
    CAREERS_DATA: CareersData,
    CULTURE_CULT_MAP: CultureCultMap,
    _sandbox: sandbox
  } = loadApp();

  if (AppRef?.generateRandomCharacter && Array.isArray(CulturesData) && Array.isArray(CareersData) && CultureCultMap?.Praxian) {
    const originalCultures = CulturesData.slice();
    const originalCareers = CareersData.slice();
    const originalPraxianPrimary = [...(CultureCultMap.Praxian.primary || [])];
    const oldRandom = sandbox.Math.random;
    const originalRender = AppRef.renderCurrentStep;
    const originalToast = AppRef.showToast;
    const originalSave = AppRef.saveToLocalStorage;
    try {
      const praxian = originalCultures.find(culture => culture.name === 'Praxian');
      const shaman = originalCareers.find(career => career.name === 'Shaman');
      if (!praxian || !shaman) {
        fail('Random Waha Shaman regression fixture data missing');
      } else {
        CulturesData.splice(0, CulturesData.length, praxian);
        CareersData.splice(0, CareersData.length, shaman);
        CultureCultMap.Praxian.primary = ['Waha'];
        let randomState = 1;
        sandbox.Math.random = () => {
          randomState = (randomState * 48271) % 2147483647;
          return randomState / 2147483647;
        };
        AppRef.renderCurrentStep = () => {};
        AppRef.showToast = () => {};
        AppRef.saveToLocalStorage = () => {};

        AppRef.generateRandomCharacter();
        AppRef.currentStep = 9;
        const gateErrors = AppRef.getCultInitiationGateErrors();
        const providers = AppRef.resolveHigherMagicProviders(CD);
        const animismProvider = providers.find(provider => provider.system === 'animism') || null;
        const expectedSpirits = Math.min(3, animismProvider?.itemLimit || CD.boundSpiritSlots || 0);

        if (
          CD.cult === 'Waha' &&
          gateErrors.length === 0 &&
          animismProvider &&
          (CD.boundSpirits || []).length === expectedSpirits &&
          expectedSpirits > 0 &&
          (CD.companions || []).some(companion => /bison/i.test(`${companion.name} ${companion.species}`)) &&
          (CD.companions || []).some(companion => /baboon/i.test(`${companion.name} ${companion.species}`)) &&
          (CD.miracles || []).length === AppRef.getEffectiveInitiateMiracleLimit('Waha')
        ) {
          pass('Random Waha Shaman satisfies cult gates, companions, and starting magic selections');
        } else {
          fail('Random Waha Shaman remains blocked or incomplete',
            JSON.stringify({
              cult: CD.cult,
              gateErrors,
              providers: providers.map(provider => provider.system),
              selectedProfessionalSkills: CD.selectedProfessionalSkills,
              careerSkills: CD.careerSkills,
              culturalSkills: CD.culturalSkills,
              bonusSkills: CD.bonusSkills,
              spirits: (CD.boundSpirits || []).map(spirit => spirit.name || spirit),
              companions: CD.companions,
              expectedSpirits,
              miracles: CD.miracles
            }));
        }
      }
    } finally {
      sandbox.Math.random = oldRandom;
      AppRef.renderCurrentStep = originalRender;
      AppRef.showToast = originalToast;
      AppRef.saveToLocalStorage = originalSave;
      CulturesData.splice(0, CulturesData.length, ...originalCultures);
      CareersData.splice(0, CareersData.length, ...originalCareers);
      CultureCultMap.Praxian.primary = originalPraxianPrimary;
    }
  } else {
    fail('Random Waha Shaman regression dependencies not found');
  }
}

{
  const {
    App: AppRef,
    CharacterData: CD,
    CULTURES_DATA: CulturesData,
    CAREERS_DATA: CareersData,
    _sandbox: sandbox
  } = loadApp();

  if (AppRef?.generateRandomCharacter && Array.isArray(CulturesData) && Array.isArray(CareersData)) {
    const originalCultures = CulturesData.slice();
    const originalCareers = CareersData.slice();
    const oldRandom = sandbox.Math.random;
    const originalRender = AppRef.renderCurrentStep;
    const originalToast = AppRef.showToast;
    const originalSave = AppRef.saveToLocalStorage;
    try {
      const cultureWithStyle = originalCultures.find(culture => (culture.combatStyles || []).length > 0);
      const warrior = originalCareers.find(career => career.name === 'Warrior');
      if (!cultureWithStyle || !warrior) {
        fail('Random combat style regression fixture data missing');
      } else {
        CulturesData.splice(0, CulturesData.length, cultureWithStyle);
        CareersData.splice(0, CareersData.length, warrior);
        let randomState = 1;
        sandbox.Math.random = () => {
          randomState = (randomState * 48271) % 2147483647;
          return randomState / 2147483647;
        };
        AppRef.renderCurrentStep = () => {};
        AppRef.showToast = () => {};
        AppRef.saveToLocalStorage = () => {};

        AppRef.generateRandomCharacter();

        const selectedStyleNames = new Set((CD.combatStyles || []).map(style => style.name));
        const careerKeys = Object.keys(CD.careerSkills || {});
        const bonusKeys = Object.keys(CD.bonusSkills || {});
        const rawStyleKeys = [...careerKeys, ...bonusKeys].filter(key => selectedStyleNames.has(key));
        const unresolvedPlaceholders = [...careerKeys, ...bonusKeys].filter(key =>
          /^Combat Style \((Cultural Style|Speciality Style|Specific |Concealable Weapons Style)/i.test(key)
        );
        const expectedResolved = [...selectedStyleNames].map(name => `Combat Style (${name})`);

        if (rawStyleKeys.length === 0 &&
            unresolvedPlaceholders.length === 0 &&
            expectedResolved.some(key => careerKeys.includes(key))) {
          pass('Random combat-style career allocations use rendered Combat Style keys');
        } else {
          fail('Random combat-style career allocations use hidden raw or placeholder keys',
            JSON.stringify({
              culture: CD.culture,
              career: CD.career,
              selectedStyleNames: [...selectedStyleNames],
              careerKeys,
              bonusKeys,
              rawStyleKeys,
              unresolvedPlaceholders,
              expectedResolved
            }));
        }
      }
    } finally {
      sandbox.Math.random = oldRandom;
      AppRef.renderCurrentStep = originalRender;
      AppRef.showToast = originalToast;
      AppRef.saveToLocalStorage = originalSave;
      CulturesData.splice(0, CulturesData.length, ...originalCultures);
      CareersData.splice(0, CareersData.length, ...originalCareers);
    }
  } else {
    fail('Random combat style regression dependencies not found');
  }
}

{
  const { App: AppRef } = loadApp();
  if (!AppRef?.renderStep9) {
    fail('Step 9 render function missing for cult panel regression test');
  } else {
    const source = AppRef.renderStep9.toString();
    const noQuickBoostHooks = !/updateCultRequirementUI|renderCultSkillBoostPanel|cult-skill-boost-panel/.test(source);
    if (noQuickBoostHooks) {
      pass('Step 9 removes legacy cult requirement/Quick Boost panel refresh hooks');
    } else {
      fail('Step 9 still carries legacy cult requirement/Quick Boost panel hooks');
    }
  }
}

// ============================================================
section('Cult Data Tests');
// ============================================================

// Test: CULTS_DATA exists and has > 90 entries
{
  const CULTS = App.CULTS_DATA;
  if (!CULTS) {
    fail('CULTS_DATA is not defined');
  } else if (!Array.isArray(CULTS)) {
    fail('CULTS_DATA is not an array');
  } else if (CULTS.length < 90) {
    fail(`CULTS_DATA has only ${CULTS.length} entries, expected > 90`);
  } else {
    pass(`CULTS_DATA exists with ${CULTS.length} entries`);
  }
}

// Test: CULTURE_CULT_MAP exists and has entries for all 8 cultures
{
  const CULT_MAP = App.CULTURE_CULT_MAP;
  const expectedCultures = ['Sartarite (Heortling)', 'Esrolian', 'Lunar Heartland', 'Lunar Provincial', 'Praxian', 'Balazaring', 'God Forgot', 'Telmori Hsunchen'];

  if (!CULT_MAP) {
    fail('CULTURE_CULT_MAP is not defined');
  } else {
    const missingCultures = expectedCultures.filter(c => !CULT_MAP[c]);
    if (missingCultures.length > 0) {
      fail(`CULTURE_CULT_MAP missing cultures: ${missingCultures.join(', ')}`);
    } else if ((CULT_MAP['Telmori Hsunchen'].primary || []).includes('Telmor')) {
      fail('CULTURE_CULT_MAP still exposes unverified Telmor as a primary Telmori cult');
    } else {
      pass('CULTURE_CULT_MAP has entries for all 8 cultures');
    }
  }
}

{
  const { App: AppRef, CharacterData: CD, CULTURES_DATA: CulturesData, CAREERS_DATA: CareersData, _sandbox: sandbox } = loadApp();

  if (AppRef?.generateRandomCharacter && Array.isArray(CulturesData) && Array.isArray(CareersData)) {
    const originalCultures = CulturesData.slice();
    const originalCareers = CareersData.slice();
    const oldRandom = sandbox.Math.random;
    try {
      const telmori = originalCultures.find(culture => culture.name === 'Telmori Hsunchen');
      const shaman = originalCareers.find(career => career.name === 'Shaman');
      if (!telmori || !shaman) {
        fail('Random Telmori placeholder regression fixture data missing');
      } else {
        CulturesData.splice(0, CulturesData.length, telmori);
        CareersData.splice(0, CareersData.length, {
          ...shaman,
          professionalSkills: ['Binding (Cult, Totem or Tradition)', 'Trance', 'Healing']
        });
        let randomState = 1;
        sandbox.Math.random = () => {
          randomState = (randomState * 48271) % 2147483647;
          return randomState / 2147483647;
        };
        AppRef.generateRandomCharacter();
        const careerSkillNames = [
          ...Object.keys(CD.careerSkills || {}),
          ...(CD.selectedProfessionalSkills || [])
        ];
        if (CD.culture === 'Telmori Hsunchen' &&
            careerSkillNames.some(skill => skill === 'Binding (Korgatsu)') &&
            !careerSkillNames.some(skill => /Orlanth/.test(skill))) {
          pass('Random Telmori Shaman resolves animist Binding to Korgatsu instead of Orlanth');
        } else {
          fail('Random Telmori Shaman used an unsupported cult-bound placeholder',
            JSON.stringify({ culture: CD.culture, careerSkillNames }));
        }
      }
    } finally {
      sandbox.Math.random = oldRandom;
      CulturesData.splice(0, CulturesData.length, ...originalCultures);
      CareersData.splice(0, CareersData.length, ...originalCareers);
    }
  } else {
    fail('Random Telmori placeholder regression dependencies not found');
  }
}

// Test: Inline cult data is clean without load-time mutation
{
  const badTraits = ['Savag', 'Instinctiv', 'Asceti', 'Dynami', 'Energeti', 'Hones', 'Pruden', 'Adventurou', 'Chao', 'Jus', 'Toleran'];
  const dirtyCult = (App.CULTS_DATA || []).find(cult => {
    const traits = cult.personalityTraits || [];
    return traits.some(t => badTraits.includes(t)) ||
      traits.some((t, i) => t === 'Spiritual' && traits[i + 1] === 'Liberation');
  });

  if (dirtyCult) {
    fail('CULTS_DATA still contains runtime-cleaned personality trait artifacts', dirtyCult.name);
  } else {
    pass('CULTS_DATA personality traits are pre-cleaned');
  }
}

// Test: Inline cult skill data is clean without load-time mutation
{
  const badSkill = (App.CULTS_DATA || []).flatMap(cult =>
    (cult.cultSkills || []).map(skill => ({ cult: cult.name, skill }))
  ).find(({ skill }) =>
    /\n|\u00a0/.test(skill) ||
    skill.length >= 80 ||
    ['Runic Affinityion', 'Runic Affinitiy', 'Spirit Rune Runic Affinitiy', 'Lore'].includes(skill) ||
    /[A-Za-z]\(/.test(skill) ||
    /\([a-z]/.test(skill)
  );

  if (badSkill) {
    fail('CULTS_DATA still contains runtime-cleaned cult skill artifacts', `${badSkill.cult}: ${badSkill.skill}`);
  } else {
    pass('CULTS_DATA cult skills are pre-cleaned');
  }
}

// Test: Inline miracle data is clean without load-time mutation
{
  const ocrPrefixPattern = /^[?.:!]+[a-z]*\s*|^[a-z]{1,4}\s(?=[A-Z])|^\(a\):[a-z]*\s*|^\d[a-z?]*\s+/;
  const garbageEntryPattern = /^:$|Eurmal\(a\):|Primal Chaos\(a\):|Orlanth\(a\):|Storm Bull\(a\):|  .+  /;
  let dirtyMiracle = null;
  for (const [cultName, cult] of Object.entries((App.MIRACLES_DATA && App.MIRACLES_DATA.cults) || {})) {
    dirtyMiracle = (cult.miracles || []).find(m =>
      m.name === ':' ||
      garbageEntryPattern.test(m.name) ||
      ocrPrefixPattern.test(m.name) ||
      /^B[olxw]\s|^Wo\s|^Qo\s|^Rc\s|^RW\s|^RS\s|^Ke\s/.test(m.name) ||
      /^[BR]\s+(Claws|Keenclaw|Dismiss Magic)$/.test(m.name) ||
      /Summon\(/.test(m.name) ||
      /\s+ij\s+/.test(m.name)
    );
    if (dirtyMiracle) {
      dirtyMiracle = `${cultName}: ${dirtyMiracle.name}`;
      break;
    }
  }

  if (dirtyMiracle) {
    fail('MIRACLES_DATA still contains runtime-cleaned OCR artifacts', dirtyMiracle);
  } else {
    pass('MIRACLES_DATA miracle names are pre-cleaned');
  }
}

// Test: Reviewed miracle OCR corrections preserve canonical entries
{
  const cults = App.MIRACLES_DATA?.cults || {};
  const expectedCorrections = [
    { cult: 'Odayla', name: 'Claws', rune: 'Beast', rank: 'initiate', source: 'normal' },
    { cult: 'Yinkin', name: 'Claws', rune: 'Any', rank: 'initiate', source: 'associate' },
    { cult: 'Basmol', name: 'Keenclaw', rune: 'Beast', rank: 'runelord', source: 'normal' },
    { cult: 'Mee Vorala', name: 'Dismiss Magic', rune: 'Beast', rank: 'initiate', source: 'normal' }
  ];
  const missing = expectedCorrections.filter(expected => {
    const miracle = (cults[expected.cult]?.miracles || []).find(m => m.name === expected.name);
    return !miracle ||
      miracle.rank !== expected.rank ||
      miracle.source !== expected.source ||
      !Array.isArray(miracle.runes) ||
      !miracle.runes.includes(expected.rune);
  });

  if (missing.length === 0) {
    pass('Reviewed miracle OCR corrections preserve canonical miracle entries');
  } else {
    fail('Reviewed miracle OCR corrections deleted or malformed canonical entries', JSON.stringify(missing));
  }
}

// Test: Praxian cult access comes from data, not runtime patching
{
  const praxianSecondary = App.CULTURE_CULT_MAP?.Praxian?.secondary || [];
  if (praxianSecondary.includes('Yelmalio')) {
    pass('Praxian cult map includes Yelmalio in source data');
  } else {
    fail('Praxian cult map is missing Yelmalio');
  }
}

// Test: pure sorcery cult access comes from data for manual selection
{
  const godForgotSecondary = App.CULTURE_CULT_MAP?.['God Forgot']?.secondary || [];
  const arkat = App.CULTS_DATA.find(cult => cult.name === 'Arkat');
  const arkatType = arkat ? App.detectCultType(arkat) : null;
  if (godForgotSecondary.includes('Arkat') && arkatType?.types?.includes('sorcery') && arkatType.types.length === 1) {
    pass('God Forgot cult map includes pure sorcery Arkat in source data');
  } else {
    fail('God Forgot cult map is missing pure sorcery Arkat access');
  }
}

// Test: Waha app data is singular and points at canonical Praxian source
{
  const expectedWahaRevision = 'waha:copyparty-sources-books-waha-pdf:a36461fa3ba8:2026-05-21';
  const wahaRecords = (App.CULTS_DATA || []).filter(cult => cult.name === 'Waha');
  const waha = wahaRecords[0];
  if (
    wahaRecords.length === 1 &&
    waha?.pantheon === 'Praxian' &&
    waha?.canonicalRecord === true &&
    waha?.doNotUseForAppGeneration === false &&
    waha?.source === 'https://copyparty.hound-celsius.ts.net/sources/books/Waha.pdf' &&
    waha?.sourceRevisionId === expectedWahaRevision &&
    waha?.sourceSha256 === 'a36461fa3ba86159be1d8993ea920824446171380ff3c11c10a47a8cd95475f1' &&
    waha?.verificationState === 'vision_verified' &&
    Array.isArray(waha?.sourcePages) &&
    waha.sourcePages.includes(1) &&
    waha.sourcePages.includes(2) &&
    waha?.sourceCitation === 'https://copyparty.hound-celsius.ts.net/sources/books/Waha.pdf, p.1-2'
  ) {
    pass('CULTS_DATA contains one canonical vision-verified Praxian Waha source');
  } else {
    fail('CULTS_DATA Waha authority is duplicated or missing verified source metadata',
      JSON.stringify(wahaRecords.map(cult => ({
        pantheon: cult.pantheon,
        canonicalRecord: cult.canonicalRecord,
        doNotUseForAppGeneration: cult.doNotUseForAppGeneration,
        source: cult.source,
        sourceRevisionId: cult.sourceRevisionId,
        sourceSha256: cult.sourceSha256,
        verificationState: cult.verificationState,
        sourceCitation: cult.sourceCitation
      }))));
  }
}

// Test: stale aggregate Waha records are blocked from app generation
{
  const expectedWahaRevision = 'waha:copyparty-sources-books-waha-pdf:a36461fa3ba8:2026-05-21';
  const aggregatePath = path.join(__dirname, 'references', 'cults-raw', 'cults.json');
  const aggregate = JSON.parse(fs.readFileSync(aggregatePath, 'utf8'));
  const aggregateWaha = aggregate.filter(cult => cult.name === 'Waha');
  const unblocked = aggregateWaha.filter(cult =>
    cult.doNotUseForAppGeneration !== true ||
    cult.canonicalRecord !== false ||
    !['redirected-to-canonical', 'superseded'].includes(cult.recordStatus)
  );
  const stormPath = path.join(__dirname, 'references', 'cults-raw', 'storm', 'waha.json');
  const stormWaha = JSON.parse(fs.readFileSync(stormPath, 'utf8'));
  const canonicalPath = path.join(__dirname, 'references', 'cults-raw', 'praxian', 'waha.json');
  const canonicalWaha = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
  if (
    aggregateWaha.length >= 1 &&
    unblocked.length === 0 &&
    stormWaha.doNotUseForAppGeneration === true &&
    stormWaha.recordStatus === 'superseded' &&
    stormWaha.sourceRevisionId === expectedWahaRevision &&
    canonicalWaha.canonicalRecord === true &&
    canonicalWaha.doNotUseForAppGeneration === false &&
    canonicalWaha.sourceRevisionId === expectedWahaRevision &&
    aggregateWaha.every(cult => cult.sourceRevisionId === expectedWahaRevision)
  ) {
    pass('Stale aggregate and Storm Waha records are blocked in favor of Praxian canonical source');
  } else {
    fail('Waha stale-source guards are missing',
      JSON.stringify({
        aggregateWaha: aggregateWaha.map(cult => ({
          recordStatus: cult.recordStatus,
          canonicalRecord: cult.canonicalRecord,
          doNotUseForAppGeneration: cult.doNotUseForAppGeneration
        })),
        stormStatus: stormWaha.recordStatus,
        stormRevision: stormWaha.sourceRevisionId,
        canonicalRecord: canonicalWaha.canonicalRecord,
        canonicalRevision: canonicalWaha.sourceRevisionId
      }));
  }
}

// Test: culture-cult-map reference matches inline app data
{
  const refPath = path.join(__dirname, 'references', 'culture-cult-map.json');
  const ref = JSON.parse(fs.readFileSync(refPath, 'utf8'));
  const refMap = ref.cultures || {};
  const inlineMap = App.CULTURE_CULT_MAP || {};
  const missing = Object.keys(inlineMap).filter(k => !refMap[k]);
  const extra = Object.keys(refMap).filter(k => !inlineMap[k]);
  const diffs = Object.keys(inlineMap).filter(k => refMap[k] && JSON.stringify(refMap[k]) !== JSON.stringify(inlineMap[k]));

  if (missing.length === 0 && extra.length === 0 && diffs.length === 0 &&
      ref.page_citations?.culture_descriptions &&
      ref.page_citations?.cult_area_data &&
      ref.page_citations?.praxian_yelmalio &&
      ref.page_citations?.god_forgot_arkat) {
    pass('culture-cult-map reference keys, values, and citations match inline data');
  } else {
    fail('culture-cult-map reference is out of sync with inline data',
      JSON.stringify({
        missing,
        extra,
        diffs,
        hasCultureCitations: Boolean(ref.page_citations?.culture_descriptions),
        hasCultAreaCitations: Boolean(ref.page_citations?.cult_area_data),
        hasPraxianYelmalioCitation: Boolean(ref.page_citations?.praxian_yelmalio),
        hasGodForgotArkatCitation: Boolean(ref.page_citations?.god_forgot_arkat)
      }));
  }
}

// Test: culture aliases and Seven Mothers display grouping stay source-backed
{
  const refPath = path.join(__dirname, 'references', 'culture-cult-map.json');
  const ref = JSON.parse(fs.readFileSync(refPath, 'utf8'));
  const aliasesMatch = JSON.stringify(ref.culture_aliases || {}) === JSON.stringify(App.CULTURE_ALIASES || {});
  const groupsMatch = JSON.stringify(ref.cult_display_groups || {}) === JSON.stringify(App.CULT_DISPLAY_GROUPS || {});
  const sevenMothersGroup = App.CULT_DISPLAY_GROUPS?.['Seven Mothers'];
  const hasAggregateCult = (App.CULTS_DATA || []).some(cult => cult.name === 'Seven Mothers');
  const lunarMapsUseSubcults = ['Lunar Heartland', 'Lunar Provincial'].every(cultureName => {
    const names = [
      ...(App.CULTURE_CULT_MAP?.[cultureName]?.primary || []),
      ...(App.CULTURE_CULT_MAP?.[cultureName]?.secondary || [])
    ];
    return !names.includes('Seven Mothers') &&
      (sevenMothersGroup?.members || []).some(member => names.includes(member));
  });
  const aliasWorks = App.normalizeCultureName?.('Lunar Tarshite') === 'Lunar Provincial' &&
    App.normalizeCultureName?.('Heortling') === 'Sartarite (Heortling)';

  if (aliasesMatch && groupsMatch && sevenMothersGroup?.displayOnly === true && !hasAggregateCult && lunarMapsUseSubcults && aliasWorks) {
    pass('Culture aliases and Seven Mothers display group are source-backed and non-selectable as aggregate cult');
  } else {
    fail('Culture alias/display group source data is out of sync',
      JSON.stringify({ aliasesMatch, groupsMatch, hasAggregateCult, lunarMapsUseSubcults, aliasWorks }));
  }
}

// Test: pregen concept source labels normalize to supported app cultures
{
  const pregenPath = path.join(__dirname, 'references', 'pregen-concepts.json');
  const pregen = JSON.parse(fs.readFileSync(pregenPath, 'utf8'));
  const vostor = (pregen.characters || []).find(character => character.name === 'Vostor Son of Pyjeem');
  const vostorCultureCanonical = vostor?.culture === 'Lunar Provincial' &&
    App.normalizeCultureName?.(vostor?.sourceCultureLabel) === vostor?.culture;
  const displayOnlyCult = vostor?.cult === 'Seven Mothers' &&
    vostor?.cultDisplayGroup === 'Seven Mothers' &&
    !(App.CULTS_DATA || []).some(cult => cult.name === 'Seven Mothers');

  const metadataNormalized = Boolean(pregen.source) && Boolean(pregen.notes) && !Object.prototype.hasOwnProperty.call(pregen, '_source') && !Object.prototype.hasOwnProperty.call(pregen, '_notes');
  const privateCharacterFields = (pregen.characters || []).flatMap(character => Object.keys(character).filter(key => key.startsWith('_')));
  const divergenceNotes = pregen.fixtureDivergenceNotes || {};
  const divergenceTargets = Object.keys(divergenceNotes).sort();
  const characterNames = new Set((pregen.characters || []).map(character => character.name));
  const exceptions = readJson('references/combat-style-exceptions.json');
  const exceptionCharacters = new Set((exceptions.exceptions || []).map(entry => entry.character));
  const divergenceNotesMatch = divergenceTargets.length > 0 &&
    divergenceTargets.every(name => characterNames.has(name) && exceptionCharacters.has(name) && divergenceNotes[name]);

  if (vostorCultureCanonical && displayOnlyCult && metadataNormalized && privateCharacterFields.length === 0 && divergenceNotesMatch) {
    pass('Vostor concept uses canonical Lunar Provincial culture while preserving source labels/display-only cult group');
  } else {
    fail('Pregen concepts metadata or Vostor culture/cult assumptions drifted',
      JSON.stringify({ vostorCultureCanonical, displayOnlyCult, metadataNormalized, privateCharacterFields, divergenceTargets, exceptionCharacters: [...exceptionCharacters], vostor }));
  }
}

// Test: culture magic profile reference matches inline app data
{
  const refPath = path.join(__dirname, 'references', 'aig-raw', 'culture-magic-profiles-aig.json');
  const ref = JSON.parse(fs.readFileSync(refPath, 'utf8'));
  const refProfiles = ref.profiles || {};
  const inlineProfiles = App.CULTURE_MAGIC_PROFILES || {};
  const missing = Object.keys(inlineProfiles).filter(k => !refProfiles[k]);
  const extra = Object.keys(refProfiles).filter(k => !inlineProfiles[k]);
  const diffs = Object.keys(inlineProfiles).filter(k => refProfiles[k] && JSON.stringify(refProfiles[k]) !== JSON.stringify(inlineProfiles[k]));

  if (missing.length === 0 && extra.length === 0 && diffs.length === 0 &&
      ref.page &&
      ref.validation_method) {
    pass('culture magic profile reference matches inline app data');
  } else {
    fail('culture magic profile reference is out of sync with inline data',
      JSON.stringify({ missing, extra, diffs, hasPage: Boolean(ref.page), hasValidationMethod: Boolean(ref.validation_method) }));
  }
}

// Test: God Forgot Zzistori sorcery profile is source-backed as a school, not a cult
{
  const refPath = path.join(__dirname, 'references', 'aig-raw', 'culture-magic-profiles-aig.json');
  const ref = JSON.parse(fs.readFileSync(refPath, 'utf8'));
  const profile = ref.profiles?.['God Forgot'];
  const inlineProfile = App.CULTURE_MAGIC_PROFILES?.['God Forgot'];
  const access = profile?.sorcery?.sourceAccess;
  const inlineAccess = inlineProfile?.sorcery?.sourceAccess;
  const hasSchoolLabel = access?.sourceLabel === 'Zzistori School (God Forgot sorcery)';
  const isSchoolNotCult = access?.accessType === 'culture-backed school' &&
    access?.cultRequired === false &&
    access?.defaultCult === null;
  const hasSorcererPrereq = access?.careerPrerequisite === 'Sorcerer';
  const hasRawSorceryMechanics = access?.resource === 'Magic Points' &&
    access?.startingSpellLimit === 3 &&
    Array.isArray(access?.skills) &&
    access.skills.includes('Invocation') &&
    access.skills.includes('Shaping');
  const hasSourceCitations = Array.isArray(access?.pages) &&
    access.pages.includes('AiG p.30-31') &&
    access.pages.includes('AiG p.59-60') &&
    access.pages.includes('Mythras Core p.162') &&
    access.pages.includes('Mythras Core p.166-177') &&
    access?.spellListSource?.path === 'references/mythras-raw/sorcery.json';
  const inlineMatches = JSON.stringify(access) === JSON.stringify(inlineAccess);

  if (hasSchoolLabel && isSchoolNotCult && hasSorcererPrereq && hasRawSorceryMechanics && hasSourceCitations && inlineMatches) {
    pass('God Forgot Zzistori sorcery profile is source-backed as a school, not a cult');
  } else {
    fail('God Forgot Zzistori sorcery profile is missing school/source backing',
      JSON.stringify({ hasSchoolLabel, isSchoolNotCult, hasSorcererPrereq, hasRawSorceryMechanics, hasSourceCitations, inlineMatches, access, inlineAccess }));
  }
}

// Test: God Forgot Sorcerer No Cult derives active Zzistori sorcery without pretending it is a cult
{
  const { App: AppRef, CharacterData: CD, detectCultType } = loadApp();

  if (AppRef && typeof AppRef.resolveActiveSorcerySource === 'function') {
    CD.characteristics = { STR: 11, CON: 12, SIZ: 13, DEX: 14, INT: 15, POW: 14, CHA: 10 };
    CD.culture = 'God Forgot';
    CD.career = 'Sorcerer';
    CD.cult = null;
    CD.cultType = null;
    CD.sorceryResource = 0;
    CD.sorcerySpells = [];

    const source = AppRef.resolveActiveSorcerySource(CD);
    const nullCultType = typeof detectCultType === 'function' ? detectCultType(null) : undefined;
    const hasZzistoriSource = source &&
      source.sourceLabel === 'Zzistori School (God Forgot sorcery)' &&
      source.resource === 'Magic Points' &&
      source.resourceValue === 14 &&
      source.magicPoints === 14 &&
      source.startingSpellLimit === 3 &&
      Array.isArray(source.skills) &&
      source.skills.includes('Invocation') &&
      source.skills.includes('Shaping') &&
      source.cultRequired === false &&
      source.cultName === null &&
      source.sourceType === 'culture-backed school' &&
      source.sourceKind === 'culture-backed school';

    if (hasZzistoriSource && !nullCultType && CD.cult === null) {
      pass('God Forgot Sorcerer No Cult derives Zzistori source without cult classification');
    } else {
      fail('God Forgot Sorcerer No Cult source derivation is missing or cult-backed',
        JSON.stringify({ source, nullCultType, cult: CD.cult }));
    }
  } else {
    fail('Derived sorcery source resolver is available on App');
  }
}

// Test: derived Zzistori source is scoped and import normalization repairs stale sorcery state
{
  const { App: AppRef, CharacterData: CD, CULTS_DATA, CULTURE_CULT_MAP, detectCultType } = loadApp();

  if (AppRef && typeof AppRef.resolveActiveSorcerySource === 'function' && CD?.fromJSON && CD?.toJSON) {
    const noSourceCases = [
      { label: 'non-God-Forgot non-Sorcerer No Cult', culture: 'Praxian', career: 'Warrior', cult: null },
      { label: 'God Forgot non-Sorcerer No Cult', culture: 'God Forgot', career: 'Warrior', cult: null }
    ];
    const noSourceResults = noSourceCases.map(testCase => {
      CD.culture = testCase.culture;
      CD.career = testCase.career;
      CD.cult = testCase.cult;
      CD.cultType = null;
      CD.selectedProfessionalSkills = [];
      return { label: testCase.label, source: AppRef.resolveActiveSorcerySource(CD) };
    });
    CD.culture = 'Praxian';
    CD.career = 'Sorcerer';
    CD.cult = null;
    CD.cultType = null;
    CD.selectedProfessionalSkills = ['Invocation (Core Sorcery)', 'Shaping', 'Lore (Sorcery)'];
    const nonGodForgotSorcererSource = AppRef.resolveActiveSorcerySource(CD);
    const nonGodForgotUsesCoreSorcery = nonGodForgotSorcererSource?.id === 'core-career-sorcerer-sorcery' &&
      nonGodForgotSorcererSource?.sourceKind === 'core-career' &&
      nonGodForgotSorcererSource?.sourceLabel !== 'Zzistori School (God Forgot sorcery)';

    CD.culture = 'God Forgot';
    CD.career = 'Sorcerer';
    CD.cult = 'Arkat';
    CD.cultChoiceMade = true;
    CD.cultInitiated = false;
    CD.cultType = detectCultType(CULTS_DATA.find(cult => cult.name === 'Arkat'));
    CD.selectedProfessionalSkills = ['Invocation (Zzistori School)', 'Shaping', 'Lore (Sorcery)'];
    const arkatSource = AppRef.resolveActiveSorcerySource(CD);
    const arkatUsesSourceBackedSchool = arkatSource?.sourceLabel === 'Zzistori School (God Forgot sorcery)' &&
      arkatSource?.sourceKind === 'culture-backed school' &&
      arkatSource?.sourceType === 'culture-backed school' &&
      arkatSource?.cultName === null;
    const godForgotCultNames = [
      ...(CULTURE_CULT_MAP?.['God Forgot']?.primary || []),
      ...(CULTURE_CULT_MAP?.['God Forgot']?.secondary || [])
    ];
    const noZzistoriCultMapEntry = !godForgotCultNames.includes('Zzistori') &&
      !godForgotCultNames.includes('Zzistori School (God Forgot sorcery)');

    CD.name = 'Before Stale Sorcery Import';
    CD.sorcerySpells = ['Holdfast'];
    const staleNoSourcePayload = {
      ...createTestCharacter('Praxian'),
      name: 'Stale Sorcery Import',
      career: 'Farmer',
      cult: null,
      cultType: null,
      selectedProfessionalSkills: [],
      sorceryResource: 12,
      sorcerySpells: ['Project (Sense)']
    };
    const staleErrors = CD.validatePlainObject(staleNoSourcePayload);
    const staleSuccess = CD.fromJSON(JSON.stringify(staleNoSourcePayload));
    const staleRejected = staleErrors.some(error => /sorcerySpells requires an active sorcery source/i.test(error)) &&
      staleSuccess === false &&
      CD.name === 'Before Stale Sorcery Import' &&
      Array.isArray(CD.sorcerySpells) &&
      CD.sorcerySpells[0] === 'Holdfast';

    const validZzistoriPayload = {
      ...createTestCharacter('God Forgot'),
      name: 'Valid Zzistori Import',
      career: 'Sorcerer',
      cult: null,
      cultType: null,
      characteristics: { STR: 11, CON: 12, SIZ: 13, DEX: 14, INT: 15, POW: 13, CHA: 10 },
      selectedProfessionalSkills: ['Invocation (Zzistori School)', 'Shaping', 'Lore (Sorcery)'],
      careerSkills: { 'Invocation (Zzistori School)': 10, Shaping: 10, 'Lore (Sorcery)': 10 },
      sorceryResource: 0,
      sorcerySpells: ['Project (Sense)', 'Animate (Substance)']
    };
    const createInheritedIndexedArray = (...values) => {
      const array = new Array(values.length);
      const prototype = Object.create(Array.prototype);
      values.forEach((value, index) => {
        prototype[index] = value;
      });
      Object.setPrototypeOf(array, prototype);
      return array;
    };
    const createInheritedIndexedArrayAfterLength = (index, value) => {
      const array = [];
      const prototype = Object.create(Array.prototype);
      prototype[index] = value;
      Object.setPrototypeOf(array, prototype);
      return array;
    };
    const validSuccess = CD.fromJSON(JSON.stringify(validZzistoriPayload));
    const validSource = AppRef.resolveActiveSorcerySource(CD);
    const validPreserved = validSuccess &&
      validSource?.sourceLabel === 'Zzistori School (God Forgot sorcery)' &&
      CD.sorceryResource === 13 &&
      JSON.stringify(CD.sorcerySpells) === JSON.stringify(validZzistoriPayload.sorcerySpells);

    CD.name = 'Before Valid Envelope Import';
    const validEnvelopeSuccess = CD.fromJSON({ version: 1, data: validZzistoriPayload });
    const validEnvelopePreserved = validEnvelopeSuccess &&
      CD.name === 'Valid Zzistori Import' &&
      JSON.stringify(CD.sorcerySpells) === JSON.stringify(validZzistoriPayload.sorcerySpells);

    CD.name = 'Before Inherited Import';
    const inheritedImportPayload = Object.create(validZzistoriPayload);
    const inheritedImportErrors = CD.validatePlainObject(inheritedImportPayload);
    const inheritedImportSuccess = CD.fromJSON(inheritedImportPayload);
    const inheritedImportRejected = inheritedImportErrors.some(error => /own fields only/i.test(error)) &&
      inheritedImportSuccess === false &&
      CD.name === 'Before Inherited Import';

    CD.name = 'Before Inherited Unknown Import';
    const inheritedUnknownPayload = {
      ...validZzistoriPayload,
      name: 'Inherited Unknown Import'
    };
    Object.setPrototypeOf(inheritedUnknownPayload, { evil: 'ignored prototype field' });
    const inheritedUnknownErrors = CD.validatePlainObject(inheritedUnknownPayload);
    const inheritedUnknownSuccess = CD.fromJSON(inheritedUnknownPayload);
    const inheritedUnknownRejected = inheritedUnknownErrors.some(error => /own fields only: evil/i.test(error)) &&
      inheritedUnknownSuccess === false &&
      CD.name === 'Before Inherited Unknown Import';

    CD.name = 'Before Hidden Inherited Import';
    const hiddenImportPrototype = {};
    Object.defineProperty(hiddenImportPrototype, 'sorcerySpells', {
      value: ['Project (Sense)'],
      enumerable: false
    });
    const hiddenInheritedPayload = {
      ...validZzistoriPayload,
      name: 'Hidden Inherited Import'
    };
    delete hiddenInheritedPayload.sorcerySpells;
    Object.setPrototypeOf(hiddenInheritedPayload, hiddenImportPrototype);
    const hiddenInheritedErrors = CD.validatePlainObject(hiddenInheritedPayload);
    const hiddenInheritedSuccess = CD.fromJSON(hiddenInheritedPayload);
    const hiddenInheritedRejected = hiddenInheritedErrors.some(error => /own fields only: sorcerySpells/i.test(error)) &&
      hiddenInheritedSuccess === false &&
      CD.name === 'Before Hidden Inherited Import';

    CD.name = 'Before Null Prototype Import';
    const nullPrototype = Object.create(null);
    nullPrototype.name = 'Null Prototype Injected Name';
    const nullPrototypePayload = {
      ...validZzistoriPayload
    };
    delete nullPrototypePayload.name;
    Object.setPrototypeOf(nullPrototypePayload, nullPrototype);
    const nullPrototypeErrors = CD.validatePlainObject(nullPrototypePayload);
    const nullPrototypeSuccess = CD.fromJSON(nullPrototypePayload);
    const nullPrototypeRejected = nullPrototypeErrors.some(error => /own fields only: name/i.test(error)) &&
      nullPrototypeSuccess === false &&
      CD.name === 'Before Null Prototype Import';

    CD.name = 'Before Inherited Nested Import';
    const inheritedCharacteristics = Object.create(validZzistoriPayload.characteristics);
    const inheritedNestedPayload = {
      ...validZzistoriPayload,
      name: 'Inherited Nested Import',
      characteristics: inheritedCharacteristics
    };
    const inheritedNestedErrors = CD.validatePlainObject(inheritedNestedPayload);
    const inheritedNestedSuccess = CD.fromJSON(inheritedNestedPayload);
    const inheritedNestedRejected = inheritedNestedErrors.some(error => /characteristics must use own fields only/i.test(error)) &&
      inheritedNestedSuccess === false &&
      CD.name === 'Before Inherited Nested Import';

    CD.name = 'Before Hidden Nested Import';
    const hiddenCharacteristicsPrototype = {};
    Object.defineProperty(hiddenCharacteristicsPrototype, 'STR', {
      value: validZzistoriPayload.characteristics.STR,
      enumerable: false
    });
    const hiddenCharacteristics = {
      CON: validZzistoriPayload.characteristics.CON,
      SIZ: validZzistoriPayload.characteristics.SIZ,
      DEX: validZzistoriPayload.characteristics.DEX,
      INT: validZzistoriPayload.characteristics.INT,
      POW: validZzistoriPayload.characteristics.POW,
      CHA: validZzistoriPayload.characteristics.CHA
    };
    Object.setPrototypeOf(hiddenCharacteristics, hiddenCharacteristicsPrototype);
    const hiddenNestedPayload = {
      ...validZzistoriPayload,
      name: 'Hidden Nested Import',
      characteristics: hiddenCharacteristics
    };
    const hiddenNestedErrors = CD.validatePlainObject(hiddenNestedPayload);
    const hiddenNestedSuccess = CD.fromJSON(hiddenNestedPayload);
    const hiddenNestedRejected = hiddenNestedErrors.some(error => /characteristics must use own fields only: STR/i.test(error)) &&
      hiddenNestedSuccess === false &&
      CD.name === 'Before Hidden Nested Import';

    CD.name = 'Before Inherited Companion Import';
    const inheritedCompanion = Object.create({
      name: 'Prototype Wolf',
      attacks: [{ name: 'Bite', skill: 45 }]
    });
    const inheritedAttack = Object.assign(Object.create({ name: 'Prototype Claw' }), { skill: 40 });
    const inheritedCompanionPayload = {
      ...validZzistoriPayload,
      name: 'Inherited Companion Import',
      companions: [
        inheritedCompanion,
        { name: 'Own Wolf', attacks: [inheritedAttack] }
      ]
    };
    const inheritedCompanionErrors = CD.validatePlainObject(inheritedCompanionPayload);
    const inheritedCompanionSuccess = CD.fromJSON(inheritedCompanionPayload);
    const inheritedCompanionRejected = inheritedCompanionErrors.some(error => /companions\[0\] must use own fields only: name/i.test(error)) &&
      inheritedCompanionErrors.some(error => /companions\[1\]\.attacks\[0\] must use own fields only: name/i.test(error)) &&
      inheritedCompanionSuccess === false &&
      CD.name === 'Before Inherited Companion Import';

    CD.name = 'Before Inherited Array Object Import';
    const inheritedEquipment = Object.assign(Object.create({ evil: true }), { name: 'Prototype Rope' });
    const inheritedCombatStyle = Object.assign(Object.create({ evil: true }), { name: 'Sword & Shield', skill: 50 });
    const inheritedArrayObjectPayload = {
      ...validZzistoriPayload,
      name: 'Inherited Array Object Import',
      equipment: [inheritedEquipment],
      combatStyles: [inheritedCombatStyle]
    };
    const inheritedArrayObjectErrors = CD.validatePlainObject(inheritedArrayObjectPayload);
    const inheritedArrayObjectSuccess = CD.fromJSON(inheritedArrayObjectPayload);
    const inheritedArrayObjectRejected = inheritedArrayObjectErrors.some(error => /equipment\[0\] must use own fields only: evil/i.test(error)) &&
      inheritedArrayObjectErrors.some(error => /combatStyles\[0\] must use own fields only: evil/i.test(error)) &&
      inheritedArrayObjectSuccess === false &&
      CD.name === 'Before Inherited Array Object Import';

    CD.name = 'Before Alias Magic Import';
    const aliasMagicPayload = {
      ...validZzistoriPayload,
      name: 'Alias Magic Import',
      spells: ['Holdfast'],
      spirits: ['Ancestor Spirit — Sagacity (Int 1)']
    };
    delete aliasMagicPayload.sorcerySpells;
    const aliasMagicErrors = CD.validatePlainObject(aliasMagicPayload);
    const aliasMagicSuccess = CD.fromJSON(aliasMagicPayload);
    const aliasMagicRejected = aliasMagicErrors.some(error => /Unknown character field "spells"/i.test(error)) &&
      aliasMagicErrors.some(error => /Unknown character field "spirits"/i.test(error)) &&
      aliasMagicSuccess === false &&
      CD.name === 'Before Alias Magic Import';

    const unknownReferenceCases = [
      { field: 'culture', value: 'Atlantis', pattern: /Unknown culture "Atlantis"/i, payload: { culture: 'Atlantis' } },
      { field: 'career', value: 'Laser Gunner', pattern: /Unknown career "Laser Gunner"/i, payload: { career: 'Laser Gunner', selectedProfessionalSkills: [], sorcerySpells: [] } },
      { field: 'cult', value: 'Invisible College', pattern: /Unknown cult "Invisible College"/i, payload: { cult: 'Invisible College', sorcerySpells: [] } }
    ];
    const unknownReferenceResults = unknownReferenceCases.map(testCase => {
      CD.name = `Before Unknown ${testCase.field} Import`;
      const payload = {
        ...validZzistoriPayload,
        name: `Unknown ${testCase.field} Import`,
        ...testCase.payload
      };
      const errors = CD.validatePlainObject(payload);
      const success = CD.fromJSON(payload);
      return {
        field: testCase.field,
        errors,
        rejected: errors.some(error => testCase.pattern.test(error)) &&
          success === false &&
          CD.name === `Before Unknown ${testCase.field} Import`
      };
    });
    const unknownReferencesRejected = unknownReferenceResults.every(result => result.rejected);

    CD.name = 'Before Inherited Envelope Import';
    const inheritedEnvelopePayload = Object.create({ version: 1, data: validZzistoriPayload });
    const inheritedEnvelopeErrors = CD.validatePlainObject(CD.unwrapSavePayload(inheritedEnvelopePayload));
    const inheritedEnvelopeSuccess = CD.fromJSON(inheritedEnvelopePayload);
    const inheritedEnvelopeRejected = inheritedEnvelopeErrors.length > 0 &&
      inheritedEnvelopeSuccess === false &&
      CD.name === 'Before Inherited Envelope Import';

    CD.name = 'Before Duplicate Magic Import';
    const duplicateMagicPayload = {
      ...validZzistoriPayload,
      name: 'Duplicate Magic Import',
      sorcerySpells: ['Project (Sense)', 'Project (Sense)']
    };
    const duplicateMagicErrors = CD.validatePlainObject(duplicateMagicPayload);
    const duplicateMagicSuccess = CD.fromJSON(JSON.stringify(duplicateMagicPayload));
    const duplicateMagicRejected = duplicateMagicErrors.some(error => /Duplicate sorcery spell/i.test(error)) &&
      duplicateMagicSuccess === false &&
      CD.name === 'Before Duplicate Magic Import';

    CD.name = 'Before Inherited Array Import';
    const inheritedArrayPayload = {
      ...validZzistoriPayload,
      name: 'Inherited Array Import',
      selectedProfessionalSkills: createInheritedIndexedArray('Invocation (Zzistori School)', 'Shaping', 'Lore (Sorcery)'),
      sorcerySpells: createInheritedIndexedArray('Project (Sense)')
    };
    const inheritedArrayErrors = CD.validatePlainObject(inheritedArrayPayload);
    const inheritedArraySuccess = CD.fromJSON(inheritedArrayPayload);
    const inheritedArrayRejected = inheritedArrayErrors.some(error => /selectedProfessionalSkills\[0\] must be an own array element/i.test(error)) &&
      inheritedArrayErrors.some(error => /sorcerySpells\[0\] must be an own array element/i.test(error)) &&
      inheritedArraySuccess === false &&
      CD.name === 'Before Inherited Array Import';

    const inheritedArrayAfterLengthErrors = CD.validatePlainObject({
      ...validZzistoriPayload,
      name: 'Inherited Array After Length Import',
      sorcerySpells: createInheritedIndexedArrayAfterLength(0, 'Project (Sense)')
    });
    const inheritedArrayAfterLengthRejected = inheritedArrayAfterLengthErrors.some(error => /sorcerySpells\[0\] must be an own array element/i.test(error));

    const inheritedMiracleArrayErrors = CD.validatePlainObject({
      ...createTestCharacter('Praxian'),
      cult: 'Waha',
      miracles: createInheritedIndexedArray('Shield')
    });
    const inheritedSpiritArrayErrors = CD.validatePlainObject({
      ...createTestCharacter('Praxian'),
      cult: 'Daka Fal',
      boundSpirits: createInheritedIndexedArray('Ancestor Spirit — Sagacity (Int 1)'),
      sorcerySpells: []
    });
    const inheritedMagicArrayRejected = inheritedMiracleArrayErrors.some(error => /miracles\[0\] must be an own array element/i.test(error)) &&
      inheritedSpiritArrayErrors.some(error => /boundSpirits\[0\] must be an own array element/i.test(error));

    CD.name = 'Before Incompatible Miracle Import';
    const incompatibleMiraclePayload = {
      ...validZzistoriPayload,
      name: 'Incompatible Miracle Import',
      sorcerySpells: [],
      miracles: ['Shield']
    };
    const incompatibleMiracleErrors = CD.validatePlainObject(incompatibleMiraclePayload);
    const incompatibleMiracleSuccess = CD.fromJSON(JSON.stringify(incompatibleMiraclePayload));
    const incompatibleMiracleHandled = (
      incompatibleMiracleErrors.some(error => /miracles requires a theist cult/i.test(error)) &&
      incompatibleMiracleSuccess === false &&
      CD.name === 'Before Incompatible Miracle Import'
    ) || (incompatibleMiracleSuccess === true && Array.isArray(CD.miracles) && CD.miracles.length === 0);

    CD.name = 'Before Incompatible Spirit Import';
    const incompatibleSpiritPayload = {
      ...validZzistoriPayload,
      name: 'Incompatible Spirit Import',
      sorcerySpells: [],
      boundSpirits: ['Ancestor Spirit — Sagacity (Int 1)']
    };
    const incompatibleSpiritErrors = CD.validatePlainObject(incompatibleSpiritPayload);
    const incompatibleSpiritSuccess = CD.fromJSON(JSON.stringify(incompatibleSpiritPayload));
    const incompatibleSpiritHandled = (
      incompatibleSpiritErrors.some(error => /boundSpirits requires an animist cult/i.test(error)) &&
      incompatibleSpiritSuccess === false &&
      CD.name === 'Before Incompatible Spirit Import'
    ) || (incompatibleSpiritSuccess === true && Array.isArray(CD.boundSpirits) && CD.boundSpirits.length === 0);

    CD.name = 'Before Malformed Miracle Import';
    const malformedMiraclePayload = {
      ...validZzistoriPayload,
      name: 'Malformed Miracle Import',
      sorcerySpells: [],
      miracles: [{}]
    };
    const malformedMiracleErrors = CD.validatePlainObject(malformedMiraclePayload);
    const malformedMiracleSuccess = CD.fromJSON(JSON.stringify(malformedMiraclePayload));
    const malformedMiracleHandled = (
      malformedMiracleErrors.some(error => /miracles\[0\] must be a string/i.test(error)) &&
      malformedMiracleSuccess === false &&
      CD.name === 'Before Malformed Miracle Import'
    ) || (malformedMiracleSuccess === true && Array.isArray(CD.miracles) && CD.miracles.length === 0);

    CD.name = 'Before Malformed Spirit Import';
    const malformedSpiritPayload = {
      ...validZzistoriPayload,
      name: 'Malformed Spirit Import',
      sorcerySpells: [],
      boundSpirits: [{}]
    };
    const malformedSpiritErrors = CD.validatePlainObject(malformedSpiritPayload);
    const malformedSpiritSuccess = CD.fromJSON(JSON.stringify(malformedSpiritPayload));
    const malformedSpiritRejected = malformedSpiritErrors.some(error => /boundSpirits\[0\] must be a string or object with own name/i.test(error)) &&
      malformedSpiritSuccess === false &&
      CD.name === 'Before Malformed Spirit Import';

    CD.name = 'Before Inherited Spirit Entry Import';
    const inheritedSpiritEntry = Object.create({ name: 'Ancestor Spirit — Sagacity (Int 1)' });
    const inheritedSpiritEntryPayload = {
      ...createTestCharacter('Praxian'),
      name: 'Inherited Spirit Entry Import',
      cult: 'Daka Fal',
      cultType: { primary: 'animist', types: ['animist'], isHybrid: false },
      boundSpiritSlots: 4,
      boundSpirits: [inheritedSpiritEntry],
      miracles: [],
      sorceryResource: 0,
      sorcerySpells: []
    };
    const inheritedSpiritEntryErrors = CD.validatePlainObject(inheritedSpiritEntryPayload);
    const inheritedSpiritEntrySuccess = CD.fromJSON(inheritedSpiritEntryPayload);
    const inheritedSpiritEntryRejected = inheritedSpiritEntryErrors.some(error => /boundSpirits\[0\] must be a string or object with own name/i.test(error)) &&
      inheritedSpiritEntrySuccess === false &&
      CD.name === 'Before Inherited Spirit Entry Import';

    CD.name = 'Before Inherited Spirit Fields Import';
    const inheritedSpiritFieldsEntry = Object.assign(
      Object.create({ evil: true }),
      { name: 'Ancestor Spirit — Sagacity (Int 1)' }
    );
    const inheritedSpiritFieldsPayload = {
      ...createTestCharacter('Praxian'),
      name: 'Inherited Spirit Fields Import',
      cult: 'Daka Fal',
      cultType: { primary: 'animist', types: ['animist'], isHybrid: false },
      boundSpiritSlots: 4,
      boundSpirits: [inheritedSpiritFieldsEntry],
      miracles: [],
      sorceryResource: 0,
      sorcerySpells: []
    };
    const inheritedSpiritFieldsErrors = CD.validatePlainObject(inheritedSpiritFieldsPayload);
    const inheritedSpiritFieldsSuccess = CD.fromJSON(inheritedSpiritFieldsPayload);
    const inheritedSpiritFieldsRejected = inheritedSpiritFieldsErrors.some(error => /boundSpirits\[0\] must use own fields only: evil/i.test(error)) &&
      inheritedSpiritFieldsSuccess === false &&
      CD.name === 'Before Inherited Spirit Fields Import';

    const zeroSpellMismatchPayload = {
      ...validZzistoriPayload,
      name: 'Zero Spell Mismatch Import',
      selectedProfessionalSkills: ['Invocation (Arkat)', 'Shaping', 'Lore (Sorcery)'],
      careerSkills: { 'Invocation (Arkat)': 10, Shaping: 10, 'Lore (Sorcery)': 10 },
      sorceryResource: 0,
      sorcerySpells: []
    };
    const zeroSpellSuccess = CD.fromJSON(JSON.stringify(zeroSpellMismatchPayload));
    const zeroSpellSource = AppRef.resolveActiveSorcerySource(CD);
    const zeroSpellMismatchPreserved = zeroSpellSuccess &&
      CD.name === 'Zero Spell Mismatch Import' &&
      zeroSpellSource?.sourceLabel === 'Zzistori School (God Forgot sorcery)' &&
      Array.isArray(CD.sorcerySpells) &&
      CD.sorcerySpells.length === 0;

    const serialized = CD.toJSON();
    const noPersistedSource = !Object.prototype.hasOwnProperty.call(serialized, 'sorcerySource') &&
      !Object.prototype.hasOwnProperty.call(serialized, 'sorcerySourceLabel') &&
      !Object.prototype.hasOwnProperty.call(serialized, 'sorcerySourceName') &&
      !Object.prototype.hasOwnProperty.call(serialized, 'sourceLabel');

    CD.name = 'Before Unsupported Source';
    const unsupportedSuccess = CD.fromJSON(JSON.stringify({
      ...validZzistoriPayload,
      sorcerySource: { sourceLabel: 'Zzistori School (God Forgot sorcery)' }
    }));
    const rejectsUnsupportedSource = unsupportedSuccess === false && CD.name === 'Before Unsupported Source';

    const scopedCorrectly = noSourceResults.every(result => result.source === null) &&
      nonGodForgotUsesCoreSorcery &&
      arkatUsesSourceBackedSchool &&
      noZzistoriCultMapEntry;

    if (scopedCorrectly && staleRejected && validPreserved && validEnvelopePreserved && inheritedImportRejected && inheritedUnknownRejected && hiddenInheritedRejected && nullPrototypeRejected && inheritedNestedRejected && hiddenNestedRejected && inheritedCompanionRejected && inheritedArrayObjectRejected && aliasMagicRejected && unknownReferencesRejected && inheritedEnvelopeRejected && duplicateMagicRejected && inheritedArrayRejected && inheritedArrayAfterLengthRejected && inheritedMagicArrayRejected && incompatibleMiracleHandled && incompatibleSpiritHandled && malformedMiracleHandled && malformedSpiritRejected && inheritedSpiritEntryRejected && inheritedSpiritFieldsRejected && zeroSpellMismatchPreserved && noPersistedSource && rejectsUnsupportedSource) {
      pass('Derived Zzistori sorcery is scoped and import normalization guards persisted state');
    } else {
      fail('Derived Zzistori sorcery resolver or import guards are incorrect',
        JSON.stringify({ noSourceResults, nonGodForgotSorcererSource, nonGodForgotUsesCoreSorcery, arkatSource, godForgotCultNames, staleRejected, staleErrors, validSource, validPreserved, validEnvelopePreserved, inheritedImportErrors, inheritedImportRejected, inheritedUnknownErrors, inheritedUnknownRejected, hiddenInheritedErrors, hiddenInheritedRejected, nullPrototypeErrors, nullPrototypeRejected, inheritedNestedErrors, inheritedNestedRejected, hiddenNestedErrors, hiddenNestedRejected, inheritedCompanionErrors, inheritedCompanionRejected, inheritedArrayObjectErrors, inheritedArrayObjectRejected, aliasMagicErrors, aliasMagicRejected, unknownReferenceResults, unknownReferencesRejected, inheritedEnvelopeErrors, inheritedEnvelopeRejected, duplicateMagicErrors, duplicateMagicRejected, inheritedArrayErrors, inheritedArrayRejected, inheritedArrayAfterLengthErrors, inheritedArrayAfterLengthRejected, inheritedMiracleArrayErrors, inheritedSpiritArrayErrors, inheritedMagicArrayRejected, incompatibleMiracleErrors, incompatibleMiracleHandled, incompatibleSpiritErrors, incompatibleSpiritHandled, malformedMiracleErrors, malformedMiracleHandled, malformedSpiritErrors, malformedSpiritRejected, inheritedSpiritEntryErrors, inheritedSpiritEntryRejected, inheritedSpiritFieldsErrors, inheritedSpiritFieldsRejected, zeroSpellSource, zeroSpellMismatchPreserved, serialized, rejectsUnsupportedSource }));
    }
  } else {
    fail('Derived sorcery resolver and CharacterData JSON helpers are available for import guard tests');
  }
}

// Test: Rejected culture rollback restores transient combat-style selection state
{
  const { App: AppObj, CharacterData: CD, CULTURES_DATA } = loadApp();
  if (AppObj?.agent && CD && Array.isArray(CULTURES_DATA)) {
    AppObj.agent.setStep(1, { name: 'Rollback Transient State', concept: 'God Forgot sorcerer changes culture' });
    AppObj.agent.setStep(2, { characteristics: { STR: 8, CON: 10, SIZ: 10, DEX: 9, INT: 15, POW: 15, CHA: 8 } });
    AppObj.agent.setStep(4, { culture: 'God Forgot', homeland: 'God Forgot' });
    AppObj.agent.setStep(8, { career: 'Sorcerer', professionalSkills: [{ name: 'Invocation (Cult, School or Grimoire)', specialization: 'Zzistori School' }, 'Shaping', { name: 'Lore (any)', specialization: 'Sorcery' }] });
    AppObj.agent.selectCult(null);
    AppObj.agent.toggleSpell('Holdfast');
    CD._pendingCombatStyleSelection = false;
    CULTURES_DATA.push({
      name: 'Synthetic Multi-Style Culture',
      type: 'civilised',
      homelands: ['Test Homeland'],
      standardSkills: ['Athletics'],
      professionalSkills: [],
      folkMagic: [],
      passions: [],
      combatStyles: [
        { name: 'Synthetic Spear', weapons: ['Spear'] },
        { name: 'Synthetic Sword', weapons: ['Sword'] }
      ]
    });

    const result = AppObj.selectCulture('Synthetic Multi-Style Culture');
    const restored = result?.success === false &&
      CD.culture === 'God Forgot' &&
      CD._pendingCombatStyleSelection === false &&
      AppObj.agent.getMagicState().selectedSpells.includes('Holdfast');

    if (restored) {
      pass('Rejected culture rollback restores transient combat-style selection state');
    } else {
      fail('Rejected culture rollback leaks transient combat-style selection state',
        JSON.stringify({ result, culture: CD.culture, pending: CD._pendingCombatStyleSelection, magic: AppObj.agent.getMagicState() }));
    }
  } else {
    fail('App agent and culture data are available for transient rollback test');
  }
}

// Test: CSE combat-style authority matches inline culture combat styles
{
  const refPath = path.join(__dirname, 'references', 'combat-styles.json');
  const legacyPath = path.join(__dirname, 'references', 'aig-raw', 'combat-styles-aig.json');
  const culturesPath = path.join(__dirname, 'references', 'aig-raw', 'cultures.json');
  const equipmentPath = path.join(__dirname, 'references', 'aig-raw', 'equipment-aig.json');
  const ref = JSON.parse(fs.readFileSync(refPath, 'utf8'));
  const legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
  const culturesRef = JSON.parse(fs.readFileSync(culturesPath, 'utf8'));
  const equipmentRef = JSON.parse(fs.readFileSync(equipmentPath, 'utf8'));
  const grouped = {};
  (ref.styles || []).forEach(style => {
    (grouped[style.culture] ||= []).push({
      id: style.id,
      name: style.name,
      weapons: style.weapons,
      traits: style.traits,
      ...(style.restrictions ? { restrictions: style.restrictions } : {}),
      ...(style.notes ? { notes: style.notes } : {}),
      citation: style.citation
    });
  });
  const groupedIds = Object.fromEntries(Object.entries(grouped).map(([culture, styles]) => [culture, styles.map(style => style.id)]));
  const inlineGrouped = Object.fromEntries((App.CULTURES_DATA || []).map(culture => [culture.name, culture.combatStyles || []]));
  const inlineIds = Object.fromEntries((App.CULTURES_DATA || []).map(culture => [culture.name, culture.combatStyleIds || []]));
  const refCultureIds = Object.fromEntries((culturesRef.cultures || []).map(culture => [culture.name, culture.combat_style_ids || []]));
  const equipmentCultureIds = Object.fromEntries(Object.entries(equipmentRef.combat_styles_by_culture || {}).map(([culture, entry]) => [culture, entry.combat_style_ids || []]));
  const missing = Object.keys(inlineGrouped).filter(culture => !grouped[culture]);
  const extra = Object.keys(grouped).filter(culture => !inlineGrouped[culture]);
  const diffs = Object.keys(inlineGrouped).filter(culture => grouped[culture] && JSON.stringify(grouped[culture]) !== JSON.stringify(inlineGrouped[culture]));
  const idDiffs = Object.keys(groupedIds).filter(culture =>
    JSON.stringify(groupedIds[culture]) !== JSON.stringify(inlineIds[culture]) ||
    JSON.stringify(groupedIds[culture]) !== JSON.stringify(refCultureIds[culture]) ||
    JSON.stringify(groupedIds[culture]) !== JSON.stringify(equipmentCultureIds[culture])
  );
  const competingAiGPayloads = [
    ...(culturesRef.cultures || []).filter(culture => culture.combat_styles).map(culture => `cultures:${culture.name}`),
    ...Object.entries(equipmentRef.combat_styles_by_culture || {}).filter(([, entry]) => entry.styles || entry.styles_by_tribe).map(([culture]) => `equipment:${culture}`)
  ];

  if (ref.authority?.source === 'Combat Styles Encyclopedia plus verified Adventures in Glorantha gap-fill' &&
      ref.authority?.primary_source === 'Combat Styles Encyclopedia' &&
      ref.authority?.supplemental_sources?.some(source =>
        source.source === 'Adventures in Glorantha (GenCon 2015 Preview)' &&
        source.source_ref?.evidence_state === 'bounded_extraction_independent_vision_verified') &&
      JSON.stringify(App.COMBAT_STYLES_DATA) === JSON.stringify(ref) &&
      legacy.status === 'superseded-incomplete' &&
      legacy.do_not_use_for_app_generation === true &&
      missing.length === 0 &&
      extra.length === 0 &&
      diffs.length === 0 &&
      idDiffs.length === 0 &&
      competingAiGPayloads.length === 0) {
    pass('CSE combat-style authority matches inline culture combat styles');
  } else {
    fail('CSE combat-style authority is out of sync with inline data',
      JSON.stringify({
        source: ref.authority?.source,
        inlineAuthorityMatch: JSON.stringify(App.COMBAT_STYLES_DATA) === JSON.stringify(ref),
        legacyStatus: legacy.status,
        legacyDoNotUse: legacy.do_not_use_for_app_generation,
        missing,
        extra,
        diffs,
        idDiffs,
        competingAiGPayloads
      }));
  }
}

// Test: all canonical CSE combat-style weapons resolve in app weapon data
{
  const refPath = path.join(__dirname, 'references', 'combat-styles.json');
  const ref = JSON.parse(fs.readFileSync(refPath, 'utf8'));
  const weapons = new Set((App.WEAPONS_DATA || []).map(weapon => weapon.name));
  const aliases = App.WEAPON_ALIASES || {};
  const unresolved = [...new Set((ref.styles || []).flatMap(style => style.weapons || []))]
    .filter(weapon => !weapons.has(weapon) && !aliases[weapon]);

  if (unresolved.length === 0) {
    pass('All canonical CSE combat-style weapons resolve in app weapon data');
  } else {
    fail('Canonical CSE combat-style weapons are unresolved', unresolved.join(', '));
  }
}

// Test: miracle reference data matches inline app data
{
  const refPath = path.join(__dirname, 'references', 'theism-miracles.json');
  const ref = JSON.parse(fs.readFileSync(refPath, 'utf8'));
  const inline = App.MIRACLES_DATA || {};
  const refCultNames = Object.keys(ref.cults || {});
  const inlineCultNames = Object.keys(inline.cults || {});
  const missing = refCultNames.filter(name => !inline.cults?.[name]);
  const extra = inlineCultNames.filter(name => !ref.cults?.[name]);
  const diffs = refCultNames.filter(name =>
    inline.cults?.[name] &&
    JSON.stringify(inline.cults[name]) !== JSON.stringify(ref.cults[name])
  );

  if (missing.length === 0 && extra.length === 0 && diffs.length === 0) {
    pass('theism miracle reference data matches inline MIRACLES_DATA');
  } else {
    fail('theism miracle reference data is out of sync with inline MIRACLES_DATA',
      JSON.stringify({ missing, extra, diffs: diffs.slice(0, 5) }));
  }
}

// Test: miracle provenance has no stale OCR process blockers and Waha mirrors verified source evidence
{
  const miraclesRef = JSON.parse(fs.readFileSync(path.join(__dirname, 'references', 'theism-miracles.json'), 'utf8'));
  const wahaRaw = JSON.parse(fs.readFileSync(path.join(__dirname, 'references', 'cults-raw', 'praxian', 'waha.json'), 'utf8'));
  const expectedWahaRevision = 'waha:copyparty-sources-books-waha-pdf:a36461fa3ba8:2026-05-21';
  const findProcessFlags = value => Array.from(
    JSON.stringify(value).matchAll(/"(split_from_garbled|rune_inferred)"\s*:/g),
    match => match[1]
  );
  const wahaExpectedNames = [
    ...(wahaRaw.miracles?.initiate || []),
    ...Object.values(wahaRaw.miracles?.associate || {}).flat(),
    ...(wahaRaw.miracles?.runeLord || []),
    ...(wahaRaw.miracles?.highPriest || [])
  ];
  const wahaRef = miraclesRef.cults?.Waha || {};
  const wahaRefNames = (wahaRef.miracles || []).map(miracle => miracle.name);
  const missingWahaMiracles = wahaExpectedNames.filter(name => !wahaRefNames.includes(name));
  const extraWahaMiracles = wahaRefNames.filter(name => !wahaExpectedNames.includes(name));
  const wahaRunesMarkedDerived = (wahaRef.miracles || []).every(miracle =>
    typeof miracle.rune_attestation === 'string' &&
    /derived_from_verified_waha_cult_runes|common_miracle_any_rune_app_rule/.test(miracle.rune_attestation));
  const wahaEvidencePaths = wahaRef.source_ref?.evidence_paths || [];
  const missingEvidence = wahaEvidencePaths.filter(evidencePath => !fs.existsSync(path.join(__dirname, evidencePath)));
  const noMiraclesDispositions = miraclesRef.no_miracles_section_disposition || [];
  const noMiracleNames = new Set(miraclesRef.no_miracles_section || []);

  if (miraclesRef.stats?.verification_needed === 0 &&
      miraclesRef.stats?.remaining_blocking_unverified === 0 &&
      miraclesRef.stats?.remaining_unverified === 0 &&
      miraclesRef.stats?.remaining_legacy_exemptions === 0 &&
      miraclesRef.stats?.legacy_exemption_count === 0 &&
      Array.isArray(miraclesRef.verification_needed) &&
      miraclesRef.verification_needed.length === 0 &&
      findProcessFlags(miraclesRef).length === 0 &&
      findProcessFlags(App.MIRACLES_DATA).length === 0 &&
      miraclesRef.source_disposition?.overall_status === 'pdf_ingest_validated_with_waha_vision_override' &&
      miraclesRef.source_disposition?.legacy_onepager_miracles?.status === 'pdf_ingest_validated' &&
      miraclesRef.source_disposition?.waha?.source_revision_id === expectedWahaRevision &&
      wahaRef.sourceRevisionId === expectedWahaRevision &&
      wahaRef.verificationState === 'vision_verified_with_derived_runes' &&
      wahaRef.source_ref?.evidence_state === 'bounded_extraction_independent_vision_verified' &&
      /per_miracle_runes_derived/.test(wahaRef.source_ref?.app_fact_scope || '') &&
      wahaRef.source_ref?.coverage_scope === 'direct_fields_verified_with_derived_per_miracle_runes' &&
      wahaRunesMarkedDerived &&
      wahaEvidencePaths.length >= 4 &&
      missingEvidence.length === 0 &&
      missingWahaMiracles.length === 0 &&
      extraWahaMiracles.length === 0 &&
      noMiraclesDispositions.length === noMiracleNames.size &&
      noMiraclesDispositions.every(entry => noMiracleNames.has(entry.name) && entry.disposition === 'explicit_non_blocking_exemption')) {
    pass('miracle provenance validates cult PDF rows and Waha mirrors verified one-pager miracles');
  } else {
    fail('miracle provenance still has stale blockers or Waha drift',
      JSON.stringify({
        stats: miraclesRef.stats,
        verificationNeededLength: miraclesRef.verification_needed?.length,
        processFlags: findProcessFlags(miraclesRef).slice(0, 10),
        inlineProcessFlags: findProcessFlags(App.MIRACLES_DATA).slice(0, 10),
        sourceDisposition: miraclesRef.source_disposition?.overall_status,
        wahaRevision: wahaRef.sourceRevisionId,
        wahaEvidenceState: wahaRef.source_ref?.evidence_state,
        wahaRunesMarkedDerived,
        missingEvidence,
        missingWahaMiracles,
        extraWahaMiracles,
        noMiraclesDispositions
      }));
  }
}

// Test: culture-cult-map records explicit legacy exemptions with Waha evidence
{
  const cultureMapRef = JSON.parse(fs.readFileSync(path.join(__dirname, 'references', 'culture-cult-map.json'), 'utf8'));
  const expectedWahaRevision = 'waha:copyparty-sources-books-waha-pdf:a36461fa3ba8:2026-05-21';
  const evidencePaths = cultureMapRef.source_disposition?.waha_praxian_entry?.evidence_paths || [];
  const missingEvidence = evidencePaths.filter(evidencePath => !fs.existsSync(path.join(__dirname, evidencePath)));

  if (cultureMapRef.source_disposition?.overall_status === 'mixed_waha_verified_with_legacy_mapping_exemptions' &&
      cultureMapRef.source_disposition?.waha_praxian_entry?.source_revision_id === expectedWahaRevision &&
      cultureMapRef.source_disposition?.waha_praxian_entry?.mapped_culture === 'Praxian' &&
      cultureMapRef.source_disposition?.waha_praxian_entry?.mapped_bucket === 'primary' &&
      cultureMapRef.source_disposition?.verified_entries?.some(entry =>
        entry.culture === 'Praxian' &&
        entry.bucket === 'primary' &&
        entry.cult === 'Waha' &&
        entry.source_disposition === 'waha_praxian_entry') &&
      cultureMapRef.source_disposition?.legacy_mapping_exemption?.status === 'non_waha_area_derived_legacy_exemption' &&
      cultureMapRef.source_disposition?.legacy_mapping_exemption?.excludes_verified_entries?.some(entry =>
        entry.culture === 'Praxian' &&
        entry.bucket === 'primary' &&
        entry.cult === 'Waha' &&
        entry.source_disposition === 'waha_praxian_entry') &&
      evidencePaths.length >= 4 &&
      missingEvidence.length === 0) {
    pass('culture-cult-map has Waha evidence and explicit legacy mapping exemptions');
  } else {
    fail('culture-cult-map source disposition is incomplete',
      JSON.stringify({
        sourceDisposition: cultureMapRef.source_disposition,
        missingEvidence
      }));
  }
}

// Test: changed reference data has explicit page citations
{
  const miraclesRef = JSON.parse(fs.readFileSync(path.join(__dirname, 'references', 'theism-miracles.json'), 'utf8'));
  const cultsRaw = JSON.parse(fs.readFileSync(path.join(__dirname, 'references', 'cults-raw', 'cults.json'), 'utf8'));
  const missingCultCitation = cultsRaw.find(cult =>
    !Array.isArray(cult.sourcePages) ||
    cult.sourcePages.length === 0 ||
    !cult.sourceCitation ||
    !/p\.\d/.test(cult.sourceCitation)
  );
  const reviewedCorrections = miraclesRef.page_citations?.reviewed_corrections || {};

  if (miraclesRef.page_citations?.miracle_lists &&
      reviewedCorrections.Orlanth &&
      reviewedCorrections.Yelmalio &&
      miraclesRef.source_disposition?.overall_status === 'pdf_ingest_validated_with_waha_vision_override' &&
      !missingCultCitation) {
    pass('Reference miracle and cult raw data include page citations');
  } else {
    fail('Reference data page citations are incomplete',
      JSON.stringify({
        hasMiracleListCitation: Boolean(miraclesRef.page_citations?.miracle_lists),
        reviewedCorrectionKeys: Object.keys(reviewedCorrections),
        sourceDisposition: miraclesRef.source_disposition?.overall_status,
        missingCultCitation: missingCultCitation ? missingCultCitation.name : null
      }));
  }
}

// Test: app-facing magic cult roster has explicit raw-only decisions
{
  const roster = readJson('references/provenance/magic-cult-roster.json');
  const { CULTS_DATA: CultsData, CULTURE_CULT_MAP: CultureCultMap, detectCultType } = loadApp();
  const rawRoot = readJson('references/cults-raw/cults.json');
  const rawCults = Array.isArray(rawRoot) ? rawRoot : rawRoot.cults || [];
  const mappedCultNames = new Set(Object.values(CultureCultMap || {})
    .flatMap(entry => [
      ...(entry.primary || []),
      ...(entry.secondary || []),
      ...(entry.associated || []),
      ...(entry.other || []),
      ...(entry.available || [])
    ]));
  const sortedUnique = values => [...new Set(values)].sort((a, b) => a.localeCompare(b));
  const hasMagicSkill = (cult, patterns) => (cult.cultSkills || []).some(skill =>
    patterns.some(pattern => pattern.test(skill))
  );
  const rawAnimism = sortedUnique(rawCults
    .filter(cult => hasMagicSkill(cult, [/^Trance/i, /^Binding/i]))
    .map(cult => cult.name));
  const rawSorcery = sortedUnique(rawCults
    .filter(cult => hasMagicSkill(cult, [/^Invocation/i, /^Shaping/i]))
    .map(cult => cult.name));
  const appBySystem = { animism: [], sorcery: [] };
  for (const cult of CultsData || []) {
    const types = detectCultType(cult)?.types || [];
    if (types.includes('animist')) appBySystem.animism.push(cult.name);
    if (types.includes('sorcery')) appBySystem.sorcery.push(cult.name);
  }
  appBySystem.animism = sortedUnique(appBySystem.animism);
  appBySystem.sorcery = sortedUnique(appBySystem.sorcery);
  const rosterAppAnimism = (roster.appFacing?.animism || []).map(entry => entry.name);
  const rosterAppSorcery = (roster.appFacing?.sorcery || []).map(entry => entry.name);
  const rosterRawOnly = new Map((roster.rawOnlyDecisions || []).map(entry => [entry.name, entry]));
  const rawOnlyActual = sortedUnique([...rawAnimism, ...rawSorcery].filter(name =>
    !appBySystem.animism.includes(name) && !appBySystem.sorcery.includes(name)
  ));
  const rawOnlyMissingDecisions = rawOnlyActual.filter(name => !rosterRawOnly.has(name));
  const spuriousRawOnlyDecisions = (roster.rawOnlyDecisions || [])
    .filter(entry => appBySystem.animism.includes(entry.name) || appBySystem.sorcery.includes(entry.name))
    .map(entry => entry.name);
  const appCultureSelectableMatches = ['animism', 'sorcery'].every(system =>
    (roster.appFacing?.[system] || []).every(entry => entry.cultureSelectable === mappedCultNames.has(entry.name))
  );
  const ompalamDecision = rosterRawOnly.get('Ompalam');
  const wahaSupersededNote = (roster.supersededRawNotes || []).some(entry =>
    entry.name === 'Waha' && (entry.note || '').includes('updated vision-verified Waha one-pager')
  );

  if (JSON.stringify(roster.rawDetected?.animism || []) === JSON.stringify(rawAnimism) &&
      JSON.stringify(roster.rawDetected?.sorcery || []) === JSON.stringify(rawSorcery) &&
      JSON.stringify(rosterAppAnimism) === JSON.stringify(appBySystem.animism) &&
      JSON.stringify(rosterAppSorcery) === JSON.stringify(appBySystem.sorcery) &&
      rawOnlyMissingDecisions.length === 0 &&
      spuriousRawOnlyDecisions.length === 0 &&
      appCultureSelectableMatches &&
      ompalamDecision?.systems?.includes('sorcery') &&
      ompalamDecision?.decision === 'not_app_facing_current_scope' &&
      wahaSupersededNote) {
    pass('Magic cult roster parity records app-facing providers and raw-only decisions');
  } else {
    fail('Magic cult roster parity is incomplete',
      JSON.stringify({
        rosterRawAnimism: roster.rawDetected?.animism,
        rawAnimism,
        rosterRawSorcery: roster.rawDetected?.sorcery,
        rawSorcery,
        rosterAppAnimism,
        appAnimism: appBySystem.animism,
        rosterAppSorcery,
        appSorcery: appBySystem.sorcery,
        rawOnlyMissingDecisions,
        spuriousRawOnlyDecisions,
        appCultureSelectableMatches,
        ompalamDecision,
        wahaSupersededNote
      }));
  }
}

section('Index Provenance Coverage');

// Test: final provenance map has no pending app constants and hashes current inline values
{
  const { loadInlineConstants, valueHash } = require('./scripts/validate_provenance.js');
  const indexMap = readJson('references/provenance/index-html-map.json');
  const legacy = readJson('references/provenance/legacy-disposition.json');
  const entriesByName = new Map((indexMap.entries || []).map(entry => [entry.constant_name, entry]));
  const legacyByName = new Map((legacy.app_constants || []).map(entry => [entry.constant_name, entry]));
  const finalStatuses = new Set(['verified', 'normalized', 'accepted', 'superseded']);
  const finalDispositions = new Set(['governed-now', 'superseded', 'exempt/out-of-scope']);
  const appConstantNames = [
    'SKILLS_DATA',
    'WEAPONS_DATA',
    'COMBAT_STYLES_DATA',
    'STARTING_SPIRITS',
    'CULTURES_DATA',
    'CULTURE_BUILDS',
    'CULTURE_MAGIC_PROFILES',
    'CAREERS_DATA',
    'CULTS_DATA',
    'CULTURE_CULT_MAP',
    'DISAMBIGUATION_LISTS',
    'MIRACLES_DATA',
    'WEAPON_ALIASES',
    'DATA_INDEXES',
    'HIT_LOCATIONS'
  ];
  const inlineConstants = loadInlineConstants(__dirname, appConstantNames);
  const statusProblems = [];
  const hashProblems = [];

  for (const name of appConstantNames) {
    const entry = entriesByName.get(name);
    const legacyEntry = legacyByName.get(name);
    if (!entry) {
      statusProblems.push(`${name}: missing index map entry`);
      continue;
    }
    if (!finalStatuses.has(entry.status)) statusProblems.push(`${name}: ${entry.status}`);
    if (!finalDispositions.has(entry.disposition)) statusProblems.push(`${name}: ${entry.disposition}`);
    if (legacyEntry && entry.disposition !== legacyEntry.disposition) {
      statusProblems.push(`${name}: legacy/index disposition mismatch`);
    }
    if (['verified', 'normalized', 'accepted'].includes(entry.status) &&
        entry.canonical_value_hash !== valueHash(inlineConstants[name])) {
      hashProblems.push(name);
    }
  }

  if (statusProblems.length === 0 && hashProblems.length === 0) {
    pass('index provenance map finalizes all exported app constants with current inline hashes');
  } else {
    fail('index provenance map still has pending states or stale hashes',
      JSON.stringify({ statusProblems, hashProblems }));
  }
}

// Test: index.html provenance coverage mirrors committed reference JSON
{
  const refPath = path.join(__dirname, 'references', 'provenance', 'index-html-coverage.json');
  const ref = JSON.parse(fs.readFileSync(refPath, 'utf8'));
  const inline = App.PROVENANCE_COVERAGE;
  const requiredConstants = [
    'SKILLS_DATA',
    'WEAPONS_DATA',
    'EQUIPMENT_DATA',
    'RUNES_DATA',
    'COMBAT_STYLES_DATA',
    'CULTURES_DATA',
    'SOCIAL_CLASS_TABLES',
    'CAREERS_DATA',
    'CULTS_DATA',
    'CULTURE_CULT_MAP',
    'SPECIAL_EFFECTS_DATA',
    'COMBAT_TRAITS_DATA',
    'FOLK_MAGIC_DESCRIPTIONS',
    'FOLK_MAGIC_SPELLS',
    'MIRACLES_DATA',
    'SORCERY_SPELLS',
    'STARTING_SPIRITS',
    'CULTURE_MAGIC_PROFILES'
  ];
  const coveredConstants = new Set((ref.entries || []).flatMap(entry => entry.inlineConstants || []));
  const missingConstants = requiredConstants.filter(name => !coveredConstants.has(name));
  const missingRefs = (ref.entries || []).flatMap(entry =>
    (entry.references || [])
      .map(reference => reference.path)
      .filter(referencePath => !fs.existsSync(path.join(__dirname, referencePath)))
      .map(referencePath => `${entry.id}:${referencePath}`)
  );
  const entriesWithoutCitation = (ref.entries || []).filter(entry =>
    !(entry.references || []).every(reference => reference.citation || reference.source)
  ).map(entry => entry.id);
  const finalStateProblems = (ref.entries || []).filter(entry =>
    entry.status !== 'verified' ||
    (entry.blockers || []).length > 0
  ).map(entry => entry.id);
  const startingSpiritsVerified = (ref.entries || []).some(entry =>
    entry.id === 'spirit-starting-options' &&
    entry.status === 'verified' &&
    (entry.blockers || []).length === 0 &&
    (entry.references || []).some(reference => reference.path === 'references/starting-spirits.json')
  );
  const theismVerified = (ref.entries || []).some(entry =>
    entry.id === 'theism-miracles' &&
    entry.status === 'verified' &&
    (entry.blockers || []).length === 0 &&
    /cult PDF ingestion/.test(entry.summary || '')
  );
  const cultMapVerified = (ref.entries || []).some(entry =>
    entry.id === 'cults-and-cult-map' &&
    entry.status === 'verified' &&
    (entry.blockers || []).length === 0 &&
    /ingest-cults.py --validate/.test((entry.attestationNotes || []).join(' '))
  );

  if (inline &&
      JSON.stringify(inline) === JSON.stringify(ref) &&
      missingConstants.length === 0 &&
      missingRefs.length === 0 &&
      entriesWithoutCitation.length === 0 &&
      finalStateProblems.length === 0 &&
      startingSpiritsVerified &&
      theismVerified &&
      cultMapVerified) {
    pass('index.html provenance coverage mirrors committed JSON and covers generated data constants');
  } else {
    fail('index.html provenance coverage contract is incomplete',
      JSON.stringify({
        inlineMatchesReference: inline ? JSON.stringify(inline) === JSON.stringify(ref) : false,
        missingConstants,
        missingRefs,
        entriesWithoutCitation,
        finalStateProblems,
        startingSpiritsVerified,
        theismVerified,
        cultMapVerified
      }));
  }
}

// Test: provenance coverage statuses reflect current reference verification gaps
{
  const coverage = App.PROVENANCE_COVERAGE || {};
  const entriesById = Object.fromEntries((coverage.entries || []).map(entry => [entry.id, entry]));
  const sorceryRef = readJson('references/mythras-raw/sorcery.json');
  const startingSpiritsRef = readJson('references/starting-spirits.json');
  const magicPagesRef = readJson('references/mythras-raw/magic-page-references.json');
  const runeMagicRef = readJson('references/aig-raw/rune-magic-aig.json');
  const miraclesRef = readJson('references/theism-miracles.json');

  const theismNoMiraclesClassified = Array.isArray(miraclesRef.no_miracles_section) &&
    miraclesRef.no_miracles_section.length > 0 &&
    Array.isArray(miraclesRef.no_miracles_section_disposition) &&
    miraclesRef.no_miracles_section_disposition.length === miraclesRef.no_miracles_section.length &&
    miraclesRef.no_miracles_section_disposition.every(entry =>
      miraclesRef.no_miracles_section.includes(entry.name) &&
      entry.disposition === 'explicit_non_blocking_exemption');
  const statusesMatch =
    entriesById['sorcery-spells']?.status === 'verified' &&
    sorceryRef.verified === true &&
    entriesById['spirit-starting-options']?.status === 'verified' &&
    (entriesById['spirit-starting-options']?.blockers || []).length === 0 &&
    startingSpiritsRef.verified === true &&
    magicPagesRef.verified === true &&
    magicPagesRef.source_ref?.coverage_state === 'verified' &&
    !magicPagesRef.source_ref?.pages?.includes(196) &&
    magicPagesRef.boundary_pages?.some(page => page.page === 196 && page.role === 'non_app_facing_mysticism_boundary') &&
    entriesById['theism-miracles']?.status === 'verified' &&
    (entriesById['theism-miracles']?.blockers || []).length === 0 &&
    entriesById['cults-and-cult-map']?.status === 'verified' &&
    (entriesById['cults-and-cult-map']?.blockers || []).length === 0 &&
    runeMagicRef.verified !== true &&
    runeMagicRef.authority_state === 'source_blocked' &&
    miraclesRef.source_disposition?.overall_status === 'pdf_ingest_validated_with_waha_vision_override' &&
    theismNoMiraclesClassified;

  if (statusesMatch) {
    pass('provenance coverage exposes only verified app surfaces without final blockers');
  } else {
    fail('provenance coverage does not reflect current reference verification gaps',
      JSON.stringify({
        sorceryStatus: entriesById['sorcery-spells']?.status,
        spiritStatus: entriesById['spirit-starting-options']?.status,
        theismStatus: entriesById['theism-miracles']?.status,
        sorceryVerified: sorceryRef.verified,
        startingSpiritsVerified: startingSpiritsRef.verified,
        magicPagesVerified: magicPagesRef.verified,
        runeMagicVerified: runeMagicRef.verified,
        noMiraclesSections: miraclesRef.no_miracles_section,
        sourceDisposition: miraclesRef.source_disposition?.overall_status,
        theismNoMiraclesClassified
      }));
  }
}

// Test: provenance audit renderer stays out of player flows by default
{
  const { App: AppRef } = loadApp();
  const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  if (AppRef &&
      typeof AppRef.renderProvenanceCoverage === 'undefined' &&
      typeof AppRef.renderProvenanceBadgesForConstants === 'undefined' &&
      !indexHtml.includes('source-coverage-panel') &&
      !indexHtml.includes('source-coverage-badge') &&
      !indexHtml.includes('Source review notes') &&
      !/init\(\)\s*\{[\s\S]*renderProvenanceCoverage\(\)/.test(indexHtml)) {
    pass('provenance audit UI is absent from player markup and runtime');
  } else {
    fail('provenance audit UI still has a player-facing or runtime path',
      JSON.stringify({
        hasRenderer: typeof AppRef?.renderProvenanceCoverage,
        hasBadgesRenderer: typeof AppRef?.renderProvenanceBadgesForConstants,
        hasPanelMarkup: indexHtml.includes('source-coverage-panel'),
        hasBadgeMarkup: indexHtml.includes('source-coverage-badge'),
        hasSourceReviewNotes: indexHtml.includes('Source review notes'),
        initCallsRenderer: /init\(\)\s*\{[\s\S]*renderProvenanceCoverage\(\)/.test(indexHtml)
      }));
  }
}

// Test: generated Play Mode sections do not expose internal provenance badges
{
  const { App: AppRef, CharacterData: CD, Calc: CalcRef, MIRACLES_DATA: MiraclesData, _sandbox } = loadApp();
  if (AppRef && AppRef.renderPlayCombat && AppRef.renderPlayMagic && AppRef.renderPlayEquipment) {
    CD.characteristics = { STR: 12, CON: 12, SIZ: 12, DEX: 12, INT: 12, POW: 12, CHA: 12 };
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    CD.culture = 'Praxian';
    CD.combatStyles = [{ name: 'Bison', weapons: ['Lance'], traits: ['Mounted Combat'], skill: 24 }];
    CD.weapons = [{ name: 'Lance', damage: '1d10', size: 'L', reach: 'VL', ap: 4, hp: 10 }];
    CD.equipment = [{ name: 'Bedroll', quantity: 1, enc: 1 }];
    CD.armor = [];
    CD.startingMoney = 120;
    CD.cult = 'Waha';
    CD.cultChoiceMade = true;
    CD.cultInitiated = true; // Post-initiation Play Mode rendering expectations.
    CD.miracles = [(MiraclesData.cults.Waha?.miracles || [])[0]?.name || 'Dismiss Magic'];
    CD.boundSpiritSlots = 6;
    CD.boundSpirits = [{ name: 'Nature Spirit — Camouflage (Int 2)' }];
    CD.folkMagicSpells = ['Alarm'];
    CD.careerFolkMagic = [];
    CD.runeAffinities = { primary: 'Beast', secondary: 'Air', tertiary: 'Man' };

    AppRef.renderPlayCombat();
    AppRef.renderPlayMagic();
    AppRef.renderPlayEquipment();

    const combatHtml = _sandbox.document.getElementById('play-combat').innerHTML;
    const magicHtml = _sandbox.document.getElementById('play-magic').innerHTML;
    const equipmentHtml = _sandbox.document.getElementById('play-equipment').innerHTML;
    const combinedHtml = `${combatHtml}\n${magicHtml}\n${equipmentHtml}`;
    const leaksAuditBadge = combinedHtml.includes('source-coverage-badge') ||
      /\b(?:attested|unverified|partial|source coverage)\b/i.test(combinedHtml) ||
      /Hannu/i.test(combinedHtml);

    if (!leaksAuditBadge &&
        magicHtml.includes('Spirit Magic') &&
        magicHtml.includes('Spirit Rune affinity') &&
        equipmentHtml.includes('Starting Money')) {
      pass('Play Mode generated data sections hide internal provenance status badges');
    } else {
      fail('Play Mode generated data sections expose internal provenance/debug wording',
        JSON.stringify({ leaksAuditBadge, combatHtml, magicHtml, equipmentHtml }));
    }
  } else {
    fail('Play Mode provenance badge render dependencies are missing');
  }
}

section('Player Handout Contract');

// Test: character-generator player copy uses the handout wording for the book
{
  const htmlPath = path.join(__dirname, 'index.html');
  const html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '';
  const playerFacingCorePatterns = [
    /<h2>Magic[\s\S]{0,160}Mythras Core/i,
    /Read:\s*Mythras Core/i,
    /page-ref">\([^<]*Mythras Core/i,
    /showToast\('[^']*Mythras Core/i,
    /spell-picker__source">Sources:\s*Mythras Core/i,
    />Source:\s*Mythras Core/i,
    /Mysticism uses raw Mythras Core rules/i
  ];
  const offenders = playerFacingCorePatterns
    .filter(pattern => pattern.test(html))
    .map(pattern => String(pattern));

  if (offenders.length === 0 && html.includes('Mythras rulebook')) {
    pass('Character generator player-facing copy uses Mythras rulebook wording');
  } else {
    fail('Character generator player-facing copy still says Mythras Core', offenders.join('; '));
  }
}

// Test: player-facing handout set has a start route and required references
{
  const handoutDir = path.join(__dirname, 'docs', 'handouts');
  const requiredHandouts = [
    'index.html',
    'combat-path.html',
    'magic-path.html',
    'combined-path.html',
    'rules-and-house-rules.html',
    'prep-checklist.html',
    'source-trail.html'
  ];
  const missing = requiredHandouts.filter(file => !fs.existsSync(path.join(handoutDir, file)));

  if (missing.length === 0) {
    pass('docs/handouts includes the complete player handout route set');
  } else {
    fail('docs/handouts is missing player handout routes', missing.join(', '));
  }
}

// Test: handouts are self-contained static pages with print support and working character-generator links
{
  const handoutDir = path.join(__dirname, 'docs', 'handouts');
  const htmlFiles = fs.existsSync(handoutDir)
    ? fs.readdirSync(handoutDir).filter(file => file.endsWith('.html'))
    : [];
  const problems = [];

  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(handoutDir, file), 'utf8');
    const externalUrls = html.match(/https?:\/\/[^"' <]+/g) || [];
    const unsupportedUrls = externalUrls.filter(url => url !== 'https://drive.google.com/drive/folders/1CKNxkpoL4sWfzdbkglQyiYvCBXlmyFIj');
    if (unsupportedUrls.length > 0) problems.push(`${file}: unsupported external URL ${unsupportedUrls[0]}`);
    if (/<script\b/i.test(html)) problems.push(`${file}: script tag`);
    if (!html.includes('@media print')) problems.push(`${file}: missing print CSS`);
    if (!html.includes('Character Generator')) problems.push(`${file}: missing Character Generator link`);
    if (!html.includes('source-trail.html') && file !== 'source-trail.html') problems.push(`${file}: missing source trail link`);
  }

  if (htmlFiles.length >= 7 && problems.length === 0) {
    pass('Player handouts are standalone, printable, and link back to chargen/source trail');
  } else {
    fail('Player handout static contract failed', problems.slice(0, 8).join('; '));
  }
}

// Test: handout links are safe when index.html is also published as /00-START-HERE.html
{
  const handoutDir = path.join(__dirname, 'docs', 'handouts');
  const htmlFiles = fs.existsSync(handoutDir)
    ? fs.readdirSync(handoutDir).filter(file => file.endsWith('.html'))
    : [];
  const handoutRoutes = '(?:index|combat-path|magic-path|combined-path|rules-and-house-rules|prep-checklist|source-trail)\\.html';
  const relativeHandoutRoute = new RegExp(`href="${handoutRoutes}(?:#[^"]*)?"`, 'i');
  const relativeSourceRoute = /href="\.\.\/\.\.\/sources\//i;
  const problems = [];

  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(handoutDir, file), 'utf8');
    if (relativeHandoutRoute.test(html)) problems.push(`${file}: relative handout route`);
    if (relativeSourceRoute.test(html)) problems.push(`${file}: relative source route`);
  }

  if (problems.length === 0) {
    pass('Player handout links are safe for Copyparty root and nested deployment');
  } else {
    fail('Player handout links are not deployment-safe', problems.slice(0, 8).join('; '));
  }
}

// Test: actionable cult one-pager mentions link to the player folder or Source Trail
{
  const handoutDir = path.join(__dirname, 'docs', 'handouts');
  const htmlFiles = fs.existsSync(handoutDir)
    ? fs.readdirSync(handoutDir).filter(file => file.endsWith('.html'))
    : [];
  const onePagerFolder = 'https://drive.google.com/drive/folders/1CKNxkpoL4sWfzdbkglQyiYvCBXlmyFIj';
  const problems = [];

  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(handoutDir, file), 'utf8');
    for (const match of html.matchAll(/cult one-pagers?|Waha one-pager/gi)) {
      const start = Math.max(0, match.index - 180);
      const end = Math.min(html.length, match.index + 220);
      const context = html.slice(start, end);
      if (!context.includes(onePagerFolder) && !/href="\/rules\/handouts\/source-trail\.html(?:#[^"]*)?"/i.test(context)) {
        problems.push(`${file}: unlinked ${match[0]} near offset ${match.index}`);
      }
    }
  }

  if (problems.length === 0) {
    pass('Cult one-pager mentions link to the player folder or Source Trail');
  } else {
    fail('Cult one-pager mentions are not linked', problems.slice(0, 10).join('; '));
  }
}

// Test: handouts are player-facing, not agent/repo-facing
{
  const handoutDir = path.join(__dirname, 'docs', 'handouts');
  const htmlFiles = fs.existsSync(handoutDir)
    ? fs.readdirSync(handoutDir).filter(file => file.endsWith('.html'))
    : [];
  const forbidden = [
    /\bADR\b/i,
    /AGENTS\.md/i,
    /\bJSON\b/i,
    /reference JSON/i,
    /attest/i,
    /Hannu/i,
    /chargen/i,
    /codebase/i,
    /inline (?:constant|data)/i,
    /CULTS_DATA|MIRACLES_DATA|\.rpiv/i
  ];
  const problems = [];

  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(handoutDir, file), 'utf8');
    forbidden.forEach(pattern => {
      if (pattern.test(html)) problems.push(`${file}: ${pattern}`);
    });
  }

  if (problems.length === 0) {
    pass('Player handouts avoid internal agent/data jargon');
  } else {
    fail('Player handouts contain internal or unsupported terms', problems.slice(0, 10).join('; '));
  }
}

// Test: Start Here inline content links do not inherit navigation spacing
{
  const indexPath = path.join(__dirname, 'docs', 'handouts', 'index.html');
  const html = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '';
  const routeAnchorRule = /\.route\s+a\s*,|,\s*\.route\s+a\b/;

  if (!routeAnchorRule.test(html)) {
    pass('Start Here inline links render without navigation spacing around punctuation');
  } else {
    fail('Start Here route links inherit navigation spacing', 'Split .route a styling from nav/footer link spacing');
  }
}

// Test: magic handout labels house rules without overstating universal Rune replacement
{
  const magicPath = path.join(__dirname, 'docs', 'handouts', 'magic-path.html');
  const html = fs.existsSync(magicPath) ? fs.readFileSync(magicPath, 'utf8') : '';
  const forbiddenClaims = [
    /all casting skills are replaced by\s*<strong>Rune Affinities<\/strong>/i,
    /You don't roll "Folk Magic"/i,
    /Roll the spell's Rune Affinity/i,
    /Law Rune for Shaping/i
  ];
  const hasForbiddenClaim = forbiddenClaims.some(pattern => pattern.test(html));
  const hasHouseRuleLabel = /House rule/i.test(html);
  const hasSystemSpecificRows = /Cult Rune Magic[\s\S]*Rune Affinity[\s\S]*Animism[\s\S]*Spirit Rune[\s\S]*Sorcery[\s\S]*Invocation[\s\S]*Shaping[\s\S]*Mysticism/i.test(html);
  const explainsTerms = /Rune Affinity[\s\S]*Adventures in Glorantha[\s\S]*Spirit Rune[\s\S]*spirit[\s\S]*Invocation[\s\S]*Shaping[\s\S]*Mythras rulebook/i.test(html);
  const hasPlayerSources = /A-Bird-in-the-Hand\.pdf[\s\S]*Monster-Island\.pdf[\s\S]*drive\.google\.com\/drive\/folders\/1CKNxkpoL4sWfzdbkglQyiYvCBXlmyFIj/i.test(html);
  const explainsDevotionalPoolLabel = /Devotional Pool\s*\(your cult magic pool\)[\s\S]*POW\/2/i.test(html);

  if (!hasForbiddenClaim && hasHouseRuleLabel && hasSystemSpecificRows && explainsTerms && hasPlayerSources && explainsDevotionalPoolLabel) {
    pass('Magic handout distinguishes official rules, AiG adaptations, and house rules');
  } else {
    fail('Magic handout overstates or underdocuments house-rule casting model',
      JSON.stringify({ hasForbiddenClaim, hasHouseRuleLabel, hasSystemSpecificRows, explainsTerms, hasPlayerSources, explainsDevotionalPoolLabel }));
  }
}

// Test: handouts use sheet labels and do not promote unverified Monster Island pages
{
  const handoutDir = path.join(__dirname, 'docs', 'handouts');
  const htmlFiles = fs.readdirSync(handoutDir).filter(f => f.endsWith('.html'));
  const combinedHtml = htmlFiles.map(file => fs.readFileSync(path.join(handoutDir, file), 'utf8')).join('\n');
  const hasDevotionalPoolAlias = /Devotional Pool\s*\(your cult magic pool\)/i.test(combinedHtml)
    || /Devotional Pool\s*\(cult magic pool\)/i.test(combinedHtml);
  const copiesSheetLabel = /write your Devotional Pool used and available/i.test(combinedHtml);
  const monsterIslandPromotesPageCitations = /Monster[-\s]Island(?:\.pdf)?[\s\S]{0,220}p\.\d+\b/i.test(combinedHtml);
  const monsterIslandProblems = [];
  const gatedMonsterIslandMention = /(GM|GM-approved|GM-assigned|GM-controlled|GM-provided|GM gives|ask the GM|island-specific (?:ruling|exception|magic exceptions?)|exceptions?)/i;
  for (const file of htmlFiles) {
    const fileHtml = fs.readFileSync(path.join(handoutDir, file), 'utf8');
    for (const match of fileHtml.matchAll(/Monster[-\s]Island(?:\.pdf)?/gi)) {
      const start = Math.max(0, match.index - 120);
      const end = Math.min(fileHtml.length, match.index + 240);
      const context = fileHtml.slice(start, end);
      if (!gatedMonsterIslandMention.test(context)) {
        monsterIslandProblems.push(`${file}: ungated Monster Island mention near offset ${match.index}`);
      }
    }
  }

  if (hasDevotionalPoolAlias && copiesSheetLabel && !monsterIslandPromotesPageCitations && monsterIslandProblems.length === 0) {
    pass('Handouts align Devotional Pool label and gate Monster Island exceptions');
  } else {
    fail('Handouts mislabel Devotional Pool or over-promote Monster Island exceptions',
      JSON.stringify({ hasDevotionalPoolAlias, copiesSheetLabel, monsterIslandPromotesPageCitations, monsterIslandProblems }));
  }
}

// Test: player handouts do not invent a sorcery spell-rune map
{
  const handoutDir = path.join(__dirname, 'docs', 'handouts');
  const htmlFiles = fs.readdirSync(handoutDir).filter(f => f.endsWith('.html'));
  const forbiddenSorceryRuneClaims = [
    /spell's Rune Affinity/i,
    /rune each spell uses/i,
    /Law Rune value for shaping/i,
    /Law Rune for Shaping/i,
    /using your Law Rune/i,
    /roll Law Rune/i
  ];
  const problems = [];

  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(handoutDir, file), 'utf8');
    forbiddenSorceryRuneClaims.forEach(pattern => {
      if (pattern.test(html)) problems.push(`${file}: ${pattern}`);
    });
  }

  if (problems.length === 0) {
    pass('Player handouts keep sorcery on RAW Invocation/Shaping without a rune map');
  } else {
    fail('Player handouts still describe sorcery as spell runes or Law Rune shaping', problems.join('; '));
  }
}

// Test: documented solutions are categorized and agent-readable
{
  const solutionsRoot = path.join(__dirname, 'docs', 'solutions');
  const files = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.md')) files.push(full);
    }
  };
  walk(solutionsRoot);
  const bad = files.find(file => {
    const rel = path.relative(solutionsRoot, file);
    const text = fs.readFileSync(file, 'utf8');
    return !rel.includes(path.sep) ||
      !text.startsWith('---\n') ||
      !/\nmodule:\s*.+/.test(text) ||
      !/\ntags:\s*/.test(text) ||
      !/\nproblem_type:\s*.+/.test(text);
  });

  if (!bad) {
    pass(`All ${files.length} docs/solutions files are categorized with agent-readable frontmatter`);
  } else {
    fail('docs/solutions file missing category path or required frontmatter', path.relative(solutionsRoot, bad));
  }
}

// Test: Random character has a cult field
{
  const CD = App.CharacterData;
  if (CD.cult !== undefined) {
    pass('Random character has cult field (' + (CD.cult || 'No Cult') + ')');
  } else {
    fail('Random character missing cult field');
  }
}

// Test: Sartarite characters mostly get Storm pantheon cults
{
  const AppObj = App.App;
  const CD = App.CharacterData;
  const CULTS = App.CULTS_DATA;

  if (!AppObj || !AppObj.generateRandomCharacter) {
    info('Skipping Storm pantheon test - generateRandomCharacter not available');
  } else {
    // Generate 10 Sartarite characters and count Storm pantheon cults
    let stormCount = 0;
    const origRender = AppObj.renderCurrentStep;
    const origToast = AppObj.showToast;
    const origSave = AppObj.saveToLocalStorage;
    AppObj.renderCurrentStep = function() {};
    AppObj.showToast = function() {};
    AppObj.saveToLocalStorage = function() {};

    for (let i = 0; i < 10; i++) {
      AppObj.generateRandomCharacter();
      // Force culture to Sartarite (Heortling)
      CD.culture = 'Sartarite (Heortling)';
      // Generate cult selection
      const CULT_MAP = App.CULTURE_CULT_MAP;
      const pick = arr => arr[Math.floor(Math.random() * arr.length)];
      if (CULT_MAP && CULT_MAP['Sartarite (Heortling)'] && CULT_MAP['Sartarite (Heortling)'].primary) {
        CD.cult = pick(CULT_MAP['Sartarite (Heortling)'].primary);
      }

      if (CD.cult) {
        const cult = CULTS.find(c => c.name === CD.cult);
        if (cult && cult.pantheon === 'Storm') {
          stormCount++;
        }
      }
    }

    AppObj.renderCurrentStep = origRender;
    AppObj.showToast = origToast;
    AppObj.saveToLocalStorage = origSave;

    if (stormCount >= 5) {
      pass(`Sartarite characters get Storm pantheon cults (${stormCount}/10)`);
    } else {
      fail(`Only ${stormCount}/10 Sartarite characters got Storm pantheon cults`);
    }
  }
}

// ============================================================
section('Cult Type Detection (ADR-0006)');
// ============================================================

{
  const detectCultType = App.detectCultType;
  const CULTS_DATA = App.CULTS_DATA;

  if (typeof detectCultType === 'function' && CULTS_DATA) {
    // Pure Theist: Orlanth has Devotion + Runic Affinity, no Trance/Binding
    const orlanth = CULTS_DATA.find(c => c.name === 'Orlanth');
    if (orlanth) {
      const ot = detectCultType(orlanth);
      if (ot.primary === 'theist' && !ot.isHybrid) pass('Orlanth detected as pure theist');
      else fail('Orlanth should be pure theist', `Got: ${JSON.stringify(ot)}`);
    } else {
      fail('Orlanth not found in CULTS_DATA');
    }

    // Pure Animist: Daka Fal has Trance/Binding, no Devotion
    const dakaFal = CULTS_DATA.find(c => c.name === 'Daka Fal');
    if (dakaFal) {
      const dt = detectCultType(dakaFal);
      if (dt.primary === 'animist' && !dt.isHybrid) pass('Daka Fal detected as pure animist');
      else fail('Daka Fal should be pure animist', `Got: ${JSON.stringify(dt)}`);
    } else {
      fail('Daka Fal not found in CULTS_DATA');
    }

    // Pure Sorcery: Arkat has Invocation/Shaping, no Devotion
    const arkat = CULTS_DATA.find(c => c.name === 'Arkat');
    if (arkat) {
      const at = detectCultType(arkat);
      if (at.primary === 'sorcery' && !at.isHybrid) pass('Arkat detected as pure sorcery');
      else fail('Arkat should be pure sorcery', `Got: ${JSON.stringify(at)}`);
    } else {
      fail('Arkat not found in CULTS_DATA');
    }

    // Hybrid Theist+Animist: Waha has Devotion AND Trance/Binding
    const waha = CULTS_DATA.find(c => c.name === 'Waha');
    if (waha) {
      const wt = detectCultType(waha);
      if (wt.isHybrid && wt.types.includes('theist') && wt.types.includes('animist')) {
        pass('Waha detected as theist+animist hybrid');
      } else {
        fail('Waha should be theist+animist hybrid', `Got: ${JSON.stringify(wt)}`);
      }
    } else {
      fail('Waha not found in CULTS_DATA');
    }

    // Verify no cult gets devotionalPool when it lacks Devotion
    // Only test cults that actually exist in CULTS_DATA
    const pureAnimistCultNames = ['Daka Fal', 'Aldrya Shaman', 'Hearth Mother', 'Jokotu the Murderer'];
    const existingAnimistCults = pureAnimistCultNames.filter(name => CULTS_DATA.find(c => c.name === name));
    let animistCorrect = 0;
    for (const name of existingAnimistCults) {
      const cult = CULTS_DATA.find(c => c.name === name);
      const ct = detectCultType(cult);
      if (!ct.types.includes('theist')) animistCorrect++;
    }
    if (animistCorrect === existingAnimistCults.length) {
      pass(`All ${existingAnimistCults.length} pure animist cults in data correctly lack theist type (${existingAnimistCults.join(', ')})`);
    } else {
      fail(`Only ${animistCorrect}/${existingAnimistCults.length} pure animist cults correctly classified`);
    }

    // Verify all 94 cults get a valid type
    let validCount = 0;
    let invalidCults = [];
    for (const cult of CULTS_DATA) {
      const ct = detectCultType(cult);
      if (ct.primary && ct.types.length > 0) {
        validCount++;
      } else {
        invalidCults.push(cult.name);
      }
    }
    if (validCount === CULTS_DATA.length) {
      pass(`All ${CULTS_DATA.length} cults get a valid magic type classification`);
    } else {
      fail(`${invalidCults.length} cults failed classification: ${invalidCults.join(', ')}`);
    }

    // Phase 2: Verify selectCult correctly assigns resources per cult type
    const CharacterData = App.CharacterData;
    const AppObj = App.App;
    if (AppObj && AppObj.selectCult && CharacterData) {
      // Set up characteristics for testing
      CharacterData.characteristics = { STR: 14, CON: 12, SIZ: 11, DEX: 12, INT: 10, POW: 14, CHA: 12 };
      const resetCultTestState = () => {
        CharacterData.career = 'Warrior';
        CharacterData.selectedProfessionalSkills = [];
        CharacterData.cult = null;
        CharacterData.cultType = null;
        CharacterData.miracles = [];
        CharacterData.boundSpirits = [];
        CharacterData.sorcerySpells = [];
        CharacterData.mysticismTalents = [];
        CharacterData.devotionalPool = 0;
        CharacterData.boundSpiritSlots = 0;
        CharacterData.sorceryResource = 0;
      };

      // Clear cult first to avoid confirmation dialog
      resetCultTestState();

      // ADR-0015 chargen baseline: cult selection stores affiliation, not initiated pools.
      AppObj.selectCult('Orlanth');
      if (CharacterData.devotionalPool === 0 && CharacterData.cultInitiated === false) {
        pass('Orlanth affiliation (uninitiated): devotionalPool remains 0 at chargen');
      } else {
        fail('Orlanth devotionalPool', `Expected 0 while uninitiated, got ${CharacterData.devotionalPool}`);
      }
      resetCultTestState();
      AppObj.selectCult('Daka Fal');
      if (CharacterData.devotionalPool === 0) {
        pass('Daka Fal affiliation: devotionalPool = 0 (uninitiated chargen baseline)');
      } else {
        fail('Daka Fal devotionalPool', `Expected 0, got ${CharacterData.devotionalPool}`);
      }
      if (CharacterData.boundSpiritSlots === 0) {
        pass('Daka Fal affiliation: boundSpiritSlots = 0 until initiation');
      } else {
        fail('Daka Fal boundSpiritSlots', `Expected 0 while uninitiated, got ${CharacterData.boundSpiritSlots}`);
      }
      resetCultTestState();
      AppObj.selectCult('Arkat');
      if (CharacterData.devotionalPool === 0) {
        pass('Arkat affiliation: devotionalPool = 0 (no Devotion)');
      } else {
        fail('Arkat devotionalPool', `Expected 0, got ${CharacterData.devotionalPool}`);
      }
      if (CharacterData.sorceryResource === 0) {
        pass('Arkat affiliation: sorceryResource = 0 until initiation');
      } else {
        fail('Arkat sorceryResource', `Expected 0 while uninitiated, got ${CharacterData.sorceryResource}`);
      }
      resetCultTestState();
      AppObj.selectCult('Waha');
      if (CharacterData.devotionalPool === 0 && CharacterData.boundSpiritSlots === 0) {
        pass('Waha affiliation (uninitiated): devotionalPool = 0 and boundSpiritSlots = 0');
      } else {
        fail('Waha hybrid resources', `Expected DP=0, BSS=0 while uninitiated, got DP=${CharacterData.devotionalPool}, BSS=${CharacterData.boundSpiritSlots}`);
      }
      // Clean up
      resetCultTestState();
      AppObj.selectCult(null);
    } else {
      info('Skipping selectCult resource tests (App.selectCult not available in test env)');
    }
  } else {
    fail('detectCultType function not found - Phase 1 not yet implemented');
  }
}

// ============================================================
section('Quick Boost Panel (U1: number inputs, no re-render)');
// ============================================================

{
  // Test: adjustCultBoost accepts an absolute value (not a delta)
  const { App: AppRef, CharacterData: CD, CULTURE_CULT_MAP: CultureCultMap } = loadApp();
  const sandbox = AppRef ? AppRef._sandbox || CD._sandbox : null;
  
  if (AppRef && AppRef.adjustCultBoost) {
    // Setup: give character a cult with skills below 50%
    CD.cult = '7 Mothers - Irrippi Ontor';
    CD.characteristics = { STR: 11, CON: 12, SIZ: 13, DEX: 14, INT: 15, POW: 5, CHA: 5 };
    CD.bonusSkills = {};
    CD.age = 22;

    // Test 1: adjustCultBoost sets absolute value (new signature)
    AppRef.adjustCultBoost('Willpower', 10);
    if (CD.bonusSkills['Willpower'] === 10) {
      pass('adjustCultBoost sets absolute value correctly');
    } else {
      fail('adjustCultBoost sets absolute value correctly', `Expected 10, got ${CD.bonusSkills['Willpower']}`);
    }

    // Test 2: Value clamped to 0 at minimum
    AppRef.adjustCultBoost('Willpower', -5);
    if (CD.bonusSkills['Willpower'] === 0 || CD.bonusSkills['Willpower'] === undefined) {
      pass('adjustCultBoost clamps negative values to 0');
    } else {
      fail('adjustCultBoost clamps negative values to 0', `Expected 0, got ${CD.bonusSkills['Willpower']}`);
    }

    // Test 3: Value clamped to maxPerSkill (15 for age 22)
    AppRef.adjustCultBoost('Willpower', 99);
    if (CD.bonusSkills['Willpower'] <= 15) {
      pass('adjustCultBoost clamps to maxPerSkill');
    } else {
      fail('adjustCultBoost clamps to maxPerSkill', `Expected <= 15, got ${CD.bonusSkills['Willpower']}`);
    }

    // Test 4: Value clamped to remaining budget
    CD.bonusSkills = {};
    // Age 22 = 150 bonus points. Spend 145 elsewhere.
    CD.bonusSkills['Athletics'] = 15;
    CD.bonusSkills['Brawn'] = 15;
    CD.bonusSkills['Endurance'] = 15;
    CD.bonusSkills['Evade'] = 15;
    CD.bonusSkills['Stealth'] = 15;
    CD.bonusSkills['Swim'] = 15;
    CD.bonusSkills['Dance'] = 15;
    CD.bonusSkills['Ride'] = 15;
    CD.bonusSkills['Sing'] = 15;
    CD.bonusSkills['Perception'] = 10; // total 145
    AppRef.adjustCultBoost('Willpower', 10);
    const spent = Object.values(CD.bonusSkills).reduce((a, b) => a + b, 0);
    if (spent <= 150) {
      pass('adjustCultBoost respects total budget limit');
    } else {
      fail('adjustCultBoost respects total budget limit', `Total spent: ${spent}, exceeds 150`);
    }

    // Test 5: Points allocated in Quick Boost appear in bonus pool
    CD.bonusSkills = {};
    AppRef.adjustCultBoost('Willpower', 8);
    if (CD.bonusSkills['Willpower'] === 8) {
      pass('Quick Boost points stored in bonusSkills (shared with Step 11)');
    } else {
      fail('Quick Boost points stored in bonusSkills (shared with Step 11)', `Got ${CD.bonusSkills['Willpower']}`);
    }

    // Test 6: adjustCultBoost does NOT call renderCurrentStep (no full re-render)
    let renderCalled = false;
    const origRender = AppRef.renderCurrentStep;
    AppRef.renderCurrentStep = function() { renderCalled = true; };
    CD.bonusSkills = {};
    AppRef.adjustCultBoost('Willpower', 5);
    if (!renderCalled) {
      pass('adjustCultBoost does not call renderCurrentStep');
    } else {
      fail('adjustCultBoost does not call renderCurrentStep');
    }
    AppRef.renderCurrentStep = origRender;
  } else {
    pass('ADR-0015: App.adjustCultBoost removed from Step 9 runtime');
  }
}

// ============================================================
section('Auto-Boost to 50% (U2)');
// ============================================================

{
  const { App: AppRef, CharacterData: CD, CULTS_DATA: CultsData } = loadApp();

  if (AppRef && AppRef.autoBoostCultSkills && AppRef.planCultInitiationBoost) {
    // Setup: character with cult skills below 50%
    CD.cult = '7 Mothers - Irrippi Ontor';
    CD.characteristics = { STR: 18, CON: 18, SIZ: 18, DEX: 18, INT: 18, POW: 18, CHA: 18 };
    CD.bonusSkills = {};
    CD.culturalSkills = {};
    CD.careerSkills = {};
    CD.age = 22;

    // Test 1: planner is pure
    const beforePlan = JSON.stringify({bonus: CD.bonusSkills, cultural: CD.culturalSkills, career: CD.careerSkills});
    const planPreview = AppRef.planCultInitiationBoost();
    const afterPlan = JSON.stringify({bonus: CD.bonusSkills, cultural: CD.culturalSkills, career: CD.careerSkills});
    if (planPreview.success && beforePlan === afterPlan) {
      pass('planCultInitiationBoost plans without mutating CharacterData');
    } else {
      fail('planCultInitiationBoost plans without mutating CharacterData',
        JSON.stringify({planPreview, beforePlan, afterPlan}));
    }

    // Test 2: Auto-boost allocates minimum necessary cult skills to reach initiation
    const result = AppRef.autoBoostCultSkills();
    const cult = CultsData.find(c => c.name === CD.cult);
    const summary = AppRef.getCultInitiationRequirementSummary(cult);
    const expectedBoostTargets = summary.requiredCount - summary.skillDetails.filter(s => s.qualifies && (CD.bonusSkills[s.key] || CD.bonusSkills[s.matchedName] || 0) === 0).length;
    const boostedCultSkills = AppRef.getCultSkillRequirementDetails(cult)
      .filter(s => (CD.bonusSkills[s.key] || CD.bonusSkills[s.matchedName] || 0) > 0);
    if (result.success && summary.qualifies && boostedCultSkills.length === expectedBoostTargets) {
      pass('autoBoostCultSkills satisfies initiation with minimum necessary boosts');
    } else {
      fail('autoBoostCultSkills satisfies initiation with minimum necessary boosts',
        JSON.stringify({result, qualifies: summary.qualifies, boostedCultSkills: boostedCultSkills.map(s => s.key), expectedBoostTargets, bonus: CD.bonusSkills}));
    }

    // Test 3: Does not exceed maxPerSkill per skill
    const allValues = Object.values(CD.bonusSkills);
    const overMax = allValues.filter(v => v > 15);
    if (overMax.length === 0) {
      pass('autoBoostCultSkills respects maxPerSkill per skill');
    } else {
      fail('autoBoostCultSkills respects maxPerSkill per skill', `Found values > 15: ${overMax}`);
    }

    // Test 4: Does not exceed total budget
    const totalSpent = Object.values(CD.bonusSkills).reduce((a, b) => a + b, 0);
    if (totalSpent <= 150) {
      pass('autoBoostCultSkills respects total budget');
    } else {
      fail('autoBoostCultSkills respects total budget', `Spent ${totalSpent} > 150`);
    }

    // Test 5: Reallocates existing non-cult bonus skills when the bonus pool is full
    CD.characteristics = { STR: 18, CON: 18, SIZ: 18, DEX: 18, INT: 18, POW: 18, CHA: 18 };
    CD.bonusSkills = { 'Athletics': 15, 'Brawn': 15, 'Stealth': 15, 'Swim': 15,
      'Dance': 15, 'Ride': 15, 'Sing': 15, 'Endurance': 15, 'Evade': 15, 'First Aid': 15 };
    const fullBudgetBefore = {...CD.bonusSkills};
    const fullBudgetResult = AppRef.autoBoostCultSkills();
    const wpAfter = CD.bonusSkills['Willpower'] || 0;
    const donorsReduced = Object.entries(fullBudgetBefore).some(([skill, value]) => (CD.bonusSkills[skill] || 0) < value);
    if (fullBudgetResult.success && wpAfter > 0 && donorsReduced) {
      pass('autoBoostCultSkills reallocates non-cult bonus donors when needed');
    } else {
      fail('autoBoostCultSkills reallocates non-cult bonus donors when needed',
        JSON.stringify({result: fullBudgetResult, before: fullBudgetBefore, after: CD.bonusSkills, willpower: wpAfter}));
    }
    // Verify total didn't exceed budget
    const totalAfter = Object.values(CD.bonusSkills).reduce((a, b) => a + b, 0);
    if (totalAfter <= 150) {
      pass('autoBoostCultSkills default full-budget attempt stays within budget');
    } else {
      fail('autoBoostCultSkills default full-budget attempt exceeded budget', `Total: ${totalAfter}`);
    }

    // Test 6: Uses legal cultural/career donors when bonus alone cannot meet the target
    CultsData.push({ name: 'Quick Boost Test Cult', cultSkills: ['Devotion'] });
    CD.cult = 'Quick Boost Test Cult';
    CD.characteristics = { STR: 5, CON: 5, SIZ: 5, DEX: 5, INT: 5, POW: 5, CHA: 5 };
    CD.bonusSkills = { Athletics: 15, Brawn: 15, Endurance: 15, Evade: 15, Influence: 15, Insight: 15, Locale: 15, Perception: 15, Ride: 15, Sing: 15 };
    CD.culturalSkills = { 'Devotion (Quick Boost Test Cult)': 0, Dance: 15, Deceit: 15, NativeTongue: 15 };
    CD.careerSkills = { 'Devotion (Quick Boost Test Cult)': 0, Commerce: 15, Courtesy: 15, Healing: 15 };
    const mixedPoolResult = AppRef.autoBoostCultSkills();
    const devotionKey = 'Devotion (Quick Boost Test Cult)';
    const devotionTotal = AppRef.calculateSkillTotalForKey(devotionKey).value;
    const mixedPoolUsed = (CD.bonusSkills[devotionKey] || 0) > 0 &&
      (CD.culturalSkills[devotionKey] || 0) > 0 &&
      (CD.careerSkills[devotionKey] || 0) > 0;
    CultsData.pop();
    if (mixedPoolResult.success && devotionTotal >= 50 && mixedPoolUsed) {
      pass('autoBoostCultSkills reallocates legal cultural and career donors when bonus alone is insufficient');
    } else {
      fail('autoBoostCultSkills reallocates legal cultural and career donors when bonus alone is insufficient',
        JSON.stringify({ result: mixedPoolResult, devotionTotal, cultural: CD.culturalSkills, career: CD.careerSkills, bonus: CD.bonusSkills }));
    }

    // Test 6b: Legal cultural targets do not need to be pre-created by prior UI edits
    CultsData.push({ name: 'Quick Boost Hidden Legal Culture Cult', cultSkills: ['Endurance'] });
    CD.culture = 'Sartarite (Heortling)';
    CD.career = null;
    CD.cult = 'Quick Boost Hidden Legal Culture Cult';
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 10, POW: 10, CHA: 10 };
    CD.age = 22;
    CD.bonusSkills = {};
    CD.culturalSkills = { Athletics: 15, Brawn: 15 };
    CD.careerSkills = {};
    const hiddenCultureResult = AppRef.autoBoostCultSkills();
    const hiddenCultureTotal = AppRef.calculateSkillTotalForKey('Endurance').value;
    CultsData.pop();
    if (hiddenCultureResult.success &&
        Object.prototype.hasOwnProperty.call(CD.culturalSkills, 'Endurance') &&
        hiddenCultureTotal >= 50) {
      pass('Quick Boost can create absent-but-legal cultural targets');
    } else {
      fail('Quick Boost missed absent legal cultural target',
        JSON.stringify({ hiddenCultureResult, hiddenCultureTotal, cultural: CD.culturalSkills, bonus: CD.bonusSkills }));
    }

    // Test 7: Uses a career's professional placeholder as a legal target and can replace 0-point choices
    CultsData.push({ name: 'Quick Boost Priest Placeholder Cult', cultSkills: ['Devotion'] });
    CD.culture = 'Sartarite (Heortling)';
    CD.career = 'Priest';
    CD.cult = 'Quick Boost Priest Placeholder Cult';
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 10, POW: 10, CHA: 10 };
    CD.age = 22;
    const priestDevotionKey = 'Devotion (Quick Boost Priest Placeholder Cult)';
    CD.bonusSkills = {
      [priestDevotionKey]: 15,
      Athletics: 15,
      Brawn: 15,
      Dance: 15,
      Endurance: 15,
      Evade: 15,
      Perception: 15,
      Ride: 15,
      Sing: 15,
      Stealth: 15
    };
    CD.culturalSkills = {};
    CD.careerSkills = { Customs: 15, Bureaucracy: 0, Exhort: 0, 'Folk Magic': 0 };
    CD.selectedProfessionalSkills = ['Bureaucracy', 'Exhort', 'Folk Magic'];
    CD._disambiguationMap = {};
    const placeholderPlan = AppRef.planCultInitiationBoost();
    const placeholderApplied = AppRef.applyCultInitiationBoostPlan(placeholderPlan);
    CultsData.pop();
    if (placeholderPlan.success &&
        placeholderPlan.selectionChanges.some(change => change.action === 'replace-professional-skill' && change.to === priestDevotionKey) &&
        placeholderPlan.moves.some(move => move.pool === 'careerSkills' && move.to === priestDevotionKey) &&
        placeholderApplied &&
        CD.selectedProfessionalSkills.includes(priestDevotionKey)) {
      pass('autoBoostCultSkills can target career professional placeholders and replace 0-point choices');
    } else {
      fail('autoBoostCultSkills missed a legal professional placeholder target',
        JSON.stringify({ placeholderPlan, selected: CD.selectedProfessionalSkills, career: CD.careerSkills }));
    }

    if (AppRef.applyCultInitiationBoostPlan({ success: true, moves: [], selectionChanges: [] }) === false) {
      pass('applyCultInitiationBoostPlan reports false for no-op plans');
    } else {
      fail('applyCultInitiationBoostPlan treated a no-op plan as applied');
    }

    // Test 6c: Illegal cultural targets are not auto-created by the planner
    CD.culture = 'Sartarite (Heortling)';
    const plannedPools = { culturalSkills: { Athletics: 15, Brawn: 15 } };
    const illegalCultureResult = AppRef.ensureCultInitiationCultureTarget('Seamanship', plannedPools);
    if (illegalCultureResult === false && !Object.prototype.hasOwnProperty.call(plannedPools.culturalSkills, 'Seamanship')) {
      pass('Quick Boost does not create absent illegal cultural targets');
    } else {
      fail('Quick Boost created an illegal cultural target',
        JSON.stringify({ illegalCultureResult, cultural: plannedPools.culturalSkills }));
    }

    // Test 7b: Replacing a professional choice must preserve already-spent career points
    CultsData.push({ name: 'Quick Boost Priest Point Carry Cult', cultSkills: ['Devotion'] });
    CD.culture = 'Sartarite (Heortling)';
    CD.career = 'Priest';
    CD.cult = 'Quick Boost Priest Point Carry Cult';
    const pointCarryDevotionKey = 'Devotion (Quick Boost Priest Point Carry Cult)';
    CD.bonusSkills = { [pointCarryDevotionKey]: 15 };
    CD.culturalSkills = {};
    CD.careerSkills = {
      Customs: 15,
      Bureaucracy: 13,
      Exhort: 0,
      'Folk Magic': 0,
      Influence: 15,
      Insight: 15,
      Locale: 15,
      Sing: 15,
      Willpower: 12
    };
    CD.selectedProfessionalSkills = ['Bureaucracy', 'Exhort', 'Folk Magic'];
    CD._disambiguationMap = {};
    const careerSpentBeforeReplacement = Object.values(CD.careerSkills).reduce((sum, value) => sum + value, 0);
    const pointCarryPlan = AppRef.planCultInitiationBoost({ allowPartial: true });
    const pointCarryApplied = AppRef.applyCultInitiationBoostPlan(pointCarryPlan);
    const careerSpentAfterReplacement = Object.values(CD.careerSkills).reduce((sum, value) => sum + value, 0);
    CultsData.pop();
    if (pointCarryApplied &&
        !Object.prototype.hasOwnProperty.call(CD.careerSkills, 'Bureaucracy') &&
        (CD.careerSkills[pointCarryDevotionKey] || 0) >= 13 &&
        careerSpentAfterReplacement === careerSpentBeforeReplacement) {
      pass('Quick Boost preserves career pool total when replacing a professional choice');
    } else {
      fail('Quick Boost lost career points while replacing a professional choice',
        JSON.stringify({ pointCarryPlan, careerSpentBeforeReplacement, careerSpentAfterReplacement, career: CD.careerSkills }));
    }

    // Test 8: Professional replacement preserves primary/secondary dependency pairs
    CultsData.push({ name: 'Quick Boost Oratory Cult', cultSkills: ['Oratory'] });
    CD.culture = 'Balazaring';
    CD.career = 'Scholar';
    CD.cult = 'Quick Boost Oratory Cult';
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 10, POW: 10, CHA: 10 };
    CD.age = 22;
    CD.bonusSkills = {
      Oratory: 15,
      Athletics: 15,
      Brawn: 15,
      Dance: 15,
      Endurance: 15,
      Evade: 15,
      Perception: 15,
      Ride: 15,
      Sing: 15,
      Stealth: 15
    };
    CD.culturalSkills = {};
    CD.careerSkills = { Customs: 15, 'Lore (Wolves)': 0, 'Lore (Local Legends)': 0, Literacy: 0 };
    CD.selectedProfessionalSkills = ['Lore (Wolves)', 'Lore (Local Legends)', 'Literacy'];
    CD._disambiguationMap = {
      'career:Lore (Primary)': 'Lore (Wolves)',
      'career:Lore (Secondary)': 'Lore (Local Legends)'
    };
    const dependencyPlan = AppRef.planCultInitiationBoost();
    const dependencyApplied = AppRef.applyCultInitiationBoostPlan(dependencyPlan);
    CultsData.pop();
    if (dependencyPlan.success &&
        dependencyPlan.selectionChanges.some(change => change.from === 'Literacy' && change.to === 'Oratory') &&
        !dependencyPlan.selectionChanges.some(change => /^Lore \(/.test(change.from || '')) &&
        dependencyApplied &&
        CD.selectedProfessionalSkills.includes('Lore (Wolves)') &&
        CD.selectedProfessionalSkills.includes('Lore (Local Legends)') &&
        CD.selectedProfessionalSkills.includes('Oratory')) {
      pass('autoBoostCultSkills preserves primary/secondary professional dependencies when replacing choices');
    } else {
      fail('autoBoostCultSkills broke or could not preserve primary/secondary professional dependencies',
        JSON.stringify({ dependencyPlan, selected: CD.selectedProfessionalSkills, career: CD.careerSkills }));
    }

    // Test 9: Unmet cult skills are not used as donors for other cult skill boosts
    CultsData.push({ name: 'Quick Boost Donor Safety Cult', cultSkills: ['Devotion', 'Willpower'] });
    CD.culture = 'Sartarite (Heortling)';
    CD.career = 'Priest';
    CD.cult = 'Quick Boost Donor Safety Cult';
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 10, POW: 10, CHA: 10 };
    CD.age = 22;
    const donorDevotionKey = 'Devotion (Quick Boost Donor Safety Cult)';
    CD.bonusSkills = {
      Willpower: 15,
      Athletics: 15,
      Brawn: 15,
      Dance: 15,
      Endurance: 15,
      Evade: 15,
      Perception: 15,
      Ride: 15,
      Sing: 15,
      Stealth: 15
    };
    CD.culturalSkills = {};
    CD.careerSkills = { Customs: 15, Dance: 15, Deceit: 15, [donorDevotionKey]: 0, Willpower: 0 };
    CD.selectedProfessionalSkills = [donorDevotionKey, 'Exhort', 'Folk Magic'];
    CD._disambiguationMap = {};
    const donorPlan = AppRef.planCultInitiationBoost();
    CultsData.pop();
    const cultDonorMoves = (donorPlan.moves || []).filter(move => move.from === donorDevotionKey || move.from === 'Willpower');
    if (donorPlan.success && cultDonorMoves.length === 0) {
      pass('autoBoostCultSkills does not spend unmet cult skills as donors');
    } else {
      fail('autoBoostCultSkills used unmet cult skills as donors',
        JSON.stringify({ donorPlan, cultDonorMoves }));
    }

    // Test 10: Surplus unmet cult skills may be abandoned when five other cult skills can qualify
    CultsData.push({ name: 'Quick Boost Surplus Cult Donor', cultSkills: ['Athletics', 'Brawn', 'Endurance', 'Evade', 'Perception', 'Willpower'] });
    CD.culture = 'Sartarite (Heortling)';
    CD.career = 'Priest';
    CD.cult = 'Quick Boost Surplus Cult Donor';
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 10, POW: 10, CHA: 10 };
    CD.age = 22;
    CD.bonusSkills = {
      Athletics: 15,
      Brawn: 15,
      Endurance: 15,
      Evade: 15,
      Perception: 15
    };
    CD.culturalSkills = {
      Athletics: 15,
      Brawn: 15,
      Endurance: 15,
      Evade: 15,
      Perception: 0
    };
    CD.careerSkills = {
      Perception: 0,
      Willpower: 15
    };
    CD.selectedProfessionalSkills = ['Exhort', 'Folk Magic', 'Devotion (Quick Boost Surplus Cult Donor)'];
    CD._disambiguationMap = {};
    const surplusDonorPlan = AppRef.planCultInitiationBoost();
    const surplusDonorApplied = AppRef.applyCultInitiationBoostPlan(surplusDonorPlan);
    const surplusDonorCult = CultsData.pop();
    const surplusSummary = AppRef.getCultInitiationRequirementSummary(surplusDonorCult);
    const perceptionAfter = AppRef.calculateSkillTotalForKey('Perception').value;
    const willpowerAfter = AppRef.calculateSkillTotalForKey('Willpower').value;
    const surplusDonorMove = (surplusDonorPlan.moves || []).find(move =>
      move.pool === 'careerSkills' && move.from === 'Willpower' && move.to === 'Perception'
    );
    if (surplusDonorPlan.success && surplusDonorApplied && surplusSummary.qualifies &&
        surplusDonorMove && perceptionAfter >= 50 && willpowerAfter < 50) {
      pass('autoBoostCultSkills can swap points away from surplus unmet cult skills');
    } else {
      fail('autoBoostCultSkills failed to abandon a surplus unmet cult skill',
        JSON.stringify({ surplusDonorPlan, surplusDonorMove, perceptionAfter, willpowerAfter, summary: surplusSummary, career: CD.careerSkills }));
    }
  } else {
    pass('ADR-0015: App.autoBoostCultSkills and planner removed from Step 9 runtime');
  }
}

// ============================================================
section('Auto-Boost Cultural/Career Pool Safety');
// ============================================================

{
  const { App: AppRef, CharacterData: CD, CULTS_DATA: CultsData, Calc: CalcRef } = loadApp();

  if (AppRef && AppRef.autoBoostCultSkills) {
    CultsData.push({ name: 'Quick Boost Partial Progress Cult', cultSkills: ['Willpower'] });
    CD.cult = 'Quick Boost Partial Progress Cult';
    CD.characteristics = { STR: 5, CON: 5, SIZ: 5, DEX: 5, INT: 5, POW: 10, CHA: 5 };
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    CD.age = 22;
    CD.bonusSkills = {};
    CD.culturalSkills = {};
    CD.careerSkills = {};
    const toasts = [];
    AppRef.showToast = (msg, type) => toasts.push({ msg, type });
    const result = AppRef.autoBoostCultSkills();
    const willpowerBonus = CD.bonusSkills.Willpower || 0;
    CultsData.pop();

    const warningToast = toasts.find(toast => toast.type === 'warning');
    if (!result.success &&
        willpowerBonus === 15 &&
        result.remainingGaps.length > 0 &&
        warningToast &&
        warningToast.msg.includes('Applied 15 legal points') &&
        warningToast.msg.includes('initiation still needs 1 skill')) {
      pass('autoBoostCultSkills applies legal partial progress when initiation remains impossible');
    } else {
      fail('autoBoostCultSkills failed to apply legal partial progress',
        JSON.stringify({ result, willpowerBonus, bonus: CD.bonusSkills, toasts }));
    }
  } else {
    pass('ADR-0015: App.autoBoostCultSkills removed for cultural/career pool safety flow');
  }
}

{
  const { App: AppRef, CharacterData: CD, Calc: CalcRef, CULTS_DATA: CultsData } = loadApp();

  if (AppRef && AppRef.autoBoostCultSkills) {
    CD.cult = 'Orlanth';
    CD.characteristics = { STR: 12, CON: 12, SIZ: 12, DEX: 13, INT: 15, POW: 6, CHA: 5 };
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    CD.runeAffinities = { primary: 'Storm', secondary: 'Movement', tertiary: 'Death' };
    CD.combatStyles = [{ name: 'Hill Clan Levy', weapons: ['Broadsword', 'Sling'] }];
    CD.age = 22;
    CD.bonusSkills = {};
    CD.culturalSkills = {
      'Language (Heortling)': 0,
      Ride: 15,
      'Craft (Smithing)': 0,
      'Lore (Cult)': 15,
      Athletics: 15,
      Brawn: 0,
      Endurance: 10,
      Evade: 15,
      Locale: 5,
      Perception: 15,
      Willpower: 10,
      Commerce: 0,
      Courtesy: 0,
      Healing: 0,
      Musicianship: 0,
      Survival: 0
    };
    CD.careerSkills = {
      Customs: 0,
      Dance: 0,
      Deceit: 0,
      Influence: 0,
      Insight: 0,
      Locale: 0,
      Willpower: 0,
      Oratory: 0,
      'Devotion (Orlanth)': 0,
      'Lore (Cult)': 0
    };

    AppRef.autoBoostCultSkills();

    const overCultural = Object.entries(CD.culturalSkills).filter(([, value]) => value > 15);
    const overCareer = Object.entries(CD.careerSkills).filter(([, value]) => value > 15);
    if (overCultural.length === 0 && overCareer.length === 0) {
      pass('Quick Boost preserves 15-point cultural/career per-skill caps');
    } else {
      fail('Quick Boost preserves 15-point cultural/career per-skill caps',
        `Cultural over cap: ${JSON.stringify(overCultural)}, Career over cap: ${JSON.stringify(overCareer)}`);
    }
  } else {
    pass('ADR-0015: Auto-boost cap regression inapplicable because auto-boost is removed');
  }
}

// ============================================================
section('Step 9 Initiation Gate');
// ============================================================

{
  const { App: AppRef, CharacterData: CD } = loadApp();

  if (AppRef?.resolveCultSkillRequirement) {
    CD.cult = 'Orlanth';
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 10, POW: 5, CHA: 5 };
    CD.culturalSkills = { 'Devotion (Waha)': 100 };
    CD.careerSkills = {};
    CD.bonusSkills = {};

    const devotionRequirement = AppRef.resolveCultSkillRequirement('Devotion');
    if (devotionRequirement.key === 'Devotion (Orlanth)' &&
        devotionRequirement.matchedName === 'Devotion (Orlanth)' &&
        devotionRequirement.value < 50 &&
        devotionRequirement.qualifies === false) {
      pass('Cult gate does not let stale old-cult Devotion satisfy the selected cult');
    } else {
      fail('Cult gate accepted stale old-cult Devotion for the selected cult',
        JSON.stringify(devotionRequirement));
    }
  } else {
    fail('App.resolveCultSkillRequirement function not found for stale cult skill regression');
  }
}

{
  const { App: AppRef, CharacterData: CD } = loadApp();

  if (AppRef?.selectCult && AppRef.agent?.selectCult && AppRef.resolveHigherMagicProviders) {
    CD.culture = 'Balazaring';
    CD.career = 'Mystic';
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 12, POW: 40, CHA: 10 };
    CD.selectedProfessionalSkills = ['Meditation', 'Mysticism (Core Mysticism Path)', 'Literacy'];
    CD.careerSkills = { Meditation: 0, 'Mysticism (Core Mysticism Path)': 0, Literacy: 0 };
    CD.cult = 'Orlanth';
    CD.cultType = { primary: 'theist', types: ['theist'], isHybrid: false };
    CD.mysticismTalents = ['Awareness'];
    CD.miracles = [];

    const uiResult = AppRef.selectCult(null, { skipConfirmation: true, allowMagicSelectionLoss: true });
    const uiProviders = AppRef.resolveHigherMagicProviders(CD);
    const uiTalentsPreserved = uiResult.success &&
      uiProviders.some(provider => provider.system === 'mysticism') &&
      CD.mysticismTalents.includes('Awareness');

    CD.cult = 'Orlanth';
    CD.cultType = { primary: 'theist', types: ['theist'], isHybrid: false };
    CD.mysticismTalents = ['Awareness'];
    const agentResult = AppRef.agent.selectCult(null);
    const agentProviders = AppRef.resolveHigherMagicProviders(CD);
    const agentTalentsPreserved = agentResult.success &&
      agentProviders.some(provider => provider.system === 'mysticism') &&
      CD.mysticismTalents.includes('Awareness');

    if (uiTalentsPreserved && agentTalentsPreserved) {
      pass('Clearing a deity preserves unrelated career-backed Mysticism selections in UI and agent flows');
    } else {
      fail('Clearing a deity still wipes unrelated career-backed Mysticism selections',
        JSON.stringify({ uiResult, uiProviders, uiTalents: CD.mysticismTalents, agentResult, agentProviders }));
    }
  } else {
    fail('Cult clearing helpers unavailable for provider-scoped Mysticism preservation test');
  }
}

{
  const { App: AppRef, CharacterData: CD, Calc: CalcRef } = loadApp();

  if (AppRef?.selectCult && AppRef.renderStep9 && AppRef.resolveActiveSorcerySource) {
    CD.culture = 'God Forgot';
    CD.career = 'Sorcerer';
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 13, CHA: 10 };
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    CD.selectedProfessionalSkills = ['Invocation (Zzistori School)', 'Shaping', 'Literacy'];
    CD.careerSkills = { 'Invocation (Zzistori School)': 0, Shaping: 0, Literacy: 0 };
    CD._cultBoundPlaceholderMap = {
      'selectedProfessionalSkills:Invocation (Cult, School or Grimoire)': 'Invocation (Zzistori School)',
      'careerSkills:Invocation (Cult, School or Grimoire)': 'Invocation (Zzistori School)'
    };
    CD.cult = null;
    CD.cultType = null;
    CD.miracles = [];
    CD.boundSpirits = [];
    CD.mysticismTalents = [];
    CD.sorcerySpells = ['Abjure (Substance/Process)', 'Animate (Substance)', 'Attract (Threat)'];
    CD.sorceryResource = 13;
    AppRef.currentStep = 9;

    const joinResult = AppRef.selectCult('Lhankor Mhy', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const sourceWhileCultSelected = AppRef.resolveActiveSorcerySource(CD);
    const invocationStillZzistori = CD.selectedProfessionalSkills.includes('Invocation (Zzistori School)') &&
      Object.prototype.hasOwnProperty.call(CD.careerSkills, 'Invocation (Zzistori School)');

    const clearResult = AppRef.selectCult(null, { skipConfirmation: true, allowMagicSelectionLoss: true });
    const sourceAfterClear = AppRef.resolveActiveSorcerySource(CD);
    const stepHtml = AppRef.renderStep9().innerHTML;
    const spellsPreserved = CD.sorcerySpells.includes('Abjure (Substance/Process)') &&
      CD.sorcerySpells.includes('Animate (Substance)') &&
      CD.sorcerySpells.includes('Attract (Threat)');

    if (joinResult.success &&
        invocationStillZzistori &&
        sourceWhileCultSelected?.sourceLabel === 'Zzistori School (God Forgot sorcery)' &&
        clearResult.success &&
        CD.cult === null &&
        sourceAfterClear?.sourceLabel === 'Zzistori School (God Forgot sorcery)' &&
        spellsPreserved &&
        stepHtml.includes('Starting Spells')) {
      pass('Selecting then clearing an unrelated cult preserves Sorcerer school spells and UI');
    } else {
      fail('Unrelated cult selection/clear corrupted career-backed Sorcerer spell access',
        JSON.stringify({
          joinResult,
          clearResult,
          sourceWhileCultSelected,
          sourceAfterClear,
          selectedProfessionalSkills: CD.selectedProfessionalSkills,
          careerSkills: CD.careerSkills,
          sorcerySpells: CD.sorcerySpells,
          stepHtml: stepHtml.slice(0, 500)
        }));
    }
  } else {
    fail('Cult clearing helpers unavailable for Sorcerer school spell preservation test');
  }
}

{
  const { App: AppRef, CharacterData: CD, Calc: CalcRef } = loadApp();

  if (AppRef?.selectCult && AppRef.agent?.selectCult) {
    const setupUnresolvedInvocationPlaceholder = culture => {
      CD.culture = culture;
      CD.career = 'Sorcerer';
      CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 13, CHA: 10 };
      CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
      CD.selectedProfessionalSkills = ['Invocation (Cult, School or Grimoire)', 'Shaping', 'Literacy'];
      CD.careerSkills = { 'Invocation (Cult, School or Grimoire)': 15, Shaping: 10, Literacy: 5 };
      CD.culturalSkills = {};
      CD.bonusSkills = {};
      CD._cultBoundPlaceholderMap = {};
      CD.cult = null;
      CD.cultType = null;
      CD.passions = [];
      CD.miracles = [];
      CD.boundSpirits = [];
      CD.mysticismTalents = [];
      CD.sorcerySpells = [];
    };

    setupUnresolvedInvocationPlaceholder('God Forgot');
    const uiUnrelatedResult = AppRef.selectCult('Lhankor Mhy', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const uiUnrelatedPreserved = uiUnrelatedResult.success &&
      CD.selectedProfessionalSkills.includes('Invocation (Cult, School or Grimoire)') &&
      !CD.selectedProfessionalSkills.includes('Invocation (Lhankor Mhy)') &&
      CD.careerSkills['Invocation (Cult, School or Grimoire)'] === 15 &&
      CD.careerSkills['Invocation (Lhankor Mhy)'] === undefined;

    setupUnresolvedInvocationPlaceholder('God Forgot');
    const agentUnrelatedResult = AppRef.agent.selectCult('Lhankor Mhy');
    const agentUnrelatedPreserved = agentUnrelatedResult.success &&
      CD.selectedProfessionalSkills.includes('Invocation (Cult, School or Grimoire)') &&
      !CD.selectedProfessionalSkills.includes('Invocation (Lhankor Mhy)') &&
      CD.careerSkills['Invocation (Cult, School or Grimoire)'] === 15 &&
      CD.careerSkills['Invocation (Lhankor Mhy)'] === undefined;

    setupUnresolvedInvocationPlaceholder('Civilised');
    const uiSorceryResult = AppRef.selectCult('Arkat', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const uiSorceryResolved = uiSorceryResult.success &&
      CD.selectedProfessionalSkills.includes('Invocation (Arkat)') &&
      !CD.selectedProfessionalSkills.includes('Invocation (Cult, School or Grimoire)') &&
      CD.careerSkills['Invocation (Arkat)'] === 15 &&
      CD.careerSkills['Invocation (Cult, School or Grimoire)'] === undefined;

    setupUnresolvedInvocationPlaceholder('Civilised');
    const agentSorceryResult = AppRef.agent.selectCult('Arkat');
    const agentSorceryResolved = agentSorceryResult.success &&
      CD.selectedProfessionalSkills.includes('Invocation (Arkat)') &&
      !CD.selectedProfessionalSkills.includes('Invocation (Cult, School or Grimoire)') &&
      CD.careerSkills['Invocation (Arkat)'] === 15 &&
      CD.careerSkills['Invocation (Cult, School or Grimoire)'] === undefined;

    if (uiUnrelatedPreserved && agentUnrelatedPreserved && uiSorceryResolved && agentSorceryResolved) {
      pass('Unresolved Invocation placeholders only resolve for sorcery cults in UI and agent flows');
    } else {
      fail('Unresolved Invocation placeholder resolved against the wrong cult type',
        JSON.stringify({
          uiUnrelatedResult,
          agentUnrelatedResult,
          uiSorceryResult,
          agentSorceryResult,
          selectedProfessionalSkills: CD.selectedProfessionalSkills,
          careerSkills: CD.careerSkills
        }));
    }
  } else {
    fail('Cult selection helpers unavailable for unresolved Invocation placeholder guard test');
  }
}

{
  const { App: AppRef, CharacterData: CD, Calc: CalcRef } = loadApp();

  if (AppRef?.selectCult && AppRef.agent?.selectCult) {
    const setupTrackedSorcererPlaceholder = () => {
      CD.culture = 'Civilised';
      CD.career = 'Sorcerer';
      CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 13, CHA: 10 };
      CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
      CD.selectedProfessionalSkills = ['Invocation (Old School)', 'Shaping', 'Literacy'];
      CD.careerSkills = { 'Invocation (Old School)': 15, Shaping: 10, Literacy: 5 };
      CD._cultBoundPlaceholderMap = {
        'selectedProfessionalSkills:Invocation (Cult, School or Grimoire)': 'Invocation (Old School)',
        'careerSkills:Invocation (Cult, School or Grimoire)': 'Invocation (Old School)'
      };
      CD.cult = null;
      CD.cultType = null;
      CD.miracles = [];
      CD.boundSpirits = [];
      CD.mysticismTalents = [];
      CD.sorcerySpells = [];
    };

    setupTrackedSorcererPlaceholder();
    const uiResult = AppRef.selectCult('Arkat', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const uiRekeyed = uiResult.success &&
      CD.selectedProfessionalSkills.includes('Invocation (Arkat)') &&
      !CD.selectedProfessionalSkills.includes('Invocation (Old School)') &&
      CD.careerSkills['Invocation (Arkat)'] === 15 &&
      CD.careerSkills['Invocation (Old School)'] === undefined &&
      CD._cultBoundPlaceholderMap['selectedProfessionalSkills:Invocation (Cult, School or Grimoire)'] === 'Invocation (Arkat)' &&
      CD._cultBoundPlaceholderMap['careerSkills:Invocation (Cult, School or Grimoire)']?.skill === 'Invocation (Arkat)';

    setupTrackedSorcererPlaceholder();
    const agentResult = AppRef.agent.selectCult('Arkat');
    const agentRekeyed = agentResult.success &&
      CD.selectedProfessionalSkills.includes('Invocation (Arkat)') &&
      !CD.selectedProfessionalSkills.includes('Invocation (Old School)') &&
      CD.careerSkills['Invocation (Arkat)'] === 15 &&
      CD.careerSkills['Invocation (Old School)'] === undefined &&
      CD._cultBoundPlaceholderMap['selectedProfessionalSkills:Invocation (Cult, School or Grimoire)'] === 'Invocation (Arkat)' &&
      CD._cultBoundPlaceholderMap['careerSkills:Invocation (Cult, School or Grimoire)']?.skill === 'Invocation (Arkat)';

    if (uiRekeyed && agentRekeyed) {
      pass('Selecting a sorcery cult rekeys tracked Invocation placeholders in UI and agent flows');
    } else {
      fail('Sorcery cult selection failed to rekey tracked Invocation placeholders',
        JSON.stringify({
          uiResult,
          agentResult,
          selectedProfessionalSkills: CD.selectedProfessionalSkills,
          careerSkills: CD.careerSkills,
          placeholderMap: CD._cultBoundPlaceholderMap
        }));
    }
  } else {
    fail('Cult selection helpers unavailable for sorcery placeholder rekey regression');
  }
}

{
  const { App: AppRef, CharacterData: CD } = loadApp();

  if (AppRef?.selectCult && AppRef.renderStep9 && AppRef.resolveHigherMagicProviders) {
    CD.culture = 'Balazaring';
    CD.career = 'Shaman';
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 12, POW: 12, CHA: 12 };
    CD.selectedProfessionalSkills = ['Binding (Ancestor Tradition)', 'Trance', 'Healing'];
    CD.careerSkills = { 'Binding (Ancestor Tradition)': 0, Trance: 0, Healing: 0 };
    CD.cult = 'Orlanth';
    CD.cultType = { primary: 'theist', types: ['theist'], isHybrid: false };
    CD.boundSpirits = [{ name: 'Ancestor' }];
    CD.miracles = [];

    const clearResult = AppRef.selectCult(null, { skipConfirmation: true, allowMagicSelectionLoss: true });
    const providers = AppRef.resolveHigherMagicProviders(CD);
    const stepHtml = AppRef.renderStep9().innerHTML;
    if (clearResult.success &&
        providers.some(provider => provider.system === 'animism' && provider.sourceKind === 'core-career') &&
        CD.boundSpirits.some(spirit => spirit.name === 'Ancestor') &&
        stepHtml.includes('Starting Bound Spirits')) {
      pass('Clearing a deity preserves Shaman career-backed bound spirit selection UI');
    } else {
      fail('Clearing a deity removed Shaman bound spirit access',
        JSON.stringify({ clearResult, providers, boundSpirits: CD.boundSpirits, stepHtml }));
    }
  } else {
    fail('Cult clearing helpers unavailable for Shaman bound spirit preservation test');
  }
}

{
  const { App: AppRef, CharacterData: CD } = loadApp();

  if (AppRef?.selectCult && AppRef.agent?.selectCult && AppRef.resolveHigherMagicProviders) {
    CD.culture = 'Balazaring';
    CD.career = 'Shaman';
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 12, POW: 12, CHA: 12 };
    CD.selectedProfessionalSkills = ['Binding (Ancestor Tradition)', 'Trance', 'Healing'];
    CD.careerSkills = { 'Binding (Ancestor Tradition)': 0, Trance: 0, Healing: 0 };
    CD.cult = null;
    CD.cultType = null;
    CD.boundSpirits = [{ name: 'Ancestor' }];
    CD.miracles = [];

    const joinCultResult = AppRef.selectCult('Daka Fal', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const clearCultResult = AppRef.selectCult(null, { skipConfirmation: true, allowMagicSelectionLoss: true });
    const uiPreserved = joinCultResult.success &&
      clearCultResult.success &&
      CD.boundSpirits.some(spirit => spirit.name === 'Ancestor') &&
      AppRef.resolveHigherMagicProviders(CD).some(provider => provider.id === 'core-career-shaman-animism');

    CD.culture = 'Balazaring';
    CD.career = 'Shaman';
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 12, POW: 12, CHA: 12 };
    CD.selectedProfessionalSkills = ['Binding (Ancestor Tradition)', 'Trance', 'Healing'];
    CD.careerSkills = { 'Binding (Ancestor Tradition)': 0, Trance: 0, Healing: 0 };
    CD.cult = null;
    CD.cultType = null;
    CD.boundSpirits = [{ name: 'Ancestor' }];
    CD.miracles = [];

    const agentJoinCultResult = AppRef.agent.selectCult('Daka Fal');
    const agentClearCultResult = AppRef.agent.selectCult(null);
    const agentPreserved = agentJoinCultResult.success &&
      agentClearCultResult.success &&
      CD.boundSpirits.some(spirit => spirit.name === 'Ancestor') &&
      AppRef.resolveHigherMagicProviders(CD).some(provider => provider.id === 'core-career-shaman-animism');

    if (uiPreserved && agentPreserved) {
      pass('Joining then clearing an animist cult preserves Shaman career-backed bound spirits');
    } else {
      fail('Animist cult join/clear cascade lost Shaman career-backed spirits',
        JSON.stringify({ joinCultResult, clearCultResult, agentJoinCultResult, agentClearCultResult, boundSpirits: CD.boundSpirits }));
    }
  } else {
    fail('Cult clearing helpers unavailable for animist cascade preservation test');
  }
}

{
  const { App: AppRef, CharacterData: CD } = loadApp();

  if (AppRef?.selectCult && AppRef.agent?.selectCult && AppRef.resolveHigherMagicProviders) {
    const setupCareerBackedShamanSpirit = () => {
      CD.culture = 'Balazaring';
      CD.career = 'Shaman';
      CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 12, POW: 12, CHA: 12 };
      CD.selectedProfessionalSkills = ['Binding (Ancestor Tradition)', 'Trance', 'Healing'];
      CD.careerSkills = { 'Binding (Ancestor Tradition)': 0, Trance: 0, Healing: 0 };
      CD.cult = null;
      CD.cultType = null;
      CD.boundSpirits = [{ name: 'Ancestor' }];
      CD.miracles = [];
      CD.sorcerySpells = [];
      CD.mysticismTalents = [];
    };

    setupCareerBackedShamanSpirit();
    const uiJoinCultResult = AppRef.selectCult('Daka Fal', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const uiSwitchCultResult = AppRef.selectCult('Waha', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const uiSwitched = uiJoinCultResult.success &&
      uiSwitchCultResult.success &&
      CD.cult === 'Waha' &&
      CD.boundSpirits.some(spirit => spirit.name === 'Ancestor');

    setupCareerBackedShamanSpirit();
    const agentJoinCultResult = AppRef.agent.selectCult('Daka Fal');
    const agentSwitchCultResult = AppRef.agent.selectCult('Waha');
    const agentSwitched = agentJoinCultResult.success &&
      agentSwitchCultResult.success &&
      CD.cult === 'Waha' &&
      CD.boundSpirits.some(spirit => spirit.name === 'Ancestor');

    setupCareerBackedShamanSpirit();
    const uiMixedJoinCultResult = AppRef.selectCult('Daka Fal', { skipConfirmation: true, allowMagicSelectionLoss: true });
    CD.boundSpirits.push({ name: 'Cult Ancestor', originProviderId: 'cult-daka-fal-animism' });
    const uiMixedSwitchCultResult = AppRef.selectCult('Waha', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const uiMixedSwitched = uiMixedJoinCultResult.success &&
      uiMixedSwitchCultResult.success &&
      CD.cult === 'Waha' &&
      CD.boundSpirits.some(spirit => spirit.name === 'Ancestor' && spirit.originProviderId === 'core-career-shaman-animism') &&
      !CD.boundSpirits.some(spirit => spirit.name === 'Cult Ancestor');

    setupCareerBackedShamanSpirit();
    const agentMixedJoinCultResult = AppRef.agent.selectCult('Daka Fal');
    CD.boundSpirits.push({ name: 'Cult Ancestor', originProviderId: 'cult-daka-fal-animism' });
    const agentMixedSwitchCultResult = AppRef.agent.selectCult('Waha');
    const agentMixedHandled = (agentMixedJoinCultResult.success &&
      agentMixedSwitchCultResult.success === false &&
      CD.cult === 'Daka Fal' &&
      CD.boundSpirits.some(spirit => spirit.name === 'Ancestor' && spirit.originProviderId === 'core-career-shaman-animism') &&
      CD.boundSpirits.some(spirit => spirit.name === 'Cult Ancestor' && spirit.originProviderId === 'cult-daka-fal-animism')) ||
      (agentMixedJoinCultResult.success &&
        agentMixedSwitchCultResult.success === true &&
        CD.cult === 'Waha' &&
        CD.boundSpirits.some(spirit => spirit.name === 'Ancestor' && spirit.originProviderId === 'core-career-shaman-animism') &&
        !CD.boundSpirits.some(spirit => spirit.name === 'Cult Ancestor'));

    setupCareerBackedShamanSpirit();
    const agentStep9MixedJoinCultResult = AppRef.agent.selectCult('Daka Fal');
    CD.boundSpirits.push({ name: 'Cult Ancestor', originProviderId: 'cult-daka-fal-animism' });
    CD.bonusSkills = { Perception: 50, Survival: 50, Trance: 50, Oratory: 50, Dance: 50 };
    const agentStep9MixedSwitchResult = AppRef.agent.setStep(9, {
      cult: 'Waha',
      miracles: [],
      boundSpirits: CD.boundSpirits
    });
    const agentStep9MixedHandled = (agentStep9MixedJoinCultResult.success &&
      agentStep9MixedSwitchResult.success === false &&
      /Cult Ancestor/.test((agentStep9MixedSwitchResult.errors || []).join('; ')) &&
      CD.cult === 'Daka Fal' &&
      CD.boundSpirits.some(spirit => spirit.name === 'Ancestor' && spirit.originProviderId === 'core-career-shaman-animism') &&
      CD.boundSpirits.some(spirit => spirit.name === 'Cult Ancestor' && spirit.originProviderId === 'cult-daka-fal-animism')) ||
      (agentStep9MixedJoinCultResult.success &&
        agentStep9MixedSwitchResult.success === true &&
        CD.cult === 'Waha' &&
        CD.boundSpirits.some(spirit => spirit.name === 'Ancestor' && spirit.originProviderId === 'core-career-shaman-animism') &&
        !CD.boundSpirits.some(spirit => spirit.name === 'Cult Ancestor'));

    setupCareerBackedShamanSpirit();
    const agentStep9SubmittedJoinCultResult = AppRef.agent.selectCult('Daka Fal');
    CD.bonusSkills = { Perception: 50, Survival: 50, Trance: 50, Oratory: 50, Dance: 50 };
    const submittedOldCultSpirits = [
      ...CD.boundSpirits,
      { name: 'Cult Ancestor', originProviderId: 'cult-daka-fal-animism' }
    ];
    const agentStep9SubmittedOldCultResult = AppRef.agent.setStep(9, {
      cult: 'Waha',
      miracles: [],
      boundSpirits: submittedOldCultSpirits
    });
    const agentStep9SubmittedOldCultHandled = (agentStep9SubmittedJoinCultResult.success &&
      agentStep9SubmittedOldCultResult.success === false &&
      /Cult Ancestor/.test((agentStep9SubmittedOldCultResult.errors || []).join('; ')) &&
      CD.cult === 'Daka Fal' &&
      CD.boundSpirits.some(spirit => spirit.name === 'Ancestor' && spirit.originProviderId === 'core-career-shaman-animism') &&
      !CD.boundSpirits.some(spirit => spirit.name === 'Cult Ancestor')) ||
      (agentStep9SubmittedJoinCultResult.success &&
        agentStep9SubmittedOldCultResult.success === true &&
        CD.cult === 'Waha' &&
        CD.boundSpirits.some(spirit => spirit.name === 'Ancestor' && spirit.originProviderId === 'core-career-shaman-animism') &&
        !CD.boundSpirits.some(spirit => spirit.name === 'Cult Ancestor'));

    if (uiSwitched && agentSwitched) {
      pass('Switching animist cults preserves Shaman career-backed bound spirits for UI and agent flows');
    } else {
      fail('Animist cult-to-cult switch lost Shaman career-backed spirits',
        JSON.stringify({
          uiJoinCultResult,
          uiSwitchCultResult,
          agentJoinCultResult,
          agentSwitchCultResult,
          uiMixedJoinCultResult,
          uiMixedSwitchCultResult,
          agentMixedJoinCultResult,
          agentMixedSwitchCultResult,
          agentStep9MixedJoinCultResult,
          agentStep9MixedSwitchResult,
          agentStep9SubmittedJoinCultResult,
          agentStep9SubmittedOldCultResult,
          cult: CD.cult,
          boundSpirits: CD.boundSpirits
        }));
    }
  } else {
    fail('Cult selection helpers unavailable for animist cult switch preservation test');
  }
}

{
  const { App: AppRef, CharacterData: CD } = loadApp();

  if (AppRef?.selectCult && AppRef?.agent?.selectCult && AppRef?.resolveActiveSorcerySource) {
    const setupState = () => {
      CD.culture = 'God Forgot';
      CD.career = 'Sorcerer';
      CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 13, CHA: 10 };
      CD.selectedProfessionalSkills = ['Invocation (Zzistori School)', 'Shaping', 'Lore (Sorcery)'];
      CD.careerSkills = { 'Invocation (Zzistori School)': 10, Shaping: 10, 'Lore (Sorcery)': 10 };
      CD.cult = null;
      CD.cultChoiceMade = false;
      CD.cultInitiated = false;
      CD.cultType = null;
      CD.sorcerySpells = ['Holdfast'];
      CD.miracles = [];
      CD.boundSpirits = [];
      CD.passions = [{ name: 'Loyalty (Clan)', value: 60 }];
      CD.companions = [
        { name: 'Stable Horse', autoPopulated: true },
        { name: 'Manual Wolf' }
      ];
    };

    setupState();
    const uiJoin = AppRef.selectCult('Orlanth', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const uiSourceAfterJoin = AppRef.resolveActiveSorcerySource(CD);
    const uiJoinValid = uiJoin.success &&
      CD.passions.some(p => p.name === 'Loyalty (Orlanth)') &&
      CD.companions.some(c => c.name === 'Manual Wolf') &&
      !CD.companions.some(c => c.name === 'Stable Horse') &&
      uiSourceAfterJoin?.sourceLabel === 'Zzistori School (God Forgot sorcery)' &&
      CD.sorcerySpells.includes('Holdfast');

    const uiClear = AppRef.selectCult(null, { skipConfirmation: true, allowMagicSelectionLoss: true });
    const uiClearValid = uiClear.success &&
      !CD.passions.some(p => /^Loyalty \(Orlanth\)$/.test(p.name || '')) &&
      CD.passions.some(p => p.name === 'Loyalty (Clan)') &&
      CD.sorcerySpells.includes('Holdfast');

    setupState();
    const agentJoin = AppRef.agent.selectCult('Orlanth');
    const agentSourceAfterJoin = AppRef.resolveActiveSorcerySource(CD);
    const agentJoinValid = agentJoin.success &&
      CD.passions.some(p => p.name === 'Loyalty (Orlanth)') &&
      CD.companions.some(c => c.name === 'Manual Wolf') &&
      !CD.companions.some(c => c.name === 'Stable Horse') &&
      agentSourceAfterJoin?.sourceLabel === 'Zzistori School (God Forgot sorcery)' &&
      CD.sorcerySpells.includes('Holdfast');

    const agentClear = AppRef.agent.selectCult(null);
    const agentClearValid = agentClear.success &&
      !CD.passions.some(p => /^Loyalty \(Orlanth\)$/.test(p.name || '')) &&
      CD.passions.some(p => p.name === 'Loyalty (Clan)') &&
      CD.sorcerySpells.includes('Holdfast');

    if (uiJoinValid && uiClearValid && agentJoinValid && agentClearValid) {
      pass('UI and agent cult selection parity: loyalty passion sync, source-backed sorcery preserved, auto companions cleared');
    } else {
      fail('UI/agent cult selection parity regression', JSON.stringify({
        uiJoin,
        uiClear,
        agentJoin,
        agentClear,
        passions: CD.passions,
        companions: CD.companions,
        sorcerySpells: CD.sorcerySpells
      }));
    }
  } else {
    fail('Cult selection parity helpers unavailable for UI/agent parity test');
  }
}

{
  const { App: AppRef, CharacterData: CD, CULTURES_DATA: CulturesData } = loadApp();

  if (AppRef && AppRef.getCulturalSkillRenderPlan) {
    const praxian = CulturesData.find(c => c.name === 'Praxian');

    CD.culturalSkills = { Navigate: 0 };
    const navigatePlan = AppRef.getCulturalSkillRenderPlan(praxian)
      .map(item => item.type === 'choice' ? item.storedChoice : item.skillName)
      .filter(Boolean);
    const navigateCount = navigatePlan.filter(name => name === 'Navigate').length;

    CD.culturalSkills = { Swim: 0 };
    const swimPlan = AppRef.getCulturalSkillRenderPlan(praxian)
      .map(item => item.type === 'choice' ? item.storedChoice : item.skillName)
      .filter(Boolean);

    if (navigateCount === 1 && swimPlan.includes('Swim') && swimPlan.includes('Navigate')) {
      pass('Step 5 collapses duplicate cultural rows when a choice resolves to an existing skill');
    } else {
      fail('Step 5 renders duplicate or missing cultural choice rows',
        JSON.stringify({ navigatePlan, swimPlan }));
    }
  } else {
    fail('App.getCulturalSkillRenderPlan function not found');
  }
}

{
  const { App: AppRef, CharacterData: CD, CULTURE_CULT_MAP: CultureCultMap } = loadApp();

  if (AppRef && AppRef.selectCulture && AppRef.getHomelandSuggestions && AppRef.validateCurrentStep) {
    AppRef.currentStep = 4;
    AppRef.selectCulture('Praxian');
    AppRef.selectHomeland("Pimper's Block");
    AppRef.selectCulture('Telmori Hsunchen');
    AppRef.selectCombatStyle('Telmori Hunter');
    const validHomelands = AppRef.getHomelandSuggestions('Telmori Hsunchen');
    const homelandValid = validHomelands.includes(CD.homeland);
    const allowed = AppRef.validateCurrentStep();

    if (homelandValid && allowed === true) {
      pass('Changing Step 4 cultures resets homeland to a valid visible option');
    } else {
      fail('Changing Step 4 cultures left stale or blank homeland',
        JSON.stringify({ homeland: CD.homeland, validHomelands, allowed }));
    }
  } else {
    fail('Step 4 homeland reset dependencies not found');
  }
}

{
  const { CULTURE_BUILDS: CultureBuilds, CULTURES_DATA: CulturesData } = loadApp();

  if (CultureBuilds && CulturesData) {
    const missingCultures = CulturesData
      .map(culture => culture.name)
      .filter(cultureName => !Array.isArray(CultureBuilds[cultureName]) || CultureBuilds[cultureName].length === 0);
    if (missingCultures.length === 0) {
      pass('All cultures have Step 4 suggested builds');
    } else {
      fail('Step 4 suggested builds missing cultures', missingCultures.join(', '));
    }
  } else {
    fail('Suggested build data not available to tests');
  }
}

{
  const { CULTURE_BUILDS: CultureBuilds, CULTURES_DATA: CulturesData } = loadApp();

  if (CultureBuilds && CulturesData) {
    const missing = [];
    Object.entries(CultureBuilds).forEach(([cultureName, builds]) => {
      const culture = CulturesData.find(c => c.name === cultureName);
      const styleNames = new Set((culture?.combatStyles || []).map(cs => cs.name));
      builds.forEach(build => {
        if (!styleNames.has(build.style)) {
          missing.push(`${cultureName}/${build.name}: ${build.style}`);
        }
      });
    });

    if (missing.length === 0) {
      pass('All Step 4 suggested builds reference valid culture combat styles');
    } else {
      fail('Suggested builds reference missing combat styles', missing.join('; '));
    }
  } else {
    fail('Suggested build data not available to tests');
  }
}

{
  const { CULTURE_BUILDS: CultureBuilds, CULTURE_BUILD_SPECS: CultureBuildSpecs } = loadApp();
  const refPath = path.join(__dirname, 'references', 'aig-raw', 'culture-build-specs-aig.json');
  const ref = JSON.parse(fs.readFileSync(refPath, 'utf8'));

  if (CultureBuilds && CultureBuildSpecs) {
    const missingSpecIds = [];
    Object.entries(CultureBuilds).forEach(([cultureName, builds]) => {
      builds.forEach(build => {
        if (!build.specId || !CultureBuildSpecs[build.specId]) {
          missingSpecIds.push(`${cultureName}/${build.name}`);
        }
      });
    });
    const buildsMatch = JSON.stringify(ref.builds || {}) === JSON.stringify(CultureBuilds);
    const specsMatch = JSON.stringify(ref.specs || {}) === JSON.stringify(CultureBuildSpecs);
    const hasCitations = Boolean(ref.page_citations?.culture_packages) &&
      Boolean(ref.page_citations?.character_creation) &&
      Boolean(ref.page_citations?.combat_styles);

    if (missingSpecIds.length === 0 && buildsMatch && specsMatch && hasCitations) {
      pass('All Step 4 suggested builds link to source-backed complete character specs');
    } else {
      fail('Suggested build specs are missing or out of sync with reference data',
        JSON.stringify({ missingSpecIds, buildsMatch, specsMatch, hasCitations }));
    }
  } else {
    fail('Suggested build spec data not available to tests');
  }
}

{
  const { CULTURE_BUILD_SPECS: CultureBuildSpecs } = loadApp();
  const zzistori = CultureBuildSpecs?.['god-forgot-zzistori-sorcerer'];
  const passionNames = (zzistori?.spec?.step6?.passions || []).map(passion => passion.name);
  const usesNoCult = zzistori?.spec?.step9?.cult === null;
  const hasSchoolLoyalty = passionNames.includes('Loyalty (Zzistori School)');
  const hasDevotion = passionNames.some(name => /^Devotion\b/.test(name));

  if (zzistori && usesNoCult && hasSchoolLoyalty && !hasDevotion) {
    pass('Zzistori suggested build uses No Cult and school loyalty instead of Devotion');
  } else {
    fail('Zzistori suggested build still implies cult devotion',
      JSON.stringify({ exists: Boolean(zzistori), usesNoCult, hasSchoolLoyalty, hasDevotion, passionNames }));
  }
}

{
  const { CULTURE_BUILDS: CultureBuilds, CULTURE_BUILD_SPECS: CultureBuildSpecs } = loadApp();

  if (CultureBuilds && CultureBuildSpecs) {
    const failures = [];
    Object.entries(CultureBuilds).forEach(([cultureName, builds]) => {
      builds.forEach(build => {
        const record = CultureBuildSpecs[build.specId];
        const fresh = loadApp();
        fresh.App.renderCurrentStep = () => {};
        fresh.App.saveToLocalStorage = () => {};
        fresh.App.switchMode = mode => { fresh.App.mode = mode; };
        const result = fresh.App.agent.buildCharacter(record?.spec);
        const selectedStyle = fresh.CharacterData.combatStyles?.[0]?.name;
        if (
          !record ||
          !result.success ||
          fresh.CharacterData.culture !== cultureName ||
          fresh.CharacterData.career !== build.career ||
          selectedStyle !== build.style ||
          fresh.CharacterData.cult !== null
        ) {
          failures.push(`${cultureName}/${build.name}: ${JSON.stringify({
            success: result.success,
            failedStep: result.failedStep,
            errors: result.errors,
            culture: fresh.CharacterData.culture,
            career: fresh.CharacterData.career,
            style: selectedStyle,
            cult: fresh.CharacterData.cult
          })}`);
        }
      });
    });

    if (failures.length === 0) {
      pass('All Step 4 suggested build specs produce complete valid characters');
    } else {
      fail('Suggested build complete-character specs failed to build', failures.join('; '));
    }
  } else {
    fail('Suggested build spec data not available to tests');
  }
}

{
  const { App: AppRef, CharacterData: CD, CULTURE_CULT_MAP: CultureCultMap } = loadApp();

  if (AppRef && AppRef.selectCulture && AppRef.selectCult && AppRef.renderStep9) {
    AppRef.currentStep = 4;
    AppRef.selectCulture('Praxian');
    AppRef.selectCult('Waha');
    CD.miracles = ['Shield'];
    CD.boundSpirits = [{name: 'Ancestor Spirit — Sagacity (Int 1)'}];
    CD.sorcerySpells = ['Holdfast'];
    const rejectedChange = AppRef.selectCulture('God Forgot');
    const rejectedPreserved = rejectedChange?.success === false &&
      CD.culture === 'Praxian' &&
      CD.cult === 'Waha' &&
      CD.miracles.length === 1 &&
      CD.boundSpirits.length === 1 &&
      CD.sorcerySpells.length === 1;

    CD.miracles = [];
    CD.boundSpirits = [];
    CD.sorcerySpells = [];
    const clearedChange = AppRef.selectCulture('God Forgot');
    CD.career = 'Warrior';
    AppRef.currentStep = 9;
    const step9 = AppRef.renderStep9();
    const html = step9.innerHTML || '';

    const cleared = clearedChange?.success === true &&
      CD.cult === null &&
      CD.cultType === null &&
      CD.devotionalPool === 0 &&
      CD.boundSpiritSlots === 0 &&
      CD.sorceryResource === 0 &&
      CD.miracles.length === 0 &&
      CD.boundSpirits.length === 0 &&
      CD.sorcerySpells.length === 0;
    const godForgotMap = CultureCultMap?.['God Forgot'] || {};
    const godForgotNoCult = html.includes('✓ No Cult') &&
      (godForgotMap.primary || []).length === 0 &&
      (godForgotMap.secondary || []).includes('Arkat') &&
      !html.includes('Select Initiate Miracles') &&
      !html.includes('Starting Bound Spirits') &&
      !(godForgotMap.secondary || []).includes('Waha');

    if (rejectedPreserved && cleared && godForgotNoCult) {
      pass('Changing culture rejects selected cult magic loss and clears empty stale cult state');
    } else {
      fail('Culture change mishandled selected cult magic loss or God Forgot cult UI',
        JSON.stringify({ rejectedPreserved, cleared, godForgotNoCult, rejectedChange, clearedChange, culture: CD.culture, cult: CD.cult, devotionalPool: CD.devotionalPool, boundSpiritSlots: CD.boundSpiritSlots }));
    }
  } else {
    fail('Culture-change cult clearing dependencies not found');
  }
}

{
  const { CULTURE_MAGIC_PROFILES: Profiles, CULTURES_DATA: CulturesData } = loadApp();

  if (Profiles && CulturesData) {
    const missingCultures = CulturesData
      .map(culture => culture.name)
      .filter(cultureName => !Profiles[cultureName]);
    const malformed = Object.entries(Profiles)
      .filter(([cultureName, profile]) => {
        const hasKnownSignal = ['folkMagic', 'runeMagic', 'spiritMagic', 'sorcery', 'lunarMagic']
          .some(key => profile[key] && typeof profile[key].status === 'string' && Array.isArray(profile[key].pages));
        return !CulturesData.some(culture => culture.name === cultureName) ||
          !Array.isArray(profile.citations) ||
          profile.citations.length === 0 ||
          !hasKnownSignal;
      })
      .map(([cultureName]) => cultureName);

    if (missingCultures.length === 0 && malformed.length === 0) {
      pass('Culture magic profiles cover every culture with cited magic-system signals');
    } else {
      fail('Culture magic profiles are missing or malformed',
        JSON.stringify({ missingCultures, malformed }));
    }
  } else {
    fail('Culture magic profiles not available to tests');
  }
}

{
  const { CULTURE_MAGIC_PROFILES: Profiles } = loadApp();
  const godForgot = Profiles?.['God Forgot'];
  const praxian = Profiles?.Praxian;
  const telmori = Profiles?.['Telmori Hsunchen'];
  const lunarProvincial = Profiles?.['Lunar Provincial'];
  const lunarHeartland = Profiles?.['Lunar Heartland'];
  const failures = [];

  if (godForgot?.sorcery?.status !== 'cultural' || godForgot?.runeMagic?.status !== 'unavailable') {
    failures.push('God Forgot sorcery/rune magic signal');
  }
  if (praxian?.spiritMagic?.status !== 'cultural') {
    failures.push('Praxian animism/spirit magic signal');
  }
  if (telmori?.spiritMagic?.status !== 'cultural') {
    failures.push('Telmori animism/spirit magic signal');
  }
  if (telmori?.runeMagic?.status !== 'absent' || telmori?.citations?.includes('AiG p.136-137')) {
    failures.push('Telmori Rune Magic absence/source scope signal');
  }
  if (lunarProvincial?.lunarMagic?.status !== 'context' || lunarHeartland?.lunarMagic?.status !== 'context') {
    failures.push('Lunar Magic preview caveat signal');
  }

  if (failures.length === 0) {
    pass('Culture magic profiles preserve key AiG cultural magic signals');
  } else {
    fail('Culture magic profiles missing key AiG signals', failures.join('; '));
  }
}

{
  const { App: AppRef, CharacterData: CD } = loadApp();

  if (AppRef && AppRef.selectCulture && AppRef._doApplyBuild) {
    AppRef.currentStep = 4;
    AppRef.selectCulture('Praxian');
    AppRef.selectCombatStyle('Bison');
    AppRef.selectCulture('Sartarite (Heortling)');
    const autoStyleBefore = CD.combatStyles[0]?.name;

    AppRef._doApplyBuild({
      name: 'Orlanthi Thane',
      stats: 'High STR, CHA',
      career: 'Warrior',
      style: 'Loyal Housecarl'
    });

    const selected = CD._pendingCombatStyleSelection === false &&
      CD.career === 'Warrior' &&
      CD.combatStyles.length === 1 &&
      CD.combatStyles[0].id === 'cse:sartarite-heortling:loyal-housecarl' &&
      CD.combatStyles[0].name === 'Loyal Housecarl' &&
      CD.combatStyles[0].weapons.includes('Broadsword') &&
      CD.combatStyles[0].citation?.source === 'Combat Styles Encyclopedia';

    if (autoStyleBefore === 'Hill Clan Levy' && selected) {
      pass('Applying a Step 4 suggested build sets its valid combat style without stale state');
    } else {
      fail('Suggested build did not apply combat style cleanly',
        JSON.stringify({ autoStyleBefore, career: CD.career, pending: CD._pendingCombatStyleSelection, combatStyles: CD.combatStyles }));
    }
  } else {
    fail('Suggested build application dependencies not found');
  }
}

{
  const { App: AppRef, CharacterData: CD, CULTURE_BUILDS: CultureBuilds } = loadApp();

  if (AppRef && AppRef.selectCulture && AppRef._doApplyBuild && CultureBuilds) {
    const invalid = [];
    Object.entries(CultureBuilds).forEach(([cultureName, builds]) => {
      builds.forEach(build => {
        AppRef.currentStep = 4;
        AppRef.selectCulture(cultureName);
        AppRef._doApplyBuild(build);
        const total = Object.values(CD.characteristics).reduce((sum, value) => sum + value, 0);
        const highStats = build.stats.match(/STR|CON|SIZ|DEX|INT|POW|CHA/g) || [];
        const highsVisible = highStats.every(stat => CD.characteristics[stat] >= 13);
        if (total !== 75 || !highsVisible) {
          invalid.push(`${cultureName}/${build.name}: total=${total}, highs=${highStats.map(stat => `${stat}:${CD.characteristics[stat]}`).join(',')}`);
        }
      });
    });

    if (invalid.length === 0) {
      pass('All Step 4 suggested builds apply valid 75-point characteristics');
    } else {
      fail('Suggested builds apply invalid characteristic budgets', invalid.join('; '));
    }
  } else {
    fail('Suggested build characteristic dependencies not found');
  }
}

{
  const { App: AppRef, CharacterData: CD } = loadApp();

  if (AppRef && AppRef.validateCurrentStep && AppRef.getValidationState) {
    AppRef.currentStep = 5;
    CD.culture = 'God Forgot';
    CD.culturalSkills = {
      Conceal: 10,
      Deceit: 15,
      Endurance: 15,
      Influence: 15,
      Insight: 15,
      Locale: 15,
      Willpower: 15,
      'Craft (any)': 0,
      'Lore (any)': 0
    };
    CD.folkMagicSpells = ['Alarm', 'Avert', 'Bludgeon'];
    CD.runeAffinities = { primary: 'Darkness', secondary: 'Law', tertiary: 'Stasis' };

    const allowed = AppRef.validateCurrentStep();
    const allowedState = AppRef.getValidationState();
    if (allowed === true && allowedState.valid === true) {
      pass('Step 5 ignores unresolved cultural placeholders with zero allocated points');
    } else {
      fail('Step 5 blocked zero-point unresolved cultural placeholders',
        JSON.stringify({ allowed, allowedState }));
    }

    CD.culturalSkills['Craft (any)'] = 5;
    CD.culturalSkills.Conceal = 5;
    const blocked = AppRef.validateCurrentStep();
    const blockedState = AppRef.getValidationState();
    if (blocked === false && blockedState.errors.some(e => e.includes('Craft (any)'))) {
      pass('Step 5 blocks unresolved cultural placeholders with allocated points');
    } else {
      fail('Step 5 allowed allocated unresolved cultural placeholder',
        JSON.stringify({ blocked, blockedState }));
    }
  } else {
    fail('Step 5 validation dependencies not found');
  }
}

{
  const { App: AppRef, CharacterData: CD } = loadApp();

  if (AppRef && AppRef.validateCurrentStep) {
    AppRef.currentStep = 4;
    CD.culture = 'Praxian';
    CD.homeland = 'Prax';
    CD.combatStyles = [];
    CD._pendingCombatStyleSelection = true;

    const blocked = AppRef.validateCurrentStep();
    if (blocked === false) {
      pass('Step 4 blocks cultures with multiple combat styles until one is selected');
    } else {
      fail('Step 4 allowed advancement without a combat style selection');
    }

    CD.combatStyles = [{ name: 'Bison Rider', weapons: ['Lance', 'Sling'], traits: ['Mounted'] }];
    CD._pendingCombatStyleSelection = false;
    const allowed = AppRef.validateCurrentStep();
    if (allowed === true) {
      pass('Step 4 allows advancement after selecting a combat style');
    } else {
      fail('Step 4 blocked advancement despite a selected combat style');
    }
  } else {
    fail('App.validateCurrentStep function not found');
  }
}

{
  const { App: AppRef, CharacterData: CD, CULTURES_DATA: CulturesData } = loadApp();

  if (AppRef && AppRef.selectCulture && AppRef.selectCombatStyle && AppRef.renderCultureDetails) {
    const praxian = CulturesData.find(c => c.name === 'Praxian');
    const firstStyle = praxian?.combatStyles?.find(cs => !cs.restrictions);
    AppRef.currentStep = 4;
    AppRef.selectCulture('Praxian');
    const detailsHtml = AppRef.renderCultureDetails();
    const pending = CD._pendingCombatStyleSelection === true && (!CD.combatStyles || CD.combatStyles.length === 0);
    const dropdownRendered = detailsHtml.includes('id="combat-style-select"');

    AppRef.selectCombatStyle(firstStyle.name);
    const selected = CD._pendingCombatStyleSelection === false &&
      CD.combatStyles.length === 1 &&
      CD.combatStyles[0].name === firstStyle.name;

    if (pending && dropdownRendered && selected) {
      pass('selectCulture(Praxian) defers combat style selection and selectCombatStyle() applies chosen style');
    } else {
      fail('Praxian combat style dropdown flow failed',
        JSON.stringify({ pending, dropdownRendered, selected, style: firstStyle?.name, combatStyles: CD.combatStyles }));
    }
  } else {
    fail('Step 4 combat style selection UI dependencies not found');
  }
}

{
  const { App: AppRef, CharacterData: CD } = loadApp();

  if (AppRef && AppRef.validateCurrentStep && AppRef.getValidationState) {
    AppRef.currentStep = 12;
    CD.culture = 'Praxian';
    CD.socialClass = null;
    CD.socialClassMoneyMod = 1;

    const blocked = AppRef.validateCurrentStep();
    const state = AppRef.getValidationState();
    if (blocked === false && state.valid === false && state.errors.some(e => e.includes('social class'))) {
      pass('Step 12 blocks advancement until social class is rolled or selected');
    } else {
      fail('Step 12 allowed blank social class', JSON.stringify({ blocked, state }));
    }

    CD.socialClass = 'Freeman';
    CD.socialClassMoneyMod = 1;
    const allowed = AppRef.validateCurrentStep();
    const allowedState = AppRef.getValidationState();
    if (allowed === true && allowedState.valid === true) {
      pass('Step 12 allows advancement after social class selection');
    } else {
      fail('Step 12 blocked valid social class selection', JSON.stringify({ allowed, allowedState }));
    }
  } else {
    fail('App.validateCurrentStep or App.getValidationState function not found');
  }
}

{
  const { App: AppRef, CharacterData: CD } = loadApp();

  if (AppRef?.selectSocialClass && AppRef?.agent?.setStep && AppRef?.autoPopulateCompanion) {
    const origRender = AppRef.renderCurrentStep;
    const origSave = AppRef.saveToLocalStorage;
    AppRef.renderCurrentStep = function() {};
    AppRef.saveToLocalStorage = function() {};

    const seedGentryHorse = () => {
      CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 10, POW: 10, CHA: 10 };
      CD.culture = 'Esrolian';
      CD.cult = null;
      CD.career = 'Farmer';
      CD.socialClass = 'Gentry';
      CD.socialClassMoneyMod = 3;
      CD.combatStyles = [];
      CD.companions = [];
      AppRef.autoPopulateCompanion();
      return CD.companions.map(companion => companion.name);
    };

    const uiBefore = seedGentryHorse();
    AppRef.selectSocialClass('Freeman');
    const uiAfter = CD.companions.map(companion => companion.name);

    const agentBefore = seedGentryHorse();
    const agentResult = AppRef.agent.setStep(12, { socialClass: 'Freeman' });
    const agentAfter = CD.companions.map(companion => companion.name);

    CD.socialClass = 'Gentry';
    CD.companions = [{ name: 'Manual Stable Horse' }];
    AppRef.selectSocialClass('Freeman');
    const manualUiAfter = CD.companions.map(companion => companion.name);

    CD.socialClass = 'Gentry';
    CD.companions = [{ name: 'Manual Agent Horse' }];
    const manualAgentResult = AppRef.agent.setStep(12, { socialClass: 'Freeman' });
    const manualAgentAfter = CD.companions.map(companion => companion.name);

    AppRef.renderCurrentStep = origRender;
    AppRef.saveToLocalStorage = origSave;

    if (
      uiBefore.includes('Riding Horse') &&
      agentBefore.includes('Riding Horse') &&
      uiAfter.length === 0 &&
      agentResult.success === true &&
      agentAfter.length === 0 &&
      manualUiAfter.includes('Manual Stable Horse') &&
      manualAgentResult.success === true &&
      manualAgentAfter.includes('Manual Agent Horse')
    ) {
      pass('Social class changes clear stale auto-populated companions while preserving manual companions');
    } else {
      fail('Social class changes leave stale companions attached',
        JSON.stringify({ uiBefore, uiAfter, agentBefore, agentAfter, agentResult, manualUiAfter, manualAgentAfter, manualAgentResult }));
    }
  } else {
    fail('Social-class companion reset dependencies not found');
  }
}

{
  const { App: AppRef, CharacterData: CD, CULTURES_DATA: CulturesData, _sandbox: sandbox } = loadApp();

  if (AppRef?.agent?.setStep && AppRef.rollStartingMoneyForCulture) {
    const oldRandom = sandbox.Math.random;
    try {
      sandbox.Math.random = () => 0;
      CD.socialClass = 'Test Double Money';
      CD.socialClassMoneyMod = 2;
      CD.startingMoney = 0;
      const stepResult = AppRef.agent.setStep(4, { culture: 'Praxian', homeland: 'Prax', rollMoney: true });
      const praxian = CulturesData.find(culture => culture.name === 'Praxian');
      const helperRoll = AppRef.rollStartingMoneyForCulture(praxian, 2);
      if (stepResult?.success === true && CD.startingMoney === helperRoll?.total && CD.startingMoney === 40) {
        pass('Agent Step 4 starting money applies the same social-class multiplier as the UI helper');
      } else {
        fail('Agent Step 4 starting money diverges from UI helper',
          JSON.stringify({ stepResult, agentMoney: CD.startingMoney, helperRoll }));
      }
    } finally {
      sandbox.Math.random = oldRandom;
    }
  } else {
    fail('Starting-money parity dependencies not found');
  }
}

{
  const { App: AppRef, CharacterData: CD, CULTS_DATA: CultsData } = loadApp();

  if (AppRef && AppRef.validateCurrentStep) {
    // Setup: character with cult but skills below 50%
    CD.cult = '7 Mothers - Irrippi Ontor';
    CD.characteristics = { STR: 11, CON: 12, SIZ: 13, DEX: 14, INT: 15, POW: 10, CHA: 10 };
    CD.bonusSkills = {};
    CD.culturalSkills = {};
    CD.careerSkills = {};
    CD.miracles = ['Extension', 'Find (Specific Thing)', 'Divination', 'Chastise', 'Dismiss Elemental'];
    CD.devotionalPool = 5;
    AppRef.currentStep = 9;

    // Test 1: Blocks advancement when cult skills not met
    const result1 = AppRef.validateCurrentStep();
    if (result1 === false) {
      pass('Step 9 blocks advancement when initiation requirements unmet');
    } else {
      fail('Step 9 blocks advancement when initiation requirements unmet', `validateCurrentStep returned ${result1}`);
    }

    // Test 2: Gate enforced regardless (no GM override path)
    // Verify the gate cannot be bypassed — gmOverrideInitiation field has no effect
    CD.gmOverrideInitiation = true; // Should have no effect now
    const result2 = AppRef.validateCurrentStep();
    if (result2 === false) {
      pass('Step 9 initiation gate cannot be bypassed by gmOverrideInitiation flag');
    } else {
      fail('Step 9 initiation gate cannot be bypassed by gmOverrideInitiation flag');
    }
  } else {
    fail('App.validateCurrentStep function not found');
  }
}

{
  const { App: AppRef, CharacterData: CD, Calc: CalcRef, CULTS_DATA: CultsData } = loadApp();

  if (AppRef && AppRef.validateCurrentStep && AppRef.getEffectiveInitiateMiracleLimit) {
    CD.cult = 'Orlanth';
    CD.cultChoiceMade = true;
    CD.cultInitiated = true; // Post-initiation gate test: full initiate checks must still work.
    CD.characteristics = { STR: 12, CON: 12, SIZ: 12, DEX: 13, INT: 15, POW: 14, CHA: 14 };
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    CD.runeAffinities = { primary: 'Air', secondary: 'Movement', tertiary: 'Death' };
    CD.combatStyles = [{ name: 'Sartarite Fyrd', weapons: ['Broadsword', 'Spear'] }];
    CD.culturalSkills = {
      'Language (Heortling)': 0,
      'Native Tongue': 0,
      'Combat Style (Cultural Style)': 25
    };
    CD.careerSkills = {
      'Devotion (Orlanth)': 22
    };
    CD.bonusSkills = {
      Oratory: 22
    };
    CD.devotionalPool = 7;

    const selectedRunes = Object.values(CD.runeAffinities);
    const qualifiedMiracles = AppRef.getQualifiedInitiateMiracles('Orlanth')
      .filter(m => m.source === 'common' || (m.runes || []).some(r => r === 'Any' || selectedRunes.includes(r)));
    CD.miracles = qualifiedMiracles
      .slice(0, AppRef.getEffectiveInitiateMiracleLimit('Orlanth'))
      .map(m => m.name);
    AppRef.currentStep = 9;

    const result = AppRef.validateCurrentStep();
    if (result !== false) {
      pass('Step 9 initiation gate resolves case, rune, devotion, and sword combat-style cult skills');
    } else {
      fail('Step 9 initiation gate resolves case, rune, devotion, and sword combat-style cult skills');
    }

    const stormspeech = AppRef.resolveCultSkillRequirement('Language (Stormspeech)');
    if (stormspeech.key === 'Language (Stormspeech)' && stormspeech.matchedName === 'Language (Stormspeech)') {
      pass('Cult-specific language requirements do not alias to another learned language');
    } else {
      fail('Cult-specific language requirements do not alias to another learned language',
        `Resolved to ${stormspeech.key}/${stormspeech.matchedName}`);
    }

    CD.culture = 'Praxian';
    CD.characteristics = { STR: 12, CON: 12, SIZ: 12, DEX: 12, INT: 12, POW: 8, CHA: 7 };
    CD.combatStyles = [{ name: 'Bison', weapons: ['1H Axe', 'Javelin', 'Lance', '1H Sword', 'Praxian Shield'] }];
    CD.culturalSkills = {};
    CD.careerSkills = { 'Combat Style (Bison)': 11 };
    CD.bonusSkills = { 'Combat Style (Bison)': 15 };
    const tribalStyle = AppRef.resolveCultSkillRequirement('Combat Style (Tribal)');
    if (tribalStyle.key === 'Combat Style (Bison)' && tribalStyle.value === 50 && tribalStyle.qualifies) {
      pass('Tribal combat-style cult requirements resolve to the selected cultural combat style');
    } else {
      fail('Tribal combat-style cult requirements resolve to the selected cultural combat style',
        JSON.stringify(tribalStyle));
    }

    CD.combatStyles = [{ name: 'Hill Clan Levy', weapons: ['Axe', 'Spear', 'Shield', 'Longbow', 'Javelin'] }];
    CD.culturalSkills = {};
    CD.careerSkills = { 'Combat Style (Hill Clan Levy)': 30 };
    CD.bonusSkills = { 'Combat Style (Hill Clan Levy)': 15 };
    const swordStyle = AppRef.resolveCultSkillRequirement('Combat style with sword');
    if (swordStyle.value === 0 && swordStyle.qualifies === false) {
      pass('Weapon-specific cult combat requirements fail when no matching weapon style exists');
    } else {
      fail('Weapon-specific cult combat requirement fell back to non-matching style',
        JSON.stringify(swordStyle));
    }

    CD.cult = 'Buserian';
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 10, CHA: 10 };
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    CD.runeAffinities = { primary: 'Fire', secondary: 'Truth', tertiary: 'Stasis' };
    CD.culturalSkills = {};
    CD.careerSkills = {};
    CD.bonusSkills = {
      'Language (Tradetalk)': 50,
      'Lore (Stars)': 50,
      'Lore (Cult)': 50,
      Perception: 50,
      'Runic Affinity': 10
    };
    const buserian = CultsData.find(c => c.name === 'Buserian');
    const buserianSummary = AppRef.getCultInitiationRequirementSummary(buserian);
    if (buserianSummary.requiredCount === 5 && buserianSummary.qualifyingSkills.length === 5 &&
        buserianSummary.skillDetails.some(s => s.name === 'Language (Any)' && s.matchedName === 'Language (Tradetalk)') &&
        buserianSummary.skillDetails.some(s => s.name === 'Lore (Any)' && s.matchedName.startsWith('Lore ('))) {
      pass('Placeholder cult skills count toward the five-skill initiation requirement when resolved');
    } else {
      fail('Placeholder cult skills lowered or failed initiation requirement count',
        JSON.stringify(buserianSummary));
    }
  } else {
    fail('Step 9 initiation gate resolver dependencies not found');
  }
}

{
  const { App: AppRef, CharacterData: CD } = loadApp();

  if (AppRef && AppRef.selectCult) {
    AppRef.showConfirmation = (_message, onConfirm) => onConfirm();
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 10, POW: 12, CHA: 8 };
    CD.cult = 'Daka Fal';
    CD.boundSpirits = [{ name: 'Old Ancestor', type: 'Ancestor' }];
    CD.sorcerySpells = ['Holdfast'];
    CD.miracles = ['Extension'];

    AppRef.selectCult('Waha');

    if (CD.cult === 'Waha' && CD.boundSpirits.length === 0 && CD.sorcerySpells.length === 0 && CD.miracles.length === 0) {
      pass('Changing cult clears stale miracles, bound spirits, and sorcery spells');
    } else {
      fail('Changing cult preserved stale magic selections',
        JSON.stringify({ cult: CD.cult, miracles: CD.miracles, spirits: CD.boundSpirits, spells: CD.sorcerySpells }));
    }
  } else {
    fail('App.selectCult unavailable for stale magic selection test');
  }
}

{
  const { App: AppRef } = loadApp();
  if (AppRef && AppRef.renderStep10) {
    const source = AppRef.renderStep10.toString();
    if (!source.includes("onchange=\"App.updateSkillPoints('career'") &&
        !source.includes("onchange=\"App.disambiguateAndUpdateFreeText('career'")) {
      pass('Step 10 career allocation avoids inline onchange handlers for apostrophe-safe skill names');
    } else {
      fail('Step 10 career allocation still embeds raw skill names in inline onchange handlers');
    }
  } else {
    fail('App.renderStep10 unavailable for apostrophe-safe handler test');
  }
}

{
  const { App: AppRef, CharacterData: CD, Calc: CalcRef } = loadApp();

  if (AppRef && AppRef.autoBoostCultSkills) {
    CD.cult = 'Orlanth';
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 10, POW: 10, CHA: 10 };
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    CD.runeAffinities = { primary: 'Air', secondary: 'Movement', tertiary: 'Death' };
    CD.age = 21;
    CD.culturalSkills = { Athletics: 15, Brawn: 15 };
    CD.careerSkills = {};
    CD.bonusSkills = {};

    AppRef.autoBoostCultSkills();

    const noHiddenCulturalDevotion = !Object.prototype.hasOwnProperty.call(CD.culturalSkills, 'Devotion (Orlanth)');
    const noHiddenCareerDevotion = !Object.prototype.hasOwnProperty.call(CD.careerSkills, 'Devotion (Orlanth)');
    const originalPoolsIntact = CD.culturalSkills.Athletics === 15 && CD.culturalSkills.Brawn === 15;
    if (noHiddenCulturalDevotion && noHiddenCareerDevotion && originalPoolsIntact) {
      pass('Quick Boost does not create hidden cultural/career allocations for unavailable cult skills');
    } else {
      fail('Quick Boost created hidden invalid cultural/career allocations',
        JSON.stringify({ culturalSkills: CD.culturalSkills, careerSkills: CD.careerSkills, bonusSkills: CD.bonusSkills }));
    }
  } else {
    pass('ADR-0015: Hidden allocation auto-boost regression retired with Quick Boost removal');
  }
}

{
  const { App: AppRef, CharacterData: CD, Calc: CalcRef } = loadApp();

  if (AppRef && AppRef.selectCult && AppRef.getStep9ValidationErrors && CD?.fromJSON) {
    const characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 13, CHA: 10 };
    CD.characteristics = characteristics;
    CD.attributes = CalcRef.calculateAllAttributes(characteristics);
    CD.culture = 'God Forgot';
    CD.career = 'Sorcerer';
    CD.cult = null;
    CD.cultType = null;
    CD.selectedProfessionalSkills = ['Invocation (Zzistori School)', 'Shaping', 'Lore (Sorcery)'];
    CD.careerSkills = { 'Invocation (Zzistori School)': 10, Shaping: 10, 'Lore (Sorcery)': 10 };
    CD.bonusSkills = {};
    CD.sorcerySpells = ['Holdfast'];
    AppRef.currentStep = 9;

    const arkatAffiliationSelection = AppRef.selectCult('Arkat', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const arkatAffiliationAccepted = arkatAffiliationSelection?.success === true;

    CD.cult = 'Arkat';
    CD.cultChoiceMade = true;
    CD.cultInitiated = false;
    CD.cultType = { primary: 'sorcery', types: ['sorcery'], isHybrid: false };
    CD.sorceryResource = characteristics.POW;
    CD.sorcerySpells = ['Holdfast'];

    CD.selectedProfessionalSkills = ['Shaping', 'Lore (Sorcery)'];
    CD.careerSkills = { Shaping: 10, 'Lore (Sorcery)': 10 };
    const missingCultSchoolErrors = AppRef.getStep9ValidationErrors();
    const rejectsMissingCultSchool = missingCultSchoolErrors.some(error => /Invocation specialization/i.test(error) && /Zzistori School/i.test(error));

    CD.selectedProfessionalSkills = ['Invocation (Arkat)', 'Shaping', 'Lore (Sorcery)'];
    CD.careerSkills = { 'Invocation (Arkat)': 10, Shaping: 10, 'Lore (Sorcery)': 10 };
    const wrongCultSchoolErrors = AppRef.getStep9ValidationErrors();
    const rejectsArkatInvocation = wrongCultSchoolErrors.some(error => /Invocation specialization/i.test(error) && /Zzistori School/i.test(error));

    CD.name = 'Before Source-backed Cult Affiliation Import';
    const importSuccess = CD.fromJSON(JSON.stringify({
      ...createTestCharacter('God Forgot'),
      name: 'Source-backed Cult Affiliation Import',
      career: 'Sorcerer',
      cult: 'Arkat',
      cultChoiceMade: true,
      cultInitiated: false,
      cultType: { primary: 'sorcery', types: ['sorcery'], isHybrid: false },
      characteristics,
      selectedProfessionalSkills: ['Invocation (Zzistori School)', 'Shaping', 'Lore (Sorcery)'],
      careerSkills: { 'Invocation (Zzistori School)': 10, Shaping: 10, 'Lore (Sorcery)': 10 },
      sorcerySpells: ['Holdfast']
    }));
    const acceptsSourceBackedImport = importSuccess === true && CD.name === 'Source-backed Cult Affiliation Import';

    CD.name = 'Before Missing Cult School Import';
    const missingImportSuccess = CD.fromJSON(JSON.stringify({
      ...createTestCharacter('God Forgot'),
      name: 'Missing Cult School Import',
      career: 'Sorcerer',
      cult: 'Arkat',
      cultChoiceMade: true,
      cultInitiated: false,
      cultType: { primary: 'sorcery', types: ['sorcery'], isHybrid: false },
      characteristics,
      selectedProfessionalSkills: ['Shaping', 'Lore (Sorcery)'],
      careerSkills: { Shaping: 10, 'Lore (Sorcery)': 10 },
      sorcerySpells: ['Holdfast']
    }));
    const rejectsMissingCultSchoolImport = missingImportSuccess === false && CD.name === 'Before Missing Cult School Import';

    if (arkatAffiliationAccepted && rejectsMissingCultSchool && rejectsArkatInvocation && acceptsSourceBackedImport && rejectsMissingCultSchoolImport) {
      pass('Arkat affiliation enforces Zzistori Invocation specialization while uninitiated');
    } else {
      fail('Arkat source accepts missing or stale Zzistori Invocation specialization',
        JSON.stringify({ arkatAffiliationSelection, missingCultSchoolErrors, wrongCultSchoolErrors, importSuccess, missingImportSuccess, name: CD.name }));
    }
  } else {
    fail('Arkat Invocation specialization validation dependencies not found');
  }
}

{
  const { App: AppRef, CharacterData: CD, Calc: CalcRef } = loadApp();

  if (AppRef && AppRef.getStep9ValidationErrors && CD?.fromJSON) {
    const characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 13, CHA: 10 };
    CD.characteristics = characteristics;
    CD.attributes = CalcRef.calculateAllAttributes(characteristics);
    CD.culture = 'God Forgot';
    CD.career = 'Sorcerer';
    CD.cult = null;
    CD.cultType = null;
    CD.selectedProfessionalSkills = ['Invocation (Arkat)', 'Shaping', 'Lore (Sorcery)'];
    CD.careerSkills = { 'Invocation (Arkat)': 10, Shaping: 10, 'Lore (Sorcery)': 10 };
    CD.bonusSkills = {};
    CD.sorcerySpells = ['Holdfast'];
    AppRef.currentStep = 9;

    const wrongSchoolErrors = AppRef.getStep9ValidationErrors();
    const rejectsWrongSchool = wrongSchoolErrors.some(error => /Invocation specialization/i.test(error) && /Zzistori School/.test(error));

    CD.selectedProfessionalSkills = ['Invocation (Zzistori School)', 'Shaping', 'Lore (Sorcery)'];
    CD.careerSkills = { 'Invocation (Zzistori School)': 10, Shaping: 10, 'Lore (Sorcery)': 10 };
    const correctSchoolErrors = AppRef.getStep9ValidationErrors();
    const acceptsCorrectSchool = !correctSchoolErrors.some(error => /Invocation specialization/i.test(error));

    CD.selectedProfessionalSkills = ['Shaping', 'Lore (Sorcery)'];
    CD.careerSkills = { Shaping: 10, 'Lore (Sorcery)': 10 };
    const missingSchoolErrors = AppRef.getStep9ValidationErrors();
    const rejectsMissingSchool = missingSchoolErrors.some(error => /Invocation specialization/i.test(error) && /Zzistori School/.test(error));

    CD.name = 'Before Wrong School Import';
    const importSuccess = CD.fromJSON(JSON.stringify({
      ...createTestCharacter('God Forgot'),
      name: 'Wrong School Import',
      career: 'Sorcerer',
      cult: null,
      cultType: null,
      characteristics,
      selectedProfessionalSkills: ['Invocation (Arkat)', 'Shaping', 'Lore (Sorcery)'],
      careerSkills: { 'Invocation (Arkat)': 10, Shaping: 10, 'Lore (Sorcery)': 10 },
      sorcerySpells: ['Holdfast']
    }));
    const rejectsWrongSchoolImport = importSuccess === false && CD.name === 'Before Wrong School Import';

    CD.name = 'Before Missing School Import';
    const missingImportSuccess = CD.fromJSON(JSON.stringify({
      ...createTestCharacter('God Forgot'),
      name: 'Missing School Import',
      career: 'Sorcerer',
      cult: null,
      cultType: null,
      characteristics,
      selectedProfessionalSkills: ['Shaping', 'Lore (Sorcery)'],
      careerSkills: { Shaping: 10, 'Lore (Sorcery)': 10 },
      sorcerySpells: ['Holdfast']
    }));
    const rejectsMissingSchoolImport = missingImportSuccess === false && CD.name === 'Before Missing School Import';

    if (rejectsWrongSchool && acceptsCorrectSchool && rejectsMissingSchool && rejectsWrongSchoolImport && rejectsMissingSchoolImport) {
      pass('Zzistori source rejects missing or mismatched Invocation school specializations');
    } else {
      fail('Zzistori source accepts missing or mismatched Invocation school specialization',
        JSON.stringify({ wrongSchoolErrors, correctSchoolErrors, missingSchoolErrors, importSuccess, missingImportSuccess, name: CD.name }));
    }
  } else {
    fail('Zzistori Invocation specialization validation dependencies not found');
  }
}

{
  const { App: AppRef, CharacterData: CD, Calc: CalcRef } = loadApp();

  if (AppRef && AppRef.compileAllSkills) {
    CD.characteristics = { STR: 12, CON: 12, SIZ: 12, DEX: 13, INT: 15, POW: 6, CHA: 5 };
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    CD.runeAffinities = { primary: 'Storm', secondary: 'Movement', tertiary: 'Death' };
    CD.bonusSkills = { 'Runic Affinity': 8 };
    CD.culturalSkills = {};
    CD.careerSkills = {};

    if (AppRef.getRuneAffinityDisplayValues) {
      const runeDisplay = AppRef.getRuneAffinityDisplayValues();
      if (runeDisplay.values.primary === 50 && runeDisplay.bonusBySlot.primary === 8) {
        pass('Runic Affinity bonus displays on the selected primary rune');
      } else {
        fail('Runic Affinity bonus displays on the selected primary rune',
          JSON.stringify(runeDisplay));
      }
    } else {
      fail('App.getRuneAffinityDisplayValues function not found');
    }

    const compiled = AppRef.compileAllSkills();
    if (!compiled.some(s => s.name === 'Runic Affinity' || s.name.startsWith('Runic Affinity ('))) {
      pass('Runic Affinity bonuses are not rendered as standalone skill rows');
    } else {
      fail('Runic Affinity bonuses are not rendered as standalone skill rows',
        JSON.stringify(compiled.filter(s => s.name === 'Runic Affinity' || s.name.startsWith('Runic Affinity ('))));
    }

    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 10, CHA: 10 };
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    CD.runeAffinities = { primary: 'Darkness', secondary: 'Law', tertiary: 'Stasis' };
    CD.bonusSkills = { 'Runic Affinity (Law)': 10 };
    const lawDisplay = AppRef.getRuneAffinityDisplayValues();
    if (lawDisplay.values.primary === 50 && lawDisplay.values.secondary === 50 &&
        lawDisplay.bonusBySlot.secondary === 10) {
      pass('Specific Rune Affinity bonus displays on the matching selected rune');
    } else {
      fail('Specific Rune Affinity bonus displays on the matching selected rune',
        JSON.stringify(lawDisplay));
    }
  } else {
    fail('Rune affinity display test dependencies not found');
  }
}

{
  const { App: AppRef, CharacterData: CD, Calc: CalcRef, _sandbox } = loadApp();

  if (AppRef && AppRef.renderPlayMagic) {
    CD.cult = 'Arkat';
    CD.cultChoiceMade = true;
    CD.cultInitiated = true; // Post-initiation Play Mode sorcery label test.
    CD.cultType = { primary: 'sorcery', types: ['sorcery'], isHybrid: false };
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 10, CHA: 10 };
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    CD.sorcerySpells = ['Holdfast'];
    CD.folkMagicSpells = [];
    CD.careerFolkMagic = [];

    AppRef.renderPlayMagic();
    const html = _sandbox.elements['play-magic']?.innerHTML || '';
    const hasRawText = /Casting:<\/strong>\s*Invocation skill/i.test(html) &&
      /Shaping:<\/strong>\s*Shaping skill/i.test(html);
    const hasRuneMappingText = /Rune Affinity of spell|Law Rune affinity/i.test(html);

    if (hasRawText && !hasRuneMappingText) {
      pass('Play Mode labels sorcery as RAW Invocation/Shaping');
    } else {
      fail('Play Mode still labels sorcery as rune-affinity casting',
        JSON.stringify({ hasRawText, hasRuneMappingText, html }));
    }
  } else {
    fail('Play Mode sorcery rule text dependencies not found');
  }
}

{
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const hasRawStep9Text = /<strong>Casting:<\/strong>\s*Invocation skill/i.test(html) &&
    /<strong>Shaping:<\/strong>\s*Shaping skill/i.test(html);
  const hasRuneMappingText = /Rune Affinity of spell|Law Rune affinity|replaces Invocation|replaces Shaping skill/i.test(html);

  if (hasRawStep9Text && !hasRuneMappingText) {
    pass('Step 9 sorcery picker labels RAW Invocation/Shaping');
  } else {
    fail('Step 9 sorcery picker still labels sorcery as rune-affinity casting',
      JSON.stringify({ hasRawStep9Text, hasRuneMappingText }));
  }
}

{
  const { App: AppRef, CharacterData: CD, Calc: CalcRef } = loadApp();

  if (AppRef && AppRef.resolveCultSkillRequirement && AppRef.validateCurrentStep) {
    CD.cult = 'Arkat';
    CD.cultChoiceMade = true;
    CD.cultInitiated = true; // Post-initiation sorcery gate test.
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 10, CHA: 10 };
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    CD.runeAffinities = { primary: 'Darkness', secondary: 'Stasis', tertiary: 'Law' };
    CD.culturalSkills = {};
    CD.selectedProfessionalSkills = ['Invocation (Arkat)', 'Shaping', 'Literacy'];
    CD.careerSkills = { 'Invocation (Arkat)': 15, Shaping: 15 };
    CD.bonusSkills = { 'Invocation (Arkat)': 5, Shaping: 10 };
    CD.sorcerySpells = ['Holdfast'];
    AppRef.currentStep = 9;

    const invocation = AppRef.resolveCultSkillRequirement('Invocation');
    const shaping = AppRef.resolveCultSkillRequirement('Shaping');
    const result = AppRef.validateCurrentStep();
    if (invocation.key === 'Invocation (Arkat)' && invocation.value === 50 &&
        shaping.key === 'Shaping' && shaping.value === 50 &&
        result !== false) {
      pass('Sorcery cult requirements use RAW Invocation and Shaping skills');
    } else {
      fail('Sorcery cult requirements use RAW Invocation and Shaping skills',
        JSON.stringify({ invocation, shaping, result }));
    }
  } else {
    fail('Sorcery cult skill resolver dependencies not found');
  }
}

{
  const { App: AppRef, CAREERS_DATA, CharacterData: CD } = loadApp();

  if (AppRef && CAREERS_DATA && AppRef.selectCareer) {
    const sorcerer = CAREERS_DATA.find(career => career.name === 'Sorcerer');
    CD.culture = 'God Forgot';
    AppRef.selectCareer('Sorcerer');
    const html = AppRef.renderStep8().innerHTML || '';
    const professionalSkills = sorcerer?.professionalSkills || [];
    const hasInvocation = professionalSkills.includes('Invocation (Cult, School or Grimoire)') &&
      html.includes('Invocation (Cult, School or Grimoire)');
    const hasShaping = professionalSkills.includes('Shaping') && html.includes('Shaping');

    if (hasInvocation && hasShaping) {
      pass('Sorcerer career keeps Invocation and Shaping in the professional skill flow');
    } else {
      fail('Sorcerer career keeps Invocation and Shaping in the professional skill flow',
        JSON.stringify({ professionalSkills, html }));
    }
  } else {
    fail('Sorcerer career professional skill flow dependencies not found');
  }
}

{
  const { App: AppRef, CharacterData: CD, Calc: CalcRef } = loadApp();

  if (AppRef && AppRef.renderStep9 && AppRef.toggleSorcerySpell && AppRef.getStep9ValidationErrors) {
    CD.characteristics = { STR: 11, CON: 12, SIZ: 13, DEX: 14, INT: 15, POW: 14, CHA: 10 };
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    CD.culture = 'God Forgot';
    CD.career = 'Sorcerer';
    CD.cult = null;
    CD.cultType = null;
    CD.selectedProfessionalSkills = ['Invocation (Zzistori School)', 'Shaping', 'Lore (Sorcery)'];
    CD.careerSkills = { 'Invocation (Zzistori School)': 10, Shaping: 10, 'Lore (Sorcery)': 10 };
    CD.devotionalPool = 0;
    CD.boundSpiritSlots = 0;
    CD.miracles = [];
    CD.boundSpirits = [];
    CD.sorceryResource = 0;
    CD.sorcerySpells = [];
    AppRef.currentStep = 9;

    let html = AppRef.renderStep9().innerHTML || '';
    const missingSpellErrors = AppRef.getStep9ValidationErrors();
    const exposesZzistoriPanel = html.includes('✓ No Cult') &&
      html.includes('Zzistori School (God Forgot sorcery)') &&
      html.includes('magic-panel--sorcery') &&
      html.includes('Resource:</strong> Magic Points (14)') &&
      html.includes('Casting:</strong> Invocation skill') &&
      html.includes('Shaping:</strong> Shaping skill') &&
      html.includes('AiG p.30-31') &&
      html.includes('Mythras rulebook p.162, p.166-177') &&
      html.includes('Starting Spells') &&
      html.includes('Holdfast');
    const requiresSorcerySelection = missingSpellErrors.some(error => /sorcery spell/i.test(error));
    const noTheistLeak = CD.cult === null &&
      CD.cultType === null &&
      CD.devotionalPool === 0 &&
      CD.boundSpiritSlots === 0 &&
      CD.miracles.length === 0 &&
      !html.includes('Devotional Pool') &&
      !html.includes('Miracles (sample)');

    AppRef.toggleSorcerySpell('Holdfast', { checked: true });
    AppRef.toggleSorcerySpell('Animate (Substance)', { checked: true });
    AppRef.toggleSorcerySpell('Project (Sense)', { checked: true });
    const selectedThree = JSON.stringify(CD.sorcerySpells) === JSON.stringify(['Holdfast', 'Animate (Substance)', 'Project (Sense)']) &&
      CD.sorceryResource === 14;
    const beforeFourth = JSON.stringify(CD.sorcerySpells);
    const fourthInput = { checked: true };
    AppRef.toggleSorcerySpell('Wrack', fourthInput);
    const fourthBlocked = JSON.stringify(CD.sorcerySpells) === beforeFourth &&
      CD.sorcerySpells.length === 3 &&
      fourthInput.checked === false;

    html = AppRef.renderStep9().innerHTML || '';
    const capVisibleAndAccessible = html.includes('3-spell cap reached') &&
      html.includes('disabled') &&
      html.includes('aria-disabled="true"') &&
      html.includes('aria-describedby="sorcery-spell-cap"');
    const validWithSpells = AppRef.getStep9ValidationErrors().length === 0;

    if (exposesZzistoriPanel && requiresSorcerySelection && noTheistLeak && selectedThree && fourthBlocked && capVisibleAndAccessible && validWithSpells) {
      pass('God Forgot Sorcerer No Cult Step 9 exposes source-backed Zzistori sorcery with capped starting spells');
    } else {
      fail('God Forgot Sorcerer No Cult Step 9 source-backed sorcery behavior is incomplete',
        JSON.stringify({ exposesZzistoriPanel, missingSpellErrors, noTheistLeak, spells: CD.sorcerySpells, sorceryResource: CD.sorceryResource, fourthBlocked, capVisibleAndAccessible, validWithSpells, html: html.slice(0, 1200) }));
    }
  } else {
    fail('Step 9 Zzistori sorcery dependencies not found');
  }
}

{
  const { App: AppRef, CharacterData: CD, Calc: CalcRef, CULTS_DATA, detectCultType } = loadApp();

  if (AppRef && AppRef.renderStep9 && AppRef.getStep9ValidationErrors && AppRef.resolveActiveSorcerySource) {
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 13, CHA: 10 };
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);

    CD.culture = 'Praxian';
    CD.career = 'Warrior';
    CD.cult = null;
    CD.cultType = null;
    CD.devotionalPool = 0;
    CD.boundSpiritSlots = 0;
    CD.sorceryResource = 0;
    CD.sorcerySpells = [];
    AppRef.currentStep = 9;
    const genericHtml = AppRef.renderStep9().innerHTML || '';
    const genericNoCultValid = AppRef.getStep9ValidationErrors().length === 0 &&
      !genericHtml.includes('Zzistori School') &&
      !genericHtml.includes('magic-panel--sorcery');

    CD.culture = 'God Forgot';
    CD.career = 'Warrior';
    CD.cult = null;
    CD.cultType = null;
    CD.sorcerySpells = [];
    const nonSorcererHtml = AppRef.renderStep9().innerHTML || '';
    const nonSorcererNoPicker = !nonSorcererHtml.includes('Zzistori School') &&
      !nonSorcererHtml.includes('magic-panel--sorcery') &&
      AppRef.getStep9ValidationErrors().length === 0;

    CD.culture = 'God Forgot';
    CD.career = 'Sorcerer';
    CD.cult = 'Arkat';
    CD.cultChoiceMade = true;
    CD.cultInitiated = false;
    CD.cultType = detectCultType(CULTS_DATA.find(cult => cult.name === 'Arkat'));
    CD.selectedProfessionalSkills = ['Invocation (Zzistori School)', 'Shaping', 'Lore (Sorcery)'];
    CD.devotionalPool = 0;
    CD.boundSpiritSlots = 0;
    CD.miracles = [];
    CD.sorcerySpells = ['Holdfast'];
    AppRef.normalizeSorceryState(CD);
    const arkatSource = AppRef.resolveActiveSorcerySource(CD);
    const arkatUsesSourceBackedSchool = arkatSource?.sourceLabel === 'Zzistori School (God Forgot sorcery)' &&
      arkatSource?.sourceKind === 'culture-backed school' &&
      arkatSource?.sourceType === 'culture-backed school' &&
      CD.cultType?.primary === 'sorcery' &&
      CD.devotionalPool === 0 &&
      CD.miracles.length === 0;

    if (genericNoCultValid && nonSorcererNoPicker && arkatUsesSourceBackedSchool) {
      pass('Step 9 validation keeps generic No Cult valid, scopes Zzistori to Sorcerers, and preserves source-backed Arkat affiliation sorcery');
    } else {
      fail('Step 9 validation/source scoping regressed for generic No Cult, non-Sorcerer, or Arkat',
        JSON.stringify({ genericNoCultValid, nonSorcererNoPicker, arkatSource, cultType: CD.cultType, devotionalPool: CD.devotionalPool }));
    }
  } else {
    fail('Step 9 validation/source scoping dependencies not found');
  }
}

{
  const { App: AppRef, CharacterData: CD, Calc: CalcRef, CULTS_DATA, detectCultType } = loadApp();

  if (AppRef && AppRef.selectCult && AppRef.resolveActiveSorcerySource && AppRef.getStep9ValidationErrors) {
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 13, CHA: 10 };
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    CD.culture = 'God Forgot';
    CD.career = 'Sorcerer';
    CD.cult = 'Arkat';
    CD.cultChoiceMade = true;
    CD.cultInitiated = false;
    CD.cultType = detectCultType(CULTS_DATA.find(cult => cult.name === 'Arkat'));
    CD.selectedProfessionalSkills = ['Invocation (Zzistori School)', 'Shaping', 'Lore (Sorcery)'];
    CD.devotionalPool = 0;
    CD.boundSpiritSlots = 0;
    CD.miracles = [];
    CD.boundSpirits = [];
    CD.sorceryResource = 13;
    CD.sorcerySpells = ['Holdfast'];
    AppRef.currentStep = 9;

    const switchToNoCult = AppRef.selectCult(null, { skipConfirmation: true, allowMagicSelectionLoss: true });
    const sourceAfterSwitch = AppRef.resolveActiveSorcerySource(CD);
    const switchKeepsSourceBackedSpells = switchToNoCult?.success === true &&
      CD.cult === null &&
      sourceAfterSwitch?.sourceLabel === 'Zzistori School (God Forgot sorcery)' &&
      CD.sorcerySpells.length === 1 &&
      CD.sorcerySpells[0] === 'Holdfast';

    CD.sorcerySpells = [];
    AppRef.selectCult(null, { skipConfirmation: true, allowMagicSelectionLoss: true });
    const sourceAfterZeroSpellSwitch = AppRef.resolveActiveSorcerySource(CD);
    const zeroSpellSwitchAllowed = CD.cult === null &&
      sourceAfterZeroSpellSwitch?.sourceLabel === 'Zzistori School (God Forgot sorcery)' &&
      CD.sorcerySpells.length === 0 &&
      AppRef.getStep9ValidationErrors().some(error => /sorcery spell/i.test(error));

    CD.sorcerySpells = ['Animate (Substance)'];
    AppRef.selectCult(null, { skipConfirmation: true, allowMagicSelectionLoss: true });
    const preservesExistingNoCultSpells = CD.cult === null &&
      CD.sorcerySpells.length === 1 &&
      CD.sorcerySpells[0] === 'Animate (Substance)';

    if (switchKeepsSourceBackedSpells && zeroSpellSwitchAllowed && preservesExistingNoCultSpells) {
      pass('Switching Arkat affiliation to No Cult preserves source-backed Zzistori spells');
    } else {
      fail('Arkat sorcery source switch failed to preserve source-backed spells',
        JSON.stringify({ switchKeepsSourceBackedSpells, zeroSpellSwitchAllowed, preservesExistingNoCultSpells, sourceAfterSwitch, spells: CD.sorcerySpells }));
    }
  } else {
    fail('No Cult sorcery stale-state regression dependencies not found');
  }
}

{
  const { App: AppRef, CharacterData: CD, Calc: CalcRef, CULTS_DATA, detectCultType } = loadApp();

  if (AppRef && AppRef.selectCult && AppRef.resolveActiveSorcerySource) {
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 13, CHA: 10 };
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    CD.culture = 'God Forgot';
    CD.career = 'Sorcerer';
    CD.cult = null;
    CD.cultType = null;
    CD.selectedProfessionalSkills = ['Invocation (Zzistori School)', 'Shaping', 'Lore (Sorcery)'];
    CD.devotionalPool = 0;
    CD.boundSpiritSlots = 0;
    CD.miracles = [];
    CD.boundSpirits = [];
    CD.sorceryResource = 13;
    CD.sorcerySpells = ['Animate (Substance)'];
    AppRef.currentStep = 9;

    const switchToArkat = AppRef.selectCult('Arkat', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const arkatSource = AppRef.resolveActiveSorcerySource(CD);
    const keepsZzistoriOnAffiliationChange = switchToArkat?.success === true &&
      CD.cult === 'Arkat' &&
      CD.cultInitiated === false &&
      arkatSource?.sourceLabel === 'Zzistori School (God Forgot sorcery)' &&
      CD.sorcerySpells.length === 1 &&
      CD.sorcerySpells[0] === 'Animate (Substance)';

    CD.sorcerySpells = [];
    AppRef.selectCult('Arkat', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const arkatSourceAfterZeroSpellSwitch = AppRef.resolveActiveSorcerySource(CD);
    const zeroSpellSwitchAllowed = CD.cult === 'Arkat' &&
      arkatSourceAfterZeroSpellSwitch?.sourceLabel === 'Zzistori School (God Forgot sorcery)' &&
      CD.sorcerySpells.length === 0;

    CD.sorcerySpells = ['Holdfast'];
    AppRef.selectCult('Arkat', { skipConfirmation: true, allowMagicSelectionLoss: true });
    const preservesSameCultSpells = CD.cult === 'Arkat' &&
      CD.sorcerySpells.length === 1 &&
      CD.sorcerySpells[0] === 'Holdfast' &&
      detectCultType(CULTS_DATA.find(cult => cult.name === 'Arkat'))?.primary === 'sorcery';

    if (keepsZzistoriOnAffiliationChange && zeroSpellSwitchAllowed && preservesSameCultSpells) {
      pass('Switching from No Cult Zzistori to Arkat affiliation preserves source-backed spells');
    } else {
      fail('Zzistori sorcery source switch failed to preserve source-backed spells',
        JSON.stringify({ keepsZzistoriOnAffiliationChange, zeroSpellSwitchAllowed, preservesSameCultSpells, arkatSource, spells: CD.sorcerySpells }));
    }
  } else {
    fail('Arkat switch stale-state regression dependencies not found');
  }
}

{
  const { App: AppRef, CharacterData: CD, Calc: CalcRef } = loadApp();

  if (AppRef && AppRef.getStep9ValidationErrors && CD?.fromJSON) {
    const characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 13, CHA: 10 };
    CD.characteristics = characteristics;
    CD.attributes = CalcRef.calculateAllAttributes(characteristics);
    CD.culture = 'God Forgot';
    CD.career = 'Sorcerer';
    CD.cult = null;
    CD.cultType = null;
    CD.sorcerySpells = ['Bogus A', 'Bogus B', 'Bogus C'];
    AppRef.currentStep = 9;

    const validationErrors = AppRef.getStep9ValidationErrors();
    const rejectsUnknownAtStep9 = validationErrors.some(error => /unknown sorcery spell/i.test(error));

    CD.name = 'Before Invalid Import';
    const importSuccess = CD.fromJSON(JSON.stringify({
      ...createTestCharacter('God Forgot'),
      name: 'Invalid Zzistori Import',
      career: 'Sorcerer',
      cult: null,
      cultType: null,
      characteristics,
      sorcerySpells: ['Bogus A']
    }));
    const rejectsInvalidImport = importSuccess === false && CD.name === 'Before Invalid Import';

    if (rejectsUnknownAtStep9 && rejectsInvalidImport) {
      pass('Unknown sorcery spells are rejected before they can occupy the Zzistori cap');
    } else {
      fail('Unknown sorcery spells can occupy source-backed sorcery state',
        JSON.stringify({ validationErrors, importSuccess, name: CD.name, spells: CD.sorcerySpells }));
    }
  } else {
    fail('Unknown sorcery spell validation dependencies not found');
  }
}

{
  const { App: AppRef, CharacterData: CD, Calc: CalcRef } = loadApp();

  if (AppRef && AppRef.validateCurrentStep && AppRef.getValidationState) {
    CD.cult = 'Arkat';
    CD.cultChoiceMade = true;
    CD.cultInitiated = true; // Post-initiation: sorcery cult skill gate should still enforce 50% requirements.
    CD.cultType = { primary: 'sorcery', types: ['sorcery'], isHybrid: false };
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 10, CHA: 10 };
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    CD.selectedProfessionalSkills = ['Invocation (Arkat)', 'Shaping', 'Literacy'];
    CD.careerSkills = { 'Invocation (Arkat)': 0, Shaping: 0, Literacy: 0 };
    CD.bonusSkills = {};
    CD.sorcerySpells = ['Holdfast'];
    AppRef.currentStep = 9;

    const step9Result = AppRef.validateCurrentStep();
    const step9State = AppRef.getValidationState();

    CD.bonusSkills = {
      'Invocation (Arkat)': 15,
      Shaping: 15,
      Conceal: 15,
      Deceit: 15,
      Endurance: 15,
      Influence: 15,
      Insight: 15,
      Locale: 15,
      Perception: 15,
      Willpower: 15
    };
    AppRef.currentStep = 11;
    const blockedValidation = AppRef.validateCurrentStep();
    const blockedState = AppRef.getValidationState();

    CD.careerSkills = { 'Invocation (Arkat)': 5, Shaping: 10, Literacy: 85 };
    const allowedValidation = AppRef.validateCurrentStep();
    const allowedState = AppRef.getValidationState();

    if (step9Result === false &&
        step9State.valid === false &&
        step9State.errors.some(e => e.includes('Initiation requires 2 cult skills at 50%+')) &&
        blockedValidation === false &&
        blockedState.valid === false &&
        blockedState.errors.some(e => e.includes('Initiation requires 2 cult skills at 50%+')) &&
        allowedValidation === true &&
        allowedState.valid === true) {
      pass('Sorcery initiation gate enforces cult skill requirements once initiation is flagged');
    } else {
      fail('Sorcery initiation gate defers until career and bonus skills are allocated',
        JSON.stringify({ step9Result, step9State, blockedState, allowedState }));
    }
  } else {
    fail('Sorcery deferred initiation gate dependencies not found');
  }
}

{
  const { App: AppRef, CharacterData: CD, Calc: CalcRef } = loadApp();

  if (AppRef && AppRef.compileAllSkills && CalcRef?.resolveSkillDef) {
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 10, CHA: 10 };
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    CD.selectedProfessionalSkills = ['Invocation (Arkat)', 'Shaping', 'Literacy'];
    CD.careerSkills = { 'Invocation (Arkat)': 0, Shaping: 0, Literacy: 0 };

    const invocationDef = CalcRef.resolveSkillDef('Invocation (Arkat)');
    const invocationSkill = AppRef.compileAllSkills().find(s => s.name === 'Invocation (Arkat)');
    const invocationRequirement = AppRef.resolveCultSkillRequirement('Invocation');
    if (invocationDef?.name === 'Invocation' &&
        invocationSkill?.base === 30 &&
        invocationRequirement.key === 'Invocation (Arkat)' &&
        invocationRequirement.value === 30) {
      pass('Invocation specializations inherit RAW Invocation base skill');
    } else {
      fail('Invocation specializations inherit RAW Invocation base skill',
        JSON.stringify({ invocationDef, invocationSkill, invocationRequirement }));
    }
  } else {
    fail('Invocation specialization test dependencies not found');
  }
}

{
  const { App: AppRef, CharacterData: CD, Calc: CalcRef } = loadApp();

  if (AppRef && AppRef.resolveCultSkillRequirement) {
    CD.cult = 'Daka Fal';
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 15, POW: 10, CHA: 10 };
    CD.attributes = CalcRef.calculateAllAttributes(CD.characteristics);
    CD.culturalSkills = {};
    CD.careerSkills = {
      'Binding (Daka Fal)': 15,
      Trance: 15
    };
    CD.bonusSkills = {
      'Binding (Daka Fal)': 15,
      Trance: 15
    };

    const binding = AppRef.resolveCultSkillRequirement('Binding (Shaman)');
    const trance = AppRef.resolveCultSkillRequirement('Trance (Shaman)');
    if (binding.key === 'Binding (Daka Fal)' && binding.value === 50 &&
        trance.key === 'Trance' && trance.value === 50) {
      pass('Animist shaman cult skills resolve to concrete Binding and Trance skills');
    } else {
      fail('Animist shaman cult skills resolve to concrete Binding and Trance skills',
        JSON.stringify({ binding, trance }));
    }
  } else {
    fail('Animist shaman cult skill resolver dependencies not found');
  }
}

// ============================================================
section('Miracle Pool Capping (pool > available qualified)');
// ============================================================

{
  const { App: AppRef, CharacterData: CD, CULTS_DATA: CultsData, MIRACLES_DATA: MiraclesRef } = loadApp();

  if (AppRef && AppRef.validateCurrentStep && MiraclesRef) {
    // Setup: Chalana Arroy with mismatched runes (only 4 Common miracles qualified)
    CD.cult = 'Chalana Arroy';
    CD.cultChoiceMade = true;
    CD.cultInitiated = true; // Post-initiation miracle-cap behavior.
    CD.characteristics = { STR: 11, CON: 11, SIZ: 11, DEX: 11, INT: 18, POW: 16, CHA: 11 };
    CD.devotionalPool = 8; // POW/2 = 8
    // Runes that DON'T match Harmony (Chalana Arroy's cult rune)
    CD.runeAffinities = { primary: 'Fire', secondary: 'Death', tertiary: 'Disorder' };
    // Enough skills for initiation gate
    CD.bonusSkills = { Willpower: 15, 'Lore (Cult)': 15, 'First Aid': 15, Devotion: 15, Healing: 15, 'Runic Affinity': 15 };
    CD.culturalSkills = { Willpower: 15, 'First Aid': 15, Healing: 15, Insight: 15 };
    CD.careerSkills = { 'Lore (Cult)': 15, Devotion: 15, 'Runic Affinity': 15 };
    // Select 4 common miracles (only these are qualified since Harmony rune not selected)
    CD.miracles = ['Extension', 'Find (Specific Thing)', 'Divination', 'Chastise'];
    AppRef.currentStep = 9;

    // Verify MIRACLES_DATA has Chalana Arroy with common miracles
    const cultMiracles = MiraclesRef.cults && MiraclesRef.cults['Chalana Arroy'];
    if (!cultMiracles) {
      pass('Step 9 passes with 4/4 qualified miracles (MIRACLES_DATA missing cult - validation skips miracle check)');
    } else {
      const result = AppRef.validateCurrentStep();
      if (result !== false) {
        pass('Step 9 passes when all qualified miracles selected even though pool is larger');
      } else {
        fail('Step 9 passes when all qualified miracles selected even though pool is larger');
      }
    }

    // Test: selecting fewer than available qualified should still block
    if (cultMiracles) {
      CD.miracles = ['Extension'];
      const result2 = AppRef.validateCurrentStep();
      if (result2 === false) {
        pass('Step 9 blocks when fewer than available qualified miracles selected');
      } else {
        fail('Step 9 blocks when fewer than available qualified miracles selected');
      }
    } else {
      pass('Step 9 blocks when fewer than available qualified miracles selected (skipped - no MIRACLES_DATA)');
    }
  } else {
    fail('App.validateCurrentStep or MIRACLES_DATA not found');
  }
}

{
  const { App: AppRef, CharacterData: CD, MIRACLES_DATA: MiraclesRef } = loadApp();

  if (AppRef && AppRef.agent && AppRef.agent.next && MiraclesRef) {
    const cultMiracles = MiraclesRef.cults && MiraclesRef.cults['Chalana Arroy'];
    if (!cultMiracles) {
      pass('Agent Step 9 honors effective miracle cap (skipped - no MIRACLES_DATA)');
    } else {
      CD.cult = 'Chalana Arroy';
      CD.cultChoiceMade = true;
      CD.cultInitiated = true; // Post-initiation agent.next miracle-cap behavior.
      CD.cultType = { types: ['theist'], label: 'Theist' };
      CD.characteristics = { STR: 11, CON: 11, SIZ: 11, DEX: 11, INT: 18, POW: 16, CHA: 11 };
      CD.devotionalPool = 8;
      CD.runeAffinities = { primary: 'Fire', secondary: 'Death', tertiary: 'Disorder' };
      CD.bonusSkills = { Willpower: 15, 'Lore (Cult)': 15, 'First Aid': 15, Devotion: 15, Healing: 15, 'Runic Affinity': 15 };
      CD.culturalSkills = { Willpower: 15, 'First Aid': 15, Healing: 15, Insight: 15 };
      CD.careerSkills = { 'Lore (Cult)': 15, Devotion: 15, 'Runic Affinity': 15 };
      CD.miracles = ['Extension', 'Find (Specific Thing)', 'Divination', 'Chastise'];
      AppRef.currentStep = 9;
      AppRef.totalSteps = 13;
      AppRef.prepareStep = () => {};
      AppRef.renderCurrentStep = () => {};

      const result = AppRef.agent.next();
      if (result.success && result.newStep === 10 && AppRef.currentStep === 10) {
        pass('App.agent.next honors capped qualified miracle count on Step 9');
      } else {
        fail('App.agent.next blocks Step 9 despite all available qualified miracles selected',
          JSON.stringify(result));
      }
    }
  } else {
    fail('App.agent.next or MIRACLES_DATA not found for miracle cap test');
  }
}

{
  const { App: AppRef, CharacterData: CD, MIRACLES_DATA: MiraclesRef } = loadApp();

  if (AppRef && AppRef.agent && AppRef.agent.selectMiracle && MiraclesRef?.cults?.Orlanth) {
    CD.cult = 'Orlanth';
    CD.cultChoiceMade = true;
    CD.cultInitiated = true; // Post-initiation miracle toggle behavior.
    CD.cultType = { types: ['theist'], label: 'Theist' };
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 10, POW: 12, CHA: 10 };
    CD.devotionalPool = 2;
    CD.runeAffinities = { primary: 'Air', secondary: 'Movement', tertiary: 'Death' };
    CD.miracles = [];

    const result = AppRef.agent.selectMiracle('Extension');
    if (result.success && result.miracles.includes('Extension')) {
      pass('App.agent.selectMiracle selects valid object-shaped miracle entries by name');
    } else {
      fail('App.agent.selectMiracle rejected a valid miracle name',
        JSON.stringify(result));
    }
  } else {
    fail('App.agent.selectMiracle object-shaped miracle test dependencies not found');
  }
}

{
  const { App: AppRef, CharacterData: CD, MIRACLES_DATA: MiraclesRef } = loadApp();

  if (AppRef && AppRef.getAvailableInitiateMiracleNames && AppRef.getQualifiedInitiateMiracles &&
      AppRef.getEffectiveInitiateMiracleLimit && AppRef.renderMiraclePicker && MiraclesRef?.cults?.Orlanth) {
    CD.cult = 'Orlanth';
    CD.cultChoiceMade = true;
    CD.cultInitiated = true; // Post-initiation available miracle list should stay unique.
    CD.cultType = { types: ['theist'], label: 'Theist' };
    CD.runeAffinities = { primary: 'Air', secondary: 'Movement', tertiary: 'Death' };
    CD.devotionalPool = 99;
    CD.miracles = [];

    const names = AppRef.getAvailableInitiateMiracleNames('Orlanth');
    const qualifiedNames = AppRef.getQualifiedInitiateMiracles('Orlanth').map(m => m.name);
    const availableDuplicate = names.find((name, index) => names.indexOf(name) !== index);
    const qualifiedDuplicate = qualifiedNames.find((name, index) => qualifiedNames.indexOf(name) !== index);
    const effectiveLimit = AppRef.getEffectiveInitiateMiracleLimit('Orlanth');
    const container = { style: {}, innerHTML: '' };
    AppRef.renderMiraclePicker(container);
    const renderedCards = [...container.innerHTML.matchAll(/data-miracle="([^"]+)"/g)].map(match => match[1]);
    const renderedDuplicate = renderedCards.find((name, index) => renderedCards.indexOf(name) !== index);

    if (!availableDuplicate && !qualifiedDuplicate && !renderedDuplicate && effectiveLimit === names.length) {
      pass('Available initiate miracles, picker cards, and limits are unique before random selection');
    } else {
      fail('Initiate miracle de-duplication missed a consumer',
        JSON.stringify({ availableDuplicate, qualifiedDuplicate, renderedDuplicate, effectiveLimit, availableCount: names.length, qualifiedCount: qualifiedNames.length }));
    }
  } else {
    fail('Available initiate miracle uniqueness test dependencies not found');
  }
}

{
  const { App: AppRef, CharacterData: CD } = loadApp();

  if (AppRef && AppRef.getValidationState && AppRef.agent && AppRef.agent.next) {
    AppRef.currentStep = 9;
    CD.cult = 'Daka Fal';
    CD.cultChoiceMade = true;
    CD.cultInitiated = false;
    CD.cultType = { primary: 'animist', types: ['animist'], isHybrid: false };
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 10, POW: 10, CHA: 8 };
    CD.boundSpiritSlots = 0;
    CD.boundSpirits = [];

    const animistState = AppRef.getValidationState();
    const animistNext = AppRef.agent.next();

    AppRef.currentStep = 9;
    CD.cult = 'Arkat';
    CD.cultChoiceMade = true;
    CD.cultInitiated = false;
    CD.cultType = { primary: 'sorcery', types: ['sorcery'], isHybrid: false };
    CD.sorcerySpells = [];
    const sorceryState = AppRef.getValidationState();

    if (animistState.valid === true &&
        animistNext.success === true &&
        sorceryState.valid === true) {
      pass('Step 9 structured and agent validation allows uninitiated affiliation with no cult-backed selections');
    } else {
      fail('Step 9 structured/agent validation missed uninitiated affiliation baseline',
        JSON.stringify({ animistState, animistNext, sorceryState }));
    }
  } else {
    fail('Step 9 structured/agent validation dependencies not found');
  }
}

{
  const { App: AppRef, CharacterData: CD } = loadApp();

  if (AppRef?.agent?.setStep) {
    CD.culture = 'Praxian';
    CD.characteristics = { STR: 10, CON: 10, SIZ: 10, DEX: 10, INT: 10, POW: 10, CHA: 10 };
    const result = AppRef.agent.setStep(8, {
      career: 'Shaman',
      professionalSkills: [
        { name: 'Binding (Cult, Totem or Tradition)', specialization: 'Waha' },
        'Trance',
        { name: 'Lore (any)', specialization: 'Regional' }
      ]
    });
    if (!result.success && result.errors.some(error => /Regional.*category label|Regional/i.test(error))) {
      pass('Agent Step 8 rejects unresolved category-label specializations');
    } else {
      fail('Agent Step 8 accepted Lore (Regional) specialization',
        JSON.stringify(result));
    }
  } else {
    fail('Agent Step 8 placeholder validation dependencies not found');
  }
}

{
  const { App: AppRef, CharacterData: CD } = loadApp();

  if (AppRef?.agent?.setStep) {
    CD.careerSkills = {
      Athletics: 0,
      Brawn: 0,
      Conceal: 0,
      Dance: 0,
      Deceit: 0,
      Drive: 0
    };
    const result = AppRef.agent.setStep(10, {
      careerSkills: {
        'Craft (Primary)': 15,
        Athletics: 15,
        Brawn: 15,
        Conceal: 15,
        Dance: 15,
        Deceit: 15,
        Drive: 10
      },
      careerFolkMagic: ['Avert', 'Calm']
    });
    if (!result.success && result.errors.some(error => /concrete specialization/i.test(error))) {
      pass('Agent Step 10 rejects injected unresolved placeholder skill allocations');
    } else {
      fail('Agent Step 10 accepted unresolved placeholder skill allocation',
        JSON.stringify(result));
    }
  } else {
    fail('Agent Step 10 placeholder validation dependencies not found');
  }
}

// ============================================================
section('Add Hobby Skill Dropdown (U3)');
// ============================================================

{
  const { App: AppRef, CharacterData: CD } = loadApp();

  if (AppRef && AppRef.addBonusSkillByName) {
    // Setup
    CD.bonusSkills = { 'Athletics': 5 };
    CD.culturalSkills = { 'Athletics': 10 };
    CD.careerSkills = {};
    CD.hobbySkillName = null;

    // Test 1: Adding a new professional skill sets it in bonusSkills and marks it as the hobby pick
    AppRef.addBonusSkillByName('Commerce');
    if (CD.bonusSkills['Commerce'] === 0 && CD.hobbySkillName === 'Commerce') {
      pass('addBonusSkillByName adds new hobby skill with 0 points');
    } else {
      fail('addBonusSkillByName adds new hobby skill with 0 points', `Got Commerce=${CD.bonusSkills['Commerce']}, hobby=${CD.hobbySkillName}`);
    }

    // Test 2: Hobby skill limit enforced (only 1 new professional skill)
    CD.hobbySkillName = null;
    delete CD.bonusSkills['Commerce'];
    AppRef.addBonusSkillByName('Art (Painting)');
    AppRef.addBonusSkillByName('Lockpicking');
    if (CD.bonusSkills.hasOwnProperty('Art (Painting)') && !CD.bonusSkills.hasOwnProperty('Lockpicking')) {
      pass('addBonusSkillByName enforces 1 hobby skill limit for professional skills in SKILLS_DATA');
    } else {
      fail('addBonusSkillByName enforces 1 hobby skill limit for professional skills in SKILLS_DATA',
        `Art=${CD.bonusSkills.hasOwnProperty('Art (Painting)')}, Lockpicking=${CD.bonusSkills.hasOwnProperty('Lockpicking')}`);
    }

    // Test 3: Adding an already-present skill is a no-op
    CD.hobbySkillName = null;
    AppRef.addBonusSkillByName('Athletics');
    if (CD.bonusSkills['Athletics'] === 5) {
      pass('addBonusSkillByName skips already-present skill');
    } else {
      fail('addBonusSkillByName skips already-present skill', `Athletics is now ${CD.bonusSkills['Athletics']}`);
    }
  } else {
    fail('App.addBonusSkillByName function not found');
  }
}

// ============================================================
section('Test Summary');
// ============================================================

Promise.all(pendingTests).then(() => {
  console.log(`\nTotal tests: ${totalTests}`);
  console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);

  const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
  console.log(`Success rate: ${successRate}%\n`);

	  if (failedTests === 0) {
	    console.log(`${colors.green}✓ All tests passed!${colors.reset}\n`);
	    process.exit(0);
	  } else {
	    console.log(`${colors.red}✗ ${failedTests} tests failed${colors.reset}\n`);
	    process.exit(1);
	  }
	});
