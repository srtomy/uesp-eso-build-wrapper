// ==UserScript==
// @name         UESP ESO Build Exporter
// @namespace    https://en.uesp.net/
// @version      1.1.0
// @description  Adiciona botão de exportação no ESO Build Editor — sem precisar de DevTools (F12)
// @author       Tarcisio Scotta
// @match        https://en.uesp.net/wiki/Special:EsoBuildEditor*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ─── aguarda o motor UESP carregar ─────────────────────────────────────────

  function waitForEngine(callback) {
    var attempts = 0;
    var interval = setInterval(function () {
      attempts++;
      var ready =
        typeof window.g_EsoComputedStats !== 'undefined' &&
        typeof window.g_EsoBuildItemData !== 'undefined' &&
        Object.keys(window.g_EsoComputedStats || {}).length > 0;

      if (ready) {
        clearInterval(interval);
        callback();
      } else if (attempts >= 60) {
        clearInterval(interval);
        console.warn('[UESP Export] Motor não carregou em 30s — adicionando botão mesmo assim');
        callback();
      }
    }, 500);
  }

  // ─── botão flutuante ────────────────────────────────────────────────────────

  function createButton() {
    var btn = document.createElement('button');
    btn.id = 'uesp-export-btn';
    btn.textContent = '📤 Export JSON';
    btn.title = 'Exportar build atual para uesp-build-export.json\n(para comparar com o engine local)';

    var baseStyle = [
      'position:fixed',
      'bottom:20px',
      'right:20px',
      'z-index:99999',
      'background:#1565C0',
      'color:#fff',
      'border:none',
      'border-radius:8px',
      'padding:10px 18px',
      'font-size:14px',
      'font-weight:600',
      'cursor:pointer',
      'box-shadow:0 3px 10px rgba(0,0,0,0.35)',
      'font-family:sans-serif',
      'transition:background .15s',
      'letter-spacing:.3px',
    ].join(';');

    btn.setAttribute('style', baseStyle);
    btn.addEventListener('mouseenter', function () { btn.style.background = '#0D47A1'; });
    btn.addEventListener('mouseleave', function () { btn.style.background = '#1565C0'; });
    btn.addEventListener('mousedown',  function () { btn.style.background = '#0A3580'; });
    btn.addEventListener('mouseup',    function () { btn.style.background = '#0D47A1'; });

    btn.addEventListener('click', function () {
      btn.disabled = true;
      btn.textContent = '⏳ Exportando…';
      try {
        exportBuild();
        btn.textContent = '✅ Exportado!';
      } catch (e) {
        btn.textContent = '❌ Erro — veja Console';
        console.error('[UESP Export] Erro ao exportar:', e);
      }
      setTimeout(function () {
        btn.disabled = false;
        btn.textContent = '📤 Export JSON';
      }, 2500);
    });

    document.body.appendChild(btn);
    console.log('[UESP Export] Botão adicionado. Clique em "📤 Export JSON" para exportar.');
  }

  // ─── lógica de exportação (idêntica ao browser-export-build.js) ─────────────

  function exportBuild() {
    var build = {
      character: {
        race:  String($('#esotbRace').val() || ''),
        class: String($('#esotbClass').val() || ''),
        level: parseInt(String($('#esotbLevel').val())) || 50,
        attributes: {
          health:  parseInt(String($('#esotbAttrHea').val())) || 0,
          magicka: parseInt(String($('#esotbAttrMag').val())) || 0,
          stamina: parseInt(String($('#esotbAttrSta').val())) || 0,
        },
      },
      items: {},
      activeBuffs: [],
      toggleSkills: [],
      championPointNodes: {},
    };

    // campos opcionais do personagem
    var mundus = String($('#esotbMundus').val() || '');
    if (mundus) build.character.mundusStone = mundus;

    var mundus2 = String($('#esotbMundus2').val() || '');
    if (mundus2) build.character.mundusStone2 = mundus2;

    var vampire = parseInt(String($('#esotbVampireStage').val())) || 0;
    if (vampire > 0) build.character.vampireStage = vampire;

    var werewolf = parseInt(String($('#esotbWerewolfStage').val())) || 0;
    if (werewolf > 0) build.character.werewolfStage = werewolf;

    var cp = parseInt(String($('#esotbCPTotalPoints').val())) || 0;
    if (cp > 0) build.character.championPoints = cp;

    // itens por slot
    if (typeof window.g_EsoBuildItemData !== 'undefined') {
      Object.keys(window.g_EsoBuildItemData).forEach(function (slot) {
        var item = window.g_EsoBuildItemData[slot];
        if (item && item.itemId) build.items[slot] = item;
      });
    }

    // enchant overrides (glyphs selecionados explicitamente no editor)
    if (typeof window.g_EsoBuildEnchantData !== 'undefined') {
      build.enchantOverrides = {};
      Object.keys(window.g_EsoBuildEnchantData).forEach(function (slot) {
        var enchant = window.g_EsoBuildEnchantData[slot];
        if (!enchant || !build.items[slot]) return;
        var hasCustom = !$.isEmptyObject(enchant) && enchant.isDefaultEnchant !== true && enchant.enchantDesc;
        if (hasCustom) {
          build.enchantOverrides[slot] = {
            enchantDesc: enchant.enchantDesc,
            enchantName: enchant.enchantName || '',
          };
        }
      });
      if (Object.keys(build.enchantOverrides).length === 0) delete build.enchantOverrides;
    }

    // buffs ativos
    if (typeof window.g_EsoBuildBuffData !== 'undefined') {
      Object.keys(window.g_EsoBuildBuffData).forEach(function (name) {
        if (window.g_EsoBuildBuffData[name] && window.g_EsoBuildBuffData[name].enabled)
          build.activeBuffs.push(name);
      });
    }

    // barras de skills
    if (typeof window.UpdateEsoSkillBarData !== 'undefined') {
      try { window.UpdateEsoSkillBarData(); } catch (e) {}
    }
    if (typeof window.g_EsoSkillBarData !== 'undefined') {
      var mapBar = function (bar) {
        if (!bar) return [];
        return bar
          .filter(function (slot) { return slot && slot.origSkillId && parseInt(slot.origSkillId) > 0; })
          .map(function (slot) {
            var origId  = parseInt(slot.origSkillId);
            var morphId = slot.skillId ? parseInt(slot.skillId) : origId;
            var s = { skillId: origId };
            if (morphId && morphId !== origId) s.morphSkillId = morphId;
            if (slot.morphIndex != null) s.morphIndex = slot.morphIndex;
            return s;
          });
      };
      var bar1 = mapBar(window.g_EsoSkillBarData[0]);
      var bar2 = mapBar(window.g_EsoSkillBarData[1]);
      if (bar1.length > 0 || bar2.length > 0) {
        build.skillBars = {};
        if (bar1.length > 0) build.skillBars.bar1 = bar1;
        if (bar2.length > 0) build.skillBars.bar2 = bar2;
      }
      if (typeof window.g_EsoBuildActiveAbilityBar !== 'undefined' && window.g_EsoBuildActiveAbilityBar > 0)
        build.activeWeaponBar = window.g_EsoBuildActiveAbilityBar;
    }

    // passivas ativas
    if (typeof window.g_EsoSkillPassiveData !== 'undefined') {
      var passiveIds = [];
      Object.keys(window.g_EsoSkillPassiveData).forEach(function (key) {
        var skill = window.g_EsoSkillPassiveData[key];
        if (skill && skill.abilityId) passiveIds.push(parseInt(skill.abilityId));
      });
      if (passiveIds.length > 0) build.passiveSkills = passiveIds;
    }

    // auto racial passives
    if ($('#esotbEnableRaceAutoPurchase').prop('checked')) build.autoPassives = true;

    // toggle skills ativas
    if (typeof window.g_EsoBuildToggledSkillData !== 'undefined') {
      Object.keys(window.g_EsoBuildToggledSkillData).forEach(function (name) {
        if (window.g_EsoBuildToggledSkillData[name] && window.g_EsoBuildToggledSkillData[name].enabled)
          build.toggleSkills.push(name);
      });
    }

    // CP nodes alocados
    if (typeof window.g_EsoCpData !== 'undefined') {
      Object.keys(window.g_EsoCpData).forEach(function (nodeId) {
        var node = window.g_EsoCpData[nodeId];
        if (node && node.points > 0)
          build.championPointNodes[nodeId] = { points: node.points };
      });
    }

    // expectedStats — stats calculados pelo UESP para comparação
    if (typeof window.g_EsoComputedStats !== 'undefined') {
      var expected = {};
      Object.keys(window.g_EsoComputedStats).forEach(function (statId) {
        var s = window.g_EsoComputedStats[statId];
        if (s && typeof s.value === 'number' && s.value !== 0)
          expected[statId] = s.value;
      });
      if (Object.keys(expected).length > 0) build.expectedStats = expected;
    }

    // download
    downloadJSON(build, 'uesp-build-export.json');

    var barCount = build.skillBars
      ? ((build.skillBars.bar1 || []).length + (build.skillBars.bar2 || []).length)
      : 0;

    console.log('[UESP Export] ✅ Build exportado!');
    console.log('  Raça/Classe : ' + build.character.race + ' ' + build.character.class);
    console.log('  Itens       : ' + Object.keys(build.items).length + ' slots');
    console.log('  Passivas    : ' + (build.passiveSkills ? build.passiveSkills.length : 0));
    console.log('  Skills      : ' + barCount);
    console.log('  Buffs       : ' + build.activeBuffs.length);
    console.log('  Toggles     : ' + build.toggleSkills.length);
    console.log('  CP nodes    : ' + Object.keys(build.championPointNodes).length);
    console.log('  → Agora rode: npm run test:build ~/Downloads/uesp-build-export.json');
  }

  function downloadJSON(obj, filename) {
    var json = JSON.stringify(obj, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ─── inicialização ──────────────────────────────────────────────────────────

  waitForEngine(createButton);
})();
