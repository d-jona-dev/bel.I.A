

"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription as UICardDescription } from "@/components/ui/card";
import { AvatarImage, AvatarFallback, Avatar } from "@/components/ui/avatar";
import { ImageIcon, Send, Loader2, Map as MapIcon, Wand2, Swords, Shield, ScrollText, Copy, Edit, RefreshCw, User as UserIcon, Bot, Trash2 as Trash2Icon, RotateCcw, Heart, Zap as ZapIcon, BarChart2, Sparkles, Users2, ShieldAlert, Lightbulb, Briefcase, Gift, PackageOpen, PlayCircle, Shirt, BookOpen, Type as FontIcon, Palette, Expand, ZoomIn, ZoomOut, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Edit3, Save, Download, PlusCircle, Clapperboard, Upload, FileUp, PlusSquare, Library, ShoppingCart, X, Diamond, UserPlus, BrainCircuit } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import type { GenerateAdventureInput, LootedItem, CharacterUpdateSchema, AffinityUpdateSchema, RelationUpdateSchema, CombatUpdatesSchema } from "@/types";
import type { GenerateSceneImageInput, GenerateSceneImageFlowOutput } from "@/ai/flows/generate-scene-image"; // Updated import
import type { SuggestQuestHookInput } from "@/ai/flows/suggest-quest-hook";
import { useToast } from "@/hooks/use-toast";
import type { Message, Character, ActiveCombat, AdventureSettings, PlayerInventoryItem, PlayerSkill, Combatant, MapPointOfInterest, ImageTransform, TimeManagementSettings, ComicPage, Panel, Bubble } from "@/types";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { MapDisplay } from "./map-display";
import ImageEditor from "@/components/ImageEditor";
import { Input } from "./ui/input";
import { CalendarDays, Clock, Drama } from "lucide-react";
import { createNewPage as createNewComicPage, exportPageAsJpeg } from "./ComicPageEditor";


interface AdventureDisplayProps {
    playerId: string;
    generateAdventureAction: (userActionText: string) => Promise<void>;
    generateSceneImageAction: (input: GenerateSceneImageInput) => Promise<GenerateSceneImageFlowOutput>; // Updated prop type
    suggestQuestHookAction: () => Promise<void>;
    onSummarizeHistory: (narrativeContext: string) => Promise<void>;
    adventureSettings: AdventureSettings;
    characters: Character[]; // Global list of all characters
    initialMessages: Message[];
    currentLanguage: string;
    onNarrativeChange: (content: string, type: 'user' | 'ai', sceneDesc?: string, lootItems?: LootedItem[], imageUrl?: string, imageTransform?: ImageTransform, speakingCharacterNames?: string[]) => void;
    onEditMessage: (messageId: string, newContent: string, newImageTransform?: ImageTransform, newImageUrl?: string) => void;
    onRegenerateLastResponse: () => Promise<void>;
    onUndoLastMessage: () => void;
    onMaterializeCharacter: (narrativeContext: string) => Promise<void>; // New prop
    onRestartAdventure: () => void;
    isSuggestingQuest: boolean;
    useAestheticFont: boolean;
    onToggleAestheticFont: () => void;
    comicDraft: ComicPage[];
    onDownloadComicDraft: () => void;
    onAddComicPage: () => void;
    onAddComicPanel: () => void;
    onRemoveLastComicPanel: () => void;
    onUploadToComicPanel: (pageIndex: number, panelIndex: number, file: File) => void;
    currentComicPageIndex: number;
    onComicPageChange: (index: number) => void;
    onAddToComicPage: (dataUrl: string) => void;
    isSaveComicDialogOpen: boolean;
    setIsSaveComicDialogOpen: (isOpen: boolean) => void;
    comicTitle: string;
    setComicTitle: (title: string) => void;
    comicCoverUrl: string | null;
    onGenerateCover: () => void;
    onSaveToLibrary: () => void;
    isLoading: boolean;
}

interface CustomImageStyle {
  name: string;
  prompt: string;
}

const defaultImageStyles: Array<{ name: string; isDefault: true }> = [
    { name: "Par Défaut", isDefault: true },
    { name: "Réaliste", isDefault: true },
    { name: "Manga / Anime", isDefault: true },
    { name: "Fantaisie Epique", isDefault: true },
    { name: "Peinture à l'huile", isDefault: true },
    { name: "Comics", isDefault: true },
];

