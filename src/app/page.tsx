
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

  const { toast } = useToast();

  // --- Callback Functions ---

  const handleSettingsUpdate = (newSettings: any /* Type from AdventureForm */) => {
    console.log("Updating global settings:", newSettings);
    const oldInitialSituation = adventureSettings.initialSituation;
    const newRPGMode = newSettings.enableRpgMode ?? false;
    const updatedSettings: AdventureSettings = { // Explicitly type updatedSettings
        world: newSettings.world,
        initialSituation: newSettings.initialSituation,
        rpgMode: newRPGMode,
        playerName: newSettings.playerName || "Player", // Update player name
        currencyName: newSettings.currencyName, // Ensure other fields are passed
    };
    setAdventureSettings(updatedSettings);

    // Update character list from form and store this as the "initial" set for resets
     const initialCharsFromForm = newSettings.characters.map((c: any) => {
        // Try to find existing character by name if ID is missing or new
        const existingChar = characters.find(ec => ec.name === c.name);
        const id = existingChar?.id || `${c.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`; // More unique ID
        return {
            id: id,
            name: c.name,
            details: c.details, // Details from form are assumed to be in the current UI language
            history: existingChar?.history || [], // History assumed to be in currentLanguage
            opinion: existingChar?.opinion || {},
            portraitUrl: existingChar?.portraitUrl || null,
            affinity: existingChar?.affinity ?? 50, // Keep existing affinity or default to 50
            relations: existingChar?.relations || { [PLAYER_ID]: "Inconnu" }, // Relations assumed to be in currentLanguage
            // Initialize RPG fields based on whether RPG mode is *currently* enabled
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
    setCharacters(initialCharsFromForm); // Set the current characters
    setInitialCharactersFromSettings(JSON.parse(JSON.stringify(initialCharsFromForm))); // Store a deep copy for resetting

    // Reset narrative only if initial situation changes
    if (newSettings.initialSituation !== oldInitialSituation) {
         setNarrative([{ id: `msg-${Date.now()}`, type: 'system', content: newSettings.initialSituation, timestamp: Date.now() }]);
    }

     // Show toast after settings update (wrapped in setTimeout)
     setTimeout(() => toast({ title: "Configuration Mise à Jour" }), 0);
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

        setCharacters(prevChars => {
            const currentNames = new Set(prevChars.map(c => c.name.toLowerCase()));
            const charsToAdd: Character[] = [];
            let existingChars = [...prevChars]; // Copy existing characters for relation updates

            newChars.forEach(newCharData => {
                if (!currentNames.has(newCharData.name.toLowerCase())) {
                    const newId = `${newCharData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                    
                    // Process AI-suggested initial relations (now an array of objects)
                    const processedRelations: Record<string, string> = {};
                    if (newCharData.initialRelations && Array.isArray(newCharData.initialRelations)) {
                        newCharData.initialRelations.forEach(rel => {
                            if (rel.targetName.toLowerCase() === (adventureSettings.playerName || "Player").toLowerCase()) {
                                processedRelations[PLAYER_ID] = rel.description; // Relation to player
                            } else {
                                const targetChar = existingChars.find(ec => ec.name.toLowerCase() === rel.targetName.toLowerCase());
                                if (targetChar) {
                                    processedRelations[targetChar.id] = rel.description; // Relation to existing NPC
                                } else {
                                    console.warn(`New character ${newCharData.name} has initial relation to unknown target ${rel.targetName}. Setting to 'Inconnu'.`);
                                }
                            }
                        });
                    }
                     // Ensure a default relation to player if not provided by AI
                    if (!processedRelations[PLAYER_ID]) {
                        processedRelations[PLAYER_ID] = currentLanguage === 'fr' ? "Rencontré récemment" : "Recently met";
                    }
                     // Ensure initial relations with other existing characters are set to "Inconnu" (or localized equivalent) if not provided
                    existingChars.forEach(ec => {
                        if (!processedRelations[ec.id]) {
                            processedRelations[ec.id] = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
                        }
                    });


                    const characterToAdd: Character = {
                        id: newId,
                        name: newCharData.name,
                        details: newCharData.details || (currentLanguage === 'fr' ? "Rencontré récemment." : "Recently met."), // Details in target language from AI
                        history: newCharData.initialHistoryEntry ? [newCharData.initialHistoryEntry] : [`Rencontré le ${new Date().toLocaleString()}`], // History in target language from AI
                        opinion: {}, // Initialize opinion
                        portraitUrl: null,
                        affinity: 50, // New characters start at neutral affinity
                        relations: processedRelations, // Use processed relations
                        // Initialize RPG fields if mode is on
                        ...(adventureSettings.rpgMode && {
                            level: 1,
                            experience: 0,
                            characterClass: '',
                            stats: {},
                            inventory: {},
                            skills: {},
                            spells: [],
                            techniques: [],
                            passiveAbilities: [],
                            strength: 10,
                            dexterity: 10,
                            constitution: 10,
                            intelligence: 10,
                            wisdom: 10,
                            charisma: 10,
                            hitPoints: 10,
                            maxHitPoints: 10,
                            armorClass: 10,
                        })
                    };
                    charsToAdd.push(characterToAdd);
                    currentNames.add(newCharData.name.toLowerCase()); // Add to set to prevent duplicates within the same batch

                     // Update existing characters' relations to include the new character
                     existingChars = existingChars.map(ec => {
                        const updatedEcRelations = { ...(ec.relations || {}) };
                        updatedEcRelations[newId] = currentLanguage === 'fr' ? "Inconnu" : "Unknown"; // Default relation from existing char to new char
                        return { ...ec, relations: updatedEcRelations };
                    });
                }
            });

            if (charsToAdd.length > 0) {
                // Wrap toast in setTimeout to avoid calling setState during render
                setTimeout(() => {
                    toast({
                        title: "Nouveau Personnage Rencontré",
                        description: `${charsToAdd.map(c => c.name).join(', ')} a été ajouté à la liste locale. Sauvegardez-le si vous le souhaitez.`,
                    });
                }, 0);
                 // Return updated existing characters + new characters
                return [...existingChars, ...charsToAdd];
            }
            return prevChars; // No changes if no new unique characters
        });
    };

    // Function to handle character history updates from AI
    const handleCharacterHistoryUpdate = (updates: CharacterUpdateSchema[]) => {
        if (!updates || updates.length === 0) return;

        setCharacters(prevChars => {
            let changed = false;
            const updatedChars = prevChars.map(char => {
                const charUpdates = updates.filter(u => u.characterName.toLowerCase() === char.name.toLowerCase());
                if (charUpdates.length > 0) {
                    changed = true;
                    const newHistory = charUpdates.map(u => u.historyEntry); // History entry in target language from AI
                    return {
                        ...char,
                        history: [...(char.history || []), ...newHistory],
                    };
                }
                return char;
            });

            if (changed) {
                console.log("Character histories updated:", updates);
                return updatedChars;
            }
            return prevChars; // No change
        });
    };

    // Function to handle affinity updates from AI
    const handleAffinityUpdates = (updates: AffinityUpdateSchema[]) => {
        if (!updates || updates.length === 0) return;

        setCharacters(prevChars => {
            let changed = false;
            const updatedChars = prevChars.map(char => {
                const affinityUpdate = updates.find(u => u.characterName.toLowerCase() === char.name.toLowerCase());
                if (affinityUpdate) {
                    changed = true;
                    const currentAffinity = char.affinity ?? 50;
                    // Clamp affinity between 0 and 100
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
                 // Optionally show a toast for significant affinity changes
                 updates.forEach(update => {
                     if (Math.abs(update.change) >= 3) { // Threshold for noticeable change (lowered from 5)
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
            return prevChars; // No change
        });
    };

     // Function to handle relation updates (can be called from CharacterSidebar or AI)
     const handleRelationUpdate = (charId: string, targetId: string, newRelation: string) => {
        setCharacters(prevChars => prevChars.map(char => {
            if (char.id === charId) {
                const updatedRelations = { ...(char.relations || {}), [targetId]: newRelation }; // newRelation is in target language
                console.log(`Manual relation update: ${char.name}'s relation towards ${targetId} set to "${newRelation}"`);
                return { ...char, relations: updatedRelations };
            }
            return char;
        }));
         setTimeout(() => {
            toast({ title: "Relation Mise à Jour Manuellement" });
        }, 0);
    };

    // Function to handle relation updates specifically from the AI response
    const handleRelationUpdatesFromAI = (updates: RelationUpdateSchema[]) => {
        if (!updates || updates.length === 0) return;

        console.log("Processing relation updates from AI:", updates);

        setCharacters(prevChars => {
            let chars = [...prevChars]; // Create a mutable copy
            let changed = false;

            updates.forEach(update => {
                const sourceCharIndex = chars.findIndex(c => c.name.toLowerCase() === update.characterName.toLowerCase());
                if (sourceCharIndex === -1) {
                    console.warn(`Relation update error: Source character "${update.characterName}" not found.`);
                    return; // Skip if source character not found
                }

                let targetId: string | null = null;
                // let targetCharIndex = -1; // Index for potential inverse update
                if (update.targetName.toLowerCase() === (adventureSettings.playerName || "Player").toLowerCase()) {
                    targetId = PLAYER_ID; // Target is the player
                } else {
                    const targetChar = chars.find(c => c.name.toLowerCase() === update.targetName.toLowerCase());
                    if (targetChar) {
                        targetId = targetChar.id;
                        // targetCharIndex = chars.findIndex(c => c.id === targetChar.id);
                    } else {
                        console.warn(`Relation update error: Target character "${update.targetName}" not found.`);
                        return; // Skip if target character not found
                    }
                }

                 if (!targetId) return; // Should not happen, but safety check

                const currentRelation = chars[sourceCharIndex].relations?.[targetId] || (currentLanguage === 'fr' ? "Inconnu" : "Unknown");

                if (currentRelation !== update.newRelation) { // newRelation from AI is in target language
                     // Clone the source character and their relations to update
                    const sourceChar = { ...chars[sourceCharIndex] };
                    sourceChar.relations = { ...(sourceChar.relations || {}), [targetId]: update.newRelation };
                    chars[sourceCharIndex] = sourceChar; // Update the source character in the array

                    changed = true;
                    console.log(`Relation updated by AI for ${update.characterName} towards ${update.targetName}: "${currentRelation}" -> "${update.newRelation}" (Reason: ${update.reason || 'N/A'})`);

                     // Show toast for the changed relation
                     setTimeout(() => {
                         toast({
                            title: `Relation Changée: ${update.characterName}`,
                            description: `Relation envers ${update.targetName} est maintenant "${update.newRelation}". Raison: ${update.reason || 'Événement narratif'}`,
                         });
                     }, 0);
                }
            });

            return changed ? chars : prevChars; // Return new array only if changed
        });
    };


   // New handler for editing a specific message
   const handleEditMessage = (messageId: string, newContent: string) => {
       setNarrative(prev => prev.map(msg =>
           msg.id === messageId ? { ...msg, content: newContent, timestamp: Date.now() } : msg
       ));
        // Use setTimeout to avoid updating state during render cycle
       setTimeout(() => {
            toast({ title: "Message Modifié" });
       }, 0);
   };


   // Function to undo the last message (user or AI)
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


    // Handler for regenerating the last AI response
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

         const narrativeContext = contextMessages.map(msg =>
                 msg.type === 'user' ? `> ${adventureSettings.playerName || 'Player'}: ${msg.content}` : msg.content
             ).join('\n\n') + `\n\n> ${adventureSettings.playerName || 'Player'}: ${lastUserAction}\n`;

         try {
             const input: GenerateAdventureInput = {
                 world: adventureSettings.world,
                 initialSituation: narrativeContext,
                 characters: characters,
                 userAction: lastUserAction,
                 currentLanguage: currentLanguage,
                 playerName: adventureSettings.playerName || "Player",
                 promptConfig: adventureSettings.rpgMode ? {
                    rpgContext: {
                        playerStats: { /* TODO: Player stats placeholder */ },
                        characterDetails: characters.map(c => ({
                             name: c.name,
                             details: c.details,
                             stats: c.stats,
                             inventory: c.inventory,
                             relations: c.relations ? Object.entries(c.relations).map(([id, desc]) => {
                                 const relatedChar = characters.find(char => char.id === id);
                                 const targetName = relatedChar ? relatedChar.name : (id === PLAYER_ID ? adventureSettings.playerName || 'Player' : 'Unknown');
                                 return `${targetName}: ${desc}`; // desc is already in target language
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
                     content: result.narrative, // Narrative from AI is in target language
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
       setCharacters(prev => prev.map(c => c.id === updatedCharacter.id ? updatedCharacter : c));
       console.log("Character updated:", updatedCharacter); // Debug log
   };

    const handleSaveNewCharacter = (character: Character) => {
        console.log("Saving new character globally:", character);
        if (typeof window !== 'undefined') {
            try {
                const existingCharsStr = localStorage.getItem('globalCharacters');
                let existingChars: Character[] = existingCharsStr ? JSON.parse(existingCharsStr) : [];

                const charIndex = existingChars.findIndex(c => c.id === character.id || c.name.toLowerCase() === character.name.toLowerCase());
                if (charIndex > -1) {
                    existingChars[charIndex] = character; // Update existing
                } else {
                    existingChars.push(character); // Add new
                }

                localStorage.setItem('globalCharacters', JSON.stringify(existingChars));
                 setTimeout(() => {
                    toast({ title: "Personnage Sauvegardé", description: `${character.name} est maintenant disponible globalement.` });
                 }, 0);
                 // Mark the character as saved locally to update UI (e.g., remove "New" badge)
                 handleCharacterUpdate({ ...character, _lastSaved: Date.now() } as any);

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
        const charactersToSave = characters.map(({ ...char }) => char);

        const saveData: SaveData = {
            adventureSettings,
            characters: charactersToSave,
            narrative,
            currentLanguage,
            saveFormatVersion: 1.6, // Current save format version
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
                    typeof msg === 'object' && msg !== null &&
                    typeof msg.id === 'string' &&
                    ['user', 'ai', 'system'].includes(msg.type) &&
                    typeof msg.content === 'string' &&
                    typeof msg.timestamp === 'number'
                );
                if (!isValidNarrative) {
                    if (typeof loadedData.narrative === 'string') {
                        console.warn("Migrating old string narrative format to message array.");
                        loadedData.narrative = [
                            { id: `migrated-${Date.now()}`, type: 'system', content: loadedData.narrative, timestamp: Date.now() }
                        ];
                    } else {
                        throw new Error("Structure des messages narratifs invalide.");
                    }
                }

                 if (loadedData.saveFormatVersion === undefined || loadedData.saveFormatVersion < 1.4) {
                     console.log("Migrating old save format (before relations)...");
                     loadedData.characters = loadedData.characters.map(c => ({
                        ...c,
                        history: Array.isArray(c.history) ? c.history : [],
                        opinion: typeof c.opinion === 'object' && c.opinion !== null ? c.opinion : {},
                        affinity: c.affinity ?? 50,
                        relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" },
                     }));
                     loadedData.adventureSettings.playerName = loadedData.adventureSettings.playerName || "Player";
                }
                 if (loadedData.saveFormatVersion < 1.5) {
                      console.log("Migrating save format (ensure relations initialized)...");
                       loadedData.characters = loadedData.characters.map(c => ({
                        ...c,
                        relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" },
                     }));
                 }
                  if (loadedData.saveFormatVersion < 1.6) {
                      console.log("Migrating save format (ensure relations format)...");
                       loadedData.characters = loadedData.characters.map(c => ({
                        ...c,
                        relations: typeof c.relations === 'object' && c.relations !== null ? c.relations : { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" },
                     }));
                 }


                setAdventureSettings(loadedData.adventureSettings);
                const rpgModeActive = loadedData.adventureSettings.rpgMode;
                const loadedLang = loadedData.currentLanguage || "fr";
                const validatedCharacters = loadedData.characters.map((c: any) => ({
                    id: c.id || `${c.name?.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                    name: c.name || "Inconnu",
                    details: c.details || "", // Details in loaded language
                    history: c.history || [], // History in loaded language
                    opinion: c.opinion || {},
                    portraitUrl: c.portraitUrl || null,
                    affinity: c.affinity ?? 50,
                    relations: c.relations || { [PLAYER_ID]: loadedLang === 'fr' ? "Inconnu" : "Unknown" }, // Relations in loaded language
                    _lastSaved: c._lastSaved, // Preserve _lastSaved if present
                    ...(rpgModeActive && {
                        level: c.level ?? 1,
                        experience: c.experience ?? 0,
                        characterClass: c.characterClass ?? '',
                        stats: c.stats ?? {},
                        inventory: c.inventory ?? {},
                        skills: c.skills ?? {},
                        spells: c.spells ?? [],
                        techniques: c.techniques ?? [],
                        passiveAbilities: c.passiveAbilities ?? [],
                        strength: c.strength ?? 10,
                        dexterity: c.dexterity ?? 10,
                        constitution: c.constitution ?? 10,
                        intelligence: c.intelligence ?? 10,
                        wisdom: c.wisdom ?? 10,
                        charisma: c.charisma ?? 10,
                        hitPoints: c.hitPoints ?? 10,
                        maxHitPoints: c.maxHitPoints ?? 10,
                        armorClass: c.armorClass ?? 10,
                    }),
                }));
                setCharacters(validatedCharacters);
                setInitialCharactersFromSettings(JSON.parse(JSON.stringify(validatedCharacters)));
                setNarrative(loadedData.narrative as Message[]);
                setCurrentLanguage(loadedLang);

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
        event.target.value = '';
    };

    // Ref for file input
    const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Function to handle restarting the adventure
  const confirmRestartAdventure = () => {
    // Reset narrative to initial situation
    setNarrative([{ id: `msg-${Date.now()}`, type: 'system', content: adventureSettings.initialSituation, timestamp: Date.now() }]);
    // Reset characters to the initial set defined in adventureSettings
    setCharacters(JSON.parse(JSON.stringify(initialCharactersFromSettings))); // Deep copy
    setImageUrl(null); // Reset current image if any
    // setChoices([]); // Reset choices if any
    setShowRestartConfirm(false); // Close the dialog
    setTimeout(() => {
      toast({ title: "Aventure Recommencée", description: "L'histoire a été réinitialisée." });
    }, 0);
  };
  const [imageUrl, setImageUrl] = React.useState<string | null>(null); // Add imageUrl state for reset


  // --- Render ---
  return (
    <>
      <PageStructure
        adventureSettings={adventureSettings}
        characters={characters}
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
        onRestartAdventure={() => setShowRestartConfirm(true)} // Show confirmation dialog
      />
       {/* Restart Confirmation Dialog */}
       <AlertDialog open={showRestartConfirm} onOpenChange={setShowRestartConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Recommencer l'aventure ?</AlertDialogTitle>
                <AlertDialogDescription>
                    Êtes-vous sûr de vouloir recommencer l'aventure en cours ? Toute la progression narrative et les changements sur les personnages (non sauvegardés globalement) seront perdus.
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
