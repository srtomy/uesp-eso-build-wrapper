---
title: Itens & Equipamentos
---

# Itens & Equipamentos

Os itens são dados puros. `BuildInput.items[slot]` recebe um objeto no shape `UespItemApiData` — o mesmo shape que o editor usa para os próprios payloads de item. Nenhuma transformação específica do wrapper é necessária: a biblioteca injeta o objeto no motor, que aplica armor ratings, traits, encantamentos e bônus de set com as próprias regras.

A lista completa de campos está na referência do [`UespItemApiData`](/api/type-aliases/UespItemApiData); todo campo é string. De onde o payload vem é assunto da sua aplicação — o wrapper nunca busca item data por conta própria.

## Shape do item

```ts
import type { UespItemApiData } from 'uesp-eso-build-wrapper';

const chest: UespItemApiData = {
  itemId: '<id>',
  name: "Hunding's Rage Cuirass",
  type: '2',                 // armadura
  quality: '5',
  trait: 'Reinforced',
  enchantDesc: 'Adds up to <N> Maximum Health.',
  setName: "Hunding's Rage",
  setBonusCount1: '2',
  setBonusDesc1: 'Adds <N> Weapon and Spell Damage to your damaging abilities.',
};
```

Payloads de item são por variante de level/quality — passe a variante que casa com a sua build.

## Equipando itens

Mapeie cada item para um [EquipSlot](/api/type-aliases/EquipSlot):

```ts
const stats = calculateBuild({
  character: { /* ... */ },
  items: {
    Chest: chestItem,
    Head: headItem,
    MainHand1: staffItem,
    Ring1: ringItem,
  },
});
```

Slots disponíveis:

```
Head | Shoulders | Chest | Hands | Legs | Waist | Feet
Neck | Ring1 | Ring2
MainHand1 | OffHand1 | MainHand2 | OffHand2
Poison1 | Poison2 | Food | Potion
```

`MainHand1/OffHand1` é a primeira barra de armas, `MainHand2/OffHand2` a segunda. Qual barra está **ativa** (para encantamentos e bônus de set) é controlado por `activeWeaponBar` (padrão `1`) — veja [Skills & Passivas](/pt/guides/skills).

## Bônus de set

Os bônus de set são derivados automaticamente dos campos `setId`/`setBonus*` dos itens — equipar 5 peças de um set ativa seus bônus como no editor da UESP. Você nunca configura sets manualmente.

## Encantamentos

Por padrão o `enchantDesc` do próprio item é usado. Para sobrescrever um encantamento (ex.: simular outra escolha de enchant), use `enchantOverrides`:

```ts
const stats = calculateBuild({
  character: { /* ... */ },
  items: { Head: headItem, Hands: handsItem },
  enchantOverrides: {
    Head:  { enchantDesc: 'Adds up to 868 Maximum Magicka.', enchantName: 'Maximum Magicka Enchantment' },
    Hands: { enchantDesc: 'Adds up to 868 Maximum Magicka.', enchantName: 'Maximum Magicka Enchantment' },
  },
});
```

O motor aplica sozinho o fator de escala correto para slots pequenos (Hands/Waist/Feet/Shoulders).

## Comidas & Poções

Use o slot `Food` com um `abilityDesc` descrevendo o buff. O motor casa o texto com as regras de comida:

```ts
items: {
  Food: {
    itemId: '23274',
    type: '4',
    abilityDesc: 'Increase Max Health by 3094 and Max Magicka by 2856. Magicka Recovery by 315.',
  },
}
```

A descrição precisa casar com os padrões do motor (`"Max Health by N"`, `"Magicka Recovery by N"`, ...). A fonte mais segura de um `abilityDesc` correto é o payload do item de comida real que você está modelando.
