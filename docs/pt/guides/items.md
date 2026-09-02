---
title: Itens & Equipamentos
---

# Itens & Equipamentos

Os itens são passados **exatamente como retornados pela [API pública de itens da UESP](https://esolog.uesp.net/exportJson.php?table=minedItem)** — nenhuma transformação necessária. A biblioteca os injeta no motor, que aplica armor ratings, traits, encantamentos e bônus de set com as próprias regras.

## Buscando um item na API da UESP

```ts
const res = await fetch(
  'https://esolog.uesp.net/exportJson.php?table=minedItem&id=70&level=50&quality=5',
);
const data = await res.json();
const item = data.minedItem[0]; // escolha a linha do level/quality desejado
```

A API retorna todas as variantes de level/quality de um item — filtre o array `minedItem[]` pelo `level`/`quality` que você quer.

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

A descrição precisa casar com os padrões do motor (`"Max Health by N"`, `"Magicka Recovery by N"`, ...). A fonte mais segura de um `abilityDesc` correto é a resposta da API de itens da UESP para o item de comida real.
