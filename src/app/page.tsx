
"use client"; 

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { Character, AdventureSettings, SaveData, Message, ActiveCombat, StatusEffect } from "@/types"; 
import { PageStructure } from "./page.structure"; 

import { generateAdventure } from "@/ai/flows/generate-adventure";
import type { GenerateAdventureInput, GenerateAdventureOutput, CharacterUpdateSchema, AffinityUpdateSchema, RelationUpdateSchema, NewCharacterSchema, CombatUpdatesSchema } from "@/ai/flows/generate-adventure";
import { generateSceneImage } from "@/ai/flows/generate-scene-image";
import type { GenerateSceneImageInput, GenerateSceneImageOutput } from "@/ai/flows/generate-scene-image";
import { translateText } from "@/ai/flows/translate-text";
import type { TranslateTextInput, TranslateTextOutput } from "@/ai/flows/translate-text";
import { suggestQuestHook } from "@/ai/flows/suggest-quest-hook"; 
import type { SuggestQuestHookInput, SuggestQuestHookOutput } from "@/ai/flows/suggest-quest-hook";


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

export type FormCharacterDefinition = { id?: string; name: string; details: string };

export type AdventureFormValues = Omit<AdventureSettings, 'characters' | 'playerCurrentHp' | 'playerCurrentMp' | 'playerCurrentExp'> & {
  characters: FormCharacterDefinition[];
};


