
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { Character, AdventureSettings, SaveData, Message, ActiveCombat, PlayerInventoryItem, LootedItem } from "@/types";
import { PageStructure } from "./page.structure";

import { generateAdventure } from "@/ai/flows/generate-adventure";
import type { GenerateAdventureInput, GenerateAdventureOutput, CharacterUpdateSchema, AffinityUpdateSchema, RelationUpdateSchema, NewCharacterSchema, CombatUpdatesSchema } from "@/ai/flows/generate-adventure";
import { generateSceneImage } from "@/ai/flows/generate-scene-image";
import type { GenerateSceneImageInput, GenerateSceneImageOutput } from "@/ai/flows/generate-scene-image";
import { translateText } from "@/ai/flows/translate-text";
import type { TranslateTextInput, TranslateTextOutput } from "@/ai/flows/translate-text";
import { suggestQuestHook } from "@/ai/flows/suggest-quest-hook";
import type { SuggestQuestHookInput, SuggestQuestHookOutput } from "@/ai/flows/suggest-quest-hook";


const PLAYER_ID = "player";
const BASE_ATTRIBUTE_VALUE = 8;
const INITIAL_CREATION_ATTRIBUTE_POINTS = 10;
const ATTRIBUTE_POINTS_PER_LEVEL_GAIN = 5;

export type FormCharacterDefinition = { id?: string; name: string; details: string };

export type AdventureFormValues = {
  world: string;
  initialSituation: string;
  characters: FormCharacterDefinition[];
  enableRpgMode?: boolean;
  enableRelationsMode?: boolean;
  playerName?: string;
  playerClass?: string;
  playerLevel?: number;
  playerInitialAttributePoints?: number; // Points de création
  totalDistributableAttributePoints?: number; // Points totaux pour le niveau actuel (création + niveaux)
  playerStrength?: number;
  playerDexterity?: number;
  playerConstitution?: number;
  playerIntelligence?: number;
  playerWisdom?: number;
  playerCharisma?: number;
  playerAttackBonus?: number;
  playerDamageBonus?: string;
  playerMaxHp?: number;
  playerMaxMp?: number;
  playerArmorClass?: number;
  playerExpToNextLevel?: number;
  playerGold?: number;
};

// Calculates base stats derived from attributes, before equipment
const calculateBaseDerivedStats = (settings: Partial<AdventureSettings>) => {
  const constitution = settings.playerConstitution || BASE_ATTRIBUTE_VALUE;
  const intelligence = settings.playerIntelligence || BASE_ATTRIBUTE_VALUE;
  const dexterity = settings.playerDexterity || BASE_ATTRIBUTE_VALUE;
  const strength = settings.playerStrength || BASE_ATTRIBUTE_VALUE;
  const playerClass = settings.playerClass || "";
  const playerLevel = settings.playerLevel || 1;

  let maxHp = 10 + (Math.floor((constitution - 10) / 2) + constitution) * playerLevel;
  if (playerClass.toLowerCase().includes("guerrier") || playerClass.toLowerCase().includes("barbare")) {
    maxHp += playerLevel * 2;
  } else if (playerClass.toLowerCase().includes("mage") || playerClass.toLowerCase().includes("sorcier") || playerClass.toLowerCase().includes("étudiant")) {
    maxHp -= playerLevel * 1;
  }

  let maxMp = 0;
  if (playerClass.toLowerCase().includes("magicien") || playerClass.toLowerCase().includes("mage") || playerClass.toLowerCase().includes("sorcier") || playerClass.toLowerCase().includes("étudiant")) {
    maxMp = 10 + Math.max(0, (intelligence - 10)) * 2 + Math.floor(playerLevel / 2) * 5;
  }

  const baseArmorClass = 10 + Math.floor((dexterity - 10) / 2);
  const proficiencyBonus = Math.floor((playerLevel - 1) / 4) + 2;
  const baseAttackBonus = Math.floor((strength - 10) / 2) + proficiencyBonus;
  const baseDamageBonusValue = Math.floor((strength - 10) / 2);
  const baseDamageBonus = baseDamageBonusValue >= 0 ? `+${baseDamageBonusValue}` : `${baseDamageBonusValue}`;


  return {
    playerMaxHp: Math.max(5, maxHp),
    playerMaxMp: Math.max(0, maxMp),
    playerArmorClass: baseArmorClass,
    playerAttackBonus: baseAttackBonus,
    playerDamageBonus: baseDamageBonus === "+0" ? "1" : (baseDamageBonusValue > 0 ? baseDamageBonus : "1"),
  };
};

// Calculates effective stats including equipment
const calculateEffectiveStats = (settings: AdventureSettings) => {
    const baseDerived = calculateBaseDerivedStats(settings);
    let effectiveAC = baseDerived.playerArmorClass;
    let effectiveAttackBonus = baseDerived.playerAttackBonus;
    let effectiveDamageBonus = baseDerived.playerDamageBonus;

    const inventory = settings.playerInventory || [];
    const weaponId = settings.equippedItemIds?.weapon;
    const armorId = settings.equippedItemIds?.armor;
    const jewelryId = settings.equippedItemIds?.jewelry;

    const equippedWeapon = weaponId ? inventory.find(item => item.id === weaponId) : null;
    const equippedArmor = armorId ? inventory.find(item => item.id === armorId) : null;
    const equippedJewelry = jewelryId ? inventory.find(item => item.id === jewelryId) : null;

    if (equippedArmor?.statBonuses?.ac) {
        effectiveAC += equippedArmor.statBonuses.ac;
    }
    if (equippedJewelry?.statBonuses?.ac) {
        effectiveAC += equippedJewelry.statBonuses.ac;
    }

    if (equippedWeapon?.statBonuses?.attack) {
        effectiveAttackBonus += equippedWeapon.statBonuses.attack;
    }
    if (equippedJewelry?.statBonuses?.attack) {
        effectiveAttackBonus += equippedJewelry.statBonuses.attack;
    }

    if (equippedWeapon?.statBonuses?.damage) {
        // If weapon has damage, it usually replaces base damage, not adds, unless specified otherwise
        effectiveDamageBonus = equippedWeapon.statBonuses.damage;
    }


    return {
        ...baseDerived,
        playerArmorClass: effectiveAC,
        playerAttackBonus: effectiveAttackBonus,
        playerDamageBonus: effectiveDamageBonus,
    };
};

export interface SellingItemDetails {
  item: PlayerInventoryItem;
  sellPricePerUnit: number;
}

