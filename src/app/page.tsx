
"use client"; // Mark page as Client Component to manage state

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { Character, AdventureSettings, SaveData, Message } from "@/types"; // Import shared types including Message
import { PageStructure } from "./page.structure"; // Import the layout structure component

// Import AI functions here
import { generateAdventure } from "@/ai/flows/generate-adventure";
import { generateSceneImage } from "@/ai/flows/generate-scene-image";
import { translateText } from "@/ai/flows/translate-text";
import type { GenerateAdventureInput, GenerateAdventureOutput, CharacterUpdateSchema, AffinityUpdateSchema, RelationUpdateSchema, NewCharacterSchema } from "@/ai/flows/generate-adventure"; // Import input/output/new char/update/affinity/relation types
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
} from "@/components/ui/alert-dialog" // Import AlertDialog components for restart confirmation

// Constants
const PLAYER_ID = "player"; // Define a constant ID for the player

export default function Home() {
  // State Management
  const [adventureSettings, setAdventureSettings] = React.useState<AdventureSettings>({
    world: "Grande université populaire nommée \"hight scoole of futur\".",
    initialSituation: "Vous marchez dans les couloirs animés de Hight School of Future lorsque vous apercevez Rina, votre petite amie, en pleine conversation avec Kentaro, votre meilleur ami. Ils semblent étrangement proches, riant doucement. Un sentiment de malaise vous envahit.",
    rpgMode: false,
    playerName: "Player", // Default player name
  });
  const [characters, setCharacters] = React.useState<Character[]>([
      {
        id: 'rina-1',
        name: "Rina",
        details: "jeune femme de 19 ans, votre petite amie. Elle se rapproche de Kentaro. Étudiante populaire, calme, aimante, parfois secrète. 165 cm, yeux marron, cheveux mi-longs bruns, traits fins, athlétique.",
        history: ["Ceci est un exemple d'historique pour Rina."],
        opinion: {},
        affinity: 70, // Initial affinity towards player
        relations: { [PLAYER_ID]: "Petite amie", 'kentaro-1': "Ami" } // Initial relations
      },
      {
        id: 'kentaro-1',
        name: "Kentaro",
        details: "Jeune homme de 20 ans, votre meilleur ami. Étudiant populaire, charmant mais calculateur et impulsif. 185 cm, athlétique, yeux bleus, cheveux courts blonds. Aime draguer et voir son meilleur ami souffrir. Se rapproche de Rina.",
        history: ["Kentaro a été vu parlant à Rina."],
        opinion: {},
        affinity: 60, // Initial affinity towards player
        relations: { [PLAYER_ID]: "Meilleur ami", 'rina-1': "Ami" } // Initial relations
      }
  ]);
  // Store the initial characters defined in settings separately for reset purposes
  const [initialCharactersFromSettings, setInitialCharactersFromSettings] = React.useState<Character[]>([
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
  // Narrative is now an array of Message objects
  const [narrative, setNarrative] = React.useState<Message[]>([
     { id: `msg-${Date.now()}`, type: 'system', content: adventureSettings.initialSituation, timestamp: Date.now() }
  ]);
  const [currentLanguage, setCurrentLanguage] = React.useState<string>("fr"); // Add state for language
  const [isRegenerating, setIsRegenerating] = React.useState<boolean>(false); // State for regeneration loading
  const [showRestartConfirm, setShowRestartConfirm] = React.useState<boolean>(false); // State for restart confirmation dialog

  // Staged state for AdventureForm and CharacterSidebar changes
  const [stagedAdventureSettings, setStagedAdventureSettings] = React.useState<AdventureSettings>(adventureSettings);
  const [stagedCharacters, setStagedCharacters] = React.useState<Character[]>(characters);


  const { toast } = useToast();

  // Sync staged state when main state changes (e.g., on load or initial setup)
  React.useEffect(() => {
    setStagedAdventureSettings(adventureSettings);
  }, [adventureSettings]);

  React.useEffect(() => {
    setStagedCharacters(characters);
  }, [characters]);


  // --- Callback Functions ---

  const handleSettingsUpdate = (newSettings: AdventureFormValues) => { // Type from AdventureForm
    console.log("Staging settings update:", newSettings);
    const oldInitialSituation = stagedAdventureSettings.initialSituation; // Compare with staged settings
    const newRPGMode = newSettings.enableRpgMode ?? false;
    const updatedStagedSettings: AdventureSettings = {
        world: newSettings.world,
        initialSituation: newSettings.initialSituation,
        rpgMode: newRPGMode,
        playerName: newSettings.playerName || "Player",
        currencyName: newSettings.currencyName,
    };
    setStagedAdventureSettings(updatedStagedSettings);

    const defaultRelation = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
    const updatedStagedChars = newSettings.characters.map((c: any) => {
        const existingChar = stagedCharacters.find(ec => ec.name === c.name); // Check against stagedCharacters
        const id = existingChar?.id || `${c.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        return {
            id: id,
            name: c.name,
            details: c.details,
            history: existingChar?.history || [],
            opinion: existingChar?.opinion || {},
            portraitUrl: existingChar?.portraitUrl || null,
            affinity: existingChar?.affinity ?? 50,
            relations: existingChar?.relations || { [PLAYER_ID]: defaultRelation },
            ...(newRPGMode && {
                level: existingChar?.level || 1,
                experience: existingChar?.experience || 0,
                characterClass: existingChar?.characterClass || '',
                stats: existingChar?.stats || {},
                inventory: existingChar?.inventory || {},
                skills: existingChar?.skills || {},
                spells: existingChar?.spells || [],
                techniques: existingChar?.techniques || [],
                passiveAbilities: existingChar?.passiveAbilities || [],
                strength: existingChar?.strength ?? 10,
                dexterity: existingChar?.dexterity ?? 10,
                constitution: existingChar?.constitution ?? 10,
                intelligence: existingChar?.intelligence ?? 10,
                wisdom: existingChar?.wisdom ?? 10,
                charisma: existingChar?.charisma ?? 10,
                hitPoints: existingChar?.hitPoints ?? 10,
                maxHitPoints: existingChar?.maxHitPoints ?? 10,
                armorClass: existingChar?.armorClass ?? 10,
            })
        };
    });
    setStagedCharacters(updatedStagedChars);

    // Reset narrative only if initial situation in staged settings changes
    if (newSettings.initialSituation !== oldInitialSituation) {
         // This should probably apply to the main narrative if the user saves these changes.
         // For now, let's assume initialSituation change only takes effect after save.
         // If immediate reset is desired even for staged changes, that's different.
         // Let's keep narrative tied to *applied* settings for now.
    }
    // REMOVED: setTimeout(() => toast({ title: "Configuration Mise à Jour" }), 0);
  };

  const handleApplyStagedChanges = () => {
    console.log("Applying staged changes to main state.");
    setAdventureSettings(stagedAdventureSettings);
    setCharacters(stagedCharacters);
    setInitialCharactersFromSettings(JSON.parse(JSON.stringify(stagedCharacters))); // Update reset baseline

    // Reset narrative if initial situation has changed
    if (stagedAdventureSettings.initialSituation !== adventureSettings.initialSituation) {
        setNarrative([{ id: `msg-${Date.now()}`, type: 'system', content: stagedAdventureSettings.initialSituation, timestamp: Date.now() }]);
    }

    toast({ title: "Modifications Enregistrées", description: "Les paramètres de l'aventure et des personnages ont été mis à jour." });
  };


   // Updated to handle Message objects and scene description
   const handleNarrativeUpdate = (content: string, type: 'user' | 'ai', sceneDesc?: string) => {
       const newMessage: Message = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`, // More unique ID
            type: type,
            content: content,
            timestamp: Date.now(),
            sceneDescription: type === 'ai' ? sceneDesc : undefined, // Add scene desc only to AI messages
       };
       // Use functional update to ensure we're working with the latest state
       setNarrative(prevNarrative => [...prevNarrative, newMessage]);
   };

   // Function to handle newly detected characters from AI response
   const handleNewCharacters = (newChars: Array<NewCharacterSchema>) => { // Use NewCharacterSchema from generate-adventure
        if (!newChars || newChars.length === 0) return;
        const defaultRelationDesc = currentLanguage === 'fr' ? "Inconnu" : "Unknown";

        setStagedCharacters(prevChars => { // Update staged characters
            const currentNames = new Set(prevChars.map(c => c.name.toLowerCase()));
            const charsToAdd: Character[] = [];
            let existingChars = [...prevChars];

            newChars.forEach(newCharData => {
                if (!currentNames.has(newCharData.name.toLowerCase())) {
                    const newId = `${newCharData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                    
                    const processedRelations: Record<string, string> = {};
                    if (newCharData.initialRelations && Array.isArray(newCharData.initialRelations)) {
                        newCharData.initialRelations.forEach(rel => {
                            const relationDescription = rel.description || defaultRelationDesc; 
                            if (rel.targetName.toLowerCase() === (stagedAdventureSettings.playerName || "Player").toLowerCase()) { // Use staged player name
                                processedRelations[PLAYER_ID] = relationDescription;
                            } else {
                                const targetChar = existingChars.find(ec => ec.name.toLowerCase() === rel.targetName.toLowerCase());
                                if (targetChar) {
                                    processedRelations[targetChar.id] = relationDescription; 
                                } else {
                                    console.warn(`New character ${newCharData.name} has initial relation to unknown target ${rel.targetName}. Using default.`);
                                }
                            }
                        });
                    }
                    if (!processedRelations[PLAYER_ID] || processedRelations[PLAYER_ID].trim() === "" || processedRelations[PLAYER_ID].toLowerCase() === "inconnu" || processedRelations[PLAYER_ID].toLowerCase() === "unknown") {
                        processedRelations[PLAYER_ID] = defaultRelationDesc;
                    }
                    existingChars.forEach(ec => {
                        if (!processedRelations[ec.id] || processedRelations[ec.id].trim() === "" || processedRelations[ec.id].toLowerCase() === "inconnu" || processedRelations[ec.id].toLowerCase() === "unknown") {
                            processedRelations[ec.id] = defaultRelationDesc;
                        }
                    });

                    const characterToAdd: Character = {
                        id: newId,
                        name: newCharData.name,
                        details: newCharData.details || (currentLanguage === 'fr' ? "Rencontré récemment." : "Recently met."),
                        history: newCharData.initialHistoryEntry ? [newCharData.initialHistoryEntry] : [`Rencontré le ${new Date().toLocaleString()}`],
                        opinion: {},
                        portraitUrl: null,
                        affinity: 50,
                        relations: processedRelations,
                        ...(stagedAdventureSettings.rpgMode && { // Use staged RPG mode
                            level: 1, experience: 0, characterClass: '', stats: {}, inventory: {}, skills: {},
                            spells: [], techniques: [], passiveAbilities: [], strength: 10, dexterity: 10,
                            constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
                            hitPoints: 10, maxHitPoints: 10, armorClass: 10,
                        })
                    };
                    charsToAdd.push(characterToAdd);
                    currentNames.add(newCharData.name.toLowerCase());

                     existingChars = existingChars.map(ec => {
                        const updatedEcRelations = { ...(ec.relations || {}) };
                        if (!updatedEcRelations[newId] || updatedEcRelations[newId].trim() === "" || updatedEcRelations[newId].toLowerCase() === "inconnu" || updatedEcRelations[newId].toLowerCase() === "unknown") {
                             updatedEcRelations[newId] = defaultRelationDesc;
                        }
                        return { ...ec, relations: updatedEcRelations };
                    });
                }
            });

            if (charsToAdd.length > 0) {
                setTimeout(() => {
                    toast({
                        title: "Nouveau Personnage Rencontré",
                        description: `${charsToAdd.map(c => c.name).join(', ')} a été ajouté à la liste locale. Enregistrez les modifications pour confirmer.`,
                    });
                }, 0);
                return [...existingChars, ...charsToAdd];
            }
            return prevChars;
        });
    };

    const handleCharacterHistoryUpdate = (updates: CharacterUpdateSchema[]) => {
        if (!updates || updates.length === 0) return;
        setStagedCharacters(prevChars => { // Update staged characters
            // ... (rest of the logic, ensure it updates prevChars correctly)
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
            return changed ? updatedChars : prevChars;
        });
    };

    const handleAffinityUpdates = (updates: AffinityUpdateSchema[]) => {
        if (!updates || updates.length === 0) return;
        setStagedCharacters(prevChars => { // Update staged characters
            // ... (rest of the logic, ensure it updates prevChars correctly)
             let changed = false;
            const updatedChars = prevChars.map(char => {
                const affinityUpdate = updates.find(u => u.characterName.toLowerCase() === char.name.toLowerCase());
                if (affinityUpdate) {
                    changed = true;
                    const currentAffinity = char.affinity ?? 50;
                    const newAffinity = Math.max(0, Math.min(100, currentAffinity + affinityUpdate.change));
                    console.log(`Affinity update for ${char.name}: ${currentAffinity} -> ${newAffinity} (Change: ${affinityUpdate.change}, Reason: ${affinityUpdate.reason})`);
                    return {
                        ...char,
                        affinity: newAffinity,
                    };
                }
                return char;
            });

            if (changed) {
                 updates.forEach(update => {
                     if (Math.abs(update.change) >= 3) { 
                         const charName = update.characterName;
                         const direction = update.change > 0 ? 'améliorée' : 'détériorée';
                         setTimeout(() => {
                             toast({
                                title: `Affinité Modifiée: ${charName}`,
                                description: `Votre relation avec ${charName} s'est ${direction}. Raison: ${update.reason || 'Interaction récente'}`,
                             });
                         }, 0);
                     }
                 });
                return updatedChars;
            }
            return prevChars;
        });
    };

     const handleRelationUpdate = (charId: string, targetId: string, newRelation: string) => {
        setStagedCharacters(prevChars => prevChars.map(char => { // Update staged characters
            if (char.id === charId) {
                const updatedRelations = { ...(char.relations || {}), [targetId]: newRelation };
                console.log(`Staged relation update: ${char.name}'s relation towards ${targetId} set to "${newRelation}"`);
                return { ...char, relations: updatedRelations };
            }
            return char;
        }));
        // REMOVED: setTimeout(() => { toast({ title: "Relation Mise à Jour Manuellement" }); }, 0);
    };

    const handleRelationUpdatesFromAI = (updates: RelationUpdateSchema[]) => {
        if (!updates || updates.length === 0) return;
        console.log("Processing relation updates from AI for staged characters:", updates);
        const defaultRelationDesc = currentLanguage === 'fr' ? "Inconnu" : "Unknown";

        setStagedCharacters(prevChars => { // Update staged characters
            let chars = [...prevChars];
            let changed = false;

            updates.forEach(update => {
                const sourceCharIndex = chars.findIndex(c => c.name.toLowerCase() === update.characterName.toLowerCase());
                if (sourceCharIndex === -1) {
                    console.warn(`Relation update error: Source character "${update.characterName}" not found.`);
                    return;
                }

                let targetId: string | null = null;
                if (update.targetName.toLowerCase() === (stagedAdventureSettings.playerName || "Player").toLowerCase()) { // Use staged player name
                    targetId = PLAYER_ID;
                } else {
                    const targetChar = chars.find(c => c.name.toLowerCase() === update.targetName.toLowerCase());
                    if (targetChar) {
                        targetId = targetChar.id;
                    } else {
                        console.warn(`Relation update error: Target character "${update.targetName}" not found.`);
                        return;
                    }
                }
                if (!targetId) return;

                const currentRelation = chars[sourceCharIndex].relations?.[targetId] || defaultRelationDesc;
                const newRelationFromAI = update.newRelation.trim() === "" || update.newRelation.toLowerCase() === "inconnu" || update.newRelation.toLowerCase() === "unknown" ? defaultRelationDesc : update.newRelation;

                if (currentRelation !== newRelationFromAI) { 
                    const sourceChar = { ...chars[sourceCharIndex] };
                    sourceChar.relations = { ...(sourceChar.relations || {}), [targetId]: newRelationFromAI };
                    chars[sourceCharIndex] = sourceChar; 
                    changed = true;
                    console.log(`Staged relation updated by AI for ${update.characterName} towards ${update.targetName}: "${currentRelation}" -> "${newRelationFromAI}" (Reason: ${update.reason || 'N/A'})`);
                     setTimeout(() => {
                         toast({
                            title: `Relation Changée: ${update.characterName}`,
                            description: `Relation envers ${update.targetName} est maintenant "${newRelationFromAI}". Raison: ${update.reason || 'Événement narratif'}`,
                         });
                     }, 0);
                }
            });
            return changed ? chars : prevChars;
        });
    };

   const handleEditMessage = (messageId: string, newContent: string) => {
       setNarrative(prev => prev.map(msg =>
           msg.id === messageId ? { ...msg, content: newContent, timestamp: Date.now() } : msg
       ));
       setTimeout(() => {
            toast({ title: "Message Modifié" });
       }, 0);
   };

    const handleUndoLastMessage = () => {
        setNarrative(prevNarrative => {
            if (prevNarrative.length <= 1) {
                 setTimeout(() => {
                     toast({ title: "Impossible d'annuler", description: "Aucun message à annuler.", variant: "destructive" });
                 }, 0);
                 return prevNarrative;
            }
            const newNarrative = prevNarrative.slice(0, -1);
             setTimeout(() => {
                toast({ title: "Dernier message annulé" });
             }, 0);
            return newNarrative;
        });
    };

    const handleRegenerateLastResponse = async () => {
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
                 const contextStartIndex = Math.max(0, contextEndIndex - 4);
                 contextMessages = currentNarrative.slice(contextStartIndex, contextEndIndex);
                 break;
             }
         }

         if (!lastAiMessage || !lastUserAction) {
             setTimeout(() => {
                  toast({ title: "Impossible de régénérer", description: "Aucune réponse IA précédente valide trouvée pour régénérer.", variant: "destructive" });
             }, 0);
             return;
         }

         setIsRegenerating(true);
          setTimeout(() => {
            toast({ title: "Régénération en cours...", description: "Génération d'une nouvelle réponse." });
          }, 0);

         const narrativeContextForRegen = contextMessages.map(msg =>
                 msg.type === 'user' ? `> ${adventureSettings.playerName || 'Player'}: ${msg.content}` : msg.content // Use applied player name
             ).join('\n\n') + `\n\n> ${adventureSettings.playerName || 'Player'}: ${lastUserAction}\n`;

         try {
             const input: GenerateAdventureInput = {
                 world: adventureSettings.world, // Use applied settings
                 initialSituation: narrativeContextForRegen,
                 characters: characters, // Use applied characters
                 userAction: lastUserAction,
                 currentLanguage: currentLanguage,
                 playerName: adventureSettings.playerName || "Player", // Use applied player name
                 promptConfig: adventureSettings.rpgMode ? { // Use applied RPG mode
                    rpgContext: {
                        playerStats: { },
                        characterDetails: characters.map(c => ({ // Use applied characters
                             name: c.name,
                             details: c.details,
                             stats: c.stats,
                             inventory: c.inventory,
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
             handleAffinityUpdates(result.affinityUpdates || []);
             handleRelationUpdatesFromAI(result.relationUpdates || []);

              setTimeout(() => {
                toast({ title: "Réponse Régénérée", description: "Une nouvelle réponse a été ajoutée." });
              }, 0);

         } catch (error) {
             console.error("Error regenerating adventure:", error);
              setTimeout(() => {
                toast({
                 title: "Erreur de Régénération",
                 description: `Impossible de générer une nouvelle réponse: ${error instanceof Error ? error.message : 'Unknown error'}.`,
                 variant: "destructive",
                });
              }, 0);
         } finally {
             setIsRegenerating(false);
         }
     };

   const handleCharacterUpdate = (updatedCharacter: Character) => {
       setStagedCharacters(prev => prev.map(c => c.id === updatedCharacter.id ? updatedCharacter : c)); // Update staged characters
       console.log("Staged character updated:", updatedCharacter);
   };

    const handleSaveNewCharacter = (character: Character) => {
        console.log("Saving new character globally:", character);
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
                 setTimeout(() => {
                    toast({ title: "Personnage Sauvegardé", description: `${character.name} est maintenant disponible globalement.` });
                 }, 0);
                 // Update the staged character to reflect it's saved (e.g., for UI changes)
                 setStagedCharacters(prev => prev.map(c => c.id === character.id ? { ...c, _lastSaved: Date.now() } as any : c));
            } catch (error) {
                 console.error("Failed to save character to localStorage:", error);
                 setTimeout(() => {
                     toast({ title: "Erreur de Sauvegarde", description: "Impossible de sauvegarder le personnage globalement.", variant: "destructive" });
                 }, 0);
            }
        } else {
              setTimeout(() => {
                toast({ title: "Erreur", description: "La sauvegarde globale n'est disponible que côté client.", variant: "destructive" });
              }, 0);
        }
    };

   const handleSave = () => {
        console.log("Saving Adventure State...");
        // Save applied state, not staged state
        const charactersToSave = characters.map(({ ...char }) => char);
        const saveData: SaveData = {
            adventureSettings,
            characters: charactersToSave,
            narrative,
            currentLanguage,
            saveFormatVersion: 1.6,
            timestamp: new Date().toISOString(),
        };
        const jsonString = JSON.stringify(saveData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aventurier_textuel_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
         setTimeout(() => {
            toast({ title: "Aventure Sauvegardée", description: "Le fichier JSON a été téléchargé." });
         }, 0);
    };

    const handleLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
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
                        console.warn("Migrating old string narrative format to message array.");
                        loadedData.narrative = [{ id: `migrated-${Date.now()}`, type: 'system', content: loadedData.narrative, timestamp: Date.now() }];
                    } else {
                        throw new Error("Structure des messages narratifs invalide.");
                    }
                }
                 if (loadedData.saveFormatVersion === undefined || loadedData.saveFormatVersion < 1.4) {
                     console.log("Migrating old save format (before relations)...");
                     loadedData.characters = loadedData.characters.map(c => ({ ...c, history: Array.isArray(c.history) ? c.history : [], opinion: typeof c.opinion === 'object' && c.opinion !== null ? c.opinion : {}, affinity: c.affinity ?? 50, relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                     loadedData.adventureSettings.playerName = loadedData.adventureSettings.playerName || "Player";
                }
                 if (loadedData.saveFormatVersion < 1.5) {
                      console.log("Migrating save format (ensure relations initialized)...");
                       loadedData.characters = loadedData.characters.map(c => ({ ...c, relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                 }
                  if (loadedData.saveFormatVersion < 1.6) {
                      console.log("Migrating save format (ensure relations format)...");
                       loadedData.characters = loadedData.characters.map(c => ({ ...c, relations: typeof c.relations === 'object' && c.relations !== null ? c.relations : { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                 }

                // Apply to main state
                setAdventureSettings(loadedData.adventureSettings);
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
                setCharacters(validatedCharacters);
                setInitialCharactersFromSettings(JSON.parse(JSON.stringify(validatedCharacters))); // Sync reset baseline
                setNarrative(loadedData.narrative as Message[]);
                setCurrentLanguage(loadedLang);

                // Also update staged state to match loaded data
                setStagedAdventureSettings(loadedData.adventureSettings);
                setStagedCharacters(validatedCharacters);

                 setTimeout(() => {
                    toast({ title: "Aventure Chargée", description: "L'état de l'aventure a été restauré." });
                 }, 0);
            } catch (error: any) {
                console.error("Error loading adventure:", error);
                 setTimeout(() => {
                    toast({ title: "Erreur de Chargement", description: `Impossible de lire le fichier JSON: ${error.message}`, variant: "destructive" });
                 }, 0);
            }
        };
        reader.readAsText(file);
        if(event.target) event.target.value = '';
    };

    const fileInputRef = React.useRef<HTMLInputElement>(null);

  const confirmRestartAdventure = () => {
    // Reset main state using initialCharactersFromSettings (which should be based on last *applied* config)
    setAdventureSettings(prev => ({...prev, initialSituation: prev.initialSituation})); // Keep current world etc, just reset narrative start point potentially
    setNarrative([{ id: `msg-${Date.now()}`, type: 'system', content: adventureSettings.initialSituation, timestamp: Date.now() }]);
    setCharacters(JSON.parse(JSON.stringify(initialCharactersFromSettings)));
    
    // Also reset staged state to match the main state after reset
    setStagedAdventureSettings(adventureSettings); // Or reset to a default if preferred
    setStagedCharacters(JSON.parse(JSON.stringify(initialCharactersFromSettings)));

    setImageUrl(null);
    setShowRestartConfirm(false);
    setTimeout(() => {
      toast({ title: "Aventure Recommencée", description: "L'histoire a été réinitialisée." });
    }, 0);
  };
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);


  // --- Render ---
  return (
    <>
      <PageStructure
        adventureSettings={adventureSettings} // Pass main settings for display/AI
        characters={characters} // Pass main characters for display/AI
        stagedAdventureSettings={stagedAdventureSettings} // Pass staged for forms
        stagedCharacters={stagedCharacters} // Pass staged for forms
        handleApplyStagedChanges={handleApplyStagedChanges} // New handler for save button
        narrativeMessages={narrative}
        currentLanguage={currentLanguage}
        fileInputRef={fileInputRef}
        handleSettingsUpdate={handleSettingsUpdate} // Will update staged settings
        handleNarrativeUpdate={handleNarrativeUpdate}
        handleCharacterUpdate={handleCharacterUpdate} // Will update staged characters
        handleNewCharacters={handleNewCharacters} // Will update staged characters
        handleCharacterHistoryUpdate={handleCharacterHistoryUpdate} // Will update staged characters
        handleAffinityUpdates={handleAffinityUpdates} // Will update staged characters
        handleRelationUpdate={handleRelationUpdate} // Will update staged characters
        handleRelationUpdatesFromAI={handleRelationUpdatesFromAI} // Will update staged characters
        handleSaveNewCharacter={handleSaveNewCharacter} // Manages its own localStorage interaction
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
        playerName={adventureSettings.playerName || "Player"} // Use applied player name for display/AI
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

// Helper type for AdventureForm props
type AdventureFormValues = Omit<AdventureSettings, 'rpgMode'> & {
  characters: Array<{ id?: string; name: string; details: string }>;
  enableRpgMode?: boolean;
};
