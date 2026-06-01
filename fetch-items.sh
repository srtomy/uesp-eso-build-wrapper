#!/bin/bash
# Busca dados dos itens da build na API da UESP
# Uso: bash fetch-items.sh > items.json

declare -A SLOTS=(
  [Head]=95045
  [Shoulders]=184894
  [Chest]=186446
  [Hands]=186448
  [Legs]=186450
  [Waist]=186453
  [Feet]=186447
  [Neck]=184807
  [Ring1]=171436
  [Ring2]=184806
  [MainHand1]=184904
  [MainHand2]=71166
)

echo "{"
first=1
for slot in Head Shoulders Chest Hands Legs Waist Feet Neck Ring1 Ring2 MainHand1 MainHand2; do
  id=${SLOTS[$slot]}
  data=$(curl -s -A 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' \
    "https://esolog.uesp.net/exportJson.php?table=minedItem&id=${id}&level=66&quality=5")
  if [ $first -eq 0 ]; then echo ","; fi
  echo "  \"${slot}\": ${data}"
  first=0
done
echo "}"
