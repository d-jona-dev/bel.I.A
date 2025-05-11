
"use client"; // Mark page as Client Component to manage state

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { Character, AdventureSettings, SaveData, Message, ActiveCombat, Combatant } from "@/types"; // Import shared types including Message, ActiveCombat
import { PageStructure } from "./page.structure"; // Import the layout structure component

// Import AI functions here
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

// Constants
const PLAYER_ID = "player";

// Helper type for character definitions within AdventureForm
export type FormCharacterDefinition = { id?: string; name: string; details: string };

// Helper type for AdventureForm props consistency
export type AdventureFormValues = Omit<AdventureSettings, 'rpgMode' | 'relationsMode' | 'characters' | 'playerCurrentHp' | 'playerCurrentMp' | 'playerCurrentExp'> & {
  characters: FormCharacterDefinition[];
  enableRpgMode?: boolean;
  enableRelationsMode?: boolean; 
};


export default function Home() {
  const [baseAdventureSettings, setBaseAdventureSettings] = React.useState<AdventureSettings>({
    world: "Grande université populaire nommée \"hight scoole of futur\".",
    initialSituation: "Vous marchez dans les couloirs animés de Hight School of Future lorsque vous apercevez Rina, votre petite amie, en pleine conversation avec Kentaro, votre meilleur ami. Ils semblent étrangement proches, riant doucement. Un sentiment de malaise vous envahit.",
    rpgMode: false, 
    relationsMode: true, 
    playerName: "Player",
    currencyName: "Pièces d'Or",
    playerClass: "Étudiant",
    playerLevel: 1,
    playerMaxHp: 20,
    playerCurrentHp: 20,
    playerMaxMp: 0, // Default to no magic
    playerCurrentMp: 0,
    playerExpToNextLevel: 100,
    playerCurrentExp: 0,
  });
  const [baseCharacters, setBaseCharacters] = React.useState<Character[]>([
      {
        id: 'rina-1',
        name: "Rina",
        details: "jeune femme de 19 ans, votre petite amie. Elle se rapproche de Kentaro. Étudiante populaire, calme, aimante, parfois secrète. 165 cm, yeux marron, cheveux mi-longs bruns, traits fins, athlétique.",
        history: ["Ceci est un exemple d'historique pour Rina."],
        opinion: {},
        affinity: 70,
        relations: { [PLAYER_ID]: "Petite amie", 'kentaro-1': "Ami Proche" },
        hitPoints: 25, maxHitPoints: 25, armorClass: 12, attackBonus: 2, damageBonus: "1d4", characterClass: "Étudiante", level: 1, isHostile: false,
      },
      {
        id: 'kentaro-1',
        name: "Kentaro",
        details: "Jeune homme de 20 ans, votre meilleur ami. Étudiant populaire, charmant mais calculateur et impulsif. 185 cm, athlétique, yeux bleus, cheveux courts blonds. Aime draguer et voir son meilleur ami souffrir. Se rapproche de Rina.",
        history: ["Kentaro a été vu parlant à Rina."],
        opinion: {},
        affinity: 30, 
        relations: { [PLAYER_ID]: "Meilleur ami (tendancieux)", 'rina-1': "Intérêt romantique" },
        hitPoints: 35, maxHitPoints: 35, armorClass: 14, attackBonus: 4, damageBonus: "1d6+1", characterClass: "Sportif Populaire", level: 2, isHostile: false, 
      }
  ]);

  const [adventureSettings, setAdventureSettings] = React.useState<AdventureSettings>(() => JSON.parse(JSON.stringify(baseAdventureSettings)));
  const [characters, setCharacters] = React.useState<Character[]>(() => JSON.parse(JSON.stringify(baseCharacters)));
  const [activeCombat, setActiveCombat] = React.useState<ActiveCombat | undefined>(undefined);

  const [stagedAdventureSettings, setStagedAdventureSettings] = React.useState<AdventureSettings>(() => JSON.parse(JSON.stringify(baseAdventureSettings)));
  const [stagedCharacters, setStagedCharacters] = React.useState<Character[]>(() => JSON.parse(JSON.stringify(baseCharacters)));

  const [formKey, setFormKey] = React.useState(0); 

  const [narrative, setNarrative] = React.useState<Message[]>([
     { id: `msg-${Date.now()}`, type: 'system', content: baseAdventureSettings.initialSituation, timestamp: Date.now() }
  ]);
  const [currentLanguage, setCurrentLanguage] = React.useState<string>("fr");
  const [isRegenerating, setIsRegenerating] = React.useState<boolean>(false);
  const [showRestartConfirm, setShowRestartConfirm] = React.useState<boolean>(false);

  const { toast } = useToast();

  React.useEffect(() => {
    setAdventureSettings(prev => ({
        ...JSON.parse(JSON.stringify(baseAdventureSettings)),
        playerCurrentHp: baseAdventureSettings.playerMaxHp,
        playerCurrentMp: baseAdventureSettings.playerMaxMp,
        playerCurrentExp: 0,
    }));
    setCharacters(JSON.parse(JSON.stringify(baseCharacters)));
    setNarrative([{ id: `msg-${Date.now()}`, type: 'system', content: baseAdventureSettings.initialSituation, timestamp: Date.now() }]);
    setActiveCombat(undefined); 
  }, [baseAdventureSettings, baseCharacters]);


  React.useEffect(() => {
    setStagedAdventureSettings(JSON.parse(JSON.stringify(adventureSettings)));
    setStagedCharacters(JSON.parse(JSON.stringify(characters)));
    setFormKey(prev => prev + 1); 
  }, [adventureSettings, characters]);


  const handleSettingsUpdate = React.useCallback((newSettingsFromForm: AdventureFormValues) => {
    setStagedAdventureSettings(prevSettings => ({
        ...prevSettings,
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
        // Current HP/MP/EXP are not set from the form, they are live game state
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
                armorClass: existingChar.armorClass ?? 10,
                attackBonus: existingChar.attackBonus ?? 0,
                damageBonus: existingChar.damageBonus ?? "1",
                isHostile: existingChar.isHostile ?? false,
            } : { 
                level: undefined, experience: undefined, characterClass: undefined, stats: undefined, inventory: undefined, skills: undefined,
                spells: undefined, techniques: undefined, passiveAbilities: undefined, strength: undefined, dexterity: undefined,
                constitution: undefined, intelligence: undefined, wisdom: undefined, charisma: undefined,
                baseHitPoints: undefined, hitPoints: undefined, maxHitPoints: undefined, armorClass: undefined,
                attackBonus: undefined, damageBonus: undefined, isHostile: undefined,
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
                baseHitPoints: 10, hitPoints: 10, maxHitPoints: 10, armorClass: 10,
                attackBonus: 0, damageBonus: "1", isHostile: false,
            } : {}),
          };
        }
      });
      
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
      return updatedCharsList;
    });
  }, [currentLanguage]);


  const handleApplyStagedChanges = React.useCallback(() => {
    const currentLiveAdventureSettings = adventureSettings;
    setAdventureSettings(prevLive => ({
        ...JSON.parse(JSON.stringify(stagedAdventureSettings)),
        // Preserve live current stats if not meant to be reset by form
        playerCurrentHp: stagedAdventureSettings.rpgMode ? (prevLive.playerCurrentHp > (stagedAdventureSettings.playerMaxHp ?? 0) ? (stagedAdventureSettings.playerMaxHp ?? 0) : prevLive.playerCurrentHp) : undefined,
        playerCurrentMp: stagedAdventureSettings.rpgMode ? (prevLive.playerCurrentMp > (stagedAdventureSettings.playerMaxMp ?? 0) ? (stagedAdventureSettings.playerMaxMp ?? 0) : prevLive.playerCurrentMp) : undefined,
        playerCurrentExp: stagedAdventureSettings.rpgMode ? prevLive.playerCurrentExp : undefined,
    }));
    setCharacters(JSON.parse(JSON.stringify(stagedCharacters)));

    if (stagedAdventureSettings.initialSituation !== currentLiveAdventureSettings.initialSituation) {
        setNarrative([{ id: `msg-${Date.now()}`, type: 'system', content: stagedAdventureSettings.initialSituation, timestamp: Date.now() }]);
        setActiveCombat(undefined); 
         if(stagedAdventureSettings.rpgMode) {
            setAdventureSettings(prev => ({
                ...prev,
                playerCurrentHp: prev.playerMaxHp,
                playerCurrentMp: prev.playerMaxMp,
                playerCurrentExp: 0,
                playerLevel: prev.playerLevel || 1, // Reset to initial level from form or 1
            }));
         }
    }
    React.startTransition(() => {
        toast({ title: "Modifications Enregistrées", description: "Les paramètres de l'aventure et des personnages ont été mis à jour." });
    });
  }, [stagedAdventureSettings, stagedCharacters, toast, adventureSettings]);


   const handleNarrativeUpdate = React.useCallback((content: string, type: 'user' | 'ai', sceneDesc?: string) => {
       const newMessage: Message = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            type: type,
            content: content,
            timestamp: Date.now(),
            sceneDescription: type === 'ai' ? sceneDesc : undefined, 
       };
       setNarrative(prevNarrative => [...prevNarrative, newMessage]);
   }, []);

    const handleCombatUpdates = React.useCallback((combatUpdates: CombatUpdatesSchema) => {
        if (!adventureSettings.rpgMode) return;

        setCharacters(prevChars => {
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
                     React.startTransition(() => { toast({ title: "Joueur Vaincu!", description: "L'aventure pourrait prendre un tournant difficile...", variant: "destructive" });});
                }
            }

            // MP Regeneration (example: 1 MP per turn if MP used and not full)
            if (newSettings.playerMaxMp && (newSettings.playerMaxMp > 0) && newSettings.playerCurrentMp && (newSettings.playerCurrentMp < newSettings.playerMaxMp)) {
                 newSettings.playerCurrentMp = Math.min(newSettings.playerMaxMp, newSettings.playerCurrentMp + 1);
            }


            if (combatUpdates.expGained && combatUpdates.expGained > 0 && newSettings.playerCurrentExp !== undefined && newSettings.playerExpToNextLevel !== undefined && newSettings.playerLevel !== undefined) {
                newSettings.playerCurrentExp += combatUpdates.expGained;
                React.startTransition(() => {
                  toast({ title: "Expérience Gagnée!", description: `Vous avez gagné ${combatUpdates.expGained} EXP.` });
                });

                // Level Up Logic
                if (newSettings.playerCurrentExp >= newSettings.playerExpToNextLevel) {
                    newSettings.playerLevel += 1;
                    newSettings.playerCurrentExp -= newSettings.playerExpToNextLevel; 
                    newSettings.playerExpToNextLevel = Math.floor(newSettings.playerExpToNextLevel * 1.5); // Example: Increase EXP needed for next level
                    newSettings.playerMaxHp = (newSettings.playerMaxHp || 0) + Math.floor(Math.random() * 6) + 2; // Example: HP increase
                    newSettings.playerCurrentHp = newSettings.playerMaxHp; // Heal to full on level up
                    if (newSettings.playerMaxMp && newSettings.playerMaxMp > 0) {
                        newSettings.playerMaxMp = (newSettings.playerMaxMp || 0) + Math.floor(Math.random() * 4) + 1;
                        newSettings.playerCurrentMp = newSettings.playerMaxMp; // Restore MP
                    }
                    React.startTransition(() => {
                        toast({ title: "Niveau Supérieur!", description: `Vous avez atteint le niveau ${newSettings.playerLevel}! Vos PV et PM max ont augmenté.`, variant: "default" });
                    });
                    // TODO: Implement skill/spell choice on level up via LLM or predefined paths
                }
            }
             if (combatUpdates.lootDropped && combatUpdates.lootDropped.length > 0) {
                const lootNames = combatUpdates.lootDropped.map(l => `${l.itemName} (x${l.quantity})`).join(', ');
                 React.startTransition(() => {
                    toast({ title: "Butin Récupéré!", description: `Vous avez trouvé: ${lootNames}. (Inventaire non implémenté)` });
                 });
            }
            return newSettings;
        });


        if (combatUpdates.nextActiveCombatState) {
             setActiveCombat(combatUpdates.nextActiveCombatState);
        } else if (combatUpdates.combatEnded) {
             setActiveCombat(undefined); 
             React.startTransition(() => {
                toast({ title: "Combat Terminé!"});
             });
        }

    }, [adventureSettings.rpgMode, toast]);


   const handleNewCharacters = React.useCallback((newChars: Array<NewCharacterSchema>) => {
        if (!newChars || newChars.length === 0) return;
        
        const defaultRelationDesc = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
        let addedCharacterNames: string[] = [];

        setStagedCharacters(prevChars => {
            const currentNames = new Set(prevChars.map(c => c.name.toLowerCase()));
            const charsToAdd: Character[] = [];
            let existingCharsCopy = JSON.parse(JSON.stringify(prevChars)); 

            newChars.forEach(newCharData => {
                if (!currentNames.has(newCharData.name.toLowerCase())) {
                    const newId = `${newCharData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                    const processedRelations: Record<string, string> = {};

                    if (stagedAdventureSettings.relationsMode && newCharData.initialRelations && Array.isArray(newCharData.initialRelations)) {
                        newCharData.initialRelations.forEach(rel => {
                            const relationDescription = rel.description || defaultRelationDesc;
                            if (rel.targetName.toLowerCase() === (stagedAdventureSettings.playerName || "Player").toLowerCase()) {
                                processedRelations[PLAYER_ID] = relationDescription;
                            } else { 
                                const targetChar = existingCharsCopy.find((ec: Character) => ec.name.toLowerCase() === rel.targetName.toLowerCase());
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
                        existingCharsCopy.forEach((ec: Character) => {
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
                        history: newCharData.initialHistoryEntry ? [newCharData.initialHistoryEntry] : [`Rencontré le ${new Date().toLocaleString()}`],
                        opinion: {}, portraitUrl: null, 
                        affinity: stagedAdventureSettings.relationsMode ? 50 : undefined, 
                        relations: stagedAdventureSettings.relationsMode ? processedRelations : undefined,
                        isHostile: stagedAdventureSettings.rpgMode ? newCharData.isHostile : undefined,
                        ...(stagedAdventureSettings.rpgMode && { 
                            level: newCharData.level ?? 1, 
                            experience: 0, 
                            characterClass: newCharData.characterClass ?? '', 
                            stats: {}, inventory: {}, skills: {},
                            spells: [], techniques: [], passiveAbilities: [], 
                            strength: 10, dexterity: 10, constitution: 10, 
                            intelligence: 10, wisdom: 10, charisma: 10,
                            baseHitPoints: newCharData.maxHitPoints ?? 10,
                            hitPoints: newCharData.hitPoints ?? newCharData.maxHitPoints ?? 10, 
                            maxHitPoints: newCharData.maxHitPoints ?? 10, 
                            armorClass: newCharData.armorClass ?? 10,
                            attackBonus: newCharData.attackBonus ?? 0,
                            damageBonus: newCharData.damageBonus ?? "1",
                        })
                    };
                    charsToAdd.push(characterToAdd);
                    addedCharacterNames.push(characterToAdd.name); 
                    currentNames.add(newCharData.name.toLowerCase()); 
                    
                    if(stagedAdventureSettings.relationsMode) {
                        existingCharsCopy = existingCharsCopy.map((ec: Character) => ({
                            ...ec,
                            relations: {
                                ...(ec.relations || {}),
                                [newId]: ec.relations?.[newId] || defaultRelationDesc, 
                            }
                        }));
                    }
                }
            });

            if (charsToAdd.length > 0) return [...existingCharsCopy, ...charsToAdd];
            return prevChars; 
        });

        if (addedCharacterNames.length > 0) {
            React.startTransition(() => {
              toast({
                  title: "Nouveau Personnage Rencontré",
                  description: `${addedCharacterNames.join(', ')} a été ajouté à la liste des personnages. N'oubliez pas d'enregistrer les modifications pour appliquer.`,
              });
            });
        }
    }, [currentLanguage, stagedAdventureSettings.playerName, stagedAdventureSettings.rpgMode, stagedAdventureSettings.relationsMode, toast]);

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
    }, []);

    const handleAffinityUpdates = React.useCallback((updates: AffinityUpdateSchema[]) => {
        if (!adventureSettings.relationsMode || !updates || updates.length === 0) return;
        
        const toastsToShow: Array<{title: string, description: string}> = [];

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
                toastsToShow.forEach(toastContent => toast(toastContent));
            });
        }
    }, [toast, adventureSettings.relationsMode]);

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
        if (!adventureSettings.relationsMode || !updates || updates.length === 0) return;

        const defaultRelationDesc = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
        const toastsToShow: Array<{title: string, description: string}> = [];

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
                    const sourceChar = { ...charsCopy[sourceCharIndex] }; 
                    sourceChar.relations = { ...(sourceChar.relations || {}), [targetId]: newRelationFromAI };
                    charsCopy[sourceCharIndex] = sourceChar; 
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
                toastsToShow.forEach(toastContent => toast(toastContent));
            });
        }
    }, [currentLanguage, stagedAdventureSettings.playerName, toast, adventureSettings.relationsMode]);


   const handleEditMessage = React.useCallback((messageId: string, newContent: string) => {
       setNarrative(prev => prev.map(msg =>
           msg.id === messageId ? { ...msg, content: newContent, timestamp: Date.now() } : msg
       ));
       React.startTransition(() => { toast({ title: "Message Modifié" }); });
   }, [toast]);

    const handleUndoLastMessage = React.useCallback(() => {
        let messageForToast: { title: string, description?: string, variant?: 'default' | 'destructive' } | null = null;
        let newActiveCombatState = activeCombat;

        setNarrative(prevNarrative => {
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
                
                const lastAiMessageBeforeUndo = prevNarrative[lastUserIndex]; 
                if (lastAiMessageBeforeUndo?.sceneDescription?.includes("combat started")) { 
                    newActiveCombatState = undefined;
                }
                return newNarrative;
            } else if (prevNarrative.length > 1) { 
                 const newNarrative = prevNarrative.slice(0, 1); 
                 messageForToast = { title: "Dernier message annulé" };
                 return newNarrative;
            }
            
            messageForToast = { title: "Annulation non applicable", description:"Aucune action utilisateur claire à annuler ou déjà à l'état initial."};
            return prevNarrative;
        });
        
        setActiveCombat(newActiveCombatState);

        if (messageForToast) {
           React.startTransition(() => {
             toast(messageForToast as any); 
           });
        }
    }, [setNarrative, toast, activeCombat]);


    const handleRegenerateLastResponse = React.useCallback(async () => {
         if (isRegenerating) return; 

         let lastAiMessage: Message | undefined;
         let lastUserAction: string | undefined;
         let contextMessages: Message[] = []; 
         let lastAiIndex = -1; 

         const currentNarrative = [...narrative]; 
         for (let i = currentNarrative.length - 1; i >= 0; i--) {
             const message = currentNarrative[i];
             if (message.type === 'ai' && !lastAiMessage) {
                 lastAiMessage = message;
                 lastAiIndex = i;
             } else if (message.type === 'user' && lastAiMessage) { 
                 lastUserAction = message.content;
                 const contextEndIndex = i; 
                 contextMessages = currentNarrative.slice(Math.max(0, contextEndIndex - 4), contextEndIndex); 
                 break;
             }
         }

         if (!lastAiMessage || !lastUserAction) {
             React.startTransition(() => { toast({ title: "Impossible de régénérer", description: "Aucune réponse IA précédente valide trouvée pour régénérer.", variant: "destructive" }); });
             return;
         }

         setIsRegenerating(true);
         React.startTransition(() => { toast({ title: "Régénération en cours...", description: "Génération d'une nouvelle réponse." }); });
        
         const narrativeContextForRegen = contextMessages.map(msg =>
                 msg.type === 'user' ? `> ${adventureSettings.playerName || 'Player'}: ${msg.content}` : msg.content
             ).join('\n\n') + `\n\n> ${adventureSettings.playerName || 'Player'}: ${lastUserAction}\n`; 

         try {
             const input: GenerateAdventureInput = {
                 world: adventureSettings.world, 
                 initialSituation: narrativeContextForRegen, 
                 characters: characters.map(char => { 
                    const history = char.history || [];
                    const lastThreeEntries = history.slice(-3);
                    const historySummary = lastThreeEntries.length > 0 ? lastThreeEntries.join(' | ') : (currentLanguage === 'fr' ? 'Aucun' : 'None');
                    
                    let relationsSummaryText = currentLanguage === 'fr' ? "Mode relations désactivé." : "Relations mode disabled.";
                    if (adventureSettings.relationsMode) {
                         relationsSummaryText = char.relations
                            ? Object.entries(char.relations)
                                  .map(([targetId, description]) => {
                                      const targetName = targetId === PLAYER_ID
                                          ? adventureSettings.playerName || "Player"
                                          : characters.find(c => c.id === targetId)?.name || targetId;
                                      return `${targetName}: ${description}`;
                                  })
                                  .join(', ') || (currentLanguage === 'fr' ? 'Aucune relation définie.' : 'No relations defined.')
                            : (currentLanguage === 'fr' ? 'Aucune relation définie.' : 'No relations defined.');
                    }
        
                    return {
                        id: char.id,
                        name: char.name,
                        details: char.details,
                        affinity: adventureSettings.relationsMode ? (char.affinity ?? 50) : 50,
                        relations: adventureSettings.relationsMode ? (char.relations || {}) : {},
                        historySummary: historySummary,
                        relationsSummary: relationsSummaryText,
                        hitPoints: adventureSettings.rpgMode ? (char.hitPoints ?? char.maxHitPoints ?? 10) : undefined,
                        maxHitPoints: adventureSettings.rpgMode ? (char.maxHitPoints ?? 10) : undefined,
                        armorClass: adventureSettings.rpgMode ? (char.armorClass ?? 10) : undefined,
                        attackBonus: adventureSettings.rpgMode ? (char.attackBonus ?? 0) : undefined,
                        damageBonus: adventureSettings.rpgMode ? (char.damageBonus ?? "1") : undefined,
                        characterClass: adventureSettings.rpgMode ? char.characterClass : undefined,
                        level: adventureSettings.rpgMode ? char.level : undefined,
                        isHostile: adventureSettings.rpgMode ? (char.isHostile ?? false) : undefined,
                    };
                 }),
                 userAction: lastUserAction, 
                 currentLanguage: currentLanguage,
                 playerName: adventureSettings.playerName || "Player",
                 relationsModeActive: adventureSettings.relationsMode ?? true,
                 rpgModeActive: adventureSettings.rpgMode ?? false,
                 activeCombat: activeCombat, 
                 currencyName: adventureSettings.currencyName, 
                 promptConfig: { // Add player stats to promptConfig if RPG mode is active
                    rpgContext: adventureSettings.rpgMode ? {
                        playerStats: {
                            Name: adventureSettings.playerName || "Player",
                            Class: adventureSettings.playerClass || "Aventurier",
                            Level: adventureSettings.playerLevel || 1,
                            HP: `${adventureSettings.playerCurrentHp}/${adventureSettings.playerMaxHp}`,
                            MP: adventureSettings.playerMaxMp && adventureSettings.playerMaxMp > 0 ? `${adventureSettings.playerCurrentMp}/${adventureSettings.playerMaxMp}` : "N/A",
                            EXP: `${adventureSettings.playerCurrentExp}/${adventureSettings.playerExpToNextLevel}`,
                        },
                        mode: activeCombat?.isActive ? "combat" : "exploration",
                    } : undefined,
                 }
             };

             const result = await generateAdventure(input);

             setNarrative(prev => {
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
            
             handleNewCharacters(result.newCharacters || []);
             handleCharacterHistoryUpdate(result.characterUpdates || []);
             if(adventureSettings.relationsMode) {
                handleAffinityUpdates(result.affinityUpdates || []);
                handleRelationUpdatesFromAI(result.relationUpdates || []);
             }
             if(adventureSettings.rpgMode && result.combatUpdates) {
                handleCombatUpdates(result.combatUpdates);
             }


             React.startTransition(() => { toast({ title: "Réponse Régénérée", description: "Une nouvelle réponse a été ajoutée." }); });
         } catch (error) {
             console.error("Error regenerating adventure:", error);
             React.startTransition(() => {
                toast({ title: "Erreur de Régénération", description: `Impossible de générer une nouvelle réponse: ${error instanceof Error ? error.message : 'Unknown error'}.`, variant: "destructive"});
              });
         } finally {
             setIsRegenerating(false);
         }
     }, [isRegenerating, narrative, adventureSettings, characters, currentLanguage, toast, handleNewCharacters, handleCharacterHistoryUpdate, handleAffinityUpdates, handleRelationUpdatesFromAI, generateAdventure, activeCombat, handleCombatUpdates]);


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
                    existingChars[charIndex] = character; 
                } else {
                    existingChars.push(character); 
                }
                localStorage.setItem('globalCharacters', JSON.stringify(existingChars));
                 React.startTransition(() => { toast({ title: "Personnage Sauvegardé", description: `${character.name} est maintenant disponible globalement.` }); });
                 setStagedCharacters(prev => prev.map(c => c.id === character.id ? { ...c, _lastSaved: Date.now() } as any : c));

            } catch (error) {
                 console.error("Failed to save character to localStorage:", error);
                 React.startTransition(() => { toast({ title: "Erreur de Sauvegarde", description: "Impossible de sauvegarder le personnage globalement.", variant: "destructive" }); });
            }
        } else {
            React.startTransition(() => { toast({ title: "Erreur", description: "La sauvegarde globale n'est disponible que côté client.", variant: "destructive" }); });
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
                newChar.armorClass = newChar.armorClass ?? 10;
                newChar.attackBonus = newChar.attackBonus ?? 0;
                newChar.damageBonus = newChar.damageBonus ?? "1";
                newChar.isHostile = newChar.isHostile ?? false;
            }
            return [...updatedPrevChars, newChar];
        });
    
        if (characterWasAdded) {
            React.startTransition(() => {
                toast({ title: "Personnage Ajouté", description: `${characterNameForToast} a été ajouté aux personnages de l'aventure. N'oubliez pas d'enregistrer les modifications.` });
            });
        } else {
            React.startTransition(() => {
                toast({ title: "Personnage déjà présent", description: `${characterNameForToast} est déjà dans l'aventure.`, variant: "default" });
            });
        }
    }, [currentLanguage, toast, stagedAdventureSettings.rpgMode, stagedAdventureSettings.relationsMode]); 


   const handleSave = React.useCallback(() => {
        const charactersToSave = characters.map(({ ...char }) => char); 
        const saveData: SaveData = {
            adventureSettings, 
            characters: charactersToSave, 
            narrative, 
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
    }, [adventureSettings, characters, narrative, currentLanguage, activeCombat, toast]);

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
                    
                    return { 
                        id: charId,
                        name: c.name || "Inconnu", details: c.details || "", history: Array.isArray(c.history) ? c.history : [], 
                        opinion: typeof c.opinion === 'object' && c.opinion !== null ? c.opinion : {},
                        portraitUrl: c.portraitUrl || null, 
                        affinity: relationsModeActive ? (c.affinity ?? 50) : undefined, 
                        relations: relations,
                        _lastSaved: c._lastSaved, 
                        ...(rpgModeActive && { 
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
                            armorClass: c.armorClass ?? 10,
                            attackBonus: c.attackBonus ?? 0,
                            damageBonus: c.damageBonus ?? "1",
                            isHostile: c.isHostile ?? false,
                        }),
                    }
                });
                
                const finalAdventureSettings = {
                    ...baseAdventureSettings, // Start with current defaults to ensure all fields are present
                    ...loadedData.adventureSettings,
                    relationsMode: relationsModeActive,
                    // Ensure player stats are correctly initialized if loaded or defaulted
                    playerCurrentHp: loadedData.adventureSettings.rpgMode ? (loadedData.adventureSettings.playerCurrentHp ?? loadedData.adventureSettings.playerMaxHp) : undefined,
                    playerCurrentMp: loadedData.adventureSettings.rpgMode ? (loadedData.adventureSettings.playerCurrentMp ?? loadedData.adventureSettings.playerMaxMp) : undefined,
                    playerCurrentExp: loadedData.adventureSettings.rpgMode ? (loadedData.adventureSettings.playerCurrentExp ?? 0) : undefined,
                };

                setBaseAdventureSettings(JSON.parse(JSON.stringify(finalAdventureSettings)));
                setBaseCharacters(JSON.parse(JSON.stringify(validatedCharacters)));
                setNarrative(loadedData.narrative as Message[]); 
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
    }, [toast, baseAdventureSettings]);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const confirmRestartAdventure = React.useCallback(() => {
        const freshBaseSettings = JSON.parse(JSON.stringify(baseAdventureSettings));
        freshBaseSettings.playerCurrentHp = freshBaseSettings.playerMaxHp;
        freshBaseSettings.playerCurrentMp = freshBaseSettings.playerMaxMp;
        freshBaseSettings.playerCurrentExp = 0;
        // playerLevel should be reset from baseAdventureSettings.playerLevel or default to 1

        setAdventureSettings(freshBaseSettings);
        setCharacters(JSON.parse(JSON.stringify(baseCharacters)));
        setNarrative([{ id: `msg-${Date.now()}`, type: 'system', content: baseAdventureSettings.initialSituation, timestamp: Date.now() }]);
        setActiveCombat(undefined); 

        setStagedAdventureSettings(JSON.parse(JSON.stringify(freshBaseSettings)));
        setStagedCharacters(JSON.parse(JSON.stringify(baseCharacters)));
        setFormKey(prev => prev + 1); 

        setShowRestartConfirm(false); 
        React.startTransition(() => { toast({ title: "Aventure Recommencée", description: "L'histoire a été réinitialisée à son état initial." }); });
    }, [baseAdventureSettings, baseCharacters, toast]);


  const memoizedStagedAdventureSettingsForForm = React.useMemo(() => {
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

  return (
    <>
      <PageStructure
        adventureSettings={adventureSettings} 
        characters={characters} 
        stagedAdventureSettings={memoizedStagedAdventureSettingsForForm} 
        stagedCharacters={stagedCharacters} 
        propKey={formKey} 
        handleApplyStagedChanges={handleApplyStagedChanges}
        narrativeMessages={narrative}
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
        generateAdventureAction={generateAdventure}
        generateSceneImageAction={generateSceneImage}
        handleEditMessage={handleEditMessage}
        handleRegenerateLastResponse={handleRegenerateLastResponse}
        handleUndoLastMessage={handleUndoLastMessage}
        playerId={PLAYER_ID}
        playerName={adventureSettings.playerName || "Player"} 
        onRestartAdventure={() => setShowRestartConfirm(true)}
        activeCombat={activeCombat} 
        onCombatUpdates={handleCombatUpdates} 
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

