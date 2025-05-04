
"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Image as ImageIcon, Send, Loader2, Map, Wand2, Swords, Shield, Sparkles, ScrollText, Copy, Edit, RotateCcw, User as UserIcon, Bot, Undo, Users, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { GenerateAdventureInput, GenerateAdventureOutput } from "@/ai/flows/generate-adventure"; // Import types only
import type { GenerateSceneImageInput, GenerateSceneImageOutput } from "@/ai/flows/generate-scene-image"; // Import types only
import { useToast } from "@/hooks/use-toast";
import type { Message, Character } from "@/types"; // Import Message and Character types
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger, // Import AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label";


// Define prop types including new props for message handling
interface AdventureDisplayProps {
    generateAdventureAction: (input: GenerateAdventureInput) => Promise<GenerateAdventureOutput>;
    generateSceneImageAction: (input: GenerateSceneImageInput) => Promise<GenerateSceneImageOutput>;
    world: string;
    characters: Character[];
    initialMessages: Message[]; // Changed from initialNarrative: string
    onNarrativeChange: (content: string, type: 'user' | 'ai', sceneDesc?: string) => void; // Callback for adding new messages, include optional sceneDesc
    rpgMode: boolean;
    onEditMessage: (messageId: string, newContent: string) => void; // Callback for editing a message
    onRewindToMessage: (messageId: string) => void; // Callback for rewinding to a message
    onUndoLastMessage: () => void; // Callback for undoing the last message
    onRegenerateLastResponse: () => Promise<void>; // Callback for regenerating the last AI response
}


