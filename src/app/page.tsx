
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { Character, AdventureSettings, SaveData, Message, AiConfig, LocalizedText, PlayerAvatar } from "@/types";
import { PageStructure } from "./page.structure";
import { GameClock } from "@/lib/game-clock"; 

import { useComic } from "@/hooks/systems/useComic";
import { useAdventureState, getLocalizedText } from "@/hooks/systems/useAdventureState";
import { useSaveLoad } from "@/hooks/systems/useSaveLoad"; 
import { useAIActions } from "@/hooks/systems/useAIActions";

import { AdventureForm, type AdventureFormValues, type AdventureFormHandle } from '@/components/adventure-form';

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


const PLAYER_ID = "player";


export default function Home() {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const adventureFormRef = React.useRef<AdventureFormHandle>(null);
    const { toast } = useToast();

    const [gameClock, setGameClock] = React.useState<GameClock>(() => new GameClock({}));
    const [timeState, setTimeState] = React.useState(() => gameClock.getState());
    
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
        loadAdventureState: originalLoadAdventureState,
        characterHistory,
        undoLastCharacterState,
        createInitialState,
    } = useAdventureState();
    
    const [isLoading, setIsLoading] = React.useState<boolean>(false);
    const [showRestartConfirm, setShowRestartConfirm] = React.useState<boolean>(false);
    const [useAestheticFont, setUseAestheticFont] = React.useState(true);
    
    const playerName = adventureSettings.playerName || "Player";
    
    const advanceTime = React.useCallback(() => {
        if (!adventureSettings.timeManagement?.enabled) return;
        
        const newClock = new GameClock(gameClock.getState()); 
        const timeElapsed = adventureSettings.timeManagement.timeElapsedPerTurn;
        newClock.advanceTime(timeElapsed);
        
        setGameClock(newClock);
        setTimeState(newClock.getState());
        
        localStorage.setItem('gameClockState_v2', newClock.serialize());
    }, [gameClock, adventureSettings.timeManagement]);

    const {
        generateAdventureAction,
        regenerateLastResponse,
        suggestQuestHookAction,
        materializeCharacterAction,
        memorizeEventAction,
        isSuggestingQuest,
        generateSceneImageActionWrapper,
    } = useAIActions({
        adventureSettings,
        setAdventureSettings, // Pass the function to the hook
        characters,
        narrativeMessages,
        currentLanguage,
        aiConfig,
        isLoading,
        setIsLoading,
        setNarrativeMessages,
        setCharacters,
        onTurnEnd: advanceTime,
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
    
    const onSummarizeHistory = React.useCallback(async (narrativeContext: string) => {
        if (isLoading) return;
        await memorizeEventAction(narrativeContext);
    }, [isLoading, memorizeEventAction]);

    const {
        comicDraft,
        currentComicPageIndex,
        isSaveComicDialogOpen,
        comicTitle,
        comicCoverUrl,
        isGeneratingCover,
        onDownloadComicDraft,
        onAddComicPage,
        onAddComicPanel,
        onRemoveLastComicPanel,
        onUploadToComicPanel,
        onComicPageChange,
        onAddToComicPage,
        setIsSaveComicDialogOpen,
        setComicTitle,
        onGenerateCover,
        onSaveToLibrary,
    } = useComic({
        narrativeMessages,
        generateSceneImageAction: generateSceneImageActionWrapper,
    });
    
    const loadAdventureState = React.useCallback((data: SaveData) => {
        // Clear the flag that might load a story from the library, as we're loading a specific state now.
        localStorage.removeItem('loadStoryIdOnMount');
        originalLoadAdventureState(data);

        const clockSettings = data.adventureSettings?.timeManagement || createInitialState().adventureSettings.timeManagement!;
        const clock = new GameClock(clockSettings);
        setGameClock(clock);
        setTimeState(clock.getState());
        localStorage.setItem('gameClockState_v2', clock.serialize());

        if (adventureFormRef.current) {
            adventureFormRef.current.reset(data.adventureSettings);
        }
    }, [originalLoadAdventureState, createInitialState, adventureFormRef]);

    const { handleSave, handleLoad } = useSaveLoad({
        adventureSettings: { ...adventureSettings, timeManagement: { ...adventureSettings.timeManagement, ...timeState } },
        characters,
        narrativeMessages,
        currentLanguage,
        aiConfig,
        loadAdventureState,
    });
    
    const applyAvatarToSettings = React.useCallback((avatarId: string, settings: AdventureSettings): AdventureSettings => {
        const playerAvatarsJson = localStorage.getItem('playerAvatars_v2');

        if (avatarId && playerAvatarsJson) {
            try {
                const avatars: PlayerAvatar[] = JSON.parse(playerAvatarsJson);
                const activeAvatar = avatars.find(a => a.id === avatarId);

                if (activeAvatar) {
                    localStorage.setItem('currentAvatarId', JSON.stringify(avatarId));
                    return {
                        ...settings,
                        playerName: activeAvatar.name,
                        playerDetails: activeAvatar.details,
                        playerDescription: activeAvatar.description,
                        playerOrientation: activeAvatar.orientation,
                        playerPortraitUrl: activeAvatar.portraitUrl,
                    };
                }
            } catch (e) {
                console.error("Failed to apply active avatar", e);
            }
        }
        return settings;
    }, []);

    const handleAvatarChange = (avatarId: string) => {
        setAdventureSettings(prev => applyAvatarToSettings(avatarId, prev));
        toast({
            title: "Avatar changé!",
            description: "Le héros de l'aventure a été mis à jour."
        });
    };

    React.useEffect(() => {
        const storyIdToLoad = localStorage.getItem('loadStoryIdOnMount');
        const currentAvatarId = localStorage.getItem('currentAvatarId');
        const tempStateJSON = localStorage.getItem('tempAdventureState');

        // Priority order:
        // 1. Temporary state from slot assignment.
        // 2. Story ID from library.
        // 3. Current adventure state (already handled by useAdventureState).
        
        if (tempStateJSON) {
            try {
                const tempState = JSON.parse(tempStateJSON);
                 const stateWithAvatar = applyAvatarToSettings(
                     currentAvatarId ? JSON.parse(currentAvatarId) : '',
                     tempState.adventureSettings
                 );
                loadAdventureState({
                    ...tempState,
                    adventureSettings: stateWithAvatar,
                });
            } catch (error) {
                console.error("Failed to load temporary adventure state:", error);
                 toast({ title: "Erreur de chargement", variant: "destructive" });
            } finally {
                localStorage.removeItem('tempAdventureState');
                 // Critical: clear storyIdToLoad to prevent it from overwriting the temp state
                localStorage.removeItem('loadStoryIdOnMount');
            }
        } else if (storyIdToLoad) {
            const storiesFromStorage = localStorage.getItem('adventureStories');
            if (storiesFromStorage) {
                const savedStories = JSON.parse(storiesFromStorage);
                const story = savedStories.find((s: any) => s.id === storyIdToLoad);
                if (story && story.adventureState) {
                    const stateWithAvatar = applyAvatarToSettings(
                        currentAvatarId ? JSON.parse(currentAvatarId) : '', 
                        story.adventureState.adventureSettings
                    );
                    loadAdventureState({
                        ...story.adventureState,
                        adventureSettings: stateWithAvatar,
                    });
                } else {
                     toast({ title: "Erreur", description: `Histoire ${storyIdToLoad} non trouvée.`, variant: "destructive" });
                }
            }
            localStorage.removeItem('loadStoryIdOnMount');
        } else {
             // This case is handled by the auto-loader in useAdventureState.
             // We only apply avatar if no story is being loaded from the library.
             if (currentAvatarId) {
                setAdventureSettings(prev => applyAvatarToSettings(JSON.parse(currentAvatarId), prev));
             }
        }
        
        const savedClockState = localStorage.getItem('gameClockState_v2');
        if (savedClockState) {
            try {
                const clock = GameClock.deserialize(savedClockState);
                setGameClock(clock);
                setTimeState(clock.getState());
            } catch (error) {
                 console.error("Failed to load clock state:", error);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on initial mount


    const handleUndoLastMessage = () => {
        const lastUserMessageIndex = narrativeMessages.findLastIndex(m => m.type === 'user');
        if (lastUserMessageIndex === -1) {
            toast({ title: "Annulation impossible", description: "Aucune action de l'utilisateur à annuler.", variant: "destructive" });
            return;
        }
        
        const newMessages = narrativeMessages.slice(0, lastUserMessageIndex);
        setNarrativeMessages(newMessages); 
        
        const restoredCharacters = undoLastCharacterState();
        if (restoredCharacters) {
            setCharacters(restoredCharacters);
        }
        
        toast({ title: "Dernière action annulée", description: "L'état précédent a été restauré." });
    };


  const confirmRestartAdventure = React.useCallback(() => {
    React.startTransition(() => {
        const initialSettingsFromBase = JSON.parse(JSON.stringify(baseAdventureSettings));
        setAdventureSettings(initialSettingsFromBase);
        setCharacters(JSON.parse(JSON.stringify(baseCharacters)));
        const initialSitText = getLocalizedText(initialSettingsFromBase.initialSituation, currentLanguage);
        setNarrativeMessages([{ id: `msg-${Date.now()}`, type: 'system', content: initialSitText, timestamp: Date.now() }]);

        const newClock = new GameClock(initialSettingsFromBase.timeManagement);
        setGameClock(newClock);
        setTimeState(newClock.getState());
        localStorage.setItem('gameClockState_v2', newClock.serialize());
        
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
    if (!formData) return;

    React.startTransition(() => {
        let newLiveSettings: AdventureSettings;
        
        setAdventureSettings(prevSettings => {
            const prevTimeManagement = prevSettings.timeManagement || createInitialState().adventureSettings.timeManagement!;
            const formTimeManagement = formData.timeManagement || createInitialState().adventureSettings.timeManagement!;
            
            const clock = new GameClock({
                ...formTimeManagement,
                day: timeState.day,
                hour: timeState.hour,
                minute: timeState.minute,
            });
            const [formHour, formMinute] = (formTimeManagement.currentTime || "0:0").split(':').map(Number);
            if(formHour !== timeState.hour || formMinute !== timeState.minute){
                clock.setTime({ day: formTimeManagement.day, hour: formHour, minute: formMinute});
            }

            setTimeState(clock.getState());
            setGameClock(clock);
            localStorage.setItem('gameClockState_v2', clock.serialize());

            newLiveSettings = {
                 ...prevSettings,
                 ...formData,
                 timeManagement: {
                     ...prevTimeManagement,
                     ...formTimeManagement,
                     day: clock.getState().day,
                     currentTime: `${String(clock.getState().hour).padStart(2, '0')}:${String(clock.getState().minute).padStart(2, '0')}`,
                     dayName: clock.getState().dayName,
                 }
            };

            setBaseAdventureSettings(JSON.parse(JSON.stringify(newLiveSettings)));
            return newLiveSettings;
        });

        setCharacters(prevCharacters => {
            const formCharactersMap = new Map((formData.characters || []).map(fc => [fc.id, fc]));
            let updatedCharacters = prevCharacters.map(char => {
                const formCharData = formCharactersMap.get(char.id);
                if (formCharData) {
                    formCharactersMap.delete(char.id!);
                    return { ...char, ...formCharData };
                }
                return char;
            }).filter(c => !c.isPlaceholder);
            formCharactersMap.forEach(newChar => {
                if (!newChar.isPlaceholder) {
                    updatedCharacters.push(newChar as Character);
                }
            });
            setBaseCharacters(JSON.parse(JSON.stringify(updatedCharacters)));
            return updatedCharacters;
        });

        toast({ title: "Modifications Enregistrées", description: "Les paramètres de l'aventure ont été mis à jour." });
    });
}, [adventureFormRef, toast, setAdventureSettings, setCharacters, setBaseAdventureSettings, setBaseCharacters, timeState, createInitialState]);


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

    const handleCharacterUpdate = (updatedCharacter: Character) => {
        setCharacters(prev => prev.map(c => c.id === updatedCharacter.id ? updatedCharacter : c));
    };

    const handleSaveNewCharacter = (charToSave: Character) => {
        try {
            const globalChars = JSON.parse(localStorage.getItem('globalCharacters') || '[]');
            const charExists = globalChars.some((c: Character) => c.id === charToSave.id);
            
            if (!charExists) {
                const newChar = { ...charToSave, _lastSaved: Date.now() };
                globalChars.push(newChar);
                localStorage.setItem('globalCharacters', JSON.stringify(globalChars));
                
                setCharacters(prev => prev.map(c => c.id === charToSave.id ? newChar : c));
                
                toast({title: "Personnage Sauvegardé", description: `${charToSave.name} est maintenant disponible globalement.`});
            } else {
                 toast({title: "Déjà Sauvegardé", description: `${charToSave.name} existe déjà dans les personnages globaux.`, variant: "default"});
            }
        } catch (e) {
            toast({title: "Erreur de Sauvegarde", variant: "destructive"});
        }
    };
  
    const memoizedStagedAdventureSettingsForForm = React.useMemo<AdventureFormValues>(() => ({
        ...adventureSettings,
        characters: characters.map(c => ({ 
            id: c.id, 
            name: c.name, 
            details: c.details, 
            biographyNotes: c.biographyNotes,
            appearanceDescription: c.appearanceDescription,
            isPlaceholder: c.isPlaceholder, 
            roleInStory: c.roleInStory,
            portraitUrl: c.portraitUrl,
            faceSwapEnabled: c.faceSwapEnabled,
            factionColor: c.factionColor,
            affinity: c.affinity,
            relations: c.relations,
            memory: c.memory,
        })),
        timeManagement: adventureSettings.timeManagement || createInitialState().adventureSettings.timeManagement,
    }), [adventureSettings, characters, createInitialState]);
    
    return (
        <>
            <PageStructure
                adventureSettings={adventureSettings}
                characters={characters}
                stagedAdventureSettings={memoizedStagedAdventureSettingsForForm}
                narrativeMessages={narrativeMessages}
                currentLanguage={currentLanguage}
                generateAdventureAction={async (text) => {
                    await generateAdventureAction(text);
                }}
                handleUndoLastMessage={handleUndoLastMessage}
                onRestartAdventure={confirmRestartAdventure}
                showRestartConfirm={showRestartConfirm}
                setShowRestartConfirm={setShowRestartConfirm}
                isLoading={isLoading}
                aiConfig={aiConfig}
                onAiConfigChange={handleAiConfigChange}
                timeState={timeState}
                adventureFormRef={adventureFormRef}
                fileInputRef={fileInputRef}
                handleApplyStagedChanges={handleApplyStagedChanges}
                handleToggleRelationsMode={() => {}}
                handleCharacterUpdate={handleCharacterUpdate}
                onMaterializeCharacter={onMaterializeCharacter}
                onSummarizeHistory={onSummarizeHistory}
                handleSaveNewCharacter={handleSaveNewCharacter}
                onAddStagedCharacter={(char) => setCharacters(p => [...p, char])}
                handleSave={handleSave}
                handleLoad={handleLoad}
                setCurrentLanguage={handleSetCurrentLanguage}
                translateTextAction={async () => ({ translatedText: '' })}
                generateSceneImageAction={generateSceneImageActionWrapper}
                handleEditMessage={(messageId, newContent) => {
                    setNarrativeMessages(prev => prev.map(m => m.id === messageId ? {...m, content: newContent} : m));
                }}
                handleRegenerateLastResponse={regenerateLastResponse}
                playerId={PLAYER_ID}
                playerName={playerName}
                suggestQuestHookAction={suggestQuestHookAction}
                isSuggestingQuest={isSuggestingQuest}
                useAestheticFont={useAestheticFont}
                onToggleAestheticFont={() => setUseAestheticFont(v => !v)}
                onAvatarChange={handleAvatarChange}
                comicDraft={comicDraft}
                onDownloadComicDraft={onDownloadComicDraft}
                onAddComicPage={onAddComicPage}
                onAddComicPanel={onAddComicPanel}
                onRemoveLastComicPanel={onRemoveLastComicPanel}
                onUploadToComicPanel={onUploadToComicPanel}
                currentComicPageIndex={currentComicPageIndex}
                onComicPageChange={onComicPageChange}
                onAddToComicPage={onAddToComicPage}
                isSaveComicDialogOpen={isSaveComicDialogOpen}
                setIsSaveComicDialogOpen={setIsSaveComicDialogOpen}
                comicTitle={comicTitle}
                setComicTitle={setComicTitle}
                comicCoverUrl={comicCoverUrl}
                onGenerateCover={onGenerateCover}
                onSaveToLibrary={onSaveToLibrary}
                isGeneratingCover={isGeneratingCover}
            />
        </>
    );
}
