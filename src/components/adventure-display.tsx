
"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Image as ImageIcon, Send, Loader2, Map, Wand2, Swords, Shield, Sparkles, ScrollText, Copy, Edit, RefreshCw, User as UserIcon, Bot, Users, Trash, Undo2, RefreshCcw, Heart, Zap as ZapIcon, BarChart2, RotateCcw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { GenerateAdventureInput, GenerateAdventureOutput, CharacterUpdateSchema, AffinityUpdateSchema, RelationUpdateSchema, NewCharacterSchema, CombatUpdatesSchema } from "@/ai/flows/generate-adventure";
import type { GenerateSceneImageInput, GenerateSceneImageOutput } from "@/ai/flows/generate-scene-image";
import { useToast } from "@/hooks/use-toast";
import type { Message, Character, ActiveCombat, AdventureSettings } from "@/types";
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
import { Progress } from "@/components/ui/progress";


interface AdventureDisplayProps {
    generateAdventureAction: (input: GenerateAdventureInput) => Promise<GenerateAdventureOutput>;
    generateSceneImageAction: (input: GenerateSceneImageInput) => Promise<GenerateSceneImageOutput>;
    adventureSettings: AdventureSettings;
    characters: Character[];
    initialMessages: Message[];
    currentLanguage: string;
    onNarrativeChange: (content: string, type: 'user' | 'ai', sceneDesc?: string) => void;
    onNewCharacters: (newChars: NewCharacterSchema[]) => void;
    onCharacterHistoryUpdate: (updates: CharacterUpdateSchema[]) => void;
    onAffinityUpdates: (updates: AffinityUpdateSchema[]) => void;
    onRelationUpdates: (updates: RelationUpdateSchema[]) => void;
    onEditMessage: (messageId: string, newContent: string) => void;
    onRegenerateLastResponse: () => Promise<void>;
    onUndoLastMessage: () => void;
    activeCombat?: ActiveCombat;
    onCombatUpdates: (combatUpdates: CombatUpdatesSchema) => void;
    onRestartAdventure: () => void;
}


