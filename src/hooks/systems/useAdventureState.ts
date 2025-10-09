
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

export function calculateEffectiveStats(settings: AdventureSettings) {
    if (!settings.rpgMode) return { playerMaxHp: 0, playerMaxMp: 0, playerArmorClass: 0, playerAttackBonus: 0, playerDamageBonus: "1" };

    const baseMaxHp = 10 + (settings.playerConstitution || 8) * 2;
    const baseMaxMp = (settings.playerIntelligence || 8);
    const baseAc = 10 + (settings.playerDexterity || 8);

    let equippedMaxHpBonus = 0;
    let equippedMaxMpBonus = 0;
    let equippedAcBonus = 0;
    let equippedAttackBonus = 0;
    let equippedDamageBonus = 0;

    const equippedWeapon = settings.playerInventory?.find(item => item.id === settings.equippedItemIds?.weapon);
    const equippedArmor = settings.playerInventory?.find(item => item.id === settings.equippedItemIds?.armor);
    const equippedJewelry = settings.playerInventory?.find(item => item.id === settings.equippedItemIds?.jewelry);

    [equippedWeapon, equippedArmor, equippedJewelry].forEach(item => {
        if (!item?.statBonuses) return;
        equippedMaxHpBonus += item.statBonuses.hp || 0;
        equippedAcBonus += item.statBonuses.ac || 0;
        equippedAttackBonus += item.statBonuses.attack || 0;
    });

    const finalMaxHp = baseMaxHp + equippedMaxHpBonus;
    const finalMaxMp = baseMaxMp + equippedMaxMpBonus;
    
    let finalAc = baseAc + equippedAcBonus;
    if (equippedArmor?.ac) {
      if (equippedArmor.ac.includes('+')) {
        const parts = equippedArmor.ac.split('+').map(s => s.trim());
        const baseArmorAc = parseInt(parts[0], 10);
        if(!isNaN(baseArmorAc)) finalAc = baseArmorAc;
        if (parts[1].toLowerCase().includes('dex')) {
          const maxDexBonusMatch = parts[1].match(/\(max \+(\d+)\)/);
          const dexMod = Math.floor(((settings.playerDexterity || 8) - 10) / 2);
          if (maxDexBonusMatch) {
            finalAc += Math.min(dexMod, parseInt(maxDexBonusMatch[1], 10));
          } else {
            finalAc += dexMod;
          }
        }
      } else {
        const armorAcValue = parseInt(equippedArmor.ac, 10);
        if (!isNaN(armorAcValue)) finalAc = armorAcValue;
      }
    }


    const strengthMod = Math.floor(((settings.playerStrength || 8) - 10) / 2);
    const finalAttackBonus = (settings.playerAttackBonus || 0) + strengthMod + equippedAttackBonus;
    const baseDamage = equippedWeapon?.damage || "1d4";
    const finalDamageBonus = `${baseDamage}${strengthMod >= 0 ? `+${strengthMod}` : strengthMod}`;

    return {
        playerMaxHp: finalMaxHp,
        playerMaxMp: finalMaxMp,
        playerArmorClass: finalAc,
        playerAttackBonus: finalAttackBonus,
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


    