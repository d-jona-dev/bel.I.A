
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { Character, AdventureSettings, SaveData, Message, ActiveCombat, PlayerInventoryItem, LootedItem, CurrencyTier } from "@/types";
import { PageStructure } from "./page.structure";

import { generateAdventure } from "@/ai/flows/generate-adventure";
import type { GenerateAdventureInput, GenerateAdventureOutput, CharacterUpdateSchema, AffinityUpdateSchema, RelationUpdateSchema, NewCharacterSchema, CombatUpdatesSchema, InventoryItem as AIInventoryItem } from "@/ai/flows/generate-adventure";
import { generateSceneImage } from "@/ai/flows/generate-scene-image";
import type { GenerateSceneImageInput, GenerateSceneImageOutput } from "@/ai/flows/generate-scene-image";
import { translateText } from "@/ai/flows/translate-text";
import type { TranslateTextInput, TranslateTextOutput } from "@/ai/flows/translate-text";
import { suggestQuestHook } from "@/ai/flows/suggest-quest-hook";
import type { SuggestQuestHookInput, SuggestQuestHookOutput } from "@/ai/flows/suggest-quest-hook";


const PLAYER_ID = "player";

export type FormCharacterDefinition = { id?: string; name: string; details: string };
export type AdventureFormValues = Omit<AdventureSettings, 'characters' | 'playerCurrentHp' | 'playerCurrentMp' | 'playerCurrentExp' | 'playerInventory' | 'playerCurrencyTiers'> & {
  characters: FormCharacterDefinition[];
  currencyLabel?: string;
  currencyTiers?: Array<{name: string; valueInPreviousTier: number; initialAmount?: number}>; // valueInPreviousTier par rapport au plus petit défini avant (ou 1 si c'est le premier après la base)
  playerClass?: string;
  playerLevel?: number;
  playerMaxHp?: number;
  playerMaxMp?: number;
  playerExpToNextLevel?: number;
};

