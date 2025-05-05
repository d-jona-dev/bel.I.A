
"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Image as ImageIcon, Send, Loader2, Map, Wand2, Swords, Shield, Sparkles, ScrollText, Copy, Edit, RefreshCw, User as UserIcon, Bot, Users, Trash, Undo2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { GenerateAdventureInput, GenerateAdventureOutput, CharacterUpdateSchema, AffinityUpdateSchema, RelationUpdateSchema } from "@/ai/flows/generate-adventure"; // Import types only, Added AffinityUpdateSchema, RelationUpdateSchema
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";


// Define prop types including new props for message handling
interface AdventureDisplayProps {
    generateAdventureAction: (input: GenerateAdventureInput) => Promise<GenerateAdventureOutput>;
    generateSceneImageAction: (input: GenerateSceneImageInput) => Promise<GenerateSceneImageOutput>;
    world: string;
    playerName: string; // Add player name prop
    characters: Character[];
    initialMessages: Message[]; // Changed from initialNarrative: string
    currentLanguage: string; // Pass current language
    onNarrativeChange: (content: string, type: 'user' | 'ai', sceneDesc?: string) => void; // Callback for adding new messages, include optional sceneDesc
    onNewCharacters: (newChars: Array<{ name: string; details?: string, initialHistoryEntry?: string }>) => void; // Callback for adding new characters detected by AI
    onCharacterHistoryUpdate: (updates: CharacterUpdateSchema[]) => void; // Callback for history updates
    onAffinityUpdates: (updates: AffinityUpdateSchema[]) => void; // Callback for affinity updates
    onRelationUpdates: (updates: RelationUpdateSchema[]) => void; // Callback for relation updates from AI
    rpgMode: boolean;
    onEditMessage: (messageId: string, newContent: string) => void; // Callback for editing a message
    onRegenerateLastResponse: () => Promise<void>; // Callback for regenerating the last AI response
    onUndoLastMessage: () => void; // Callback to undo the last message
}


