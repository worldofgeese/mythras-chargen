/**
 * 100-Character Generation & Validation Test
 * Uses Playwright to drive the chargen app and validate every generated character
 * against attested data sources (Mythras Core + AiG).
 */
import { chromium } from 'playwright';

const PLACEHOLDER_PATTERNS = [
  /\(any\)/i, /\(local\)/i, /\(any other\)/i,
  /\(Primary\)$/i, /\(Secondary\)$/i,
  /\(Primary Catch\)$/i, /\(Secondary Catch\)$/i,
  /\(Specific\s/i, /\(Hunting Related\)$/i,
  /\(Regional or Specific/i, /\(Shipboard\b/i,
  /\(Physiological\b/i, /\(Alchemical\b/i
];

function hasUnresolvedSkill(skillName) {
  if (!skillName) return false;
  return PLACEHOLDER_PATTERNS.some(p => p.test(skillName));
}

const NUM_CHARACTERS = 100;
const results = { pass: 0, fail: 0, errors: [] };

async function main() {
  const browser = await chromium.launch({
    executablePath: '/gnu/store/hspvnjz8gfcimznajp5pl4k8gj0vqf7k-profile/bin/chromium',
    headless: true
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:8765/index.html', { waitUntil: 'networkidle' });

  // Wait for app to be ready
  await page.waitForFunction(() => typeof App !== 'undefined' && typeof App.generateRandomCharacter === 'function');

  for (let i = 0; i < NUM_CHARACTERS; i++) {
    const charData = await page.evaluate(() => {
      App.generateRandomCharacter();
      return {
        name: CharacterData.name,
        culture: CharacterData.culture,
        career: CharacterData.career,
        characteristics: CharacterData.characteristics,
        culturalSkills: CharacterData.culturalSkills,
        careerSkills: CharacterData.careerSkills,
        combatStyles: CharacterData.combatStyles,
        folkMagicSpells: CharacterData.folkMagicSpells,
        weapons: CharacterData.weapons,
        armor: CharacterData.armor,
        socialClass: CharacterData.socialClass,
        hitPoints: CharacterData.hitPoints,
        runeAffinities: CharacterData.runeAffinities,
        passions: CharacterData.passions,
        selectedProfessionalSkills: CharacterData.selectedProfessionalSkills,
        bonusSkills: CharacterData.bonusSkills,
        startingMoney: CharacterData.startingMoney,
        homeland: CharacterData.homeland,
        cult: CharacterData.cult
      };
    });

    const charErrors = validateCharacter(charData, i + 1);
    if (charErrors.length === 0) {
      results.pass++;
    } else {
      results.fail++;
      results.errors.push({ index: i + 1, name: charData.name, culture: charData.culture, career: charData.career, errors: charErrors });
    }

    if ((i + 1) % 10 === 0) {
      process.stdout.write(`  ${i + 1}/${NUM_CHARACTERS} generated...\n`);
    }
  }

  await browser.close();

  // Print results
  console.log('\n' + '='.repeat(70));
  console.log(`RESULTS: ${results.pass} PASS / ${results.fail} FAIL out of ${NUM_CHARACTERS}`);
  console.log('='.repeat(70));

  if (results.errors.length > 0) {
    console.log(`\nFAILURES (${results.errors.length}):\n`);
    for (const err of results.errors) {
      console.log(`  #${err.index} ${err.name} (${err.culture} / ${err.career}):`);
      for (const e of err.errors) {
        console.log(`    - ${e}`);
      }
    }
  }

  // Summary by error type
  if (results.errors.length > 0) {
    const errorTypes = {};
    for (const err of results.errors) {
      for (const e of err.errors) {
        const type = e.split(':')[0];
        errorTypes[type] = (errorTypes[type] || 0) + 1;
      }
    }
    console.log('\nError type summary:');
    for (const [type, count] of Object.entries(errorTypes).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${type}: ${count}`);
    }
  }

  process.exit(results.fail > 0 ? 1 : 0);
}

function validateCharacter(char, idx) {
  const errors = [];

  // 1. Must have culture
  if (!char.culture) errors.push('MISSING_CULTURE: No culture set');

  // 2. Must have career
  if (!char.career) errors.push('MISSING_CAREER: No career set');

  // 3. Characteristics must be in valid range (3d6: 3-18, 2d6+6: 8-18)
  const chars = char.characteristics || {};
  for (const stat of ['STR', 'CON', 'DEX', 'POW', 'CHA']) {
    if (chars[stat] < 3 || chars[stat] > 18) errors.push(`BAD_STAT: ${stat}=${chars[stat]} out of 3-18 range`);
  }
  for (const stat of ['SIZ', 'INT']) {
    if (chars[stat] < 8 || chars[stat] > 18) errors.push(`BAD_STAT: ${stat}=${chars[stat]} out of 8-18 range`);
  }

  // 4. Check ALL skills for unresolved placeholders
  const allSkills = [
    ...Object.keys(char.culturalSkills || {}),
    ...Object.keys(char.careerSkills || {}),
    ...Object.keys(char.bonusSkills || {}),
    ...(char.selectedProfessionalSkills || [])
  ];
  for (const skill of allSkills) {
    if (hasUnresolvedSkill(skill)) {
      errors.push(`UNRESOLVED_SKILL: "${skill}"`);
    }
  }

  // 5. Cultural skill points must total 100
  const culturalTotal = Object.values(char.culturalSkills || {}).reduce((a, b) => a + b, 0);
  if (culturalTotal !== 100) {
    errors.push(`CULTURAL_POINTS: Expected 100, got ${culturalTotal}`);
  }

  // 6. Career skill points must total 100
  const careerTotal = Object.values(char.careerSkills || {}).reduce((a, b) => a + b, 0);
  if (careerTotal !== 100) {
    errors.push(`CAREER_POINTS: Expected 100, got ${careerTotal}`);
  }

  // 7. Must have at least one combat style
  if (!char.combatStyles || char.combatStyles.length === 0) {
    errors.push('NO_COMBAT_STYLE: Character has no combat style');
  }

  // 8. Combat style must have weapons
  if (char.combatStyles && char.combatStyles.length > 0) {
    for (const style of char.combatStyles) {
      if (!style.weapons || style.weapons.length === 0) {
        errors.push(`EMPTY_COMBAT_STYLE: "${style.name}" has no weapons`);
      }
    }
  }

  // 9. Must have folk magic spells (cultural)
  if (!char.folkMagicSpells || char.folkMagicSpells.length === 0) {
    errors.push('NO_FOLK_MAGIC: Character has no folk magic spells');
  }

  // 10. Must have armor
  if (!char.armor || char.armor.length === 0) {
    errors.push('NO_ARMOR: Character has no armor');
  }

  // 11. Must have weapons
  if (!char.weapons || char.weapons.length === 0) {
    errors.push('NO_WEAPONS: Character has no weapons');
  }

  // 12. Armor AP must not exceed culture technology cap
  const CULTURE_ARMOUR_CAPS = {
    'Primitive': 2, 'Barbarian': 4, 'Civilised': 6, 'Nomad': 4
  };
  if (char.armor && char.culture) {
    // We need culture type — infer from culture name
    const cultureTypeMap = {
      'Balazaring': 'Primitive', 'Telmori': 'Primitive',
      'Lunar Tarsh': 'Civilised', 'Old Tarsh': 'Barbarian',
      'Praxian': 'Nomad', 'Sartarite': 'Barbarian',
      'Esrolian': 'Civilised', 'Grazelander': 'Nomad'
    };
    const cType = cultureTypeMap[char.culture];
    const maxAP = CULTURE_ARMOUR_CAPS[cType];
    if (maxAP) {
      for (const armor of char.armor) {
        if (armor.ap > maxAP) {
          errors.push(`ARMOUR_EXCEEDS_CAP: "${armor.name}" AP ${armor.ap} > ${cType} max ${maxAP}`);
        }
      }
    }
  }

  // 13. Hit points must be populated
  if (!char.hitPoints || Object.keys(char.hitPoints).length === 0) {
    errors.push('NO_HIT_POINTS: Hit point locations not calculated');
  }

  // 14. Social class must be set
  if (!char.socialClass) {
    errors.push('NO_SOCIAL_CLASS: Social class not determined');
  }

  // 15. Must have rune affinities
  if (!char.runeAffinities || !char.runeAffinities.primary) {
    errors.push('NO_RUNES: Rune affinities not set');
  }

  // 16. Must have passions
  if (!char.passions || char.passions.length === 0) {
    errors.push('NO_PASSIONS: No passions assigned');
  }

  // 17. Weapons must have damage/size/reach stats populated
  if (char.weapons) {
    for (const w of char.weapons) {
      if (!w.damage && !w.size && !w.reach) {
        errors.push(`WEAPON_NO_STATS: "${w.name}" has no damage/size/reach`);
      }
    }
  }

  return errors;
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(2);
});
