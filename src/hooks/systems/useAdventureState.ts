
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { AdventureSettings, Character, Message, SaveData, AiConfig, LocalizedText, AdventureCondition } from "@/types";

const createInitialState = (): SaveData => ({
    adventureSettings: {
        world: { fr: "" },
        initialSituation: { fr: "" },
        rpgMode: false,
        relationsMode: true, 
        strategyMode: false,
        comicModeActive: true,
        playerName: "Héros",
        playerClass: "Aventurier", 
        playerLevel: 1, 
        playerPortraitUrl: null,
        playerDetails: "",
        playerDescription: "",
        playerOrientation: "",
        playerFaceSwapEnabled: false,
        playerLocationId: undefined, 
        systemPrompt: "",
        conditions: [],
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
    saveFormatVersion: 2.7,
    timestamp: new Date().toISOString(),
    aiConfig: { llm: { source: 'gemini' }, image: { source: 'gemini' } },
});


export const getLocalizedText = (field: LocalizedText, lang: string): string => {
    if (!field || typeof field !== 'object') return "";
    return field[lang] || field['fr'] || Object.values(field)[0] || "";
};

const CURRENT_ADVENTURE_STATE_KEY = 'currentAdventureState_v2.7';

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
    const [isLoaded, setIsLoaded] = React.useState(false);

    // Auto-save to localStorage whenever state changes
    React.useEffect(() => {
        if (!isLoaded) return; // Don't save before initial load is complete
        try {
            const currentSaveData: SaveData = {
                adventureSettings,
                characters,
                narrative: narrativeMessages,
                currentLanguage,
                aiConfig,
                saveFormatVersion: 2.7,
                timestamp: new Date().toISOString(),
            };
            localStorage.setItem(CURRENT_ADVENTURE_STATE_KEY, JSON.stringify(currentSaveData));
        } catch (error) {
            console.error("Failed to save current adventure state to localStorage:", error);
        }
    }, [adventureSettings, characters, narrativeMessages, currentLanguage, aiConfig, isLoaded]);

    const loadAdventureState = React.useCallback((data: SaveData) => {
        const settingsWithDefaults: AdventureSettings = {
          ...createInitialState().adventureSettings,
          ...data.adventureSettings,
          rpgMode: false,
          strategyMode: false,
          relationsMode: true,
          comicModeActive: data.adventureSettings.comicModeActive ?? true,
          timeManagement: {
            ...createInitialState().adventureSettings.timeManagement!,
            ...(data.adventureSettings.timeManagement || {}),
          },
          systemPrompt: data.adventureSettings.systemPrompt || '',
          conditions: data.adventureSettings.conditions || [],
        };
        
        // Prioritize the language passed with the data (coming from the history page selection).
        const languageToLoad = data.currentLanguage || currentLanguage;
        
        // Generate the initial narrative message based on the loaded language.
        const initialSitText = getLocalizedText(settingsWithDefaults.initialSituation, languageToLoad);
        const initialNarrative = [{ id: `msg-${Date.now()}`, type: 'system' as const, content: initialSitText, timestamp: Date.now() }];


        setAdventureSettings(settingsWithDefaults);
        const loadedCharacters = (data.characters || []).map(c => ({
            ...c,
            details: c.details || '',
            biographyNotes: c.biographyNotes || '',
        }));
        setCharacters(loadedCharacters);
        // Set the narrative to start with the correctly translated initial situation.
        setNarrativeMessages(initialNarrative);
        setCurrentLanguage(languageToLoad);
        setAiConfig(data.aiConfig || { llm: { source: 'gemini' }, image: { source: 'gemini' } });
        
        setBaseAdventureSettings(JSON.parse(JSON.stringify(settingsWithDefaults)));
        setBaseCharacters(JSON.parse(JSON.stringify(loadedCharacters)));
        setCharacterHistory([loadedCharacters]);

        toast({ title: "Aventure Chargée", description: "Votre partie a été chargée avec succès." });
        setIsLoaded(true); // Mark as loaded after setting state
    }, [toast, currentLanguage]);
    
    // Auto-load from localStorage on initial mount
    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedStateJSON = localStorage.getItem(CURRENT_ADVENTURE_STATE_KEY);
            if (savedStateJSON) {
                try {
                    const savedState: SaveData = JSON.parse(savedStateJSON);
                    // Basic validation
                    if (savedState.adventureSettings && savedState.characters && savedState.narrative) {
                       loadAdventureState(savedState);
                       console.log("Session d'aventure précédente chargée automatiquement.");
                    } else {
                       setIsLoaded(true); // Nothing to load, but we can start saving now
                    }
                } catch (error) {
                    console.error("Failed to parse saved adventure state:", error);
                    setIsLoaded(true);
                }
            } else {
                setIsLoaded(true); // No saved state found, ready to start fresh and save.
            }
        }
    }, [loadAdventureState]);


    React.useEffect(() => {
        if (!isLoaded) return;
        setCharacterHistory(prev => [...prev.slice(-10), characters]);
    }, [characters, isLoaded]);

    const undoLastCharacterState = (): Character[] | null => {
        if (characterHistory.length < 2) return null;
        const previousState = characterHistory[characterHistory.length - 2];
        setCharacterHistory(prev => prev.slice(0, -1));
        return previousState;
    };


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
        getLocalizedText,
        characterHistory,
        undoLastCharacterState,
    };
}
