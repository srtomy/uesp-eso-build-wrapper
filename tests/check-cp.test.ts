import { describe, it } from 'vitest';
import { setupNodeEnvironment } from '../src/lib/eso-engine/env-setup';
setupNodeEnvironment();
require('../vendor/uesp-esochardata/resources/esoEditBuild.js');

describe('CP data check', () => {
  it('checks g_EsoCpData', () => {
    const cpData = (global as any).g_EsoCpData;
    const rules = (global as any).g_EsoBuildRules;
    console.log('rules keys:', Object.keys(rules || {}));
    console.log('cpData count:', Object.keys(cpData || {}).length);
    const ids = ['141744', '141899', '142034', '142035'];
    for (const id of ids) {
      const n = cpData[id];
      if (n) console.log(id, n.name, '|', (n.description||'').substring(0,100));
      else console.log(id, 'NOT FOUND');
    }
  });
});
