#!/usr/bin/env python3
"""E2E Playwright test for mythras-chargen — batch approach.

Runs all checks as a single JS evaluation to avoid per-call overhead.
Requires playwright-cli open at the page.
"""
import subprocess
import sys
import json

def pw_eval(expr):
    result = subprocess.run(
        ["devbox", "run", "playwright-cli", "eval", expr],
        capture_output=True, text=True, timeout=60,
        cwd="/home/node/.openclaw/devbox-env"
    )
    out = result.stdout + result.stderr
    lines = out.split("\n")
    found = False
    for line in lines:
        line = line.strip()
        if line == "### Result":
            found = True
            continue
        if found and line:
            if line.startswith('"') and line.endswith('"'):
                return line[1:-1]
            return line
        if "### Error" in line:
            return None
    return None

# Big batch test as single eval
TEST_JS = r"""
(function() {
  var results = {};
  
  // 1. Generate random character
  App.generateRandomCharacter();
  var CD = CharacterData;
  
  results.name = CD.name || '';
  results.culture = CD.culture || '';
  results.career = CD.career || '';
  results.cult = CD.cult || 'null';
  results.age = CD.age || 0;
  results.str = CD.characteristics ? CD.characteristics.STR : 0;
  results.ap = CD.attributes ? CD.attributes.actionPoints : 0;
  results.combatStyles = CD.combatStyles ? CD.combatStyles.length : 0;
  results.weapons = CD.weapons ? CD.weapons.length : 0;
  results.folkMagic = CD.folkMagicSpells ? CD.folkMagicSpells.length : 0;
  results.runes = CD.runes ? Object.keys(CD.runes).length : 0;
  results.passions = CD.passions ? CD.passions.length : 0;
  results.hitPoints = CD.attributes && CD.attributes.hitPoints && CD.attributes.hitPoints.head ? CD.attributes.hitPoints.head.max : 0;
  results.equipment = CD.equipment ? CD.equipment.length : 0;
  
  // 2. Check wizard steps render (just count, don't actually render)
  results.totalSteps = 12;
  results.stepIndicator = document.getElementById('step-indicator') ? document.getElementById('step-indicator').textContent : '';
  
  // 3. Cult data
  results.cultsData = typeof CULTS_DATA !== 'undefined' ? CULTS_DATA.length : 0;
  results.cultMap = typeof CULTURE_CULT_MAP !== 'undefined' ? Object.keys(CULTURE_CULT_MAP).length : 0;
  
  // 4. Check Play Mode fields exist in HTML
  results.playName = !!document.getElementById('play-name');
  results.playCulture = !!document.getElementById('play-culture');
  results.playCareer = !!document.getElementById('play-career');
  results.playCult = !!document.getElementById('play-cult');
  results.playAge = !!document.getElementById('play-age');
  results.playNotes = !!document.getElementById('play-notes');
  results.playChars = !!document.getElementById('play-characteristics');
  results.playAttrs = !!document.getElementById('play-attributes');
  results.playSkills = !!document.getElementById('play-skills');
  results.playCombat = !!document.getElementById('play-combat');
  results.playHitLoc = !!document.getElementById('play-hit-locations');
  results.playMagic = !!document.getElementById('play-magic');
  results.playRunes = !!document.getElementById('play-runes');
  results.playEquip = !!document.getElementById('play-equipment');
  
  // 5. PDF export references
  var pdfSrc = App.exportSinglePagePDF.toString();
  results.pdfHasName = pdfSrc.includes('CharacterData.name');
  results.pdfHasCulture = pdfSrc.includes('CharacterData.culture');
  results.pdfHasCult = pdfSrc.includes('CharacterData.cult');
  results.pdfHasChars = pdfSrc.includes('CharacterData.characteristics');
  results.pdfHasAttrs = pdfSrc.includes('attrs');
  results.pdfHasHitPoints = pdfSrc.includes('hitPoints');
  results.pdfHasCombat = pdfSrc.includes('combatStyles');
  results.pdfHasWeapons = pdfSrc.includes('CharacterData.weapons');
  results.pdfHasSkills = pdfSrc.includes('compileAllSkills');
  results.pdfHasMagic = pdfSrc.includes('folkMagicSpells');
  results.pdfHasRunes = pdfSrc.includes('CharacterData.runes');
  results.pdfHasEquip = pdfSrc.includes('CharacterData.equipment');
  results.pdfHasNotes = pdfSrc.includes('CharacterData.notes');
  results.pdfHasConcept = pdfSrc.includes('CharacterData.concept');
  results.pdfHasBackground = pdfSrc.includes('CharacterData.background');
  results.pdfHasAge = pdfSrc.includes('CharacterData.age');
  results.pdfHasGender = pdfSrc.includes('CharacterData.gender');
  results.pdfLength = pdfSrc.length;
  
  // 6. Play Mode rendering (do it and check populated)
  App.switchMode('play');
  App.renderPlayMode();
  results.playNameVal = document.getElementById('play-name') ? document.getElementById('play-name').value : '';
  results.playCultVal = document.getElementById('play-cult') ? document.getElementById('play-cult').value : '';
  results.playCharsHTML = document.getElementById('play-characteristics') ? document.getElementById('play-characteristics').innerHTML.length : 0;
  results.playSkillsHTML = document.getElementById('play-skills') ? document.getElementById('play-skills').innerHTML.length : 0;
  results.playCombatHTML = document.getElementById('play-combat') ? document.getElementById('play-combat').innerHTML.length : 0;
  
  return JSON.stringify(results);
})()
"""

