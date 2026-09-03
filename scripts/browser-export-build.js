/**
 * UESP ESO Build Exporter — run in the Build Editor DevTools Console
 *
 * HOW TO USE:
 *   1. Open https://en.uesp.net/wiki/Special:EsoBuildEditor  (same URL as browser-extract.js)
 *   2. Configure your build (race, class, items, buffs, CP, etc.)
 *   3. Open DevTools (F12) → Console tab
 *   4. Paste the entire contents of this file and press Enter
 *   5. A "uesp-build-export.json" file will be downloaded automatically
 *   6. Use it with: npm run test:build path/to/uesp-build-export.json
 */
(function exportUespBuild() {
  var rulesVersion = $('#esotbRulesVersion').val() || 'Live';

  var build = {
    _meta: {
      rulesVersion: rulesVersion,
      exportedAt: new Date().toISOString(),
    },
    character: {
      race:  $('#esotbRace').val(),
      class: $('#esotbClass').val(),
      level: parseInt($('#esotbLevel').val()) || 50,
      attributes: {
        health:  parseInt($('#esotbAttrHea').val()) || 0,
        magicka: parseInt($('#esotbAttrMag').val()) || 0,
        stamina: parseInt($('#esotbAttrSta').val()) || 0,
      },
    },
    items: {},
    activeBuffs: [],
    toggleSkills: [],
    championPointNodes: {},
  };

  // optional character fields
  var mundus = $('#esotbMundus').val();
  if (mundus) build.character.mundusStone = mundus;

  var mundus2 = $('#esotbMundus2').val();
  if (mundus2) build.character.mundusStone2 = mundus2;

  var vampire = parseInt($('#esotbVampireStage').val()) || 0;
  if (vampire > 0) build.character.vampireStage = vampire;

  var werewolf = parseInt($('#esotbWerewolfStage').val()) || 0;
  if (werewolf > 0) build.character.werewolfStage = werewolf;

  var cp = parseInt($('#esotbCPTotalPoints').val()) || 0;
  if (cp > 0) build.character.championPoints = cp;

  // equipped items by slot (Head, Chest, MainHand1, Food, etc.)
  if (typeof g_EsoBuildItemData !== 'undefined') {
    Object.keys(g_EsoBuildItemData).forEach(function (slot) {
      var item = g_EsoBuildItemData[slot];
      if (item && item.itemId) build.items[slot] = item;
    });
  }

  // custom enchants: g_EsoBuildItemData holds the default DB enchant;
  // g_EsoBuildEnchantData holds the glyph the user explicitly selected in the editor.
  // Exported separately so the calculator can populate g_EsoBuildEnchantData
  // correctly (isDefaultEnchant=false), applying the 0.4044 factor for small slots.
  if (typeof g_EsoBuildEnchantData !== 'undefined') {
    build.enchantOverrides = {};
    Object.keys(g_EsoBuildEnchantData).forEach(function (slot) {
      var enchant = g_EsoBuildEnchantData[slot];
      if (!enchant || !build.items[slot]) return;
      var hasCustom = !$.isEmptyObject(enchant) && enchant.isDefaultEnchant !== true && enchant.enchantDesc;
      if (hasCustom) {
        build.enchantOverrides[slot] = { enchantDesc: enchant.enchantDesc, enchantName: enchant.enchantName || '' };
      }
    });
    if (Object.keys(build.enchantOverrides).length === 0) delete build.enchantOverrides;
  }

  // active buffs (e.g. "Minor Slayer", "Major Prophecy")
  if (typeof g_EsoBuildBuffData !== 'undefined') {
    Object.keys(g_EsoBuildBuffData).forEach(function (name) {
      if (g_EsoBuildBuffData[name] && g_EsoBuildBuffData[name].enabled)
        build.activeBuffs.push(name);
    });
  }

  // skill bars (needed for passives that scale with slotted skills,
  // e.g. Magicka Controller, Expert Mage, Penetrating Magic, Inner Light, etc.)
  // Ensures g_EsoSkillBarData is up to date from the DOM before reading.
  if (typeof UpdateEsoSkillBarData !== 'undefined') {
    try { UpdateEsoSkillBarData(); } catch(e) {}
  }
  if (typeof g_EsoSkillBarData !== 'undefined') {
    var mapBar = function (bar) {
      if (!bar) return [];
      return bar
        .filter(function (slot) { return slot && slot.origSkillId && parseInt(slot.origSkillId) > 0; })
        .map(function (slot) {
          // skillId = origSkillId (base key, used as index into g_EsoSkillActiveData)
          // morphSkillId = current morph skillId (used in GetEsoSkillDescription for the correct desc)
          var origId = parseInt(slot.origSkillId);
          var morphId = slot.skillId ? parseInt(slot.skillId) : origId;
          var s = { skillId: origId };
          if (morphId && morphId !== origId) s.morphSkillId = morphId;
          if (slot.morphIndex != null) s.morphIndex = slot.morphIndex;
          return s;
        });
    };
    var bar1 = mapBar(g_EsoSkillBarData[0]);
    var bar2 = mapBar(g_EsoSkillBarData[1]);
    if (bar1.length > 0 || bar2.length > 0) {
      build.skillBars = {};
      if (bar1.length > 0) build.skillBars.bar1 = bar1;
      if (bar2.length > 0) build.skillBars.bar2 = bar2;
    }
    // active bar (1 or 2)
    if (typeof g_EsoBuildActiveAbilityBar !== 'undefined' && g_EsoBuildActiveAbilityBar > 0)
      build.activeWeaponBar = g_EsoBuildActiveAbilityBar;
  }

  // active passives (racial, class, etc.) — g_EsoSkillPassiveData[key].abilityId
  if (typeof g_EsoSkillPassiveData !== 'undefined') {
    var passiveIds = [];
    Object.keys(g_EsoSkillPassiveData).forEach(function (key) {
      var skill = g_EsoSkillPassiveData[key];
      if (skill && skill.abilityId) passiveIds.push(parseInt(skill.abilityId));
    });
    if (passiveIds.length > 0) build.passiveSkills = passiveIds;
  }

  // if "Auto Purchase Racial Passives" is checked, set autoPassives too
  if ($('#esotbEnableRaceAutoPurchase').prop('checked')) build.autoPassives = true;

  // active toggle skills (e.g. "War Horn", "Emperor")
  if (typeof g_EsoBuildToggledSkillData !== 'undefined') {
    Object.keys(g_EsoBuildToggledSkillData).forEach(function (name) {
      if (g_EsoBuildToggledSkillData[name] && g_EsoBuildToggledSkillData[name].enabled)
        build.toggleSkills.push(name);
    });
  }

  // toggle set bonuses enabled by the user in the editor
  // (e.g. Ansuul's Torment +7% DamageDone = 41316, Merciless Charge +20% = 41089)
  if (typeof g_EsoBuildToggledSetData !== 'undefined') {
    var toggledSetBonuses = [];
    Object.keys(g_EsoBuildToggledSetData).forEach(function (id) {
      var t = g_EsoBuildToggledSetData[id];
      if (t && t.valid && t.enabled) toggledSetBonuses.push(id);
    });
    if (toggledSetBonuses.length > 0) build.toggledSetBonuses = toggledSetBonuses;
  }

  // CP nodes with allocated points
  if (typeof g_EsoCpData !== 'undefined') {
    Object.keys(g_EsoCpData).forEach(function (nodeId) {
      var node = g_EsoCpData[nodeId];
      if (node && node.points > 0)
        build.championPointNodes[nodeId] = { points: node.points };
    });
  }

  // stats calculated by UESP — exported for comparison with the wrapper
  // Captures g_EsoComputedStats[statId].value for all non-zero stats.
  if (typeof g_EsoComputedStats !== 'undefined') {
    var expected = {};
    Object.keys(g_EsoComputedStats).forEach(function (statId) {
      var s = g_EsoComputedStats[statId];
      if (s && typeof s.value === 'number' && s.value !== 0) {
        expected[statId] = s.value;
      }
    });
    if (Object.keys(expected).length > 0) build.expectedStats = expected;
  }

  // JSON download
  var json = JSON.stringify(build, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'uesp-build-export.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  var barCount = (build.skillBars ? ((build.skillBars.bar1 || []).length + (build.skillBars.bar2 || []).length) : 0);
  console.log('[UESP Export] Build exported successfully!');
  console.log('  Rules: ' + rulesVersion);
  console.log('  Race/Class: ' + build.character.race + ' ' + build.character.class);
  console.log('  Slots with item: ' + Object.keys(build.items).length);
  console.log('  Passives: ' + (build.passiveSkills ? build.passiveSkills.length : 0));
  console.log('  Skill bars: ' + barCount + ' skills');
  console.log('  Active buffs: ' + build.activeBuffs.length);
  console.log('  Toggle skills: ' + build.toggleSkills.length);
  console.log('  CP nodes: ' + Object.keys(build.championPointNodes).length);
  console.log('  Now run: npm run test:build uesp-build-export.json');
})();
