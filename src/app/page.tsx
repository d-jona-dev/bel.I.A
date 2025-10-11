
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { Character, AdventureSettings, SaveData, Message, ActiveCombat, PlayerInventoryItem, LootedItem, PlayerSkill, Combatant, MapPointOfInterest, GeneratedResource, Familiar, FamiliarPassiveBonus, AiConfig, ImageTransform, PlayerAvatar, TimeManagementSettings, ComicPage, Panel, Bubble, SellingItem, BaseItem, BaseFamiliarComponent, EnemyUnit, LocalizedText } from "@/types";
import { PageStructure } from "./page.structure";

import { useFamiliar } from "@/hooks/systems/useFamiliar";
import { useComic } from "@/hooks/systems/useComic";
import { useCombat } from "@/hooks/systems/useCombat";
import { useAdventureState, calculateEffectiveStats, getLocalizedText } from "@/hooks/systems/useAdventureState";
import { useSaveLoad } from "@/hooks/systems/useSaveLoad"; 
import { useAIActions } from "@/hooks/systems/useAIActions";
import { useMerchant } from "@/hooks/systems/useMerchant";
import { useMap } from "@/hooks/systems/useMap";

import { BUILDING_DEFINITIONS, BUILDING_SLOTS, BUILDING_COST_PROGRESSION, poiLevelConfig, poiLevelNameMap } from "@/lib/buildings";
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
import { BASE_ENEMY_UNITS } from "@/lib/enemies";


const PLAYER_ID = "player";
const BASE_ATTRIBUTE_VALUE = 8;
const INITIAL_CREATION_ATTRIBUTE_POINTS_PLAYER = 10; // For player
const INITIAL_CREATION_ATTRIBUTE_POINTS_NPC_DEFAULT = 5; // Default for NPCs
const ATTRIBUTE_POINTS_PER_LEVEL_GAIN_FORM = 5;


export interface SellingItemDetails {
  item: PlayerInventoryItem;
  sellPricePerUnit: number;
}

