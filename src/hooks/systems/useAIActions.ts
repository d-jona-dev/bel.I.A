

"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { AdventureSettings, Character, Message, AiConfig, LocalizedText, GenerateAdventureInput } from "@/types";
import type { GameClockState } from "@/lib/game-clock"; // NOUVEAU

import { generateAdventure } from "@/ai/flows/generate-adventure";
import type { GenerateAdventureFlowOutput, AffinityUpdateSchema, RelationUpdateSchema } from "@/types";
import { generateSceneImage } from "@/ai/flows/generate-scene-image";
import type { GenerateSceneImageInput, GenerateSceneImageFlowOutput } from "@/ai/flows/generate-scene-image";
import { suggestQuestHook } from "@/ai/flows/suggest-quest-hook";
import type { SuggestQuestHookInput } from "@/ai/flows/suggest-quest-hook";
import { materializeCharacter } from "@/ai/flows/materialize-character";
import type { MaterializeCharacterInput } from "@/ai/flows/materialize-character";
import { memorizeEvent } from "@/ai/flows/summarize-history";
import type { MemorizeEventInput, MemorizeEventOutput } from "@/ai/flows/summarize-history";
import { getLocalizedText } from "@/hooks/systems/useAdventureState";

const PLAYER_ID = "player";

interface UseAIActionsProps {
    adventureSettings: AdventureSettings;
    characters: Character[];
    narrativeMessages: Message[];
    currentLanguage: string;
    aiConfig: AiConfig;
    isLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setNarrativeMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
    onTurnEnd: () => void; // NOUVEAU: Callback pour signaler la fin du tour
}

