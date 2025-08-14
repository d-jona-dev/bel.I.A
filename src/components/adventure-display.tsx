
"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription as UICardDescription } from "@/components/ui/card";
import { AvatarImage, AvatarFallback, Avatar } from "@/components/ui/avatar";
import { ImageIcon, Send, Loader2, Map as MapIcon, Wand2, Swords, Shield, ScrollText, Copy, Edit, RefreshCw, User as UserIcon, Bot, Trash2 as Trash2Icon, RotateCcw, Heart, Zap as ZapIcon, BarChart2, Sparkles, Users2, ShieldAlert, Lightbulb, Briefcase, Gift, PackageOpen, PlayCircle, Shirt, BookOpen, Type as FontIcon, Palette, Expand, ZoomIn, ZoomOut, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Edit3 } from "lucide-react";
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
} from "@/components/ui/dropdown-menu";
import type { GenerateAdventureInput, LootedItem, CharacterUpdateSchema, AffinityUpdateSchema, RelationUpdateSchema, NewCharacterSchema, CombatUpdatesSchema } from "@/ai/flows/generate-adventure";
import type { GenerateSceneImageInput, GenerateSceneImageFlowOutput } from "@/ai/flows/generate-scene-image"; // Updated import
import type { SuggestQuestHookInput } from "@/ai/flows/suggest-quest-hook";
import { useToast } from "@/hooks/use-toast";
import type { Message, Character, ActiveCombat, AdventureSettings, PlayerInventoryItem, PlayerSkill, Combatant, MapPointOfInterest, ImageTransform, TimeManagementSettings } from "@/types";
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


interface AdventureDisplayProps {
    playerId: string;
    generateAdventureAction: (userActionText: string) => Promise<void>;
    generateSceneImageAction: (input: GenerateSceneImageInput) => Promise<GenerateSceneImageFlowOutput>; // Updated prop type
    suggestQuestHookAction: (input: SuggestQuestHookInput) => Promise<void>;
    adventureSettings: AdventureSettings;
    characters: Character[]; // Global list of all characters
    initialMessages: Message[];
    currentLanguage: string;
    onNarrativeChange: (content: string, type: 'user' | 'ai', sceneDesc?: string, lootItems?: LootedItem[], imageUrl?: string, imageTransform?: ImageTransform) => void;
    onEditMessage: (messageId: string, newContent: string, newImageTransform?: ImageTransform, newImageUrl?: string) => void;
    onRegenerateLastResponse: () => Promise<void>;
    onUndoLastMessage: () => void;
    activeCombat?: ActiveCombat;
    onCombatUpdates: (combatUpdates: CombatUpdatesSchema, itemsObtained: LootedItem[], currencyGained: number) => void;
    onRestartAdventure: () => void;
    isSuggestingQuest: boolean;
    handleTakeLoot: (messageId: string, itemsToTake: PlayerInventoryItem[]) => void;
    handleDiscardLoot: (messageId: string) => void;
    handlePlayerItemAction: (itemId: string, action: 'use' | 'discard') => void;
    handleEquipItem: (itemId: string) => void;
    handleUnequipItem: (slot: keyof NonNullable<AdventureSettings['equippedItemIds']>) => void;
    handleMapAction: (poiId: string, action: 'travel' | 'examine' | 'collect' | 'attack' | 'upgrade' | 'visit', buildingId?: string) => void;
    useAestheticFont: boolean;
    onToggleAestheticFont: () => void;
    onGenerateMap: () => Promise<void>;
    isGeneratingMap: boolean;
    onPoiPositionChange: (poiId: string, newPosition: { x: number; y: number; }) => void;
    onCreatePoi: (data: { name: string; description: string; type: MapPointOfInterest['icon']; ownerId: string; }) => void;
    onMapImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onMapImageUrlChange: (url: string) => void;
    onAddPoiToMap: (poiId: string) => void;
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
    if (format !== '12h') {
        return time24h;
    }
    const [hours, minutes] = time24h.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    let hours12 = hours % 12;
    if (hours12 === 0) {
        hours12 = 12; // Midnight and Noon case
    }
    return `${hours12}:${String(minutes).padStart(2, '0')} ${ampm}`;
};

