
"use client"; // Mark page as Client Component to manage state

import * as React from "react"; // Import React
import Image from "next/image";
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"; // Added TooltipContent import
import { Save, Upload, Image as ImageIcon, Bot, Languages, Users, Map, Wand2, Settings, BookUser, Scroll } from 'lucide-react'; // Added Scroll for History
import { AdventureForm } from '@/components/adventure-form';
import { AdventureDisplay } from '@/components/adventure-display';
import { ModelLoader } from '@/components/model-loader';
import { LanguageSelector } from "@/components/language-selector";
import { CharacterSidebar } from "@/components/character-sidebar"; // Import CharacterSidebar
import { useToast } from "@/hooks/use-toast"; // Import useToast
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"; // Added Accordion

// Import AI functions here
import { generateAdventure } from "@/ai/flows/generate-adventure";
import { generateSceneImage } from "@/ai/flows/generate-scene-image";
import { translateText } from "@/ai/flows/translate-text";

// Define types for shared state (consider moving to a dedicated types file)
interface Character {
  id: string; // Unique ID for the character
  name: string;
  details: string; // Base description from the form
  // RPG specific fields (optional based on rpgMode)
  stats?: Record<string, number | string>; // e.g., { HP: 10, STR: 5, Class: 'Warrior' }
  inventory?: Record<string, number>; // e.g., { Gold: 100, Sword: 1 }
  history?: string[]; // Log of important events/interactions
  opinion?: Record<string, string>; // e.g., { Player: 'Friendly', Rina: 'Suspicious' }
  portraitUrl?: string | null; // URL for generated portrait
}

export default function Home() {
  // State Management (moved to client component)
  const [adventureSettings, setAdventureSettings] = React.useState({
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
        // updateCharacterStateFromNarrative(newNarrativePart);
      }
   };

   const handleCharacterUpdate = (updatedCharacter: Character) => {
       setCharacters(prev => prev.map(c => c.id === updatedCharacter.id ? updatedCharacter : c));
   };

   const handleSave = () => {
        // Implement saving logic (JSON format)
        console.log("Saving Adventure State...");
        const saveData = {
            adventureSettings,
            characters,
            narrative,
            currentLanguage,
            // timestamp?
        };
        // Convert to JSON and offer download or save to backend/localStorage
        const jsonString = JSON.stringify(saveData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aventurier_textuel_${new Date().toISOString()}.json`;
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
                const loadedData = JSON.parse(jsonString);

                // Add validation for loadedData structure
                 if (!loadedData.adventureSettings || !loadedData.characters || !loadedData.narrative) {
                    throw new Error("Invalid save file structure.");
                 }

                setAdventureSettings(loadedData.adventureSettings);
                 // Ensure loaded characters have necessary fields
                const validatedCharacters = loadedData.characters.map((c: any) => ({
                    id: c.id || `${c.name?.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
                    name: c.name || "Unknown",
                    details: c.details || "",
                    stats: loadedData.adventureSettings.rpgMode ? (c.stats || {}) : undefined,
                    inventory: loadedData.adventureSettings.rpgMode ? (c.inventory || {}) : undefined,
                    history: c.history || [],
                    opinion: c.opinion || {},
                    portraitUrl: c.portraitUrl || null,
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
  return (
    <SidebarProvider defaultOpen>
       {/* Left Sidebar: Configuration & Global Elements */}
      <Sidebar side="left" variant="sidebar" collapsible="icon">
        <SidebarHeader className="p-4 border-b border-sidebar-border">
          <h1 className="text-xl font-semibold text-sidebar-foreground">Aventurier Textuel</h1>
        </SidebarHeader>
        <ScrollArea className="flex-1">
           <SidebarContent className="p-4 space-y-4">
             {/* Pass state and callback to AdventureForm */}
            <AdventureForm
                initialValues={{ ...adventureSettings, characters: characters }} // Pass full initial state including characters
                onSettingsChange={handleSettingsUpdate} // Pass update callback
            />
            <ModelLoader /> {/* Model Loader moved here */}

             {/* Characters Section moved to Left Sidebar */}
            <Accordion type="single" collapsible className="w-full" defaultValue="characters-accordion">
               <AccordionItem value="characters-accordion">
                <AccordionTrigger>Personnages Secondaires</AccordionTrigger>
                <AccordionContent>
                    {/* Use CharacterSidebar component directly */}
                     <CharacterSidebar
                        characters={characters}
                        onCharacterUpdate={handleCharacterUpdate}
                        generateImageAction={generateSceneImage} // Pass image generation for portraits
                        rpgMode={adventureSettings.rpgMode} // Pass RPG mode status
                        // Indicate it's embedded in the left sidebar for styling/layout adjustments if needed
                        // embedded={true} // Example prop
                    />
                 </AccordionContent>
              </AccordionItem>
            </Accordion>

          </SidebarContent>
        </ScrollArea>
        <SidebarFooter className="p-4 border-t border-sidebar-border flex flex-col space-y-2">
            {/* Load Button */}
            <TooltipProvider>
                 <Tooltip>
                    <TooltipTrigger asChild>
                         <Button variant="outline" className="w-full justify-start group-data-[collapsible=icon]:justify-center" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="h-5 w-5" />
                            <span className="ml-2 group-data-[collapsible=icon]:hidden">Charger</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="center">Charger une Aventure (JSON)</TooltipContent>
                 </Tooltip>
            </TooltipProvider>
            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleLoad}
                className="hidden"
            />
           {/* Settings Button */}
           <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center">
                  <Settings className="h-5 w-5" />
                  <span className="ml-2 group-data-[collapsible=icon]:hidden">Paramètres (Future)</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" align="center">Paramètres Globaux</TooltipContent>
            </Tooltip>
           </TooltipProvider>
        </SidebarFooter>
      </Sidebar>

       {/* Main Content Area */}
      <SidebarInset className="flex flex-col h-screen">
        <header className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
           <div className="flex items-center space-x-2">
             <SidebarTrigger /> {/* Trigger for Left Sidebar */}
             <span className="font-semibold">Aventure</span>
           </div>
          <div className="flex items-center space-x-2">
            {/* Pass translateText function and current language state */}
            <LanguageSelector
                translateTextAction={translateText}
                currentText={narrative} // Pass current narrative for translation context
                onLanguageChange={setCurrentLanguage} // Update language state
                currentLanguage={currentLanguage}
            />
             <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleSave}>
                    <Save className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                 <TooltipContent>Sauvegarder l'Aventure (JSON)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
             {/* Right Sidebar Trigger REMOVED as CharacterSidebar is now on the left */}
             {/* <SidebarTrigger data-sidebar-target="character-sidebar" /> */}
          </div>
        </header>
        <main className="flex-1 overflow-hidden p-4"> {/* Removed flex-row */}
           {/* Adventure Display takes full space */}
           {/* <div className="flex-1 overflow-hidden p-4"> */}
             <AdventureDisplay
                generateAdventureAction={generateAdventure}
                generateSceneImageAction={generateSceneImage}
                world={adventureSettings.world} // Pass world setting
                characters={characters} // Pass characters array (needed for context)
                initialNarrative={narrative} // Pass initial narrative
                onNarrativeChange={handleNarrativeUpdate} // Pass narrative update callback
                rpgMode={adventureSettings.rpgMode} // Pass RPG mode status
             />
           {/* </div> */}

            {/* Right Sidebar REMOVED */}
            {/* <CharacterSidebar ... /> */}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

    