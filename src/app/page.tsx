
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { Character, AdventureSettings, SaveData, Message, ActiveCombat, PlayerInventoryItem, LootedItem, CurrencyTier } from "@/types";
import { PageStructure } from "./page.structure";

import { generateAdventure } from "@/ai/flows/generate-adventure";
import type { GenerateAdventureInput, GenerateAdventureOutput, CharacterUpdateSchema, AffinityUpdateSchema, RelationUpdateSchema, NewCharacterSchema, CombatUpdatesSchema, CharacterWithContextSummary } from "@/ai/flows/generate-adventure";
import { generateSceneImage } from "@/ai/flows/generate-scene-image";
import type { GenerateSceneImageInput, GenerateSceneImageOutput } from "@/ai/flows/generate-scene-image";
import { translateText } from "@/ai/flows/translate-text";
import type { TranslateTextInput, TranslateTextOutput } from "@/ai/flows/translate-text";
import { suggestQuestHook } from "@/ai/flows/suggest-quest-hook";
import type { SuggestQuestHookInput, SuggestQuestHookOutput } from "@/ai/flows/suggest-quest-hook";
import { Loader2 } from "lucide-react";


const PLAYER_ID = "player";

export type FormCharacterDefinition = { id?: string; name: string; details: string };

// Updated to remove currency tiers from form values, as it's now a fixed "Pièces d'Or" system
export type AdventureFormValues = {
  world: string;
  initialSituation: string;
  characters: FormCharacterDefinition[];
  enableRpgMode?: boolean;
  enableRelationsMode?: boolean;
  playerName?: string;
  playerClass?: string;
  playerLevel?: number;
  playerMaxHp?: number;
  playerMaxMp?: number;
  playerExpToNextLevel?: number;
};


