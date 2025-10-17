

"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { AdventureSettings, Character, Message, SaveData, AiConfig, PlayerInventoryItem, LootedItem, LocalizedText, Familiar } from "@/types";

const createInitialState = (): SaveData => ({
    adventureSettings: {
        world: { fr: "" },
        initialSituation: { fr: "" },
        rpgMode: false, // Forcé à false
        relationsMode: true,
        strategyMode: false, // Forcé à false
        comicModeActive: false,
        playerName: "Héros",
        playerClass: "Aventurier", // Conservé pour le contexte
        playerLevel: 1, // Conservé pour le contexte
        mapPointsOfInterest: [],
        mapImageUrl: null,
        playerPortraitUrl: null,
        playerDetails: "",
        playerDescription: "",
        playerOrientation: "",
        playerFaceSwapEnabled: false,
        playerLocationId: undefined, // Retiré car la stratégie est désactivée
        // NOUVEAU: S'assurer que timeManagement est toujours initialisé
        timeManagement: {
            enabled: false,
            day: 1,
            dayName: "Lundi",
            dayNames: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
            currentTime: "08:00",
            timeFormat: '24h',
            currentEvent: "",
            timeElapsedPerTurn: "00:15",
        },
    },
    characters: [],
    narrative: [],
    currentLanguage: "fr",
    saveFormatVersion: 2.6, // Gardé pour compatibilité
    timestamp: new Date().toISOString(),
    aiConfig: { llm: { source: 'gemini' }, image: { source: 'gemini' } },
});


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
    const [aiConfig, setAiConfig] = React.useState<AiConfig>(initialState.aiConfig!);
    
    const [baseAdventureSettings, setBaseAdventureSettings] = React.useState<AdventureSettings>(JSON.parse(JSON.stringify(initialState.adventureSettings)));
    const [baseCharacters, setBaseCharacters] = React.useState<Character[]>(JSON.parse(JSON.stringify(initialState.characters)));

    const [characterHistory, setCharacterHistory] = React.useState<Character[][]>([initialState.characters]);

    React.useEffect(() => {
        setCharacterHistory(prev => [...prev.slice(-10), characters]);
    }, [characters]);

    const undoLastCharacterState = (): Character[] | null => {
        if (characterHistory.length < 2) return null;
        const previousState = characterHistory[characterHistory.length - 2];
        setCharacterHistory(prev => prev.slice(0, -1));
        return previousState;
    };

    const loadAdventureState = React.useCallback((data: SaveData) => {
        // Fusionne les paramètres chargés avec les valeurs par défaut pour éviter les `undefined`
        const settingsWithDefaults: AdventureSettings = {
          ...createInitialState().adventureSettings,
          ...data.adventureSettings,
          rpgMode: false, // Forcer la désactivation
          strategyMode: false, // Forcer la désactivation
          // S'assurer que timeManagement a toutes les clés
          timeManagement: {
            ...createInitialState().adventureSettings.timeManagement!,
            ...(data.adventureSettings.timeManagement || {}),
          }
        };
        
        setAdventureSettings(settingsWithDefaults);
        const loadedCharacters = data.characters || [];
        setCharacters(loadedCharacters);
        setNarrativeMessages(data.narrative || createInitialState().narrative);
        setCurrentLanguage(data.currentLanguage || 'fr');
        setAiConfig(data.aiConfig || { llm: { source: 'gemini' }, image: { source: 'gemini' } });
        
        setBaseAdventureSettings(JSON.parse(JSON.stringify(settingsWithDefaults)));
        setBaseCharacters(JSON.parse(JSON.stringify(loadedCharacters)));
        setCharacterHistory([loadedCharacters]);

        toast({ title: "Aventure Chargée", description: "Votre partie a été chargée avec succès." });
    }, [toast]);

    // Fonctions simplifiées car RPG/Stratégie sont désactivés
    const handleTakeLoot = () => {};
    const addCurrencyToPlayer = () => {};
    const handlePlayerItemAction = () => ({ narrativeAction: "", itemUsed: undefined });
    const handleEquipItem = () => {};
    const handleUnequipItem = () => {};
    const handleSellItem = () => {};
    const confirmSellMultipleItems = () => {};

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
        itemToSellDetails: null,
        setItemToSellDetails: () => {},
        sellQuantity: 1,
        setSellQuantity: () => {},
        getLocalizedText,
        computedStats: null, // Plus de stats complexes
        characterHistory,
        undoLastCharacterState,
    };
}
// La fonction calculateEffectiveStats est retirée car non pertinente
export const calculateEffectiveStats = () => null;

