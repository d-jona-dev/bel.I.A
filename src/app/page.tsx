
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { Character, AdventureSettings, SaveData, Message, ActiveCombat, PlayerInventoryItem, LootedItem, PlayerSkill, Combatant, MapPointOfInterest, GeneratedResource, Familiar, FamiliarPassiveBonus, AiConfig, ImageTransform, PlayerAvatar, TimeManagementSettings, ComicPage, Panel, Bubble, SellingItem, BaseItem, BaseFamiliarComponent, EnemyUnit, LocalizedText } from "@/types";
import { PageStructure } from "./page.structure";

import { generateAdventure } from "@/ai/flows/generate-adventure";
import type { GenerateAdventureFlowOutput, GenerateAdventureOutput, CharacterUpdateSchema, AffinityUpdateSchema, RelationUpdateSchema, CombatUpdatesSchema, NewFamiliarSchema } from "@/ai/flows/generate-adventure";
import { generateSceneImage } from "@/ai/flows/generate-scene-image";
import type { GenerateSceneImageInput, GenerateSceneImageFlowOutput } from "@/ai/flows/generate-scene-image";
import { translateText } from "@/ai/flows/translate-text";
import type { TranslateTextInput, TranslateTextOutput } from "@/ai/flows/translate-text";
import { suggestQuestHook } from "@/ai/flows/suggest-quest-hook";
import type { SuggestQuestHookInput, SuggestQuestHookOutput } from "@/ai/flows/suggest-quest-hook";
import { suggestPlayerSkill } from "@/ai/flows/suggest-player-skill";
import type { SuggestPlayerSkillInput, SuggestPlayerSkillFlowOutput } from "@/ai/flows/suggest-player-skill";
import { materializeCharacter } from "@/ai/flows/materialize-character";
import type { MaterializeCharacterInput, MaterializeCharacterOutput } from "@/ai/flows/materialize-character";
import { summarizeHistory } from "@/ai/flows/summarize-history";
import type { SummarizeHistoryInput, SummarizeHistoryOutput } from "@/ai/flows/summarize-history";
import { BUILDING_DEFINITIONS, BUILDING_SLOTS, BUILDING_COST_PROGRESSION, poiLevelConfig, poiLevelNameMap } from "@/lib/buildings";
import { AdventureForm, type AdventureFormValues, type AdventureFormHandle, type FormCharacterDefinition } from '@/components/adventure-form';
import { useComic } from "@/hooks/systems/useComic";
import { useFamiliar } from "@/hooks/systems/useFamiliar";
import { BASE_CONSUMABLES, BASE_JEWELRY, BASE_ARMORS, BASE_WEAPONS, BASE_FAMILIAR_PHYSICAL_ITEMS, BASE_FAMILIAR_CREATURES, BASE_FAMILIAR_DESCRIPTORS } from "@/lib/items";
import { BASE_ENEMY_UNITS } from "@/lib/enemies"; // Import base enemies
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
const BASE_ATTRIBUTE_VALUE = 8;
const INITIAL_CREATION_ATTRIBUTE_POINTS_PLAYER = 10; // For player
const INITIAL_CREATION_ATTRIBUTE_POINTS_NPC_DEFAULT = 5; // Default for NPCs
const ATTRIBUTE_POINTS_PER_LEVEL_GAIN_FORM = 5;
const BASE_ATTRIBUTE_VALUE_FORM = 8; // Correction de l'erreur

// Calculates base stats derived from attributes, before equipment
const calculateBaseDerivedStats = (settings: Partial<AdventureSettings & Character>) => {
  const constitution = settings.constitution || settings.playerConstitution || BASE_ATTRIBUTE_VALUE;
  const intelligence = settings.intelligence || settings.playerIntelligence || BASE_ATTRIBUTE_VALUE;
  const dexterity = settings.dexterity || settings.playerDexterity || BASE_ATTRIBUTE_VALUE;
  const strength = settings.strength || settings.playerStrength || BASE_ATTRIBUTE_VALUE;
  const charClass = settings.characterClass || settings.playerClass || ""; // Use characterClass for NPC, playerClass for player
  const level = settings.level || settings.playerLevel || 1;


  let maxHp = 10 + (Math.floor((constitution - 10) / 2) + constitution) * level;
  if (charClass.toLowerCase().includes("guerrier") || charClass.toLowerCase().includes("barbare")) {
    maxHp += level * 2;
  } else if (charClass.toLowerCase().includes("mage") || charClass.toLowerCase().includes("sorcier") || charClass.toLowerCase().includes("étudiant")) {
    maxHp -= level * 1;
  }

  let maxMp = 0;
  if (charClass.toLowerCase().includes("magicien") || charClass.toLowerCase().includes("mage") || charClass.toLowerCase().includes("sorcier") || charClass.toLowerCase().includes("étudiant")) {
    maxMp = 10 + Math.max(0, (intelligence - 10)) * 2 + Math.floor(level / 2) * 5;
  }

  const baseArmorClass = 10 + Math.floor((dexterity - 10) / 2);
  const proficiencyBonus = Math.floor((level - 1) / 4) + 2;
  const baseAttackBonus = Math.floor(((strength) - 10) / 2) + proficiencyBonus;

  const strengthModifierValue = Math.floor(((strength) - 10) / 2);
  let baseDamageBonusString = "1"; // Base damage for unarmed
  if (strengthModifierValue > 0) {
    baseDamageBonusString = `1+${strengthModifierValue}`;
  } else if (strengthModifierValue < 0) {
     baseDamageBonusString = `1${strengthModifierValue}`;
  }


  return {
    maxHitPoints: Math.max(5, maxHp),
    maxManaPoints: Math.max(0, maxMp),
    armorClass: baseArmorClass,
    attackBonus: baseAttackBonus,
    damageBonus: baseDamageBonusString,
  };
};

// Calculates effective stats including equipment (PLAYER ONLY FOR NOW)
const calculateEffectiveStats = (settings: AdventureSettings) => {
    // Start with base attributes from settings
    let effectiveStrength = settings.playerStrength || BASE_ATTRIBUTE_VALUE;
    let effectiveDexterity = settings.playerDexterity || BASE_ATTRIBUTE_VALUE;
    let effectiveConstitution = settings.playerConstitution || BASE_ATTRIBUTE_VALUE;
    let effectiveIntelligence = settings.playerIntelligence || BASE_ATTRIBUTE_VALUE;
    let effectiveWisdom = settings.playerWisdom || BASE_ATTRIBUTE_VALUE;
    let effectiveCharisma = settings.playerCharisma || BASE_ATTRIBUTE_VALUE;
    
    const activeFamiliar = settings.familiars?.find(f => f.isActive);
    if (activeFamiliar?.passiveBonus) {
        const bonus = activeFamiliar.passiveBonus;
        const bonusValue = Math.floor(bonus.value * (activeFamiliar.level || 1));
        if (bonus.type === 'strength') effectiveStrength += bonusValue;
        if (bonus.type === 'dexterity') effectiveDexterity += bonusValue;
        if (bonus.type === 'constitution') effectiveConstitution += bonusValue;
        if (bonus.type === 'intelligence') effectiveIntelligence += bonusValue;
        if (bonus.type === 'wisdom') effectiveWisdom += bonusValue;
        if (bonus.type === 'charisma') effectiveCharisma += bonusValue;
    }

    const inventory = settings.playerInventory || [];
    const equippedJewelry = settings.equippedItemIds?.jewelry ? inventory.find(item => item.id === settings.equippedItemIds?.jewelry) : null;

    if (equippedJewelry?.statBonuses) {
        if (equippedJewelry.statBonuses.str) effectiveStrength += equippedJewelry.statBonuses.str;
        if (equippedJewelry.statBonuses.dex) effectiveDexterity += equippedJewelry.statBonuses.dex;
        if (equippedJewelry.statBonuses.con) effectiveConstitution += equippedJewelry.statBonuses.con;
        if (equippedJewelry.statBonuses.int) effectiveIntelligence += equippedJewelry.statBonuses.int;
        if (equippedJewelry.statBonuses.wis) effectiveWisdom += equippedJewelry.statBonuses.wis;
        if (equippedJewelry.statBonuses.cha) effectiveCharisma += equippedJewelry.statBonuses.cha;
    }

    const tempPlayerStatsForCalculation = {
        strength: effectiveStrength,
        dexterity: effectiveDexterity,
        constitution: effectiveConstitution,
        intelligence: effectiveIntelligence,
        playerClass: settings.playerClass,
        playerLevel: settings.playerLevel,
    };
    const baseDerived = calculateBaseDerivedStats(tempPlayerStatsForCalculation as any);
    
    let effectiveMaxHp = baseDerived.maxHitPoints;
    if (equippedJewelry?.statBonuses?.hp) {
        effectiveMaxHp += equippedJewelry.statBonuses.hp;
    }


    const agileAC = 10 + Math.floor((effectiveDexterity - 10) / 2);
    let armorBasedAC = 0;
    
    if (activeFamiliar?.passiveBonus) {
        const bonus = activeFamiliar.passiveBonus;
        const bonusValue = Math.floor(bonus.value * (activeFamiliar.level || 1));
        if (bonus.type === 'armor_class') armorBasedAC += bonusValue;
    }

    const armorId = settings.equippedItemIds?.armor;
    const equippedArmor = armorId ? inventory.find(item => item.id === armorId) : null;

    if (equippedArmor) {
        let baseACFromArmor = 0;
        if (equippedArmor.ac?.includes('+')) {
            const baseAC = parseInt(equippedArmor.ac, 10);
            const dexMod = Math.floor((effectiveDexterity - 10) / 2);
            
            let maxDex = Infinity;
            const maxMatch = equippedArmor.ac.match(/\(max \+(\d+)\)/);
            if (maxMatch) {
                maxDex = parseInt(maxMatch[1], 10);
            }
            
            baseACFromArmor = baseAC + Math.min(dexMod, maxDex);
        } else if (equippedArmor.ac) {
            baseACFromArmor = parseInt(equippedArmor.ac, 10);
        }
        
        let bonusAC = 0;
        if (equippedArmor?.statBonuses?.ac) {
             bonusAC = equippedArmor.statBonuses.ac;
        }

        armorBasedAC += (baseACFromArmor + bonusAC);
    }
   
    if (equippedJewelry?.statBonuses?.ac) {
        armorBasedAC += equippedJewelry.statBonuses.ac;
    }

    const effectiveAC = Math.max(agileAC, armorBasedAC);
    let effectiveAttackBonus = baseDerived.attackBonus;
    
    if (activeFamiliar?.passiveBonus) {
        const bonus = activeFamiliar.passiveBonus;
        const bonusValue = Math.floor(bonus.value * (activeFamiliar.level || 1));
        if (bonus.type === 'attack_bonus') effectiveAttackBonus += bonusValue;
    }

    const weaponId = settings.equippedItemIds?.weapon;
    const equippedWeapon = weaponId ? inventory.find(item => item.id === weaponId) : null;

    if (equippedWeapon?.statBonuses?.attack) {
        effectiveAttackBonus += equippedWeapon.statBonuses.attack;
    }
    if (equippedJewelry?.statBonuses?.attack) {
        effectiveAttackBonus += equippedJewelry.statBonuses.attack;
    }

    const strengthModifierValue = Math.floor((effectiveStrength - 10) / 2);
    let weaponDamageDice = equippedWeapon?.damage;
    let effectiveDamageBonus = baseDerived.damageBonus;
    
    if (equippedWeapon && weaponDamageDice) {
        let bonusFromStrength = strengthModifierValue;
        if (equippedWeapon.statBonuses?.damage?.startsWith('+')) {
           bonusFromStrength += parseInt(equippedWeapon.statBonuses.damage.substring(1), 10);
        }
        
        effectiveDamageBonus = weaponDamageDice;
        if (bonusFromStrength > 0) {
            effectiveDamageBonus = `${weaponDamageDice}+${bonusFromStrength}`;
        } else if (bonusFromStrength < 0) {
            effectiveDamageBonus = `${weaponDamageDice}${bonusFromStrength}`;
        }
    }


    return {
        playerMaxHp: effectiveMaxHp,
        playerMaxMp: baseDerived.maxManaPoints,
        playerArmorClass: effectiveAC,
        playerAttackBonus: effectiveAttackBonus,
        playerDamageBonus: effectiveDamageBonus,
        // Return the effective stats for this calculation, but DO NOT save them back to the base stats
    };
};

export interface SellingItemDetails {
  item: PlayerInventoryItem;
  sellPricePerUnit: number;
}

const uid = (n = 6) => Math.random().toString(36).slice(2, 2 + n);


// Function to create a clean, default state
const createInitialState = (): { settings: AdventureSettings; characters: Character[]; narrative: Message[], aiConfig: AiConfig } => {
  const initialSettings: AdventureSettings = {
    world: { fr: "Un nouveau monde vous attend. Décrivez-le ici." },
    initialSituation: { fr: "Vous êtes au début de votre aventure. Que se passe-t-il ?" },
    rpgMode: true,
    relationsMode: true,
    strategyMode: true,
    comicModeActive: false,
    playerName: "Héros",
    playerClass: "Aventurier",
    playerLevel: 1,
    playerDetails: "",
    playerDescription: "",
    playerOrientation: "",
    playerPortraitUrl: null,
    playerFaceSwapEnabled: false,
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
    equippedItemIds: { weapon: null, armor: null, jewelry: null },
    playerSkills: [],
    familiars: [],
    mapPointsOfInterest: [],
    mapImageUrl: null,
    timeManagement: {
      enabled: false,
      day: 1,
      dayName: "Lundi",
      dayNames: ["Lundi", "Mardi", "Mercredi", "Jeudi, Vendredi", "Samedi", "Dimanche"],
      currentTime: "12:00",
      timeFormat: "24h",
      currentEvent: "",
      timeElapsedPerTurn: "00:15",
    },
    activeItemUniverses: ['Médiéval-Fantastique'],
  };

  const initialNarrative: Message[] = [
      { id: `msg-${Date.now()}`, type: 'system', content: initialSettings.initialSituation.fr, timestamp: Date.now() }
  ];
  
  const initialAiConfig: AiConfig = {
    llm: { source: 'gemini' },
    image: { source: 'gemini' }
  };

  return { settings: initialSettings, characters: [], narrative: initialNarrative, aiConfig: initialAiConfig };
};

