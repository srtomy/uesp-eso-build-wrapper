---
title: Items & Equipment
---

# Items & Equipment

Items are passed **exactly as returned by the [UESP public item API](https://esolog.uesp.net/exportJson.php?table=minedItem)** — no transformation needed. The library feeds them into the engine, which applies armor ratings, traits, enchantments and set bonuses with its own rules.

## Fetching an item from the UESP API

```ts
const res = await fetch(
  'https://esolog.uesp.net/exportJson.php?table=minedItem&id=70&level=50&quality=5',
);
const data = await res.json();
const item = data.minedItem[0]; // pick the row matching your level/quality
```

The API returns every level/quality variant of an item — filter the `minedItem[]` array for the `level`/`quality` you want.

## Equipping items

Map each item to an [EquipSlot](/api/type-aliases/EquipSlot):

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

Available slots:

```
Head | Shoulders | Chest | Hands | Legs | Waist | Feet
Neck | Ring1 | Ring2
MainHand1 | OffHand1 | MainHand2 | OffHand2
Poison1 | Poison2 | Food | Potion
```

`MainHand1/OffHand1` is the first weapon bar, `MainHand2/OffHand2` the second. Which bar is **active** (for enchants and set bonuses) is controlled by `activeWeaponBar` (default `1`) — see [Skills & Passives](/guides/skills).

## Set bonuses

Set bonuses are derived automatically from the items' `setId`/`setBonus*` fields — equipping 5 pieces of a set activates its bonuses as in the UESP editor. You never configure sets manually.

## Enchantments

By default the item's own `enchantDesc` is used. To override an enchantment (e.g. simulating a different enchant choice), use `enchantOverrides`:

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

The engine applies the correct scaling factor for small slots (Hands/Waist/Feet/Shoulders) itself.

## Food & Potions

Use the `Food` slot with an `abilityDesc` describing the buff. The engine matches the text against its food rules:

```ts
items: {
  Food: {
    itemId: '23274',
    type: '4',
    abilityDesc: 'Increase Max Health by 3094 and Max Magicka by 2856. Magicka Recovery by 315.',
  },
}
```

The description must match the engine's patterns (`"Max Health by N"`, `"Magicka Recovery by N"`, ...). The safest source of a correct `abilityDesc` is the UESP item API response for the actual food item.
