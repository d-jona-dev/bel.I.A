
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

export type AdventureFormValues = Omit<AdventureSettings, 'rpgMode' | 'relationsMode' | 'characters' | 'playerCurrentHp' | 'playerCurrentMp' | 'playerCurrentExp'> & {
  characters: FormCharacterDefinition[];
  enableRpgMode?: boolean;
  enableRelationsMode?: boolean;
};


export default function Home() {
  const [baseAdventureSettings, setBaseAdventureSettings] = React.useState<AdventureSettings>({
    world: "Grande université populaire nommée \"hight scoole of futur\".",
    initialSituation: "Vous marchez dans les couloirs animés de Hight School of Future lorsque vous apercevez Rina, votre petite amie, en pleine conversation avec Kentaro, votre meilleur ami. Ils semblent étrangement proches, riant doucement. Un sentiment de malaise vous envahit.",
    rpgMode: true, // Default RPG mode to true for combat testing
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
      }
  ]);

  const [adventureSettings, setAdventureSettings] = React.useState<AdventureSettings>(() => JSON.parse(JSON.stringify(baseAdventureSettings)));
  const [characters, setCharacters] = React.useState<Character[]>(() => JSON.parse(JSON.stringify(baseCharacters)));
  const [activeCombat, setActiveCombat] = React.useState<ActiveCombat | undefined>(undefined);

  const [stagedAdventureSettings, setStagedAdventureSettings] = React.useState<AdventureSettings>(() => JSON.parse(JSON.stringify(baseAdventureSettings)));
  const [stagedCharacters, setStagedCharacters] = React.useState<Character[]>(() => JSON.parse(JSON.stringify(baseCharacters)));

  const [formPropKey, setFormPropKey] = React.useState(0);

  const [narrativeMessages, setNarrativeMessages] = React.useState<Message[]>([
     { id: `msg-${Date.now()}`, type: 'system', content: baseAdventureSettings.initialSituation, timestamp: Date.now() }
  ]);
  const [currentLanguage, setCurrentLanguage] = React.useState<string>("fr");
  const [isRegenerating, setIsRegenerating] = React.useState<boolean>(false);
  const [showRestartConfirm, setShowRestartConfirm] = React.useState<boolean>(false);

  const { toast } = useToast();

  React.useEffect(() => {
    // This effect synchronizes the live state (adventureSettings, characters, narrativeMessages, activeCombat)
    // with the base state (baseAdventureSettings, baseCharacters) ONLY when the base state itself changes.
    // This is useful for a hard reset or loading a completely new base scenario.
    const currentBaseAdventureSettings = baseAdventureSettings; 
    const currentBaseCharacters = baseCharacters; 


    const initialSettings = JSON.parse(JSON.stringify(currentBaseAdventureSettings));
    const newLiveAdventureSettings = {
        ...initialSettings,
        playerCurrentHp: initialSettings.playerMaxHp, // Ensure player starts with full HP
        playerCurrentMp: initialSettings.playerMaxMp, // Ensure player starts with full MP
        playerCurrentExp: 0, // Ensure player starts with 0 EXP
    };
    const newLiveCharacters = JSON.parse(JSON.stringify(currentBaseCharacters));
    const newNarrative = [{ id: `msg-${Date.now()}`, type: 'system', content: currentBaseAdventureSettings.initialSituation, timestamp: Date.now() }];

    setAdventureSettings(newLiveAdventureSettings);
    setCharacters(newLiveCharacters);
    setNarrativeMessages(newNarrative);
    setActiveCombat(undefined); // Reset combat state

    // Also update staged settings to reflect this new base state
    setStagedAdventureSettings(JSON.parse(JSON.stringify(newLiveAdventureSettings)));
    setStagedCharacters(JSON.parse(JSON.stringify(newLiveCharacters)));
    setFormPropKey(prev => prev + 1); // Trigger form re-initialization

  }, [baseAdventureSettings, baseCharacters]); // Only run when baseAdventureSettings or baseCharacters change


  // Effect to update staged settings when live settings change (e.g., after applying changes)
  // This ensures the form is pre-filled with the latest live data when the user opens the config panel.
  React.useEffect(() => {
    const liveAdventureSettings = adventureSettings;
    const liveCharacters = characters;

    setStagedAdventureSettings(JSON.parse(JSON.stringify(liveAdventureSettings)));
    setStagedCharacters(JSON.parse(JSON.stringify(liveCharacters)));
    setFormPropKey(prev => prev + 1); // Increment key to re-mount and re-initialize AdventureForm
  }, [adventureSettings, characters]);


  const handleSettingsUpdate = React.useCallback((newSettingsFromForm: AdventureFormValues) => {
    // This function is called by AdventureForm when its internal values change.
    // It updates the STAGED settings and characters.
    setStagedAdventureSettings(prevStagedSettings => ({
        ...prevStagedSettings, // Preserve existing staged settings like current HP/MP/EXP
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
        // playerCurrentHp, playerCurrentMp, playerCurrentExp are NOT updated here from the form,
        // they are part of the live game state and only get reset if initialSituation changes (in handleApplyStagedChanges)
        // or via game events (combat, healing etc.)
    }));

    setStagedCharacters(prevStagedChars => {
      const defaultRelation = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
      const newRPGMode = newSettingsFromForm.enableRpgMode ?? false;

      // Map over form character definitions to update staged characters
      let updatedCharsList: Character[] = newSettingsFromForm.characters.map(formDef => {
        // Try to find an existing character in the current STAGED list by ID, or by name if ID is missing (for newly added form entries)
        const existingChar = formDef.id
            ? prevStagedChars.find(sc => sc.id === formDef.id) 
            // If no ID, try to find by name, but only if it's not an already ID'd char with the same name (to avoid conflicts)
            : prevStagedChars.find(sc => sc.name === formDef.name && !prevStagedChars.some(otherSc => otherSc.id === sc.id && otherSc.id !== formDef.id && !formDef.id));


        if (existingChar) {
          // Character exists, update its name and details from the form
          return {
            ...existingChar, // Preserve all other existing properties (stats, history, relations etc.)
            name: formDef.name,
            details: formDef.details,
            // Conditionally apply/remove RPG stats based on the new RPG mode setting
            ...(newRPGMode ? {
                // Ensure RPG stats are present or initialized if RPG mode is now on
                level: existingChar.level || 1, experience: existingChar.experience || 0, characterClass: existingChar.characterClass || '',
                stats: existingChar.stats || {}, inventory: existingChar.inventory || {}, skills: existingChar.skills || {},
                spells: existingChar.spells || [], techniques: existingChar.techniques || [], passiveAbilities: existingChar.passiveAbilities || [],
                strength: existingChar.strength ?? 10, dexterity: existingChar.dexterity ?? 10, constitution: existingChar.constitution ?? 10,
                intelligence: existingChar.intelligence ?? 10, wisdom: existingChar.wisdom ?? 10, charisma: existingChar.charisma ?? 10,
                baseHitPoints: existingChar.baseHitPoints ?? 10,
                // Use existing HP/MaxHP if available, otherwise default
                hitPoints: existingChar.hitPoints ?? existingChar.maxHitPoints ?? 10,
                maxHitPoints: existingChar.maxHitPoints ?? 10,
                manaPoints: existingChar.manaPoints ?? existingChar.maxManaPoints ?? 0,
                maxManaPoints: existingChar.maxManaPoints ?? 0,
                armorClass: existingChar.armorClass ?? 10,
                attackBonus: existingChar.attackBonus ?? 0,
                damageBonus: existingChar.damageBonus ?? "1",
                isHostile: existingChar.isHostile ?? false, // Keep hostility status
            } : { 
                // If RPG mode is off, nullify RPG-specific fields
                level: undefined, experience: undefined, characterClass: undefined, stats: undefined, inventory: undefined, skills: undefined,
                spells: undefined, techniques: undefined, passiveAbilities: undefined, strength: undefined, dexterity: undefined,
                constitution: undefined, intelligence: undefined, wisdom: undefined, charisma: undefined,
                baseHitPoints: undefined, hitPoints: undefined, maxHitPoints: undefined, manaPoints: undefined, maxManaPoints: undefined,
                armorClass: undefined, attackBonus: undefined, damageBonus: undefined, isHostile: undefined, // isHostile might also be considered non-RPG
             }),
          };
        } else {
          // New character from the form (doesn't exist in staged yet)
          const newId = formDef.id || `${formDef.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          return {
            id: newId, name: formDef.name, details: formDef.details,
            // Initialize other fields for a new character
            history: [], opinion: {}, portraitUrl: null, affinity: 50,
            relations: { [PLAYER_ID]: defaultRelation }, // Default relation to player
             // Conditionally initialize RPG stats
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

      // Ensure relations are consistent if relationsMode is active
      if (newSettingsFromForm.enableRelationsMode ?? true) {
          updatedCharsList.forEach(char => {
            char.relations = char.relations || {};
            if (!char.relations[PLAYER_ID]) { // Ensure relation with player exists
                char.relations[PLAYER_ID] = defaultRelation;
            }
            // Ensure relations with all other NPCs exist (default to Unknown)
            updatedCharsList.forEach(otherChar => { 
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
  }, [currentLanguage, setStagedAdventureSettings, setStagedCharacters]);


  const handleApplyStagedChanges = React.useCallback(() => {
    // This function applies the STAGED settings and characters to the LIVE state.
    setAdventureSettings(prevLiveSettings => {
        // Create a deep copy of stagedAdventureSettings to apply
        let newLiveSettings = JSON.parse(JSON.stringify(stagedAdventureSettings));

        // Preserve live player stats unless initialSituation changes (which implies a reset)
        if (stagedAdventureSettings.initialSituation === prevLiveSettings.initialSituation) {
            newLiveSettings.playerCurrentHp = prevLiveSettings.playerCurrentHp;
            newLiveSettings.playerCurrentMp = prevLiveSettings.playerCurrentMp;
            newLiveSettings.playerCurrentExp = prevLiveSettings.playerCurrentExp;
            newLiveSettings.playerLevel = prevLiveSettings.playerLevel; // Keep current level as well
        } else {
            // Initial situation changed, reset narrative and player stats
            setNarrativeMessages([{ id: `msg-${Date.now()}`, type: 'system', content: stagedAdventureSettings.initialSituation, timestamp: Date.now() }]);
            setActiveCombat(undefined); // Reset combat
            if(stagedAdventureSettings.rpgMode) { // If RPG mode is active, reset player stats to max/initial
                newLiveSettings.playerCurrentHp = stagedAdventureSettings.playerMaxHp;
                newLiveSettings.playerCurrentMp = stagedAdventureSettings.playerMaxMp;
                newLiveSettings.playerCurrentExp = 0;
                newLiveSettings.playerLevel = stagedAdventureSettings.playerLevel || 1; // Reset to form's level or 1
            }
        }
        // Ensure player HP/MP don't exceed new max values if they were changed in form
        if (stagedAdventureSettings.rpgMode) {
             newLiveSettings.playerCurrentHp = Math.min(newLiveSettings.playerCurrentHp ?? newLiveSettings.playerMaxHp, newLiveSettings.playerMaxHp);
             newLiveSettings.playerCurrentMp = Math.min(newLiveSettings.playerCurrentMp ?? newLiveSettings.playerMaxMp, newLiveSettings.playerMaxMp);
        }

        return newLiveSettings;
    });
    setCharacters(JSON.parse(JSON.stringify(stagedCharacters))); // Apply staged characters as new live characters

    React.startTransition(() => {
        toast({ title: "Modifications Enregistrées", description: "Les paramètres de l'aventure et des personnages ont été mis à jour." });
    });
  }, [stagedAdventureSettings, stagedCharacters, toast, setNarrativeMessages, setActiveCombat, setAdventureSettings, setCharacters]);


   const handleNarrativeUpdate = React.useCallback((content: string, type: 'user' | 'ai', sceneDesc?: string) => {
       // Adds a new message to the narrative.
       const newMessage: Message = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`, // Unique ID
            type: type,
            content: content,
            timestamp: Date.now(),
            sceneDescription: type === 'ai' ? sceneDesc : undefined, // Only AI messages have scene descriptions
       };
       setNarrativeMessages(prevNarrative => [...prevNarrative, newMessage]);
   }, [setNarrativeMessages]);

    const handleCombatUpdates = React.useCallback((combatUpdates: CombatUpdatesSchema) => {
        const toastsToShow: Array<Parameters<typeof toast>[0]> = [];

        // Update Character states (HP, MP, status effects for NPCs)
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
                        // Status effects are handled by setActiveCombat below as they are part of the ActiveCombat state
                        // isHostile might also change if an enemy is defeated and combat ends or they flee
                        isHostile: combatantUpdate.isDefeated ? char.isHostile : true // Keep hostility unless defeated (might change if they surrender etc.)
                    };
                }
                return char;
            });
        });
        
        // Update Player stats (HP, MP, EXP, Level, status effects)
        setAdventureSettings(prevSettings => {
            if (!prevSettings.rpgMode) return prevSettings; // Should not happen if combatUpdates is received
            let newSettings = { ...prevSettings };

            const playerCombatUpdate = combatUpdates.updatedCombatants.find(cu => cu.combatantId === PLAYER_ID);
            if (playerCombatUpdate) {
                newSettings.playerCurrentHp = playerCombatUpdate.newHp;
                newSettings.playerCurrentMp = playerCombatUpdate.newMp ?? newSettings.playerCurrentMp;
                if (playerCombatUpdate.isDefeated) {
                    toastsToShow.push({ title: "Joueur Vaincu!", description: "L'aventure pourrait prendre un tournant difficile...", variant: "destructive" });
                }
                 // Player status effects are part of activeCombat, handled by setActiveCombat
            }

            // Regenerate 1 MP per turn if applicable and below max
            if (newSettings.playerMaxMp && (newSettings.playerMaxMp > 0) && newSettings.playerCurrentMp !== undefined && (newSettings.playerCurrentMp < newSettings.playerMaxMp)) {
                 newSettings.playerCurrentMp = Math.min(newSettings.playerMaxMp, newSettings.playerCurrentMp + 1);
            }

            // Handle EXP gain and Level Up
            if (combatUpdates.expGained && combatUpdates.expGained > 0 && newSettings.playerCurrentExp !== undefined && newSettings.playerExpToNextLevel !== undefined && newSettings.playerLevel !== undefined) {
                newSettings.playerCurrentExp += combatUpdates.expGained;
                toastsToShow.push({ title: "Expérience Gagnée!", description: `Vous avez gagné ${combatUpdates.expGained} EXP.` });

                if (newSettings.playerCurrentExp >= newSettings.playerExpToNextLevel) {
                    newSettings.playerLevel += 1;
                    newSettings.playerCurrentExp -= newSettings.playerExpToNextLevel; // Reset EXP for new level
                    newSettings.playerExpToNextLevel = Math.floor(newSettings.playerExpToNextLevel * 1.5); // Increase EXP for next level
                    // Improve stats on level up (example: +5 max HP, +2 max MP)
                    newSettings.playerMaxHp = (newSettings.playerMaxHp || 0) + Math.floor(Math.random() * 6) + 2; // e.g. 1d4+1 or similar
                    newSettings.playerCurrentHp = newSettings.playerMaxHp; // Full heal on level up
                    if (newSettings.playerMaxMp && newSettings.playerMaxMp > 0) {
                        newSettings.playerMaxMp = (newSettings.playerMaxMp || 0) + Math.floor(Math.random() * 4) + 1; // e.g. 1d3
                        newSettings.playerCurrentMp = newSettings.playerMaxMp; // Full MP on level up
                    }
                    toastsToShow.push({ title: "Niveau Supérieur!", description: `Vous avez atteint le niveau ${newSettings.playerLevel}! Vos PV et PM max ont augmenté.`, variant: "default" });
                }
            }
             // Handle Loot
             if (combatUpdates.lootDropped && combatUpdates.lootDropped.length > 0) {
                const lootNames = combatUpdates.lootDropped.map(l => `${l.itemName} (x${l.quantity})`).join(', ');
                toastsToShow.push({ title: "Butin Récupéré!", description: `Vous avez trouvé: ${lootNames}. (Inventaire non implémenté)` });
                // TODO: Actually add loot to player's inventory when implemented
            }
            return newSettings;
        });

        // Update ActiveCombat state (for next turn or end of combat)
        if (combatUpdates.nextActiveCombatState) {
             setActiveCombat(combatUpdates.nextActiveCombatState);
        } else if (combatUpdates.combatEnded) {
             setActiveCombat(undefined); // Clear active combat
            toastsToShow.push({ title: "Combat Terminé!"});
        }
        
        // Show all accumulated toasts
        React.startTransition(() => {
            toastsToShow.forEach(toastArgs => toast(toastArgs));
        });

    }, [toast, adventureSettings.rpgMode, setCharacters, setAdventureSettings, setActiveCombat]);


   const handleNewCharacters = React.useCallback((newChars: Array<NewCharacterSchema>) => {
        // Adds new characters discovered by the AI to the STAGED character list.
        if (!newChars || newChars.length === 0) return;

        const defaultRelationDesc = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
        let addedCharacterNames: string[] = [];

        setStagedCharacters(prevStagedChars => { // Operate on staged characters
            const currentLiveCharNames = new Set(characters.map(c => c.name.toLowerCase())); // Check against live characters to prevent re-adding already applied new characters
            const currentStagedCharNames = new Set(prevStagedChars.map(c => c.name.toLowerCase()));
            const charsToAdd: Character[] = [];
            let existingStagedCharsCopy = JSON.parse(JSON.stringify(prevStagedChars)); // Work on a copy

            newChars.forEach(newCharData => {
                // Only add if not already in live OR staged (to prevent duplicates if AI sends same new char multiple times before apply)
                if (!currentLiveCharNames.has(newCharData.name.toLowerCase()) && !currentStagedCharNames.has(newCharData.name.toLowerCase())) {
                    const newId = `${newCharData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                    const processedRelations: Record<string, string> = {};

                    // Process initial relations from AI if relations mode is active
                    if (stagedAdventureSettings.relationsMode && newCharData.initialRelations && Array.isArray(newCharData.initialRelations)) {
                        newCharData.initialRelations.forEach(rel => {
                            const relationDescription = rel.description || defaultRelationDesc;
                            if (rel.targetName.toLowerCase() === (stagedAdventureSettings.playerName || "Player").toLowerCase()) {
                                processedRelations[PLAYER_ID] = relationDescription;
                            } else {
                                // Find target in the *current copy* of staged characters (includes previously added new chars in this batch)
                                const targetChar = existingStagedCharsCopy.find((ec: Character) => ec.name.toLowerCase() === rel.targetName.toLowerCase());
                                if (targetChar) {
                                    processedRelations[targetChar.id] = relationDescription;
                                }
                            }
                        });
                    }

                    // Ensure default relations if relations mode is active
                    if (stagedAdventureSettings.relationsMode) {
                        if (!processedRelations[PLAYER_ID] || processedRelations[PLAYER_ID].trim() === "" || processedRelations[PLAYER_ID].toLowerCase() === "inconnu" || processedRelations[PLAYER_ID].toLowerCase() === "unknown") {
                            processedRelations[PLAYER_ID] = defaultRelationDesc;
                        }
                        // Add relation from existing characters to this new one
                        existingStagedCharsCopy.forEach((ec: Character) => {
                            // Relation of new char TO existing char
                            if (!processedRelations[ec.id] || processedRelations[ec.id].trim() === "" || processedRelations[ec.id].toLowerCase() === "inconnu" || processedRelations[ec.id].toLowerCase() === "unknown") {
                                 processedRelations[ec.id] = defaultRelationDesc;
                            }
                            // Relation of existing char TO new char
                             if (!ec.relations) ec.relations = {};
                             if(!ec.relations[newId] || ec.relations[newId].trim() === "" || ec.relations[newId].toLowerCase() === "inconnu" || ec.relations[newId].toLowerCase() === "unknown") {
                                ec.relations[newId] = defaultRelationDesc;
                             }
                        });
                    }


                    const characterToAdd: Character = {
                        id: newId, name: newCharData.name,
                        details: newCharData.details || (currentLanguage === 'fr' ? "Rencontré récemment." : "Recently met."),
                        biographyNotes: newCharData.biographyNotes,
                        history: newCharData.initialHistoryEntry ? [newCharData.initialHistoryEntry] : [`Rencontré le ${new Date().toLocaleString()}`],
                        opinion: {}, portraitUrl: null,
                        affinity: stagedAdventureSettings.relationsMode ? 50 : undefined, // Default affinity if relations mode is on
                        relations: stagedAdventureSettings.relationsMode ? processedRelations : undefined,
                        isHostile: stagedAdventureSettings.rpgMode ? newCharData.isHostile : undefined,
                        // Initialize RPG stats if RPG mode is active
                        ...(stagedAdventureSettings.rpgMode && { 
                            level: newCharData.level ?? 1,
                            experience: 0,
                            characterClass: newCharData.characterClass ?? '',
                            stats: {}, inventory: {}, skills: {},
                            spells: [], techniques: [], passiveAbilities: [], strength: 10, dexterity: 10,
                            intelligence: 10, wisdom: 10, charisma: 10, constitution: 10, // Added constitution
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
                    currentStagedCharNames.add(newCharData.name.toLowerCase()); // Add to staged names to prevent duplicates within the same batch

                    // Update relations in the working copy for subsequent new characters in this batch
                    if(stagedAdventureSettings.relationsMode) {
                        existingStagedCharsCopy = existingStagedCharsCopy.map((ec: Character) => ({
                            ...ec,
                            relations: {
                                ...(ec.relations || {}),
                                [newId]: ec.relations?.[newId] || defaultRelationDesc, // Relation from existing char TO new char
                            }
                        }));
                    }
                }
            });

            if (charsToAdd.length > 0) return [...existingStagedCharsCopy, ...charsToAdd];
            return prevStagedChars; // Return original staged characters if no new ones were actually added
        });

        if (addedCharacterNames.length > 0) {
            React.startTransition(() => {
              toast({
                  title: "Nouveau Personnage Rencontré",
                  description: `${addedCharacterNames.join(', ')} a été ajouté aux modifications en attente. N'oubliez pas d'enregistrer les modifications pour appliquer.`,
              });
            });
        }
    }, [currentLanguage, stagedAdventureSettings.playerName, stagedAdventureSettings.rpgMode, stagedAdventureSettings.relationsMode, toast, characters, setStagedCharacters]);

    const handleCharacterHistoryUpdate = React.useCallback((updates: CharacterUpdateSchema[]) => {
        // Updates history for characters in the STAGED list.
        if (!updates || updates.length === 0) return;
        setStagedCharacters(prevChars => { // Operate on staged characters
            let changed = false;
            const updatedChars = prevChars.map(char => {
                const charUpdates = updates.filter(u => u.characterName.toLowerCase() === char.name.toLowerCase());
                if (charUpdates.length > 0) {
                    changed = true;
                    const newHistory = charUpdates.map(u => u.historyEntry);
                    return {
                        ...char,
                        history: [...(char.history || []), ...newHistory],
                    };
                }
                return char;
            });
            if (changed) return updatedChars;
            return prevChars;
        });
    }, [setStagedCharacters]);

    const handleAffinityUpdates = React.useCallback((updates: AffinityUpdateSchema[]) => {
        // Updates affinity for characters in the STAGED list.
        if (!stagedAdventureSettings.relationsMode || !updates || updates.length === 0) return;

        const toastsToShow: Array<Parameters<typeof toast>[0]> = [];

        setStagedCharacters(prevChars => { // Operate on staged characters
             let changed = false;
            const updatedChars = prevChars.map(char => {
                const affinityUpdate = updates.find(u => u.characterName.toLowerCase() === char.name.toLowerCase());
                if (affinityUpdate) {
                    changed = true;
                    const currentAffinity = char.affinity ?? 50; // Default to neutral if undefined
                    const newAffinity = Math.max(0, Math.min(100, currentAffinity + affinityUpdate.change));

                    // Show toast for significant changes
                    if (Math.abs(affinityUpdate.change) >= 3) { // Threshold for "significant"
                         const charName = affinityUpdate.characterName;
                         const direction = affinityUpdate.change > 0 ? 'améliorée' : 'détériorée';
                         toastsToShow.push({
                             title: `Affinité Modifiée: ${charName}`,
                             description: `Votre relation avec ${charName} s'est ${direction}. Raison: ${affinityUpdate.reason || 'Interaction récente'}`,
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
    }, [toast, stagedAdventureSettings.relationsMode, setStagedCharacters]);

     const handleRelationUpdate = React.useCallback((charId: string, targetId: string, newRelation: string) => {
        // Updates a specific relation for a character in the STAGED list.
        if (!stagedAdventureSettings.relationsMode) return;
        setStagedCharacters(prevChars => prevChars.map(char => { // Operate on staged characters
            if (char.id === charId) {
                const updatedRelations = { ...(char.relations || {}), [targetId]: newRelation };
                return { ...char, relations: updatedRelations };
            }
            return char;
        }));
    }, [stagedAdventureSettings.relationsMode, setStagedCharacters]);

    const handleRelationUpdatesFromAI = React.useCallback((updates: RelationUpdateSchema[]) => {
        // Updates relations based on AI output, applied to STAGED characters.
        if (!stagedAdventureSettings.relationsMode || !updates || updates.length === 0) return;

        const defaultRelationDesc = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
        const toastsToShow: Array<Parameters<typeof toast>[0]> = [];

        setStagedCharacters(prevChars => { // Operate on staged characters
            let charsCopy = JSON.parse(JSON.stringify(prevChars)); // Work on a deep copy
            let changed = false;

            updates.forEach(update => {
                const sourceCharIndex = charsCopy.findIndex((c: Character) => c.name.toLowerCase() === update.characterName.toLowerCase());
                if (sourceCharIndex === -1) return; // Source character not found

                let targetId: string | null = null;
                if (update.targetName.toLowerCase() === (stagedAdventureSettings.playerName || "Player").toLowerCase()) {
                    targetId = PLAYER_ID;
                } else {
                    const targetChar = charsCopy.find((c:Character) => c.name.toLowerCase() === update.targetName.toLowerCase());
                    if (targetChar) targetId = targetChar.id;
                    else return; // Target character not found
                }
                if (!targetId) return;

                const currentRelation = charsCopy[sourceCharIndex].relations?.[targetId] || defaultRelationDesc;
                // Sanitize AI relation: if empty or "unknown", use default.
                const newRelationFromAI = update.newRelation.trim() === "" || update.newRelation.toLowerCase() === "inconnu" || update.newRelation.toLowerCase() === "unknown" ? defaultRelationDesc : update.newRelation;

                if (currentRelation !== newRelationFromAI) {
                    // Ensure relations object exists
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
    }, [currentLanguage, stagedAdventureSettings.playerName, toast, stagedAdventureSettings.relationsMode, setStagedCharacters]);


   const handleEditMessage = React.useCallback((messageId: string, newContent: string) => {
       // Edits an existing message in the narrative.
       setNarrativeMessages(prev => prev.map(msg =>
           msg.id === messageId ? { ...msg, content: newContent, timestamp: Date.now() } : msg
       ));
       React.startTransition(() => { toast({ title: "Message Modifié" }); });
   }, [toast, setNarrativeMessages]);

    const handleUndoLastMessage = React.useCallback(() => {
        // Undoes the last user action and AI response.
        let messageForToast: Parameters<typeof toast>[0] | null = null;
        let newActiveCombatState = activeCombat; // Preserve current combat state unless specifically reset

        setNarrativeMessages(prevNarrative => {
            if (prevNarrative.length <= 1) { // Cannot undo the initial system message
                 messageForToast = { title: "Impossible d'annuler", description: "Aucun message à annuler.", variant: "destructive" };
                 return prevNarrative;
            }

            // If in combat, undoing might be complex. For now, simple removal.
            if (activeCombat?.isActive) {
                // A more robust undo in combat would require saving previous combat states.
                // For now, we just warn that the state might not be perfectly restored.
                console.warn("Undo in combat: Combat state might not be perfectly restored by simple message removal.");
            }

            // Find the last user message to determine how many messages to remove (user + AI responses)
            let lastUserIndex = -1;
            for (let i = prevNarrative.length - 1; i >= 0; i--) {
                if (prevNarrative[i].type === 'user') {
                    lastUserIndex = i;
                    break;
                }
            }

            if (lastUserIndex !== -1) { // Found a user message to revert from
                const newNarrative = prevNarrative.slice(0, lastUserIndex);
                messageForToast = { title: "Dernier tour annulé" };
                
                // Check if the AI message just before the user's last action started combat
                const lastAiMessageBeforeUndo = prevNarrative[lastUserIndex -1]; // Message before the user action we are removing
                if (lastAiMessageBeforeUndo?.sceneDescription?.includes("combat started")) { // Simple check, might need refinement
                    newActiveCombatState = undefined; // Reset combat if this undo reverts its start
                }
                return newNarrative;
            } else if (prevNarrative.length > 1) { // No user message, but more than one message (e.g. multiple system/AI messages)
                 const newNarrative = prevNarrative.slice(0, -1); // Remove just the very last message
                 messageForToast = { title: "Dernier message annulé" };
                 return newNarrative;
            }
            
            // Default: No clear action to undo or already at initial state
            messageForToast = { title: "Annulation non applicable", description:"Aucune action utilisateur claire à annuler ou déjà à l'état initial."};
            return prevNarrative;
        });
        
        setActiveCombat(newActiveCombatState); // Apply potential combat state change

        if (messageForToast) {
           React.startTransition(() => {
             toast(messageForToast as Parameters<typeof toast>[0]); // Ensure type correctness
           });
        }
    }, [setNarrativeMessages, toast, activeCombat, setActiveCombat]);


    const handleRegenerateLastResponse = React.useCallback(async () => {
         // Regenerates the last AI response.
         if (isRegenerating) return;

         let lastAiMessage: Message | undefined;
         let lastUserAction: string | undefined;
         let contextMessages: Message[] = []; // Messages leading up to the last user action
         let lastAiIndex = -1; // Index of the AI message to be replaced

         const currentNarrative = [...narrativeMessages]; // Use a copy of the current messages
         // Find the last AI message and the user action that prompted it
         for (let i = currentNarrative.length - 1; i >= 0; i--) {
             const message = currentNarrative[i];
             if (message.type === 'ai' && !lastAiMessage) {
                 lastAiMessage = message;
                 lastAiIndex = i;
             } else if (message.type === 'user' && lastAiMessage) { // Found user action preceding the last AI message
                 lastUserAction = message.content;
                 const contextEndIndex = i; // User message is part of the context for regen
                 contextMessages = currentNarrative.slice(Math.max(0, contextEndIndex - 4), contextEndIndex + 1); // Include user msg, limit context
                 break;
             }
         }

         if (!lastAiMessage || !lastUserAction) {
             React.startTransition(() => { toast({ title: "Impossible de régénérer", description: "Aucune réponse IA précédente valide trouvée pour régénérer.", variant: "destructive" }); });
             return;
         }

         setIsRegenerating(true);
         React.startTransition(() => { toast({ title: "Régénération en cours...", description: "Génération d'une nouvelle réponse." }); });
        
         // Construct the narrative context for regeneration
         // It should be the history *up to and including* the last user action.
         const narrativeContextForRegen = contextMessages
             .map(msg =>
                 msg.type === 'user' ? `> ${adventureSettings.playerName || 'Player'}: ${msg.content}` : msg.content
             ).join('\n\n'); 

         try {
             const input: GenerateAdventureInput = {
                 world: adventureSettings.world, // Use current live settings
                 initialSituation: narrativeContextForRegen, // The history leading to the point of regeneration
                 characters: characters, // Current live characters
                 userAction: lastUserAction, // The user action that led to the response we are regenerating
                 currentLanguage: currentLanguage,
                 playerName: adventureSettings.playerName || "Player",
                 relationsModeActive: adventureSettings.relationsMode ?? true,
                 rpgModeActive: adventureSettings.rpgMode ?? false,
                 activeCombat: activeCombat, // Current combat state
                 currencyName: adventureSettings.currencyName,
                 // Player stats from live adventureSettings
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

             // Replace the old AI message with the new one
             setNarrativeMessages(prev => {
                const newNarrative = [...prev];
                const newAiMessage: Message = {
                     id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`, // New ID for the new message
                     type: 'ai',
                     content: result.narrative,
                     timestamp: Date.now(),
                     sceneDescription: result.sceneDescriptionForImage,
                 };
                 if (lastAiIndex !== -1) {
                     newNarrative.splice(lastAiIndex, 1, newAiMessage); // Replace the old AI message
                 } else {
                     // Should not happen if lastAiMessage was found, but as a fallback:
                     newNarrative.push(newAiMessage);
                 }
                return newNarrative;
             });
            
             // Apply updates from the new AI response to STAGED data
             if (result.newCharacters) handleNewCharacters(result.newCharacters);
             if (result.characterUpdates) handleCharacterHistoryUpdate(result.characterUpdates);
             if(adventureSettings.relationsMode && result.affinityUpdates) handleAffinityUpdates(result.affinityUpdates);
             if(adventureSettings.relationsMode && result.relationUpdates) handleRelationUpdatesFromAI(result.relationUpdates);
             if(adventureSettings.rpgMode && result.combatUpdates) handleCombatUpdates(result.combatUpdates);


             React.startTransition(() => { toast({ title: "Réponse Régénérée", description: "Une nouvelle réponse a été ajoutée." }); });
         } catch (error) {
             console.error("Error regenerating adventure:", error);
             React.startTransition(() => {
                toast({ title: "Erreur de Régénération", description: `Impossible de générer une nouvelle réponse: ${error instanceof Error ? error.message : 'Unknown error'}.`, variant: "destructive"});
              });
         } finally {
             setIsRegenerating(false);
         }
     }, [isRegenerating, narrativeMessages, adventureSettings, characters, currentLanguage, toast, handleNewCharacters, handleCharacterHistoryUpdate, handleAffinityUpdates, handleRelationUpdatesFromAI, activeCombat, handleCombatUpdates, setNarrativeMessages]);


   const handleCharacterUpdate = React.useCallback((updatedCharacter: Character) => {
       // Updates a character in the STAGED list.
       setStagedCharacters(prev => prev.map(c => c.id === updatedCharacter.id ? updatedCharacter : c));
   }, [setStagedCharacters]);

    const handleSaveNewCharacter = React.useCallback((character: Character) => {
        // Saves a character from the STAGED list to global localStorage.
        if (typeof window !== 'undefined') {
            try {
                const existingCharsStr = localStorage.getItem('globalCharacters');
                let existingChars: Character[] = existingCharsStr ? JSON.parse(existingCharsStr) : [];
                
                // Check if character already exists (by ID or name for robustness)
                const charIndex = existingChars.findIndex(c => c.id === character.id || c.name.toLowerCase() === character.name.toLowerCase());

                if (charIndex > -1) {
                    existingChars[charIndex] = character; // Update existing
                } else {
                    existingChars.push(character); // Add new
                }
                localStorage.setItem('globalCharacters', JSON.stringify(existingChars));
                React.startTransition(() => { 
                    toast({ title: "Personnage Sauvegardé", description: `${character.name} est maintenant disponible globalement.` }); 
                    // Optionally mark the character in STAGED list as saved (e.g. for UI feedback)
                    setStagedCharacters(prev => prev.map(c => c.id === character.id ? { ...c, _lastSaved: Date.now() } as any : c));
                });
            } catch (error) {
                 console.error("Failed to save character to localStorage:", error);
                 React.startTransition(() => { toast({ title: "Erreur de Sauvegarde", description: "Impossible de sauvegarder le personnage globalement.", variant: "destructive" }); });
            }
        } else {
            // This case should ideally not be hit if button is only enabled client-side
            React.startTransition(() => { toast({ title: "Erreur", description: "La sauvegarde globale n'est disponible que côté client.", variant: "destructive" }); });
        }
    }, [toast, setStagedCharacters]);


    const handleAddStagedCharacter = React.useCallback((globalCharToAdd: Character) => {
        // Adds a character from global storage to the STAGED adventure characters.
        let characterWasAdded = false;
        let characterNameForToast = globalCharToAdd.name;
    
        setStagedCharacters(prevStagedChars => {
            // Check if character (by ID or name) already exists in STAGED list
            if (prevStagedChars.some(sc => sc.id === globalCharToAdd.id || sc.name.toLowerCase() === globalCharToAdd.name.toLowerCase())) {
                characterWasAdded = false; // Already present
                return prevStagedChars;
            }
    
            characterWasAdded = true;
            const defaultRelation = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
            const newChar = { ...globalCharToAdd }; // Clone the character to avoid modifying the global list's object directly
    
            // Adjust relations if relationsMode is active in STAGED settings
            if (stagedAdventureSettings.relationsMode) {
                newChar.relations = newChar.relations || {};
                if (!newChar.relations[PLAYER_ID]) { // Ensure relation with player
                    newChar.relations[PLAYER_ID] = defaultRelation;
                }
                // Ensure new char has relations to all existing staged chars
                prevStagedChars.forEach(existingChar => {
                    if (!newChar.relations![existingChar.id]) { // Relation of new char TO existing
                        newChar.relations![existingChar.id] = defaultRelation;
                    }
                });
            } else { // If relationsMode is off, clear relations/affinity
                newChar.relations = undefined;
                newChar.affinity = undefined;
            }
    
            // Update relations for existing staged characters TO this new character
            const updatedPrevChars = prevStagedChars.map(existingChar => {
                if (stagedAdventureSettings.relationsMode) {
                    const updatedRelations = { ...(existingChar.relations || {}), [newChar.id]: defaultRelation };
                    return { ...existingChar, relations: updatedRelations };
                }
                return existingChar;
            });
            
            // Adjust RPG stats based on STAGED RPG mode
            if (stagedAdventureSettings.rpgMode) {
                // Ensure all RPG fields are present or defaulted if missing from globalCharToAdd
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
                // If RPG mode is off, strip RPG fields
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
                toast({ title: "Personnage Ajouté", description: `${characterNameForToast} a été ajouté aux modifications en attente. N'oubliez pas d'enregistrer les modifications.` });
            } else {
                toast({ title: "Personnage déjà présent", description: `${characterNameForToast} est déjà dans l'aventure.`, variant: "default" });
            }
        });
    }, [currentLanguage, toast, stagedAdventureSettings.rpgMode, stagedAdventureSettings.relationsMode, setStagedCharacters, stagedAdventureSettings.playerName]);


   const handleSave = React.useCallback(() => {
        // Saves the current LIVE adventure state to a JSON file.
        const charactersToSave = characters.map(({ ...char }) => char); // Creates a shallow copy of characters array
        const saveData: SaveData = {
            adventureSettings, // Current live adventure settings
            characters: charactersToSave, // Current live characters
            narrative: narrativeMessages, // Current narrative
            currentLanguage,
            activeCombat: activeCombat, // Current combat state
            saveFormatVersion: 1.6, // Current save format version
            timestamp: new Date().toISOString(),
        };
        const jsonString = JSON.stringify(saveData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aventurier_textuel_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        React.startTransition(() => { toast({ title: "Aventure Sauvegardée", description: "Le fichier JSON a été téléchargé." }); });
    }, [adventureSettings, characters, narrativeMessages, currentLanguage, activeCombat, toast]);

    const handleLoad = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        // Loads an adventure state from a JSON file. This updates the BASE state, which then propagates.
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
                    if (typeof loadedData.narrative === 'string') { // Attempt migration for old string narrative
                        loadedData.narrative = [{ id: `migrated-${Date.now()}`, type: 'system', content: loadedData.narrative as unknown as string, timestamp: Date.now() }];
                    } else throw new Error("Structure des messages narratifs invalide.");
                }

                 // Data migration for older save formats
                 if (loadedData.saveFormatVersion === undefined || loadedData.saveFormatVersion < 1.4) {
                     // Add missing fields for older versions
                     loadedData.characters = loadedData.characters.map(c => ({ ...c, history: Array.isArray(c.history) ? c.history : [], opinion: typeof c.opinion === 'object' && c.opinion !== null ? c.opinion : {}, affinity: c.affinity ?? 50, relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                     loadedData.adventureSettings.playerName = loadedData.adventureSettings.playerName || "Player";
                 }
                 if (loadedData.saveFormatVersion < 1.5) { // If relations field itself might be missing
                       loadedData.characters = loadedData.characters.map(c => ({ ...c, relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                 }
                  if (loadedData.saveFormatVersion < 1.6) { // Ensure relations is an object
                       loadedData.characters = loadedData.characters.map(c => ({ ...c, relations: typeof c.relations === 'object' && c.relations !== null ? c.relations : { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                 }

                // Prepare validated data to set as new base state
                const rpgModeActive = loadedData.adventureSettings.rpgMode;
                const relationsModeActive = loadedData.adventureSettings.relationsMode ?? true; // Default to true if missing
                const loadedLang = loadedData.currentLanguage || "fr";
                const defaultRelation = loadedLang === 'fr' ? "Inconnu" : "Unknown";

                const validatedCharacters = loadedData.characters.map((c: any) => {
                    const charId = c.id || `${c.name?.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                    // Ensure relations object exists and has player relation if mode is active
                    let relations = relationsModeActive && typeof c.relations === 'object' && c.relations !== null ? c.relations : (relationsModeActive ? { [PLAYER_ID]: defaultRelation } : undefined);
                    if (relationsModeActive && relations && !relations[PLAYER_ID]) relations[PLAYER_ID] = defaultRelation; // Add player relation if missing
                    
                    // Ensure relations with all other loaded characters exist if mode is active
                    if (relationsModeActive && relations) {
                        loadedData.characters?.forEach(otherC => {
                            if (otherC.id !== charId && !relations![otherC.id]) {
                                relations![otherC.id] = defaultRelation;
                            }
                        });
                    }


                    return { // Reconstruct character object to ensure all fields are present or correctly defaulted
                        id: charId,
                        name: c.name || "Inconnu", details: c.details || "", biographyNotes: c.biographyNotes, history: Array.isArray(c.history) ? c.history : [],
                        opinion: typeof c.opinion === 'object' && c.opinion !== null ? c.opinion : {},
                        portraitUrl: c.portraitUrl || null,
                        affinity: relationsModeActive ? (c.affinity ?? 50) : undefined,
                        relations: relations,
                        _lastSaved: c._lastSaved, // Preserve for UI hints if present
                        // RPG stats, apply only if rpgModeActive
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
                        } : {}), // Empty object if RPG mode is off, effectively stripping RPG stats
                    }
                });
                
                const finalAdventureSettings: AdventureSettings = {
                    ...baseAdventureSettings, // Start with current defaults as a base
                    ...loadedData.adventureSettings, // Override with loaded settings
                    relationsMode: relationsModeActive, // Ensure this is set
                    // Ensure player stats are consistent with RPG mode
                    playerCurrentHp: loadedData.adventureSettings.rpgMode ? (loadedData.adventureSettings.playerCurrentHp ?? loadedData.adventureSettings.playerMaxHp) : undefined,
                    playerCurrentMp: loadedData.adventureSettings.rpgMode ? (loadedData.adventureSettings.playerCurrentMp ?? loadedData.adventureSettings.playerMaxMp) : undefined,
                    playerCurrentExp: loadedData.adventureSettings.rpgMode ? (loadedData.adventureSettings.playerCurrentExp ?? 0) : undefined,
                };

                // Update the base state. This will trigger the useEffect to update live and staged states.
                setBaseAdventureSettings(JSON.parse(JSON.stringify(finalAdventureSettings)));
                setBaseCharacters(JSON.parse(JSON.stringify(validatedCharacters)));
                // Directly set narrative, language, and combat state for immediate reflection
                setNarrativeMessages(loadedData.narrative as Message[]);
                setCurrentLanguage(loadedLang);
                setActiveCombat(loadedData.activeCombat || undefined);

                React.startTransition(() => { toast({ title: "Aventure Chargée", description: "L'état de l'aventure a été restauré." }); });
            } catch (error: any) {
                console.error("Error loading adventure:", error);
                React.startTransition(() => { toast({ title: "Erreur de Chargement", description: `Impossible de lire le fichier JSON: ${error.message}`, variant: "destructive" }); });
            }
        };
        reader.readAsText(file);
        if(event.target) event.target.value = ''; // Reset file input to allow re-uploading same file
    }, [toast, baseAdventureSettings, setBaseAdventureSettings, setBaseCharacters]); // Dependencies for re-creating the callback if base settings structure changes (though unlikely)

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const confirmRestartAdventure = React.useCallback(() => {
        // Resets the adventure to its initial state based on the CURRENT baseAdventureSettings and baseCharacters.
        // This is effectively like "loading" the initial base state again.
        setBaseAdventureSettings(prev => JSON.parse(JSON.stringify(prev))); // Trigger reload from base settings
        setBaseCharacters(prev => JSON.parse(JSON.stringify(prev)));   // Trigger reload from base characters
        // The useEffect listening to baseAdventureSettings/baseCharacters will handle resetting
        // live adventureSettings, characters, narrativeMessages, and activeCombat.
    
        setShowRestartConfirm(false);
        React.startTransition(() => { toast({ title: "Aventure Recommencée", description: "L'histoire a été réinitialisée à son état initial." }); });
    }, [toast, setBaseAdventureSettings, setBaseCharacters]); // Dependencies ensure it uses the latest base state reference


    const memoizedStagedAdventureSettingsForForm = React.useMemo<AdventureFormValues>(() => {
    // This prepares the data specifically for the AdventureForm, excluding live player stats
    // that are not directly editable in that form (like currentHP).
    return {
      world: stagedAdventureSettings.world,
      initialSituation: stagedAdventureSettings.initialSituation,
      playerName: stagedAdventureSettings.playerName,
      currencyName: stagedAdventureSettings.currencyName,
      enableRpgMode: stagedAdventureSettings.rpgMode,
      enableRelationsMode: stagedAdventureSettings.relationsMode ?? true, // Default to true if undefined
      characters: stagedCharacters.map(c => ({ id: c.id, name: c.name, details: c.details })), // Only name/details for form
      playerClass: stagedAdventureSettings.playerClass,
      playerLevel: stagedAdventureSettings.playerLevel,
      playerMaxHp: stagedAdventureSettings.playerMaxHp,
      playerMaxMp: stagedAdventureSettings.playerMaxMp,
      playerExpToNextLevel: stagedAdventureSettings.playerExpToNextLevel,
    };
  }, [stagedAdventureSettings, stagedCharacters]);


  const callGenerateAdventure = async (input: GenerateAdventureInput) => {
        // This function is passed to AdventureDisplay to call the AI.
        // It handles the AI call and then updates STAGED data with the results.
        try {
            // setIsLoading(true); // Handled by AdventureDisplay's internal loading state
            const result = await generateAdventure(input); // Server action call
            // setIsLoading(false);

            // Update LIVE narrative immediately for responsiveness
            handleNarrativeUpdate(result.narrative, 'ai', result.sceneDescriptionForImage);
            
            // Apply other AI-driven updates to STAGED data
            if (result.newCharacters) handleNewCharacters(result.newCharacters);
            if (result.characterUpdates) handleCharacterHistoryUpdate(result.characterUpdates);
            if (adventureSettings.relationsMode && result.affinityUpdates) handleAffinityUpdates(result.affinityUpdates);
            if (adventureSettings.relationsMode && result.relationUpdates) handleRelationUpdatesFromAI(result.relationUpdates);
            
            // Combat updates are applied directly to LIVE state via handleCombatUpdates
            if (adventureSettings.rpgMode && result.combatUpdates) {
                handleCombatUpdates(result.combatUpdates);
            }
            
        } catch (error) {
            // setIsLoading(false); // Handled by AdventureDisplay
            console.error("Error in callGenerateAdventure:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            let toastDescription = `L'IA n'a pas pu générer de réponse: ${errorMessage}`;

            if (errorMessage.includes("503 Service Unavailable") || errorMessage.toLowerCase().includes("model is overloaded")) {
                toastDescription = "Le modèle d'IA est actuellement surchargé. Veuillez réessayer dans quelques instants.";
            }
            
            React.startTransition(() => {
              toast({ title: "Erreur de l'IA", description: toastDescription, variant: "destructive" });
            });
        }
    };


  return (
    <>
      <PageStructure
        adventureSettings={adventureSettings} // Pass live settings for display
        characters={characters} // Pass live characters for display
        stagedAdventureSettings={memoizedStagedAdventureSettingsForForm} // For the AdventureForm component
        stagedCharacters={stagedCharacters} // For the CharacterSidebar component
        formPropKey={formPropKey} // Key to re-initialize AdventureForm
        handleApplyStagedChanges={handleApplyStagedChanges}
        narrativeMessages={narrativeMessages}
        currentLanguage={currentLanguage}
        fileInputRef={fileInputRef}
        handleSettingsUpdate={handleSettingsUpdate} // Updates STAGED settings from AdventureForm
        handleCharacterUpdate={handleCharacterUpdate} // Updates STAGED characters from CharacterSidebar
        handleNewCharacters={handleNewCharacters} // Adds new chars from AI to STAGED
        handleCharacterHistoryUpdate={handleCharacterHistoryUpdate} // Updates history in STAGED
        handleAffinityUpdates={handleAffinityUpdates} // Updates affinity in STAGED
        handleRelationUpdate={handleRelationUpdate} // Updates relations in STAGED (manual edit)
        handleRelationUpdatesFromAI={handleRelationUpdatesFromAI} // Updates relations in STAGED (from AI)
        handleSaveNewCharacter={handleSaveNewCharacter} // Saves STAGED char to global
        handleAddStagedCharacter={handleAddStagedCharacter} // Adds global char to STAGED
        handleNarrativeUpdate={handleNarrativeUpdate} // Updates LIVE narrative
        handleSave={handleSave} // Saves LIVE state
        handleLoad={handleLoad} // Loads into BASE state
        setCurrentLanguage={setCurrentLanguage}
        translateTextAction={translateText}
        generateAdventureAction={callGenerateAdventure} // Calls AI and updates STAGED/LIVE
        generateSceneImageAction={generateSceneImage}
        handleEditMessage={handleEditMessage} // Edits LIVE narrative
        handleRegenerateLastResponse={handleRegenerateLastResponse} // Regenerates AI, updates STAGED/LIVE
        handleUndoLastMessage={handleUndoLastMessage} // Undoes in LIVE narrative
        playerId={PLAYER_ID}
        playerName={adventureSettings.playerName || "Player"} // Use live player name
        onRestartAdventure={() => setShowRestartConfirm(true)}
        activeCombat={activeCombat} // Pass live combat state
        onCombatUpdates={handleCombatUpdates} // Updates LIVE combat state & player/char stats
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

