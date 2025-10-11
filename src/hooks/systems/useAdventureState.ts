
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { AdventureSettings, Character, Message, SaveData, AiConfig, PlayerInventoryItem, LootedItem, LocalizedText } from "@/types";

const createInitialState = (): SaveData => ({
    adventureSettings: {
        world: { fr: "" },
        initialSituation: { fr: "" },
        rpgMode: true,
        relationsMode: true,
        strategyMode: true,
        comicModeActive: false,
        playerName: "Héros",
        playerClass: "Aventurier",
        playerLevel: 1,
        playerInitialAttributePoints: 10,
        playerStrength: 8,
        playerDexterity: 8,
        playerConstitution: 8,
        playerIntelligence: 8,
        playerWisdom: 8,
        playerCharisma: 8,
        playerCurrentHp: 20,
        playerMaxHp: 20,
        playerCurrentMp: 0,
        playerMaxMp: 0,
        playerCurrentExp: 0,
        playerExpToNextLevel: 100,
        playerGold: 10,
        playerInventory: [],
        playerSkills: [],
        equippedItemIds: { weapon: null, armor: null, jewelry: null },
        familiars: [],
        mapPointsOfInterest: [],
        mapImageUrl: null,
        playerPortraitUrl: null,
        playerDetails: "",
        playerDescription: "",
        playerOrientation: "",
        playerFaceSwapEnabled: false,
        timeManagement: {
            enabled: false,
            day: 1,
            dayName: "Lundi",
            dayNames: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
            currentTime: "12:00",
            timeFormat: "24h",
            currentEvent: "",
            timeElapsedPerTurn: "00:15",
        },
    },
    characters: [],
    narrative: [],
    currentLanguage: "fr",
    saveFormatVersion: 2.6,
    timestamp: new Date().toISOString(),
});

export function calculateBaseDerivedStats(stats: {
    level: number;
    characterClass: string;
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
}) {
    const baseMaxHp = 10 + (stats.constitution || 8) * 2;
    const baseMaxMp = (stats.intelligence || 8);
    const baseAc = 10 + (stats.dexterity || 8);
    const strengthMod = Math.floor(((stats.strength || 8) - 10) / 2);

    return {
        maxHitPoints: baseMaxHp,
        maxManaPoints: baseMaxMp,
        armorClass: baseAc,
        attackBonus: strengthMod,
        damageBonus: `1d4${strengthMod !== 0 ? (strengthMod > 0 ? `+${strengthMod}`: strengthMod) : ''}`,
    };
}