print("Running batch E2E test...")
raw = pw_eval(TEST_JS)
if not raw:
    print("ERROR: batch eval returned nothing")
    sys.exit(1)

try:
    r = json.loads(raw)
except json.JSONDecodeError as e:
    print(f"ERROR: failed to parse JSON: {e}")
    print(f"Raw: {raw[:200]}")
    sys.exit(1)

PASS = 0
FAIL = 0

def check(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ✓ {name}")
    else:
        FAIL += 1
        print(f"  ✗ {name} — {detail}")

print(f"\nCharacter: {r['name']}, {r['culture']}, {r['career']}, cult={r['cult']}")

print("\n=== 1. RANDOM GENERATION ===")
check("Name set", bool(r['name']))
check("Culture set", bool(r['culture']))
check("Career set", bool(r['career']))
check("Age set", r['age'] > 0, f"got {r['age']}")
check("STR set", r['str'] > 0, f"got {r['str']}")
check("Action Points", r['ap'] > 0, f"got {r['ap']}")
check("Combat styles", r['combatStyles'] > 0, f"got {r['combatStyles']}")
check("Weapons", r['weapons'] > 0, f"got {r['weapons']}")
check("Folk magic", r['folkMagic'] > 0, f"got {r['folkMagic']}")
check("Rune affinities", r['runes'] >= 0, f"got {r['runes']}")
check("Passions", r['passions'] > 0, f"got {r['passions']}")
check("Hit points", r['hitPoints'] > 0, f"got {r['hitPoints']}")

print("\n=== 2. CULT DATA ===")
check("CULTS_DATA loaded (94)", r['cultsData'] == 94, f"got {r['cultsData']}")
check("CULTURE_CULT_MAP (8 cultures)", r['cultMap'] == 8, f"got {r['cultMap']}")

print("\n=== 3. PLAY MODE FIELDS ===")
for field in ['playName', 'playCulture', 'playCareer', 'playCult', 'playAge', 
              'playNotes', 'playChars', 'playAttrs', 'playSkills', 'playCombat',
              'playHitLoc', 'playMagic', 'playRunes', 'playEquip']:
    check(f"Play Mode has #{field.replace('play','play-').lower()}", r[field])

print("\n=== 4. PLAY MODE RENDERING ===")
check("Play Mode name populated", bool(r['playNameVal']), f"got: {r['playNameVal']}")
check("Play Mode cult populated", bool(r['playCultVal']), f"got: {r['playCultVal']}")
check("Characteristics HTML rendered", r['playCharsHTML'] > 50, f"got {r['playCharsHTML']} chars")
check("Skills HTML rendered", r['playSkillsHTML'] > 100, f"got {r['playSkillsHTML']} chars")
check("Combat HTML rendered", r['playCombatHTML'] > 50, f"got {r['playCombatHTML']} chars")

print("\n=== 5. PDF EXPORT FIELD COVERAGE ===")
pdf_fields = {
    'name': r['pdfHasName'],
    'culture': r['pdfHasCulture'],
    'cult': r['pdfHasCult'],
    'characteristics': r['pdfHasChars'],
    'attributes': r['pdfHasAttrs'],
    'hitPoints': r['pdfHasHitPoints'],
    'combatStyles': r['pdfHasCombat'],
    'weapons': r['pdfHasWeapons'],
    'skills': r['pdfHasSkills'],
    'folkMagic': r['pdfHasMagic'],
    'runes': r['pdfHasRunes'],
    'equipment': r['pdfHasEquip'],
    'notes': r['pdfHasNotes'],
    'concept': r['pdfHasConcept'],
    'background': r['pdfHasBackground'],
    'age': r['pdfHasAge'],
    'gender': r['pdfHasGender'],
}
for field, present in pdf_fields.items():
    check(f"PDF references {field}", present)

# Check what Play Mode has that PDF is missing
print(f"\n  PDF export function: {r['pdfLength']} chars")
play_only = [f for f, v in pdf_fields.items() if not v]
if play_only:
    print(f"\n  ⚠ MISSING from PDF: {', '.join(play_only)}")

print(f"\n=== SUMMARY ===")
print(f"  Passed: {PASS}")
print(f"  Failed: {FAIL}")
print(f"  Total: {PASS + FAIL}")

sys.exit(1 if FAIL > 0 else 0)
