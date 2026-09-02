---
title: Lendo o Resultado
---

# Lendo o Resultado

`calculateBuild()` retorna um objeto [ComputedStats](/api/interfaces/ComputedStats).

```ts
const stats = calculateBuild({ character: { /* ... */ } });
```

## Stats nomeados

Os stats mais usados são propriedades tipadas:

| Propriedade | Descrição |
| --- | --- |
| `Health` / `Magicka` / `Stamina` | Pools máximos de recurso |
| `HealthRegen` / `MagickaRegen` / `StaminaRegen` | Regeneração |
| `WeaponDamage` / `SpellDamage` | Dano base |
| `WeaponCrit` / `SpellCrit` | Chance de crítico |
| `SpellCritDamage` / `WeaponCritDamage` | Bônus de dano crítico |
| `PhysicalResist` / `SpellResist` / `CritResist` | Resistências |
| `PhysicalPenetration` / `SpellPenetration` | Penetração de armadura |
| `DefensePhysicalMitigation` / `DefenseSpellMitigation` | Mitigação efetiva vs. ataques inimigos |
| `EffectivePower` / `EffectiveSpellPower` / `EffectiveWeaponPower` | Poder efetivo |
| `HealingDone` / `HealingTaken` | Modificadores de cura |
| `RunSpeed` / `SprintSpeed` | Velocidade de movimento |

Stats em percentual saem em unidades de percentual como o motor exibe (ex.: `12.5` = 12,5%).

## Todos os 221 stats: `stats.raw`

`raw` é o record completo de `g_EsoComputedStats` do motor — todo stat que o build editor da UESP mostra, incluindo os menos comuns (BashDamage, GroupHealing, ...):

```ts
for (const [statId, value] of Object.entries(stats.raw)) {
  console.log(statId, value);
}
```

::: tip
Os stat IDs são estáveis — são as próprias chaves de `g_EsoComputedStats` do motor (UESP versão 49+). Se precisar de um stat que não está na lista nomeada, acesse via `stats.raw.<StatId>`.
:::

## Depurando uma discrepância

Quando um stat não bate com o esperado, o [debugBuild()](/api/functions/debugBuild) devolve o quadro completo: todo valor de input por categoria (item, set, buff, CP, mundus, food, skill) e **qual fonte contribuiu cada valor**:

```ts
import { debugBuild } from 'uesp-eso-build-wrapper';

const info = debugBuild(input);
console.log(info.inputValues.Set);     // o que cada bônus de set contribuiu
console.log(info.statSources.SpellDamage); // quem setou SpellDamage, em ordem
```

Ele roda o mesmo cálculo — use em testes ou debug local, não em caminhos de produção.
