
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { AdventureSettings, Character, Message, SaveData, AiConfig, PlayerInventoryItem, LootedItem, LocalizedText, Familiar } from "@/types";

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
    aiConfig: { llm: { source: 'gemini' }, image: { source: 'gemini' } },
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
    const baseAc = 10 + Math.floor(((stats.dexterity || 8) - 10) / 2);
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
    const defaultStats = {
        playerStrength: settings.playerStrength ?? 8,
        playerDexterity: settings.playerDexterity ?? 8,
        playerConstitution: settings.playerConstitution ?? 8,
        playerIntelligence: settings.playerIntelligence ?? 8,
        playerWisdom: settings.playerWisdom ?? 8,
        playerCharisma: settings.playerCharisma ?? 8,
        playerMaxHp: 0,
        playerMaxMp: 0,
        playerArmorClass: 0,
        playerAttackBonus: 0,
        playerDamageBonus: "1",
        bonuses: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0, hp: 0, mp: 0, ac: 0, attack: 0, damageValue: 0 }
    };
    if (!settings.rpgMode) {
        return defaultStats;
    }
    
    const baseStats = {
        playerStrength: settings.playerStrength ?? 8,
        playerDexterity: settings.playerDexterity ?? 8,
        playerConstitution: settings.playerConstitution ?? 8,
        playerIntelligence: settings.playerIntelligence ?? 8,
        playerWisdom: settings.playerWisdom ?? 8,
        playerCharisma: settings.playerCharisma ?? 8,
    };

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
    const activeFamiliar = (settings.familiars || []).find(f => f.isActive);

    const bonus = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0, hp: 0, mp: 0, ac: 0, attack: 0, damageValue: 0 };
    
    for (const item of equipped) {
        const b = item?.statBonuses || {};
        
        for (const [key, value] of Object.entries(b)) {
            const val = Number(value) || 0;
            const normalizedKey = key.toLowerCase().trim();
            
            switch (normalizedKey) {
                case "str":
                case "for":
                case "force":
                case "strength":
                    bonus.str += val;
                    break;
                case "dex":
                case "dexterity":
                case "dextérité":
                case "dexterité":
                    bonus.dex += val;
                    break;
                case "con":
                case "constitution":
                    bonus.con += val;
                    break;
                case "int":
                case "intelligence":
                    bonus.int += val;
                    break;
                case "wis":
                case "wisdom":
                case "sagesse":
                    bonus.wis += val;
                    break;
                case "cha":
                case "charisma":
                case "charisme":
                    bonus.cha += val;
                    break;
                case "hp":
                case "hitpoints":
                case "pv":
                case "vie":
                    bonus.hp += val;
                    break;
                case "mp":
                case "manapoints":
                case "pm":
                case "mana":
                    bonus.mp += val;
                    break;
                case "ac":
                case "armorclass":
                case "ca":
                case "armor":
                case "armure":
                    bonus.ac += val;
                    break;
                case "attack":
                case "attackbonus":
                case "attaque":
                    bonus.attack += val;
                    break;
                case "damage":
                case "dégâts":
                case "degats":
                    if (!isNaN(val)) {
                        bonus.damageValue += val;
                    }
                    break;
            }
        }
    }

    if (activeFamiliar) {
        const { type, value, description } = activeFamiliar.passiveBonus;
        const totalBonusValue = value * activeFamiliar.level;
        if (type !== 'narrative' && type !== 'gold_find' && type !== 'exp_gain') {
            const statKey = {
                strength: 'str',
                dexterity: 'dex',
                constitution: 'con',
                intelligence: 'int',
                wisdom: 'wis',
                charisma: 'cha',
                armor_class: 'ac',
                attack_bonus: 'attack',
            }[type];

            if (statKey) {
                (bonus as any)[statKey] += totalBonusValue;
            }
        }
    }
    
    const effectivePrimaryStats = {
        strength: baseStats.playerStrength + bonus.str,
        dexterity: baseStats.playerDexterity + bonus.dex,
        constitution: baseStats.playerConstitution + bonus.con,
        intelligence: baseStats.playerIntelligence + bonus.int,
        wisdom: baseStats.playerWisdom + bonus.wis,
        charisma: baseStats.playerCharisma + bonus.cha,
    };

    const baseDerived = calculateBaseDerivedStats({
        level: settings.playerLevel ?? 1,
        characterClass: settings.playerClass ?? '',
        ...effectivePrimaryStats,
    });
    
    const equippedArmor = equipped.find(i => i.type === 'armor');
    let finalArmorClass = baseDerived.armorClass; 
    if (equippedArmor?.ac && typeof equippedArmor.ac === "string") {
        if (equippedArmor.ac.includes('+')) {
            const parts = equippedArmor.ac.split('+').map(s => s.trim());
            const baseArmorAc = parseInt(parts[0], 10);
            if (!isNaN(baseArmorAc)) finalArmorClass = baseArmorAc;
            
            if (parts[1].toLowerCase().includes('dex')) {
                const dexMod = Math.floor((effectivePrimaryStats.dexterity - 10) / 2);
                const maxDexBonusMatch = parts[1].match(/\(max \+(\d+)\)/);
                if (maxDexBonusMatch) {
                    finalArmorClass += Math.min(dexMod, parseInt(maxDexBonusMatch[1], 10));
                } else {
                    finalArmorClass += dexMod;
                }
            }
        } else {
            const armorAcValue = parseInt(String(equippedArmor.ac), 10);
            if (!isNaN(armorAcValue)) finalArmorClass = armorAcValue;
        }
    }
    finalArmorClass += bonus.ac;

    const equippedWeapon = equipped.find(i => i.type === 'weapon');
    let finalDamageBonus = baseDerived.damageBonus;
    if (equippedWeapon?.damage && typeof equippedWeapon.damage === 'string') {
        const strMod = Math.floor((effectivePrimaryStats.strength - 10) / 2);
        let baseDamage = equippedWeapon.damage;
        let totalBonus = strMod + bonus.damageValue;
        
        const existingBonusMatch = baseDamage.match(/([+-]\d+)/);
        if (existingBonusMatch) {
            totalBonus += parseInt(existingBonusMatch[0], 10);
            baseDamage = baseDamage.replace(existingBonusMatch[0], '').trim();
        }

        finalDamageBonus = totalBonus !== 0 ? `${baseDamage}${totalBonus > 0 ? '+' : ''}${totalBonus}` : baseDamage;
    }

    return {
        playerStrength: effectivePrimaryStats.strength,
        playerDexterity: effectivePrimaryStats.dexterity,
        playerConstitution: effectivePrimaryStats.constitution,
        playerIntelligence: effectivePrimaryStats.intelligence,
        playerWisdom: effectivePrimaryStats.wisdom,
        playerCharisma: effectivePrimaryStats.charisma,
        playerMaxHp: baseDerived.maxHitPoints + bonus.hp,
        playerMaxMp: baseDerived.maxManaPoints + bonus.mp,
        playerArmorClass: finalArmorClass,
        playerAttackBonus: baseDerived.attackBonus + bonus.attack,
        playerDamageBonus: finalDamageBonus,
        bonuses: bonus, // Return the aggregated bonuses
    };
}

