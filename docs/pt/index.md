---
title: Introdução
---

# uesp-eso-build-wrapper

Um wrapper Node.js/TypeScript em torno do motor de cálculo do [UESP ESO Build Editor](https://github.com/uesp/uesp-esochardata).

Calcule as **Computed Character Statistics** de Elder Scrolls Online — Health, Magicka, Stamina, mitigação, chance de crítico, regeneração e mais [221 stats](/pt/output) — usando as fórmulas da própria UESP. **Sem reimplementar nenhuma fórmula.**

## Por que esta biblioteca?

O [UESP Build Editor](https://esobuilds.uesp.net) tem o cálculo de stats de ESO mais preciso que existe: roda o mesmo motor `esoEditBuild.js` que a UESP mantém e atualiza a cada patch. Só que esse motor é JavaScript de browser, escrito contra `window`, jQuery e o DOM.

Esta biblioteca carrega esse motor **vendored e sem modificações** dentro do Node.js e age como ponte:

- **Você injeta os inputs** — ficha do personagem, itens (direto da API de itens da UESP), Champion Points, buffs, skills.
- **O motor da UESP calcula** cada stat com as próprias fórmulas.
- **Você lê os outputs** — um objeto tipado com todos os stats computados.

O wrapper nunca implementa uma fórmula sequer do jogo. Quando um stat parece errado depois de um patch, a correção está sempre nos *dados* do jogo alimentados ao motor — nunca em matemática do wrapper. É isso que mantém a precisão entre patches de ESO.

## Propriedades principais

- **Roda local, sem rede para calcular** — `calculateBuild()` é síncrono e não faz requisições HTTP; o motor vendored roda in-process. Ver [Arquitetura](/pt/architecture).
- **100% fórmulas UESP** — o mesmo motor do [esobuilds.uesp.net](https://esobuilds.uesp.net), zero matemática de ESO no wrapper
- **221 stats computados** — todas as Computed Character Statistics do build editor
- **Item data da UESP pluga direto** — objetos `exportJson.php?table=minedItem` vão direto para `BuildInput.items`
- **Zero dependências de runtime** — Node.js puro
- **Tipos TypeScript completos** — inputs e outputs tipados, [API Reference](/api/) documentada com TSDoc
- **Loader singleton** — o motor carrega uma vez por processo; builds seguintes são rápidas
- **Funções de catálogo** — descubra buffs, passivas e toggle skills válidos em runtime

## Quando usar

Bom fit:

- Planejadores de build / calculadoras de stats de ESO (web ou backend Node)
- Ferramentas que precisam saber "como ficarão meus stats com esse gear, CP e buffs"
- Validar sua própria matemática de ESO contra a referência dourada da UESP

Não é o caso:

- Modificações no client do jogo — isto é uma calculadora, não um addon
- Análise de logs de combate — veja o [UESP Logs](https://esolog.uesp.net)

## Como funciona, em um parágrafo

No `initEsoEngineFromData()`, o wrapper carrega os scripts vendored da UESP no escopo global do Node, semeia-os com os dados do jogo que você fornece (fórmulas, buffs, regras de CP, skills) e simula a superfície mínima de DOM que o motor espera. A cada `calculateBuild()`, ele escreve seus inputs no estado do motor, roda o próprio `UpdateEsoComputedStatsList_Real()` do motor e lê os resultados de `g_EsoComputedStats` num objeto tipado `ComputedStats`.

## Próximos passos

- [Arquitetura](/pt/architecture) — motor local, política de rede, fluxo de dados
- [Primeiros Passos](/pt/getting-started) — instalar, inicializar, primeiro cálculo
- [Guias](/pt/guides/character) — cada input em detalhe: itens, CP, buffs, skills
- [Lendo o Resultado](/pt/output) — o que volta e como usar
- [API Reference](/api/) — gerada a partir do TSDoc do código-fonte