const formatTimeToDisplay = (time24h: string, format: '12h' | '24h' | undefined) => {
    if (format !== '12h' || !time24h) {
        return time24h;
    }
    const [hours, minutes] = time24h.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return time24h;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    let hours12 = hours % 12;
    if (hours12 === 0) {
        hours12 = 12; // Midnight and Noon case
    }
    return `${hours12}:${String(minutes).padStart(2, '0')} ${ampm}`;
};

interface ImageToEdit {
    url: string | null;
    message: Message;
}

const isValidUrl = (url: string | null | undefined): url is string => {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image');
};

export function AdventureDisplay({
    playerId,
    generateAdventureAction,
    generateSceneImageAction,
    suggestQuestHookAction,
    onSummarizeHistory,
    adventureSettings,
    characters, // Global list of all characters
    initialMessages,
    currentLanguage,
    onNarrativeChange,
    onEditMessage,
    onRegenerateLastResponse,
    onUndoLastMessage,
    onMaterializeCharacter,
    onRestartAdventure,
    isSuggestingQuest,
    useAestheticFont,
    onToggleAestheticFont,
    comicDraft,
    onDownloadComicDraft,
    onAddComicPage,
    onAddComicPanel,
    onRemoveLastComicPanel,
    onUploadToComicPanel,
    currentComicPageIndex,
    onComicPageChange,
    onAddToComicPage,
    isSaveComicDialogOpen,
    setIsSaveComicDialogOpen,
    comicTitle,
    setComicTitle,
    comicCoverUrl,
    onGenerateCover,
    onSaveToLibrary,
    isLoading, // Destructure isLoading
}: AdventureDisplayProps) {
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  const [userAction, setUserAction] = React.useState<string>("");
  const [isImageLoading, setIsImageLoading] = React.useState<boolean>(false);
  const [currentMode, setCurrentMode] = React.useState<"narrative" | "map">("narrative");
  const [imageStyle, setImageStyle] = React.useState<string>("");
  
  const [imageForDisplay, setImageForDisplay] = React.useState<string | null>(null);

  const [editingMessage, setEditingMessage] = React.useState<Message | null>(null);
  const [editContent, setEditContent] = React.useState<string>("");
  const [editImageTransform, setEditImageTransform] = React.useState<ImageTransform>({ scale: 1, translateX: 0, translateY: 0 });
  const [imageEditorOpen, setImageEditorOpen] = React.useState(false);
  
  const [imageToEdit, setImageToEdit] = React.useState<ImageToEdit | null>(null);

  const [isCustomStyleDialogOpen, setIsCustomStyleDialogOpen] = React.useState(false);
  const [customStylePrompt, setCustomStylePrompt] = React.useState("");
  const [customStyleName, setCustomStyleName] = React.useState("");
  const [customStyles, setCustomStyles] = React.useState<CustomImageStyle[]>([]);


  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const messagesRef = React.useRef(messages);
  const { toast } = useToast();

    const playerSpells = adventureSettings.playerClass?.toLowerCase().includes("mage") || adventureSettings.playerClass?.toLowerCase().includes("sorcier") || adventureSettings.playerClass?.toLowerCase().includes("étudiant")
      ? ["Boule de Feu (5 PM)", "Soin Léger (3 PM)", "Éclair (4 PM)"] // Examples
      : [];
    const playerNonCombatSkills = (adventureSettings.playerSkills || []).filter(skill => skill.category !== 'combat') || [];
    const playerCombatSkills = (adventureSettings.playerSkills || []).filter(skill => skill.category === 'combat') || [];
    const genericSkills = ["Examiner l'ennemi", "Tenter de parler"];

    React.useEffect(() => {
        try {
            const savedStyles = localStorage.getItem("customImageStyles_v1");
            if (savedStyles) {
                setCustomStyles(JSON.parse(savedStyles));
            }
        } catch (error) {
            console.error("Failed to load custom styles:", error);
        }
    }, []);

    const saveAndSetCustomStyles = (newStyles: CustomImageStyle[]) => {
        setCustomStyles(newStyles);
        localStorage.setItem("customImageStyles_v1", JSON.stringify(newStyles));
    }

    const handleSaveCustomStyle = () => {
        if (!customStyleName.trim() || !customStylePrompt.trim()) {
            toast({ title: "Erreur", description: "Le nom et la description du style sont requis.", variant: "destructive" });
            return;
        }
        const newStyle = { name: customStyleName, prompt: customStylePrompt };
        const updatedStyles = [...customStyles, newStyle];
        saveAndSetCustomStyles(updatedStyles);
        setImageStyle(newStyle.prompt); // Apply the new style immediately
        toast({ title: "Style Personnalisé Enregistré", description: `Le style "${newStyle.name}" a été ajouté et appliqué.` });
        setIsCustomStyleDialogOpen(false);
        setCustomStyleName("");
        setCustomStylePrompt("");
    };

    const handleDeleteCustomStyle = (styleNameToDelete: string) => {
        const updatedStyles = customStyles.filter(s => s.name !== styleNameToDelete);
        saveAndSetCustomStyles(updatedStyles);
        toast({ title: "Style Supprimé", description: `Le style "${styleNameToDelete}" a été supprimé.` });
    };

    React.useEffect(() => {
        setMessages(initialMessages);
        messagesRef.current = initialMessages;

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
        messagesRef.current = messages;
        const lastImageUrl = messages.slice().reverse().find(m => m.imageUrl)?.imageUrl;
        if (lastImageUrl) {
            setImageForDisplay(lastImageUrl);
        }
         if (scrollAreaRef.current) {
            const scrollElement = scrollAreaRef.current.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
            if(scrollElement) {
                requestAnimationFrame(() => {
                    scrollElement.scrollTop = scrollElement.scrollHeight;
                });
            }
        }
    }, [messages]);


  const handleSendSpecificAction = async (action: string) => {
    if (!action || isLoading) return;

    onNarrativeChange(action, 'user');

    try {
        await generateAdventureAction(action);
    } catch (error) { 
        console.error("Error in AdventureDisplay trying to generate adventure:", error);
         toast({ title: "Erreur Critique de l'IA", description: "Impossible de générer la suite de l'aventure.", variant: "destructive" });
    }
  };

  const handleSendFromTextarea = async () => {
    const currentTextAction = userAction.trim();
    if (!currentTextAction) return;
    setUserAction("");
    await handleSendSpecificAction(currentTextAction);
  };


  const handleRegenerate = async () => {
    if (isLoading) return;
    try {
        await onRegenerateLastResponse();
    } catch (error) {
        console.error("Error during regeneration triggered from display:", error);
    }
  };


  const handleGenerateImage = async (message: Message) => {
     const descriptionForImage = message.sceneDescription;

     if (isImageLoading || !descriptionForImage || isLoading) {
         if (!descriptionForImage) {
            React.startTransition(() => {
                toast({
                    title: "Description manquante",
                    description: "La description visuelle de la scène actuelle n'est pas disponible pour générer une image.",
                    variant: "destructive",
                });
            });
         }
         return;
     };
     setIsImageLoading(true);

    onEditMessage(message.id, message.content, undefined, null);
    setImageForDisplay(null);

    try {
        const result = await generateSceneImageAction({ 
            sceneDescription: descriptionForImage,
            style: imageStyle,
        });

        if (result.error) {
            toast({
                title: "Erreur de Génération d'Image",
                description: result.error,
                variant: "destructive",
            });
            return;
        }

        onEditMessage(message.id, message.content, undefined, result.imageUrl);
        setImageForDisplay(result.imageUrl);
        
        React.startTransition(() => {
            toast({
                title: "Image Générée",
                description: "L'image de la scène a été générée avec succès.",
            });
        });
    } catch (error) { 
        console.error("Critical error generating scene image:", error);
        React.startTransition(() => {
            toast({
                title: "Erreur Critique de Génération d'Image",
                description: `Impossible de générer l'image de la scène: ${error instanceof Error ? error.message : String(error)}.`,
                variant: "destructive",
            });
        });
    } finally {
        setIsImageLoading(false);
    }
  };

   const handleCopyMessage = (content: string) => {
        navigator.clipboard.writeText(content).then(() => {
            React.startTransition(() => { toast({ title: "Copié", description: "Message copié dans le presse-papiers." }); });
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            React.startTransition(() => { toast({ title: "Erreur", description: "Impossible de copier le message.", variant: "destructive" }); });
        });
   };

    const openEditDialog = (message: Message) => {
        setEditingMessage(message);
        setEditContent(message.content);
        setEditImageTransform(message.imageTransform || { scale: 1, translateX: 0, translateY: 0 });
    };

    const handleSaveChanges = () => {
        if (editingMessage) {
            onEditMessage(editingMessage.id, editContent, editImageTransform);
            setEditingMessage(null);
        }
    };
    
  const handleMaterializeCharacter = async (context: string) => {
    toast({ title: `Matérialisation en cours...`, description: "L'IA crée la fiche du personnage." });
    await onMaterializeCharacter(context);
  };
  
    const handleSummarizeHistory = async (context: string) => {
        toast({ title: `Mémorisation de l'événement...`, description: "L'IA résume les faits marquants." });
        await onSummarizeHistory(context);
    };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendFromTextarea();
    }
  };

  const playerInventoryItems = adventureSettings.playerInventory?.filter(item => item.quantity > 0) || [];
  const canUndo = messages.length > 1 && !(messages.length === 1 && messages[0].type === 'system');
  
  const rarityColorClass = (rarity?: 'Commun' | 'Rare' | 'Epique' | 'Légendaire' | 'Divin') => {
    switch (rarity?.toLowerCase()) {
      case 'commun': return 'text-gray-500';
      case 'rare': return 'text-blue-500';
      case 'epique': return 'text-purple-500';
      case 'légendaire': return 'text-orange-500';
      case 'divin': return 'text-yellow-400';
      default: return 'text-gray-500';
    }
  };

  // NEW: Function to parse and format the comic-style narrative
  const renderFormattedNarrative = (text: string) => {
    const parts = text.split(/(\*.*?\*)|(".*?")/g).filter(Boolean);
    return (
      <>
        {parts.map((part, index) => {
          if (part.startsWith('"') && part.endsWith('"')) {
            return <strong key={index}>{part}</strong>; // Dialogue with quotes
          }
          if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={index}>{part.slice(1, -1)}</em>; // Thought
          }
          return <React.Fragment key={index}>{part}</React.Fragment>; // Narration
        })}
      </>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
       {adventureSettings.strategyMode && (
         <Tabs defaultValue="narrative" value={currentMode} onValueChange={(value) => setCurrentMode(value as "narrative" | "map")} className="mb-2">
           <TabsList className="grid w-full grid-cols-2">
             <TabsTrigger value="narrative"><ScrollText className="mr-2 h-4 w-4" />Narrative</TabsTrigger>
             <TabsTrigger value="map"><MapIcon className="mr-2 h-4 w-4" />Carte</TabsTrigger>
           </TabsList>
         </Tabs>
       )}
       {adventureSettings.timeManagement?.enabled && (
           <Card className="mb-2 shadow-sm">
               <CardContent className="p-2 text-xs flex justify-around items-center">
                   <div className="flex items-center gap-2">
                       <CalendarDays className="h-4 w-4 text-muted-foreground"/>
                       <span className="font-semibold">Jour {adventureSettings.timeManagement.day}:</span>
                       <span>{adventureSettings.timeManagement.dayName}</span>
                   </div>
                   <Separator orientation="vertical" className="h-4"/>
                   <div className="flex items-center gap-2">
                       <Clock className="h-4 w-4 text-muted-foreground"/>
                       <span className="font-semibold">Heure:</span>
                       <span>{formatTimeToDisplay(adventureSettings.timeManagement.currentTime, adventureSettings.timeManagement.timeFormat)}</span>
                   </div>
                    <Separator orientation="vertical" className="h-4"/>
                   <div className="flex items-center gap-2">
                       <Drama className="h-4 w-4 text-muted-foreground"/>
                       <span className="font-semibold">Événement:</span>
                       <span className="truncate">{adventureSettings.timeManagement.currentEvent || "Aucun"}</span>
                   </div>
               </CardContent>
           </Card>
       )}


      <div className="flex-1 flex gap-4 overflow-hidden">
            <Card className="flex-1 flex flex-col overflow-hidden">
                <CardContent className="flex-1 overflow-hidden p-0">
                  <Tabs defaultValue="narrative" value={currentMode} className="h-full flex flex-col">
                    <TabsContent value="narrative" className="flex-1 overflow-hidden p-0 m-0">
                      <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
                          <div className="space-y-4">
                              {messages.map((message, index) => {
                                  const isLastMessage = index === messages.length - 1;
                                  const isLastAiMessage = isLastMessage && message.type === 'ai';
                                  const isFirstMessage = index === 0;
                                  const showLootInteraction = message.type === 'ai' && message.loot && message.loot.length > 0 && !message.lootTaken;
                                  
                                  const speakers = (message.type === 'ai' && message.speakingCharacterNames)
                                    ? message.speakingCharacterNames
                                        .map(name => characters.find(c => c.name === name))
                                        .filter((c): c is Character => !!c) // Filter out undefined
                                        .slice(0, 3) // Limit to 3 speakers
                                    : [];

                                  return (
                                      <div key={message.id} className="group relative flex flex-col">
                                          <div className={`flex items-start gap-3 ${message.type === 'user' ? 'justify-end' : ''}`}>
                                          {message.type === 'ai' && (
                                              <div className="flex">
                                                {speakers.length > 0 ? speakers.map((speaker, i) => (
                                                    <Avatar key={speaker.id} className={`h-8 w-8 border ${i > 0 ? "-ml-4" : ""}`}>
                                                        {isValidUrl(speaker.portraitUrl) ? <AvatarImage src={speaker.portraitUrl} alt={speaker.name} /> : <AvatarFallback>{speaker.name.substring(0, 2)}</AvatarFallback>}
                                                    </Avatar>
                                                )) : (
                                                    <Avatar className="h-8 w-8 border">
                                                        <AvatarFallback><Bot className="h-5 w-5 text-muted-foreground"/></AvatarFallback>
                                                    </Avatar>
                                                )}
                                              </div>
                                          )}
                                          <div className={`relative rounded-lg p-3 max-w-[80%] text-sm whitespace-pre-wrap break-words font-sans ${
                                                  message.type === 'user' ? 'bg-primary text-primary-foreground' : (message.type === 'ai' ? 'bg-muted' : 'bg-transparent border italic text-muted-foreground text-center w-full')
                                              }`}>
                                                  {adventureSettings.comicModeActive && message.type === 'ai' ? renderFormattedNarrative(message.content) : message.content}

                                                  {message.type !== 'system' && !isFirstMessage && (
                                                      <div className={`absolute top-0 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 ${message.type === 'user' ? 'left-0 -translate-x-full mr-1' : 'right-0 translate-x-full ml-1'}`}>
                                                        <Dialog open={editingMessage?.id === message.id} onOpenChange={(open) => !open && setEditingMessage(null)}>
                                                            <TooltipProvider>
                                                              <Tooltip>
                                                                  <TooltipTrigger asChild>
                                                                    <DialogTrigger asChild>
                                                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => openEditDialog(message)}>
                                                                          <Edit className="h-4 w-4" />
                                                                      </Button>
                                                                    </DialogTrigger>
                                                                  </TooltipTrigger>
                                                                  <TooltipContent side="top">Modifier</TooltipContent>
                                                              </Tooltip>
                                                            </TooltipProvider>
                                                              <DialogContent>
                                                              <DialogHeader>
                                                                  <DialogTitle>Modifier le Message</DialogTitle>
                                                                  <DialogDescription>
                                                                  Modifiez le contenu du message et l'image ci-dessous.
                                                                  </DialogDescription>
                                                              </DialogHeader>
                                                              <Textarea
                                                                      value={editContent}
                                                                      onChange={(e) => setEditContent(e.target.value)}
                                                                      rows={10}
                                                                      className="my-4"
                                                                  />
                                                              {editingMessage?.imageUrl && (
                                                                  <div className="space-y-2">
                                                                      <Label>Ajuster l'image</Label>
                                                                      <div className="relative w-full aspect-video rounded-md overflow-hidden border">
                                                                          <Image 
                                                                              src={editingMessage.imageUrl} 
                                                                              alt="Ajustement de l'image"
                                                                              fill
                                                                              style={{ objectFit: 'cover' }}
                                                                          />
                                                                      </div>
                                                                  </div>
                                                              )}
                                                              <DialogFooter>
                                                                  <Button variant="outline" onClick={() => setEditingMessage(null)}>Annuler</Button>
                                                                  <Button onClick={handleSaveChanges}>Enregistrer</Button>
                                                              </DialogFooter>
                                                              </DialogContent>
                                                          </Dialog>
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
                                                            {message.type === 'ai' && (
                                                                <>
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => handleMaterializeCharacter(message.content)}>
                                                                                <UserPlus className="h-4 w-4" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top">Matérialiser un PNJ</TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => handleSummarizeHistory(message.content)}>
                                                                                <BrainCircuit className="h-4 w-4" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top">Mémoriser cet événement</TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                                </>
                                                            )}
                                                          {isLastAiMessage && (
                                                              <TooltipProvider>
                                                                  <Tooltip>
                                                                      <TooltipTrigger asChild>
                                                                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={handleRegenerate} disabled={isLoading}>
                                                                              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                                                          </Button>
                                                                      </TooltipTrigger>
                                                                      <TooltipContent side="top">Régénérer</TooltipContent>
                                                                  </Tooltip>
                                                              </TooltipProvider>
                                                          )}
                                                      </div>
                                                  )}
                                                   {showLootInteraction && message.loot && (
                                                      <div className="absolute bottom-1 right-1 z-20">
                                                        <AlertDialog>
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <AlertDialogTrigger asChild>
                                                                            <Button variant="outline" size="icon" className="h-7 w-7 text-amber-600 hover:text-amber-500 border-amber-600 hover:border-amber-500">
                                                                                <Gift className="h-4 w-4" />
                                                                            </Button>
                                                                        </AlertDialogTrigger>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="top">Voir le butin</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </AlertDialog>
                                                      </div>
                                                  )}
                                              </div>
                                              {message.type === 'user' && (
                                                <Avatar className="h-8 w-8 border">
                                                    {isValidUrl(adventureSettings.playerPortraitUrl) ? (
                                                        <AvatarImage src={adventureSettings.playerPortraitUrl} alt={adventureSettings.playerName || 'Player'} />
                                                    ) : (
                                                        <AvatarFallback><UserIcon className="h-5 w-5 text-muted-foreground"/></AvatarFallback>
                                                    )}
                                                </Avatar>
                                              )}
                                          </div>
                                      </div>
                                  );
                              })}
                              {isLoading && (
                                  <div className="flex items-center justify-start gap-3">
                                       <Avatar className="h-8 w-8 border">
                                           <AvatarFallback><Bot className="h-5 w-5 text-muted-foreground"/></AvatarFallback>
                                       </Avatar>
                                       <span className="flex items-center text-muted-foreground italic p-3">
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Écriture en cours...
                                      </span>
                                  </div>
                              )}
                          </div>
                      </ScrollArea>
                    </TabsContent>
                    <TabsContent value="map" className="flex-1 overflow-hidden p-0 m-0 relative">
                       {/* MapDisplay is removed as strategy mode is removed */}
                    </TabsContent>
                  </Tabs>
                </CardContent>
                <CardFooter className="p-4 border-t flex flex-col items-stretch gap-2">
                    <div className="flex gap-2">
                         <TooltipProvider>
                             <Tooltip>
                                 <TooltipTrigger asChild>
                                     <Button type="button" variant="outline" size="icon" onClick={onUndoLastMessage} disabled={isLoading || !canUndo}>
                                         <Trash2Icon className="h-5 w-5" />
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
                                            <Button type="button" variant="outline" size="icon" disabled={isLoading}>
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
                          <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={suggestQuestHookAction}
                                        disabled={isLoading || isSuggestingQuest}
                                    >
                                        {isSuggestingQuest ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lightbulb className="h-5 w-5" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Suggérer un objectif ou une quête</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <Textarea
                            placeholder={"Que faites-vous ? Décrivez votre action..."}
                            value={userAction}
                            onChange={(e) => setUserAction(e.target.value)}
                            onKeyPress={handleKeyPress}
                            rows={1}
                            className="min-h-[40px] max-h-[150px] resize-y flex-1"
                            disabled={isLoading}
                        />
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button type="button" size="icon" onClick={handleSendFromTextarea} disabled={isLoading || !userAction.trim()}>
                                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Envoyer</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </CardFooter>
            </Card>

            <div className="w-1/3 lg:w-1/4 hidden md:flex flex-col gap-4 overflow-y-auto">
                 <Dialog open={imageEditorOpen} onOpenChange={setImageEditorOpen}>
                    <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Éditeur d'Image</DialogTitle>
                            <DialogDescription>
                                Ajoutez des bulles de dialogue à votre image et ajoutez-la à la BD.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 overflow-auto">
                        {imageToEdit && <ImageEditor
                             imageUrl={imageToEdit.url}
                             message={imageToEdit.message}
                             characters={characters}
                             onClose={() => setImageEditorOpen(false)}
                             onSave={onAddToComicPage}
                             playerName={adventureSettings.playerName || "Héros"}
                             playerId={playerId}
                             />}
                        </div>
                    </DialogContent>
                </Dialog>
                <Card>
                    <CardContent className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden">
                        {isValidUrl(imageForDisplay) ? (
                            <div className="relative w-full aspect-square group">
                                <Image
                                    src={imageForDisplay}
                                    alt="Generated Scene"
                                    fill
                                    style={{ objectFit: 'contain' }}
                                    data-ai-hint="adventure scene visual"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                                />
                                <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="icon" className="h-8 w-8 bg-background/50 hover:bg-background/80">
                                                <Expand className="h-4 w-4" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-4xl h-[90vh] p-2">
                                            <DialogHeader>
                                                <DialogTitle className="sr-only">Image de la Scène en Plein Écran</DialogTitle>
                                                <DialogDescription className="sr-only">Agrandissement de l'image générée pour la scène actuelle.</DialogDescription>
                                            </DialogHeader>
                                            <div className="relative w-full h-full">
                                                <Image
                                                    src={imageForDisplay}
                                                    alt="Generated Scene in Fullscreen"
                                                    layout="fill"
                                                    objectFit="contain"
                                                />
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                                <p>Aucune image générée pour cette scène.</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="p-4 border-t flex flex-col gap-2">
                        <div className="flex w-full gap-2">
                            <DropdownMenu>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="icon" className="flex-shrink-0">
                                                    <Palette className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Choisir un style d'image</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                             <DropdownMenuContent>
                                {defaultImageStyles.map((style) => (
                                    <DropdownMenuItem key={style.name} onSelect={() => setImageStyle(style.name === "Par Défaut" ? "" : style.name)}>{style.name}</DropdownMenuItem>
                                ))}
                                {customStyles.length > 0 && <DropdownMenuSeparator />}
                                {customStyles.map((style) => (
                                         <DropdownMenuItem key={style.name} onSelect={() => setImageStyle(style.prompt)} className="flex justify-between items-center pr-1">
                                            <span onClick={(e) => { e.stopPropagation(); setImageStyle(style.prompt); }}>{style.name}</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleDeleteCustomStyle(style.name);}}>
                                                <Trash2Icon className="h-3 w-3 text-destructive"/>
                                            </Button>
                                        </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => setIsCustomStyleDialogOpen(true)}>
                                        Gérer les styles...
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <TooltipProvider>
                                <Tooltip>
                                     <TooltipTrigger asChild>
                                        <Button className="w-full" onClick={() => {
                                            const lastAiMessage = [...messages].reverse().find(m => m.type === 'ai' && m.sceneDescription);
                                            if (lastAiMessage) {
                                                handleGenerateImage(lastAiMessage);
                                            } else {
                                                toast({title: "Description Manquante", description: "Impossible de trouver une description de scène à générer.", variant: "destructive"});
                                            }
                                        }} disabled={isImageLoading || isLoading || !([...messages].reverse().find(m => m.type === 'ai' && m.sceneDescription))}>
                                            <Wand2 className="mr-2 h-4 w-4" />
                                            <span>Générer Image</span>
                                        </Button>
                                     </TooltipTrigger>
                                     <TooltipContent>Utilise l'IA pour générer une image basée sur la description visuelle actuelle (si disponible).</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                             <TooltipProvider>
                                <Tooltip>
                                     <TooltipTrigger asChild>
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="flex-shrink-0"
                                            onClick={() => {
                                                const lastAiMessage = [...messages].reverse().find(m => m.type === 'ai');
                                                if (lastAiMessage) {
                                                    setImageToEdit({ url: imageForDisplay, message: lastAiMessage });
                                                    setImageEditorOpen(true);
                                                } else {
                                                    toast({ title: "Aucune scène à éditer", description: "Il n'y a pas encore de réponse de l'IA à visualiser.", variant: "default" });
                                                }
                                            }}
                                        >
                                            <Edit3 className="h-4 w-4" />
                                        </Button>
                                     </TooltipTrigger>
                                     <TooltipContent>Ouvrir l'éditeur d'image pour la dernière scène (même sans image).</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </CardFooter>
                </Card>
                
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between p-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Clapperboard className="h-5 w-5"/>
                            Brouillon de la BD
                        </CardTitle>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <Save className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onSelect={onDownloadComicDraft}>
                                    <Download className="mr-2 h-4 w-4"/> Télécharger la planche (JPEG)
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setIsSaveComicDialogOpen(true)}>
                                    <Library className="mr-2 h-4 w-4"/> Sauvegarder dans la bibliothèque
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                         <div className="flex items-center justify-center gap-2 mb-2">
                             <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onComicPageChange(Math.max(0, currentComicPageIndex - 1))} disabled={currentComicPageIndex === 0}>
                                <ArrowLeft className="h-4 w-4"/>
                            </Button>
                            <span className="text-xs font-medium">Page {currentComicPageIndex + 1} / {Math.max(1, comicDraft.length)}</span>
                             <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onComicPageChange(Math.min(comicDraft.length - 1, currentComicPageIndex + 1))} disabled={currentComicPageIndex >= comicDraft.length - 1}>
                                <ArrowRight className="h-4 w-4"/>
                            </Button>
                         </div>
                         <ScrollArea className="h-48 w-full">
                             <div className="grid gap-2 p-1" style={{gridTemplateColumns: `repeat(${comicDraft[currentComicPageIndex]?.gridCols || 2}, 1fr)`}}>
                             {comicDraft[currentComicPageIndex] && comicDraft[currentComicPageIndex].panels.length > 0 ? (
                                 comicDraft[currentComicPageIndex].panels.map((panel, panelIndex) => (
                                    <div key={panel.id} className="relative aspect-square bg-muted rounded-md flex items-center justify-center group">
                                        {isValidUrl(panel.imageUrl) ? (
                                            <Image src={panel.imageUrl} alt={`Panel ${panelIndex + 1}`} layout="fill" objectFit="cover" className="rounded-md"/>
                                        ) : (
                                             <ImageIcon className="h-8 w-8 text-muted-foreground"/>
                                        )}
                                        <input type="file" accept="image/*" className="hidden" id={`upload-panel-${currentComicPageIndex}-${panelIndex}`} onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                                onUploadToComicPanel(currentComicPageIndex, panelIndex, e.target.files[0]);
                                            }
                                        }}/>
                                        <Button variant="outline" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => document.getElementById(`upload-panel-${currentComicPageIndex}-${panelIndex}`)?.click()}>
                                            <FileUp className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                ))
                             ) : (
                                <p className="text-sm text-muted-foreground italic text-center col-span-full py-10">Aucune case sur cette page.</p>
                            )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                    <CardFooter className="p-2 border-t flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={onAddComicPage}><PlusCircle className="mr-2 h-4 w-4"/>Page</Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={onAddComicPanel}><PlusSquare className="mr-2 h-4 w-4"/>Case</Button>
                        <Button variant="destructive" size="icon" onClick={onRemoveLastComicPanel}><Trash2Icon className="h-4 w-4"/></Button>
                    </CardFooter>
                </Card>


                 <Dialog open={isCustomStyleDialogOpen} onOpenChange={setIsCustomStyleDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Gérer les Styles Personnalisés</DialogTitle>
                            <DialogDescription>
                                Ajoutez un nouveau style personnalisé ou modifiez les existants.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="custom-style-name">Nom du style</Label>
                                <Input id="custom-style-name" value={customStyleName} onChange={(e) => setCustomStyleName(e.target.value)} placeholder="Ex: Mon style Cyberpunk"/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="custom-style-prompt">Description du style (prompt)</Label>
                                <Textarea
                                    id="custom-style-prompt"
                                    value={customStylePrompt}
                                    onChange={(e) => setCustomStylePrompt(e.target.value)}
                                    placeholder="Ex: cyberpunk, néon, futuriste, couleurs vives, par Katsuhiro Otomo..."
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCustomStyleDialogOpen(false)}>Annuler</Button>
                            <Button onClick={handleSaveCustomStyle}>Enregistrer et Appliquer</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                
                <Dialog open={isSaveComicDialogOpen} onOpenChange={setIsSaveComicDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Sauvegarder dans la Bibliothèque</DialogTitle>
                            <DialogDescription>Donnez un titre à votre BD. Vous pouvez aussi générer une couverture.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="comic-title">Titre de la BD</Label>
                                <Input id="comic-title" value={comicTitle} onChange={(e) => setComicTitle(e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label>Couverture</Label>
                                <div className="relative aspect-[2/3] w-full max-w-sm mx-auto bg-muted rounded-md flex items-center justify-center">
                                    {isLoading ? <Loader2 className="h-8 w-8 animate-spin"/> :
                                     isValidUrl(comicCoverUrl) ? <Image src={comicCoverUrl} alt="Aperçu de la couverture" layout="fill" objectFit="cover" className="rounded-md"/>
                                     : <ImageIcon className="h-10 w-10 text-muted-foreground"/>}
                                </div>
                                <Button onClick={onGenerateCover} disabled={isLoading} className="w-full mt-2">
                                    <Wand2 className="mr-2 h-4 w-4"/> {isLoading ? "Génération..." : "Générer une couverture"}
                                </Button>
                            </div>
                        </div>
                         <DialogFooter>
                            <Button variant="outline" onClick={() => setIsSaveComicDialogOpen(false)}>Annuler</Button>
                            <Button onClick={onSaveToLibrary}>Sauvegarder</Button>
                         </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>
      </div>
    </div>
  );
}