export function AdventureDisplay({
    generateAdventureAction,
    generateSceneImageAction,
    world,
    playerName, // Destructure player name
    characters,
    initialMessages, // Use initialMessages
    currentLanguage, // Use current language
    onNarrativeChange, // Use the updated handler
    onNewCharacters, // Add the new callback
    onCharacterHistoryUpdate, // Add history update handler
    onAffinityUpdates, // Add affinity update handler
    onRelationUpdates, // Add relation update handler from AI
    rpgMode,
    onEditMessage,
    onRegenerateLastResponse, // New handler
    onUndoLastMessage, // New handler
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

        // Scroll to bottom after messages update
        if (scrollAreaRef.current) {
          const scrollElement = scrollAreaRef.current.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
          if(scrollElement) {
              // Use requestAnimationFrame for smoother scrolling after render
              requestAnimationFrame(() => {
                 scrollElement.scrollTop = scrollElement.scrollHeight;
              });
          }
        }
    }, [initialMessages]); // Depends on the messages array


  // Function to handle sending user action
  const handleSendAction = async () => {
    if (!userAction.trim() || isLoading || isRegenerating) return;

    setIsLoading(true);
    const userMessageContent = userAction.trim();
    setUserAction(""); // Clear input immediately

    // Call the callback to update the parent state immediately for user action
    onNarrativeChange(userMessageContent, 'user');
    // Local messages state will update via useEffect when initialMessages changes

    try {
        // Get context from the current messages state
        // Sending last 5 messages for context. Adjust number as needed.
        // Use the prop directly to get latest state from parent
        const currentMessages = initialMessages;
        const contextMessages = currentMessages.slice(-5);
        const narrativeContext = contextMessages.map(msg =>
            // Include player name in user message context for the AI
            msg.type === 'user' ? `> ${playerName}: ${msg.content}` : msg.content
        ).join('\n\n') + `\n\n> ${playerName}: ${userMessageContent}\n`; // Append new user action with player name

        // Prepare input for the AI, passing full character objects
        const input: GenerateAdventureInput = {
            world: world,
            initialSituation: narrativeContext,
            characters: characters, // Pass current full character objects
            userAction: userMessageContent, // User action itself doesn't need player name prepended here, the context handles it
            currentLanguage: currentLanguage, // Pass current language
            playerName: playerName, // Pass player name explicitly
        };

        // Add RPG context if enabled
        if (rpgMode) {
             input.promptConfig = {
                 rpgContext: {
                    playerStats: { /* TODO: Player stats placeholder */ },
                    // Pass relevant details from current character state
                    characterDetails: characters.map(c => ({
                         name: c.name,
                         details: c.details, // Send details for context
                         stats: c.stats,
                         inventory: c.inventory,
                         // Include relations in context if needed by the AI
                         relations: c.relations ? Object.entries(c.relations).map(([id, desc]) => {
                             const relatedChar = characters.find(char => char.id === id);
                             return `${relatedChar ? relatedChar.name : (id === 'player' ? playerName : 'Unknown')}: ${desc}`;
                         }).join(', ') : 'None',
                    })),
                    mode: currentMode,
                 }
             };
        }


        // Call the AI function passed via props
        const result = await generateAdventureAction(input);

        // Call the callback to update the parent state with the AI's response and scene description
        onNarrativeChange(result.narrative, 'ai', result.sceneDescriptionForImage);

        // Call the callback to handle newly detected characters
        if (result.newCharacters && result.newCharacters.length > 0) {
            onNewCharacters(result.newCharacters);
        }
         // Call the callback to update character histories
        if (result.characterUpdates && result.characterUpdates.length > 0) {
            onCharacterHistoryUpdate(result.characterUpdates);
        }
        // Call the callback to update affinities
        if (result.affinityUpdates && result.affinityUpdates.length > 0) {
             onAffinityUpdates(result.affinityUpdates);
        }
        // Call the callback to update relations based on AI analysis
        if (result.relationUpdates && result.relationUpdates.length > 0) {
           onRelationUpdates(result.relationUpdates); // Use the specific handler for AI updates
        }


        // Update local scene description state for image generation button enablement
        setCurrentSceneDescription(result.sceneDescriptionForImage || null);

        // TODO: Potentially generate new choices based on the result.narrative
        setChoices([]); // Clear old choices

    } catch (error) {
        console.error("Error generating adventure:", error);
        toast({
            title: "Erreur de Génération",
            description: `Impossible de générer la suite de l'aventure: ${error instanceof Error ? error.message : 'Unknown error'}. Veuillez réessayer.`,
            variant: "destructive",
        });
         // Narrative update for user action was already called, AI message won't be added due to error.
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
        // Parent handles narrative update and new characters/history/affinity/relations
    } catch (error) {
        // Error handling is likely done in the parent, but log here too
        console.error("Error during regeneration triggered from display:", error);
        // Toast for error is likely handled in parent as well
    } finally {
        setIsRegenerating(false);
    }
  };


  // Function to handle generating scene image
  const handleGenerateImage = async () => {
     // Use the currentSceneDescription state which is updated by AI responses
     const descriptionForImage = currentSceneDescription;

     if (isImageLoading || !descriptionForImage || isLoading || isRegenerating) {
         if (!descriptionForImage) {
            toast({
                title: "Description manquante",
                description: "La description visuelle de la scène actuelle n'est pas disponible pour générer une image.",
                variant: "destructive",
            });
         }
         return;
     };
     setIsImageLoading(true);
     setImageUrl(null);

    try {
        // The description already contains physical descriptions instead of names (handled by the AI prompt)
        const result = await generateSceneImageAction({ sceneDescription: descriptionForImage });
        setImageUrl(result.imageUrl);
         toast({
            title: "Image Générée",
            description: "L'image de la scène a été générée avec succès.",
        });
    } catch (error) {
        console.error("Error generating scene image:", error);
         toast({
            title: "Erreur de Génération d'Image",
            description: `Impossible de générer l'image de la scène: ${error instanceof Error ? error.message : 'Unknown error'}.`,
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

  // Determine if the undo button should be disabled
  const canUndo = messages.length > 1; // Cannot undo the very first system message

  // --- Render ---
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
                                // Determine if this is the very last AI message in the current list
                                const isLastAiMessage = isLastMessage && message.type === 'ai';
                                // Determine if this is the very first message
                                const isFirstMessage = index === 0;

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
                                                {/* Only show actions for non-system messages and not the very first one */}
                                                {message.type !== 'system' && !isFirstMessage && (
                                                    <div className={`absolute top-0 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 ${message.type === 'user' ? 'left-0 -translate-x-full mr-1' : 'right-0 translate-x-full ml-1'}`}>

                                                        {/* Edit Button */}
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
                                                )}
                                            </div>
                                            {message.type === 'user' && (
                                                <Avatar className="h-8 w-8 border">
                                                    {/* TODO: Add player avatar image if available */}
                                                    <AvatarFallback><UserIcon className="h-5 w-5 text-muted-foreground"/></AvatarFallback>
                                                </Avatar>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {/* Loading indicator when waiting for AI response (but not regenerating) */}
                            {isLoading && !isRegenerating && (
                                <div className="flex items-center justify-start gap-3">
                                     <Avatar className="h-8 w-8 border">
                                         <AvatarFallback><Bot className="h-5 w-5 text-muted-foreground"/></AvatarFallback>
                                     </Avatar>
                                     <span className="flex items-center text-muted-foreground italic p-3">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Écriture en cours...
                                    </span>
                                </div>
                            )}
                             {/* Loading indicator specifically for regeneration */}
                             {isRegenerating && (
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


                    {/* User Input Textarea and Action Buttons */}
                    <div className="flex gap-2">
                         {/* Undo Button */}
                         <TooltipProvider>
                             <Tooltip>
                                 <TooltipTrigger asChild>
                                     <Button type="button" variant="outline" size="icon" onClick={onUndoLastMessage} disabled={isLoading || isRegenerating || !canUndo}>
                                         <Undo2 className="h-5 w-5" />
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
                                data-ai-hint="adventure scene visual" // Updated hint
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                                // Consider adding unoptimized={true} if Data URIs are very large and causing issues
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
                             <TooltipContent>Utilise l'IA pour générer une image basée sur la description visuelle actuelle (si disponible).</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </CardFooter>
            </Card>
      </div>


    </div>
  );
}
