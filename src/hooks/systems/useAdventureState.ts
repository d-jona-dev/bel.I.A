
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
    if (!settings.rpgMode) return { playerMaxHp: 0, playerMaxMp: 0, playerArmorClass: 0, playerAttackBonus: 0, playerDamageBonus: "1" };

    // Equipment bonuses
    const equippedWeapon = settings.playerInventory?.find(item => item.id === settings.equippedItemIds?.weapon);
    const equippedArmor = settings.playerInventory?.find(item => item.id === settings.equippedItemIds?.armor);
    const equippedJewelry = settings.playerInventory?.find(item => item.id === settings.equippedItemIds?.jewelry);

    let bonusStr = 0;
    let bonusDex = 0;
    let bonusCon = 0;
    let bonusInt = 0;
    let bonusWis = 0;
    let bonusCha = 0;

    [equippedWeapon, equippedArmor, equippedJewelry].forEach(item => {
        if (!item?.statBonuses) return;
        bonusStr += item.statBonuses.str || 0;
        bonusDex += item.statBonuses.dex || 0;
        bonusCon += item.statBonuses.con || 0;
        bonusInt += item.statBonuses.int || 0;
        bonusWis += item.statBonuses.wis || 0;
        bonusCha += item.statBonuses.cha || 0;
    });

    const strMod = Math.floor(((settings.playerStrength ?? 8) + bonusStr - 10) / 2);
    const dexMod = Math.floor(((settings.playerDexterity ?? 8) + bonusDex - 10) / 2);
    const conMod = Math.floor(((settings.playerConstitution ?? 8) + bonusCon - 10) / 2);
    const intMod = Math.floor(((settings.playerIntelligence ?? 8) + bonusInt - 10) / 2);

    // Base stats
    let playerMaxHp = 10 + (settings.playerLevel || 1) * conMod;
    let playerMaxMp = (settings.playerMaxMp || 0) + (settings.playerLevel || 1) * intMod;
    let playerArmorClass = 10 + dexMod; // Base AC
    let playerAttackBonus = strMod;
    let playerDamageBonus = `${strMod >= 0 ? '+' : ''}${strMod}`;

    [equippedWeapon, equippedArmor, equippedJewelry].forEach(item => {
        if (!item?.statBonuses) return;
        playerMaxHp += item.statBonuses.hp || 0;
        playerAttackBonus += item.statBonuses.attack || 0;
    });
    
    // Armor AC calculation
    if (equippedArmor?.ac) {
        if (equippedArmor.ac.includes('+')) {
            const parts = equippedArmor.ac.split('+').map(s => s.trim());
            const baseArmorAc = parseInt(parts[0], 10);
            if (!isNaN(baseArmorAc)) playerArmorClass = baseArmorAc;
            
            if (parts[1].toLowerCase().includes('dex')) {
                const maxDexBonusMatch = parts[1].match(/\(max \+(\d+)\)/);
                if (maxDexBonusMatch) {
                    playerArmorClass += Math.min(dexMod, parseInt(maxDexBonusMatch[1], 10));
                } else {
                    playerArmorClass += dexMod;
                }
            }
        } else { 
            const armorAcValue = parseInt(equippedArmor.ac, 10);
            if (!isNaN(armorAcValue)) playerArmorClass = armorAcValue;
        }
    }
    
    // Add other item bonuses to AC
    if(equippedWeapon?.statBonuses?.ac) playerArmorClass += equippedWeapon.statBonuses.ac;
    if(equippedJewelry?.statBonuses?.ac) playerArmorClass += equippedJewelry.statBonuses.ac;

    // Damage Calculation
    if (equippedWeapon?.damage) {
        playerDamageBonus = equippedWeapon.damage;
        if (equippedWeapon.statBonuses?.damage) {
             playerDamageBonus += `${equippedWeapon.statBonuses.damage}`;
        }
        playerDamageBonus += `${strMod >= 0 ? `+${strMod}` : strMod}`;
    }

    return {
        playerMaxHp,
        playerMaxMp,
        playerArmorClass,
        playerAttackBonus,
        playerDamageBonus,
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
