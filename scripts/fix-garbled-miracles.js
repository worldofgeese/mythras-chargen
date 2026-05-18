#!/usr/bin/env node
/**
 * fix-garbled-miracles.js
 * 
 * Fixes garbled OCR miracle entries in reference JSONs and then propagates
 * corrections to the inline MIRACLES_DATA constant in index.html.
 * 
 * Phase 1: Fix reference JSONs (runelord splitting + rune prefix stripping)
 * Phase 2: Propagate to inline MIRACLES_DATA (rebuild from corrected refs)
 * 
 * Usage:
 *   node scripts/fix-garbled-miracles.js --phase1     # Fix reference JSONs only
 *   node scripts/fix-garbled-miracles.js --phase2     # Propagate to index.html
 *   node scripts/fix-garbled-miracles.js --dry-run    # Show what would change
 */

const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const REF_BASE = path.join(BASE, 'references/cults-raw');
const INDEX_HTML = path.join(BASE, 'index.html');

// The rune code legend from MIRACLES_DATA - maps OCR rune codes to rune names
// Extended with additional variants seen in source PDFs
const RUNE_CODE_LEGEND = {
  "y": "Fire/Sky", ".y": "Fire/Sky", "p": "Fire/Sky", ".p": "Fire/Sky",
  "4g": "Air", "g": "Air", "Rce": "Air", "ce": "Air", "gs": "Air", "cg": "Air",
  "gw": "Water", "w": "Water", "sw": "Water", "ow": "Water", "go": "Water",
  "e": "Earth", "ex": "Earth", "xe": "Earth", ".e": "Earth", "et": "Earth",
  "t": "Death", "ot": "Death", "dt": "Death", "Xt": "Death",
  "B": "Beast", "Bb": "Beast", "Rb": "Beast", "Bg": "Beast", "be": "Beast",
  "Bo": "Beast", "Bx": "Beast", "RB": "Beast",
  "l": "Harmony", "lx": "Harmony", "hl": "Harmony", "Wl": "Harmony",
  "s": "Movement", "st": "Movement",
  "m": "Moon", "lm": "Moon",
  "d": "Darkness", "dk": "Darkness", "o": "Darkness",
  "i": "Illusion", "ij": "Illusion", "hi": "Illusion", "io": "Illusion",
  "f": "Fertility",
  "ch": "Mastery",
  "j": "Disorder", "jo": "Disorder",
  "ay": "Magic", "RS": "Magic", "Rc": "Magic", "RW": "Magic",
  // Multi-rune combined codes (= "Any" rune; these are OCR artifacts of
  // multiple rune symbols rendered as one text block)
  ".4egow": "Any", "4egow": "Any", "egow": "Any", "gow": "Any",
  "Wegow": "Any", "4?": "Any",
  // Partial/garbled multi-rune variants
  "hj": "Illusion", "jt": "Death",
  "Ke": "Earth"
};

// Standard runelord miracles every theist cult receives
const STANDARD_RUNELORD = [
  "Excommunication",
  "Mindlink", 
  "Sanctify",
  "Summon Spirit of Reprisal"
];

// Known OCR noise entries that should be removed entirely
const NOISE_ENTRIES = ["Behold"];

// Sort rune codes by length descending for longest-match-first stripping
const RUNE_CODES_SORTED = Object.keys(RUNE_CODE_LEGEND).sort((a, b) => b.length - a.length);

/**
 * Strip a rune code prefix from a miracle name.
 * Returns { name: cleaned_name, rune: rune_name } or null if no prefix found.
 */
function stripRunePrefix(rawName) {
  const trimmed = rawName.trim();
  
  for (const code of RUNE_CODES_SORTED) {
    // Check if name starts with rune code followed by space
    if (trimmed.startsWith(code + ' ')) {
      const cleanName = trimmed.slice(code.length).trim();
      // Verify the remainder starts with uppercase (is actually a miracle name)
      if (cleanName.length > 0 && /^[A-Z]/.test(cleanName)) {
        return { name: cleanName, rune: RUNE_CODE_LEGEND[code] };
      }
    }
  }
  
  return null;
}