export function AdventureDisplay({
    playerId,
    generateAdventureAction,
    generateSceneImageAction,
    suggestQuestHookAction,
    adventureSettings,
    characters, // Global list of characters
    initialMessages,
    currentLanguage,
    onNarrativeChange,
    onEditMessage,
    onRegenerateLastResponse,
    onUndoLastMessage,
    activeCombat,
    onCombatUpdates,
    onRestartAdventure,
    isSuggestingQuest,
    handleTakeLoot,
    handleDiscardLoot,
    handlePlayerItemAction,
    handleEquipItem,
    handleUnequipItem,
    handleMapAction,
    useAestheticFont,
    onToggleAestheticFont,
    onGenerateMap,
    isGeneratingMap,
    onPoiPositionChange,
    onCreatePoi,
    onMapImageUpload,
    onMapImageUrlChange,
    onAddPoiToMap,
}: AdventureDisplayProps) {
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  const [userAction, setUserAction] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isImageLoading, setIsImageLoading] = React.useState<boolean>(false);
  const [currentMode, setCurrentMode] = React.useState<"narrative" | "map">("narrative");
  const [imageStyle, setImageStyle] = React.useState<string>("");

  const [editingMessage, setEditingMessage] = React.useState<Message | null>(null);
  const [editContent, setEditContent] = React.useState<string>("");
  const [editImageTransform, setEditImageTransform] = React.useState<ImageTransform>({ scale: 1, translateX: 0, translateY: 0 });
  const [imageEditorOpen, setImageEditorOpen] = React.useState(false);
  const [imageToEditUrl, setImageToEditUrl] = React.useState<string | null>(null);

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
    const playerNonCombatSkills = adventureSettings.playerSkills?.filter(skill => skill.category !== 'combat') || [];
    const playerCombatSkills = adventureSettings.playerSkills?.filter(skill => skill.category === 'combat') || [];
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

    setIsLoading(true);
    onNarrativeChange(action, 'user');

    try {
        await generateAdventureAction(action);
    } catch (error) { 
        console.error("Error in AdventureDisplay trying to generate adventure:", error);
         toast({ title: "Erreur Critique de l'IA", description: "Impossible de générer la suite de l'aventure.", variant: "destructive" });
    } finally {
        setIsLoading(false);
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

    // Clear previous image on the message before generating a new one
    onEditMessage(message.id, message.content, undefined, null);

    try {
        const result = await generateSceneImageAction({ 
            sceneDescription: descriptionForImage,
            style: imageStyle,
        });
        if (result.error) { 
            return;
        }

        onEditMessage(message.id, message.content, undefined, result.imageUrl);
        
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

  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendFromTextarea();
    }
  };

  const playerInventoryItems = adventureSettings.playerInventory?.filter(item => item.quantity > 0) || [];
  const canUndo = messages.length > 1 && !(messages.length === 1 && messages[0].type === 'system');
  
  const handleAddPoiToMap = (poiId: string) => {
      onAddPoiToMap(poiId);
  }
  
  const PlayerStatusCard = () => {
    if (!adventureSettings.rpgMode) return null;
    const playerCombatData = activeCombat?.isActive ? activeCombat.combatants.find(c => c.characterId === playerId) : undefined;

    return (
        <Card className="shadow-md rounded-lg mb-3">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                   <span>{adventureSettings.playerName || "Joueur"}</span>
                   <span className="text-sm text-muted-foreground">{adventureSettings.playerClass || "Aventurier"} - Niv. {adventureSettings.playerLevel || 1}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <Label className="text-xs font-medium">CA</Label>
                        <span className="text-xs font-semibold">{adventureSettings.playerArmorClass ?? 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                        <Label className="text-xs font-medium">Attaque</Label>
                        <span className="text-xs font-semibold">+{adventureSettings.playerAttackBonus ?? 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                        <Label className="text-xs font-medium">Dégâts</Label>
                        <span className="text-xs font-semibold">{adventureSettings.playerDamageBonus || 'N/A'}</span>
                    </div>
                </div>
                <Separator/>
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <Label htmlFor="player-hp" className="text-sm font-medium flex items-center"><Heart className="h-4 w-4 mr-1 text-red-500"/>PV</Label>
                        <span className="text-xs text-muted-foreground">
                            {playerCombatData?.currentHp ?? adventureSettings.playerCurrentHp ?? 0} / {playerCombatData?.maxHp ?? adventureSettings.playerMaxHp ?? 0}
                        </span>
                    </div>
                    <Progress id="player-hp" value={((playerCombatData?.currentHp ?? adventureSettings.playerCurrentHp ?? 0) / (playerCombatData?.maxHp ?? adventureSettings.playerMaxHp || 1)) * 100} className="h-2 [&>div]:bg-red-500" />
                </div>

                {(adventureSettings.playerMaxMp ?? 0) > 0 && (
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <Label htmlFor="player-mp" className="text-sm font-medium flex items-center"><ZapIcon className="h-4 w-4 mr-1 text-blue-500"/>PM</Label>
                            <span className="text-xs text-muted-foreground">
                                {playerCombatData?.currentMp ?? adventureSettings.playerCurrentMp ?? 0} / {playerCombatData?.maxMp ?? adventureSettings.playerMaxMp ?? 0}
                            </span>
                        </div>
                        <Progress id="player-mp" value={((playerCombatData?.currentMp ?? adventureSettings.playerCurrentMp ?? 0) / (playerCombatData?.maxMp ?? adventureSettings.playerMaxMp || 1)) * 100} className="h-2 [&>div]:bg-blue-500" />
                    </div>
                )}

                <div>
                    <div className="flex justify-between items-center mb-1">
                        <Label htmlFor="player-exp" className="text-sm font-medium flex items-center"><BarChart2 className="h-4 w-4 mr-1 text-yellow-500"/>EXP</Label>
                        <span className="text-xs text-muted-foreground">{adventureSettings.playerCurrentExp ?? 0} / {adventureSettings.playerExpToNextLevel ?? 0}</span>
                    </div>
                    <Progress id="player-exp" value={((adventureSettings.playerCurrentExp ?? 0) / (adventureSettings.playerExpToNextLevel || 1)) * 100} className="h-2 [&>div]:bg-yellow-500" />
                </div>
                {playerCombatData?.statusEffects && playerCombatData.statusEffects.length > 0 && (
                    <div className="mt-2">
                        <Label className="text-xs font-medium flex items-center"><ShieldAlert className="h-3 w-3 mr-1 text-orange-500"/>Statuts Actifs</Label>
                        <div className="text-xs text-muted-foreground">
                            {playerCombatData.statusEffects.map(se => `${se.name} (${se.duration === -1 ? 'permanent' : se.duration + 't'})`).join(', ')}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
  };

  const NpcCombatantCard = ({ combatData }: { combatData: Combatant }) => {
    const character = characters.find(c => c.id === combatData.characterId);
    const name = character?.name || combatData.name;
    const charClass = character?.characterClass;
    const level = character?.level;
    
    const cardBorderColor = combatData.team === 'player' ? 'border-green-500' : 'border-red-500';

    return (
        <Card key={combatData.characterId} className={`bg-muted/50 shadow-sm mb-3 border-2 ${cardBorderColor}`}>
            <CardHeader className="p-3 pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                    <span className="truncate">{name}</span>
                    {charClass && level !== undefined && (
                        <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                            {charClass} Niv. {level}
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-1">
                <div>
                    <div className="flex justify-between items-center mb-0.5">
                        <Label htmlFor={`${combatData.characterId}-hp`} className="text-xs font-medium flex items-center"><Heart className="h-3 w-3 mr-1 text-red-500"/>PV</Label>
                        <span className="text-xs text-muted-foreground">{combatData.currentHp} / {combatData.maxHp}</span>
                    </div>
                    <Progress id={`${combatData.characterId}-hp`} value={(combatData.currentHp / (combatData.maxHp || 1)) * 100} className="h-1.5 [&>div]:bg-red-500" />
                </div>
                {(combatData.maxMp ?? 0) > 0 && (
                    <div>
                        <div className="flex justify-between items-center mb-0.5">
                            <Label htmlFor={`${combatData.characterId}-mp`} className="text-xs font-medium flex items-center"><ZapIcon className="h-3 w-3 mr-1 text-blue-500"/>PM</Label>
                            <span className="text-xs text-muted-foreground">{combatData.currentMp} / {combatData.maxMp}</span>
                        </div>
                        <Progress id={`${combatData.characterId}-mp`} value={((combatData.currentMp ?? 0) / (combatData.maxMp || 1)) * 100} className="h-1.5 [&>div]:bg-blue-500" />
                    </div>
                )}
                {combatData.statusEffects && combatData.statusEffects.length > 0 && (
                    <div className="mt-1">
                        <Label className="text-xs font-medium flex items-center"><ShieldAlert className="h-3 w-3 mr-1 text-orange-500"/>Statuts</Label>
                        <div className="text-xs text-muted-foreground">
                            {combatData.statusEffects.map(se => `${se.name} (${se.duration === -1 ? 'perm.' : se.duration + 't'})`).join(', ')}
                        </div>
                    </div>
                )}
                 {combatData.isDefeated && <p className="text-xs text-destructive font-semibold text-center mt-1">VAINCU</p>}
            </CardContent>
        </Card>
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

                                  return (
                                      <div key={message.id} className="group relative flex flex-col">
                                          <div className={`flex items-start gap-3 ${message.type === 'user' ? 'justify-end' : ''}`}>
                                          {message.type === 'ai' && (
                                              <Avatar className="h-8 w-8 border">
                                                  <AvatarFallback><Bot className="h-5 w-5 text-muted-foreground"/></AvatarFallback>
                                              </Avatar>
                                          )}
                                          <div className={`relative rounded-lg p-3 max-w-[80%] text-sm whitespace-pre-wrap break-words font-sans ${
                                                  message.type === 'user' ? 'bg-primary text-primary-foreground' : (message.type === 'ai' ? 'bg-muted' : 'bg-transparent border italic text-muted-foreground text-center w-full')
                                              }`}>
                                                  {message.content}

                                                  {message.type !== 'system' && !isFirstMessage && (
                                                      <div className={`absolute top-0 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 ${message.type === 'user' ? 'left-0 -translate-x-full mr-1' : 'right-0 translate-x-full ml-1'}`}>
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
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Butin Trouvé !</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Vous avez trouvé les objets suivants :
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <ScrollArea className="max-h-60 my-4">
                                                                    <div className="space-y-3 py-2 pr-2">
                                                                        {message.loot!.map((item, itemIdx) => (
                                                                            <Card key={item.id || itemIdx} className="p-3 bg-muted/50 shadow-sm">
                                                                                <p className="font-semibold">{item.name} (x{item.quantity})</p>
                                                                                {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                                                                                {item.effect && <p className="text-sm text-primary">Effet : {item.effect}</p>}
                                                                                {item.itemType && <p className="text-xs text-muted-foreground">Type : {item.itemType}</p>}
                                                                            </Card>
                                                                        ))}
                                                                    </div>
                                                                </ScrollArea>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel onClick={() => handleDiscardLoot(message.id!)}>Laisser</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleTakeLoot(message.id!, message.loot!)}>Ramasser</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
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
                       <MapDisplay 
                            playerId={playerId}
                            pointsOfInterest={adventureSettings.mapPointsOfInterest || []} 
                            onMapAction={handleMapAction} 
                            useAestheticFont={useAestheticFont}
                            onToggleAestheticFont={onToggleAestheticFont}
                            mapImageUrl={adventureSettings.mapImageUrl}
                            onGenerateMap={onGenerateMap}
                            isGeneratingMap={isGeneratingMap}
                            onPoiPositionChange={onPoiPositionChange}
                            characters={characters}
                            playerName={adventureSettings.playerName || "Joueur"}
                            onCreatePoi={onCreatePoi}
                            playerLocationId={adventureSettings.playerLocationId}
                            onMapImageUpload={onMapImageUpload}
                            onMapImageUrlChange={onMapImageUrlChange}
                            onAddPoiToMap={onAddPoiToMap}
                        />
                    </TabsContent>
                  </Tabs>
                </CardContent>
                <CardFooter className="p-4 border-t flex flex-col items-stretch gap-2">
                    {adventureSettings.rpgMode && activeCombat?.isActive && (
                        <div className="flex flex-wrap gap-2 mb-2">
                             <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="destructive" size="sm" onClick={() => handleSendSpecificAction("Attaquer avec mon arme principale")} disabled={isLoading}>
                                        <Swords className="h-4 w-4 mr-1"/>Attaquer
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Lancer une attaque physique.</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="secondary" size="sm" onClick={() => handleSendSpecificAction("Prendre une posture défensive")} disabled={isLoading}>
                                        <Shield className="h-4 w-4 mr-1"/>Défendre
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Action de combat : Se défendre.</TooltipContent>
                                </Tooltip>

                                <DropdownMenu>
                                    <TooltipProvider>
                                        <Tooltip>
                                        <TooltipTrigger asChild>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="secondary" size="sm" disabled={isLoading || (playerSpells.length === 0 && playerCombatSkills.length === 0 && genericSkills.length === 0)}>
                                                    <Sparkles className="h-4 w-4 mr-1"/>Sort/Comp.
                                                </Button>
                                            </DropdownMenuTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent>Utiliser un sort ou une compétence de combat.</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <DropdownMenuContent>
                                        {playerSpells.length > 0 && (
                                            <>
                                                {playerSpells.map(spell => (
                                                    <DropdownMenuItem key={spell} onSelect={() => handleSendSpecificAction(`Utiliser le sort : ${spell}`)}>
                                                        {spell}
                                                    </DropdownMenuItem>
                                                ))}
                                                <DropdownMenuSeparator />
                                            </>
                                        )}
                                        {playerCombatSkills.length > 0 && (
                                            <>
                                                {playerCombatSkills.map(skill => (
                                                    <DropdownMenuItem key={skill.id} onSelect={() => handleSendSpecificAction(`Utiliser la compétence de combat : ${skill.name}`)}>
                                                        {skill.name}
                                                    </DropdownMenuItem>
                                                ))}
                                                <DropdownMenuSeparator />
                                            </>
                                        )}
                                        {genericSkills.map(skill => (
                                             <DropdownMenuItem key={skill} onSelect={() => handleSendSpecificAction(skill)}>
                                                {skill}
                                            </DropdownMenuItem>
                                        ))}
                                        {(playerSpells.length > 0 || playerCombatSkills.length > 0 || genericSkills.length > 0) && <DropdownMenuSeparator />}
                                        <DropdownMenuItem onSelect={() => setUserAction("Utiliser compétence/sort : ")}>
                                            Autre... (Décrire)
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>


                                 <DropdownMenu>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="secondary" size="sm" disabled={isLoading || playerInventoryItems.length === 0}>
                                                        <Briefcase className="h-4 w-4 mr-1"/>Objet
                                                    </Button>
                                                </DropdownMenuTrigger>
                                            </TooltipTrigger>
                                            <TooltipContent>Utiliser un objet de l'inventaire.</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <DropdownMenuContent>
                                        {playerInventoryItems.length > 0 ? (
                                            playerInventoryItems.map(item => (
                                                <DropdownMenuSub key={item.id}>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <DropdownMenuSubTrigger disabled={(item.type !== 'consumable' && item.type !== 'misc') && !(item.type === 'weapon' || item.type === 'armor' || item.type === 'jewelry')}>
                                                                    {item.name} (x{item.quantity}) {item.isEquipped ? <Shirt className="h-3 w-3 ml-1 text-green-500"/> : ""}
                                                                </DropdownMenuSubTrigger>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="right" align="start">
                                                                <p className="font-semibold">{item.name} {item.isEquipped ? "(Équipé)" : ""}</p>
                                                                {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                                                                {item.effect && <p className="text-xs text-primary">Effet: {item.effect}</p>}
                                                                {item.type && <p className="text-xs capitalize">Type: {item.type}</p>}
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <DropdownMenuSubContent>
                                                        {(item.type === 'weapon' || item.type === 'armor' || item.type === 'jewelry') && (
                                                            item.isEquipped ? (
                                                                <DropdownMenuItem onSelect={() => handleUnequipItem(item.type as 'weapon' | 'armor' | 'jewelry')}>
                                                                    <Trash2Icon className="mr-2 h-4 w-4" /> Déséquiper
                                                                </DropdownMenuItem>
                                                            ) : (
                                                                <DropdownMenuItem onSelect={() => handleEquipItem(item.id)}>
                                                                    <Shirt className="mr-2 h-4 w-4" /> Équiper
                                                                </DropdownMenuItem>
                                                            )
                                                        )}
                                                        <DropdownMenuItem onSelect={() => handlePlayerItemAction(item.id, 'use')} disabled={item.type !== 'consumable'}>
                                                            <PlayCircle className="mr-2 h-4 w-4" /> Utiliser
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handlePlayerItemAction(item.id, 'discard')}>
                                                            <Trash2Icon className="mr-2 h-4 w-4" /> Jeter
                                                        </DropdownMenuItem>
                                                    </DropdownMenuSubContent>
                                                </DropdownMenuSub>
                                            ))
                                        ) : (
                                            <DropdownMenuItem disabled>Inventaire vide</DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
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
                                                Toute la progression narrative sera perdue et l'aventure recommencera depuis la situation initiale. Les paramètres de l'aventure (monde, personnages initiaux, etc.) ne seront pas modifiés. L'état de combat et les statistiques du joueur seront également réinitialisés.
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
                           <DropdownMenu>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    disabled={isLoading || (adventureSettings.rpgMode && (!adventureSettings.playerSkills || adventureSettings.playerSkills.length === 0))}
                                                >
                                                    <BookOpen className="h-5 w-5" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent>Utiliser une compétence hors combat</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <DropdownMenuContent>
                                    {(adventureSettings.playerSkills && adventureSettings.playerSkills.length > 0) ? (
                                        playerNonCombatSkills.map(skill => (
                                            <DropdownMenuItem key={skill.id} onSelect={() => setUserAction(`J'utilise ma compétence : ${skill.name}.`)}>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild><span>{skill.name}</span></TooltipTrigger>
                                                        <TooltipContent side="right" align="start">{skill.description}</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </DropdownMenuItem>
                                        ))
                                    ) : (
                                        <DropdownMenuItem disabled>Aucune compétence disponible</DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                          <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={suggestQuestHookAction as () => Promise<void>}
                                        disabled={isLoading || isSuggestingQuest}
                                    >
                                        {isSuggestingQuest ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lightbulb className="h-5 w-5" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Suggérer un objectif ou une quête</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <Textarea
                            placeholder={adventureSettings.rpgMode && activeCombat?.isActive ? "Décrivez votre action de combat ou complétez l'action pré-remplie..." : "Que faites-vous ? Décrivez votre action..."}
                            value={userAction}
                            onChange={(e) => setUserAction(e.target.value)}
                            onKeyPress={handleKeyPress}
                            rows={1}
                            className="min-h-[40px] max-h-[150px] resize-y flex-1"
                            disabled={isLoading || (adventureSettings.strategyMode && currentMode === 'map')}
                        />
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button type="button" size="icon" onClick={handleSendFromTextarea} disabled={isLoading || !userAction.trim() || (adventureSettings.strategyMode && currentMode === 'map')}>
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
                                Ajoutez des bulles de dialogue à votre image et exportez le résultat.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 overflow-auto">
                        {imageToEditUrl && <ImageEditor imageUrl={imageToEditUrl} />}
                        </div>
                    </DialogContent>
                </Dialog>
                <Card>
                    <CardContent className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden">
                        {messages.find(m=>m.imageUrl) ? (
                            <Dialog>
                                <div className="relative w-full aspect-square group">
                                    <Image
                                        src={messages.find(m=>m.imageUrl)!.imageUrl!}
                                        alt="Generated Scene"
                                        fill
                                        style={{ objectFit: 'contain' }}
                                        data-ai-hint="adventure scene visual"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                                    />
                                    <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="icon" className="h-8 w-8 bg-background/50 hover:bg-background/80">
                                                <Expand className="h-4 w-4" />
                                            </Button>
                                        </DialogTrigger>
                                    </div>
                                </div>
                                <DialogContent className="max-w-4xl h-[90vh] p-2">
                                    <DialogHeader>
                                        <DialogTitle className="sr-only">Image de la Scène Agrandie</DialogTitle>
                                        <DialogDescription className="sr-only">
                                            Version agrandie de l'image de la scène générée par l'IA.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="relative w-full h-full">
                                        <Image
                                            src={messages.find(m=>m.imageUrl)!.imageUrl!}
                                            alt="Generated Scene in Fullscreen"
                                            layout="fill"
                                            objectFit="contain"
                                        />
                                    </div>
                                </DialogContent>
                            </Dialog>
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
                                        <DropdownMenuItem key={style.name} onSelect={() => setImageStyle(style.name === "Par Défaut" ? "" : style.name)}>
                                            {style.name}
                                        </DropdownMenuItem>
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
                                        }} disabled={isImageLoading || isLoading || ![...messages].reverse().find(m => m.type === 'ai' && m.sceneDescription)}>
                                            <Wand2 className="mr-2 h-4 w-4" />
                                            <span>Générer Image</span>
                                        </Button>
                                     </TooltipTrigger>
                                     <TooltipContent>Utilise l'IA pour générer une image basée sur la description visuelle actuelle (si disponible).</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
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

                {/* Combat Status Display or Static Ally Display */}
                {adventureSettings.rpgMode && (
                    <div className="space-y-0">
                        <PlayerStatusCard />
                        
                        {/* Allies in Combat */}
                        {activeCombat?.isActive &&
                          activeCombat.combatants
                            .filter(
                              (c) =>
                                c.team === 'player' &&
                                c.characterId !== playerId &&
                                !c.isDefeated
                            )
                            .map((ally) => (
                                <NpcCombatantCard
                                  key={`ally-${ally.characterId}`}
                                  combatData={ally}
                                />
                              )
                            )}
                        
                        {/* Enemies in Combat */}
                        {activeCombat?.isActive && activeCombat.combatants.filter(c => c.team === 'enemy' && !c.isDefeated).length > 0 && (
                            <Card className={`my-3 border-2 shadow-md ${activeCombat.contestedPoiId ? 'border-orange-500 bg-orange-500/10' : 'border-red-500 bg-red-500/10'}`}>
                                <CardHeader className="p-2 text-center">
                                    {activeCombat.contestedPoiId ? (
                                        <>
                                            <UICardDescription className="text-xs font-semibold text-orange-600">Défenseurs de :</UICardDescription>
                                            <CardTitle className="text-base text-foreground">
                                                {adventureSettings.mapPointsOfInterest?.find(p => p.id === activeCombat.contestedPoiId)?.name || 'Territoire Inconnu'}
                                            </CardTitle>
                                        </>
                                    ) : (
                                        <UICardDescription className="text-xs font-semibold text-red-600">Ennemis</UICardDescription>
                                    )}
                                </CardHeader>
                                <CardContent className="p-2 pt-0">
                                    {activeCombat.combatants
                                        .filter(c => c.team === 'enemy' && !c.isDefeated)
                                        .map(enemy => (
                                            <NpcCombatantCard key={`enemy-${enemy.characterId}`} combatData={enemy} />
                                        ))}
                                </CardContent>
                            </Card>
                        )}
                        
                        {/* Defeated Combatants */}
                         {activeCombat?.isActive && activeCombat.combatants.filter(c => c.isDefeated).length > 0 && (
                            <>
                                <Separator className="my-2" />
                                <UICardDescription className="text-xs text-center py-1">Combattants Vaincus</UICardDescription>
                                {activeCombat.combatants.filter(c => c.isDefeated).map((defeated, index) => (
                                     <NpcCombatantCard key={`defeated-${defeated.characterId}-${index}`} combatData={defeated}/>
                                ))}
                            </>
                         )}
                    </div>
                )}
            </div>
      </div>
    </div>
  );
}
