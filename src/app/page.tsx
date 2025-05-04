
"use client"; // Mark page as Client Component to manage state

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { Character, AdventureSettings, SaveData, Message } from "@/types"; // Import shared types including Message
import { PageStructure } from "./page.structure"; // Import the layout structure component

// Import AI functions here
import { generateAdventure } from "@/ai/flows/generate-adventure";
import { generateSceneImage } from "@/ai/flows/generate-scene-image";
import { translateText } from "@/ai/flows/translate-text";
import type { GenerateAdventureInput, GenerateAdventureOutput, CharacterUpdateSchema } from "@/ai/flows/generate-adventure"; // Import input/output/new char/update types


export default function Home() {
  // State Management
  const [adventureSettings, setAdventureSettings] = React.useState<AdventureSettings>({
    world: "Grande université populaire nommée \"hight scoole of futur\".",
    initialSituation: "Vous marchez dans les couloirs animés de Hight School of Future lorsque vous apercevez Rina, votre petite amie, en pleine conversation avec Kentaro, votre meilleur ami. Ils semblent étrangement proches, riant doucement. Un sentiment de malaise vous envahit.",
    rpgMode: false,
  });
  const [characters, setCharacters] = React.useState<Character[]>([
      { id: 'rina-1', name: "Rina", details: "jeune femme de 19 ans, votre petite amie. Elle se rapproche de Kentaro. Étudiante populaire, calme, aimante, parfois secrète. 165 cm, yeux marron, cheveux mi-longs bruns, traits fins, athlétique.", history: [], opinion: {} },
      { id: 'kentaro-1', name: "Kentaro", details: "Jeune homme de 20 ans, votre meilleur ami. Étudiant populaire, charmant mais calculateur et impulsif. 185 cm, athlétique, yeux bleus, cheveux courts blonds. Aime draguer et voir son meilleur ami souffrir. Se rapproche de Rina.", history: [], opinion: {} }
  ]);
  // Narrative is now an array of Message objects
  const [narrative, setNarrative] = React.useState<Message[]>([
     { id: `msg-${Date.now()}`, type: 'system', content: adventureSettings.initialSituation, timestamp: Date.now() }
  ]);
  const [currentLanguage, setCurrentLanguage] = React.useState<string>("fr"); // Add state for language
  const [isRegenerating, setIsRegenerating] = React.useState<boolean>(false); // State for regeneration loading
  const { toast } = useToast();

  // --- Callback Functions ---

  const handleSettingsUpdate = (newSettings: any /* Type from AdventureForm */) => {
    console.log("Updating global settings:", newSettings);
    const oldInitialSituation = adventureSettings.initialSituation;
    setAdventureSettings({
        world: newSettings.world,
        initialSituation: newSettings.initialSituation,
        rpgMode: newSettings.enableRpgMode ?? false,
    });
    // Update character list from form (simple overwrite for now)
     const updatedChars = newSettings.characters.map((c: any, index: number) => {
        // Try to find existing character by name if ID is missing or new
        const existingChar = characters.find(ec => ec.name === c.name);
        const id = existingChar?.id || characters.find(ec => ec.name === c.name)?.id || `${c.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`; // More unique ID
        return {
            id: id,
            name: c.name,
            details: c.details,
            // Keep existing RPG fields if they exist, otherwise initialize
            history: existingChar?.history || characters.find(ec => ec.id === id)?.history || [],
            opinion: existingChar?.opinion || characters.find(ec => ec.id === id)?.opinion || {},
            stats: newSettings.enableRpgMode ? (existingChar?.stats || characters.find(ec => ec.id === id)?.stats || {}) : undefined,
            inventory: newSettings.enableRpgMode ? (existingChar?.inventory || characters.find(ec => ec.id === id)?.inventory || {}) : undefined,
            portraitUrl: existingChar?.portraitUrl || characters.find(ec => ec.id === id)?.portraitUrl || null,
            // Add other RPG fields with defaults if rpgMode is enabled
            level: newSettings.enableRpgMode ? (existingChar?.level || characters.find(ec => ec.id === id)?.level || 1) : undefined,
            experience: newSettings.enableRpgMode ? (existingChar?.experience || characters.find(ec => ec.id === id)?.experience || 0) : undefined,
            characterClass: newSettings.enableRpgMode ? (existingChar?.characterClass || characters.find(ec => ec.id === id)?.characterClass || '') : undefined,
            strength: newSettings.enableRpgMode ? (existingChar?.strength || characters.find(ec => ec.id === id)?.strength || 10) : undefined,
            dexterity: newSettings.enableRpgMode ? (existingChar?.dexterity || characters.find(ec => ec.id === id)?.dexterity || 10) : undefined,
            constitution: newSettings.enableRpgMode ? (existingChar?.constitution || characters.find(ec => ec.id === id)?.constitution || 10) : undefined,
            intelligence: newSettings.enableRpgMode ? (existingChar?.intelligence || characters.find(ec => ec.id === id)?.intelligence || 10) : undefined,
            wisdom: newSettings.enableRpgMode ? (existingChar?.wisdom || characters.find(ec => ec.id === id)?.wisdom || 10) : undefined,
            charisma: newSettings.enableRpgMode ? (existingChar?.charisma || characters.find(ec => ec.id === id)?.charisma || 10) : undefined,
            hitPoints: newSettings.enableRpgMode ? (existingChar?.hitPoints || characters.find(ec => ec.id === id)?.hitPoints || 10) : undefined,
            maxHitPoints: newSettings.enableRpgMode ? (existingChar?.maxHitPoints || characters.find(ec => ec.id === id)?.maxHitPoints || 10) : undefined,
            armorClass: newSettings.enableRpgMode ? (existingChar?.armorClass || characters.find(ec => ec.id === id)?.armorClass || 10) : undefined,
            skills: newSettings.enableRpgMode ? (existingChar?.skills || characters.find(ec => ec.id === id)?.skills || {}) : undefined,
            spells: newSettings.enableRpgMode ? (c.spells || []) : undefined,
            techniques: newSettings.enableRpgMode ? (c.techniques || []) : undefined,
            passiveAbilities: newSettings.enableRpgMode ? (c.passiveAbilities || []) : undefined,

        };
    });
    setCharacters(updatedChars);

    // Reset narrative only if initial situation changes significantly
    if (newSettings.initialSituation !== oldInitialSituation) {
         handleRestartAdventure(); // Use the restart function
    }

    toast({ title: "Configuration Mise à Jour" });
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
   const handleNewCharacters = (newChars: Array<{ name: string; details?: string }>) => {
        if (!newChars || newChars.length === 0) return;

        setCharacters(prevChars => {
            const currentNames = new Set(prevChars.map(c => c.name.toLowerCase()));
            const charsToAdd: Character[] = [];

            newChars.forEach(newCharData => {
                if (!currentNames.has(newCharData.name.toLowerCase())) {
                    const newId = `${newCharData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                    const characterToAdd: Character = {
                        id: newId,
                        name: newCharData.name,
                        details: newCharData.details || "Rencontré récemment.",
                        history: [`Rencontré le ${new Date().toLocaleString()}`], // Basic history entry
                        opinion: {}, // Initialize opinion
                        portraitUrl: null,
                        // isNew: true, // Add a temporary flag to indicate it's newly added and not saved globally yet
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
                }
            });

            if (charsToAdd.length > 0) {
                toast({
                    title: "Nouveau Personnage Ajouté",
                    description: `${charsToAdd.map(c => c.name).join(', ')} a été ajouté à la liste locale. Sauvegardez-le si vous le souhaitez.`,
                });
                return [...prevChars, ...charsToAdd];
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
                    const newHistory = charUpdates.map(u => u.historyEntry);
                    return {
                        ...char,
                        history: [...(char.history || []), ...newHistory],
                    };
                }
                return char;
            });

            if (changed) {
                console.log("Character histories updated:", updates);
                 // Optionally show a toast, but might be too noisy
                 // toast({ title: "Historique Personnage Mis à Jour" });
                return updatedChars;
            }
            return prevChars; // No change
        });
    };


    // New handler for editing a specific message
   const handleEditMessage = (messageId: string, newContent: string) => {
       setNarrative(prev => prev.map(msg =>
           msg.id === messageId ? { ...msg, content: newContent, timestamp: Date.now() } : msg
       ));
       toast({ title: "Message Modifié" });
       // TODO: Decide if editing should trigger AI regeneration from that point.
       // For now, it's just a text edit.
   };

   // Function to restart the adventure
   const handleRestartAdventure = () => {
        setNarrative([{ id: `msg-${Date.now()}`, type: 'system', content: adventureSettings.initialSituation, timestamp: Date.now() }]);
        // Optionally reset characters to their initial state if needed, or keep current state
        // For now, just reset the narrative.
        toast({ title: "Aventure Recommencée", description: "L'histoire a été remise au début." });
   }


    // Handler for regenerating the last AI response
    const handleRegenerateLastResponse = async () => {
         if (isRegenerating) return;

         let lastAiMessage: Message | undefined;
         let lastUserAction: string | undefined;
         let contextMessages: Message[] = [];
         let lastAiIndex = -1;

         // Iterate backwards to find the last AI message and the user action before it
         for (let i = narrative.length - 1; i >= 0; i--) {
             const message = narrative[i];
             if (message.type === 'ai' && !lastAiMessage) {
                 lastAiMessage = message;
                 lastAiIndex = i;
             } else if (message.type === 'user' && lastAiMessage) {
                 lastUserAction = message.content;
                 // Gather context messages *before* this user action
                 const contextEndIndex = i;
                 const contextStartIndex = Math.max(0, contextEndIndex - 4); // Get up to 4 previous messages
                 contextMessages = narrative.slice(contextStartIndex, contextEndIndex);
                 break; // Found both needed messages
             } else if (lastAiMessage && lastUserAction) {
                 break; // Should already have exited loop
             }
         }


         if (!lastAiMessage || !lastUserAction) {
             toast({ title: "Impossible de régénérer", description: "Aucune réponse IA précédente valide trouvée pour régénérer.", variant: "destructive" });
             return;
         }

         setIsRegenerating(true);
         toast({ title: "Régénération en cours...", description: "Génération d'une nouvelle réponse." });

         // Prepare context for the AI regeneration
         const narrativeContext = contextMessages.map(msg =>
                 msg.type === 'user' ? `> ${msg.content}` : msg.content
             ).join('\n\n') + `\n\n> ${lastUserAction}\n`; // Re-append the crucial user action

         try {
             const input: GenerateAdventureInput = {
                 world: adventureSettings.world,
                 initialSituation: narrativeContext, // Provide the reconstructed context
                 characters: characters, // Pass current full character objects
                 userAction: lastUserAction, // Use the same user action
                 promptConfig: adventureSettings.rpgMode ? {
                    rpgContext: {
                        playerStats: { /* TODO: Player stats placeholder */ },
                        // Pass relevant details from current character state
                        characterDetails: characters.map(c => ({
                             name: c.name,
                             details: c.details,
                             stats: c.stats,
                             inventory: c.inventory
                        })),
                        mode: 'exploration', // TODO: Determine mode dynamically if needed
                    }
                 } : undefined,
             };

             const result = await generateAdventure(input);

             // Update the narrative: replace the old AI message with the new one
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
                    newNarrative.splice(lastAiIndex, 1, newAiMessage); // Replace the old AI message
                 } else {
                    // Fallback: should not happen based on logic above, but safety first
                    newNarrative.push(newAiMessage);
                 }

                return newNarrative;
             });

             // Handle any newly introduced characters in the regenerated response
             handleNewCharacters(result.newCharacters || []);
             // Handle character history updates
             handleCharacterHistoryUpdate(result.characterUpdates || []);


             toast({ title: "Réponse Régénérée", description: "Une nouvelle réponse a été ajoutée." });

         } catch (error) {
             console.error("Error regenerating adventure:", error);
             toast({
                 title: "Erreur de Régénération",
                 description: `Impossible de générer une nouvelle réponse: ${error instanceof Error ? error.message : 'Unknown error'}.`,
                 variant: "destructive",
             });
             // State was not changed optimistically, so no need to revert here
         } finally {
             setIsRegenerating(false);
         }
     };


   const handleCharacterUpdate = (updatedCharacter: Character) => {
       // Add logic to persist the character globally if the "save" button was clicked
       // e.g., save to localStorage or a backend
        // Remove the temporary 'isNew' flag if it exists
       // const { isNew, ...characterToSave } = updatedCharacter;

       setCharacters(prev => prev.map(c => c.id === updatedCharacter.id ? updatedCharacter : c));
       console.log("Character updated:", updatedCharacter); // Debug log
       // if (isNew) {
       //     toast({ title: "Personnage Sauvegardé Globalement", description: `${characterToSave.name} peut maintenant être réutilisé.` });
       //     // TODO: Implement global save logic here
       // }
   };

    const handleSaveNewCharacter = (character: Character) => {
        // Placeholder for saving the character globally (e.g., to localStorage, backend)
        console.log("Saving new character globally:", character);
        toast({ title: "Personnage Sauvegardé", description: `${character.name} est maintenant disponible globalement.` });
        // Potentially update the character state to remove the 'isNew' flag or similar indicator
         // onCharacterUpdate({ ...character, isNew: false }); // Example: Update state via existing handler
    };


   const handleSave = () => {
        // Implement saving logic (JSON format)
        console.log("Saving Adventure State...");
         // Filter out any temporary flags before saving
        const charactersToSave = characters.map(({ ...char }) => char);

        const saveData: SaveData = {
            adventureSettings,
            characters: charactersToSave, // Save the cleaned list
            narrative, // Save the array of messages
            currentLanguage,
            saveFormatVersion: 1.2, // Increment version for character history change
            timestamp: new Date().toISOString(),
        };
        // Convert to JSON and offer download or save to backend/localStorage
        const jsonString = JSON.stringify(saveData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aventurier_textuel_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Aventure Sauvegardée", description: "Le fichier JSON a été téléchargé." });
    };

    const handleLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
        // Implement loading logic from JSON file
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonString = e.target?.result as string;
                const loadedData: Partial<SaveData> = JSON.parse(jsonString); // Use partial type

                // Add validation for loadedData structure
                 if (!loadedData.adventureSettings || !loadedData.characters || !loadedData.narrative || !Array.isArray(loadedData.narrative)) {
                    throw new Error("Structure de fichier de sauvegarde invalide ou manquante (paramètres, personnages, ou narration).");
                 }

                 // Basic validation for narrative messages
                const isValidNarrative = loadedData.narrative.every(msg =>
                    typeof msg === 'object' && msg !== null &&
                    typeof msg.id === 'string' &&
                    ['user', 'ai', 'system'].includes(msg.type) &&
                    typeof msg.content === 'string' &&
                    typeof msg.timestamp === 'number'
                    // sceneDescription is optional
                );
                if (!isValidNarrative) {
                    throw new Error("Structure des messages narratifs invalide.");
                }


                // Perform migrations if loadedData.saveFormatVersion is different from current
                 if (loadedData.saveFormatVersion === undefined || loadedData.saveFormatVersion < 1.2) {
                     console.log("Migrating old save format...");
                     // Example migration: ensure history is an array
                     loadedData.characters = loadedData.characters.map(c => ({
                        ...c,
                        history: Array.isArray(c.history) ? c.history : [],
                     }));
                 }

                setAdventureSettings(loadedData.adventureSettings);
                 // Ensure loaded characters have necessary fields, providing defaults
                const validatedCharacters = loadedData.characters.map((c: any) => ({
                    id: c.id || `${c.name?.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                    name: c.name || "Inconnu",
                    details: c.details || "",
                    stats: loadedData.adventureSettings!.rpgMode ? (c.stats || {}) : undefined,
                    inventory: loadedData.adventureSettings!.rpgMode ? (c.inventory || {}) : undefined,
                    history: c.history || [], // Ensure history is always an array
                    opinion: c.opinion || {},
                    portraitUrl: c.portraitUrl || null,
                    // Add defaults for new/existing RPG fields if loading older save or if rpgMode is true
                    level: loadedData.adventureSettings!.rpgMode ? (c.level || 1) : undefined,
                    experience: loadedData.adventureSettings!.rpgMode ? (c.experience || 0) : undefined,
                    characterClass: loadedData.adventureSettings!.rpgMode ? (c.characterClass || '') : undefined,
                    strength: loadedData.adventureSettings!.rpgMode ? (c.strength || 10) : undefined,
                    dexterity: loadedData.adventureSettings!.rpgMode ? (c.dexterity || 10) : undefined,
                    constitution: loadedData.adventureSettings!.rpgMode ? (c.constitution || 10) : undefined,
                    intelligence: loadedData.adventureSettings!.rpgMode ? (c.intelligence || 10) : undefined,
                    wisdom: loadedData.adventureSettings!.rpgMode ? (c.wisdom || 10) : undefined,
                    charisma: loadedData.adventureSettings!.rpgMode ? (c.charisma || 10) : undefined,
                    hitPoints: loadedData.adventureSettings!.rpgMode ? (c.hitPoints || 10) : undefined,
                    maxHitPoints: loadedData.adventureSettings!.rpgMode ? (c.maxHitPoints || 10) : undefined,
                    armorClass: loadedData.adventureSettings!.rpgMode ? (c.armorClass || 10) : undefined,
                    skills: loadedData.adventureSettings!.rpgMode ? (c.skills || {}) : undefined,
                    spells: loadedData.adventureSettings!.rpgMode ? (c.spells || []) : undefined,
                    techniques: loadedData.adventureSettings!.rpgMode ? (c.techniques || []) : undefined,
                    passiveAbilities: loadedData.adventureSettings!.rpgMode ? (c.passiveAbilities || []) : undefined,
                }));
                setCharacters(validatedCharacters);
                setNarrative(loadedData.narrative as Message[]); // Set the array of messages
                setCurrentLanguage(loadedData.currentLanguage || "fr");

                toast({ title: "Aventure Chargée", description: "L'état de l'aventure a été restauré." });
            } catch (error: any) {
                console.error("Error loading adventure:", error);
                toast({ title: "Erreur de Chargement", description: `Impossible de lire le fichier JSON: ${error.message}`, variant: "destructive" });
            }
        };
        reader.readAsText(file);
        // Reset input value to allow loading the same file again
        event.target.value = '';
    };

    // Ref for file input
    const fileInputRef = React.useRef<HTMLInputElement>(null);


  // --- Render ---
  // Pass all state and handlers to the PageStructure component
  return (
      <PageStructure
        adventureSettings={adventureSettings}
        characters={characters}
        narrativeMessages={narrative} // Pass the message array
        currentLanguage={currentLanguage}
        fileInputRef={fileInputRef}
        handleSettingsUpdate={handleSettingsUpdate}
        handleNarrativeUpdate={(content, type, sceneDesc) => {
            handleNarrativeUpdate(content, type, sceneDesc);
            // AI processing is now handled within the generateAdventure flow itself
            // Character updates (history) and new characters are handled after the call returns
        }}
        handleCharacterUpdate={handleCharacterUpdate}
        handleNewCharacters={handleNewCharacters} // Pass the new handler
        handleCharacterHistoryUpdate={handleCharacterHistoryUpdate} // Pass history update handler
        handleSaveNewCharacter={handleSaveNewCharacter} // Pass save new char handler
        handleSave={handleSave}
        handleLoad={handleLoad}
        setCurrentLanguage={setCurrentLanguage}
        translateTextAction={translateText}
        generateAdventureAction={generateAdventure}
        generateSceneImageAction={generateSceneImage}
        handleEditMessage={handleEditMessage}
        handleRestartAdventure={handleRestartAdventure} // Pass restart handler
        handleRegenerateLastResponse={handleRegenerateLastResponse} // Pass regenerate handler
      />
  );
}