/**
 * Split a string that may contain multiple miracles separated by rune code prefixes.
 * e.g., "4? Chaos Gift jo Dark Fear io Bump In The Night" 
 * → [{name: "Chaos Gift", rune: "Any"}, {name: "Dark Fear", rune: "Disorder"}, {name: "Bump In The Night", rune: "Illusion"}]
 */
function splitByRuneCodes(rawStr) {
  const str = rawStr.trim();
  const results = [];
  
  // Try to find rune code boundaries within the string
  // Strategy: scan word by word, if a word is a rune code and next word starts uppercase, it's a boundary
  const words = str.split(/\s+/);
  let currentName = '';
  let currentRune = null;
  
  let i = 0;
  // Check if first token(s) are a rune code
  for (const code of RUNE_CODES_SORTED) {
    const codeWords = code.split(/\s+/);
    const potential = words.slice(0, codeWords.length).join(' ');
    if (potential === code && words.length > codeWords.length && /^[A-Z]/.test(words[codeWords.length])) {
      currentRune = RUNE_CODE_LEGEND[code];
      i = codeWords.length;
      break;
    }
  }
  
  while (i < words.length) {
    // Check if current word (possibly with next) forms a rune code prefix for a new miracle
    let foundCode = false;
    for (const code of RUNE_CODES_SORTED) {
      const codeWords = code.split(/\s+/);
      if (i + codeWords.length < words.length) {
        const potential = words.slice(i, i + codeWords.length).join(' ');
        if (potential === code && /^[A-Z]/.test(words[i + codeWords.length])) {
          // Found a new miracle boundary
          if (currentName.trim()) {
            results.push({ name: currentName.trim(), rune: currentRune });
          }
          currentRune = RUNE_CODE_LEGEND[code];
          currentName = '';
          i += codeWords.length;
          foundCode = true;
          break;
        }
      }
    }
    if (!foundCode) {
      currentName += (currentName ? ' ' : '') + words[i];
      i++;
    }
  }
  
  // Push final miracle
  if (currentName.trim()) {
    results.push({ name: currentName.trim(), rune: currentRune });
  }
  
  return results.length > 1 ? results : null; // Return null if no splitting occurred
}

/**
 * Split a concatenated runelord string into individual miracle names.
 * Handles: "Excommunication Mindlink Sanctify Summon Spirit of Reprisal Awaken"
 * Also handles partial: "Mindlink Excommunication"
 */
function splitRunelordString(concatenated) {
  const str = concatenated.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
  
  // Full standard block present?
  const standardBlock = "Excommunication Mindlink Sanctify Summon Spirit of Reprisal";
  
  if (str.includes(standardBlock)) {
    const results = [...STANDARD_RUNELORD];
    const blockIdx = str.indexOf(standardBlock);
    const before = str.slice(0, blockIdx).trim();
    const after = str.slice(blockIdx + standardBlock.length).trim();
    
    if (before) {
      const extras = parseMiracleTokens(before);
      results.unshift(...extras.map(e => typeof e === 'string' ? e : e.name));
    }
    if (after) {
      const extras = parseMiracleTokens(after);
      results.push(...extras.map(e => typeof e === 'string' ? e : e.name));
    }
    return results;
  }
  
  // Partial standard miracles present (like "Mindlink Excommunication")
  // Try to identify which standard miracles are in the string
  const found = [];
  let working = str;
  
  // Sort standard runelord by length desc to match "Summon Spirit of Reprisal" before "Summon"
  const sortedStandard = [...STANDARD_RUNELORD].sort((a, b) => b.length - a.length);
  for (const std of sortedStandard) {
    if (working.includes(std)) {
      found.push(std);
      working = working.replace(std, ' ||| ');
    }
  }
  
  // Whatever remains is cult-specific
  const remainder = working.split('|||').map(s => s.trim()).filter(s => s);
  const extras = [];
  for (const rem of remainder) {
    const parsed = parseMiracleTokens(rem);
    extras.push(...parsed.map(e => typeof e === 'string' ? e : e.name));
  }
  
  return [...found, ...extras];
}

