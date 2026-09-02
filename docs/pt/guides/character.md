---
title: Personagem
---

# Input do personagem

`BuildInput.character` é o único input obrigatório. Ele descreve a ficha do personagem como seria configurada no UESP Build Editor.

```ts
const stats = calculateBuild({
  character: {
    race: 'Nord',
    class: 'Dragonknight',
    level: 50,
    attributes: { health: 64, magicka: 0, stamina: 0 },
    mundusStone: 'The Thief',
    championPoints: 160,
    rulesVersion: 'Live',
  },
});
```

## Campos

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `race` | `string` | Nome da raça, ex.: `"High Elf"`, `"Nord"`, `"Khajiit"`. |
| `class` | `string` | Nome da classe, ex.: `"Sorcerer"`, `"Dragonknight"`, `"Nightblade"`. |
| `level` | `number` | Nível do personagem, 1–50. |
| `attributes` | `object` | Pontos de atributo: `health`, `magicka`, `stamina`. Máximo 64 pontos cada, 64 no total. |
| `mundusStone` | `string?` | Pedra de Mundus ativa, ex.: `"The Thief"`, `"The Apprentice"`. |
| `mundusStone2` | `string?` | Segunda Pedra de Mundus — requer o set **Twice-Born Star** (5 peças). |
| `cyrodiil` | `boolean?` | Habilita **Battle Spirit** (buffs de PvP). |
| `vampireStage` | `number?` | Estágio de vampirismo, 0–4. |
| `werewolfStage` | `number?` | Estágio de lobisomem, 0 ou 1. |
| `championPoints` | `number?` | Total de Champion Points, 0–3600. Obrigatório para que [nodes de CP](/pt/guides/champion-points) se apliquem. |
| `rulesVersion` | `string?` | `"Live"` (padrão) ou `"PTS"`. |

::: tip Nomes precisam bater com o catálogo da UESP
Nomes de raça, classe e mundus são casados pelo motor exatamente como aparecem no UESP Build Editor. Nomes desconhecidos comportam-se como "nada selecionado" em vez de lançar erro — se uma passiva de raça parecer faltando, confira a grafia primeiro.
:::

## Passivas de raça / classe

Passivas **não** são aplicadas automaticamente (exceto com `autoPassives: true` para a raça — veja [Skills & Passivas](/pt/guides/skills)). Passivas de classe e outras são opt-in via `passiveSkills` ou pelas funções de catálogo:

```ts
import { listRacialPassives, listClassPassives } from 'uesp-eso-build-wrapper';

const passivas = [
  ...listRacialPassives('Nord'),        // abilityId de cada rank
  ...listClassPassives('Dragonknight'),
].map((p) => p.abilityId);

const stats = calculateBuild({
  character: { /* ... */ },
  passiveSkills: passivas,
});
```

Veja [Skills & Passivas](/pt/guides/skills) para o quadro completo.
