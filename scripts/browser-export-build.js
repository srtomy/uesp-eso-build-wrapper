/**
 * UESP ESO Build Exporter — rode no DevTools Console do Build Editor
 *
 * COMO USAR:
 *   1. Abra https://en.uesp.net/wiki/Special:EsoBuildEditor  (mesma URL do browser-extract.js)
 *   2. Configure o seu build (raça, classe, itens, buffs, CP, etc.)
 *   3. Abra DevTools (F12) → aba Console
 *   4. Cole todo o conteúdo deste arquivo e pressione Enter
 *   5. Um arquivo "uesp-build-export.json" será baixado automaticamente
 *   6. Use-o com: npm run test:build caminho/para/uesp-build-export.json
 */
(function exportUespBuild() {
  var build = {
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

  // campos opcionais do personagem
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

  // itens equipados por slot (Head, Chest, MainHand1, Food, etc.)
  if (typeof g_EsoBuildItemData !== 'undefined') {
    Object.keys(g_EsoBuildItemData).forEach(function (slot) {
      var item = g_EsoBuildItemData[slot];
      if (item && item.itemId) build.items[slot] = item;
    });
  }

  // encantamentos customizados: g_EsoBuildItemData tem o enchant padrão do banco de dados;
  // g_EsoBuildEnchantData tem o glyph que o usuário selecionou explicitamente no editor.
  // Exportamos separado para que o calculator possa popular g_EsoBuildEnchantData
  // corretamente (isDefaultEnchant=false), aplicando o fator 0.4044 para slots pequenos.
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

  // buffs ativos (ex: "Minor Slayer", "Major Prophecy")
  if (typeof g_EsoBuildBuffData !== 'undefined') {
    Object.keys(g_EsoBuildBuffData).forEach(function (name) {
      if (g_EsoBuildBuffData[name] && g_EsoBuildBuffData[name].enabled)
        build.activeBuffs.push(name);
    });
  }

  // barras de skills (necessário para passivos que escalam com skills na barra,
  // ex: Magicka Controller, Expert Mage, Penetrating Magic, Inner Light, etc.)
  // Garante que g_EsoSkillBarData esteja atualizado a partir do DOM antes de ler.
  if (typeof UpdateEsoSkillBarData !== 'undefined') {
    try { UpdateEsoSkillBarData(); } catch(e) {}
  }
  if (typeof g_EsoSkillBarData !== 'undefined') {
    var mapBar = function (bar) {
      if (!bar) return [];
      return bar
        .filter(function (slot) { return slot && slot.origSkillId && parseInt(slot.origSkillId) > 0; })
        .map(function (slot) {
          // skillId = origSkillId (chave base, usada como índice em g_EsoSkillActiveData)
          // morphSkillId = skillId do morph atual (usado em GetEsoSkillDescription para a desc correta)
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
    // barra ativa (1 ou 2)
    if (typeof g_EsoBuildActiveAbilityBar !== 'undefined' && g_EsoBuildActiveAbilityBar > 0)
      build.activeWeaponBar = g_EsoBuildActiveAbilityBar;
  }

  // passivas ativas (raciais, de classe, etc.) — g_EsoSkillPassiveData[key].abilityId
  if (typeof g_EsoSkillPassiveData !== 'undefined') {
    var passiveIds = [];
    Object.keys(g_EsoSkillPassiveData).forEach(function (key) {
      var skill = g_EsoSkillPassiveData[key];
      if (skill && skill.abilityId) passiveIds.push(parseInt(skill.abilityId));
    });
    if (passiveIds.length > 0) build.passiveSkills = passiveIds;
  }

  // se "Auto Purchase Racial Passives" estiver marcado, seta autoPassives também
  if ($('#esotbEnableRaceAutoPurchase').prop('checked')) build.autoPassives = true;

  // toggle skills ativas (ex: "War Horn", "Emperor")
  if (typeof g_EsoBuildToggledSkillData !== 'undefined') {
    Object.keys(g_EsoBuildToggledSkillData).forEach(function (name) {
      if (g_EsoBuildToggledSkillData[name] && g_EsoBuildToggledSkillData[name].enabled)
        build.toggleSkills.push(name);
    });
  }

  // CP nodes com pontos alocados
  if (typeof g_EsoCpData !== 'undefined') {
    Object.keys(g_EsoCpData).forEach(function (nodeId) {
      var node = g_EsoCpData[nodeId];
      if (node && node.points > 0)
        build.championPointNodes[nodeId] = { points: node.points };
    });
  }

  // stats calculados pelo UESP — exportados para comparação com o wrapper
  // Captura g_EsoComputedStats[statId].value de todos os stats não-zero.
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

  // download do JSON
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
  console.log('[UESP Export] Build exportado com sucesso!');
  console.log('  Raça/Classe: ' + build.character.race + ' ' + build.character.class);
  console.log('  Slots com item: ' + Object.keys(build.items).length);
  console.log('  Passivas: ' + (build.passiveSkills ? build.passiveSkills.length : 0));
  console.log('  Barras de skill: ' + barCount + ' skills');
  console.log('  Buffs ativos: ' + build.activeBuffs.length);
  console.log('  Toggle skills: ' + build.toggleSkills.length);
  console.log('  CP nodes: ' + Object.keys(build.championPointNodes).length);
  console.log('  Agora rode: npm run test:build uesp-build-export.json');
})();
