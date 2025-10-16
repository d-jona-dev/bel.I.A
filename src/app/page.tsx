
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { Character, AdventureSettings, SaveData, Message, ActiveCombat, PlayerInventoryItem, LootedItem, PlayerSkill, Combatant, MapPointOfInterest, GeneratedResource, Familiar, FamiliarPassiveBonus, AiConfig, ImageTransform, PlayerAvatar, TimeManagementSettings, ComicPage, Panel, Bubble, SellingItem, BaseItem, BaseFamiliarComponent, EnemyUnit, LocalizedText } from "@/types";
import { PageStructure } from "./page.structure";

import { useComic } from "@/hooks/systems/useComic";
import { useAdventureState, calculateEffectiveStats, getLocalizedText } from "@/hooks/systems/useAdventureState";
import { useSaveLoad } from "@/hooks/systems/useSaveLoad"; 
import { useAIActions } from "@/hooks/systems/useAIActions";

import { AdventureForm, type AdventureFormValues, type AdventureFormHandle, type FormCharacterDefinition } from '@/components/adventure-form';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


const PLAYER_ID = "player";


export default function Home() {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const adventureFormRef = React.useRef<AdventureFormHandle>(null);
    const { toast } = useToast();

    const {
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
    } = useAdventureState();
    
    // UI and loading states
    const [isLoading, setIsLoading] = React.useState<boolean>(false);
    const [showRestartConfirm, setShowRestartConfirm] = React.useState<boolean>(false);
    const [useAestheticFont, setUseAestheticFont] = React.useState(true);
    

    const playerName = adventureSettings.playerName || "Player";
    
    const handleNarrativeUpdate = React.useCallback((content: string, type: 'user' | 'ai', sceneDesc?: string, lootItems?: LootedItem[], imageUrl?: string, imageTransform?: ImageTransform, speakingCharacterNames?: string[]) => {

        const newMessage: Message = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            type: type,
            content: content,
            timestamp: Date.now(),
            sceneDescription: type === 'ai' ? sceneDesc : undefined,
            imageUrl: type === 'ai' ? imageUrl : undefined,
            imageTransform: type === 'ai' ? imageTransform : undefined,
            speakingCharacterNames: speakingCharacterNames,
        };
        setNarrativeMessages(prevNarrative => [...prevNarrative, newMessage]);
    }, [setNarrativeMessages]);
    
    const handleNewCharacters = React.useCallback((newChars: Omit<Character, 'id'>[]) => {
      setCharacters(prev => [
          ...prev, 
          ...newChars.map(char => ({ 
              ...char, 
              id: `char-${char.name.toLowerCase().replace(/\s/g, '-')}-${Math.random().toString(36).slice(2, 8)}`,
              locationId: adventureSettings.playerLocationId,
          }))
      ]);
    }, [adventureSettings.playerLocationId, setCharacters]);

    const {
        generateAdventureAction,
        regenerateLastResponse,
        suggestQuestHookAction,
        materializeCharacterAction,
        summarizeHistory,
        isSuggestingQuest,
        isRegenerating,
        generateSceneImageActionWrapper,
    } = useAIActions({
        adventureSettings,
        characters,
        baseCharacters,
        narrativeMessages,
        currentLanguage,
        aiConfig,
        isLoading,
        setIsLoading,
        setNarrativeMessages,
        setCharacters,
        handleNewFamiliar: () => {},
    });
    
    const onMaterializeCharacter = React.useCallback(async (narrativeContext: string) => {
        if (isLoading) return;
        setIsLoading(true);
        toast({ title: `Matérialisation en cours...`, description: "L'IA crée la fiche du personnage." });
        try {
          await materializeCharacterAction(narrativeContext);
        } catch (error) {
          console.error("Caught error in onMaterializeCharacter:", error);
          toast({
            title: "Erreur de Création",
            description: error instanceof Error ? error.message : "Une erreur inattendue est survenue.",
            variant: "destructive"
          });
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, toast, setIsLoading, materializeCharacterAction]);

    const {
        comicDraft,
        currentComicPageIndex,
        isSaveComicDialogOpen,
        comicTitle,
        comicCoverUrl,
        isGeneratingCover,
        handleDownloadComicDraft,
        handleAddComicPage,
        handleAddComicPanel,
        handleRemoveLastComicPanel,
        handleUploadToComicPanel,
        handleComicPageChange,
        handleAddToComicPage,
        setIsSaveComicDialogOpen,
        setComicTitle,
        handleGenerateCover,
        handleSaveToLibrary,
    } = useComic({
        narrativeMessages,
        generateSceneImageAction: generateSceneImageActionWrapper,
    });

    
    // --- Core Action Handlers ---
    
    const handleAddStagedCharacter = React.useCallback((character: Character) => {
        if (characters.some(c => c.id === character.id)) {
            toast({ title: "Personnage déjà présent", variant: 'default'});
            return;
        }
        setCharacters(prev => [...prev, character]);
        toast({ title: "Personnage Ajouté", description: `${character.name} a été ajouté à l'aventure.` });
    }, [characters, setCharacters, toast]);
   
    React.useEffect(() => {
      const savedLang = localStorage.getItem('adventure_language') || 'fr';
      setCurrentLanguage(savedLang);

      const tempStateString = localStorage.getItem('tempAdventureState');
      if (tempStateString) {
          localStorage.removeItem('tempAdventureState'); // Clean up immediately
          try {
              const tempState = JSON.parse(tempStateString);
              loadAdventureState(tempState);
          } catch(e) {
              console.error("Failed to parse temp adventure state:", e);
              toast({ title: "Erreur", description: "Impossible de charger l'histoire temporaire.", variant: "destructive" });
          }
      } else {
        const storyIdToLoad = localStorage.getItem('loadStoryIdOnMount');
        if (storyIdToLoad) {
            localStorage.removeItem('loadStoryIdOnMount'); // Clean up immediately
            const storiesStr = localStorage.getItem('adventureStories');
            if (storiesStr) {
                try {
                    const allStories: { id: string, adventureState: SaveData }[] = JSON.parse(storiesStr);
                    const storyToLoad = allStories.find(s => s.id === storyIdToLoad);
                    if (storyToLoad) {
                        loadAdventureState(storyToLoad.adventureState);
                    } else {
                        toast({ title: "Erreur", description: "L'histoire à charger est introuvable.", variant: "destructive" });
                    }
                } catch (e) {
                    console.error("Failed to parse stories from localStorage", e);
                    toast({ title: "Erreur", description: "Impossible de charger l'histoire sauvegardée.", variant: "destructive" });
                }
            }
        }
      }
    }, [loadAdventureState, toast, setCurrentLanguage]);

    const handleToggleAestheticFont = React.useCallback(() => {
        const newFontState = !useAestheticFont;
        setUseAestheticFont(newFontState);
        React.startTransition(() => {
            toast({
                title: "Police de la carte changée",
                description: `La police ${newFontState ? "esthétique a été activée" : "standard a été activée"}.`
            });
        });
      }, [useAestheticFont, toast]);
    

    const { handleSave, handleLoad } = useSaveLoad({
        adventureSettings,
        characters,
        narrativeMessages,
        currentLanguage,
        aiConfig,
        loadAdventureState,
    });


  const confirmRestartAdventure = React.useCallback(() => {
    React.startTransition(() => {
        const initialSettingsFromBase = JSON.parse(JSON.stringify(baseAdventureSettings));
        setAdventureSettings(initialSettingsFromBase);
        setCharacters(JSON.parse(JSON.stringify(baseCharacters)).map((char: Character) => ({
            ...char,
        })));
        const initialSitText = getLocalizedText(initialSettingsFromBase.initialSituation, currentLanguage);
        setNarrativeMessages([{ id: `msg-${Date.now()}`, type: 'system', content: initialSitText, timestamp: Date.now() }]);
        
        toast({ title: "Aventure Recommencée", description: "L'histoire a été réinitialisée." });
        setShowRestartConfirm(false);
    });
  }, [baseAdventureSettings, baseCharacters, toast, currentLanguage, setAdventureSettings, setCharacters, setNarrativeMessages]);

  const onRestartAdventure = React.useCallback(() => {
    setShowRestartConfirm(true);
  }, []);

  const handleApplyStagedChanges = React.useCallback(async () => {
    if (!adventureFormRef.current) return;
    
    const formData = await adventureFormRef.current.getFormData();
    if (!formData) {
        return;
    }

    React.startTransition(() => {
        const mergeAndUpdateState = () => {
            setAdventureSettings(prevSettings => {
                const newLiveSettings: AdventureSettings = {
                    ...prevSettings,
                    ...formData,
                };
    
                setBaseAdventureSettings(JSON.parse(JSON.stringify(newLiveSettings)));
                return newLiveSettings;
            });

            setCharacters(prevCharacters => {
                const formCharactersMap = new Map((formData.characters || []).map(fc => [fc.id, fc]));
                let updatedCharacters = [...prevCharacters];
                
                updatedCharacters = updatedCharacters.map(char => {
                    const formCharData = formCharactersMap.get(char.id);
                    if (formCharData) {
                        formCharactersMap.delete(char.id!);
                        return { ...char, ...formCharData };
                    }
                    return char;
                });
    
                formCharactersMap.forEach(newChar => {
                    updatedCharacters.push(newChar as Character);
                });
                setBaseCharacters(JSON.parse(JSON.stringify(updatedCharacters)));
                return updatedCharacters;
            });
    
            const oldInitialSituation = getLocalizedText(adventureSettings.initialSituation, currentLanguage);
            const newInitialSituation = getLocalizedText(formData.initialSituation, currentLanguage);
            if (newInitialSituation !== oldInitialSituation) {
                setNarrativeMessages([{ id: `msg-${Date.now()}`, type: 'system', content: newInitialSituation, timestamp: Date.now() }]);
            }
        };

        mergeAndUpdateState();
        
        toast({ title: "Modifications Enregistrées", description: "Les paramètres de l'aventure ont été mis à jour." });
    });
}, [adventureFormRef, toast, currentLanguage, setAdventureSettings, setCharacters, setNarrativeMessages, setBaseAdventureSettings, setBaseCharacters, adventureSettings]);


  const handleToggleStrategyMode = () => {
      setAdventureSettings(prev => ({ ...prev, strategyMode: !prev.strategyMode }));
  };
  const handleToggleRpgMode = () => {
      setAdventureSettings(prev => ({ ...prev, rpgMode: !prev.rpgMode }));
  };
  const handleToggleRelationsMode = () => {
      setAdventureSettings(prev => ({ ...prev, relationsMode: !prev.relationsMode }));
  };
    
  const handleAiConfigChange = React.useCallback((newConfig: AiConfig) => {
    setAiConfig(newConfig);
    localStorage.setItem('globalAiConfig', JSON.stringify(newConfig));
    React.startTransition(() => {
        toast({ title: "Configuration IA mise à jour" });
    });
  }, [toast, setAiConfig]);
  
  const handleSetCurrentLanguage = (lang: string) => {
        setCurrentLanguage(lang);
        localStorage.setItem('adventure_language', lang);
    }
    
  const memoizedStagedAdventureSettingsForForm = React.useMemo<AdventureFormValues>(() => ({
        ...adventureSettings,
        characters: characters.map(c => ({ 
            id: c.id, 
            name: c.name, 
            details: c.details, 
            isPlaceholder: c.isPlaceholder, 
            roleInStory: c.roleInStory,
            portraitUrl: c.portraitUrl,
            faceSwapEnabled: c.faceSwapEnabled,
            factionColor: c.factionColor,
            affinity: c.affinity,
            relations: c.relations,
        })),
    }), [adventureSettings, characters]);
  
    const isUiLocked = isLoading || isRegenerating || isSuggestingQuest;
    
    const onGenerateCover = handleGenerateCover;


    return (
        <>
            <PageStructure
                adventureFormRef={adventureFormRef}
                adventureSettings={memoizedStagedAdventureSettingsForForm}
                characters={characters}
                stagedAdventureSettings={memoizedStagedAdventureSettingsForForm}
                handleApplyStagedChanges={handleApplyStagedChanges}
                narrativeMessages={narrativeMessages}
                currentLanguage={currentLanguage}
                fileInputRef={fileInputRef}
                handleToggleRpgMode={handleToggleRpgMode}
                handleToggleRelationsMode={handleToggleRelationsMode}
                handleToggleStrategyMode={handleToggleStrategyMode}
                onNarrativeChange={handleNarrativeUpdate}
                handleCharacterUpdate={(char) => setCharacters(prev => prev.map(c => c.id === char.id ? char : c))}
                handleNewCharacters={handleNewCharacters}
                onMaterializeCharacter={onMaterializeCharacter}
                onSummarizeHistory={summarizeHistory}
                handleSaveNewCharacter={() => {}}
                onAddStagedCharacter={handleAddStagedCharacter}
                handleSave={handleSave}
                handleLoad={handleLoad}
                setCurrentLanguage={handleSetCurrentLanguage}
                translateTextAction={async () => ({ translatedText: '' })}
                generateAdventureAction={generateAdventureAction}
                generateSceneImageAction={generateSceneImageActionWrapper}
                handleEditMessage={() => {}}
                handleRegenerateLastResponse={regenerateLastResponse}
                handleUndoLastMessage={() => {}}
                playerId={PLAYER_ID}
                playerName={playerName}
                onRestartAdventure={confirmRestartAdventure}
                isSuggestingQuest={isSuggestingQuest}
                showRestartConfirm={showRestartConfirm}
                setShowRestartConfirm={setShowRestartConfirm}
                useAestheticFont={useAestheticFont}
                onToggleAestheticFont={handleToggleAestheticFont}
                currentTurn={narrativeMessages.length}
                isLoading={isUiLocked}
                onAiConfigChange={handleAiConfigChange}
                aiConfig={aiConfig}
                comicDraft={comicDraft}
                onDownloadComicDraft={handleDownloadComicDraft}
                onAddComicPage={handleAddComicPage}
                onAddComicPanel={handleAddComicPanel}
                onRemoveLastComicPanel={handleRemoveLastComicPanel}
                onUploadToComicPanel={()=>{}}
                currentComicPageIndex={currentComicPageIndex}
                onComicPageChange={handleComicPageChange}
                onAddToComicPage={handleAddToComicPage}
                isSaveComicDialogOpen={isSaveComicDialogOpen}
                setIsSaveComicDialogOpen={setIsSaveComicDialogOpen}
                comicTitle={comicTitle}
                setComicTitle={setComicTitle}
                comicCoverUrl={comicCoverUrl}
                onGenerateCover={onGenerateCover}
                onSaveToLibrary={handleSaveToLibrary}
            />
        </>
    );
}
