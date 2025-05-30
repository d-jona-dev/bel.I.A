
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { Character, AdventureSettings, SaveData, Message, ActiveCombat, PlayerInventoryItem, LootedItem } from "@/types";
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

export type AdventureFormValues = Omit<AdventureSettings, 'characters' | 'playerCurrentHp' | 'playerCurrentMp' | 'playerCurrentExp' | 'playerInventory' | 'playerGold' | 'playerCurrencyTiers' | 'currencyLabel'> & {
  characters: FormCharacterDefinition[];
  // RPG Player Stats
  playerClass?: string;
  playerLevel?: number;
  playerMaxHp?: number;
  playerMaxMp?: number;
  playerExpToNextLevel?: number;
  // Currency - simplified, gold only, no tiers in form for now
};

export default function Home() {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
    playerGold: 15,
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
  const [formPropKey, setFormPropKey] = React.useState(0); // Used to force re-render of AdventureForm
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = React.useState<boolean>(false);
  const [showRestartConfirm, setShowRestartConfirm] = React.useState<boolean>(false);
  const [isSuggestingQuest, setIsSuggestingQuest] = React.useState<boolean>(false);


  const { toast } = useToast();

  // Effect to reset everything when baseAdventureSettings or baseCharacters change
  React.useEffect(() => {
    const currentBaseAdventureSettings = baseAdventureSettings; // Capture current value
    const initialSettings = JSON.parse(JSON.stringify(currentBaseAdventureSettings));
    const newLiveAdventureSettings: AdventureSettings = {
        ...initialSettings,
        playerCurrentHp: initialSettings.rpgMode ? initialSettings.playerMaxHp : undefined,
        playerCurrentMp: initialSettings.rpgMode ? initialSettings.playerMaxMp : undefined,
        playerCurrentExp: initialSettings.rpgMode ? 0 : undefined,
        playerInventory: initialSettings.playerInventory || [],
        playerGold: initialSettings.playerGold ?? 0,
    };
    const newLiveCharacters = JSON.parse(JSON.stringify(baseCharacters)); // Capture current baseCharacters
    const newNarrative = [{ id: `msg-${Date.now()}`, type: 'system', content: currentBaseAdventureSettings.initialSituation, timestamp: Date.now() }];

    setAdventureSettings(newLiveAdventureSettings);
    setCharacters(newLiveCharacters);
    setNarrativeMessages(newNarrative);
    setActiveCombat(undefined);

    // Also update staged settings and characters to reflect the reset
    setStagedAdventureSettings(JSON.parse(JSON.stringify(newLiveAdventureSettings)));
    setStagedCharacters(JSON.parse(JSON.stringify(newLiveCharacters)));
    setFormPropKey(prev => prev + 1); // Force re-render of AdventureForm with new initial values
  }, [baseAdventureSettings, baseCharacters]);


  // Sync live state to staged state for the form, only if content actually changes
  React.useEffect(() => {
    let propKeyShouldIncrement = false;

    setStagedAdventureSettings(prevStaged => {
      const newLiveSettingsCopy = JSON.parse(JSON.stringify(adventureSettings));
      if (JSON.stringify(prevStaged) !== JSON.stringify(newLiveSettingsCopy)) {
        propKeyShouldIncrement = true;
        return newLiveSettingsCopy;
      }
      return prevStaged;
    });

    setStagedCharacters(prevStaged => {
      const newLiveCharsCopy = JSON.parse(JSON.stringify(characters));
      if (JSON.stringify(prevStaged) !== JSON.stringify(newLiveCharsCopy)) {
        propKeyShouldIncrement = true;
        return newLiveCharsCopy;
      }
      return prevStaged;
    });
    // Removed formPropKey increment from here to break potential update loops
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

   const addCurrencyToPlayer = React.useCallback((amount: number) => {
    setAdventureSettings(prevSettings => {
        if (!prevSettings.rpgMode) return prevSettings;
        const currentGold = prevSettings.playerGold ?? 0;
        let newGold = currentGold + amount;
        if (newGold < 0) newGold = 0; // Prevent negative gold
        return { ...prevSettings, playerGold: newGold };
    });
  }, []);


  const handleCombatUpdates = React.useCallback((combatUpdates: CombatUpdatesSchema) => {
    const toastsToShow: Array<Parameters<typeof toast>[0]> = [];
    setCharacters(prevChars => {
        const currentRpgMode = adventureSettings.rpgMode; // Read from adventureSettings, not staged
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
                    isHostile: combatantUpdate.isDefeated ? char.isHostile : (char.isHostile ?? true), // Keep hostility if not defeated
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
            // Apply player status effects if provided by AI
            // This part is missing but would be: newSettings.playerStatusEffects = playerCombatUpdate.newStatusEffects || newSettings.playerStatusEffects;
            if (playerCombatUpdate.isDefeated) {
                toastsToShow.push({ title: "Joueur Vaincu!", description: "L'aventure pourrait prendre un tournant difficile...", variant: "destructive" });
            }
        }

        // MP Regeneration
        if (newSettings.playerMaxMp && (newSettings.playerMaxMp > 0) && newSettings.playerCurrentMp !== undefined && (newSettings.playerCurrentMp < newSettings.playerMaxMp)) {
             newSettings.playerCurrentMp = Math.min(newSettings.playerMaxMp, (newSettings.playerCurrentMp || 0) + 1);
        }

        // EXP and Level Up
        if (typeof combatUpdates.expGained === 'number' && combatUpdates.expGained > 0 && newSettings.playerCurrentExp !== undefined && newSettings.playerExpToNextLevel !== undefined && newSettings.playerLevel !== undefined) {
            newSettings.playerCurrentExp += combatUpdates.expGained;
             setTimeout(() => { toast({ title: "Expérience Gagnée!", description: `Vous avez gagné ${combatUpdates.expGained} EXP.` }); }, 0);
            while (newSettings.playerCurrentExp >= newSettings.playerExpToNextLevel!) {
                newSettings.playerLevel! += 1;
                newSettings.playerCurrentExp -= newSettings.playerExpToNextLevel!;
                newSettings.playerExpToNextLevel = Math.floor(newSettings.playerExpToNextLevel! * 1.5); // Example EXP curve
                // Increase stats on level up (example)
                newSettings.playerMaxHp = (newSettings.playerMaxHp || 0) + Math.floor(Math.random() * 6) + 2; // e.g., 1d6+1
                newSettings.playerCurrentHp = newSettings.playerMaxHp; // Full heal on level up
                if (newSettings.playerMaxMp && newSettings.playerMaxMp > 0) {
                    newSettings.playerMaxMp = (newSettings.playerMaxMp || 0) + Math.floor(Math.random() * 4) + 1; // e.g., 1d4
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
    // Display all accumulated toasts
    toastsToShow.forEach(toastArgs => setTimeout(() => { toast(toastArgs); }, 0));
  }, [toast, adventureSettings.rpgMode]); // Depend on rpgMode from live settings

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
    const currentRelationsMode = stagedAdventureSettings.relationsMode ?? true; // Use staged settings for consistency within this update cycle
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

                // Toast for significant changes
                if (Math.abs(affinityUpdate.change) >= 3) { // Threshold for "significant"
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
     // Display all accumulated toasts after state update
     toastsToShow.forEach(toastArgs => setTimeout(() => { toast(toastArgs); }, 0));
  }, [toast, stagedAdventureSettings.relationsMode]);


  const handleRelationUpdate = React.useCallback((charId: string, targetId: string, newRelation: string) => {
    const currentRelationsMode = stagedAdventureSettings.relationsMode ?? true; // Use staged here
    if (!currentRelationsMode) return;

    setStagedCharacters(prevChars =>
      prevChars.map(char => {
        if (char.id === charId) {
          const updatedRelations = { ...(char.relations || {}), [targetId]: newRelation };
          return { ...char, relations: updatedRelations };
        }
        // If the target is another NPC, update their relation towards charId too (symmetrical for now)
        if (targetId !== PLAYER_ID && char.id === targetId ) { // Check if current char is the target NPC
            const sourceChar = prevChars.find(c => c.id === charId); // The character initiating the relation update
            if (sourceChar) {
                // This part might need refinement if relations are not always symmetrical.
                // For now, let's assume if A becomes B's "Ami", B also sees A as "Ami".
                // A more complex system could have different perspectives.
                const updatedRelations = { ...(char.relations || {}), [charId]: newRelation }; // char (target) relation towards sourceChar
                return { ...char, relations: updatedRelations };
            }
        }
        return char;
      })
    );
  }, [stagedAdventureSettings.relationsMode]); // Depends on staged relationsMode

  const handleRelationUpdatesFromAI = React.useCallback((updates: RelationUpdateSchema[]) => {
    const currentRelationsMode = stagedAdventureSettings.relationsMode ?? true;
    const currentPlayerName = stagedAdventureSettings.playerName || "Player";
    if (!currentRelationsMode || !updates || updates.length === 0) return;

    const defaultRelationDesc = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
    const toastsToShow: Array<Parameters<typeof toast>[0]> = [];

    setStagedCharacters(prevChars => {
        let charsCopy = JSON.parse(JSON.stringify(prevChars)) as Character[]; // Ensure deep copy and type
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
            // Ensure newRelation is not empty or just "unknown" if a better one can be used.
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
        const currentLiveCharNames = new Set(characters.map(c => c.name.toLowerCase())); // Check against live characters
        const currentStagedCharNamesFromPrev = new Set(prevStagedChars.map(c => c.name.toLowerCase()));
        const charsToAdd: Character[] = [];
        let existingStagedCharsCopy = JSON.parse(JSON.stringify(prevStagedChars)) as Character[];

        newChars.forEach(newCharData => {
            // Add if not in live characters AND not already in the current staged list (to avoid duplicates from multiple AI calls before apply)
            if (!currentLiveCharNames.has(newCharData.name.toLowerCase()) && !currentStagedCharNamesFromPrev.has(newCharData.name.toLowerCase())) {
                const newId = `${newCharData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                const processedRelations: Record<string, string> = {};

                if (currentRelationsMode) {
                    // Initialize relation to player
                    processedRelations[PLAYER_ID] = defaultRelationDesc;
                    // Initialize relation to existing staged characters
                    existingStagedCharsCopy.forEach((ec: Character) => {
                         processedRelations[ec.id] = defaultRelationDesc;
                    });
                    // Override with AI's initial relations if provided
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
                   newCharData.inventory.forEach((item: AIInventoryItem) => { // Explicit type for item
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
                    opinion: {}, portraitUrl: null, // Opinion can be populated later
                    affinity: currentRelationsMode ? 50 : undefined,
                    relations: currentRelationsMode ? processedRelations : undefined,
                    isHostile: currentRpgMode ? newCharData.isHostile : undefined,
                    inventory: currentRpgMode ? processedInventory : undefined,
                    ...(currentRpgMode && { // RPG specific stats
                        level: newCharData.level ?? 1,
                        experience: 0,
                        characterClass: newCharData.characterClass ?? '',
                        stats: {}, skills: {}, // Can be expanded later
                        spells: [], techniques: [], passiveAbilities: [], // Can be expanded later
                        strength: 10, dexterity: 10, // Default base stats
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
        return prevStagedChars;
    });

    if (addedCharacterNames.length > 0) {
        setTimeout(() => {
          toast({
              title: "Nouveau Personnage Rencontré",
              description: `${addedCharacterNames.join(', ')} a été ajouté aux modifications en attente. N'oubliez pas d'enregistrer les modifications pour appliquer.`,
          });
        },0);
    }
  }, [currentLanguage, stagedAdventureSettings.playerName, stagedAdventureSettings.rpgMode, stagedAdventureSettings.relationsMode, toast, characters]); // Added characters to dependency to check against live chars

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
            if (adventureSettings.rpgMode && typeof result.currencyGained === 'number' && result.currencyGained !== 0) {
                const amount = result.currencyGained;
                // Client-side gold check before applying AI's currencyGained from a purchase
                if (amount < 0) { // Indicates a purchase attempt
                    const currentGold = adventureSettings.playerGold ?? 0;
                    if (currentGold + amount < 0) { // Not enough gold (amount is negative)
                         setTimeout(() => {
                            toast({
                                title: "Pas assez d'or!",
                                description: "Vous n'avez pas assez de pièces d'or pour cet achat.",
                                variant: "destructive"
                            });
                        }, 0);
                        // Potentially override AI narrative if it assumed success
                        // For now, the AI is instructed to check conceptually. If it still narrates success, this is a discrepancy.
                        // We are NOT adding the item if gold is insufficient, even if AI included it in itemsObtained.
                        // And we are NOT changing playerGold.
                        // To make this cleaner, the AI should ideally NOT include the item in itemsObtained if it determines the player can't afford it.
                        // OR the client should remove the "purchased" item from result.itemsObtained if it was included by the AI but couldn't be afforded.
                    } else {
                        addCurrencyToPlayer(amount); // Deduct gold
                        setTimeout(() => {
                            toast({
                                title: "Achat Effectué!",
                                description: `Votre trésorerie a été mise à jour.`
                            });
                        }, 0);
                         // Items are already in result.itemsObtained by AI if purchase was deemed possible by AI.
                         // handleNarrativeUpdate already processes result.itemsObtained (which includes purchased items).
                    }
                } else if (amount > 0) { // Direct gold gain (loot, reward)
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
      adventureSettings, // Full object is a dependency here
      characters,      // Full array is a dependency
      currentLanguage,
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

        if (!currentRpgMode) {
            setTimeout(() => {toast({ title: "Mode RPG Désactivé", description: "L'inventaire et l'utilisation d'objets sont désactivés.", variant: "default" });},0);
            return;
        }

        let itemUsedOrDiscarded = false;
        let narrativeAction = "";
        let effectAppliedMessage = "";
        let hpChange = 0;
        let mpChange = 0;

        setAdventureSettings(prevSettings => {
            if (!prevSettings.playerInventory) {
                setTimeout(() => {toast({ title: "Inventaire Vide", description: "Vous n'avez pas d'objets à utiliser ou jeter.", variant: "default" });},0);
                itemUsedOrDiscarded = false;
                return prevSettings;
            }

            let newInventory = [...prevSettings.playerInventory];
            const itemIndex = newInventory.findIndex(invItem => invItem.name === itemName && invItem.quantity > 0);

            if (itemIndex === -1) {
                setTimeout(() => {toast({ title: "Objet Introuvable", description: `Vous n'avez pas de "${itemName}" utilisable ou en quantité suffisante.`, variant: "destructive" });},0);
                itemUsedOrDiscarded = false;
                return prevSettings;
            }

            const itemToUpdate = { ...newInventory[itemIndex] };
            itemUsedOrDiscarded = true;
            let newSettings = { ...prevSettings };

            if (action === 'use') {
                narrativeAction = `J'utilise ${itemToUpdate.name}.`;
                if (itemToUpdate.type === 'consumable') {
                    // Client-side effect application
                    if (itemToUpdate.name.toLowerCase().includes("potion de soin mineure")) hpChange = 10;
                    else if (itemToUpdate.name.toLowerCase().includes("potion de soin")) hpChange = 20;
                    else if (itemToUpdate.name.toLowerCase().includes("potion de mana mineure")) mpChange = 10;
                    else if (itemToUpdate.name.toLowerCase().includes("potion de mana")) mpChange = 20;
                    // Add more specific potion effects here

                    if (hpChange > 0 && newSettings.playerCurrentHp !== undefined && newSettings.playerMaxHp !== undefined) {
                        newSettings.playerCurrentHp = Math.min(newSettings.playerMaxHp, (newSettings.playerCurrentHp || 0) + hpChange);
                    }
                    if (mpChange > 0 && newSettings.playerCurrentMp !== undefined && newSettings.playerMaxMp !== undefined && newSettings.playerMaxMp > 0) {
                        newSettings.playerCurrentMp = Math.min(newSettings.playerMaxMp, (newSettings.playerCurrentMp || 0) + mpChange);
                    }
                    effectAppliedMessage = `${itemToUpdate.name} utilisé. ${hpChange > 0 ? `PV restaurés: ${hpChange}.` : ''} ${mpChange > 0 ? `PM restaurés: ${mpChange}.` : ''}`.trim();
                    newInventory[itemIndex] = { ...itemToUpdate, quantity: itemToUpdate.quantity - 1 };
                } else {
                    setTimeout(() => {toast({ title: "Action non prise en charge", description: `Vous ne pouvez pas "utiliser" ${itemToUpdate?.name} de cette manière.`, variant: "default" });},0);
                    itemUsedOrDiscarded = false;
                    return prevSettings; // Return prevSettings if action is not supported
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
            handleNarrativeUpdate(narrativeAction, 'user'); // Add user's action to narrative

            // Snapshot latest states for AI call, using functional updates if possible for states
            const latestCharacters = characters; // This is fine as characters are usually updated by AI, not directly by item use
            const latestNarrative = [...narrativeMessages, {id: 'temp-user', type: 'user', content: narrativeAction, timestamp: Date.now()}]; // Include current action
            const latestActiveCombat = activeCombat; // Also likely updated by AI

            const currentCharactersSnapshot = JSON.parse(JSON.stringify(latestCharacters));
            const currentNarrativeSnapshot = latestNarrative.slice(-5).map(msg => msg.type === 'user' ? `> ${currentPlayerName}: ${msg.content}` : msg.content).join('\n\n');

            // Get the most up-to-date player stats AFTER the setAdventureSettings in this function has potentially run
            // This is tricky because setAdventureSettings is async.
            // It's better if the AI gets the player stats as they are *before* this specific item use if the effect is client-side only for narrative.
            // If the effect also needs to be server-side (e.g., applying a status effect via AI), then we have a more complex sync issue.
            // For now, assume AI primarily narrates the consequence of the action based on text.
            const inputForAI: GenerateAdventureInput = {
                world: currentWorld,
                initialSituation: currentNarrativeSnapshot,
                characters: currentCharactersSnapshot,
                userAction: narrativeAction,
                currentLanguage: currentLang,
                playerName: currentPlayerName,
                rpgModeActive: currentRpgMode,
                relationsModeActive: currentRelationsMode,
                activeCombat: latestActiveCombat, // Pass combat state
                playerClass: adventureSettings.playerClass,
                playerLevel: adventureSettings.playerLevel,
                playerCurrentHp: adventureSettings.playerCurrentHp, // These will be the values *before* client-side potion effect if applied above for non-combat
                playerMaxHp: adventureSettings.playerMaxHp,
                playerCurrentMp: adventureSettings.playerCurrentMp,
                playerMaxMp: adventureSettings.playerMaxMp,
                playerCurrentExp: adventureSettings.playerCurrentExp,
                playerExpToNextLevel: adventureSettings.playerExpToNextLevel,
                playerGold: adventureSettings.playerGold,
            };
             callGenerateAdventure(inputForAI); // AI narrates the consequence
        }
    });
  }, [
    adventureSettings, // Full object needed for all player stats and inventory logic
    characters, currentLanguage, narrativeMessages, activeCombat,
    callGenerateAdventure, handleNarrativeUpdate, toast
  ]);

    const handleTakeLoot = React.useCallback((messageId: string, itemsToTake: LootedItem[]) => {
        setAdventureSettings(prevSettings => {
            if (!prevSettings.rpgMode) return prevSettings;
            const newInventory = [...(prevSettings.playerInventory || [])];
            itemsToTake.forEach(item => {
                // Ensure all required fields are present and valid, especially itemType
                if (!item.itemName || !item.quantity || !item.itemType) {
                    console.warn("Skipping invalid loot item:", item);
                    return;
                }
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
    }, [toast]); // Removed adventureSettings.rpgMode as it's checked inside

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
        let newActiveCombatState = activeCombat; // Capture current activeCombat

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
                    // If we undo a user action that started combat, we need to reset combat state
                    // This requires checking the AI message *before* the user action being undone.
                    const aiMessageBeforeUserAction = prevNarrative[lastUserIndex -1];
                    if (aiMessageBeforeUserAction?.sceneDescription?.toLowerCase().includes("combat started") ||
                        aiMessageBeforeUserAction?.content.toLowerCase().includes("combat commence")) {
                        newActiveCombatState = undefined; // Reset activeCombat
                    }
                    const newNarrative = prevNarrative.slice(0, lastUserIndex);
                    messageForToast = { title: "Dernier tour annulé" };
                    return newNarrative;
                } else if (prevNarrative.length > 1 && prevNarrative[0]?.type === 'system') {
                     // If no user message to remove, just remove the last AI message (if not the intro)
                     const newNarrative = prevNarrative.slice(0, -1);
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
    }, [activeCombat, toast]); // Added activeCombat to dependencies

    const handleRegenerateLastResponse = React.useCallback(async () => {
         if (isRegenerating || isLoading) return; // Added isLoading check
         let lastAiMessage: Message | undefined;
         let lastUserAction: string | undefined;
         let contextMessages: Message[] = [];
         let lastAiIndex = -1;
         const currentNarrative = [...narrativeMessages]; // Use a copy

         // Find the last AI message and the user action that preceded it
         for (let i = currentNarrative.length - 1; i >= 0; i--) {
             const message = currentNarrative[i];
             if (message.type === 'ai' && !lastAiMessage) {
                 lastAiMessage = message;
                 lastAiIndex = i;
             } else if (message.type === 'user' && lastAiMessage) { // Found AI message, now look for user msg before it
                 lastUserAction = message.content;
                 // Take up to 4 previous messages + the user message for context
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

        // Use the current live adventureSettings and characters state for regeneration
        const {
            world, playerName, relationsMode, rpgMode,
            playerClass, playerLevel, playerCurrentHp, playerMaxHp,
            playerCurrentMp, playerMaxMp, playerCurrentExp, playerExpToNextLevel, playerGold
        } = adventureSettings;

         const narrativeContextForRegen = contextMessages
             .map(msg =>
                 msg.type === 'user' ? `> ${playerName || 'Player'}: ${msg.content}` : msg.content
             ).join('\n\n');

         try {
             const input: GenerateAdventureInput = {
                 world: world,
                 initialSituation: narrativeContextForRegen,
                 characters: characters, // Pass live characters
                 userAction: lastUserAction,
                 currentLanguage: currentLanguage,
                 playerName: playerName || "Player",
                 relationsModeActive: relationsMode ?? true,
                 rpgModeActive: rpgMode ?? false,
                 activeCombat: activeCombat, // Pass current combat state
                 playerClass: playerClass,
                 playerLevel: playerLevel,
                 playerCurrentHp: playerCurrentHp,
                 playerMaxHp: playerMaxHp,
                 playerCurrentMp: playerCurrentMp, playerMaxMp: playerMaxMp,
                 playerCurrentExp: playerCurrentExp,
                 playerExpToNextLevel: playerExpToNextLevel,
                 playerGold: playerGold,
             };

             const result = await generateAdventure(input); // Call the AI

            React.startTransition(() => {
                setNarrativeMessages(prev => {
                    const newNarrative = [...prev];
                    const newAiMessage: Message = {
                        id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                        type: 'ai',
                        content: result.narrative,
                        timestamp: Date.now(),
                        sceneDescription: result.sceneDescriptionForImage,
                        loot: result.itemsObtained, // Include loot if AI provides it
                        lootTaken: false,
                    };
                    if (lastAiIndex !== -1) {
                        newNarrative.splice(lastAiIndex, 1, newAiMessage); // Replace the old AI message
                    } else {
                        newNarrative.push(newAiMessage); // Should not happen if lastAiMessage was found
                    }
                    return newNarrative;
                });

                // Handle side effects from the regenerated response
                if (result.newCharacters) handleNewCharacters(result.newCharacters);
                if (result.characterUpdates) handleCharacterHistoryUpdate(result.characterUpdates);
                if (adventureSettings.relationsMode && result.affinityUpdates) handleAffinityUpdates(result.affinityUpdates);
                if (adventureSettings.relationsMode && result.relationUpdates) handleRelationUpdatesFromAI(result.relationUpdates);
                if(adventureSettings.rpgMode && result.combatUpdates) {
                    // Important: Combat updates from regeneration might desync if not handled carefully.
                    // For now, apply them. Consider if this is always desired for regeneration.
                    handleCombatUpdates(result.combatUpdates);
                }
                 if (adventureSettings.rpgMode && typeof result.currencyGained === 'number' && result.currencyGained !== 0) {
                    // Similar to purchases, validate gold for negative currencyGained if it implies a cost during regeneration
                    const amount = result.currencyGained;
                    if (amount < 0) {
                        const currentGold = adventureSettings.playerGold ?? 0;
                        if (currentGold + amount < 0) {
                            // AI narrated a cost player can't afford on regen. This is tricky.
                            // For now, we might just not apply the gold change and item.
                            // Or, the narrative should be adapted.
                            console.warn("Regeneration suggested a cost the player can't afford.");
                        } else {
                            addCurrencyToPlayer(amount);
                        }
                    } else {
                         addCurrencyToPlayer(amount);
                    }
                    setTimeout(() => {
                        toast({
                            title: amount > 0 ? "Monnaie Reçue (Régén.)!" : "Monnaie Dépensée (Régén.)!",
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
         handleNewCharacters, handleCharacterHistoryUpdate, handleAffinityUpdates,
         handleRelationUpdatesFromAI, activeCombat, handleCombatUpdates, addCurrencyToPlayer, handleNarrativeUpdate
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
                    // Update existing global character
                    existingChars[charIndex] = { ...character, _lastSaved: Date.now() };
                } else {
                    // Add new global character
                    existingChars.push({ ...character, _lastSaved: Date.now() });
                }
                localStorage.setItem('globalCharacters', JSON.stringify(existingChars));
                 setTimeout(() => {
                    toast({ title: "Personnage Sauvegardé Globalement", description: `${character.name} est maintenant disponible pour d'autres aventures et pour le chat.` });
                 },0);
                // Mark character as saved in the current adventure's staged state
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
    }, [toast]); // No complex dependencies here, just toast

    const handleAddStagedCharacter = React.useCallback((globalCharToAdd: Character) => {
        let characterWasAdded = false;
        let characterNameForToast = globalCharToAdd.name;
        const currentRelationsMode = stagedAdventureSettings.relationsMode ?? true;
        const currentRpgMode = stagedAdventureSettings.rpgMode;
        const currentPlayerName = stagedAdventureSettings.playerName || "Player"; // Use staged player name

        setStagedCharacters(prevStagedChars => {
            if (prevStagedChars.some(sc => sc.id === globalCharToAdd.id || sc.name.toLowerCase() === globalCharToAdd.name.toLowerCase())) {
                characterWasAdded = false; // Already in staged list
                return prevStagedChars;
            }
            characterWasAdded = true;
            const defaultRelation = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
            // Create a new character object based on globalCharToAdd to avoid mutating it directly
            // and to ensure it conforms to the current adventure's RPG/Relations settings.
            const newChar: Character = {
                ...globalCharToAdd,
                // Reset/initialize adventure-specific fields if necessary
                history: [`Ajouté à l'aventure depuis les personnages globaux le ${new Date().toLocaleString()}`],
                opinion: {}, // Reset opinions for this adventure
                 _lastSaved: globalCharToAdd._lastSaved, // Keep global save timestamp if exists
            };

            if (currentRelationsMode) {
                newChar.relations = newChar.relations || {};
                if (!newChar.relations[PLAYER_ID]) {
                    newChar.relations[PLAYER_ID] = defaultRelation;
                }
                prevStagedChars.forEach(existingChar => {
                    if (!newChar.relations![existingChar.id]) {
                        newChar.relations![existingChar.id] = defaultRelation;
                    }
                });
                newChar.affinity = newChar.affinity ?? 50;
            } else {
                newChar.relations = undefined;
                newChar.affinity = undefined;
            }

            // Ensure existing characters also have a relation to the new character
            const updatedPrevChars = prevStagedChars.map(existingChar => {
                if (currentRelationsMode) {
                    const updatedRelations = { ...(existingChar.relations || {}), [newChar.id]: defaultRelation };
                    return { ...existingChar, relations: updatedRelations };
                }
                return existingChar;
            });

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
            } else { // Clear RPG stats if RPG mode is off for the adventure
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
        React.startTransition(() => {
            if (characterWasAdded) {
                toast({ title: "Personnage Ajouté à l'Aventure", description: `${characterNameForToast} a été ajouté aux modifications en attente pour cette aventure. N'oubliez pas d'enregistrer les modifications.` });
            } else {
                toast({ title: "Personnage déjà présent", description: `${characterNameForToast} est déjà dans l'aventure actuelle.`, variant: "default" });
            }
        });
    }, [currentLanguage, toast, stagedAdventureSettings.relationsMode, stagedAdventureSettings.rpgMode, stagedAdventureSettings.playerName]);

   const handleSave = React.useCallback(() => {
        // Use the "live" adventureSettings and characters for saving
        const charactersToSave = characters.map(({ ...char }) => char); // Shallow copy to be safe
        const saveData: SaveData = {
            adventureSettings,
            characters: charactersToSave,
            narrative: narrativeMessages,
            currentLanguage,
            activeCombat: activeCombat, // Save current combat state
            saveFormatVersion: 1.6,
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

                // Validate narrative messages structure
                const isValidNarrative = loadedData.narrative.every(msg =>
                    typeof msg === 'object' && msg !== null && typeof msg.id === 'string' &&
                    ['user', 'ai', 'system'].includes(msg.type) && typeof msg.content === 'string' &&
                    typeof msg.timestamp === 'number'
                );
                if (!isValidNarrative) {
                    // Attempt to migrate old string-based narrative if possible
                    if (typeof loadedData.narrative === 'string') {
                        loadedData.narrative = [{ id: `migrated-${Date.now()}`, type: 'system', content: loadedData.narrative as unknown as string, timestamp: Date.now() }];
                    } else {
                        throw new Error("Structure des messages narratifs invalide.");
                    }
                }

                 // Data migration for older save versions
                 if (loadedData.saveFormatVersion === undefined || loadedData.saveFormatVersion < 1.4) {
                     // Add default history, opinion, affinity, relations to characters
                     loadedData.characters = loadedData.characters.map(c => ({ ...c, history: Array.isArray(c.history) ? c.history : [], opinion: typeof c.opinion === 'object' && c.opinion !== null ? c.opinion : {}, affinity: c.affinity ?? 50, relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                     loadedData.adventureSettings.playerName = loadedData.adventureSettings.playerName || "Player";
                 }
                 if (loadedData.saveFormatVersion < 1.5) { // Added relationsMode
                       loadedData.adventureSettings.relationsMode = loadedData.adventureSettings.relationsMode ?? true;
                       loadedData.characters = loadedData.characters.map(c => ({ ...c, relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                 }
                 if (loadedData.saveFormatVersion < 1.6) { // Migrated from currencyTiers to playerGold
                    // Attempt to get gold from old currencyTiers if they exist
                    const oldCurrencyTiers = (loadedData.adventureSettings as any).playerCurrencyTiers;
                    let goldAmount = 0;
                    if (Array.isArray(oldCurrencyTiers)) {
                        const goldTier = oldCurrencyTiers.find((t: any) => t.name?.toLowerCase() === "or" || t.name?.toLowerCase() === "gold");
                        if (goldTier && typeof goldTier.amount === 'number') {
                            goldAmount = goldTier.amount;
                        } else if (oldCurrencyTiers.length > 0 && typeof oldCurrencyTiers[0].amount === 'number') {
                            // Fallback to first tier if "Or" not found, assuming it was the main currency
                            goldAmount = oldCurrencyTiers[0].amount;
                        }
                    }
                    loadedData.adventureSettings.playerGold = goldAmount;
                    delete (loadedData.adventureSettings as any).playerCurrencyTiers;
                    delete (loadedData.adventureSettings as any).currencyLabel;
                 }


                const rpgModeActive = loadedData.adventureSettings.rpgMode;
                const relationsModeActive = loadedData.adventureSettings.relationsMode ?? true; // Default to true if not present
                const loadedLang = loadedData.currentLanguage || "fr";
                const defaultRelation = loadedLang === 'fr' ? "Inconnu" : "Unknown";

                const validatedCharacters = loadedData.characters.map((c: any) => {
                    const charId = c.id || `${c.name?.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                    let relations = relationsModeActive && typeof c.relations === 'object' && c.relations !== null ? c.relations : (relationsModeActive ? { [PLAYER_ID]: defaultRelation } : undefined);

                    if (relationsModeActive && relations && !relations[PLAYER_ID]) {
                        relations[PLAYER_ID] = defaultRelation;
                    }
                    // Ensure existing characters also have relations to each other if not present
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
                        _lastSaved: c._lastSaved, // Preserve global save timestamp
                        // RPG stats, ensuring defaults if not present
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
                    ...baseAdventureSettings, // Start with current base defaults
                    ...loadedData.adventureSettings, // Override with loaded settings
                    relationsMode: relationsModeActive, // Ensure this is set
                    rpgMode: rpgModeActive, // Ensure this is set
                    // Ensure player stats are consistent with RPG mode
                    playerCurrentHp: rpgModeActive ? (loadedData.adventureSettings.playerCurrentHp ?? loadedData.adventureSettings.playerMaxHp) : undefined,
                    playerCurrentMp: rpgModeActive ? (loadedData.adventureSettings.playerCurrentMp ?? loadedData.adventureSettings.playerMaxMp) : undefined,
                    playerCurrentExp: rpgModeActive ? (loadedData.adventureSettings.playerCurrentExp ?? 0) : undefined,
                    playerInventory: loadedData.adventureSettings.playerInventory || [],
                    playerGold: loadedData.adventureSettings.playerGold ?? 0,
                };
                 // Clean up old currency tier fields if they somehow persist
                delete (finalAdventureSettings as any).playerCurrencyTiers;
                delete (finalAdventureSettings as any).currencyLabel;


                // Update base settings which will trigger the useEffect to reset everything
                React.startTransition(() => {
                  setBaseAdventureSettings(JSON.parse(JSON.stringify(finalAdventureSettings)));
                  setBaseCharacters(JSON.parse(JSON.stringify(validatedCharacters)));
                  // The useEffect depending on baseAdventureSettings/baseCharacters will handle the rest
                  // (setting live state, narrative, activeCombat, and formPropKey)
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
        if(event.target) event.target.value = ''; // Reset file input to allow re-uploading same file
    }, [toast, baseAdventureSettings]); // baseAdventureSettings as dependency to ensure defaults are current


  const confirmRestartAdventure = React.useCallback(() => {
    React.startTransition(() => {
        // Re-clone from the original base settings to ensure a true reset
        const initialSettings = JSON.parse(JSON.stringify(baseAdventureSettings)); // Use current baseAdventureSettings
         const newLiveAdventureSettings: AdventureSettings = {
            ...initialSettings,
            playerCurrentHp: initialSettings.rpgMode ? initialSettings.playerMaxHp : undefined,
            playerCurrentMp: initialSettings.rpgMode ? initialSettings.playerMaxMp : undefined,
            playerCurrentExp: initialSettings.rpgMode ? 0 : undefined,
            playerInventory: initialSettings.playerInventory || [], // Keep initial inventory from base
            playerGold: initialSettings.playerGold ?? 0, // Keep initial gold from base
        };
        setAdventureSettings(newLiveAdventureSettings);
        setCharacters(JSON.parse(JSON.stringify(baseCharacters))); // Use current baseCharacters
        setNarrativeMessages([{ id: `msg-${Date.now()}`, type: 'system', content: initialSettings.initialSituation, timestamp: Date.now() }]);
        setActiveCombat(undefined); // Reset combat state

        // Also reset staged settings to match the new live state
        setStagedAdventureSettings(JSON.parse(JSON.stringify(newLiveAdventureSettings)));
        setStagedCharacters(JSON.parse(JSON.stringify(baseCharacters))); // Use current baseCharacters
        setFormPropKey(prev => prev + 1); // Force re-render of AdventureForm with new initial values
        setShowRestartConfirm(false);
    });
     setTimeout(() => {
        toast({ title: "Aventure Recommencée", description: "L'histoire a été réinitialisée." });
    }, 0);
  }, [baseAdventureSettings, baseCharacters, toast]); // Dependencies

  const onRestartAdventure = React.useCallback(() => {
    setShowRestartConfirm(true);
  }, []);

  const handleSettingsUpdate = React.useCallback((newSettingsFromForm: AdventureFormValues) => {
    setStagedAdventureSettings(prevStagedSettings => {
        const newSettingsCandidate: AdventureSettings = {
            ...prevStagedSettings, // Keep existing player stats and inventory
            world: newSettingsFromForm.world,
            initialSituation: newSettingsFromForm.initialSituation,
            rpgMode: newSettingsFromForm.enableRpgMode ?? false,
            relationsMode: newSettingsFromForm.enableRelationsMode ?? true,
            playerName: newSettingsFromForm.playerName || "Player",
            // Player stats from form if RPG mode enabled
            playerClass: (newSettingsFromForm.enableRpgMode ?? false) ? newSettingsFromForm.playerClass : undefined,
            playerLevel: (newSettingsFromForm.enableRpgMode ?? false) ? newSettingsFromForm.playerLevel : undefined,
            playerMaxHp: (newSettingsFromForm.enableRpgMode ?? false) ? newSettingsFromForm.playerMaxHp : undefined,
            playerMaxMp: (newSettingsFromForm.enableRpgMode ?? false) ? newSettingsFromForm.playerMaxMp : undefined,
            playerExpToNextLevel: (newSettingsFromForm.enableRpgMode ?? false) ? newSettingsFromForm.playerExpToNextLevel : undefined,
            // Important: Keep current player stats if initialSituation hasn't changed, or RPG mode status hasn't changed
            // Otherwise, reset them based on new max values or clear them if RPG mode is off.
            playerCurrentHp: (newSettingsFromForm.enableRpgMode ?? false)
                ? (prevStagedSettings.initialSituation === newSettingsFromForm.initialSituation && prevStagedSettings.rpgMode === (newSettingsFromForm.enableRpgMode ?? false)
                    ? prevStagedSettings.playerCurrentHp
                    : newSettingsFromForm.playerMaxHp)
                : undefined,
            playerCurrentMp: (newSettingsFromForm.enableRpgMode ?? false)
                ? (prevStagedSettings.initialSituation === newSettingsFromForm.initialSituation && prevStagedSettings.rpgMode === (newSettingsFromForm.enableRpgMode ?? false)
                    ? prevStagedSettings.playerCurrentMp
                    : newSettingsFromForm.playerMaxMp)
                : undefined,
            playerCurrentExp: (newSettingsFromForm.enableRpgMode ?? false)
                ? (prevStagedSettings.initialSituation === newSettingsFromForm.initialSituation && prevStagedSettings.rpgMode === (newSettingsFromForm.enableRpgMode ?? false)
                    ? prevStagedSettings.playerCurrentExp
                    : 0)
                : undefined,
            playerInventory: (newSettingsFromForm.enableRpgMode ?? false) ? prevStagedSettings.playerInventory || [] : undefined,
            playerGold: (newSettingsFromForm.enableRpgMode ?? false) ? prevStagedSettings.playerGold || 0 : undefined,
        };
         // Ensure HP/MP don't exceed max if they are being kept
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

      // Process character definitions from the form
      let updatedCharsList: Character[] = newSettingsFromForm.characters.map(formDef => {
        const existingChar = formDef.id
            ? prevStagedChars.find(sc => sc.id === formDef.id) // Find by ID if ID exists in formDef
            // If no ID in formDef, try to find by name, but only if no other formDef has this existingChar's ID
            // This handles cases where names might be edited without IDs changing, or new chars added.
            : prevStagedChars.find(sc => sc.name === formDef.name && !newSettingsFromForm.characters.some(otherFormDef => otherFormDef.id === sc.id && otherFormDef.id !== formDef.id && !formDef.id));

        if (existingChar) {
          // Update existing character
          return {
            ...existingChar,
            name: formDef.name, // Name can be updated from form
            details: formDef.details, // Details can be updated from form
            // Conditionally keep or clear RPG/Relations stats based on new global mode
            ...(newRPGMode ? {
                level: existingChar.level || 1, experience: existingChar.experience || 0, characterClass: existingChar.characterClass || '',
                stats: existingChar.stats || {}, inventory: existingChar.inventory || {}, skills: existingChar.skills || {},
                spells: existingChar.spells || [], techniques: existingChar.techniques || [], passiveAbilities: existingChar.passiveAbilities || [],
                strength: existingChar.strength ?? 10, dexterity: existingChar.dexterity ?? 10, constitution: existingChar.constitution ?? 10,
                intelligence: existingChar.intelligence ?? 10, wisdom: existingChar.wisdom ?? 10, charisma: existingChar.charisma ?? 10,
                baseHitPoints: existingChar.baseHitPoints ?? 10,
                hitPoints: existingChar.hitPoints ?? existingChar.maxHitPoints ?? 10,
                maxHitPoints: existingChar.maxHitPoints ?? 10,
                manaPoints: existingChar.manaPoints ?? existingChar.maxManaPoints ?? 0,
                maxManaPoints: existingChar.maxManaPoints ?? 0,
                armorClass: existingChar.armorClass ?? 10,
                attackBonus: existingChar.attackBonus ?? 0,
                damageBonus: existingChar.damageBonus ?? "1",
                isHostile: existingChar.isHostile ?? false,
            } : { // Clear RPG stats if RPG mode is globally off
                level: undefined, experience: undefined, characterClass: undefined, stats: undefined, inventory: undefined, skills: undefined,
                spells: undefined, techniques: undefined, passiveAbilities: undefined, strength: undefined, dexterity: undefined,
                constitution: undefined, intelligence: undefined, wisdom: undefined, charisma: undefined,
                baseHitPoints: undefined, hitPoints: undefined, maxHitPoints: undefined, manaPoints: undefined, maxManaPoints: undefined,
                armorClass: undefined, attackBonus: undefined, damageBonus: undefined, isHostile: undefined,
             }),
             ...(newRelationsMode ? {
                affinity: existingChar.affinity ?? 50,
                relations: existingChar.relations || { [PLAYER_ID]: defaultRelation }, // Initialize relations if missing
             } : { // Clear relations stats if relations mode is globally off
                affinity: undefined,
                relations: undefined,
             })
          };
        } else {
          // Add new character defined in the form
          const newId = formDef.id || `${formDef.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          return {
            id: newId, name: formDef.name, details: formDef.details,
            history: [`Créé via formulaire le ${new Date().toLocaleString()}`], opinion: {}, portraitUrl: null, // Initialize other fields
             ...(newRPGMode ? { // Default RPG stats for new char if mode is on
                level: 1, experience: 0, characterClass: '', stats: {}, inventory: {}, skills: {},
                spells: [], techniques: [], passiveAbilities: [], strength: 10, dexterity: 10,
                constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
                baseHitPoints: 10, hitPoints: 10, maxHitPoints: 10, manaPoints:0, maxManaPoints:0, armorClass: 10,
                attackBonus: 0, damageBonus: "1", isHostile: false,
            } : {}),
            ...(newRelationsMode ? { // Default relations stats for new char if mode is on
                affinity: 50,
                relations: { [PLAYER_ID]: defaultRelation },
            } : {})
          };
        }
      });

      // Ensure all characters (newly added or existing) have relations to each other if relations mode is on
      if (newRelationsMode) {
          updatedCharsList.forEach(char => {
            char.relations = char.relations || {}; // Ensure relations object exists
            if (!char.relations[PLAYER_ID]) { // Ensure relation to player
                char.relations[PLAYER_ID] = defaultRelation;
            }
            updatedCharsList.forEach(otherChar => {
                if (char.id !== otherChar.id) { // Don't relate to self
                    if (!char.relations![otherChar.id]) { // If relation to otherChar doesn't exist
                        char.relations![otherChar.id] = defaultRelation;
                    }
                }
            });
          });
      }

      // Compare with previous staged characters before updating
      if (JSON.stringify(prevStagedChars) !== JSON.stringify(updatedCharsList)) {
          return updatedCharsList;
      }
      return prevStagedChars;
    });
  }, [currentLanguage]); // Removed baseAdventureSettings.playerCurrencyTiers as it's not used here


  const handleApplyStagedChanges = React.useCallback(() => {
    let initialSituationChanged = false;
    setAdventureSettings(prevLiveSettings => {
        // Check if the initial situation from staged settings is different from live settings
        initialSituationChanged = stagedAdventureSettings.initialSituation !== prevLiveSettings.initialSituation;
        let newLiveSettings = JSON.parse(JSON.stringify(stagedAdventureSettings)); // Deep copy from staged

        if (newLiveSettings.rpgMode) {
            // If initial situation changed OR RPG mode was just enabled on live settings from a disabled state
            if (initialSituationChanged || (!prevLiveSettings.rpgMode && newLiveSettings.rpgMode) ) {
                newLiveSettings.playerCurrentHp = newLiveSettings.playerMaxHp;
                newLiveSettings.playerCurrentMp = newLiveSettings.playerMaxMp;
                newLiveSettings.playerCurrentExp = 0;
                // Keep playerLevel, playerInventory, playerGold from staged, as they might have been intentionally set
            } else { // Keep current live RPG stats if situation is the same and RPG mode was already on
                newLiveSettings.playerCurrentHp = prevLiveSettings.playerCurrentHp;
                newLiveSettings.playerCurrentMp = prevLiveSettings.playerCurrentMp;
                newLiveSettings.playerCurrentExp = prevLiveSettings.playerCurrentExp;
                newLiveSettings.playerLevel = prevLiveSettings.playerLevel;
                // playerInventory and playerGold are already part of newLiveSettings from stagedAdventureSettings
            }
             // Ensure HP/MP don't exceed max
            if (newLiveSettings.playerCurrentHp !== undefined && newLiveSettings.playerMaxHp !== undefined) {
                 newLiveSettings.playerCurrentHp = Math.min(newLiveSettings.playerCurrentHp, newLiveSettings.playerMaxHp);
            }
             if (newLiveSettings.playerCurrentMp !== undefined && newLiveSettings.playerMaxMp !== undefined) {
                newLiveSettings.playerCurrentMp = Math.min(newLiveSettings.playerCurrentMp, newLiveSettings.playerMaxMp);
            }
        } else { // RPG Mode is off in new settings
            newLiveSettings.playerClass = undefined;
            newLiveSettings.playerLevel = undefined;
            newLiveSettings.playerMaxHp = undefined;
            newLiveSettings.playerCurrentHp = undefined;
            newLiveSettings.playerMaxMp = undefined;
            newLiveSettings.playerCurrentMp = undefined;
            newLiveSettings.playerExpToNextLevel = undefined;
            newLiveSettings.playerCurrentExp = undefined;
            newLiveSettings.playerInventory = undefined;
            newLiveSettings.playerGold = undefined;
        }
        return newLiveSettings;
    });

    if (initialSituationChanged) {
        // Reset narrative only if the initial situation has changed
        setNarrativeMessages([{ id: `msg-${Date.now()}`, type: 'system', content: stagedAdventureSettings.initialSituation, timestamp: Date.now() }]);
        setActiveCombat(undefined); // Also reset combat if situation changes
    }

    setCharacters(JSON.parse(JSON.stringify(stagedCharacters))); // Apply staged characters to live state
    // formPropKey increment removed, relying on AdventureForm's internal reset via initialValues
    setTimeout(() => {
        toast({ title: "Modifications Enregistrées", description: "Les paramètres de l'aventure et des personnages ont été mis à jour." });
    }, 0);
  }, [stagedAdventureSettings, stagedCharacters, toast]); // Dependencies


  // Mémoïsation de la liste des personnages pour le formulaire
  const stringifiedStagedCharsForFormMemo = React.useMemo(() => (
    JSON.stringify(stagedCharacters.map(c => ({ id: c.id, name: c.name, details: c.details })))
  ), [stagedCharacters]);

  const memoizedFormCharacters = React.useMemo<FormCharacterDefinition[]>(() => {
    return JSON.parse(stringifiedStagedCharsForFormMemo);
  }, [stringifiedStagedCharsForFormMemo]);


  // Mémoïsation des paramètres de l'aventure pour le formulaire
  const memoizedStagedAdventureSettingsForForm = React.useMemo<AdventureFormValues>(() => {
    return {
      world: stagedAdventureSettings.world,
      initialSituation: stagedAdventureSettings.initialSituation,
      playerName: stagedAdventureSettings.playerName,
      enableRpgMode: stagedAdventureSettings.rpgMode,
      enableRelationsMode: stagedAdventureSettings.relationsMode ?? true,
      characters: memoizedFormCharacters, // Utilise la version mémoïsée
      // RPG Player Stats for form
      playerClass: stagedAdventureSettings.playerClass,
      playerLevel: stagedAdventureSettings.playerLevel,
      playerMaxHp: stagedAdventureSettings.playerMaxHp,
      playerMaxMp: stagedAdventureSettings.playerMaxMp,
      playerExpToNextLevel: stagedAdventureSettings.playerExpToNextLevel,
    };
  }, [stagedAdventureSettings, memoizedFormCharacters]); // Dépend de la version mémoïsée des personnages du formulaire

  const callSuggestQuestHook = React.useCallback(async () => {
    React.startTransition(() => {
      setIsSuggestingQuest(true);
    });
    setTimeout(() => {
      toast({ title: "Suggestion de Quête", description: "L'IA réfléchit à une nouvelle accroche..." });
    }, 0);

    // Use live data for quest hook context
    const recentMessages = narrativeMessages.slice(-5).map(m => m.type === 'user' ? `${adventureSettings.playerName}: ${m.content}` : m.content).join('\n');
    const characterNamesForHook = characters.slice(0, 5).map(c => c.name).join(', '); // From live characters

    try {
      const input: SuggestQuestHookInput = {
        worldDescription: adventureSettings.world, // From live settings
        currentSituation: recentMessages,
        involvedCharacters: characterNamesForHook,
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
            duration: 9000, // Longer duration for suggestions
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
  }, [
      narrativeMessages,
      characters, // live characters
      adventureSettings.playerName, // live
      adventureSettings.world,    // live
      currentLanguage,
      toast,
      setIsSuggestingQuest // This setState should be wrapped or stable if it causes issues
  ]);


  return (
    <>
      <PageStructure
        adventureSettings={adventureSettings}
        characters={characters}
        stagedAdventureSettings={memoizedStagedAdventureSettingsForForm} // Pass memoized staged settings
        stagedCharacters={stagedCharacters} // Pass staged characters for sidebar editing
        formPropKey={formPropKey} // Key to force re-render AdventureForm
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
        playerName={adventureSettings.playerName || "Player"} // Use live player name
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
