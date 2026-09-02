---
title: Champion Points
---

# Champion Points

Champion Points têm duas partes:

1. `character.championPoints` — o **total** (0–3600). Precisa ser maior que zero para qualquer node se aplicar.
2. `championPointNodes` — a **distribuição**: quais nodes têm pontos e quantos.

```ts
const stats = calculateBuild({
  character: {
    /* ... */
    championPoints: 160,
  },
  championPointNodes: {
    38750: { points: 100 }, // id do node → pontos investidos
  },
});
```

## Formato do node

```ts
interface ChampionPointNode {
  points?: number;        // pontos investidos — resolve a descrição automaticamente
  description?: string;   // override explícito da descrição (opcional)
  currentBonus?: number | string; // fallback do formato legado
  isUnlocked?: boolean;   // false = tem pontos mas não está slotado (padrão: true)
}
```

### Caminho novo (recomendado)

Quando os dados do jogo contêm `buildRules.cp` (o `uesp-game-data.json` atual contém), passe `points` e deixe o motor resolver o efeito do node pela tabela de descrições:

```ts
championPointNodes: {
  38750: { points: 100 }, // "Grants 1 Max Magicka per stage" → resolvido automaticamente
}
```

### Caminho legado

Se `buildRules.cp` não estiver disponível (dados antigos), passe o bônus/descrição resolvido diretamente:

```ts
championPointNodes: {
  141744: { currentBonus: 1000 },          // valor flat
  141745: { currentBonus: '10%' },         // ou uma porcentagem
}
```

### Slotado vs. desbloqueado

Alguns nodes são slotáveis. `isUnlocked: false` significa que o node tem pontos mas **não** está equipado, então seu passivo não se aplica:

```ts
championPointNodes: {
  38750: { points: 100 },                     // ativo
  38751: { points: 50, isUnlocked: false },   // investido mas não slotado
}
```

## Quais node IDs existem?

Os node IDs são os rule/ability IDs de CP da UESP. A forma mais fácil de obter o ID correto é o próprio UESP Build Editor: configure o CP lá e exporte a build com o [`scripts/browser-export-build.js`](https://github.com/srtomy/uesp-eso-build-wrapper#validating-against-the-uesp-browser) — o export contém `championPointNodes` exatamente no formato que a biblioteca espera.