export function calculateEffectiveStats(settings: AdventureSettings) {
    if (!settings.rpgMode) {
        return {
            playerMaxHp: 0,
            playerMaxMp: 0,
            playerArmorClass: 0,
            playerAttackBonus: 0,
            playerDamageBonus: "1",
            playerStrength: 8,
            playerDexterity: 8,
            playerConstitution: 8,
            playerIntelligence: 8,
            playerWisdom: 8,
            playerCharisma: 8,
        };
    }

    const getEquippedItems = () => {
        const inv = settings.playerInventory || [];
        const ids = settings.equippedItemIds || {};
        return [
            inv.find(i => i.id === ids.weapon),
            inv.find(i => i.id === ids.armor),
            inv.find(i => i.id === ids.jewelry),
        ].filter((item): item is PlayerInventoryItem => !!item);
    };

    const equipped = getEquippedItems();

    let effectiveStats = {
        playerStrength: settings.playerStrength ?? 8,
        playerDexterity: settings.playerDexterity ?? 8,
        playerConstitution: settings.playerConstitution ?? 8,
        playerIntelligence: settings.playerIntelligence ?? 8,
        playerWisdom: settings.playerWisdom ?? 8,
        playerCharisma: settings.playerCharisma ?? 8,
    };
    
    let bonusAc = 0;
    let bonusHp = 0;
    let bonusAttack = 0;
    let bonusDamageValue = 0; // numeric bonus

    for (const item of equipped) {
        const b = item?.statBonuses || {};
        for (const [key, value] of Object.entries(b)) {
            const val = Number(value) || 0;
            switch (key.toLowerCase()) {
                case "str": effectiveStats.playerStrength += val; break;
                case "dex": effectiveStats.playerDexterity += val; break;
                case "con": effectiveStats.playerConstitution += val; break;
                case "int": effectiveStats.playerIntelligence += val; break;
                case "wis": effectiveStats.playerWisdom += val; break;
                case "cha": effectiveStats.playerCharisma += val; break;
                case "hp": bonusHp += val; break;
                case "ac": bonusAc += val; break;
                case "attack": bonusAttack += val; break;
                case "damage": if (!isNaN(val)) bonusDamageValue += val; break;
            }
        }
    }

    const baseDerived = calculateBaseDerivedStats({
        level: settings.playerLevel ?? 1,
        characterClass: settings.playerClass ?? '',
        ...effectiveStats,
    });
    
    const equippedArmor = equipped.find(i => i.type === 'armor');
    let finalArmorClass = baseDerived.armorClass; 
    if (equippedArmor?.ac) {
         if (equippedArmor.ac.includes('+')) {
            const parts = equippedArmor.ac.split('+').map(s => s.trim());
            const baseArmorAc = parseInt(parts[0], 10);
            if (!isNaN(baseArmorAc)) finalArmorClass = baseArmorAc;
            
            if (parts[1].toLowerCase().includes('dex')) {
                const dexMod = Math.floor((effectiveStats.playerDexterity - 10) / 2);
                const maxDexBonusMatch = parts[1].match(/\(max \+(\d+)\)/);
                if (maxDexBonusMatch) {
                    finalArmorClass += Math.min(dexMod, parseInt(maxDexBonusMatch[1], 10));
                } else {
                    finalArmorClass += dexMod;
                }
            }
        } else {
            const armorAcValue = parseInt(equippedArmor.ac, 10);
            if (!isNaN(armorAcValue)) finalArmorClass = armorAcValue;
        }
    }
    finalArmorClass += bonusAc; 

    const equippedWeapon = equipped.find(i => i.type === 'weapon');
    let finalDamageBonus = baseDerived.damageBonus;
    if (equippedWeapon?.damage) {
        const strMod = Math.floor((effectiveStats.playerStrength - 10) / 2);
        let baseDamage = equippedWeapon.damage;
        let totalBonus = strMod + bonusDamageValue;
        
        // Check if baseDamage already has a bonus
        const existingBonusMatch = baseDamage.match(/([+-]\d+)/);
        if (existingBonusMatch) {
            totalBonus += parseInt(existingBonusMatch[0], 10);
            baseDamage = baseDamage.replace(existingBonusMatch[0], '').trim();
        }

        finalDamageBonus = totalBonus !== 0 ? `${baseDamage}${totalBonus > 0 ? '+' : ''}${totalBonus}` : baseDamage;
    }


    return {
        ...effectiveStats,
        playerMaxHp: baseDerived.maxHitPoints + bonusHp,
        playerMaxMp: baseDerived.maxManaPoints,
        playerArmorClass: finalArmorClass,
        playerAttackBonus: baseDerived.attackBonus + bonusAttack,
        playerDamageBonus: finalDamageBonus,
    };
}

export const getLocalizedText = (field: LocalizedText, lang: string) => {
    return field[lang] || field['en'] || field['fr'] || Object.values(field)[0] || "";
};

