#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const EXPORTED_APP_CONSTANTS = [
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
  'HIT_LOCATIONS',
  'GLORANTHA_CULTURES_DATA'
];

function readJson(root, relPath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, relPath), 'utf8'));
  } catch (err) {
    const wrapped = new Error(`${relPath}: ${err.message}`);
    wrapped.cause = err;
    throw wrapped;
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function add(errors, location, message) {
  errors.push(`${location}: ${message}`);
}

function escapeRegex(ch) {
  return /[|\\{}()[\]^$+?.]/.test(ch) ? `\\${ch}` : ch;
}

function globToRegExp(pattern) {
  let re = '^';
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        if (pattern[i + 2] === '/') {
          re += '(?:.*/)?';
          i += 2;
        } else {
          re += '.*';
          i += 1;
        }
      } else {
        re += '[^/]*';
      }
    } else if (ch === '?') {
      re += '[^/]';
    } else {
      re += escapeRegex(ch);
    }
  }
  re += '$';
  return new RegExp(re);
}

function matchesDisposition(filePath, disposition) {
  if (disposition.path) return filePath === disposition.path;
  if (disposition.path_glob) return globToRegExp(disposition.path_glob).test(filePath);
  return false;
}

function trackedFiles(root) {
  const output = childProcess.execFileSync('git', ['-C', root, 'ls-files'], { encoding: 'utf8' });
  return output.split('\n').filter(Boolean);
}

function isTrackedSourceLike(filePath) {
  if (filePath === 'index.html') return true;
  if (/\.png$/i.test(filePath)) return true;
  if (filePath.startsWith('references/') && /\.(json|md|txt|pdf)$/i.test(filePath)) return true;
  if (filePath.startsWith('fixtures/') && filePath.endsWith('.json')) return true;
  if (filePath.startsWith('templates/')) return true;
  if (filePath.startsWith('docs/handouts/') && filePath.endsWith('.html')) return true;
  return false;
}

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (isObject(value)) {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
  }
  if (typeof value === 'string') return JSON.stringify(value.normalize('NFC'));
  return JSON.stringify(value);
}

function valueHash(value) {
  return crypto.createHash('sha256').update(canonicalize(value), 'utf8').digest('hex');
}

function validateDispositionShape(disposition, schema, errors, location) {
  if (!isObject(disposition)) {
    add(errors, location, 'must be an object');
    return;
  }
  if (typeof disposition.id !== 'string' || !disposition.id) add(errors, location, 'id is required');
  const selectorCount = ['path', 'path_glob', 'constant_name'].filter(key => disposition[key]).length;
  if (selectorCount !== 1) add(errors, location, 'exactly one of path, path_glob, or constant_name is required');
  if (!schema.artifact_classes.includes(disposition.artifact_class)) add(errors, location, `invalid artifact_class ${disposition.artifact_class}`);
  if (!schema.dispositions.includes(disposition.disposition)) add(errors, location, `invalid disposition ${disposition.disposition}`);
  if (typeof disposition.required_scope !== 'boolean') add(errors, location, 'required_scope must be boolean');
  if (typeof disposition.rationale !== 'string' || disposition.rationale.length < 12) add(errors, location, 'rationale must explain classification');
}

function sourceRefsFrom(container) {
  if (!isObject(container)) return [];
  const refs = [];
  if (isObject(container.source_ref)) refs.push(container.source_ref);
  if (Array.isArray(container.source_refs)) refs.push(...container.source_refs.filter(isObject));
  return refs;
}

function collectAuthoritySourceRefs(payload) {
  return [
    ...sourceRefsFrom(payload),
    ...sourceRefsFrom(payload && payload.authority),
    ...sourceRefsFrom(payload && payload.attestation)
  ];
}

function isMachineLocalLocator(value) {
  return typeof value === 'string' && (value.startsWith('/') || /^[A-Za-z]:[\\/]/.test(value) || value.includes('\\'));
}

function collectMachineLocalSourceLocators(value, location = '$', found = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectMachineLocalSourceLocators(item, `${location}[${index}]`, found));
  } else if (isObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      const childLocation = `${location}.${key}`;
      if (['source_pdf', 'source_path', 'canonical_locator', 'local_hint'].includes(key) && isMachineLocalLocator(child)) {
        found.push(`${childLocation}=${child}`);
      }
      collectMachineLocalSourceLocators(child, childLocation, found);
    }
  }
  return found;
}

