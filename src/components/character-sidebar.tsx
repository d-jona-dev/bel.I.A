
"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription as UICardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Wand2, Loader2, User, ScrollText, BarChartHorizontal, Brain, History, Star, Dices, Shield, Swords, Zap, PlusCircle, Trash2, Save, Heart, Link as LinkIcon, UserPlus, UploadCloud, Users, FilePenLine, BarChart2 as ExpIcon, MapPin, Palette, Replace, Eye, AlertTriangle, UserCog, MemoryStick, RefreshCcw, Shirt, Library } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import type { GenerateSceneImageInput, GenerateSceneImageOutput } from "@/ai/flows/generate-scene-image";
import { useToast } from "@/hooks/use-toast";
import type { Character, ClothingItem, AdventureSettings } from "@/types";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { describeAppearance } from "@/ai/flows/describe-appearance";
import { Checkbox } from "@/components/ui/checkbox";
import { i18n, type Language } from "@/lib/i18n";
import { Badge } from "./ui/badge";


const BASE_ATTRIBUTE_VALUE_FORM = 8;
const ATTRIBUTE_POINTS_PER_LEVEL_GAIN_FORM = 5;
const INITIAL_CREATION_ATTRIBUTE_POINTS_NPC_DEFAULT = 5;

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


// Define props for the CharacterSidebar
interface CharacterSidebarProps {
    characters: Character[];
    onCharacterUpdate: (updatedCharacter: Character) => void;
    onSaveNewCharacter: (character: Character) => void;
    onAddStagedCharacter: (character: Character) => void;
    onRelationUpdate: (charId: string, targetId: string, newRelation: string) => void;
    generateImageAction: (input: GenerateSceneImageInput) => Promise<GenerateSceneImageOutput>;
    relationsMode: boolean;
    playerId: string;
    playerName: string;
    currentLanguage: string;
    adventureSettings: AdventureSettings; // Added
}

const RelationsEditableCard = ({ charId, data, characters, playerId, playerName, currentLanguage, onUpdate, onRemove, disabled = false }: { charId: string, data?: Record<string, string>, characters: Character[], playerId: string, playerName: string, currentLanguage: string, onUpdate: (charId: string, field: 'relations', key: string, value: string | number | boolean) => void, onRemove: (charId: string, field: 'relations', key: string) => void, disabled?: boolean }) => {
  const lang = i18n[currentLanguage as Language] || i18n.en;

  return (
      <div className="space-y-2">
          <Label className="flex items-center gap-1"><LinkIcon className="h-4 w-4" /> {lang.relationsLabel}</Label>
          <Card className="bg-muted/30 border">
              <CardContent className="p-3 space-y-2">
                   <div className="flex items-center gap-2">
                      <Label htmlFor={`${charId}-relations-${playerId}`} className="truncate text-sm shrink-0">{playerName} ({lang.playerLabel})</Label>
                      <Input
                          id={`${charId}-relations-${playerId}`}
                          type="text"
                          defaultValue={data?.[playerId] || lang.unknownLabel}
                          onBlur={(e) => onUpdate(charId, 'relations', playerId, e.target.value)}
                          className="h-8 text-sm flex-1 bg-background border"
                          placeholder={lang.relationPlaceholder}
                          disabled={disabled}
                      />
                   </div>

                  {characters.filter(c => c.id !== charId).map(otherChar => (
                      <div key={otherChar.id} className="flex items-center gap-2">
                          <Label htmlFor={`${charId}-relations-${otherChar.id}`} className="truncate text-sm shrink-0">{otherChar.name}</Label>
                          <Input
                              id={`${charId}-relations-${otherChar.id}`}
                              type="text"
                              defaultValue={data?.[otherChar.id] || lang.unknownLabel}
                              onBlur={(e) => onUpdate(charId, 'relations', otherChar.id, e.target.value)}
                              className="h-8 text-sm flex-1 bg-background border"
                              placeholder={lang.relationPlaceholder}
                              disabled={disabled}
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onRemove(charId, 'relations', otherChar.id)} title={lang.resetRelationTooltip} disabled={disabled}>
                              <Trash2 className="h-4 w-4" />
                           </Button>
                      </div>
                  ))}
                  {characters.filter(c => c.id !== charId).length === 0 && (!data || !data[playerId] || Object.keys(data).length <= (data[playerId] ? 1:0) ) && (
                       <p className="text-muted-foreground italic text-sm">{lang.noOtherNpcRelations}</p>
                  )}
                   <p className="text-xs text-muted-foreground pt-1">{lang.describeRelationHelpText}</p>
              </CardContent>
          </Card>
      </div>
  );
};