export default function Home() {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [baseAdventureSettings, setBaseAdventureSettings] = React.useState<AdventureSettings>({
    world: "Le village paisible de Bourgenval est niché au bord de la Forêt Murmurante. Récemment, des gobelins plus audacieux qu'à l'accoutumée ont commencé à attaquer les voyageurs et à piller les fermes isolées. Les villageois sont terrifiés.",
    initialSituation: "Vous arrivez à Bourgenval, fatigué par la route. L'Ancienne Elara, la matriarche respectée du village, vous aborde avec un regard inquiet. 'Étranger,' dit-elle, 'votre regard est celui d'un guerrier. Nous avons désespérément besoin d'aide. Les gobelins de la Grotte Grinçante sont devenus une véritable menace. Pourriez-vous nous en débarrasser ?'",
    rpgMode: true,
    relationsMode: true,
    playerName: "Héros",
    playerGold: 15,
    playerClass: "Guerrier",
    playerLevel: 1,
    playerMaxHp: 30,
    playerCurrentHp: 30,
    playerMaxMp: 0,
    playerCurrentMp: 0,
    playerExpToNextLevel: 100,
    playerCurrentExp: 0,
    playerInventory: [
        {name: "Potion de Soin Mineure", quantity: 2, description: "Une fiole rougeâtre qui restaure quelques points de vie.", effect: "Restaure 10 PV", type: "consumable", goldValue: 10},
        {name: "Dague Rouillée", quantity: 1, description: "Une dague simple et usée.", effect: "Arme de base", type: "weapon", goldValue: 2}
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
        inventory: {"Hache Rouillée": 1} // Currency removed from NPC inventory
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
        inventory: {"Dague Courte": 1} // Currency removed from NPC inventory
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

  const [formPropKey, setFormPropKey] = React.useState(0); // Used to force re-render/reset of AdventureForm

  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = React.useState<boolean>(false);
  const [showRestartConfirm, setShowRestartConfirm] = React.useState<boolean>(false);
  const [isSuggestingQuest, setIsSuggestingQuest] = React.useState<boolean>(false);
  const [isGeneratingItemImage, setIsGeneratingItemImage] = React.useState<boolean>(false);

  const { toast } = useToast();


  // Sync live adventureSettings to stagedAdventureSettings
  React.useEffect(() => {
    let shouldIncrementKey = false;
    setStagedAdventureSettings(prevStaged => {
      const newLiveSettingsCopy = JSON.parse(JSON.stringify(adventureSettings));
      if (JSON.stringify(prevStaged) !== JSON.stringify(newLiveSettingsCopy)) {
        shouldIncrementKey = true;
        return newLiveSettingsCopy;
      }
      return prevStaged;
    });
    if (shouldIncrementKey) {
      // setFormPropKey(k => k + 1); // Temporarily removed to fight render loop
    }
  }, [adventureSettings]);

  // Sync live characters to stagedCharacters
  React.useEffect(() => {
    let shouldIncrementKey = false;
    setStagedCharacters(prevStaged => {
      const newLiveCharsCopy = JSON.parse(JSON.stringify(characters));
      if (JSON.stringify(prevStaged) !== JSON.stringify(newLiveCharsCopy)) {
        shouldIncrementKey = true;
        return newLiveCharsCopy;
      }
      return prevStaged;
    });
    if (shouldIncrementKey) {
      // setFormPropKey(k => k + 1); // Temporarily removed to fight render loop
    }
  }, [characters]);


  const handleNarrativeUpdate = React.useCallback((content: string, type: 'user' | 'ai', sceneDesc?: string, lootItems?: LootedItem[]) => {
       const newMessage: Message = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            type: type,
            content: content,
            timestamp: Date.now(),
            sceneDescription: type === 'ai' ? sceneDesc : undefined,
            loot: type === 'ai' && lootItems && lootItems.length > 0 ? lootItems : undefined,
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
                    isHostile: combatantUpdate.isDefeated ? char.isHostile : (char.isHostile ?? true), // Keep hostility if not defeated
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
                toastsToShow.push({ title: "Joueur Vaincu!", description: "L'aventure pourrait prendre un tournant difficile...", variant: "destructive" });
            }
        }

        // MP Regeneration (1 MP per turn if MP is used and below max)
        if (newSettings.playerMaxMp && (newSettings.playerMaxMp > 0) && newSettings.playerCurrentMp !== undefined && (newSettings.playerCurrentMp < newSettings.playerMaxMp)) {
             newSettings.playerCurrentMp = Math.min(newSettings.playerMaxMp, (newSettings.playerCurrentMp || 0) + 1);
        }

        // EXP Gain and Level Up
        if (typeof combatUpdates.expGained === 'number' && combatUpdates.expGained > 0 && newSettings.playerCurrentExp !== undefined && newSettings.playerExpToNextLevel !== undefined && newSettings.playerLevel !== undefined) {
            newSettings.playerCurrentExp += combatUpdates.expGained;
            setTimeout(() => { toast({ title: "Expérience Gagnée!", description: `Vous avez gagné ${combatUpdates.expGained} EXP.` }); }, 0);
            while (newSettings.playerCurrentExp >= newSettings.playerExpToNextLevel!) {
                newSettings.playerLevel! += 1;
                newSettings.playerCurrentExp -= newSettings.playerExpToNextLevel!;
                newSettings.playerExpToNextLevel = Math.floor(newSettings.playerExpToNextLevel! * 1.5); // Example EXP curve
                // Increase max HP/MP on level up
                newSettings.playerMaxHp = (newSettings.playerMaxHp || 0) + Math.floor(Math.random() * 6) + 2; // Example: d6+2 HP
                newSettings.playerCurrentHp = newSettings.playerMaxHp; // Heal to full on level up
                if (newSettings.playerMaxMp && newSettings.playerMaxMp > 0) {
                    newSettings.playerMaxMp = (newSettings.playerMaxMp || 0) + Math.floor(Math.random() * 4) + 1; // Example: d4+1 MP
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
  }, [toast, adventureSettings.rpgMode]);

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
                    history: [...(char.history || []), ...newHistory].slice(-20), // Keep last 20 history items
                };
            }
            return char;
        });
        if (changed) return updatedChars;
        return prevChars;
    });
  }, []);

  const handleAffinityUpdates = React.useCallback((updates: AffinityUpdateSchema[]) => {
    const currentRelationsMode = stagedAdventureSettings.relationsMode ?? true; // Get from staged, which reflects form
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

                if (Math.abs(affinityUpdate.change) >= 3) { // Threshold for significant change toast
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
        // If PNJ-PNJ relation, update the other character's perspective too (symmetrically for simplicity here)
        // More complex AI logic could make this asymmetric if needed.
        if (targetId !== PLAYER_ID && char.id === targetId ) { // Check if this 'char' is the target of the update
            const sourceChar = prevChars.find(c => c.id === charId);
            if (sourceChar) { // Ensure source character exists
                // Update this char's relation towards sourceChar
                const updatedRelations = { ...(char.relations || {}), [charId]: newRelation };
                return { ...char, relations: updatedRelations };
            }
        }
        return char;
      })
    );
  }, [stagedAdventureSettings.relationsMode, currentLanguage]); // Added currentLanguage as it's used in default relation text

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
            if (sourceCharIndex === -1) return; // Source character not found in staged characters

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
            // Normalize "unknown" from AI to default description for comparison and storage
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

                // Symmetrically update the target's relation towards the source if it's an NPC-NPC relation
                if (targetId !== PLAYER_ID) {
                    const targetCharIndex = charsCopy.findIndex(c => c.id === targetId);
                    if (targetCharIndex !== -1) {
                        if (!charsCopy[targetCharIndex].relations) {
                           charsCopy[targetCharIndex].relations = {};
                        }
                         // Use the same newRelationFromAI for symmetry, or AI could specify reciprocal if needed.
                         charsCopy[targetCharIndex].relations![charsCopy[sourceCharIndex].id] = newRelationFromAI;
                    }
                }
            }
        });

        if (changed) return charsCopy;
        return prevChars;
    });
     toastsToShow.forEach(toastArgs => setTimeout(() => { toast(toastArgs); }, 0));
  }, [currentLanguage, stagedAdventureSettings.playerName, toast, stagedAdventureSettings.relationsMode]);


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
            // Handle currency gain/loss
            if (adventureSettings.rpgMode && typeof result.currencyGained === 'number' && result.currencyGained !== 0 && adventureSettings.playerGold !== undefined) {
                const amount = result.currencyGained;
                 if (amount < 0) { // Player tried to spend gold (e.g., an AI-narrated purchase)
                    const currentGold = adventureSettings.playerGold ?? 0;
                    if (currentGold + amount < 0) { // Not enough gold
                         setTimeout(() => {
                            toast({
                                title: "Pas assez de Pièces d'Or!",
                                description: "L'IA a suggéré une dépense que vous ne pouvez pas couvrir. La transaction a été annulée.",
                                variant: "destructive"
                            });
                        }, 0);
                        // Do not add items if purchase failed and do not change currencyGained.
                        // The AI's narrative should ideally reflect this failure too.
                    } else {
                        // Purchase is valid based on client-side gold check
                        addCurrencyToPlayer(amount);
                        if (result.itemsObtained && result.itemsObtained.length > 0) {
                           setAdventureSettings(prev => {
                                const newInventory = [...(prev.playerInventory || [])];
                                result.itemsObtained!.forEach(item => {
                                    const existingItemIndex = newInventory.findIndex(invItem => invItem.name === item.itemName);
                                    if (existingItemIndex > -1) {
                                        newInventory[existingItemIndex].quantity += item.quantity;
                                    } else {
                                        newInventory.push({ ...item });
                                    }
                                });
                                return { ...prev, playerInventory: newInventory };
                            });
                        }
                        setTimeout(() => {
                            toast({
                                title: "Transaction Effectuée",
                                description: `Votre trésorerie a été mise à jour (Dépense: ${-amount} Pièces d'Or).`
                            });
                        }, 0);
                    }
                } else if (amount > 0) { // Gained currency
                    addCurrencyToPlayer(amount);
                    setTimeout(() => {
                        toast({
                            title: "Monnaie Reçue !",
                            description: `Votre trésorerie a été mise à jour (Gain: ${amount} Pièces d'Or).`
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
      adventureSettings, // Live settings are used to construct the AI call
      characters,      // Live characters are used
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

        let itemActionSuccessful = false;
        let narrativeAction = "";
        let effectAppliedMessage = "";
        let hpChange = 0;
        let mpChange = 0;

        setAdventureSettings(prevSettings => {
            if (!currentRpgMode || !prevSettings.playerInventory) {
                 setTimeout(() => {toast({ title: action === 'use' ? "Utilisation Impossible" : "Action Impossible", description: "Le mode RPG doit être actif et vous devez avoir des objets.", variant: "default" });},0);
                itemActionSuccessful = false;
                return prevSettings;
            }

            let newInventory = [...prevSettings.playerInventory];
            const itemIndex = newInventory.findIndex(invItem => invItem.name === itemName && invItem.quantity > 0);

            if (itemIndex === -1) {
                 setTimeout(() => {toast({ title: "Objet Introuvable", description: `Vous n'avez pas de "${itemName}" ${action === 'use' ? 'utilisable' : ''} ou en quantité suffisante.`, variant: "destructive" });},0);
                itemActionSuccessful = false;
                return prevSettings;
            }

            const itemToUpdate = { ...newInventory[itemIndex] };
            itemActionSuccessful = true;
            let newSettings = { ...prevSettings };

            if (action === 'use') {
                narrativeAction = `J'utilise ${itemToUpdate.name}.`;
                if (itemToUpdate.type === 'consumable') {
                    // Basic effect parsing from item.effect string
                    if (itemToUpdate.effect?.toLowerCase().includes("restaure") && itemToUpdate.effect?.toLowerCase().includes("pv")) {
                        const match = itemToUpdate.effect.match(/(\d+)\s*PV/i);
                        if (match && match[1]) hpChange = parseInt(match[1], 10);
                    }
                    if (itemToUpdate.effect?.toLowerCase().includes("restaure") && itemToUpdate.effect?.toLowerCase().includes("pm")) {
                        const match = itemToUpdate.effect.match(/(\d+)\s*PM/i);
                        if (match && match[1]) mpChange = parseInt(match[1], 10);
                    }

                    // Apply effects directly if not in combat (or if AI won't handle it in combatUpdates for player)
                    if (!activeCombat?.isActive) {
                        if (hpChange > 0 && newSettings.playerCurrentHp !== undefined && newSettings.playerMaxHp !== undefined) {
                            newSettings.playerCurrentHp = Math.min(newSettings.playerMaxHp, (newSettings.playerCurrentHp || 0) + hpChange);
                        }
                        if (mpChange > 0 && newSettings.playerCurrentMp !== undefined && newSettings.playerMaxMp !== undefined && newSettings.playerMaxMp > 0) {
                            newSettings.playerCurrentMp = Math.min(newSettings.playerMaxMp, (newSettings.playerCurrentMp || 0) + mpChange);
                        }
                    } // In combat, AI will handle the effect via combatUpdates for the player based on the userAction.

                    effectAppliedMessage = `${itemToUpdate.name} utilisé. ${hpChange > 0 ? `PV restaurés: ${hpChange}.` : ''} ${mpChange > 0 ? `PM restaurés: ${mpChange}.` : ''}`.trim();
                    newInventory[itemIndex] = { ...itemToUpdate, quantity: itemToUpdate.quantity - 1 };
                } else {
                     setTimeout(() => {toast({ title: "Action non prise en charge", description: `Vous ne pouvez pas "utiliser" ${itemToUpdate?.name} de cette manière (seulement les consommables).`, variant: "default" });},0);
                    itemActionSuccessful = false;
                    return prevSettings; // No change if action is not supported
                }
            } else if (action === 'discard') {
                narrativeAction = `Je jette ${itemToUpdate.name}.`;
                newInventory[itemIndex] = { ...itemToUpdate, quantity: itemToUpdate.quantity - 1 };
                effectAppliedMessage = `${itemToUpdate.name} a été jeté.`;
            }

            if (newInventory[itemIndex].quantity <= 0) {
                newInventory.splice(itemIndex, 1); // Remove item if quantity is zero
            }
            newSettings.playerInventory = newInventory;
            return newSettings;
        });

        if (itemActionSuccessful && narrativeAction) {
            if(effectAppliedMessage) {
                 setTimeout(() => { toast({ title: "Action d'Objet", description: effectAppliedMessage }); }, 0);
            }
            handleNarrativeUpdate(narrativeAction, 'user');

            const latestCharactersSnapshot = JSON.parse(JSON.stringify(characters));
            const latestNarrativeSnapshot = [...narrativeMessages, {id: 'temp-user', type: 'user', content: narrativeAction, timestamp: Date.now()}].slice(-5).map(msg => msg.type === 'user' ? `> ${currentPlayerName}: ${msg.content}` : msg.content).join('\n\n');
            const latestActiveCombatSnapshot = activeCombat ? JSON.parse(JSON.stringify(activeCombat)) : undefined;

            const settingsForAICall = JSON.parse(JSON.stringify(adventureSettings)); // Use latest adventureSettings

            const inputForAI: GenerateAdventureInput = {
                world: currentWorld,
                initialSituation: latestNarrativeSnapshot,
                characters: latestCharactersSnapshot,
                userAction: narrativeAction,
                currentLanguage: currentLang,
                playerName: currentPlayerName,
                rpgModeActive: currentRpgMode,
                relationsModeActive: currentRelationsMode,
                activeCombat: latestActiveCombatSnapshot,
                playerGold: settingsForAICall.playerGold,
                playerClass: settingsForAICall.playerClass,
                playerLevel: settingsForAICall.playerLevel,
                playerCurrentHp: settingsForAICall.playerCurrentHp, // Pass the HP *after* potential client-side potion use
                playerMaxHp: settingsForAICall.playerMaxHp,
                playerCurrentMp: settingsForAICall.playerCurrentMp, // Pass the MP *after* potential client-side potion use
                playerMaxMp: settingsForAICall.playerMaxMp,
                playerCurrentExp: settingsForAICall.playerCurrentExp,
                playerExpToNextLevel: settingsForAICall.playerExpToNextLevel,
            };
             callGenerateAdventure(inputForAI);
        }
    });
  }, [
    adventureSettings, characters, currentLanguage, narrativeMessages, activeCombat,
    callGenerateAdventure, handleNarrativeUpdate, toast
  ]);

  const handleSellItem = React.useCallback((itemName: string) => {
    React.startTransition(() => {
        let itemSoldSuccessfully = false;
        let sellPrice = 0;
        let userAction = "";
        let itemToSellName = "";

        setAdventureSettings(prevSettings => {
            if (!prevSettings.rpgMode || !prevSettings.playerInventory) {
                setTimeout(() => {
                    toast({ title: "Vente Impossible", description: "Le mode RPG doit être actif et vous devez avoir des objets.", variant: "default" });
                }, 0);
                return prevSettings;
            }

            const itemIndex = prevSettings.playerInventory.findIndex(invItem => invItem.name === itemName && invItem.quantity > 0);
            if (itemIndex === -1) {
                setTimeout(() => {
                    toast({ title: "Objet Introuvable", description: `Vous n'avez pas de "${itemName}" à vendre.`, variant: "destructive" });
                }, 0);
                return prevSettings;
            }

            const itemToSell = { ...prevSettings.playerInventory[itemIndex] };
            itemToSellName = itemToSell.name;

            if (!itemToSell.goldValue || itemToSell.goldValue <= 0) {
                setTimeout(() => {
                    toast({ title: "Invendable", description: `"${itemToSellName}" n'a pas de valeur marchande.`, variant: "default" });
                }, 0);
                return prevSettings;
            }

            sellPrice = Math.floor(itemToSell.goldValue / 2); // Typically sell for half price
            if (sellPrice <= 0) sellPrice = 1; // Ensure at least 1 gold if it has value

            const newInventory = [...prevSettings.playerInventory];
            newInventory[itemIndex] = { ...itemToSell, quantity: itemToSell.quantity - 1 };
            if (newInventory[itemIndex].quantity <= 0) {
                newInventory.splice(itemIndex, 1);
            }

            itemSoldSuccessfully = true;
            userAction = `Je vends ${itemToSellName}.`;

            return {
                ...prevSettings,
                playerInventory: newInventory,
                playerGold: (prevSettings.playerGold ?? 0) + sellPrice, // Add gold directly here
            };
        });

        if (itemSoldSuccessfully) {
            setTimeout(() => {
                toast({ title: "Objet Vendu!", description: `Vous avez vendu ${itemToSellName} pour ${sellPrice} pièces d'or.` });
            }, 0);

            handleNarrativeUpdate(userAction, 'user');

            // Prepare context for AI to narrate the sale
            const latestCharactersSnapshot = JSON.parse(JSON.stringify(characters));
            const latestNarrativeSnapshot = [...narrativeMessages, {id: 'temp-user', type: 'user', content: userAction, timestamp: Date.now()}].slice(-5).map(msg => msg.type === 'user' ? `> ${adventureSettings.playerName || 'Player'}: ${msg.content}` : msg.content).join('\n\n');
            const latestActiveCombatSnapshot = activeCombat ? JSON.parse(JSON.stringify(activeCombat)) : undefined;
            const settingsForAICall = JSON.parse(JSON.stringify(adventureSettings));


            const inputForAI: GenerateAdventureInput = {
                world: settingsForAICall.world,
                initialSituation: latestNarrativeSnapshot,
                characters: latestCharactersSnapshot,
                userAction: userAction, // "Je vends X"
                currentLanguage: currentLanguage,
                playerName: settingsForAICall.playerName || "Player",
                rpgModeActive: settingsForAICall.rpgMode,
                relationsModeActive: settingsForAICall.relationsMode ?? true,
                activeCombat: latestActiveCombatSnapshot,
                playerGold: settingsForAICall.playerGold, // IA uses gold *before* client-side update for its narrative context
                playerClass: settingsForAICall.playerClass,
                playerLevel: settingsForAICall.playerLevel,
                playerCurrentHp: settingsForAICall.playerCurrentHp,
                playerMaxHp: settingsForAICall.playerMaxHp,
                playerCurrentMp: settingsForAICall.playerCurrentMp,
                playerMaxMp: settingsForAICall.playerMaxMp,
                playerCurrentExp: settingsForAICall.playerCurrentExp,
                playerExpToNextLevel: settingsForAICall.playerExpToNextLevel,
            };
            callGenerateAdventure(inputForAI);
        }
    });
  }, [
    adventureSettings, characters, currentLanguage, narrativeMessages, activeCombat,
    addCurrencyToPlayer, handleNarrativeUpdate, callGenerateAdventure, toast // addCurrencyToPlayer is not directly used but related to gold
  ]);


    const handleTakeLoot = React.useCallback((messageId: string, itemsToTake: LootedItem[]) => {
        React.startTransition(() => {
            setAdventureSettings(prevSettings => {
                if (!prevSettings.rpgMode) return prevSettings;
                const newInventory = [...(prevSettings.playerInventory || [])];
                itemsToTake.forEach(item => {
                    if (!item.itemName || !item.quantity || !item.itemType) {
                        console.warn("Skipping invalid loot item:", item);
                        return;
                    }
                    const existingItemIndex = newInventory.findIndex(invItem => invItem.name === item.itemName);
                    if (existingItemIndex > -1) {
                        newInventory[existingItemIndex].quantity += item.quantity;
                    } else {
                        // Convert LootedItem to PlayerInventoryItem
                        newInventory.push({
                            name: item.itemName,
                            quantity: item.quantity,
                            description: item.description,
                            effect: item.effect,
                            type: item.itemType,
                            goldValue: item.goldValue, // Ensure goldValue is passed
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
                    // Check if combat was initiated by the AI message right before the user's last action
                    const aiMessageBeforeUserAction = prevNarrative[lastUserIndex -1];
                    if (aiMessageBeforeUserAction?.sceneDescription?.toLowerCase().includes("combat started") ||
                        aiMessageBeforeUserAction?.content.toLowerCase().includes("combat commence")) {
                        newActiveCombatState = undefined; // Reset combat state
                    }
                    const newNarrative = prevNarrative.slice(0, lastUserIndex); // Remove user action and AI response(s) after it
                    messageForToast = { title: "Dernier tour annulé" };
                    return newNarrative;
                } else if (prevNarrative.length > 1 && prevNarrative[0]?.type === 'system') { // Only AI messages left after system intro
                     const newNarrative = prevNarrative.slice(0, -1); // Remove last AI message
                     messageForToast = { title: "Dernier message IA annulé" };
                     return newNarrative;
                }
                messageForToast = { title: "Annulation non applicable", description:"Aucune action utilisateur claire à annuler ou déjà à l'état initial."};
                return prevNarrative;
            });
            setActiveCombat(newActiveCombatState); // Update combat state after narrative messages
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
             } else if (message.type === 'user' && lastAiMessage) { // Ensure we found an AI message before looking for user action
                 lastUserAction = message.content;
                 contextMessages = currentNarrative.slice(Math.max(0, i - 4), i + 1); // Context before and including user action
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

        // Use live adventureSettings and characters for the AI call
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
                 playerGold: playerGold,
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
                        id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
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
                        newNarrative.push(newAiMessage); // Should not happen if lastAiMessage was found
                    }
                    return newNarrative;
                });

                // Apply other updates from the regenerated response
                if (result.newCharacters) handleNewCharacters(result.newCharacters);
                if (result.characterUpdates) handleCharacterHistoryUpdate(result.characterUpdates);
                if (adventureSettings.relationsMode && result.affinityUpdates) handleAffinityUpdates(result.affinityUpdates);
                if (adventureSettings.relationsMode && result.relationUpdates) handleRelationUpdatesFromAI(result.relationUpdates);
                if(adventureSettings.rpgMode && result.combatUpdates) {
                    // Important: Combat updates might reset HP/MP or other stats,
                    // so these should be applied carefully if the regeneration is for a non-combat turn.
                    // For simplicity now, we apply them.
                    handleCombatUpdates(result.combatUpdates);
                }
                 if (adventureSettings.rpgMode && typeof result.currencyGained === 'number' && result.currencyGained !== 0 && adventureSettings.playerGold !== undefined) {
                    const amount = result.currencyGained;
                    // Handle currency with client-side validation if it's a cost
                    if (amount < 0) {
                        const currentGold = adventureSettings.playerGold ?? 0;
                        if (currentGold + amount < 0) {
                            // This case should be handled by AI not suggesting unaffordable actions,
                            // or client-side pre-check if it were a direct player purchase from UI.
                            // For regeneration, it's complex. For now, let's assume AI provides valid currency changes.
                        } else {
                            addCurrencyToPlayer(amount);
                            if (result.itemsObtained && result.itemsObtained.length > 0) { // Items associated with the cost
                                setAdventureSettings(prev => {
                                    const newInventory = [...(prev.playerInventory || [])];
                                    result.itemsObtained!.forEach(item => {
                                        const existingItemIndex = newInventory.findIndex(invItem => invItem.name === item.itemName);
                                        if (existingItemIndex > -1) {
                                            newInventory[existingItemIndex].quantity += item.quantity;
                                        } else {
                                            newInventory.push({ ...item });
                                        }
                                    });
                                    return { ...prev, playerInventory: newInventory };
                                });
                            }
                        }
                    } else { // Gained currency
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
         handleNarrativeUpdate, // Added missing handleNarrativeUpdate
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
                // Update the character in stagedCharacters to reflect it's now saved
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

        React.startTransition(() => {
            setStagedCharacters(prevStagedChars => {
                // Check if character with same ID or Name already exists in staged characters
                if (prevStagedChars.some(sc => sc.id === globalCharToAdd.id || sc.name.toLowerCase() === globalCharToAdd.name.toLowerCase())) {
                    characterWasAdded = false;
                    return prevStagedChars;
                }
                characterWasAdded = true;
                const defaultRelation = currentLanguage === 'fr' ? "Inconnu" : "Unknown";

                // Prepare the new character to be added to the adventure
                const newChar: Character = {
                    ...globalCharToAdd, // Spread all properties from the global character
                    history: [`Ajouté à l'aventure depuis les personnages globaux le ${new Date().toLocaleString()}`],
                    // _lastSaved is already part of globalCharToAdd if it was saved
                };

                // Adjust relations based on current adventure settings and characters
                if (currentRelationsMode) {
                    newChar.relations = newChar.relations || {}; // Ensure relations object exists
                    // Relation to player
                    if (!newChar.relations[PLAYER_ID]) {
                        newChar.relations[PLAYER_ID] = defaultRelation;
                    }
                    // Relations to other existing staged characters
                    prevStagedChars.forEach(existingChar => {
                        if (!newChar.relations![existingChar.id]) { // newChar's relation to existingChar
                            newChar.relations![existingChar.id] = defaultRelation;
                        }
                    });
                    newChar.affinity = newChar.affinity ?? 50; // Default affinity if not set
                } else {
                    // If relations mode is off, clear these fields
                    newChar.relations = undefined;
                    newChar.affinity = undefined;
                }

                // Update existing characters to include relations to the new character
                const updatedPrevChars = prevStagedChars.map(existingChar => {
                    if (currentRelationsMode) {
                        const updatedRelations = { ...(existingChar.relations || {}), [newChar.id]: defaultRelation };
                        return { ...existingChar, relations: updatedRelations };
                    }
                    return existingChar;
                });

                // Adjust RPG stats based on current adventure settings
                if (currentRpgMode) {
                    newChar.level = newChar.level ?? 1;
                    newChar.characterClass = newChar.characterClass ?? '';
                    newChar.inventory = newChar.inventory ?? {};
                    newChar.hitPoints = newChar.hitPoints ?? newChar.maxHitPoints ?? 10;
                    newChar.maxHitPoints = newChar.maxHitPoints ?? 10;
                    newChar.manaPoints = newChar.manaPoints ?? newChar.maxManaPoints ?? 0;
                    newChar.maxManaPoints = newChar.maxManaPoints ?? 0;
                    newChar.armorClass = newChar.armorClass ?? 10;
                    newChar.attackBonus = newChar.attackBonus ?? 0;
                    newChar.damageBonus = newChar.damageBonus ?? "1";
                    newChar.isHostile = newChar.isHostile ?? false; // Default to not hostile when added this way
                } else {
                    // If RPG mode is off, clear RPG stats
                    delete newChar.level; delete newChar.characterClass; delete newChar.inventory;
                    delete newChar.hitPoints; delete newChar.maxHitPoints; delete newChar.manaPoints;
                    delete newChar.maxManaPoints; delete newChar.armorClass; delete newChar.attackBonus;
                    delete newChar.damageBonus; delete newChar.isHostile;
                }
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
    }, [currentLanguage, toast, stagedAdventureSettings.relationsMode, stagedAdventureSettings.rpgMode, stagedAdventureSettings.playerName]);


   const handleSave = React.useCallback(() => {
        // Use live characters and settings for saving
        const charactersToSave = characters.map(({ ...char }) => char); // Create a shallow copy
        const saveData: SaveData = {
            adventureSettings,
            characters: charactersToSave,
            narrative: narrativeMessages,
            currentLanguage,
            activeCombat: activeCombat,
            saveFormatVersion: 1.8, // Ensure this is the latest version reflecting current data structures
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
                    // Attempt to migrate old string narrative to new message structure
                    if (typeof loadedData.narrative === 'string') {
                        loadedData.narrative = [{ id: `migrated-${Date.now()}`, type: 'system', content: loadedData.narrative as unknown as string, timestamp: Date.now() }];
                    } else {
                        throw new Error("Structure des messages narratifs invalide.");
                    }
                }

                 // Migrations for older save formats
                 if (loadedData.saveFormatVersion === undefined || loadedData.saveFormatVersion < 1.4) {
                     loadedData.characters = loadedData.characters.map(c => ({ ...c, history: Array.isArray(c.history) ? c.history : [], affinity: c.affinity ?? 50, relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                     loadedData.adventureSettings.playerName = loadedData.adventureSettings.playerName || "Player";
                 }
                 if (loadedData.saveFormatVersion < 1.5) { // Assuming 1.5 introduced relationsMode
                       loadedData.adventureSettings.relationsMode = loadedData.adventureSettings.relationsMode ?? true;
                       loadedData.characters = loadedData.characters.map(c => ({ ...c, relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                 }
                  if (loadedData.saveFormatVersion < 1.8) { // Assuming 1.8 introduced playerGold and removed currencyTiers
                    if ((loadedData.adventureSettings as any).playerCurrencyTiers) {
                        const oldTiers = (loadedData.adventureSettings as any).playerCurrencyTiers as CurrencyTier[];
                        let totalGold = 0;
                        if (Array.isArray(oldTiers) && oldTiers.length > 0) {
                            // Find the base tier (valueInBaseTier === 1, or the last one if not explicitly 1)
                            const baseTierValue = oldTiers[oldTiers.length-1].valueInBaseTier;
                            oldTiers.forEach((tier: CurrencyTier) => {
                                totalGold += (tier.amount || 0) * (tier.valueInBaseTier / baseTierValue);
                            });
                        }
                        loadedData.adventureSettings.playerGold = Math.floor(totalGold);
                        delete (loadedData.adventureSettings as any).playerCurrencyTiers;
                        delete (loadedData.adventureSettings as any).currencyLabel; // also remove old label
                    }
                    // Ensure playerInventory exists, and items have goldValue
                    if (!loadedData.adventureSettings.playerInventory) {
                        loadedData.adventureSettings.playerInventory = [];
                    }
                    loadedData.adventureSettings.playerInventory = loadedData.adventureSettings.playerInventory.map(item => ({
                        ...item,
                        goldValue: item.goldValue ?? 0 // Default to 0 if undefined
                    }));
                 }


                const rpgModeActive = loadedData.adventureSettings.rpgMode;
                const relationsModeActive = loadedData.adventureSettings.relationsMode ?? true;
                const loadedLang = loadedData.currentLanguage || "fr";
                const defaultRelation = loadedLang === 'fr' ? "Inconnu" : "Unknown";

                // Validate and ensure characters have IDs and default relations if needed
                const validatedCharacters = loadedData.characters.map((c: any) => {
                    const charId = c.id || `${c.name?.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                    let relations = relationsModeActive && typeof c.relations === 'object' && c.relations !== null ? c.relations : (relationsModeActive ? { [PLAYER_ID]: defaultRelation } : undefined);

                    if (relationsModeActive && relations && !relations[PLAYER_ID]) {
                        relations[PLAYER_ID] = defaultRelation;
                    }
                    // Ensure relations with other loaded characters also default to Unknown if not present
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
                        portraitUrl: c.portraitUrl || null,
                        affinity: relationsModeActive ? (c.affinity ?? 50) : undefined,
                        relations: relations,
                        _lastSaved: c._lastSaved, // Preserve global save timestamp if present
                        // RPG Stats - ensure they are present if rpgMode is true, undefined otherwise
                        ...(rpgModeActive ? {
                            level: c.level ?? 1,
                            characterClass: c.characterClass ?? '',
                            inventory: typeof c.inventory === 'object' && c.inventory !== null ? c.inventory : {},
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

                // Reconstruct AdventureSettings carefully, applying defaults from base for missing fields
                // and ensuring RPG fields are conditional
                const finalAdventureSettings: AdventureSettings = {
                    ...baseAdventureSettings, // Start with base defaults
                    ...loadedData.adventureSettings, // Override with loaded settings
                    relationsMode: relationsModeActive,
                    rpgMode: rpgModeActive,
                    // Conditionally set RPG stats based on rpgModeActive from loaded data
                    playerCurrentHp: rpgModeActive ? (loadedData.adventureSettings.playerCurrentHp ?? loadedData.adventureSettings.playerMaxHp) : undefined,
                    playerCurrentMp: rpgModeActive ? (loadedData.adventureSettings.playerCurrentMp ?? loadedData.adventureSettings.playerMaxMp) : undefined,
                    playerCurrentExp: rpgModeActive ? (loadedData.adventureSettings.playerCurrentExp ?? 0) : undefined,
                    playerInventory: loadedData.adventureSettings.playerInventory || [], // Ensure it's an array
                    playerGold: loadedData.adventureSettings.playerGold ?? 0, // Default to 0 if not in save
                };
                // Clean up potential old currency fields if they exist on loadedData.adventureSettings
                delete (finalAdventureSettings as any).playerCurrencyTiers;
                delete (finalAdventureSettings as any).currencyLabel;


                React.startTransition(() => {
                  // Set these as the new "base" for restart functionality
                  setBaseAdventureSettings(JSON.parse(JSON.stringify(finalAdventureSettings)));
                  setBaseCharacters(JSON.parse(JSON.stringify(validatedCharacters)));

                  // Set the live and staged states
                  setAdventureSettings(finalAdventureSettings);
                  setCharacters(validatedCharacters);
                  setStagedAdventureSettings(JSON.parse(JSON.stringify(finalAdventureSettings))); // Use a deep copy for staged
                  setStagedCharacters(JSON.parse(JSON.stringify(validatedCharacters)));     // Use a deep copy for staged

                  setNarrativeMessages(loadedData.narrative as Message[]);
                  setActiveCombat(loadedData.activeCombat); // Load combat state
                  setCurrentLanguage(loadedData.currentLanguage || "fr");
                  setFormPropKey(k => k + 1); // Force AdventureForm to re-initialize with new values
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
        if(event.target) event.target.value = ''; // Reset file input to allow re-uploading the same file
    }, [toast, baseAdventureSettings]); // Include baseAdventureSettings to correctly default new saves


  const confirmRestartAdventure = React.useCallback(() => {
    React.startTransition(() => {
        // Restart from the current baseAdventureSettings and baseCharacters
        // which might have been updated by a load operation
        const initialSettings = JSON.parse(JSON.stringify(baseAdventureSettings));
         const newLiveAdventureSettings: AdventureSettings = {
            ...initialSettings,
            playerCurrentHp: initialSettings.rpgMode ? initialSettings.playerMaxHp : undefined,
            playerCurrentMp: initialSettings.rpgMode ? initialSettings.playerMaxMp : undefined,
            playerCurrentExp: initialSettings.rpgMode ? 0 : undefined,
            playerInventory: initialSettings.playerInventory || [],
            playerGold: initialSettings.playerGold ?? 0,
        };
        setAdventureSettings(newLiveAdventureSettings);
        setCharacters(JSON.parse(JSON.stringify(baseCharacters)));
        setStagedAdventureSettings(JSON.parse(JSON.stringify(newLiveAdventureSettings)));
        setStagedCharacters(JSON.parse(JSON.stringify(baseCharacters)));

        setNarrativeMessages([{ id: `msg-${Date.now()}`, type: 'system', content: initialSettings.initialSituation, timestamp: Date.now() }]);
        setActiveCombat(undefined); // Reset combat state on restart

        setFormPropKey(prev => prev + 1); // Force form re-initialization
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
        // Construct the candidate for new staged settings based on form values
        const newSettingsCandidate: AdventureSettings = {
            ...prevStagedSettings, // Preserve fields not in the form (like playerGold, current HP/MP/EXP)
            world: newSettingsFromForm.world,
            initialSituation: newSettingsFromForm.initialSituation,
            rpgMode: newSettingsFromForm.enableRpgMode ?? false,
            relationsMode: newSettingsFromForm.enableRelationsMode ?? true,
            playerName: newSettingsFromForm.playerName || "Player",
            // RPG specific fields, only apply if RPG mode is enabled from form
            playerClass: (newSettingsFromForm.enableRpgMode ?? false) ? newSettingsFromForm.playerClass : undefined,
            playerLevel: (newSettingsFromForm.enableRpgMode ?? false) ? newSettingsFromForm.playerLevel : undefined,
            playerMaxHp: (newSettingsFromForm.enableRpgMode ?? false) ? newSettingsFromForm.playerMaxHp : undefined,
            playerMaxMp: (newSettingsFromForm.enableRpgMode ?? false) ? newSettingsFromForm.playerMaxMp : undefined,
            playerExpToNextLevel: (newSettingsFromForm.enableRpgMode ?? false) ? newSettingsFromForm.playerExpToNextLevel : undefined,
            // If RPG mode is newly enabled or initial situation changes, reset current HP/MP/EXP
            // Otherwise, keep current values if RPG mode was already active and situation is same
            playerCurrentHp: (newSettingsFromForm.enableRpgMode ?? false)
                ? (prevStagedSettings.initialSituation === newSettingsFromForm.initialSituation && prevStagedSettings.rpgMode === (newSettingsFromForm.enableRpgMode ?? false)
                    ? prevStagedSettings.playerCurrentHp // Keep if situation & RPG mode unchanged
                    : newSettingsFromForm.playerMaxHp)    // Reset to max if situation changed or RPG mode toggled on
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
            // playerInventory and playerGold are not directly managed by this form's AdventureFormValues,
            // so they are preserved from prevStagedSettings unless RPG mode is disabled.
            playerInventory: (newSettingsFromForm.enableRpgMode ?? false) ? prevStagedSettings.playerInventory || [] : undefined,
            playerGold: (newSettingsFromForm.enableRpgMode ?? false) ? prevStagedSettings.playerGold || 0 : undefined,
        };
        // Ensure current HP/MP do not exceed max
        if (newSettingsCandidate.playerCurrentHp !== undefined && newSettingsCandidate.playerMaxHp !== undefined) {
            newSettingsCandidate.playerCurrentHp = Math.min(newSettingsCandidate.playerCurrentHp, newSettingsCandidate.playerMaxHp);
        }
         if (newSettingsCandidate.playerCurrentMp !== undefined && newSettingsCandidate.playerMaxMp !== undefined) {
            newSettingsCandidate.playerCurrentMp = Math.min(newSettingsCandidate.playerCurrentMp, newSettingsCandidate.playerMaxMp);
        }

        // Only update if content actually changed
        if (JSON.stringify(prevStagedSettings) !== JSON.stringify(newSettingsCandidate)) {
            return newSettingsCandidate;
        }
        return prevStagedSettings;
    });

    setStagedCharacters(prevStagedChars => {
      const defaultRelation = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
      const newRPGMode = newSettingsFromForm.enableRpgMode ?? false;
      const newRelationsMode = newSettingsFromForm.enableRelationsMode ?? true;

      // Create a map of existing characters for efficient lookup
      const existingCharsMap = new Map(prevStagedChars.map(sc => [sc.id, sc]));

      let updatedCharsList: Character[] = newSettingsFromForm.characters.map(formDef => {
        const existingChar = formDef.id
            ? existingCharsMap.get(formDef.id)
            // Fallback to name match if ID is not in formDef (e.g., new char from form)
            // but ensure it's not an ID collision if multiple formDefs have same name but different IDs
            : prevStagedChars.find(sc => sc.name === formDef.name && !newSettingsFromForm.characters.some(otherFormDef => otherFormDef.id === sc.id && otherFormDef.id !== formDef.id && !formDef.id));


        if (existingChar) {
          // Update existing character
          return {
            ...existingChar,
            name: formDef.name,
            details: formDef.details,
            // Apply RPG stats conditionally
            ...(newRPGMode ? {
                level: existingChar.level || 1,
                characterClass: existingChar.characterClass || '',
                inventory: existingChar.inventory || {},
                hitPoints: existingChar.hitPoints ?? existingChar.maxHitPoints ?? 10,
                maxHitPoints: existingChar.maxHitPoints ?? 10,
                manaPoints: existingChar.manaPoints ?? existingChar.maxManaPoints ?? 0,
                maxManaPoints: existingChar.maxManaPoints ?? 0,
                armorClass: existingChar.armorClass ?? 10,
                attackBonus: existingChar.attackBonus ?? 0,
                damageBonus: existingChar.damageBonus ?? "1",
                isHostile: existingChar.isHostile ?? false,
            } : { // Clear RPG stats if RPG mode is off
                level: undefined, characterClass: undefined, inventory: undefined,
                hitPoints: undefined, maxHitPoints: undefined, manaPoints: undefined, maxManaPoints: undefined,
                armorClass: undefined, attackBonus: undefined, damageBonus: undefined, isHostile: undefined,
             }),
             // Apply relations conditionally
             ...(newRelationsMode ? {
                affinity: existingChar.affinity ?? 50,
                relations: existingChar.relations || { [PLAYER_ID]: defaultRelation },
             } : { // Clear relations if relations mode is off
                affinity: undefined,
                relations: undefined,
             })
          };
        } else {
          // Create new character
          const newId = formDef.id || `${formDef.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          return {
            id: newId, name: formDef.name, details: formDef.details,
            history: [`Créé via formulaire le ${new Date().toLocaleString()}`], portraitUrl: null,
             ...(newRPGMode ? { // Default RPG stats for new char if RPG mode on
                level: 1, characterClass: '', inventory: {},
                hitPoints: 10, maxHitPoints: 10, manaPoints:0, maxManaPoints:0, armorClass: 10,
                attackBonus: 0, damageBonus: "1", isHostile: false,
            } : {}),
            ...(newRelationsMode ? { // Default relations for new char if relations mode on
                affinity: 50,
                relations: { [PLAYER_ID]: defaultRelation },
            } : {})
          };
        }
      });

      // Ensure all characters have relations to each other if relations mode is active
      if (newRelationsMode) {
          const allCharIds = new Set(updatedCharsList.map(c => c.id));
          updatedCharsList = updatedCharsList.map(char => {
            const newRelations = { ...(char.relations || {}) };
            if (!newRelations[PLAYER_ID]) { // Ensure relation to player
                newRelations[PLAYER_ID] = defaultRelation;
            }
            allCharIds.forEach(otherCharId => {
                if (char.id !== otherCharId && !newRelations[otherCharId]) {
                    newRelations[otherCharId] = defaultRelation; // Default relation to other NPCs
                }
            });
            return { ...char, relations: newRelations };
          });
      }

      // Only update if content actually changed
      if (JSON.stringify(prevStagedChars) !== JSON.stringify(updatedCharsList)) {
          return updatedCharsList;
      }
      return prevStagedChars;
    });
  }, [currentLanguage]); // Removed baseAdventureSettings.playerCurrencyTiers as it's not used in this simplified logic


  const handleApplyStagedChanges = React.useCallback(() => {
    let initialSituationChanged = false;
    setAdventureSettings(prevLiveSettings => {
        // Check if the initial situation has changed between the current live settings and the staged settings.
        initialSituationChanged = stagedAdventureSettings.initialSituation !== prevLiveSettings.initialSituation;

        // Create a deep copy of stagedAdventureSettings to become the new live settings
        let newLiveSettings = JSON.parse(JSON.stringify(stagedAdventureSettings));

        // If RPG mode is active in the new settings
        if (newLiveSettings.rpgMode) {
            // If initial situation changed OR RPG mode was previously off and is now on
            if (initialSituationChanged || (!prevLiveSettings.rpgMode && newLiveSettings.rpgMode) ) {
                // Reset player's current stats to their max values or defaults
                newLiveSettings.playerCurrentHp = newLiveSettings.playerMaxHp;
                newLiveSettings.playerCurrentMp = newLiveSettings.playerMaxMp;
                newLiveSettings.playerCurrentExp = 0;
                // Inventory and Gold are preserved from staged if RPG mode is on,
                // or re-initialized if RPG mode was just turned on and they weren't in prevStagedSettings
                newLiveSettings.playerInventory = newLiveSettings.playerInventory || [];
                newLiveSettings.playerGold = newLiveSettings.playerGold ?? 0;

            } else { // RPG mode was active and situation is the same, preserve current stats from previous live settings
                newLiveSettings.playerCurrentHp = Math.min(prevLiveSettings.playerCurrentHp ?? newLiveSettings.playerMaxHp ?? 0, newLiveSettings.playerMaxHp ?? 0);
                newLiveSettings.playerCurrentMp = Math.min(prevLiveSettings.playerCurrentMp ?? newLiveSettings.playerMaxMp ?? 0, newLiveSettings.playerMaxMp ?? 0);
                newLiveSettings.playerCurrentExp = prevLiveSettings.playerCurrentExp ?? 0;
                // Inventory and Gold are taken from newLiveSettings (which are a copy of staged)
            }
             // Ensure current HP/MP do not exceed max after adjustments
             if (newLiveSettings.playerCurrentHp !== undefined && newLiveSettings.playerMaxHp !== undefined) {
                 newLiveSettings.playerCurrentHp = Math.min(newLiveSettings.playerCurrentHp, newLiveSettings.playerMaxHp);
            }
             if (newLiveSettings.playerCurrentMp !== undefined && newLiveSettings.playerMaxMp !== undefined) {
                newLiveSettings.playerCurrentMp = Math.min(newLiveSettings.playerCurrentMp, newLiveSettings.playerMaxMp);
            }
        } else { // RPG mode is not active in the new settings, clear all RPG related stats
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
        // Update base settings as well if the core definition changes
        setBaseAdventureSettings(JSON.parse(JSON.stringify(newLiveSettings)));
        return newLiveSettings;
    });

    if (initialSituationChanged) {
        // If the initial situation changed, reset the narrative to this new situation
        setNarrativeMessages([{ id: `msg-${Date.now()}`, type: 'system', content: stagedAdventureSettings.initialSituation, timestamp: Date.now() }]);
        setActiveCombat(undefined); // Also reset combat state if situation changes
    }

    // Apply staged characters to live characters and base characters
    const newLiveCharacters = JSON.parse(JSON.stringify(stagedCharacters));
    setCharacters(newLiveCharacters);
    setBaseCharacters(newLiveCharacters); // Update base characters to reflect changes

    // Do not increment formPropKey here; AdventureForm will re-render if its initialValues' content changes
    // setFormPropKey(k => k + 1);

    setTimeout(() => {
        toast({ title: "Modifications Enregistrées", description: "Les paramètres de l'aventure et des personnages ont été mis à jour." });
    }, 0);
  }, [stagedAdventureSettings, stagedCharacters, toast]);


  // Memoize the transformation of stagedCharacters for the form
  const stringifiedStagedCharsForFormMemo = React.useMemo(() => {
    return JSON.stringify(stagedCharacters.map(c => ({ id: c.id, name: c.name, details: c.details })));
  }, [stagedCharacters]);


  const memoizedStagedAdventureSettingsForForm = React.useMemo<AdventureFormValues>(() => {
    const formCharacters: FormCharacterDefinition[] = JSON.parse(stringifiedStagedCharsForFormMemo);
    return {
      world: stagedAdventureSettings.world,
      initialSituation: stagedAdventureSettings.initialSituation,
      playerName: stagedAdventureSettings.playerName,
      enableRpgMode: stagedAdventureSettings.rpgMode,
      enableRelationsMode: stagedAdventureSettings.relationsMode ?? true,
      characters: formCharacters,
      playerClass: stagedAdventureSettings.playerClass,
      playerLevel: stagedAdventureSettings.playerLevel,
      playerMaxHp: stagedAdventureSettings.playerMaxHp,
      playerMaxMp: stagedAdventureSettings.playerMaxMp,
      playerExpToNextLevel: stagedAdventureSettings.playerExpToNextLevel,
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
  }, [
      narrativeMessages, characterNamesForQuestHook, worldForQuestHook,
      currentLanguage, toast, setIsSuggestingQuest, adventureSettings.playerName // Added setIsSuggestingQuest
  ]);

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
    if (item.type) { // Ensure type is checked before accessing
        promptDescription += ` Type: ${item.type}.`;
    }


    try {
      const result = await generateSceneImageAction({ sceneDescription: promptDescription });
      console.log(`Image générée pour ${item.name}:`, result.imageUrl);
      setTimeout(() => {
          toast({
            title: "Image d'Objet Générée !",
            description: (
              <div className="flex flex-col gap-2">
                <p>{item.name} visualisé.</p>
                <p className="text-xs">L'URL de l'image est dans la console.</p>
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
        generateSceneImageAction={generateSceneImageAction}
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
        handleSellItem={handleSellItem}
        handleGenerateItemImage={handleGenerateItemImage}
        isGeneratingItemImage={isGeneratingItemImage}
      />
      </>
  );
}

    