export function useAdventureState() {
    const { toast } = useToast();
    const initialState = createInitialState();

    const [adventureSettings, setAdventureSettings] = React.useState<AdventureSettings>(initialState.adventureSettings);
    const [characters, setCharacters] = React.useState<Character[]>(initialState.characters);
    const [narrativeMessages, setNarrativeMessages] = React.useState<Message[]>(initialState.narrative);
    const [currentLanguage, setCurrentLanguage] = React.useState<string>(initialState.currentLanguage);
    const [aiConfig, setAiConfig] = React.useState<AiConfig>(initialState.aiConfig || { llm: { source: 'gemini' }, image: { source: 'gemini' } });
    
    const [baseAdventureSettings, setBaseAdventureSettings] = React.useState<AdventureSettings>(JSON.parse(JSON.stringify(initialState.adventureSettings)));
    const [baseCharacters, setBaseCharacters] = React.useState<Character[]>(JSON.parse(JSON.stringify(initialState.characters)));

    // State for item selling modal
    const [itemToSellDetails, setItemToSellDetails] = React.useState<{ item: PlayerInventoryItem; sellPricePerUnit: number } | null>(null);
    const [sellQuantity, setSellQuantity] = React.useState(1);


    const loadAdventureState = React.useCallback((data: SaveData) => {
        const settingsWithDefaults = { ...createInitialState().adventureSettings, ...data.adventureSettings };
        const effectiveStats = calculateEffectiveStats(settingsWithDefaults);
        const finalSettings = {
            ...settingsWithDefaults,
            ...effectiveStats,
            playerCurrentHp: data.adventureSettings.playerCurrentHp ?? effectiveStats.playerMaxHp,
        };

        setAdventureSettings(finalSettings);
        setCharacters(data.characters || []);
        setNarrativeMessages(data.narrative || createInitialState().narrative);
        setCurrentLanguage(data.currentLanguage || 'fr');
        setAiConfig(data.aiConfig || { llm: { source: 'gemini' }, image: { source: 'gemini' } });
        
        setBaseAdventureSettings(JSON.parse(JSON.stringify(finalSettings)));
        setBaseCharacters(JSON.parse(JSON.stringify(data.characters || [])));

        toast({ title: "Aventure Chargée", description: "Votre partie a été chargée avec succès." });
    }, [toast]);

    const handleTakeLoot = React.useCallback((messageId: string, itemsToTake: PlayerInventoryItem[], silent: boolean = false) => {
        setAdventureSettings(prevSettings => {
            if (!prevSettings.rpgMode) return prevSettings;
            const newInventory = [...(prevSettings.playerInventory || [])];
            
            const lootMessage = narrativeMessages.find(m => m.id === messageId);
            let currencyGained = 0;
             if (lootMessage?.loot) {
                const currencyItem = lootMessage.loot.find(item => item.name?.toLowerCase().includes("pièces d'or") || item.name?.toLowerCase().includes("gold"));
                if (currencyItem) {
                    currencyGained = currencyItem.quantity;
                }
             }

            itemsToTake.forEach(item => {
                if (!item.id || !item.name || typeof item.quantity !== 'number' || !item.type) {
                    console.warn("Skipping invalid loot item (missing id, name, quantity, or type):", item);
                    return;
                }
                const existingItemIndex = newInventory.findIndex(invItem => invItem.name === item.name);
                if (existingItemIndex > -1) {
                    newInventory[existingItemIndex].quantity += item.quantity;
                } else {
                    newInventory.push({ ...item, isEquipped: false });
                }
            });
            return { ...prevSettings, playerInventory: newInventory, playerGold: (prevSettings.playerGold || 0) + currencyGained };
        });
        if (messageId) {
            setNarrativeMessages(prevMessages =>
                prevMessages.map(msg =>
                    msg.id === messageId ? { ...msg, lootTaken: true } : msg
                )
            );
        }
        if (!silent) {
            toast({ title: "Objets Ramassés", description: "Les objets ont été ajoutés à votre inventaire." });
        }
      }, [toast, narrativeMessages, setAdventureSettings, setNarrativeMessages]);
      
    const addCurrencyToPlayer = React.useCallback((amount: number) => {
        setAdventureSettings(prevSettings => {
            if (!prevSettings.rpgMode) return prevSettings;
            let currentGold = prevSettings.playerGold ?? 0;
            let newGold = currentGold + amount;
            if (newGold < 0) newGold = 0;
            return { ...prevSettings, playerGold: newGold };
        });
    }, [setAdventureSettings]);

    const handlePlayerItemAction = React.useCallback((itemId: string, action: 'use' | 'discard') => {
        let itemUsedOrDiscarded: PlayerInventoryItem | undefined;
        let narrativeAction = "";
    
        setAdventureSettings(prevSettings => {
            if (!prevSettings.rpgMode || !prevSettings.playerInventory) {
                toast({ title: "Action Impossible", description: "Le mode RPG doit être actif." });
                return prevSettings;
            }
    
            const newInventory = [...prevSettings.playerInventory];
            const itemIndex = newInventory.findIndex(i => i.id === itemId);
    
            if (itemIndex === -1) {
                toast({ title: "Objet introuvable." });
                return prevSettings;
            }
    
            const item = newInventory[itemIndex];
            itemUsedOrDiscarded = item;
            let changes: Partial<AdventureSettings> = {};
    
            if (action === 'use') {
                if (item.type === 'consumable') {
                    narrativeAction = `J'utilise ${item.name}.`;
                    newInventory[itemIndex] = { ...item, quantity: item.quantity - 1 };
    
                    if (item.effectDetails?.type === 'heal') {
                        const newHp = Math.min(prevSettings.playerMaxHp || 0, (prevSettings.playerCurrentHp || 0) + item.effectDetails.amount);
                        changes.playerCurrentHp = newHp;
                        toast({ title: "Soin!", description: `Vous récupérez ${item.effectDetails.amount} PV.` });
                    }
    
                } else {
                    toast({ title: "Non utilisable", description: `Vous ne pouvez pas "utiliser" un ${item.type}. Essayez de l'équiper.` });
                    return prevSettings; // Prevent state change
                }
            } else if (action === 'discard') {
                narrativeAction = `Je jette ${item.name}.`;
                newInventory[itemIndex] = { ...item, quantity: item.quantity - 1 };
                toast({ title: "Objet jeté" });
            }
            
            changes.playerInventory = newInventory.filter(i => i.quantity > 0);
            return { ...prevSettings, ...changes };
        });
    
        return { narrativeAction, itemUsed: itemUsedOrDiscarded };
    }, [toast, setAdventureSettings]);

    const handleEquipItem = React.useCallback((itemIdToEquip: string) => {
        setAdventureSettings(prevSettings => {
            if (!prevSettings.rpgMode || !prevSettings.playerInventory) return prevSettings;
            const item = prevSettings.playerInventory.find(i => i.id === itemIdToEquip);
            if (!item || item.quantity <= 0) return prevSettings;

            let slotToEquip: keyof NonNullable<AdventureSettings['equippedItemIds']> | null = null;
            if (item.type === 'weapon') slotToEquip = 'weapon';
            else if (item.type === 'armor') slotToEquip = 'armor';
            else if (item.type === 'jewelry') slotToEquip = 'jewelry';

            if (!slotToEquip) return prevSettings;

            const newEquippedItemIds = { ...(prevSettings.equippedItemIds || { weapon: null, armor: null, jewelry: null }) };
            const newInventory = prevSettings.playerInventory.map(invItem => ({ ...invItem, isEquipped: invItem.isEquipped && invItem.type !== slotToEquip }));
            
            const currentlyEquippedItemId = newEquippedItemIds[slotToEquip];
            if (currentlyEquippedItemId) {
                const idx = newInventory.findIndex(i => i.id === currentlyEquippedItemId);
                if (idx > -1) newInventory[idx].isEquipped = false;
            }

            newEquippedItemIds[slotToEquip] = item.id;
            const newItemIndex = newInventory.findIndex(i => i.id === item.id);
            if (newItemIndex > -1) newInventory[newItemIndex].isEquipped = true;
            
            const updatedSettings = { ...prevSettings, equippedItemIds: newEquippedItemIds, playerInventory: newInventory };
            const effectiveStats = calculateEffectiveStats(updatedSettings);

            toast({ title: "Objet Équipé", description: `${item.name} a été équipé.` });
            return { ...updatedSettings, ...effectiveStats };
        });
    }, [toast, setAdventureSettings]);

    const handleUnequipItem = React.useCallback((slotToUnequip: keyof NonNullable<AdventureSettings['equippedItemIds']>) => {
        setAdventureSettings(prevSettings => {
            if (!prevSettings.rpgMode || !prevSettings.equippedItemIds || !prevSettings.playerInventory) return prevSettings;
            const itemIdToUnequip = prevSettings.equippedItemIds[slotToUnequip];
            if (!itemIdToUnequip) return prevSettings;
            
            let updatedSettings = { ...prevSettings };
            const newEquippedItemIds = { ...updatedSettings.equippedItemIds, [slotToUnequip]: null };
            updatedSettings.equippedItemIds = newEquippedItemIds;

            const newInventory = updatedSettings.playerInventory.map(invItem => invItem.id === itemIdToUnequip ? { ...invItem, isEquipped: false } : invItem);
            updatedSettings.playerInventory = newInventory;
            
            const itemUnequipped = prevSettings.playerInventory.find(i => i.id === itemIdToUnequip);
            const effectiveStats = calculateEffectiveStats(updatedSettings);
            
            toast({ title: "Objet Déséquipé", description: `${itemUnequipped?.name || 'Objet'} a été déséquipé.` });
            return { ...updatedSettings, ...effectiveStats };
        });
    }, [toast, setAdventureSettings]);

    const handleSellItem = React.useCallback((itemId: string) => {
        const itemToSell = adventureSettings.playerInventory?.find(invItem => invItem.id === itemId);
        if (!adventureSettings.rpgMode || !itemToSell) return;

        let sellPricePerUnit = Math.floor((itemToSell.goldValue || 0) / 2) || 0;
        if (itemToSell.goldValue === 1) sellPricePerUnit = 1;
        if (sellPricePerUnit <= 0) {
            toast({ title: "Invendable", variant: "default" });
            return;
        }

        if (itemToSell.quantity > 1) {
            setItemToSellDetails({ item: itemToSell, sellPricePerUnit });
            setSellQuantity(1);
        } else {
            confirmSellMultipleItems(1, itemToSell, sellPricePerUnit);
        }
    }, [adventureSettings, toast, setItemToSellDetails, setSellQuantity]);

    const confirmSellMultipleItems = React.useCallback((quantityToSell: number, itemBeingSold?: PlayerInventoryItem, pricePerUnit?: number) => {
        const itemToProcess = itemBeingSold || itemToSellDetails?.item;
        const finalPricePerUnit = pricePerUnit || itemToSellDetails?.sellPricePerUnit;
        if (!itemToProcess || !finalPricePerUnit) return;

        const totalSellPrice = finalPricePerUnit * quantityToSell;

        setAdventureSettings(prev => {
            const inventory = [...(prev.playerInventory || [])];
            const itemIndex = inventory.findIndex(i => i.id === itemToProcess.id);
            if (itemIndex === -1 || inventory[itemIndex].quantity < quantityToSell) return prev;

            inventory[itemIndex].quantity -= quantityToSell;
            return { ...prev, playerInventory: inventory.filter(i => i.quantity > 0), playerGold: (prev.playerGold || 0) + totalSellPrice };
        });

        toast({ title: "Vente réussie!", description: `Vous avez vendu ${quantityToSell}x ${itemToProcess.name} pour ${totalSellPrice} PO.` });
        setItemToSellDetails(null);
    }, [itemToSellDetails, setAdventureSettings, toast]);

    return {
        adventureSettings,
        setAdventureSettings,
        characters,
        setCharacters,
        narrativeMessages,
        setNarrativeMessages,
        currentLanguage,
        setCurrentLanguage,
        aiConfig,
        setAiConfig,
        baseAdventureSettings,
        setBaseAdventureSettings,
        baseCharacters,
        setBaseCharacters,
        loadAdventureState,
        createInitialState,
        handleTakeLoot,
        addCurrencyToPlayer,
        handlePlayerItemAction,
        handleEquipItem,
        handleUnequipItem,
        handleSellItem,
        confirmSellMultipleItems,
        itemToSellDetails,
        setItemToSellDetails,
        sellQuantity,
        setSellQuantity,
        getLocalizedText,
    };
}