export default function Home() {
  const [baseAdventureSettings, setBaseAdventureSettings] = React.useState<AdventureSettings>({
    world: "Grande université populaire nommée \"hight scoole of futur\".",
    initialSituation: "Vous marchez dans les couloirs animés de Hight School of Future lorsque vous apercevez Rina, votre petite amie, en pleine conversation avec Kentaro, votre meilleur ami. Ils semblent étrangement proches, riant doucement. Un sentiment de malaise vous envahit.",
    rpgMode: true, 
    relationsMode: true,
    playerName: "Player",
    currencyName: "Pièces d'Or",
    playerClass: "Étudiant",
    playerLevel: 1,
    playerMaxHp: 20,
    playerCurrentHp: 20,
    playerMaxMp: 10, 
    playerCurrentMp: 10,
    playerExpToNextLevel: 100,
    playerCurrentExp: 0,
  });
  const [baseCharacters, setBaseCharacters] = React.useState<Character[]>([
      {
        id: 'rina-1',
        name: "Rina",
        details: "jeune femme de 19 ans, votre petite amie. Elle se rapproche de Kentaro. Étudiante populaire, calme, aimante, parfois secrète. 165 cm, yeux marron, cheveux mi-longs bruns, traits fins, athlétique.",
        biographyNotes: "Rina semble troublée par les récentes attentions de Kentaro mais n'ose pas en parler.",
        history: ["Ceci est un exemple d'historique pour Rina."],
        opinion: {},
        affinity: 70,
        relations: { [PLAYER_ID]: "Petite amie", 'kentaro-1': "Ami Proche" },
        hitPoints: 15, maxHitPoints: 15, manaPoints: 5, maxManaPoints: 5, armorClass: 10, attackBonus: 1, damageBonus: "1d4", characterClass: "Étudiante Artiste", level: 1, isHostile: false,
        inventory: {"Manuel Scolaire": 1, "Stylo": 3}
      },
      {
        id: 'kentaro-1',
        name: "Kentaro",
        details: "Jeune homme de 20 ans, votre meilleur ami. Étudiant populaire, charmant mais calculateur et impulsif. 185 cm, athlétique, yeux bleus, cheveux courts blonds. Aime draguer et voir son meilleur ami souffrir. Se rapproche de Rina.",
        biographyNotes: "Kentaro est secrètement jaloux de votre relation avec Rina et cherche à semer la zizanie.",
        history: ["Kentaro a été vu parlant à Rina."],
        opinion: {},
        affinity: 30,
        relations: { [PLAYER_ID]: "Meilleur ami (tendancieux)", 'rina-1': "Intérêt romantique" },
        hitPoints: 20, maxHitPoints: 20, manaPoints: 0, maxManaPoints: 0, armorClass: 12, attackBonus: 2, damageBonus: "1d6", characterClass: "Sportif Populaire", level: 1, isHostile: false,
        inventory: {"Téléphone Moderne": 1, "Clés de Moto": 1}
      }
  ]);

  // Live game state
  const [adventureSettings, setAdventureSettings] = React.useState<AdventureSettings>(() => JSON.parse(JSON.stringify(baseAdventureSettings)));
  const [characters, setCharacters] = React.useState<Character[]>(() => JSON.parse(JSON.stringify(baseCharacters)));
  const [activeCombat, setActiveCombat] = React.useState<ActiveCombat | undefined>(undefined);
  const [narrativeMessages, setNarrativeMessages] = React.useState<Message[]>([
     { id: `msg-${Date.now()}`, type: 'system', content: baseAdventureSettings.initialSituation, timestamp: Date.now() }
  ]);
  const [currentLanguage, setCurrentLanguage] = React.useState<string>("fr");

  // Staged game state (for forms)
  const [stagedAdventureSettings, setStagedAdventureSettings] = React.useState<AdventureSettings>(() => JSON.parse(JSON.stringify(baseAdventureSettings)));
  const [stagedCharacters, setStagedCharacters] = React.useState<Character[]>(() => JSON.parse(JSON.stringify(baseCharacters)));
  
  // Key to force re-render/re-initialization of AdventureForm
  const [formPropKey, setFormPropKey] = React.useState(0);

  const [isRegenerating, setIsRegenerating] = React.useState<boolean>(false);
  const [showRestartConfirm, setShowRestartConfirm] = React.useState<boolean>(false);
  const [isSuggestingQuest, setIsSuggestingQuest] = React.useState<boolean>(false);

  const { toast } = useToast();

  // Effect to reset live and staged states when base settings/characters change (e.g., after loading a game)
  React.useEffect(() => {
    const currentBaseAdventureSettings = baseAdventureSettings; 
    const currentBaseCharacters = baseCharacters; 

    const initialSettings = JSON.parse(JSON.stringify(currentBaseAdventureSettings));
    const newLiveAdventureSettings: AdventureSettings = {
        ...initialSettings,
        playerCurrentHp: initialSettings.rpgMode ? initialSettings.playerMaxHp : undefined,
        playerCurrentMp: initialSettings.rpgMode ? initialSettings.playerMaxMp : undefined,
        playerCurrentExp: initialSettings.rpgMode ? 0 : undefined,
    };
    const newLiveCharacters = JSON.parse(JSON.stringify(currentBaseCharacters));
    const newNarrative = [{ id: `msg-${Date.now()}`, type: 'system', content: currentBaseAdventureSettings.initialSituation, timestamp: Date.now() }];

    setAdventureSettings(newLiveAdventureSettings);
    setCharacters(newLiveCharacters);
    setNarrativeMessages(newNarrative);
    setActiveCombat(undefined); 

    setStagedAdventureSettings(JSON.parse(JSON.stringify(newLiveAdventureSettings)));
    setStagedCharacters(JSON.parse(JSON.stringify(newLiveCharacters)));
    setFormPropKey(prev => prev + 1); // Force AdventureForm re-initialization

  }, [baseAdventureSettings, baseCharacters]); 

  // Effect to sync live game state (adventureSettings, characters) to staged versions
  // This is crucial if live state is changed by game logic (e.g., combat updates HP)
  // and forms need to reflect that.
  React.useEffect(() => {
    const newStagedAdventureSettings = JSON.parse(JSON.stringify(adventureSettings));
    setStagedAdventureSettings(prevStaged => {
        // Only update if the actual content has changed to prevent unnecessary re-renders/loops
        if (JSON.stringify(prevStaged) !== JSON.stringify(newStagedAdventureSettings)) {
            return newStagedAdventureSettings;
        }
        return prevStaged; // Return previous state object if no content change
    });

    const newStagedCharacters = JSON.parse(JSON.stringify(characters));
    setStagedCharacters(prevStaged => {
        // Only update if the actual content has changed
        if (JSON.stringify(prevStaged) !== JSON.stringify(newStagedCharacters)) {
            return newStagedCharacters;
        }
        return prevStaged; // Return previous state object if no content change
    });
    // NOTE: Do NOT update formPropKey here. AdventureForm's own useEffect based on initialValues
    // changing should handle form display updates. formPropKey is for major resets.
  }, [adventureSettings, characters]);


  // Callback for AdventureForm when its values change (user input)
  const handleSettingsUpdate = React.useCallback((newSettingsFromForm: AdventureFormValues) => {
    setStagedAdventureSettings(prevStagedSettings => ({
        ...prevStagedSettings, // Preserve live game state like playerCurrentHp
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
    }));

    setStagedCharacters(prevStagedChars => {
      const defaultRelation = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
      const newRPGMode = newSettingsFromForm.enableRpgMode ?? false;

      let updatedCharsList: Character[] = newSettingsFromForm.characters.map(formDef => {
        const existingChar = formDef.id
            ? prevStagedChars.find(sc => sc.id === formDef.id) 
            // If no ID, try to find by name but be careful not to reuse if ID was meant to be new
            : prevStagedChars.find(sc => sc.name === formDef.name && !prevStagedChars.some(otherSc => otherSc.id === sc.id && otherSc.id !== formDef.id && !formDef.id));

        if (existingChar) {
          return {
            ...existingChar, 
            name: formDef.name,
            details: formDef.details,
            // Conditionally keep or clear RPG stats based on newRPGMode
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
                // Clear RPG fields if RPG mode is disabled
                level: undefined, experience: undefined, characterClass: undefined, stats: undefined, inventory: undefined, skills: undefined,
                spells: undefined, techniques: undefined, passiveAbilities: undefined, strength: undefined, dexterity: undefined,
                constitution: undefined, intelligence: undefined, wisdom: undefined, charisma: undefined,
                baseHitPoints: undefined, hitPoints: undefined, maxHitPoints: undefined, manaPoints: undefined, maxManaPoints: undefined,
                armorClass: undefined, attackBonus: undefined, damageBonus: undefined, isHostile: undefined, 
             }),
          };
        } else { // New character definition from form
          const newId = formDef.id || `${formDef.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          return {
            id: newId, name: formDef.name, details: formDef.details,
            history: [], opinion: {}, portraitUrl: null, affinity: 50,
            relations: { [PLAYER_ID]: defaultRelation }, // Default relation to player
             ...(newRPGMode ? { // Initialize RPG stats if RPG mode is active
                level: 1, experience: 0, characterClass: '', stats: {}, inventory: {}, skills: {},
                spells: [], techniques: [], passiveAbilities: [], strength: 10, dexterity: 10,
                constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
                baseHitPoints: 10, hitPoints: 10, maxHitPoints: 10, manaPoints:0, maxManaPoints:0, armorClass: 10,
                attackBonus: 0, damageBonus: "1", isHostile: false,
            } : {}), // No RPG stats if mode is off
          };
        }
      });

      // Ensure all characters have relations defined for each other if relationsMode is active
      if (newSettingsFromForm.enableRelationsMode ?? true) {
          updatedCharsList.forEach(char => {
            char.relations = char.relations || {};
            if (!char.relations[PLAYER_ID]) { // Ensure relation to player
                char.relations[PLAYER_ID] = defaultRelation;
            }
            updatedCharsList.forEach(otherChar => { // Ensure relations to other NPCs
                if (char.id !== otherChar.id) {
                    if (!char.relations![otherChar.id]) {
                        char.relations![otherChar.id] = defaultRelation;
                    }
                }
            });
          });
      }
      return updatedCharsList;
    });
  }, [currentLanguage]); // Only currentLanguage needed if it affects defaultRelation text

  // Callback to apply staged changes to live game state
  const handleApplyStagedChanges = React.useCallback(() => {
    setAdventureSettings(prevLiveSettings => {
        let newLiveSettings = JSON.parse(JSON.stringify(stagedAdventureSettings));
        // Preserve live player stats if initialSituation hasn't changed
        if (stagedAdventureSettings.initialSituation === prevLiveSettings.initialSituation) {
            newLiveSettings.playerCurrentHp = prevLiveSettings.playerCurrentHp;
            newLiveSettings.playerCurrentMp = prevLiveSettings.playerCurrentMp;
            newLiveSettings.playerCurrentExp = prevLiveSettings.playerCurrentExp;
            newLiveSettings.playerLevel = prevLiveSettings.playerLevel; // Also preserve level
        } else {
            // If initialSituation changed, reset narrative and player stats
            setNarrativeMessages([{ id: `msg-${Date.now()}`, type: 'system', content: stagedAdventureSettings.initialSituation, timestamp: Date.now() }]);
            setActiveCombat(undefined); // Reset combat state
            if(stagedAdventureSettings.rpgMode) { // Only reset RPG stats if RPG mode is active
                newLiveSettings.playerCurrentHp = stagedAdventureSettings.playerMaxHp;
                newLiveSettings.playerCurrentMp = stagedAdventureSettings.playerMaxMp;
                newLiveSettings.playerCurrentExp = 0;
                newLiveSettings.playerLevel = stagedAdventureSettings.playerLevel || 1; // Use form level or default
            }
        }
        // Ensure HP/MP don't exceed max if RPG mode is active
        if (stagedAdventureSettings.rpgMode) {
             newLiveSettings.playerCurrentHp = Math.min(newLiveSettings.playerCurrentHp ?? newLiveSettings.playerMaxHp, newLiveSettings.playerMaxHp);
             newLiveSettings.playerCurrentMp = Math.min(newLiveSettings.playerCurrentMp ?? newLiveSettings.playerMaxMp, newLiveSettings.playerMaxMp);
        }
        return newLiveSettings;
    });
    setCharacters(JSON.parse(JSON.stringify(stagedCharacters))); // Apply staged characters to live state
    setFormPropKey(prev => prev + 1); // Force AdventureForm re-initialization with new live values as base

    React.startTransition(() => {
        toast({ title: "Modifications Enregistrées", description: "Les paramètres de l'aventure et des personnages ont été mis à jour." });
    });
  }, [stagedAdventureSettings, stagedCharacters, toast, setNarrativeMessages, setActiveCombat]);


   const handleNarrativeUpdate = React.useCallback((content: string, type: 'user' | 'ai', sceneDesc?: string) => {
       const newMessage: Message = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`, 
            type: type,
            content: content,
            timestamp: Date.now(),
            sceneDescription: type === 'ai' ? sceneDesc : undefined, 
       };
       setNarrativeMessages(prevNarrative => [...prevNarrative, newMessage]);
   }, []); // No dependencies if setNarrativeMessages is stable

    const handleCombatUpdates = React.useCallback((combatUpdates: CombatUpdatesSchema) => {
        const toastsToShow: Array<Parameters<typeof toast>[0]> = [];

        setCharacters(prevChars => {
            if (!adventureSettings.rpgMode) { // Check live adventureSettings
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
                        isHostile: combatantUpdate.isDefeated ? char.isHostile : true, // Keep hostility unless defeated
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
                // playerStatusEffects are handled by activeCombat state
                if (playerCombatUpdate.isDefeated) {
                    toastsToShow.push({ title: "Joueur Vaincu!", description: "L'aventure pourrait prendre un tournant difficile...", variant: "destructive" });
                }
            }

            // MP Regeneration
            if (newSettings.playerMaxMp && (newSettings.playerMaxMp > 0) && newSettings.playerCurrentMp !== undefined && (newSettings.playerCurrentMp < newSettings.playerMaxMp)) {
                 newSettings.playerCurrentMp = Math.min(newSettings.playerMaxMp, newSettings.playerCurrentMp + 1);
            }

            // EXP Gain and Level Up
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
             // Loot
             if (combatUpdates.lootDropped && combatUpdates.lootDropped.length > 0) {
                const lootLines = combatUpdates.lootDropped.map(l => {
                    let line = `${l.itemName} (x${l.quantity})`;
                    if (l.effectHint) {
                        line += ` - ${l.effectHint}`;
                    }
                    return line;
                });
                toastsToShow.push({ 
                    title: "Butin Récupéré!", 
                    description: `Vous avez trouvé:\n${lootLines.join('\n')}. (Inventaire conceptuel mis à jour)`, // Player inventory not explicitly managed in state yet
                    duration: 7000 
                });
            }
            return newSettings;
        });

        // Update ActiveCombat state
        if (combatUpdates.nextActiveCombatState) {
             setActiveCombat(combatUpdates.nextActiveCombatState);
        } else if (combatUpdates.combatEnded) {
             setActiveCombat(undefined); // Clear combat state
            toastsToShow.push({ title: "Combat Terminé!"});
        }
        
        if (toastsToShow.length > 0) {
            React.startTransition(() => {
                toastsToShow.forEach(toastArgs => toast(toastArgs));
            });
        }

    }, [toast, adventureSettings.rpgMode]); // Dependencies for live settings


   const handleNewCharacters = React.useCallback((newChars: Array<NewCharacterSchema>) => {
        if (!newChars || newChars.length === 0) return;

        const defaultRelationDesc = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
        let addedCharacterNames: string[] = [];

        setStagedCharacters(prevStagedChars => { 
            const currentLiveCharNames = new Set(characters.map(c => c.name.toLowerCase())); 
            const currentStagedCharNames = new Set(prevStagedChars.map(c => c.name.toLowerCase()));
            const charsToAdd: Character[] = [];
            let existingStagedCharsCopy = JSON.parse(JSON.stringify(prevStagedChars)); 

            newChars.forEach(newCharData => {
                if (!currentLiveCharNames.has(newCharData.name.toLowerCase()) && !currentStagedCharNames.has(newCharData.name.toLowerCase())) {
                    const newId = `${newCharData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                    const processedRelations: Record<string, string> = {};

                    // Process initial relations from AI output
                    if (stagedAdventureSettings.relationsMode && newCharData.initialRelations && Array.isArray(newCharData.initialRelations)) {
                        newCharData.initialRelations.forEach(rel => {
                            const relationDescription = rel.description || defaultRelationDesc;
                            if (rel.targetName.toLowerCase() === (stagedAdventureSettings.playerName || "Player").toLowerCase()) {
                                processedRelations[PLAYER_ID] = relationDescription;
                            } else {
                                // Find target character in the current *staged* list (including previously added new chars in this batch)
                                const targetChar = existingStagedCharsCopy.find((ec: Character) => ec.name.toLowerCase() === rel.targetName.toLowerCase()) || charsToAdd.find(addedChar => addedChar.name.toLowerCase() === rel.targetName.toLowerCase());
                                if (targetChar) {
                                    processedRelations[targetChar.id] = relationDescription;
                                }
                            }
                        });
                    }

                    // Ensure default relations if relationsMode is active
                    if (stagedAdventureSettings.relationsMode) {
                        if (!processedRelations[PLAYER_ID] || processedRelations[PLAYER_ID].trim() === "" || processedRelations[PLAYER_ID].toLowerCase() === "inconnu" || processedRelations[PLAYER_ID].toLowerCase() === "unknown") {
                            processedRelations[PLAYER_ID] = defaultRelationDesc;
                        }
                        // Add relation from new character to all existing staged characters
                        existingStagedCharsCopy.forEach((ec: Character) => {
                            if (!processedRelations[ec.id] || processedRelations[ec.id].trim() === "" || processedRelations[ec.id].toLowerCase() === "inconnu" || processedRelations[ec.id].toLowerCase() === "unknown") {
                                 processedRelations[ec.id] = defaultRelationDesc;
                            }
                             // Also add relation from existing characters to this new one
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
                        // RPG stats from AI if rpgModeActive
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
                    currentStagedCharNames.add(newCharData.name.toLowerCase()); // Ensure uniqueness for this batch

                    // Update existing characters' relations to include this new character
                    if(stagedAdventureSettings.relationsMode) {
                        existingStagedCharsCopy = existingStagedCharsCopy.map((ec: Character) => ({
                            ...ec,
                            relations: {
                                ...(ec.relations || {}),
                                [newId]: ec.relations?.[newId] || defaultRelationDesc, // Add relation to new char
                            }
                        }));
                    }
                }
            });

            if (charsToAdd.length > 0) return [...existingStagedCharsCopy, ...charsToAdd];
            return prevStagedChars; // Return original if no new unique characters were added
        });

        if (addedCharacterNames.length > 0) {
            React.startTransition(() => {
              toast({
                  title: "Nouveau Personnage Rencontré",
                  description: `${addedCharacterNames.join(', ')} a été ajouté aux modifications en attente. N'oubliez pas d'enregistrer les modifications pour appliquer.`,
              });
            });
        }
    }, [currentLanguage, stagedAdventureSettings.playerName, stagedAdventureSettings.rpgMode, stagedAdventureSettings.relationsMode, toast, characters]); // Added characters to dependency for liveCharNames

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
                        history: [...(char.history || []), ...newHistory].slice(-20), // Keep last 20 history entries
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

                    if (Math.abs(affinityUpdate.change) >= 3) { // Threshold for toast
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

        if (toastsToShow.length > 0) {
            React.startTransition(() => {
                toastsToShow.forEach(toastArgs => toast(toastArgs));
            });
        }
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
                if (sourceCharIndex === -1) return; // Source character not found in staged list

                let targetId: string | null = null;
                if (update.targetName.toLowerCase() === (stagedAdventureSettings.playerName || "Player").toLowerCase()) {
                    targetId = PLAYER_ID;
                } else {
                    const targetChar = charsCopy.find((c:Character) => c.name.toLowerCase() === update.targetName.toLowerCase());
                    if (targetChar) targetId = targetChar.id;
                    else return; // Target character not found in staged list
                }
                if (!targetId) return;

                const currentRelation = charsCopy[sourceCharIndex].relations?.[targetId] || defaultRelationDesc;
                // Ensure newRelation is not empty or "unknown" unless it's the only option
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

        if (toastsToShow.length > 0) {
            React.startTransition(() => {
                toastsToShow.forEach(toastArgs => toast(toastArgs));
            });
        }
    }, [currentLanguage, stagedAdventureSettings.playerName, toast, stagedAdventureSettings.relationsMode]);


   const handleEditMessage = React.useCallback((messageId: string, newContent: string) => {
       setNarrativeMessages(prev => prev.map(msg =>
           msg.id === messageId ? { ...msg, content: newContent, timestamp: Date.now() } : msg
       ));
       React.startTransition(() => { toast({ title: "Message Modifié" }); });
   }, [toast]); // Added toast to dependencies

    const handleUndoLastMessage = React.useCallback(() => {
        let messageForToast: Parameters<typeof toast>[0] | null = null;
        let newActiveCombatState = activeCombat; 

        setNarrativeMessages(prevNarrative => {
            if (prevNarrative.length <= 1 && prevNarrative[0]?.type === 'system') { 
                 messageForToast = { title: "Impossible d'annuler", description: "Aucun message à annuler après l'introduction.", variant: "destructive" };
                 return prevNarrative;
            }

            // If combat is active, undoing might be complex. For now, simple removal.
            // More sophisticated undo would require saving previous combat states.
            if (activeCombat?.isActive) {
                // This is a simplification. True combat state undo is much harder.
                // Consider disabling undo during active combat or providing a warning.
                console.warn("Undo in combat: Combat state might not be perfectly restored by simple message removal.");
            }

            // Find the last user message and remove it and the AI response that followed it
            let lastUserIndex = -1;
            for (let i = prevNarrative.length - 1; i >= 0; i--) {
                if (prevNarrative[i].type === 'user') {
                    lastUserIndex = i;
                    break;
                }
            }

            if (lastUserIndex !== -1) { 
                // Remove user message and all subsequent AI messages
                const newNarrative = prevNarrative.slice(0, lastUserIndex);
                messageForToast = { title: "Dernier tour annulé" };
                
                // Check if the message before the user's action initiated combat
                const lastAiMessageBeforeUndo = prevNarrative[lastUserIndex -1]; 
                // A simple heuristic, might need refinement.
                if (lastAiMessageBeforeUndo?.sceneDescription?.toLowerCase().includes("combat started") || lastAiMessageBeforeUndo?.content.toLowerCase().includes("combat commence")) { 
                    newActiveCombatState = undefined; // Attempt to revert combat state
                }
                return newNarrative;
            } else if (prevNarrative.length > 1 && prevNarrative[0]?.type === 'system') { 
                 // If no user message found but there are AI messages after system intro, remove last AI message
                 const newNarrative = prevNarrative.slice(0, -1); 
                 messageForToast = { title: "Dernier message IA annulé" };
                 return newNarrative;
            }
            
            messageForToast = { title: "Annulation non applicable", description:"Aucune action utilisateur claire à annuler ou déjà à l'état initial."};
            return prevNarrative;
        });
        
        setActiveCombat(newActiveCombatState); // Update combat state if changed

        if (messageForToast) {
           React.startTransition(() => {
             toast(messageForToast as Parameters<typeof toast>[0]); 
           });
        }
    }, [activeCombat, toast]); // Added activeCombat to dependencies


    const handleRegenerateLastResponse = React.useCallback(async () => {
         if (isRegenerating) return;

         let lastAiMessage: Message | undefined;
         let lastUserAction: string | undefined;
         let contextMessages: Message[] = []; 
         let lastAiIndex = -1; 

         const currentNarrative = [...narrativeMessages]; // Use a copy
         for (let i = currentNarrative.length - 1; i >= 0; i--) {
             const message = currentNarrative[i];
             if (message.type === 'ai' && !lastAiMessage) {
                 lastAiMessage = message;
                 lastAiIndex = i; // Store the index of the AI message to replace
             } else if (message.type === 'user' && lastAiMessage) { // Found user action preceding the last AI message
                 lastUserAction = message.content;
                 // Build context from messages before this user action
                 const contextEndIndex = i; // Index of the user message
                 contextMessages = currentNarrative.slice(Math.max(0, contextEndIndex - 4), contextEndIndex + 1); // Include user msg
                 break;
             }
         }

         if (!lastAiMessage || !lastUserAction) {
             React.startTransition(() => { toast({ title: "Impossible de régénérer", description: "Aucune réponse IA précédente valide trouvée pour régénérer.", variant: "destructive" }); });
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
                 activeCombat: activeCombat, // Pass current combat state for context
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

             // Replace the last AI message instead of just appending
             setNarrativeMessages(prev => {
                const newNarrative = [...prev];
                const newAiMessage: Message = {
                     id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`, // New ID for new message
                     type: 'ai',
                     content: result.narrative,
                     timestamp: Date.now(),
                     sceneDescription: result.sceneDescriptionForImage,
                 };
                 if (lastAiIndex !== -1) {
                     newNarrative.splice(lastAiIndex, 1, newAiMessage); // Replace at the stored index
                 } else {
                     // Fallback: should not happen if logic above is correct
                     newNarrative.push(newAiMessage);
                 }
                return newNarrative;
             });
            
             // Handle side effects from the new response
             if (result.newCharacters) handleNewCharacters(result.newCharacters);
             if (result.characterUpdates) handleCharacterHistoryUpdate(result.characterUpdates);
             if(adventureSettings.relationsMode && result.affinityUpdates) handleAffinityUpdates(result.affinityUpdates);
             if(adventureSettings.relationsMode && result.relationUpdates) handleRelationUpdatesFromAI(result.relationUpdates);
             if(adventureSettings.rpgMode && result.combatUpdates) {
                // Important: Regeneration might alter combat state.
                // The AI should provide the *new* full combat state if it changed.
                handleCombatUpdates(result.combatUpdates);
             }


             React.startTransition(() => { toast({ title: "Réponse Régénérée", description: "Une nouvelle réponse a été ajoutée." }); });
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
        // This function saves a character from the current adventure (stagedCharacters)
        // to the global list in localStorage.
        if (typeof window !== 'undefined') {
            try {
                const existingCharsStr = localStorage.getItem('globalCharacters');
                let existingChars: Character[] = existingCharsStr ? JSON.parse(existingCharsStr) : [];
                
                // Check if character already exists by ID or name (case-insensitive)
                const charIndex = existingChars.findIndex(c => c.id === character.id || c.name.toLowerCase() === character.name.toLowerCase());

                if (charIndex > -1) {
                    // Update existing global character if found
                    existingChars[charIndex] = { ...character, _lastSaved: Date.now() }; 
                } else {
                    // Add new character to global list
                    existingChars.push({ ...character, _lastSaved: Date.now() }); 
                }
                localStorage.setItem('globalCharacters', JSON.stringify(existingChars));
                React.startTransition(() => { 
                    toast({ title: "Personnage Sauvegardé Globalement", description: `${character.name} est maintenant disponible pour d'autres aventures et pour le chat.` }); 
                    // Update the staged character with a _lastSaved timestamp to reflect it's globally saved
                    setStagedCharacters(prev => prev.map(c => c.id === character.id ? { ...c, _lastSaved: Date.now() } : c));
                });
            } catch (error) {
                 console.error("Failed to save character to localStorage:", error);
                 React.startTransition(() => { toast({ title: "Erreur de Sauvegarde Globale", description: "Impossible de sauvegarder le personnage globalement.", variant: "destructive" }); });
            }
        } else {
            React.startTransition(() => { toast({ title: "Erreur", description: "La sauvegarde globale n'est disponible que côté client.", variant: "destructive" }); });
        }
    }, [toast]);


    const handleAddStagedCharacter = React.useCallback((globalCharToAdd: Character) => {
        // This function adds a character from the global list (localStorage)
        // to the current adventure's stagedCharacters.
        let characterWasAdded = false;
        let characterNameForToast = globalCharToAdd.name;
    
        setStagedCharacters(prevStagedChars => {
            // Check if character (by ID or name) is already in the staged list for current adventure
            if (prevStagedChars.some(sc => sc.id === globalCharToAdd.id || sc.name.toLowerCase() === globalCharToAdd.name.toLowerCase())) {
                characterWasAdded = false; 
                return prevStagedChars; // Do not add if already present
            }
    
            characterWasAdded = true;
            const defaultRelation = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
            const newChar = { ...globalCharToAdd }; // Create a copy to avoid mutating global state directly
    
            // Initialize/Adjust relations for the context of the current adventure
            if (stagedAdventureSettings.relationsMode) {
                newChar.relations = newChar.relations || {};
                if (!newChar.relations[PLAYER_ID]) { // Relation to player
                    newChar.relations[PLAYER_ID] = defaultRelation;
                }
                // Initialize relations towards other characters already in this adventure
                prevStagedChars.forEach(existingChar => {
                    if (!newChar.relations![existingChar.id]) { 
                        newChar.relations![existingChar.id] = defaultRelation;
                    }
                });
            } else { // If relations mode is off, clear these fields for the adventure context
                newChar.relations = undefined;
                newChar.affinity = undefined; // Affinity is part of relations mode
            }
    
            // Update existing characters in the adventure to have a relation to the new character
            const updatedPrevChars = prevStagedChars.map(existingChar => {
                if (stagedAdventureSettings.relationsMode) {
                    const updatedRelations = { ...(existingChar.relations || {}), [newChar.id]: defaultRelation };
                    return { ...existingChar, relations: updatedRelations };
                }
                return existingChar;
            });
            
            // Apply RPG stats based on current adventure's RPG mode, using character's saved stats as base
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
                newChar.isHostile = newChar.isHostile ?? false; // Default to not hostile when added
            } else { // If RPG mode is off for this adventure, clear RPG stats
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
        // Ensure characters being saved reflect the latest from 'stagedCharacters' if "Apply Changes" hasn't been hit yet,
        // but typically, save should operate on the 'live' state (adventureSettings, characters).
        // For simplicity, this save uses the 'live' state. User should "Apply Changes" first for form edits to be included.
        const charactersToSave = characters.map(({ ...char }) => char); // Create copies
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
        React.startTransition(() => { toast({ title: "Aventure Sauvegardée", description: "Le fichier JSON a été téléchargé." }); });
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
                        // Attempt to migrate very old string narrative format
                        loadedData.narrative = [{ id: `migrated-${Date.now()}`, type: 'system', content: loadedData.narrative as unknown as string, timestamp: Date.now() }];
                    } else throw new Error("Structure des messages narratifs invalide.");
                }

                 // Migration logic for older save formats
                 if (loadedData.saveFormatVersion === undefined || loadedData.saveFormatVersion < 1.4) {
                     // Migrate character history, opinion, affinity, relations
                     loadedData.characters = loadedData.characters.map(c => ({ ...c, history: Array.isArray(c.history) ? c.history : [], opinion: typeof c.opinion === 'object' && c.opinion !== null ? c.opinion : {}, affinity: c.affinity ?? 50, relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                     loadedData.adventureSettings.playerName = loadedData.adventureSettings.playerName || "Player";
                 }
                 if (loadedData.saveFormatVersion < 1.5) { // If relations mode was introduced but not explicit
                       loadedData.adventureSettings.relationsMode = loadedData.adventureSettings.relationsMode ?? true; // Assume true if undefined
                       loadedData.characters = loadedData.characters.map(c => ({ ...c, relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                 }
                  if (loadedData.saveFormatVersion < 1.6) { // Ensure relations is an object
                       loadedData.characters = loadedData.characters.map(c => ({ ...c, relations: typeof c.relations === 'object' && c.relations !== null ? c.relations : { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                 }

                const rpgModeActive = loadedData.adventureSettings.rpgMode;
                const relationsModeActive = loadedData.adventureSettings.relationsMode ?? true; // Default to true if not present
                const loadedLang = loadedData.currentLanguage || "fr";
                const defaultRelation = loadedLang === 'fr' ? "Inconnu" : "Unknown";

                const validatedCharacters = loadedData.characters.map((c: any) => {
                    const charId = c.id || `${c.name?.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                    let relations = relationsModeActive && typeof c.relations === 'object' && c.relations !== null ? c.relations : (relationsModeActive ? { [PLAYER_ID]: defaultRelation } : undefined);
                    if (relationsModeActive && relations && !relations[PLAYER_ID]) relations[PLAYER_ID] = defaultRelation; // Ensure player relation
                    
                    // Ensure relations between all loaded characters are at least default
                    if (relationsModeActive && relations && loadedData.characters) {
                        loadedData.characters.forEach(otherC => {
                            if (otherC.id !== charId && !relations![otherC.id]) {
                                relations![otherC.id] = defaultRelation;
                            }
                        });
                    }

                    return { // Build a full Character object
                        id: charId,
                        name: c.name || "Inconnu", details: c.details || "", biographyNotes: c.biographyNotes, history: Array.isArray(c.history) ? c.history : [],
                        opinion: typeof c.opinion === 'object' && c.opinion !== null ? c.opinion : {},
                        portraitUrl: c.portraitUrl || null,
                        affinity: relationsModeActive ? (c.affinity ?? 50) : undefined,
                        relations: relations,
                        _lastSaved: c._lastSaved, // Preserve global save timestamp if present
                        ...(rpgModeActive ? { // Only include RPG stats if RPG mode is active in loaded settings
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
                        } : {}), // Empty object if RPG mode is off
                    }
                });
                
                // Construct the final adventure settings
                const finalAdventureSettings: AdventureSettings = {
                    ...baseAdventureSettings, // Start with defaults
                    ...loadedData.adventureSettings, // Override with loaded settings
                    relationsMode: relationsModeActive, // Ensure this is set
                    // Set player live stats based on loaded data and RPG mode
                    playerCurrentHp: loadedData.adventureSettings.rpgMode ? (loadedData.adventureSettings.playerCurrentHp ?? loadedData.adventureSettings.playerMaxHp) : undefined,
                    playerCurrentMp: loadedData.adventureSettings.rpgMode ? (loadedData.adventureSettings.playerCurrentMp ?? loadedData.adventureSettings.playerMaxMp) : undefined,
                    playerCurrentExp: loadedData.adventureSettings.rpgMode ? (loadedData.adventureSettings.playerCurrentExp ?? 0) : undefined,
                };

                // Update base states, which will trigger useEffect to update live and staged states
                setBaseAdventureSettings(JSON.parse(JSON.stringify(finalAdventureSettings)));
                setBaseCharacters(JSON.parse(JSON.stringify(validatedCharacters)));
                setNarrativeMessages(loadedData.narrative as Message[]); // Narrative is directly set
                setCurrentLanguage(loadedLang);
                setActiveCombat(loadedData.activeCombat || undefined); // Restore combat state

                React.startTransition(() => { toast({ title: "Aventure Chargée", description: "L'état de l'aventure a été restauré." }); });
            } catch (error: any) {
                console.error("Error loading adventure:", error);
                React.startTransition(() => { toast({ title: "Erreur de Chargement", description: `Impossible de lire le fichier JSON: ${error.message}`, variant: "destructive" }); });
            }
        };
        reader.readAsText(file);
        if(event.target) event.target.value = ''; // Reset file input to allow re-uploading the same file
    }, [toast, baseAdventureSettings]); // Removed setBaseAdventureSettings, setBaseCharacters to avoid loop, they are updated via the load logic.

    // Function to restart the adventure
    const confirmRestartAdventure = React.useCallback(() => {
        const initialSettings = JSON.parse(JSON.stringify(baseAdventureSettings)); // Use the current base settings
        const newLiveAdventureSettings = {
            ...initialSettings,
            playerCurrentHp: initialSettings.rpgMode ? initialSettings.playerMaxHp : undefined,
            playerCurrentMp: initialSettings.rpgMode ? initialSettings.playerMaxMp : undefined,
            playerCurrentExp: initialSettings.rpgMode ? 0 : undefined,
        };
        const newLiveCharacters = JSON.parse(JSON.stringify(baseCharacters)); // Use the current base characters
        const newNarrative = [{ id: `msg-${Date.now()}`, type: 'system', content: initialSettings.initialSituation, timestamp: Date.now() }];

        setAdventureSettings(newLiveAdventureSettings);
        setCharacters(newLiveCharacters);
        setNarrativeMessages(newNarrative);
        setActiveCombat(undefined);

        // Update staged settings and characters to reflect the restart
        setStagedAdventureSettings(JSON.parse(JSON.stringify(newLiveAdventureSettings)));
        setStagedCharacters(JSON.parse(JSON.stringify(newLiveCharacters)));
        setFormPropKey(prev => prev + 1); // Force re-render of AdventureForm

        setShowRestartConfirm(false);
        React.startTransition(() => { toast({ title: "Aventure Recommencée", description: "L'histoire a été réinitialisée." }); });
    }, [baseAdventureSettings, baseCharacters, toast]);


  // Memoized version of stagedAdventureSettings for AdventureForm's initialValues
  // This helps prevent AdventureForm from re-rendering unnecessarily if only live player stats change.
  const memoizedStagedAdventureSettingsForForm = React.useMemo<AdventureFormValues>(() => {
    return {
      world: stagedAdventureSettings.world,
      initialSituation: stagedAdventureSettings.initialSituation,
      playerName: stagedAdventureSettings.playerName,
      currencyName: stagedAdventureSettings.currencyName,
      enableRpgMode: stagedAdventureSettings.rpgMode,
      enableRelationsMode: stagedAdventureSettings.relationsMode ?? true, 
      characters: stagedCharacters.map(c => ({ id: c.id, name: c.name, details: c.details })), 
      // RPG Player Config for form (not live stats)
      playerClass: stagedAdventureSettings.playerClass,
      playerLevel: stagedAdventureSettings.playerLevel,
      playerMaxHp: stagedAdventureSettings.playerMaxHp,
      playerMaxMp: stagedAdventureSettings.playerMaxMp,
      playerExpToNextLevel: stagedAdventureSettings.playerExpToNextLevel,
    };
  }, [stagedAdventureSettings, stagedCharacters]); // Dependencies are the staged states


  const callGenerateAdventure = async (input: GenerateAdventureInput) => {
        // Wrapper for the AI call to handle narrative updates and side effects
        try {
            const result = await generateAdventure(input); // Call the imported server action
            
            // Update narrative with AI response
            handleNarrativeUpdate(result.narrative, 'ai', result.sceneDescriptionForImage);
            
            // Handle side effects like new characters, history updates, etc.
            if (result.newCharacters) handleNewCharacters(result.newCharacters);
            if (result.characterUpdates) handleCharacterHistoryUpdate(result.characterUpdates);
            if (adventureSettings.relationsMode && result.affinityUpdates) handleAffinityUpdates(result.affinityUpdates);
            if (adventureSettings.relationsMode && result.relationUpdates) handleRelationUpdatesFromAI(result.relationUpdates);
            
            // Handle combat updates if RPG mode is active and combat occurred
            if (adventureSettings.rpgMode && result.combatUpdates) {
                handleCombatUpdates(result.combatUpdates);
            }
            
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
            // Optionally, add a system message to the narrative about the error
            // handleNarrativeUpdate(`Erreur système: ${toastDescription}`, 'system');
        }
    };

    const callSuggestQuestHook = async () => {
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
            const result = await suggestQuestHook(input); // Call the imported server action
            React.startTransition(() => {
                toast({
                    title: "Suggestion d'Objectif",
                    description: `${result.questHook} (Raison: ${result.justification})`,
                    duration: 10000, // Longer duration for reading
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
    };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <>
      <PageStructure
        adventureSettings={adventureSettings} // Pass live settings for display
        characters={characters} // Pass live characters for display and AI context
        stagedAdventureSettings={memoizedStagedAdventureSettingsForForm} // Pass staged settings for forms
        stagedCharacters={stagedCharacters} // Pass staged characters for forms
        formPropKey={formPropKey} // To re-key and re-initialize AdventureForm
        handleApplyStagedChanges={handleApplyStagedChanges}
        narrativeMessages={narrativeMessages}
        currentLanguage={currentLanguage}
        fileInputRef={fileInputRef}
        handleSettingsUpdate={handleSettingsUpdate} // For AdventureForm to update staged settings
        handleCharacterUpdate={handleCharacterUpdate} // For CharacterSidebar to update staged characters
        handleNewCharacters={handleNewCharacters} // For AI to add new characters to staged
        handleCharacterHistoryUpdate={handleCharacterHistoryUpdate} // For AI to update history in staged
        handleAffinityUpdates={handleAffinityUpdates} // For AI to update affinity in staged
        handleRelationUpdate={handleRelationUpdate} // For CharacterSidebar to update relations in staged
        handleRelationUpdatesFromAI={handleRelationUpdatesFromAI} // For AI to update relations in staged
        handleSaveNewCharacter={handleSaveNewCharacter} // To save a staged character globally
        handleAddStagedCharacter={handleAddStagedCharacter} // To add a global char to staged adventure
        handleNarrativeUpdate={handleNarrativeUpdate} // For user/AI to add to narrative
        handleSave={handleSave} // To save current live adventure
        handleLoad={handleLoad} // To load an adventure (updates base states)
        setCurrentLanguage={setCurrentLanguage}
        translateTextAction={translateText}
        generateAdventureAction={callGenerateAdventure} // Wrapped AI call
        generateSceneImageAction={generateSceneImage}
        handleEditMessage={handleEditMessage} 
        handleRegenerateLastResponse={handleRegenerateLastResponse} 
        handleUndoLastMessage={handleUndoLastMessage} 
        playerId={PLAYER_ID}
        playerName={adventureSettings.playerName || "Player"} // Use live player name
        onRestartAdventure={() => setShowRestartConfirm(true)}
        activeCombat={activeCombat} // Pass live combat state
        onCombatUpdates={handleCombatUpdates} // To update live combat state from AI
        suggestQuestHookAction={callSuggestQuestHook} // Wrapped AI call
        isSuggestingQuest={isSuggestingQuest}
      />
       <AlertDialog open={showRestartConfirm} onOpenChange={setShowRestartConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Recommencer l'aventure ?</AlertDialogTitle>
                <AlertDialogDescription>
                    Êtes-vous sûr de vouloir recommencer l'aventure en cours ? Toute la progression narrative et les changements sur les personnages (non sauvegardés globalement) seront perdus et réinitialisés aux derniers paramètres de l'aventure (ou ceux par défaut si non modifiés). L'état de combat et les statistiques du joueur seront également réinitialisés.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowRestartConfirm(false)}>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={confirmRestartAdventure}>Recommencer</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </>
  );
}

