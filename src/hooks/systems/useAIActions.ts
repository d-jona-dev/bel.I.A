

"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { AdventureSettings, Character, Message, ActiveCombat, LootedItem, PlayerInventoryItem, Familiar, AiConfig, LocalizedText, GenerateAdventureInput, Combatant, MapPointOfInterest } from "@/types";

import { generateAdventure } from "@/ai/flows/generate-adventure";
import type { GenerateAdventureFlowOutput, CharacterUpdateSchema, AffinityUpdateSchema, RelationUpdateSchema, CombatUpdatesSchema, NewFamiliarSchema } from "@/ai/flows/generate-adventure";
import { generateSceneImage } from "@/ai/flows/generate-scene-image";
import type { GenerateSceneImageInput, GenerateSceneImageFlowOutput } from "@/ai/flows/generate-scene-image";
import { suggestQuestHook } from "@/ai/flows/suggest-quest-hook";
import type { SuggestQuestHookInput } from "@/ai/flows/suggest-quest-hook";
import { materializeCharacter } from "@/ai/flows/materialize-character";
import type { MaterializeCharacterInput } from "@/ai/flows/materialize-character";
import { summarizeHistory } from "@/ai/flows/summarize-history";
import type { SummarizeHistoryInput } from "@/ai/flows/summarize-history";
import { calculateEffectiveStats, getLocalizedText } from "@/hooks/systems/useAdventureState";

const PLAYER_ID = "player";

interface UseAIActionsProps {
    adventureSettings: AdventureSettings;
    characters: Character[];
    baseCharacters: Character[];
    narrativeMessages: Message[];
    currentLanguage: string;
    aiConfig: AiConfig;
    isLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setNarrativeMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    setAdventureSettings: React.Dispatch<React.SetStateAction<AdventureSettings>>;
    setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
}

