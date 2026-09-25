---
title: Lendo o Resultado
---

# Lendo o Resultado

`calculateBuild()` retorna um objeto [`CalculatedBuild`](/api/interfaces/CalculatedBuild) — os stats computados mais `setToggles`.

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

## Todos os 204 stats: `stats.raw`

`raw` é o record completo de `g_EsoComputedStats` do motor — todo stat que o build editor da UESP mostra, incluindo os menos comuns (BashDamage, GroupHealing, ...):

```ts
for (const [statId, value] of Object.entries(stats.raw)) {
  console.log(statId, value);
}
```

::: tip
Os stat IDs são estáveis — são as próprias chaves de `g_EsoComputedStats` do motor (UESP versão 49+). Se precisar de um stat que não está na lista nomeada, acesse via `stats.raw.<StatId>`.
:::

## Toggles de set aplicáveis: `stats.setToggles`

Alguns bônus de set têm condição que o motor não consegue inferir (ex. "após interromper um inimigo", "fora de combate"). A UESP Build Editor os expõe como checkboxes manuais. O `calculateBuild()` informa quais se aplicam à build atual:

```ts
const { setToggles } = calculateBuild(input);

setToggles;
// [
//   { id: "Ansuul's Torment",                setId: "Ansuul's Torment", label: "Ansuul's Torment" },
//   { id: "Ansuul's Torment (Bonus Damage)", setId: "Ansuul's Torment", label: "Ansuul's Torment (Bonus Damage)" },
// ]
```

É a lista dos toggles **aplicáveis** (o set está equipado com peças suficientes e qualquer requisito da rule é atendido) — não dos ligados. Para ligar um, passe o `id` dele em [`BuildInput.toggledSetBonuses`](/api/interfaces/BuildInput):

```ts
calculateBuild({
  ...input,
  toggledSetBonuses: ["Ansuul's Torment"],
});
```

Vazia quando a build não equipa nenhum set com toggle condicional.

Toggles com stack (ex.: Sergeant's Mail) só contribuem quando um count é informado via [`BuildInput.toggledSetBonusCounts`](/api/interfaces/BuildInput); cada `SetToggle` expõe `minTimes`/`maxTimes`/`count`. Veja [Buffs & Toggle Skills](/pt/guides/buffs-and-toggles).

## Depurando uma discrepância

Quando um stat não bate com o esperado, o [debugBuild()](/api/functions/debugBuild) devolve o quadro completo: todo valor de input por categoria (item, set, buff, CP, mundus, food, skill) e **qual fonte contribuiu cada valor**:

```ts
import { debugBuild } from 'uesp-eso-build-wrapper';

const info = debugBuild(input);
console.log(info.inputValues.Set);     // o que cada bônus de set contribuiu
console.log(info.statSources.SpellDamage); // quem setou SpellDamage, em ordem
```

Ele roda o mesmo cálculo — use em testes ou debug local, não em caminhos de produção.
