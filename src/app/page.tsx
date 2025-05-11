
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

  // "Live" state of the adventure, used by AI and AdventureDisplay
  const [adventureSettings, setAdventureSettings] = React.useState<AdventureSettings>(() => JSON.parse(JSON.stringify(baseAdventureSettings)));
  const [characters, setCharacters] = React.useState<Character[]>(() => JSON.parse(JSON.stringify(baseCharacters)));

  // "Staged" state for the configuration panel (AdventureForm and CharacterSidebar)
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
    setAdventureSettings(JSON.parse(JSON.stringify(baseAdventureSettings)));
    setCharacters(JSON.parse(JSON.stringify(baseCharacters)));
    setNarrative([{ id: `msg-${Date.now()}`, type: 'system', content: baseAdventureSettings.initialSituation, timestamp: Date.now() }]);
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
        playerName: newSettingsFromForm.playerName || "Player",
        currencyName: newSettingsFromForm.currencyName,
    }));

    setStagedCharacters(prevStagedChars => {
      const defaultRelation = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
      const newRPGMode = newSettingsFromForm.enableRpgMode ?? false;
      
      let updatedCharsList: Character[] = newSettingsFromForm.characters.map(formDef => {
        const existingChar = formDef.id 
            ? prevStagedChars.find(sc => sc.id === formDef.id)
            // Find by name if ID is not present and it's not an already ID'd character with the same name
            : prevStagedChars.find(sc => sc.name === formDef.name && !prevStagedChars.some(otherSc => otherSc.id === sc.id && otherSc.id !== formDef.id && !formDef.id));

        if (existingChar) {
          return {
            ...existingChar,
            name: formDef.name,
            details: formDef.details,
            // Apply RPG mode changes
            ...(newRPGMode ? {
                level: existingChar.level || 1, experience: existingChar.experience || 0, characterClass: existingChar.characterClass || '',
                stats: existingChar.stats || {}, inventory: existingChar.inventory || {}, skills: existingChar.skills || {},
                spells: existingChar.spells || [], techniques: existingChar.techniques || [], passiveAbilities: existingChar.passiveAbilities || [],
                strength: existingChar.strength ?? 10, dexterity: existingChar.dexterity ?? 10, constitution: existingChar.constitution ?? 10,
                intelligence: existingChar.intelligence ?? 10, wisdom: existingChar.wisdom ?? 10, charisma: existingChar.charisma ?? 10,
                hitPoints: existingChar.hitPoints ?? 10, maxHitPoints: existingChar.maxHitPoints ?? 10, armorClass: existingChar.armorClass ?? 10,
            } : { // Clear RPG fields if mode is off
                level: undefined, experience: undefined, characterClass: undefined, stats: undefined, inventory: undefined, skills: undefined,
                spells: undefined, techniques: undefined, passiveAbilities: undefined, strength: undefined, dexterity: undefined,
                constitution: undefined, intelligence: undefined, wisdom: undefined, charisma: undefined,
                hitPoints: undefined, maxHitPoints: undefined, armorClass: undefined,
             }),
          };
        } else {
          // New character from AdventureForm
          const newId = formDef.id || `${formDef.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          return {
            id: newId, name: formDef.name, details: formDef.details,
            history: [], opinion: {}, portraitUrl: null, affinity: 50,
            relations: { [PLAYER_ID]: defaultRelation }, // Initialize relations for player
             ...(newRPGMode ? { // Add default RPG fields if mode is on
                level: 1, experience: 0, characterClass: '', stats: {}, inventory: {}, skills: {},
                spells: [], techniques: [], passiveAbilities: [], strength: 10, dexterity: 10,
                constitution: 10, intelligence: 10, wisdom: 10, charisma: 10, hitPoints: 10, maxHitPoints: 10, armorClass: 10,
            } : {}),
          };
        }
      });
      
      // Ensure all characters have relations defined for each other and player
      updatedCharsList.forEach(char => {
        char.relations = char.relations || {};
        if (!char.relations[PLAYER_ID]) { 
            char.relations[PLAYER_ID] = defaultRelation;
        }
        updatedCharsList.forEach(otherChar => { // Ensure relations between NPCs
            if (char.id !== otherChar.id) {
                if (!char.relations![otherChar.id]) { // char.relations guaranteed to exist by previous line
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
    setAdventureSettings(JSON.parse(JSON.stringify(stagedAdventureSettings)));
    setCharacters(JSON.parse(JSON.stringify(stagedCharacters)));

    // If initial situation changed via form, reset narrative to this new situation
    if (stagedAdventureSettings.initialSituation !== currentLiveAdventureSettings.initialSituation) {
        setNarrative([{ id: `msg-${Date.now()}`, type: 'system', content: stagedAdventureSettings.initialSituation, timestamp: Date.now() }]);
    }
    React.startTransition(() => {
        toast({ title: "Modifications Enregistrées", description: "Les paramètres de l'aventure et des personnages ont été mis à jour." });
    });
  }, [stagedAdventureSettings, stagedCharacters, toast, adventureSettings]); // adventureSettings needed for initialSituation comparison


   const handleNarrativeUpdate = React.useCallback((content: string, type: 'user' | 'ai', sceneDesc?: string) => {
       const newMessage: Message = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            type: type,
            content: content,
            timestamp: Date.now(),
            sceneDescription: type === 'ai' ? sceneDesc : undefined, // Only add sceneDesc for AI messages
       };
       setNarrative(prevNarrative => [...prevNarrative, newMessage]);
   }, []);

   const handleNewCharacters = React.useCallback((newChars: Array<NewCharacterSchema>) => {
        if (!newChars || newChars.length === 0) return;
        
        const defaultRelationDesc = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
        let addedCharacterNames: string[] = [];

        setStagedCharacters(prevChars => {
            const currentNames = new Set(prevChars.map(c => c.name.toLowerCase()));
            const charsToAdd: Character[] = [];
            // Create a deep copy of prevChars to modify relations of existing characters correctly
            let existingCharsCopy = JSON.parse(JSON.stringify(prevChars)); 

            newChars.forEach(newCharData => {
                if (!currentNames.has(newCharData.name.toLowerCase())) {
                    const newId = `${newCharData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                    const processedRelations: Record<string, string> = {};

                    // Process initial relations provided by AI for the new character
                    if (newCharData.initialRelations && Array.isArray(newCharData.initialRelations)) {
                        newCharData.initialRelations.forEach(rel => {
                            const relationDescription = rel.description || defaultRelationDesc;
                            // Target is player
                            if (rel.targetName.toLowerCase() === (stagedAdventureSettings.playerName || "Player").toLowerCase()) {
                                processedRelations[PLAYER_ID] = relationDescription;
                            } else { // Target is another NPC
                                const targetChar = existingCharsCopy.find((ec: Character) => ec.name.toLowerCase() === rel.targetName.toLowerCase());
                                if (targetChar) {
                                    processedRelations[targetChar.id] = relationDescription;
                                }
                                // If targetNPC not found, AI might be hallucinating or it's a new char not yet in existingCharsCopy
                            }
                        });
                    }
                    // Ensure relation to player is set
                    if (!processedRelations[PLAYER_ID] || processedRelations[PLAYER_ID].trim() === "" || processedRelations[PLAYER_ID].toLowerCase() === "inconnu" || processedRelations[PLAYER_ID].toLowerCase() === "unknown") {
                        processedRelations[PLAYER_ID] = defaultRelationDesc;
                    }
                    // Ensure relations to all other existing NPCs are initialized for the new character
                    existingCharsCopy.forEach((ec: Character) => {
                        if (!processedRelations[ec.id] || processedRelations[ec.id].trim() === "" || processedRelations[ec.id].toLowerCase() === "inconnu" || processedRelations[ec.id].toLowerCase() === "unknown") {
                             processedRelations[ec.id] = defaultRelationDesc; // New char's relation to existing char
                        }
                         // Also update existing characters to have a relation to the new character
                         if (!ec.relations) ec.relations = {};
                         if(!ec.relations[newId] || ec.relations[newId].trim() === "" || ec.relations[newId].toLowerCase() === "inconnu" || ec.relations[newId].toLowerCase() === "unknown") {
                            ec.relations[newId] = defaultRelationDesc; // Existing char's relation to new char
                         }
                    });

                    const characterToAdd: Character = {
                        id: newId, name: newCharData.name,
                        details: newCharData.details || (currentLanguage === 'fr' ? "Rencontré récemment." : "Recently met."),
                        history: newCharData.initialHistoryEntry ? [newCharData.initialHistoryEntry] : [`Rencontré le ${new Date().toLocaleString()}`],
                        opinion: {}, portraitUrl: null, affinity: 50, relations: processedRelations,
                        ...(stagedAdventureSettings.rpgMode && { // Add default RPG fields if mode is on
                            level: 1, experience: 0, characterClass: '', stats: {}, inventory: {}, skills: {},
                            spells: [], techniques: [], passiveAbilities: [], strength: 10, dexterity: 10,
                            constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
                            hitPoints: 10, maxHitPoints: 10, armorClass: 10,
                        })
                    };
                    charsToAdd.push(characterToAdd);
                    addedCharacterNames.push(characterToAdd.name); // Store name for toast
                    currentNames.add(newCharData.name.toLowerCase()); // Add to set to prevent duplicate adds in same batch
                    // Update the relations for already processed existing characters in this batch
                    existingCharsCopy = existingCharsCopy.map((ec: Character) => ({
                        ...ec,
                        relations: {
                            ...(ec.relations || {}),
                            [newId]: ec.relations?.[newId] || defaultRelationDesc, // Ensure existing char has relation to new one
                        }
                    }));
                }
            });

            if (charsToAdd.length > 0) return [...existingCharsCopy, ...charsToAdd];
            return prevChars; // Return original if no changes to avoid unnecessary re-render
        });

        if (addedCharacterNames.length > 0) {
            React.startTransition(() => {
              toast({
                  title: "Nouveau Personnage Rencontré",
                  description: `${addedCharacterNames.join(', ')} a été ajouté à la liste des personnages. N'oubliez pas d'enregistrer les modifications pour appliquer.`,
              });
            });
        }
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
        
        const toastsToShow: Array<{title: string, description: string}> = [];

        setStagedCharacters(prevChars => {
             let changed = false;
            const updatedChars = prevChars.map(char => {
                const affinityUpdate = updates.find(u => u.characterName.toLowerCase() === char.name.toLowerCase());
                if (affinityUpdate) {
                    changed = true;
                    const currentAffinity = char.affinity ?? 50;
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
                toastsToShow.forEach(toastContent => toast(toastContent));
            });
        }
    }, [toast]);

     // Handles manual relation updates from CharacterSidebar
     const handleRelationUpdate = React.useCallback((charId: string, targetId: string, newRelation: string) => {
        setStagedCharacters(prevChars => prevChars.map(char => {
            if (char.id === charId) {
                const updatedRelations = { ...(char.relations || {}), [targetId]: newRelation };
                return { ...char, relations: updatedRelations };
            }
            return char;
        }));
    }, []);

    // Handles relation updates suggested by the AI
    const handleRelationUpdatesFromAI = React.useCallback((updates: RelationUpdateSchema[]) => {
        if (!updates || updates.length === 0) return;

        const defaultRelationDesc = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
        const toastsToShow: Array<{title: string, description: string}> = [];

        setStagedCharacters(prevChars => {
            let charsCopy = JSON.parse(JSON.stringify(prevChars)); // Deep copy
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
                    else return; // Target NPC not found
                }
                if (!targetId) return; // Should not happen if logic above is correct

                const currentRelation = charsCopy[sourceCharIndex].relations?.[targetId] || defaultRelationDesc;
                // Ensure AI's new relation is not empty or "Unknown" if a more specific default exists
                const newRelationFromAI = update.newRelation.trim() === "" || update.newRelation.toLowerCase() === "inconnu" || update.newRelation.toLowerCase() === "unknown" ? defaultRelationDesc : update.newRelation;

                if (currentRelation !== newRelationFromAI) {
                    const sourceChar = { ...charsCopy[sourceCharIndex] }; // Shallow copy of the specific character
                    sourceChar.relations = { ...(sourceChar.relations || {}), [targetId]: newRelationFromAI };
                    charsCopy[sourceCharIndex] = sourceChar; // Update in the copied array
                    changed = true;
                    toastsToShow.push({
                        title: `Relation Changée: ${update.characterName}`,
                        description: `Relation envers ${update.targetName} est maintenant "${newRelationFromAI}". Raison: ${update.reason || 'Événement narratif'}`,
                    });
                }
            });
            if (changed) return charsCopy; // Return the modified copy
            return prevChars; // Return original if no changes
        });

        if (toastsToShow.length > 0) {
            React.startTransition(() => {
                toastsToShow.forEach(toastContent => toast(toastContent));
            });
        }
    }, [currentLanguage, stagedAdventureSettings.playerName, toast]);


   const handleEditMessage = React.useCallback((messageId: string, newContent: string) => {
       setNarrative(prev => prev.map(msg =>
           msg.id === messageId ? { ...msg, content: newContent, timestamp: Date.now() } : msg
       ));
       React.startTransition(() => { toast({ title: "Message Modifié" }); });
   }, [toast]);

    const handleUndoLastMessage = React.useCallback(() => {
        let messageForToast: { title: string, description?: string, variant?: 'default' | 'destructive' } | null = null;

        setNarrative(prevNarrative => {
            if (prevNarrative.length <= 1) { // Cannot undo the very first system message
                 messageForToast = { title: "Impossible d'annuler", description: "Aucun message à annuler.", variant: "destructive" };
                 return prevNarrative;
            }

            // Try to find the last user action. If found, remove it and all subsequent AI responses.
            let lastUserIndex = -1;
            for (let i = prevNarrative.length - 1; i >= 0; i--) {
                if (prevNarrative[i].type === 'user') {
                    lastUserIndex = i;
                    break;
                }
            }

            if (lastUserIndex !== -1) { // Found a user message
                // Check if it's not the initial system message that we are trying to remove the user message before.
                if (lastUserIndex > 0) { // Ensure we don't remove the initial system message by slicing to an index < 1
                    const newNarrative = prevNarrative.slice(0, lastUserIndex);
                    messageForToast = { title: "Dernier tour annulé" };
                    return newNarrative;
                } else if (prevNarrative.length > 1) { // User message was the second message (after system), revert to only system message
                     const newNarrative = prevNarrative.slice(0, 1); // Keep only the first (system) message
                     messageForToast = { title: "Dernier message annulé" };
                     return newNarrative;
                }
            } else if (prevNarrative.length > 1) { // No user messages found, but more than one message (e.g. multiple AI/system messages after initial)
                 // This case should be rare if user interaction is required for AI responses, but as a fallback, revert to initial message.
                 const newNarrative = prevNarrative.slice(0, 1); // Keep only the first (system) message
                 messageForToast = { title: "Dernier message annulé" };
                 return newNarrative;
            }
            
            // If no clear action to undo or already at initial state
            messageForToast = { title: "Annulation non applicable", description:"Aucune action utilisateur claire à annuler ou déjà à l'état initial."};
            return prevNarrative;
        });

        if (messageForToast) {
            // Toast is called outside setNarrative updater.
            // useToast's internal dispatch uses startTransition, so this is fine.
            toast(messageForToast);
        }
    }, [setNarrative, toast]);


    const handleRegenerateLastResponse = React.useCallback(async () => {
         if (isRegenerating) return; // Prevent multiple regenerations

         let lastAiMessage: Message | undefined;
         let lastUserAction: string | undefined;
         let contextMessages: Message[] = []; // Messages before the last user action for context
         let lastAiIndex = -1; // Index of the AI message to replace

         // Work on a copy of the narrative state from props for consistency
         const currentNarrative = [...narrative]; // Use the 'narrative' state directly
         // Iterate backwards to find the last AI message and the user action that preceded it
         for (let i = currentNarrative.length - 1; i >= 0; i--) {
             const message = currentNarrative[i];
             if (message.type === 'ai' && !lastAiMessage) {
                 lastAiMessage = message;
                 lastAiIndex = i;
             } else if (message.type === 'user' && lastAiMessage) { // Found user message *before* the last AI message
                 lastUserAction = message.content;
                 // Define context as messages leading up to THIS user action
                 const contextEndIndex = i; // Index of the user message
                 // Take a few messages before the user action as context (e.g., last 4 + this user message)
                 contextMessages = currentNarrative.slice(Math.max(0, contextEndIndex - 4), contextEndIndex); // Messages *before* this user action
                 break;
             }
         }

         if (!lastAiMessage || !lastUserAction) {
             React.startTransition(() => { toast({ title: "Impossible de régénérer", description: "Aucune réponse IA précédente valide trouvée pour régénérer.", variant: "destructive" }); });
             return;
         }

         setIsRegenerating(true);
         React.startTransition(() => { toast({ title: "Régénération en cours...", description: "Génération d'une nouvelle réponse." }); });
        
         // Construct the narrative context for regeneration carefully
         // It should be the state of the story *before* the user's last action that led to the AI response we're regenerating.
         const narrativeContextForRegen = contextMessages.map(msg =>
                 msg.type === 'user' ? `> ${adventureSettings.playerName || 'Player'}: ${msg.content}` : msg.content
             ).join('\n\n') + `\n\n> ${adventureSettings.playerName || 'Player'}: ${lastUserAction}\n`; // Append the user action that led to the response being regenerated

         try {
             const input: GenerateAdventureInput = {
                 world: adventureSettings.world, // Use current live settings
                 initialSituation: narrativeContextForRegen, // The situation leading to the user's action
                 characters: characters, // Use current live characters
                 userAction: lastUserAction, // The user's action we are re-evaluating
                 currentLanguage: currentLanguage,
                 playerName: adventureSettings.playerName || "Player",
                 promptConfig: adventureSettings.rpgMode ? {
                    rpgContext: {
                        playerStats: { /* TODO: Actual player stats if implemented */ },
                        // Send full character details for RPG context
                        characterDetails: characters.map(c => ({ 
                             name: c.name,
                             details: c.details,
                             stats: c.stats,
                             inventory: c.inventory,
                             // Resolve relation names for context
                             relations: c.relations ? Object.entries(c.relations).map(([id, desc]) => {
                                 const relatedChar = characters.find(char => char.id === id); // Find in current live characters
                                 const targetName = relatedChar ? relatedChar.name : (id === PLAYER_ID ? (adventureSettings.playerName || 'Player') : 'Unknown');
                                 return `${targetName}: ${desc}`;
                             }).join(', ') : (currentLanguage === 'fr' ? 'Aucune' : 'None'),
                        })),
                        mode: 'exploration', // TODO: Reflect current game mode if dynamic
                    }
                 } : undefined,
             };

             const result = await generateAdventure(input);

             // Update the narrative: replace the old AI message with the new one
             setNarrative(prev => {
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
            
             // Handle side effects: new characters, history, affinity, relations (these update staged state)
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
     }, [isRegenerating, narrative, adventureSettings, characters, currentLanguage, toast, handleNewCharacters, handleCharacterHistoryUpdate, handleAffinityUpdates, handleRelationUpdatesFromAI, generateAdventure]); // Ensure all dependencies are listed


   const handleCharacterUpdate = React.useCallback((updatedCharacter: Character) => {
       // This updates the stagedCharacters state
       setStagedCharacters(prev => prev.map(c => c.id === updatedCharacter.id ? updatedCharacter : c));
   }, []);

    // Saves a character from the STAGED list to global localStorage
    const handleSaveNewCharacter = React.useCallback((character: Character) => {
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
                 React.startTransition(() => { toast({ title: "Personnage Sauvegardé", description: `${character.name} est maintenant disponible globalement.` }); });
                 // Mark character as saved in staged state for UI feedback (e.g., remove "New" badge)
                 setStagedCharacters(prev => prev.map(c => c.id === character.id ? { ...c, _lastSaved: Date.now() } as any : c));

            } catch (error) {
                 console.error("Failed to save character to localStorage:", error);
                 React.startTransition(() => { toast({ title: "Erreur de Sauvegarde", description: "Impossible de sauvegarder le personnage globalement.", variant: "destructive" }); });
            }
        } else {
            // This case should ideally not be reached if button is disabled or not shown on server
            React.startTransition(() => { toast({ title: "Erreur", description: "La sauvegarde globale n'est disponible que côté client.", variant: "destructive" }); });
        }
    }, [toast]);


    // Adds a character from global localStorage to the STAGED list for the current adventure
    const handleAddStagedCharacter = React.useCallback((globalCharToAdd: Character) => {
        let characterWasAdded = false;
        let characterNameForToast = globalCharToAdd.name; // Store name before potential modification
    
        setStagedCharacters(prevStagedChars => {
            // Check if character (by ID or name) already exists in staged characters
            if (prevStagedChars.some(sc => sc.id === globalCharToAdd.id || sc.name.toLowerCase() === globalCharToAdd.name.toLowerCase())) {
                characterWasAdded = false; // Already exists, don't add
                return prevStagedChars;
            }
    
            characterWasAdded = true;
            const defaultRelation = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
            const newChar = { ...globalCharToAdd }; // Clone to avoid mutating global state
    
            // Initialize relations for the new character being added
            newChar.relations = newChar.relations || {};
            // Relation to player
            if (!newChar.relations[PLAYER_ID]) {
                newChar.relations[PLAYER_ID] = defaultRelation;
            }
            // Relations to other currently staged NPCs
            prevStagedChars.forEach(existingChar => {
                if (!newChar.relations![existingChar.id]) { // newChar.relations is guaranteed to exist
                    newChar.relations![existingChar.id] = defaultRelation;
                }
            });
    
            // Update existing staged characters to have a relation to the new character
            const updatedPrevChars = prevStagedChars.map(existingChar => {
                const updatedRelations = { ...(existingChar.relations || {}), [newChar.id]: defaultRelation };
                return { ...existingChar, relations: updatedRelations };
            });
            
            // Ensure RPG fields if RPG mode is active for the adventure
            if (stagedAdventureSettings.rpgMode) { // Check stagedAdventureSettings.rpgMode
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
                newChar.hitPoints = newChar.hitPoints ?? 10;
                newChar.maxHitPoints = newChar.maxHitPoints ?? 10;
                newChar.armorClass = newChar.armorClass ?? 10;
            }
            return [...updatedPrevChars, newChar];
        });
    
        // Call toast outside and after setStagedCharacters updater
        if (characterWasAdded) {
            React.startTransition(() => {
                toast({ title: "Personnage Ajouté", description: `${characterNameForToast} a été ajouté aux personnages de l'aventure. N'oubliez pas d'enregistrer les modifications.` });
            });
        } else {
            React.startTransition(() => {
                toast({ title: "Personnage déjà présent", description: `${characterNameForToast} est déjà dans l'aventure.`, variant: "default" });
            });
        }
    }, [currentLanguage, toast, stagedAdventureSettings.rpgMode]); // stagedAdventureSettings.rpgMode is a dependency


   const handleSave = React.useCallback(() => {
        // Save "live" state (adventureSettings, characters, narrative)
        const charactersToSave = characters.map(({ ...char }) => char); // Simple clone, consider deep clone if complex objects are nested
        const saveData: SaveData = {
            adventureSettings, // Already a deep copy if set via JSON.parse(JSON.stringify(...))
            characters: charactersToSave, // Live characters
            narrative, // Live narrative
            currentLanguage,
            saveFormatVersion: 1.6, // Bump this version when format changes significantly
            timestamp: new Date().toISOString(),
        };
        const jsonString = JSON.stringify(saveData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aventurier_textuel_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a); // Required for Firefox
        a.click();
        document.body.removeChild(a); // Clean up
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

                // Validate core structure
                if (!loadedData.adventureSettings || !loadedData.characters || !loadedData.narrative || !Array.isArray(loadedData.narrative)) {
                    throw new Error("Structure de fichier de sauvegarde invalide ou manquante.");
                }
                // Validate narrative messages structure (basic check)
                const isValidNarrative = loadedData.narrative.every(msg =>
                    typeof msg === 'object' && msg !== null && typeof msg.id === 'string' &&
                    ['user', 'ai', 'system'].includes(msg.type) && typeof msg.content === 'string' &&
                    typeof msg.timestamp === 'number'
                );
                if (!isValidNarrative) {
                    // Attempt migration for old string narrative format
                    if (typeof loadedData.narrative === 'string') { // Very old format
                        loadedData.narrative = [{ id: `migrated-${Date.now()}`, type: 'system', content: loadedData.narrative as unknown as string, timestamp: Date.now() }];
                    } else throw new Error("Structure des messages narratifs invalide.");
                }

                 // Data migration for older save formats
                 if (loadedData.saveFormatVersion === undefined || loadedData.saveFormatVersion < 1.4) {
                     // Older versions might not have history, opinion, affinity, relations, or playerName
                     loadedData.characters = loadedData.characters.map(c => ({ ...c, history: Array.isArray(c.history) ? c.history : [], opinion: typeof c.opinion === 'object' && c.opinion !== null ? c.opinion : {}, affinity: c.affinity ?? 50, relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                     loadedData.adventureSettings.playerName = loadedData.adventureSettings.playerName || "Player";
                 }
                 if (loadedData.saveFormatVersion < 1.5) { // Before explicit PLAYER_ID relation
                       loadedData.characters = loadedData.characters.map(c => ({ ...c, relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                 }
                  if (loadedData.saveFormatVersion < 1.6) { // Relations might be null instead of object
                       loadedData.characters = loadedData.characters.map(c => ({ ...c, relations: typeof c.relations === 'object' && c.relations !== null ? c.relations : { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                 }


                // Set base state first, which will trigger useEffect to update live and staged states
                // This ensures that if a restart happens, it restarts to the loaded state.
                const rpgModeActive = loadedData.adventureSettings.rpgMode;
                const loadedLang = loadedData.currentLanguage || "fr";
                const defaultRelation = loadedLang === 'fr' ? "Inconnu" : "Unknown";

                const validatedCharacters = loadedData.characters.map((c: any) => {
                    const charId = c.id || `${c.name?.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                    let relations = typeof c.relations === 'object' && c.relations !== null ? c.relations : { [PLAYER_ID]: defaultRelation };
                    if (!relations[PLAYER_ID]) relations[PLAYER_ID] = defaultRelation; // Ensure player relation
                    // TODO: Could also iterate and ensure inter-NPC relations are initialized if missing.
                    
                    return { // Explicitly map to Character type
                        id: charId,
                        name: c.name || "Inconnu", details: c.details || "", history: Array.isArray(c.history) ? c.history : [], 
                        opinion: typeof c.opinion === 'object' && c.opinion !== null ? c.opinion : {},
                        portraitUrl: c.portraitUrl || null, affinity: c.affinity ?? 50, relations: relations,
                        _lastSaved: c._lastSaved, // Preserve if it exists
                        ...(rpgModeActive && { // Add RPG fields if mode is active in loaded data
                            level: c.level ?? 1, experience: c.experience ?? 0, characterClass: c.characterClass ?? '',
                            stats: typeof c.stats === 'object' && c.stats !== null ? c.stats : {}, 
                            inventory: typeof c.inventory === 'object' && c.inventory !== null ? c.inventory : {}, 
                            skills: typeof c.skills === 'object' && c.skills !== null ? c.skills : {},
                            spells: Array.isArray(c.spells) ? c.spells : [], 
                            techniques: Array.isArray(c.techniques) ? c.techniques : [], 
                            passiveAbilities: Array.isArray(c.passiveAbilities) ? c.passiveAbilities : [],
                            strength: c.strength ?? 10, dexterity: c.dexterity ?? 10, constitution: c.constitution ?? 10,
                            intelligence: c.intelligence ?? 10, wisdom: c.wisdom ?? 10, charisma: c.charisma ?? 10,
                            hitPoints: c.hitPoints ?? 10, maxHitPoints: c.maxHitPoints ?? 10, armorClass: c.armorClass ?? 10,
                        }),
                    }
                });
                setBaseAdventureSettings(JSON.parse(JSON.stringify(loadedData.adventureSettings)));
                setBaseCharacters(JSON.parse(JSON.stringify(validatedCharacters)));
                // Live state will be updated by useEffect listening to baseAdventureSettings, baseCharacters
                setNarrative(loadedData.narrative as Message[]); // Directly set narrative and language
                setCurrentLanguage(loadedLang);

                React.startTransition(() => { toast({ title: "Aventure Chargée", description: "L'état de l'aventure a été restauré." }); });
            } catch (error: any) {
                console.error("Error loading adventure:", error);
                React.startTransition(() => { toast({ title: "Erreur de Chargement", description: `Impossible de lire le fichier JSON: ${error.message}`, variant: "destructive" }); });
            }
        };
        reader.readAsText(file);
        if(event.target) event.target.value = ''; // Reset file input to allow reloading same file
    }, [toast]);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const confirmRestartAdventure = React.useCallback(() => {
        // Reset live state to base state
        setAdventureSettings(JSON.parse(JSON.stringify(baseAdventureSettings)));
        setCharacters(JSON.parse(JSON.stringify(baseCharacters)));
        setNarrative([{ id: `msg-${Date.now()}`, type: 'system', content: baseAdventureSettings.initialSituation, timestamp: Date.now() }]);
        // Staged state will be updated by useEffect listening to adventureSettings and characters
        setShowRestartConfirm(false); // Close dialog
        React.startTransition(() => { toast({ title: "Aventure Recommencée", description: "L'histoire a été réinitialisée à son état initial." }); });
    }, [baseAdventureSettings, baseCharacters, toast]);

  // Memoize the object passed to AdventureForm to prevent unnecessary re-renders if only its internal structure changes but references remain same
  const memoizedStagedAdventureSettingsForForm = React.useMemo(() => {
    return {
      world: stagedAdventureSettings.world,
      initialSituation: stagedAdventureSettings.initialSituation,
      playerName: stagedAdventureSettings.playerName,
      currencyName: stagedAdventureSettings.currencyName,
      enableRpgMode: stagedAdventureSettings.rpgMode,
      characters: stagedCharacters.map(c => ({ id: c.id, name: c.name, details: c.details })), // Only pass necessary fields
    };
  }, [stagedAdventureSettings, stagedCharacters]); // Dependencies: stagedAdventureSettings and stagedCharacters

  return (
    <>
      <PageStructure
        adventureSettings={adventureSettings} // Live state for display and AI
        characters={characters} // Live state for display and AI
        stagedAdventureSettings={memoizedStagedAdventureSettingsForForm} // Staged for AdventureForm
        stagedCharacters={stagedCharacters} // Staged for CharacterSidebar
        propKey={formKey} // Key to re-initialize AdventureForm
        handleApplyStagedChanges={handleApplyStagedChanges}
        narrativeMessages={narrative}
        currentLanguage={currentLanguage}
        fileInputRef={fileInputRef}
        handleSettingsUpdate={handleSettingsUpdate} // Updates staged state
        handleCharacterUpdate={handleCharacterUpdate} // Updates staged characters
        handleNewCharacters={handleNewCharacters} // Updates staged characters
        handleCharacterHistoryUpdate={handleCharacterHistoryUpdate} // Updates staged characters
        handleAffinityUpdates={handleAffinityUpdates} // Updates staged characters
        handleRelationUpdate={handleRelationUpdate} // Updates staged characters
        handleRelationUpdatesFromAI={handleRelationUpdatesFromAI} // Updates staged characters
        handleSaveNewCharacter={handleSaveNewCharacter} // Saves staged character globally
        handleAddStagedCharacter={handleAddStagedCharacter} // Adds a global character to staged characters
        handleNarrativeUpdate={handleNarrativeUpdate} // Updates live narrative
        handleSave={handleSave} // Saves live state
        handleLoad={handleLoad} // Loads into base and live state
        setCurrentLanguage={setCurrentLanguage} // Updates live language
        translateTextAction={translateText}
        generateAdventureAction={generateAdventure}
        generateSceneImageAction={generateSceneImage}
        handleEditMessage={handleEditMessage}
        handleRegenerateLastResponse={handleRegenerateLastResponse}
        handleUndoLastMessage={handleUndoLastMessage}
        playerId={PLAYER_ID}
        playerName={adventureSettings.playerName || "Player"} // Live player name for display/AI
        onRestartAdventure={() => setShowRestartConfirm(true)} // Opens confirm dialog
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

