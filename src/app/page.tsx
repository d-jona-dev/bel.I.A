
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { Character, AdventureSettings, SaveData, Message, ActiveCombat, PlayerInventoryItem, LootedItem, PlayerSkill, Combatant, MapPointOfInterest, GeneratedResource, Familiar, FamiliarPassiveBonus, AiConfig, ImageTransform, PlayerAvatar, TimeManagementSettings, ComicPage, Panel, Bubble, SellingItem, BaseItem, BaseFamiliarComponent, EnemyUnit, LocalizedText } from "@/types";
import { PageStructure } from "./page.structure";

import { useFamiliar } from "@/hooks/systems/useFamiliar";
import { useComic } from "@/hooks/systems/useComic";
import { useCombat } from "@/hooks/systems/useCombat";
import { useAdventureState, calculateEffectiveStats, calculateBaseDerivedStats, getLocalizedText } from "@/hooks/systems/useAdventureState";
import { useSaveLoad } from "@/hooks/systems/useSaveLoad"; 
import { useAIActions } from "@/hooks/systems/useAIActions";

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
        setShoppingCart, // Added
        setMerchantInventory, // Added
    } = useAdventureState();
    
    const [allEnemies, setAllEnemies] = React.useState<EnemyUnit[]>([]);
    
    // UI and loading states
    const [isLoading, setIsLoading] = React.useState<boolean>(false);
    const [showRestartConfirm, setShowRestartConfirm] = React.useState<boolean>(false);
    const [useAestheticFont, setUseAestheticFont] = React.useState(true);
    
    const [merchantInventory, setLocalMerchantInventory] = React.useState<SellingItem[]>([]);
    const [shoppingCart, setLocalShoppingCart] = React.useState<SellingItem[]>([]);

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
        generateMapImage,
        isGeneratingMap,
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
        setMerchantInventory: setLocalMerchantInventory,
    });

    const handleSendSpecificAction = React.useCallback(async (action: string) => {
        if (!action || isLoading) return;

        handleNarrativeUpdate(action, 'user');
        setIsLoading(true);

        try {
            await generateAdventureAction(action);
        } catch (error) { 
            console.error("Error in handleSendSpecificAction trying to generate adventure:", error);
            React.startTransition(() => {
                toast({ title: "Erreur Critique de l'IA", description: "Impossible de générer la suite de l'aventure.", variant: "destructive" });
            });
            setIsLoading(false);
        }
    }, [isLoading, handleNarrativeUpdate, toast, generateAdventureAction]);
    
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
    
   
    const handleAddToCart = React.useCallback((item: SellingItem) => {
        setLocalShoppingCart(prevCart => {
            const existingItem = prevCart.find(cartItem => cartItem.baseItemId === item.baseItemId && cartItem.name === item.name);
            if (existingItem) {
                return prevCart.map(cartItem => 
                    cartItem.baseItemId === item.baseItemId && cartItem.name === item.name 
                    ? { ...cartItem, quantity: (cartItem.quantity || 1) + 1 } 
                    : cartItem
                );
            }
            return [...prevCart, { ...item, quantity: 1 }];
        });
    }, []);
    
    const handleRemoveFromCart = React.useCallback((itemName: string) => {
        setLocalShoppingCart(prevCart => {
            const existingItem = prevCart.find(cartItem => cartItem.name === itemName);
            if (existingItem && existingItem.quantity! > 1) {
                 return prevCart.map(cartItem => 
                    cartItem.name === itemName
                    ? { ...cartItem, quantity: cartItem.quantity! - 1 } 
                    : cartItem
                );
            }
            return prevCart.filter(cartItem => cartItem.name !== itemName);
        });
    }, []);

    const onFinalizePurchase = React.useCallback(() => {
        const totalCost = shoppingCart.reduce((acc, item) => acc + (item.finalGoldValue * (item.quantity || 1)), 0);

        if ((adventureSettings.playerGold || 0) < totalCost) {
            React.startTransition(() => {
                toast({ title: "Fonds insuffisants", description: "Vous n'avez pas assez d'or pour cet achat.", variant: "destructive" });
            });
            return;
        }

        const boughtItemsSummary: string[] = [];

        // Handle items to be added to inventory
        const itemsToInventory = shoppingCart.filter(item => item.type !== 'npc');
        if (itemsToInventory.length > 0) {
            setAdventureSettings(prev => {
                const newInventory = [...(prev.playerInventory || [])];
                itemsToInventory.forEach(cartItem => {
                    const newItem: PlayerInventoryItem = {
                        id: `${cartItem.baseItemId}-${uid()}`,
                        name: cartItem.name,
                        quantity: cartItem.quantity || 1,
                        description: cartItem.description,
                        type: cartItem.type as any, // Cast because 'npc' is filtered out
                        goldValue: cartItem.finalGoldValue,
                        damage: cartItem.damage,
                        ac: cartItem.ac,
                        statBonuses: cartItem.statBonuses,
                        effectType: cartItem.effectType,
                        effectDetails: cartItem.effectDetails,
                        familiarDetails: cartItem.familiarDetails,
                        generatedImageUrl: null,
                        isEquipped: false
                    };
                    const existingIndex = newInventory.findIndex(invItem => invItem.name === newItem.name);
                    if (existingIndex > -1) {
                        newInventory[existingIndex].quantity += newItem.quantity;
                    } else {
                        newInventory.push(newItem);
                    }
                    boughtItemsSummary.push(`${newItem.quantity}x ${newItem.name}`);
                });
                return { ...prev, playerInventory: newInventory };
            });
        }
        
        // Handle recruited NPCs
        const npcsToRecruit = shoppingCart.filter(item => item.type === 'npc');
        if (npcsToRecruit.length > 0) {
            const newCharactersToAdd: Omit<Character, 'id'>[] = npcsToRecruit.map(npcItem => {
                 const baseStats = calculateBaseDerivedStats({
                    level: 1, characterClass: "Mercenaire", strength: 12, dexterity: 12, constitution: 12, intelligence: 10, wisdom: 10, charisma: 10
                 });
                boughtItemsSummary.push(`1x Compagnon: ${npcItem.name}`);
                return {
                    name: npcItem.name,
                    details: npcItem.description,
                    isAlly: true,
                    isHostile: false,
                    affinity: 70, // Start as loyal ally
                    level: 1,
                    characterClass: "Mercenaire",
                    ...baseStats,
                    hitPoints: baseStats.maxHitPoints,
                    manaPoints: baseStats.maxManaPoints,
                    locationId: adventureSettings.playerLocationId,
                };
            });
            handleNewCharacters(newCharactersToAdd);
        }

        // Update player gold
        setAdventureSettings(prev => ({...prev, playerGold: (prev.playerGold || 0) - totalCost }));
        
        const summaryText = boughtItemsSummary.join(', ');
        React.startTransition(() => {
            toast({ title: "Achat Terminé!", description: `Vous avez acquis : ${summaryText}.` });
        });

        handleSendSpecificAction(`J'achète les articles suivants : ${summaryText}.`);
        
        setLocalShoppingCart([]);
        setLocalMerchantInventory([]); // Close merchant panel after purchase
    }, [shoppingCart, adventureSettings.playerGold, handleSendSpecificAction, toast, setAdventureSettings, setLocalShoppingCart, setLocalMerchantInventory, adventureSettings.playerLocationId, handleNewCharacters]);
   
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
  }, [baseAdventureSettings, baseCharacters, toast, currentLanguage, setAdventureSettings, setCharacters, setNarrativeMessages, setActiveCombat]);

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
}, [adventureFormRef, toast, currentLanguage, setAdventureSettings, setCharacters, setNarrativeMessages, setActiveCombat, setBaseAdventureSettings, setBaseCharacters, adventureSettings, activeCombat]);


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
  
    setIsLoading(true);
    setLocalShoppingCart([]);
    setLocalMerchantInventory([]);
  
    let userActionText: string | null = null;
    let locationIdOverride: string | undefined = undefined;
    
    if (action === 'attack') {
        let enemiesToFight: Character[] = [];
        const owner = characters.find(c => c.id === poi.ownerId);

        if (poi.defenderUnitIds && poi.defenderUnitIds.length > 0) {
             poi.defenderUnitIds.forEach(unitId => {
                const enemyUnit = allEnemies.find(e => e.id === unitId);
                if (enemyUnit) {
                    enemiesToFight.push({
                        ...enemyUnit,
                        id: `${enemyUnit.id}-${uid()}`,
                        hitPoints: enemyUnit.hitPoints,
                        maxHitPoints: enemyUnit.hitPoints,
                        locationId: poi.id,
                    });
                }
            });
        }
        else if (owner?.race) {
            const potentialDefenders = allEnemies.filter(unit => unit.race === owner.race);
            if (potentialDefenders.length > 0) {
                 const numDefenders = Math.max(1, poi.level || 1);
                 for (let i = 0; i < numDefenders; i++) {
                    const unit = potentialDefenders[Math.floor(Math.random() * potentialDefenders.length)];
                     enemiesToFight.push({
                        ...unit,
                        id: `${unit.id}-${uid()}`,
                        hitPoints: unit.hitPoints,
                        maxHitPoints: unit.hitPoints,
                        locationId: poi.id,
                    });
                }
            }
        }
        else {
            enemiesToFight = characters.filter(c => c.isHostile && c.locationId === poi.id);
        }

        if (enemiesToFight.length === 0) {
            React.startTransition(() => {
                toast({ title: "Aucun ennemi", description: "Il n'y a personne à combattre ici.", variant: "default" });
            });
            setIsLoading(false);
            return;
        }

        const newDefenders = enemiesToFight.filter(ef => !characters.some(c => c.id === ef.id));
        if (newDefenders.length > 0) {
            setCharacters(prev => [...prev, ...newDefenders]);
        }

        const effectiveStats = calculateEffectiveStats(adventureSettings);
        const playerCombatant: Combatant = {
            characterId: PLAYER_ID,
            name: adventureSettings.playerName || 'Player',
            currentHp: adventureSettings.playerCurrentHp ?? 0,
            maxHp: effectiveStats.playerMaxHp,
            currentMp: adventureSettings.playerCurrentMp,
            maxMp: effectiveStats.playerMaxMp,
            team: 'player',
            isDefeated: (adventureSettings.playerCurrentHp ?? 0) <= 0,
            statusEffects: []
        };
        
        const alliesInCombat: Combatant[] = characters
            .filter(c => c.isAlly && (c.hitPoints ?? 0) > 0 && c.locationId === adventureSettings.playerLocationId)
            .map(c => ({
                characterId: c.id,
                name: c.name,
                currentHp: c.hitPoints!,
                maxHp: c.maxHitPoints!,
                currentMp: c.manaPoints,
                maxMp: c.manaPoints,
                team: 'player',
                isDefeated: false,
                statusEffects: c.statusEffects || [],
            }));

        const enemiesInCombat: Combatant[] = enemiesToFight
            .map(c => ({
                characterId: c.id,
                name: c.name,
                currentHp: c.hitPoints!,
                maxHp: c.maxHitPoints!,
                currentMp: c.manaPoints,
                maxMp: c.manaPoints,
                team: 'enemy',
                isDefeated: false,
                statusEffects: c.statusEffects || [],
            }));
        
        const combatState: ActiveCombat = {
            isActive: true,
            combatants: [playerCombatant, ...alliesInCombat, ...enemiesInCombat],
            environmentDescription: poi.description || 'Champ de bataille',
            turnLog: [],
            contestedPoiId: poi.id,
        };

        setActiveCombat(combatState);
        userActionText = `Le combat s'engage à ${poi.name}!`;
        handleNarrativeUpdate(userActionText, 'system');
        
        await generateAdventureAction(userActionText, poi.id);

    } else if (action === 'visit' && buildingId) {
        locationIdOverride = poi.id;
        const buildingName = BUILDING_DEFINITIONS.find(b => b.id === buildingId)?.name || buildingId;
        userActionText = `Je visite le bâtiment '${buildingName}' à ${poi.name}.`;
        handleNarrativeUpdate(userActionText, 'user');
        await generateAdventureAction(userActionText, locationIdOverride);

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
                setIsLoading(false);
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
            setIsLoading(false);
            return;
        }
        
        if (!userActionText) { setIsLoading(false); return; }

        handleNarrativeUpdate(userActionText, 'user');

        try {
            await generateAdventureAction(userActionText, locationIdOverride);
        } catch (error) {
            console.error("Error in handleMapAction trying to generate adventure:", error);
            React.startTransition(() => {
                toast({ title: "Erreur Critique de l'IA", description: "Impossible de générer la suite de l'aventure depuis la carte.", variant: "destructive" });
            });
        }
    }
    
    setIsLoading(false);
  }, [
      adventureSettings, characters, toast, generateAdventureAction, 
      allEnemies, setCharacters, setActiveCombat, setIsLoading, setLocalShoppingCart,
      handleNarrativeUpdate, setAdventureSettings, setLocalMerchantInventory,
  ]);

  const handlePoiPositionChange = React.useCallback((poiId: string, newPosition: { x: number, y: number }) => {
    setAdventureSettings(prev => {
        if (!prev.mapPointsOfInterest) return prev;
        const newPois = prev.mapPointsOfInterest.map(poi => 
            poi.id === poiId ? { ...poi, position: newPosition } : poi
        );
        return { ...prev, mapPointsOfInterest: newPois };
    });
  }, [setAdventureSettings]);
  
  const handleCreatePoi = React.useCallback((data: { name: string; description: string; type: MapPointOfInterest['icon']; ownerId: string; level: number; buildings: string[]; defenderUnitIds?: string[] }) => {
    const newPoi: MapPointOfInterest = {
        id: `poi-${data.name.toLowerCase().replace(/\s/g, '-')}-${Date.now()}`,
        name: data.name,
        description: data.description || `Un(e) nouveau/nouvelle ${poiLevelNameMap[data.type]?.[data.level || 1]?.toLowerCase() || 'lieu'} plein(e) de potentiel.`,
        icon: data.type,
        level: data.level || 1,
        position: undefined, 
        ownerId: data.ownerId,
        lastCollectedTurn: undefined,
        resources: poiLevelConfig[data.type as keyof typeof poiLevelConfig]?.[data.level as keyof typeof poiLevelConfig[keyof typeof poiLevelConfig]]?.resources || [],
        buildings: data.buildings || [],
        defenderUnitIds: data.defenderUnitIds || [],
    };
    
    const updater = (prev: AdventureSettings) => ({
        ...prev,
        mapPointsOfInterest: [...(prev.mapPointsOfInterest || []), newPoi],
    });

    setAdventureSettings(updater);
    
    React.startTransition(() => {
        toast({
            title: "Point d'Intérêt Créé",
            description: `"${data.name}" a été ajouté. Vous pouvez maintenant le placer sur la carte via le bouton "+".`,
        });
    });
}, [toast, setAdventureSettings]);
  

  const handleMapImageUpload = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        React.startTransition(() => {
            toast({
                title: "Fichier Invalide",
                description: "Veuillez sélectionner un fichier image (jpeg, png, etc.).",
                variant: "destructive",
            });
        });
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setAdventureSettings(prev => ({ ...prev, mapImageUrl: imageUrl }));
        React.startTransition(() => {
            toast({
                title: "Image de Carte Chargée",
                description: "Le fond de la carte a été mis à jour avec votre image.",
            });
        });
    };
    reader.readAsDataURL(file);
    if(event.target) event.target.value = '';
  }, [toast, setAdventureSettings]);

  const handleMapImageUrlChange = React.useCallback((url: string) => {
    setAdventureSettings(prev => ({ ...prev, mapImageUrl: url }));
    React.startTransition(() => {
        toast({
            title: "Image de Carte Chargée",
            description: "Le fond de la carte a été mis à jour depuis l'URL.",
        });
    });
  }, [toast, setAdventureSettings]);
    
  const handleAiConfigChange = React.useCallback((newConfig: AiConfig) => {
    setAiConfig(newConfig);
    localStorage.setItem('globalAiConfig', JSON.stringify(newConfig));
    React.startTransition(() => {
        toast({ title: "Configuration IA mise à jour" });
    });
  }, [toast, setAiConfig]);
  
  const handleAddPoiToMap = React.useCallback((poiId: string) => {
    setAdventureSettings(prev => {
        const pois = prev.mapPointsOfInterest || [];
        const poiExists = pois.some(p => p.id === poiId && p.position);
        if (poiExists) {
            React.startTransition(() => {
                toast({ title: "Déjà sur la carte", description: "Ce point d'intérêt est déjà sur la carte.", variant: "default" });
            });
            return prev;
        }

        const newPois = pois.map(p => {
            if (p.id === poiId) {
                React.startTransition(() => {
                    toast({ title: "POI Ajouté", description: `"${p.name}" a été ajouté à la carte.` });
                });
                return { ...p, position: { x: 50, y: 50 } };
            }
            return p;
        });

        return { ...prev, mapPointsOfInterest: newPois };
    });
  }, [toast, setAdventureSettings]);

  const handleSetCurrentLanguage = (lang: string) => {
        setCurrentLanguage(lang);
        localStorage.setItem('adventure_language', lang);
    }
    
  const handleBuildInPoi = React.useCallback((poiId: string, buildingId: string) => {
    const poi = adventureSettings.mapPointsOfInterest?.find(p => p.id === poiId);
    if (!poi || poi.ownerId !== PLAYER_ID) {
        React.startTransition(() => {
            toast({ title: "Construction Impossible", description: "Vous devez posséder le lieu pour y construire.", variant: "destructive" });
        });
        return;
    }

    const buildingDef = BUILDING_DEFINITIONS.find(b => b.id === buildingId);
    if (!buildingDef) {
        React.startTransition(() => {
            toast({ title: "Erreur", description: "Définition du bâtiment introuvable.", variant: "destructive" });
        });
        return;
    }

    const currentBuildings = poi.buildings || [];
    if (currentBuildings.includes(buildingId)) {
        React.startTransition(() => {
            toast({ title: "Construction Impossible", description: "Ce bâtiment existe déjà dans ce lieu.", variant: "default" });
        });
        return;
    }

    const maxSlots = BUILDING_SLOTS[poi.icon]?.[poi.level || 1] ?? 0;
    if (currentBuildings.length >= maxSlots) {
        React.startTransition(() => {
            toast({ title: "Construction Impossible", description: "Tous les emplacements de construction sont utilisés.", variant: "destructive" });
        });
        return;
    }

    const cost = BUILDING_COST_PROGRESSION[currentBuildings.length] ?? Infinity;
    if ((adventureSettings.playerGold || 0) < cost) {
        React.startTransition(() => {
            toast({ title: "Fonds Insuffisants", description: `Il vous faut ${cost} PO pour construire ${buildingDef.name}.`, variant: "destructive" });
        });
        return;
    }

    setAdventureSettings(prev => {
        const newPois = prev.mapPointsOfInterest!.map(p => {
            if (p.id === poiId) {
                return { ...p, buildings: [...(p.buildings || []), buildingId] };
            }
            return p;
        });
        return {
            ...prev,
            playerGold: (prev.playerGold || 0) - cost,
            mapPointsOfInterest: newPois,
        };
    });

    React.startTransition(() => {
        toast({ title: "Bâtiment Construit!", description: `${buildingDef.name} a été construit à ${poi.name} pour ${cost} PO.` });
    });
  }, [adventureSettings, toast, setAdventureSettings]);
    
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
  
  const isUiLocked = isLoading || isRegenerating || isSuggestingQuest || isGeneratingItemImage || isGeneratingMap;
    const handleCloseMerchantPanel = () => {
        setLocalMerchantInventory([]);
        setLocalShoppingCart([]);
    };
    
    const handleAddStagedCharacter = (character: Character) => {
        setCharacters(prev => [...prev, character]);
        toast({ title: "Personnage Ajouté", description: `${character.name} a été ajouté à l'aventure.` });
    };

    return (
        <>
            <PageStructure
                adventureSettings={adventureSettings}
                characters={characters}
                stagedAdventureSettings={memoizedStagedAdventureSettingsForForm}
                handleApplyStagedChanges={handleApplyStagedChanges}
                narrativeMessages={narrativeMessages}
                currentLanguage={currentLanguage}
                fileInputRef={fileInputRef}
                adventureFormRef={adventureFormRef}
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
                generateAdventureAction={generateAdventureAction}
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
                isGeneratingCover={handleGenerateCover}
                onSaveToLibrary={handleSaveToLibrary}
                merchantInventory={merchantInventory}
                shoppingCart={shoppingCart}
                onAddToCart={handleAddToCart}
                onRemoveFromCart={handleRemoveFromCart}
                onFinalizePurchase={onFinalizePurchase}
                onCloseMerchantPanel={handleCloseMerchantPanel}
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
