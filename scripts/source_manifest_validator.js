#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function readJson(root, relPath) {
  const fullPath = path.join(root, relPath);
  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (err) {
    const wrapped = new Error(`${relPath}: ${err.message}`);
    wrapped.cause = err;
    throw wrapped;
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isPortableLocator(value) {
  if (value === null || value === undefined) return true;
  if (typeof value !== 'string' || value.trim() === '') return false;
  if (value.startsWith('/') || /^[A-Za-z]:[\\/]/.test(value) || value.includes('\\')) return false;
  return true;
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

function add(errors, location, message) {
  errors.push(`${location}: ${message}`);
}

function validateRenderContract(contract, errors, location) {
  if (!isObject(contract)) {
    add(errors, location, 'render_contract must be an object');
    return;
  }
  if (typeof contract.renderer !== 'string' || !contract.renderer) add(errors, location, 'render_contract.renderer is required');
  if (typeof contract.dpi !== 'number' || contract.dpi <= 0) add(errors, location, 'render_contract.dpi must be a positive number');
  if (contract.image_format !== 'png') add(errors, location, 'render_contract.image_format must be png for committed workflow metadata');
  if (!Array.isArray(contract.args)) add(errors, location, 'render_contract.args must be an array');
}

function validateManifest(manifest, schema) {
  const errors = [];
  if (!isObject(manifest)) return { ok: false, errors: ['manifest: must be an object'], sourceIds: new Set() };
  if (manifest.schemaVersion !== 1) add(errors, 'manifest.schemaVersion', 'expected 1');
  if (!Array.isArray(manifest.sources)) add(errors, 'manifest.sources', 'must be an array');

  const allowedStates = new Set(schema.lifecycle_states.source_revisions || []);
  const seen = new Set();

  for (const [index, source] of (manifest.sources || []).entries()) {
    const label = source && source.source_id ? `source ${source.source_id}` : `sources[${index}]`;
    if (!isObject(source)) {
      add(errors, label, 'must be an object');
      continue;
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(source.source_id || '')) add(errors, label, 'source_id must be lowercase kebab-case');
    if (seen.has(source.source_id)) add(errors, label, 'duplicate source_id');
    seen.add(source.source_id);
    if (typeof source.title !== 'string' || !source.title) add(errors, label, 'title is required');
    if (!allowedStates.has(source.lifecycle_state)) add(errors, label, `invalid lifecycle_state ${source.lifecycle_state}`);
    if (typeof source.source_revision_id !== 'string' || !/^[a-z0-9][a-z0-9._:-]+$/.test(source.source_revision_id)) {
      add(errors, label, 'source_revision_id must be a stable lowercase id');
    }
    if (!isPortableLocator(source.canonical_locator)) add(errors, label, `canonical_locator is not portable: ${source.canonical_locator}`);
    if (!isPortableLocator(source.local_hint)) add(errors, label, `local_hint is not portable: ${source.local_hint}`);
    if (!isObject(source.permission_basis) || typeof source.permission_basis.status !== 'string') {
      add(errors, label, 'permission_basis.status is required');
    }
    validateRenderContract(source.render_contract, errors, label);

    if (source.lifecycle_state === 'active') {
      if (!source.canonical_locator) add(errors, label, 'active source requires canonical_locator');
      if (!isSha256(source.sha256)) add(errors, label, 'active source requires 64-character sha256');
      if (typeof source.size_bytes !== 'number' || source.size_bytes <= 0) add(errors, label, 'active source requires positive size_bytes');
      if (!Number.isInteger(source.page_count) || source.page_count <= 0) add(errors, label, 'active source requires positive page_count');
      if (typeof source.acquired_at !== 'string' || !source.acquired_at) add(errors, label, 'active source requires acquired_at');
      if (Array.isArray(source.blockers) && source.blockers.length > 0) add(errors, label, 'active source must not have blockers');
    } else {
      if (!Array.isArray(source.blocks) || source.blocks.length === 0) add(errors, label, 'non-active source must list blocked operations in blocks[]');
      if (!Array.isArray(source.blockers) || source.blockers.length === 0) add(errors, label, 'non-active source must explain blockers[]');
      if (source.sha256 !== null && source.sha256 !== undefined && !isSha256(source.sha256)) add(errors, label, 'sha256 must be null/omitted or 64 lowercase hex');
      if (source.page_count !== null && source.page_count !== undefined && (!Number.isInteger(source.page_count) || source.page_count <= 0)) add(errors, label, 'page_count must be null/omitted or positive integer');
    }
  }

  return { ok: errors.length === 0, errors, sourceIds: seen };
}

function validatePageCoverage(pageDoc, manifestById, schema, relPath) {
  const errors = [];
  const pageStates = new Set(schema.lifecycle_states.page_work || []);
  if (!isObject(pageDoc)) return [`${relPath}: must be an object`];
  if (pageDoc.schemaVersion !== 1) add(errors, relPath, 'schemaVersion must be 1');
  const source = manifestById.get(pageDoc.source_id);
  if (!source) {
    add(errors, relPath, `unknown source_id ${pageDoc.source_id}`);
    return errors;
  }
  if (pageDoc.source_revision_id !== source.source_revision_id) {
    add(errors, relPath, `source_revision_id ${pageDoc.source_revision_id} does not match manifest ${source.source_revision_id}`);
  }
  if (!pageStates.has(pageDoc.coverage_state)) add(errors, relPath, `invalid coverage_state ${pageDoc.coverage_state}`);
  if (!Array.isArray(pageDoc.pages)) add(errors, relPath, 'pages must be an array');
  if (pageDoc.coverage_state === 'blocked' && (!Array.isArray(pageDoc.blockers) || pageDoc.blockers.length === 0)) {
    add(errors, relPath, 'blocked coverage requires blockers[]');
  }
  const expectedPageCount = pageDoc.expected_page_count;
  if (expectedPageCount !== null && expectedPageCount !== undefined &&
      (!Number.isInteger(expectedPageCount) || expectedPageCount <= 0)) {
    add(errors, relPath, 'expected_page_count must be null/omitted or a positive integer');
  }
  if (source.lifecycle_state === 'active' && Number.isInteger(source.page_count) && pageDoc.expected_page_count !== source.page_count) {
    add(errors, relPath, `expected_page_count ${pageDoc.expected_page_count} must match active source page_count ${source.page_count}`);
  }

  const seenPages = new Set();
  for (const [index, page] of (pageDoc.pages || []).entries()) {
    const label = `${relPath}:pages[${index}]`;
    if (!isObject(page)) {
      add(errors, label, 'must be an object');
      continue;
    }
    if (!Number.isInteger(page.pdf_page) || page.pdf_page <= 0) add(errors, label, 'pdf_page must be a positive integer');
    if (seenPages.has(page.pdf_page)) add(errors, label, `duplicate pdf_page ${page.pdf_page}`);
    seenPages.add(page.pdf_page);
    if (page.source_revision_id !== source.source_revision_id) add(errors, label, 'source_revision_id must match manifest');
    if (!pageStates.has(page.work_state)) add(errors, label, `invalid work_state ${page.work_state}`);
    if (!isObject(page.render)) add(errors, label, 'render object is required');
    if (page.render && page.render.status === 'rendered') {
      if (!isSha256(page.render.image_sha256)) add(errors, label, 'rendered page requires image_sha256');
      if (!isObject(page.render.dimensions)) add(errors, label, 'rendered page requires dimensions');
    }
    if (['verified', 'normalized', 'accepted'].includes(page.work_state)) {
      if (!isObject(page.extraction)) add(errors, label, `${page.work_state} page requires extraction metadata`);
      if (!isObject(page.verification)) add(errors, label, `${page.work_state} page requires verification metadata`);
      if (page.verification && page.verification.independent !== true) add(errors, label, 'verification.independent must be true');
    }
    if (['normalized', 'accepted'].includes(page.work_state) && (!Array.isArray(page.derived_facts) || page.derived_facts.length === 0)) {
      add(errors, label, `${page.work_state} page requires derived_facts[]`);
    }
    if (page.contributes === false && !page.exclusion_reason) add(errors, label, 'non-contributing page requires exclusion_reason');
  }
  if (Number.isInteger(expectedPageCount) && (pageDoc.pages || []).length > 0) {
    if ((pageDoc.pages || []).length !== expectedPageCount) {
      add(errors, relPath, `expected ${expectedPageCount} page records, found ${(pageDoc.pages || []).length}`);
    }
    for (let page = 1; page <= expectedPageCount; page++) {
      if (!seenPages.has(page)) add(errors, relPath, `missing pdf_page ${page}`);
    }
  }

  return errors;
}

function validateWorkflow(workflow) {
  const errors = [];
  if (!isObject(workflow)) return ['vision-workflow: must be an object'];
  if (workflow.schemaVersion !== 1) add(errors, 'vision-workflow.schemaVersion', 'expected 1');
  if (typeof workflow.workflow_id !== 'string' || !workflow.workflow_id) add(errors, 'vision-workflow.workflow_id', 'required');
  if (!isObject(workflow.extractor) || !workflow.extractor.prompt_id || !workflow.extractor.prompt_version) {
    add(errors, 'vision-workflow.extractor', 'prompt_id and prompt_version are required');
  }
  if (!isObject(workflow.verifier) || !workflow.verifier.prompt_id || !workflow.verifier.prompt_version) {
    add(errors, 'vision-workflow.verifier', 'prompt_id and prompt_version are required');
  }
  const forbidden = workflow.verifier && workflow.verifier.forbidden_inputs;
  if (!Array.isArray(forbidden) || !forbidden.includes('extractor output') || !forbidden.includes('extractor scratchpad')) {
    add(errors, 'vision-workflow.verifier.forbidden_inputs', 'must forbid extractor output and scratchpad');
  }
  if (!Array.isArray(workflow.independence_rules) || workflow.independence_rules.length < 3) {
    add(errors, 'vision-workflow.independence_rules', 'must document verifier independence rules');
  }
  if (!isObject(workflow.committed_boundaries) || !Array.isArray(workflow.committed_boundaries.forbidden) || !workflow.committed_boundaries.forbidden.includes('full-page copyrighted transcription')) {
    add(errors, 'vision-workflow.committed_boundaries', 'must forbid full-page copyrighted transcription');
  }
  return errors;
}

function validateAll(options = {}) {
  const root = options.root || ROOT;
  const schema = readJson(root, 'references/sources/schema.json');
  const manifest = readJson(root, 'references/sources/manifest.json');
  const manifestResult = validateManifest(manifest, schema);
  const errors = [...manifestResult.errors];
  const manifestById = new Map((manifest.sources || []).map(source => [source.source_id, source]));

  for (const source of manifest.sources || []) {
    const relPath = `references/sources/pages/${source.source_id}.json`;
    const fullPath = path.join(root, relPath);
    if (!fs.existsSync(fullPath)) {
      add(errors, relPath, `missing page coverage for source_id ${source.source_id}`);
      continue;
    }
    const pageDoc = readJson(root, relPath);
    errors.push(...validatePageCoverage(pageDoc, manifestById, schema, relPath));
  }

  const pageDir = path.join(root, 'references/sources/pages');
  for (const file of fs.readdirSync(pageDir).filter(name => name.endsWith('.json'))) {
    const sourceId = path.basename(file, '.json');
    if (!manifestById.has(sourceId)) add(errors, `references/sources/pages/${file}`, 'page coverage source_id has no manifest source');
  }

  const workflow = readJson(root, 'references/sources/vision-workflow.json');
  errors.push(...validateWorkflow(workflow));

  return { ok: errors.length === 0, errors };
}

function main() {
  const quiet = process.argv.includes('--quiet');
  const result = validateAll();
  if (!result.ok) {
    console.error('Source manifest validation failed:');
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  if (!quiet) console.log('Source manifest validation passed.');
}

if (require.main === module) main();

module.exports = {
  validateAll,
  validateManifest,
  validatePageCoverage,
  validateWorkflow,
  isPortableLocator,
  isSha256
};
