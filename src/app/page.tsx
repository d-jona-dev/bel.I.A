
"use client"; // Mark page as Client Component to manage state

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { Character, AdventureSettings, SaveData, Message } from "@/types"; // Import shared types including Message
import { PageStructure } from "./page.structure"; // Import the layout structure component

// Import AI functions here
import { generateAdventure } from "@/ai/flows/generate-adventure";
import { generateSceneImage } from "@/ai/flows/generate-scene-image";
import { translateText } from "@/ai/flows/translate-text";
import type { GenerateAdventureInput, GenerateAdventureOutput, CharacterUpdateSchema, AffinityUpdateSchema, RelationUpdateSchema, NewCharacterSchema } from "@/ai/flows/generate-adventure";
import type { GenerateSceneImageInput, GenerateSceneImageOutput } from "@/ai/flows/generate-scene-image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Constants
const PLAYER_ID = "player";

// Helper type for character definitions within AdventureForm
export type FormCharacterDefinition = { id?: string; name: string; details: string };

// Helper type for AdventureForm props consistency
export type AdventureFormValues = Omit<AdventureSettings, 'rpgMode' | 'characters'> & {
  characters: FormCharacterDefinition[];
  enableRpgMode?: boolean;
};


export default function Home() {
  const [baseAdventureSettings, setBaseAdventureSettings] = React.useState<AdventureSettings>({
    world: "Grande université populaire nommée \"hight scoole of futur\".",
    initialSituation: "Vous marchez dans les couloirs animés de Hight School of Future lorsque vous apercevez Rina, votre petite amie, en pleine conversation avec Kentaro, votre meilleur ami. Ils semblent étrangement proches, riant doucement. Un sentiment de malaise vous envahit.",
    rpgMode: false,
    playerName: "Player",
  });
  const [baseCharacters, setBaseCharacters] = React.useState<Character[]>([
      {
        id: 'rina-1',
        name: "Rina",
        details: "jeune femme de 19 ans, votre petite amie. Elle se rapproche de Kentaro. Étudiante populaire, calme, aimante, parfois secrète. 165 cm, yeux marron, cheveux mi-longs bruns, traits fins, athlétique.",
        history: ["Ceci est un exemple d'historique pour Rina."],
        opinion: {},
        affinity: 70,
        relations: { [PLAYER_ID]: "Petite amie", 'kentaro-1': "Ami" }
      },
      {
        id: 'kentaro-1',
        name: "Kentaro",
        details: "Jeune homme de 20 ans, votre meilleur ami. Étudiant populaire, charmant mais calculateur et impulsif. 185 cm, athlétique, yeux bleus, cheveux courts blonds. Aime draguer et voir son meilleur ami souffrir. Se rapproche de Rina.",
        history: ["Kentaro a été vu parlant à Rina."],
        opinion: {},
        affinity: 60,
        relations: { [PLAYER_ID]: "Meilleur ami", 'rina-1': "Ami" }
      }
  ]);

  // "Live" state of the adventure
  const [adventureSettings, setAdventureSettings] = React.useState<AdventureSettings>(baseAdventureSettings);
  const [characters, setCharacters] = React.useState<Character[]>(baseCharacters);

  // "Staged" state for the configuration panel
  const [stagedAdventureSettings, setStagedAdventureSettings] = React.useState<AdventureSettings>(() => JSON.parse(JSON.stringify(baseAdventureSettings)));
  const [stagedCharacters, setStagedCharacters] = React.useState<Character[]>(() => JSON.parse(JSON.stringify(baseCharacters)));


  const [formKey, setFormKey] = React.useState(0); // Used as React key for AdventureForm

  const [narrative, setNarrative] = React.useState<Message[]>([
     { id: `msg-${Date.now()}`, type: 'system', content: baseAdventureSettings.initialSituation, timestamp: Date.now() }
  ]);
  const [currentLanguage, setCurrentLanguage] = React.useState<string>("fr");
  const [isRegenerating, setIsRegenerating] = React.useState<boolean>(false);
  const [showRestartConfirm, setShowRestartConfirm] = React.useState<boolean>(false);

  const { toast } = useToast();

  // Effect to update staged state when live state changes (e.g., after load, restart, or applying changes)
  // This also triggers a re-key of AdventureForm to re-initialize it with the new staged values.
  React.useEffect(() => {
    setStagedAdventureSettings(JSON.parse(JSON.stringify(adventureSettings)));
    setStagedCharacters(JSON.parse(JSON.stringify(characters)));
    setFormKey(prev => prev + 1);
  }, [adventureSettings, characters]);


  const handleSettingsUpdate = React.useCallback((newSettingsFromForm: AdventureFormValues) => {
    // Update stagedAdventureSettings (main settings part)
    setStagedAdventureSettings(prevSettings => ({
        ...prevSettings,
        world: newSettingsFromForm.world,
        initialSituation: newSettingsFromForm.initialSituation,
        rpgMode: newSettingsFromForm.enableRpgMode ?? false,
        playerName: newSettingsFromForm.playerName || "Player",
        currencyName: newSettingsFromForm.currencyName,
    }));

    // Update stagedCharacters based on form definitions and existing staged characters
    setStagedCharacters(prevStagedChars => {
      const defaultRelation = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
      const newRPGMode = newSettingsFromForm.enableRpgMode ?? false;
      const playerNameVal = newSettingsFromForm.playerName || "Player";

      const formDefsMap = new Map(newSettingsFromForm.characters.map(fd => [fd.id || fd.name.toLowerCase(), fd]));
      const existingStagedCharsMap = new Map(prevStagedChars.map(sc => [sc.id, sc]));

      const updatedCharsList: Character[] = [];

      // Process characters defined in the form
      newSettingsFromForm.characters.forEach(formDef => {
        let charToUpdate: Character | undefined = formDef.id ? existingStagedCharsMap.get(formDef.id) : prevStagedChars.find(sc => sc.name === formDef.name && !prevStagedChars.some(otherSc => otherSc.id === sc.id && otherSc.id !== formDef.id));

        if (charToUpdate) {
          // Update existing character
          charToUpdate = {
            ...charToUpdate,
            name: formDef.name,
            details: formDef.details,
            // RPG properties handling
            ...(newRPGMode ? {
                level: charToUpdate.level || 1, experience: charToUpdate.experience || 0, characterClass: charToUpdate.characterClass || '',
                stats: charToUpdate.stats || {}, inventory: charToUpdate.inventory || {}, skills: charToUpdate.skills || {},
                spells: charToUpdate.spells || [], techniques: charToUpdate.techniques || [], passiveAbilities: charToUpdate.passiveAbilities || [],
                strength: charToUpdate.strength ?? 10, dexterity: charToUpdate.dexterity ?? 10, constitution: charToUpdate.constitution ?? 10,
                intelligence: charToUpdate.intelligence ?? 10, wisdom: charToUpdate.wisdom ?? 10, charisma: charToUpdate.charisma ?? 10,
                hitPoints: charToUpdate.hitPoints ?? 10, maxHitPoints: charToUpdate.maxHitPoints ?? 10, armorClass: charToUpdate.armorClass ?? 10,
            } : { /* Clear RPG fields if mode disabled */ }),
          };
        } else {
          // Create new character
          const newId = formDef.id || `${formDef.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          charToUpdate = {
            id: newId, name: formDef.name, details: formDef.details,
            history: [], opinion: {}, portraitUrl: null, affinity: 50,
            relations: { [PLAYER_ID]: defaultRelation },
             ...(newRPGMode ? { /* Default RPG fields */
                level: 1, experience: 0, characterClass: '', stats: {}, inventory: {}, skills: {},
                spells: [], techniques: [], passiveAbilities: [], strength: 10, dexterity: 10, constitution: 10,
                intelligence: 10, wisdom: 10, charisma: 10, hitPoints: 10, maxHitPoints: 10, armorClass: 10,
            } : {}),
          };
        }
        updatedCharsList.push(charToUpdate);
      });

      // Add any existing staged characters not processed from form (e.g., those with full details)
      prevStagedChars.forEach(sc => {
        if (!updatedCharsList.some(uc => uc.id === sc.id)) {
          updatedCharsList.push(sc);
        }
      });
      
      // Ensure all characters have relations to each other and the player
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

    // Apply staged main settings to live settings
    setAdventureSettings(JSON.parse(JSON.stringify(stagedAdventureSettings)));
    // Apply staged characters to live characters
    setCharacters(JSON.parse(JSON.stringify(stagedCharacters)));

    // If the initial situation changed, reset the narrative
    if (stagedAdventureSettings.initialSituation !== currentLiveAdventureSettings.initialSituation) {
        setNarrative([{ id: `msg-${Date.now()}`, type: 'system', content: stagedAdventureSettings.initialSituation, timestamp: Date.now() }]);
    }

    toast({ title: "Modifications Enregistrées", description: "Les paramètres de l'aventure et des personnages ont été mis à jour." });
    // The useEffect listening to adventureSettings/characters will update formKey and re-init AdventureForm
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

   const handleNewCharacters = React.useCallback((newChars: Array<NewCharacterSchema>) => {
        if (!newChars || newChars.length === 0) return;
        const defaultRelationDesc = currentLanguage === 'fr' ? "Inconnu" : "Unknown";

        setStagedCharacters(prevChars => {
            const currentNames = new Set(prevChars.map(c => c.name.toLowerCase()));
            const charsToAdd: Character[] = [];
            let existingCharsCopy = JSON.parse(JSON.stringify(prevChars)); // Deep copy

            newChars.forEach(newCharData => {
                if (!currentNames.has(newCharData.name.toLowerCase())) {
                    const newId = `${newCharData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                    const processedRelations: Record<string, string> = {};

                    if (newCharData.initialRelations && Array.isArray(newCharData.initialRelations)) {
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


                    const characterToAdd: Character = {
                        id: newId, name: newCharData.name,
                        details: newCharData.details || (currentLanguage === 'fr' ? "Rencontré récemment." : "Recently met."),
                        history: newCharData.initialHistoryEntry ? [newCharData.initialHistoryEntry] : [`Rencontré le ${new Date().toLocaleString()}`],
                        opinion: {}, portraitUrl: null, affinity: 50, relations: processedRelations,
                        ...(stagedAdventureSettings.rpgMode && {
                            level: 1, experience: 0, characterClass: '', stats: {}, inventory: {}, skills: {},
                            spells: [], techniques: [], passiveAbilities: [], strength: 10, dexterity: 10,
                            constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
                            hitPoints: 10, maxHitPoints: 10, armorClass: 10,
                        })
                    };
                    charsToAdd.push(characterToAdd);
                    currentNames.add(newCharData.name.toLowerCase());
                    existingCharsCopy = existingCharsCopy.map((ec: Character) => ({
                        ...ec,
                        relations: {
                            ...(ec.relations || {}),
                            [newId]: ec.relations?.[newId] || defaultRelationDesc,
                        }
                    }));
                }
            });

            if (charsToAdd.length > 0) {
                const newFullList = [...existingCharsCopy, ...charsToAdd];
                React.startTransition(() => {
                  toast({
                      title: "Nouveau Personnage Rencontré",
                      description: `${charsToAdd.map(c => c.name).join(', ')} a été ajouté à la liste des personnages. N'oubliez pas d'enregistrer les modifications pour appliquer.`,
                  });
                });
                return newFullList;
            }
            return prevChars;
        });
    }, [currentLanguage, stagedAdventureSettings.playerName, stagedAdventureSettings.rpgMode, toast]);

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
        if (!updates || updates.length === 0) return;
        setStagedCharacters(prevChars => {
             let changed = false;
            const updatedChars = prevChars.map(char => {
                const affinityUpdate = updates.find(u => u.characterName.toLowerCase() === char.name.toLowerCase());
                if (affinityUpdate) {
                    changed = true;
                    const currentAffinity = char.affinity ?? 50;
                    const newAffinity = Math.max(0, Math.min(100, currentAffinity + affinityUpdate.change));
                    return { ...char, affinity: newAffinity };
                }
                return char;
            });

            if (changed) {
                 updates.forEach(update => {
                     if (Math.abs(update.change) >= 3) {
                         const charName = update.characterName;
                         const direction = update.change > 0 ? 'améliorée' : 'détériorée';
                         React.startTransition(() => {
                           toast({
                              title: `Affinité Modifiée: ${charName}`,
                              description: `Votre relation avec ${charName} s'est ${direction}. Raison: ${update.reason || 'Interaction récente'}`,
                           });
                         });
                     }
                 });
                return updatedChars;
            }
            return prevChars;
        });
    }, [toast]);

     const handleRelationUpdate = React.useCallback((charId: string, targetId: string, newRelation: string) => {
        setStagedCharacters(prevChars => prevChars.map(char => {
            if (char.id === charId) {
                const updatedRelations = { ...(char.relations || {}), [targetId]: newRelation };
                return { ...char, relations: updatedRelations };
            }
            return char;
        }));
    }, []);

    const handleRelationUpdatesFromAI = React.useCallback((updates: RelationUpdateSchema[]) => {
        if (!updates || updates.length === 0) return;
        const defaultRelationDesc = currentLanguage === 'fr' ? "Inconnu" : "Unknown";

        setStagedCharacters(prevChars => {
            let chars = JSON.parse(JSON.stringify(prevChars)); // Deep copy
            let changed = false;

            updates.forEach(update => {
                const sourceCharIndex = chars.findIndex((c: Character) => c.name.toLowerCase() === update.characterName.toLowerCase());
                if (sourceCharIndex === -1) return;

                let targetId: string | null = null;
                if (update.targetName.toLowerCase() === (stagedAdventureSettings.playerName || "Player").toLowerCase()) {
                    targetId = PLAYER_ID;
                } else {
                    const targetChar = chars.find((c:Character) => c.name.toLowerCase() === update.targetName.toLowerCase());
                    if (targetChar) targetId = targetChar.id;
                    else return;
                }
                if (!targetId) return;

                const currentRelation = chars[sourceCharIndex].relations?.[targetId] || defaultRelationDesc;
                const newRelationFromAI = update.newRelation.trim() === "" || update.newRelation.toLowerCase() === "inconnu" || update.newRelation.toLowerCase() === "unknown" ? defaultRelationDesc : update.newRelation;

                if (currentRelation !== newRelationFromAI) {
                    const sourceChar = { ...chars[sourceCharIndex] };
                    sourceChar.relations = { ...(sourceChar.relations || {}), [targetId]: newRelationFromAI };
                    chars[sourceCharIndex] = sourceChar;
                    changed = true;
                     React.startTransition(() => {
                       toast({
                          title: `Relation Changée: ${update.characterName}`,
                          description: `Relation envers ${update.targetName} est maintenant "${newRelationFromAI}". Raison: ${update.reason || 'Événement narratif'}`,
                       });
                     });
                }
            });
            if (changed) return chars;
            return prevChars;
        });
    }, [currentLanguage, stagedAdventureSettings.playerName, toast]);

   const handleEditMessage = React.useCallback((messageId: string, newContent: string) => {
       setNarrative(prev => prev.map(msg =>
           msg.id === messageId ? { ...msg, content: newContent, timestamp: Date.now() } : msg
       ));
       React.startTransition(() => { toast({ title: "Message Modifié" }); });
   }, [toast]);

    const handleUndoLastMessage = React.useCallback(() => {
        setNarrative(prevNarrative => {
            if (prevNarrative.length <= 1) {
                 React.startTransition(() => { toast({ title: "Impossible d'annuler", description: "Aucun message à annuler.", variant: "destructive" }); });
                 return prevNarrative;
            }
            let lastUserIndex = -1;
            for (let i = prevNarrative.length - 1; i >= 0; i--) {
                if (prevNarrative[i].type === 'user') {
                    lastUserIndex = i;
                    break;
                }
            }

            if (lastUserIndex === -1 && prevNarrative.length > 1) { // Only AI/system messages left after intro
                return prevNarrative.slice(0,1); // Keep only the intro
            } else if (lastUserIndex > 0) { // Found a user message that's not the intro
                const newNarrative = prevNarrative.slice(0, lastUserIndex);
                React.startTransition(() => { toast({ title: "Dernier tour annulé" }); });
                return newNarrative;
            } else if (prevNarrative.length > 1) { // Only one user message (likely intro prompt), or system messages
                 const newNarrative = prevNarrative.slice(0, 1); // Back to intro
                 React.startTransition(() => { toast({ title: "Dernier message annulé" }); });
                 return newNarrative;
            }
            React.startTransition(() => { toast({ title: "Annulation non applicable", description:"Aucune action utilisateur claire à annuler."}); });
            return prevNarrative;
        });
    }, [toast]);

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
                 contextMessages = currentNarrative.slice(Math.max(0, contextEndIndex - 4), contextEndIndex); // Context up to the user message before the AI response
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
                 world: adventureSettings.world, initialSituation: narrativeContextForRegen,
                 characters: characters, // Use live characters for regen context
                 userAction: lastUserAction, currentLanguage: currentLanguage,
                 playerName: adventureSettings.playerName || "Player",
                 promptConfig: adventureSettings.rpgMode ? {
                    rpgContext: {
                        playerStats: { },
                        characterDetails: characters.map(c => ({
                             name: c.name, details: c.details, stats: c.stats, inventory: c.inventory,
                             relations: c.relations ? Object.entries(c.relations).map(([id, desc]) => {
                                 const relatedChar = characters.find(char => char.id === id);
                                 const targetName = relatedChar ? relatedChar.name : (id === PLAYER_ID ? (adventureSettings.playerName || 'Player') : 'Unknown');
                                 return `${targetName}: ${desc}`;
                             }).join(', ') : (currentLanguage === 'fr' ? 'Aucune' : 'None'),
                        })),
                        mode: 'exploration', // Or derive from current state if more complex mode exists
                    }
                 } : undefined,
             };

             const result = await generateAdventure(input);
             setNarrative(prev => {
                const newNarrative = [...prev];
                const newAiMessage: Message = {
                     id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`, type: 'ai',
                     content: result.narrative, timestamp: Date.now(), sceneDescription: result.sceneDescriptionForImage,
                 };
                 if (lastAiIndex !== -1) newNarrative.splice(lastAiIndex, 1, newAiMessage); // Replace last AI message
                 else newNarrative.push(newAiMessage); // Should not happen if lastAiMessage was found
                return newNarrative;
             });

             // Update staged characters with new info from AI
             handleNewCharacters(result.newCharacters || []);
             handleCharacterHistoryUpdate(result.characterUpdates || []);
             handleAffinityUpdates(result.affinityUpdates || []);
             handleRelationUpdatesFromAI(result.relationUpdates || []);
             React.startTransition(() => { toast({ title: "Réponse Régénérée", description: "Une nouvelle réponse a été ajoutée." }); });
         } catch (error) {
             console.error("Error regenerating adventure:", error);
             React.startTransition(() => {
                toast({ title: "Erreur de Régénération", description: `Impossible de générer une nouvelle réponse: ${error instanceof Error ? error.message : 'Unknown error'}.`, variant: "destructive"});
              });
         } finally {
             setIsRegenerating(false);
         }
     }, [isRegenerating, narrative, adventureSettings, characters, currentLanguage, toast, handleNewCharacters, handleCharacterHistoryUpdate, handleAffinityUpdates, handleRelationUpdatesFromAI]);

   const handleCharacterUpdate = React.useCallback((updatedCharacter: Character) => {
       setStagedCharacters(prev => prev.map(c => c.id === updatedCharacter.id ? updatedCharacter : c));
   }, []);

    const handleSaveNewCharacter = React.useCallback((character: Character) => {
        if (typeof window !== 'undefined') {
            try {
                const existingCharsStr = localStorage.getItem('globalCharacters');
                let existingChars: Character[] = existingCharsStr ? JSON.parse(existingCharsStr) : [];
                const charIndex = existingChars.findIndex(c => c.id === character.id || c.name.toLowerCase() === character.name.toLowerCase());
                if (charIndex > -1) existingChars[charIndex] = character;
                else existingChars.push(character);
                localStorage.setItem('globalCharacters', JSON.stringify(existingChars));
                 React.startTransition(() => { toast({ title: "Personnage Sauvegardé", description: `${character.name} est maintenant disponible globalement.` }); });
                 // Update the staged character to mark it as saved for UI feedback
                 setStagedCharacters(prev => prev.map(c => c.id === character.id ? { ...c, _lastSaved: Date.now() } as any : c));

            } catch (error) {
                 console.error("Failed to save character to localStorage:", error);
                 React.startTransition(() => { toast({ title: "Erreur de Sauvegarde", description: "Impossible de sauvegarder le personnage globalement.", variant: "destructive" }); });
            }
        } else {
            React.startTransition(() => { toast({ title: "Erreur", description: "La sauvegarde globale n'est disponible que côté client.", variant: "destructive" }); });
        }
    }, [toast]);

   const handleSave = React.useCallback(() => {
        // Save "live" state, not staged state
        const charactersToSave = characters.map(({ ...char }) => char); // Use live characters
        const saveData: SaveData = {
            adventureSettings, characters: charactersToSave, narrative, // Use live settings, characters, narrative
            currentLanguage, saveFormatVersion: 1.6, timestamp: new Date().toISOString(),
        };
        const jsonString = JSON.stringify(saveData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aventurier_textuel_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        React.startTransition(() => { toast({ title: "Aventure Sauvegardée", description: "Le fichier JSON a été téléchargé." }); });
    }, [adventureSettings, characters, narrative, currentLanguage, toast]);

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
                    if (typeof loadedData.narrative === 'string') { // Legacy format
                        loadedData.narrative = [{ id: `migrated-${Date.now()}`, type: 'system', content: loadedData.narrative, timestamp: Date.now() }];
                    } else throw new Error("Structure des messages narratifs invalide.");
                }
                 if (loadedData.saveFormatVersion === undefined || loadedData.saveFormatVersion < 1.4) {
                     loadedData.characters = loadedData.characters.map(c => ({ ...c, history: Array.isArray(c.history) ? c.history : [], opinion: typeof c.opinion === 'object' && c.opinion !== null ? c.opinion : {}, affinity: c.affinity ?? 50, relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                     loadedData.adventureSettings.playerName = loadedData.adventureSettings.playerName || "Player";
                }
                 if (loadedData.saveFormatVersion < 1.5) { // Relations field might be missing
                       loadedData.characters = loadedData.characters.map(c => ({ ...c, relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                 }
                  if (loadedData.saveFormatVersion < 1.6) { // Relations might not be objects
                       loadedData.characters = loadedData.characters.map(c => ({ ...c, relations: typeof c.relations === 'object' && c.relations !== null ? c.relations : { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                 }

                const rpgModeActive = loadedData.adventureSettings.rpgMode;
                const loadedLang = loadedData.currentLanguage || "fr";
                const defaultRelation = loadedLang === 'fr' ? "Inconnu" : "Unknown";
                const validatedCharacters = loadedData.characters.map((c: any) => ({ // Type assertion for loaded data
                    id: c.id || `${c.name?.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                    name: c.name || "Inconnu", details: c.details || "", history: c.history || [], opinion: c.opinion || {},
                    portraitUrl: c.portraitUrl || null, affinity: c.affinity ?? 50, relations: c.relations || { [PLAYER_ID]: defaultRelation },
                    _lastSaved: c._lastSaved, // Preserve if present
                    ...(rpgModeActive && { // Add RPG fields if mode is active
                        level: c.level ?? 1, experience: c.experience ?? 0, characterClass: c.characterClass ?? '',
                        stats: c.stats ?? {}, inventory: c.inventory ?? {}, skills: c.skills ?? {},
                        spells: c.spells ?? [], techniques: c.techniques ?? [], passiveAbilities: c.passiveAbilities ?? [],
                        strength: c.strength ?? 10, dexterity: c.dexterity ?? 10, constitution: c.constitution ?? 10,
                        intelligence: c.intelligence ?? 10, wisdom: c.wisdom ?? 10, charisma: c.charisma ?? 10,
                        hitPoints: c.hitPoints ?? 10, maxHitPoints: c.maxHitPoints ?? 10, armorClass: c.armorClass ?? 10,
                    }),
                }));

                // Update base state first
                setBaseAdventureSettings(JSON.parse(JSON.stringify(loadedData.adventureSettings)));
                setBaseCharacters(JSON.parse(JSON.stringify(validatedCharacters)));
                
                // Then update live state (which will trigger useEffect to update staged state and formKey)
                setAdventureSettings(loadedData.adventureSettings);
                setCharacters(validatedCharacters);
                setNarrative(loadedData.narrative as Message[]);
                setCurrentLanguage(loadedLang);


                React.startTransition(() => { toast({ title: "Aventure Chargée", description: "L'état de l'aventure a été restauré." }); });
            } catch (error: any) {
                console.error("Error loading adventure:", error);
                React.startTransition(() => { toast({ title: "Erreur de Chargement", description: `Impossible de lire le fichier JSON: ${error.message}`, variant: "destructive" }); });
            }
        };
        reader.readAsText(file);
        if(event.target) event.target.value = ''; // Reset file input
    }, [toast]);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const confirmRestartAdventure = React.useCallback(() => {
        // Reset live state to base state
        setAdventureSettings(JSON.parse(JSON.stringify(baseAdventureSettings)));
        setCharacters(JSON.parse(JSON.stringify(baseCharacters)));
        // Reset narrative to initial situation from base settings
        setNarrative([{ id: `msg-${Date.now()}`, type: 'system', content: baseAdventureSettings.initialSituation, timestamp: Date.now() }]);
        setShowRestartConfirm(false);
        React.startTransition(() => { toast({ title: "Aventure Recommencée", description: "L'histoire a été réinitialisée à son état initial." }); });
        // The useEffect listening to adventureSettings/characters will update staged state and formKey
    }, [baseAdventureSettings, baseCharacters, toast]);


  // Memoized values for AdventureForm props, derived from STAGED state
  const memoizedStagedAdventureSettingsForForm = React.useMemo(() => {
    return {
      world: stagedAdventureSettings.world,
      initialSituation: stagedAdventureSettings.initialSituation,
      playerName: stagedAdventureSettings.playerName,
      currencyName: stagedAdventureSettings.currencyName,
      enableRpgMode: stagedAdventureSettings.rpgMode,
      characters: stagedCharacters.map(c => ({ id: c.id, name: c.name, details: c.details })),
    };
  }, [stagedAdventureSettings, stagedCharacters]);

  return (
    <>
      <PageStructure
        // Pass "live" state for display and AI actions
        adventureSettings={adventureSettings}
        characters={characters}
        // Pass "staged" state for configuration UI
        stagedAdventureSettings={memoizedStagedAdventureSettingsForForm} // For AdventureForm
        stagedCharacters={stagedCharacters} // For CharacterSidebar
        propKey={formKey} // React key for AdventureForm
        handleApplyStagedChanges={handleApplyStagedChanges}
        narrativeMessages={narrative}
        currentLanguage={currentLanguage}
        fileInputRef={fileInputRef}
        handleSettingsUpdate={handleSettingsUpdate} // Updates STAGED state
        handleNarrativeUpdate={handleNarrativeUpdate} // Updates LIVE narrative
        handleCharacterUpdate={handleCharacterUpdate} // Updates STAGED characters
        handleNewCharacters={handleNewCharacters} // Updates STAGED characters
        handleCharacterHistoryUpdate={handleCharacterHistoryUpdate} // Updates STAGED characters
        handleAffinityUpdates={handleAffinityUpdates} // Updates STAGED characters
        handleRelationUpdate={handleRelationUpdate} // Updates STAGED characters
        handleRelationUpdatesFromAI={handleRelationUpdatesFromAI} // Updates STAGED characters
        handleSaveNewCharacter={handleSaveNewCharacter} // Saves STAGED character globally
        handleSave={handleSave} // Saves LIVE state
        handleLoad={handleLoad} // Loads into BASE and LIVE state
        setCurrentLanguage={setCurrentLanguage}
        translateTextAction={translateText}
        generateAdventureAction={generateAdventure}
        generateSceneImageAction={generateSceneImage}
        handleEditMessage={handleEditMessage}
        handleRegenerateLastResponse={handleRegenerateLastResponse}
        handleUndoLastMessage={handleUndoLastMessage}
        playerId={PLAYER_ID}
        playerName={adventureSettings.playerName || "Player"} // Use live player name for display
        onRestartAdventure={() => setShowRestartConfirm(true)}
      />
       <AlertDialog open={showRestartConfirm} onOpenChange={setShowRestartConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Recommencer l'aventure ?</AlertDialogTitle>
                <AlertDialogDescription>
                    Êtes-vous sûr de vouloir recommencer l'aventure en cours ? Toute la progression narrative et les changements sur les personnages (non sauvegardés globalement) seront perdus et réinitialisés aux derniers paramètres de l'aventure (ou ceux par défaut si non modifiés).
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

