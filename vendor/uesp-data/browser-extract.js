/**
 * EXTRAÇÃO DE DADOS DO MOTOR DA UESP
 * ====================================
 * Execute este script no DevTools Console do browser enquanto estiver na página:
 *   https://en.uesp.net/wiki/Special:EsoBuildEditor
 *
 * IMPORTANTE: Use a MESMA URL que o browser-export-build.js para garantir que os dados
 * de g_SkillsData e g_EsoBuildRules sejam da mesma versão do motor. URLs diferentes
 * (ex: esobuilds.uesp.net vs Special:EsoBuildEditor) podem ter versões distintas dos
 * dados, causando divergências nos cálculos (ex: BashDamage diferente do esperado).
 *
 * PASSO A PASSO:
 *   1. Abra https://en.uesp.net/wiki/Special:EsoBuildEditor no Chrome/Firefox
 *   2. Aguarde a página carregar completamente
 *   3. Pressione F12 → aba "Console"
 *   4. Cole TODO o conteúdo deste arquivo e pressione Enter
 *   5. Um arquivo "uesp-init-data.json" será baixado automaticamente
 *   6. Mova o arquivo para: vendor/uesp-data/uesp-init-data.json
 *
 * QUANDO RE-EXTRAIR:
 *   - Quando a ZeniMax lançar um novo patch ou DLC
 *   - Quando cálculos ficarem incorretos após atualização do jogo
 *   - Ao fazer sync/merge do fork com o repositório upstream da UESP
 */

(function extractUespData() {
  var missing = [];

  if (!window.g_EsoComputedStats || Object.keys(window.g_EsoComputedStats).length === 0) {
    missing.push('g_EsoComputedStats');
  }
  if (!window.g_EsoInputStats || Object.keys(window.g_EsoInputStats).length === 0) {
    missing.push('g_EsoInputStats');
  }
  if (!window.g_EsoCpSkills || Object.keys(window.g_EsoCpSkills).length === 0) {
    missing.push('g_EsoCpSkills (nomes dos nodes CP)');
  }
  if (!window.g_EsoCpSkillDesc || Object.keys(window.g_EsoCpSkillDesc).length === 0) {
    missing.push('g_EsoCpSkillDesc (descrições dos nodes CP)');
  }

  if (missing.length > 0) {
    console.error('[eso-extract] Variáveis não encontradas: ' + missing.join(', '));
    console.error('Certifique-se de que a página carregou completamente antes de executar.');
    return;
  }

  var skillsData = window.g_SkillsData || {};
  var skillCount = Object.keys(skillsData).length;
  if (skillCount === 0) {
    console.warn('[eso-extract] g_SkillsData está vazio — skill passivos/ativos não serão calculados.');
    console.warn('[eso-extract] Aguarde a página carregar completamente (incluindo dados AJAX de skills).');
  } else {
    console.log('[eso-extract] Capturando ' + skillCount + ' skills de g_SkillsData...');
  }

  var data = {
    extractedAt:     new Date().toISOString(),
    pageUrl:         window.location.href,
    computedStats:   window.g_EsoComputedStats,
    inputStats:      window.g_EsoInputStats,
    buffData:        window.g_EsoInitialBuffData  || {},
    cpData:          window.g_EsoInitialCpData    || {},
    buildRules:      window.g_EsoBuildRules        || {},
    cpSkillsData:    window.g_EsoCpSkills          || {},
    cpSkillDescData: window.g_EsoCpSkillDesc      || {},
    skillsData:      skillsData,
  };

  var statCount = Object.keys(data.computedStats).length;
  console.log('[eso-extract] Extraindo ' + statCount + ' fórmulas de g_EsoComputedStats...');

  // Serializa para JSON e baixa como arquivo
  var json = JSON.stringify(data, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = 'uesp-init-data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log('[eso-extract] Download iniciado: uesp-init-data.json');
  console.log('[eso-extract] Mova o arquivo para: vendor/uesp-data/uesp-init-data.json');
})();
