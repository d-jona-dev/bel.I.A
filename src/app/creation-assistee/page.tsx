

"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Character, AdventureSettings, SaveData, MapPointOfInterest, PlayerAvatar, TimeManagementSettings, AiConfig, LocalizedText } from '@/types';
import { AdventureForm, type AdventureFormValues, type AdventureFormHandle } from '@/components/adventure-form';
import AssistantChat from '@/components/assistant-chat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { i18n, type Language } from "@/lib/i18n";

// Helper to generate a unique ID
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).substring(2)}`;

const createNewAdventureState = (): SaveData => ({
    adventureSettings: {
        world: { fr: "" },
        initialSituation: { fr: "" },
        rpgMode: true,
        relationsMode: true,
        strategyMode: true,
        comicModeActive: true,
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
    const [currentLanguage, setCurrentLanguage] = React.useState<Language>('fr');
    const lang = i18n[currentLanguage];

    const initialAdventureState = React.useMemo(() => createNewAdventureState(), []);

    React.useEffect(() => {
        try {
            const savedLanguage = localStorage.getItem('adventure_language') as Language;
            if (savedLanguage && i18n[savedLanguage]) {
                setCurrentLanguage(savedLanguage);
            }
            const aiConfigFromStorage = localStorage.getItem('globalAiConfig');
            if (aiConfigFromStorage) {
                setAiConfig(JSON.parse(aiConfigFromStorage));
            }
        } catch (error) {
            console.error("Failed to load AI config from localStorage:", error);
        }
    }, []);
    
    const handleAiConfigChange = (newConfig: AiConfig) => {
        setAiConfig(newConfig);
        localStorage.setItem('globalAiConfig', JSON.stringify(newConfig));
        toast({ title: lang.aiConfigTitle + " mise à jour." });
    };

    const handleCreateAndLaunch = async () => {
        if (!formRef.current) return;
        const formValues = await formRef.current.getFormData();
        if (!formValues) return;

        const newId = uid();
        const newAdventureState = JSON.parse(JSON.stringify(initialAdventureState));

        newAdventureState.adventureSettings = {
            ...newAdventureState.adventureSettings,
            ...formValues,
            world: formValues.world.fr ? formValues.world : { fr: "Monde non défini" },
            initialSituation: formValues.initialSituation.fr ? formValues.initialSituation : { fr: "Situation de départ non définie" },
            playerName: formValues.playerName || "Héros",
            rpgMode: formValues.rpgMode ?? true,
            relationsMode: formValues.relationsMode ?? true,
            strategyMode: formValues.strategyMode ?? true,
            comicModeActive: formValues.comicModeActive ?? false,
            mapPointsOfInterest: (formValues.mapPointsOfInterest as MapPointOfInterest[] || []).map(poi => ({ ...poi, id: poi.id ?? uid() })),
        };
        newAdventureState.characters = (formValues.characters || []).filter(c => c.name && (c.details || c.isPlaceholder)).map(c => ({...c, id: c.id || uid()} as Character));
        newAdventureState.narrative = [{ id: `msg-${Date.now()}`, type: 'system', content: newAdventureState.adventureSettings.initialSituation.fr || "", timestamp: Date.now() }];
        newAdventureState.aiConfig = aiConfig;
        
        const newStory = {
            id: newId,
            title: formValues.world.fr?.substring(0, 40) || "Nouvelle Histoire Assistée",
            description: formValues.initialSituation.fr?.substring(0, 100) || "...",
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
    
    const handleApplySuggestion = (suggestion: { field: keyof AdventureFormValues, value: any }) => {
        if (!formRef.current) return;

        const formApi = formRef.current;
        const currentCharacters = formApi.getValues('characters') || [];

        if (suggestion.field === 'characterName') {
            formApi.append('characters', { id: `char-${uid()}`, name: suggestion.value, details: '' });
            toast({ title: "Suggestion Appliquée", description: `Nouveau personnage '${suggestion.value}' ajouté.` });
        
        } else if (suggestion.field === 'characterPlaceholder') {
            formApi.append('characters', { id: `char-ph-${uid()}`, name: suggestion.value, details: 'Emplacement', isPlaceholder: true });
            toast({ title: "Suggestion Appliquée", description: `Emplacement de personnage '${suggestion.value}' ajouté.` });

        } else if (suggestion.field === 'characterDetails') {
            const lastCharIndex = currentCharacters.length - 1;
            if (lastCharIndex >= 0 && !currentCharacters[lastCharIndex].details) {
                formApi.setValue(`characters.${lastCharIndex}.details`, suggestion.value, { shouldValidate: true, shouldDirty: true });
            } else {
                formApi.append('characters', { id: `char-${uid()}`, name: '', details: suggestion.value });
            }
            toast({ title: "Suggestion Appliquée", description: `Les détails du personnage ont été mis à jour.` });

        } else if (typeof suggestion.value === 'boolean') {
             formApi.setValue(suggestion.field as any, suggestion.value, { shouldValidate: true, shouldDirty: true });
             toast({ title: "Suggestion Appliquée", description: `Le mode '${suggestion.field}' a été ${suggestion.value ? 'activé' : 'désactivé'}.` });
        
        } else if (suggestion.field === 'world' || suggestion.field === 'initialSituation') {
            if (typeof suggestion.value === 'object' && suggestion.value !== null) {
                formApi.setValue(suggestion.field, suggestion.value, { shouldValidate: true, shouldDirty: true });
            } else if (typeof suggestion.value === 'string') {
                // Fallback for models that still return a string
                formApi.setValue(suggestion.field, { fr: suggestion.value }, { shouldValidate: true, shouldDirty: true });
            }
            toast({ title: "Suggestion Appliquée", description: `Le champ '${suggestion.field}' a été mis à jour.` });

        } else {
            // Handle other simple string fields
            formApi.setValue(suggestion.field as any, suggestion.value, { shouldValidate: true, shouldDirty: true });
            toast({ title: "Suggestion Appliquée", description: `Le champ '${suggestion.field}' a été mis à jour.` });
        }
    };


    return (
        <div className="flex h-full">
            <div className="w-1/2 p-4 border-r flex flex-col">
                <Card className="flex-1 flex flex-col">
                    <CardHeader>
                        <CardTitle>{lang.assistedCreationTitle}</CardTitle>
                        <CardDescription>{lang.assistedCreationDescription}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden">
                        <AssistantChat
                            aiConfig={aiConfig}
                            onConfigChange={handleAiConfigChange}
                            onApplySuggestion={handleApplySuggestion}
                            currentLanguage={currentLanguage}
                        />
                    </CardContent>
                </Card>
            </div>
            <div className="w-1/2 p-4 flex flex-col">
                <Card className="flex-1 flex flex-col">
                    <CardHeader>
                        <CardTitle>{lang.adventureConfigTitle}</CardTitle>
                        <CardDescription>{lang.adventureConfigDescription}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full pr-4">
                            <AdventureForm
                                ref={formRef}
                                initialValues={initialAdventureState.adventureSettings}
                                onFormValidityChange={setIsFormValid}
                                rpgMode={true} 
                                relationsMode={true}
                                strategyMode={true}
                                aiConfig={aiConfig}
                                currentLanguage={currentLanguage}
                            />
                        </ScrollArea>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleCreateAndLaunch} disabled={!isFormValid} className="w-full">
                            {lang.createAndLaunchButton}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
