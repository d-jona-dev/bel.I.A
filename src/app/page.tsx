
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
import { suggestQuestHook } from "@/ai/flows/suggest-quest-hook"; // Import the new flow
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
  const [isSuggestingQuest, setIsSuggestingQuest] = React.useState<boolean>(false);

  const { toast } = useToast();

  React.useEffect(() => {
    const currentBaseAdventureSettings = baseAdventureSettings; 
    const currentBaseCharacters = baseCharacters; 

    const initialSettings = JSON.parse(JSON.stringify(currentBaseAdventureSettings));
    const newLiveAdventureSettings = {
        ...initialSettings,
        playerCurrentHp: initialSettings.playerMaxHp,
        playerCurrentMp: initialSettings.playerMaxMp,
        playerCurrentExp: 0,
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
    const liveAdventureSettings = adventureSettings;
    const liveCharacters = characters;

    setStagedAdventureSettings(JSON.parse(JSON.stringify(liveAdventureSettings)));
    setStagedCharacters(JSON.parse(JSON.stringify(liveCharacters)));
    setFormPropKey(prev => prev + 1); 
  }, [adventureSettings, characters]);


  const handleSettingsUpdate = React.useCallback((newSettingsFromForm: AdventureFormValues) => {
    setStagedAdventureSettings(prevStagedSettings => ({
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
    }));

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
      return updatedCharsList;
    });
  }, [currentLanguage, setStagedAdventureSettings, setStagedCharacters]);


  const handleApplyStagedChanges = React.useCallback(() => {
    setAdventureSettings(prevLiveSettings => {
        let newLiveSettings = JSON.parse(JSON.stringify(stagedAdventureSettings));
        if (stagedAdventureSettings.initialSituation === prevLiveSettings.initialSituation) {
            newLiveSettings.playerCurrentHp = prevLiveSettings.playerCurrentHp;
            newLiveSettings.playerCurrentMp = prevLiveSettings.playerCurrentMp;
            newLiveSettings.playerCurrentExp = prevLiveSettings.playerCurrentExp;
            newLiveSettings.playerLevel = prevLiveSettings.playerLevel; 
        } else {
            setNarrativeMessages([{ id: `msg-${Date.now()}`, type: 'system', content: stagedAdventureSettings.initialSituation, timestamp: Date.now() }]);
            setActiveCombat(undefined); 
            if(stagedAdventureSettings.rpgMode) { 
                newLiveSettings.playerCurrentHp = stagedAdventureSettings.playerMaxHp;
                newLiveSettings.playerCurrentMp = stagedAdventureSettings.playerMaxMp;
                newLiveSettings.playerCurrentExp = 0;
                newLiveSettings.playerLevel = stagedAdventureSettings.playerLevel || 1; 
            }
        }
        if (stagedAdventureSettings.rpgMode) {
             newLiveSettings.playerCurrentHp = Math.min(newLiveSettings.playerCurrentHp ?? newLiveSettings.playerMaxHp, newLiveSettings.playerMaxHp);
             newLiveSettings.playerCurrentMp = Math.min(newLiveSettings.playerCurrentMp ?? newLiveSettings.playerMaxMp, newLiveSettings.playerMaxMp);
        }
        return newLiveSettings;
    });
    setCharacters(JSON.parse(JSON.stringify(stagedCharacters))); 

    React.startTransition(() => {
        toast({ title: "Modifications Enregistrées", description: "Les paramètres de l'aventure et des personnages ont été mis à jour." });
    });
  }, [stagedAdventureSettings, stagedCharacters, toast, setNarrativeMessages, setActiveCombat, setAdventureSettings, setCharacters]);


   const handleNarrativeUpdate = React.useCallback((content: string, type: 'user' | 'ai', sceneDesc?: string) => {
       const newMessage: Message = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`, 
            type: type,
            content: content,
            timestamp: Date.now(),
            sceneDescription: type === 'ai' ? sceneDesc : undefined, 
       };
       setNarrativeMessages(prevNarrative => [...prevNarrative, newMessage]);
   }, [setNarrativeMessages]);

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
                        isHostile: combatantUpdate.isDefeated ? char.isHostile : true 
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
                 newSettings.playerCurrentMp = Math.min(newSettings.playerMaxMp, newSettings.playerCurrentMp + 1);
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
                    description: `Vous avez trouvé:\n${lootLines.join('\n')}. (Inventaire conceptuel mis à jour)`,
                    duration: 7000 // Longer duration for multi-line toasts
                });
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

    }, [toast, adventureSettings.rpgMode, setCharacters, setAdventureSettings, setActiveCombat]);


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

                    if (stagedAdventureSettings.relationsMode && newCharData.initialRelations && Array.isArray(newCharData.initialRelations)) {
                        newCharData.initialRelations.forEach(rel => {
                            const relationDescription = rel.description || defaultRelationDesc;
                            if (rel.targetName.toLowerCase() === (stagedAdventureSettings.playerName || "Player").toLowerCase()) {
                                processedRelations[PLAYER_ID] = relationDescription;
                            } else {
                                const targetChar = existingStagedCharsCopy.find((ec: Character) => ec.name.toLowerCase() === rel.targetName.toLowerCase());
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


                    const characterToAdd: Character = {
                        id: newId, name: newCharData.name,
                        details: newCharData.details || (currentLanguage === 'fr' ? "Rencontré récemment." : "Recently met."),
                        biographyNotes: newCharData.biographyNotes,
                        history: newCharData.initialHistoryEntry ? [newCharData.initialHistoryEntry] : [`Rencontré le ${new Date().toLocaleString()}`],
                        opinion: {}, portraitUrl: null,
                        affinity: stagedAdventureSettings.relationsMode ? 50 : undefined, 
                        relations: stagedAdventureSettings.relationsMode ? processedRelations : undefined,
                        isHostile: stagedAdventureSettings.rpgMode ? newCharData.isHostile : undefined,
                        inventory: stagedAdventureSettings.rpgMode ? newCharData.inventory : undefined,
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
                    currentStagedCharNames.add(newCharData.name.toLowerCase()); 

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
    }, [currentLanguage, stagedAdventureSettings.playerName, stagedAdventureSettings.rpgMode, stagedAdventureSettings.relationsMode, toast, characters, setStagedCharacters]);

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
        if (!stagedAdventureSettings.relationsMode) return;
        setStagedCharacters(prevChars => prevChars.map(char => { 
            if (char.id === charId) {
                const updatedRelations = { ...(char.relations || {}), [targetId]: newRelation };
                return { ...char, relations: updatedRelations };
            }
            return char;
        }));
    }, [stagedAdventureSettings.relationsMode, setStagedCharacters]);

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

        if (toastsToShow.length > 0) {
            React.startTransition(() => {
                toastsToShow.forEach(toastArgs => toast(toastArgs));
            });
        }
    }, [currentLanguage, stagedAdventureSettings.playerName, toast, stagedAdventureSettings.relationsMode, setStagedCharacters]);


   const handleEditMessage = React.useCallback((messageId: string, newContent: string) => {
       setNarrativeMessages(prev => prev.map(msg =>
           msg.id === messageId ? { ...msg, content: newContent, timestamp: Date.now() } : msg
       ));
       React.startTransition(() => { toast({ title: "Message Modifié" }); });
   }, [toast, setNarrativeMessages]);

    const handleUndoLastMessage = React.useCallback(() => {
        let messageForToast: Parameters<typeof toast>[0] | null = null;
        let newActiveCombatState = activeCombat; 

        setNarrativeMessages(prevNarrative => {
            if (prevNarrative.length <= 1) { 
                 messageForToast = { title: "Impossible d'annuler", description: "Aucun message à annuler.", variant: "destructive" };
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
                if (lastAiMessageBeforeUndo?.sceneDescription?.includes("combat started")) { 
                    newActiveCombatState = undefined; 
                }
                return newNarrative;
            } else if (prevNarrative.length > 1) { 
                 const newNarrative = prevNarrative.slice(0, -1); 
                 messageForToast = { title: "Dernier message annulé" };
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
    }, [setNarrativeMessages, toast, activeCombat, setActiveCombat]);


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
       setStagedCharacters(prev => prev.map(c => c.id === updatedCharacter.id ? updatedCharacter : c));
   }, [setStagedCharacters]);

    const handleSaveNewCharacter = React.useCallback((character: Character) => {
        if (typeof window !== 'undefined') {
            try {
                const existingCharsStr = localStorage.getItem('globalCharacters');
                let existingChars: Character[] = existingCharsStr ? JSON.parse(existingCharsStr) : [];
                
                const charIndex = existingChars.findIndex(c => c.id === character.id || c.name.toLowerCase() === character.name.toLowerCase());

                if (charIndex > -1) {
                    existingChars[charIndex] = character; 
                } else {
                    existingChars.push(character); 
                }
                localStorage.setItem('globalCharacters', JSON.stringify(existingChars));
                React.startTransition(() => { 
                    toast({ title: "Personnage Sauvegardé", description: `${character.name} est maintenant disponible globalement.` }); 
                    setStagedCharacters(prev => prev.map(c => c.id === character.id ? { ...c, _lastSaved: Date.now() } as any : c));
                });
            } catch (error) {
                 console.error("Failed to save character to localStorage:", error);
                 React.startTransition(() => { toast({ title: "Erreur de Sauvegarde", description: "Impossible de sauvegarder le personnage globalement.", variant: "destructive" }); });
            }
        } else {
            React.startTransition(() => { toast({ title: "Erreur", description: "La sauvegarde globale n'est disponible que côté client.", variant: "destructive" }); });
        }
    }, [toast, setStagedCharacters]);


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
                toast({ title: "Personnage Ajouté", description: `${characterNameForToast} a été ajouté aux modifications en attente. N'oubliez pas d'enregistrer les modifications.` });
            } else {
                toast({ title: "Personnage déjà présent", description: `${characterNameForToast} est déjà dans l'aventure.`, variant: "default" });
            }
        });
    }, [currentLanguage, toast, stagedAdventureSettings.rpgMode, stagedAdventureSettings.relationsMode, setStagedCharacters, stagedAdventureSettings.playerName]);


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
        a.download = `aventurier_textuel_${new Date().toISOString().split('T')[0]}.json`;
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
                        loadedData.narrative = [{ id: `migrated-${Date.now()}`, type: 'system', content: loadedData.narrative as unknown as string, timestamp: Date.now() }];
                    } else throw new Error("Structure des messages narratifs invalide.");
                }

                 if (loadedData.saveFormatVersion === undefined || loadedData.saveFormatVersion < 1.4) {
                     loadedData.characters = loadedData.characters.map(c => ({ ...c, history: Array.isArray(c.history) ? c.history : [], opinion: typeof c.opinion === 'object' && c.opinion !== null ? c.opinion : {}, affinity: c.affinity ?? 50, relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                     loadedData.adventureSettings.playerName = loadedData.adventureSettings.playerName || "Player";
                 }
                 if (loadedData.saveFormatVersion < 1.5) { 
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
                    
                    if (relationsModeActive && relations) {
                        loadedData.characters?.forEach(otherC => {
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
                };

                setBaseAdventureSettings(JSON.parse(JSON.stringify(finalAdventureSettings)));
                setBaseCharacters(JSON.parse(JSON.stringify(validatedCharacters)));
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
        if(event.target) event.target.value = ''; 
    }, [toast, baseAdventureSettings, setBaseAdventureSettings, setBaseCharacters]); 

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const confirmRestartAdventure = React.useCallback(() => {
        setBaseAdventureSettings(prev => JSON.parse(JSON.stringify(prev))); 
        setBaseCharacters(prev => JSON.parse(JSON.stringify(prev)));   
    
        setShowRestartConfirm(false);
        React.startTransition(() => { toast({ title: "Aventure Recommencée", description: "L'histoire a été réinitialisée à son état initial." }); });
    }, [toast, setBaseAdventureSettings, setBaseCharacters]); 


    const memoizedStagedAdventureSettingsForForm = React.useMemo<AdventureFormValues>(() => {
    return {
      world: stagedAdventureSettings.world,
      initialSituation: stagedAdventureSettings.initialSituation,
      playerName: stagedAdventureSettings.playerName,
      currencyName: stagedAdventureSettings.currencyName,
      enableRpgMode: stagedAdventureSettings.rpgMode,
      enableRelationsMode: stagedAdventureSettings.relationsMode ?? true, 
      characters: stagedCharacters.map(c => ({ id: c.id, name: c.name, details: c.details })), 
      playerClass: stagedAdventureSettings.playerClass,
      playerLevel: stagedAdventureSettings.playerLevel,
      playerMaxHp: stagedAdventureSettings.playerMaxHp,
      playerMaxMp: stagedAdventureSettings.playerMaxMp,
      playerExpToNextLevel: stagedAdventureSettings.playerExpToNextLevel,
    };
  }, [stagedAdventureSettings, stagedCharacters]);


  const callGenerateAdventure = async (input: GenerateAdventureInput) => {
        try {
            const result = await generateAdventure(input); 
            handleNarrativeUpdate(result.narrative, 'ai', result.sceneDescriptionForImage);
            
            if (result.newCharacters) handleNewCharacters(result.newCharacters);
            if (result.characterUpdates) handleCharacterHistoryUpdate(result.characterUpdates);
            if (adventureSettings.relationsMode && result.affinityUpdates) handleAffinityUpdates(result.affinityUpdates);
            if (adventureSettings.relationsMode && result.relationUpdates) handleRelationUpdatesFromAI(result.relationUpdates);
            
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
            const result = await suggestQuestHook(input);
            React.startTransition(() => {
                toast({
                    title: "Suggestion d'Objectif",
                    description: `${result.questHook} (Raison: ${result.justification})`,
                    duration: 10000, // Longer duration for this toast
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

