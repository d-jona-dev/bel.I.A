

"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { SaveData, AdventureSettings, Character, Message, AiConfig } from "@/types";

interface UseSaveLoadProps {
    adventureSettings: AdventureSettings;
    characters: Character[];
    narrativeMessages: Message[];
    currentLanguage: string;
    aiConfig: AiConfig;
    loadAdventureState: (data: SaveData) => void;
}

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).substring(2)}`;

export function useSaveLoad({
    adventureSettings,
    characters,
    narrativeMessages,
    currentLanguage,
    aiConfig,
    loadAdventureState,
}: UseSaveLoadProps) {
    const { toast } = useToast();

    const handleSave = React.useCallback(() => {
        const saveData: SaveData = {
            adventureSettings: adventureSettings,
            characters: characters,
            narrative: narrativeMessages,
            currentLanguage,
            saveFormatVersion: 2.6,
            timestamp: new Date().toISOString(),
            aiConfig: aiConfig,
        };
        const jsonString = JSON.stringify(saveData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aventurier_textuel_${adventureSettings.playerName || 'aventure'}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        React.startTransition(() => {
            toast({ title: "Aventure Sauvegardée", description: "Le fichier JSON a été téléchargé." });
        });
    }, [narrativeMessages, currentLanguage, toast, adventureSettings, characters, aiConfig]);

    const handleLoad = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const jsonString = e.target?.result as string;
                const loadedData: Partial<SaveData> = JSON.parse(jsonString);

                if (!loadedData.adventureSettings || !loadedData.characters || !loadedData.narrative || !Array.isArray(loadedData.narrative)) {
                    throw new Error("Structure de fichier de sauvegarde invalide ou manquante.");
                }
                await loadAdventureState(loadedData as SaveData);

            } catch (error: any) {
                console.error("Error loading adventure:", error);
                React.startTransition(() => {
                    toast({ title: "Erreur de Chargement", description: `Impossible de lire le fichier JSON: ${error.message}`, variant: "destructive" });
                });
            }
        };
        reader.readAsText(file);
        if(event.target) event.target.value = '';
    }, [toast, loadAdventureState]);
    
    const handleDownloadStory = (story: { title: string, adventureState: SaveData }) => {
        const jsonString = JSON.stringify(story.adventureState, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${story.title.toLowerCase().replace(/\s/g, '_')}_story.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportStory = (event: React.ChangeEvent<HTMLInputElement>, savedStories: any[], saveStories: (stories: any[]) => void) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonString = e.target?.result as string;
                const importedState = JSON.parse(jsonString) as SaveData;

                if (!importedState.adventureSettings || !importedState.characters || !importedState.narrative) {
                    throw new Error("Fichier de sauvegarde invalide.");
                }

                const newId = uid();
                const worldText = typeof importedState.adventureSettings.world === 'string' ? { fr: importedState.adventureSettings.world } : importedState.adventureSettings.world;
                const situationText = typeof importedState.adventureSettings.initialSituation === 'string' ? { fr: importedState.adventureSettings.initialSituation } : importedState.adventureSettings.initialSituation;

                const newStory = {
                    id: newId,
                    title: (worldText.fr || worldText.en || "Histoire Importée").substring(0, 40),
                    description: (situationText.fr || situationText.en || "...").substring(0, 100),
                    date: new Date().toISOString().split('T')[0],
                    adventureState: {
                        ...importedState,
                        adventureSettings: {
                            ...importedState.adventureSettings,
                            world: worldText,
                            initialSituation: situationText
                        }
                    },
                };

                saveStories([...savedStories, newStory]);
                toast({ title: "Histoire Importée", description: "L'aventure a été ajoutée à votre liste." });

            } catch (error) {
                console.error("Error importing story:", error);
                toast({ title: "Erreur d'Importation", description: `Impossible de lire le fichier JSON: ${error instanceof Error ? error.message : 'Format invalide'}.`, variant: "destructive" });
            }
        };
        reader.readAsText(file);
        if(event.target) event.target.value = ''; // Reset for next upload
    }


    return { handleSave, handleLoad, handleDownloadStory, handleImportStory };
}

