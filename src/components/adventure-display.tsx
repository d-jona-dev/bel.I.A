
"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Image as ImageIcon, Send, BrainCircuit, Users, Loader2, Map, Wand2, Swords, Shield, Sparkles, ScrollText } from "lucide-react"; // Added RPG icons
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { GenerateAdventureInput, GenerateAdventureOutput } from "@/ai/flows/generate-adventure"; // Import types only
import type { GenerateSceneImageInput, GenerateSceneImageOutput } from "@/ai/flows/generate-scene-image"; // Import types only
import { useToast } from "@/hooks/use-toast";

// Define Character type locally or import if shared
interface Character {
  id: string;
  name: string;
  details: string;
  // RPG fields are optional
  stats?: Record<string, number | string>;
  inventory?: Record<string, number>;
  // ... other potential fields
}


// Define prop types including new props
interface AdventureDisplayProps {
    generateAdventureAction: (input: GenerateAdventureInput) => Promise<GenerateAdventureOutput>;
    generateSceneImageAction: (input: GenerateSceneImageInput) => Promise<GenerateSceneImageOutput>;
    world: string; // New prop
    characters: Character[]; // New prop - Use the detailed Character type
    initialNarrative: string; // New prop
    onNarrativeChange: (newNarrativePart: string, isUserAction?: boolean) => void; // Callback for narrative updates
    rpgMode: boolean; // New prop to control RPG UI elements
}


