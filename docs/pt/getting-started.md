---
title: Primeiros Passos
---

# Primeiros Passos

## Requisitos

- **Node.js >= 24** (veja `engines` no package.json)

## Instalação

```bash
npm install uesp-eso-build-wrapper
```

## Dados do jogo

Os dados do jogo (`UespInitData`) **não vêm no pacote npm** — a biblioteca embala apenas os scripts do motor. Você fornece os dados na inicialização.

A fonte canônica é o [`vendor/uesp-data/uesp-game-data.json`](https://github.com/srtomy/uesp-eso-build-wrapper/blob/main/vendor/uesp-data/uesp-game-data.json), commitado no repositório e regenerado dos dumps SQL da UESP a cada patch de ESO. O campo `_meta` registra de qual patch foi gerado — atualize ou fixe sua cópia deliberadamente para que seus números correspondam a uma versão conhecida do jogo.

Formas de obter:

1. **Copiar do repositório** — baixe o `uesp-game-data.json` do repositório acima e carregue com `fs.readFileSync`.
2. **Gerar você mesmo** — semeie um banco SQLite com os dumps da UESP usando o [eso-build-editor](https://github.com/srtomy/eso-build-editor), depois rode o gerador desta biblioteca (Node >= 22):

   ```bash
   npm run generate-data -- --db /caminho/local.db --version <patch>
   ```

## Inicialize o motor

Chame `initEsoEngineFromData()` **uma vez por processo**, antes de qualquer cálculo. Chamadas seguintes são no-op.

```ts
import fs from 'fs';
import { initEsoEngineFromData } from 'uesp-eso-build-wrapper';
import type { UespInitData } from 'uesp-eso-build-wrapper';

const initData = JSON.parse(
  fs.readFileSync('uesp-game-data.json', 'utf-8'),
) as UespInitData;

initEsoEngineFromData({ initData });
```

## Seu primeiro cálculo

```ts
import { calculateBuild } from 'uesp-eso-build-wrapper';

const stats = calculateBuild({
  character: {
    race: 'High Elf',
    class: 'Sorcerer',
    level: 50,
    attributes: { health: 0, magicka: 64, stamina: 0 },
  },
});

console.log(stats.Health);       // 16000
console.log(stats.Magicka);      // 19104
console.log(stats.MagickaRegen); // 514
console.log(stats.SpellDamage);  // 1000
```

O objeto de resultado também traz `stats.raw` — todos os 221 stats num record simples. Veja [Lendo o Resultado](/pt/output).

## Próximos passos

- [Personagem](/pt/guides/character) — cada campo da ficha
- [Itens & Equipamentos](/pt/guides/items) — gear da API de itens da UESP
- [Champion Points](/pt/guides/champion-points) — nodes de CP
- [Buffs & Toggle Skills](/pt/guides/buffs-and-toggles) — buffs nomeados e toggles
- [Skills & Passivas](/pt/guides/skills) — barras de skill, morphs, passivas