function collectUnverifiedAuthorityMarkers(value, location = '$', found = []) {
  if (typeof value === 'string') {
    if (value.includes('UNVERIFIED')) found.push(`${location}:UNVERIFIED`);
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => collectUnverifiedAuthorityMarkers(item, `${location}[${index}]`, found));
  } else if (isObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      const childLocation = `${location}.${key}`;
      if (key === 'verified' && child === false) found.push(`${childLocation}:false`);
      if (key === 'source_authority' && child === false) found.push(`${childLocation}:false`);
      collectUnverifiedAuthorityMarkers(child, childLocation, found);
    }
  }
  return found;
}

function validateSourceAuthorityMetadata(payload, disposition, manifestById = new Map()) {
  const errors = [];
  const sourceIds = Array.isArray(disposition.source_ids) ? disposition.source_ids : [];
  const refs = collectAuthoritySourceRefs(payload);

  if (disposition.enforce_source_refs === true) {
    for (const sourceId of sourceIds) {
      const matchingRefs = refs.filter(ref => ref.source_id === sourceId);
      if (matchingRefs.length === 0) {
        add(errors, disposition.id || 'source authority', `missing source_ref for source_id ${sourceId}`);
        continue;
      }
      for (const ref of matchingRefs) {
        if (typeof ref.source_revision_id !== 'string' || !ref.source_revision_id) {
          add(errors, disposition.id || 'source authority', `source_ref for ${sourceId} missing source_revision_id`);
        } else if (manifestById.has(sourceId) && ref.source_revision_id !== manifestById.get(sourceId).source_revision_id) {
          add(errors, disposition.id || 'source authority', `source_ref for ${sourceId} has stale source_revision_id ${ref.source_revision_id}`);
        }
        if (typeof ref.page_manifest_path !== 'string' || !ref.page_manifest_path) {
          add(errors, disposition.id || 'source authority', `source_ref for ${sourceId} missing page_manifest_path`);
        }
      }
    }

    const localLocators = collectMachineLocalSourceLocators(payload);
    for (const locator of localLocators) {
      add(errors, disposition.id || 'source authority', `machine-local source locator is not portable: ${locator}`);
    }
  }

  if (disposition.disposition === 'governed-now') {
    const unverifiedMarkers = collectUnverifiedAuthorityMarkers(payload);
    for (const marker of unverifiedMarkers) {
      add(errors, disposition.id || 'source authority', `governed source authority contains unverified marker ${marker}`);
    }
  }

  return errors;
}

function validateLegacyDisposition(legacy, schema, root = ROOT) {
  const errors = [];
  if (!isObject(legacy)) return { ok: false, errors: ['legacy-disposition: must be an object'] };
  if (legacy.schemaVersion !== 1) add(errors, 'legacy-disposition.schemaVersion', 'expected 1');
  if (!Array.isArray(legacy.dispositions)) add(errors, 'legacy-disposition.dispositions', 'must be an array');
  if (!Array.isArray(legacy.app_constants)) add(errors, 'legacy-disposition.app_constants', 'must be an array');

  for (const [index, disposition] of (legacy.dispositions || []).entries()) {
    validateDispositionShape(disposition, schema, errors, `dispositions[${index}]`);
  }
  for (const [index, constant] of (legacy.app_constants || []).entries()) {
    validateDispositionShape({ ...constant, required_scope: true, id: constant.constant_name, constant_name: constant.constant_name }, schema, errors, `app_constants[${index}]`);
    if (!schema.app_constant_dispositions.includes(constant.disposition)) add(errors, `app_constants[${index}]`, `invalid app constant disposition ${constant.disposition}`);
  }

  const manifestById = new Map((readJson(root, 'references/sources/manifest.json').sources || []).map(source => [source.source_id, source]));
  const sourceIds = new Set(manifestById.keys());
  for (const [index, disposition] of (legacy.dispositions || []).entries()) {
    for (const sourceId of disposition.source_ids || []) {
      if (!sourceIds.has(sourceId)) add(errors, `dispositions[${index}]`, `unknown source_id ${sourceId}`);
    }
  }
  for (const [index, constant] of (legacy.app_constants || []).entries()) {
    for (const sourceId of constant.source_ids || []) {
      if (!sourceIds.has(sourceId)) add(errors, `app_constants[${index}]`, `unknown source_id ${sourceId}`);
    }
  }

  const dispositions = legacy.dispositions || [];
  const files = trackedFiles(root).filter(isTrackedSourceLike);
  for (const filePath of files) {
    const matches = dispositions.filter(disposition => matchesDisposition(filePath, disposition));
    if (matches.length === 0) add(errors, filePath, 'tracked source-like artifact lacks legacy disposition');
  }

  const constantsByName = new Map((legacy.app_constants || []).map(item => [item.constant_name, item]));
  for (const name of EXPORTED_APP_CONSTANTS) {
    if (!constantsByName.has(name)) add(errors, `app constant ${name}`, 'missing classification in legacy-disposition.json');
  }

  for (const disposition of dispositions.filter(item => item.scan_for_unverified)) {
    const matched = files.filter(filePath => matchesDisposition(filePath, disposition));
    for (const filePath of matched) {
      const text = fs.readFileSync(path.join(root, filePath), 'utf8');
      for (const marker of schema.forbidden_markers.governed_files || []) {
        if (text.includes(marker)) add(errors, filePath, `governed file contains forbidden marker ${marker}`);
      }
      if (disposition.scan_for_ocr_artifacts) {
        for (const pattern of schema.forbidden_markers.known_ocr_name_prefixes || []) {
          const re = new RegExp(pattern, 'm');
          if (re.test(text)) add(errors, filePath, `governed file matches known OCR artifact pattern ${pattern}`);
        }
      }
    }
  }

  for (const disposition of dispositions.filter(item => item.enforce_source_refs === true || item.source_ids?.includes('monster-island'))) {
    if (!disposition.path || !disposition.path.endsWith('.json')) continue;
    const fullPath = path.join(root, disposition.path);
    if (!fs.existsSync(fullPath)) continue;
    const payload = readJson(root, disposition.path);
    errors.push(...validateSourceAuthorityMetadata(payload, disposition, manifestById).map(error => `${disposition.path}: ${error}`));
  }

  return { ok: errors.length === 0, errors };
}

