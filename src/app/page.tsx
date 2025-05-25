
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { Character, AdventureSettings, SaveData, Message, ActiveCombat, StatusEffect, PlayerInventoryItem, LootedItem } from "@/types";
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

export type FormCharacterDefinition = { id?: string; name: string; details: string };

export type AdventureFormValues = Omit<AdventureSettings, 'characters' | 'playerCurrentHp' | 'playerCurrentMp' | 'playerCurrentExp' | 'playerInventory'> & {
  characters: FormCharacterDefinition[];
};

export default function Home() {
  const [baseAdventureSettings, setBaseAdventureSettings] = React.useState<AdventureSettings>({
    world: "Le village paisible de Bourgenval est niché au bord de la Forêt Murmurante. Récemment, des gobelins plus audacieux qu'à l'accoutumée ont commencé à attaquer les voyageurs et à piller les fermes isolées. Les villageois sont terrifiés.",
    initialSituation: "Vous arrivez à Bourgenval, fatigué par la route. L'Ancienne Elara, la matriarche respectée du village, vous aborde avec un regard inquiet. 'Étranger,' dit-elle, 'votre regard est celui d'un guerrier. Nous avons désespérément besoin d'aide. Les gobelins de la Grotte Grinçante sont devenus une véritable menace. Pourriez-vous nous en débarrasser ?'",
    rpgMode: true,
    relationsMode: true,
    playerName: "Héros",
    currencyName: "Pièces d'Or",
    playerClass: "Guerrier",
    playerLevel: 1,
    playerMaxHp: 30,
    playerCurrentHp: 30,
    playerMaxMp: 0,
    playerCurrentMp: 0,
    playerExpToNextLevel: 100,
    playerCurrentExp: 0,
    playerInventory: [{name: "Potion de Soin Mineure", quantity: 2, description: "Une fiole rougeâtre qui restaure quelques points de vie.", effect: "Restaure 10 PV", type: "consumable"}, {name: "Dague Rouillée", quantity: 1, description: "Une dague simple et usée.", effect: "Arme de base", type: "weapon"}],
  });
  const [baseCharacters, setBaseCharacters] = React.useState<Character[]>([
      {
        id: 'elara-1',
        name: "Ancienne Elara",
        details: "Vieille femme sage et respectée de Bourgenval. Elle porte le fardeau des espoirs de son village. Environ 70 ans, cheveux gris tressés, yeux perçants et bienveillants.",
        biographyNotes: "Elara a vu des générations grandir et tomber. Elle est déterminée à protéger Bourgenval, quitte à faire confiance à des étrangers.",
        history: ["A demandé de l'aide au joueur pour les gobelins."],
        opinion: {},
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
        opinion: {},
        affinity: 5,
        relations: { [PLAYER_ID]: "Intrus à tuer" },
        hitPoints: 25, maxHitPoints: 25, characterClass: "Chef Gobelin", level: 2, armorClass: 13, attackBonus: 3, damageBonus: "1d8+1", isHostile: true,
        inventory: {"Hache Rouillée": 1, "Quelques Pièces de Cuivre": 12}
      },
      {
        id: 'snirf-1',
        name: "Snirf, Gobelin Fureteur",
        details: "Un petit gobelin agile et sournois, armé d'une courte dague. Sert d'éclaireur pour sa tribu.",
        biographyNotes: "Snirf est plus couard que méchant, mais loyal à Frak par peur.",
        history: ["A été aperçu rôdant près de Bourgenval."],
        opinion: {},
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
  const [isRegenerating, setIsRegenerating] = React.useState<boolean>(false);
  const [showRestartConfirm, setShowRestartConfirm] = React.useState<boolean>(false);
  const [isSuggestingQuest, setIsSuggestingQuest] = React.useState<boolean>(false);

  const { toast } = useToast();

  React.useEffect(() => {
    const currentBaseAdventureSettings = baseAdventureSettings;
    const currentBaseCharacters = baseCharacters;

    const initialSettings = JSON.parse(JSON.stringify(currentBaseAdventureSettings));
    const newLiveAdventureSettings: AdventureSettings = {
        ...initialSettings,
        playerCurrentHp: initialSettings.rpgMode ? initialSettings.playerMaxHp : undefined,
        playerCurrentMp: initialSettings.rpgMode ? initialSettings.playerMaxMp : undefined,
        playerCurrentExp: initialSettings.rpgMode ? 0 : undefined,
        playerInventory: initialSettings.playerInventory || [],
    };
    const newLiveCharacters = JSON.parse(JSON.stringify(currentBaseCharacters));
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
    setStagedAdventureSettings(prevStaged => {
        const newLiveSettingsCopy = JSON.parse(JSON.stringify(adventureSettings));
        if (JSON.stringify(prevStaged) !== JSON.stringify(newLiveSettingsCopy)) {
            return newLiveSettingsCopy;
        }
        return prevStaged;
    });
    setStagedCharacters(prevStagedChars => {
        const newLiveCharsCopy = JSON.parse(JSON.stringify(characters));
        if (JSON.stringify(prevStagedChars) !== JSON.stringify(newLiveCharsCopy)) {
            return newLiveCharsCopy;
        }
        return prevStagedChars;
    });
  }, [adventureSettings, characters]);


  const handleSettingsUpdate = React.useCallback((newSettingsFromForm: AdventureFormValues) => {
    setStagedAdventureSettings(prevStagedSettings => {
        const newSettingsCandidate = {
            ...prevStagedSettings,
            world: newSettingsFromForm.world,
            initialSituation: newSettingsFromForm.initialSituation,
            rpgMode: newSettingsFromForm.enableRpgMode ?? false,
            relationsMode: newSettingsFromForm.enableRelationsMode ?? true,
            playerName: newSettingsFromForm.playerName || "Player",
            currencyName: newSettingsFromForm.currencyName,
            playerClass: newSettingsFromForm.playerClass,
            playerLevel: newSettingsFromForm.playerLevel,
            playerMaxHp: newSettingsFromForm.playerMaxHp,
            playerMaxMp: newSettingsFromForm.playerMaxMp,
            playerExpToNextLevel: newSettingsFromForm.playerExpToNextLevel,
            playerCurrentHp: prevStagedSettings.initialSituation === newSettingsFromForm.initialSituation ? prevStagedSettings.playerCurrentHp : (newSettingsFromForm.enableRpgMode ? newSettingsFromForm.playerMaxHp : undefined),
            playerCurrentMp: prevStagedSettings.initialSituation === newSettingsFromForm.initialSituation ? prevStagedSettings.playerCurrentMp : (newSettingsFromForm.enableRpgMode ? newSettingsFromForm.playerMaxMp : undefined),
            playerCurrentExp: prevStagedSettings.initialSituation === newSettingsFromForm.initialSituation ? prevStagedSettings.playerCurrentExp : (newSettingsFromForm.enableRpgMode ? 0 : undefined),
            playerInventory: prevStagedSettings.initialSituation === newSettingsFromForm.initialSituation ? prevStagedSettings.playerInventory : (newSettingsFromForm.enableRpgMode ? prevStagedSettings.playerInventory || [] : undefined),
        };
        if (JSON.stringify(prevStagedSettings) !== JSON.stringify(newSettingsCandidate)) {
            return newSettingsCandidate;
        }
        return prevStagedSettings;
    });

    setStagedCharacters(prevStagedChars => {
      const defaultRelation = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
      const newRPGMode = newSettingsFromForm.enableRpgMode ?? false;

      let updatedCharsList: Character[] = newSettingsFromForm.characters.map(formDef => {
        const existingChar = formDef.id
            ? prevStagedChars.find(sc => sc.id === formDef.id)
            : prevStagedChars.find(sc => sc.name === formDef.name && !prevStagedChars.some(otherSc => otherSc.id === sc.id && otherSc.id !== formDef.id && !formDef.id));

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
          };
        } else {
          const newId = formDef.id || `${formDef.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          return {
            id: newId, name: formDef.name, details: formDef.details,
            history: [], opinion: {}, portraitUrl: null, affinity: 50,
            relations: { [PLAYER_ID]: defaultRelation },
             ...(newRPGMode ? {
                level: 1, experience: 0, characterClass: '', stats: {}, inventory: {}, skills: {},
                spells: [], techniques: [], passiveAbilities: [], strength: 10, dexterity: 10,
                constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
                baseHitPoints: 10, hitPoints: 10, maxHitPoints: 10, manaPoints:0, maxManaPoints:0, armorClass: 10,
                attackBonus: 0, damageBonus: "1", isHostile: false,
            } : {}),
          };
        }
      });

      if (newSettingsFromForm.enableRelationsMode ?? true) {
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

        if (initialSituationChanged) {
            if(stagedAdventureSettings.rpgMode) {
                newLiveSettings.playerCurrentHp = stagedAdventureSettings.playerMaxHp;
                newLiveSettings.playerCurrentMp = stagedAdventureSettings.playerMaxMp;
                newLiveSettings.playerCurrentExp = 0;
                newLiveSettings.playerInventory = stagedAdventureSettings.playerInventory || [];
                newLiveSettings.playerLevel = stagedAdventureSettings.playerLevel || 1;
            }
        } else {
            newLiveSettings.playerCurrentHp = prevLiveSettings.playerCurrentHp;
            newLiveSettings.playerCurrentMp = prevLiveSettings.playerCurrentMp;
            newLiveSettings.playerCurrentExp = prevLiveSettings.playerCurrentExp;
            newLiveSettings.playerInventory = prevLiveSettings.playerInventory;
            newLiveSettings.playerLevel = prevLiveSettings.playerLevel;
        }

        if (stagedAdventureSettings.rpgMode) {
             newLiveSettings.playerCurrentHp = Math.min(newLiveSettings.playerCurrentHp ?? newLiveSettings.playerMaxHp, newLiveSettings.playerMaxHp ?? 0);
             newLiveSettings.playerCurrentMp = Math.min(newLiveSettings.playerCurrentMp ?? newLiveSettings.playerMaxMp, newLiveSettings.playerMaxMp ?? 0);
        }
        return newLiveSettings;
    });

    if (initialSituationChanged) {
        setNarrativeMessages([{ id: `msg-${Date.now()}`, type: 'system', content: stagedAdventureSettings.initialSituation, timestamp: Date.now() }]);
        setActiveCombat(undefined);
    }

    setCharacters(JSON.parse(JSON.stringify(stagedCharacters)));
    setFormPropKey(prev => prev + 1);

    React.startTransition(() => {
      toast({ title: "Modifications Enregistrées", description: "Les paramètres de l'aventure et des personnages ont été mis à jour." });
    });
  }, [stagedAdventureSettings, stagedCharacters, toast, setNarrativeMessages, setActiveCombat]);


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

    const handleCombatUpdates = React.useCallback((combatUpdates: CombatUpdatesSchema) => {
        const toastsToShow: Array<Parameters<typeof toast>[0]> = [];

        setCharacters(prevChars => {
            if (!adventureSettings.rpgMode) {
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
                        isHostile: combatantUpdate.isDefeated ? char.isHostile : true, // Keep hostile status unless specifically changed by narrative
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

            if (newSettings.playerMaxMp && (newSettings.playerMaxMp > 0) && newSettings.playerCurrentMp !== undefined && (newSettings.playerCurrentMp < newSettings.playerMaxMp)) {
                 newSettings.playerCurrentMp = Math.min(newSettings.playerMaxMp, (newSettings.playerCurrentMp ?? 0) + 1);
            }

            if (combatUpdates.expGained && combatUpdates.expGained > 0 && newSettings.playerCurrentExp !== undefined && newSettings.playerExpToNextLevel !== undefined && newSettings.playerLevel !== undefined) {
                newSettings.playerCurrentExp += combatUpdates.expGained;
                toastsToShow.push({ title: "Expérience Gagnée!", description: `Vous avez gagné ${combatUpdates.expGained} EXP.` });

                if (newSettings.playerCurrentExp >= newSettings.playerExpToNextLevel) {
                    newSettings.playerLevel += 1;
                    newSettings.playerCurrentExp -= newSettings.playerExpToNextLevel;
                    newSettings.playerExpToNextLevel = Math.floor(newSettings.playerExpToNextLevel * 1.5);
                    newSettings.playerMaxHp = (newSettings.playerMaxHp || 0) + Math.floor(Math.random() * 6) + 2;
                    newSettings.playerCurrentHp = newSettings.playerMaxHp;
                    if (newSettings.playerMaxMp && newSettings.playerMaxMp > 0) {
                        newSettings.playerMaxMp = (newSettings.playerMaxMp || 0) + Math.floor(Math.random() * 4) + 1;
                        newSettings.playerCurrentMp = newSettings.playerMaxMp;
                    }
                    toastsToShow.push({ title: "Niveau Supérieur!", description: `Vous avez atteint le niveau ${newSettings.playerLevel}! Vos PV et PM max ont augmenté.`, variant: "default" });
                }
            }
            return newSettings;
        });

        if (combatUpdates.nextActiveCombatState) {
             setActiveCombat(combatUpdates.nextActiveCombatState);
        } else if (combatUpdates.combatEnded) {
             setActiveCombat(undefined);
            toastsToShow.push({ title: "Combat Terminé!"});
        }

         React.startTransition(() => {
            toastsToShow.forEach(toastArgs => toast(toastArgs));
        });

    }, [toast, adventureSettings.rpgMode]);


  const callGenerateAdventure = React.useCallback(async (input: GenerateAdventureInput) => {
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
            });

        } catch (error) {
            console.error("Error in callGenerateAdventure:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            let toastDescription = `L'IA n'a pas pu générer de réponse: ${errorMessage}`;

            if (errorMessage.includes("503 Service Unavailable") || errorMessage.toLowerCase().includes("model is overloaded")) {
                toastDescription = "Le modèle d'IA est actuellement surchargé. Veuillez réessayer dans quelques instants.";
            } else if (errorMessage.toLowerCase().includes("api key not valid")) {
                toastDescription = "La clé API configurée pour Google AI n'est pas valide. Veuillez vérifier vos paramètres.";
            }

            React.startTransition(() => {
              toast({ title: "Erreur de l'IA", description: toastDescription, variant: "destructive" });
            });
        }
    }, [
        adventureSettings.world,
        adventureSettings.relationsMode,
        adventureSettings.rpgMode,
        adventureSettings.playerName,
        adventureSettings.currencyName,
        adventureSettings.playerClass,
        adventureSettings.playerLevel,
        adventureSettings.playerCurrentHp,
        adventureSettings.playerMaxHp,
        adventureSettings.playerCurrentMp,
        adventureSettings.playerMaxMp,
        adventureSettings.playerCurrentExp,
        adventureSettings.playerExpToNextLevel,
        characters,
        currentLanguage,
        activeCombat,
        handleNarrativeUpdate,
        handleCombatUpdates,
        toast
        // handleNewCharacters, // Needs memoization if it causes re-renders or is complex
        // handleCharacterHistoryUpdate, // Needs memoization
        // handleAffinityUpdates, // Needs memoization
        // handleRelationUpdatesFromAI, // Needs memoization
    ]);

    const handlePlayerItemAction = React.useCallback((itemName: string, action: 'use' | 'discard') => {
        React.startTransition(() => {
            if (!adventureSettings.rpgMode) {
                 React.startTransition(() => {
                    toast({ title: "Mode RPG Désactivé", description: "L'inventaire et l'utilisation d'objets sont désactivés.", variant: "default" });
                });
                return;
            }

            let itemUsedOrDiscarded = false;
            let narrativeAction = "";
            let itemEffectApplied = false;
            let effectAppliedMessage = "";

            setAdventureSettings(prevSettings => {
                let newInventory = [...(prevSettings.playerInventory || [])];
                const itemIndex = newInventory.findIndex(invItem => invItem.name === itemName && invItem.quantity > 0);

                if (itemIndex === -1) {
                    React.startTransition(() => {
                        toast({ title: "Objet Introuvable", description: `Vous n'avez pas de "${itemName}" utilisable ou en quantité suffisante.`, variant: "destructive" });
                    });
                    return prevSettings;
                }

                const item = { ...newInventory[itemIndex] };
                itemUsedOrDiscarded = true;
                let newSettings = { ...prevSettings };

                if (action === 'use') {
                    narrativeAction = `J'utilise ${item.name}.`;
                    if (item.type === 'consumable') {
                        if (item.effect?.toLowerCase().includes("restaure") && item.effect.toLowerCase().includes("pv")) {
                            const hpGainMatch = item.effect.match(/(\d+)\s*PV/i);
                            const hpGain = hpGainMatch ? parseInt(hpGainMatch[1], 10) : 0;
                            if (hpGain > 0 && newSettings.playerCurrentHp !== undefined && newSettings.playerMaxHp !== undefined) {
                                newSettings.playerCurrentHp = Math.min(newSettings.playerMaxHp, (newSettings.playerCurrentHp || 0) + hpGain);
                                itemEffectApplied = true;
                                effectAppliedMessage = `${item.name} utilisé. PV restaurés : +${hpGain}.`;
                            }
                        }
                        if (item.effect?.toLowerCase().includes("restaure") && item.effect.toLowerCase().includes("pm")) {
                            const mpGainMatch = item.effect.match(/(\d+)\s*PM/i);
                            const mpGain = mpGainMatch ? parseInt(mpGainMatch[1], 10) : 0;
                            if (mpGain > 0 && newSettings.playerCurrentMp !== undefined && newSettings.playerMaxMp !== undefined && newSettings.playerMaxMp > 0) {
                                newSettings.playerCurrentMp = Math.min(newSettings.playerMaxMp, (newSettings.playerCurrentMp || 0) + mpGain);
                                itemEffectApplied = true;
                                effectAppliedMessage = effectAppliedMessage ? `${effectAppliedMessage} PM restaurés : +${mpGain}.` : `${item.name} utilisé. PM restaurés : +${mpGain}.`;
                            }
                        }
                        
                        newInventory[itemIndex] = { ...item, quantity: item.quantity - 1 };
                        if (newInventory[itemIndex].quantity <= 0) {
                            newInventory.splice(itemIndex, 1);
                        }
                        if (!itemEffectApplied && item.name) effectAppliedMessage = `${item.name} a été utilisé.`;
                        
                    } else {
                        React.startTransition(() => {
                            toast({ title: "Action non prise en charge", description: `Vous ne pouvez pas "utiliser" ${item.name} de cette manière directement. Décrivez votre action si vous souhaitez l'équiper ou l'utiliser autrement.`, variant: "default" });
                        });
                        return prevSettings; 
                    }
                } else if (action === 'discard') {
                    narrativeAction = `Je jette ${item.name}.`;
                    newInventory[itemIndex] = { ...item, quantity: item.quantity - 1 };
                    if (newInventory[itemIndex].quantity <= 0) {
                        newInventory.splice(itemIndex, 1);
                    }
                    effectAppliedMessage = `${item.name} a été jeté.`;
                }
                newSettings.playerInventory = newInventory;
                return newSettings;
            });
            
            if (itemUsedOrDiscarded && narrativeAction) {
                if(effectAppliedMessage) {
                    React.startTransition(() => { toast({ title: "Action d'Objet", description: effectAppliedMessage }); });
                }
                handleNarrativeUpdate(narrativeAction, 'user');
                
                // Prepare input for AI *after* client-side state updates have settled
                const currentSettingsSnapshot = JSON.parse(JSON.stringify(adventureSettings));
                const historyForAIContext = narrativeMessages.slice(-5).map(msg => msg.type === 'user' ? `> ${currentSettingsSnapshot.playerName || 'Player'}: ${msg.content}` : msg.content).join('\n\n') + `\n> ${currentSettingsSnapshot.playerName || 'Player'}: ${narrativeAction}`;

                const inputForAI: GenerateAdventureInput = {
                    world: currentSettingsSnapshot.world,
                    initialSituation: historyForAIContext,
                    characters: characters,
                    userAction: narrativeAction,
                    currentLanguage: currentLanguage,
                    playerName: currentSettingsSnapshot.playerName || "Player",
                    rpgModeActive: currentSettingsSnapshot.rpgMode,
                    relationsModeActive: currentSettingsSnapshot.relationsMode ?? true,
                    activeCombat: activeCombat,
                    currencyName: currentSettingsSnapshot.currencyName,
                    playerClass: currentSettingsSnapshot.playerClass,
                    playerLevel: currentSettingsSnapshot.playerLevel,
                    playerCurrentHp: currentSettingsSnapshot.playerCurrentHp,
                    playerMaxHp: currentSettingsSnapshot.playerMaxHp,
                    playerCurrentMp: currentSettingsSnapshot.playerCurrentMp,
                    playerMaxMp: currentSettingsSnapshot.playerMaxMp,
                    playerCurrentExp: currentSettingsSnapshot.playerCurrentExp,
                    playerExpToNextLevel: currentSettingsSnapshot.playerExpToNextLevel,
                };
                callGenerateAdventure(inputForAI);
            }
        });
    }, [adventureSettings, characters, currentLanguage, narrativeMessages, activeCombat, callGenerateAdventure, handleNarrativeUpdate, toast]);


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
         React.startTransition(() => {
          toast({ title: "Objets Ramassés", description: "Les objets ont été ajoutés à votre inventaire." });
        });
    }, [toast, adventureSettings.rpgMode]);

    const handleDiscardLoot = React.useCallback((messageId: string) => {
        setNarrativeMessages(prevMessages =>
            prevMessages.map(msg =>
                msg.id === messageId ? { ...msg, lootTaken: true } : msg
            )
        );
         React.startTransition(() => {
          toast({ title: "Objets Laissés", description: "Vous avez décidé de ne pas prendre ces objets." });
        });
    }, [toast]);


   const handleNewCharacters = React.useCallback((newChars: Array<NewCharacterSchema>) => {
        if (!newChars || newChars.length === 0) return;

        const defaultRelationDesc = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
        let addedCharacterNames: string[] = [];

        setStagedCharacters(prevStagedChars => {
            const currentLiveCharNames = new Set(characters.map(c => c.name.toLowerCase()));
            const currentStagedCharNamesFromPrev = new Set(prevStagedChars.map(c => c.name.toLowerCase()));
            const charsToAdd: Character[] = [];
            let existingStagedCharsCopy = JSON.parse(JSON.stringify(prevStagedChars));

            newChars.forEach(newCharData => {
                if (!currentLiveCharNames.has(newCharData.name.toLowerCase()) && !currentStagedCharNamesFromPrev.has(newCharData.name.toLowerCase())) {
                    const newId = `${newCharData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                    const processedRelations: Record<string, string> = {};

                    if (stagedAdventureSettings.relationsMode && newCharData.initialRelations && Array.isArray(newCharData.initialRelations)) {
                        newCharData.initialRelations.forEach(rel => {
                            const relationDescription = rel.description || defaultRelationDesc;
                            if (rel.targetName.toLowerCase() === (stagedAdventureSettings.playerName || "Player").toLowerCase()) {
                                processedRelations[PLAYER_ID] = relationDescription;
                            } else {
                                const targetChar = existingStagedCharsCopy.find((ec: Character) => ec.name.toLowerCase() === rel.targetName.toLowerCase()) || charsToAdd.find(addedChar => addedChar.name.toLowerCase() === rel.targetName.toLowerCase());
                                if (targetChar) {
                                    processedRelations[targetChar.id] = relationDescription;
                                }
                            }
                        });
                    }

                    if (stagedAdventureSettings.relationsMode) {
                        if (!processedRelations[PLAYER_ID] || processedRelations[PLAYER_ID].trim() === "" || processedRelations[PLAYER_ID].toLowerCase() === "inconnu" || processedRelations[PLAYER_ID].toLowerCase() === "unknown") {
                            processedRelations[PLAYER_ID] = defaultRelationDesc;
                        }
                        existingStagedCharsCopy.forEach((ec: Character) => {
                            if (!processedRelations[ec.id] || processedRelations[ec.id].trim() === "" || processedRelations[ec.id].toLowerCase() === "inconnu" || processedRelations[ec.id].toLowerCase() === "unknown") {
                                 processedRelations[ec.id] = defaultRelationDesc;
                            }
                             if (!ec.relations) ec.relations = {};
                             if(!ec.relations[newId] || ec.relations[newId].trim() === "" || ec.relations[newId].toLowerCase() === "inconnu" || ec.relations[newId].toLowerCase() === "unknown") {
                                ec.relations[newId] = defaultRelationDesc;
                             }
                        });
                    }
                    
                    const processedInventory: Record<string, number> = {};
                    if (newCharData.inventory && Array.isArray(newCharData.inventory)) {
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
                        affinity: stagedAdventureSettings.relationsMode ? 50 : undefined,
                        relations: stagedAdventureSettings.relationsMode ? processedRelations : undefined,
                        isHostile: stagedAdventureSettings.rpgMode ? newCharData.isHostile : undefined,
                        inventory: stagedAdventureSettings.rpgMode ? processedInventory : undefined,
                        ...(stagedAdventureSettings.rpgMode && {
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
                    currentStagedCharNamesFromPrev.add(newCharData.name.toLowerCase());

                    if(stagedAdventureSettings.relationsMode) {
                        existingStagedCharsCopy = existingStagedCharsCopy.map((ec: Character) => ({
                            ...ec,
                            relations: {
                                ...(ec.relations || {}),
                                [newId]: ec.relations?.[newId] || defaultRelationDesc,
                            }
                        }));
                    }
                }
            });

            if (charsToAdd.length > 0) return [...existingStagedCharsCopy, ...charsToAdd];
            return prevStagedChars;
        });

        if (addedCharacterNames.length > 0) {
             React.startTransition(() => {
              toast({
                  title: "Nouveau Personnage Rencontré",
                  description: `${addedCharacterNames.join(', ')} a été ajouté aux modifications en attente. N'oubliez pas d'enregistrer les modifications pour appliquer.`,
              });
            });
        }
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
        if (!stagedAdventureSettings.relationsMode || !updates || updates.length === 0) return;

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

         React.startTransition(() => {
            toastsToShow.forEach(toastArgs => toast(toastArgs));
        });
    }, [toast, stagedAdventureSettings.relationsMode]);

     const handleRelationUpdate = React.useCallback((charId: string, targetId: string, newRelation: string) => {
        if (!stagedAdventureSettings.relationsMode) return;
        setStagedCharacters(prevChars => prevChars.map(char => {
            if (char.id === charId) {
                const updatedRelations = { ...(char.relations || {}), [targetId]: newRelation };
                return { ...char, relations: updatedRelations };
            }
            return char;
        }));
    }, [stagedAdventureSettings.relationsMode]);

    const handleRelationUpdatesFromAI = React.useCallback((updates: RelationUpdateSchema[]) => {
        if (!stagedAdventureSettings.relationsMode || !updates || updates.length === 0) return;

        const defaultRelationDesc = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
        const toastsToShow: Array<Parameters<typeof toast>[0]> = [];

        setStagedCharacters(prevChars => {
            let charsCopy = JSON.parse(JSON.stringify(prevChars));
            let changed = false;

            updates.forEach(update => {
                const sourceCharIndex = charsCopy.findIndex((c: Character) => c.name.toLowerCase() === update.characterName.toLowerCase());
                if (sourceCharIndex === -1) return;

                let targetId: string | null = null;
                if (update.targetName.toLowerCase() === (stagedAdventureSettings.playerName || "Player").toLowerCase()) {
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

         React.startTransition(() => {
            toastsToShow.forEach(toastArgs => toast(toastArgs));
        });
    }, [currentLanguage, stagedAdventureSettings.playerName, toast, stagedAdventureSettings.relationsMode]);


   const handleEditMessage = React.useCallback((messageId: string, newContent: string) => {
       setNarrativeMessages(prev => prev.map(msg =>
           msg.id === messageId ? { ...msg, content: newContent, timestamp: Date.now() } : msg
       ));
        React.startTransition(() => {
            toast({ title: "Message Modifié" });
        });
   }, [toast]);

    const handleUndoLastMessage = React.useCallback(() => {
        let messageForToast: Parameters<typeof toast>[0] | null = null;
        let newActiveCombatState = activeCombat;

        setNarrativeMessages(prevNarrative => {
            if (prevNarrative.length <= 1 && prevNarrative[0]?.type === 'system') {
                 messageForToast = { title: "Impossible d'annuler", description: "Aucun message à annuler après l'introduction.", variant: "destructive" };
                 return prevNarrative;
            }

            if (activeCombat?.isActive) {
                console.warn("Undo in combat: Combat state might not be perfectly restored by simple message removal.");
            }

            let lastUserIndex = -1;
            for (let i = prevNarrative.length - 1; i >= 0; i--) {
                if (prevNarrative[i].type === 'user') {
                    lastUserIndex = i;
                    break;
                }
            }

            if (lastUserIndex !== -1) {
                const newNarrative = prevNarrative.slice(0, lastUserIndex);
                messageForToast = { title: "Dernier tour annulé" };

                const lastAiMessageBeforeUndo = prevNarrative[lastUserIndex -1];
                if (lastAiMessageBeforeUndo?.sceneDescription?.toLowerCase().includes("combat started") || lastAiMessageBeforeUndo?.content.toLowerCase().includes("combat commence")) {
                    newActiveCombatState = undefined;
                }
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

        if (messageForToast) {
            React.startTransition(() => {
                toast(messageForToast as Parameters<typeof toast>[0]);
            });
        }
    }, [activeCombat, toast]);


    const handleRegenerateLastResponse = React.useCallback(async () => {
         if (isRegenerating) return;

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
                 const contextEndIndex = i;
                 contextMessages = currentNarrative.slice(Math.max(0, contextEndIndex - 4), contextEndIndex + 1);
                 break;
             }
         }

         if (!lastAiMessage || !lastUserAction) {
            React.startTransition(() => {
                toast({ title: "Impossible de régénérer", description: "Aucune réponse IA précédente valide trouvée pour régénérer.", variant: "destructive" });
            });
             return;
         }

         setIsRegenerating(true);
         React.startTransition(() => { toast({ title: "Régénération en cours...", description: "Génération d'une nouvelle réponse." }); });

         const narrativeContextForRegen = contextMessages
             .map(msg =>
                 msg.type === 'user' ? `> ${adventureSettings.playerName || 'Player'}: ${msg.content}` : msg.content
             ).join('\n\n');

         try {
             const input: GenerateAdventureInput = {
                 world: adventureSettings.world,
                 initialSituation: narrativeContextForRegen,
                 characters: characters,
                 userAction: lastUserAction,
                 currentLanguage: currentLanguage,
                 playerName: adventureSettings.playerName || "Player",
                 relationsModeActive: adventureSettings.relationsMode ?? true,
                 rpgModeActive: adventureSettings.rpgMode ?? false,
                 activeCombat: activeCombat,
                 currencyName: adventureSettings.currencyName,
                 playerClass: adventureSettings.playerClass,
                 playerLevel: adventureSettings.playerLevel,
                 playerCurrentHp: adventureSettings.playerCurrentHp,
                 playerMaxHp: adventureSettings.playerMaxHp,
                 playerCurrentMp: adventureSettings.playerCurrentMp,
                 playerMaxMp: adventureSettings.playerMaxMp,
                 playerCurrentExp: adventureSettings.playerCurrentExp,
                 playerExpToNextLevel: adventureSettings.playerExpToNextLevel,
             };

             const result = await generateAdventure(input);

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

            React.startTransition(() => {
                if (result.newCharacters) handleNewCharacters(result.newCharacters);
                if (result.characterUpdates) handleCharacterHistoryUpdate(result.characterUpdates);
                if(adventureSettings.relationsMode && result.affinityUpdates) handleAffinityUpdates(result.affinityUpdates);
                if(adventureSettings.relationsMode && result.relationUpdates) handleRelationUpdatesFromAI(result.relationUpdates);
                if(adventureSettings.rpgMode && result.combatUpdates) {
                    handleCombatUpdates(result.combatUpdates);
                }
                toast({ title: "Réponse Régénérée", description: "Une nouvelle réponse a été ajoutée." });
            });

         } catch (error) {
             console.error("Error regenerating adventure:", error);
             let toastDescription = `Impossible de générer une nouvelle réponse: ${error instanceof Error ? error.message : 'Unknown error'}.`;
             if (error instanceof Error && (error.message.includes("503") || error.message.toLowerCase().includes("overloaded"))) {
                 toastDescription = "Le modèle d'IA est surchargé. Veuillez réessayer plus tard.";
             }
             React.startTransition(() => {
                toast({ title: "Erreur de Régénération", description: toastDescription, variant: "destructive"});
              });
         } finally {
             setIsRegenerating(false);
         }
     }, [isRegenerating, narrativeMessages, adventureSettings, characters, currentLanguage, toast, handleNewCharacters, handleCharacterHistoryUpdate, handleAffinityUpdates, handleRelationUpdatesFromAI, activeCombat, handleCombatUpdates]);


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
                React.startTransition(() => {
                    toast({ title: "Personnage Sauvegardé Globalement", description: `${character.name} est maintenant disponible pour d'autres aventures et pour le chat.` });
                    setStagedCharacters(prev => prev.map(c => c.id === character.id ? { ...c, _lastSaved: Date.now() } : c));
                });
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


    const handleAddStagedCharacter = React.useCallback((globalCharToAdd: Character) => {
        let characterWasAdded = false;
        let characterNameForToast = globalCharToAdd.name;

        setStagedCharacters(prevStagedChars => {
            if (prevStagedChars.some(sc => sc.id === globalCharToAdd.id || sc.name.toLowerCase() === globalCharToAdd.name.toLowerCase())) {
                characterWasAdded = false;
                return prevStagedChars;
            }

            characterWasAdded = true;
            const defaultRelation = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
            const newChar = { ...globalCharToAdd };

            if (stagedAdventureSettings.relationsMode) {
                newChar.relations = newChar.relations || {};
                if (!newChar.relations[PLAYER_ID]) {
                    newChar.relations[PLAYER_ID] = defaultRelation;
                }
                prevStagedChars.forEach(existingChar => {
                    if (!newChar.relations![existingChar.id]) {
                        newChar.relations![existingChar.id] = defaultRelation;
                    }
                });
            } else {
                newChar.relations = undefined;
                newChar.affinity = undefined;
            }

            const updatedPrevChars = prevStagedChars.map(existingChar => {
                if (stagedAdventureSettings.relationsMode) {
                    const updatedRelations = { ...(existingChar.relations || {}), [newChar.id]: defaultRelation };
                    return { ...existingChar, relations: updatedRelations };
                }
                return existingChar;
            });

            if (stagedAdventureSettings.rpgMode) {
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

        React.startTransition(() => {
            if (characterWasAdded) {
                toast({ title: "Personnage Ajouté à l'Aventure", description: `${characterNameForToast} a été ajouté aux modifications en attente pour cette aventure. N'oubliez pas d'enregistrer les modifications.` });
            } else {
                toast({ title: "Personnage déjà présent", description: `${characterNameForToast} est déjà dans l'aventure actuelle.`, variant: "default" });
            }
        });
    }, [currentLanguage, toast, stagedAdventureSettings.rpgMode, stagedAdventureSettings.relationsMode, stagedAdventureSettings.playerName]);


   const handleSave = React.useCallback(() => {
        const charactersToSave = characters.map(({ ...char }) => char);
        const saveData: SaveData = {
            adventureSettings,
            characters: charactersToSave,
            narrative: narrativeMessages,
            currentLanguage,
            activeCombat: activeCombat,
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
         React.startTransition(() => {
            toast({ title: "Aventure Sauvegardée", description: "Le fichier JSON a été téléchargé." });
        });
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
                    } else throw new Error("Structure des messages narratifs invalide.");
                }

                 if (loadedData.saveFormatVersion === undefined || loadedData.saveFormatVersion < 1.4) {
                     loadedData.characters = loadedData.characters.map(c => ({ ...c, history: Array.isArray(c.history) ? c.history : [], opinion: typeof c.opinion === 'object' && c.opinion !== null ? c.opinion : {}, affinity: c.affinity ?? 50, relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                     loadedData.adventureSettings.playerName = loadedData.adventureSettings.playerName || "Player";
                 }
                 if (loadedData.saveFormatVersion < 1.5) {
                       loadedData.adventureSettings.relationsMode = loadedData.adventureSettings.relationsMode ?? true;
                       loadedData.characters = loadedData.characters.map(c => ({ ...c, relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                 }
                  if (loadedData.saveFormatVersion < 1.6) {
                       loadedData.characters = loadedData.characters.map(c => ({ ...c, relations: typeof c.relations === 'object' && c.relations !== null ? c.relations : { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                 }

                const rpgModeActive = loadedData.adventureSettings.rpgMode;
                const relationsModeActive = loadedData.adventureSettings.relationsMode ?? true;
                const loadedLang = loadedData.currentLanguage || "fr";
                const defaultRelation = loadedLang === 'fr' ? "Inconnu" : "Unknown";

                const validatedCharacters = loadedData.characters.map((c: any) => {
                    const charId = c.id || `${c.name?.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                    let relations = relationsModeActive && typeof c.relations === 'object' && c.relations !== null ? c.relations : (relationsModeActive ? { [PLAYER_ID]: defaultRelation } : undefined);
                    if (relationsModeActive && relations && !relations[PLAYER_ID]) relations[PLAYER_ID] = defaultRelation;

                    if (relationsModeActive && relations && loadedData.characters) {
                        loadedData.characters.forEach(otherC => {
                            if (otherC.id !== charId && !relations![otherC.id]) {
                                relations![otherC.id] = defaultRelation;
                            }
                        });
                    }

                    return {
                        id: charId,
                        name: c.name || "Inconnu", details: c.details || "", biographyNotes: c.biographyNotes, history: Array.isArray(c.history) ? c.history : [],
                        opinion: typeof c.opinion === 'object' && c.opinion !== null ? c.opinion : {},
                        portraitUrl: c.portraitUrl || null,
                        affinity: relationsModeActive ? (c.affinity ?? 50) : undefined,
                        relations: relations,
                        _lastSaved: c._lastSaved,
                        ...(rpgModeActive ? {
                            level: c.level ?? 1, experience: c.experience ?? 0, characterClass: c.characterClass ?? '',
                            stats: typeof c.stats === 'object' && c.stats !== null ? c.stats : {},
                            inventory: typeof c.inventory === 'object' && c.inventory !== null ? c.inventory : {},
                            skills: typeof c.skills === 'object' && c.skills !== null ? c.skills : {},
                            spells: Array.isArray(c.spells) ? c.spells : [],
                            techniques: Array.isArray(c.techniques) ? c.techniques : [],
                            passiveAbilities: Array.isArray(c.passiveAbilities) ? c.passiveAbilities : [],
                            strength: c.strength ?? 10, dexterity: c.dexterity ?? 10, constitution: c.constitution ?? 10,
                            intelligence: c.intelligence ?? 10, wisdom: c.wisdom ?? 10, charisma: c.charisma ?? 10,
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
                    playerCurrentHp: loadedData.adventureSettings.rpgMode ? (loadedData.adventureSettings.playerCurrentHp ?? loadedData.adventureSettings.playerMaxHp) : undefined,
                    playerCurrentMp: loadedData.adventureSettings.rpgMode ? (loadedData.adventureSettings.playerCurrentMp ?? loadedData.adventureSettings.playerMaxMp) : undefined,
                    playerCurrentExp: loadedData.adventureSettings.rpgMode ? (loadedData.adventureSettings.playerCurrentExp ?? 0) : undefined,
                    playerInventory: loadedData.adventureSettings.playerInventory || [],
                };

                setBaseAdventureSettings(JSON.parse(JSON.stringify(finalAdventureSettings)));
                setBaseCharacters(JSON.parse(JSON.stringify(validatedCharacters)));
                setNarrativeMessages(loadedData.narrative as Message[]);
                setCurrentLanguage(loadedLang);
                setActiveCombat(loadedData.activeCombat || undefined);

                React.startTransition(() => {
                    toast({ title: "Aventure Chargée", description: "L'état de l'aventure a été restauré." });
                });
            } catch (error: any) {
                console.error("Error loading adventure:", error);
                React.startTransition(() => {
                    toast({ title: "Erreur de Chargement", description: `Impossible de lire le fichier JSON: ${error.message}`, variant: "destructive" });
                });
            }
        };
        reader.readAsText(file);
        if(event.target) event.target.value = '';
    }, [toast, baseAdventureSettings]);

    const confirmRestartAdventure = React.useCallback(() => {
        const initialSettings = JSON.parse(JSON.stringify(baseAdventureSettings));
        const newLiveAdventureSettings = {
            ...initialSettings,
            playerCurrentHp: initialSettings.rpgMode ? initialSettings.playerMaxHp : undefined,
            playerCurrentMp: initialSettings.rpgMode ? initialSettings.playerMaxMp : undefined,
            playerCurrentExp: initialSettings.rpgMode ? 0 : undefined,
            playerInventory: initialSettings.playerInventory || [],
        };
        const newLiveCharacters = JSON.parse(JSON.stringify(baseCharacters));
        const newNarrative = [{ id: `msg-${Date.now()}`, type: 'system', content: initialSettings.initialSituation, timestamp: Date.now() }];

        setAdventureSettings(newLiveAdventureSettings);
        setCharacters(newLiveCharacters);
        setNarrativeMessages(newNarrative);
        setActiveCombat(undefined);

        setStagedAdventureSettings(JSON.parse(JSON.stringify(newLiveAdventureSettings)));
        setStagedCharacters(JSON.parse(JSON.stringify(newLiveCharacters)));
        setFormPropKey(prev => prev + 1);

        setShowRestartConfirm(false);
        React.startTransition(() => {
            toast({ title: "Aventure Recommencée", description: "L'histoire a été réinitialisée." });
        });
    }, [baseAdventureSettings, baseCharacters, toast]);


  const memoizedFormCharacters = React.useMemo(() => {
    return stagedCharacters.map(c => ({ id: c.id, name: c.name, details: c.details }));
  }, [stagedCharacters]);

  const memoizedStagedAdventureSettingsForForm = React.useMemo<AdventureFormValues>(() => {
    return {
      world: stagedAdventureSettings.world,
      initialSituation: stagedAdventureSettings.initialSituation,
      playerName: stagedAdventureSettings.playerName,
      currencyName: stagedAdventureSettings.currencyName,
      enableRpgMode: stagedAdventureSettings.rpgMode,
      enableRelationsMode: stagedAdventureSettings.relationsMode ?? true,
      characters: memoizedFormCharacters,
      playerClass: stagedAdventureSettings.playerClass,
      playerLevel: stagedAdventureSettings.playerLevel,
      playerMaxHp: stagedAdventureSettings.playerMaxHp,
      playerMaxMp: stagedAdventureSettings.playerMaxMp,
      playerExpToNextLevel: stagedAdventureSettings.playerExpToNextLevel,
    };
  }, [stagedAdventureSettings, memoizedFormCharacters]);

    const callSuggestQuestHook = React.useCallback(async () => {
        setIsSuggestingQuest(true);
        try {
            const recentMessages = narrativeMessages.slice(-3).map(m => m.content).join("\n");
            const characterNames = characters.map(c => c.name).join(", ");
            const input: SuggestQuestHookInput = {
                worldDescription: adventureSettings.world,
                currentSituation: recentMessages,
                involvedCharacters: characterNames,
                language: currentLanguage,
            };
            const result = await suggestQuestHook(input);
            React.startTransition(() => {
                toast({
                    title: "Suggestion d'Objectif",
                    description: `${result.questHook} (Raison: ${result.justification})`,
                    duration: 10000,
                });
            });
        } catch (error) {
            console.error("Error suggesting quest hook:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            React.startTransition(() => {
              toast({ title: "Erreur de Suggestion", description: `Impossible de suggérer un objectif: ${errorMessage}`, variant: "destructive" });
            });
        } finally {
            setIsSuggestingQuest(false);
        }
    }, [narrativeMessages, characters, adventureSettings.world, currentLanguage, toast]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
        onRestartAdventure={() => setShowRestartConfirm(true)}
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