export function useAIActions({
    adventureSettings,
    characters,
    narrativeMessages,
    currentLanguage,
    aiConfig,
    isLoading,
    setIsLoading,
    setNarrativeMessages,
    setCharacters,
    onTurnEnd, // NOUVEAU
}: UseAIActionsProps) {
    const { toast } = useToast();
    const [isSuggestingQuest, setIsSuggestingQuest] = React.useState(false);
    
    const handleMemoryUpdate = React.useCallback((update: MemorizeEventOutput) => {
        if (!update || !update.memory) return;
        setCharacters(prevChars => {
            let changed = false;
            const updatedChars = prevChars.map(char => {
                if (update.involvedCharacterNames.includes(char.name)) {
                    changed = true;
                    const newMemory = `${char.memory || ''}\n- ${update.memory}`.trim();
                    return { ...char, memory: newMemory };
                }
                return char;
            });
            if (changed) {
                 toast({ title: "Souvenir Enregistré", description: `La mémoire de ${update.involvedCharacterNames.join(', ')} a été mise à jour.` });
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

    const generateAdventureAction = React.useCallback(async (userActionText: string, timeState?: GameClockState, timeTag?: string, isRegeneration = false) => {
        setIsLoading(true);
        
        if (!isRegeneration) {
            onTurnEnd();
            const userMessage: Message = { id: `user-${Date.now()}`, type: 'user', content: userActionText, timestamp: Date.now() };
            setNarrativeMessages(prev => [...prev, userMessage]);
        }

        const currentMessages = [...narrativeMessages, { id: 'temp', type: 'user', content: userActionText, timestamp: Date.now() }];
        
        const contextSituation = currentMessages.length > 1 
            ? currentMessages.slice(-5).map(msg => msg.type === 'user' ? `${adventureSettings.playerName || 'Player'}: ${msg.content}` : msg.content).join('\n\n') 
            : getLocalizedText(adventureSettings.initialSituation, currentLanguage);
        
        const timeInfoForLLM = timeState && timeTag ? `[Time] ${timeState.dayName} ${timeState.day} — ${String(timeState.hour).padStart(2, '0')}:${String(timeState.minute).padStart(2, '0')} ${timeTag}` : "";

        const input: GenerateAdventureInput = {
            world: getLocalizedText(adventureSettings.world, currentLanguage),
            initialSituation: `${timeInfoForLLM}\n${contextSituation}`,
            characters: characters, 
            userAction: userActionText,
            currentLanguage,
            playerName: adventureSettings.playerName || "Player",
            relationsModeActive: adventureSettings.relationsMode ?? true,
            comicModeActive: adventureSettings.comicModeActive ?? false,
            playerPortraitUrl: adventureSettings.playerPortraitUrl,
            aiConfig,
        };

        try {
            const result: GenerateAdventureFlowOutput = await generateAdventure(input);
            
            if (result.error && !result.narrative) {
                toast({ title: "Erreur de l'IA", description: result.error, variant: "destructive" });
            } else {
                 setNarrativeMessages(prev => {
                    const newMessages = [...prev];
                    if (isRegeneration) {
                        // In regeneration, the last message (the old AI response) should be replaced.
                        newMessages.pop();
                    }
                    return [...newMessages, { id: `ai-${Date.now()}`, type: 'ai', content: result.narrative || "", timestamp: Date.now(), sceneDescription: result.sceneDescriptionForImage }];
                });
                if (adventureSettings.relationsMode) {
                    if (result.affinityUpdates) handleAffinityUpdates(result.affinityUpdates);
                    if (result.relationUpdates) handleRelationUpdatesFromAI(result.relationUpdates);
                }
            }
        } catch (error) { 
            toast({ title: "Erreur Critique de l'IA", description: `Une erreur inattendue est survenue: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [
        adventureSettings, characters, narrativeMessages, currentLanguage, aiConfig,
        setIsLoading, setNarrativeMessages, handleAffinityUpdates, handleRelationUpdatesFromAI, toast, getLocalizedText, onTurnEnd
    ]);
    
    const regenerateLastResponse = React.useCallback(async () => {
        if (isLoading) return;

        const lastUserMessage = [...narrativeMessages].reverse().find(m => m.type === 'user');
        if (!lastUserMessage) {
            toast({ title: "Aucune action à régénérer", variant: "destructive" });
            return;
        }
        
        await generateAdventureAction(lastUserMessage.content, undefined, undefined, true);

    }, [narrativeMessages, isLoading, generateAdventureAction, toast]);

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
        const input: MaterializeCharacterInput = { narrativeContext, existingCharacters: characters.map(c => c.name), rpgMode: false, currentLanguage };
        const newCharData = await materializeCharacter(input);
        if (newCharData?.name) {
            setCharacters(prev => [...prev, { ...newCharData, id: `char-${newCharData.name.toLowerCase().replace(/\s/g, '-')}-${Math.random()}` }]);
            toast({ title: "Personnage Ajouté!", description: `${newCharData.name} a été ajouté.` });
        } else {
             toast({ title: "Erreur de Création", description: "L'IA n'a pas pu créer de personnage à partir du texte.", variant: "destructive" });
        }
    }, [characters, currentLanguage, setCharacters, toast]);
    
    const memorizeEventAction = React.useCallback(async (narrativeContext: string) => {
        setIsLoading(true);
        try {
            const input: MemorizeEventInput = { narrativeContext, involvedCharacters: characters.map(c => c.name), currentLanguage };
            const memoryUpdate = await memorizeEvent(input);
            if (memoryUpdate?.memory) {
                handleMemoryUpdate(memoryUpdate);
            }
        } catch (error) {
            toast({ title: "Erreur de Mémorisation", variant: "destructive", description: error instanceof Error ? error.message : "Erreur inconnue" });
        } finally {
            setIsLoading(false);
        }
    }, [characters, currentLanguage, handleMemoryUpdate, toast, setIsLoading]);


    const generateSceneImageActionWrapper = React.useCallback(async (input: GenerateSceneImageInput): Promise<GenerateSceneImageFlowOutput> => {
        const result = await generateSceneImage(input, aiConfig);
        if (result.error) toast({ title: "Erreur de Génération d'Image", description: result.error, variant: "destructive" });
        return result;
    }, [toast, aiConfig]);

    return {
        generateAdventureAction,
        regenerateLastResponse,
        suggestQuestHookAction,
        materializeCharacterAction,
        memorizeEventAction,
        isSuggestingQuest,
        generateSceneImageActionWrapper,
    };
}