export function AdventureDisplay({
    generateAdventureAction,
    generateSceneImageAction,
    world,
    characters,
    initialNarrative,
    onNarrativeChange,
    rpgMode,
}: AdventureDisplayProps) {
  // Local state derived from props or specific to this component
  const [narrativeContent, setNarrativeContent] = React.useState<string>(initialNarrative); // Internal display state
  const [userAction, setUserAction] = React.useState<string>("");
  const [choices, setChoices] = React.useState<string[]>([]); // For multiple-choice buttons
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isImageLoading, setIsImageLoading] = React.useState<boolean>(false);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null); // State for the generated image URL
  const [currentMode, setCurrentMode] = React.useState<"exploration" | "dialogue" | "combat">("exploration"); // Added combat mode

  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const { toast } = useToast();

   // Effect to update internal narrative state when prop changes
    React.useEffect(() => {
        setNarrativeContent(initialNarrative);
    }, [initialNarrative]);


  // Function to handle sending user action
  const handleSendAction = async () => {
    if (!userAction.trim() || isLoading) return;

    setIsLoading(true);
    // Call the callback to update the parent state immediately for user action
    onNarrativeChange(userAction, true);
    // Update local state immediately as well
    setNarrativeContent(prev => prev + `\n\n> ${userAction}\n`);

    try {
        // Prepare input for the AI
        const input: GenerateAdventureInput = {
            world: world,
            initialSituation: narrativeContent + `\n\n> ${userAction}\n`, // Use the *current* full narrative + action
             // Map characters to strings for the basic AI flow
             // TODO: Adapt AI flow to potentially accept structured character data
             secondaryCharacters: characters.map(c => `${c.name}: ${c.details}`),
            userAction: userAction,
             // TODO: Add context about current mode (exploration/dialogue/combat)
             // TODO: Add context about RPG stats/inventory if rpgMode is true
        };

        // Add RPG context if enabled
        if (rpgMode) {
            // This is a placeholder. The actual prompt needs to be designed
            // to understand and utilize this structured data effectively.
             input.promptConfig = { // Example of adding extra config
                 rpgContext: {
                    playerStats: { /* Player stats */ },
                    characterDetails: characters.map(c => ({
                        name: c.name,
                        stats: c.stats,
                        inventory: c.inventory,
                        // Maybe recent history or current opinion?
                    })),
                    mode: currentMode,
                 }
             };
        }


        // Call the AI function passed via props
        const result = await generateAdventureAction(input);

        // Call the callback to update the parent state with the AI's response
        onNarrativeChange(result.narrative);
         // Update local state
        setNarrativeContent(prev => prev + `\n${result.narrative}`);

        setUserAction(""); // Clear input field
        // TODO: Potentially generate new choices based on the result.narrative
        setChoices([]); // Clear old choices

    } catch (error) {
        console.error("Error generating adventure:", error);
        toast({
            title: "Erreur de Génération",
            description: "Impossible de générer la suite de l'aventure. Veuillez réessayer.",
            variant: "destructive",
        });
         // Update local state with error message
         const errorMsg = "\n\n[Erreur lors de la génération de la suite.]";
         setNarrativeContent(prev => prev + errorMsg);
         // Also inform parent component about the error state in narrative
         onNarrativeChange(errorMsg);

    } finally {
        setIsLoading(false);
    }
  };

  // Function to handle generating scene image (remains largely the same)
  const handleGenerateImage = async () => {
     if (isImageLoading) return;
     setIsImageLoading(true);
     setImageUrl(null);

    try {
        // Use the current narrative content
        const narrativeLines = narrativeContent.split('\n');
        const lastLines = narrativeLines.slice(-5).join('\n');
        const sceneDescription = lastLines.length > 500 ? lastLines.slice(-500) : lastLines;

        const result = await generateSceneImageAction({ sceneDescription });
        setImageUrl(result.imageUrl);
         toast({
            title: "Image Générée",
            description: "L'image de la scène a été générée avec succès.",
        });
    } catch (error) {
        console.error("Error generating scene image:", error);
         toast({
            title: "Erreur de Génération d'Image",
            description: "Impossible de générer l'image de la scène.",
            variant: "destructive",
        });
    } finally {
        setIsImageLoading(false);
    }
  };


  // Handle Enter key press in textarea (remains the same)
  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendAction();
    }
  };

   // Scroll to bottom when narrative updates (remains the same)
  React.useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
      if(scrollElement) {
          setTimeout(() => {
             scrollElement.scrollTop = scrollElement.scrollHeight;
          }, 0);
      }
    }
  }, [narrativeContent]); // Depends on the local narrative content


  return (
    <div className="flex flex-col h-full overflow-hidden">
       {/* Tabs for different modes */}
       <Tabs defaultValue="exploration" value={currentMode} onValueChange={(value) => setCurrentMode(value as any)} className="mb-2">
        <TabsList className={`grid w-full ${rpgMode ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="exploration"><Map className="mr-2 h-4 w-4" />Exploration</TabsTrigger>
          <TabsTrigger value="dialogue" disabled><Users className="mr-2 h-4 w-4" />Dialogue (Future)</TabsTrigger>
          {rpgMode && <TabsTrigger value="combat" disabled><Swords className="mr-2 h-4 w-4" />Combat (Future)</TabsTrigger>}
        </TabsList>
      </Tabs>

      <div className="flex-1 flex gap-4 overflow-hidden">
           {/* Narrative and Input Section */}
            <Card className="flex-1 flex flex-col overflow-hidden">
                <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
                        <div className="text-sm whitespace-pre-wrap break-words font-sans">
                            {narrativeContent} {/* Display local narrative content */}
                            {isLoading && (
                                <span className="flex items-center text-muted-foreground mt-2">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Écriture en cours...
                                </span>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
                <CardFooter className="p-4 border-t flex flex-col items-stretch gap-2">
                    {/* Multiple Choice Buttons */}
                    {choices.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                            {choices.map((choice, index) => (
                                <Button key={index} variant="outline" size="sm" onClick={() => setUserAction(choice)} disabled={isLoading}>
                                    {choice}
                                </Button>
                            ))}
                        </div>
                    )}

                     {/* RPG Action Buttons (only if rpgMode is true) */}
                    {rpgMode && (
                        <div className="flex flex-wrap gap-2 mb-2">
                             <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild><Button variant="secondary" size="sm" disabled={isLoading}><Shield className="h-4 w-4 mr-1"/>Défendre</Button></TooltipTrigger>
                                    <TooltipContent>Action de combat : Se défendre.</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild><Button variant="secondary" size="sm" disabled={isLoading}><Sparkles className="h-4 w-4 mr-1"/>Sort/Comp.</Button></TooltipTrigger>
                                    <TooltipContent>Ouvrir le menu des sorts et compétences.</TooltipContent>
                                </Tooltip>
                                 <Tooltip>
                                    <TooltipTrigger asChild><Button variant="secondary" size="sm" disabled={isLoading}><ScrollText className="h-4 w-4 mr-1"/>Inventaire</Button></TooltipTrigger>
                                    <TooltipContent>Ouvrir l'inventaire.</TooltipContent>
                                </Tooltip>
                                {/* Add more RPG actions as needed */}
                            </TooltipProvider>
                        </div>
                    )}


                    {/* User Input Textarea */}
                    <div className="flex gap-2">
                        <Textarea
                            placeholder={currentMode === 'exploration' ? "Que faites-vous ? Décrivez votre action..." : (currentMode === 'combat' ? "Décrivez votre action de combat..." : "Votre message...")}
                            value={userAction}
                            onChange={(e) => setUserAction(e.target.value)}
                            onKeyPress={handleKeyPress}
                            rows={1}
                            className="min-h-[40px] max-h-[150px] resize-y"
                            disabled={isLoading}
                        />
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button type="button" size="icon" onClick={handleSendAction} disabled={isLoading || !userAction.trim()}>
                                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Envoyer</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </CardFooter>
            </Card>

             {/* Image Generation Section (remains the same) */}
            <Card className="w-1/3 lg:w-1/4 hidden md:flex flex-col overflow-hidden">
                <CardContent className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden">
                    {isImageLoading ? (
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin mb-2" />
                            <p>Génération de l'image...</p>
                        </div>
                    ) : imageUrl ? (
                         <div className="relative w-full h-full">
                            <Image
                                src={imageUrl}
                                alt="Generated Scene"
                                fill
                                style={{ objectFit: 'contain' }}
                                data-ai-hint="adventure scene"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                            />
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground">
                            <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                            <p>Aucune image générée pour cette scène.</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="p-4 border-t">
                    <TooltipProvider>
                        <Tooltip>
                             <TooltipTrigger asChild>
                                <Button className="w-full" onClick={handleGenerateImage} disabled={isImageLoading || isLoading}>
                                    <Wand2 className="mr-2 h-4 w-4" />
                                    Générer Image Scène
                                </Button>
                             </TooltipTrigger>
                             <TooltipContent>Utilise l'IA pour générer une image basée sur la description actuelle.</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </CardFooter>
            </Card>
      </div>


    </div>
  );
}

// Helper type for potential prompt configuration
declare module "@/ai/flows/generate-adventure" {
  interface GenerateAdventureInput {
    promptConfig?: {
        rpgContext?: {
            playerStats?: any;
            characterDetails?: any[];
            mode?: string;
        };
    };
  }
}
