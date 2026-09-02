---
title: Skills & Passivas
---

# Skills & Passivas

## Barras de skill

Skills slotados importam mesmo que esta biblioteca calcule stats, não rotações de dano: o motor usa a barra ativa para decidir **efeitos condicionais** — passivas de skill line (ex.: passivas de Destruction Staff só se aplicam com uma skill de staff na barra) e bônus de set condicionais.

```ts
const stats = calculateBuild({
  character: { /* ... */ },
  skillBars: {
    bar1: [
      { skillId: 28807, morphIndex: 2 }, // Crystal Fragments (segundo morph)
      { skillId: 24322 },                // Mages' Fury (sem morph)
    ],
    bar2: [
      { skillId: 29073, morphIndex: 1 }, // Boundless Storm (primeiro morph)
    ],
  },
  activeWeaponBar: 1, // padrão — qual barra está ativa
});
```

Cada [SkillSlot](/api/interfaces/SkillSlot) aceita:

| Campo | Descrição |
| --- | --- |
| `skillId` | ID do skill base (sem morph) — chave de lookup do motor. |
| `morphSkillId` | Ability ID opcional do morph equipado; usado para resolver o texto correto da descrição. |
| `morphIndex` | `0` base (padrão), `1` primeiro morph, `2` segundo morph. |

Até 6 skills por barra. `activeWeaponBar` também seleciona quais itens de arma (`MainHand1/OffHand1` vs `MainHand2/OffHand2`) contam para encantamentos e bônus de set.

## Passivas

Passivas são desbloqueadas por **ability ID**. As funções de catálogo dão os IDs — cada passiva aparece uma vez por rank, então escolha o rank desejado (normalmente o último):

```ts
import {
  listRacialPassives,      // passivas de raça, ex.: listRacialPassives('High Elf')
  listClassPassives,       // passivas de classe (3 skill lines)
  listPassivesBySkillLine, // qualquer linha: 'Heavy Armor', 'Undaunted', 'Destruction Staff', ...
  listAvailableSkillLines, // todos os nomes válidos de skill line
} from 'uesp-eso-build-wrapper';

const idsPassivas = [
  ...listRacialPassives('High Elf'),
  ...listClassPassives('Sorcerer'),
  ...listPassivesBySkillLine('Light Armor'),
  ...listPassivesBySkillLine('Undaunted'),
].map((p) => p.abilityId);

const stats = calculateBuild({
  character: { /* ... */ },
  passiveSkills: idsPassivas,
});
```

O efeito de cada passiva é aplicado pelo motor casando o texto da descrição — o mesmo mecanismo que o editor da UESP usa.

## Passivas de raça automáticas

`autoPassives: true` espelha o checkbox "Auto Purchase Racial Passives" da UESP: injeta automaticamente as **passivas de rank máximo da raça selecionada**.

```ts
const stats = calculateBuild({
  character: { race: 'High Elf', /* ... */ },
  autoPassives: true,
});
```

Cobre apenas passivas **de raça** — passivas de classe e de skill line devem ser passadas explicitamente via `passiveSkills`.
