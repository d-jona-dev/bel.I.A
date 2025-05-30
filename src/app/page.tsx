
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { Character, AdventureSettings, SaveData, Message, ActiveCombat, PlayerInventoryItem, LootedItem } from "@/types";
import { PageStructure } from "./page.structure";

import { generateAdventure } from "@/ai/flows/generate-adventure";
import type { GenerateAdventureInput, GenerateAdventureOutput, CharacterUpdateSchema, AffinityUpdateSchema, RelationUpdateSchema, NewCharacterSchema, CombatUpdatesSchema, CharacterWithContextSummary } from "@/ai/flows/generate-adventure";
import { generateSceneImage } from "@/ai/flows/generate-scene-image";
import type { GenerateSceneImageInput, GenerateSceneImageOutput } from "@/ai/flows/generate-scene-image";
import { translateText } from "@/ai/flows/translate-text";
import type { TranslateTextInput, TranslateTextOutput } from "@/ai/flows/translate-text";
import { suggestQuestHook } from "@/ai/flows/suggest-quest-hook";
import type { SuggestQuestHookInput, SuggestQuestHookOutput } from "@/ai/flows/suggest-quest-hook";


const PLAYER_ID = "player";

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
    let settingsActuallyChanged = false;
    setStagedAdventureSettings(prevStaged => {
      const newLiveSettingsCopy = JSON.parse(JSON.stringify(adventureSettings));
      if (JSON.stringify(prevStaged) !== JSON.stringify(newLiveSettingsCopy)) {
        settingsActuallyChanged = true;
        return newLiveSettingsCopy;
      }
      return prevStaged;
    });

    let charsActuallyChanged = false;
    setStagedCharacters(prevStaged => {
      const newLiveCharsCopy = JSON.parse(JSON.stringify(characters));
      if (JSON.stringify(prevStaged) !== JSON.stringify(newLiveCharsCopy)) {
        charsActuallyChanged = true;
        return newLiveCharsCopy;
      }
      return prevStaged;
    });

    if (settingsActuallyChanged || charsActuallyChanged) {
      // setFormPropKey(k => k + 1); // Removed to prevent potential loops
    }
  }, [adventureSettings, characters]);


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
                toastsToShow.push({ title: "Joueur Vaincu!", description: "L'aventure pourrait prendre un tournant difficile...", variant: "destructive" });
            }
        }

        if (newSettings.playerMaxMp && (newSettings.playerMaxMp > 0) && newSettings.playerCurrentMp !== undefined && (newSettings.playerCurrentMp < newSettings.playerMaxMp)) {
             newSettings.playerCurrentMp = Math.min(newSettings.playerMaxMp, (newSettings.playerCurrentMp || 0) + 1);
        }

        if (typeof combatUpdates.expGained === 'number' && combatUpdates.expGained > 0 && newSettings.playerCurrentExp !== undefined && newSettings.playerExpToNextLevel !== undefined && newSettings.playerLevel !== undefined) {
            newSettings.playerCurrentExp += combatUpdates.expGained;
            setTimeout(() => { toast({ title: "Expérience Gagnée!", description: `Vous avez gagné ${combatUpdates.expGained} EXP.` }); }, 0);
            while (newSettings.playerCurrentExp >= newSettings.playerExpToNextLevel!) {
                newSettings.playerLevel! += 1;
                newSettings.playerCurrentExp -= newSettings.playerExpToNextLevel!;
                newSettings.playerExpToNextLevel = Math.floor(newSettings.playerExpToNextLevel! * 1.5); 
                newSettings.playerMaxHp = (newSettings.playerMaxHp || 0) + Math.floor(Math.random() * 6) + 2; 
                newSettings.playerCurrentHp = newSettings.playerMaxHp;
                if (newSettings.playerMaxMp && newSettings.playerMaxMp > 0) {
                    newSettings.playerMaxMp = (newSettings.playerMaxMp || 0) + Math.floor(Math.random() * 4) + 1; 
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

  const handleRelationUpdate = React.useCallback((charId: string, targetId: string, newRelation: string) => {
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
  }, [stagedAdventureSettings.relationsMode, currentLanguage]); // Added currentLanguage as it impacts defaultRelationDesc

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


  const handleNewCharacters = React.useCallback((newChars: Array<NewCharacterSchema>) => {
    if (!newChars || newChars.length === 0) return;
    const defaultRelationDesc = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
    let addedCharacterNames: string[] = [];
    const currentRpgMode = stagedAdventureSettings.rpgMode;
    const currentRelationsMode = stagedAdventureSettings.relationsMode ?? true;
    const currentPlayerName = stagedAdventureSettings.playerName || "Player";

    setStagedCharacters(prevStagedChars => {
        const currentStagedCharNamesFromPrev = new Set(prevStagedChars.map(c => c.name.toLowerCase()));
        const charsToAdd: Character[] = [];
        let existingStagedCharsCopy = JSON.parse(JSON.stringify(prevStagedChars)) as Character[];

        newChars.forEach(newCharData => {
            if (!currentStagedCharNamesFromPrev.has(newCharData.name.toLowerCase())) {
                const newId = `${newCharData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                const processedRelations: Record<string, string> = {};

                if (currentRelationsMode) {
                    processedRelations[PLAYER_ID] = defaultRelationDesc;
                    existingStagedCharsCopy.forEach((ec: Character) => {
                         processedRelations[ec.id] = defaultRelationDesc;
                    });
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
                        spells: [], techniques: [], passiveAbilities: [],
                        strength: 10, dexterity: 10,
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
                currentStagedCharNamesFromPrev.add(newCharData.name.toLowerCase()); 
            }
        });

        if (charsToAdd.length > 0) {
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
  }, [currentLanguage, stagedAdventureSettings.playerName, stagedAdventureSettings.rpgMode, stagedAdventureSettings.relationsMode, toast]);

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
             if (adventureSettings.rpgMode && typeof result.currencyGained === 'number' && result.currencyGained !== 0 && adventureSettings.playerGold !== undefined) {
                const amount = result.currencyGained;
                if (amount < 0) { 
                    const currentGold = adventureSettings.playerGold ?? 0;
                    if (currentGold + amount < 0) { 
                        setTimeout(() => {
                            toast({
                                title: "Pas assez d'or!",
                                description: "L'IA a suggéré une dépense que vous ne pouvez pas couvrir. L'or n'a pas été déduit et les objets n'ont pas été ajoutés.",
                                variant: "destructive"
                            });
                        }, 0);
                        // Do not add items if purchase failed.
                        // And do not change currencyGained.
                    } else {
                        // Purchase is valid.
                        addCurrencyToPlayer(amount);
                        if (result.itemsObtained && result.itemsObtained.length > 0) {
                           setAdventureSettings(prev => {
                                const newInventory = [...(prev.playerInventory || [])];
                                result.itemsObtained!.forEach(item => { // Assuming result.itemsObtained are items from purchase
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
                } else if (amount > 0) { 
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
      adventureSettings, 
      characters,
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
                    if (itemToUpdate.name.toLowerCase().includes("potion de soin mineure")) hpChange = 10;
                    else if (itemToUpdate.name.toLowerCase().includes("potion de soin")) hpChange = 20; 
                    else if (itemToUpdate.name.toLowerCase().includes("potion de mana mineure")) mpChange = 5;
                    else if (itemToUpdate.name.toLowerCase().includes("potion de mana")) mpChange = 10;

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
                     setTimeout(() => {toast({ title: "Action non prise en charge", description: `Vous ne pouvez pas "utiliser" ${itemToUpdate?.name} de cette manière (seulement les consommables).`, variant: "default" });},0);
                    itemActionSuccessful = false; 
                    return prevSettings; 
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

        if (itemActionSuccessful && narrativeAction) {
            if(effectAppliedMessage) {
                 setTimeout(() => { toast({ title: "Action d'Objet", description: effectAppliedMessage }); }, 0);
            }
            handleNarrativeUpdate(narrativeAction, 'user');

            const latestCharactersSnapshot = JSON.parse(JSON.stringify(characters)); 
            const latestNarrativeSnapshot = [...narrativeMessages, {id: 'temp-user', type: 'user', content: narrativeAction, timestamp: Date.now()}].slice(-5).map(msg => msg.type === 'user' ? `> ${currentPlayerName}: ${msg.content}` : msg.content).join('\n\n');
            const latestActiveCombatSnapshot = activeCombat ? JSON.parse(JSON.stringify(activeCombat)) : undefined;
            
            const settingsForAICall = JSON.parse(JSON.stringify(adventureSettings));

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
    callGenerateAdventure, handleNarrativeUpdate, toast
  ]);

  const handleSellItem = React.useCallback((itemName: string) => {
    React.startTransition(() => {
        let itemSoldSuccessfully = false;
        let sellPrice = 0;
        let userAction = "";
        let itemToSellName = ""; // To use in toast outside setAdventureSettings

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

            sellPrice = Math.floor(itemToSell.goldValue / 2);
            if (sellPrice <= 0) sellPrice = 1; 
            
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
                playerGold: (prevSettings.playerGold ?? 0) + sellPrice,
            };
        });

        if (itemSoldSuccessfully) {
            setTimeout(() => {
                toast({ title: "Objet Vendu!", description: `Vous avez vendu ${itemToSellName} pour ${sellPrice} pièces d'or.` });
            }, 0);
            
            handleNarrativeUpdate(userAction, 'user');

            const latestCharactersSnapshot = JSON.parse(JSON.stringify(characters));
            const latestNarrativeSnapshot = [...narrativeMessages, {id: 'temp-user', type: 'user', content: userAction, timestamp: Date.now()}].slice(-5).map(msg => msg.type === 'user' ? `> ${adventureSettings.playerName || 'Player'}: ${msg.content}` : msg.content).join('\n\n');
            const latestActiveCombatSnapshot = activeCombat ? JSON.parse(JSON.stringify(activeCombat)) : undefined;
            // It's important to get the LATEST adventureSettings for playerGold after the client-side update
            const settingsForAICall = JSON.parse(JSON.stringify(adventureSettings));
            // The gold update is already applied client-side before this point, so settingsForAICall.playerGold might not be fresh
            // We should ideally pass the new gold state to callGenerateAdventure or ensure it re-reads from a reliable source if IA needs exact gold.
            // For now, IA only narrates based on the action "Je vends...", the actual gold change is client-side.

            const inputForAI: GenerateAdventureInput = {
                world: settingsForAICall.world,
                initialSituation: latestNarrativeSnapshot,
                characters: latestCharactersSnapshot,
                userAction: userAction,
                currentLanguage: currentLanguage,
                playerName: settingsForAICall.playerName || "Player",
                rpgModeActive: settingsForAICall.rpgMode,
                relationsModeActive: settingsForAICall.relationsMode ?? true,
                activeCombat: latestActiveCombatSnapshot,
                playerGold: settingsForAICall.playerGold, // This will be the gold *before* the sale for the AI context
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
    addCurrencyToPlayer, handleNarrativeUpdate, callGenerateAdventure, toast 
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
                        newInventory.push({
                            name: item.itemName,
                            quantity: item.quantity,
                            description: item.description,
                            effect: item.effect,
                            type: item.itemType,
                            goldValue: item.goldValue,
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
                 characters: characters,
                 userAction: lastUserAction, 
                 currentLanguage: currentLanguage,
                 playerName: playerName || "Player",
                 relationsModeActive: relationsMode ?? true,
                 rpgModeActive: rpgMode ?? false,
                 activeCombat: activeCombat, 
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
                            // Handled by client-side check during actual purchase in callGenerateAdventure
                        } else {
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
        const currentRelationsMode = stagedAdventureSettings.relationsMode ?? true;
        const currentRpgMode = stagedAdventureSettings.rpgMode;
        const currentPlayerName = stagedAdventureSettings.playerName || "Player";

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
                    opinion: {}, 
                    _lastSaved: globalCharToAdd._lastSaved, 
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
                } else {
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
        const charactersToSave = characters.map(({ ...char }) => char); 
        const saveData: SaveData = {
            adventureSettings,
            characters: charactersToSave,
            narrative: narrativeMessages,
            currentLanguage,
            activeCombat: activeCombat,
            saveFormatVersion: 1.7, // Updated version for playerGold
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
                     loadedData.characters = loadedData.characters.map(c => ({ ...c, history: Array.isArray(c.history) ? c.history : [], opinion: typeof c.opinion === 'object' && c.opinion !== null ? c.opinion : {}, affinity: c.affinity ?? 50, relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                     loadedData.adventureSettings.playerName = loadedData.adventureSettings.playerName || "Player";
                 }
                 if (loadedData.saveFormatVersion < 1.5) { 
                       loadedData.adventureSettings.relationsMode = loadedData.adventureSettings.relationsMode ?? true; 
                       loadedData.characters = loadedData.characters.map(c => ({ ...c, relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                 }
                 if (loadedData.saveFormatVersion < 1.7) { // Migration to playerGold
                    const oldCurrencyTiers = (loadedData.adventureSettings as any).playerCurrencyTiers;
                    let goldAmount = 0;
                    if (Array.isArray(oldCurrencyTiers) && oldCurrencyTiers.length > 0) {
                        const baseTierValue = oldCurrencyTiers[oldCurrencyTiers.length -1].valueInBaseTier; // Should be 1
                        oldCurrencyTiers.forEach((tier: any) => {
                            goldAmount += (tier.amount || 0) * (tier.valueInBaseTier / baseTierValue);
                        });
                    } else if (typeof (loadedData.adventureSettings as any).playerGold === 'number') {
                         // If playerGold already exists (e.g. from a partially migrated save), use it
                        goldAmount = (loadedData.adventureSettings as any).playerGold;
                    }
                    loadedData.adventureSettings.playerGold = Math.floor(goldAmount); // Ensure integer
                    delete (loadedData.adventureSettings as any).playerCurrencyTiers;
                    delete (loadedData.adventureSettings as any).currencyLabel;
                    delete (loadedData.adventureSettings as any).currencyName; // Old field
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
                        id: charId,
                        name: c.name || "Inconnu",
                        details: c.details || "",
                        biographyNotes: c.biographyNotes,
                        history: Array.isArray(c.history) ? c.history : [],
                        opinion: typeof c.opinion === 'object' && c.opinion !== null ? c.opinion : {},
                        portraitUrl: c.portraitUrl || null,
                        affinity: relationsModeActive ? (c.affinity ?? 50) : undefined,
                        relations: relations,
                        _lastSaved: c._lastSaved, 
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
                    ...baseAdventureSettings, 
                    ...loadedData.adventureSettings,
                    relationsMode: relationsModeActive, 
                    rpgMode: rpgModeActive,
                    playerCurrentHp: rpgModeActive ? (loadedData.adventureSettings.playerCurrentHp ?? loadedData.adventureSettings.playerMaxHp) : undefined,
                    playerCurrentMp: rpgModeActive ? (loadedData.adventureSettings.playerCurrentMp ?? loadedData.adventureSettings.playerMaxMp) : undefined,
                    playerCurrentExp: rpgModeActive ? (loadedData.adventureSettings.playerCurrentExp ?? 0) : undefined,
                    playerInventory: loadedData.adventureSettings.playerInventory || [], 
                    playerGold: loadedData.adventureSettings.playerGold ?? 0, 
                };
                delete (finalAdventureSettings as any).playerCurrencyTiers;
                delete (finalAdventureSettings as any).currencyLabel;
                delete (finalAdventureSettings as any).currencyName;


                React.startTransition(() => {
                  setBaseAdventureSettings(JSON.parse(JSON.stringify(finalAdventureSettings)));
                  setBaseCharacters(JSON.parse(JSON.stringify(validatedCharacters)));
                  setAdventureSettings(finalAdventureSettings);
                  setCharacters(validatedCharacters);
                  setStagedAdventureSettings(finalAdventureSettings);
                  setStagedCharacters(validatedCharacters);
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
        setStagedAdventureSettings(newLiveAdventureSettings);
        setStagedCharacters(JSON.parse(JSON.stringify(baseCharacters)));

        setNarrativeMessages([{ id: `msg-${Date.now()}`, type: 'system', content: initialSettings.initialSituation, timestamp: Date.now() }]);
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
        const newSettingsCandidate: AdventureSettings = {
            ...prevStagedSettings,
            world: newSettingsFromForm.world,
            initialSituation: newSettingsFromForm.initialSituation,
            rpgMode: newSettingsFromForm.enableRpgMode ?? false,
            relationsMode: newSettingsFromForm.enableRelationsMode ?? true,
            playerName: newSettingsFromForm.playerName || "Player",
            playerClass: (newSettingsFromForm.enableRpgMode ?? false) ? newSettingsFromForm.playerClass : undefined,
            playerLevel: (newSettingsFromForm.enableRpgMode ?? false) ? newSettingsFromForm.playerLevel : undefined,
            playerMaxHp: (newSettingsFromForm.enableRpgMode ?? false) ? newSettingsFromForm.playerMaxHp : undefined,
            playerMaxMp: (newSettingsFromForm.enableRpgMode ?? false) ? newSettingsFromForm.playerMaxMp : undefined,
            playerExpToNextLevel: (newSettingsFromForm.enableRpgMode ?? false) ? newSettingsFromForm.playerExpToNextLevel : undefined,
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

      let updatedCharsList: Character[] = newSettingsFromForm.characters.map(formDef => {
        const existingChar = formDef.id
            ? prevStagedChars.find(sc => sc.id === formDef.id)
            : prevStagedChars.find(sc => sc.name === formDef.name && !newSettingsFromForm.characters.some(otherFormDef => otherFormDef.id === sc.id && otherFormDef.id !== formDef.id && !formDef.id));

        if (existingChar) {
          return {
            ...existingChar,
            name: formDef.name,
            details: formDef.details,
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
            } : { 
                level: undefined, experience: undefined, characterClass: undefined, stats: undefined, inventory: undefined, skills: undefined,
                spells: undefined, techniques: undefined, passiveAbilities: undefined, strength: undefined, dexterity: undefined,
                constitution: undefined, intelligence: undefined, wisdom: undefined, charisma: undefined,
                baseHitPoints: undefined, hitPoints: undefined, maxHitPoints: undefined, manaPoints: undefined, maxManaPoints: undefined,
                armorClass: undefined, attackBonus: undefined, damageBonus: undefined, isHostile: undefined,
             }),
             ...(newRelationsMode ? {
                affinity: existingChar.affinity ?? 50,
                relations: existingChar.relations || { [PLAYER_ID]: defaultRelation },
             } : { 
                affinity: undefined,
                relations: undefined,
             })
          };
        } else {
          const newId = formDef.id || `${formDef.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          return {
            id: newId, name: formDef.name, details: formDef.details,
            history: [`Créé via formulaire le ${new Date().toLocaleString()}`], opinion: {}, portraitUrl: null,
             ...(newRPGMode ? {
                level: 1, experience: 0, characterClass: '', stats: {}, inventory: {}, skills: {},
                spells: [], techniques: [], passiveAbilities: [], strength: 10, dexterity: 10,
                constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
                baseHitPoints: 10, hitPoints: 10, maxHitPoints: 10, manaPoints:0, maxManaPoints:0, armorClass: 10,
                attackBonus: 0, damageBonus: "1", isHostile: false,
            } : {}),
            ...(newRelationsMode ? {
                affinity: 50,
                relations: { [PLAYER_ID]: defaultRelation },
            } : {})
          };
        }
      });

      if (newRelationsMode) {
          updatedCharsList.forEach(char => {
            char.relations = char.relations || {}; 
            if (!char.relations[PLAYER_ID]) { 
                char.relations[PLAYER_ID] = defaultRelation;
            }
            updatedCharsList.forEach(otherChar => {
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
  }, [currentLanguage]); 


  const handleApplyStagedChanges = React.useCallback(() => {
    let initialSituationChanged = false;
    setAdventureSettings(prevLiveSettings => {
        initialSituationChanged = stagedAdventureSettings.initialSituation !== prevLiveSettings.initialSituation;
        
        let newLiveSettings = JSON.parse(JSON.stringify(stagedAdventureSettings)); 

        if (newLiveSettings.rpgMode) {
            if (initialSituationChanged || (!prevLiveSettings.rpgMode && newLiveSettings.rpgMode) ) {
                newLiveSettings.playerCurrentHp = newLiveSettings.playerMaxHp;
                newLiveSettings.playerCurrentMp = newLiveSettings.playerMaxMp;
                newLiveSettings.playerCurrentExp = 0;
            } else {
                newLiveSettings.playerCurrentHp = Math.min(prevLiveSettings.playerCurrentHp ?? newLiveSettings.playerMaxHp ?? 0, newLiveSettings.playerMaxHp ?? 0);
                newLiveSettings.playerCurrentMp = Math.min(prevLiveSettings.playerCurrentMp ?? newLiveSettings.playerMaxMp ?? 0, newLiveSettings.playerMaxMp ?? 0);
                newLiveSettings.playerCurrentExp = prevLiveSettings.playerCurrentExp ?? 0;
            }
             if (newLiveSettings.playerCurrentHp !== undefined && newLiveSettings.playerMaxHp !== undefined) {
                 newLiveSettings.playerCurrentHp = Math.min(newLiveSettings.playerCurrentHp, newLiveSettings.playerMaxHp);
            }
             if (newLiveSettings.playerCurrentMp !== undefined && newLiveSettings.playerMaxMp !== undefined) {
                newLiveSettings.playerCurrentMp = Math.min(newLiveSettings.playerCurrentMp, newLiveSettings.playerMaxMp);
            }
        } else { 
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
        setNarrativeMessages([{ id: `msg-${Date.now()}`, type: 'system', content: stagedAdventureSettings.initialSituation, timestamp: Date.now() }]);
        setActiveCombat(undefined); 
    }

    setCharacters(JSON.parse(JSON.stringify(stagedCharacters)));
    // setFormPropKey(k => k + 1); // Removed to prevent potential loops
    setTimeout(() => {
        toast({ title: "Modifications Enregistrées", description: "Les paramètres de l'aventure et des personnages ont été mis à jour." });
    }, 0);
  }, [stagedAdventureSettings, stagedCharacters, toast]); 


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
      currentLanguage, toast, setIsSuggestingQuest, adventureSettings.playerName
  ]);


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
        handleSellItem={handleSellItem} 
      />
      </>
  );
}
