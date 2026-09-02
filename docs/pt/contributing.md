---
title: Contribuindo
---

# Contribuindo

Este guia cobre o desenvolvimento da biblioteca. Para docs de consumo, comece na [Introdução](/pt/).

## Setup de desenvolvimento

```bash
git clone --recurse-submodules https://github.com/srtomy/uesp-eso-build-wrapper.git
cd uesp-eso-build-wrapper
npm install
npm test
```

Se clonou sem `--recurse-submodules`:

```bash
git submodule update --init --recursive
```

## Rodando os testes

```bash
npm test                                   # todos os testes
npx vitest run tests/engine.test.ts        # arquivo único
npx vitest run --reporter=verbose -t "baseline"  # por padrão de nome
```

Os testes rodam em **fork único** (`singleFork: true`): o motor UESP escreve em globals do `process` e não é concurrency-safe.

## Princípio central

**Nunca implemente fórmulas do jogo.** Todo cálculo de stats é responsabilidade exclusiva do motor UESP vendored (`esoEditBuild.js`). O único trabalho do wrapper é injetar inputs nesse motor e ler os outputs. Se um valor de stat parece errado, a correção está sempre nos dados alimentados ao motor — nunca em matemática do wrapper.

## Atualizando depois de um novo patch de ESO

Duas fontes mudam a cada patch:

**1. Scripts do motor** (submódulo `vendor/uesp-esochardata/`):

```bash
cd vendor/uesp-esochardata
git fetch upstream && git merge upstream/master
cd ../..
```

**2. Dados do jogo** (`vendor/uesp-data/uesp-game-data.json`):

```bash
# semeie local.db dos dumps SQL da UESP primeiro (veja o db:seed do eso-build-editor)
npm run generate-data -- --db /caminho/local.db --version <patch>
```

Depois:

1. Commite os dados do jogo atualizados (incluindo o marcador `_meta` de patch)
2. Rode `npm test`
3. Atualize os golden values em `tests/engine.test.ts` se mudaram **intencionalmente** (patch de fórmula)

## Validando contra o browser da UESP

O `scripts/browser-export-build.js` roda no console DevTools do UESP Build Editor e exporta a build completa — inputs e stats esperados — em JSON.

1. Abra o [esobuilds.uesp.net](https://esobuilds.uesp.net), configure sua build
2. DevTools (F12) → Console → cole e rode o script
3. Um arquivo `uesp-build-export.json` é baixado
4. Inspecione com `npm run test:build caminho/uesp-build-export.json`
5. Ou solte-o em `tests/fixtures/` — o `tests/build-fixtures.test.ts` o auto-descobre e assera cada valor de `expectedStats`

## Pull requests

- Uma feature ou fix por PR
- Todos os testes, lint e format precisam passar — CI é obrigatório para mergear (veja `docs/CI-PIPELINE.md`)
- Adicione ou atualize testes para qualquer mudança de comportamento
- Títulos seguem Conventional Commits (`feat:`, `fix:`, `chore:` …)
