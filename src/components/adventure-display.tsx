

"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription as UICardDescription } from "@/components/ui/card";
import { AvatarImage, AvatarFallback, Avatar } from "@/components/ui/avatar";
import { ImageIcon, Send, Loader2, Wand2, Copy, Edit, RefreshCw, User as UserIcon, Bot, Trash2 as Trash2Icon, RotateCcw, Lightbulb, Type as FontIcon, Palette, Expand, Save, Download, PlusCircle, Clapperboard, FileUp, PlusSquare, Library, X, UserPlus, BrainCircuit, CalendarDays, Clock, Drama, Edit3, MemoryStick, ArrowLeft, ArrowRight, Heart, Gem, HeartCrack, HeartHandshake, UploadCloud, Link as LinkIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { GenerateAdventureInput, CharacterUpdateSchema, AffinityUpdateSchema, RelationUpdateSchema, SceneDescriptionForImage } from "@/types";
import type { GenerateSceneImageInput, GenerateSceneImageFlowOutput } from "@/ai/flows/generate-scene-image"; // Updated import
import type { SuggestQuestHookInput } from "@/ai/flows/suggest-quest-hook";
import { useToast } from "@/hooks/use-toast";
import type { Message, Character, AdventureSettings, ImageTransform, TimeManagementSettings, ComicPage, Panel, Bubble } from "@/types";
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
import { Separator } from "@/components/ui/separator";
import ImageEditor from "./ImageEditor";
import { Input } from "./ui/input";
import { createNewPage as createNewComicPageUtil, exportPageAsJpeg } from "./ComicPageEditor";
import type { GameClockState } from "@/lib/game-clock"; // NOUVEAU
import { Progress } from "@/components/ui/progress";
import { i18n, type Language } from "@/lib/i18n";
import { defaultImageStyles, type ImageStyle } from "@/lib/image-styles";
import { ThemeToggle } from "@/components/theme-toggle";


interface AdventureDisplayProps {
    playerId: string;
    generateAdventureAction: (userActionText: string, attachedImage?: string | null) => Promise<void>;
    generateSceneImageAction: (input: GenerateSceneImageInput) => Promise<GenerateSceneImageFlowOutput>;
    suggestQuestHookAction: () => Promise<void>;
    onSummarizeHistory: (narrativeContext: string) => Promise<void>;
    adventureSettings: AdventureSettings;
    characters: Character[];
    initialMessages: Message[];
    currentLanguage: string;
    onEditMessage: (messageId: string, newContent: string, newImageTransform?: ImageTransform, newImageUrl?: string) => void;
    onRegenerateLastResponse: () => Promise<void>;
    onUndoLastMessage: () => void;
    onMaterializeCharacter: (narrativeContext: string) => Promise<void>;
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
    timeState: GameClockState; // NOUVEAU
    isGeneratingCover: boolean;
}

interface CustomImageStyle {
  name: string;
  prompt: string;
}

const formatTimeToDisplay = (hour: number, minute: number, format: '12h' | '24h' | undefined) => {
    const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    if (format !== '12h') {
        return timeString;
    }
    const ampm = hour >= 12 ? 'PM' : 'AM';
    let hours12 = hour % 12;
    if (hours12 === 0) hours12 = 12;
    return `${hours12}:${String(minute).padStart(2, '0')} ${ampm}`;
};

interface ImageToEdit {
    url: string | null;
    message: Message;
}

const isValidUrl = (url: string | null | undefined): url is string => {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image');
};

const getAffinityIcon = (affinity: number) => {
    const value = affinity ?? 50;
    if (value <= 10) return <HeartCrack className="h-4 w-4 text-black" />;
    if (value <= 45) return <Heart className="h-4 w-4 text-gray-500" />;
    if (value <= 70) return <HeartHandshake className="h-4 w-4 text-red-500/80" />;
    if (value <= 90) return <Heart className="h-4 w-4 text-red-500/80" fill="currentColor" />;
    return <Gem className="h-4 w-4 text-pink-400" />;
};


const CharacterStatusDisplay = ({ heroSettings, characters, currentLanguage }: { heroSettings: AdventureSettings, characters: Character[], currentLanguage: string}) => {
    if (!heroSettings && characters.length === 0) return null;
    const lang = i18n[currentLanguage as Language] || i18n.en;
    
    return (
        <Card>
            <CardHeader className="p-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <UserIcon className="h-5 w-5"/>
                    {lang.charactersTitle}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-4">
                 {/* Hero Display */}
                 {heroSettings.playerName && (
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">{lang.heroTitle}</Label>
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                                {isValidUrl(heroSettings.playerPortraitUrl) ? (
                                    <AvatarImage src={heroSettings.playerPortraitUrl} alt={heroSettings.playerName} />
                                ) : (
                                    <AvatarFallback>{heroSettings.playerName.substring(0,2)}</AvatarFallback>
                                )}
                            </Avatar>
                            <span className="font-semibold">{heroSettings.playerName}</span>
                        </div>
                    </div>
                )}

                {/* NPC Display */}
                {characters.length > 0 && heroSettings.playerName && <Separator />}
                {characters.length > 0 && (
                     <div className="space-y-3">
                        <Label className="text-xs text-muted-foreground">{lang.presentCharactersTitle}</Label>
                         {characters.filter(c => !c.isPlaceholder).map(char => (
                            <div key={char.id} className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                    {isValidUrl(char.portraitUrl) ? (
                                        <AvatarImage src={char.portraitUrl} alt={char.name} />
                                    ) : (
                                        <AvatarFallback className="text-xs">{char.name.substring(0,2)}</AvatarFallback>
                                    )}
                                </Avatar>
                                <div className="flex-1 space-y-1">
                                    <span className="text-sm font-medium">{char.name}</span>
                                    <div className="flex items-center gap-1.5">
                                        <Progress value={char.affinity ?? 50} className="h-2 w-full"/>
                                        {getAffinityIcon(char.affinity ?? 50)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export function AdventureDisplay({
    playerId,
    generateAdventureAction,
    generateSceneImageAction,
    suggestQuestHookAction,
    onSummarizeHistory,
    adventureSettings,
    characters,
    initialMessages,
    currentLanguage,
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
    isLoading,
    timeState, // NOUVEAU
    isGeneratingCover,
}: AdventureDisplayProps) {
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  const [userAction, setUserAction] = React.useState<string>("");
  const [isImageLoading, setIsImageLoading] = React.useState<boolean>(false);
  
  const [imageStyle, setImageStyle] = React.useState<string>('default');
  
  const [imageForDisplay, setImageForDisplay] = React.useState<string | null>(null);

  const [editingMessage, setEditingMessage] = React.useState<Message | null>(null);
  const [editContent, setEditContent] = React.useState<string>("");
  
  const [imageToEdit, setImageToEdit] = React.useState<ImageToEdit | null>(null);
  const [imageEditorOpen, setImageEditorOpen] = React.useState(false);

  const [isCustomStyleDialogOpen, setIsCustomStyleDialogOpen] = React.useState(false);
  const [customStylePrompt, setCustomStylePrompt] = React.useState("");
  const [customStyleName, setCustomStyleName] = React.useState("");
  const [customStyles, setCustomStyles] = React.useState<CustomImageStyle[]>([]);

  const [attachedImage, setAttachedImage] = React.useState<string | null>(null);
  const uploadInputRef = React.useRef<HTMLInputElement>(null);
  const [isUrlDialogOpen, setIsUrlDialogOpen] = React.useState(false);
  const [imageUrlFromUrl, setImageUrlFromUrl] = React.useState("");

  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const lang = i18n[currentLanguage as Language] || i18n.en;


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
        
        const lastImageUrl = initialMessages.slice().reverse().find(m => m.imageUrl)?.imageUrl;
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
    }, [initialMessages]);


  const handleSendFromTextarea = async () => {
    const currentTextAction = userAction.trim();
    if (!currentTextAction && !attachedImage || isLoading) return;
    
    setUserAction("");
    setAttachedImage(null); // Clear the image after sending
    
    try {
        await generateAdventureAction(currentTextAction, attachedImage);
    } catch (error) { 
        console.error("Error in AdventureDisplay trying to generate adventure:", error);
         toast({ title: "Erreur Critique de l'IA", description: "Impossible de générer la suite de l'aventure.", variant: "destructive" });
    }
  };

  const handleImageAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setAttachedImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };
  
   const handleUrlAttachment = () => {
    if (imageUrlFromUrl.trim()) {
      setAttachedImage(imageUrlFromUrl);
      setIsUrlDialogOpen(false);
      setImageUrlFromUrl("");
    }
  };

  const handleRegenerate = async () => {
    if (isLoading) return;
    try {
        await onRegenerateLastResponse();
    } catch (error) {
        console.error("Error during regeneration triggered from display:", error);
    }
  };

  const handleUndo = () => {
    onUndoLastMessage();
  };


  const handleGenerateImage = async (message: Message) => {
     const descriptionForImage = message.sceneDescriptionForImage;

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
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(content).then(() => {
                React.startTransition(() => { toast({ title: "Copié", description: "Message copié dans le presse-papiers." }); });
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                React.startTransition(() => { toast({ title: "Erreur", description: "Impossible de copier le message.", variant: "destructive" }); });
            });
        } else {
            React.startTransition(() => {
                toast({
                    title: "Fonction non supportée",
                    description: "La copie dans le presse-papiers n'est pas supportée par votre navigateur dans ce contexte (HTTPS requis).",
                    variant: "destructive",
                });
            });
        }
   };

    const openEditDialog = (message: Message) => {
        setEditingMessage(message);
        setEditContent(message.content);
    };

    const handleSaveChanges = () => {
        if (editingMessage) {
            onEditMessage(editingMessage.id, editContent);
            setEditingMessage(null);
        }
    };
    
  const handleMaterializeCharacter = async (context: string) => {
    toast({ title: "Matérialisation en cours...", description: "L'IA crée la fiche du personnage." });
    await onMaterializeCharacter(context);
  };
  
    const handleSummarizeHistory = async (context: string) => {
        toast({ title: "Mémorisation en cours...", description: "L'IA résume l'événement." });
        await onSummarizeHistory(context);
    };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendFromTextarea();
    }
  };

  const canUndo = messages.length > 1 && !(messages.length === 1 && messages[0].type === 'system');
  
  const lastAiMessageWithScene = [...messages].reverse().find(m => m.type === 'ai' && m.sceneDescriptionForImage?.action);

    const renderFormattedNarrative = React.useCallback((text: string) => {
        const {
            dialogueStartSymbol = '"',
            dialogueEndSymbol = '"',
            thoughtStartSymbol = '*',
            thoughtEndSymbol = '*',
        } = adventureSettings.narrativeStyle || {};
        
        // Function to escape special characters for regex
        const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const dialogueRegex = new RegExp(`(${escapeRegex(dialogueStartSymbol)}.*?${escapeRegex(dialogueEndSymbol)})`, 'g');
        const thoughtRegex = new RegExp(`(${escapeRegex(thoughtStartSymbol)}.*?${escapeRegex(thoughtEndSymbol)})`, 'g');

        const parts = text.split(new RegExp(`${dialogueRegex.source}|${thoughtRegex.source}`, 'g')).filter(Boolean);
        
        return (
            <>
                {parts.map((part, index) => {
                    const isDialogue = part.startsWith(dialogueStartSymbol) && part.endsWith(dialogueEndSymbol);
                    const isThought = part.startsWith(thoughtStartSymbol) && part.endsWith(thoughtEndSymbol);
                    
                    if (isDialogue) {
                        return <strong key={index}>{part}</strong>;
                    }
                    if (isThought) {
                        return <em key={index}>{part.slice(thoughtStartSymbol.length, -thoughtEndSymbol.length)}</em>;
                    }
                    return <React.Fragment key={index}>{part}</React.Fragment>;
                })}
            </>
        );
    }, [adventureSettings.narrativeStyle]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
       {adventureSettings.timeManagement?.enabled && timeState && (
           <Card className="mb-2 shadow-sm">
               <CardContent className="p-2 text-xs flex justify-around items-center">
                   <div className="flex items-center gap-2">
                       <CalendarDays className="h-4 w-4 text-muted-foreground"/>
                       <span className="font-semibold">{lang.dayLabel} {timeState.day}:</span>
                       <span>{timeState.dayName}</span>
                   </div>
                   <Separator orientation="vertical" className="h-4"/>
                   <div className="flex items-center gap-2">
                       <Clock className="h-4 w-4 text-muted-foreground"/>
                       <span className="font-semibold">{lang.hourLabel}:</span>
                       <span>{formatTimeToDisplay(timeState.hour, timeState.minute, adventureSettings.timeManagement.timeFormat)}</span>
                   </div>
                    <Separator orientation="vertical" className="h-4"/>
                   <div className="flex items-center gap-2">
                       <Drama className="h-4 w-4 text-muted-foreground"/>
                       <span className="font-semibold">{lang.eventLabel}:</span>
                       <span className="truncate">{adventureSettings.timeManagement.currentEvent || lang.noneLabel}</span>
                   </div>
               </CardContent>
           </Card>
       )}


      <div className="flex-1 flex gap-4 overflow-hidden">
            <Card className="flex-1 flex flex-col overflow-hidden">
                <CardContent className="flex-1 overflow-hidden p-0">
                      <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
                          <div className="space-y-4">
                              {messages.map((message, index) => {
                                  const isLastMessage = index === messages.length - 1;
                                  const isLastAiMessage = isLastMessage && message.type === 'ai';
                                  const isFirstMessage = index === 0;
                                  
                                  const speakers = (message.type === 'ai' && message.content)
                                      ? characters.filter(c => 
                                            new RegExp(`\\b${c.name}\\b`, 'i').test(message.content)
                                        ).slice(0,3)
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
                                                  {renderFormattedNarrative(message.content)}

                                                  {message.type !== 'system' && !isFirstMessage && (
                                                      <div className={`absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 p-1 bg-background/50 backdrop-blur-sm border rounded-md shadow-lg grid grid-cols-2 gap-0.5 ${message.type === 'user' ? 'left-0 -translate-x-full mr-1' : 'right-0 translate-x-full ml-1'}`}>
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
                                                              </DialogHeader>
                                                              <Textarea
                                                                      value={editContent}
                                                                      onChange={(e) => setEditContent(e.target.value)}
                                                                      rows={10}
                                                                      className="my-4"
                                                                  />
                                                              <DialogFooter>
                                                                  <Button variant="outline" onClick={() => setEditingMessage(null)}>Annuler</Button>
                                                                  <Button onClick={handleSaveChanges}>Sauvegarder</Button>
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
                                                                                <MemoryStick className="h-4 w-4" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top">Mémoriser cet événement</TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
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
                                                                </>
                                                            )}
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
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {lang.writingInProgress}
                                      </span>
                                  </div>
                              )}
                          </div>
                      </ScrollArea>
                </CardContent>
                <CardFooter className="p-2 border-t flex flex-col items-stretch gap-2">
                    <div className="flex gap-2">
                         <TooltipProvider>
                             <Tooltip>
                                 <TooltipTrigger asChild>
                                     <Button type="button" variant="outline" size="icon" onClick={handleUndo} disabled={isLoading || !canUndo}>
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
                                                Êtes-vous sûr de vouloir recommencer l'aventure en cours ? Toute la progression narrative et les changements sur les personnages (non sauvegardés globalement) seront perdus et réinitialisés aux derniers paramètres de l'aventure (ou ceux par défaut si non modifiés).
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
                         <div className="flex-1 relative">
                            <Textarea
                                placeholder={lang.userActionPlaceholder}
                                value={userAction}
                                onChange={(e) => setUserAction(e.target.value)}
                                onKeyPress={handleKeyPress}
                                rows={1}
                                className="min-h-[40px] max-h-[150px] resize-y pr-24"
                                disabled={isLoading}
                            />
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                               <input
                                  type="file"
                                  ref={uploadInputRef}
                                  className="hidden"
                                  accept="image/*"
                                  onChange={handleImageAttachment}
                                />
                               <TooltipProvider>
                                 <Tooltip>
                                   <TooltipTrigger asChild>
                                     <Button
                                       size="icon"
                                       variant="ghost"
                                       onClick={() => uploadInputRef.current?.click()}
                                       className="h-7 w-7"
                                     >
                                       <UploadCloud className="h-4 w-4" />
                                     </Button>
                                   </TooltipTrigger>
                                   <TooltipContent side="top">Téléverser une image (expérimental)</TooltipContent>
                                 </Tooltip>
                               </TooltipProvider>

                                <Dialog open={isUrlDialogOpen} onOpenChange={setIsUrlDialogOpen}>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <DialogTrigger asChild>
                                           <Button size="icon" variant="ghost" className="h-7 w-7">
                                            <LinkIcon className="h-4 w-4" />
                                          </Button>
                                        </DialogTrigger>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">Attacher une image depuis une URL (expérimental)</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                   <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Attacher une image depuis une URL</DialogTitle>
                                      </DialogHeader>
                                      <Input
                                        value={imageUrlFromUrl}
                                        onChange={(e) => setImageUrlFromUrl(e.target.value)}
                                        placeholder="https://example.com/image.png"
                                      />
                                      <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsUrlDialogOpen(false)}>Annuler</Button>
                                        <Button onClick={handleUrlAttachment}>Attacher</Button>
                                      </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button type="button" size="icon" onClick={handleSendFromTextarea} disabled={isLoading || (!userAction.trim() && !attachedImage)}>
                                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Envoyer</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                     {attachedImage && (
                        <div className="p-2 border rounded-md flex items-center gap-2 bg-muted/50">
                            <div className="relative w-12 h-12 rounded-md overflow-hidden">
                                <Image src={attachedImage} alt="Aperçu de l'image attachée" layout="fill" objectFit="cover" />
                            </div>
                            <p className="text-xs text-muted-foreground flex-1 truncate">Image attachée à la prochaine action.</p>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAttachedImage(null)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </CardFooter>
            </Card>

            <div className="w-1/3 lg:w-1/4 hidden md:flex flex-col gap-4 overflow-y-auto">
                 <Dialog open={imageEditorOpen} onOpenChange={setImageEditorOpen}>
                    <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>{lang.imageEditorTitle}</DialogTitle>
                            <DialogDescription>
                                {lang.imageEditorDescription}
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
                             currentLanguage={currentLanguage}
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
                                                    fill
                                                    style={{ objectFit: 'contain' }}
                                                />
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                                <p>{lang.noImageGenerated}</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="p-4 border-t flex flex-col gap-2">
                         <Button
                            variant="secondary"
                            className="w-full"
                            onClick={() => {
                                const lastAiMessage = [...messages].reverse().find(m => m.type === 'ai');
                                const messageToEdit = lastAiMessage || {
                                    id: 'temp-blank',
                                    type: 'ai',
                                    content: 'N/A',
                                    timestamp: Date.now(),
                                };
                                setImageToEdit({ url: imageForDisplay, message: messageToEdit });
                                setImageEditorOpen(true);
                            }}
                        >
                            <Edit3 className="mr-2 h-4 w-4" /> {lang.comicEditorButton}
                        </Button>
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
                                    <DropdownMenuItem key={style.key} onSelect={() => setImageStyle(style.key)}>{lang[style.langKey as keyof typeof lang] || style.key}</DropdownMenuItem>
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
                                            if (lastAiMessageWithScene) {
                                                handleGenerateImage(lastAiMessageWithScene);
                                            } else {
                                                toast({title: "Description Manquante", description: "Impossible de trouver une description de scène à générer.", variant: "destructive"});
                                            }
                                        }} disabled={isImageLoading || isLoading || !lastAiMessageWithScene}>
                                            <Wand2 className="mr-2 h-4 w-4" />
                                            <span>{lang.generateButton}</span>
                                        </Button>
                                     </TooltipTrigger>
                                     <TooltipContent>Utilise l'IA pour générer une image basée sur la description visuelle actuelle (si disponible).</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </CardFooter>
                </Card>
                
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between p-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Clapperboard className="h-5 w-5"/>
                            {lang.comicDraftTitle}
                        </CardTitle>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <Save className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onSelect={onDownloadComicDraft}>
                                    <Download className="mr-2 h-4 w-4"/> {lang.downloadPage}
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setIsSaveComicDialogOpen(true)}>
                                    <Library className="mr-2 h-4 w-4"/> {lang.saveToLibrary}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                         <div className="flex items-center justify-center gap-2 mb-2">
                             <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onComicPageChange(Math.max(0, currentComicPageIndex - 1))} disabled={currentComicPageIndex === 0}>
                                <ArrowLeft className="h-4 w-4"/>
                            </Button>
                            <span className="text-xs font-medium">{lang.page} {currentComicPageIndex + 1} / {Math.max(1, comicDraft.length)}</span>
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
                                            <Image src={panel.imageUrl} alt={`Panel ${panelIndex + 1}`} fill style={{objectFit: 'cover'}} className="rounded-md"/>
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
                                <p className="text-sm text-muted-foreground italic text-center col-span-full py-10">Aucune case sur cette planche.</p>
                            )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                    <CardFooter className="p-2 border-t flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={onAddComicPage}><PlusCircle className="mr-2 h-4 w-4"/>{lang.addPage}</Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={onAddComicPanel}><PlusSquare className="mr-2 h-4 w-4"/>{lang.addPanel}</Button>
                        <Button variant="destructive" size="icon" onClick={onRemoveLastComicPanel}><Trash2Icon className="h-4 w-4"/></Button>
                    </CardFooter>
                </Card>

                <CharacterStatusDisplay heroSettings={adventureSettings} characters={characters} currentLanguage={currentLanguage} />

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
                                    {isGeneratingCover ? <Loader2 className="h-8 w-8 animate-spin"/> :
                                     isValidUrl(comicCoverUrl) ? <Image src={comicCoverUrl} alt="Aperçu de la couverture" fill style={{objectFit: 'cover'}} className="rounded-md"/>
                                     : <ImageIcon className="h-10 w-10 text-muted-foreground"/>}
                                </div>
                                <Button onClick={onGenerateCover} disabled={isGeneratingCover} className="w-full mt-2">
                                    <Wand2 className="mr-2 h-4 w-4"/> {isGeneratingCover ? "Génération..." : "Générer une couverture"}
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