const uid = (n = 6) => Math.random().toString(36).slice(2, 2 + n);


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
        handleTakeLoot,
        addCurrencyToPlayer,
        handlePlayerItemAction,
        handleEquipItem,
        handleUnequipItem,
        handleSellItem,
        confirmSellMultipleItems,
        itemToSellDetails,
        setItemToSellDetails,
        sellQuantity,
        setSellQuantity,
        computedStats,
    } = useAdventureState();
    
    const [allEnemies, setAllEnemies] = React.useState<EnemyUnit[]>([]);
    
    // UI and loading states
    const [isLoading, setIsLoading] = React.useState<boolean>(false);
    const [showRestartConfirm, setShowRestartConfirm] = React.useState<boolean>(false);
    const [useAestheticFont, setUseAestheticFont] = React.useState(true);
    

    const playerName = adventureSettings.playerName || "Player";
    
    const handleNarrativeUpdate = React.useCallback((content: string, type: 'user' | 'ai', sceneDesc?: string, lootItems?: LootedItem[], imageUrl?: string, imageTransform?: ImageTransform, speakingCharacterNames?: string[]) => {
        const newItemsWithIds: PlayerInventoryItem[] | undefined = lootItems?.map(item => ({
            id: (item.itemName?.toLowerCase() || 'unknown-item').replace(/\s+/g, '-') + '-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
            name: item.itemName,
            quantity: item.quantity,
            description: item.description,
            effect: item.effect,
            type: item.itemType,
            goldValue: item.goldValue,
            statBonuses: item.statBonuses,
            generatedImageUrl: null,
            isEquipped: false,
        }));

        const newMessage: Message = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            type: type,
            content: content,
            timestamp: Date.now(),
            sceneDescription: type === 'ai' ? sceneDesc : undefined,
            imageUrl: type === 'ai' ? imageUrl : undefined,
            imageTransform: type === 'ai' ? imageTransform : undefined,
            loot: type === 'ai' && newItemsWithIds && newItemsWithIds.length > 0 ? newItemsWithIds : undefined,
            lootTaken: false,
            speakingCharacterNames: speakingCharacterNames,
        };
        setNarrativeMessages(prevNarrative => [...prevNarrative, newMessage]);
    }, [setNarrativeMessages]);

    const handlePoiOwnershipChange = React.useCallback((changes: { poiId: string; newOwnerId: string }[]) => {
        if (!changes || changes.length === 0) return;
        
        const toastsToShow: Array<Parameters<typeof toast>[0]> = [];

        const updater = (prev: AdventureSettings): AdventureSettings => {
            if (!prev.mapPointsOfInterest) return prev;

            let pois = [...prev.mapPointsOfInterest];
            let changed = false;

            changes.forEach(change => {
                const poiIndex = pois.findIndex(p => p.id === change.poiId);
                if (poiIndex !== -1) {
                    const oldOwnerId = pois[poiIndex].ownerId;
                    if (oldOwnerId !== change.newOwnerId) {
                        const poi = pois[poiIndex];
                        const newOwnerName = change.newOwnerId === PLAYER_ID ? (adventureSettings.playerName || "Joueur") : characters.find(c => c.id === change.newOwnerId)?.name || 'un inconnu';
                        
                        pois[poiIndex] = { ...poi, ownerId: change.newOwnerId };
                        changed = true;
                        
                        toastsToShow.push({
                            title: "Changement de Territoire!",
                            description: `${poi.name} est maintenant sous le contrôle de ${newOwnerName}.`
                        });
                    }
                }
            });

            if (!changed) return prev;
            return { ...prev, mapPointsOfInterest: pois };
        };
        
        setAdventureSettings(updater);
        
        React.startTransition(() => {
            toastsToShow.forEach(toastArgs => {
                toast(toastArgs);
            });
        });
    }, [toast, characters, adventureSettings.playerName, setAdventureSettings]);
    
    const handleNewFamiliar = React.useCallback((newFamiliar: Familiar) => {
        setAdventureSettings(prevSettings => {
            if (!newFamiliar) return prevSettings;

            const updatedFamiliars = [...(prevSettings.familiars || []), newFamiliar];
            
            React.startTransition(() => {
                toast({
                    title: "Nouveau Familier!",
                    description: `${newFamiliar.name} a rejoint votre groupe! Allez le voir dans l'onglet Familiers pour l'activer.`,
                });
            });

            return { ...prevSettings, familiars: updatedFamiliars };
        });
    }, [toast, setAdventureSettings]);
    
    const handleNewCharacters = React.useCallback((newChars: Omit<Character, 'id'>[]) => {
      setCharacters(prev => [
          ...prev, 
          ...newChars.map(char => ({ 
              ...char, 
              id: `char-${char.name.toLowerCase().replace(/\s/g, '-')}-${uid()}`,
              locationId: adventureSettings.playerLocationId,
          }))
      ]);
    }, [adventureSettings.playerLocationId, setCharacters]);

    const {
        merchantInventory,
        shoppingCart,
        handleAddToCart,
        handleRemoveFromCart,
        handleFinalizePurchase,
        initializeMerchantInventory,
        closeMerchantPanel,
    } = useMerchant({
        adventureSettings,
        setAdventureSettings,
        addCurrencyToPlayer,
        handleNewCharacters,
        toast,
    });

    const {
        activeCombat,
        setActiveCombat,
        itemToUse,
        setItemToUse,
        isTargeting,
        setIsTargeting,
        handleCombatUpdates,
        handleClaimHuntReward,
        applyCombatItemEffect,
    } = useCombat({ 
        adventureSettings, 
        setAdventureSettings, 
        characters,
        setCharacters,
        baseCharacters, 
        handleNarrativeUpdate, 
        addCurrencyToPlayer,
        handleTakeLoot,
        handlePoiOwnershipChange
    });
    
    const {
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
    } = useAIActions({
        adventureSettings,
        characters,
        baseCharacters,
        narrativeMessages,
        currentLanguage,
        activeCombat,
        aiConfig,
        isLoading,
        setIsLoading,
        setNarrativeMessages,
        setAdventureSettings,
        setCharacters,
        setActiveCombat,
        handlePoiOwnershipChange,
        addCurrencyToPlayer,
        handleNewFamiliar,
        handleCombatUpdates,
        initializeMerchantInventory,
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

    const handleSendSpecificAction = React.useCallback(async (action: string, locationIdOverride?: string, visitedBuildingId?: string) => {
        if (!action || isLoading) return;

        handleNarrativeUpdate(action, 'user');
        setIsLoading(true);

        try {
            await generateAdventureAction(action, locationIdOverride, visitedBuildingId);
        } catch (error) { 
            console.error("Error in handleSendSpecificAction trying to generate adventure:", error);
            React.startTransition(() => {
                toast({ title: "Erreur Critique de l'IA", description: "Impossible de générer la suite de l'aventure.", variant: "destructive" });
            });
            setIsLoading(false);
        }
    }, [isLoading, handleNarrativeUpdate, toast, generateAdventureAction]);

    const handleFinalizePurchaseWithAction = React.useCallback(() => {
        const summary = handleFinalizePurchase();
        if (summary) {
            handleSendSpecificAction(`J'achète les articles suivants : ${summary}.`);
        }
    }, [handleFinalizePurchase, handleSendSpecificAction]);
    
    const {
        isGeneratingMap,
        generateMapImage,
        handlePoiPositionChange,
        handleCreatePoi,
        handleMapImageUpload,
        handleMapImageUrlChange,
        handleAddPoiToMap,
        handleBuildInPoi,
    } = useMap({
        adventureSettings,
        setAdventureSettings,
        characters,
        toast,
        generateSceneImageActionWrapper,
        aiConfig,
        handleSendSpecificAction
    });

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

    const {
        namingFamiliarState,
        newFamiliarName,
        familiarNameError,
        setNewFamiliarName,
        setFamiliarNameError,
        handleUseFamiliarItem,
        handleConfirmFamiliarName,
        handleFamiliarUpdate,
        handleSaveFamiliar,
        handleAddStagedFamiliar,
        generateDynamicFamiliarBonus,
    } = useFamiliar({
        adventureSettings,
        setAdventureSettings,
        toast,
        handleSendSpecificAction: handleSendSpecificAction,
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
   
    const handleActionWithCombatItem = async (narrativeAction: string) => {
        handleNarrativeUpdate(narrativeAction, 'user');
        await generateAdventureAction(narrativeAction);
    }
    
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

      const loadAllItemTypes = () => {
          const loadData = (key: string, baseData: any[]) => {
              try {
                  const storedData = localStorage.getItem(key);
                  return storedData ? JSON.parse(storedData) : baseData;
              } catch (error) {
                  console.error(`Failed to load custom items for ${key}:`, error);
              }
              return baseData;
          };
          
          // Load enemies
          const customEnemies = loadData('custom_enemies', []);
          const allEnemies = [...BASE_ENEMY_UNITS, ...customEnemies].reduce((acc, current) => {
              if (!acc.find(item => item.id === current.id)) {
                  acc.push(current);
              }
              return acc;
          }, [] as EnemyUnit[]);
          setAllEnemies(allEnemies);
      };

      loadAllItemTypes();
      window.addEventListener('storage', loadAllItemTypes);
      return () => {
          window.removeEventListener('storage', loadAllItemTypes);
      };
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

    const handleDiscardLoot = React.useCallback((messageId: string) => {
        setNarrativeMessages(prevMessages =>
            prevMessages.map(msg =>
                msg.id === messageId ? { ...msg, lootTaken: true } : msg
            )
        );
        React.startTransition(() => {
            toast({ title: "Butin Laissé", description: "Vous avez choisi de ne pas prendre ces objets." });
        });
    }, [toast, setNarrativeMessages]);
    

  const handleFullPlayerItemAction = React.useCallback(async (itemId: string, action: 'use' | 'discard') => {
    const { narrativeAction, itemUsed } = handlePlayerItemAction(itemId, action);
    if (narrativeAction && itemUsed) {
        if (action === 'use' && itemUsed.familiarDetails) {
            handleUseFamiliarItem(itemUsed);
        } else if (action === 'use' && itemUsed.effectType === 'combat' && activeCombat?.isActive) {
            setItemToUse(itemUsed);
            setIsTargeting(true);
        } else {
             await handleSendSpecificAction(narrativeAction);
        }
    }
  }, [handlePlayerItemAction, handleUseFamiliarItem, setItemToUse, setIsTargeting, activeCombat, handleSendSpecificAction]);

    const { handleSave, handleLoad } = useSaveLoad({
        adventureSettings,
        characters,
        narrativeMessages,
        currentLanguage,
        activeCombat,
        aiConfig,
        loadAdventureState,
    });


  const confirmRestartAdventure = React.useCallback(() => {
    React.startTransition(() => {
        const initialSettingsFromBase = JSON.parse(JSON.stringify(baseAdventureSettings));
        const effectiveStats = calculateEffectiveStats(initialSettingsFromBase);
         const newLiveAdventureSettings: AdventureSettings = {
            ...initialSettingsFromBase,
            ...effectiveStats,
            playerCurrentHp: initialSettingsFromBase.rpgMode ? effectiveStats.playerMaxHp : undefined,
            playerCurrentMp: initialSettingsFromBase.rpgMode ? effectiveStats.playerMaxMp : undefined,
            playerCurrentExp: initialSettingsFromBase.rpgMode ? 0 : undefined,
            playerInventory: initialSettingsFromBase.playerInventory?.map((item: PlayerInventoryItem) => ({...item, isEquipped: false})) || [],
            playerGold: initialSettingsFromBase.playerGold ?? (baseAdventureSettings.playerGold ?? 0),
            equippedItemIds: { weapon: null, armor: null, jewelry: null },
            playerSkills: [],
            familiars: [],
        };
        setAdventureSettings(newLiveAdventureSettings);
        setCharacters(JSON.parse(JSON.stringify(baseCharacters)).map((char: Character) => ({
            ...char,
            currentExp: char.level === 1 && initialSettingsFromBase.rpgMode ? 0 : char.currentExp,
            expToNextLevel: char.level === 1 && initialSettingsFromBase.rpgMode ? Math.floor(100 * Math.pow(1.5, ((char.level ?? 1) || 1) - 1)) : char.expToNextLevel,
            hitPoints: char.maxHitPoints,
            manaPoints: char.maxManaPoints,
            statusEffects: [],
        })));
        const initialSitText = getLocalizedText(newLiveAdventureSettings.initialSituation, currentLanguage);
        setNarrativeMessages([{ id: `msg-${Date.now()}`, type: 'system', content: initialSitText, timestamp: Date.now() }]);
        
        setActiveCombat(undefined);
        toast({ title: "Aventure Recommencée", description: "L'histoire a été réinitialisée." });
        setShowRestartConfirm(false);
    });
  }, [baseAdventureSettings, baseCharacters, toast, currentLanguage, setAdventureSettings, setCharacters, setNarrativeMessages, setActiveCombat, getLocalizedText]);

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
                    playerCurrentHp: prevSettings.playerCurrentHp,
                    playerCurrentMp: prevSettings.playerCurrentMp,
                    playerCurrentExp: prevSettings.playerCurrentExp,
                    playerInventory: prevSettings.playerInventory,
                    equippedItemIds: prevSettings.equippedItemIds,
                    playerSkills: prevSettings.playerSkills,
                    familiars: prevSettings.familiars,
                };
    
                const livePoisMap = new Map((prevSettings.mapPointsOfInterest || []).map(p => [p.id, p]));
                const stagedPois = newLiveSettings.mapPointsOfInterest || [];
                const mergedPois = stagedPois.map(stagedPoi => {
                    const livePoi = livePoisMap.get(stagedPoi.id);
                    return livePoi ? { ...livePoi, ...stagedPoi, position: livePoi.position } : stagedPoi;
                });
                newLiveSettings.mapPointsOfInterest = mergedPois;
    
                if (newLiveSettings.rpgMode) {
                    const effectiveStats = calculateEffectiveStats(newLiveSettings);
                    Object.assign(newLiveSettings, effectiveStats);
                    const oldInitialSituation = getLocalizedText(prevSettings.initialSituation, currentLanguage);
                    const newInitialSituation = getLocalizedText(formData.initialSituation, currentLanguage);
    
                    if (newInitialSituation !== oldInitialSituation) {
                        newLiveSettings.playerCurrentHp = newLiveSettings.playerMaxHp;
                        newLiveSettings.playerCurrentMp = newLiveSettings.playerMaxMp;
                        newLiveSettings.playerCurrentExp = 0;
                    } else {
                        newLiveSettings.playerCurrentHp = Math.min(prevSettings.playerCurrentHp ?? effectiveStats.playerMaxHp, effectiveStats.playerMaxHp);
                        newLiveSettings.playerCurrentMp = Math.min(prevSettings.playerCurrentMp ?? effectiveStats.playerMaxMp, effectiveStats.playerMaxMp);
                    }
                }

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
                if (activeCombat) setActiveCombat(undefined);
            }
        };

        mergeAndUpdateState();
        
        toast({ title: "Modifications Enregistrées", description: "Les paramètres de l'aventure ont été mis à jour." });
    });
}, [adventureFormRef, toast, currentLanguage, setAdventureSettings, setCharacters, setNarrativeMessages, setActiveCombat, setBaseAdventureSettings, setBaseCharacters, adventureSettings, activeCombat, getLocalizedText]);


  const handleToggleStrategyMode = () => {
      setAdventureSettings(prev => ({ ...prev, strategyMode: !prev.strategyMode }));
  };
  const handleToggleRpgMode = () => {
      setAdventureSettings(prev => ({ ...prev, rpgMode: !prev.rpgMode }));
  };
  const handleToggleRelationsMode = () => {
      setAdventureSettings(prev => ({ ...prev, relationsMode: !prev.relationsMode }));
  };

  const handleMapAction = React.useCallback(async (poiId: string, action: 'travel' | 'examine' | 'collect' | 'attack' | 'upgrade' | 'visit', buildingId?: string) => {
    const poi = adventureSettings.mapPointsOfInterest?.find(p => p.id === poiId);
    if (!poi) return;
  
    closeMerchantPanel();
  
    let userActionText: string | null = null;
    let locationIdOverride: string | undefined = undefined;
    
    if (action === 'attack') {
        const combatNarrative = `J'attaque le territoire de ${poi.name}.`;
        handleSendSpecificAction(combatNarrative, poi.id);

    } else if (action === 'visit' && buildingId) {
        locationIdOverride = poi.id;
        const buildingName = BUILDING_DEFINITIONS.find(b => b.id === buildingId)?.name || buildingId;
        userActionText = `Je visite le bâtiment '${buildingName}' à ${poi.name}.`;
        handleSendSpecificAction(userActionText, locationIdOverride, buildingId);

    } else {
        if (action === 'upgrade') {
            const isPlayerOwned = poi.ownerId === PLAYER_ID;
            const typeConfig = poiLevelConfig[poi.icon as keyof typeof poiLevelConfig];
            const isUpgradable = isPlayerOwned && typeConfig && (poi.level || 1) < Object.keys(typeConfig).length;
            const upgradeCost = isUpgradable ? typeConfig[(poi.level || 1) as keyof typeof typeConfig]?.upgradeCost : null;
            const canAfford = isUpgradable && upgradeCost !== null && (adventureSettings.playerGold || 0) >= upgradeCost;

            if (!isUpgradable || !canAfford) {
                 React.startTransition(() => {
                    toast({
                        title: "Amélioration Impossible",
                        description: poi.ownerId !== PLAYER_ID
                            ? "Vous ne pouvez améliorer que les lieux que vous possédez."
                            : !isUpgradable
                            ? "Ce lieu a atteint son niveau maximum."
                            : "Fonds insuffisants pour cette amélioration.",
                        variant: "destructive"
                    });
                 });
                 setIsLoading(false);
                return;
            }

            setAdventureSettings(prev => {
                const newPois = prev.mapPointsOfInterest?.map(p => {
                    if (p.id === poiId) {
                        const newLevel = (p.level || 1) + 1;
                        const newResources = poiLevelConfig[p.icon as keyof typeof poiLevelConfig]?.[newLevel]?.resources || [];
                        return { ...p, level: newLevel, resources: newResources };
                    }
                    return p;
                });
                return { ...prev, playerGold: (prev.playerGold || 0) - upgradeCost!, mapPointsOfInterest: newPois };
            });
            React.startTransition(() => {
                toast({ title: "Lieu Amélioré!", description: `${poi.name} est passé au niveau ${(poi.level || 1) + 1} pour ${upgradeCost} PO.` });
            });
            
            userActionText = `Je supervise l'amélioration de ${poi.name}.`;

        } else if (action === 'collect') {
            if (poi.ownerId !== PLAYER_ID) {
                React.startTransition(() => {
                    toast({ title: "Accès Refusé", description: "Vous n'êtes pas le propriétaire de ce lieu et ne pouvez pas collecter ses ressources.", variant: "destructive" });
                });
                return;
            }
             userActionText = `Je collecte les ressources à ${poi.name}.`;
        } else if (action === 'travel') {
            userActionText = `Je me déplace vers ${poi.name}.`;
            locationIdOverride = poi.id;
        } else if (action === 'examine') {
            userActionText = `J'examine les environs de ${poi.name}.`;
            locationIdOverride = poi.id;
        }
        else {
            return;
        }
        
        if (!userActionText) { return; }

        handleSendSpecificAction(userActionText, locationIdOverride);
    }
  }, [
      adventureSettings, characters, toast, 
      allEnemies, setCharacters, setActiveCombat, setIsLoading, closeMerchantPanel,
      setAdventureSettings, handleSendSpecificAction
  ]);
    
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
        ...computedStats,
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
    }), [adventureSettings, characters, computedStats]);
  
  const isUiLocked = isLoading || isRegenerating || isSuggestingQuest || isGeneratingItemImage || isGeneratingMap;

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
                handleCharacterHistoryUpdate={() => {}}
                handleAffinityUpdates={() => {}}
                handleRelationUpdate={() => {}}
                handleRelationUpdatesFromAI={() => {}}
                handleSaveNewCharacter={() => {}}
                onAddStagedCharacter={handleAddStagedCharacter}
                handleSave={handleSave}
                handleLoad={handleLoad}
                setCurrentLanguage={handleSetCurrentLanguage}
                translateTextAction={async () => ({ translatedText: '' })}
                generateAdventureAction={handleSendSpecificAction}
                generateSceneImageAction={generateSceneImageActionWrapper}
                handleEditMessage={() => {}}
                handleRegenerateLastResponse={regenerateLastResponse}
                handleUndoLastMessage={() => {}}
                playerId={PLAYER_ID}
                playerName={playerName}
                onRestartAdventure={confirmRestartAdventure}
                activeCombat={activeCombat}
                onCombatUpdates={handleCombatUpdates}
                suggestQuestHookAction={suggestQuestHookAction}
                isSuggestingQuest={isSuggestingQuest}
                showRestartConfirm={showRestartConfirm}
                setShowRestartConfirm={setShowRestartConfirm}
                handleTakeLoot={handleTakeLoot}
                handleDiscardLoot={handleDiscardLoot}
                handlePlayerItemAction={handleFullPlayerItemAction}
                handleSellItem={handleSellItem}
                handleGenerateItemImage={generateItemImage}
                isGeneratingItemImage={isGeneratingItemImage}
                handleEquipItem={handleEquipItem}
                handleUnequipItem={handleUnequipItem}
                itemToSellDetails={itemToSellDetails}
                sellQuantity={sellQuantity}
                setSellQuantity={setSellQuantity}
                confirmSellMultipleItems={confirmSellMultipleItems}
                onCloseSellDialog={() => setItemToSellDetails(null)}
                handleMapAction={handleMapAction}
                useAestheticFont={useAestheticFont}
                onToggleAestheticFont={handleToggleAestheticFont}
                onGenerateMap={generateMapImage}
                isGeneratingMap={isGeneratingMap}
                onPoiPositionChange={handlePoiPositionChange}
                onCreatePoi={handleCreatePoi}
                onBuildInPoi={handleBuildInPoi}
                currentTurn={narrativeMessages.length}
                handleNewFamiliar={handleNewFamiliar}
                handleFamiliarUpdate={handleFamiliarUpdate}
                handleSaveFamiliar={handleSaveFamiliar}
                handleAddStagedFamiliar={handleAddStagedFamiliar}
                onMapImageUpload={handleMapImageUpload}
                onMapImageUrlChange={handleMapImageUrlChange}
                onAddPoiToMap={handleAddPoiToMap}
                isLoading={isUiLocked}
                onAiConfigChange={handleAiConfigChange}
                aiConfig={aiConfig}
                comicDraft={comicDraft}
                onDownloadComicDraft={handleDownloadComicDraft}
                onAddComicPage={handleAddComicPage}
                onAddComicPanel={handleAddComicPanel}
                onRemoveLastComicPanel={handleRemoveLastComicPanel}
                onUploadToComicPanel={handleUploadToComicPanel}
                currentComicPageIndex={currentComicPageIndex}
                onComicPageChange={handleComicPageChange}
                onAddToComicPage={handleAddToComicPage}
                isSaveComicDialogOpen={isSaveComicDialogOpen}
                setIsSaveComicDialogOpen={setIsSaveComicDialogOpen}
                comicTitle={comicTitle}
                setComicTitle={setComicTitle}
                comicCoverUrl={comicCoverUrl}
                isGeneratingCover={isGeneratingCover}
                onGenerateCover={handleGenerateCover}
                onSaveToLibrary={handleSaveToLibrary}
                merchantInventory={merchantInventory}
                shoppingCart={shoppingCart}
                onAddToCart={handleAddToCart}
                onRemoveFromCart={handleRemoveFromCart}
                onFinalizePurchase={handleFinalizePurchaseWithAction}
                onCloseMerchantPanel={closeMerchantPanel}
                handleClaimHuntReward={handleClaimHuntReward}
            />
            {isTargeting && itemToUse && (
                <AlertDialog open={isTargeting} onOpenChange={setIsTargeting}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Choisir une cible pour {itemToUse.name}</AlertDialogTitle>
                            <AlertDialogDescription>
                                Quel ennemi souhaitez-vous viser ?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-4 space-y-2">
                            {(activeCombat?.combatants || []).filter(c => c.team === 'enemy' && !c.isDefeated).map(enemy => (
                                <Button key={enemy.characterId} variant="outline" className="w-full justify-start" onClick={() => applyCombatItemEffect(enemy.characterId)}>
                                    {enemy.name} (PV: {enemy.currentHp}/{enemy.maxHp})
                                </Button>
                            ))}
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => { setIsTargeting(false); setItemToUse(null); }}>Annuler</AlertDialogCancel>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
            {namingFamiliarState && (
                <AlertDialog open={!!namingFamiliarState} onOpenChange={(open) => { if (!open) { setFamiliarNameError(null); } }}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Donnez un nom à votre nouveau compagnon !</AlertDialogTitle>
                            <AlertDialogDescription>
                                Vous avez invoqué un(e) {namingFamiliarState.baseFamiliar.name}. Quel nom unique souhaitez-vous lui donner ?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-4 space-y-2">
                            <Label htmlFor="familiar-name-input">Nom du familier</Label>
                            <Input
                                id="familiar-name-input"
                                value={newFamiliarName}
                                onChange={(e) => {
                                    setNewFamiliarName(e.target.value);
                                    if (familiarNameError) setFamiliarNameError(null);
                                }}
                                placeholder="Entrez un nom..."
                            />
                            {familiarNameError && <p className="text-sm text-destructive">{familiarNameError}</p>}
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => { handleConfirmFamiliarName(false); }}>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleConfirmFamiliarName(true)} disabled={!newFamiliarName.trim()}>
                                Confirmer et Invoquer
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}
