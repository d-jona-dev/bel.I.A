
"use client"; // Mark page as Client Component to manage state

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { Character, AdventureSettings, SaveData } from "@/types"; // Import shared types
import { PageStructure } from "./page.structure"; // Import the layout structure component

// Import AI functions here
import { generateAdventure } from "@/ai/flows/generate-adventure";
import { generateSceneImage } from "@/ai/flows/generate-scene-image";
import { translateText } from "@/ai/flows/translate-text";


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
  const [narrative, setNarrative] = React.useState<string>(adventureSettings.initialSituation);
  const [currentLanguage, setCurrentLanguage] = React.useState<string>("fr"); // Add state for language
  const { toast } = useToast();

  // --- Callback Functions ---

  const handleSettingsUpdate = (newSettings: any /* Type from AdventureForm */) => {
    console.log("Updating global settings:", newSettings);
    setAdventureSettings({
        world: newSettings.world,
        initialSituation: newSettings.initialSituation, // Potentially reset narrative if situation changes?
        rpgMode: newSettings.enableRpgMode ?? false,
    });
    // Update character list from form (simple overwrite for now)
     const updatedChars = newSettings.characters.map((c: any, index: number) => {
        // Try to find existing character by name if ID is missing or new
        const existingChar = characters.find(ec => ec.name === c.name);
        const id = existingChar?.id || characters[index]?.id || `${c.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
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
            spells: newSettings.enableRpgMode ? (existingChar?.spells || characters.find(ec => ec.id === id)?.spells || []) : undefined,
            techniques: newSettings.enableRpgMode ? (existingChar?.techniques || characters.find(ec => ec.id === id)?.techniques || []) : undefined,
            passiveAbilities: newSettings.enableRpgMode ? (existingChar?.passiveAbilities || characters.find(ec => ec.id === id)?.passiveAbilities || []) : undefined,

        };
    });
    setCharacters(updatedChars);

    // Reset narrative only if initial situation changes significantly
    if (newSettings.initialSituation !== adventureSettings.initialSituation) {
         setNarrative(newSettings.initialSituation);
    }

    toast({ title: "Configuration Mise à Jour" });
  };

   const handleNarrativeUpdate = (newNarrativePart: string, isUserAction: boolean = false) => {
     setNarrative(prev => prev + (isUserAction ? `\n\n> ${newNarrativePart}\n` : `\n${newNarrativePart}`));
      // TODO: Analyze newNarrativePart with LLM to update character history, opinion, inventory, stats if RPG mode is on.
      if (adventureSettings.rpgMode) {
        // Call an AI flow here to parse the narrative and update character state
        console.log("RPG Mode: Need to analyze narrative to update characters:", newNarrativePart);
        // updateCharacterStateFromNarrative(newNarrativePart); // Placeholder for future AI analysis
      }
   };

   const handleCharacterUpdate = (updatedCharacter: Character) => {
       setCharacters(prev => prev.map(c => c.id === updatedCharacter.id ? updatedCharacter : c));
       console.log("Character updated:", updatedCharacter); // Debug log
   };

   const handleSave = () => {
        // Implement saving logic (JSON format)
        console.log("Saving Adventure State...");
        const saveData: SaveData = {
            adventureSettings,
            characters,
            narrative,
            currentLanguage,
            saveFormatVersion: 1, // Add versioning
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
                 if (!loadedData.adventureSettings || !loadedData.characters || loadedData.narrative === undefined) {
                    throw new Error("Structure de fichier de sauvegarde invalide.");
                 }

                // Perform migrations if loadedData.saveFormatVersion is different from current
                // if (loadedData.saveFormatVersion !== 1) { /* ... migration logic ... */ }

                setAdventureSettings(loadedData.adventureSettings);
                 // Ensure loaded characters have necessary fields, providing defaults
                const validatedCharacters = loadedData.characters.map((c: any) => ({
                    id: c.id || `${c.name?.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
                    name: c.name || "Inconnu",
                    details: c.details || "",
                    stats: loadedData.adventureSettings!.rpgMode ? (c.stats || {}) : undefined,
                    inventory: loadedData.adventureSettings!.rpgMode ? (c.inventory || {}) : undefined,
                    history: c.history || [],
                    opinion: c.opinion || {},
                    portraitUrl: c.portraitUrl || null,
                    // Add defaults for new RPG fields if loading older save
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
                setNarrative(loadedData.narrative);
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
        narrative={narrative}
        currentLanguage={currentLanguage}
        fileInputRef={fileInputRef}
        handleSettingsUpdate={handleSettingsUpdate}
        handleNarrativeUpdate={handleNarrativeUpdate}
        handleCharacterUpdate={handleCharacterUpdate}
        handleSave={handleSave}
        handleLoad={handleLoad}
        setCurrentLanguage={setCurrentLanguage}
        translateTextAction={translateText}
        generateAdventureAction={generateAdventure}
        generateSceneImageAction={generateSceneImage}
      />
  );
}
