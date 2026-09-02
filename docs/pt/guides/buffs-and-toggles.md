---
title: Buffs & Toggle Skills
---

# Buffs & Toggle Skills

## Buffs nomeados

Passe os **nomes exatos** do catálogo de buffs da UESP via `activeBuffs`:

```ts
const stats = calculateBuild({
  character: { /* ... */ },
  activeBuffs: ['Major Prophecy', 'Minor Slayer', 'Major Sorcery'],
});
```

### Descobrindo nomes de buffs

Nunca hardcode um nome de buff de memória — use a função de catálogo e filtre por grupo:

```ts
import { listAvailableBuffs } from 'uesp-eso-build-wrapper';

const majors = listAvailableBuffs('Major');
// [{ name: 'Major Prophecy', effects: [{ statId: 'SpellCrit', value: 2191, display: '' }], ... }]

const grupos = new Set(listAvailableBuffs().map((b) => b.group));
// "Major" | "Minor" | "Set" | "Target" | "Skill" | "Potion" | "Poison" | "Cyrodiil" | "Other"
```

Cada [BuffInfo](/api/interfaces/BuffInfo) informa o grupo do buff, o ícone e quais stats afeta — útil para renderizar seletores de buff na sua UI.

## Toggle skills

Toggle skills são a aba de toggles do UESP Build Editor (Emperor, ranks de Alliance War, toggles AvA, ...). Habilite-as pelo nome:

```ts
const stats = calculateBuild({
  character: { /* ... */ },
  toggleSkills: ['Emperor', 'Authority', 'Domination', 'Tactician'],
});
```

Duas ressalvas, expostas por [listAvailableToggleSkills()](/api/functions/listAvailableToggleSkills):

- Toggles com `requiresCyrodiil: true` só se aplicam quando `character.cyrodiil` também é `true`.
- Toggles com `isPassive: true` são respaldados por uma passiva e precisam dessa skill desbloqueada via `passiveSkills`/`skillBars` para o motor casar a descrição.

## Bônus de set com toggle (avançado)

Alguns efeitos de set são eles próprios toggleáveis no editor da UESP (ex.: o dano condicional de Ansuul's Torment). Estes usam chaves de regra exportadas pelo [`scripts/browser-export-build.js`](https://github.com/srtomy/uesp-eso-build-wrapper#validating-against-the-uesp-browser):

```ts
const stats = calculateBuild({
  character: { /* ... */ },
  toggledSetBonuses: ["Ansuul's Torment"],
});
```

::: warning
`activeBuffs`, `toggleSkills` e `toggledSetBonuses` aceitam apenas **nomes/chaves exatos**. Um typo silenciosamente não ativa nada. Construa suas listas de nomes a partir das funções de catálogo em vez de hardcodar.
:::