function validateIndexMap(indexMap, legacy, schema) {
  const errors = [];
  if (!isObject(indexMap)) return ['index-html-map: must be an object'];
  if (indexMap.schemaVersion !== 1) add(errors, 'index-html-map.schemaVersion', 'expected 1');
  if (indexMap.source !== 'index.html') add(errors, 'index-html-map.source', 'must be index.html');
  if (!Array.isArray(indexMap.entries)) add(errors, 'index-html-map.entries', 'must be an array');
  const constantsByName = new Map((legacy.app_constants || []).map(item => [item.constant_name, item]));
  const entriesByName = new Map((indexMap.entries || []).map(item => [item.constant_name, item]));
  for (const name of EXPORTED_APP_CONSTANTS) {
    const entry = entriesByName.get(name);
    if (!entry) {
      add(errors, `index-html-map ${name}`, 'missing entry');
      continue;
    }
    const legacyEntry = constantsByName.get(name);
    if (legacyEntry && entry.disposition !== legacyEntry.disposition) add(errors, `index-html-map ${name}`, 'disposition differs from legacy-disposition app constant');
    if (!schema.fact_statuses.includes(entry.status)) add(errors, `index-html-map ${name}`, `invalid status ${entry.status}`);
    if (['verified', 'normalized', 'accepted'].includes(entry.status)) {
      for (const required of schema.provenance_map_schema.accepted_entry_required) {
        if (!(required in entry)) add(errors, `index-html-map ${name}`, `accepted entry missing ${required}`);
      }
    }
  }
  return errors;
}

function validateReport(report, schema) {
  const errors = [];
  if (!isObject(report)) return ['validation-report: must be an object'];
  for (const field of schema.validation_report_schema.required) {
    if (!(field in report)) add(errors, 'validation-report', `missing ${field}`);
  }
  if (report.status === 'accepted' && !(report.inputs && report.inputs.tree_hash)) {
    add(errors, 'validation-report.inputs.tree_hash', 'accepted report requires input tree hash');
  }
  return errors;
}

function validateAll(options = {}) {
  const root = options.root || ROOT;
  const schema = readJson(root, 'references/provenance/schema.json');
  const legacy = readJson(root, 'references/provenance/legacy-disposition.json');
  const indexMap = readJson(root, 'references/provenance/index-html-map.json');
  const report = readJson(root, 'references/provenance/validation-report.json');
  const legacyResult = validateLegacyDisposition(legacy, schema, root);
  const errors = [...legacyResult.errors];
  errors.push(...validateIndexMap(indexMap, legacy, schema));
  errors.push(...validateReport(report, schema));
  return { ok: errors.length === 0, errors };
}

function main() {
  const quiet = process.argv.includes('--quiet');
  const result = validateAll();
  if (!result.ok) {
    console.error('Provenance validation failed:');
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  if (!quiet) console.log('Provenance validation passed.');
}

if (require.main === module) main();

module.exports = {
  EXPORTED_APP_CONSTANTS,
  canonicalize,
  valueHash,
  globToRegExp,
  isTrackedSourceLike,
  validateAll,
  validateLegacyDisposition,
  validateSourceAuthorityMetadata,
  validateIndexMap,
  validateReport
};
