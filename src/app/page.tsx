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

// Helper type for character definitions within AdventureForm
type FormCharacterDefinition = { id?: string; name: string; details: string };

export default function Home() {
  // State Management
  const [baseAdventureSettings, setBaseAdventureSettings] = React.useState<AdventureSettings>({
    world: "Grande université populaire nommée \"hight scoole of futur\".",
    initialSituation: "Vous marchez dans les couloirs animés de Hight School of Future lorsque vous apercevez Rina, votre petite amie, en pleine conversation avec Kentaro, votre meilleur ami. Ils semblent étrangement proches, riant doucement. Un sentiment de malaise vous envahit.",
    rpgMode: false,
    playerName: "Player", // Default player name
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
  
  // Applied state (used by AdventureDisplay)
  const [adventureSettings, setAdventureSettings] = React.useState<AdventureSettings>(baseAdventureSettings);
  const [characters, setCharacters] = React.useState<Character[]>(baseCharacters);

  // Staged state for Right Sidebar (AdventureForm and CharacterSidebar)
  const [stagedAdventureMainSettings, setStagedAdventureMainSettings] = React.useState<AdventureSettings>(baseAdventureSettings);
  // Staged character definitions from AdventureForm's "Définir les Personnages Initiaux"
  const [stagedInitialCharacterDefinitions, setStagedInitialCharacterDefinitions] = React.useState<FormCharacterDefinition[]>(
    baseCharacters.map(c => ({ id: c.id, name: c.name, details: c.details }))
  );
  // Staged full characters (edited by CharacterSidebar, and provides base for AdventureForm's initial character definitions)
  const [stagedCharacters, setStagedCharacters] = React.useState<Character[]>(baseCharacters);
  
  const [formKey, setFormKey] = React.useState(0); // Key to re-mount AdventureForm

  const [narrative, setNarrative] = React.useState<Message[]>([
     { id: `msg-${Date.now()}`, type: 'system', content: baseAdventureSettings.initialSituation, timestamp: Date.now() }
  ]);
  const [currentLanguage, setCurrentLanguage] = React.useState<string>("fr");
  const [isRegenerating, setIsRegenerating] = React.useState<boolean>(false);
  const [showRestartConfirm, setShowRestartConfirm] = React.useState<boolean>(false);

  const { toast } = useToast();

  // Sync staged states when base states change (e.g., on load)
  React.useEffect(() => {
    setStagedAdventureMainSettings(adventureSettings);
    setStagedCharacters(characters);
    setStagedInitialCharacterDefinitions(characters.map(c => ({ id: c.id, name: c.name, details: c.details })));
    setFormKey(prev => prev + 1);
  }, [adventureSettings, characters]);


  // --- Callback Functions ---

  const handleSettingsUpdate = React.useCallback((newSettingsFromForm: AdventureFormValues) => {
    console.log("Staging AdventureForm update with:", newSettingsFromForm);
    setStagedAdventureMainSettings(prevSettings => ({
        ...prevSettings, // Keep existing fields like currencyName if not in AdventureFormValues
        world: newSettingsFromForm.world,
        initialSituation: newSettingsFromForm.initialSituation,
        rpgMode: newSettingsFromForm.enableRpgMode ?? false,
        playerName: newSettingsFromForm.playerName || "Player",
        currencyName: newSettingsFromForm.currencyName, // Assuming AdventureFormValues includes this
    }));
    // Update only the definitions from the form, don't merge into stagedCharacters yet.
    setStagedInitialCharacterDefinitions(newSettingsFromForm.characters);
  }, []);


  const handleApplyStagedChanges = () => {
    console.log("Applying staged changes to main state.");
    
    // 1. Apply main adventure settings
    setAdventureSettings(stagedAdventureMainSettings);

    // 2. Reconcile stagedInitialCharacterDefinitions (from form) with stagedCharacters (from sidebar)
    const defaultRelation = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
    const newRPGMode = stagedAdventureMainSettings.rpgMode;

    let reconciledStagedCharacters = [...stagedCharacters]; // Start with current detailed staged characters

    // Create a map for quick lookup of existing detailed characters
    const detailedCharMap = new Map(reconciledStagedCharacters.map(char => [char.id, char]));

    const finalCharactersList: Character[] = stagedInitialCharacterDefinitions.map(formDef => {
        const existingDetailedChar = formDef.id ? detailedCharMap.get(formDef.id) : reconciledStagedCharacters.find(sc => sc.name === formDef.name && !sc.id); // Match by name if no ID
        
        if (existingDetailedChar) {
            // Update existing character
            return {
                ...existingDetailedChar,
                name: formDef.name,
                details: formDef.details,
                // Ensure RPG fields consistency
                ...(newRPGMode ? {
                    level: existingDetailedChar.level || 1,
                    experience: existingDetailedChar.experience || 0,
                    characterClass: existingDetailedChar.characterClass || '',
                    stats: existingDetailedChar.stats || {},
                    inventory: existingDetailedChar.inventory || {},
                    skills: existingDetailedChar.skills || {},
                    spells: existingDetailedChar.spells || [],
                    techniques: existingDetailedChar.techniques || [],
                    passiveAbilities: existingDetailedChar.passiveAbilities || [],
                    strength: existingDetailedChar.strength ?? 10,
                    dexterity: existingDetailedChar.dexterity ?? 10,
                    constitution: existingDetailedChar.constitution ?? 10,
                    intelligence: existingDetailedChar.intelligence ?? 10,
                    wisdom: existingDetailedChar.wisdom ?? 10,
                    charisma: existingDetailedChar.charisma ?? 10,
                    hitPoints: existingDetailedChar.hitPoints ?? 10,
                    maxHitPoints: existingDetailedChar.maxHitPoints ?? 10,
                    armorClass: existingDetailedChar.armorClass ?? 10,
                } : { /* Null out RPG fields if mode is off */
                    level: undefined, experience: undefined, characterClass: undefined,
                    stats: undefined, inventory: undefined, skills: undefined,
                    spells: undefined, techniques: undefined, passiveAbilities: undefined,
                    strength: undefined, dexterity: undefined, constitution: undefined,
                    intelligence: undefined, wisdom: undefined, charisma: undefined,
                    hitPoints: undefined, maxHitPoints: undefined, armorClass: undefined,
                }),
            };
        } else {
            // New character defined in form
            const newId = formDef.id || `${formDef.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            return {
                id: newId,
                name: formDef.name,
                details: formDef.details,
                history: [], opinion: {}, portraitUrl: null, affinity: 50,
                relations: { [PLAYER_ID]: defaultRelation },
                ...(newRPGMode ? {
                    level: 1, experience: 0, characterClass: '', stats: {}, inventory: {}, skills: {},
                    spells: [], techniques: [], passiveAbilities: [], strength: 10, dexterity: 10,
                    constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
                    hitPoints: 10, maxHitPoints: 10, armorClass: 10,
                } : {}),
            };
        }
    });

    // Add characters from stagedCharacters that were not in stagedInitialCharacterDefinitions (e.g. dynamically added, not touched by form)
    // This ensures characters managed only by CharacterSidebar (e.g. dynamically added ones not in form) are preserved.
    stagedCharacters.forEach(sc => {
        if (!finalCharactersList.some(fc => fc.id === sc.id)) {
            finalCharactersList.push(sc);
        }
    });


    // 3. Apply reconciled characters to live state
    setCharacters(finalCharactersList);
    
    // 4. Update stagedCharacters to reflect the applied changes for consistency
    setStagedCharacters(finalCharactersList);

    // 5. Update stagedInitialCharacterDefinitions to match the newly applied/reconciled characters for AdventureForm's next render
    setStagedInitialCharacterDefinitions(finalCharactersList.map(c => ({ id: c.id, name: c.name, details: c.details })));


    // Reset narrative only if initial situation has changed
    if (stagedAdventureMainSettings.initialSituation !== adventureSettings.initialSituation) {
        setNarrative([{ id: `msg-${Date.now()}`, type: 'system', content: stagedAdventureMainSettings.initialSituation, timestamp: Date.now() }]);
    }
    
    setFormKey(prev => prev + 1); // Re-key AdventureForm to pick up new initial values

    toast({ title: "Modifications Enregistrées", description: "Les paramètres de l'aventure et des personnages ont été mis à jour." });
  };


   const handleNarrativeUpdate = (content: string, type: 'user' | 'ai', sceneDesc?: string) => {
       const newMessage: Message = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`, 
            type: type,
            content: content,
            timestamp: Date.now(),
            sceneDescription: type === 'ai' ? sceneDesc : undefined, 
       };
       setNarrative(prevNarrative => [...prevNarrative, newMessage]);
   };

   const handleNewCharacters = (newChars: Array<NewCharacterSchema>) => { 
        if (!newChars || newChars.length === 0) return;
        const defaultRelationDesc = currentLanguage === 'fr' ? "Inconnu" : "Unknown";

        setStagedCharacters(prevChars => { 
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
                            if (rel.targetName.toLowerCase() === (stagedAdventureMainSettings.playerName || "Player").toLowerCase()) { 
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
                        ...(stagedAdventureMainSettings.rpgMode && { 
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
                const newFullList = [...existingChars, ...charsToAdd];
                setTimeout(() => { 
                    toast({
                        title: "Nouveau Personnage Rencontré",
                        description: `${charsToAdd.map(c => c.name).join(', ')} a été ajouté à la liste des personnages. Enregistrez les modifications pour confirmer.`,
                    });
                }, 0);
                // Update stagedInitialCharacterDefinitions as well if new characters are added, so AdventureForm can see them if it's designed to list all.
                setStagedInitialCharacterDefinitions(newFullList.map(c => ({ id: c.id, name: c.name, details: c.details })));
                return newFullList;
            }
            return prevChars;
        });
    };

    const handleCharacterHistoryUpdate = (updates: CharacterUpdateSchema[]) => {
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
    };

    const handleAffinityUpdates = (updates: AffinityUpdateSchema[]) => {
        if (!updates || updates.length === 0) return;
        setStagedCharacters(prevChars => { 
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
                 setStagedInitialCharacterDefinitions(updatedChars.map(c => ({ id: c.id, name: c.name, details: c.details })));
                return updatedChars;
            }
            return prevChars;
        });
    };

     const handleRelationUpdate = (charId: string, targetId: string, newRelation: string) => {
        setStagedCharacters(prevChars => prevChars.map(char => { 
            if (char.id === charId) {
                const updatedRelations = { ...(char.relations || {}), [targetId]: newRelation };
                console.log(`Staged relation update: ${char.name}'s relation towards ${targetId} set to "${newRelation}"`);
                return { ...char, relations: updatedRelations };
            }
            return char;
        }));
        // No need to update stagedInitialCharacterDefinitions here as relations are not in FormCharacterDefinition
    };

    const handleRelationUpdatesFromAI = (updates: RelationUpdateSchema[]) => {
        if (!updates || updates.length === 0) return;
        console.log("Processing relation updates from AI for staged characters:", updates);
        const defaultRelationDesc = currentLanguage === 'fr' ? "Inconnu" : "Unknown";

        setStagedCharacters(prevChars => { 
            let chars = [...prevChars];
            let changed = false;

            updates.forEach(update => {
                const sourceCharIndex = chars.findIndex(c => c.name.toLowerCase() === update.characterName.toLowerCase());
                if (sourceCharIndex === -1) {
                    console.warn(`Relation update error: Source character "${update.characterName}" not found.`);
                    return;
                }

                let targetId: string | null = null;
                if (update.targetName.toLowerCase() === (stagedAdventureMainSettings.playerName || "Player").toLowerCase()) { 
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
            if (changed) {
                setStagedInitialCharacterDefinitions(chars.map(c => ({ id: c.id, name: c.name, details: c.details })));
                return chars;
            }
            return prevChars;
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
            // Find the last user message and the AI message before it to revert character state
            let lastUserIndex = -1;
            for (let i = prevNarrative.length - 1; i >= 0; i--) {
                if (prevNarrative[i].type === 'user') {
                    lastUserIndex = i;
                    break;
                }
            }

            if (lastUserIndex === -1 && prevNarrative.length > 1) { // No user message, but more than initial system message
                return prevNarrative.slice(0,1); // Keep only the first message
            } else if (lastUserIndex > 0) { // If there was a user message and it wasn't the first message
                 // Revert to the state before the last user action
                 // This is a simplification. True state reversion is complex.
                 // For now, we just remove messages.
                 // TODO: Consider a more robust state snapshot/revert mechanism if needed.
                const newNarrative = prevNarrative.slice(0, lastUserIndex);
                setTimeout(() => { 
                  toast({ title: "Dernier tour annulé" });
                }, 0);
                return newNarrative;

            } else if (prevNarrative.length > 1) { // Only one user message after system
                 const newNarrative = prevNarrative.slice(0, 1); // Keep only the system message
                 setTimeout(() => { 
                    toast({ title: "Dernier message annulé" });
                 }, 0);
                 return newNarrative;
            }
            
            setTimeout(() => { 
                toast({ title: "Annulation non applicable", description:"Aucune action utilisateur claire à annuler."});
            }, 0);
            return prevNarrative;
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
                 msg.type === 'user' ? `> ${adventureSettings.playerName || 'Player'}: ${msg.content}` : msg.content 
             ).join('\n\n') + `\n\n> ${adventureSettings.playerName || 'Player'}: ${lastUserAction}\n`;

         try {
             const input: GenerateAdventureInput = {
                 world: adventureSettings.world, 
                 initialSituation: narrativeContextForRegen,
                 characters: characters, 
                 userAction: lastUserAction,
                 currentLanguage: currentLanguage,
                 playerName: adventureSettings.playerName || "Player", 
                 promptConfig: adventureSettings.rpgMode ? { 
                    rpgContext: {
                        playerStats: { },
                        characterDetails: characters.map(c => ({ 
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
       setStagedCharacters(prev => prev.map(c => c.id === updatedCharacter.id ? updatedCharacter : c)); 
       console.log("Staged character updated:", updatedCharacter);
       // When a character is updated in CharacterSidebar, ensure stagedInitialCharacterDefinitions is also updated if it's one of the initial chars
       setStagedInitialCharacterDefinitions(prevDefs => prevDefs.map(def => 
           def.id === updatedCharacter.id ? { ...def, name: updatedCharacter.name, details: updatedCharacter.details } : def
       ));
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
                 setStagedCharacters(prev => prev.map(c => c.id === character.id ? { ...c, _lastSaved: Date.now() } as any : c));
                 setStagedInitialCharacterDefinitions(prevDefs => prevDefs.map(def => 
                    def.id === character.id ? { ...def, name: character.name, details: character.details } : def
                 ));

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
                setNarrative(loadedData.narrative as Message[]);
                setCurrentLanguage(loadedLang);

                // These will trigger the useEffect to update staged states and formKey
                setBaseAdventureSettings(loadedData.adventureSettings);
                setBaseCharacters(validatedCharacters);


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
        const initialSettings = {
            world: "Grande université populaire nommée \"hight scoole of futur\".",
            initialSituation: "Vous marchez dans les couloirs animés de Hight School of Future lorsque vous apercevez Rina, votre petite amie, en pleine conversation avec Kentaro, votre meilleur ami. Ils semblent étrangement proches, riant doucement. Un sentiment de malaise vous envahit.",
            rpgMode: false,
            playerName: "Player",
        };
        const initialChars = [
            {
                id: 'rina-1', name: "Rina",
                details: "jeune femme de 19 ans, votre petite amie. Elle se rapproche de Kentaro. Étudiante populaire, calme, aimante, parfois secrète. 165 cm, yeux marron, cheveux mi-longs bruns, traits fins, athlétique.",
                history: ["Ceci est un exemple d'historique pour Rina."], opinion: {}, affinity: 70,
                relations: { [PLAYER_ID]: "Petite amie", 'kentaro-1': "Ami" }
            },
            {
                id: 'kentaro-1', name: "Kentaro",
                details: "Jeune homme de 20 ans, votre meilleur ami. Étudiant populaire, charmant mais calculateur et impulsif. 185 cm, athlétique, yeux bleus, cheveux courts blonds. Aime draguer et voir son meilleur ami souffrir. Se rapproche de Rina.",
                history: ["Kentaro a été vu parlant à Rina."], opinion: {}, affinity: 60,
                relations: { [PLAYER_ID]: "Meilleur ami", 'rina-1': "Ami" }
            }
        ];

        // Apply to live state
        setAdventureSettings(initialSettings);
        setCharacters(initialChars);
        setNarrative([{ id: `msg-${Date.now()}`, type: 'system', content: initialSettings.initialSituation, timestamp: Date.now() }]);
        
        // Also reset base states for future "Restart" operations if save/load wasn't used
        setBaseAdventureSettings(initialSettings);
        setBaseCharacters(initialChars);

        // These will trigger useEffect to update staged states and formKey
        // Staged states will be updated by the useEffect that watches adventureSettings and characters

        setShowRestartConfirm(false);
        setTimeout(() => {
            toast({ title: "Aventure Recommencée", description: "L'histoire a été réinitialisée à son état initial." });
        }, 0);
    };

  // --- Render ---
  return (
    <>
      <PageStructure
        adventureSettings={adventureSettings} 
        characters={characters} 
        stagedAdventureSettings={{...stagedAdventureMainSettings, characters: stagedInitialCharacterDefinitions}} // Pass combined staged settings for AdventureForm
        stagedCharacters={stagedCharacters} // Pass staged characters for CharacterSidebar
        formKey={formKey} 
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

// Helper type for AdventureForm props
export type AdventureFormValues = Omit<AdventureSettings, 'rpgMode' | 'characters'> & {
  characters: FormCharacterDefinition[]; // Use FormCharacterDefinition
  enableRpgMode?: boolean;
};
