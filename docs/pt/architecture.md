---
title: Arquitetura
---

# Arquitetura

`uesp-eso-build-wrapper` é um wrapper Node.js/TypeScript em torno do motor de cálculo de builds da UESP. Ele executa o motor UESP vendored localmente, fornece o ambiente de browser que o motor espera, recebe os dados de jogo/build necessários e expõe as estatísticas calculadas numa API amigável ao Node.

```text
Aplicação
    ↓
uesp-eso-build-wrapper (API tipada: initEsoEngineFromData / calculateBuild / debugBuild)
    ↓
Camada de compatibilidade Node.js (globals de browser + superfície mínima de DOM)
    ↓
Motor UESP (esoEditBuild.js + esobuilddata.js, executados in-process via vm.runInThisContext)
    ↓
ComputedStats (221 stats lidos de g_EsoComputedStats)
```

## Precisa de conexão com a internet?

**Calcular builds não precisa de rede.** `calculateBuild()` é síncrono e não faz nenhuma requisição HTTP: o motor roda dentro do processo Node.js e todos os dados de que ele precisa são fornecidos localmente pela sua aplicação.

| Preocupação       | Onde roda              | Rede?                                    |
| ----------------- | ---------------------- | ---------------------------------------- |
| Motor UESP        | local, in-process      | não                                      |
| Cálculo da build  | local, in-process      | não                                      |
| Game data         | input local            | não (você carrega de arquivo/banco/memória) |
| Dados externos    | escolha da aplicação   | opcional — responsabilidade sua          |

Buscar item data em `esolog.uesp.net/exportJson.php` ou baixar SQL dumps novos acontece **fora** do caminho de cálculo: sua aplicação pode fazer isso para *obter* inputs, mas o wrapper nunca usa rede para *calcular*.

## Como o motor UESP roda no Node.js

O código original da UESP foi escrito para browsers: assume globals `window`, jQuery (`$("#esotbRace").val()`, …) e um DOM. O wrapper não o importa como módulo — ele **executa os scripts vendored no contexto VM do Node.js** (`vm.runInThisContext` em `src/lib/eso-engine/loader.ts`), depois de preparar o que o motor espera:

```text
Node.js
  ├── prepara globals de browser (window, document, navigator, mock jQuery)
  ├── prepara variáveis globais UESP (g_EsoComputedStats, g_EsoInputStats, g_EsoBuildRules, …)
  ├── semeia game data a partir de initData (fórmulas, buffs, regras de CP, skills)
  ▼
vm.runInThisContext(esobuilddata.js → esoEditBuild.js)
  ▼
Motor UESP pronto (UpdateEsoComputedStatsList_Real, g_EsoComputedStats, …)
```

## Por que existe um ambiente de browser?

Porque o motor nunca foi desenhado como biblioteca Node.js. O `env-setup.ts` do wrapper fornece a superfície mínima que o motor lê — um store de valores/atributos/texto atrás de um mock jQuery encadeável — para que chamadas como `$("#esotbRace").val()` funcionem sem um DOM real. Só o que o motor realmente toca é simulado; nada além disso.

## Game data vs motor vs itens

| Dado      | Finalidade                      | Origem                                                        |
| --------- | ------------------------------- | ------------------------------------------------------------- |
| Motor     | cálculos de build/stats         | scripts UESP vendored (`vendor/uesp-esochardata/resources/`)  |
| Game data | inicialização (`UespInitData`: fórmulas, buffs, regras de CP, skills…) | fornecido pela aplicação — copie `vendor/uesp-data/uesp-game-data.json` ou gere com `npm run generate-data` |
| Itens     | equipamento (`BuildInput.items`)| fornecido por build, direto da API de itens da UESP (`exportJson.php?table=minedItem`) |

## Calculando uma build

```ts
const result = calculateBuild(buildInput);
```

```text
BuildInput (personagem, itens, CP, buffs, skills)
    ↓
estado do motor (valores do DOM mock + g_EsoBuildItemData + g_EsoCpData + tabelas de buff/toggle)
    ↓
UpdateEsoComputedStatsList_Real(null, true)  — entry point do próprio motor
    ↓
g_EsoComputedStats (cada stat com .value atualizado in place)
    ↓
ComputedStats (chaves nomeadas + raw com os 221 stats)
```

`debugBuild(input)` roda o mesmo cálculo e ainda retorna cada input por categoria e qual fonte contribuiu para cada stat — ferramenta de diagnóstico para investigar divergências, não caminho de produção.

## Sem reimplementar fórmulas do ESO

> Esta biblioteca não reimplementa as fórmulas de cálculo de stats do ESO.

Ela reutiliza a implementação de referência da UESP:

```text
Motor de cálculo original da UESP
              ↓
      API do wrapper
              ↓
   aplicação local
```

Isso elimina duplicação — e significa que o comportamento da biblioteca acompanha a versão vendored do motor. Depois de um patch do ESO: atualize os scripts vendored, regenere os game data, rode os testes.

## Estado do motor

O motor original é construído em torno de estado global, e o wrapper adapta isso para Node.js:

- `initEsoEngineFromData({ initData })` inicializa esse estado **uma vez por processo** — chamadas seguintes são no-op (ver `src/lib/eso-engine/index.ts`).
- Cada `calculateBuild()` parte de um estado limpo (itens, buffs, nós de CP e skill bars são resetados) para que builds nunca vazem umas nas outras.
- As chamadas são síncronas. Nenhuma garantia é feita sobre segurança concorrente/paralela além do que o próprio motor oferece.

## Limitações

Limitações conhecidas (confirmadas no código):

- Os resultados seguem as versões vendored do motor + game data — dados desatualizados significam fórmulas desatualizadas.
- Design nascido no browser: estado global, init singleton, execução síncrona.
- Datasets grandes vivem em memória após o init; o init tem um custo único, builds seguintes são baratas.
- Node.js >= 24 obrigatório; bundlers/serverless precisam incluir `vendor/**` explicitamente (ver [Solução de Problemas](/pt/troubleshooting)).

## Atualizando dados e motor da UESP

```text
UESP upstream
    ↓
atualizar motor/dados vendored
    ↓
gerar dados (npm run generate-data)
    ↓
rodar testes (npm test)
    ↓
publicar
```

1. Merge do upstream em `vendor/uesp-esochardata/` (e `vendor/uesp-esolog/` para descrições de skills).
2. Regenere `vendor/uesp-data/uesp-game-data.json`: `npm run generate-data -- --db /path/to/local.db --version <patch>`.
3. Rode `npm test` — os golden values são travados nas fórmulas vendored; mudanças intencionais do upstream exigem atualizar as expectativas.
4. Ver [Contribuindo](/pt/contributing) para o procedimento completo de atualização de patch.