const ArrayEditableCard = ({ charId, field, title, icon: Icon, data, addLabel, onUpdate, onRemove, onAdd, currentLanguage, disabled = false, addDialog }: { charId: string, field: 'spells' | 'memory', title: string, icon: React.ElementType, data?: string[], addLabel: string, onUpdate: (charId: string, field: 'spells' | 'memory', index: number, value: string) => void, onRemove: (charId: string, field: 'spells' | 'memory', index: number) => void, onAdd: (charId: string, field: 'spells' | 'memory') => void, currentLanguage: string, disabled?: boolean, addDialog?: React.ReactNode }) => {
    const lang = i18n[currentLanguage as Language] || i18n.en;

    const handleAddItem = () => {
        onAdd(charId, field);
    };

    return (
   <div className="space-y-2">
       <Label className="flex items-center gap-1"><Icon className="h-4 w-4"/> {title}</Label>
       <Card className="bg-muted/30 border">
           <CardContent className="p-3 space-y-2">
               {data && data.length > 0 ? (
                    <ScrollArea className="h-32">
                      {data.map((item, index) => (
                          <div key={index} className="flex items-center gap-2 mb-1">
                              <Textarea
                                  defaultValue={item}
                                  onBlur={(e) => onUpdate(charId, field as 'spells', index, e.target.value)}
                                  className="text-sm flex-1 bg-background border"
                                  placeholder={`${lang.entryLabel} ${index + 1}`}
                                  rows={1}
                                  disabled={disabled}
                              />
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive self-start" onClick={() => onRemove(charId, field as 'spells', index)} disabled={disabled}>
                                  <Trash2 className="h-4 w-4" />
                              </Button>
                          </div>
                      ))}
                   </ScrollArea>
               ) : (
                   <p className="text-muted-foreground italic text-sm">{lang.noItemsAdded.replace('{items}', title.toLowerCase())}</p>
               )}
                {addDialog || (
                     <Button variant="outline" size="sm" className="w-full mt-2" onClick={handleAddItem} disabled={disabled}>
                       <PlusCircle className="mr-1 h-4 w-4"/> {addLabel}
                   </Button>
                )}
           </CardContent>
       </Card>
   </div>
    )
};


