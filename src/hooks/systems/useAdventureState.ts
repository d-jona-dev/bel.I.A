
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { AdventureSettings, Character, Message, SaveData, AiConfig, PlayerInventoryItem } from "@/types";

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

    // Initial base stats from settings
    let stats = {
        strength: settings.playerStrength ?? 8,
        dexterity: settings.playerDexterity ?? 8,
        constitution: settings.playerConstitution ?? 8,
        intelligence: settings.playerIntelligence ?? 8,
        wisdom: settings.playerWisdom ?? 8,
        charisma: settings.playerCharisma ?? 8,
        luck: 0, // Not an official stat yet, but can be used for custom logic
    };
    
    // Reset to base before applying bonuses
    const baseAttributes = {
        playerStrength: 8,
        playerDexterity: 8,
        playerConstitution: 8,
        playerIntelligence: 8,
        playerWisdom: 8,
        playerCharisma: 8,
    };
    
    let effectiveStats = { ...baseAttributes };

    let bonusAc = 0;
    let bonusHp = 0;
    let bonusAttack = 0;

    // Application des bonus d’équipement
    for (const item of equipped) {
        const b = item?.statBonuses || {};
        for (const [key, value] of Object.entries(b)) {
            const val = Number(value) || 0;
            switch (key.toLowerCase()) {
                case "str": case "force": case "strength":
                    effectiveStats.playerStrength += val; break;
                case "dex": case "dexterite": case "dexterity":
                    effectiveStats.playerDexterity += val; break;
                case "con": case "constitution":
                    effectiveStats.playerConstitution += val; break;
                case "int": case "intelligence":
                    effectiveStats.playerIntelligence += val; break;
                case "wis": case "sagesse": case "wisdom":
                    effectiveStats.playerWisdom += val; break;
                case "cha": case "charisme": case "charisma": case "chance": // Map chance to charisma
                    effectiveStats.playerCharisma += val; break;
                case "hp": bonusHp += val; break;
                case "ac": bonusAc += val; break;
                case "attack": bonusAttack += val; break;
            }
        }
    }

    // Calculs dérivés basés sur les stats finales
    const baseDerived = calculateBaseDerivedStats({
        level: settings.playerLevel ?? 1,
        characterClass: settings.playerClass ?? '',
        strength: effectiveStats.playerStrength,
        dexterity: effectiveStats.playerDexterity,
        constitution: effectiveStats.playerConstitution,
        intelligence: effectiveStats.playerIntelligence,
        wisdom: effectiveStats.playerWisdom,
        charisma: effectiveStats.playerCharisma,
    });
    
    // Handle complex AC from armor
    const equippedArmor = equipped.find(i => i.type === 'armor');
    let finalArmorClass = baseDerived.armorClass; // Start with AC from dexterity
    if (equippedArmor?.ac) {
         if (equippedArmor.ac.includes('+')) {
            const parts = equippedArmor.ac.split('+').map(s => s.trim());
            const baseArmorAc = parseInt(parts[0], 10);
            if (!isNaN(baseArmorAc)) finalArmorClass = baseArmorAc; // Armor sets a new base
            
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
    finalArmorClass += bonusAc; // Add bonuses from other items like jewelry

    // Handle complex damage from weapon
    const equippedWeapon = equipped.find(i => i.type === 'weapon');
    let finalDamageBonus = baseDerived.damageBonus;
    if (equippedWeapon?.damage) {
        const strMod = Math.floor((effectiveStats.playerStrength - 10) / 2);
        finalDamageBonus = equippedWeapon.damage;
        if(strMod !== 0) {
            finalDamageBonus += `${strMod > 0 ? '+' : ''}${strMod}`;
        }
        if (equippedWeapon.statBonuses?.damage) {
             finalDamageBonus += equippedWeapon.statBonuses.damage;
        }
    }


    return {
        playerStrength: effectiveStats.playerStrength,
        playerDexterity: effectiveStats.playerDexterity,
        playerConstitution: effectiveStats.playerConstitution,
        playerIntelligence: effectiveStats.playerIntelligence,
        playerWisdom: effectiveStats.playerWisdom,
        playerCharisma: effectiveStats.playerCharisma,
        playerMaxHp: baseDerived.maxHitPoints + bonusHp,
        playerMaxMp: baseDerived.maxManaPoints,
        playerArmorClass: finalArmorClass,
        playerAttackBonus: baseDerived.attackBonus + bonusAttack,
        playerDamageBonus: finalDamageBonus,
    };
}


export function useAdventureState() {
    const { toast } = useToast();
    const initialState = createInitialState();

    const [adventureSettings, setAdventureSettings] = React.useState<AdventureSettings>(initialState.adventureSettings);
    const [characters, setCharacters] = React.useState<Character[]>(initialState.characters);
    const [narrativeMessages, setNarrativeMessages] = React.useState<Message[]>(initialState.narrative);
    const [currentLanguage, setCurrentLanguage] = React.useState<string>(initialState.currentLanguage);
    const [aiConfig, setAiConfig] = React.useState<AiConfig>(initialState.aiConfig || { llm: { source: 'gemini' }, image: { source: 'gemini' } });
    
    // Store the base state for resets
    const [baseAdventureSettings, setBaseAdventureSettings] = React.useState<AdventureSettings>(JSON.parse(JSON.stringify(initialState.adventureSettings)));
    const [baseCharacters, setBaseCharacters] = React.useState<Character[]>(JSON.parse(JSON.stringify(initialState.characters)));

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
        
        // Update base states for resets
        setBaseAdventureSettings(JSON.parse(JSON.stringify(finalSettings)));
        setBaseCharacters(JSON.parse(JSON.stringify(data.characters || [])));

        toast({ title: "Aventure Chargée", description: "Votre partie a été chargée avec succès." });
    }, [toast]);
    
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
        baseCharacters,
        loadAdventureState,
        createInitialState,
    };
}

    