export function AdventureDisplay({
    generateAdventureAction,
    generateSceneImageAction,
    world,
    characters,
    initialMessages, // Use initialMessages
    onNarrativeChange, // Use the updated handler
    rpgMode,
    onEditMessage,
    onRewindToMessage,
    onUndoLastMessage,
    onRegenerateLastResponse, // New handler
}: AdventureDisplayProps) {
  // Local state for messages derived from props
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  const [userAction, setUserAction] = React.useState<string>("");
  const [choices, setChoices] = React.useState<string[]>([]); // For multiple-choice buttons
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isImageLoading, setIsImageLoading] = React.useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = React.useState<boolean>(false); // State for regenerate loading
  const [imageUrl, setImageUrl] = React.useState<string | null>(null); // State for the generated image URL
  const [currentMode, setCurrentMode] = React.useState<"exploration" | "dialogue" | "combat">("exploration"); // Added combat mode
  const [currentSceneDescription, setCurrentSceneDescription] = React.useState<string | null>(null); // State for image prompt

  const [editingMessage, setEditingMessage] = React.useState<Message | null>(null);
  const [editContent, setEditContent] = React.useState<string>("");

  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const { toast } = useToast();

   // Effect to update internal messages state when prop changes
    React.useEffect(() => {
        setMessages(initialMessages);
        // Find the scene description associated with the latest AI message
        const latestAiMessage = [...initialMessages].reverse().find(m => m.type === 'ai' && m.sceneDescription);
        setCurrentSceneDescription(latestAiMessage?.sceneDescription || null);
    }, [initialMessages]);


  // Function to handle sending user action
  const handleSendAction = async () => {
    if (!userAction.trim() || isLoading || isRegenerating) return;

    setIsLoading(true);
    const userMessageContent = userAction.trim();
    setUserAction(""); // Clear input immediately

    // Call the callback to update the parent state immediately for user action
    onNarrativeChange(userMessageContent, 'user');
    // Update local state immediately as well - handled by useEffect on initialMessages change

    try {
        // Combine current messages content for context
        // Send only the last few messages for context to avoid overly large inputs
        const contextMessages = messages.slice(-5); // Adjust number as needed
        const narrativeContext = contextMessages.map(msg =>
            msg.type === 'user' ? `> ${msg.content}` : msg.content
        ).join('\n\n') + `\n\n> ${userMessageContent}\n`; // Append new user action

        // Prepare input for the AI
        const input: GenerateAdventureInput = {
            world: world,
            // Use limited context for initialSituation
            initialSituation: narrativeContext,
             // Map characters to strings for the basic AI flow
             // TODO: Adapt AI flow to potentially accept structured character data
             secondaryCharacters: characters.map(c => `${c.name}: ${c.details}`),
            userAction: userMessageContent, // Send only the current user action
        };

        // Add RPG context if enabled
        if (rpgMode) {
             input.promptConfig = {
                 rpgContext: {
                    playerStats: { /* Player stats placeholder */ },
                    characterDetails: characters.map(c => ({
                        name: c.name,
                        stats: c.stats,
                        inventory: c.inventory,
                    })),
                    mode: currentMode,
                 }
             };
        }


        // Call the AI function passed via props
        const result = await generateAdventureAction(input);

        // Call the callback to update the parent state with the AI's response and scene description
        onNarrativeChange(result.narrative, 'ai', result.sceneDescriptionForImage);
        setCurrentSceneDescription(result.sceneDescriptionForImage || null); // Update local state too

        // TODO: Potentially generate new choices based on the result.narrative
        setChoices([]); // Clear old choices

    } catch (error) {
        console.error("Error generating adventure:", error);
        toast({
            title: "Erreur de Génération",
            description: "Impossible de générer la suite de l'aventure. Veuillez réessayer.",
            variant: "destructive",
        });
         // Don't add error as a message, just toast.
    } finally {
        setIsLoading(false);
    }
  };

  // Function to handle regenerating the last response
  const handleRegenerate = async () => {
    if (isLoading || isRegenerating) return;
    setIsRegenerating(true);
    try {
        await onRegenerateLastResponse(); // Call the function passed from parent
    } catch (error) {
        // Error handling is likely done in the parent, but log here too
        console.error("Error during regeneration triggered from display:", error);
    } finally {
        setIsRegenerating(false);
    }
  };


  // Function to handle generating scene image
  const handleGenerateImage = async () => {
     if (isImageLoading || !currentSceneDescription || isLoading || isRegenerating) {
         if (!currentSceneDescription) {
            toast({
                title: "Description manquante",
                description: "Impossible de générer une image car la description de la scène n'est pas disponible.",
                variant: "destructive",
            });
         }
         return;
     };
     setIsImageLoading(true);
     setImageUrl(null);

    try {
        // Use the scene description provided by the main LLM
        const result = await generateSceneImageAction({ sceneDescription: currentSceneDescription });
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

   // Function to handle copying message content
   const handleCopyMessage = (content: string) => {
        navigator.clipboard.writeText(content).then(() => {
            toast({ title: "Copié", description: "Message copié dans le presse-papiers." });
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            toast({ title: "Erreur", description: "Impossible de copier le message.", variant: "destructive" });
        });
   };

    // Function to open the edit dialog
    const openEditDialog = (message: Message) => {
        setEditingMessage(message);
        setEditContent(message.content);
    };

    // Function to handle saving the edited message
    const handleSaveChanges = () => {
        if (editingMessage && editContent.trim()) {
            onEditMessage(editingMessage.id, editContent.trim());
            setEditingMessage(null);
        }
    };


  // Handle Enter key press in textarea
  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendAction();
    }
  };

   // Scroll to bottom when messages update
  React.useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
      if(scrollElement) {
          setTimeout(() => {
             scrollElement.scrollTop = scrollElement.scrollHeight;
          }, 100); // Small delay to ensure rendering is complete
      }
    }
  }, [messages]); // Depends on the messages array


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
                        <div className="space-y-4">
                            {messages.map((message, index) => {
                                const isLastMessage = index === messages.length - 1;
                                const isLastAiMessage = isLastMessage && message.type === 'ai';

                                return (
                                    <div key={message.id} className="group relative flex flex-col">
                                        <div className={`flex items-start gap-3 ${message.type === 'user' ? 'justify-end' : ''}`}>
                                        {message.type !== 'user' && message.type !== 'system' && (
                                            <Avatar className="h-8 w-8 border">
                                                <AvatarFallback><Bot className="h-5 w-5 text-muted-foreground"/></AvatarFallback>
                                            </Avatar>
                                        )}
                                        <div className={`relative rounded-lg p-3 max-w-[80%] text-sm whitespace-pre-wrap break-words font-sans ${
                                                message.type === 'user' ? 'bg-primary text-primary-foreground' : (message.type === 'ai' ? 'bg-muted' : 'bg-transparent border italic text-muted-foreground')
                                            }`}>
                                                {message.content}

                                                {/* Action buttons on hover - positioned outside the bubble */}
                                                <div className={`absolute top-0 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 ${message.type === 'user' ? 'left-0 -translate-x-full mr-1' : 'right-0 translate-x-full ml-1'}`}>
                                                    {/* Rewind Button (show on non-last messages) */}
                                                    {index < messages.length - 1 && message.type !== 'system' && (
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                                                                                <RotateCcw className="h-4 w-4" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top">Revenir ici</TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                <AlertDialogTitle>Revenir à ce message ?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Cela effacera tous les messages suivants dans l'historique de l'aventure. Cette action est irréversible.
                                                                </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => onRewindToMessage(message.id)}>Confirmer</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    )}
                                                    {/* Edit Button (allow editing user and AI messages, not system) */}
                                                    {message.type !== 'system' && (
                                                        <AlertDialog open={editingMessage?.id === message.id} onOpenChange={(open) => !open && setEditingMessage(null)}>
                                                            <AlertDialogTrigger asChild>
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => openEditDialog(message)}>
                                                                                <Edit className="h-4 w-4" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top">Modifier</TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Modifier le Message</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                Modifiez le contenu du message ci-dessous.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <Textarea
                                                                    value={editContent}
                                                                    onChange={(e) => setEditContent(e.target.value)}
                                                                    rows={10}
                                                                    className="my-4"
                                                                />
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel onClick={() => setEditingMessage(null)}>Annuler</AlertDialogCancel>
                                                                <AlertDialogAction onClick={handleSaveChanges}>Enregistrer</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    )}
                                                    {/* Copy Button */}
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => handleCopyMessage(message.content)}>
                                                                    <Copy className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top">Copier</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>

                                                    {/* Regenerate Button (only on last AI message) */}
                                                    {isLastAiMessage && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={handleRegenerate} disabled={isLoading || isRegenerating}>
                                                                        {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top">Régénérer</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                </div>
                                            </div>
                                            {message.type === 'user' && (
                                                <Avatar className="h-8 w-8 border">
                                                    <AvatarFallback><UserIcon className="h-5 w-5 text-muted-foreground"/></AvatarFallback>
                                                </Avatar>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {isLoading && !isRegenerating && ( // Don't show "writing" if regenerating
                                <div className="flex items-center justify-start gap-3">
                                     <Avatar className="h-8 w-8 border">
                                         <AvatarFallback><Bot className="h-5 w-5 text-muted-foreground"/></AvatarFallback>
                                     </Avatar>
                                     <span className="flex items-center text-muted-foreground italic p-3">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Écriture en cours...
                                    </span>
                                </div>
                            )}
                             {isRegenerating && ( // Show regenerating indicator separately
                                <div className="flex items-center justify-start gap-3">
                                    <Avatar className="h-8 w-8 border">
                                        <AvatarFallback><Bot className="h-5 w-5 text-muted-foreground"/></AvatarFallback>
                                    </Avatar>
                                    <span className="flex items-center text-muted-foreground italic p-3">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Régénération...
                                    </span>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
                <CardFooter className="p-4 border-t flex flex-col items-stretch gap-2">
                    {/* Multiple Choice Buttons */}
                    {choices.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                            {choices.map((choice, index) => (
                                <Button key={index} variant="outline" size="sm" onClick={() => setUserAction(choice)} disabled={isLoading || isRegenerating}>
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
                                    <TooltipTrigger asChild><Button variant="secondary" size="sm" disabled={isLoading || isRegenerating}><Shield className="h-4 w-4 mr-1"/>Défendre</Button></TooltipTrigger>
                                    <TooltipContent>Action de combat : Se défendre.</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild><Button variant="secondary" size="sm" disabled={isLoading || isRegenerating}><Sparkles className="h-4 w-4 mr-1"/>Sort/Comp.</Button></TooltipTrigger>
                                    <TooltipContent>Ouvrir le menu des sorts et compétences.</TooltipContent>
                                </Tooltip>
                                 <Tooltip>
                                    <TooltipTrigger asChild><Button variant="secondary" size="sm" disabled={isLoading || isRegenerating}><ScrollText className="h-4 w-4 mr-1"/>Inventaire</Button></TooltipTrigger>
                                    <TooltipContent>Ouvrir l'inventaire.</TooltipContent>
                                </Tooltip>
                                {/* Add more RPG actions as needed */}
                            </TooltipProvider>
                        </div>
                    )}


                    {/* User Input Textarea */}
                    <div className="flex gap-2">
                         {/* Undo Button */}
                         <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button type="button" variant="outline" size="icon" onClick={onUndoLastMessage} disabled={isLoading || isRegenerating || messages.length <= 1}>
                                         <Undo className="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Annuler le dernier message</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <Textarea
                            placeholder={currentMode === 'exploration' ? "Que faites-vous ? Décrivez votre action..." : (currentMode === 'combat' ? "Décrivez votre action de combat..." : "Votre message...")}
                            value={userAction}
                            onChange={(e) => setUserAction(e.target.value)}
                            onKeyPress={handleKeyPress}
                            rows={1}
                            className="min-h-[40px] max-h-[150px] resize-y flex-1" // Added flex-1
                            disabled={isLoading || isRegenerating}
                        />
                         {/* Send Button */}
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button type="button" size="icon" onClick={handleSendAction} disabled={isLoading || isRegenerating || !userAction.trim()}>
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
                                <Button className="w-full" onClick={handleGenerateImage} disabled={isImageLoading || isLoading || isRegenerating || !currentSceneDescription}>
                                    <Wand2 className="mr-2 h-4 w-4" />
                                    Générer Image Scène
                                </Button>
                             </TooltipTrigger>
                             <TooltipContent>Utilise l'IA pour générer une image basée sur la description actuelle (si disponible).</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </CardFooter>
            </Card>
      </div>


    </div>
  );
}

// Helper type for potential prompt configuration
// This ensures the GenerateAdventureInput type is augmented correctly.
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
