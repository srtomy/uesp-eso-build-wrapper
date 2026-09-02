[**uesp-eso-build-wrapper v0.3.0**](../index.md)

***

[uesp-eso-build-wrapper](../index.md) / BuildInput

# Interface: BuildInput

Complete input for calculateBuild(): character sheet plus everything the
character "has" — items, Champion Points, buffs, toggle skills, skill bars
and passives.

Only `character` is required; everything else is optional and starts empty.
Each calculateBuild() call starts from a clean state — inputs never bleed
between calls.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="activebuffs"></a> `activeBuffs?` | `string`[] | Nomes exatos dos buffs ativos (habilitados para o cálculo). Ex: ["Minor Slayer", "Major Prophecy", "Major Savagery"] Usa o mesmo nome que aparece em g_EsoBuildBuffData da UESP. |
| <a id="activeweaponbar"></a> `activeWeaponBar?` | `2` \| `1` | Qual barra de armas está ativa para o cálculo. Afeta quais itens de MainHand/OffHand contam para set bonuses e enchants. - `1` = barra principal (MainHand1 / OffHand1) — padrão - `2` = barra secundária (MainHand2 / OffHand2) **Default** `1` |
| <a id="autopassives"></a> `autoPassives?` | `boolean` | When true, automatically injects the highest-rank racial passives for character.race (in addition to any explicit passiveSkills). Mirrors the UESP "Auto Purchase Racial Passives" checkbox — class passives must be passed explicitly via passiveSkills or listClassPassives(). **Default** `false` |
| <a id="championpointnodes"></a> `championPointNodes?` | `Record`\<`string` \| `number`, [`ChampionPointNode`](ChampionPointNode.md)\> | Nodes do Champion Points 2 que estão desbloqueados. Chave: ID numérico do node (rule ID de ESO_CPEFFECT_MATCHES ou abilityId legado). Formato preferido (quando buildRules.cp está carregado): description: texto completo do node que casa com a regex da regra CP. Ex: { 38750: { description: "Grants 1 Max Magicka per stage. Current bonus: 1000" } } Formato legado (quando buildRules.cp não está disponível): currentBonus: valor do "Current bonus: X" ou "Current value: X%" Ex: { 141744: { currentBonus: 1000 } } Requer que character.championPoints > 0. |
| <a id="character"></a> `character` | `object` | - |
| `character.attributes` | `object` | Pontos de atributo distribuídos (máx 64 cada, total 64) |
| `character.attributes.health` | `number` | - |
| `character.attributes.magicka` | `number` | - |
| `character.attributes.stamina` | `number` | - |
| `character.championPoints?` | `number` | Total de Champion Points (0–3600). Distribuição detalhada via cpData. |
| `character.class` | `string` | Classe. Ex: "Sorcerer", "Dragonknight", "Nightblade", "Templar" |
| `character.cyrodiil?` | `boolean` | Habilita Battle Spirit (modo PvP Cyrodiil) |
| `character.level` | `number` | Nível do personagem: 1–50 |
| `character.mundusStone?` | `string` | Pedra de Mundus ativa. Ex: "The Thief", "The Apprentice" |
| `character.mundusStone2?` | `string` | Segunda Pedra de Mundus ativa. Requer o set "Twice-Born Star" (5 peças equipadas). Ex: "The Apprentice" |
| `character.race` | `string` | Raça. Ex: "High Elf", "Nord", "Breton", "Khajiit", "Dark Elf" |
| `character.rulesVersion?` | `string` | Versão das regras: "Live" (padrão) ou "PTS" |
| `character.vampireStage?` | `number` | Estágio de vampiro: 0–4 |
| `character.werewolfStage?` | `number` | Estágio de lobisomem: 0 ou 1 |
| <a id="enchantoverrides"></a> `enchantOverrides?` | `Partial`\<`Record`\<`string`, \{ `enchantDesc`: `string`; `enchantName?`: `string`; \}\>\> | Encantamentos customizados por slot — sobrepõem o enchantDesc padrão do item. Gerado automaticamente por browser-export-build.js quando o usuário troca o encantamento no UESP Build Editor. O calculator injeta esses dados em g_EsoBuildEnchantData[slot] (isDefaultEnchant=false), fazendo o engine aplicar o fator de escala correto para slots pequenos (Hands/Waist/Feet/Shoulders: ×0.4044). **Example** `enchantOverrides: { Head: { enchantDesc: 'Adds up to 868 Maximum Magicka.', enchantName: 'Maximum Magicka Enchantment' }, Hands: { enchantDesc: 'Adds up to 868 Maximum Magicka.', enchantName: 'Maximum Magicka Enchantment' }, }` |
| <a id="items"></a> `items?` | `Partial`\<`Record`\<[`EquipSlot`](../type-aliases/EquipSlot.md), [`UespItemApiData`](UespItemApiData.md)\>\> | Itens equipados. Passe o objeto retornado pela API da UESP diretamente. Busca: `GET https://esolog.uesp.net/exportJson.php?table=minedItem&id=<id>&level=<lv>&quality=<q>` Mapeie o item desejado (do array .minedItem[]) ao slot correto. |
| <a id="passiveskills"></a> `passiveSkills?` | `number`[] | Ability IDs dos skills passivos que o personagem possui desbloqueados. O motor aplica automaticamente o efeito de cada passivo via regex no texto da descrição (ESO_PASSIVEEFFECT_MATCHES). Requer que g_SkillsData contenha os dados do skill (presente em uesp-game-data.json gerado via npm run generate-data). Os IDs correspondem à coluna `abilityId` no banco de dados da UESP. Exemplo: a passiva "Highborn" do High Elf tem abilityId 45284. |
| <a id="skillbars"></a> `skillBars?` | `object` | Skills slotados nas barras de habilidade do personagem (máx 6 por barra). A presença de skills na barra ativa passivos de skill line (ex: passivos de Destruction Staff só se aplicam se houver um skill dessa linha na barra). Também afeta set bonuses condicionais como "Adds N damage to your Class abilities". **Example** `skillBars: { bar1: [ { skillId: 28807, morphIndex: 2 }, // Crystal Fragments (morph 2) { skillId: 24322 }, // Mages' Fury (base) ], bar2: [ { skillId: 29073, morphIndex: 1 }, // Boundless Storm (morph 1) ], }` |
| `skillBars.bar1?` | [`SkillSlot`](SkillSlot.md)[] | - |
| `skillBars.bar2?` | [`SkillSlot`](SkillSlot.md)[] | - |
| <a id="toggledsetbonuses"></a> `toggledSetBonuses?` | `string`[] | Chaves dos toggle set bonuses habilitados (correspondem a g_EsoBuildToggledSetData). Exportado automaticamente por browser-export-build.js quando o usuário ativa um toggle. As chaves são o `nameId` da regra (string), ex: - "Ansuul's Torment" → +7% damage done against monsters (base) - "Ansuul's Torment (Bonus Damage)" → +14% additional (on interrupt) - "Spectral Cloak" → +6% damage done (via Blade Cloak proc) |
| <a id="toggleskills"></a> `toggleSkills?` | `string`[] | Nomes exatos das toggle skills habilitadas. Ex: ["Emperor", "Authority", "Domination", "Tactician"] Usa o mesmo nome que aparece em g_EsoBuildToggledSkillData da UESP. |
