
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
  // This state is mutated by callbacks from AdventureForm and CharacterSidebar, then applied to "live" state by handleApplyStagedChanges
  const [stagedAdventureSettings, setStagedAdventureSettings] = React.useState<AdventureSettings>(() => JSON.parse(JSON.stringify(baseAdventureSettings)));
  const [stagedCharacters, setStagedCharacters] = React.useState<Character[]>(() => JSON.parse(JSON.stringify(baseCharacters)));

  const [formKey, setFormKey] = React.useState(0); // Used as React key for AdventureForm to trigger re-initialization

  const [narrative, setNarrative] = React.useState<Message[]>([
     { id: `msg-${Date.now()}`, type: 'system', content: baseAdventureSettings.initialSituation, timestamp: Date.now() }
  ]);
  const [currentLanguage, setCurrentLanguage] = React.useState<string>("fr");
  const [isRegenerating, setIsRegenerating] = React.useState<boolean>(false);
  const [showRestartConfirm, setShowRestartConfirm] = React.useState<boolean>(false);

  const { toast } = useToast();

  // Effect to re-initialize staged state when base state changes (e.g. after load or restart)
  // This ensures the form and sidebar reflect the new base state.
  React.useEffect(() => {
    setStagedAdventureSettings(JSON.parse(JSON.stringify(baseAdventureSettings)));
    setStagedCharacters(JSON.parse(JSON.stringify(baseCharacters)));
    setFormKey(prev => prev + 1); // Re-key AdventureForm to re-initialize with new staged values
  }, [baseAdventureSettings, baseCharacters]);


  const handleSettingsUpdate = React.useCallback((newSettingsFromForm: AdventureFormValues) => {
    // This function is called by AdventureForm when its internal state changes.
    // It updates the *staged* adventure settings and *staged* characters.
    setStagedAdventureSettings(prevSettings => ({
        ...prevSettings,
        world: newSettingsFromForm.world,
        initialSituation: newSettingsFromForm.initialSituation,
        rpgMode: newSettingsFromForm.enableRpgMode ?? false,
        playerName: newSettingsFromForm.playerName || "Player",
        currencyName: newSettingsFromForm.currencyName,
    }));

    // Update staged characters based on the form's character definitions (name and details only)
    // Preserve other character properties (history, affinity, full relations, RPG stats) from existing staged characters.
    setStagedCharacters(prevStagedChars => {
      const defaultRelation = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
      const newRPGMode = newSettingsFromForm.enableRpgMode ?? false;
      
      // Create a list of characters based on the form definitions.
      // If a character from the form matches an existing staged character by ID (or name if ID is missing), update it.
      // Otherwise, create a new character structure.
      let updatedCharsList: Character[] = newSettingsFromForm.characters.map(formDef => {
        const existingChar = formDef.id 
            ? prevStagedChars.find(sc => sc.id === formDef.id)
            // Fallback to name matching if ID is not present (e.g., for newly added characters in the form not yet having an ID)
            // Ensure we don't accidentally match a different character if names are not unique and IDs are missing.
            : prevStagedChars.find(sc => sc.name === formDef.name && !prevStagedChars.some(otherSc => otherSc.id === sc.id && otherSc.id !== formDef.id && !formDef.id));


        if (existingChar) {
          // Update existing character's name and details from form
          // Preserve other properties like history, affinity, full relations, RPG stats etc.
          return {
            ...existingChar,
            name: formDef.name,
            details: formDef.details,
             // RPG properties handling - ensure they are present if mode is on, or cleared/defaulted if off
            ...(newRPGMode ? {
                level: existingChar.level || 1, experience: existingChar.experience || 0, characterClass: existingChar.characterClass || '',
                stats: existingChar.stats || {}, inventory: existingChar.inventory || {}, skills: existingChar.skills || {},
                spells: existingChar.spells || [], techniques: existingChar.techniques || [], passiveAbilities: existingChar.passiveAbilities || [],
                strength: existingChar.strength ?? 10, dexterity: existingChar.dexterity ?? 10, constitution: existingChar.constitution ?? 10,
                intelligence: existingChar.intelligence ?? 10, wisdom: existingChar.wisdom ?? 10, charisma: existingChar.charisma ?? 10,
                hitPoints: existingChar.hitPoints ?? 10, maxHitPoints: existingChar.maxHitPoints ?? 10, armorClass: existingChar.armorClass ?? 10,
            } : { /* Clear/default RPG fields if mode disabled, or handle as needed */
                level: undefined, experience: undefined, characterClass: undefined, stats: undefined, inventory: undefined, skills: undefined,
                spells: undefined, techniques: undefined, passiveAbilities: undefined, strength: undefined, dexterity: undefined,
                constitution: undefined, intelligence: undefined, wisdom: undefined, charisma: undefined,
                hitPoints: undefined, maxHitPoints: undefined, armorClass: undefined,
             }),
          };
        } else {
          // Create new character structure for characters defined in form but not yet in stagedChars
          const newId = formDef.id || `${formDef.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          return {
            id: newId, name: formDef.name, details: formDef.details,
            history: [], opinion: {}, portraitUrl: null, affinity: 50,
            relations: { [PLAYER_ID]: defaultRelation }, // Initial relation to player
             ...(newRPGMode ? { /* Default RPG fields */
                level: 1, experience: 0, characterClass: '', stats: {}, inventory: {}, skills: {},
                spells: [], techniques: [], passiveAbilities: [], strength: 10, dexterity: 10, constitution: 10,
                intelligence: 10, wisdom: 10, charisma: 10, hitPoints: 10, maxHitPoints: 10, armorClass: 10,
            } : {}),
          };
        }
      });
      
      // Ensure all characters in the final list have relations to each other and the player
      // This also ensures that if a character was removed from the form, existing relations to/from them are handled (implicitly removed if not re-added by another logic path).
      updatedCharsList.forEach(char => {
        char.relations = char.relations || {};
        if (!char.relations[PLAYER_ID]) { // Ensure relation to player
            char.relations[PLAYER_ID] = defaultRelation;
        }
        updatedCharsList.forEach(otherChar => { // Ensure relations to other NPCs in the *current* form-derived list
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
    // This function is called when "Enregistrer les modifications" is clicked.
    // It applies the *staged* settings and characters to the *live* adventure state.
    const currentLiveAdventureSettings = adventureSettings;
    setAdventureSettings(JSON.parse(JSON.stringify(stagedAdventureSettings)));
    setCharacters(JSON.parse(JSON.stringify(stagedCharacters)));

    // If initial situation changed in staged settings, reset the narrative
    if (stagedAdventureSettings.initialSituation !== currentLiveAdventureSettings.initialSituation) {
        setNarrative([{ id: `msg-${Date.now()}`, type: 'system', content: stagedAdventureSettings.initialSituation, timestamp: Date.now() }]);
    }
    React.startTransition(() => {
        toast({ title: "Modifications Enregistrées", description: "Les paramètres de l'aventure et des personnages ont été mis à jour." });
    });
  }, [stagedAdventureSettings, stagedCharacters, toast, adventureSettings]); // adventureSettings used for comparison


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

        // This updates the *staged* characters list. Changes will be applied to live state via "Enregistrer les modifications".
        setStagedCharacters(prevChars => {
            const currentNames = new Set(prevChars.map(c => c.name.toLowerCase()));
            const charsToAdd: Character[] = [];
            // Make a deep copy of previous characters to safely update relations
            let existingCharsCopy = JSON.parse(JSON.stringify(prevChars)); 

            newChars.forEach(newCharData => {
                if (!currentNames.has(newCharData.name.toLowerCase())) {
                    const newId = `${newCharData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                    const processedRelations: Record<string, string> = {};

                    // Initialize relations for the new character based on AI output
                    if (newCharData.initialRelations && Array.isArray(newCharData.initialRelations)) {
                        newCharData.initialRelations.forEach(rel => {
                            const relationDescription = rel.description || defaultRelationDesc;
                            if (rel.targetName.toLowerCase() === (stagedAdventureSettings.playerName || "Player").toLowerCase()) {
                                processedRelations[PLAYER_ID] = relationDescription;
                            } else {
                                // Find target in the *current copy* of characters list
                                const targetChar = existingCharsCopy.find((ec: Character) => ec.name.toLowerCase() === rel.targetName.toLowerCase());
                                if (targetChar) {
                                    processedRelations[targetChar.id] = relationDescription;
                                }
                            }
                        });
                    }
                    // Ensure relation to player exists, default if not provided or "Inconnu"
                    if (!processedRelations[PLAYER_ID] || processedRelations[PLAYER_ID].trim() === "" || processedRelations[PLAYER_ID].toLowerCase() === "inconnu" || processedRelations[PLAYER_ID].toLowerCase() === "unknown") {
                        processedRelations[PLAYER_ID] = defaultRelationDesc;
                    }
                    // Ensure relations to all *other existing* characters are set (default if not provided)
                    existingCharsCopy.forEach((ec: Character) => {
                        if (!processedRelations[ec.id] || processedRelations[ec.id].trim() === "" || processedRelations[ec.id].toLowerCase() === "inconnu" || processedRelations[ec.id].toLowerCase() === "unknown") {
                             processedRelations[ec.id] = defaultRelationDesc;
                        }
                         // Also, update existing characters to have a relation TO the new character
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
                        ...(stagedAdventureSettings.rpgMode && { // Use stagedAdventureSettings for RPG mode check
                            level: 1, experience: 0, characterClass: '', stats: {}, inventory: {}, skills: {},
                            spells: [], techniques: [], passiveAbilities: [], strength: 10, dexterity: 10,
                            constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
                            hitPoints: 10, maxHitPoints: 10, armorClass: 10,
                        })
                    };
                    charsToAdd.push(characterToAdd);
                    currentNames.add(newCharData.name.toLowerCase()); // Add to known names to prevent duplicates in this batch
                    // Update existing characters copy to include relations to the new character
                    existingCharsCopy = existingCharsCopy.map((ec: Character) => ({
                        ...ec,
                        relations: {
                            ...(ec.relations || {}),
                            [newId]: ec.relations?.[newId] || defaultRelationDesc, // Default if somehow not set
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
            return prevChars; // Return original if no new unique characters were added
        });
    }, [currentLanguage, stagedAdventureSettings.playerName, stagedAdventureSettings.rpgMode, toast]);

    const handleCharacterHistoryUpdate = React.useCallback((updates: CharacterUpdateSchema[]) => {
        if (!updates || updates.length === 0) return;
        // This updates the *staged* characters list.
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
        // This updates the *staged* characters list.
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
                     // Notify only for significant changes
                     if (Math.abs(update.change) >= 3) { // Threshold for "significant"
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
        // This is called by CharacterSidebar for manual relation edits. Updates *staged* characters.
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

        // This updates the *staged* characters list based on AI output.
        setStagedCharacters(prevChars => {
            let chars = JSON.parse(JSON.stringify(prevChars)); // Deep copy for safe mutation
            let changed = false;

            updates.forEach(update => {
                const sourceCharIndex = chars.findIndex((c: Character) => c.name.toLowerCase() === update.characterName.toLowerCase());
                if (sourceCharIndex === -1) return; // Source character not found in staged list

                let targetId: string | null = null;
                if (update.targetName.toLowerCase() === (stagedAdventureSettings.playerName || "Player").toLowerCase()) {
                    targetId = PLAYER_ID;
                } else {
                    const targetChar = chars.find((c:Character) => c.name.toLowerCase() === update.targetName.toLowerCase());
                    if (targetChar) targetId = targetChar.id;
                    else return; // Target character not found in staged list
                }
                if (!targetId) return; // Should not happen if previous checks pass

                const currentRelation = chars[sourceCharIndex].relations?.[targetId] || defaultRelationDesc;
                // Ensure "Inconnu" or empty strings from AI are treated as the default unknown relation
                const newRelationFromAI = update.newRelation.trim() === "" || update.newRelation.toLowerCase() === "inconnu" || update.newRelation.toLowerCase() === "unknown" ? defaultRelationDesc : update.newRelation;

                if (currentRelation !== newRelationFromAI) {
                    // Directly mutate the copy
                    const sourceChar = { ...chars[sourceCharIndex] }; // Shallow copy the specific character
                    sourceChar.relations = { ...(sourceChar.relations || {}), [targetId]: newRelationFromAI };
                    chars[sourceCharIndex] = sourceChar; // Put it back into the copied array
                    changed = true;
                     React.startTransition(() => {
                       toast({
                          title: `Relation Changée: ${update.characterName}`,
                          description: `Relation envers ${update.targetName} est maintenant "${newRelationFromAI}". Raison: ${update.reason || 'Événement narratif'}`,
                       });
                     });
                }
            });
            if (changed) return chars; // Return the modified copy
            return prevChars; // Return original if no changes
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
            if (prevNarrative.length <= 1) { // Cannot undo the initial system message
                 React.startTransition(() => { toast({ title: "Impossible d'annuler", description: "Aucun message à annuler.", variant: "destructive" }); });
                 return prevNarrative;
            }
            // Find the last user message and remove it and all subsequent AI messages
            let lastUserIndex = -1;
            for (let i = prevNarrative.length - 1; i >= 0; i--) {
                if (prevNarrative[i].type === 'user') {
                    lastUserIndex = i;
                    break;
                }
            }

            // If a user message is found, slice the narrative up to that point.
            // If no user message found (e.g., only AI/system messages after initial),
            // and we have more than 1 message, slice to keep only the first (initial) message.
            if (lastUserIndex !== -1) { // User message found
                // If lastUserIndex is 0, it means the first message was user (unlikely for game start)
                // Slicing up to lastUserIndex means that message is EXCLUDED. We want to keep user messages.
                // If we want to REMOVE the last user action and subsequent AI responses:
                if (lastUserIndex > 0) { // Ensure we don't remove the initial system message
                    const newNarrative = prevNarrative.slice(0, lastUserIndex);
                    React.startTransition(() => { toast({ title: "Dernier tour annulé" }); });
                    return newNarrative;
                } else if (prevNarrative.length > 1) { // If lastUserIndex is 0, but there are more messages (AI responses), remove them
                     const newNarrative = prevNarrative.slice(0, 1); // Keep only the initial system message
                     React.startTransition(() => { toast({ title: "Dernier message annulé" }); });
                     return newNarrative;
                }
            } else if (prevNarrative.length > 1) { // No user messages, but more than one system/AI message (e.g., multiple system startup messages)
                 const newNarrative = prevNarrative.slice(0, 1); // Keep only the first
                 React.startTransition(() => { toast({ title: "Dernier message annulé" }); });
                 return newNarrative;
            }

            // If no user message was found and it's just the initial system message, or logic above didn't apply
            React.startTransition(() => { toast({ title: "Annulation non applicable", description:"Aucune action utilisateur claire à annuler ou déjà à l'état initial."}); });
            return prevNarrative;
        });
    }, [toast]);


    const handleRegenerateLastResponse = React.useCallback(async () => {
         if (isRegenerating) return; // Prevent multiple regenerations at once

         // Find the last AI message and the user action that prompted it
         let lastAiMessage: Message | undefined;
         let lastUserAction: string | undefined;
         let contextMessages: Message[] = []; // Messages before the last user action
         let lastAiIndex = -1; // Index of the last AI message to replace

         // Iterate backwards to find the relevant messages
         const currentNarrative = [...narrative]; // Use current narrative from state
         for (let i = currentNarrative.length - 1; i >= 0; i--) {
             const message = currentNarrative[i];
             if (message.type === 'ai' && !lastAiMessage) {
                 lastAiMessage = message;
                 lastAiIndex = i;
             } else if (message.type === 'user' && lastAiMessage) { // Found user action *before* the last AI message
                 lastUserAction = message.content;
                 // Define context: up to 4 previous messages + this user action
                 const contextEndIndex = i; // Index of the user action
                 contextMessages = currentNarrative.slice(Math.max(0, contextEndIndex - 4), contextEndIndex); // up to 4 msgs before user action
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
         // Includes messages before the last user action, and the last user action itself
         const narrativeContextForRegen = contextMessages.map(msg =>
                 msg.type === 'user' ? `> ${adventureSettings.playerName || 'Player'}: ${msg.content}` : msg.content
             ).join('\n\n') + `\n\n> ${adventureSettings.playerName || 'Player'}: ${lastUserAction}\n`; // Append the specific user action

         try {
             const input: GenerateAdventureInput = {
                 world: adventureSettings.world, // Use live settings
                 initialSituation: narrativeContextForRegen, // The specific context leading to the response to be regenerated
                 characters: characters, // Use live characters
                 userAction: lastUserAction, // The specific user action that led to the original AI response
                 currentLanguage: currentLanguage,
                 playerName: adventureSettings.playerName || "Player",
                 promptConfig: adventureSettings.rpgMode ? {
                    rpgContext: {
                        playerStats: { /* TODO: Placeholder for actual player stats */ },
                        characterDetails: characters.map(c => ({ // Use live characters
                             name: c.name,
                             details: c.details,
                             stats: c.stats,
                             inventory: c.inventory,
                             // Prepare relations summary string for context
                             relations: c.relations ? Object.entries(c.relations).map(([id, desc]) => {
                                 const relatedChar = characters.find(char => char.id === id); // Find in live characters
                                 const targetName = relatedChar ? relatedChar.name : (id === PLAYER_ID ? (adventureSettings.playerName || 'Player') : 'Unknown');
                                 return `${targetName}: ${desc}`;
                             }).join(', ') : (currentLanguage === 'fr' ? 'Aucune' : 'None'),
                        })),
                        mode: 'exploration', // Or current RPG mode if tracked
                    }
                 } : undefined,
             };

             const result = await generateAdventure(input);

             // Replace the old AI message with the new one
             setNarrative(prev => {
                const newNarrative = [...prev];
                const newAiMessage: Message = {
                     id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`, // New ID
                     type: 'ai',
                     content: result.narrative,
                     timestamp: Date.now(),
                     sceneDescription: result.sceneDescriptionForImage,
                 };
                 if (lastAiIndex !== -1) {
                     newNarrative.splice(lastAiIndex, 1, newAiMessage); // Replace at the found index
                 } else {
                     // Should not happen if lastAiMessage was found, but as a fallback:
                     newNarrative.push(newAiMessage);
                 }
                return newNarrative;
             });

             // Handle side effects (new characters, history, affinity, relations) on STAGED characters
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
     }, [isRegenerating, narrative, adventureSettings, characters, currentLanguage, toast, handleNewCharacters, handleCharacterHistoryUpdate, handleAffinityUpdates, handleRelationUpdatesFromAI, generateAdventure]); // Added generateAdventure to dependencies

   // Handler for CharacterSidebar to update a character in the *staged* list
   const handleCharacterUpdate = React.useCallback((updatedCharacter: Character) => {
       setStagedCharacters(prev => prev.map(c => c.id === updatedCharacter.id ? updatedCharacter : c));
   }, []);

    // Handler for CharacterSidebar to save a character globally (localStorage)
    const handleSaveNewCharacter = React.useCallback((character: Character) => {
        if (typeof window !== 'undefined') {
            try {
                const existingCharsStr = localStorage.getItem('globalCharacters');
                let existingChars: Character[] = existingCharsStr ? JSON.parse(existingCharsStr) : [];
                
                // Check if character (by ID or name for broader matching) already exists
                const charIndex = existingChars.findIndex(c => c.id === character.id || c.name.toLowerCase() === character.name.toLowerCase());

                if (charIndex > -1) {
                    // Update existing character
                    existingChars[charIndex] = character;
                } else {
                    // Add new character
                    existingChars.push(character);
                }
                localStorage.setItem('globalCharacters', JSON.stringify(existingChars));
                 React.startTransition(() => { toast({ title: "Personnage Sauvegardé", description: `${character.name} est maintenant disponible globalement.` }); });
                 // Update the _lastSaved timestamp on the *staged* character to reflect it's saved
                 setStagedCharacters(prev => prev.map(c => c.id === character.id ? { ...c, _lastSaved: Date.now() } as any : c));

            } catch (error) {
                 console.error("Failed to save character to localStorage:", error);
                 React.startTransition(() => { toast({ title: "Erreur de Sauvegarde", description: "Impossible de sauvegarder le personnage globalement.", variant: "destructive" }); });
            }
        } else {
            // This case should ideally not be hit if UI for saving is only available client-side
            React.startTransition(() => { toast({ title: "Erreur", description: "La sauvegarde globale n'est disponible que côté client.", variant: "destructive" }); });
        }
    }, [toast]);


    // Handler for CharacterSidebar to add a globally saved character to the *staged* characters list for the current adventure
    const handleAddStagedCharacter = React.useCallback((globalCharToAdd: Character) => {
        setStagedCharacters(prevStagedChars => {
            // Check if character (by ID or name) is already in the staged list
            if (prevStagedChars.some(sc => sc.id === globalCharToAdd.id || sc.name.toLowerCase() === globalCharToAdd.name.toLowerCase())) {
                React.startTransition(() => {
                    toast({ title: "Personnage déjà présent", description: `${globalCharToAdd.name} est déjà dans l'aventure.`, variant: "default" });
                });
                return prevStagedChars;
            }

            const defaultRelation = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
            const newChar = { ...globalCharToAdd }; // Make a copy to avoid mutating the global list object

            // Initialize/update relations for the new character being added
            newChar.relations = newChar.relations || {};
            // Relation to player
            if (!newChar.relations[PLAYER_ID]) {
                newChar.relations[PLAYER_ID] = defaultRelation;
            }
            // Relations to existing staged characters (NPC to NPC)
            prevStagedChars.forEach(existingChar => {
                if (!newChar.relations![existingChar.id]) {
                    newChar.relations![existingChar.id] = defaultRelation;
                }
            });

            // Update relations of existing characters to include the new one
            const updatedPrevChars = prevStagedChars.map(existingChar => {
                const updatedRelations = { ...(existingChar.relations || {}), [newChar.id]: defaultRelation };
                return { ...existingChar, relations: updatedRelations };
            });
            
            // Add default RPG fields if RPG mode is active and they are missing
            if (stagedAdventureSettings.rpgMode) { // Check staged RPG mode
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


            React.startTransition(() => {
                toast({ title: "Personnage Ajouté", description: `${newChar.name} a été ajouté aux personnages de l'aventure. N'oubliez pas d'enregistrer les modifications.` });
            });
            return [...updatedPrevChars, newChar];
        });
    }, [currentLanguage, toast, stagedAdventureSettings.rpgMode]); // Depend on staged RPG mode


   const handleSave = React.useCallback(() => {
        // Saves the *live* state of the adventure
        const charactersToSave = characters.map(({ ...char }) => char); // Create a copy to be safe
        const saveData: SaveData = {
            adventureSettings, // Live settings
            characters: charactersToSave, // Live characters
            narrative, // Live narrative
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
                // Validate narrative messages structure
                const isValidNarrative = loadedData.narrative.every(msg =>
                    typeof msg === 'object' && msg !== null && typeof msg.id === 'string' &&
                    ['user', 'ai', 'system'].includes(msg.type) && typeof msg.content === 'string' &&
                    typeof msg.timestamp === 'number'
                );
                if (!isValidNarrative) {
                    // Attempt migration for old string narrative format
                    if (typeof loadedData.narrative === 'string') { // Old format was just a string
                        loadedData.narrative = [{ id: `migrated-${Date.now()}`, type: 'system', content: loadedData.narrative as unknown as string, timestamp: Date.now() }];
                    } else throw new Error("Structure des messages narratifs invalide.");
                }

                 // --- Data Migration Logic ---
                 // This ensures compatibility with older save file versions.
                 // Version 1.4: Added history, opinion, affinity, relations to Character, playerName to AdventureSettings
                 if (loadedData.saveFormatVersion === undefined || loadedData.saveFormatVersion < 1.4) {
                     loadedData.characters = loadedData.characters.map(c => ({ ...c, history: Array.isArray(c.history) ? c.history : [], opinion: typeof c.opinion === 'object' && c.opinion !== null ? c.opinion : {}, affinity: c.affinity ?? 50, relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                     loadedData.adventureSettings.playerName = loadedData.adventureSettings.playerName || "Player";
                 }
                 // Version 1.5: Ensured relations object always exists on Character
                 if (loadedData.saveFormatVersion < 1.5) { 
                       loadedData.characters = loadedData.characters.map(c => ({ ...c, relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                 }
                  // Version 1.6: Ensured relations is an object (not null or other types)
                  if (loadedData.saveFormatVersion < 1.6) { 
                       loadedData.characters = loadedData.characters.map(c => ({ ...c, relations: typeof c.relations === 'object' && c.relations !== null ? c.relations : { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                 }

                // Final validation and defaulting for loaded characters after migration
                const rpgModeActive = loadedData.adventureSettings.rpgMode;
                const loadedLang = loadedData.currentLanguage || "fr";
                const defaultRelation = loadedLang === 'fr' ? "Inconnu" : "Unknown";

                const validatedCharacters = loadedData.characters.map((c: any) => {
                    const charId = c.id || `${c.name?.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                    let relations = typeof c.relations === 'object' && c.relations !== null ? c.relations : { [PLAYER_ID]: defaultRelation };
                     // Ensure relation to player exists
                    if (!relations[PLAYER_ID]) relations[PLAYER_ID] = defaultRelation;
                    
                    return { 
                        id: charId,
                        name: c.name || "Inconnu", details: c.details || "", history: Array.isArray(c.history) ? c.history : [], 
                        opinion: typeof c.opinion === 'object' && c.opinion !== null ? c.opinion : {},
                        portraitUrl: c.portraitUrl || null, affinity: c.affinity ?? 50, relations: relations,
                        _lastSaved: c._lastSaved, // Preserve if present
                        ...(rpgModeActive && { // Apply RPG defaults if mode is active
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

                // Update the base state first. This triggers re-initialization of staged state.
                setBaseAdventureSettings(JSON.parse(JSON.stringify(loadedData.adventureSettings)));
                setBaseCharacters(JSON.parse(JSON.stringify(validatedCharacters)));
                
                // Then update the live state.
                setAdventureSettings(loadedData.adventureSettings);
                setCharacters(validatedCharacters);
                setNarrative(loadedData.narrative as Message[]); // Narrative is already validated
                setCurrentLanguage(loadedLang);

                React.startTransition(() => { toast({ title: "Aventure Chargée", description: "L'état de l'aventure a été restauré." }); });
            } catch (error: any) {
                console.error("Error loading adventure:", error);
                React.startTransition(() => { toast({ title: "Erreur de Chargement", description: `Impossible de lire le fichier JSON: ${error.message}`, variant: "destructive" }); });
            }
        };
        reader.readAsText(file);
        // Reset file input value to allow loading the same file again if needed
        if(event.target) event.target.value = ''; 
    }, [toast]);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Function to actually restart the adventure (called by AlertDialog)
    const confirmRestartAdventure = React.useCallback(() => {
        // Reset live state to base state
        setAdventureSettings(JSON.parse(JSON.stringify(baseAdventureSettings)));
        setCharacters(JSON.parse(JSON.stringify(baseCharacters)));
        // Reset narrative to initial situation from base settings
        setNarrative([{ id: `msg-${Date.now()}`, type: 'system', content: baseAdventureSettings.initialSituation, timestamp: Date.now() }]);
        // Staged state will be updated by the useEffect hook watching baseAdventureSettings/baseCharacters
        
        setShowRestartConfirm(false); // Close the dialog
        React.startTransition(() => { toast({ title: "Aventure Recommencée", description: "L'histoire a été réinitialisée à son état initial." }); });
    }, [baseAdventureSettings, baseCharacters, toast]);


  // Memoized version of stagedAdventureSettings for AdventureForm to prevent unnecessary re-renders of the form
  // This is crucial because AdventureForm itself uses react-hook-form which has its own internal state management.
  const memoizedStagedAdventureSettingsForForm = React.useMemo(() => {
    return {
      world: stagedAdventureSettings.world,
      initialSituation: stagedAdventureSettings.initialSituation,
      playerName: stagedAdventureSettings.playerName,
      currencyName: stagedAdventureSettings.currencyName,
      enableRpgMode: stagedAdventureSettings.rpgMode,
      // Map only name and details for the form character definitions
      characters: stagedCharacters.map(c => ({ id: c.id, name: c.name, details: c.details })),
    };
  }, [stagedAdventureSettings, stagedCharacters]); // Recalculate only if these specific parts of staged state change

  return (
    <>
      <PageStructure
        // "Live" state passed to AdventureDisplay and for AI actions
        adventureSettings={adventureSettings}
        characters={characters}
        
        // "Staged" state passed to configuration components (AdventureForm, CharacterSidebar)
        stagedAdventureSettings={memoizedStagedAdventureSettingsForForm} // Pass the memoized version for AdventureForm
        stagedCharacters={stagedCharacters} // Pass full staged characters to CharacterSidebar
        
        propKey={formKey} // Key for re-initializing AdventureForm when base state changes
        handleApplyStagedChanges={handleApplyStagedChanges}
        
        narrativeMessages={narrative}
        currentLanguage={currentLanguage}
        fileInputRef={fileInputRef}
        
        // Callbacks to update "staged" state
        handleSettingsUpdate={handleSettingsUpdate} // Updates stagedAdventureSettings and stagedCharacters (form part)
        handleCharacterUpdate={handleCharacterUpdate} // Updates an individual stagedCharacter (from CharacterSidebar)
        handleNewCharacters={handleNewCharacters} // Adds new characters to stagedCharacters (from AI)
        handleCharacterHistoryUpdate={handleCharacterHistoryUpdate} // Updates history of stagedCharacters (from AI)
        handleAffinityUpdates={handleAffinityUpdates} // Updates affinity of stagedCharacters (from AI)
        handleRelationUpdate={handleRelationUpdate} // Updates relations of stagedCharacters (manual edit in CharacterSidebar)
        handleRelationUpdatesFromAI={handleRelationUpdatesFromAI} // Updates relations of stagedCharacters (from AI)
        handleSaveNewCharacter={handleSaveNewCharacter} // Saves a stagedCharacter globally
        handleAddStagedCharacter={handleAddStagedCharacter} // Adds a global character to stagedCharacters
        
        // Callbacks for "live" state actions
        handleNarrativeUpdate={handleNarrativeUpdate} // Adds to live narrative
        handleSave={handleSave} // Saves live state
        handleLoad={handleLoad} // Loads into base and live state
        setCurrentLanguage={setCurrentLanguage} // Updates live language
        
        // AI actions (operate on live state)
        translateTextAction={translateText}
        generateAdventureAction={generateAdventure}
        generateSceneImageAction={generateSceneImage}
        
        // Message manipulation actions (operate on live narrative)
        handleEditMessage={handleEditMessage}
        handleRegenerateLastResponse={handleRegenerateLastResponse}
        handleUndoLastMessage={handleUndoLastMessage}
        
        playerId={PLAYER_ID}
        playerName={adventureSettings.playerName || "Player"} // Use live player name for AI and display
        
        onRestartAdventure={() => setShowRestartConfirm(true)} // Opens restart confirmation dialog
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

