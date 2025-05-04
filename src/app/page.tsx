
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
  // Store the initial characters defined in settings separately for reset purposes
  const [initialCharactersFromSettings, setInitialCharactersFromSettings] = React.useState<Character[]>([
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
  const isInitialMount = React.useRef(true); // Ref to track initial mount

  // --- Callback Functions ---

  const handleSettingsUpdate = (newSettings: any /* Type from AdventureForm */) => {
    console.log("Updating global settings:", newSettings);
    const oldInitialSituation = adventureSettings.initialSituation;
    const newRPGMode = newSettings.enableRpgMode ?? false;
    setAdventureSettings({
        world: newSettings.world,
        initialSituation: newSettings.initialSituation,
        rpgMode: newRPGMode,
    });
    // Update character list from form and store this as the "initial" set for resets
     const initialCharsFromForm = newSettings.characters.map((c: any) => {
        // Try to find existing character by name if ID is missing or new
        const existingChar = characters.find(ec => ec.name === c.name);
        const id = existingChar?.id || `${c.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`; // More unique ID
        return {
            id: id,
            name: c.name,
            details: c.details,
            history: existingChar?.history || [], // Keep history for now, might be reset later
            opinion: existingChar?.opinion || {}, // Keep opinion for now
            portraitUrl: existingChar?.portraitUrl || null,
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
                strength: existingChar?.strength ?? 10, // Use nullish coalescing
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
  };

   // Effect to show toast when settings change, avoiding initial mount
   React.useEffect(() => {
     if (isInitialMount.current) {
       isInitialMount.current = false;
     } else {
       // Only show toast after the initial mount and when settings actually change
       // Need to delay this slightly to avoid the 'update during render' error
        setTimeout(() => toast({ title: "Configuration Mise à Jour" }), 0);
     }
   }, [adventureSettings, initialCharactersFromSettings]); // Depend on settings and initial chars


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
                // Wrap toast in setTimeout to avoid calling setState during render
                setTimeout(() => toast({
                    title: "Nouveau Personnage Ajouté",
                    description: `${charsToAdd.map(c => c.name).join(', ')} a été ajouté à la liste locale. Sauvegardez-le si vous le souhaitez.`,
                }), 0);
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
        // 1. Reset the narrative to the initial situation
        setNarrative([{ id: `msg-reset-${Date.now()}`, type: 'system', content: adventureSettings.initialSituation, timestamp: Date.now() }]);

        // 2. Reset characters: Revert to the deep copy of the initial characters from settings
        // This ensures newly added characters during the session are removed,
        // and stats/history of initial characters are reset.
        setCharacters(JSON.parse(JSON.stringify(initialCharactersFromSettings)));

        toast({ title: "Aventure Recommencée", description: "L'histoire et les personnages ont été réinitialisés." });
   };


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
         } finally {
             setIsRegenerating(false);
         }
     };


   const handleCharacterUpdate = (updatedCharacter: Character) => {
       setCharacters(prev => prev.map(c => c.id === updatedCharacter.id ? updatedCharacter : c));
       console.log("Character updated:", updatedCharacter); // Debug log
   };

    const handleSaveNewCharacter = (character: Character) => {
        // Placeholder for saving the character globally (e.g., to localStorage, backend)
        console.log("Saving new character globally:", character);
        // Example using localStorage - ensure this runs only on client
        if (typeof window !== 'undefined') {
            try {
                const existingCharsStr = localStorage.getItem('globalCharacters');
                const existingChars: Character[] = existingCharsStr ? JSON.parse(existingCharsStr) : [];

                // Check if character with the same name already exists globally
                const charIndex = existingChars.findIndex(c => c.name.toLowerCase() === character.name.toLowerCase());
                if (charIndex > -1) {
                    // Update existing global character
                    existingChars[charIndex] = character;
                } else {
                    // Add new global character
                    existingChars.push(character);
                }

                localStorage.setItem('globalCharacters', JSON.stringify(existingChars));
                toast({ title: "Personnage Sauvegardé", description: `${character.name} est maintenant disponible globalement.` });
                // Trigger a re-render in CharacterSidebar by updating the character slightly (e.g., timestamp)
                // This helps remove the 'isPotentiallyNew' state visually.
                 handleCharacterUpdate({ ...character, _lastSaved: Date.now() } as any); // Add a dummy field or update timestamp

            } catch (error) {
                 console.error("Failed to save character to localStorage:", error);
                 toast({ title: "Erreur de Sauvegarde", description: "Impossible de sauvegarder le personnage globalement.", variant: "destructive" });
            }
        } else {
             toast({ title: "Erreur", description: "La sauvegarde globale n'est disponible que côté client.", variant: "destructive" });
        }
    };


   const handleSave = () => {
        // Implement saving logic (JSON format)
        console.log("Saving Adventure State...");
        const charactersToSave = characters.map(({ ...char }) => char);

        const saveData: SaveData = {
            adventureSettings,
            characters: charactersToSave,
            narrative,
            currentLanguage,
            saveFormatVersion: 1.2, // Current format version
            timestamp: new Date().toISOString(),
        };
        // Convert to JSON and offer download
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
                     // Attempt migration from old string format
                    if (typeof loadedData.narrative === 'string') {
                        console.warn("Migrating old string narrative format to message array.");
                        loadedData.narrative = [
                            { id: `migrated-${Date.now()}`, type: 'system', content: loadedData.narrative, timestamp: Date.now() }
                        ];
                    } else {
                        throw new Error("Structure des messages narratifs invalide.");
                    }
                }


                if (loadedData.saveFormatVersion === undefined || loadedData.saveFormatVersion < 1.2) {
                     console.log("Migrating old save format...");
                     loadedData.characters = loadedData.characters.map(c => ({
                        ...c,
                        history: Array.isArray(c.history) ? c.history : [],
                        opinion: typeof c.opinion === 'object' && c.opinion !== null ? c.opinion : {}, // Ensure opinion is an object
                     }));
                }

                setAdventureSettings(loadedData.adventureSettings);
                const rpgModeActive = loadedData.adventureSettings.rpgMode;
                const validatedCharacters = loadedData.characters.map((c: any) => ({
                    id: c.id || `${c.name?.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                    name: c.name || "Inconnu",
                    details: c.details || "",
                    history: c.history || [],
                    opinion: c.opinion || {},
                    portraitUrl: c.portraitUrl || null,
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
                 // Store the loaded characters as the new initial state for resets
                setInitialCharactersFromSettings(JSON.parse(JSON.stringify(validatedCharacters)));
                setNarrative(loadedData.narrative as Message[]);
                setCurrentLanguage(loadedData.currentLanguage || "fr");

                toast({ title: "Aventure Chargée", description: "L'état de l'aventure a été restauré." });
            } catch (error: any) {
                console.error("Error loading adventure:", error);
                toast({ title: "Erreur de Chargement", description: `Impossible de lire le fichier JSON: ${error.message}`, variant: "destructive" });
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    // Ref for file input
    const fileInputRef = React.useRef<HTMLInputElement>(null);


  // --- Render ---
  return (
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
        handleSaveNewCharacter={handleSaveNewCharacter}
        handleSave={handleSave}
        handleLoad={handleLoad}
        setCurrentLanguage={setCurrentLanguage}
        translateTextAction={translateText}
        generateAdventureAction={generateAdventure}
        generateSceneImageAction={generateSceneImage}
        handleEditMessage={handleEditMessage}
        handleRestartAdventure={handleRestartAdventure}
        handleRegenerateLastResponse={handleRegenerateLastResponse}
      />
  );
}