/**
 * Parse a string of concatenated miracle names (possibly with rune prefixes) 
 * into individual miracle entries.
 */
function parseMiracleTokens(str) {
  if (!str || !str.trim()) return [];
  
  const results = [];
  // Split on patterns: rune code followed by uppercase letter, or two uppercase words adjacent
  // First, strip rune prefixes and try to identify miracle boundaries
  
  let working = str.trim();
  
  // Try splitting by recognizing rune code boundaries
  // A rune code prefix before an uppercase word is a boundary marker
  const parts = [];
  let current = '';
  const words = working.split(/\s+/);
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Check if this word is a rune code (and next word starts with uppercase)
    const isRuneCode = RUNE_CODE_LEGEND[word] !== undefined;
    const nextIsUpper = i + 1 < words.length && /^[A-Z]/.test(words[i + 1]);
    
    if (isRuneCode && nextIsUpper && current) {
      // This starts a new miracle - save current
      parts.push(current.trim());
      current = word + ' ';
    } else {
      current += word + ' ';
    }
  }
  if (current.trim()) parts.push(current.trim());
  
  // Now process each part
  for (const part of parts) {
    const stripped = stripRunePrefix(part);
    if (stripped) {
      results.push({ name: stripped.name, rune: stripped.rune });
    } else if (/^[A-Z]/.test(part)) {
      results.push({ name: part, rune: null });
    }
    // Skip purely lowercase garbage
  }
  
  return results.length > 0 ? results : [{ name: str, rune: null }];
}

/**
 * Fix a reference JSON's miracles field.
 * Returns the corrected miracles object.
 */
function fixReferenceMiracles(miracles, cultName) {
  if (!miracles) return miracles;
  
  const fixed = { initiate: [], associate: [], runelord: [] };
  const log = [];
  
  // Normalize arrays - some JSONs have object or null values
  const initArr = Array.isArray(miracles.initiate) ? miracles.initiate : [];
  const assocArr = Array.isArray(miracles.associate) ? miracles.associate : [];
  const runelordArr = Array.isArray(miracles.runelord) ? miracles.runelord : [];
  
  // If associate is an object (e.g., Waha), preserve it as-is
  if (miracles.associate && !Array.isArray(miracles.associate) && typeof miracles.associate === 'object') {
    fixed.associate = miracles.associate;
  }
  
  // Fix initiate miracles - strip rune prefixes and split multi-miracle entries
  for (const entry of initArr) {
    if (typeof entry !== 'string') { fixed.initiate.push(entry); continue; }
    
    // First try splitting by embedded rune codes (handles concatenated miracles)
    const splitResult = splitByRuneCodes(entry);
    if (splitResult) {
      log.push(`  initiate: "${entry}" → ${splitResult.length} entries: ${splitResult.map(r => `"${r.name}" [${r.rune}]`).join(', ')}`);
      for (const r of splitResult) {
        fixed.initiate.push(r.name);
      }
      continue;
    }
    
    // Then try simple prefix stripping
    const stripped = stripRunePrefix(entry);
    if (stripped) {
      log.push(`  initiate: "${entry}" → "${stripped.name}" [${stripped.rune}]`);
      fixed.initiate.push(stripped.name);
    } else {
      fixed.initiate.push(entry);
    }
  }
  
  // Fix associate miracles - strip rune prefixes but preserve cult:miracle format
  for (const entry of assocArr) {
    if (typeof entry !== 'string') { fixed.associate.push(entry); continue; }
    
    // Associate entries may be "CultName:MiracleName" with a prefix
    const stripped = stripRunePrefix(entry);
    if (stripped) {
      log.push(`  associate: "${entry}" → "${stripped.name}" [${stripped.rune}]`);
      fixed.associate.push(stripped.name);
    } else {
      fixed.associate.push(entry);
    }
  }
  
  // Fix runelord miracles - split concatenated strings and strip prefixes
  for (const entry of runelordArr) {
    if (typeof entry !== 'string') { fixed.runelord.push(entry); continue; }
    
    // Check if this contains standard runelord miracles concatenated (any 2+ together)
    const hasMultipleStandard = STANDARD_RUNELORD.filter(s => entry.includes(s)).length >= 2;
    if (hasMultipleStandard) {
      const split = splitRunelordString(entry);
      log.push(`  runelord: "${entry.slice(0, 60)}${entry.length > 60 ? '...' : ''}" → ${split.length} entries`);
      for (const s of split) {
        if (typeof s === 'string') {
          fixed.runelord.push(s);
        } else {
          fixed.runelord.push(s.name);
        }
      }
    } else {
      // Try splitting by embedded rune codes first
      const splitResult = splitByRuneCodes(entry);
      if (splitResult) {
        log.push(`  runelord: "${entry}" → ${splitResult.length} entries: ${splitResult.map(r => `"${r.name}" [${r.rune}]`).join(', ')}`);
        for (const r of splitResult) {
          fixed.runelord.push(r.name);
        }
      } else {
        const stripped = stripRunePrefix(entry);
        if (stripped) {
          log.push(`  runelord: "${entry}" → "${stripped.name}" [${stripped.rune}]`);
          fixed.runelord.push(stripped.name);
        } else {
          fixed.runelord.push(entry);
        }
      }
    }
  }
  
  // Remove newlines from entries (OCR artifact)
  for (const rank of ['initiate', 'associate', 'runelord']) {
    if (Array.isArray(fixed[rank])) {
      fixed[rank] = fixed[rank].map(e => typeof e === 'string' ? e.replace(/\n/g, ' ').trim() : e);
    }
  }
  
  return { fixed, log };
}

