import { defineConfig } from 'vitepress';

// Deployed to GitHub Pages under the repository subpath.
export const BASE = '/uesp-eso-build-wrapper/';

// Internal maintainer docs (dev docs, private md-vault symlinks) are not
// published pages — keep them out of the docs site build.
const srcExclude = [
  '**/ENGINE-QUIRKS.md',
  '**/OSS-RECOMMENDATIONS.md',
  '**/CI-PIPELINE.md',
  '**/reference.md',
  '**/research/**',
];

interface NavSidebar {
  nav: any[];
  sidebar: any[];
}

function englishTheme(): NavSidebar {
  return {
    nav: [
      { text: 'Introduction', link: '/' },
      { text: 'Getting Started', link: '/getting-started' },
      { text: 'Guides', link: '/guides/character' },
      { text: 'API', link: '/api/' },
    ],
    sidebar: [
      { text: 'Introduction', link: '/' },
      { text: 'Architecture', link: '/architecture' },
      { text: 'Getting Started', link: '/getting-started' },
      {
        text: 'Guides',
        collapsed: false,
        items: [
          { text: 'Character', link: '/guides/character' },
          { text: 'Items & Equipment', link: '/guides/items' },
          { text: 'Champion Points', link: '/guides/champion-points' },
          { text: 'Buffs & Toggle Skills', link: '/guides/buffs-and-toggles' },
          { text: 'Skills & Passives', link: '/guides/skills' },
        ],
      },
      { text: 'Reading the Output', link: '/output' },
      { text: 'Troubleshooting', link: '/troubleshooting' },
      { text: 'Contributing', link: '/contributing' },
      {
        text: 'API Reference',
        collapsed: true,
        items: [
          { text: 'Overview', link: '/api/' },
          {
            text: 'Functions',
            collapsed: true,
            items: [
              { text: 'initEsoEngineFromData', link: '/api/functions/initEsoEngineFromData' },
              { text: 'calculateBuild', link: '/api/functions/calculateBuild' },
              { text: 'debugBuild', link: '/api/functions/debugBuild' },
              { text: 'listAvailableBuffs', link: '/api/functions/listAvailableBuffs' },
              { text: 'listRacialPassives', link: '/api/functions/listRacialPassives' },
              { text: 'listClassPassives', link: '/api/functions/listClassPassives' },
              { text: 'listPassivesBySkillLine', link: '/api/functions/listPassivesBySkillLine' },
              { text: 'listAvailableSkillLines', link: '/api/functions/listAvailableSkillLines' },
              {
                text: 'listAvailableToggleSkills',
                link: '/api/functions/listAvailableToggleSkills',
              },
            ],
          },
          {
            text: 'Core Interfaces',
            collapsed: false,
            items: [
              { text: 'BuildInput', link: '/api/interfaces/BuildInput' },
              { text: 'ComputedStats', link: '/api/interfaces/ComputedStats' },
              { text: 'UespInitData', link: '/api/interfaces/UespInitData' },
              { text: 'UespItemApiData', link: '/api/interfaces/UespItemApiData' },
              { text: 'ChampionPointNode', link: '/api/interfaces/ChampionPointNode' },
              { text: 'SkillSlot', link: '/api/interfaces/SkillSlot' },
            ],
          },
          {
            text: 'Catalog Interfaces',
            collapsed: true,
            items: [
              { text: 'BuffInfo', link: '/api/interfaces/BuffInfo' },
              { text: 'BuffEffect', link: '/api/interfaces/BuffEffect' },
              { text: 'PassiveSkillInfo', link: '/api/interfaces/PassiveSkillInfo' },
              { text: 'ToggleSkillInfo', link: '/api/interfaces/ToggleSkillInfo' },
              { text: 'BuildDebugInfo', link: '/api/interfaces/BuildDebugInfo' },
            ],
          },
          {
            text: 'Type Aliases',
            collapsed: true,
            items: [
              { text: 'EquipSlot', link: '/api/type-aliases/EquipSlot' },
              { text: 'BuffGroup', link: '/api/type-aliases/BuffGroup' },
            ],
          },
        ],
      },
    ],
  };
}

function portugueseTheme(): NavSidebar {
  return {
    nav: [
      { text: 'Introdução', link: '/pt/' },
      { text: 'Primeiros Passos', link: '/pt/getting-started' },
      { text: 'Guias', link: '/pt/guides/character' },
      { text: 'API', link: '/api/' },
    ],
    sidebar: [
      { text: 'Introdução', link: '/pt/' },
      { text: 'Arquitetura', link: '/pt/architecture' },
      { text: 'Primeiros Passos', link: '/pt/getting-started' },
      {
        text: 'Guias',
        collapsed: false,
        items: [
          { text: 'Personagem', link: '/pt/guides/character' },
          { text: 'Itens & Equipamentos', link: '/pt/guides/items' },
          { text: 'Champion Points', link: '/pt/guides/champion-points' },
          { text: 'Buffs & Toggle Skills', link: '/pt/guides/buffs-and-toggles' },
          { text: 'Skills & Passivas', link: '/pt/guides/skills' },
        ],
      },
      { text: 'Lendo o Resultado', link: '/pt/output' },
      { text: 'Solução de Problemas', link: '/pt/troubleshooting' },
      { text: 'Contribuindo', link: '/pt/contributing' },
      { text: 'API Reference (EN)', link: '/api/' },
    ],
  };
}

export default defineConfig({
  base: BASE,
  lang: 'en-US',
  title: 'uesp-eso-build-wrapper',
  description:
    'Calculate Elder Scrolls Online character stats with UESP Build Editor formulas — from Node.js, with zero formula reimplementation.',
  srcExclude,
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${BASE}favicon.svg` }],
    ['meta', { property: 'og:title', content: 'uesp-eso-build-wrapper docs' }],
    [
      'meta',
      {
        property: 'og:description',
        content: 'Node.js wrapper around the UESP ESO Build Editor math engine.',
      },
    ],
  ],
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      themeConfig: englishTheme(),
    },
    pt: {
      label: 'Português (BR)',
      lang: 'pt-BR',
      themeConfig: portugueseTheme(),
    },
  },
  themeConfig: {
    siteTitle: 'uesp-eso-build-wrapper',
    socialLinks: [{ icon: 'github', link: 'https://github.com/srtomy/uesp-eso-build-wrapper' }],
    search: { provider: 'local' },
    outline: { level: [2, 3], label: 'On this page' },
    editLink: {
      pattern: 'https://github.com/srtomy/uesp-eso-build-wrapper/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
    footer: {
      message:
        'Elder Scrolls Online is a trademark of ZeniMax Media Inc. This project is not affiliated with or endorsed by ZeniMax Media Inc.',
      copyright: 'MIT © srtomy',
    },
  },
});
