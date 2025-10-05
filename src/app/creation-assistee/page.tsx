
"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Character, AdventureSettings, SaveData, MapPointOfInterest, AiConfig } from '@/types';
import { AdventureForm, type AdventureFormValues, type AdventureFormHandle } from '@/components/adventure-form';
import AssistantChat from '@/components/assistant-chat';
import { ScrollArea } from '@/components/ui/scroll-area';

// Helper to generate a unique ID
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).substring(2)}`;

const createNewAdventureState = (): SaveData => ({
    adventureSettings: {
        world: "",
        initialSituation: "",
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

export default function CreationAssisteePage() {
    const { toast } = useToast();
    const formRef = React.useRef<AdventureFormHandle>(null);
    const [isFormValid, setIsFormValid] = React.useState(false);
    const [aiConfig, setAiConfig] = React.useState<AiConfig>({
      llm: { source: 'gemini' },
      image: { source: 'gemini' }
    });

    React.useEffect(() => {
        try {
            const aiConfigFromStorage = localStorage.getItem('globalAiConfig');
            if (aiConfigFromStorage) {
                setAiConfig(JSON.parse(aiConfigFromStorage));
            }
        } catch (error) {
            console.error("Failed to load AI config from localStorage:", error);
        }
    }, []);

    const handleCreateAndLaunch = async () => {
        if (!formRef.current) return;
        const formValues = await formRef.current.getFormData();
        if (!formValues) return;

        const newId = uid();
        const newAdventureState = createNewAdventureState();

        newAdventureState.adventureSettings = {
            ...newAdventureState.adventureSettings,
            ...formValues,
            world: formValues.world || "Monde non défini",
            initialSituation: formValues.initialSituation || "Situation de départ non définie",
            playerName: formValues.playerName || "Héros",
            rpgMode: formValues.rpgMode ?? true,
            relationsMode: formValues.relationsMode ?? true,
            strategyMode: formValues.strategyMode ?? true,
            comicModeActive: formValues.comicModeActive ?? false,
            mapPointsOfInterest: (formValues.mapPointsOfInterest as MapPointOfInterest[] || []).map(poi => ({ ...poi, id: poi.id ?? uid() })),
        };
        newAdventureState.characters = (formValues.characters || []).filter(c => c.name && c.details).map(c => ({...c, id: c.id || uid()} as Character));
        newAdventureState.narrative = [{ id: `msg-${Date.now()}`, type: 'system', content: newAdventureState.adventureSettings.initialSituation, timestamp: Date.now() }];
        newAdventureState.aiConfig = aiConfig;

        const newStory = {
            id: newId,
            title: formValues.world?.substring(0, 40) || "Nouvelle Histoire Assistée",
            description: formValues.initialSituation?.substring(0, 100) || "...",
            date: new Date().toISOString().split('T')[0],
            adventureState: newAdventureState,
        };

        try {
            const storiesFromStorage = localStorage.getItem('adventureStories');
            const savedStories = storiesFromStorage ? JSON.parse(storiesFromStorage) : [];
            const updatedStories = [...savedStories, newStory];
            localStorage.setItem('adventureStories', JSON.stringify(updatedStories));
            
            toast({ title: "Nouvelle Aventure Créée!", description: "Lancement de l'histoire..." });
            
            localStorage.setItem('loadStoryIdOnMount', newId);
            window.location.href = '/';
        } catch (error) {
            console.error("Failed to save story:", error);
            toast({ title: "Erreur de sauvegarde", description: "Impossible de sauvegarder la nouvelle aventure.", variant: "destructive" });
        }
    };
    
    const handleApplySuggestion = async (suggestion: { field: keyof AdventureFormValues, value: string }) => {
        if (!formRef.current) return;
    
        if (suggestion.field === 'characterName' || suggestion.field === 'characterDetails') {
            const formApi = formRef.current;
            const currentCharacters = formApi.getValues('characters') || [];
            
            if (suggestion.field === 'characterName') {
                // Add a new character with the suggested name
                formApi.appendCharacter({ id: `char-${uid()}`, name: suggestion.value, details: '' });
                toast({ title: "Suggestion Appliquée", description: `Nouveau personnage '${suggestion.value}' ajouté.` });
            } else if (suggestion.field === 'characterDetails') {
                if (currentCharacters.length > 0) {
                    // Try to fill the details of the last character if their details are empty
                    const lastCharIndex = currentCharacters.length - 1;
                    if (!currentCharacters[lastCharIndex].details) {
                        formApi.setValue(`characters.${lastCharIndex}.details`, suggestion.value);
                    } else {
                        // Or add a new character with just details
                        formApi.appendCharacter({ id: `char-${uid()}`, name: '', details: suggestion.value });
                    }
                } else {
                    // No characters exist, add a new one with the details
                    formApi.appendCharacter({ id: `char-${uid()}`, name: '', details: suggestion.value });
                }
                 toast({ title: "Suggestion Appliquée", description: `Les détails du personnage ont été mis à jour.` });
            }
        } else {
            // Handle simple fields like world, initialSituation
            formRef.current.setValue(suggestion.field, suggestion.value, { shouldValidate: true, shouldDirty: true });
            toast({ title: "Suggestion Appliquée", description: `Le champ '${suggestion.field}' a été mis à jour.` });
        }
    };

    return (
        <div className="flex h-full">
            <div className="w-1/2 p-4 border-r flex flex-col">
                <Card className="flex-1 flex flex-col">
                    <CardHeader>
                        <CardTitle>Assistant Créatif</CardTitle>
                        <CardDescription>Discutez avec l'IA pour trouver l'inspiration, définir votre monde, vos personnages et la situation de départ.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden">
                        <AssistantChat
                            aiConfig={aiConfig}
                            onConfigChange={setAiConfig}
                            onApplySuggestion={handleApplySuggestion}
                        />
                    </CardContent>
                </Card>
            </div>
            <div className="w-1/2 p-4 flex flex-col">
                <Card className="flex-1 flex flex-col">
                    <CardHeader>
                        <CardTitle>Configuration de l'Aventure</CardTitle>
                        <CardDescription>Remplissez ce formulaire avec les idées de l'assistant ou vos propres créations.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full pr-4">
                            <AdventureForm
                                ref={formRef}
                                initialValues={createNewAdventureState().adventureSettings}
                                onFormValidityChange={setIsFormValid}
                                rpgMode={true} 
                                relationsMode={true}
                                strategyMode={true}
                                aiConfig={aiConfig}
                            />
                        </ScrollArea>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleCreateAndLaunch} disabled={!isFormValid} className="w-full">
                            Créer et Lancer l'Aventure
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