export function useAIActions({
    adventureSettings,
    characters,
    baseCharacters,
    narrativeMessages,
    currentLanguage,
    aiConfig,
    isLoading,
    setIsLoading,
    setNarrativeMessages,
    setAdventureSettings,
    setCharacters,
}: UseAIActionsProps) {
    const { toast } = useToast();
    const [isSuggestingQuest, setIsSuggestingQuest] = React.useState(false);
    const [isRegenerating, setIsRegenerating] = React.useState(false);
    const [isGeneratingItemImage, setIsGeneratingItemImage] = React.useState(false);
    
    const handleCharacterHistoryUpdate = React.useCallback((updates: CharacterUpdateSchema[]) => {
        if (!updates || updates.length === 0) return;
        setCharacters(prevChars => {
            let changed = false;
            const updatedChars = prevChars.map(char => {
                const charUpdates = updates.filter(u => u.characterName.toLowerCase() === char.name.toLowerCase());
                if (charUpdates.length > 0) {
                    changed = true;
                    const newHistory = charUpdates.map(u => u.historyEntry);
                    return { ...char, history: [...(char.history || []), ...newHistory].slice(-20) };
                }
                return char;
            });
            if (changed) {
                 toast({ title: "Souvenir Enregistré", description: `L'historique de ${updates.map(u => u.characterName).join(', ')} a été mis à jour.` });
                return updatedChars;
            }
            return prevChars;
        });
    }, [toast, setCharacters]);

    const handleAffinityUpdates = React.useCallback((updates: AffinityUpdateSchema[]) => {
        if (!adventureSettings.relationsMode || !updates || updates.length === 0) return;
        setCharacters(prevChars => {
            let changed = false;
            const updatedChars = prevChars.map(char => {
                const affinityUpdate = updates.find(u => u.characterName.toLowerCase() === char.name.toLowerCase());
                if (affinityUpdate) {
                    changed = true;
                    const newAffinity = Math.max(0, Math.min(100, (char.affinity ?? 50) + affinityUpdate.change));
                    return { ...char, affinity: newAffinity };
                }
                return char;
            });
            if (changed) return updatedChars;
            return prevChars;
        });
    }, [adventureSettings.relationsMode, setCharacters]);

    const handleRelationUpdatesFromAI = React.useCallback((updates: RelationUpdateSchema[]) => {
        if (!adventureSettings.relationsMode || !updates || !updates.length) return;
        setCharacters(prevChars => {
            let charsCopy = JSON.parse(JSON.stringify(prevChars));
            let changed = false;
            updates.forEach(update => {
                const sourceCharIndex = charsCopy.findIndex((c: Character) => c.name.toLowerCase() === update.characterName.toLowerCase());
                if (sourceCharIndex === -1) return;
                
                let targetId: string | null = update.targetName.toLowerCase() === adventureSettings.playerName?.toLowerCase() ? PLAYER_ID : charsCopy.find((c:Character) => c.name.toLowerCase() === update.targetName.toLowerCase())?.id || null;
                if (!targetId) return;

                if (!charsCopy[sourceCharIndex].relations) charsCopy[sourceCharIndex].relations = {};
                charsCopy[sourceCharIndex].relations![targetId] = update.newRelation;
                changed = true;
            });
            if (changed) return charsCopy;
            return prevChars;
        });
    }, [adventureSettings.relationsMode, adventureSettings.playerName, setCharacters]);
    
    const handleTimeUpdate = React.useCallback((timeUpdateFromAI: { newEvent?: string } | undefined) => {
        setAdventureSettings(prev => {
            if (!prev.timeManagement?.enabled) return prev;
            const { currentTime, timeElapsedPerTurn, day, dayNames = [] } = prev.timeManagement;
            const [h1, m1] = currentTime.split(':').map(Number);
            const [h2, m2] = timeElapsedPerTurn.split(':').map(Number);
            let totalMinutes = m1 + m2;
            let totalHours = h1 + h2 + Math.floor(totalMinutes / 60);
            let newDay = day;
            if (totalHours >= 24) {
                newDay += Math.floor(totalHours / 24);
                totalHours %= 24;
            }
            return {
                ...prev,
                timeManagement: {
                    ...prev.timeManagement,
                    day: newDay,
                    dayName: dayNames[(newDay - 1) % dayNames.length],
                    currentTime: `${String(totalHours).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`,
                    currentEvent: timeUpdateFromAI?.newEvent || prev.timeManagement.currentEvent,
                },
            };
        });
    }, [setAdventureSettings]);

    const generateAdventureAction = React.useCallback(async (userActionText: string, locationIdOverride?: string, visitedBuildingId?: string) => {
        setIsLoading(true);
        
        const contextSituation = narrativeMessages.length > 1 ? [...narrativeMessages, {id: 'temp-user', type: 'user', content: userActionText, timestamp: Date.now()}].slice(-5).map(msg => msg.type === 'user' ? `${adventureSettings.playerName || 'Player'}: ${msg.content}` : msg.content).join('\n\n') : getLocalizedText(adventureSettings.initialSituation, currentLanguage);

        const input: GenerateAdventureInput = {
            world: getLocalizedText(adventureSettings.world, currentLanguage),
            initialSituation: contextSituation,
            characters: characters.filter(char => char.locationId === (locationIdOverride || adventureSettings.playerLocationId)), 
            userAction: userActionText,
            currentLanguage,
            playerName: adventureSettings.playerName || "Player",
            relationsModeActive: adventureSettings.relationsMode ?? true,
            rpgModeActive: false, // Forced to false
            comicModeActive: adventureSettings.comicModeActive ?? false,
            playerPortraitUrl: adventureSettings.playerPortraitUrl,
            playerFaceSwapEnabled: adventureSettings.playerFaceSwapEnabled,
            playerLocationId: locationIdOverride || adventureSettings.playerLocationId,
            aiConfig,
            timeManagement: adventureSettings.timeManagement,
        };

        try {
            const result: GenerateAdventureFlowOutput = await generateAdventure(input);
            
            if (result.error && !result.narrative) {
                toast({ title: "Erreur de l'IA", description: result.error, variant: "destructive" });
            } else {
                setNarrativeMessages(prev => [...prev, { id: `ai-${Date.now()}`, type: 'ai', content: result.narrative || "", timestamp: Date.now(), sceneDescription: result.sceneDescriptionForImage, speakingCharacterNames: result.speakingCharacterNames }]);
                if (adventureSettings.relationsMode) {
                    if (result.affinityUpdates) handleAffinityUpdates(result.affinityUpdates);
                    if (result.relationUpdates) handleRelationUpdatesFromAI(result.relationUpdates);
                }
                if (adventureSettings.timeManagement?.enabled) handleTimeUpdate(result.updatedTime);
            }
        } catch (error) { 
            toast({ title: "Erreur Critique de l'IA", description: `Une erreur inattendue est survenue: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [
        adventureSettings, characters, narrativeMessages, currentLanguage, aiConfig,
        setIsLoading, setNarrativeMessages, handleAffinityUpdates, handleRelationUpdatesFromAI, handleTimeUpdate, toast, getLocalizedText
    ]);
    
    const regenerateLastResponse = React.useCallback(async () => {
         if (isRegenerating || isLoading) return;
         let lastAiMessage: Message | undefined;
         let lastUserAction: string | undefined;
         let contextMessages: Message[] = [];
         let lastAiIndex = -1;
         const currentNarrative = [...narrativeMessages];

         for (let i = currentNarrative.length - 1; i >= 0; i--) {
             const message = currentNarrative[i];
             if (message.type === 'ai' && !lastAiMessage) {
                 lastAiMessage = message;
                 lastAiIndex = i;
             } else if (message.type === 'user' && lastAiMessage) {
                 lastUserAction = message.content;
                 contextMessages = currentNarrative.slice(Math.max(0, i - 4), i + 1);
                 break;
             }
         }

         if (!lastAiMessage || !lastUserAction) {
            toast({ title: "Impossible de régénérer", variant: "destructive" });
             return;
         }
        setIsRegenerating(true);
        toast({ title: "Régénération en cours..." });

        const currentTurnSettings = JSON.parse(JSON.stringify(adventureSettings));

        const worldText = getLocalizedText(currentTurnSettings.world, currentLanguage);
        const contextSituationText = contextMessages.map(msg => msg.type === 'user' ? `${currentTurnSettings.playerName}: ${msg.content}` : msg.content).join('\n\n');

         try {
             const input: GenerateAdventureInput = {
                 world: worldText,
                 initialSituation: contextSituationText,
                 characters: characters.filter(c => c.locationId === currentTurnSettings.playerLocationId), 
                 userAction: lastUserAction,
                 currentLanguage: currentLanguage,
                 playerName: currentTurnSettings.playerName || "Player",
                 ...currentTurnSettings,
             };

             const result: GenerateAdventureFlowOutput = await generateAdventure(input);

             if (result.error) {
                toast({ title: "Erreur de Régénération IA", description: result.error, variant: "destructive"});
                return;
             }

            setNarrativeMessages(prev => {
                const newNarrative = [...prev];
                if (lastAiIndex !== -1) {
                    newNarrative[lastAiIndex] = { ...newNarrative[lastAiIndex], content: result.narrative || "", sceneDescription: result.sceneDescriptionForImage };
                }
                return newNarrative;
            });
            
            toast({ title: "Réponse Régénérée" });
         } catch (error) { 
             toast({ title: "Erreur Critique de Régénération", variant: "destructive"});
         } finally {
            setIsRegenerating(false);
         }
    }, [ isRegenerating, isLoading, narrativeMessages, currentLanguage, toast, adventureSettings, characters, aiConfig, setNarrativeMessages, getLocalizedText ]);

    const suggestQuestHookAction = React.useCallback(async () => {
        setIsSuggestingQuest(true);
        toast({ title: "Suggestion de Quête..." });
        try {
          const input: SuggestQuestHookInput = {
            worldDescription: getLocalizedText(adventureSettings.world, currentLanguage),
            currentSituation: narrativeMessages.slice(-5).map(m => m.content).join('\n'),
            involvedCharacters: characters.map(c => c.name).join(", "),
            language: currentLanguage,
          };
          const result = await suggestQuestHook(input);
          toast({ title: "Suggestion:", description: result.questHook, duration: 9000 });
        } catch (error) {
          toast({ title: "Erreur", variant: "destructive" });
        } finally {
          setIsSuggestingQuest(false);
        }
      }, [adventureSettings.world, narrativeMessages, characters, currentLanguage, toast, getLocalizedText]);
    
    const materializeCharacterAction = React.useCallback(async (narrativeContext: string) => {
        const input: MaterializeCharacterInput = { narrativeContext, existingCharacters: characters.map(c => c.name), rpgMode: adventureSettings.rpgMode, currentLanguage };
        const newCharData = await materializeCharacter(input, aiConfig);
        if (newCharData?.name) {
            setCharacters(prev => [...prev, { ...newCharData, id: `char-${newCharData.name.toLowerCase().replace(/\s/g, '-')}-${Math.random()}` }]);
            toast({ title: "Personnage Ajouté!", description: `${newCharData.name} a été ajouté.` });
        } else {
             toast({ title: "Erreur de Création", description: "L'IA n'a pas pu créer de personnage à partir du texte.", variant: "destructive" });
        }
    }, [characters, adventureSettings.rpgMode, currentLanguage, aiConfig, setCharacters, toast]);
    
    const summarizeHistory = React.useCallback(async (narrativeContext: string) => {
        setIsLoading(true);
        try {
            const input: SummarizeHistoryInput = { narrativeContext, involvedCharacters: characters.map(c => c.name), currentLanguage };
            const historyUpdates = await summarizeHistory(input);
            if (historyUpdates && historyUpdates.length > 0) {
                handleCharacterHistoryUpdate(historyUpdates);
            }
        } catch (error) {
            toast({ title: "Erreur de Mémorisation", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [characters, currentLanguage, handleCharacterHistoryUpdate, toast, setIsLoading]);

    const generateSceneImageActionWrapper = React.useCallback(async (input: GenerateSceneImageInput): Promise<GenerateSceneImageFlowOutput> => {
        const result = await generateSceneImage(input, aiConfig);
        if (result.error) toast({ title: "Erreur de Génération d'Image", description: result.error, variant: "destructive" });
        return result;
    }, [toast, aiConfig]);

    const generateItemImage = React.useCallback(async (item: PlayerInventoryItem) => {
        if (isGeneratingItemImage) return;
        setIsGeneratingItemImage(true);
        toast({ title: "Génération d'Image d'Objet" });
        try {
            const result = await generateSceneImageActionWrapper({ sceneDescription: `A detailed illustration of a fantasy game item: "${item.name}". ${item.description}` });
            if (result.imageUrl) {
                setAdventureSettings(prev => ({...prev, playerInventory: (prev.playerInventory || []).map(i => i.id === item.id ? { ...i, generatedImageUrl: result.imageUrl } : i)}));
            }
        } catch (error) {
            toast({ title: "Erreur de Génération d'Image", variant: "destructive" });
        } finally {
            setIsGeneratingItemImage(false);
        }
      }, [generateSceneImageActionWrapper, toast, isGeneratingItemImage, setAdventureSettings]);

    return {
        generateAdventureAction,
        regenerateLastResponse,
        suggestQuestHookAction,
        materializeCharacterAction,
        summarizeHistory,
        isSuggestingQuest,
        isRegenerating,
        generateItemImage,
        isGeneratingItemImage,
        generateSceneImageActionWrapper,
    };
}