export const getLocalizedText = (field: LocalizedText, lang: string): string => {
    if (!field || typeof field !== 'object') return "";
    return field[lang] || field['en'] || field['fr'] || Object.values(field)[0] || "";
};

export function useAdventureState() {
    const { toast } = useToast();
    const initialState = React.useMemo(() => createInitialState(), []);

    const [adventureSettings, setAdventureSettings] = React.useState<AdventureSettings>(initialState.adventureSettings);
    const [characters, setCharacters] = React.useState<Character[]>(initialState.characters);
    const [narrativeMessages, setNarrativeMessages] = React.useState<Message[]>(initialState.narrative);
    const [currentLanguage, setCurrentLanguage] = React.useState<string>(initialState.currentLanguage);
    const [aiConfig, setAiConfig] = React.useState<AiConfig>(initialState.aiConfig);
    
    const [baseAdventureSettings, setBaseAdventureSettings] = React.useState<AdventureSettings>(JSON.parse(JSON.stringify(initialState.adventureSettings)));
    const [baseCharacters, setBaseCharacters] = React.useState<Character[]>(JSON.parse(JSON.stringify(initialState.characters)));

    const [computedStats, setComputedStats] = React.useState(() => calculateEffectiveStats(initialState.adventureSettings));
    const [itemToSellDetails, setItemToSellDetails] = React.useState<{ item: PlayerInventoryItem; sellPricePerUnit: number } | null>(null);
    const [sellQuantity, setSellQuantity] = React.useState(1);
    
    React.useEffect(() => {
        const newStats = calculateEffectiveStats(adventureSettings);
        setComputedStats(newStats);
    }, [
        adventureSettings.equippedItemIds,
        adventureSettings.playerInventory,
        adventureSettings.familiars,
        adventureSettings.playerStrength,
        adventureSettings.playerDexterity,
        adventureSettings.playerConstitution,
        adventureSettings.playerIntelligence,
        adventureSettings.playerWisdom,
        adventureSettings.playerCharisma,
        adventureSettings.playerLevel,
        adventureSettings.rpgMode,
    ]);


    const loadAdventureState = React.useCallback((data: SaveData) => {
        if (data.saveFormatVersion !== createInitialState().saveFormatVersion) {
            console.warn("⚠️ Version de sauvegarde différente, la compatibilité n'est pas garantie.");
            toast({ title: "Version de sauvegarde obsolète", description: "Certaines fonctionnalités pourraient ne pas fonctionner comme prévu.", variant: "destructive" });
        }

        const settingsWithDefaults = { ...createInitialState().adventureSettings, ...data.adventureSettings };
        
        setAdventureSettings(settingsWithDefaults);
        setCharacters(data.characters || []);
        setNarrativeMessages(data.narrative || createInitialState().narrative);
        setCurrentLanguage(data.currentLanguage || 'fr');
        setAiConfig(data.aiConfig || { llm: { source: 'gemini' }, image: { source: 'gemini' } });
        
        setBaseAdventureSettings(JSON.parse(JSON.stringify(settingsWithDefaults)));
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
                const currencyItem = lootMessage.loot.find(item => item.name && (item.name.toLowerCase().includes("pièces d'or") || item.name.toLowerCase().includes("gold")));
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
                    const newQty = Math.max(0, item.quantity - 1);
                    newInventory[itemIndex] = { ...item, quantity: newQty };
    
                    if (item.effectDetails?.type === 'heal') {
                        const newHp = Math.min(prevSettings.playerMaxHp || 0, (prevSettings.playerCurrentHp || 0) + item.effectDetails.amount);
                        changes.playerCurrentHp = newHp;
                        toast({ title: "Soin!", description: `Vous récupérez ${item.effectDetails.amount} PV.` });
                    }
    
                } else {
                    toast({ title: "Non utilisable", description: `Vous ne pouvez pas "utiliser" un ${item.type}. Essayez de l'équiper.` });
                    return prevSettings;
                }
            } else if (action === 'discard') {
                narrativeAction = `Je jette ${item.name}.`;
                const newQty = Math.max(0, item.quantity - 1);
                newInventory[itemIndex] = { ...item, quantity: newQty };
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

            let newEquippedItemIds = { ...(prevSettings.equippedItemIds || { weapon: null, armor: null, jewelry: null }) };
            let newInventory = prevSettings.playerInventory.map(invItem => ({ ...invItem, isEquipped: invItem.isEquipped && invItem.type !== slotToEquip }));
            
            const currentlyEquippedItemId = newEquippedItemIds[slotToEquip];
            if (currentlyEquippedItemId) {
                const idx = newInventory.findIndex(i => i.id === currentlyEquippedItemId);
                if (idx > -1) newInventory[idx].isEquipped = false;
            }

            newEquippedItemIds[slotToEquip] = item.id;
            const newItemIndex = newInventory.findIndex(i => i.id === item.id);
            if (newItemIndex > -1) newInventory[newItemIndex].isEquipped = true;
            
            toast({ title: "Objet Équipé", description: `${item.name} a été équipé.` });
            const updatedSettings = { ...prevSettings, equippedItemIds: newEquippedItemIds, playerInventory: newInventory };
            return updatedSettings;
        });
    }, [toast]);

    const handleUnequipItem = React.useCallback((slotToUnequip: keyof NonNullable<AdventureSettings['equippedItemIds']>) => {
        setAdventureSettings(prevSettings => {
            if (!prevSettings.rpgMode || !prevSettings.equippedItemIds || !prevSettings.playerInventory) return prevSettings;
            const itemIdToUnequip = prevSettings.equippedItemIds[slotToUnequip];
            if (!itemIdToUnequip) return prevSettings;
            
            let newEquippedItemIds = { ...prevSettings.equippedItemIds, [slotToUnequip]: null };
            let newInventory = prevSettings.playerInventory.map(invItem => invItem.id === itemIdToUnequip ? { ...invItem, isEquipped: false } : invItem);
            
            const itemUnequipped = prevSettings.playerInventory.find(i => i.id === itemIdToUnequip);
            toast({ title: "Objet Déséquipé", description: `${itemUnequipped?.name || 'Objet'} a été déséquipé.` });

            const updatedSettings = { ...prevSettings, equippedItemIds: newEquippedItemIds, playerInventory: newInventory };
            return updatedSettings;
        });
    }, [toast]);

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
        computedStats,
    };
}
