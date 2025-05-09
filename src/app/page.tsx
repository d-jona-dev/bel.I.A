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

  const [adventureSettings, setAdventureSettings] = React.useState<AdventureSettings>(baseAdventureSettings);
  const [characters, setCharacters] = React.useState<Character[]>(baseCharacters);

  const [stagedAdventureMainSettings, setStagedAdventureMainSettings] = React.useState<AdventureSettings>(baseAdventureSettings);
  const [stagedInitialCharacterDefinitions, setStagedInitialCharacterDefinitions] = React.useState<FormCharacterDefinition[]>(
    baseCharacters.map(c => ({ id: c.id, name: c.name, details: c.details }))
  );
  const [stagedCharacters, setStagedCharacters] = React.useState<Character[]>(baseCharacters);

  const [formKey, setFormKey] = React.useState(0);

  const [narrative, setNarrative] = React.useState<Message[]>([
     { id: `msg-${Date.now()}`, type: 'system', content: baseAdventureSettings.initialSituation, timestamp: Date.now() }
  ]);
  const [currentLanguage, setCurrentLanguage] = React.useState<string>("fr");
  const [isRegenerating, setIsRegenerating] = React.useState<boolean>(false);
  const [showRestartConfirm, setShowRestartConfirm] = React.useState<boolean>(false);

  const { toast } = useToast();

  React.useEffect(() => {
    setStagedAdventureMainSettings(adventureSettings);
    setStagedCharacters(characters);
    setStagedInitialCharacterDefinitions(characters.map(c => ({ id: c.id, name: c.name, details: c.details })));
    setFormKey(prev => prev + 1);
  }, [adventureSettings, characters]);


  const handleSettingsUpdate = React.useCallback((newSettingsFromForm: AdventureFormValues) => {
    setStagedAdventureMainSettings(prevSettings => ({
        ...prevSettings,
        world: newSettingsFromForm.world,
        initialSituation: newSettingsFromForm.initialSituation,
        rpgMode: newSettingsFromForm.enableRpgMode ?? false,
        playerName: newSettingsFromForm.playerName || "Player",
        currencyName: newSettingsFromForm.currencyName,
    }));
    setStagedInitialCharacterDefinitions(newSettingsFromForm.characters);
  }, []);


  const handleApplyStagedChanges = React.useCallback(() => {
    const currentLiveAdventureSettings = adventureSettings;
    setAdventureSettings(stagedAdventureMainSettings);

    const defaultRelation = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
    const newRPGMode = stagedAdventureMainSettings.rpgMode;

    let reconciledStagedCharacters = [...stagedCharacters];
    const detailedCharMap = new Map(reconciledStagedCharacters.map(char => [char.id, char]));

    const finalCharactersList: Character[] = stagedInitialCharacterDefinitions.map(formDef => {
        const existingDetailedChar = formDef.id ? detailedCharMap.get(formDef.id) : reconciledStagedCharacters.find(sc => sc.name === formDef.name && !sc.id);

        if (existingDetailedChar) {
            return {
                ...existingDetailedChar,
                name: formDef.name,
                details: formDef.details,
                ...(newRPGMode ? {
                    level: existingDetailedChar.level || 1, experience: existingDetailedChar.experience || 0, characterClass: existingDetailedChar.characterClass || '',
                    stats: existingDetailedChar.stats || {}, inventory: existingDetailedChar.inventory || {}, skills: existingDetailedChar.skills || {},
                    spells: existingDetailedChar.spells || [], techniques: existingDetailedChar.techniques || [], passiveAbilities: existingDetailedChar.passiveAbilities || [],
                    strength: existingDetailedChar.strength ?? 10, dexterity: existingDetailedChar.dexterity ?? 10, constitution: existingDetailedChar.constitution ?? 10,
                    intelligence: existingDetailedChar.intelligence ?? 10, wisdom: existingDetailedChar.wisdom ?? 10, charisma: existingDetailedChar.charisma ?? 10,
                    hitPoints: existingDetailedChar.hitPoints ?? 10, maxHitPoints: existingDetailedChar.maxHitPoints ?? 10, armorClass: existingDetailedChar.armorClass ?? 10,
                } : {
                    level: undefined, experience: undefined, characterClass: undefined, stats: undefined, inventory: undefined, skills: undefined,
                    spells: undefined, techniques: undefined, passiveAbilities: undefined, strength: undefined, dexterity: undefined, constitution: undefined,
                    intelligence: undefined, wisdom: undefined, charisma: undefined, hitPoints: undefined, maxHitPoints: undefined, armorClass: undefined,
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
                    spells: [], techniques: [], passiveAbilities: [], strength: 10, dexterity: 10, constitution: 10,
                    intelligence: 10, wisdom: 10, charisma: 10, hitPoints: 10, maxHitPoints: 10, armorClass: 10,
                } : {}),
            };
        }
    });

    stagedCharacters.forEach(sc => {
        if (!finalCharactersList.some(fc => fc.id === sc.id)) {
            finalCharactersList.push(sc);
        }
    });

    // Ensure all characters have relations to each other
    finalCharactersList.forEach(char => {
        finalCharactersList.forEach(otherChar => {
            if (char.id !== otherChar.id) {
                if (!char.relations) char.relations = {};
                if (!char.relations[otherChar.id]) {
                    char.relations[otherChar.id] = defaultRelation;
                }
            }
        });
        if (!char.relations) char.relations = {};
        if(!char.relations[PLAYER_ID]) {
            char.relations[PLAYER_ID] = defaultRelation;
        }
    });


    setCharacters(finalCharactersList);

    if (stagedAdventureMainSettings.initialSituation !== currentLiveAdventureSettings.initialSituation) {
        setNarrative([{ id: `msg-${Date.now()}`, type: 'system', content: stagedAdventureMainSettings.initialSituation, timestamp: Date.now() }]);
    }

    toast({ title: "Modifications Enregistrées", description: "Les paramètres de l'aventure et des personnages ont été mis à jour." });
  }, [stagedAdventureMainSettings, stagedCharacters, stagedInitialCharacterDefinitions, currentLanguage, toast, adventureSettings]);


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
            let existingCharsCopy = [...prevChars];

            newChars.forEach(newCharData => {
                if (!currentNames.has(newCharData.name.toLowerCase())) {
                    const newId = `${newCharData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                    const processedRelations: Record<string, string> = {};

                    if (newCharData.initialRelations && Array.isArray(newCharData.initialRelations)) {
                        newCharData.initialRelations.forEach(rel => {
                            const relationDescription = rel.description || defaultRelationDesc;
                            if (rel.targetName.toLowerCase() === (stagedAdventureMainSettings.playerName || "Player").toLowerCase()) {
                                processedRelations[PLAYER_ID] = relationDescription;
                            } else {
                                const targetChar = existingCharsCopy.find(ec => ec.name.toLowerCase() === rel.targetName.toLowerCase());
                                if (targetChar) {
                                    processedRelations[targetChar.id] = relationDescription;
                                }
                            }
                        });
                    }
                    if (!processedRelations[PLAYER_ID] || processedRelations[PLAYER_ID].trim() === "" || processedRelations[PLAYER_ID].toLowerCase() === "inconnu" || processedRelations[PLAYER_ID].toLowerCase() === "unknown") {
                        processedRelations[PLAYER_ID] = defaultRelationDesc;
                    }
                    existingCharsCopy.forEach(ec => {
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
                        ...(stagedAdventureMainSettings.rpgMode && {
                            level: 1, experience: 0, characterClass: '', stats: {}, inventory: {}, skills: {},
                            spells: [], techniques: [], passiveAbilities: [], strength: 10, dexterity: 10,
                            constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
                            hitPoints: 10, maxHitPoints: 10, armorClass: 10,
                        })
                    };
                    charsToAdd.push(characterToAdd);
                    currentNames.add(newCharData.name.toLowerCase());
                    existingCharsCopy = existingCharsCopy.map(ec => ({
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
                      description: `${charsToAdd.map(c => c.name).join(', ')} a été ajouté à la liste des personnages. Enregistrez les modifications pour confirmer.`,
                  });
                });
                setStagedInitialCharacterDefinitions(newFullList.map(c => ({ id: c.id, name: c.name, details: c.details })));
                return newFullList;
            }
            return prevChars;
        });
    }, [currentLanguage, stagedAdventureMainSettings.playerName, stagedAdventureMainSettings.rpgMode, toast]);

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
            if (changed) {
                setStagedInitialCharacterDefinitions(updatedChars.map(c => ({ id: c.id, name: c.name, details: c.details })));
                return updatedChars;
            }
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
                 setStagedInitialCharacterDefinitions(updatedChars.map(c => ({ id: c.id, name: c.name, details: c.details })));
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
            let chars = [...prevChars];
            let changed = false;

            updates.forEach(update => {
                const sourceCharIndex = chars.findIndex(c => c.name.toLowerCase() === update.characterName.toLowerCase());
                if (sourceCharIndex === -1) return;

                let targetId: string | null = null;
                if (update.targetName.toLowerCase() === (stagedAdventureMainSettings.playerName || "Player").toLowerCase()) {
                    targetId = PLAYER_ID;
                } else {
                    const targetChar = chars.find(c => c.name.toLowerCase() === update.targetName.toLowerCase());
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
            if (changed) {
                setStagedInitialCharacterDefinitions(chars.map(c => ({ id: c.id, name: c.name, details: c.details })));
                return chars;
            }
            return prevChars;
        });
    }, [currentLanguage, stagedAdventureMainSettings.playerName, toast]);

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

            if (lastUserIndex === -1 && prevNarrative.length > 1) {
                return prevNarrative.slice(0,1);
            } else if (lastUserIndex > 0) {
                const newNarrative = prevNarrative.slice(0, lastUserIndex);
                React.startTransition(() => { toast({ title: "Dernier tour annulé" }); });
                return newNarrative;
            } else if (prevNarrative.length > 1) {
                 const newNarrative = prevNarrative.slice(0, 1);
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
                 world: adventureSettings.world, initialSituation: narrativeContextForRegen,
                 characters: characters, userAction: lastUserAction, currentLanguage: currentLanguage,
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
                        mode: 'exploration',
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
                 if (lastAiIndex !== -1) newNarrative.splice(lastAiIndex, 1, newAiMessage);
                 else newNarrative.push(newAiMessage);
                return newNarrative;
             });

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
       setStagedInitialCharacterDefinitions(prevDefs => prevDefs.map(def =>
           def.id === updatedCharacter.id ? { ...def, name: updatedCharacter.name, details: updatedCharacter.details } : def
       ));
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
                 setStagedCharacters(prev => prev.map(c => c.id === character.id ? { ...c, _lastSaved: Date.now() } as any : c));
                 setStagedInitialCharacterDefinitions(prevDefs => prevDefs.map(def =>
                    def.id === character.id ? { ...def, name: character.name, details: character.details } : def
                 ));
            } catch (error) {
                 console.error("Failed to save character to localStorage:", error);
                 React.startTransition(() => { toast({ title: "Erreur de Sauvegarde", description: "Impossible de sauvegarder le personnage globalement.", variant: "destructive" }); });
            }
        } else {
            React.startTransition(() => { toast({ title: "Erreur", description: "La sauvegarde globale n'est disponible que côté client.", variant: "destructive" }); });
        }
    }, [toast]);

   const handleSave = React.useCallback(() => {
        const charactersToSave = characters.map(({ ...char }) => char);
        const saveData: SaveData = {
            adventureSettings, characters: charactersToSave, narrative,
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
                    if (typeof loadedData.narrative === 'string') {
                        loadedData.narrative = [{ id: `migrated-${Date.now()}`, type: 'system', content: loadedData.narrative, timestamp: Date.now() }];
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
                const loadedLang = loadedData.currentLanguage || "fr";
                const defaultRelation = loadedLang === 'fr' ? "Inconnu" : "Unknown";
                const validatedCharacters = loadedData.characters.map((c: any) => ({
                    id: c.id || `${c.name?.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                    name: c.name || "Inconnu", details: c.details || "", history: c.history || [], opinion: c.opinion || {},
                    portraitUrl: c.portraitUrl || null, affinity: c.affinity ?? 50, relations: c.relations || { [PLAYER_ID]: defaultRelation },
                    _lastSaved: c._lastSaved,
                    ...(rpgModeActive && { level: c.level ?? 1, experience: c.experience ?? 0, characterClass: c.characterClass ?? '', stats: c.stats ?? {}, inventory: c.inventory ?? {}, skills: c.skills ?? {}, spells: c.spells ?? [], techniques: c.techniques ?? [], passiveAbilities: c.passiveAbilities ?? [], strength: c.strength ?? 10, dexterity: c.dexterity ?? 10, constitution: c.constitution ?? 10, intelligence: c.intelligence ?? 10, wisdom: c.wisdom ?? 10, charisma: c.charisma ?? 10, hitPoints: c.hitPoints ?? 10, maxHitPoints: c.maxHitPoints ?? 10, armorClass: c.armorClass ?? 10, }),
                }));

                setAdventureSettings(loadedData.adventureSettings);
                setCharacters(validatedCharacters);
                setNarrative(loadedData.narrative as Message[]);
                setCurrentLanguage(loadedLang);
                setBaseAdventureSettings(loadedData.adventureSettings);
                setBaseCharacters(validatedCharacters);

                React.startTransition(() => { toast({ title: "Aventure Chargée", description: "L'état de l'aventure a été restauré." }); });
            } catch (error: any) {
                console.error("Error loading adventure:", error);
                React.startTransition(() => { toast({ title: "Erreur de Chargement", description: `Impossible de lire le fichier JSON: ${error.message}`, variant: "destructive" }); });
            }
        };
        reader.readAsText(file);
        if(event.target) event.target.value = '';
    }, [toast]);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const confirmRestartAdventure = React.useCallback(() => {
        setAdventureSettings(baseAdventureSettings);
        setCharacters(baseCharacters);
        setNarrative([{ id: `msg-${Date.now()}`, type: 'system', content: baseAdventureSettings.initialSituation, timestamp: Date.now() }]);
        setShowRestartConfirm(false);
        React.startTransition(() => { toast({ title: "Aventure Recommencée", description: "L'histoire a été réinitialisée à son état initial." }); });
    }, [baseAdventureSettings, baseCharacters, toast]);


  const memoizedStagedAdventureSettingsForForm = React.useMemo(() => {
    return {
      ...stagedAdventureMainSettings,
      characters: stagedInitialCharacterDefinitions,
      // Ensure enableRpgMode is explicitly passed if it's part of AdventureFormValues structure
      enableRpgMode: stagedAdventureMainSettings.rpgMode,
    };
  }, [stagedAdventureMainSettings, stagedInitialCharacterDefinitions]);

  return (
    <>
      <PageStructure
        adventureSettings={adventureSettings}
        characters={characters}
        stagedAdventureSettings={memoizedStagedAdventureSettingsForForm}
        stagedCharacters={stagedCharacters}
        propKey={formKey} // Pass formKey as propKey
        handleApplyStagedChanges={handleApplyStagedChanges}
        narrativeMessages={narrative}
        currentLanguage={currentLanguage}
        fileInputRef={fileInputRef}
        handleSettingsUpdate={handleSettingsUpdate}
        handleNarrativeUpdate={handleNarrativeUpdate}
        handleCharacterUpdate={handleCharacterUpdate}
        handleNewCharacters={handleNewCharacters}
        handleCharacterHistoryUpdate={handleCharacterHistoryUpdate}
        handleAffinityUpdates={handleAffinityUpdates}
        handleRelationUpdate={handleRelationUpdate}
        handleRelationUpdatesFromAI={handleRelationUpdatesFromAI}
        handleSaveNewCharacter={handleSaveNewCharacter}
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
