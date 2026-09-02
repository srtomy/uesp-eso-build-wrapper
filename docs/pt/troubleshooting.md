---
title: Solução de Problemas
---

# Solução de Problemas

## `UpdateEsoComputedStatsList_Real não está disponível` / motor não inicializado

`calculateBuild()` foi chamado antes de `initEsoEngineFromData()`, ou o init falhou silenciosamente.

```ts
// uma vez, antes de QUALQUER cálculo
initEsoEngineFromData({ initData });
```

O init é um singleton — chamá-lo de novo é no-op, então é seguro chamá-lo a cada fronteira de request se quiser.

## Arquivos vendor não encontrados em runtime (Next.js / serverless)

Os scripts do motor são carregados em runtime via `fs.readFileSync` da pasta `vendor/` do pacote. Bundlers e tracers serverless não enxergam essas leituras dinâmicas — no Next.js você precisa incluí-los explicitamente:

```ts
// next.config.ts
const nextConfig: NextConfig = {
  serverExternalPackages: ['uesp-eso-build-wrapper'],
  outputFileTracingIncludes: {
    '/**': ['./node_modules/uesp-eso-build-wrapper/vendor/**'],
  },
};
```

Sem isso, o motor lança erro em runtime no Vercel/AWS Lambda mesmo funcionando localmente.

## Um valor de stat parece errado

**Não adicione matemática ao seu código para "consertar".** Todas as fórmulas vivem no motor UESP vendored; o wrapper só injeta inputs. Um valor errado quase sempre significa dados de input errados:

1. Rode [debugBuild()](/api/functions/debugBuild) com o mesmo input e inspecione `inputValues` — qual categoria contribuiu o valor inesperado?
2. Confira nomes/grafias: buffs, toggles, raças e mundus são casados **exatamente**; um typo silenciosamente não faz nada.
3. Confira a versão dos dados do jogo (`_meta` no `uesp-game-data.json`) — dados antigos significam fórmulas antigas.
4. Compare com o [UESP Build Editor](https://esobuilds.uesp.net) com a mesma build. Se o editor divergir, [abra uma issue](https://github.com/srtomy/uesp-eso-build-wrapper/issues) com seu input.

## Nodes de CP não se aplicam

- `character.championPoints` precisa ser **> 0** — nodes são ignorados quando o total é 0.
- O node precisa estar desbloqueado: `isUnlocked` assume `true` por padrão, mas `false` explícito o exclui.
- No caminho legado, `currentBonus` deve ser um número ou uma string `"N%"`.

## Uma toggle skill não faz nada

- Toggles com `requiresCyrodiil: true` só se aplicam quando `character.cyrodiil: true` está setado.
- Toggles com `isPassive: true` precisam da skill respaldada desbloqueada via `passiveSkills` ou presente numa barra de skill.
- Os nomes devem bater exatamente com [listAvailableToggleSkills()](/api/functions/listAvailableToggleSkills).

## Nome de raça/classe não reconhecido

O motor casa os nomes como aparecem no UESP Build Editor (`"High Elf"`, não `"Altmer"`; `"Dragonknight"`, não `"DK"`). Nomes desconhecidos comportam-se como "nada selecionado". Use [listRacialPassives()](/api/functions/listRacialPassives) como teste — resultado vazio significa que o nome não casa com o catálogo.

## Concorrência / múltiplos cálculos

`initEsoEngineFromData()` carrega o motor **uma vez por processo** — todo `calculateBuild()` seguinte é stateless (os inputs são totalmente resetados entre chamadas). Você não precisa de locks nem de init por request; um único init global no startup é o padrão esperado.

Para suítes de teste, rode os testes num único processo/fork — o motor vendored escreve em globals do Node e não é seguro com workers paralelos.