export function AdventureDisplay({
    generateAdventureAction,
    generateSceneImageAction,
    adventureSettings,
    characters,
    initialMessages,
    currentLanguage,
    onNarrativeChange,
    // onNewCharacters, // These will be handled by the parent component after AI response
    // onCharacterHistoryUpdate,
    // onAffinityUpdates,
    // onRelationUpdates,
    onEditMessage,
    onRegenerateLastResponse,
    onUndoLastMessage,
    activeCombat,
    // onCombatUpdates, // Handled by parent
    onRestartAdventure,
}: AdventureDisplayProps) {
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  const [userAction, setUserAction] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isImageLoading, setIsImageLoading] = React.useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = React.useState<boolean>(false);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [currentMode, setCurrentMode] = React.useState<"exploration" | "dialogue" | "combat">("exploration");
  const [currentSceneDescription, setCurrentSceneDescription] = React.useState<string | null>(null);

  const [editingMessage, setEditingMessage] = React.useState<Message | null>(null);
  const [editContent, setEditContent] = React.useState<string>("");

  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const messagesRef = React.useRef(messages);
  const { toast } = useToast();

    React.useEffect(() => {
        setMessages(initialMessages);
        messagesRef.current = initialMessages;
        const latestAiMessage = [...initialMessages].reverse().find(m => m.type === 'ai' && m.sceneDescription);
        setCurrentSceneDescription(latestAiMessage?.sceneDescription || null);

        if (scrollAreaRef.current) {
          const scrollElement = scrollAreaRef.current.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
          if(scrollElement) {
              requestAnimationFrame(() => {
                 scrollElement.scrollTop = scrollElement.scrollHeight;
              });
          }
        }
    }, [initialMessages]);

    React.useEffect(() => {
        if (adventureSettings.rpgMode && activeCombat?.isActive) {
            setCurrentMode("combat");
        } else {
            setCurrentMode("exploration");
        }
    }, [activeCombat, adventureSettings.rpgMode]);

  const handleSendSpecificAction = async (action: string) => {
    if (!action || isLoading || isRegenerating) return;

    setIsLoading(true);
    
    // Notify parent to add user's action to the narrative
    onNarrativeChange(action, 'user');
    // The local `messages` state will update via useEffect when `initialMessages` prop changes.
    // For building immediate context, we rely on messagesRef which is updated by parent.

    try {
        // Use messagesRef.current to get the most up-to-date messages *before* this action was processed by AI
        // This context represents the state of the story leading up to the current user action.
        const historyForAIContext = messagesRef.current 
            .slice(-5) // Take last 5 messages for context
            .map(msg =>
                msg.type === 'user' ? `> ${adventureSettings.playerName || 'Player'}: ${msg.content}` : msg.content
            ).join('\n\n');

        const input: GenerateAdventureInput = {
            world: adventureSettings.world,
            initialSituation: historyForAIContext, 
            characters: characters,
            userAction: action, 
            currentLanguage: currentLanguage,
            playerName: adventureSettings.playerName || "Player",
            rpgModeActive: adventureSettings.rpgMode,
            relationsModeActive: adventureSettings.relationsMode ?? true,
            activeCombat: activeCombat,
            currencyName: adventureSettings.currencyName,
            playerClass: adventureSettings.playerClass,
            playerLevel: adventureSettings.playerLevel,
            playerCurrentHp: adventureSettings.playerCurrentHp,
            playerMaxHp: adventureSettings.playerMaxHp,
            playerCurrentMp: adventureSettings.playerCurrentMp,
            playerMaxMp: adventureSettings.playerMaxMp,
            playerCurrentExp: adventureSettings.playerCurrentExp,
            playerExpToNextLevel: adventureSettings.playerExpToNextLevel,
        };
        
        // Call the parent's generateAdventureAction.
        // The parent will then call its own handleNarrativeUpdate (which is onNarrativeChange for this component)
        // for the AI's response, and also handle onNewCharacters, onAffinityUpdates, onCombatUpdates, etc.
        await generateAdventureAction(input);

    } catch (error) {
        console.error("Error generating adventure:", error);
        toast({
            title: "Erreur de Génération",
            description: `Impossible de générer la suite de l'aventure: ${error instanceof Error ? error.message : 'Unknown error'}. Veuillez réessayer.`,
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleSendFromTextarea = async () => {
    const currentTextAction = userAction.trim();
    if (!currentTextAction) return;
    setUserAction(""); // Clear textarea
    await handleSendSpecificAction(currentTextAction);
  };


  const handleRegenerate = async () => {
    if (isLoading || isRegenerating) return;
    setIsRegenerating(true);
    try {
        await onRegenerateLastResponse();
    } catch (error) {
        console.error("Error during regeneration triggered from display:", error);
    } finally {
        setIsRegenerating(false);
    }
  };


  const handleGenerateImage = async () => {
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

   const handleCopyMessage = (content: string) => {
        navigator.clipboard.writeText(content).then(() => {
            toast({ title: "Copié", description: "Message copié dans le presse-papiers." });
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            toast({ title: "Erreur", description: "Impossible de copier le message.", variant: "destructive" });
        });
   };

    const openEditDialog = (message: Message) => {
        setEditingMessage(message);
        setEditContent(message.content);
    };

    const handleSaveChanges = () => {
        if (editingMessage && editContent.trim()) {
            onEditMessage(editingMessage.id, editContent.trim());
            setEditingMessage(null);
        }
    };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendFromTextarea();
    }
  };

  const canUndo = messages.length > 1;

  return (
    <div className="flex flex-col h-full overflow-hidden">
       <Tabs defaultValue="exploration" value={currentMode} onValueChange={(value) => setCurrentMode(value as any)} className="mb-2">
        <TabsList className={`grid w-full ${adventureSettings.rpgMode ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="exploration"><Map className="mr-2 h-4 w-4" />Exploration</TabsTrigger>
          <TabsTrigger value="dialogue" disabled><Users className="mr-2 h-4 w-4" />Dialogue (Future)</TabsTrigger>
          {adventureSettings.rpgMode && <TabsTrigger value="combat" disabled={!activeCombat?.isActive}><Swords className="mr-2 h-4 w-4" />Combat</TabsTrigger>}
        </TabsList>
      </Tabs>

      <div className="flex-1 flex gap-4 overflow-hidden">
            <Card className="flex-1 flex flex-col overflow-hidden">
                <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
                        <div className="space-y-4">
                            {messages.map((message, index) => {
                                const isLastMessage = index === messages.length - 1;
                                const isLastAiMessage = isLastMessage && message.type === 'ai';
                                const isFirstMessage = index === 0;

                                return (
                                    <div key={message.id} className="group relative flex flex-col">
                                        <div className={`flex items-start gap-3 ${message.type === 'user' ? 'justify-end' : ''}`}>
                                        {message.type === 'ai' && ( // Avatar only for AI messages
                                            <Avatar className="h-8 w-8 border">
                                                <AvatarFallback><Bot className="h-5 w-5 text-muted-foreground"/></AvatarFallback>
                                            </Avatar>
                                        )}
                                        <div className={`relative rounded-lg p-3 max-w-[80%] text-sm whitespace-pre-wrap break-words font-sans ${
                                                message.type === 'user' ? 'bg-primary text-primary-foreground' : (message.type === 'ai' ? 'bg-muted' : 'bg-transparent border italic text-muted-foreground text-center w-full') // System messages centered
                                            }`}>
                                                {message.content}

                                                {message.type !== 'system' && !isFirstMessage && (
                                                    <div className={`absolute top-0 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 ${message.type === 'user' ? 'left-0 -translate-x-full mr-1' : 'right-0 translate-x-full ml-1'}`}>
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
                                                    <AvatarFallback><UserIcon className="h-5 w-5 text-muted-foreground"/></AvatarFallback>
                                                </Avatar>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
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
                    {adventureSettings.rpgMode && activeCombat?.isActive && (
                        <div className="flex flex-wrap gap-2 mb-2">
                             <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="destructive" size="sm" onClick={() => handleSendSpecificAction("Attaquer avec mon arme principale")} disabled={isLoading || isRegenerating}>
                                        <Swords className="h-4 w-4 mr-1"/>Attaquer
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Lancer une attaque physique.</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="secondary" size="sm" onClick={() => handleSendSpecificAction("Prendre une posture défensive")} disabled={isLoading || isRegenerating}>
                                        <Shield className="h-4 w-4 mr-1"/>Défendre
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Action de combat : Se défendre.</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="secondary" size="sm" onClick={() => setUserAction("Utiliser compétence/sort : ")} disabled={isLoading || isRegenerating}>
                                        <Sparkles className="h-4 w-4 mr-1"/>Sort/Comp.
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Décrire l'utilisation d'un sort ou compétence (à compléter dans la zone de texte).</TooltipContent>
                                </Tooltip>
                                 <DropdownMenu>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="secondary" size="sm" disabled={isLoading || isRegenerating}>
                                                        <ScrollText className="h-4 w-4 mr-1"/>Objet
                                                    </Button>
                                                </DropdownMenuTrigger>
                                            </TooltipTrigger>
                                            <TooltipContent>Utiliser un objet de l'inventaire.</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <DropdownMenuContent>
                                        {/* Placeholder items - replace with actual inventory logic later */}
                                        <DropdownMenuItem onSelect={() => handleSendSpecificAction("Utiliser Potion de Soins")}>
                                        Potion de Soins
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => handleSendSpecificAction("Utiliser Parchemin de Feu")}>
                                        Parchemin de Feu
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setUserAction("Utiliser un objet : ")}>
                                            Autre... (Décrire)
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TooltipProvider>
                        </div>
                    )}

                    <div className="flex gap-2">
                         <TooltipProvider>
                             <Tooltip>
                                 <TooltipTrigger asChild>
                                     <Button type="button" variant="outline" size="icon" onClick={onUndoLastMessage} disabled={isLoading || isRegenerating || !canUndo}>
                                         <Undo2 className="h-5 w-5" />
                                     </Button>
                                 </TooltipTrigger>
                                 <TooltipContent>Annuler la dernière action/réponse</TooltipContent>
                             </Tooltip>
                         </TooltipProvider>
                          <TooltipProvider>
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button type="button" variant="outline" size="icon" disabled={isLoading || isRegenerating}>
                                                <RotateCcw className="h-5 w-5" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Recommencer l'aventure ?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                Toute la progression narrative sera perdue et l'aventure recommencera depuis la situation initiale. Les paramètres de l'aventure (monde, personnages initiaux, etc.) ne seront pas modifiés.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                <AlertDialogAction onClick={onRestartAdventure}>Recommencer</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                  </TooltipTrigger>
                                  <TooltipContent>Recommencer l'Aventure depuis le début</TooltipContent>
                              </Tooltip>
                          </TooltipProvider>

                        <Textarea
                            placeholder={currentMode === 'exploration' ? "Que faites-vous ? Décrivez votre action..." : (currentMode === 'combat' ? "Décrivez votre action de combat ou complétez l'action pré-remplie..." : "Votre message...")}
                            value={userAction}
                            onChange={(e) => setUserAction(e.target.value)}
                            onKeyPress={handleKeyPress}
                            rows={1}
                            className="min-h-[40px] max-h-[150px] resize-y flex-1"
                            disabled={isLoading || isRegenerating}
                        />
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button type="button" size="icon" onClick={handleSendFromTextarea} disabled={isLoading || isRegenerating || !userAction.trim()}>
                                        {isLoading || isRegenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Envoyer</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </CardFooter>
            </Card>

            <div className="w-1/3 lg:w-1/4 hidden md:flex flex-col gap-4 overflow-y-auto">
                <Card>
                    <CardContent className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden">
                        {isImageLoading ? (
                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                                <p>Génération de l'image...</p>
                            </div>
                        ) : imageUrl ? (
                             <div className="relative w-full aspect-square">
                                <Image
                                    src={imageUrl}
                                    alt="Generated Scene"
                                    fill
                                    style={{ objectFit: 'contain' }}
                                    data-ai-hint="adventure scene visual"
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
                                 <TooltipContent>Utilise l'IA pour générer une image basée sur la description visuelle actuelle (si disponible).</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </CardFooter>
                </Card>

                {adventureSettings.rpgMode && (
                    <Card className="shadow-md rounded-lg">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">{adventureSettings.playerName || "Joueur"}</CardTitle>
                            <CardDescription>{adventureSettings.playerClass || "Aventurier"} - Niv. {adventureSettings.playerLevel || 1}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-2">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <Label htmlFor="player-hp" className="text-sm font-medium flex items-center"><Heart className="h-4 w-4 mr-1 text-red-500"/>PV</Label>
                                    <span className="text-xs text-muted-foreground">{adventureSettings.playerCurrentHp ?? 0} / {adventureSettings.playerMaxHp ?? 0}</span>
                                </div>
                                <Progress id="player-hp" value={((adventureSettings.playerCurrentHp ?? 0) / (adventureSettings.playerMaxHp || 1)) * 100} className="h-2 [&>div]:bg-red-500" />
                            </div>

                            {(adventureSettings.playerMaxMp ?? 0) > 0 && (
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <Label htmlFor="player-mp" className="text-sm font-medium flex items-center"><ZapIcon className="h-4 w-4 mr-1 text-blue-500"/>PM</Label>
                                        <span className="text-xs text-muted-foreground">{adventureSettings.playerCurrentMp ?? 0} / {adventureSettings.playerMaxMp ?? 0}</span>
                                    </div>
                                    <Progress id="player-mp" value={((adventureSettings.playerCurrentMp ?? 0) / (adventureSettings.playerMaxMp || 1)) * 100} className="h-2 [&>div]:bg-blue-500" />
                                </div>
                            )}

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <Label htmlFor="player-exp" className="text-sm font-medium flex items-center"><BarChart2 className="h-4 w-4 mr-1 text-yellow-500"/>EXP</Label>
                                    <span className="text-xs text-muted-foreground">{adventureSettings.playerCurrentExp ?? 0} / {adventureSettings.playerExpToNextLevel ?? 0}</span>
                                </div>
                                <Progress id="player-exp" value={((adventureSettings.playerCurrentExp ?? 0) / (adventureSettings.playerExpToNextLevel || 1)) * 100} className="h-2 [&>div]:bg-yellow-500" />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {adventureSettings.rpgMode && activeCombat?.isActive && activeCombat.combatants.some(c => c.team === 'enemy' && !c.isDefeated) && (
                    <Card className="shadow-md rounded-lg mt-4">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Ennemis</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-2 max-h-48 overflow-y-auto">
                            {activeCombat.combatants
                                .filter(c => c.team === 'enemy' && !c.isDefeated)
                                .map(enemyCombatant => {
                                    const enemyCharacterDetails = characters.find(char => char.id === enemyCombatant.characterId);
                                    const enemyName = enemyCombatant.name;
                                    const enemyClass = enemyCharacterDetails?.characterClass || "Combattant";
                                    const enemyLevel = enemyCharacterDetails?.level || (enemyCharacterDetails?.isHostile ? 1 : undefined);

                                    const enemyCurrentHp = enemyCombatant.currentHp;
                                    const enemyMaxHp = enemyCombatant.maxHp;
                                    const enemyCurrentMp = enemyCombatant.currentMp;
                                    const enemyMaxMp = enemyCombatant.maxMp;

                                    return (
                                        <div key={enemyCombatant.characterId} className="border p-3 rounded-md bg-muted/50">
                                            <div className="flex justify-between items-center mb-1">
                                                <Label htmlFor={`enemy-title-${enemyCombatant.characterId}`} className="text-sm font-semibold">{enemyName}</Label>
                                                <span className="text-xs text-muted-foreground">
                                                    {enemyClass} {enemyLevel !== undefined ? `- Niv. ${enemyLevel}` : ''}
                                                </span>
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <Label htmlFor={`enemy-hp-${enemyCombatant.characterId}`} className="text-xs font-medium flex items-center"><Heart className="h-3 w-3 mr-1 text-red-500"/>PV</Label>
                                                    <span className="text-xs text-muted-foreground">{enemyCurrentHp} / {enemyMaxHp}</span>
                                                </div>
                                                <Progress id={`enemy-hp-${enemyCombatant.characterId}`} value={(enemyCurrentHp / (enemyMaxHp || 1)) * 100} className="h-2 [&>div]:bg-red-500" />
                                            </div>
                                            {(enemyMaxMp ?? 0) > 0 && (
                                                <div className="mt-2">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <Label htmlFor={`enemy-mp-${enemyCombatant.characterId}`} className="text-xs font-medium flex items-center"><ZapIcon className="h-3 w-3 mr-1 text-blue-500"/>PM</Label>
                                                        <span className="text-xs text-muted-foreground">{enemyCurrentMp ?? 0} / {enemyMaxMp ?? 0}</span>
                                                    </div>
                                                    <Progress id={`enemy-mp-${enemyCombatant.characterId}`} value={((enemyCurrentMp ?? 0) / (enemyMaxMp || 1)) * 100} className="h-2 [&>div]:bg-blue-500" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                        </CardContent>
                    </Card>
                )}
            </div>
      </div>
    </div>
  );
}
