"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Image as ImageIcon, Send, BrainCircuit, Users, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateAdventure, GenerateAdventureInput } from "@/ai/flows/generate-adventure";
import { generateSceneImage } from "@/ai/flows/generate-scene-image";
import { useToast } from "@/hooks/use-toast";

// Mock data for initial state and characters
const initialWorld = "Grande université populaire nommée \"hight scoole of futur\".";
const initialSituation = "Vous marchez dans les couloirs animés de Hight School of Future lorsque vous apercevez Rina, votre petite amie, en pleine conversation avec Kentaro, votre meilleur ami. Ils semblent étrangement proches, riant doucement. Un sentiment de malaise vous envahit.";
const initialCharacters = [
    "Rina: jeune femme de 19 ans, votre petite amie. Elle se rapproche de Kentaro. Étudiante populaire, calme, aimante, parfois secrète. 165 cm, yeux marron, cheveux mi-longs bruns, traits fins, athlétique.",
    "Kentaro: Jeune homme de 20 ans, votre meilleur ami. Étudiant populaire, charmant mais calculateur et impulsif. 185 cm, athlétique, yeux bleus, cheveux courts blonds. Aime draguer et voir son meilleur ami souffrir. Se rapproche de Rina."
];


export function AdventureDisplay() {
  const [narrative, setNarrative] = React.useState<string>(initialSituation);
  const [userAction, setUserAction] = React.useState<string>("");
  const [choices, setChoices] = React.useState<string[]>([]); // For multiple-choice buttons
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isImageLoading, setIsImageLoading] = React.useState<boolean>(false);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null); // State for the generated image URL
  const [currentMode, setCurrentMode] = React.useState<"exploration" | "dialogue">("exploration");

  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
   const { toast } = useToast();

  // Function to handle sending user action
  const handleSendAction = async () => {
    if (!userAction.trim() || isLoading) return;

    setIsLoading(true);
    setNarrative(prev => prev + `\n\n> ${userAction}\n`); // Append user action immediately

    try {
        // Prepare input for the AI
        const input: GenerateAdventureInput = {
            world: initialWorld, // Replace with actual world data from state/props if dynamic
            initialSituation: narrative, // Use the current narrative as the situation
            secondaryCharacters: initialCharacters, // Replace with actual characters data
            userAction: userAction,
        };

        // Call the AI function
        const result = await generateAdventure(input);
        setNarrative(prev => prev + `\n${result.narrative}`);
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
         setNarrative(prev => prev + "\n\n[Erreur lors de la génération de la suite.]"); // Show error in narrative
    } finally {
        setIsLoading(false);
    }
  };

  // Function to handle generating scene image
  const handleGenerateImage = async () => {
     if (isImageLoading) return;
     setIsImageLoading(true);
     setImageUrl(null); // Clear previous image

    try {
        // Use the current narrative (or a summary) as the scene description
        const sceneDescription = narrative.split('\n').slice(-5).join('\n'); // Example: use last 5 lines
        const result = await generateSceneImage({ sceneDescription });
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


  // Handle Enter key press in textarea
  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendAction();
    }
  };

   // Scroll to bottom when narrative updates
  React.useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if(scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [narrative]);


  return (
    <div className="flex flex-col h-full overflow-hidden">
       <Tabs defaultValue="exploration" value={currentMode} onValueChange={(value) => setCurrentMode(value as "exploration" | "dialogue")} className="mb-2">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="exploration"><Map className="mr-2 h-4 w-4" />Exploration</TabsTrigger>
          <TabsTrigger value="dialogue" disabled><Users className="mr-2 h-4 w-4" />Dialogue (Future)</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex-1 flex gap-4 overflow-hidden">
           {/* Narrative and Input Section */}
            <Card className="flex-1 flex flex-col overflow-hidden">
                <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
                    <pre className="text-sm whitespace-pre-wrap break-words font-sans">
                        {narrative}
                        {isLoading && (
                            <span className="flex items-center text-muted-foreground">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Écriture en cours...
                            </span>
                        )}
                    </pre>
                    </ScrollArea>
                </CardContent>
                <CardFooter className="p-4 border-t flex flex-col items-stretch gap-2">
                    {/* Multiple Choice Buttons (if any) */}
                    {choices.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                        {choices.map((choice, index) => (
                            <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setUserAction(choice);
                                // Optionally send action immediately on choice click
                                // handleSendAction(); // Uncomment if needed
                            }}
                            disabled={isLoading}
                            >
                            {choice}
                            </Button>
                        ))}
                        </div>
                    )}

                    {/* User Input Textarea */}
                    <div className="flex gap-2">
                        <Textarea
                        placeholder={currentMode === 'exploration' ? "Que faites-vous ? Décrivez votre action..." : "Votre message..."}
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

             {/* Image Generation Section */}
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
                                layout="fill"
                                objectFit="contain"
                                data-ai-hint="adventure scene"
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
                    {/* Add save image and new portrait buttons later */}
                </CardFooter>
            </Card>
      </div>


    </div>
  );
}
