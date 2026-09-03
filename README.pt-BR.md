# uesp-eso-build-wrapper

[![CI](https://github.com/srtomy/uesp-eso-build-wrapper/actions/workflows/ci.yml/badge.svg)](https://github.com/srtomy/uesp-eso-build-wrapper/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/srtomy/uesp-eso-build-wrapper/graph/badge.svg)](https://codecov.io/gh/srtomy/uesp-eso-build-wrapper)
[![npm](https://img.shields.io/npm/v/uesp-eso-build-wrapper.svg)](https://www.npmjs.com/package/uesp-eso-build-wrapper)
[![Docs](https://img.shields.io/badge/docs-online-2564eb)](https://srtomy.github.io/uesp-eso-build-wrapper/pt/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node >=24](https://img.shields.io/badge/node-%3E%3D24-brightgreen)](https://nodejs.org/en/download/)

> **Read in [English](README.md).**

Um wrapper Node.js/TypeScript em torno do motor de cálculo do [UESP ESO Build Editor](https://github.com/uesp/uesp-esochardata).

Calcule as **Computed Character Statistics** de Elder Scrolls Online — Health, Magicka, Stamina, mitigação, chance de crítico, regeneração e mais de 200 — usando as fórmulas da própria UESP. Sem reimplementar nenhuma fórmula.

## O que é?

Isto **não é um cliente HTTP da UESP**. A biblioteca executa o motor de cálculo da UESP **localmente, dentro do seu processo Node.js**, e expõe os resultados numa API tipada:

```text
Aplicação
    ↓
uesp-eso-build-wrapper (API TypeScript)
    ↓
Camada de compatibilidade Node.js (globals de browser + DOM mínimo)
    ↓
UESP esoEditBuild.js (executado in-process via vm.runInThisContext)
    ↓
Funções de cálculo UESP → ComputedStats
```

Você injeta os inputs, o próprio código da UESP calcula cada stat, você lê de volta um objeto tipado.

## Por que esta biblioteca?

- **Precisão de referência** — o mesmo motor `esoEditBuild.js` do [esobuilds.uesp.net](https://esobuilds.uesp.net), mantido pela UESP e atualizado a cada patch.
- **Sem reimplementar fórmulas** — o wrapper contém zero matemática de ESO. Quando um stat parece errado depois de um patch, a correção está sempre nos *dados* do jogo alimentados ao motor, nunca no código do wrapper. É isso que mantém a precisão entre patches.
- **Local e síncrono** — `calculateBuild()` não faz nenhuma requisição de rede. O motor roda in-process; os dados do jogo e os itens são fornecidos pela sua aplicação (arquivo, banco de dados, dados gerados).
- **Aceita item data da UESP diretamente** — equipamentos no formato [`exportJson.php?table=minedItem`](https://esolog.uesp.net) plugam direto em `BuildInput.items`.
- **Nativo TypeScript** — inputs/outputs tipados, [API Reference](https://srtomy.github.io/uesp-eso-build-wrapper/api/) documentada com TSDoc, além de funções de catálogo em runtime (`listAvailableBuffs`, `listRacialPassives`, …) para descobrir nomes válidos.

## Propriedades principais

- Executa o motor de cálculo UESP vendored localmente (`vendor/uesp-esochardata`)
- **Sem rede para calcular builds** — ver [Precisa de internet?](https://srtomy.github.io/uesp-eso-build-wrapper/pt/architecture#precisa-de-conexao-com-a-internet)
- Não reimplementa as fórmulas de stats do ESO
- API síncrona; o motor inicializa uma vez por processo (singleton, chamadas seguintes são no-op)
- Zero dependências de runtime — Node.js puro
- 221 computed stats por build

## Instalação

```bash
npm install uesp-eso-build-wrapper
```

## Quick Start

Os game data não vêm no pacote npm — você os fornece via `initEsoEngineFromData` (ver [Primeiros Passos](https://srtomy.github.io/uesp-eso-build-wrapper/pt/getting-started)).

```ts
import fs from 'fs';
import { initEsoEngineFromData, calculateBuild } from 'uesp-eso-build-wrapper';
import type { UespInitData } from 'uesp-eso-build-wrapper';

const initData = JSON.parse(
  fs.readFileSync('uesp-game-data.json', 'utf-8'),
) as UespInitData;

initEsoEngineFromData({ initData }); // uma vez por processo

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
console.log(stats.SpellDamage);  // 1000
```

## Como funciona

1. `initEsoEngineFromData({ initData })` prepara globals de browser, semeia o motor com seus game data e executa os scripts vendored da UESP via `vm.runInThisContext` — uma vez por processo.
2. `calculateBuild(input)` escreve sua build no estado do motor, roda o próprio `UpdateEsoComputedStatsList_Real()` do motor e lê os resultados de `g_EsoComputedStats` num objeto tipado `ComputedStats`.

Detalhes: [Arquitetura](https://srtomy.github.io/uesp-eso-build-wrapper/pt/architecture) · [Primeiros Passos](https://srtomy.github.io/uesp-eso-build-wrapper/pt/getting-started) · [Lendo o Resultado](https://srtomy.github.io/uesp-eso-build-wrapper/pt/output).

## Documentação

Documentação completa em **Português (BR)** e **English** em
[**srtomy.github.io/uesp-eso-build-wrapper**](https://srtomy.github.io/uesp-eso-build-wrapper/pt/):

| Seção | Descrição |
| --- | --- |
| [Introdução](https://srtomy.github.io/uesp-eso-build-wrapper/pt/) | O que é, por que existe, propriedades principais |
| [Arquitetura](https://srtomy.github.io/uesp-eso-build-wrapper/pt/architecture) | Motor local, política de rede, fluxo de dados |
| [Primeiros Passos](https://srtomy.github.io/uesp-eso-build-wrapper/pt/getting-started) | Instalação, game data, primeiro cálculo |
| [Guias](https://srtomy.github.io/uesp-eso-build-wrapper/pt/guides/character) | Personagem, itens, Champion Points, buffs, skills |
| [Lendo o Resultado](https://srtomy.github.io/uesp-eso-build-wrapper/pt/output) | Os 221 computed stats, `debugBuild()` |
| [API Reference](https://srtomy.github.io/uesp-eso-build-wrapper/api/) | Gerada a partir do TSDoc (em inglês) |
| [Solução de Problemas](https://srtomy.github.io/uesp-eso-build-wrapper/pt/troubleshooting) | Problemas comuns (Next.js/serverless, stats errados...) |
| [Contribuindo](https://srtomy.github.io/uesp-eso-build-wrapper/pt/contributing) | Setup dev, testes, atualização após patch do ESO |

## Limitações

- O comportamento segue a versão vendored do motor UESP — suportar um patch novo do ESO significa atualizar os scripts vendored + game data e rodar os testes.
- O motor foi escrito para browsers em torno de estado global; o wrapper adapta isso para Node.js (init singleton, chamadas síncronas). Sem garantias de concorrência além das que o próprio motor oferece — ver [Solução de Problemas](https://srtomy.github.io/uesp-eso-build-wrapper/pt/troubleshooting).
- Requer Node.js >= 24. Bundlers/serverless precisam incluir `vendor/**` explicitamente (documentado em Solução de Problemas).

## Licença

MIT © srtomy

Este pacote inclui arquivos de [uesp/uesp-esochardata](https://github.com/uesp/uesp-esochardata) (MIT).  
Ver [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES) para detalhes.

Elder Scrolls Online é marca registrada de ZeniMax Media Inc. Este projeto não é afiliado nem endossado pela ZeniMax Media Inc.