export default function Home() {
  const fileInputRef = React.useRef<HTMLInputElement>(null); // Moved declaration to the top

  const [baseAdventureSettings, setBaseAdventureSettings] = React.useState<AdventureSettings>({
    world: "Le village paisible de Bourgenval est niché au bord de la Forêt Murmurante. Récemment, des gobelins plus audacieux qu'à l'accoutumée ont commencé à attaquer les voyageurs et à piller les fermes isolées. Les villageois sont terrifiés.",
    initialSituation: "Vous arrivez à Bourgenval, fatigué par la route. L'Ancienne Elara, la matriarche respectée du village, vous aborde avec un regard inquiet. 'Étranger,' dit-elle, 'votre regard est celui d'un guerrier. Nous avons désespérément besoin d'aide. Les gobelins de la Grotte Grinçante sont devenus une véritable menace. Pourriez-vous nous en débarrasser ?'",
    rpgMode: true,
    relationsMode: true,
    playerName: "Héros",
    playerClass: "Guerrier",
    playerLevel: 1,
    playerMaxHp: 30,
    playerCurrentHp: 30,
    playerMaxMp: 0,
    playerCurrentMp: 0,
    playerExpToNextLevel: 100,
    playerCurrentExp: 0,
    playerInventory: [{name: "Potion de Soin Mineure", quantity: 2, description: "Une fiole rougeâtre qui restaure quelques points de vie.", effect: "Restaure 10 PV", type: "consumable"}, {name: "Dague Rouillée", quantity: 1, description: "Une dague simple et usée.", effect: "Arme de base", type: "weapon"}],
    currencyLabel: "Trésorerie",
    playerCurrencyTiers: [
      { name: "Or", valueInBaseTier: 10000, amount: 0 },
      { name: "Argent", valueInBaseTier: 100, amount: 0 },
      { name: "Cuivre", valueInBaseTier: 1, amount: 15 },
    ],
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
        inventory: {"Hache Rouillée": 1}
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

  const [adventureSettings, setAdventureSettings] = React.useState<AdventureSettings>(() => JSON.parse(JSON.stringify(baseAdventureSettings)));
  const [characters, setCharacters] = React.useState<Character[]>(() => JSON.parse(JSON.stringify(baseCharacters)));
  const [activeCombat, setActiveCombat] = React.useState<ActiveCombat | undefined>(undefined);
  const [narrativeMessages, setNarrativeMessages] = React.useState<Message[]>([
     { id: `msg-${Date.now()}`, type: 'system', content: baseAdventureSettings.initialSituation, timestamp: Date.now() }
  ]);
  const [currentLanguage, setCurrentLanguage] = React.useState<string>("fr");

  const [stagedAdventureSettings, setStagedAdventureSettings] = React.useState<AdventureSettings>(() => JSON.parse(JSON.stringify(baseAdventureSettings)));
  const [stagedCharacters, setStagedCharacters] = React.useState<Character[]>(() => JSON.parse(JSON.stringify(baseCharacters)));
  const [formPropKey, setFormPropKey] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = React.useState<boolean>(false);
  const [showRestartConfirm, setShowRestartConfirm] = React.useState<boolean>(false);
  const [isSuggestingQuest, setIsSuggestingQuest] = React.useState<boolean>(false);


  const { toast } = useToast();

  React.useEffect(() => {
    const currentBaseAdventureSettings = baseAdventureSettings;
    const initialSettings = JSON.parse(JSON.stringify(currentBaseAdventureSettings));
    const newLiveAdventureSettings: AdventureSettings = {
        ...initialSettings,
        playerCurrentHp: initialSettings.rpgMode ? initialSettings.playerMaxHp : undefined,
        playerCurrentMp: initialSettings.rpgMode ? initialSettings.playerMaxMp : undefined,
        playerCurrentExp: initialSettings.rpgMode ? 0 : undefined,
        playerInventory: initialSettings.playerInventory || [],
        playerCurrencyTiers: initialSettings.playerCurrencyTiers?.map((tier: CurrencyTier) => ({ ...tier, amount: tier.amount || 0 })) || [],
    };
    const newLiveCharacters = JSON.parse(JSON.stringify(baseCharacters));
    const newNarrative = [{ id: `msg-${Date.now()}`, type: 'system', content: currentBaseAdventureSettings.initialSituation, timestamp: Date.now() }];

    setAdventureSettings(newLiveAdventureSettings);
    setCharacters(newLiveCharacters);
    setNarrativeMessages(newNarrative);
    setActiveCombat(undefined);

    setStagedAdventureSettings(JSON.parse(JSON.stringify(newLiveAdventureSettings)));
    setStagedCharacters(JSON.parse(JSON.stringify(newLiveCharacters)));
    setFormPropKey(prev => prev + 1);
  }, [baseAdventureSettings, baseCharacters]);


  React.useEffect(() => {
    let keyShouldIncrement = false;
    setStagedAdventureSettings(prevStaged => {
      const newLiveSettingsCopy = JSON.parse(JSON.stringify(adventureSettings));
      if (JSON.stringify(prevStaged) !== JSON.stringify(newLiveSettingsCopy)) {
        keyShouldIncrement = true;
        return newLiveSettingsCopy;
      }
      return prevStaged;
    });

    setStagedCharacters(prevStaged => {
      const newLiveCharsCopy = JSON.parse(JSON.stringify(characters));
      if (JSON.stringify(prevStaged) !== JSON.stringify(newLiveCharsCopy)) {
        keyShouldIncrement = true;
        return newLiveCharsCopy;
      }
      return prevStaged;
    });
    // if (keyShouldIncrement) {
    //   setFormPropKey(k => k + 1); // Temporarily removed to break potential loops
    // }
  }, [adventureSettings, characters]);



  const handleNarrativeUpdate = React.useCallback((content: string, type: 'user' | 'ai', sceneDesc?: string, lootItems?: LootedItem[]) => {
       const newMessage: Message = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            type: type,
            content: content,
            timestamp: Date.now(),
            sceneDescription: type === 'ai' ? sceneDesc : undefined,
            loot: type === 'ai' ? lootItems : undefined,
            lootTaken: false,
       };
       setNarrativeMessages(prevNarrative => [...prevNarrative, newMessage]);
   }, []);

  const addCurrencyToPlayer = React.useCallback((baseAmountToAdd: number) => {
      setAdventureSettings(prevSettings => {
          if (!prevSettings.rpgMode || !prevSettings.playerCurrencyTiers || prevSettings.playerCurrencyTiers.length === 0) {
              return prevSettings;
          }
          let currentTotalInBase = 0;
          prevSettings.playerCurrencyTiers.forEach(tier => {
              currentTotalInBase += (tier.amount || 0) * tier.valueInBaseTier;
          });
          let newTotalInBase = currentTotalInBase + baseAmountToAdd;
          if (newTotalInBase < 0) newTotalInBase = 0; // Prevent negative currency

          const updatedTiers = prevSettings.playerCurrencyTiers.map(t => ({...t, amount: 0}));

          for (let i = 0; i < updatedTiers.length; i++) { // Iterate from most valuable to least valuable
              const tier = updatedTiers[i];
              if (newTotalInBase >= tier.valueInBaseTier) {
                  const count = Math.floor(newTotalInBase / tier.valueInBaseTier);
                  tier.amount = count;
                  newTotalInBase -= count * tier.valueInBaseTier;
              }
          }
          // Distribute any remainder to the smallest currency tier if its valueInBaseTier is 1
          if (newTotalInBase > 0 && updatedTiers.length > 0) {
               const smallestTierIndex = updatedTiers.findIndex(t => t.valueInBaseTier === 1);
               if (smallestTierIndex !== -1) {
                   updatedTiers[smallestTierIndex].amount += Math.floor(newTotalInBase); // Add remainder
               } else {
                    // This case should ideally not happen if a base tier (value 1) is always present
                    console.warn("Smallest currency tier (valueInBaseTier: 1) not found. Cannot accurately distribute remainder of:", newTotalInBase);
               }
          }
          return { ...prevSettings, playerCurrencyTiers: updatedTiers };
      });
  }, []);

  const handleCombatUpdates = React.useCallback((combatUpdates: CombatUpdatesSchema) => {
    const toastsToShow: Array<Parameters<typeof toast>[0]> = [];
    setCharacters(prevChars => {
        const currentRpgMode = adventureSettings.rpgMode;
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
                    isHostile: combatantUpdate.isDefeated ? char.isHostile : (char.isHostile ?? true), // Keep hostility unless defeated, default to true for combatants
                    statusEffects: combatantUpdate.newStatusEffects || char.statusEffects,
                };
            }
            return char;
        });
    });
    setAdventureSettings(prevSettings => {
        if (!prevSettings.rpgMode) return prevSettings;
        let newSettings = { ...prevSettings };
        const playerCombatUpdate = combatUpdates.updatedCombatants.find(cu => cu.combatantId === PLAYER_ID);
        if (playerCombatUpdate) {
            newSettings.playerCurrentHp = playerCombatUpdate.newHp;
            newSettings.playerCurrentMp = playerCombatUpdate.newMp ?? newSettings.playerCurrentMp;
            if (playerCombatUpdate.isDefeated) {
                toastsToShow.push({ title: "Joueur Vaincu!", description: "L'aventure pourrait prendre un tournant difficile...", variant: "destructive" });
            }
        }
        // MP Regeneration (1 per turn if below max and used)
        if (newSettings.playerMaxMp && (newSettings.playerMaxMp > 0) && newSettings.playerCurrentMp !== undefined && (newSettings.playerCurrentMp < newSettings.playerMaxMp)) {
             newSettings.playerCurrentMp = Math.min(newSettings.playerMaxMp, (newSettings.playerCurrentMp || 0) + 1);
        }
        if (combatUpdates.expGained && combatUpdates.expGained > 0 && newSettings.playerCurrentExp !== undefined && newSettings.playerExpToNextLevel !== undefined && newSettings.playerLevel !== undefined) {
            newSettings.playerCurrentExp += combatUpdates.expGained;
             setTimeout(() => { toast({ title: "Expérience Gagnée!", description: `Vous avez gagné ${combatUpdates.expGained} EXP.` }); }, 0);
            while (newSettings.playerCurrentExp >= newSettings.playerExpToNextLevel!) {
                newSettings.playerLevel! += 1;
                newSettings.playerCurrentExp -= newSettings.playerExpToNextLevel!;
                // Example: Increase EXP needed by 50% for next level
                newSettings.playerExpToNextLevel = Math.floor(newSettings.playerExpToNextLevel! * 1.5);
                // Example: Increase Max HP/MP on level up
                newSettings.playerMaxHp = (newSettings.playerMaxHp || 0) + Math.floor(Math.random() * 6) + 2; // e.g. 1d6+1 HP
                newSettings.playerCurrentHp = newSettings.playerMaxHp; // Full heal on level up
                if (newSettings.playerMaxMp && newSettings.playerMaxMp > 0) {
                    newSettings.playerMaxMp = (newSettings.playerMaxMp || 0) + Math.floor(Math.random() * 4) + 1; // e.g. 1d4 MP
                    newSettings.playerCurrentMp = newSettings.playerMaxMp;
                }
                 setTimeout(() => { toast({ title: "Niveau Supérieur!", description: `Vous avez atteint le niveau ${newSettings.playerLevel}! Vos PV et PM max ont augmenté.`, variant: "default" }); }, 0);
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
  }, [toast, adventureSettings.rpgMode]); // Added adventureSettings.rpgMode

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
                    history: [...(char.history || []), ...newHistory].slice(-20), // Keep last 20 entries
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
                if (Math.abs(affinityUpdate.change) >= 3) { // Only toast for significant changes
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

  const handleRelationUpdate = React.useCallback((charId: string, targetId: string, newRelation: string) => {
    const currentRelationsMode = stagedAdventureSettings.relationsMode ?? true;
    if (!currentRelationsMode) return;

    setStagedCharacters(prevChars =>
      prevChars.map(char => {
        if (char.id === charId) {
          const updatedRelations = { ...(char.relations || {}), [targetId]: newRelation };
          return { ...char, relations: updatedRelations };
        }
        // If the update is between two NPCs, also update the target's perspective if they have a relation defined
        if (targetId !== PLAYER_ID && char.id === targetId ) { // Ensure targetId is not player
            const sourceChar = prevChars.find(c => c.id === charId);
            if (sourceChar) { // Check if source character exists
                const updatedRelations = { ...(char.relations || {}), [charId]: newRelation }; // Symmetrical update for NPC-NPC
                return { ...char, relations: updatedRelations };
            }
        }
        return char;
      })
    );
  }, [stagedAdventureSettings.relationsMode, PLAYER_ID]);

  const handleRelationUpdatesFromAI = React.useCallback((updates: RelationUpdateSchema[]) => {
    const currentRelationsMode = stagedAdventureSettings.relationsMode ?? true;
    const currentPlayerName = stagedAdventureSettings.playerName || "Player";
    if (!currentRelationsMode || !updates || updates.length === 0) return;

    const defaultRelationDesc = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
    const toastsToShow: Array<Parameters<typeof toast>[0]> = [];

    setStagedCharacters(prevChars => {
        let charsCopy = JSON.parse(JSON.stringify(prevChars)); // Deep copy to avoid direct state mutation issues
        let changed = false;

        updates.forEach(update => {
            const sourceCharIndex = charsCopy.findIndex((c: Character) => c.name.toLowerCase() === update.characterName.toLowerCase());
            if (sourceCharIndex === -1) return; // Source character not found

            let targetId: string | null = null;
            if (update.targetName.toLowerCase() === currentPlayerName.toLowerCase()) {
                targetId = PLAYER_ID;
            } else {
                const targetChar = charsCopy.find((c:Character) => c.name.toLowerCase() === update.targetName.toLowerCase());
                if (targetChar) targetId = targetChar.id;
                else return; // Target character not found
            }

            if (!targetId) return;

            const currentRelation = charsCopy[sourceCharIndex].relations?.[targetId] || defaultRelationDesc;
            const newRelationFromAI = update.newRelation.trim() === "" || update.newRelation.toLowerCase() === "inconnu" || update.newRelation.toLowerCase() === "unknown" ? defaultRelationDesc : update.newRelation;

            if (currentRelation !== newRelationFromAI) {
                if (!charsCopy[sourceCharIndex].relations) {
                    charsCopy[sourceCharIndex].relations = {};
                }
                charsCopy[sourceCharIndex].relations[targetId] = newRelationFromAI;
                changed = true;
                toastsToShow.push({
                    title: `Relation Changée: ${update.characterName}`,
                    description: `Relation envers ${update.targetName} est maintenant "${newRelationFromAI}". Raison: ${update.reason || 'Événement narratif'}`,
                });
            }
        });

        if (changed) return charsCopy;
        return prevChars;
    });
    toastsToShow.forEach(toastArgs => setTimeout(() => { toast(toastArgs); }, 0));
  }, [currentLanguage, stagedAdventureSettings.playerName, toast, stagedAdventureSettings.relationsMode]);

  const handleNewCharacters = React.useCallback((newChars: Array<NewCharacterSchema>) => {
    if (!newChars || newChars.length === 0) return;
    const defaultRelationDesc = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
    let addedCharacterNames: string[] = [];
    const currentRpgMode = stagedAdventureSettings.rpgMode;
    const currentRelationsMode = stagedAdventureSettings.relationsMode ?? true;
    const currentPlayerName = stagedAdventureSettings.playerName || "Player";

    setStagedCharacters(prevStagedChars => {
        const currentLiveCharNames = new Set(characters.map(c => c.name.toLowerCase())); // Use live characters for checking existing ones in adventure
        const currentStagedCharNamesFromPrev = new Set(prevStagedChars.map(c => c.name.toLowerCase()));
        const charsToAdd: Character[] = [];
        let existingStagedCharsCopy = JSON.parse(JSON.stringify(prevStagedChars)); // Work on a copy

        newChars.forEach(newCharData => {
            // Check if character already exists in the current adventure (live state) or already staged from this AI turn
            if (!currentLiveCharNames.has(newCharData.name.toLowerCase()) && !currentStagedCharNamesFromPrev.has(newCharData.name.toLowerCase())) {
                const newId = `${newCharData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                const processedRelations: Record<string, string> = {};

                // Initialize relations for the new character
                if (currentRelationsMode) {
                    // Towards player
                    processedRelations[PLAYER_ID] = defaultRelationDesc;
                    // Towards existing characters in the staged list
                    existingStagedCharsCopy.forEach((ec: Character) => {
                         processedRelations[ec.id] = defaultRelationDesc;
                    });
                    // Process initial relations provided by AI for the new character
                    if (newCharData.initialRelations && Array.isArray(newCharData.initialRelations)) {
                        newCharData.initialRelations.forEach(rel => {
                            const relationDescription = rel.description || defaultRelationDesc;
                            if (rel.targetName.toLowerCase() === currentPlayerName.toLowerCase()) {
                                processedRelations[PLAYER_ID] = relationDescription;
                            } else {
                                const targetChar = existingStagedCharsCopy.find((ec: Character) => ec.name.toLowerCase() === rel.targetName.toLowerCase());
                                if (targetChar) {
                                    processedRelations[targetChar.id] = relationDescription;
                                }
                            }
                        });
                    }
                }

                const processedInventory: Record<string, number> = {};
                if (currentRpgMode && newCharData.inventory && Array.isArray(newCharData.inventory)) {
                   newCharData.inventory.forEach(item => {
                        if (item.itemName && typeof item.itemName === 'string' && typeof item.quantity === 'number' && item.quantity > 0) {
                            processedInventory[item.itemName] = (processedInventory[item.itemName] || 0) + item.quantity;
                        }
                    });
                }

                const characterToAdd: Character = {
                    id: newId, name: newCharData.name,
                    details: newCharData.details || (currentLanguage === 'fr' ? "Rencontré récemment." : "Recently met."),
                    biographyNotes: newCharData.biographyNotes,
                    history: newCharData.initialHistoryEntry ? [newCharData.initialHistoryEntry] : [`Rencontré le ${new Date().toLocaleString()}`],
                    opinion: {}, portraitUrl: null,
                    affinity: currentRelationsMode ? 50 : undefined,
                    relations: currentRelationsMode ? processedRelations : undefined,
                    isHostile: currentRpgMode ? newCharData.isHostile : undefined,
                    inventory: currentRpgMode ? processedInventory : undefined,
                    ...(currentRpgMode && {
                        level: newCharData.level ?? 1,
                        experience: 0,
                        characterClass: newCharData.characterClass ?? '',
                        stats: {}, skills: {},
                        spells: [], techniques: [], passiveAbilities: [], strength: 10, dexterity: 10,
                        intelligence: 10, wisdom: 10, charisma: 10, constitution: 10,
                        baseHitPoints: newCharData.maxHitPoints ?? 10,
                        hitPoints: newCharData.hitPoints ?? newCharData.maxHitPoints ?? 10,
                        maxHitPoints: newCharData.maxHitPoints ?? 10,
                        manaPoints: newCharData.manaPoints ?? newCharData.maxManaPoints ?? 0,
                        maxManaPoints: newCharData.maxManaPoints ?? 0,
                        armorClass: newCharData.armorClass ?? 10,
                        attackBonus: newCharData.attackBonus ?? 0,
                        damageBonus: newCharData.damageBonus ?? "1",
                    })
                };
                charsToAdd.push(characterToAdd);
                addedCharacterNames.push(characterToAdd.name);
                currentStagedCharNamesFromPrev.add(newCharData.name.toLowerCase()); // Add to staged names to prevent re-adding in same batch
            }
        });

        if (charsToAdd.length > 0) {
            // Update relations of existing characters towards the new ones
            if (currentRelationsMode) {
                existingStagedCharsCopy = existingStagedCharsCopy.map((ec: Character) => {
                    const updatedRelations = { ...(ec.relations || {}) };
                    charsToAdd.forEach(newlyAddedChar => {
                        if (!updatedRelations[newlyAddedChar.id]) {
                            updatedRelations[newlyAddedChar.id] = defaultRelationDesc;
                        }
                    });
                    return { ...ec, relations: updatedRelations };
                });
            }
            return [...existingStagedCharsCopy, ...charsToAdd];
        }
        return prevStagedChars; // Return original if no changes
    });

    if (addedCharacterNames.length > 0) {
         setTimeout(() => {
              toast({
                  title: "Nouveau Personnage Rencontré",
                  description: `${addedCharacterNames.join(', ')} a été ajouté aux modifications en attente. N'oubliez pas d'enregistrer les modifications pour appliquer.`,
              });
          },0);
    }
  }, [currentLanguage, stagedAdventureSettings.playerName, stagedAdventureSettings.rpgMode, stagedAdventureSettings.relationsMode, toast, characters]); // Added characters to dependency list

  const callGenerateAdventure = React.useCallback(async (input: GenerateAdventureInput) => {
    React.startTransition(() => {
      setIsLoading(true);
    });
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
            if (adventureSettings.rpgMode && result.currencyGained && result.currencyGained > 0 && adventureSettings.playerCurrencyTiers) {
                addCurrencyToPlayer(result.currencyGained);
                 setTimeout(() => {
                    toast({ title: "Monnaie Obtenue!", description: `Vous avez obtenu de la monnaie.`});
                },0);
            }
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error in callGenerateAdventure: ", errorMessage, error);
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
      adventureSettings, characters, currentLanguage, // Removed narrativeMessages, activeCombat as they are read from state directly or passed in input
      toast, handleNarrativeUpdate, handleNewCharacters, handleCharacterHistoryUpdate, handleAffinityUpdates,
      handleRelationUpdatesFromAI, handleCombatUpdates, addCurrencyToPlayer
  ]);

  const handlePlayerItemAction = React.useCallback((itemName: string, action: 'use' | 'discard') => {
    React.startTransition(() => {
        const currentRpgMode = adventureSettings.rpgMode;
        const currentLang = currentLanguage;
        const currentPlayerName = adventureSettings.playerName || "Player";
        const currentWorld = adventureSettings.world;
        const currentRelationsMode = adventureSettings.relationsMode ?? true;
        const currentCurrencyTiers = adventureSettings.playerCurrencyTiers;

        if (!currentRpgMode) {
            setTimeout(() => {toast({ title: "Mode RPG Désactivé", description: "L'inventaire et l'utilisation d'objets sont désactivés.", variant: "default" });},0);
            return;
        }

        let itemUsedOrDiscarded = false;
        let narrativeAction = "";
        let effectAppliedMessage = "";
        let itemToUpdate: PlayerInventoryItem | undefined = undefined;

        setAdventureSettings(prevSettings => {
            let newInventory = [...(prevSettings.playerInventory || [])];
            const itemIndex = newInventory.findIndex(invItem => invItem.name === itemName && invItem.quantity > 0);

            if (itemIndex === -1) {
                setTimeout(() => {toast({ title: "Objet Introuvable", description: `Vous n'avez pas de "${itemName}" utilisable ou en quantité suffisante.`, variant: "destructive" });},0);
                itemUsedOrDiscarded = false;
                return prevSettings;
            }

            itemToUpdate = { ...newInventory[itemIndex] };
            itemUsedOrDiscarded = true;
            let newSettings = { ...prevSettings };

            if (action === 'use') {
                narrativeAction = `J'utilise ${itemToUpdate.name}.`;
                if (itemToUpdate.type === 'consumable') {
                    let hpGain = 0; let mpGain = 0;
                    if (itemToUpdate.effect) {
                        const hpMatch = itemToUpdate.effect.match(/Restaure (\d+) PV/i);
                        if (hpMatch && hpMatch[1]) hpGain = parseInt(hpMatch[1], 10);
                        const mpMatch = itemToUpdate.effect.match(/Restaure (\d+) PM/i);
                        if (mpMatch && mpMatch[1]) mpGain = parseInt(mpMatch[1], 10);
                    }

                    // Apply effects immediately if not in combat for direct feedback
                    if (!activeCombat?.isActive) {
                        if (hpGain > 0 && newSettings.playerCurrentHp !== undefined && newSettings.playerMaxHp !== undefined) {
                            newSettings.playerCurrentHp = Math.min(newSettings.playerMaxHp, (newSettings.playerCurrentHp || 0) + hpGain);
                        }
                        if (mpGain > 0 && newSettings.playerCurrentMp !== undefined && newSettings.playerMaxMp !== undefined && newSettings.playerMaxMp > 0) {
                            newSettings.playerCurrentMp = Math.min(newSettings.playerMaxMp, (newSettings.playerCurrentMp || 0) + mpGain);
                        }
                    }
                    effectAppliedMessage = `${itemToUpdate.name} utilisé. ${hpGain > 0 ? `PV restaurés: ${hpGain}.` : ''} ${mpGain > 0 ? `PM restaurés: ${mpGain}.` : ''}`.trim();
                    newInventory[itemIndex] = { ...itemToUpdate, quantity: itemToUpdate.quantity - 1 };
                } else {
                    setTimeout(() => {toast({ title: "Action non prise en charge", description: `Vous ne pouvez pas "utiliser" ${itemToUpdate?.name} de cette manière.`, variant: "default" });},0);
                    itemUsedOrDiscarded = false;
                    return prevSettings; // No change
                }
            } else if (action === 'discard') {
                narrativeAction = `Je jette ${itemToUpdate.name}.`;
                newInventory[itemIndex] = { ...itemToUpdate, quantity: itemToUpdate.quantity - 1 };
                effectAppliedMessage = `${itemToUpdate.name} a été jeté.`;
            }

            if (newInventory[itemIndex].quantity <= 0) {
                newInventory.splice(itemIndex, 1);
            }
            newSettings.playerInventory = newInventory;
            return newSettings;
        });

        if (itemUsedOrDiscarded && narrativeAction) {
            if(effectAppliedMessage) {
                 setTimeout(() => { toast({ title: "Action d'Objet", description: effectAppliedMessage }); }, 0);
            }
            handleNarrativeUpdate(narrativeAction, 'user');

            // Use a snapshot of the latest adventure settings for the AI call
            // This is important because setAdventureSettings is async
            const latestAdventureSettings = adventureSettings;
            const latestCharacters = characters;
            const latestNarrative = narrativeMessages; // Use state directly for latest context
            const latestActiveCombat = activeCombat;

            const currentCharactersSnapshot = JSON.parse(JSON.stringify(latestCharacters));
            const currentNarrativeSnapshot = latestNarrative.slice(-5).map(msg => msg.type === 'user' ? `> ${currentPlayerName}: ${msg.content}` : msg.content).join('\n\n') + `\n> ${currentPlayerName}: ${narrativeAction}`;

            const inputForAI: GenerateAdventureInput = {
                world: currentWorld,
                initialSituation: currentNarrativeSnapshot,
                characters: currentCharactersSnapshot,
                userAction: narrativeAction,
                currentLanguage: currentLang,
                playerName: currentPlayerName,
                rpgModeActive: currentRpgMode,
                relationsModeActive: currentRelationsMode,
                activeCombat: latestActiveCombat,
                currencyTiers: currentCurrencyTiers,
                playerClass: latestAdventureSettings.playerClass,
                playerLevel: latestAdventureSettings.playerLevel,
                playerCurrentHp: latestAdventureSettings.playerCurrentHp,
                playerMaxHp: latestAdventureSettings.playerMaxHp,
                playerCurrentMp: latestAdventureSettings.playerCurrentMp,
                playerMaxMp: latestAdventureSettings.playerMaxMp,
                playerCurrentExp: latestAdventureSettings.playerCurrentExp,
                playerExpToNextLevel: latestAdventureSettings.playerExpToNextLevel,
            };
             callGenerateAdventure(inputForAI);
        }
    });
  }, [adventureSettings, characters, currentLanguage, narrativeMessages, activeCombat, callGenerateAdventure, handleNarrativeUpdate, toast]); // Make sure all dependencies are correct

    const handleTakeLoot = React.useCallback((messageId: string, itemsToTake: LootedItem[]) => {
        setAdventureSettings(prevSettings => {
            if (!prevSettings.rpgMode) return prevSettings;
            const newInventory = [...(prevSettings.playerInventory || [])];
            itemsToTake.forEach(item => {
                const existingItemIndex = newInventory.findIndex(invItem => invItem.name === item.itemName);
                if (existingItemIndex > -1) {
                    newInventory[existingItemIndex].quantity += item.quantity;
                } else {
                    newInventory.push({
                        name: item.itemName,
                        quantity: item.quantity,
                        description: item.description,
                        effect: item.effect,
                        type: item.itemType,
                    });
                }
            });
            return { ...prevSettings, playerInventory: newInventory };
        });
        setNarrativeMessages(prevMessages =>
            prevMessages.map(msg =>
                msg.id === messageId ? { ...msg, lootTaken: true } : msg
            )
        );
        setTimeout(() => {toast({ title: "Objets Ramassés", description: "Les objets ont été ajoutés à votre inventaire." });},0);
    }, [toast]);

    const handleDiscardLoot = React.useCallback((messageId: string) => {
        setNarrativeMessages(prevMessages =>
            prevMessages.map(msg =>
                msg.id === messageId ? { ...msg, lootTaken: true } : msg
            )
        );
         setTimeout(() => {toast({ title: "Objets Laissés", description: "Vous avez décidé de ne pas prendre ces objets." });},0);
    }, [toast]);

   const handleEditMessage = React.useCallback((messageId: string, newContent: string) => {
       setNarrativeMessages(prev => prev.map(msg =>
           msg.id === messageId ? { ...msg, content: newContent, timestamp: Date.now() } : msg
       ));
        setTimeout(() => {
            toast({ title: "Message Modifié" });
        },0);
   }, [toast]);

    const handleUndoLastMessage = React.useCallback(() => {
        let messageForToast: Parameters<typeof toast>[0] | null = null;
        let newActiveCombatState = activeCombat; // Capture current combat state

        React.startTransition(() => {
            setNarrativeMessages(prevNarrative => {
                if (prevNarrative.length <= 1 && prevNarrative[0]?.type === 'system') {
                     messageForToast = { title: "Impossible d'annuler", description: "Aucun message à annuler après l'introduction.", variant: "destructive" };
                     return prevNarrative;
                }

                // Logic to find the last user action and the AI response that followed it
                let lastUserIndex = -1;
                for (let i = prevNarrative.length - 1; i >= 0; i--) {
                    if (prevNarrative[i].type === 'user') {
                        lastUserIndex = i;
                        break;
                    }
                }

                if (lastUserIndex !== -1) {
                    // Remove the last user message and all subsequent AI messages
                    const newNarrative = prevNarrative.slice(0, lastUserIndex);
                    messageForToast = { title: "Dernier tour annulé" };

                    // Check if combat needs to be reset
                    // This is a simplified check; more robust state restoration might be needed
                    const lastAiMessageBeforeUndo = prevNarrative[lastUserIndex -1]; // Message before the user action
                    if (lastAiMessageBeforeUndo?.sceneDescription?.toLowerCase().includes("combat started") ||
                        lastAiMessageBeforeUndo?.content.toLowerCase().includes("combat commence")) {
                        newActiveCombatState = undefined; // Reset combat state if the undone action initiated it
                    }
                    return newNarrative;
                } else if (prevNarrative.length > 1 && prevNarrative[0]?.type === 'system') {
                     // If no user message found, but there are AI messages after system, remove the last AI message
                     const newNarrative = prevNarrative.slice(0, -1); // Remove last AI message
                     messageForToast = { title: "Dernier message IA annulé" };
                     return newNarrative;
                }

                messageForToast = { title: "Annulation non applicable", description:"Aucune action utilisateur claire à annuler ou déjà à l'état initial."};
                return prevNarrative;
            });

            setActiveCombat(newActiveCombatState); // Apply potential combat state reset
        });

        if (messageForToast) {
            setTimeout(() => { toast(messageForToast as Parameters<typeof toast>[0]); }, 0);
        }
    }, [activeCombat, toast]); // Dependency on activeCombat is important here

    const handleRegenerateLastResponse = React.useCallback(async () => {
         if (isRegenerating) return;

         let lastAiMessage: Message | undefined;
         let lastUserAction: string | undefined;
         let contextMessages: Message[] = [];
         let lastAiIndex = -1;
         const currentNarrative = [...narrativeMessages]; // Use a copy

         for (let i = currentNarrative.length - 1; i >= 0; i--) {
             const message = currentNarrative[i];
             if (message.type === 'ai' && !lastAiMessage) { // Found the last AI message
                 lastAiMessage = message;
                 lastAiIndex = i;
             } else if (message.type === 'user' && lastAiMessage) { // Found the user action that prompted the last AI message
                 lastUserAction = message.content;
                 const contextEndIndex = i; // Index of the user message
                 // Take the user message and up to 4 preceding messages for context
                 contextMessages = currentNarrative.slice(Math.max(0, contextEndIndex - 4), contextEndIndex + 1);
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

        const {
            world, playerName, relationsMode, rpgMode, playerCurrencyTiers,
            playerClass, playerLevel, playerCurrentHp, playerMaxHp,
            playerCurrentMp, playerMaxMp, playerCurrentExp, playerExpToNextLevel
        } = adventureSettings;

         const narrativeContextForRegen = contextMessages
             .map(msg =>
                 msg.type === 'user' ? `> ${playerName || 'Player'}: ${msg.content}` : msg.content
             ).join('\n\n');

         try {
             const input: GenerateAdventureInput = {
                 world: world,
                 initialSituation: narrativeContextForRegen, // Use the built context
                 characters: characters,
                 userAction: lastUserAction, // The user action that led to the response we're regenerating
                 currentLanguage: currentLanguage,
                 playerName: playerName || "Player",
                 relationsModeActive: relationsMode ?? true,
                 rpgModeActive: rpgMode ?? false,
                 activeCombat: activeCombat,
                 currencyTiers: playerCurrencyTiers,
                 playerClass: playerClass,
                 playerLevel: playerLevel,
                 playerCurrentHp: playerCurrentHp,
                 playerMaxHp: playerMaxHp,
                 playerCurrentMp: playerCurrentMp, playerMaxMp: playerMaxMp,
                 playerCurrentExp: playerCurrentExp,
                 playerExpToNextLevel: playerExpToNextLevel,
             };

             const result = await generateAdventure(input);

            React.startTransition(() => {
                setNarrativeMessages(prev => {
                    const newNarrative = [...prev];
                    const newAiMessage: Message = {
                        id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`, // New ID
                        type: 'ai',
                        content: result.narrative,
                        timestamp: Date.now(),
                        sceneDescription: result.sceneDescriptionForImage,
                        loot: result.itemsObtained,
                        lootTaken: false,
                    };
                    if (lastAiIndex !== -1) {
                        newNarrative.splice(lastAiIndex, 1, newAiMessage); // Replace the old AI message
                    } else {
                        // This case should ideally not happen if we found a lastAiMessage
                        newNarrative.push(newAiMessage);
                    }
                    return newNarrative;
                });

                // Re-apply side effects if needed (though they might be redundant if the AI handles them internally)
                if (result.newCharacters) handleNewCharacters(result.newCharacters);
                if (result.characterUpdates) handleCharacterHistoryUpdate(result.characterUpdates);
                if (adventureSettings.relationsMode && result.affinityUpdates) handleAffinityUpdates(result.affinityUpdates);
                if (adventureSettings.relationsMode && result.relationUpdates) handleRelationUpdatesFromAI(result.relationUpdates);
                if(adventureSettings.rpgMode && result.combatUpdates) {
                    handleCombatUpdates(result.combatUpdates);
                }
                 if (adventureSettings.rpgMode && result.currencyGained && result.currencyGained > 0 && adventureSettings.playerCurrencyTiers) {
                    addCurrencyToPlayer(result.currencyGained);
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
         isRegenerating, narrativeMessages, adventureSettings, characters, currentLanguage, toast,
         handleNewCharacters, handleCharacterHistoryUpdate, handleAffinityUpdates, handleRelationUpdatesFromAI,
         activeCombat, handleCombatUpdates, addCurrencyToPlayer, handleNarrativeUpdate // Added missing handleNarrativeUpdate
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
                // Update the staged character to reflect it's now globally saved
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
        const currentRelationsMode = stagedAdventureSettings.relationsMode ?? true;
        const currentRpgMode = stagedAdventureSettings.rpgMode;
        const currentPlayerName = stagedAdventureSettings.playerName || "Player";

        setStagedCharacters(prevStagedChars => {
            if (prevStagedChars.some(sc => sc.id === globalCharToAdd.id || sc.name.toLowerCase() === globalCharToAdd.name.toLowerCase())) {
                characterWasAdded = false;
                return prevStagedChars;
            }
            characterWasAdded = true;
            const defaultRelation = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
            const newChar = { ...globalCharToAdd }; // Create a new object to avoid mutating the global one

            // Ensure all RPG and relation fields are correctly initialized or stripped based on current modes
            if (currentRelationsMode) {
                newChar.relations = newChar.relations || {}; // Ensure relations object exists
                if (!newChar.relations[PLAYER_ID]) { // Set relation to player if not exists
                    newChar.relations[PLAYER_ID] = defaultRelation;
                }
                // Set relation to other existing staged characters
                prevStagedChars.forEach(existingChar => {
                    if (!newChar.relations![existingChar.id]) {
                        newChar.relations![existingChar.id] = defaultRelation;
                    }
                });
            } else {
                newChar.relations = undefined;
                newChar.affinity = undefined;
            }

            // Update relations of existing characters towards the new character
            const updatedPrevChars = prevStagedChars.map(existingChar => {
                if (currentRelationsMode) {
                    const updatedRelations = { ...(existingChar.relations || {}), [newChar.id]: defaultRelation };
                    return { ...existingChar, relations: updatedRelations };
                }
                return existingChar;
            });

            // Initialize or strip RPG fields
            if (currentRpgMode) {
                newChar.level = newChar.level ?? 1;
                newChar.experience = newChar.experience ?? 0;
                newChar.characterClass = newChar.characterClass ?? '';
                newChar.stats = newChar.stats ?? {};
                newChar.inventory = newChar.inventory ?? {};
                newChar.skills = newChar.skills ?? {};
                newChar.spells = newChar.spells ?? [];
                newChar.techniques = newChar.techniques ?? [];
                newChar.passiveAbilities = newChar.passiveAbilities ?? [];
                newChar.strength = newChar.strength ?? 10;
                newChar.dexterity = newChar.dexterity ?? 10;
                newChar.constitution = newChar.constitution ?? 10;
                newChar.intelligence = newChar.intelligence ?? 10;
                newChar.wisdom = newChar.wisdom ?? 10;
                newChar.charisma = newChar.charisma ?? 10;
                newChar.baseHitPoints = newChar.baseHitPoints ?? 10;
                newChar.hitPoints = newChar.hitPoints ?? newChar.maxHitPoints ?? 10;
                newChar.maxHitPoints = newChar.maxHitPoints ?? 10;
                newChar.manaPoints = newChar.manaPoints ?? newChar.maxManaPoints ?? 0;
                newChar.maxManaPoints = newChar.maxManaPoints ?? 0;
                newChar.armorClass = newChar.armorClass ?? 10;
                newChar.attackBonus = newChar.attackBonus ?? 0;
                newChar.damageBonus = newChar.damageBonus ?? "1";
                newChar.isHostile = newChar.isHostile ?? false;
            } else {
                // Strip RPG fields
                delete newChar.level; delete newChar.experience; delete newChar.characterClass;
                delete newChar.stats; delete newChar.inventory; delete newChar.skills;
                delete newChar.spells; delete newChar.techniques; delete newChar.passiveAbilities;
                delete newChar.strength; delete newChar.dexterity; delete newChar.constitution;
                delete newChar.intelligence; delete newChar.wisdom; delete newChar.charisma;
                delete newChar.baseHitPoints; delete newChar.hitPoints; delete newChar.maxHitPoints;
                delete newChar.manaPoints; delete newChar.maxManaPoints;
                delete newChar.armorClass; delete newChar.attackBonus; delete newChar.damageBonus;
                delete newChar.isHostile;
            }

            return [...updatedPrevChars, newChar];
        });
        setTimeout(() => {
            if (characterWasAdded) {
                toast({ title: "Personnage Ajouté à l'Aventure", description: `${characterNameForToast} a été ajouté aux modifications en attente pour cette aventure. N'oubliez pas d'enregistrer les modifications.` });
            } else {
                toast({ title: "Personnage déjà présent", description: `${characterNameForToast} est déjà dans l'aventure actuelle.`, variant: "default" });
            }
        },0);
    }, [currentLanguage, toast, stagedAdventureSettings.playerName, stagedAdventureSettings.rpgMode, stagedAdventureSettings.relationsMode]);

   const handleSave = React.useCallback(() => {
        const charactersToSave = characters.map(({ ...char }) => char); // Ensure we're saving a clean copy without React internals
        const saveData: SaveData = {
            adventureSettings,
            characters: charactersToSave,
            narrative: narrativeMessages,
            currentLanguage,
            activeCombat: activeCombat,
            saveFormatVersion: 1.6, // Bump version if schema changes significantly
            timestamp: new Date().toISOString(),
        };
        const jsonString = JSON.stringify(saveData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Use adventure name or player name for the file if available
        a.download = `aventurier_textuel_${adventureSettings.playerName || 'aventure'}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setTimeout(() => {
            toast({ title: "Aventure Sauvegardée", description: "Le fichier JSON a été téléchargé." });
        },0);
    }, [adventureSettings, characters, narrativeMessages, currentLanguage, activeCombat, toast]);

    const handleLoad = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonString = e.target?.result as string;
                const loadedData: Partial<SaveData> = JSON.parse(jsonString);

                // Validate core structure
                if (!loadedData.adventureSettings || !loadedData.characters || !loadedData.narrative || !Array.isArray(loadedData.narrative)) {
                    throw new Error("Structure de fichier de sauvegarde invalide ou manquante.");
                }

                // Validate narrative messages structure
                const isValidNarrative = loadedData.narrative.every(msg =>
                    typeof msg === 'object' && msg !== null && typeof msg.id === 'string' &&
                    ['user', 'ai', 'system'].includes(msg.type) && typeof msg.content === 'string' &&
                    typeof msg.timestamp === 'number'
                );
                if (!isValidNarrative) {
                    // Attempt to migrate old string narrative
                    if (typeof loadedData.narrative === 'string') {
                        loadedData.narrative = [{ id: `migrated-${Date.now()}`, type: 'system', content: loadedData.narrative as unknown as string, timestamp: Date.now() }];
                    } else {
                        throw new Error("Structure des messages narratifs invalide.");
                    }
                }

                 // Handle potential schema migrations based on saveFormatVersion
                 if (loadedData.saveFormatVersion === undefined || loadedData.saveFormatVersion < 1.4) {
                     loadedData.characters = loadedData.characters.map(c => ({ ...c, history: Array.isArray(c.history) ? c.history : [], opinion: typeof c.opinion === 'object' && c.opinion !== null ? c.opinion : {}, affinity: c.affinity ?? 50, relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                     loadedData.adventureSettings.playerName = loadedData.adventureSettings.playerName || "Player";
                 }
                 if (loadedData.saveFormatVersion < 1.5) { // Example of another migration step
                       loadedData.adventureSettings.relationsMode = loadedData.adventureSettings.relationsMode ?? true;
                       loadedData.characters = loadedData.characters.map(c => ({ ...c, relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                 }
                  if (loadedData.saveFormatVersion < 1.6) { // Currency system migration
                       loadedData.characters = loadedData.characters.map(c => ({ ...c, relations: typeof c.relations === 'object' && c.relations !== null ? c.relations : { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                       // Ensure currency fields are present or defaulted
                       loadedData.adventureSettings.playerCurrencyTiers = loadedData.adventureSettings.playerCurrencyTiers || baseAdventureSettings.playerCurrencyTiers;
                       loadedData.adventureSettings.currencyLabel = loadedData.adventureSettings.currencyLabel || baseAdventureSettings.currencyLabel;
                 }


                // Deep clone and set base settings to trigger full re-initialization via useEffect
                const rpgModeActive = loadedData.adventureSettings.rpgMode;
                const relationsModeActive = loadedData.adventureSettings.relationsMode ?? true;
                const loadedLang = loadedData.currentLanguage || "fr";
                const defaultRelation = loadedLang === 'fr' ? "Inconnu" : "Unknown";

                const validatedCharacters = loadedData.characters.map((c: any) => { // Use 'any' for loaded data before validation
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
                        id: charId,
                        name: c.name || "Inconnu",
                        details: c.details || "",
                        biographyNotes: c.biographyNotes,
                        history: Array.isArray(c.history) ? c.history : [],
                        opinion: typeof c.opinion === 'object' && c.opinion !== null ? c.opinion : {},
                        portraitUrl: c.portraitUrl || null,
                        affinity: relationsModeActive ? (c.affinity ?? 50) : undefined,
                        relations: relations,
                        _lastSaved: c._lastSaved, // Preserve global save timestamp if present
                        ...(rpgModeActive ? {
                            level: c.level ?? 1,
                            experience: c.experience ?? 0,
                            characterClass: c.characterClass ?? '',
                            stats: typeof c.stats === 'object' && c.stats !== null ? c.stats : {},
                            inventory: typeof c.inventory === 'object' && c.inventory !== null ? c.inventory : {},
                            skills: typeof c.skills === 'object' && c.skills !== null ? c.skills : {},
                            spells: Array.isArray(c.spells) ? c.spells : [],
                            techniques: Array.isArray(c.techniques) ? c.techniques : [],
                            passiveAbilities: Array.isArray(c.passiveAbilities) ? c.passiveAbilities : [],
                            strength: c.strength ?? 10,
                            dexterity: c.dexterity ?? 10,
                            constitution: c.constitution ?? 10,
                            intelligence: c.intelligence ?? 10,
                            wisdom: c.wisdom ?? 10,
                            charisma: c.charisma ?? 10,
                            baseHitPoints: c.baseHitPoints ?? 10,
                            hitPoints: c.hitPoints ?? c.maxHitPoints ?? 10,
                            maxHitPoints: c.maxHitPoints ?? 10,
                            manaPoints: c.manaPoints ?? c.maxManaPoints ?? 0,
                            maxManaPoints: c.maxManaPoints ?? 0,
                            armorClass: c.armorClass ?? 10,
                            attackBonus: c.attackBonus ?? 0,
                            damageBonus: c.damageBonus ?? "1",
                            isHostile: c.isHostile ?? false,
                        } : {}),
                    }
                });

                const finalAdventureSettings: AdventureSettings = {
                    ...baseAdventureSettings, // Start with defaults for any missing fields
                    ...loadedData.adventureSettings,
                    relationsMode: relationsModeActive, // Ensure this is set
                    rpgMode: rpgModeActive, // Ensure this is set
                    // Ensure RPG stats are present if rpgMode is true, otherwise undefined
                    playerCurrentHp: rpgModeActive ? (loadedData.adventureSettings.playerCurrentHp ?? loadedData.adventureSettings.playerMaxHp) : undefined,
                    playerCurrentMp: rpgModeActive ? (loadedData.adventureSettings.playerCurrentMp ?? loadedData.adventureSettings.playerMaxMp) : undefined,
                    playerCurrentExp: rpgModeActive ? (loadedData.adventureSettings.playerCurrentExp ?? 0) : undefined,
                    playerInventory: loadedData.adventureSettings.playerInventory || [],
                    playerCurrencyTiers: loadedData.adventureSettings.playerCurrencyTiers?.map((tier: any) => ({...tier, amount: tier.amount || 0})) || baseAdventureSettings.playerCurrencyTiers,
                    currencyLabel: loadedData.adventureSettings.currencyLabel || baseAdventureSettings.currencyLabel,
                };

                setBaseAdventureSettings(JSON.parse(JSON.stringify(finalAdventureSettings)));
                setBaseCharacters(JSON.parse(JSON.stringify(validatedCharacters)));
                // The useEffect depending on baseAdventureSettings/baseCharacters will handle the rest of the state updates (live, staged, narrative, combat)

                setTimeout(() => {
                    toast({ title: "Aventure Chargée", description: "L'état de l'aventure a été restauré." });
                },0);

            } catch (error: any) {
                console.error("Error loading adventure:", error);
                setTimeout(() => {
                    toast({ title: "Erreur de Chargement", description: `Impossible de lire le fichier JSON: ${error.message}`, variant: "destructive" });
                },0);
            }
        };
        reader.readAsText(file);
        if(event.target) event.target.value = ''; // Reset file input to allow re-uploading same file
    }, [toast, baseAdventureSettings.playerCurrencyTiers, baseAdventureSettings.currencyLabel]); // Added base settings for currency as dependencies


  const confirmRestartAdventure = React.useCallback(() => {
    React.startTransition(() => {
        // Reset to base settings, which will trigger the useEffect for full re-initialization
        setBaseAdventureSettings(prev => JSON.parse(JSON.stringify(prev))); // Force re-trigger of useEffect
        setBaseCharacters(prev => JSON.parse(JSON.stringify(prev)));     // Force re-trigger of useEffect
        setShowRestartConfirm(false);
    });
    setTimeout(() => {
        toast({ title: "Aventure Recommencée", description: "L'histoire a été réinitialisée." });
    },0);
  }, [toast]); // No direct dependencies on live state needed here

  const onRestartAdventure = React.useCallback(() => {
    setShowRestartConfirm(true);
  }, []);

  const handleSettingsUpdate = React.useCallback((newSettingsFromForm: AdventureFormValues) => {
    setStagedAdventureSettings(prevStagedSettings => {
        let calculatedTiers: CurrencyTier[] = [];
        if (newSettingsFromForm.currencyTiers && newSettingsFromForm.currencyTiers.length > 0) {
            let baseValueAccumulator = 1;
            // Iterate from the smallest defined tier (last in form array) upwards
            const reversedFormTiers = [...newSettingsFromForm.currencyTiers].reverse(); // [Cuivre, Argent, Or]
            calculatedTiers = reversedFormTiers.map((formTier, index) => {
                const currentTierValueInBase = baseValueAccumulator;
                if (index < reversedFormTiers.length - 1) { // Don't multiply for the last one (which is the most valuable)
                    baseValueAccumulator *= (formTier.valueInPreviousTier || 100); // How many of THIS tier make ONE of the NEXT LARGER tier
                }
                return {
                    name: formTier.name || `Devise ${reversedFormTiers.length - index}`,
                    valueInBaseTier: currentTierValueInBase,
                    amount: formTier.initialAmount || 0, // Use initialAmount from form
                };
            }).reverse(); // Reverse back to [Or, Argent, Cuivre]
        } else {
             // Fallback if no tiers defined in form - use from base settings or default empty array
             calculatedTiers = prevStagedSettings.playerCurrencyTiers && prevStagedSettings.playerCurrencyTiers.length > 0
                             ? prevStagedSettings.playerCurrencyTiers
                             : baseAdventureSettings.playerCurrencyTiers || [];
        }

        const newSettingsCandidate: AdventureSettings = {
            ...prevStagedSettings, // Preserve existing staged settings like player HP/MP/EXP/Inventory
            world: newSettingsFromForm.world,
            initialSituation: newSettingsFromForm.initialSituation,
            rpgMode: newSettingsFromForm.enableRpgMode ?? false,
            relationsMode: newSettingsFromForm.enableRelationsMode ?? true,
            playerName: newSettingsFromForm.playerName || "Player",

            currencyLabel: newSettingsFromForm.currencyLabel,
            playerCurrencyTiers: calculatedTiers,

            playerClass: newSettingsFromForm.playerClass,
            playerLevel: newSettingsFromForm.playerLevel,
            playerMaxHp: newSettingsFromForm.playerMaxHp,
            playerMaxMp: newSettingsFromForm.playerMaxMp,
            playerExpToNextLevel: newSettingsFromForm.playerExpToNextLevel,

            // Retain player's current stats if RPG mode is active and initialSituation hasn't changed
            playerCurrentHp: (newSettingsFromForm.enableRpgMode ?? false)
                ? (prevStagedSettings.initialSituation === newSettingsFromForm.initialSituation ? prevStagedSettings.playerCurrentHp : newSettingsFromForm.playerMaxHp)
                : undefined,
            playerCurrentMp: (newSettingsFromForm.enableRpgMode ?? false)
                ? (prevStagedSettings.initialSituation === newSettingsFromForm.initialSituation ? prevStagedSettings.playerCurrentMp : newSettingsFromForm.playerMaxMp)
                : undefined,
            playerCurrentExp: (newSettingsFromForm.enableRpgMode ?? false)
                ? (prevStagedSettings.initialSituation === newSettingsFromForm.initialSituation ? prevStagedSettings.playerCurrentExp : 0)
                : undefined,
            playerInventory: (newSettingsFromForm.enableRpgMode ?? false) ? prevStagedSettings.playerInventory || [] : undefined,
        };
        if (JSON.stringify(prevStagedSettings) !== JSON.stringify(newSettingsCandidate)) {
            return newSettingsCandidate;
        }
        return prevStagedSettings;
    });

    setStagedCharacters(prevStagedChars => {
      const defaultRelation = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
      const newRPGMode = newSettingsFromForm.enableRpgMode ?? false;
      const newRelationsMode = newSettingsFromForm.enableRelationsMode ?? true;
      let updatedCharsList: Character[] = newSettingsFromForm.characters.map(formDef => {
        const existingChar = formDef.id
            ? prevStagedChars.find(sc => sc.id === formDef.id)
            // If no ID, try to find by name but only if it's not already an ID-based match from another formDef
            : prevStagedChars.find(sc => sc.name === formDef.name && !newSettingsFromForm.characters.some(otherFormDef => otherFormDef.id === sc.id && otherFormDef.id !== formDef.id && !formDef.id));

        if (existingChar) {
          return {
            ...existingChar,
            name: formDef.name,
            details: formDef.details,
            // Conditionally apply/strip RPG fields
            ...(newRPGMode ? {
                level: existingChar.level || 1, experience: existingChar.experience || 0, characterClass: existingChar.characterClass || '',
                stats: existingChar.stats || {}, inventory: existingChar.inventory || {}, skills: existingChar.skills || {},
                spells: existingChar.spells || [], techniques: existingChar.techniques || [], passiveAbilities: existingChar.passiveAbilities || [],
                strength: existingChar.strength ?? 10, dexterity: existingChar.dexterity ?? 10, constitution: existingChar.constitution ?? 10,
                intelligence: existingChar.intelligence ?? 10, wisdom: existingChar.wisdom ?? 10, charisma: existingChar.charisma ?? 10,
                baseHitPoints: existingChar.baseHitPoints ?? 10,
                hitPoints: existingChar.hitPoints ?? existingChar.maxHitPoints ?? 10, // Keep current HP if already set
                maxHitPoints: existingChar.maxHitPoints ?? 10,
                manaPoints: existingChar.manaPoints ?? existingChar.maxManaPoints ?? 0,
                maxManaPoints: existingChar.maxManaPoints ?? 0,
                armorClass: existingChar.armorClass ?? 10,
                attackBonus: existingChar.attackBonus ?? 0,
                damageBonus: existingChar.damageBonus ?? "1",
                isHostile: existingChar.isHostile ?? false,
            } : {
                level: undefined, experience: undefined, characterClass: undefined, stats: undefined, inventory: undefined, skills: undefined,
                spells: undefined, techniques: undefined, passiveAbilities: undefined, strength: undefined, dexterity: undefined,
                constitution: undefined, intelligence: undefined, wisdom: undefined, charisma: undefined,
                baseHitPoints: undefined, hitPoints: undefined, maxHitPoints: undefined, manaPoints: undefined, maxManaPoints: undefined,
                armorClass: undefined, attackBonus: undefined, damageBonus: undefined, isHostile: undefined,
             }),
             // Conditionally apply/strip Relations fields
             ...(newRelationsMode ? {
                affinity: existingChar.affinity ?? 50,
                relations: existingChar.relations || { [PLAYER_ID]: defaultRelation },
             } : {
                affinity: undefined,
                relations: undefined,
             })
          };
        } else { // New character from the form
          const newId = formDef.id || `${formDef.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          return {
            id: newId, name: formDef.name, details: formDef.details,
            history: [], opinion: {}, portraitUrl: null,
            // Initialize RPG fields if mode is active
             ...(newRPGMode ? {
                level: 1, experience: 0, characterClass: '', stats: {}, inventory: {}, skills: {},
                spells: [], techniques: [], passiveAbilities: [], strength: 10, dexterity: 10,
                constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
                baseHitPoints: 10, hitPoints: 10, maxHitPoints: 10, manaPoints:0, maxManaPoints:0, armorClass: 10,
                attackBonus: 0, damageBonus: "1", isHostile: false,
            } : {}),
            // Initialize Relations fields if mode is active
            ...(newRelationsMode ? {
                affinity: 50,
                relations: { [PLAYER_ID]: defaultRelation },
            } : {})
          };
        }
      });

      // Ensure all characters have relations to each other if relationsMode is active
      if (newRelationsMode) {
          updatedCharsList.forEach(char => {
            char.relations = char.relations || {};
            if (!char.relations[PLAYER_ID]) { // Relation to player
                char.relations[PLAYER_ID] = defaultRelation;
            }
            updatedCharsList.forEach(otherChar => { // Relations to other NPCs
                if (char.id !== otherChar.id) {
                    if (!char.relations![otherChar.id]) {
                        char.relations![otherChar.id] = defaultRelation;
                    }
                }
            });
          });
      }

      if (JSON.stringify(prevStagedChars) !== JSON.stringify(updatedCharsList)) {
          return updatedCharsList;
      }
      return prevStagedChars;
    });
  }, [currentLanguage, baseAdventureSettings.playerCurrencyTiers]);


  const handleApplyStagedChanges = React.useCallback(() => {
    let initialSituationChanged = false;
    setAdventureSettings(prevLiveSettings => {
        initialSituationChanged = stagedAdventureSettings.initialSituation !== prevLiveSettings.initialSituation;
        let newLiveSettings = JSON.parse(JSON.stringify(stagedAdventureSettings)); // Start with a full copy of staged

        // If RPG mode is enabled on the staged settings, ensure player stats are correctly initialized or preserved.
        if (newLiveSettings.rpgMode) {
            if (initialSituationChanged || !prevLiveSettings.rpgMode) { // If situation changed OR RPG was just enabled
                newLiveSettings.playerCurrentHp = newLiveSettings.playerMaxHp;
                newLiveSettings.playerCurrentMp = newLiveSettings.playerMaxMp;
                newLiveSettings.playerCurrentExp = 0;
                newLiveSettings.playerLevel = newLiveSettings.playerLevel || 1; // Default to 1 if not set
                newLiveSettings.playerInventory = newLiveSettings.playerInventory || []; // Default to empty if not set
            } else { // RPG mode was already active and situation didn't change, preserve live stats
                newLiveSettings.playerCurrentHp = prevLiveSettings.playerCurrentHp;
                newLiveSettings.playerCurrentMp = prevLiveSettings.playerCurrentMp;
                newLiveSettings.playerCurrentExp = prevLiveSettings.playerCurrentExp;
                newLiveSettings.playerLevel = prevLiveSettings.playerLevel;
                newLiveSettings.playerInventory = prevLiveSettings.playerInventory;
            }
            // Ensure HP/MP don't exceed max
            newLiveSettings.playerCurrentHp = Math.min(newLiveSettings.playerCurrentHp ?? newLiveSettings.playerMaxHp ?? 0, newLiveSettings.playerMaxHp ?? 0);
            newLiveSettings.playerCurrentMp = Math.min(newLiveSettings.playerCurrentMp ?? newLiveSettings.playerMaxMp ?? 0, newLiveSettings.playerMaxMp ?? 0);

        } else { // RPG mode is disabled on staged settings
            newLiveSettings.playerCurrentHp = undefined;
            newLiveSettings.playerCurrentMp = undefined;
            newLiveSettings.playerCurrentExp = undefined;
            newLiveSettings.playerInventory = undefined;
            // newLiveSettings.playerCurrencyTiers = undefined; // Keep currency even if RPG mode off? Or clear? For now, let's keep it.
            newLiveSettings.playerLevel = undefined;
            newLiveSettings.playerClass = undefined;
            newLiveSettings.playerMaxHp = undefined;
            newLiveSettings.playerMaxMp = undefined;
            newLiveSettings.playerExpToNextLevel = undefined;
        }
        return newLiveSettings;
    });

    if (initialSituationChanged) {
        setNarrativeMessages([{ id: `msg-${Date.now()}`, type: 'system', content: stagedAdventureSettings.initialSituation, timestamp: Date.now() }]);
        setActiveCombat(undefined); // Reset combat if situation changes
    }

    setCharacters(JSON.parse(JSON.stringify(stagedCharacters)));
    // setFormPropKey(k => k + 1); // Removed to rely on AdventureForm's internal useEffect for reset
    setTimeout(() => {
        toast({ title: "Modifications Enregistrées", description: "Les paramètres de l'aventure et des personnages ont été mis à jour." });
    }, 0);
  }, [stagedAdventureSettings, stagedCharacters, toast]);


  const stringifiedStagedCharsForFormMemo = React.useMemo(() => (
    JSON.stringify(stagedCharacters.map(c => ({ id: c.id, name: c.name, details: c.details })))
  ), [stagedCharacters]);

  const memoizedFormCharacters = React.useMemo<FormCharacterDefinition[]>(() => {
    return JSON.parse(stringifiedStagedCharsForFormMemo);
  }, [stringifiedStagedCharsForFormMemo]);


  const memoizedStagedAdventureSettingsForForm = React.useMemo<AdventureFormValues>(() => {
    const formCurrencyTiers = stagedAdventureSettings.playerCurrencyTiers?.map((tier) => {
        // Find the next smaller tier to calculate valueInPreviousTier
        // This logic assumes playerCurrencyTiers is sorted from most valuable to least valuable
        // and the last tier is the base tier (valueInBaseTier = 1).
        let valueInPrev = tier.valueInBaseTier; // Default for the most valuable tier or if it's the base
        const currentIndex = stagedAdventureSettings.playerCurrencyTiers!.findIndex(t => t.name === tier.name);
        if (currentIndex < stagedAdventureSettings.playerCurrencyTiers!.length - 1) { // If not the base tier
            const previousTier = stagedAdventureSettings.playerCurrencyTiers![currentIndex + 1];
            if (previousTier && previousTier.valueInBaseTier !== 0) {
                valueInPrev = tier.valueInBaseTier / previousTier.valueInBaseTier;
            }
        } else if (stagedAdventureSettings.playerCurrencyTiers!.length > 1) { // Is base tier, and there's a tier above it
             const tierAbove = stagedAdventureSettings.playerCurrencyTiers![currentIndex -1];
             if (tierAbove && tier.valueInBaseTier !== 0) {
                 valueInPrev = tierAbove.valueInBaseTier / tier.valueInBaseTier; // How many of base make one of tier above
             }
        }


      return {
        name: tier.name,
        // This is how many of the *previous* (smaller value) tier make one of this tier
        // e.g. if Or=100s, Argent=10c, Cuivre=1c. For Argent, valueInPreviousTier is 10 (10 Cuivre = 1 Argent). For Or, 10 (10 Argent = 1 Or).
        valueInPreviousTier: valueInPrev,
        initialAmount: tier.amount
      };
    }) || [];

    return {
      world: stagedAdventureSettings.world,
      initialSituation: stagedAdventureSettings.initialSituation,
      playerName: stagedAdventureSettings.playerName,
      enableRpgMode: stagedAdventureSettings.rpgMode,
      enableRelationsMode: stagedAdventureSettings.relationsMode ?? true,
      characters: memoizedFormCharacters, // Uses the stabilized version

      currencyLabel: stagedAdventureSettings.currencyLabel,
      currencyTiers: formCurrencyTiers,

      playerClass: stagedAdventureSettings.playerClass,
      playerLevel: stagedAdventureSettings.playerLevel,
      playerMaxHp: stagedAdventureSettings.playerMaxHp,
      playerMaxMp: stagedAdventureSettings.playerMaxMp,
      playerExpToNextLevel: stagedAdventureSettings.playerExpToNextLevel,
    };
  }, [stagedAdventureSettings, memoizedFormCharacters]); // Depends on stagedAdventureSettings and the stabilized form characters

  const callSuggestQuestHook = React.useCallback(async () => {
    React.startTransition(() => {
      setIsSuggestingQuest(true);
    });
    setTimeout(() => {
      toast({ title: "Suggestion de Quête", description: "L'IA réfléchit à une nouvelle accroche..." });
    }, 0);

    const recentMessages = narrativeMessages.slice(-5).map(m => m.type === 'user' ? `${adventureSettings.playerName}: ${m.content}` : m.content).join('\n');
    const involvedCharacterNames = characters.slice(0, 5).map(c => c.name).join(', '); // Limit for brevity

    try {
      const input: SuggestQuestHookInput = {
        worldDescription: adventureSettings.world,
        currentSituation: recentMessages,
        involvedCharacters: involvedCharacterNames,
        language: currentLanguage,
      };
      const result = await suggestQuestHook(input);
      setTimeout(() => {
        toast({
          title: "Suggestion de Quête:",
          description: (
            <div>
              <p className="font-semibold">{result.questHook}</p>
              <p className="text-xs mt-1">({result.justification})</p>
            </div>
          ),
          duration: 9000, // Longer duration for suggestions
        });
      }, 0);
    } catch (error) {
      console.error("Error suggesting quest hook:", error);
      setTimeout(() => {
        toast({ title: "Erreur", description: "Impossible de suggérer une quête.", variant: "destructive" });
      }, 0);
    } finally {
      React.startTransition(() => {
        setIsSuggestingQuest(false);
      });
    }
  }, [narrativeMessages, characters, adventureSettings.world, adventureSettings.playerName, currentLanguage, toast, setIsSuggestingQuest]);


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
        handleRelationUpdate={handleRelationUpdate}
        handleRelationUpdatesFromAI={handleRelationUpdatesFromAI}
        handleSaveNewCharacter={handleSaveNewCharacter}
        handleAddStagedCharacter={handleAddStagedCharacter}
        handleNarrativeUpdate={handleNarrativeUpdate}
        handleSave={handleSave}
        handleLoad={handleLoad}
        setCurrentLanguage={setCurrentLanguage}
        translateTextAction={translateText}
        generateAdventureAction={callGenerateAdventure}
        generateSceneImageAction={generateSceneImage}
        handleEditMessage={handleEditMessage}
        handleRegenerateLastResponse={handleRegenerateLastResponse}
        handleUndoLastMessage={handleUndoLastMessage}
        playerId={PLAYER_ID}
        playerName={adventureSettings.playerName || "Player"}
        onRestartAdventure={onRestartAdventure}
        activeCombat={activeCombat}
        onCombatUpdates={handleCombatUpdates}
        suggestQuestHookAction={callSuggestQuestHook}
        isSuggestingQuest={isSuggestingQuest}
        showRestartConfirm={showRestartConfirm}
        setShowRestartConfirm={setShowRestartConfirm}
        handleTakeLoot={handleTakeLoot}
        handleDiscardLoot={handleDiscardLoot}
        handlePlayerItemAction={handlePlayerItemAction}
      />
      </>
  );
}