export default function Home() {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const initialPlayerAttributes = {
    playerInitialAttributePoints: INITIAL_CREATION_ATTRIBUTE_POINTS,
    playerStrength: BASE_ATTRIBUTE_VALUE,
    playerDexterity: BASE_ATTRIBUTE_VALUE,
    playerConstitution: BASE_ATTRIBUTE_VALUE,
    playerIntelligence: BASE_ATTRIBUTE_VALUE,
    playerWisdom: BASE_ATTRIBUTE_VALUE,
    playerCharisma: BASE_ATTRIBUTE_VALUE,
  };

  const initialBaseDerivedStats = calculateBaseDerivedStats({
    ...initialPlayerAttributes,
    playerName: "Héros",
    playerClass: "Guerrier",
    playerLevel: 1,
    playerExpToNextLevel: 100,
    playerGold: 15,
  });


  const [baseAdventureSettings, setBaseAdventureSettings] = React.useState<AdventureSettings>({
    world: "Le village paisible de Bourgenval est niché au bord de la Forêt Murmurante. Récemment, des gobelins plus audacieux qu'à l'accoutumée ont commencé à attaquer les voyageurs et à piller les fermes isolées. Les villageois sont terrifiés.",
    initialSituation: "Vous arrivez à Bourgenval, fatigué par la route. L'Ancienne Elara, la matriarche respectée du village, vous aborde avec un regard inquiet. 'Étranger,' dit-elle, 'votre regard est celui d'un guerrier. Nous avons désespérément besoin d'aide. Les gobelins de la Grotte Grinçante sont devenus une véritable menace. Pourriez-vous nous en débarrasser ?'",
    rpgMode: true,
    relationsMode: true,
    playerName: "Héros",
    playerClass: "Guerrier",
    playerLevel: 1,
    ...initialPlayerAttributes,
    ...initialBaseDerivedStats,
    playerCurrentHp: initialBaseDerivedStats.playerMaxHp,
    playerCurrentMp: initialBaseDerivedStats.playerMaxMp,
    playerCurrentExp: 0,
    playerExpToNextLevel: 100,
    playerGold: 15,
    playerInventory: [
        {id: "potion-soin-initial-1", name: "Potion de Soin Mineure", quantity: 2, description: "Une fiole rougeâtre qui restaure quelques points de vie.", effect: "Restaure 10 PV", type: "consumable", goldValue: 10, generatedImageUrl: null, isEquipped: false, statBonuses: {}},
        {id: "dague-rouillee-initial-1", name: "Dague Rouillée", quantity: 1, description: "Une dague simple et usée.", effect: "Arme de base.", type: "weapon", goldValue: 2, generatedImageUrl: null, isEquipped: false, statBonuses: { damage: "1d4" }}
    ],
    equippedItemIds: { weapon: null, armor: null, jewelry: null },
  });
  const [baseCharacters, setBaseCharacters] = React.useState<Character[]>([
      {
        id: 'elara-1',
        name: "Ancienne Elara",
        details: "Vieille femme sage et respectée de Bourgenval. Elle porte le fardeau des espoirs de son village. Environ 70 ans, cheveux gris tressés, yeux perçants et bienveillants.",
        biographyNotes: "Elara a vu des générations grandir et tomber. Elle est déterminée à protéger Bourgenval, quitte à faire confiance à des étrangers.",
        history: ["A demandé de l'aide au joueur pour les gobelins."],
        portraitUrl: null,
        affinity: 60,
        relations: { [PLAYER_ID]: "Espoir du village" },
        hitPoints: 10, maxHitPoints: 10, characterClass: "Sage", level: 1, isHostile: false,
      },
      {
        id: 'frak-1',
        name: "Frak, Chef Gobelin",
        details: "Un gobelin particulièrement grand et méchant, avec une cicatrice en travers du museau et armé d'une hache rouillée. Il dirige la tribu de la Grotte Grinçante.",
        biographyNotes: "Frak est devenu plus agressif récemment, poussé par une force mystérieuse ou un besoin désespéré.",
        history: ["Dirige les raids contre Bourgenval."],
        portraitUrl: null,
        affinity: 5,
        relations: { [PLAYER_ID]: "Intrus à tuer" },
        hitPoints: 25, maxHitPoints: 25, characterClass: "Chef Gobelin", level: 2, armorClass: 13, attackBonus: 3, damageBonus: "1d8+1", isHostile: true,
        inventory: {"Hache Rouillée": 1, "Pièces de Cuivre": 12}
      },
      {
        id: 'snirf-1',
        name: "Snirf, Gobelin Fureteur",
        details: "Un petit gobelin agile et sournois, armé d'une courte dague. Sert d'éclaireur pour sa tribu.",
        biographyNotes: "Snirf est plus couard que méchant, mais loyal à Frak par peur.",
        history: ["A été aperçu rôdant près de Bourgenval."],
        portraitUrl: null,
        affinity: 10,
        relations: { [PLAYER_ID]: "Cible facile", "frak-1": "Chef redouté" },
        hitPoints: 8, maxHitPoints: 8, characterClass: "Fureteur Gobelin", level: 1, armorClass: 12, attackBonus: 2, damageBonus: "1d4", isHostile: true,
        inventory: {"Dague Courte": 1, "Cailloux pointus": 5}
      }
  ]);

  // Live state
  const [adventureSettings, setAdventureSettings] = React.useState<AdventureSettings>(() => JSON.parse(JSON.stringify(baseAdventureSettings)));
  const [characters, setCharacters] = React.useState<Character[]>(() => JSON.parse(JSON.stringify(baseCharacters)));
  const [activeCombat, setActiveCombat] = React.useState<ActiveCombat | undefined>(undefined);
  const [narrativeMessages, setNarrativeMessages] = React.useState<Message[]>([
     { id: `msg-${Date.now()}`, type: 'system', content: baseAdventureSettings.initialSituation, timestamp: Date.now() }
  ]);
  const [currentLanguage, setCurrentLanguage] = React.useState<string>("fr");

  // Staged state (for form edits before applying)
  const [stagedAdventureSettings, setStagedAdventureSettings] = React.useState<AdventureSettings>(() => JSON.parse(JSON.stringify(baseAdventureSettings)));
  const [stagedCharacters, setStagedCharacters] = React.useState<Character[]>(() => JSON.parse(JSON.stringify(baseCharacters)));
  const [formPropKey, setFormPropKey] = React.useState(0);

  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = React.useState<boolean>(false);
  const [showRestartConfirm, setShowRestartConfirm] = React.useState<boolean>(false);
  const [isSuggestingQuest, setIsSuggestingQuest] = React.useState<boolean>(false);
  const [isGeneratingItemImage, setIsGeneratingItemImage] = React.useState<boolean>(false);
  const [itemToSellDetails, setItemToSellDetails] = React.useState<SellingItemDetails | null>(null);
  const [sellQuantity, setSellQuantity] = React.useState(1);


  const { toast } = useToast();

  // --- useEffects to synchronize live state to staged state ---
  React.useEffect(() => {
    setStagedAdventureSettings(prevStaged => {
      const newLiveSettingsCopy = JSON.parse(JSON.stringify(adventureSettings));
      if (JSON.stringify(prevStaged) !== JSON.stringify(newLiveSettingsCopy)) {
        return newLiveSettingsCopy;
      }
      return prevStaged;
    });
  }, [adventureSettings]);

  React.useEffect(() => {
    setStagedCharacters(prevStaged => {
      const newLiveCharsCopy = JSON.parse(JSON.stringify(characters));
      if (JSON.stringify(prevStaged) !== JSON.stringify(newLiveCharsCopy)) {
        return newLiveCharsCopy;
      }
      return prevStaged;
    });
  }, [characters]);

  const handleNarrativeUpdate = React.useCallback((content: string, type: 'user' | 'ai', sceneDesc?: string, lootItemsFromAI?: LootedItem[]) => {
       const newItemsWithIds: PlayerInventoryItem[] | undefined = lootItemsFromAI?.map(item => ({
           id: item.itemName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
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
            loot: type === 'ai' && newItemsWithIds && newItemsWithIds.length > 0 ? newItemsWithIds : undefined,
            lootTaken: false,
       };
       setNarrativeMessages(prevNarrative => [...prevNarrative, newMessage]);
   }, []);

  const addCurrencyToPlayer = React.useCallback((amount: number) => {
    setAdventureSettings(prevSettings => {
        if (!prevSettings.rpgMode) return prevSettings;
        let currentGold = prevSettings.playerGold ?? 0;
        let newGold = currentGold + amount;
        if (newGold < 0) newGold = 0;
        return { ...prevSettings, playerGold: newGold };
    });
  }, []);

  const handleCombatUpdates = React.useCallback((combatUpdates: CombatUpdatesSchema) => {
    const toastsToShow: Array<Parameters<typeof toast>[0]> = [];
    const currentRpgMode = adventureSettings.rpgMode;

    setCharacters(prevChars => {
        if (!currentRpgMode) {
             console.warn("handleCombatUpdates called when RPG mode is disabled.");
             return prevChars;
        }
        return prevChars.map(char => {
            const combatantUpdate = combatUpdates.updatedCombatants.find(cu => cu.combatantId === char.id);
            if (combatantUpdate) {
                return {
                    ...char,
                    hitPoints: combatantUpdate.newHp,
                    manaPoints: combatantUpdate.newMp ?? char.manaPoints,
                    isHostile: combatantUpdate.isDefeated ? char.isHostile : (char.isHostile ?? true),
                    statusEffects: combatantUpdate.newStatusEffects || char.statusEffects,
                };
            }
            return char;
        });
    });

    setAdventureSettings(prevSettings => {
        if (!currentRpgMode) return prevSettings;
        let newSettings = { ...prevSettings };
        const playerCombatUpdate = combatUpdates.updatedCombatants.find(cu => cu.combatantId === PLAYER_ID);
        if (playerCombatUpdate) {
            newSettings.playerCurrentHp = playerCombatUpdate.newHp;
            newSettings.playerCurrentMp = playerCombatUpdate.newMp ?? newSettings.playerCurrentMp;
            if (playerCombatUpdate.isDefeated) {
                 setTimeout(() => {
                    toastsToShow.push({ title: "Joueur Vaincu!", description: "L'aventure pourrait prendre un tournant difficile...", variant: "destructive" });
                 },0);
            }
        }

        if (newSettings.playerMaxMp && (newSettings.playerMaxMp > 0) && newSettings.playerCurrentMp !== undefined && (newSettings.playerCurrentMp < newSettings.playerMaxMp)) {
             newSettings.playerCurrentMp = Math.min(newSettings.playerMaxMp, (newSettings.playerCurrentMp || 0) + 1);
        }

        if (typeof combatUpdates.expGained === 'number' && combatUpdates.expGained > 0 && newSettings.playerCurrentExp !== undefined && newSettings.playerExpToNextLevel !== undefined && newSettings.playerLevel !== undefined) {
            newSettings.playerCurrentExp += combatUpdates.expGained;
            setTimeout(() => { toast({ title: "Expérience Gagnée!", description: `Vous avez gagné ${combatUpdates.expGained} EXP.` }); }, 0);

            let gainedLevel = false;
            while (newSettings.playerCurrentExp >= newSettings.playerExpToNextLevel!) {
                gainedLevel = true;
                newSettings.playerLevel! += 1;
                newSettings.playerCurrentExp -= newSettings.playerExpToNextLevel!;
                newSettings.playerExpToNextLevel = Math.floor(newSettings.playerExpToNextLevel! * 1.5);

                const derivedStats = calculateEffectiveStats(newSettings);
                newSettings.playerMaxHp = derivedStats.playerMaxHp;
                newSettings.playerCurrentHp = newSettings.playerMaxHp;
                if (newSettings.playerMaxMp && newSettings.playerMaxMp > 0) {
                    newSettings.playerMaxMp = derivedStats.playerMaxMp;
                    newSettings.playerCurrentMp = newSettings.playerMaxMp;
                }
                 newSettings.playerArmorClass = derivedStats.playerArmorClass;
                 newSettings.playerAttackBonus = derivedStats.playerAttackBonus;
                 newSettings.playerDamageBonus = derivedStats.playerDamageBonus;
            }
            if (gainedLevel) {
                 setTimeout(() => {
                    toast({
                        title: "Niveau Supérieur!",
                        description: (
                            <div>
                                <p>Vous avez atteint le niveau {newSettings.playerLevel}! Vos PV et PM max ont augmenté.</p>
                                <p className="mt-1 font-semibold">Vous avez gagné {ATTRIBUTE_POINTS_PER_LEVEL_GAIN} points d'attributs à distribuer !</p>
                                <p className="text-xs">Rendez-vous dans la configuration de l'aventure pour les assigner.</p>
                            </div>
                        ),
                        duration: 9000,
                    });
                }, 0);
            }
        }
        return newSettings;
    });

    if (combatUpdates.nextActiveCombatState) {
         setActiveCombat(combatUpdates.nextActiveCombatState);
    } else if (combatUpdates.combatEnded) {
         setActiveCombat(undefined);
         setTimeout(() => { toast({ title: "Combat Terminé!"}); }, 0);
    }
    toastsToShow.forEach(toastArgs => setTimeout(() => { toast(toastArgs); }, 0));
  }, [toast, adventureSettings.rpgMode, adventureSettings.playerConstitution, adventureSettings.playerIntelligence, adventureSettings.playerClass, adventureSettings.playerLevel]);


  const handleNewCharacters = React.useCallback((newChars: NewCharacterSchema[]) => {
    if (!newChars || newChars.length === 0) return;

    const currentStagedPlayerName = stagedAdventureSettings.playerName || "Player";
    const currentStagedRPGMode = stagedAdventureSettings.rpgMode;
    const currentStagedRelationsMode = stagedAdventureSettings.relationsMode ?? true;
    const defaultRelationDesc = currentLanguage === 'fr' ? "Inconnu" : "Unknown";

    const newCharactersToAdd: Character[] = newChars.map(nc => {
      const newId = `${nc.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      let initialRelations: Record<string, string> = {};
      if (currentStagedRelationsMode) {
        initialRelations[PLAYER_ID] = defaultRelationDesc;
        if (nc.initialRelations) {
          nc.initialRelations.forEach(rel => {
            const targetChar = characters.find(c => c.name.toLowerCase() === rel.targetName.toLowerCase());
            if (targetChar) {
              initialRelations[targetChar.id] = rel.description;
            } else if (rel.targetName.toLowerCase() === currentStagedPlayerName.toLowerCase()) {
              initialRelations[PLAYER_ID] = rel.description;
            }
          });
        }
      }

      const inventoryRecord: Record<string, number> = {};
      if (currentStagedRPGMode && nc.inventory) {
        nc.inventory.forEach(item => {
          inventoryRecord[item.itemName] = item.quantity;
        });
      }

      return {
        id: newId,
        name: nc.name,
        details: nc.details || (currentLanguage === 'fr' ? "Aucun détail fourni." : "No details provided."),
        biographyNotes: nc.biographyNotes || (currentLanguage === 'fr' ? 'Aucune note biographique.' : 'No biographical notes.'),
        history: nc.initialHistoryEntry ? [nc.initialHistoryEntry] : [],
        portraitUrl: null,
        affinity: currentStagedRelationsMode ? 50 : undefined,
        relations: currentStagedRelationsMode ? initialRelations : undefined,
        ...(currentStagedRPGMode ? {
            level: nc.level ?? 1,
            characterClass: nc.characterClass || "PNJ",
            inventory: inventoryRecord,
            hitPoints: nc.hitPoints ?? nc.maxHitPoints ?? 10,
            maxHitPoints: nc.maxHitPoints ?? 10,
            manaPoints: nc.manaPoints ?? nc.maxManaPoints ?? 0,
            maxManaPoints: nc.maxManaPoints ?? 0,
            armorClass: nc.armorClass ?? 10,
            attackBonus: nc.attackBonus ?? 0,
            damageBonus: nc.damageBonus ?? "1",
            isHostile: nc.isHostile ?? false,
        } : {})
      };
    });

    setStagedCharacters(prevStagedChars => {
      const updatedChars = [...prevStagedChars];
      newCharactersToAdd.forEach(newChar => {
        if (!updatedChars.some(sc => sc.id === newChar.id || sc.name.toLowerCase() === newChar.name.toLowerCase())) {
          updatedChars.push(newChar);
          if (currentStagedRelationsMode) {
            for (let i = 0; i < updatedChars.length -1; i++) {
                if (!updatedChars[i].relations) updatedChars[i].relations = {};
                if (!updatedChars[i].relations![newChar.id]) {
                    updatedChars[i].relations![newChar.id] = defaultRelationDesc;
                }
                if (!newChar.relations) newChar.relations = {};
                 if (!newChar.relations![updatedChars[i].id]) {
                    newChar.relations![updatedChars[i].id] = defaultRelationDesc;
                }
            }
          }
          setTimeout(() => {toast({ title: "Nouveau Personnage Rencontré!", description: `${newChar.name} a été ajouté aux personnages de l'aventure (modifications en attente).`}); }, 0);
        }
      });
      return updatedChars;
    });

  }, [currentLanguage, stagedAdventureSettings.playerName, stagedAdventureSettings.rpgMode, stagedAdventureSettings.relationsMode, toast, characters]);

  const handleCharacterHistoryUpdate = React.useCallback((updates: CharacterUpdateSchema[]) => {
    if (!updates || updates.length === 0) return;
    setStagedCharacters(prevChars => {
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
        if (changed) return updatedChars;
        return prevChars;
    });
  }, []);

  const handleAffinityUpdates = React.useCallback((updates: AffinityUpdateSchema[]) => {
    const currentRelationsMode = stagedAdventureSettings.relationsMode ?? true;
    if (!currentRelationsMode || !updates || updates.length === 0) return;

    const toastsToShow: Array<Parameters<typeof toast>[0]> = [];

    setStagedCharacters(prevChars => {
         let changed = false;
        const updatedChars = prevChars.map(char => {
            const affinityUpdate = updates.find(u => u.characterName.toLowerCase() === char.name.toLowerCase());
            if (affinityUpdate) {
                changed = true;
                const currentAffinity = char.affinity ?? 50;
                const newAffinity = Math.max(0, Math.min(100, currentAffinity + affinityUpdate.change));

                if (Math.abs(affinityUpdate.change) >= 3) {
                     const charName = affinityUpdate.characterName;
                     const direction = affinityUpdate.change > 0 ? 'améliorée' : 'détériorée';
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
     toastsToShow.forEach(toastArgs => setTimeout(() => { toast(toastArgs); }, 0));
  }, [toast, stagedAdventureSettings.relationsMode]);

  const handleRelationUpdatesFromAI = React.useCallback((updates: RelationUpdateSchema[]) => {
    const currentRelationsMode = stagedAdventureSettings.relationsMode ?? true;
    const currentPlayerName = stagedAdventureSettings.playerName || "Player";
    if (!currentRelationsMode || !updates || updates.length === 0) return;

    const defaultRelationDesc = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
    const toastsToShow: Array<Parameters<typeof toast>[0]> = [];

    setStagedCharacters(prevChars => {
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
                         charsCopy[targetCharIndex].relations![charsCopy[sourceCharIndex].id] = newRelationFromAI; // Assuming symmetric relation update for NPC-NPC for now
                    }
                }
            }
        });

        if (changed) return charsCopy;
        return prevChars;
    });
     toastsToShow.forEach(toastArgs => setTimeout(() => { toast(toastArgs); }, 0));
  }, [currentLanguage, stagedAdventureSettings.playerName, toast, stagedAdventureSettings.relationsMode]);

  const callGenerateAdventure = React.useCallback(async (userActionText: string) => {
    React.startTransition(() => {
      setIsLoading(true);
    });

    const currentTurnSettings = JSON.parse(JSON.stringify(adventureSettings)) as AdventureSettings;
    const effectiveStatsThisTurn = calculateEffectiveStats(currentTurnSettings);

    const input: GenerateAdventureInput = {
        world: currentTurnSettings.world,
        initialSituation: [...narrativeMessages, {id: 'temp-user', type: 'user', content: userActionText, timestamp: Date.now()}].slice(-5).map(msg => msg.type === 'user' ? `> ${currentTurnSettings.playerName || 'Player'}: ${msg.content}` : msg.content).join('\n\n'),
        characters: characters,
        userAction: userActionText,
        currentLanguage: currentLanguage,
        playerName: currentTurnSettings.playerName || "Player",
        rpgModeActive: currentTurnSettings.rpgMode,
        relationsModeActive: currentTurnSettings.relationsMode ?? true,
        activeCombat: activeCombat,
        playerGold: currentTurnSettings.playerGold,
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
    };

    try {
        const result = await generateAdventure(input);
        React.startTransition(() => {
            handleNarrativeUpdate(result.narrative, 'ai', result.sceneDescriptionForImage, result.itemsObtained);
            if (result.newCharacters) handleNewCharacters(result.newCharacters);
            if (result.characterUpdates) handleCharacterHistoryUpdate(result.characterUpdates);
            if (adventureSettings.relationsMode && result.affinityUpdates) handleAffinityUpdates(result.affinityUpdates);
            if (adventureSettings.relationsMode && result.relationUpdates) handleRelationUpdatesFromAI(result.relationUpdates);
            if (adventureSettings.rpgMode && result.combatUpdates) {
                handleCombatUpdates(result.combatUpdates);
            }

            if (adventureSettings.rpgMode && typeof result.currencyGained === 'number' && result.currencyGained !== 0 && adventureSettings.playerGold !== undefined) {
                const amount = result.currencyGained;
                if (amount < 0) {
                    const currentGold = adventureSettings.playerGold ?? 0;
                    if (currentGold + amount < 0) {
                         setTimeout(() => {
                            toast({
                                title: "Pas assez de Pièces d'Or!",
                                description: "L'IA a suggéré une dépense que vous ne pouvez pas couvrir. La transaction a été annulée.",
                                variant: "destructive"
                            });
                        }, 0);
                    } else {
                        addCurrencyToPlayer(amount);
                         setTimeout(() => {
                            toast({
                                title: "Transaction Effectuée",
                                description: `Votre trésorerie a été mise à jour.`
                            });
                        }, 0);
                    }
                } else {
                    addCurrencyToPlayer(amount);
                    setTimeout(() => {
                        toast({
                            title: "Pièces d'Or Reçues !",
                            description: `Votre trésorerie a été mise à jour.`
                        });
                    }, 0);
                }
            }
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error in callGenerateAdventure: ", error);
        let toastDescription = `L'IA n'a pas pu générer de réponse: ${errorMessage}`;
        if (errorMessage.includes("503 Service Unavailable") || errorMessage.toLowerCase().includes("model is overloaded")) {
            toastDescription = "Le modèle d'IA est actuellement surchargé. Veuillez réessayer dans quelques instants.";
        } else if (errorMessage.toLowerCase().includes("api key not valid")) {
            toastDescription = "La clé API configurée pour Google AI n'est pas valide. Veuillez vérifier vos paramètres.";
        }
        setTimeout(() => {
           toast({ title: "Erreur de l'IA", description: toastDescription, variant: "destructive" });
        },0);
    } finally {
         React.startTransition(() => {
           setIsLoading(false);
        });
    }
  }, [
      adventureSettings, characters, currentLanguage, narrativeMessages, activeCombat, toast,
      handleNarrativeUpdate, handleNewCharacters, handleCharacterHistoryUpdate, handleAffinityUpdates,
      handleRelationUpdatesFromAI, handleCombatUpdates, addCurrencyToPlayer
  ]);


  const handlePlayerItemAction = React.useCallback((itemId: string, action: 'use' | 'discard') => {
    React.startTransition(() => {
        let itemActionSuccessful = false;
        let narrativeAction = "";
        let effectAppliedMessage = "";
        let hpChange = 0;
        let mpChange = 0;
        let itemUsedOrDiscarded: PlayerInventoryItem | undefined;

        setAdventureSettings(prevSettings => {
            if (!prevSettings.rpgMode || !prevSettings.playerInventory) {
                 setTimeout(() => {toast({ title: action === 'use' ? "Utilisation Impossible" : "Action Impossible", description: "Le mode RPG doit être actif et vous devez avoir des objets.", variant: "default" });},0);
                itemActionSuccessful = false;
                return prevSettings;
            }

            let newInventory = [...prevSettings.playerInventory];
            const itemIndex = newInventory.findIndex(invItem => invItem.id === itemId && invItem.quantity > 0);

            if (itemIndex === -1) {
                 const item = prevSettings.playerInventory.find(i => i.id === itemId);
                 setTimeout(() => {toast({ title: "Objet Introuvable", description: `Vous n'avez pas de "${item?.name || itemId}" ${action === 'use' ? 'utilisable' : ''} ou en quantité suffisante.`, variant: "destructive" });},0);
                itemActionSuccessful = false;
                return prevSettings;
            }

            const itemToUpdate = { ...newInventory[itemIndex] };
            itemUsedOrDiscarded = itemToUpdate;
            itemActionSuccessful = true;
            let newSettings = { ...prevSettings };

            if (action === 'use') {
                narrativeAction = `J'utilise ${itemToUpdate.name}.`;
                if (itemToUpdate.type === 'consumable') {
                    if (itemToUpdate.effect?.toLowerCase().includes("restaure") && itemToUpdate.effect?.toLowerCase().includes("pv")) {
                        const match = itemToUpdate.effect.match(/(\d+)\s*PV/i);
                        if (match && match[1]) hpChange = parseInt(match[1], 10);
                    }
                    if (itemToUpdate.effect?.toLowerCase().includes("restaure") && itemToUpdate.effect?.toLowerCase().includes("pm")) {
                        const match = itemToUpdate.effect.match(/(\d+)\s*PM/i);
                        if (match && match[1]) mpChange = parseInt(match[1], 10);
                    }

                    if (!activeCombat?.isActive) {
                        if (hpChange > 0 && newSettings.playerCurrentHp !== undefined && newSettings.playerMaxHp !== undefined) {
                            newSettings.playerCurrentHp = Math.min(newSettings.playerMaxHp, (newSettings.playerCurrentHp || 0) + hpChange);
                        }
                        if (mpChange > 0 && newSettings.playerCurrentMp !== undefined && newSettings.playerMaxMp !== undefined && newSettings.playerMaxMp > 0) {
                            newSettings.playerCurrentMp = Math.min(newSettings.playerMaxMp, (newSettings.playerCurrentMp || 0) + mpChange);
                        }
                    }
                    effectAppliedMessage = `${itemToUpdate.name} utilisé. ${hpChange > 0 ? `PV restaurés: ${hpChange}.` : ''} ${mpChange > 0 ? `PM restaurés: ${mpChange}.` : ''}`.trim();
                    newInventory[itemIndex] = { ...itemToUpdate, quantity: itemToUpdate.quantity - 1 };
                } else {
                     setTimeout(() => {toast({ title: "Action non prise en charge", description: `Vous ne pouvez pas "utiliser" ${itemToUpdate?.name} de cette manière.`, variant: "default" });},0);
                    itemActionSuccessful = false;
                    return prevSettings;
                }
            } else if (action === 'discard') {
                narrativeAction = `Je jette ${itemToUpdate.name}.`;
                newInventory[itemIndex] = { ...itemToUpdate, quantity: itemToUpdate.quantity - 1 };
                effectAppliedMessage = `${itemToUpdate.name} a été jeté.`;
                if (itemToUpdate.isEquipped) {
                    if (newSettings.equippedItemIds?.weapon === itemToUpdate.id) newSettings.equippedItemIds.weapon = null;
                    else if (newSettings.equippedItemIds?.armor === itemToUpdate.id) newSettings.equippedItemIds.armor = null;
                    else if (newSettings.equippedItemIds?.jewelry === itemToUpdate.id) newSettings.equippedItemIds.jewelry = null;
                    newInventory[itemIndex].isEquipped = false;
                }
            }

            if (newInventory[itemIndex].quantity <= 0) {
                newInventory.splice(itemIndex, 1);
            }
            newSettings.playerInventory = newInventory;

             if (action === 'discard' && itemToUpdate.isEquipped) {
                const effectiveStats = calculateEffectiveStats(newSettings);
                newSettings.playerArmorClass = effectiveStats.playerArmorClass;
                newSettings.playerAttackBonus = effectiveStats.playerAttackBonus;
                newSettings.playerDamageBonus = effectiveStats.playerDamageBonus;
            }
            return newSettings;
        });

        if (itemActionSuccessful && narrativeAction && itemUsedOrDiscarded) {
             if(effectAppliedMessage) {
                 setTimeout(() => { toast({ title: "Action d'Objet", description: effectAppliedMessage }); }, 0);
             }
            handleNarrativeUpdate(narrativeAction, 'user');

            const settingsForAICall = JSON.parse(JSON.stringify(adventureSettings));

            if (action === 'use' && !activeCombat?.isActive) {
                if (hpChange > 0 && settingsForAICall.playerCurrentHp !== undefined) {
                    settingsForAICall.playerCurrentHp = Math.min(settingsForAICall.playerMaxHp || 0, (settingsForAICall.playerCurrentHp || 0) + hpChange);
                }
                if (mpChange > 0 && settingsForAICall.playerCurrentMp !== undefined && (settingsForAICall.playerMaxMp || 0) > 0) {
                    settingsForAICall.playerCurrentMp = Math.min(settingsForAICall.playerMaxMp || 0, (settingsForAICall.playerCurrentMp || 0) + mpChange);
                }
            }
            callGenerateAdventure(narrativeAction);
        }
    });
  }, [
    adventureSettings, activeCombat,
    callGenerateAdventure, handleNarrativeUpdate, toast
  ]);

  const handleSellItem = React.useCallback((itemId: string) => {
        const itemToSell = adventureSettings.playerInventory?.find(invItem => invItem.id === itemId);

        if (!adventureSettings.rpgMode || !itemToSell || itemToSell.quantity <= 0) {
            setTimeout(() => {
                toast({ title: "Vente Impossible", description: "Le mode RPG doit être actif et l'objet doit être dans votre inventaire.", variant: "default" });
            }, 0);
            return;
        }

        let sellPricePerUnit = 0;
        if (itemToSell.goldValue && itemToSell.goldValue > 0) {
            sellPricePerUnit = Math.floor(itemToSell.goldValue / 2);
            if (sellPricePerUnit === 0) {
                sellPricePerUnit = 1;
            }
        }
        if (itemToSell.goldValue === 1) { // If original value is 1, sell for 1
            sellPricePerUnit = 1;
        }


        if (sellPricePerUnit <= 0) {
            setTimeout(() => {
                toast({ title: "Invendable", description: `"${itemToSell.name}" n'a pas de valeur marchande.`, variant: "default" });
            }, 0);
            return;
        }

        if (itemToSell.quantity > 1) {
            setItemToSellDetails({ item: itemToSell, sellPricePerUnit: sellPricePerUnit });
            setSellQuantity(1); // Reset sell quantity for the new dialog
        } else {
            // Direct sell for single quantity item
            confirmSellMultipleItems(1, itemToSell, sellPricePerUnit);
        }
  }, [adventureSettings, toast]);


  const confirmSellMultipleItems = React.useCallback((quantityToSell: number, itemBeingSold?: PlayerInventoryItem, pricePerUnit?: number) => {
    const itemToProcess = itemBeingSold || itemToSellDetails?.item;
    const finalPricePerUnit = pricePerUnit || itemToSellDetails?.sellPricePerUnit;

    if (!itemToProcess || finalPricePerUnit === undefined || finalPricePerUnit <= 0) {
        setTimeout(() => {
            toast({ title: "Erreur de Vente", description: "Détails de l'objet ou prix invalide.", variant: "destructive" });
        }, 0);
        setItemToSellDetails(null);
        return;
    }

    if (quantityToSell <= 0 || quantityToSell > itemToProcess.quantity) {
        setTimeout(() => {
            toast({ title: "Quantité Invalide", description: `Veuillez entrer une quantité entre 1 et ${itemToProcess.quantity}.`, variant: "destructive" });
        }, 0);
        return; // Keep dialog open for correction if opened via dialog
    }

    React.startTransition(() => {
        let itemSoldSuccessfully = false;
        let totalSellPrice = 0;
        let userAction = "";

        setAdventureSettings(prevSettings => {
            if (!prevSettings.rpgMode || !prevSettings.playerInventory) return prevSettings;

            const itemIndex = prevSettings.playerInventory.findIndex(invItem => invItem.id === itemToProcess.id);
            if (itemIndex === -1 || prevSettings.playerInventory[itemIndex].quantity < quantityToSell) {
                // This should ideally not happen if validation is correct before calling this
                return prevSettings;
            }

            totalSellPrice = finalPricePerUnit * quantityToSell;
            const newInventory = [...prevSettings.playerInventory];
            const updatedItem = { ...newInventory[itemIndex] };
            updatedItem.quantity -= quantityToSell;

            if (updatedItem.quantity <= 0) {
                if (updatedItem.isEquipped) {
                    if (prevSettings.equippedItemIds?.weapon === updatedItem.id) prevSettings.equippedItemIds.weapon = null;
                    else if (prevSettings.equippedItemIds?.armor === updatedItem.id) prevSettings.equippedItemIds.armor = null;
                    else if (prevSettings.equippedItemIds?.jewelry === updatedItem.id) prevSettings.equippedItemIds.jewelry = null;
                }
                newInventory.splice(itemIndex, 1);
            } else {
                newInventory[itemIndex] = updatedItem;
            }

            itemSoldSuccessfully = true;
            userAction = `Je vends ${quantityToSell} ${itemToProcess.name}${quantityToSell > 1 ? 's' : ''}.`;
            let newSettings = {
                ...prevSettings,
                playerInventory: newInventory,
                playerGold: (prevSettings.playerGold ?? 0) + totalSellPrice,
            };
            if (updatedItem.isEquipped && updatedItem.quantity <= 0) { // if it was equipped and now removed
                 const effectiveStats = calculateEffectiveStats(newSettings);
                 newSettings.playerArmorClass = effectiveStats.playerArmorClass;
                 newSettings.playerAttackBonus = effectiveStats.playerAttackBonus;
                 newSettings.playerDamageBonus = effectiveStats.playerDamageBonus;
            }
            return newSettings;
        });

        if (itemSoldSuccessfully) {
            setTimeout(() => {
                toast({ title: "Objet(s) Vendu(s)!", description: `Vous avez vendu ${quantityToSell} ${itemToProcess.name} pour ${totalSellPrice} pièces d'or.` });
            }, 0);

            handleNarrativeUpdate(userAction, 'user');
            callGenerateAdventure(userAction);
        }
    });
    setItemToSellDetails(null); // Close dialog
  }, [itemToSellDetails, callGenerateAdventure, handleNarrativeUpdate, toast]);


  const handleEquipItem = React.useCallback((itemIdToEquip: string) => {
    setAdventureSettings(prevSettings => {
        if (!prevSettings.rpgMode || !prevSettings.playerInventory) return prevSettings;
        const item = prevSettings.playerInventory.find(i => i.id === itemIdToEquip);
        if (!item || item.quantity <= 0) {
            setTimeout(() => { toast({ title: "Erreur", description: "Objet introuvable ou quantité insuffisante.", variant: "destructive" }); }, 0);
            return prevSettings;
        }

        let slotToEquip: keyof NonNullable<AdventureSettings['equippedItemIds']> | null = null;
        if (item.type === 'weapon') slotToEquip = 'weapon';
        else if (item.type === 'armor') slotToEquip = 'armor';
        else if (item.type === 'jewelry') slotToEquip = 'jewelry';

        if (!slotToEquip) {
            setTimeout(() => { toast({ title: "Non Équipable", description: `"${item.name}" n'est pas un objet équipable dans un slot standard.`, variant: "default" }); }, 0);
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

        setTimeout(() => { toast({ title: "Objet Équipé", description: `${item.name} a été équipé.` }); }, 0);
        return {
            ...updatedSettings,
            playerArmorClass: effectiveStats.playerArmorClass,
            playerAttackBonus: effectiveStats.playerAttackBonus,
            playerDamageBonus: effectiveStats.playerDamageBonus,
        };
    });
  }, [toast]);

  const handleUnequipItem = React.useCallback((slotToUnequip: keyof NonNullable<AdventureSettings['equippedItemIds']>) => {
      setAdventureSettings(prevSettings => {
          if (!prevSettings.rpgMode || !prevSettings.equippedItemIds || !prevSettings.playerInventory) return prevSettings;

          const itemIdToUnequip = prevSettings.equippedItemIds[slotToUnequip];
          if (!itemIdToUnequip) {
              setTimeout(() => { toast({ title: "Information", description: `Aucun objet à déséquiper dans le slot ${slotToUnequip}.`, variant: "default" }); }, 0);
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

          setTimeout(() => { toast({ title: "Objet Déséquipé", description: `${itemUnequipped?.name || 'Objet'} a été déséquipé.` }); }, 0);
          return {
              ...updatedSettings,
              playerArmorClass: effectiveStats.playerArmorClass,
              playerAttackBonus: effectiveStats.playerAttackBonus,
              playerDamageBonus: effectiveStats.playerDamageBonus,
          };
      });
  }, [toast]);


    const handleTakeLoot = React.useCallback((messageId: string, itemsToTake: PlayerInventoryItem[]) => {
        React.startTransition(() => {
            setAdventureSettings(prevSettings => {
                if (!prevSettings.rpgMode) return prevSettings;
                const newInventory = [...(prevSettings.playerInventory || [])];
                itemsToTake.forEach(item => {
                    if (!item.id || !item.name || typeof item.quantity !== 'number' || !item.type) {
                        console.warn("Skipping invalid loot item (missing id, name, quantity, or type):", item);
                        return;
                    }
                    const existingItemIndex = newInventory.findIndex(invItem => invItem.name === item.name); // Check by name for stacking
                    if (existingItemIndex > -1) {
                        newInventory[existingItemIndex].quantity += item.quantity;
                    } else {
                        newInventory.push({ ...item, isEquipped: false });
                    }
                });
                return { ...prevSettings, playerInventory: newInventory };
            });
            setNarrativeMessages(prevMessages =>
                prevMessages.map(msg =>
                    msg.id === messageId ? { ...msg, lootTaken: true } : msg
                )
            );
        });
        setTimeout(() => {toast({ title: "Objets Ramassés", description: "Les objets ont été ajoutés à votre inventaire." });},0);
    }, [toast]);

    const handleDiscardLoot = React.useCallback((messageId: string) => {
        React.startTransition(() => {
            setNarrativeMessages(prevMessages =>
                prevMessages.map(msg =>
                    msg.id === messageId ? { ...msg, lootTaken: true } : msg
                )
            );
        });
        setTimeout(() => {toast({ title: "Objets Laissés", description: "Vous avez décidé de ne pas prendre ces objets." });},0);
    }, [toast]);

   const handleEditMessage = React.useCallback((messageId: string, newContent: string) => {
       React.startTransition(() => {
           setNarrativeMessages(prev => prev.map(msg =>
               msg.id === messageId ? { ...msg, content: newContent, timestamp: Date.now() } : msg
           ));
       });
        setTimeout(() => {
            toast({ title: "Message Modifié" });
        },0);
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
             setTimeout(() => { toast(messageForToast as Parameters<typeof toast>[0]); }, 0);
        }
    }, [activeCombat, toast]);


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
            setTimeout(() => {
                toast({ title: "Impossible de régénérer", description: "Aucune réponse IA précédente valide trouvée pour régénérer.", variant: "destructive" });
            },0);
             return;
         }
        React.startTransition(() => {
         setIsRegenerating(true);
        });
         setTimeout(() => { toast({ title: "Régénération en cours...", description: "Génération d'une nouvelle réponse." }); },0);

        const currentTurnSettings = JSON.parse(JSON.stringify(adventureSettings)) as AdventureSettings;
        const effectiveStatsThisTurn = calculateEffectiveStats(currentTurnSettings);

         try {
             const input: GenerateAdventureInput = {
                 world: currentTurnSettings.world,
                 initialSituation: contextMessages.map(msg => msg.type === 'user' ? `> ${currentTurnSettings.playerName || 'Player'}: ${msg.content}` : msg.content ).join('\n\n'),
                 characters: characters,
                 userAction: lastUserAction,
                 currentLanguage: currentLanguage,
                 playerName: currentTurnSettings.playerName || "Player",
                 relationsModeActive: currentTurnSettings.relationsMode ?? true,
                 rpgModeActive: currentTurnSettings.rpgMode ?? false,
                 activeCombat: activeCombat,
                 playerGold: currentTurnSettings.playerGold,
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
             };

             const result = await generateAdventure(input);

            React.startTransition(() => {
                setNarrativeMessages(prev => {
                    const newNarrative = [...prev];
                    const newAiMessage: Message = {
                        id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                        type: 'ai',
                        content: result.narrative,
                        timestamp: Date.now(),
                        sceneDescription: result.sceneDescriptionForImage,
                        loot: result.itemsObtained, // itemsObtained are LootedItem from AI
                        lootTaken: false,
                    };
                    if (lastAiIndex !== -1) {
                        newNarrative.splice(lastAiIndex, 1, newAiMessage);
                    } else {
                        newNarrative.push(newAiMessage);
                    }
                    return newNarrative;
                });

                if (result.newCharacters) handleNewCharacters(result.newCharacters);
                if (result.characterUpdates) handleCharacterHistoryUpdate(result.characterUpdates);
                if (adventureSettings.relationsMode && result.affinityUpdates) handleAffinityUpdates(result.affinityUpdates);
                if (adventureSettings.relationsMode && result.relationUpdates) handleRelationUpdatesFromAI(result.relationUpdates);
                if(adventureSettings.rpgMode && result.combatUpdates) {
                    handleCombatUpdates(result.combatUpdates);
                }
                 if (adventureSettings.rpgMode && typeof result.currencyGained === 'number' && result.currencyGained !== 0 && adventureSettings.playerGold !== undefined) {
                    const amount = result.currencyGained;
                    if (amount < 0) {
                        const currentGold = adventureSettings.playerGold ?? 0;
                        if (currentGold + amount < 0) {
                           // toast handled by IA
                        } else {
                            addCurrencyToPlayer(amount);
                        }
                    } else {
                         addCurrencyToPlayer(amount);
                    }
                    setTimeout(() => {
                        toast({
                            title: amount > 0 ? "Monnaie (Régén.)!" : "Dépense (Régén.)!",
                            description: `Votre trésorerie a été mise à jour.`
                        });
                    }, 0);
                }
                setTimeout(() => {toast({ title: "Réponse Régénérée", description: "Une nouvelle réponse a été ajoutée." });},0);
            });
         } catch (error) {
             console.error("Error regenerating adventure:", error);
             let toastDescription = `Impossible de générer une nouvelle réponse: ${error instanceof Error ? error.message : 'Unknown error'}.`;
             if (error instanceof Error && (error.message.includes("503") || error.message.toLowerCase().includes("overloaded"))) {
                 toastDescription = "Le modèle d'IA est surchargé. Veuillez réessayer plus tard.";
             }
              setTimeout(() => {
                toast({ title: "Erreur de Régénération", description: toastDescription, variant: "destructive"});
              },0);
         } finally {
             React.startTransition(() => {
                setIsRegenerating(false);
             });
         }
     }, [
         isRegenerating, isLoading, narrativeMessages, adventureSettings, characters, currentLanguage, toast,
         handleNarrativeUpdate,
         handleNewCharacters, handleCharacterHistoryUpdate, handleAffinityUpdates,
         handleRelationUpdatesFromAI, activeCombat, handleCombatUpdates, addCurrencyToPlayer
     ]);

  const handleCharacterUpdate = React.useCallback((updatedCharacter: Character) => {
       setStagedCharacters(prev => prev.map(c => c.id === updatedCharacter.id ? updatedCharacter : c));
   }, []);


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
                setTimeout(() => {
                    toast({ title: "Personnage Sauvegardé Globalement", description: `${character.name} est maintenant disponible pour d'autres aventures et pour le chat.` });
                },0);
                setStagedCharacters(prev => prev.map(c => c.id === character.id ? { ...c, _lastSaved: Date.now() } : c));
            } catch (error) {
                 console.error("Failed to save character to localStorage:", error);
                 setTimeout(() => { toast({ title: "Erreur de Sauvegarde Globale", description: "Impossible de sauvegarder le personnage globalement.", variant: "destructive" }); },0);
            }
        } else {
            setTimeout(() => {
                toast({ title: "Erreur", description: "La sauvegarde globale n'est disponible que côté client.", variant: "destructive" });
            },0);
        }
    }, [toast]);

  const handleAddStagedCharacter = React.useCallback((globalCharToAdd: Character) => {
        let characterWasAdded = false;
        let characterNameForToast = globalCharToAdd.name;

        React.startTransition(() => {
            setStagedCharacters(prevStagedChars => {
                if (prevStagedChars.some(sc => sc.id === globalCharToAdd.id || sc.name.toLowerCase() === globalCharToAdd.name.toLowerCase())) {
                    characterWasAdded = false;
                    return prevStagedChars;
                }
                characterWasAdded = true;
                const defaultRelation = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
                const newChar: Character = {
                    ...globalCharToAdd,
                    history: [`Ajouté à l'aventure depuis les personnages globaux le ${new Date().toLocaleString()}`],
                    ...(stagedAdventureSettings.rpgMode ? {
                        level: globalCharToAdd.level ?? 1,
                        characterClass: globalCharToAdd.characterClass ?? '',
                        inventory: globalCharToAdd.inventory ?? {},
                        hitPoints: globalCharToAdd.hitPoints ?? globalCharToAdd.maxHitPoints ?? 10,
                        maxHitPoints: globalCharToAdd.maxHitPoints ?? 10,
                        manaPoints: globalCharToAdd.manaPoints ?? globalCharToAdd.maxManaPoints ?? 0,
                        maxManaPoints: globalCharToAdd.maxManaPoints ?? 0,
                        armorClass: globalCharToAdd.armorClass ?? 10,
                        attackBonus: globalCharToAdd.attackBonus ?? 0,
                        damageBonus: globalCharToAdd.damageBonus ?? "1",
                        isHostile: globalCharToAdd.isHostile ?? false,
                        strength: globalCharToAdd.strength ?? BASE_ATTRIBUTE_VALUE,
                        dexterity: globalCharToAdd.dexterity ?? BASE_ATTRIBUTE_VALUE,
                        constitution: globalCharToAdd.constitution ?? BASE_ATTRIBUTE_VALUE,
                        intelligence: globalCharToAdd.intelligence ?? BASE_ATTRIBUTE_VALUE,
                        wisdom: globalCharToAdd.wisdom ?? BASE_ATTRIBUTE_VALUE,
                        charisma: globalCharToAdd.charisma ?? BASE_ATTRIBUTE_VALUE,

                    } : {
                        level: undefined, characterClass: undefined, inventory: undefined, hitPoints: undefined, maxHitPoints: undefined, manaPoints: undefined, maxManaPoints: undefined,
                        armorClass: undefined, attackBonus: undefined, damageBonus: undefined, isHostile: undefined,
                        strength: undefined, dexterity: undefined, constitution: undefined, intelligence: undefined, wisdom: undefined, charisma: undefined,
                     }),
                     ...(stagedAdventureSettings.relationsMode ?? true ? {
                        affinity: globalCharToAdd.affinity ?? 50,
                        relations: globalCharToAdd.relations || { [PLAYER_ID]: defaultRelation },
                     } : { affinity: undefined, relations: undefined, })
                };

                if ((stagedAdventureSettings.relationsMode ?? true) && newChar.relations && !newChar.relations[PLAYER_ID]) {
                    newChar.relations[PLAYER_ID] = defaultRelation;
                }

                const updatedPrevChars = prevStagedChars.map(existingChar => {
                    if (stagedAdventureSettings.relationsMode ?? true) {
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
        });
        setTimeout(() => {
            if (characterWasAdded) {
                toast({ title: "Personnage Ajouté à l'Aventure", description: `${characterNameForToast} a été ajouté aux modifications en attente pour cette aventure. N'oubliez pas d'enregistrer les modifications.` });
            } else {
                toast({ title: "Personnage déjà présent", description: `${characterNameForToast} est déjà dans l'aventure actuelle.`, variant: "default" });
            }
        }, 0);
    }, [currentLanguage, toast, stagedAdventureSettings.relationsMode, stagedAdventureSettings.rpgMode, stagedAdventureSettings.playerName, PLAYER_ID]);


  const handleSave = React.useCallback(() => {
        const charactersToSave = characters.map(({ ...char }) => char);
        const saveData: SaveData = {
            adventureSettings,
            characters: charactersToSave,
            narrative: narrativeMessages,
            currentLanguage,
            activeCombat: activeCombat,
            saveFormatVersion: 2.0,
            timestamp: new Date().toISOString(),
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
        setTimeout(() => {
            toast({ title: "Aventure Sauvegardée", description: "Le fichier JSON a été téléchargé." });
        }, 0);
    }, [adventureSettings, characters, narrativeMessages, currentLanguage, activeCombat, toast]);

    const handleLoad = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonString = e.target?.result as string;
                const loadedData: Partial<SaveData> = JSON.parse(jsonString);

                if (!loadedData.adventureSettings || !loadedData.characters || !loadedData.narrative || !Array.isArray(loadedData.narrative)) {
                    throw new Error("Structure de fichier de sauvegarde invalide ou manquante.");
                }

                const isValidNarrative = loadedData.narrative.every(msg =>
                    typeof msg === 'object' && msg !== null && typeof msg.id === 'string' &&
                    ['user', 'ai', 'system'].includes(msg.type) && typeof msg.content === 'string' &&
                    typeof msg.timestamp === 'number'
                );
                if (!isValidNarrative) {
                    if (typeof loadedData.narrative === 'string') {
                        loadedData.narrative = [{ id: `migrated-${Date.now()}`, type: 'system', content: loadedData.narrative as unknown as string, timestamp: Date.now() }];
                    } else {
                        throw new Error("Structure des messages narratifs invalide.");
                    }
                }

                 if (loadedData.saveFormatVersion === undefined || loadedData.saveFormatVersion < 1.4) {
                     loadedData.characters = loadedData.characters.map(c => ({ ...c, history: Array.isArray(c.history) ? c.history : [], affinity: c.affinity ?? 50, relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                     loadedData.adventureSettings.playerName = loadedData.adventureSettings.playerName || "Player";
                 }
                 if (loadedData.saveFormatVersion < 1.5) {
                       loadedData.adventureSettings.relationsMode = loadedData.adventureSettings.relationsMode ?? true;
                       loadedData.characters = loadedData.characters.map(c => ({ ...c, relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                 }
                 if (loadedData.saveFormatVersion < 1.8) {
                    if ((loadedData.adventureSettings as any).playerCurrencyTiers) {
                        const oldTiers = (loadedData.adventureSettings as any).playerCurrencyTiers as any[];
                        let totalBaseGold = 0;
                        oldTiers.forEach(tier => {
                            totalBaseGold += (tier.amount || 0) * (tier.valueInBaseTier || 0);
                        });
                        loadedData.adventureSettings.playerGold = totalBaseGold;
                        delete (loadedData.adventureSettings as any).playerCurrencyTiers;
                        delete (loadedData.adventureSettings as any).currencyLabel;
                    }
                    loadedData.adventureSettings.playerGold = loadedData.adventureSettings.playerGold ?? 0;
                    if (!loadedData.adventureSettings.playerInventory) {
                        loadedData.adventureSettings.playerInventory = [];
                    }
                     loadedData.adventureSettings.playerInventory = loadedData.adventureSettings.playerInventory.map(item => ({
                        ...item,
                        id: item.id || item.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7), // Add ID if missing
                        goldValue: item.goldValue ?? 0,
                        generatedImageUrl: item.generatedImageUrl ?? null,
                        isEquipped: item.isEquipped ?? false,
                        statBonuses: item.statBonuses ?? {},
                    }));
                 }
                 if (loadedData.saveFormatVersion < 1.9) {
                    loadedData.adventureSettings.playerInitialAttributePoints = loadedData.adventureSettings.playerInitialAttributePoints ?? INITIAL_CREATION_ATTRIBUTE_POINTS;
                    loadedData.adventureSettings.playerStrength = loadedData.adventureSettings.playerStrength ?? BASE_ATTRIBUTE_VALUE;
                    loadedData.adventureSettings.playerDexterity = loadedData.adventureSettings.playerDexterity ?? BASE_ATTRIBUTE_VALUE;
                    loadedData.adventureSettings.playerConstitution = loadedData.adventureSettings.playerConstitution ?? BASE_ATTRIBUTE_VALUE;
                    loadedData.adventureSettings.playerIntelligence = loadedData.adventureSettings.playerIntelligence ?? BASE_ATTRIBUTE_VALUE;
                    loadedData.adventureSettings.playerWisdom = loadedData.adventureSettings.playerWisdom ?? BASE_ATTRIBUTE_VALUE;
                    loadedData.adventureSettings.playerCharisma = loadedData.adventureSettings.playerCharisma ?? BASE_ATTRIBUTE_VALUE;
                    loadedData.adventureSettings.playerAttackBonus = loadedData.adventureSettings.playerAttackBonus ?? 0;
                    loadedData.adventureSettings.playerDamageBonus = loadedData.adventureSettings.playerDamageBonus ?? "1";
                 }
                 if (loadedData.saveFormatVersion < 2.0) {
                    loadedData.adventureSettings.equippedItemIds = loadedData.adventureSettings.equippedItemIds || { weapon: null, armor: null, jewelry: null };
                    loadedData.adventureSettings.playerInventory = (loadedData.adventureSettings.playerInventory || []).map(item => ({
                        ...item,
                        id: item.id || `${item.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
                        isEquipped: item.isEquipped ?? false,
                        statBonuses: item.statBonuses ?? {},
                    }));
                 }


                const rpgModeActive = loadedData.adventureSettings.rpgMode;
                const relationsModeActive = loadedData.adventureSettings.relationsMode ?? true;
                const loadedLang = loadedData.currentLanguage || "fr";
                const defaultRelation = loadedLang === 'fr' ? "Inconnu" : "Unknown";

                const validatedCharacters = loadedData.characters.map((c: any) => {
                    const charId = c.id || `${c.name?.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                    let relations = relationsModeActive && typeof c.relations === 'object' && c.relations !== null ? c.relations : (relationsModeActive ? { [PLAYER_ID]: defaultRelation } : undefined);

                    if (relationsModeActive && relations && !relations[PLAYER_ID]) {
                        relations[PLAYER_ID] = defaultRelation;
                    }
                    if (relationsModeActive && relations && loadedData.characters) {
                        loadedData.characters.forEach(otherC => {
                            if (otherC.id !== charId && !relations![otherC.id]) {
                                relations![otherC.id] = defaultRelation;
                            }
                        });
                    }

                    return {
                        id: charId, name: c.name || "Inconnu", details: c.details || "", biographyNotes: c.biographyNotes,
                        history: Array.isArray(c.history) ? c.history : [], portraitUrl: c.portraitUrl || null,
                        affinity: relationsModeActive ? (c.affinity ?? 50) : undefined, relations: relations, _lastSaved: c._lastSaved,
                        ...(rpgModeActive ? {
                            level: c.level ?? 1, characterClass: c.characterClass ?? '', inventory: typeof c.inventory === 'object' && c.inventory !== null ? c.inventory : {},
                            hitPoints: c.hitPoints ?? c.maxHitPoints ?? 10, maxHitPoints: c.maxHitPoints ?? 10,
                            manaPoints: c.manaPoints ?? c.maxManaPoints ?? 0, maxManaPoints: c.maxManaPoints ?? 0,
                            armorClass: c.armorClass ?? 10, attackBonus: c.attackBonus ?? 0, damageBonus: c.damageBonus ?? "1",
                            isHostile: c.isHostile ?? false,
                            strength: c.strength ?? BASE_ATTRIBUTE_VALUE, dexterity: c.dexterity ?? BASE_ATTRIBUTE_VALUE, constitution: c.constitution ?? BASE_ATTRIBUTE_VALUE,
                            intelligence: c.intelligence ?? BASE_ATTRIBUTE_VALUE, wisdom: c.wisdom ?? BASE_ATTRIBUTE_VALUE, charisma: c.charisma ?? BASE_ATTRIBUTE_VALUE,
                            experience: c.experience ?? 0,
                            spells: Array.isArray(c.spells) ? c.spells : [],
                            techniques: Array.isArray(c.techniques) ? c.techniques : [],
                            passiveAbilities: Array.isArray(c.passiveAbilities) ? c.passiveAbilities : [],
                        } : {}),
                    } as Character;
                });

                const settingsWithDefaults = { ...baseAdventureSettings, ...loadedData.adventureSettings };
                const effectiveStats = calculateEffectiveStats(settingsWithDefaults);

                const finalAdventureSettings: AdventureSettings = {
                    ...settingsWithDefaults,
                    ...effectiveStats,
                    relationsMode: relationsModeActive,
                    rpgMode: rpgModeActive,
                    playerCurrentHp: rpgModeActive ? (loadedData.adventureSettings.playerCurrentHp ?? effectiveStats.playerMaxHp) : undefined,
                    playerCurrentMp: rpgModeActive ? (loadedData.adventureSettings.playerCurrentMp ?? effectiveStats.playerMaxMp) : undefined,
                    playerCurrentExp: rpgModeActive ? (loadedData.adventureSettings.playerCurrentExp ?? 0) : undefined,
                    playerInventory: (loadedData.adventureSettings.playerInventory || []).map(item => ({
                        ...item,
                        id: item.id || `${item.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
                        generatedImageUrl: item.generatedImageUrl ?? null,
                        isEquipped: item.isEquipped ?? false,
                        statBonuses: item.statBonuses ?? {},
                    })),
                    playerGold: loadedData.adventureSettings.playerGold ?? 0,
                    equippedItemIds: loadedData.adventureSettings.equippedItemIds || { weapon: null, armor: null, jewelry: null },
                };


                React.startTransition(() => {
                  setBaseAdventureSettings(JSON.parse(JSON.stringify(finalAdventureSettings)));
                  setBaseCharacters(JSON.parse(JSON.stringify(validatedCharacters)));
                  setAdventureSettings(finalAdventureSettings);
                  setCharacters(validatedCharacters);
                  setStagedAdventureSettings(JSON.parse(JSON.stringify(finalAdventureSettings)));
                  setStagedCharacters(JSON.parse(JSON.stringify(validatedCharacters)));
                  setNarrativeMessages(loadedData.narrative as Message[]);
                  setActiveCombat(loadedData.activeCombat);
                  setCurrentLanguage(loadedData.currentLanguage || "fr");
                  setFormPropKey(k => k + 1);
                   setTimeout(() => {
                    toast({ title: "Aventure Chargée", description: "L'état de l'aventure a été restauré." });
                  }, 0);
                });


            } catch (error: any) {
                console.error("Error loading adventure:", error);
                setTimeout(() => {
                    toast({ title: "Erreur de Chargement", description: `Impossible de lire le fichier JSON: ${error.message}`, variant: "destructive" });
                }, 0);
            }
        };
        reader.readAsText(file);
        if(event.target) event.target.value = '';
    }, [toast, baseAdventureSettings]);


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
            playerGold: initialSettingsFromBase.playerGold ?? 0,
            equippedItemIds: { weapon: null, armor: null, jewelry: null },
        };
        setAdventureSettings(newLiveAdventureSettings);
        setCharacters(JSON.parse(JSON.stringify(baseCharacters)));
        setStagedAdventureSettings(JSON.parse(JSON.stringify(newLiveAdventureSettings)));
        setStagedCharacters(JSON.parse(JSON.stringify(baseCharacters)));
        setNarrativeMessages([{ id: `msg-${Date.now()}`, type: 'system', content: initialSettingsFromBase.initialSituation, timestamp: Date.now() }]);
        setActiveCombat(undefined);
        setFormPropKey(prev => prev + 1);
        setShowRestartConfirm(false);
    });
     setTimeout(() => {
        toast({ title: "Aventure Recommencée", description: "L'histoire a été réinitialisée." });
    }, 0);
  }, [baseAdventureSettings, baseCharacters, toast]);

  const onRestartAdventure = React.useCallback(() => {
    setShowRestartConfirm(true);
  }, []);

  const handleSettingsUpdate = React.useCallback((newSettingsFromForm: AdventureFormValues) => {
    setStagedAdventureSettings(prevStagedSettings => {

        const tempSettingsForCalc: AdventureSettings = {
            ...prevStagedSettings,
            world: newSettingsFromForm.world,
            initialSituation: newSettingsFromForm.initialSituation,
            rpgMode: newSettingsFromForm.enableRpgMode ?? false,
            relationsMode: newSettingsFromForm.enableRelationsMode ?? true,
            playerName: newSettingsFromForm.playerName || "Player",
            playerClass: (newSettingsFromForm.enableRpgMode ?? false) ? newSettingsFromForm.playerClass : undefined,
            playerLevel: (newSettingsFromForm.enableRpgMode ?? false) ? newSettingsFromForm.playerLevel : undefined,
            playerExpToNextLevel: (newSettingsFromForm.enableRpgMode ?? false) ? newSettingsFromForm.playerExpToNextLevel : undefined,
            playerGold: (newSettingsFromForm.enableRpgMode ?? false) ? newSettingsFromForm.playerGold ?? (baseAdventureSettings.playerGold ?? 0) : undefined,
            playerInitialAttributePoints: newSettingsFromForm.playerInitialAttributePoints, // Conserver les points de création
            playerStrength: (newSettingsFromForm.enableRpgMode ?? false) ? newSettingsFromForm.playerStrength ?? BASE_ATTRIBUTE_VALUE : undefined,
            playerDexterity: (newSettingsFromForm.enableRpgMode ?? false) ? newSettingsFromForm.playerDexterity ?? BASE_ATTRIBUTE_VALUE : undefined,
            playerConstitution: (newSettingsFromForm.enableRpgMode ?? false) ? newSettingsFromForm.playerConstitution ?? BASE_ATTRIBUTE_VALUE : undefined,
            playerIntelligence: (newSettingsFromForm.enableRpgMode ?? false) ? newSettingsFromForm.playerIntelligence ?? BASE_ATTRIBUTE_VALUE : undefined,
            playerWisdom: (newSettingsFromForm.enableRpgMode ?? false) ? newSettingsFromForm.playerWisdom ?? BASE_ATTRIBUTE_VALUE : undefined,
            playerCharisma: (newSettingsFromForm.enableRpgMode ?? false) ? newSettingsFromForm.playerCharisma ?? BASE_ATTRIBUTE_VALUE : undefined,
        };

        const effectiveStats = calculateEffectiveStats(tempSettingsForCalc);

        const newSettingsCandidate: AdventureSettings = {
            ...tempSettingsForCalc,
            playerMaxHp: (newSettingsFromForm.enableRpgMode ?? false) ? effectiveStats.playerMaxHp : undefined,
            playerMaxMp: (newSettingsFromForm.enableRpgMode ?? false) ? effectiveStats.playerMaxMp : undefined,
            playerArmorClass: (newSettingsFromForm.enableRpgMode ?? false) ? effectiveStats.playerArmorClass : undefined,
            playerAttackBonus: (newSettingsFromForm.enableRpgMode ?? false) ? effectiveStats.playerAttackBonus : undefined,
            playerDamageBonus: (newSettingsFromForm.enableRpgMode ?? false) ? effectiveStats.playerDamageBonus : undefined,

            playerCurrentHp: (newSettingsFromForm.enableRpgMode ?? false)
                ? (prevStagedSettings.initialSituation === newSettingsFromForm.initialSituation && prevStagedSettings.rpgMode === (newSettingsFromForm.enableRpgMode ?? false)
                    ? prevStagedSettings.playerCurrentHp
                    : effectiveStats.playerMaxHp)
                : undefined,
            playerCurrentMp: (newSettingsFromForm.enableRpgMode ?? false)
                ? (prevStagedSettings.initialSituation === newSettingsFromForm.initialSituation && prevStagedSettings.rpgMode === (newSettingsFromForm.enableRpgMode ?? false)
                    ? prevStagedSettings.playerCurrentMp
                    : effectiveStats.playerMaxMp)
                : undefined,
            playerCurrentExp: (newSettingsFromForm.enableRpgMode ?? false)
                ? (prevStagedSettings.initialSituation === newSettingsFromForm.initialSituation && prevStagedSettings.rpgMode === (newSettingsFromForm.enableRpgMode ?? false)
                    ? prevStagedSettings.playerCurrentExp
                    : 0)
                : undefined,
        };

        if (newSettingsCandidate.playerCurrentHp !== undefined && newSettingsCandidate.playerMaxHp !== undefined) {
            newSettingsCandidate.playerCurrentHp = Math.min(newSettingsCandidate.playerCurrentHp, newSettingsCandidate.playerMaxHp);
        }
         if (newSettingsCandidate.playerCurrentMp !== undefined && newSettingsCandidate.playerMaxMp !== undefined) {
            newSettingsCandidate.playerCurrentMp = Math.min(newSettingsCandidate.playerCurrentMp, newSettingsCandidate.playerMaxMp);
        }

        if (JSON.stringify(prevStagedSettings) !== JSON.stringify(newSettingsCandidate)) {
            return newSettingsCandidate;
        }
        return prevStagedSettings;
    });

    setStagedCharacters(prevStagedChars => {
      const defaultRelation = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
      const newRPGMode = newSettingsFromForm.enableRpgMode ?? false;
      const newRelationsMode = newSettingsFromForm.enableRelationsMode ?? true;
      const existingCharsMap = new Map(prevStagedChars.map(sc => [sc.id, sc]));
      let updatedCharsList: Character[] = newSettingsFromForm.characters.map(formDef => {
        const existingChar = formDef.id
            ? existingCharsMap.get(formDef.id)
            : prevStagedChars.find(sc => sc.name === formDef.name && !newSettingsFromForm.characters.some(otherFormDef => otherFormDef.id === sc.id && otherFormDef.id !== formDef.id && !formDef.id));

        if (existingChar) {
          return {
            ...existingChar, name: formDef.name, details: formDef.details,
            ...(newRPGMode ? {
                level: existingChar.level || 1, characterClass: existingChar.characterClass || '', inventory: existingChar.inventory || {},
                hitPoints: existingChar.hitPoints ?? existingChar.maxHitPoints ?? 10, maxHitPoints: existingChar.maxHitPoints ?? 10,
                manaPoints: existingChar.manaPoints ?? existingChar.maxManaPoints ?? 0, maxManaPoints: existingChar.maxManaPoints ?? 0,
                armorClass: existingChar.armorClass ?? 10, attackBonus: existingChar.attackBonus ?? 0, damageBonus: existingChar.damageBonus ?? "1",
                isHostile: existingChar.isHostile ?? false,
                strength: existingChar.strength ?? BASE_ATTRIBUTE_VALUE, dexterity: existingChar.dexterity ?? BASE_ATTRIBUTE_VALUE, constitution: existingChar.constitution ?? BASE_ATTRIBUTE_VALUE,
                intelligence: existingChar.intelligence ?? BASE_ATTRIBUTE_VALUE, wisdom: existingChar.wisdom ?? BASE_ATTRIBUTE_VALUE, charisma: existingChar.charisma ?? BASE_ATTRIBUTE_VALUE,
            } : {
                level: undefined, characterClass: undefined, inventory: undefined, hitPoints: undefined, maxHitPoints: undefined, manaPoints: undefined, maxManaPoints: undefined,
                armorClass: undefined, attackBonus: undefined, damageBonus: undefined, isHostile: undefined,
                strength: undefined, dexterity: undefined, constitution: undefined, intelligence: undefined, wisdom: undefined, charisma: undefined,
             }),
             ...(newRelationsMode ? {
                affinity: existingChar.affinity ?? 50, relations: existingChar.relations || { [PLAYER_ID]: defaultRelation },
             } : { affinity: undefined, relations: undefined, })
          };
        } else {
          const newId = formDef.id || `${formDef.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          return {
            id: newId, name: formDef.name, details: formDef.details, history: [`Créé via formulaire le ${new Date().toLocaleString()}`], portraitUrl: null,
             ...(newRPGMode ? {
                level: 1, characterClass: '', inventory: {}, hitPoints: 10, maxHitPoints: 10, manaPoints:0, maxManaPoints:0, armorClass: 10,
                attackBonus: 0, damageBonus: "1", isHostile: false,
                strength: BASE_ATTRIBUTE_VALUE, dexterity: BASE_ATTRIBUTE_VALUE, constitution: BASE_ATTRIBUTE_VALUE,
                intelligence: BASE_ATTRIBUTE_VALUE, wisdom: BASE_ATTRIBUTE_VALUE, charisma: BASE_ATTRIBUTE_VALUE,
            } : {}),
            ...(newRelationsMode ? { affinity: 50, relations: { [PLAYER_ID]: defaultRelation }, } : {})
          };
        }
      });
      if (newRelationsMode) {
          const allCharIds = new Set(updatedCharsList.map(c => c.id));
          updatedCharsList = updatedCharsList.map(char => {
            const newRelations = { ...(char.relations || {}) };
            if (!newRelations[PLAYER_ID]) { newRelations[PLAYER_ID] = defaultRelation; }
            allCharIds.forEach(otherCharId => {
                if (char.id !== otherCharId && !newRelations[otherCharId]) {
                    newRelations[otherCharId] = defaultRelation;
                }
            });
            return { ...char, relations: newRelations };
          });
      }
      if (JSON.stringify(prevStagedChars) !== JSON.stringify(updatedCharsList)) { return updatedCharsList; }
      return prevStagedChars;
    });
  }, [currentLanguage, baseAdventureSettings.playerGold]);

  const handleApplyStagedChanges = React.useCallback(() => {
    let initialSituationChanged = false;
    setAdventureSettings(prevLiveSettings => {
        initialSituationChanged = stagedAdventureSettings.initialSituation !== prevLiveSettings.initialSituation;
        let newLiveSettings = JSON.parse(JSON.stringify(stagedAdventureSettings));

        const effectiveStats = calculateEffectiveStats(newLiveSettings);
        newLiveSettings.playerMaxHp = effectiveStats.playerMaxHp;
        newLiveSettings.playerMaxMp = effectiveStats.playerMaxMp;
        newLiveSettings.playerArmorClass = effectiveStats.playerArmorClass;
        newLiveSettings.playerAttackBonus = effectiveStats.playerAttackBonus;
        newLiveSettings.playerDamageBonus = effectiveStats.playerDamageBonus;


        if (newLiveSettings.rpgMode) {
            if (initialSituationChanged || (!prevLiveSettings.rpgMode && newLiveSettings.rpgMode) ) {
                newLiveSettings.playerCurrentHp = newLiveSettings.playerMaxHp;
                newLiveSettings.playerCurrentMp = newLiveSettings.playerMaxMp;
                newLiveSettings.playerCurrentExp = 0;
                newLiveSettings.playerInventory = newLiveSettings.playerInventory?.map((item: PlayerInventoryItem) => ({...item, isEquipped: false})) || [];
                newLiveSettings.playerGold = newLiveSettings.playerGold ?? (baseAdventureSettings.playerGold ?? 0);
                newLiveSettings.equippedItemIds = { weapon: null, armor: null, jewelry: null };

            } else {
                newLiveSettings.playerCurrentHp = Math.min(prevLiveSettings.playerCurrentHp ?? newLiveSettings.playerMaxHp ?? 0, newLiveSettings.playerMaxHp ?? 0);
                newLiveSettings.playerCurrentMp = Math.min(prevLiveSettings.playerCurrentMp ?? newLiveSettings.playerMaxMp ?? 0, newLiveSettings.playerMaxMp ?? 0);
                newLiveSettings.playerCurrentExp = prevLiveSettings.playerCurrentExp ?? 0;
                newLiveSettings.playerInventory = newLiveSettings.playerInventory || prevLiveSettings.playerInventory || [];
                newLiveSettings.playerGold = newLiveSettings.playerGold ?? prevLiveSettings.playerGold ?? 0;
                newLiveSettings.equippedItemIds = newLiveSettings.equippedItemIds || prevLiveSettings.equippedItemIds || { weapon: null, armor: null, jewelry: null };
            }
             if (newLiveSettings.playerCurrentHp !== undefined && newLiveSettings.playerMaxHp !== undefined) {
                 newLiveSettings.playerCurrentHp = Math.min(newLiveSettings.playerCurrentHp, newLiveSettings.playerMaxHp);
            }
             if (newLiveSettings.playerCurrentMp !== undefined && newLiveSettings.playerMaxMp !== undefined) {
                newLiveSettings.playerCurrentMp = Math.min(newLiveSettings.playerCurrentMp, newLiveSettings.playerMaxMp);
            }
        } else {
            newLiveSettings.playerClass = undefined; newLiveSettings.playerLevel = undefined;
            newLiveSettings.playerMaxHp = undefined; newLiveSettings.playerCurrentHp = undefined;
            newLiveSettings.playerMaxMp = undefined; newLiveSettings.playerCurrentMp = undefined;
            newLiveSettings.playerExpToNextLevel = undefined; newLiveSettings.playerCurrentExp = undefined;
            newLiveSettings.playerInventory = undefined; newLiveSettings.playerGold = undefined;
            newLiveSettings.playerInitialAttributePoints = undefined;
            newLiveSettings.playerStrength = undefined; newLiveSettings.playerDexterity = undefined; newLiveSettings.playerConstitution = undefined;
            newLiveSettings.playerIntelligence = undefined; newLiveSettings.playerWisdom = undefined; newLiveSettings.playerCharisma = undefined;
            newLiveSettings.playerArmorClass = undefined; newLiveSettings.playerAttackBonus = undefined; newLiveSettings.playerDamageBonus = undefined;
            newLiveSettings.equippedItemIds = undefined;
        }
        setBaseAdventureSettings(JSON.parse(JSON.stringify(newLiveSettings)));
        return newLiveSettings;
    });

    if (initialSituationChanged) {
        setNarrativeMessages([{ id: `msg-${Date.now()}`, type: 'system', content: stagedAdventureSettings.initialSituation, timestamp: Date.now() }]);
        setActiveCombat(undefined);
    }
    const newLiveCharacters = JSON.parse(JSON.stringify(stagedCharacters));
    setCharacters(newLiveCharacters);
    setBaseCharacters(newLiveCharacters);

    setTimeout(() => {
        toast({ title: "Modifications Enregistrées", description: "Les paramètres de l'aventure et des personnages ont été mis à jour." });
    }, 0);
  }, [stagedAdventureSettings, stagedCharacters, toast, baseAdventureSettings.playerGold]);

  const stringifiedStagedCharsForFormMemo = React.useMemo(() => {
    return JSON.stringify(stagedCharacters.map(c => ({ id: c.id, name: c.name, details: c.details })));
  }, [stagedCharacters]);


  const memoizedStagedAdventureSettingsForForm = React.useMemo<AdventureFormValues>(() => {
    const formCharacters: FormCharacterDefinition[] = JSON.parse(stringifiedStagedCharsForFormMemo);
    const effectiveStats = calculateEffectiveStats(stagedAdventureSettings);

    const creationPoints = stagedAdventureSettings.playerInitialAttributePoints || INITIAL_CREATION_ATTRIBUTE_POINTS;
    const levelPoints = (stagedAdventureSettings.playerLevel && stagedAdventureSettings.playerLevel > 1)
                        ? (stagedAdventureSettings.playerLevel - 1) * ATTRIBUTE_POINTS_PER_LEVEL_GAIN
                        : 0;
    const totalDistributable = creationPoints + levelPoints;


    return {
      world: stagedAdventureSettings.world,
      initialSituation: stagedAdventureSettings.initialSituation,
      playerName: stagedAdventureSettings.playerName,
      enableRpgMode: stagedAdventureSettings.rpgMode,
      enableRelationsMode: stagedAdventureSettings.relationsMode ?? true,
      characters: formCharacters,
      playerClass: stagedAdventureSettings.rpgMode ? stagedAdventureSettings.playerClass : undefined,
      playerLevel: stagedAdventureSettings.rpgMode ? stagedAdventureSettings.playerLevel : undefined,
      playerExpToNextLevel: stagedAdventureSettings.rpgMode ? stagedAdventureSettings.playerExpToNextLevel : undefined,
      playerGold: stagedAdventureSettings.rpgMode ? stagedAdventureSettings.playerGold : undefined,

      playerInitialAttributePoints: stagedAdventureSettings.rpgMode ? creationPoints : undefined,
      totalDistributableAttributePoints: stagedAdventureSettings.rpgMode ? totalDistributable : undefined,

      playerStrength: stagedAdventureSettings.rpgMode ? stagedAdventureSettings.playerStrength ?? BASE_ATTRIBUTE_VALUE : undefined,
      playerDexterity: stagedAdventureSettings.rpgMode ? stagedAdventureSettings.playerDexterity ?? BASE_ATTRIBUTE_VALUE : undefined,
      playerConstitution: stagedAdventureSettings.rpgMode ? stagedAdventureSettings.playerConstitution ?? BASE_ATTRIBUTE_VALUE : undefined,
      playerIntelligence: stagedAdventureSettings.rpgMode ? stagedAdventureSettings.playerIntelligence ?? BASE_ATTRIBUTE_VALUE : undefined,
      playerWisdom: stagedAdventureSettings.rpgMode ? stagedAdventureSettings.playerWisdom ?? BASE_ATTRIBUTE_VALUE : undefined,
      playerCharisma: stagedAdventureSettings.rpgMode ? stagedAdventureSettings.playerCharisma ?? BASE_ATTRIBUTE_VALUE : undefined,

      playerAttackBonus: stagedAdventureSettings.rpgMode ? effectiveStats.playerAttackBonus : undefined,
      playerDamageBonus: stagedAdventureSettings.rpgMode ? effectiveStats.playerDamageBonus : undefined,
      playerMaxHp: stagedAdventureSettings.rpgMode ? effectiveStats.playerMaxHp : undefined,
      playerMaxMp: stagedAdventureSettings.rpgMode ? effectiveStats.playerMaxMp : undefined,
      playerArmorClass: stagedAdventureSettings.rpgMode ? effectiveStats.playerArmorClass : undefined,
    };
  }, [stagedAdventureSettings, stringifiedStagedCharsForFormMemo]);

  const worldForQuestHook = adventureSettings.world;
  const characterNamesForQuestHook = React.useMemo(() => characters.map(c => c.name).join(", "), [characters]);

  const callSuggestQuestHook = React.useCallback(async () => {
    React.startTransition(() => {
      setIsSuggestingQuest(true);
    });
    setTimeout(() => {
      toast({ title: "Suggestion de Quête", description: "L'IA réfléchit à une nouvelle accroche..." });
    }, 0);

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
        setTimeout(() => {
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
        }, 0);
      });
    } catch (error) {
      console.error("Error suggesting quest hook:", error);
      React.startTransition(() => {
        setTimeout(() => {
          toast({ title: "Erreur", description: "Impossible de suggérer une quête.", variant: "destructive" });
        }, 0);
      });
    } finally {
      React.startTransition(() => {
        setIsSuggestingQuest(false);
      });
    }
  }, [narrativeMessages, characterNamesForQuestHook, worldForQuestHook, currentLanguage, toast, adventureSettings.playerName, setIsSuggestingQuest]);

  const generateSceneImageAction = React.useCallback(
    async (input: GenerateSceneImageInput): Promise<GenerateSceneImageOutput> => {
        return generateSceneImage(input);
    }, []);

  const handleGenerateItemImage = React.useCallback(async (item: PlayerInventoryItem) => {
    if (isGeneratingItemImage) return;
    setIsGeneratingItemImage(true);
    setTimeout(() => {
        toast({
          title: "Génération d'Image d'Objet",
          description: `Création d'une image pour ${item.name}...`,
        });
    }, 0);

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
      const result = await generateSceneImageAction({ sceneDescription: promptDescription });
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

      setTimeout(() => {
          toast({
            title: "Image d'Objet Générée !",
            description: (
              <div className="flex flex-col gap-2">
                <p>{item.name} visualisé.</p>
                {result.imageUrl && <img src={result.imageUrl} alt={item.name} className="w-16 h-16 object-contain border rounded-md" data-ai-hint="generated item image"/>}
                <p className="text-xs">L'image devrait apparaître dans l'inventaire.</p>
              </div>
            ),
            duration: 9000,
          });
      },0);

    } catch (error) {
      console.error(`Error generating image for ${item.name}:`, error);
      setTimeout(() => {
          toast({
            title: "Erreur de Génération d'Image",
            description: `Impossible de générer une image pour ${item.name}. ${error instanceof Error ? error.message : ''}`,
            variant: "destructive",
          });
      },0);

    } finally {
      setIsGeneratingItemImage(false);
    }
  }, [generateSceneImageAction, toast, isGeneratingItemImage]);


  return (
    <>
      <PageStructure
        adventureSettings={adventureSettings}
        characters={characters}
        stagedAdventureSettings={memoizedStagedAdventureSettingsForForm}
        stagedCharacters={stagedCharacters}
        formPropKey={formPropKey}
        handleApplyStagedChanges={handleApplyStagedChanges}
        narrativeMessages={narrativeMessages}
        currentLanguage={currentLanguage}
        fileInputRef={fileInputRef}
        handleSettingsUpdate={handleSettingsUpdate}
        handleCharacterUpdate={handleCharacterUpdate}
        handleNewCharacters={handleNewCharacters}
        handleCharacterHistoryUpdate={handleCharacterHistoryUpdate}
        handleAffinityUpdates={handleAffinityUpdates}
        handleRelationUpdate={(charId, targetId, newRelation) => {
             const currentRelationsMode = stagedAdventureSettings.relationsMode ?? true;
             if (!currentRelationsMode) return;
             setStagedCharacters(prevChars =>
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
        handleNarrativeUpdate={handleNarrativeUpdate}
        handleSave={handleSave}
        handleLoad={handleLoad}
        setCurrentLanguage={setCurrentLanguage}
        translateTextAction={translateText}
        generateAdventureAction={callGenerateAdventure}
        generateSceneImageAction={generateSceneImageAction}
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
      />
      </>
  );
}

    