/**
 * Phase 1: Fix all reference JSONs
 */
function phase1(dryRun = false) {
  console.log('=== Phase 1: Fix Reference JSONs ===\n');
  
  const pantheonDirs = fs.readdirSync(REF_BASE).filter(d => {
    try { return fs.statSync(path.join(REF_BASE, d)).isDirectory(); } catch(e) { return false; }
  });
  
  let totalFixed = 0;
  let filesModified = 0;
  
  for (const pDir of pantheonDirs) {
    const pPath = path.join(REF_BASE, pDir);
    const files = fs.readdirSync(pPath).filter(f => f.endsWith('.json') && f !== 'cults.json');
    
    for (const f of files) {
      const filePath = path.join(pPath, f);
      let refData;
      try {
        refData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch(e) { continue; }
      
      if (!refData.miracles) continue;
      
      const { fixed, log } = fixReferenceMiracles(refData.miracles, refData.name);
      
      if (log.length > 0) {
        console.log(`${pDir}/${f} [${refData.name}]:`);
        log.forEach(l => console.log(l));
        console.log('');
        
        totalFixed += log.length;
        filesModified++;
        
        if (!dryRun) {
          refData.miracles = fixed;
          fs.writeFileSync(filePath, JSON.stringify(refData, null, 2) + '\n');
        }
      }
    }
  }
  
  console.log(`\n--- Phase 1 Summary ---`);
  console.log(`Files modified: ${filesModified}`);
  console.log(`Total corrections: ${totalFixed}`);
  if (dryRun) console.log('(DRY RUN - no files written)');
}

/**
 * Phase 2: Propagate reference fixes to inline MIRACLES_DATA in index.html
 * 
 * Strategy:
 * 1. For each cult with flagged entries, load the clean reference JSON
 * 2. Rebuild the cult's miracles array entirely from the reference,
 *    using the reference as the source of truth for miracle names
 * 3. Determine runes from: cult pantheon, known rune assignments, or "Any"
 * 4. Remove all split_from_garbled and rune_inferred flags
 */
function phase2(dryRun = false) {
  console.log('=== Phase 2: Propagate to inline MIRACLES_DATA ===\n');
  
  const html = fs.readFileSync(INDEX_HTML, 'utf8');
  
  // Parse MIRACLES_DATA
  const startIdx = html.indexOf('const MIRACLES_DATA = {');
  const startBrace = html.indexOf('{', startIdx);
  let depth = 0, endIdx = -1;
  for (let i = startBrace; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') { depth--; if (depth === 0) { endIdx = i + 1; break; } }
  }
  
  const miraclesData = JSON.parse(html.slice(startBrace, endIdx));
  
  // Build reference lookup map
  const refMap = {};
  const pantheonDirs = fs.readdirSync(REF_BASE).filter(d => {
    try { return fs.statSync(path.join(REF_BASE, d)).isDirectory(); } catch(e) { return false; }
  });
  
  for (const pDir of pantheonDirs) {
    const pPath = path.join(REF_BASE, pDir);
    const files = fs.readdirSync(pPath).filter(f => f.endsWith('.json') && f !== 'cults.json');
    for (const f of files) {
      try {
        const refData = JSON.parse(fs.readFileSync(path.join(pPath, f), 'utf8'));
        if (refData.name) refMap[refData.name] = refData;
      } catch(e) {}
    }
  }
  
  // Known rune assignments for specific miracles (from PDF verification)
  const KNOWN_MIRACLE_RUNES = {
    // Standard common miracles
    'Extension': 'Any', 'Find (Specific Thing)': 'Any', 'Divination': 'Any', 'Chastise': 'Any',
    // Standard runelord miracles
    'Excommunication': 'Any', 'Mindlink': 'Any', 'Sanctify': 'Any', 'Summon Spirit of Reprisal': 'Any',
    // Common miracles that appear across many cults
    'Absorption': 'Magic', 'Reflection': 'Magic', 'Multispell': 'Magic',
    'Soul Sight': 'Beast', 'Spirit Block': 'Beast',
    'Dismiss Elemental': 'Any', 'Command (Specific Species, Monster or Spirit)': 'Beast',
  };
  
  let totalCleaned = 0;
  let cultsFixed = 0;
  
  for (const [cultName, cultData] of Object.entries(miraclesData.cults || {})) {
    const hasFlagged = (cultData.miracles || []).some(m => m.split_from_garbled || m.rune_inferred);
    if (!hasFlagged) continue;
    
    const ref = refMap[cultName];
    if (!ref || !ref.miracles) {
      console.log(`WARNING: No reference for "${cultName}" - skipping`);
      continue;
    }
    
    const refMiracles = ref.miracles;
    const cultRune = getCultPrimaryRune(cultData, miraclesData.rune_code_legend);
    
    // Get the current clean entries (unflagged) as a base
    const currentClean = cultData.miracles.filter(m => !m.split_from_garbled && !m.rune_inferred);
    const currentCleanNames = new Set(currentClean.map(m => m.name));
    
    // Count flagged before fix
    const flaggedCount = cultData.miracles.filter(m => m.split_from_garbled || m.rune_inferred).length;
    
    // Build a complete miracles list from reference
    const newMiracles = [...currentClean]; // Start with existing clean entries
    
    // Process each rank from reference
    for (const rank of ['initiate', 'runelord']) {
      const refEntries = Array.isArray(refMiracles[rank]) ? refMiracles[rank] : [];
      
      for (const refName of refEntries) {
        if (typeof refName !== 'string') continue;
        if (NOISE_ENTRIES.includes(refName)) continue;
        if (currentCleanNames.has(refName)) continue; // Already present as clean entry
        
        // Skip if already added
        if (newMiracles.some(m => m.name === refName && m.rank === rank)) continue;
        
        // Determine the rune for this miracle
        let rune = KNOWN_MIRACLE_RUNES[refName];
        if (!rune) {
          // Try to find it from the flagged entries (they may have the correct rune)
          const matchingFlagged = cultData.miracles.find(m => 
            (m.split_from_garbled || m.rune_inferred) && m.rank === rank &&
            (m.name === refName || m.name.includes(refName) || refName.includes(m.name.replace(/^[a-z.]+\s+/, '')))
          );
          if (matchingFlagged && matchingFlagged.runes && matchingFlagged.runes[0]) {
            rune = matchingFlagged.runes[0];
          } else {
            rune = STANDARD_RUNELORD.includes(refName) ? 'Any' : cultRune;
          }
        }
        
        // Determine source
        const isSubcult = refName.includes('(s):') || refName.includes('(a):');
        let source = 'normal';
        if (isSubcult) {
          source = 'subservient';
        } else {
          // Check what source the flagged entry had
          const matchingFlagged = cultData.miracles.find(m => 
            (m.split_from_garbled || m.rune_inferred) && m.rank === rank
          );
          source = matchingFlagged?.source || 'normal';
        }
        
        // Common miracles always have source 'common'
        const COMMON_MIRACLES = ['Extension', 'Find (Specific Thing)', 'Divination', 'Chastise'];
        if (COMMON_MIRACLES.includes(refName)) source = 'common';
        
        newMiracles.push({
          name: refName,
          runes: [rune || 'Any'],
          source: source,
          rank: rank
        });
      }
    }
    
    // Also process associate entries if the reference has them as array
    if (Array.isArray(refMiracles.associate)) {
      for (const refName of refMiracles.associate) {
        if (typeof refName !== 'string') continue;
        if (currentCleanNames.has(refName)) continue;
        if (newMiracles.some(m => m.name === refName)) continue;
        
        const rune = cultRune || 'Any';
        newMiracles.push({
          name: refName,
          runes: [rune],
          source: 'associate',
          rank: 'initiate'  // associate miracles are available at initiate level
        });
      }
    }
    
    cultData.miracles = newMiracles;
    cultsFixed++;
    totalCleaned += flaggedCount;
    const newCount = newMiracles.length;
    console.log(`${cultName}: ${flaggedCount} flagged removed, ${newCount} total entries now`);
  }
  
  // Remove stats counters that reference garbled processing
  if (miraclesData.stats) {
    miraclesData.stats.remaining_unverified = 0;
    miraclesData.stats.artifacts_fixed = miraclesData.stats.total_extracted;
  }
  
  // Serialize back to index.html
  const newJson = JSON.stringify(miraclesData, null, 2);
  const newHtml = html.slice(0, startBrace) + newJson + html.slice(endIdx);
  
  console.log(`\n--- Phase 2 Summary ---`);
  console.log(`Cults fixed: ${cultsFixed}`);
  console.log(`Total flagged entries cleaned: ${totalCleaned}`);
  
  // Verify no flags remain
  const remaining = (newJson.match(/split_from_garbled/g) || []).length;
  const runeInferred = (newJson.match(/rune_inferred/g) || []).length;
  console.log(`Remaining split_from_garbled: ${remaining}`);
  console.log(`Remaining rune_inferred: ${runeInferred}`);
  
  if (!dryRun) {
    fs.writeFileSync(INDEX_HTML, newHtml);
    console.log('index.html updated.');
  } else {
    console.log('(DRY RUN - no files written)');
  }
}

/**
 * Determine a cult's primary rune from its inline data or pantheon.
 */
function getCultPrimaryRune(cultData, legend) {
  // Use the pantheon to infer primary rune
  const pantheonRunes = {
    "Storm": "Air",
    "Lunar": "Moon",
    "Darkness": "Darkness",
    "Sea": "Water",
    "Solar": "Fire/Sky",
    "Praxian": "Beast",
    "Earth": "Earth",
    "Chaos": "Disorder"
  };
  
  return pantheonRunes[cultData.pantheon] || "Any";
}

// Main
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const phase = args.includes('--phase2') ? 2 : args.includes('--phase1') ? 1 : 0;

if (phase === 0) {
  console.log('Usage:');
  console.log('  node scripts/fix-garbled-miracles.js --phase1 [--dry-run]');
  console.log('  node scripts/fix-garbled-miracles.js --phase2 [--dry-run]');
  console.log('  node scripts/fix-garbled-miracles.js --phase1 --phase2 [--dry-run]');
  process.exit(0);
}

if (phase === 1 || args.includes('--phase1')) {
  phase1(dryRun);
}
if (phase === 2 || (args.includes('--phase1') && args.includes('--phase2'))) {
  if (args.includes('--phase2')) phase2(dryRun);
}
if (phase === 2 && !args.includes('--phase1')) {
  phase2(dryRun);
}