export default function Home() {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const adventureFormRef = React.useRef<AdventureFormHandle>(null);
    const { toast } = useToast();

    // Main adventure state
    const [adventureSettings, setAdventureSettings] = React.useState<AdventureSettings>(() => createInitialState().settings);
    const [characters, setCharacters] = React.useState<Character[]>(() => createInitialState().characters);
    const [activeCombat, setActiveCombat] = React.useState<ActiveCombat | undefined>(undefined);
    const [narrativeMessages, setNarrativeMessages] = React.useState<Message[]>(() => createInitialState().narrative);
    const [currentLanguage, setCurrentLanguage] = React.useState<string>("fr");
    const [aiConfig, setAiConfig] = React.useState<AiConfig>(() => createInitialState().aiConfig);
    const [merchantInventory, setMerchantInventory] = React.useState<SellingItem[]>([]);
    const [shoppingCart, setShoppingCart] = React.useState<SellingItem[]>([]);

    // Item definitions
    const [allConsumables, setAllConsumables] = React.useState<BaseItem[]>([]);
    const [allWeapons, setWeapons] = React.useState<BaseItem[]>([]);
    const [allArmors, setAllArmors] = React.useState<BaseItem[]>([]);
    const [allJewelry, setAllJewelry] = React.useState<BaseItem[]>([]);
    const [physicalFamiliarItems, setPhysicalFamiliarItems] = React.useState<BaseFamiliarComponent[]>([]);
    const [creatureFamiliarItems, setCreatureFamiliarItems] = React.useState<BaseFamiliarComponent[]>([]);
    const [descriptorFamiliarItems, setDescriptorFamiliarItems] = React.useState<BaseFamiliarComponent[]>([]);
    const [allEnemies, setAllEnemies] = React.useState<EnemyUnit[]>([]);
    
    // Comic related state moved to useComic hook
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
        handleSetIsSaveComicDialogOpen,
        handleSetComicTitle,
        handleGenerateCover,
        handleSaveToLibrary,
    } = useComic({
        narrativeMessages,
        generateSceneImageAction: (input) => generateSceneImage(input, aiConfig),
    });

    // Base state for resets
    const [baseCharacters, setBaseCharacters] = React.useState<Character[]>(() => JSON.parse(JSON.stringify(createInitialState().characters)));
    const [baseAdventureSettings, setBaseAdventureSettings] = React.useState<AdventureSettings>(() => JSON.parse(JSON.stringify(createInitialState().settings)));
    
    // UI and loading states
    const [formPropKey, setFormPropKey] = React.useState(0);
    const [isLoading, setIsLoading] = React.useState<boolean>(false);
    const [isRegenerating, setIsRegenerating] = React.useState<boolean>(false);
    const [showRestartConfirm, setShowRestartConfirm] = React.useState<boolean>(false);
    const [isSuggestingQuest, setIsSuggestingQuest] = React.useState<boolean>(false);
    const [isGeneratingItemImage, setIsGeneratingItemImage] = React.useState<boolean>(false);
    const [itemToSellDetails, setItemToSellDetails] = React.useState<SellingItemDetails | null>(null);
    const [sellQuantity, setSellQuantity] = React.useState(1);
    const [isLoadingInitialSkill, setIsLoadingInitialSkill] = React.useState<boolean>(false);
    const [useAestheticFont, setUseAestheticFont] = React.useState(true);
    const [isGeneratingMap, setIsGeneratingMap] = React.useState(false);

    // Combat targeting state
    const [itemToUse, setItemToUse] = React.useState<PlayerInventoryItem | null>(null);
    const [isTargeting, setIsTargeting] = React.useState(false);
    
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
        handleSendSpecificAction: (action) => handleSendSpecificAction(action),
    });


    // --- Core Action Handlers ---
    
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
    }, []);
    
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
    }, [toast]);
    
    const addCurrencyToPlayer = React.useCallback((amount: number) => {
        setAdventureSettings(prevSettings => {
            if (!prevSettings.rpgMode) return prevSettings;
            let currentGold = prevSettings.playerGold ?? 0;
            let newGold = currentGold + amount;
            if (newGold < 0) newGold = 0;
            return { ...prevSettings, playerGold: newGold };
        });
    }, []);

    const handleCharacterHistoryUpdate = React.useCallback((updates: CharacterUpdateSchema[]) => {
        if (!updates || updates.length === 0) return;
        
        setCharacters(prevChars => {
            let changed = false;
            const updatedChars = prevChars.map(char => {
                const charUpdates = updates.filter(u => u.characterName.toLowerCase() === char.name.toLowerCase());
                if (charUpdates.length > 0) {
                    changed = true;
                    const newHistory = charUpdates.map(u => u.historyEntry);
                    return {
                        ...char,
                        history: [...(char.history || []), ...newHistory].slice(-20),
                    };
                }
                return char;
            });
            if (changed) {
                 toast({
                    title: "Souvenir Enregistré",
                    description: `L'historique de ${updates.map(u => u.characterName).join(', ')} a été mis à jour.`,
                });
                return updatedChars;
            }
            return prevChars;
        });
    }, [toast]);

    const handleAffinityUpdates = React.useCallback((updates: AffinityUpdateSchema[]) => {
        const currentRelationsMode = adventureSettings.relationsMode ?? true;
        if (!currentRelationsMode || !updates || updates.length === 0) return;

        const toastsToShow: Array<Parameters<typeof toast>[0]> = [];

        setCharacters(prevChars => {
            let changed = false;
            const updatedChars = prevChars.map(char => {
                const affinityUpdate = updates.find(u => u.characterName.toLowerCase() === char.name.toLowerCase());
                if (affinityUpdate) {
                    changed = true;
                    const currentAffinity = char.affinity ?? 50;
                    const clampedChange = Math.max(-10, Math.min(10, affinityUpdate.change));
                    const newAffinity = Math.max(0, Math.min(100, currentAffinity + clampedChange));

                    if (Math.abs(clampedChange) >= 3) {
                        const charName = affinityUpdate.characterName;
                        const direction = clampedChange > 0 ? 'améliorée' : 'détériorée';
                        toastsToShow.push({
                            title: `Affinité Modifiée: ${charName}`,
                            description: `Votre relation avec ${charName} s'est significativement ${direction}. Raison: ${affinityUpdate.reason || 'Interaction récente'}`,
                        });
                    }
                    return { ...char, affinity: newAffinity };
                }
                return char;
            });
            if (changed) return updatedChars;
            return prevChars;
        });
        toastsToShow.forEach(toastArgs => React.startTransition(() => { toast(toastArgs); }));
    }, [toast, adventureSettings.relationsMode]);

    const handleRelationUpdatesFromAI = React.useCallback((updates: RelationUpdateSchema[]) => {
        const currentRelationsMode = adventureSettings.relationsMode ?? true;
        const currentPlayerName = adventureSettings.playerName || "Player";
        if (!currentRelationsMode || !updates || !updates.length) return;

        const defaultRelationDesc = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
        const toastsToShow: Array<Parameters<typeof toast>[0]> = [];

        setCharacters(prevChars => {
            let charsCopy = JSON.parse(JSON.stringify(prevChars)) as Character[];
            let changed = false;

            updates.forEach(update => {
                const sourceCharIndex = charsCopy.findIndex((c: Character) => c.name.toLowerCase() === update.characterName.toLowerCase());
                if (sourceCharIndex === -1) return;

                let targetId: string | null = null;
                if (update.targetName.toLowerCase() === currentPlayerName.toLowerCase()) {
                    targetId = PLAYER_ID;
                } else {
                    const targetChar = charsCopy.find((c:Character) => c.name.toLowerCase() === update.targetName.toLowerCase());
                    if (targetChar) targetId = targetChar.id;
                    else return;
                }

                if (!targetId) return;

                const currentRelation = charsCopy[sourceCharIndex].relations?.[targetId] || defaultRelationDesc;
                const newRelationFromAI = update.newRelation.trim() === "" || update.newRelation.toLowerCase() === "inconnu" || update.newRelation.toLowerCase() === "unknown" ? defaultRelationDesc : update.newRelation;


                if (currentRelation !== newRelationFromAI) {
                    if (!charsCopy[sourceCharIndex].relations) {
                        charsCopy[sourceCharIndex].relations = {};
                    }
                    charsCopy[sourceCharIndex].relations![targetId] = newRelationFromAI;
                    changed = true;
                    toastsToShow.push({
                        title: `Relation Changée: ${update.characterName}`,
                        description: `Relation envers ${update.targetName} est maintenant "${newRelationFromAI}". Raison: ${update.reason || 'Événement narratif'}`,
                    });

                    if (targetId !== PLAYER_ID) {
                        const targetCharIndex = charsCopy.findIndex(c => c.id === targetId);
                        if (targetCharIndex !== -1) {
                            if (!charsCopy[targetCharIndex].relations) {
                            charsCopy[targetCharIndex].relations = {};
                            }
                            charsCopy[targetCharIndex].relations![charsCopy[sourceCharIndex].id] = newRelationFromAI;
                        }
                    }
                }
            });

            if (changed) return charsCopy;
            return prevChars;
        });
        toastsToShow.forEach(toastArgs => React.startTransition(() => { toast(toastArgs); }));
    }, [currentLanguage, adventureSettings.playerName, toast, adventureSettings.relationsMode]);

    const handleTimeUpdate = React.useCallback((timeUpdateFromAI: { newEvent?: string } | undefined) => {
        setAdventureSettings(prev => {
            if (!prev.timeManagement?.enabled) return prev;
    
            const { currentTime, timeElapsedPerTurn, day, dayNames = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] } = prev.timeManagement;
    
            const [h1, m1] = currentTime.split(':').map(Number);
            const [h2, m2] = timeElapsedPerTurn.split(':').map(Number);
            
            let totalMinutes = m1 + m2;
            let totalHours = h1 + h2 + Math.floor(totalMinutes / 60);
            
            let newDay = day;
            if (totalHours >= 24) {
                newDay += Math.floor(totalHours / 24);
                totalHours %= 24;
            }
    
            const newCurrentTime = `${String(totalHours).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
            const newDayName = dayNames[(newDay - 1) % dayNames.length];
            
            return {
                ...prev,
                timeManagement: {
                    ...prev.timeManagement,
                    day: newDay,
                    dayName: newDayName,
                    currentTime: newCurrentTime,
                    currentEvent: timeUpdateFromAI?.newEvent || prev.timeManagement.currentEvent,
                },
            };
        });
    }, []);
    
    // UPDATED to call the new flow
    const handleMaterializeCharacter = React.useCallback(async (narrativeContext: string) => {
        setIsLoading(true);
        toast({ title: "Analyse du personnage...", description: "L'IA identifie et crée la fiche du personnage." });

        const existingCharacterNames = characters.map(c => c.name);

        try {
            const input: MaterializeCharacterInput = {
                narrativeContext: narrativeContext,
                existingCharacters: existingCharacterNames,
                rpgMode: adventureSettings.rpgMode,
                currentLanguage,
            };

            const newCharData = await materializeCharacter(input);
            
            // This is the new character creation logic, adapted for a single character
            const newCharacter = {
                ...newCharData,
                id: `char-${newCharData.name.toLowerCase().replace(/\s/g, '-')}-${uid()}`,
                locationId: adventureSettings.playerLocationId,
            };
            
            setCharacters(prev => [...prev, newCharacter]);

            toast({ title: "Personnage Ajouté!", description: `${newCharData.name} a été ajouté à la liste des personnages.` });

        } catch (error) {
            console.error("Error materializing character:", error);
            toast({ title: "Erreur de Création", description: `Impossible de créer le personnage: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [characters, adventureSettings.rpgMode, adventureSettings.playerLocationId, currentLanguage, toast]);
    
    // NEW: Function to handle summarizing history
    const handleSummarizeHistory = React.useCallback(async (narrativeContext: string) => {
        setIsLoading(true);
        toast({ title: "Mémorisation en cours...", description: "L'IA résume les points clés de l'événement." });
        
        const involvedCharacterNames = characters
            .filter(c => narrativeContext.toLowerCase().includes(c.name.toLowerCase()))
            .map(c => c.name);

        try {
            const input: SummarizeHistoryInput = {
                narrativeContext,
                involvedCharacters: involvedCharacterNames,
                currentLanguage,
            };

            const historyUpdates = await summarizeHistory(input);
            
            if (historyUpdates && historyUpdates.length > 0) {
                handleCharacterHistoryUpdate(historyUpdates);
            } else {
                toast({ title: "Rien à Mémoriser", description: "L'IA n'a trouvé aucun événement significatif à enregistrer pour les personnages impliqués.", variant: "default" });
            }

        } catch (error) {
             console.error("Error summarizing history:", error);
             toast({ title: "Erreur de Mémorisation", description: `Impossible de résumer l'événement: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }

    }, [characters, currentLanguage, toast, handleCharacterHistoryUpdate]);


    const handleCombatUpdates = React.useCallback((updates: CombatUpdatesSchema) => {
        if (!updates) return;
    
        if (updates.updatedCombatants) {
            const combatantsMap = new Map(updates.updatedCombatants.map(c => [c.combatantId, c]));
            setCharacters(prev =>
                prev.map(char => {
                    const update = combatantsMap.get(char.id);
                    if (update) {
                    return {
                        ...char,
                        hitPoints: update.newHp,
                        manaPoints: update.newMp ?? char.manaPoints,
                        statusEffects: update.newStatusEffects ?? char.statusEffects,
                    };
                    }
                    return char;
                })
            );
        }
    
        const playerUpdate = updates.updatedCombatants?.find(c => c.combatantId === PLAYER_ID);
        if (playerUpdate) {
            setAdventureSettings(prev => ({
            ...prev,
            playerCurrentHp: playerUpdate.newHp,
            playerCurrentMp: playerUpdate.newMp ?? prev.playerCurrentMp,
            }));
        }
        
        if (updates.combatEnded) {
            let lootMessage = "Le combat est terminé ! ";
            
            const newLootItems: LootedItem[] = (updates.itemsObtained || []).map(item => ({
                itemName: item.itemName,
                quantity: item.quantity,
                description: item.description,
                effect: item.effect,
                itemType: item.itemType,
                goldValue: item.goldValue,
                statBonuses: item.statBonuses,
            }));

            if (updates.expGained && updates.expGained > 0) {
                lootMessage += `Vous gagnez ${updates.expGained} points d'expérience. `;
                setAdventureSettings(prev => {
                    const newExp = (prev.playerCurrentExp || 0) + updates.expGained!;
                    
                    let updatedFamiliars = prev.familiars || [];
                    const activeFamiliar = updatedFamiliars.find(f => f.isActive);
                    if (activeFamiliar) {
                        activeFamiliar.currentExp += updates.expGained!;
                        if (activeFamiliar.currentExp >= activeFamiliar.expToNextLevel) {
                            activeFamiliar.level += 1;
                            activeFamiliar.currentExp -= activeFamiliar.currentExpToNextLevel;
                            activeFamiliar.expToNextLevel = Math.floor(100 * Math.pow(1.5, activeFamiliar.level - 1));
                            React.startTransition(() => {
                                toast({
                                    title: "Familier a monté de niveau!",
                                    description: `${activeFamiliar.name} est maintenant niveau ${activeFamiliar.level}!`
                                });
                            });
                        }
                    }

                    return {...prev, playerCurrentExp: newExp, familiars: updatedFamiliars};
                });
            }
            if (updates.currencyGained && updates.currencyGained > 0) {
                lootMessage += `Vous trouvez ${updates.currencyGained} pièces d'or.`;
                addCurrencyToPlayer(updates.currencyGained);
            }
            
            if (lootMessage.trim() !== "Le combat est terminé!") {
                handleNarrativeUpdate(lootMessage, 'system', undefined, newLootItems);
            }
            
            setActiveCombat(undefined);
        }
        
        else if (updates.nextActiveCombatState) {
            setActiveCombat(updates.nextActiveCombatState);
        }

    }, [handleNarrativeUpdate, addCurrencyToPlayer, toast]);
  
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
    }, [toast, characters, adventureSettings.playerName]);

    const resolveCombatTurn = React.useCallback(
        (
            currentCombatState: ActiveCombat,
            settings: AdventureSettings,
            allCharacters: Character[]
        ): {
            nextCombatState: ActiveCombat;
            turnLog: string[];
            combatUpdates: CombatUpdatesSchema;
            conquestHappened: boolean;
            
        } => {
            let turnLog: string[] = [];
            let updatedCombatants = JSON.parse(JSON.stringify(currentCombatState.combatants)) as Combatant[];
            const effectivePlayerStats = calculateEffectiveStats(settings);
            let conquestHappened = false;
            
            
            const getDamage = (damageBonus: string | undefined): number => {
                if (!damageBonus) return 1;
                const match = damageBonus.match(/(\d+)d(\d+)([+-]\d+)?/);
                let damage = 1;
                if (match) {
                    const [_, diceCount, diceSides, bonus] = match;
                    damage = 0;
                    for (let i = 0; i < parseInt(diceCount, 10); i++) {
                        damage += Math.floor(Math.random() * parseInt(diceSides, 10)) + 1;
                    }
                    if (bonus) damage += parseInt(bonus, 10);
                } else if (!isNaN(parseInt(damageBonus, 10))) {
                    damage = parseInt(damageBonus, 10);
                }
                return Math.max(1, damage);
            };
            
            const player = updatedCombatants.find(c => c.characterId === PLAYER_ID);
            if (player && !player.isDefeated) {
                 const target = updatedCombatants.find(c => c.team === 'enemy' && !c.isDefeated);
                 if(target) {
                     const attackRoll = Math.floor(Math.random() * 20) + 1;
                     const totalAttack = attackRoll + (effectivePlayerStats.playerAttackBonus || 0);
                     const targetData = allCharacters.find(c => c.id === target.characterId);
                     const targetAC = targetData?.armorClass ?? 10;
      
                     if (totalAttack >= targetAC) {
                         const damage = getDamage(effectivePlayerStats.playerDamageBonus);
                         target.currentHp = Math.max(0, target.currentHp - damage);
                         turnLog.push(`${player.name} touche ${target.name} et inflige ${damage} points de dégâts.`);
                         if (target.currentHp === 0) {
                             target.isDefeated = true;
                             turnLog.push(`${target.name} est vaincu!`);
                         }
                     } else {
                         turnLog.push(`${player.name} attaque ${target.name} mais rate son coup.`);
                     }
                 }
            }
        
            updatedCombatants.filter(c => c.team === 'enemy' && !c.isDefeated).forEach(enemy => {
                const targetPool = updatedCombatants.filter(t => t.team === 'player' && !t.isDefeated);
                if (targetPool.length > 0) {
                    const target = targetPool[Math.floor(Math.random() * targetPool.length)];
                    const enemyData = allCharacters.find(c => c.id === enemy.characterId);
                    const attackRoll = Math.floor(Math.random() * 20) + 1;
                    const totalAttack = attackRoll + (enemyData?.attackBonus || 0);
                    
                    let targetAC = 10;
                    if (target.characterId === PLAYER_ID) {
                        targetAC = effectivePlayerStats.playerArmorClass || 10;
                    } else {
                        const allyData = allCharacters.find(c => c.id === target.characterId);
                        targetAC = allyData?.armorClass ?? 10;
                    }
        
                    if (totalAttack >= targetAC) {
                        const damage = getDamage(enemyData?.damageBonus);
                        target.currentHp = Math.max(0, target.currentHp - damage);
                        turnLog.push(`${enemy.name} attaque ${target.name} et inflige ${damage} points de dégâts.`);
                        if (target.currentHp === 0) {
                            target.isDefeated = true;
                            turnLog.push(`${target.name} est vaincu!`);
                        }
                    } else {
                        turnLog.push(`${enemy.name} attaque ${target.name} et rate.`);
                     }
                }
            });
            
            const allEnemiesDefeated = updatedCombatants.filter(c => c.team === 'enemy').every(c => c.isDefeated);
            const allPlayersDefeated = updatedCombatants.filter(c => c.team === 'player').every(c => c.isDefeated);
            
            const hasHuntReward = updatedCombatants.some(c => c.team === 'enemy' && c.isDefeated && c.rewardItem);
            
            let isCombatOver = allEnemiesDefeated || allPlayersDefeated;
            if (isCombatOver && allEnemiesDefeated && hasHuntReward) {
                isCombatOver = false;
            }

            let expGained = 0;
            let currencyGained = 0;
            let itemsObtained: PlayerInventoryItem[] = [];
      
            if (isCombatOver && allEnemiesDefeated) {
                updatedCombatants.filter(c => c.team === 'enemy' && c.isDefeated).forEach(enemy => {
                    const enemyData = baseCharacters.find(bc => bc.id === enemy.characterId);
                    if (enemyData) {
                        expGained += (enemyData.level || 1) * 10;
                        currencyGained += Math.floor(Math.random() * (enemyData.level || 1) * 5) + (enemyData.level || 1);
                    }
                });

                turnLog.push(`Victoire!`);
                
                if(currentCombatState.contestedPoiId) {
                    conquestHappened = true; // Signal that a conquest happened
                    const poiName = settings.mapPointsOfInterest?.find(p=>p.id === currentCombatState.contestedPoiId)?.name || "Territoire Inconnu";
                    turnLog.push(`Le territoire de ${poiName} est conquis!`);
                }
                
                
            }
      
            const combatUpdates: CombatUpdatesSchema = {
                updatedCombatants: updatedCombatants.map(c => ({
                    combatantId: c.characterId,
                    newHp: c.currentHp,
                    newMp: c.currentMp,
                    isDefeated: c.isDefeated,
                    newStatusEffects: c.statusEffects,
                })),
                combatEnded: isCombatOver,
                expGained: expGained,
                currencyGained: currencyGained,
                itemsObtained: itemsObtained.map(item => ({
                    itemName: item.name,
                    quantity: item.quantity,
                    description: item.description,
                    effect: item.effect,
                    itemType: item.type,
                    goldValue: item.goldValue,
                    statBonuses: item.statBonuses,
                })),
                turnNarration: turnLog.join('\n'), // For AI context
                nextActiveCombatState: {
                    ...currentCombatState,
                    combatants: updatedCombatants,
                    isActive: !isCombatOver,
                }
            };
      
            return {
                nextCombatState: combatUpdates.nextActiveCombatState!,
                turnLog,
                combatUpdates,
                conquestHappened,
            };
        }, [baseCharacters]
    );

    const callGenerateAdventure = React.useCallback(async (userActionText: string, locationIdOverride?: string) => {
        React.startTransition(() => {
          setIsLoading(true);
        });
    
        let liveSettings = { ...adventureSettings };
        let liveCharacters = [...characters];
        let liveCombat = activeCombat ? { ...activeCombat } : undefined;
        let turnLog: string[] = [];
        let internalCombatUpdates: CombatUpdatesSchema | undefined;
        let conquestHappened = false;
        

        if (locationIdOverride) {
            liveSettings.playerLocationId = locationIdOverride;
            liveCharacters = liveCharacters.map(char => 
                char.isAlly ? { ...char, locationId: locationIdOverride } : char
            );
        }
        
        if (liveCombat?.isActive) {
            const combatResult = resolveCombatTurn(liveCombat, liveSettings, liveCharacters);
            internalCombatUpdates = combatResult.combatUpdates;
            liveCombat = combatResult.nextCombatState;
            turnLog = combatResult.turnLog;
            conquestHappened = combatResult.conquestHappened;
            
            handleCombatUpdates(internalCombatUpdates);
        }
    
        if (conquestHappened && liveCombat?.contestedPoiId) {
            handlePoiOwnershipChange([{
                poiId: liveCombat.contestedPoiId,
                newOwnerId: PLAYER_ID
            }]);
        }
        
        const presentCharacters = liveCharacters.filter(char => char.locationId === liveSettings.playerLocationId);
        const currentPlayerLocation = liveSettings.playerLocationId ? liveSettings.mapPointsOfInterest?.find(poi => poi.id === liveSettings.playerLocationId) : undefined;
        
        let ownerNameForPrompt = "Inconnu";
        if (currentPlayerLocation?.ownerId) {
            ownerNameForPrompt = currentPlayerLocation.ownerId === PLAYER_ID ? (liveSettings.playerName || "Player") : (liveCharacters.find(c => c.id === currentPlayerLocation.ownerId)?.name || 'un inconnu');
        }
    
        const effectiveStatsThisTurn = calculateEffectiveStats(liveSettings);
        
        const worldText = liveSettings.world[currentLanguage] || liveSettings.world['en'] || Object.values(liveSettings.world)[0] || "";
        const initialSituationText = liveSettings.initialSituation[currentLanguage] || liveSettings.initialSituation['en'] || Object.values(liveSettings.initialSituation)[0] || "";
        const contextSituation = narrativeMessages.length > 1 ? [...narrativeMessages, {id: 'temp-user', type: 'user', content: userActionText, timestamp: Date.now()}].slice(-5).map(msg => msg.type === 'user' ? `${liveSettings.playerName || 'Player'}: ${msg.content}` : msg.content).join('\n\n') : initialSituationText;

    
        const input: GenerateAdventureInput = {
            world: worldText,
            initialSituation: contextSituation,
            characters: presentCharacters, 
            userAction: turnLog.length > 0 ? turnLog.join('\n') : userActionText,
            currentLanguage,
            playerName: liveSettings.playerName || "Player",
            rpgModeActive: liveSettings.rpgMode,
            relationsModeActive: liveSettings.relationsMode ?? true,
            comicModeActive: liveSettings.comicModeActive ?? false,
            activeCombat: liveCombat,
            playerGold: liveSettings.playerGold,
            playerSkills: liveSettings.playerSkills,
            playerClass: liveSettings.playerClass,
            playerLevel: liveSettings.playerLevel,
            playerCurrentHp: liveSettings.playerCurrentHp,
            playerMaxHp: effectiveStatsThisTurn.playerMaxHp,
            playerCurrentMp: liveSettings.playerCurrentMp,
            playerMaxMp: effectiveStatsThisTurn.playerMaxMp,
            playerCurrentExp: liveSettings.playerCurrentExp,
            playerExpToNextLevel: liveSettings.playerExpToNextLevel,
            playerStrength: liveSettings.playerStrength,
            playerDexterity: liveSettings.playerDexterity,
            playerConstitution: liveSettings.playerConstitution,
            playerIntelligence: liveSettings.playerIntelligence,
            playerWisdom: liveSettings.playerWisdom,
            playerCharisma: liveSettings.playerCharisma,
            playerArmorClass: effectiveStatsThisTurn.playerArmorClass,
            playerAttackBonus: effectiveStatsThisTurn.playerAttackBonus,
            playerDamageBonus: effectiveStatsThisTurn.playerDamageBonus,
            equippedWeaponName: liveSettings.equippedItemIds?.weapon ? liveSettings.playerInventory?.find(i => i.id === liveSettings.equippedItemIds?.weapon)?.name : undefined,
            equippedArmorName: liveSettings.equippedItemIds?.armor ? liveSettings.playerInventory?.find(i => i.id === liveSettings.equippedItemIds?.armor)?.name : undefined,
            equippedJewelryName: liveSettings.equippedItemIds?.jewelry ? liveSettings.playerInventory?.find(i => i.id === liveSettings.equippedItemIds?.jewelry)?.name : undefined,
            playerLocationId: liveSettings.playerLocationId,
            mapPointsOfInterest: liveSettings.mapPointsOfInterest,
            playerLocation: currentPlayerLocation ? { ...currentPlayerLocation, ownerName: ownerNameForPrompt } : undefined,
            aiConfig,
            timeManagement: liveSettings.timeManagement,
            playerPortraitUrl: liveSettings.playerPortraitUrl,
            playerFaceSwapEnabled: liveSettings.playerFaceSwapEnabled,
            merchantInventory,
        };
    
        try {
            const result: GenerateAdventureFlowOutput = await generateAdventure(input);
            
            if (result.error && !result.narrative) {
                React.startTransition(() => {
                    toast({ title: "Erreur de l'IA", description: result.error, variant: "destructive" });
                });
            } else {
                const narrativeContent = result.narrative || (turnLog.length > 0 ? turnLog.join('\n') : "L'action se déroule, mais l'IA n'a pas fourni de description.");
                
                React.startTransition(() => {
                    if (locationIdOverride) {
                        setAdventureSettings(prev => ({...prev, playerLocationId: locationIdOverride}));
                        setCharacters(liveCharacters);
                    }
                    
                    let finalLoot = [...(result.itemsObtained || [])];
                    
                                    
                    handleNarrativeUpdate(narrativeContent, 'ai', result.sceneDescriptionForImage, finalLoot, undefined, undefined, result.speakingCharacterNames);
    
                    if (result.newFamiliars) result.newFamiliars.forEach(f => handleNewFamiliar(f as Familiar));
                    
                    if (liveSettings.relationsMode && result.affinityUpdates) {
                        const clampedAffinityUpdates = result.affinityUpdates.map(u => ({
                            ...u,
                            change: Math.max(-10, Math.min(10, u.change)),
                        }));
                        handleAffinityUpdates(clampedAffinityUpdates);
                    }
                    
                    if (liveSettings.relationsMode && result.relationUpdates) handleRelationUpdatesFromAI(result.relationUpdates);
                    
                    if (liveSettings.timeManagement?.enabled) {
                        handleTimeUpdate(result.updatedTime);
                    }
                    
                    if (liveSettings.rpgMode && typeof result.currencyGained === 'number' && result.currencyGained !== 0) {
                        addCurrencyToPlayer(result.currencyGained);
                         React.startTransition(() => {
                            toast({
                                title: result.currencyGained! > 0 ? "Pièces d'Or Reçues!" : "Dépense Effectuée",
                                description: `Votre trésorerie a été mise à jour.`
                            });
                        });
                    }
                });
            }
        } catch (error) { 
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error("[LOG_PAGE_TSX][callGenerateAdventure] Critical Error:", error);
            React.startTransition(() => {
                toast({ title: "Erreur Critique de l'IA", description: `Une erreur inattendue est survenue: ${errorMessage}`, variant: "destructive" });
            });
        } finally {
            setIsLoading(false);
        }
    }, [
        currentLanguage, narrativeMessages, toast,
        handleNewFamiliar, handleNarrativeUpdate, 
        handleAffinityUpdates, handleRelationUpdatesFromAI,
        handleCombatUpdates, handlePoiOwnershipChange, addCurrencyToPlayer,
        handleTimeUpdate, resolveCombatTurn, adventureSettings,
        characters, activeCombat, aiConfig, baseCharacters, merchantInventory
    ]);
    // --- End Core Action Handlers ---

    const generateSceneImageActionWrapper = React.useCallback(
        async (input: GenerateSceneImageInput): Promise<GenerateSceneImageFlowOutput> => {
            const result = await generateSceneImage(input, aiConfig);
            if (result.error) {
                React.startTransition(() => {
                    toast({ title: "Erreur de Génération d'Image IA", description: result.error, variant: "destructive" });
                });
                return { imageUrl: "", error: result.error };
            }
            return result;
        }, [toast, aiConfig]);

    const handleSendSpecificAction = React.useCallback(async (action: string) => {
        if (!action || isLoading) return;

        handleNarrativeUpdate(action, 'user');
        setIsLoading(true);

        try {
            await callGenerateAdventure(action);
        } catch (error) { 
            console.error("Error in handleSendSpecificAction trying to generate adventure:", error);
            React.startTransition(() => {
                toast({ title: "Erreur Critique de l'IA", description: "Impossible de générer la suite de l'aventure.", variant: "destructive" });
            });
            setIsLoading(false);
        }
    }, [isLoading, handleNarrativeUpdate, callGenerateAdventure, toast]);
   
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
            const newCharactersToAdd: Character[] = npcsToRecruit.map(npcItem => {
                 const baseStats = calculateBaseDerivedStats({
                    level: 1, characterClass: "Mercenaire", strength: 12, dexterity: 12, constitution: 12, intelligence: 10, wisdom: 10, charisma: 10
                 });
                boughtItemsSummary.push(`1x Compagnon: ${npcItem.name}`);
                return {
                    id: `${npcItem.baseItemId}-${uid()}`,
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
            //handleNewCharacters(newCharactersToAdd);
        }

        // Update player gold
        setAdventureSettings(prev => ({...prev, playerGold: (prev.playerGold || 0) - totalCost }));
        
        const summaryText = boughtItemsSummary.join(', ');
        React.startTransition(() => {
            toast({ title: "Achat Terminé!", description: `Vous avez acquis : ${summaryText}.` });
        });

        handleSendSpecificAction(`J'achète les articles suivants : ${summaryText}.`);
        
        setShoppingCart([]);
        setMerchantInventory([]); // Close merchant panel after purchase
    }, [shoppingCart, adventureSettings.playerGold, handleSendSpecificAction, toast, setAdventureSettings, setShoppingCart, setMerchantInventory]);
   
  const loadAdventureState = React.useCallback(async (stateToLoad: SaveData) => {
    if (!stateToLoad.adventureSettings || !stateToLoad.characters || !stateToLoad.narrative || !Array.isArray(stateToLoad.narrative)) {
        React.startTransition(() => {
            toast({ title: "Erreur de Chargement", description: "Le fichier de sauvegarde est invalide ou corrompu.", variant: "destructive" });
        });
        return;
    }
    
    // Fallback logic for localized text
    const getLocalizedText = (field: LocalizedText, lang: string) => {
        return field[lang] || field['en'] || field['fr'] || Object.values(field)[0] || "";
    };

    let settingsToLoad = stateToLoad.adventureSettings;
    const initialSitText = getLocalizedText(settingsToLoad.initialSituation, currentLanguage);
    let finalNarrative = [{ id: `msg-loaded-${Date.now()}`, type: 'system', content: initialSitText, timestamp: Date.now() }];
    
    // No translation needed here, just select the right text.

    React.startTransition(() => {
        const effectiveStats = calculateEffectiveStats(settingsToLoad);
        const finalSettings = { 
            ...settingsToLoad, 
            ...effectiveStats 
        };

        setAdventureSettings(finalSettings);
        setCharacters(stateToLoad.characters);
        setNarrativeMessages(finalNarrative);
        setActiveCombat(stateToLoad.activeCombat);
        setCurrentLanguage(stateToLoad.currentLanguage || 'fr');
        setAiConfig(stateToLoad.aiConfig || createInitialState().aiConfig);

        setBaseAdventureSettings(JSON.parse(JSON.stringify(finalSettings)));
        setBaseCharacters(JSON.parse(JSON.stringify(stateToLoad.characters)));

        setFormPropKey(prev => prev + 1);
        
        toast({ title: "Aventure Chargée", description: "L'état de l'aventure a été restauré." });

        const poisToPlace = finalSettings.mapPointsOfInterest?.filter(p => !p.position) || [];
        if (poisToPlace.length > 0) {
            setTimeout(() => {
                let currentSettings = finalSettings;
                poisToPlace.forEach(poi => {
                    const pois = currentSettings.mapPointsOfInterest || [];
                    const poiExists = pois.some(p => p.id === poi.id && p.position);
                    if (!poiExists) {
                        const newPois = pois.map(p => 
                            p.id === poi.id ? { ...p, position: { x: 50, y: 50 } } : p
                        );
                        currentSettings = { ...currentSettings, mapPointsOfInterest: newPois };
                    }
                });
                setAdventureSettings(currentSettings);
                toast({ title: "Carte Mise à Jour", description: `${poisToPlace.length} lieu(x) ont été placé(s) sur la carte.` });
            }, 500);
        }
    });
  }, [toast, currentLanguage]);

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
        } else {
          const effectiveStats = calculateEffectiveStats(adventureSettings);
          setAdventureSettings(prev => ({
              ...prev,
              ...effectiveStats,
              playerCurrentHp: prev.playerCurrentHp ?? effectiveStats.playerMaxHp,
              playerCurrentMp: prev.playerCurrentMp ?? effectiveStats.playerMaxMp
          }));
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
          setAllConsumables(loadData('custom_consumables', BASE_CONSUMABLES));
          setWeapons(loadData('custom_weapons', BASE_WEAPONS));
          setAllArmors(loadData('custom_armors', BASE_ARMORS));
          setAllJewelry(loadData('custom_jewelry', BASE_JEWELRY));
          setPhysicalFamiliarItems(loadData('custom_familiar_physical', BASE_FAMILIAR_PHYSICAL_ITEMS));
          setCreatureFamiliarItems(loadData('custom_familiar_creatures', BASE_FAMILIAR_CREATURES));
          setDescriptorFamiliarItems(loadData('custom_familiar_descriptors', BASE_FAMILIAR_DESCRIPTORS));
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
  }, [loadAdventureState, toast]);

    const fetchInitialSkill = React.useCallback(async () => {
      if (
        adventureSettings.rpgMode &&
        adventureSettings.playerLevel === 1 &&
        (!adventureSettings.playerSkills || adventureSettings.playerSkills.length === 0) &&
        adventureSettings.playerClass
      ) {
        setIsLoadingInitialSkill(true);
        try {
          const skillInput: SuggestPlayerSkillInput = {
            playerClass: adventureSettings.playerClass,
            playerLevel: 1,
            currentLanguage: currentLanguage,
          };
          const suggestedSkill: SuggestPlayerSkillFlowOutput = await suggestPlayerSkill(skillInput);

          if (suggestedSkill.error) {
            console.error("Failed to fetch initial skill:", suggestedSkill.error);
            React.startTransition(() => {
              toast({
                title: "Erreur de Compétence",
                description: suggestedSkill.error,
                variant: "destructive",
              });
            });
            return;
          }

          const newSkill: PlayerSkill = {
            id: `skill-${suggestedSkill.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
            name: suggestedSkill.name,
            description: suggestedSkill.description,
            category: 'class', 
          };

          setAdventureSettings(prev => ({
            ...prev,
            playerSkills: [newSkill],
          }));
          
          React.startTransition(() => {
            toast({
              title: "Compétence Initiale Acquise!",
              description: `${newSkill.name}: ${newSkill.description}`,
            });
          });
        } catch (error) {
          console.error("Unexpected error fetching initial skill:", error);
           React.startTransition(() => {
            toast({
              title: "Erreur Inattendue",
              description: error instanceof Error ? error.message : "Une erreur inattendue est survenue lors de la suggestion de compétence.",
              variant: "destructive",
            });
          });
        } finally {
          setIsLoadingInitialSkill(false);
        }
      }
    }, [adventureSettings.rpgMode, adventureSettings.playerLevel, adventureSettings.playerClass, currentLanguage, toast]);
    
    React.useEffect(() => {
      const callFetchInitialSkill = async () => {
        await fetchInitialSkill();
      };
      if (typeof window !== 'undefined') {
        callFetchInitialSkill();
      }
    }, [fetchInitialSkill]);

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
    }, [toast]);
    
    const handleTakeLoot = React.useCallback((messageId: string, itemsToTake: PlayerInventoryItem[], silent: boolean = false) => {
        React.startTransition(() => {
            setAdventureSettings(prevSettings => {
                if (!prevSettings.rpgMode) return prevSettings;
                const newInventory = [...(prevSettings.playerInventory || [])];
                
                const lootMessage = narrativeMessages.find(m => m.id === messageId);
                let currencyGained = 0;
                 if (lootMessage?.loot) {
                    const currencyItem = lootMessage.loot.find(item => item.name?.toLowerCase().includes("pièces d'or") || item.name?.toLowerCase().includes("gold"));
                    if (currencyItem) {
                        currencyGained = currencyItem.quantity;
                    }
                 }
    
                itemsToTake.forEach(item => {
                    if (!item.id || !item.name || typeof item.quantity !== 'number' || !item.type) {
                        console.warn("Skipping invalid loot item (missing id, name, quantity, or type):", item);
                        return;
                    }
                    const existingItemIndex = newInventory.findIndex(invItem => invItem.name === item.name);
                    if (existingItemIndex > -1) {
                        newInventory[existingItemIndex].quantity += item.quantity;
                    } else {
                        newInventory.push({ ...item, isEquipped: false });
                    }
                });
                return { ...prevSettings, playerInventory: newInventory, playerGold: (prevSettings.playerGold || 0) + currencyGained };
            });
            if (messageId) { // Check if messageId is provided before updating narrative
                setNarrativeMessages(prevMessages =>
                    prevMessages.map(msg =>
                        msg.id === messageId ? { ...msg, lootTaken: true } : msg
                    )
                );
            }
        });
        if (!silent) {
            React.startTransition(() => {toast({ title: "Objets Ramassés", description: "Les objets ont été ajoutés à votre inventaire." });});
        }
      }, [toast, narrativeMessages]);

    const handleClaimHuntReward = React.useCallback((combatantId: string) => {
        const combatant = activeCombat?.combatants.find(c => c.characterId === combatantId);
        if (!combatant || !combatant.isDefeated || !combatant.rewardItem) return;
    
        handleTakeLoot("", [combatant.rewardItem], false);
        setActiveCombat(undefined); // End combat
        handleNarrativeUpdate(`Vous avez récupéré ${combatant.rewardItem.name} sur la créature vaincue.`, 'system');
    
    }, [activeCombat, handleTakeLoot, handleNarrativeUpdate]);
   

  const applyCombatItemEffect = React.useCallback((targetId?: string) => {
        if (!itemToUse || !activeCombat?.isActive) return;

        const { effectDetails } = itemToUse;
        let narrativeAction = `J'utilise ${itemToUse.name}`;
        let effectAppliedMessage = "";

        setAdventureSettings(prevSettings => {
            const newInventory = [...(prevSettings.playerInventory || [])];
            const itemIndex = newInventory.findIndex(invItem => invItem.id === itemToUse.id);
            if (itemIndex > -1) {
                newInventory[itemIndex].quantity -= 1;
                if (newInventory[itemIndex].quantity <= 0) {
                    newInventory.splice(itemIndex, 1);
                }
            }
            return { ...prevSettings, playerInventory: newInventory };
        });

        if (effectDetails?.type === 'heal') {
            const hpChange = effectDetails.amount;
            setAdventureSettings(prev => ({
                ...prev,
                playerCurrentHp: Math.min(prev.playerMaxHp || 0, (prev.playerCurrentHp || 0) + hpChange)
            }));
            narrativeAction += `, restaurant ${hpChange} PV.`;
            effectAppliedMessage = `Vous avez utilisé ${itemToUse.name} et restauré ${hpChange} PV.`;
        } else if (effectDetails?.type === 'damage_single' && targetId) {
            const target = activeCombat.combatants.find(c => c.characterId === targetId);
            narrativeAction += ` sur ${target?.name}, lui infligeant ${effectDetails.amount} points de dégâts.`;
            effectAppliedMessage = `Vous avez utilisé ${itemToUse.name} sur ${target?.name} pour ${effectDetails.amount} dégâts.`;
            setActiveCombat(prev => {
                if (!prev) return prev;
                const newCombatants = prev.combatants.map(c =>
                    c.characterId === targetId ? { ...c, currentHp: Math.max(0, c.currentHp - effectDetails.amount) } : c
                );
                return { ...prev, combatants: newCombatants };
            });
        } else if (effectDetails?.type === 'damage_all') {
            narrativeAction += `, infligeant ${effectDetails.amount} points de dégâts à tous les ennemis.`;
            effectAppliedMessage = `Vous avez utilisé ${itemToUse.name}, infligeant ${effectDetails.amount} dégâts à tous les ennemis.`;
            setActiveCombat(prev => {
                if (!prev) return prev;
                const newCombatants = prev.combatants.map(c =>
                    c.team === 'enemy' ? { ...c, currentHp: Math.max(0, c.currentHp - effectDetails.amount) } : c
                );
                return { ...prev, combatants: newCombatants };
            });
        }
        
        React.startTransition(() => {
            toast({ title: "Action en Combat", description: effectAppliedMessage });
        });
        handleNarrativeUpdate(narrativeAction, 'user');
        callGenerateAdventure(narrativeAction);

        setIsTargeting(false);
        setItemToUse(null);

    }, [itemToUse, activeCombat, toast, handleNarrativeUpdate, callGenerateAdventure]);

  const handlePlayerItemAction = React.useCallback((itemId: string, action: 'use' | 'discard') => {
    let itemActionSuccessful = false;
    let narrativeAction = "";
    let effectAppliedMessage = "";
    let itemUsedOrDiscarded: PlayerInventoryItem | undefined;

    setAdventureSettings(prevSettings => {
        if (!prevSettings.rpgMode || !prevSettings.playerInventory) {
             React.startTransition(() => {toast({ title: action === 'use' ? "Utilisation Impossible" : "Action Impossible", description: "Le mode RPG doit être actif et vous devez avoir des objets.", variant: "default" });});
            itemActionSuccessful = false;
            return prevSettings;
        }

        const newInventory = [...prevSettings.playerInventory];
        const itemIndex = newInventory.findIndex(invItem => invItem.id === itemId && invItem.quantity > 0);

        if (itemIndex === -1) {
             const item = prevSettings.playerInventory.find(i => i.id === itemId);
             React.startTransition(() => {toast({ title: "Objet Introuvable", description: `Vous n'avez pas de "${item?.name || itemId}" ${action === 'use' ? 'utilisable' : ''} ou en quantité suffisante.`, variant: "destructive" });});
            itemActionSuccessful = false;
            return prevSettings;
        }

        const itemToUpdate = { ...newInventory[itemIndex] };
        itemUsedOrDiscarded = itemToUpdate;
        
        let changes: Partial<AdventureSettings> = {};

        if (action === 'use') {
            if (itemToUpdate.effectType === 'combat' && activeCombat?.isActive) {
                setItemToUse(itemToUpdate);
                setIsTargeting(true);
                itemActionSuccessful = false; 
                return prevSettings;
            }
            
            narrativeAction = `J'utilise ${itemToUpdate.name}.`;
            if (itemToUpdate.type === 'consumable') {
                if (itemToUpdate.familiarDetails) {
                    // This specific item summons a familiar
                    handleUseFamiliarItem(itemToUpdate);
                    itemActionSuccessful = false; // The other function will handle narrative and state updates
                    narrativeAction = "";
                    effectAppliedMessage = "";
                    return prevSettings; // Return early
                } else if (itemToUpdate.effectDetails && itemToUpdate.effectDetails.type === 'heal') {
                    const hpChange = itemToUpdate.effectDetails.amount;
                    const newPlayerHp = Math.min(prevSettings.playerMaxHp || 0, (prevSettings.playerCurrentHp || 0) + hpChange);
                    changes = { playerCurrentHp: newPlayerHp };
                    effectAppliedMessage = `${itemToUpdate.name} utilisé. PV restaurés: ${hpChange}.`;
                    newInventory[itemIndex] = { ...itemToUpdate, quantity: itemToUpdate.quantity - 1 };
                    itemActionSuccessful = true;
                } else {
                   toast({ title: "Utilisation Narrative", description: `L'effet de ${itemToUpdate.name} est narratif ou requiert une situation spécifique.`, variant: "default" });
                   itemActionSuccessful = true; // Still consume for narrative effect
                   newInventory[itemIndex] = { ...itemToUpdate, quantity: itemToUpdate.quantity - 1 };
                }
            } else if (itemToUpdate.type === 'weapon' || itemToUpdate.type === 'armor' || itemToUpdate.type === 'jewelry') {
                 React.startTransition(() => {toast({ title: "Action Requise", description: `Veuillez "Équiper" ${itemToUpdate?.name} plutôt que de l'utiliser.`, variant: "default" });});
                itemActionSuccessful = false;
                return prevSettings;
            } else { 
                React.startTransition(() => {toast({ title: "Utilisation Narrative", description: `L'effet de ${itemToUpdate?.name} est narratif.`, variant: "default" });});
                newInventory[itemIndex] = { ...itemToUpdate, quantity: itemToUpdate.quantity - 1 };
                itemActionSuccessful = true;
            }
        } else if (action === 'discard') {
            narrativeAction = `Je jette ${itemToUpdate.name}.`;
            newInventory[itemIndex] = { ...itemToUpdate, quantity: itemToUpdate.quantity - 1 };
            effectAppliedMessage = `${itemToUpdate.name} a été jeté.`;
            if (itemToUpdate.isEquipped) {
                if (prevSettings.equippedItemIds?.weapon === itemToUpdate.id) changes.equippedItemIds = { ...(prevSettings.equippedItemIds || {}), weapon: null };
                else if (prevSettings.equippedItemIds?.armor === itemToUpdate.id) changes.equippedItemIds = { ...(prevSettings.equippedItemIds || {}), armor: null };
                else if (prevSettings.equippedItemIds?.jewelry === itemToUpdate.id) changes.equippedItemIds = { ...(prevSettings.equippedItemIds || {}), jewelry: null };
                newInventory[itemIndex].isEquipped = false;
            }
            itemActionSuccessful = true;
        }

        if (newInventory[itemIndex]?.quantity <= 0) {
            newInventory.splice(itemIndex, 1);
        }
        changes.playerInventory = newInventory;
        
        const newSettings = { ...prevSettings, ...changes };
        
        if(changes.equippedItemIds) {
            const effectiveStats = calculateEffectiveStats(newSettings);
            return { ...newSettings, ...effectiveStats };
        }

        return newSettings;
    });

    if (itemActionSuccessful && narrativeAction) {
         if(effectAppliedMessage) {
            React.startTransition(() => { toast({ title: "Action d'Objet", description: effectAppliedMessage }); });
        }
        handleNarrativeUpdate(narrativeAction, 'user');
        callGenerateAdventure(narrativeAction);
    }
  }, [
    callGenerateAdventure, handleNarrativeUpdate, toast, handleUseFamiliarItem, activeCombat
  ]);


  const handleSellItem = React.useCallback((itemId: string) => {
        const currentSettings = adventureSettings;
        const itemToSell = currentSettings.playerInventory?.find(invItem => invItem.id === itemId);

        if (!currentSettings.rpgMode || !itemToSell || itemToSell.quantity <= 0) {
            React.startTransition(() => {
                toast({ title: "Vente Impossible", description: "Le mode RPG doit être actif et l'objet doit être dans votre inventaire.", variant: "default" });
            });
            return;
        }

        let sellPricePerUnit = 0;
        if (itemToSell.goldValue && itemToSell.goldValue > 0) {
            sellPricePerUnit = Math.floor(itemToSell.goldValue / 2);
            if (sellPricePerUnit === 0) {
                sellPricePerUnit = 1;
            }
        }
        if (itemToSell.goldValue === 1) {
             sellPricePerUnit = 1;
        }


        if (sellPricePerUnit <= 0) {
            React.startTransition(() => {
                toast({ title: "Invendable", description: `"${itemToSell.name}" n'a pas de valeur marchande.`, variant: "default" });
            });
            return;
        }

        if (itemToSell.quantity > 1) {
            setItemToSellDetails({ item: itemToSell, sellPricePerUnit: sellPricePerUnit });
            setSellQuantity(1);
        } else {
            confirmSellMultipleItems(1, itemToSell, sellPricePerUnit);
        }
  }, [toast, adventureSettings]);


  const confirmSellMultipleItems = React.useCallback((quantityToSell: number, itemBeingSold?: PlayerInventoryItem, pricePerUnit?: number) => {
    const itemToProcess = itemBeingSold || itemToSellDetails?.item;
    const finalPricePerUnit = pricePerUnit || itemToSellDetails?.sellPricePerUnit;

    if (!itemToProcess || finalPricePerUnit === undefined || finalPricePerUnit <= 0) {
        React.startTransition(() => {
            toast({ title: "Erreur de Vente", description: "Détails de l'objet ou prix invalide.", variant: "destructive" });
        });
        setItemToSellDetails(null);
        return;
    }

    if (quantityToSell <= 0 || quantityToSell > itemToProcess.quantity) {
        React.startTransition(() => {
            toast({ title: "Quantité Invalide", description: `Veuillez entrer une quantité entre 1 et ${itemToProcess.quantity}.`, variant: "destructive" });
        });
        return;
    }

    React.startTransition(() => {
        let itemSoldSuccessfully = false;
        let totalSellPrice = 0;
        let userAction = "";

        setAdventureSettings(prevSettings => {
            if (!prevSettings.rpgMode || !prevSettings.playerInventory) return prevSettings;

            const itemIndex = prevSettings.playerInventory.findIndex(invItem => invItem.id === itemToProcess.id);
            if (itemIndex === -1 || prevSettings.playerInventory[itemIndex].quantity < quantityToSell) {
                return prevSettings;
            }

            totalSellPrice = finalPricePerUnit * quantityToSell;
            const newInventory = [...prevSettings.playerInventory];
            const updatedItem = { ...newInventory[itemIndex] };
            updatedItem.quantity -= quantityToSell;
            
            let changes: Partial<AdventureSettings> = {};
            
            if (updatedItem.quantity <= 0) {
                 if (updatedItem.isEquipped) {
                    if (prevSettings.equippedItemIds?.weapon === updatedItem.id) changes.equippedItemIds = { ...(prevSettings.equippedItemIds || {}), weapon: null };
                    else if (prevSettings.equippedItemIds?.armor === updatedItem.id) changes.equippedItemIds = { ...(prevSettings.equippedItemIds || {}), armor: null };
                    else if (prevSettings.equippedItemIds?.jewelry === updatedItem.id) changes.equippedItemIds = { ...(prevSettings.equippedItemIds || {}), jewelry: null };
                    updatedItem.isEquipped = false;
                 }
                newInventory.splice(itemIndex, 1);
            } else {
                newInventory[itemIndex] = updatedItem;
            }

            itemSoldSuccessfully = true;
            userAction = `Je vends ${quantityToSell} ${itemToProcess.name}${quantityToSell > 1 ? 's' : ''}.`;
            
             const newSettings = {
                ...prevSettings,
                ...changes,
                playerInventory: newInventory,
                playerGold: (prevSettings.playerGold ?? 0) + totalSellPrice,
            };
            
            if(changes.equippedItemIds) {
                const effectiveStats = calculateEffectiveStats(newSettings);
                return { ...newSettings, ...effectiveStats };
            }

            return newSettings;
        });

        if (itemSoldSuccessfully) {
            React.startTransition(() => {
                toast({ title: "Objet(s) Vendu(s)!", description: `Vous avez vendu ${quantityToSell} ${itemToProcess.name} pour ${totalSellPrice} pièces d'or.` });
            });

            handleNarrativeUpdate(userAction, 'user');
            callGenerateAdventure(userAction);
        }
    });
    setItemToSellDetails(null);
  }, [itemToSellDetails, callGenerateAdventure, handleNarrativeUpdate, toast]);


  const handleEquipItem = React.useCallback((itemIdToEquip: string) => {
    setAdventureSettings(prevSettings => {
        if (!prevSettings.rpgMode || !prevSettings.playerInventory) return prevSettings;
        const item = prevSettings.playerInventory.find(i => i.id === itemIdToEquip);
        if (!item || item.quantity <= 0) {
            React.startTransition(() => { toast({ title: "Erreur", description: "Objet introuvable ou quantité insuffisante.", variant: "destructive" }); });
            return prevSettings;
        }

        let slotToEquip: keyof NonNullable<AdventureSettings['equippedItemIds']> | null = null;
        if (item.type === 'weapon') slotToEquip = 'weapon';
        else if (item.type === 'armor') slotToEquip = 'armor';
        else if (item.type === 'jewelry') slotToEquip = 'jewelry';

        if (!slotToEquip) {
            React.startTransition(() => { toast({ title: "Non Équipable", description: `"${item.name}" n'est pas un objet équipable dans un slot standard.`, variant: "default" }); });
            return prevSettings;
        }

        const newEquippedItemIds = { ...(prevSettings.equippedItemIds || { weapon: null, armor: null, jewelry: null }) };
        const newInventory = prevSettings.playerInventory.map(invItem => ({ ...invItem }));

        const currentEquippedItemId = newEquippedItemIds[slotToEquip];
        if (currentEquippedItemId) {
            const currentlyEquippedItemIndex = newInventory.findIndex(i => i.id === currentEquippedItemId);
            if (currentlyEquippedItemIndex > -1) {
                newInventory[currentlyEquippedItemIndex].isEquipped = false;
            }
        }

        newEquippedItemIds[slotToEquip] = item.id;
        const newItemIndex = newInventory.findIndex(i => i.id === item.id);
        if (newItemIndex > -1) {
            newInventory[newItemIndex].isEquipped = true;
        } else {
            console.error("Item to equip not found in inventory during map");
            return prevSettings;
        }

        const updatedSettings = {
            ...prevSettings,
            equippedItemIds: newEquippedItemIds,
            playerInventory: newInventory,
        };

        const effectiveStats = calculateEffectiveStats(updatedSettings);

        React.startTransition(() => { toast({ title: "Objet Équipé", description: `${item.name} a été équipé.` }); });
        return {
            ...updatedSettings,
            ...effectiveStats,
        };
    });
  }, [toast]);

  const handleUnequipItem = React.useCallback((slotToUnequip: keyof NonNullable<AdventureSettings['equippedItemIds']>) => {
      setAdventureSettings(prevSettings => {
          if (!prevSettings.rpgMode || !prevSettings.equippedItemIds || !prevSettings.playerInventory) return prevSettings;

          const itemIdToUnequip = prevSettings.equippedItemIds[slotToUnequip];
          if (!itemIdToUnequip) {
              React.startTransition(() => { toast({ title: "Information", description: `Aucun objet à déséquiper dans le slot ${slotToUnequip}.`, variant: "default" }); });
              return prevSettings;
          }

          const newEquippedItemIds = { ...prevSettings.equippedItemIds, [slotToUnequip]: null };
          const newInventory = prevSettings.playerInventory.map(invItem => {
              if (invItem.id === itemIdToUnequip) {
                  return { ...invItem, isEquipped: false };
              }
              return invItem;
          });

          const itemUnequipped = prevSettings.playerInventory.find(i => i.id === itemIdToUnequip);

          const updatedSettings = {
              ...prevSettings,
              equippedItemIds: newEquippedItemIds,
              playerInventory: newInventory,
          };

          const effectiveStats = calculateEffectiveStats(updatedSettings);

          React.startTransition(() => { toast({ title: "Objet Déséquipé", description: `${itemUnequipped?.name || 'Objet'} a été déséquipé.` }); });
          return {
              ...updatedSettings,
              ...effectiveStats,
          };
      });
  }, [toast]);


    const handleEditMessage = React.useCallback((messageId: string, newContent: string, newImageTransform?: ImageTransform, newImageUrl?: string) => {
       React.startTransition(() => {
           setNarrativeMessages(prev => prev.map(msg =>
               msg.id === messageId ? { 
                   ...msg, 
                   content: newContent, 
                   timestamp: Date.now(),
                   imageUrl: newImageUrl !== undefined ? newImageUrl : msg.imageUrl,
                   imageTransform: newImageTransform || msg.imageTransform,
                } : msg
           ));
       });
        React.startTransition(() => {
            toast({ title: "Message Modifié" });
        });
   }, [toast]);

    const handleUndoLastMessage = React.useCallback(() => {
        let messageForToast: Parameters<typeof toast>[0] | null = null;
        let newActiveCombatState = activeCombat ? JSON.parse(JSON.stringify(activeCombat)) : undefined;

        React.startTransition(() => {
            setNarrativeMessages(prevNarrative => {
                if (prevNarrative.length <= 1 && prevNarrative[0]?.type === 'system') {
                     messageForToast = { title: "Impossible d'annuler", description: "Aucun message à annuler après l'introduction.", variant: "destructive" };
                     return prevNarrative;
                }

                let lastUserIndex = -1;
                for (let i = prevNarrative.length - 1; i >= 0; i--) {
                    if (prevNarrative[i].type === 'user') {
                        lastUserIndex = i;
                        break;
                    }
                }

                if (lastUserIndex !== -1) {
                    const aiMessageBeforeUserAction = prevNarrative[lastUserIndex -1];
                    if (aiMessageBeforeUserAction?.sceneDescription?.toLowerCase().includes("combat started") ||
                        aiMessageBeforeUserAction?.content.toLowerCase().includes("combat commence")) {
                        newActiveCombatState = undefined;
                    }
                    const newNarrative = prevNarrative.slice(0, lastUserIndex);
                    messageForToast = { title: "Dernier tour annulé" };
                    return newNarrative;
                } else if (prevNarrative.length > 1 && prevNarrative[0]?.type === 'system') {
                     const newNarrative = prevNarrative.slice(0, -1);
                     messageForToast = { title: "Dernier message IA annulé" };
                     return newNarrative;
                }
                messageForToast = { title: "Annulation non applicable", description:"Aucune action utilisateur claire à annuler ou déjà à l'état initial."};
                return prevNarrative;
            });
            setActiveCombat(newActiveCombatState);
        });
        if (messageForToast) {
             React.startTransition(() => { toast(messageForToast as Parameters<typeof toast>[0]); });
        }
    }, [toast, activeCombat]);


    const handleRegenerateLastResponse = React.useCallback(async () => {
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
            React.startTransition(() => {
                toast({ title: "Impossible de régénérer", description: "Aucune réponse IA précédente valide trouvée pour régénérer.", variant: "destructive" });
            });
             return;
         }
        React.startTransition(() => {
         setIsRegenerating(true);
        });
         React.startTransition(() => { toast({ title: "Régénération en cours...", description: "Génération d'une nouvelle réponse." }); });

        const currentTurnSettings = JSON.parse(JSON.stringify(adventureSettings)) as AdventureSettings;
        const effectiveStatsThisTurn = calculateEffectiveStats(currentTurnSettings);
        const currentGlobalCharactersRegen = characters;
        let currentActiveCombatRegen: ActiveCombat | undefined = activeCombat ? JSON.parse(JSON.stringify(activeCombat)) : undefined;

        if (currentTurnSettings.rpgMode && currentActiveCombatRegen?.isActive) {
            const combatantsForAIRegenMap = new Map<string, Combatant>();
            
            const playerCombatantRegen: Combatant = {
                characterId: PLAYER_ID, 
                name: currentTurnSettings.playerName || "Player", 
                currentHp: currentTurnSettings.playerCurrentHp ?? effectiveStatsThisTurn.playerMaxHp,
                maxHp: effectiveStatsThisTurn.playerMaxHp,
                currentMp: currentTurnSettings.playerCurrentMp ?? effectiveStatsThisTurn.playerMaxMp,
                maxMp: effectiveStatsThisTurn.playerMaxMp,
                team: 'player', 
                isDefeated: (currentTurnSettings.playerCurrentHp ?? effectiveStatsThisTurn.playerMaxHp) <=0, 
                statusEffects: currentActiveCombatRegen?.combatants.find(c => c.characterId === PLAYER_ID)?.statusEffects || [],
            };
            combatantsForAIRegenMap.set(PLAYER_ID, playerCombatantRegen);
            
            currentGlobalCharactersRegen.forEach(char => {
                if (char.isAlly && (char.hitPoints ?? 0) > 0) {
                    const existingCombatantData = currentActiveCombatRegen?.combatants.find(c => c.characterId === char.id);
                    const allyCombatantRegen: Combatant = {
                        characterId: char.id, name: char.name,
                        currentHp: existingCombatantData?.currentHp ?? char.hitPoints!,
                        maxHp: existingCombatantData?.maxHp!,
                        currentMp: existingCombatantData?.currentMp ?? char.manaPoints,
                        maxMp: existingCombatantData?.maxManaPoints,
                        team: 'player', isDefeated: existingCombatantData ? existingCombatantData.isDefeated : (char.hitPoints! <= 0),
                        statusEffects: existingCombatantData?.statusEffects || char.statusEffects || [],
                    };
                    combatantsForAIRegenMap.set(char.id, allyCombatantRegen);
                }
            });
            
            currentActiveCombatRegen?.combatants.forEach(c => {
                if (c.team === 'enemy' && !combatantsForAIRegenMap.has(c.characterId)) {
                    combatantsForAIRegenMap.set(c.characterId, c);
                } else if (c.team === 'enemy' && combatantsForAIRegenMap.has(c.characterId)) {
                    combatantsForAIRegenMap.set(c.characterId, c);
                }
            });

            currentActiveCombatRegen.combatants = Array.from(combatantsForAIRegenMap.values());
        }
        
        const currentPlayerLocation = currentTurnSettings.playerLocationId
        ? currentTurnSettings.mapPointsOfInterest?.find(poi => poi.id === currentTurnSettings.playerLocationId)
        : undefined;

        const worldText = currentTurnSettings.world[currentLanguage] || currentTurnSettings.world['en'] || Object.values(currentTurnSettings.world)[0] || "";
        const contextSituationText = contextMessages.map(msg => {
            if (msg.type === 'user') return `${currentTurnSettings.playerName || 'Player'}: ${msg.content}`;
            // For system message, check if it's the initial one from a localized source
            if (msg.type === 'system') {
                const initialSit = currentTurnSettings.initialSituation;
                if (initialSit[currentLanguage] === msg.content || initialSit['en'] === msg.content || Object.values(initialSit).includes(msg.content)) {
                    return getLocalizedText(initialSit, currentLanguage);
                }
            }
            return msg.content;
        }).join('\n\n');


         try {
             const input: GenerateAdventureInput = {
                 world: worldText,
                 initialSituation: contextSituationText,
                 characters: currentGlobalCharactersRegen.filter(c => c.locationId === currentTurnSettings.playerLocationId), 
                 userAction: lastUserAction,
                 currentLanguage: currentLanguage,
                 playerName: currentTurnSettings.playerName || "Player",
                 relationsModeActive: currentTurnSettings.relationsMode ?? true,
                 rpgModeActive: currentTurnSettings.rpgMode ?? false,
                 comicModeActive: currentTurnSettings.comicModeActive ?? false,
                 activeCombat: currentActiveCombatRegen,
                 playerGold: currentTurnSettings.playerGold,
                 playerSkills: currentTurnSettings.playerSkills,
                 playerClass: currentTurnSettings.playerClass,
                 playerLevel: currentTurnSettings.playerLevel,
                 playerCurrentHp: currentTurnSettings.playerCurrentHp,
                 playerMaxHp: effectiveStatsThisTurn.playerMaxHp,
                 playerCurrentMp: currentTurnSettings.playerCurrentMp,
                 playerMaxMp: effectiveStatsThisTurn.playerMaxMp,
                 playerCurrentExp: currentTurnSettings.playerCurrentExp,
                 playerExpToNextLevel: currentTurnSettings.playerExpToNextLevel,
                 playerStrength: currentTurnSettings.playerStrength,
                 playerDexterity: currentTurnSettings.playerDexterity,
                 playerConstitution: currentTurnSettings.playerConstitution,
                 playerIntelligence: currentTurnSettings.playerIntelligence,
                 playerWisdom: currentTurnSettings.playerWisdom,
                 playerCharisma: currentTurnSettings.playerCharisma,
                 playerArmorClass: effectiveStatsThisTurn.playerArmorClass,
                 playerAttackBonus: effectiveStatsThisTurn.playerAttackBonus,
                 playerDamageBonus: effectiveStatsThisTurn.playerDamageBonus,
                 equippedWeaponName: currentTurnSettings.equippedItemIds?.weapon ? currentTurnSettings.playerInventory?.find(i => i.id === currentTurnSettings.equippedItemIds?.weapon)?.name : undefined,
                 equippedArmorName: currentTurnSettings.equippedItemIds?.armor ? currentTurnSettings.playerInventory?.find(i => i.id === currentTurnSettings.equippedItemIds?.armor)?.name : undefined,
                 equippedJewelryName: currentTurnSettings.equippedItemIds?.jewelry ? currentTurnSettings.playerInventory?.find(i => i.id === currentTurnSettings.equippedItemIds?.jewelry)?.name : undefined,
                 playerLocationId: currentTurnSettings.playerLocationId,
                 mapPointsOfInterest: currentTurnSettings.mapPointsOfInterest,
                 playerLocation: currentPlayerLocation,
                 aiConfig: aiConfig,
                 timeManagement: currentTurnSettings.timeManagement,
                 playerPortraitUrl: currentTurnSettings.playerPortraitUrl,
                 playerFaceSwapEnabled: currentTurnSettings.playerFaceSwapEnabled,
             };

             const result: GenerateAdventureFlowOutput = await generateAdventure(input);

             if (result.error) {
                React.startTransition(() => {
                    toast({ title: "Erreur de Régénération IA", description: result.error, variant: "destructive"});
                });
                setIsRegenerating(false);
                return;
             }

            React.startTransition(() => {
                setNarrativeMessages(prev => {
                    const newNarrative = [...prev];
                    const newAiMessage: Message = {
                        id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                        type: 'ai',
                        content: result.narrative || "L'IA n'a pas fourni de description narrative.",
                        timestamp: Date.now(),
                        sceneDescription: result.sceneDescriptionForImage,
                        loot: (result.itemsObtained || []).map(item => ({
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
                        })),
                        lootTaken: false,
                        speakingCharacterNames: result.speakingCharacterNames,
                    };
                    if (lastAiIndex !== -1) {
                        newNarrative.splice(lastAiIndex, 1, newAiMessage);
                    } else {
                        newNarrative.push(newAiMessage);
                    }
                    return newNarrative;
                });

                 if (result.newFamiliars) result.newFamiliars.forEach(f => handleNewFamiliar(f as Familiar));
                if (adventureSettings.relationsMode && result.affinityUpdates) handleAffinityUpdates(result.affinityUpdates);
                if (adventureSettings.relationsMode && result.relationUpdates) handleRelationUpdatesFromAI(result.relationUpdates);
                if (currentTurnSettings.timeManagement?.enabled) {
                    handleTimeUpdate(result.updatedTime);
                }
                 if (adventureSettings.rpgMode && typeof result.currencyGained === 'number' && result.currencyGained !== 0 && adventureSettings.playerGold !== undefined) {
                    const amount = result.currencyGained;
                    if (amount < 0) {
                        const currentGold = adventureSettings.playerGold ?? 0;
                        if (currentGold + amount < 0) {
                        } else {
                             addCurrencyToPlayer(amount);
                        }
                    } else {
                         addCurrencyToPlayer(amount);
                    }
                    React.startTransition(() => {
                        toast({
                            title: amount > 0 ? "Monnaie (Régén.)!" : "Dépense (Régén.)!",
                            description: `Votre trésorerie a été mise à jour.`
                        });
                    });
                }
                React.startTransition(() => {toast({ title: "Réponse Régénérée", description: "Une nouvelle réponse a été ajoutée." });});
            });
         } catch (error) { 
             console.error("[LOG_PAGE_TSX][handleRegenerateLastResponse] Critical error:", error);
             let toastDescription = `Impossible de générer une nouvelle réponse: ${error instanceof Error ? error.message : 'Unknown error'}.`;
              React.startTransition(() => {
                toast({ title: "Erreur Critique de Régénération", description: toastDescription, variant: "destructive"});
              });
         } finally {
             React.startTransition(() => {
                setIsRegenerating(false);
             });
         }
    }, [
         isRegenerating, isLoading, narrativeMessages, currentLanguage, toast,
         handleNewFamiliar,
         handleAffinityUpdates,
         handleRelationUpdatesFromAI, addCurrencyToPlayer, handlePoiOwnershipChange,
         adventureSettings, characters, activeCombat, aiConfig, handleTimeUpdate
    ]);

  const handleCharacterUpdate = (updatedCharacter: Character) => {
    setCharacters(prev => prev.map(c => c.id === updatedCharacter.id ? updatedCharacter : c));
  };


  const handleSaveNewCharacter = React.useCallback((character: Character) => {
        if (typeof window !== 'undefined') {
            try {
                const existingCharsStr = localStorage.getItem('globalCharacters');
                let existingChars: Character[] = existingCharsStr ? JSON.parse(existingCharsStr) : [];
                const charIndex = existingChars.findIndex(c => c.id === character.id || c.name.toLowerCase() === character.name.toLowerCase());

                if (charIndex > -1) {
                    existingChars[charIndex] = { ...character, _lastSaved: Date.now() };
                } else {
                    existingChars.push({ ...character, _lastSaved: Date.now() });
                }
                localStorage.setItem('globalCharacters', JSON.stringify(existingChars));
                React.startTransition(() => {
                    toast({ title: "Personnage Sauvegardé Globalement", description: `${character.name} est maintenant disponible pour d'autres aventures et pour le chat.` });
                });
                setCharacters(prev => prev.map(c => c.id === character.id ? { ...c, _lastSaved: Date.now() } : c));
            } catch (error) {
                 console.error("Failed to save character to localStorage:", error);
                 React.startTransition(() => { toast({ title: "Erreur de Sauvegarde Globale", description: "Impossible de sauvegarder le personnage globalement.", variant: "destructive" }); });
            }
        } else {
            React.startTransition(() => {
                toast({ title: "Erreur", description: "La sauvegarde globale n'est disponible que côté client.", variant: "destructive" });
            });
        }
    }, [toast]);

  const handleAddStagedCharacter = (globalCharToAdd: Character) => {
    const isAlreadyInAdventure = characters.some(sc => sc.id === globalCharToAdd.id || sc.name.toLowerCase() === globalCharToAdd.name.toLowerCase());

    if (isAlreadyInAdventure) {
        React.startTransition(() => {
            toast({ title: "Personnage déjà présent", description: `${globalCharToAdd.name} est déjà dans l'aventure actuelle.`, variant: "default" });
        });
        return;
    }

    const defaultRelation = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
    const newCharRPGMode = adventureSettings.rpgMode;
    const newCharLevel = newCharRPGMode ? (globalCharToAdd.level ?? 1) : undefined;
    const newCharInitialPoints = newCharRPGMode ? (globalCharToAdd.initialAttributePoints ?? INITIAL_CREATION_ATTRIBUTE_POINTS_NPC_DEFAULT) : undefined;
    const newCharCurrentExp = newCharRPGMode ? (globalCharToAdd.currentExp ?? 0) : undefined;
    const newCharExpToNext = newCharRPGMode ? (globalCharToAdd.expToNextLevel ?? Math.floor(100 * Math.pow(1.5, (newCharLevel ?? 1) - 1))) : undefined;

    const newChar: Character = {
        ...globalCharToAdd,
        history: [`Ajouté à l'aventure depuis les personnages globaux le ${new Date().toLocaleString()}`],
        isAlly: globalCharToAdd.isAlly ?? false,
        initialAttributePoints: newCharInitialPoints,
        currentExp: newCharCurrentExp,
        expToNextLevel: newCharExpToNext,
        locationId: adventureSettings.playerLocationId,
        ...(newCharRPGMode ? {
            level: newCharLevel, characterClass: globalCharToAdd.characterClass ?? '', 
            hitPoints: globalCharToAdd.hitPoints ?? globalCharToAdd.maxHitPoints ?? 10, maxHitPoints: globalCharToAdd.maxHitPoints ?? 10,
            manaPoints: globalCharToAdd.manaPoints ?? globalCharToAdd.maxManaPoints ?? 0, maxManaPoints: globalCharToAdd.maxManaPoints ?? 0,
            armorClass: globalCharToAdd.armorClass ?? 10, attackBonus: globalCharToAdd.attackBonus ?? 0, damageBonus: globalCharToAdd.damageBonus ?? "1",
            isHostile: globalCharToAdd.isHostile ?? false,
            strength: globalCharToAdd.strength ?? BASE_ATTRIBUTE_VALUE_FORM, dexterity: globalCharToAdd.dexterity ?? BASE_ATTRIBUTE_VALUE_FORM, constitution: globalCharToAdd.constitution ?? BASE_ATTRIBUTE_VALUE_FORM,
            intelligence: globalCharToAdd.intelligence ?? BASE_ATTRIBUTE_VALUE_FORM, wisdom: globalCharToAdd.wisdom ?? BASE_ATTRIBUTE_VALUE_FORM, charisma: globalCharToAdd.charisma ?? BASE_ATTRIBUTE_VALUE_FORM,

        } : {
            level: undefined, characterClass: undefined, hitPoints: undefined, maxHitPoints: undefined, manaPoints: undefined, maxManaPoints: undefined,
            armorClass: undefined, attackBonus: undefined, damageBonus: undefined, isHostile: undefined,
            strength: undefined, dexterity: undefined, constitution: undefined, intelligence: undefined, wisdom: undefined, charisma: undefined,
            initialAttributePoints: undefined, currentExp: undefined, expToNextLevel: undefined,
            }),
            ...(adventureSettings.relationsMode ?? true ? {
            affinity: globalCharToAdd.affinity ?? 50,
            relations: globalCharToAdd.relations || { [PLAYER_ID]: defaultRelation },
            } : { affinity: undefined, relations: undefined, })
    };

    if ((adventureSettings.relationsMode ?? true) && newChar.relations && !newChar.relations[PLAYER_ID]) {
        newChar.relations[PLAYER_ID] = defaultRelation;
    }
    
    setCharacters(prevChars => {
        const updatedPrevChars = prevChars.map(existingChar => {
            if (adventureSettings.relationsMode ?? true) {
                const updatedRelations = { ...(existingChar.relations || {}), [newChar.id]: defaultRelation };
                if (newChar.relations && !newChar.relations[existingChar.id]) {
                    newChar.relations[existingChar.id] = defaultRelation;
                }
                return { ...existingChar, relations: updatedRelations };
            }
            return existingChar;
        });
        return [...updatedPrevChars, newChar];
    });

    React.startTransition(() => {
        toast({ title: "Personnage Ajouté à l'Aventure", description: `${globalCharToAdd.name} a été ajouté aux modifications en attente. N'oubliez pas d'enregistrer les modifications.` });
    });
  };


  const handleSave = React.useCallback(() => {
        const saveData: SaveData = {
            adventureSettings: adventureSettings,
            characters: characters,
            narrative: narrativeMessages,
            currentLanguage,
            activeCombat: activeCombat,
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
        URL.createObjectURL(url);
        React.startTransition(() => {
            toast({ title: "Aventure Sauvegardée", description: "Le fichier JSON a été téléchargé." });
        });
    }, [narrativeMessages, currentLanguage, toast, adventureSettings, characters, activeCombat, aiConfig]);

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
        setFormPropKey(prev => prev + 1);
        setShowRestartConfirm(false);
    });
     React.startTransition(() => {
        toast({ title: "Aventure Recommencée", description: "L'histoire a été réinitialisée." });
    });
  }, [baseAdventureSettings, baseCharacters, toast, currentLanguage]);

  const onRestartAdventure = React.useCallback(() => {
    setShowRestartConfirm(true);
  }, []);

  const handleApplyStagedChanges = async () => {
    if (!adventureFormRef.current) return;
    
    const formData = await adventureFormRef.current.getFormData();
    if (!formData) {
        return;
    }

    React.startTransition(() => {
        // This function will merge the form data with the existing adventure state
        const mergeAndUpdateState = (prevSettings: AdventureSettings, prevCharacters: Character[]) => {
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

            const formCharactersMap = new Map((formData.characters || []).map(fc => [fc.id, fc]));
            let updatedCharacters = [...prevCharacters];
            
            // Update existing characters
            updatedCharacters = updatedCharacters.map(char => {
                const formCharData = formCharactersMap.get(char.id);
                if (formCharData) {
                    formCharactersMap.delete(char.id!); // Remove from map to track new ones
                    return { ...char, ...formCharData };
                }
                return char;
            });

            // Add new characters from the form
            formCharactersMap.forEach(newChar => {
                updatedCharacters.push(newChar as Character);
            });
            
            setAdventureSettings(newLiveSettings);
            setCharacters(updatedCharacters);
            setBaseAdventureSettings(JSON.parse(JSON.stringify(newLiveSettings)));
            setBaseCharacters(JSON.parse(JSON.stringify(updatedCharacters)));

            const oldInitialSituation = getLocalizedText(prevSettings.initialSituation, currentLanguage);
            const newInitialSituation = getLocalizedText(formData.initialSituation, currentLanguage);
            if (newInitialSituation !== oldInitialSituation) {
                setNarrativeMessages([{ id: `msg-${Date.now()}`, type: 'system', content: newInitialSituation, timestamp: Date.now() }]);
                if (activeCombat) setActiveCombat(undefined);
            }
        };

        mergeAndUpdateState(adventureSettings, characters);
        
        toast({ title: "Modifications Enregistrées", description: "Les paramètres de l'aventure ont été mis à jour." });
    });
};


  const handleToggleStrategyMode = () => {
      setAdventureSettings(prev => ({ ...prev, strategyMode: !prev.strategyMode }));
  };
  const handleToggleRpgMode = () => {
      setAdventureSettings(prev => ({ ...prev, rpgMode: !prev.rpgMode }));
  };
  const handleToggleRelationsMode = () => {
      setAdventureSettings(prev => ({ ...prev, relationsMode: !prev.relationsMode }));
  };
   const handleToggleComicMode = () => {
      setAdventureSettings(prev => ({ ...prev, comicModeActive: !prev.comicModeActive }));
  };

  const handleMapAction = React.useCallback(async (poiId: string, action: 'travel' | 'examine' | 'collect' | 'attack' | 'upgrade' | 'visit', buildingId?: string) => {
    const poi = adventureSettings.mapPointsOfInterest?.find(p => p.id === poiId);
    if (!poi) return;
  
    setIsLoading(true);
    setShoppingCart([]);
  
    let userActionText = '';
    let locationIdOverride: string | undefined = undefined;
    
    if (action === 'attack') {
        let enemiesToFight: Character[] = [];
        const owner = characters.find(c => c.id === poi.ownerId);

        // 1. Check for defined defenders on the POI
        if (poi.defenderUnitIds && poi.defenderUnitIds.length > 0) {
             poi.defenderUnitIds.forEach(unitId => {
                const enemyUnit = allEnemies.find(e => e.id === unitId);
                if (enemyUnit) {
                    enemiesToFight.push({
                        ...enemyUnit,
                        id: `${enemyUnit.id}-${uid()}`, // Make instance unique for combat
                        hitPoints: enemyUnit.hitPoints,
                        maxHitPoints: enemyUnit.hitPoints,
                        locationId: poi.id,
                    });
                }
            });
        }
        // 2. Fallback to owner's race
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
        // 3. Fallback to any hostile character at the POI
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

        // Add newly generated defenders to the main characters list so they can be found by combat logic
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
        
        await callGenerateAdventure(`Je décris l'engagement du combat à ${poi.name}.`, poi.id);

    } else if (action === 'visit' && buildingId) {
        setIsLoading(true);
        locationIdOverride = poi.id;
        const buildingName = BUILDING_DEFINITIONS.find(b => b.id === buildingId)?.name || buildingId;
        userActionText = `Je visite le bâtiment '${buildingName}' à ${poi.name}.`;

        const activeUniverses = adventureSettings.activeItemUniverses || ['Médiéval-Fantastique'];
        const poiLevel = poi.level || 1;

        if (buildingId === 'poste-chasse-nocturne') {
            
            const creatureTypes = creatureFamiliarItems.filter(item => activeUniverses.includes(item.universe));
            const descriptors = descriptorFamiliarItems.filter(item => activeUniverses.includes(item.universe));
            
            if (!creatureTypes.length || !descriptors.length) {
                React.startTransition(() => {
                    toast({ title: "Chasse impossible", description: "Données de base manquantes (créature ou descripteur) pour générer une rencontre dans les univers sélectionnés.", variant: "destructive" });
                });
                setIsLoading(false);
                return;
            }
    
            const creatureType = creatureTypes[Math.floor(Math.random() * creatureTypes.length)];
            const descriptor = descriptors[Math.floor(Math.random() * descriptors.length)];
            const physicalItem = physicalFamiliarItems.length > 0 ? physicalFamiliarItems[Math.floor(Math.random() * physicalFamiliarItems.length)] : { id: 'phy-fallback', name: 'Essence', universe: 'Médiéval-Fantastique' };

            const enemyName = `${creatureType.name} ${descriptor.name}`;
            
            const tempEnemyId = `nocturnal-${creatureType.name.toLowerCase().replace(/\s/g, '-')}-${uid()}`;
            const tempEnemyLevel = (poi.level || 1) + Math.floor(Math.random() * 2);
            const tempEnemyStats = {
                level: tempEnemyLevel,
                hp: 15 + tempEnemyLevel * 5,
                ac: 12 + tempEnemyLevel,
                attack: 2 + tempEnemyLevel,
                damage: `1d6+${tempEnemyLevel - 1}`,
            };
            const tempEnemyCharacter: Character = {
                id: tempEnemyId,
                name: enemyName,
                details: `Une créature de la nuit, un ${enemyName}, nimbée d'une lueur éthérée.`,
                isHostile: true,
                level: tempEnemyStats.level,
                hitPoints: tempEnemyStats.hp,
                maxHitPoints: tempEnemyStats.hp,
                armorClass: tempEnemyStats.ac,
                attackBonus: tempEnemyStats.attack,
                damageBonus: tempEnemyStats.damage,
                locationId: poi.id,
            };
            setCharacters(prev => [...prev, tempEnemyCharacter]);
    
            const familiarRarityRoll = Math.random();
            let rarity: Familiar['rarity'] = 'common';
            if (familiarRarityRoll < 0.05) rarity = 'legendary';
            else if (familiarRarityRoll < 0.15) rarity = 'epic';
            else if (familiarRarityRoll < 0.4) rarity = 'rare';
            else if (familiarRarityRoll < 0.7) rarity = 'uncommon';
    
            const familiarBonus = generateDynamicFamiliarBonus(rarity);
            const trophyName = `${physicalItem.name} de ${enemyName}`;
            const trophyDescription = `Un trophée mystérieux: un ${physicalItem.name.toLowerCase()} provenant d'un ${enemyName.toLowerCase()}. Il semble contenir une essence magique. Rareté: ${rarity}.`;
            const familiarName = `${creatureType.name} ${descriptor.name}`;
            
            const rewardItem: PlayerInventoryItem = {
                id: `trophy-${creatureType.name.toLowerCase()}-${uid()}`,
                name: trophyName,
                quantity: 1,
                description: trophyDescription,
                type: 'consumable',
                goldValue: Math.floor(100 * (familiarRarityRoll + 1)),
                generatedImageUrl: null,
                isEquipped: false,
                statBonuses: {},
                effect: `Permet d'invoquer un ${enemyName} comme familier. ${familiarBonus.description.replace('X', String(familiarBonus.value))}`,
                familiarDetails: {
                  name: familiarName,
                  description: `Un ${familiarName} invoqué depuis un trophée.`,
                  rarity: rarity,
                  level: 1,
                  currentExp: 0,
                  expToNextLevel: 100,
                  passiveBonus: familiarBonus,
                  portraitUrl: null,
                }
            };
            
            const playerCombatant: Combatant = { characterId: PLAYER_ID, name: adventureSettings.playerName || 'Player', team: 'player', currentHp: adventureSettings.playerCurrentHp!, maxHp: adventureSettings.playerMaxHp! };
            const enemyCombatant: Combatant = { 
                characterId: tempEnemyId, 
                name: enemyName, 
                team: 'enemy', 
                currentHp: tempEnemyStats.hp, 
                maxHp: tempEnemyStats.hp,
                rewardItem: rewardItem,
            };
            
            setActiveCombat({
                isActive: true,
                combatants: [playerCombatant, enemyCombatant],
                environmentDescription: `Dans les profondeurs sombres de la ${poi.name}.`,
                turnLog: [],
            });
    
            userActionText = `Je commence une chasse nocturne et un ${enemyName} apparaît !`;

        } else if (buildingId === 'equipe-archeologues') {
             const enemyName = "Gardien des Ruines";
             const tempEnemyId = `guardian-${uid()}`;
             const tempEnemyLevel = (poi.level || 1) * 2;
             const tempEnemyStats = {
                 level: tempEnemyLevel,
                 hp: 40 + tempEnemyLevel * 10,
                 ac: 14 + tempEnemyLevel,
                 attack: 3 + tempEnemyLevel,
                 damage: `2d8+${tempEnemyLevel}`,
             };
             const tempEnemyCharacter: Character = {
                 id: tempEnemyId,
                 name: enemyName,
                 details: "Une ancienne construction de pierre et de magie, animée pour protéger les secrets de ce lieu.",
                 isHostile: true,
                 level: tempEnemyStats.level,
                 hitPoints: tempEnemyStats.hp,
                 maxHitPoints: tempEnemyStats.hp,
                 armorClass: tempEnemyStats.ac,
                 attackBonus: tempEnemyStats.attack,
                 damageBonus: tempEnemyStats.damage,
                 locationId: poi.id,
             };
             setCharacters(prev => [...prev, tempEnemyCharacter]);

             const legendaryItems = [...BASE_WEAPONS, ...BASE_ARMORS].filter(item => item.rarity === 'Légendaire' && activeUniverses.includes(item.universe));
             const randomLegendaryItem = legendaryItems.length > 0 ? legendaryItems[Math.floor(Math.random() * legendaryItems.length)] : BASE_WEAPONS[0]; // Fallback to a basic item

             const rewardItem: PlayerInventoryItem = {
                 id: `${randomLegendaryItem.id}-${uid()}`,
                 name: randomLegendaryItem.name,
                 quantity: 1,
                 description: randomLegendaryItem.description,
                 type: randomLegendaryItem.type as any,
                 goldValue: randomLegendaryItem.baseGoldValue * 2, // Legendary items are valuable
                 damage: randomLegendaryItem.damage,
                 ac: randomLegendaryItem.ac,
                 statBonuses: randomLegendaryItem.statBonuses,
                 generatedImageUrl: null,
                 isEquipped: false,
             };

             const playerCombatant: Combatant = { characterId: PLAYER_ID, name: adventureSettings.playerName || 'Player', team: 'player', currentHp: adventureSettings.playerCurrentHp!, maxHp: adventureSettings.playerMaxHp! };
             const enemyCombatant: Combatant = {
                 characterId: tempEnemyId,
                 name: enemyName,
                 team: 'enemy',
                 currentHp: tempEnemyStats.hp,
                 maxHp: tempEnemyStats.hp,
                 rewardItem: rewardItem,
             };
             
             setActiveCombat({
                 isActive: true,
                 combatants: [playerCombatant, enemyCombatant],
                 environmentDescription: `Dans une chambre oubliée au coeur de la mine de ${poi.name}.`,
                 turnLog: [],
             });

             userActionText = `En explorant les profondeurs avec les archéologues, nous réveillons un ${enemyName} !`;

        } else if (buildingId === 'quartier-esclaves') {
            const baseMercenaries = [
                { name: "Guerrier Endurci", class: "Guerrier", universe: 'Médiéval-Fantastique' },
                { name: "Archer Elfe", class: "Archer", universe: 'Médiéval-Fantastique' },
                { name: "Cyborg de Combat", class: "Cyborg", universe: 'Futuriste' },
                { name: "Pillard du Désert", class: "Pillard", universe: 'Post-Apo' },
            ];
            const availableMercs = baseMercenaries.filter(m => activeUniverses.includes(m.universe));
            let generatedMercs: SellingItem[] = [];
            for(let i=0; i<3; i++) { // Generate 3 mercs for sale
                if (availableMercs.length === 0) break;
                const mercProfile = availableMercs[Math.floor(Math.random() * availableMercs.length)];
                generatedMercs.push({
                    baseItemId: `npc-${mercProfile.name.toLowerCase().replace(/\s/g, '-')}`,
                    name: mercProfile.name,
                    description: `Un ${mercProfile.name} prêt à se battre pour de l'or.`,
                    type: 'npc', // Special type for characters
                    rarity: 'Rare', // Can be used for tiering
                    finalGoldValue: 150 * poiLevel,
                });
            }
            setMerchantInventory(generatedMercs);
        } else if (buildingId === 'menagerie') {
            const creatureTypes = creatureFamiliarItems.filter(item => activeUniverses.includes(item.universe));
            const descriptors = descriptorFamiliarItems.filter(item => activeUniverses.includes(item.universe));
            const physicalItems = physicalFamiliarItems.filter(item => activeUniverses.includes(item.universe));

            let generatedFamiliars: SellingItem[] = [];
            for (let i = 0; i < 5; i++) { // Generate 5 familiar items
                if (creatureTypes.length === 0 || descriptors.length === 0 || physicalItems.length === 0) continue;
                const creatureType = creatureTypes[Math.floor(Math.random() * creatureTypes.length)];
                const descriptor = descriptors[Math.floor(Math.random() * descriptors.length)];
                const physicalItem = physicalItems[Math.floor(Math.random() * physicalItems.length)];
                
                const familiarRarityRoll = Math.random();
                let rarity: Familiar['rarity'] = 'common';
                if (familiarRarityRoll < 0.05) rarity = 'legendary';
                else if (familiarRarityRoll < 0.15) rarity = 'epic';
                else if (familiarRarityRoll < 0.4) rarity = 'rare';
                else if (familiarRarityRoll < 0.7) rarity = 'uncommon';

                const bonus = generateDynamicFamiliarBonus(rarity);
                const itemName = `${physicalItem.name} de ${creatureType.name} ${descriptor.name}`;
                const familiarName = `${creatureType.name} ${descriptor.name}`;
                
                generatedFamiliars.push({
                    baseItemId: `fam-${creatureType.id}-${descriptor.id}-${physicalItem.id}`,
                    name: itemName,
                    description: `Un ${physicalItem.name.toLowerCase()} qui permet d'invoquer un ${creatureType.name} ${descriptor.name}. Rareté: ${rarity}.`,
                    type: 'consumable',
                    rarity: rarity as any,
                    finalGoldValue: Math.floor(50 * (familiarRarityRoll + 1) * poiLevel),
                    effect: `Permet d'invoquer un familier. ${bonus.description.replace('X', String(bonus.value))}`,
                    familiarDetails: {
                      name: familiarName,
                      description: `Un ${familiarName} invoqué depuis un objet.`,
                      rarity,
                      level: 1,
                      currentExp: 0,
                      expToNextLevel: 100,
                      passiveBonus: bonus,
                      portraitUrl: null,
                    }
                });
            }
            setMerchantInventory(generatedFamiliars);
        } else {
            let sourcePool: Array<BaseItem | SellingItem> = [];
            
            const rarityOrder: { [key: string]: number } = { 'Commun': 1, 'Rare': 2, 'Epique': 3, 'Légendaire': 4, 'Divin': 5 };
            
            switch (buildingId) {
                case 'forgeron':
                    sourcePool = [...allWeapons, ...allArmors];
                    break;
                case 'bijoutier':
                    sourcePool = allJewelry;
                    break;
                case 'magicien':
                    sourcePool = allConsumables;
                    break;
                default:
                    handleNarrativeUpdate(userActionText, 'user');
                    await callGenerateAdventure(userActionText, locationIdOverride);
                    setIsLoading(false);
                    return;
            }

            let generatedInventory: SellingItem[] = [];
            const itemsInUniverse = sourcePool.filter(item => activeUniverses.includes((item as BaseItem).universe));
            
            const inventoryConfig: Record<number, { size: number, minRarity: number, maxRarity: number }> = {
                1: { size: 3, minRarity: 1, maxRarity: 1 },
                2: { size: 4, minRarity: 1, maxRarity: 2 },
                3: { size: 5, minRarity: 1, maxRarity: 3 },
                4: { size: 6, minRarity: 2, maxRarity: 4 },
                5: { size: 7, minRarity: 3, maxRarity: 5 },
                6: { size: 10, minRarity: 4, maxRarity: 5 }
            };

            const config = inventoryConfig[poiLevel] || inventoryConfig[1];
            
            const availableItems = itemsInUniverse.filter(item => {
                const itemRarityValue = rarityOrder[(item as BaseItem).rarity || 'Commun'] || 1;
                return itemRarityValue >= config.minRarity && itemRarityValue <= config.maxRarity;
            });
            
            const usedBaseItemIds = new Set<string>();
            let safetyBreak = 0;

            if (availableItems.length > 0) {
                while (generatedInventory.length < config.size && safetyBreak < 200) {
                    const baseItem = availableItems[Math.floor(Math.random() * availableItems.length)] as BaseItem;
                    if (!baseItem || usedBaseItemIds.has(baseItem.id)) {
                        safetyBreak++;
                        continue;
                    }
                    usedBaseItemIds.add(baseItem.id);
                    generatedInventory.push({
                        baseItemId: baseItem.id,
                        name: baseItem.name,
                        description: baseItem.description,
                        type: baseItem.type,
                        damage: baseItem.damage,
                        ac: baseItem.ac,
                        rarity: baseItem.rarity || 'Commun',
                        finalGoldValue: Math.floor(baseItem.baseGoldValue * (1 + (poiLevel - 1) * 0.1)),
                        statBonuses: baseItem.statBonuses,
                        effectType: baseItem.effectType,
                        effectDetails: baseItem.effectDetails,
                        familiarDetails: baseItem.familiarDetails,
                    });
                }
            } else {
                 console.warn(`Aucun objet trouvé pour le marchand '${buildingId}' dans le lieu '${poi.name}' (niveau ${poiLevel}) avec les univers actifs.`);
                 React.startTransition(() => {
                     toast({
                         title: "Stock Limité",
                         description: `Le marchand de type '${buildingName}' n'a rien à vendre pour le moment dans les univers sélectionnés.`,
                         variant: "default",
                     });
                 });
            }
            setMerchantInventory(generatedInventory);
        }

        handleNarrativeUpdate(userActionText, 'user');
        await callGenerateAdventure(userActionText, locationIdOverride);

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
            await callGenerateAdventure(userActionText, locationIdOverride);
        } catch (error) {
            console.error("Error in handleMapAction trying to generate adventure:", error);
            React.startTransition(() => {
                toast({ title: "Erreur Critique de l'IA", description: "Impossible de générer la suite de l'aventure depuis la carte.", variant: "destructive" });
            });
        }
    }
    
    setIsLoading(false);
  }, [callGenerateAdventure, handleNarrativeUpdate, toast, adventureSettings, characters, baseCharacters, allConsumables, allWeapons, allArmors, allJewelry, handleUseFamiliarItem, generateDynamicFamiliarBonus, physicalFamiliarItems, creatureFamiliarItems, descriptorFamiliarItems, allEnemies]);

  const handlePoiPositionChange = React.useCallback((poiId: string, newPosition: { x: number, y: number }) => {
    setAdventureSettings(prev => {
        if (!prev.mapPointsOfInterest) return prev;
        const newPois = prev.mapPointsOfInterest.map(poi => 
            poi.id === poiId ? { ...poi, position: newPosition } : poi
        );
        return { ...prev, mapPointsOfInterest: newPois };
    });
  }, []);
  
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
        resources: poiLevelConfig[data.type as keyof typeof poiLevelConfig]?.[data.level as keyof typeof poiLevelNameMap[keyof typeof poiLevelNameMap]]?.resources || [],
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
}, [toast]);
  

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
  }, [toast]);

  const handleMapImageUrlChange = React.useCallback((url: string) => {
    setAdventureSettings(prev => ({ ...prev, mapImageUrl: url }));
    React.startTransition(() => {
        toast({
            title: "Image de Carte Chargée",
            description: "Le fond de la carte a été mis à jour depuis l'URL.",
        });
    });
  }, [toast]);
    
  const handleAiConfigChange = React.useCallback((newConfig: AiConfig) => {
    setAiConfig(newConfig);
    localStorage.setItem('globalAiConfig', JSON.stringify(newConfig));
    React.startTransition(() => {
        toast({ title: "Configuration IA mise à jour" });
    });
  }, [toast]);
  
    const handleAddToCart = React.useCallback((item: SellingItem) => {
        setShoppingCart(prevCart => {
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
        setShoppingCart(prevCart => {
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
  }, [toast]);

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
  }, [adventureSettings, toast]);
    
  // This is the key change. We derive the form values from the main state.
  // This makes the main state the single source of truth.
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
  
  const getLocalizedText = (field: LocalizedText, lang: string) => {
    return field[lang] || field['en'] || field['fr'] || Object.values(field)[0] || "";
  };

  const worldForQuestHook = getLocalizedText(adventureSettings.world, currentLanguage);
  const characterNamesForQuestHook = React.useMemo(() => characters.map(c => c.name).join(", "), [characters]);

  const callSuggestQuestHook = React.useCallback(async () => {
    React.startTransition(() => {
      setIsSuggestingQuest(true);
    });
    React.startTransition(() => {
      toast({ title: "Suggestion de Quête", description: "L'IA réfléchit à une nouvelle accroche..." });
    });

    const recentMessages = narrativeMessages.slice(-5).map(m => m.type === 'user' ? `${adventureSettings.playerName}: ${m.content}` : m.content).join('\n');

    try {
      const input: SuggestQuestHookInput = {
        worldDescription: worldForQuestHook,
        currentSituation: recentMessages,
        involvedCharacters: characterNamesForQuestHook,
        language: currentLanguage,
      };
      const result = await suggestQuestHook(input);
      React.startTransition(() => {
        React.startTransition(() => {
          toast({
            title: "Suggestion de Quête:",
            description: (
              <div>
                <p className="font-semibold">{result.questHook}</p>
                <p className="text-xs mt-1">({result.justification})</p>
              </div>
            ),
            duration: 9000,
          });
        });
      });
    } catch (error) {
      console.error("Error suggesting quest hook:", error);
      React.startTransition(() => {
        React.startTransition(() => {
          toast({ title: "Erreur", description: "Impossible de suggérer une quête.", variant: "destructive" });
        });
      });
    } finally {
      React.startTransition(() => {
        setIsSuggestingQuest(false);
      });
    }
  }, [narrativeMessages, characterNamesForQuestHook, worldForQuestHook, currentLanguage, toast, setIsSuggestingQuest, adventureSettings.playerName]);

  const handleGenerateMapImage = React.useCallback(async () => {
        setIsGeneratingMap(true);
        React.startTransition(() => {
            toast({ title: "Génération de la carte...", description: "L'IA dessine votre monde." });
        });

        const { world, mapPointsOfInterest } = adventureSettings;
        const worldText = getLocalizedText(world, 'en'); // Use English for better image gen results
        const poiNames = mapPointsOfInterest?.map(poi => poi.name).join(', ') || 'terres inconnues';

        const prompt = `A fantasy map of a world. The style should be that of a hand-drawn map from a classic fantasy novel like "The Lord of the Rings". The map is on aged, weathered parchment. Include artistic details like a compass rose, sea monsters in any oceans, and rolling hills or mountains. Key locations to feature with calligraphic labels are: ${poiNames}. The overall atmosphere is one of ancient adventure. World description for context: ${worldText}`;

        try {
            const result = await generateSceneImageActionWrapper({ sceneDescription: prompt });
            if (result.imageUrl) {
                setAdventureSettings(prev => ({ ...prev, mapImageUrl: result.imageUrl }));
                React.startTransition(() => {
                    toast({ title: "Carte Générée!", description: "Le fond de la carte a été mis à jour." });
                });
            }
        } catch (error) {
            console.error("Error generating map image:", error);
            React.startTransition(() => {
                toast({ title: "Erreur", description: "Impossible de générer le fond de la carte.", variant: "destructive" });
            });
        } finally {
            setIsGeneratingMap(false);
        }
    }, [generateSceneImageActionWrapper, toast, adventureSettings]);

  const handleGenerateItemImage = React.useCallback(async (item: PlayerInventoryItem) => {
    if (isGeneratingItemImage) return;
    setIsGeneratingItemImage(true);
    React.startTransition(() => {
        toast({
          title: "Génération d'Image d'Objet",
          description: `Création d'une image pour ${item.name}...`,
        });
    });

    let promptDescription = `A detailed illustration of a fantasy game item: "${item.name}".`;
    if (item.description) {
      promptDescription += ` Description: ${item.description}.`;
    }
    if (item.effect) {
      promptDescription += ` Effect: ${item.effect}.`;
    }
    if (item.type) {
        promptDescription += ` Type: ${item.type}.`;
    }
    if (item.statBonuses) {
        promptDescription += ` Grants bonuses: ${Object.entries(item.statBonuses).map(([key, value]) => `${key} ${value}`).join(', ')}.`;
    }


    try {
      const result = await generateSceneImageActionWrapper({ sceneDescription: promptDescription });
      if (result.error) { 
        setIsGeneratingItemImage(false); 
        return;
      }
      console.log(`Image générée pour ${item.name}:`, result.imageUrl);

      setAdventureSettings(prevSettings => {
        const newInventory = (prevSettings.playerInventory || []).map(invItem => {
          if (invItem.id === item.id) {
            return { ...invItem, generatedImageUrl: result.imageUrl };
          }
          return invItem;
        });
        return { ...prevSettings, playerInventory: newInventory };
      });

      React.startTransition(() => {
          toast({
            title: "Image d'Objet Générée!",
            description: (
              <div className="flex flex-col gap-2">
                <p>{item.name} visualisé.</p>
                {result.imageUrl && <img src={result.imageUrl} alt={item.name} className="w-16 h-16 object-contain border rounded-md" data-ai-hint="generated item image"/>}
                <p className="text-xs">L'image devrait apparaître dans l'inventaire.</p>
              </div>
            ),
            duration: 9000,
          });
      });

    } catch (error) { 
      console.error(`Critical error generating image for ${item.name}:`, error);
      React.startTransition(() => {
          toast({
            title: "Erreur Critique de Génération d'Image",
            description: `Impossible de générer une image pour ${item.name}. ${error instanceof Error ? error.message : ''}`,
            variant: "destructive",
          });
      });

    } finally {
      setIsGeneratingItemImage(false);
    }
  }, [generateSceneImageActionWrapper, toast, isGeneratingItemImage]);
    
  
  const isUiLocked = isLoading || isRegenerating || isSuggestingQuest || isGeneratingItemImage || isGeneratingMap;
    const handleCloseMerchantPanel = () => {
        setMerchantInventory([]);
        setShoppingCart([]);
    };

    const handleNewCharacters = (newChars: NewCharacterSchema[]) => {
      // This function is no longer called by the AI, but we keep it for potential future use or manual triggering.
      console.log("handleNewCharacters called with:", newChars);
    };

  return (
    <>
    <PageStructure
      adventureSettings={adventureSettings}
      characters={characters}
      stagedAdventureSettings={memoizedStagedAdventureSettingsForForm}
      formPropKey={formPropKey}
      handleApplyStagedChanges={handleApplyStagedChanges}
      narrativeMessages={narrativeMessages}
      currentLanguage={currentLanguage}
      fileInputRef={fileInputRef}
      adventureFormRef={adventureFormRef}
      handleToggleRpgMode={handleToggleRpgMode}
      handleToggleRelationsMode={handleToggleRelationsMode}
      handleToggleStrategyMode={handleToggleStrategyMode}
      onNarrativeChange={handleNarrativeUpdate}
      handleCharacterUpdate={handleCharacterUpdate}
      handleNewCharacters={handleNewCharacters}
      onMaterializeCharacter={handleMaterializeCharacter}
      onSummarizeHistory={handleSummarizeHistory}
      handleCharacterHistoryUpdate={handleCharacterHistoryUpdate}
      handleAffinityUpdates={handleAffinityUpdates}
      handleRelationUpdate={(charId, targetId, newRelation) => {
           const currentRelationsMode = adventureSettings.relationsMode ?? true;
           if (!currentRelationsMode) return;
           setCharacters(prevChars =>
             prevChars.map(char => {
               if (char.id === charId) {
                 const updatedRelations = { ...(char.relations || {}), [targetId]: newRelation };
                 return { ...char, relations: updatedRelations };
               }
               if (targetId !== PLAYER_ID && char.id === targetId ) {
                    const sourceChar = prevChars.find(c => c.id === charId);
                    if (sourceChar) {
                        const updatedRelations = { ...(char.relations || {}), [charId]: newRelation };
                        return { ...char, relations: updatedRelations };
                    }
               }
               return char;
            })
           );
      }}
      handleRelationUpdatesFromAI={handleRelationUpdatesFromAI}
      handleSaveNewCharacter={handleSaveNewCharacter}
      handleAddStagedCharacter={handleAddStagedCharacter}
      handleSave={handleSave}
      handleLoad={handleLoad}
      setCurrentLanguage={handleSetCurrentLanguage}
      translateTextAction={translateText}
      generateAdventureAction={callGenerateAdventure}
      generateSceneImageAction={generateSceneImageActionWrapper}
      handleEditMessage={handleEditMessage}
      handleRegenerateLastResponse={handleRegenerateLastResponse}
      handleUndoLastMessage={handleUndoLastMessage}
      playerId={PLAYER_ID}
      playerName={adventureSettings.playerName || "Player"}
      onRestartAdventure={confirmRestartAdventure}
      activeCombat={activeCombat}
      onCombatUpdates={handleCombatUpdates}
      suggestQuestHookAction={callSuggestQuestHook}
      isSuggestingQuest={isSuggestingQuest}
      showRestartConfirm={showRestartConfirm}
      setShowRestartConfirm={setShowRestartConfirm}
      handleTakeLoot={handleTakeLoot}
      handleDiscardLoot={handleDiscardLoot}
      handlePlayerItemAction={handlePlayerItemAction}
      handleSellItem={handleSellItem}
      handleGenerateItemImage={handleGenerateItemImage}
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
      onGenerateMap={handleGenerateMapImage}
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
      setIsSaveComicDialogOpen={handleSetIsSaveComicDialogOpen}
      comicTitle={comicTitle}
      setComicTitle={handleSetComicTitle}
      comicCoverUrl={comicCoverUrl}
      isGeneratingCover={isGeneratingCover}
      onGenerateCover={handleGenerateCover}
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
                <Button key={enemy.characterId} variant = "outline" className="w-full justify-start" onClick={() => applyCombatItemEffect(enemy.characterId)}>
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