export function CharacterSidebar({
    characters: initialCharacters,
    onCharacterUpdate,
    onSaveNewCharacter: onSaveNewCharacterProp,
    onAddStagedCharacter,
    onRelationUpdate,
    generateImageAction,
    relationsMode,
    playerId,
    playerName,
    currentLanguage,
    adventureSettings,
}: CharacterSidebarProps) {
  const [imageLoadingStates, setImageLoadingStates] = React.useState<Record<string, boolean>>({});
  const [isClient, setIsClient] = React.useState(false);
  const [globalCharactersList, setGlobalCharactersList] = React.useState<Character[]>([]);
  const { toast } = useToast();
  const lang = i18n[currentLanguage as Language] || i18n.en;

  const loadGlobalChars = React.useCallback(() => {
    if (typeof window !== 'undefined') {
        try {
            const storedGlobalChars = localStorage.getItem('globalCharacters');
            if (storedGlobalChars) {
                setGlobalCharactersList(JSON.parse(storedGlobalChars));
            }
        } catch (error) {
            console.error("Failed to load global characters from localStorage:", error);
            toast({
                title: lang.loadingErrorTitle,
                description: lang.loadingErrorDescription,
                variant: "destructive",
            });
        }
    }
  }, [toast, lang]);

  React.useEffect(() => {
    setIsClient(true);
    loadGlobalChars();
    window.addEventListener('storage', loadGlobalChars);
    return () => {
      window.removeEventListener('storage', loadGlobalChars);
    }
  }, [loadGlobalChars]);

  const onSaveOrUpdateCharacter = (charToSave: Character) => {
    try {
        const globalChars: Character[] = JSON.parse(localStorage.getItem('globalCharacters') || '[]');
        const charIndex = globalChars.findIndex((c: Character) => c.id === charToSave.id);
        const newChar = { ...charToSave, _lastSaved: Date.now() };

        let updatedGlobalChars;
        if (charIndex > -1) {
            updatedGlobalChars = [...globalChars];
            updatedGlobalChars[charIndex] = newChar;
            toast({ title: lang.characterUpdatedTitle, description: lang.characterUpdatedDesc.replace('{charName}', charToSave.name) });
        } else {
            updatedGlobalChars = [...globalChars, newChar];
            toast({ title: lang.characterSavedTitle, description: lang.characterSavedDesc.replace('{charName}', charToSave.name) });
        }
        
        localStorage.setItem('globalCharacters', JSON.stringify(updatedGlobalChars));
        setGlobalCharactersList(updatedGlobalChars); // Update local state to reflect change
        onCharacterUpdate(newChar); // Update the character in the current adventure
        
    } catch (e) {
        toast({ title: lang.saveErrorTitle, variant: "destructive" });
    }
  };


  const availableGlobalChars = React.useMemo(() => {
    if (!isClient) return [];
    return globalCharactersList.filter(
        gc => !initialCharacters.some(sc => sc.id === gc.id)
    );
  }, [globalCharactersList, initialCharacters, isClient]);

  const handleAddGlobalCharToAdventure = (charId: string) => {
    if (!charId) return;
    const charToAdd = globalCharactersList.find(gc => gc.id === charId);
    if (charToAdd) {
        onAddStagedCharacter(charToAdd);
    }
  };

  return (
    <div className="w-full">
        {isClient && (
            <Card className="mb-4 border-dashed">
                <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                         <span className="flex items-center gap-2">
                           <UserPlus className="h-5 w-5" />
                           {lang.globalCharactersTitle}
                         </span>
                         <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                     <div className="flex items-center justify-center h-6 w-6 bg-muted text-muted-foreground rounded-full text-xs font-bold">
                                        {globalCharactersList.length}
                                     </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{lang.globalCharactersCountTooltip.replace('{count}', String(globalCharactersList.length))}</p>
                                </TooltipContent>
                            </Tooltip>
                         </TooltipProvider>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {globalCharactersList.length === 0 ? (
                         <p className="text-sm text-muted-foreground mt-1">
                           {lang.noGlobalCharacters}
                         </p>
                    ) : availableGlobalChars.length > 0 ? (
                        <Select onValueChange={handleAddGlobalCharToAdventure}>
                            <SelectTrigger>
                                <SelectValue placeholder={lang.addExistingCharacterPlaceholder} />
                            </SelectTrigger>
                            <SelectContent>
                                {availableGlobalChars.map(gc => (
                                    <SelectItem key={gc.id} value={gc.id}>
                                        {gc.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                         <p className="text-sm text-muted-foreground mt-1">
                           {lang.allCharactersInAdventure}
                         </p>
                    )}
                </CardContent>
            </Card>
        )}

        {initialCharacters.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">{lang.noNPCsForAdventure}</p>
        ) : (
            <Accordion type="multiple" className="w-full">
                {initialCharacters.map((char, index) => (
                    <CharacterAccordionItem
                        key={char.id}
                        character={char}
                        characterIndex={index}
                        isClient={isClient}
                        imageLoadingStates={imageLoadingStates}
                        setImageLoadingStates={setImageLoadingStates}
                        onSaveOrUpdateCharacter={onSaveOrUpdateCharacter}
                        generateImageAction={generateImageAction}
                        onCharacterUpdate={onCharacterUpdate}
                        relationsMode={relationsMode}
                        playerId={playerId}
                        playerName={playerName}
                        currentLanguage={currentLanguage}
                        allCharacters={initialCharacters}
                        adventureSettings={adventureSettings}
                    />
                ))}
            </Accordion>
        )}
    </div>
  );
}

// Memoized Character item to prevent re-renders of all characters when one is updated.
const CharacterAccordionItem = React.memo(function CharacterAccordionItem({
    character: char,
    characterIndex,
    isClient,
    imageLoadingStates,
    setImageLoadingStates,
    onSaveOrUpdateCharacter,
    generateImageAction,
    onCharacterUpdate,
    relationsMode,
    playerId,
    playerName,
    currentLanguage,
    allCharacters,
    adventureSettings,
}: {
    character: Character;
    characterIndex: number;
    isClient: boolean;
    imageLoadingStates: Record<string, boolean>;
    setImageLoadingStates: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    onSaveOrUpdateCharacter: (character: Character) => void;
    generateImageAction: (input: GenerateSceneImageInput) => Promise<GenerateSceneImageOutput>;
    onCharacterUpdate: (updatedCharacter: Character) => void;
    relationsMode: boolean;
    playerId: string;
    playerName: string;
    currentLanguage: string;
    allCharacters: Character[];
    adventureSettings: AdventureSettings;
}) {
    const { toast } = useToast();
    const lang = i18n[currentLanguage as Language] || i18n.en;
    
    const [describingAppearance, setDescribingAppearance] = React.useState(false);

    const handleFieldChange = (field: keyof Character, value: any) => {
        onCharacterUpdate({ ...char, [field]: value });
    };

    const handleLoadFromWardrobe = (itemDescription: string) => {
        handleFieldChange('clothingDescription', itemDescription);
        toast({
            title: lang.clothingAppliedTitle,
            description: `La description des vêtements de ${char.name} a été mise à jour.`
        });
    };

    const handleNestedFieldChange = (charId: string, field: 'relations', key: string, value: string | number | boolean) => {
        const character = allCharacters.find(c => c.id === charId);
        if (character) {
             const currentFieldData = character[field] || {};
             const updated = {...character, [field]: {...currentFieldData, [key]: value}};
             onCharacterUpdate(updated);
        }
    };

     const removeNestedField = (charId: string, field: 'relations', key: string) => {
        const character = allCharacters.find(c => c.id === charId);
        if (character && character[field]) {
            const updated = {...character, [field]: {...character[field], [key]: lang.unknownLabel}};
            onCharacterUpdate(updated);
        }
    };
    
    const [imageStyle, setImageStyle] = React.useState<string>("");
    const [customStyles, setCustomStyles] = React.useState<CustomImageStyle[]>([]);
    const [isUrlDialogOpen, setIsUrlDialogOpen] = React.useState(false);
    const [portraitUrl, setPortraitUrl] = React.useState(char.portraitUrl || "");
    const [visionConsentChecked, setVisionConsentChecked] = React.useState(false);
    const [wardrobe, setWardrobe] = React.useState<ClothingItem[]>([]);
    
    const disclaimerText = lang.visionConsent;
    const memoryLabel = lang.memory;

    React.useEffect(() => {
        const loadData = () => {
             try {
                const savedStyles = localStorage.getItem("customImageStyles_v1");
                if (savedStyles) setCustomStyles(JSON.parse(savedStyles));

                const savedWardrobe = localStorage.getItem("wardrobe_items_v1");
                if (savedWardrobe) {
                    setWardrobe(JSON.parse(savedWardrobe));
                }
                
            } catch (error) {
                console.error("Failed to load data:", error);
            }
        };
        loadData();
        window.addEventListener('storage', loadData);
        return () => window.removeEventListener('storage', loadData);
    }, []);
    
    const handleDescribeAppearance = async () => {
        if (!char.portraitUrl || describingAppearance) return;

        setDescribingAppearance(true);
        toast({ title: lang.imageAnalysisInProgress, description: lang.aiDescribingAppearance.replace('{charName}', char.name)});

        try {
            const result = await describeAppearance({ 
              portraitUrl: char.portraitUrl,
              aiConfig: adventureSettings.aiConfig 
            });
            handleFieldChange('appearanceDescription', result.description);
            toast({ title: lang.descriptionSuccessTitle, description: lang.appearanceDescribed.replace('{charName}', char.name) });
        } catch (error) {
            console.error("Error describing appearance:", error);
            toast({ title: lang.visionErrorTitle, description: `${lang.describeAppearanceError} ${error instanceof Error ? error.message : ""}`, variant: "destructive" });
        } finally {
            setDescribingAppearance(false);
        }
    };
    
    const handleGeneratePortrait = async () => {
        if (imageLoadingStates[char.id]) return;
        setImageLoadingStates(prev => ({ ...prev, [char.id]: true }));

        try {
          const prompt = `portrait of ${char.name}, ${char.characterClass}. Description: ${char.details}.`;
          const result = await generateImageAction({ sceneDescription: { action: prompt, charactersInScene: [] }, style: imageStyle });
          if(result.imageUrl){
            handleFieldChange('portraitUrl', result.imageUrl);
            toast({
              title: lang.portraitGeneratedTitle,
              description: lang.portraitGeneratedDesc.replace('{charName}', char.name),
            });
          } else {
            throw new Error(result.error || lang.imageGenerationFailed);
          }
        } catch (error) {
          console.error(`Error generating portrait for ${char.name}:`, error);
          toast({
            title: lang.generationErrorTitle,
            description: `${lang.portraitGenerationError.replace('{charName}', char.name)}`,
            variant: "destructive",
          });
        } finally {
          setImageLoadingStates(prev => ({ ...prev, [char.id]: false }));
        }
      };

    const handleUploadPortrait = (characterId: string, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            handleFieldChange('portraitUrl', reader.result as string);
            toast({ title: lang.portraitUploadedTitle, description: lang.portraitUploadedDesc.replace('{charName}', char.name) });
        };
        reader.readAsDataURL(file);
        if(event.target) event.target.value = '';
    };

    const handleSaveUrl = () => {
        handleFieldChange('portraitUrl', portraitUrl);
        setIsUrlDialogOpen(false);
        toast({ title: lang.portraitUpdatedTitle, description: lang.portraitUrlSaved });
    };

    const getAffinityLabel = (affinity?: number): string => {
        const value = affinity ?? 50;
        if (value <= 10) return lang.affinityHate;
        if (value <= 30) return lang.affinityHostile;
        if (value <= 45) return lang.affinityWary;
        if (value <= 70) return lang.affinityFriendly;
        if (value <= 90) return lang.affinityLoyal;
        return lang.affinityDevoted;
    };

    const isGloballySaved = isClient && char._lastSaved;
    const currentAffinity = char.affinity ?? 50;
    
    const isValidUrl = (url: string | null | undefined): url is string => {
        if (!url) return false;
        return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image');
    };

    return (
        <AccordionItem value={char.id}>
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                        {imageLoadingStates[char.id] ? (
                            <AvatarFallback><Loader2 className="h-4 w-4 animate-spin"/></AvatarFallback>
                        ) : isValidUrl(char.portraitUrl) ? (
                            <AvatarImage src={char.portraitUrl} alt={char.name} />
                        ) : (
                                <AvatarFallback>{char.isPlaceholder ? <UserCog/> : char.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        )}
                    </Avatar>
                    <span className="font-medium truncate">{char.isPlaceholder ? (char.roleInStory || `${lang.emptyPlaceholderLabel} ${characterIndex + 1}`) : char.name}</span>
                        {char.isPlaceholder && (<span className="text-xs text-muted-foreground italic">({lang.placeholderLabelShort})</span>)}
                    {isGloballySaved && !char.isPlaceholder && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span><Save className="h-3 w-3 text-primary ml-1 flex-shrink-0" /></span>
                                </TooltipTrigger>
                                <TooltipContent side="top"><p>{lang.characterSavedGlobally}</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-4 bg-background">
                {char.isPlaceholder ? (
                     <Textarea
                        value={char.roleInStory || ''}
                        onChange={(e) => handleFieldChange('roleInStory', e.target.value)}
                        placeholder={lang.placeholderRolePlaceholder}
                    />
                ) : (
                    <>
                    <div className="flex gap-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => onSaveOrUpdateCharacter(char)}>
                                        {isGloballySaved ? <RefreshCcw className="h-4 w-4 mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                                        {isGloballySaved ? lang.updateButton : lang.saveButton}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    <p>{isGloballySaved ? lang.updateCharacterTooltip : lang.saveCharacterTooltip}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    <div className="flex items-start gap-4">
                            <div className="w-24 h-24 relative rounded-md overflow-hidden border bg-muted flex items-center justify-center flex-shrink-0">
                                {imageLoadingStates[char.id] ? (
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/>
                                ) : isValidUrl(char.portraitUrl) ? (
                                    <Image src={char.portraitUrl} alt={`${char.name} portrait`} layout="fill" objectFit="cover" />
                                ) : (
                                    <User className="h-10 w-10 text-muted-foreground"/>
                                )}
                            </div>
                            <div className="flex flex-col gap-2 flex-1">
                                <DropdownMenu>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" size="icon" className="h-8 w-8">
                                                        <Palette className="h-4 w-4"/>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                            </TooltipTrigger>
                                            <TooltipContent><p>{lang.chooseImageStyleTooltip}</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <DropdownMenuContent>
                                        {defaultImageStyles.map((style) => (
                                            <DropdownMenuItem key={style.name} onSelect={() => setImageStyle(style.name === "Par Défaut" ? "" : style.name)}>{style.name}</DropdownMenuItem>
                                        ))}
                                        {customStyles.length > 0 && <DropdownMenuSeparator />}
                                        {customStyles.map((style) => (
                                            <DropdownMenuItem key={style.name} onSelect={() => setImageStyle(style.prompt)}>{style.name}</DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleGeneratePortrait} disabled={imageLoadingStates[char.id]}><Wand2 className="h-4 w-4"/></Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>{lang.generateAIPortraitTooltip}</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <input
                                    type="file"
                                    accept="image/*"
                                    id={`upload-portrait-${char.id}`}
                                    className="hidden"
                                    onChange={(e) => handleUploadPortrait(char.id, e)}
                                />
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => document.getElementById(`upload-portrait-${char.id}`)?.click()}><UploadCloud className="h-4 w-4"/></Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>{lang.uploadCustomPortraitTooltip}</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <Dialog open={isUrlDialogOpen} onOpenChange={setIsUrlDialogOpen}>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="outline" size="icon" className="h-8 w-8">
                                                    <LinkIcon className="h-4 w-4"/>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>{lang.setPortraitFromURLTooltip}</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>{lang.setPortraitFromURLDialogTitle}</DialogTitle>
                                            <DialogDescription>
                                                {lang.setPortraitFromURLDialogDesc.replace('{charName}', char.name)}
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="py-4">
                                            <Label htmlFor="portrait-url">{lang.imageURLInputLabel}</Label>
                                            <Input
                                                id="portrait-url"
                                                value={portraitUrl}
                                                onChange={(e) => setPortraitUrl(e.target.value)}
                                                placeholder={lang.imageURLInputPlaceholder}
                                                className="mt-1"
                                            />
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setIsUrlDialogOpen(false)}>{lang.cancelButton}</Button>
                                            <Button onClick={handleSaveUrl}>{lang.saveURLButton}</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                    </div>

                        <Separator />

                        <div className="space-y-1">
                            <Label htmlFor={`${char.id}-clothingDescription`} className="flex items-center gap-2">
                                <Shirt className="h-4 w-4" /> {lang.clothingDescriptionLabel}
                            </Label>
                             <div className="flex items-center gap-2">
                                <Textarea
                                    id={`${char.id}-clothingDescription`}
                                    value={char.clothingDescription || ''}
                                    onChange={(e) => handleFieldChange('clothingDescription', e.target.value)}
                                    placeholder={lang.clothingDescriptionPlaceholder}
                                    rows={3}
                                    className="text-sm bg-background border flex-1"
                                />
                                <DropdownMenu>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="flex-shrink-0"><Library className="h-4 w-4"/></Button>
                                                </DropdownMenuTrigger>
                                            </TooltipTrigger>
                                            <TooltipContent><p>{lang.loadFromWardrobeTooltip}</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <DropdownMenuContent>
                                        {wardrobe.length > 0 ? (
                                            wardrobe.map(item => (
                                                <DropdownMenuItem key={item.id} onSelect={() => handleLoadFromWardrobe(item.description)}>
                                                    <div className="flex items-center gap-2">
                                                        {item.imageUrl && (
                                                            <img 
                                                                src={item.imageUrl} 
                                                                alt={item.name}
                                                                className="w-6 h-6 object-cover rounded"
                                                            />
                                                        )}
                                                        <span>{item.name}</span>
                                                    </div>
                                                </DropdownMenuItem>
                                            ))
                                        ) : (
                                            <DropdownMenuItem disabled>{lang.wardrobeEmpty}</DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                        
                         <div className="space-y-2">
                            <Label className="flex items-center gap-2"><Eye className="h-4 w-4" /> {lang.appearanceDescriptionLabel}</Label>
                             <Textarea
                                value={char.appearanceDescription || ''}
                                onChange={(e) => handleFieldChange('appearanceDescription', e.target.value)}
                                placeholder={lang.appearanceDescriptionPlaceholder}
                                rows={4}
                                className="text-sm bg-background border"
                            />
                            <div className="flex items-center gap-2 mt-2">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={handleDescribeAppearance}
                                            disabled={!isValidUrl(char.portraitUrl) || describingAppearance || !visionConsentChecked}
                                        >
                                            {describingAppearance ? <Loader2 className="h-4 w-4 animate-spin"/> : <Eye className="h-4 w-4" />}
                                        </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{lang.describeAppearanceTooltip}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id={`vision-consent-${char.id}`} checked={visionConsentChecked} onCheckedChange={(checked) => setVisionConsentChecked(!!checked)} />
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Label htmlFor={`vision-consent-${char.id}`} className="cursor-pointer">
                                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                                </Label>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="max-w-xs">
                                                <p>{disclaimerText}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                        </div>

                        <Separator />
                        <Label className="block mb-2 mt-4 text-sm font-medium">{lang.narrativeFieldsLabel}:</Label>
                        
                         <Textarea 
                            value={char.name} 
                            onChange={(e) => handleFieldChange('name', e.target.value)} 
                            placeholder={lang.npcNamePlaceholder} 
                         />
                        
                         <Textarea 
                            value={char.details} 
                            onChange={(e) => handleFieldChange('details', e.target.value)} 
                            placeholder={lang.npcDetailsPlaceholder} 
                            rows={4}
                        />

                         <Textarea 
                            value={char.biographyNotes || ''} 
                            onChange={(e) => handleFieldChange('biographyNotes', e.target.value)} 
                            placeholder={lang.biographyPlaceholder} 
                            rows={5}
                        />
                        
                        <div className="space-y-2">
                            <Label htmlFor={`${char.id}-memory`} className="flex items-center gap-1"><MemoryStick className="h-4 w-4"/> {memoryLabel}</Label>
                            <Textarea
                                id={`${char.id}-memory`}
                                value={char.memory || ''}
                                onChange={(e) => handleFieldChange('memory', e.target.value)}
                                placeholder={lang.memoryPlaceholder}
                                rows={5}
                                className="text-sm bg-background border"
                            />
                        </div>
                        
                        {relationsMode && (
                             <>
                                <div className="space-y-2">
                                    <Label htmlFor={`${char.id}-affinity`} className="flex items-center gap-1"><Heart className="h-4 w-4"/> {lang.affinityLabel.replace('{playerName}', playerName)}</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id={`${char.id}-affinity`}
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={currentAffinity}
                                            onChange={(e) => handleFieldChange('affinity', e.target.value)}
                                            className="h-8 text-sm w-20 flex-none bg-background border"
                                        />
                                        <Progress value={currentAffinity} className="flex-1 h-2" />
                                        <span className="text-xs text-muted-foreground w-24 text-right shrink-0">{getAffinityLabel(currentAffinity)}</span>
                                    </div>
                                </div>
                                 <RelationsEditableCard
                                    charId={char.id}
                                    data={char.relations}
                                    characters={allCharacters}
                                    playerId={playerId}
                                    playerName={playerName}
                                    currentLanguage={currentLanguage}
                                    onUpdate={handleNestedFieldChange}
                                    onRemove={removeNestedField}
                                />
                            </>
                        )}
                    </>
                )}
            </AccordionContent>
        </AccordionItem>
    );
});

CharacterAccordionItem.displayName = 'CharacterAccordionItem';

    