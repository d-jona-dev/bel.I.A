
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
import { Wand2, Loader2, User, ScrollText, BarChartHorizontal, Brain, History, Star, Dices, Shield, Swords, Zap, PlusCircle, Trash2, Save, Heart, Link as LinkIcon, UserPlus, UploadCloud, Users, FilePenLine, BarChart2 as ExpIcon, MapPin, Palette, Replace, Eye, AlertTriangle, UserCog, MemoryStick, RefreshCcw } from "lucide-react";
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
import type { Character } from "@/types";
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
import { useForm, FormProvider, Controller } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";


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
}

// Helper Components (defined outside CharacterSidebar)

const EditableField = ({ label, id, value, onChange, onBlur, type = "text", placeholder, rows, min, max, disabled = false }: { label: string, id: string, value: string | number | undefined, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void, onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void, type?: string, placeholder?: string, rows?: number, min?: string | number, max?: string, disabled?: boolean }) => (
    <div className="space-y-1">
          <Label htmlFor={id}>{label}</Label>
          {rows ? (
              <Textarea id={id} value={value ?? ""} onChange={onChange} onBlur={onBlur} placeholder={placeholder} rows={rows} className="text-sm bg-background border" disabled={disabled}/>
          ) : (
              <Input id={id} type={type} value={value ?? ""} onChange={onChange} onBlur={onBlur} placeholder={placeholder} className="h-8 text-sm bg-background border" min={min} max={max} disabled={disabled}/>
          )}
      </div>
);

const RelationsEditableCard = ({ charId, data, characters, playerId, playerName, currentLanguage, onUpdate, onRemove, disabled = false }: { charId: string, data?: Record<string, string>, characters: Character[], playerId: string, playerName: string, currentLanguage: string, onUpdate: (charId: string, field: 'relations', key: string, value: string | number | boolean) => void, onRemove: (charId: string, field: 'relations', key: string) => void, disabled?: boolean }) => {
  const otherCharacters = characters.filter(c => c.id !== charId);
  const unknownRelation = currentLanguage === 'fr' ? "Inconnu" : "Unknown";

  return (
      <div className="space-y-2">
          <Label className="flex items-center gap-1"><LinkIcon className="h-4 w-4" /> Relations</Label>
          <Card className="bg-muted/30 border">
              <CardContent className="p-3 space-y-2">
                   <div className="flex items-center gap-2">
                      <Label htmlFor={`${charId}-relations-${playerId}`} className="truncate text-sm shrink-0">{playerName} (Joueur)</Label>
                      <Input
                          id={`${charId}-relations-${playerId}`}
                          type="text"
                          defaultValue={data?.[playerId] || unknownRelation}
                          onBlur={(e) => onUpdate(charId, 'relations', playerId, e.target.value)}
                          className="h-8 text-sm flex-1 bg-background border"
                          placeholder={currentLanguage === 'fr' ? "Ami, Ennemi, Parent..." : "Friend, Enemy, Parent..."}
                          disabled={disabled}
                      />
                   </div>

                  {otherCharacters.map(otherChar => (
                      <div key={otherChar.id} className="flex items-center gap-2">
                          <Label htmlFor={`${charId}-relations-${otherChar.id}`} className="truncate text-sm shrink-0">{otherChar.name}</Label>
                          <Input
                              id={`${charId}-relations-${otherChar.id}`}
                              type="text"
                              defaultValue={data?.[otherChar.id] || unknownRelation}
                              onBlur={(e) => onUpdate(charId, 'relations', otherChar.id, e.target.value)}
                              className="h-8 text-sm flex-1 bg-background border"
                              placeholder={currentLanguage === 'fr' ? "Ami, Ennemi, Parent..." : "Friend, Enemy, Parent..."}
                              disabled={disabled}
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onRemove(charId, 'relations', otherChar.id)} title={currentLanguage === 'fr' ? "Réinitialiser la relation à Inconnu" : "Reset relation to Unknown"} disabled={disabled}>
                              <Trash2 className="h-4 w-4" />
                           </Button>
                      </div>
                  ))}
                  {otherCharacters.length === 0 && (!data || !data[playerId] || Object.keys(data).length <= (data[playerId] ? 1:0) ) && (
                       <p className="text-muted-foreground italic text-sm">{currentLanguage === 'fr' ? "Aucune autre relation PNJ définie." : "No other NPC relations defined."}</p>
                  )}
                   <p className="text-xs text-muted-foreground pt-1">{currentLanguage === 'fr' ? "Décrivez la relation de ce personnage envers les autres." : "Describe this character's relationship towards others."}</p>
              </CardContent>
          </Card>
      </div>
  );
};

const ArrayEditableCard = ({ charId, field, title, icon: Icon, data, addLabel, onUpdate, onRemove, onAdd, currentLanguage, disabled = false, addDialog }: { charId: string, field: 'spells' | 'memory', title: string, icon: React.ElementType, data?: string[], addLabel: string, onUpdate: (charId: string, field: 'spells', index: number, value: string) => void, onRemove: (charId: string, field: 'spells', index: number) => void, onAdd: (charId: string, field: 'spells' | 'memory') => void, currentLanguage: string, disabled?: boolean, addDialog?: React.ReactNode }) => {

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
                                  onBlur={(e) => onUpdate(charId, field, index, e.target.value)}
                                  className="text-sm flex-1 bg-background border"
                                  placeholder={`${currentLanguage === 'fr' ? 'Entrée' : 'Entry'} ${index + 1}`}
                                  rows={1}
                                  disabled={disabled}
                              />
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive self-start" onClick={() => onRemove(charId, field, index)} disabled={disabled}>
                                  <Trash2 className="h-4 w-4" />
                              </Button>
                          </div>
                      ))}
                   </ScrollArea>
               ) : (
                   <p className="text-muted-foreground italic text-sm">{currentLanguage === 'fr' ? `Aucun(e) ${title.toLowerCase()} ajouté(e).` : `No ${title.toLowerCase()} added.`}</p>
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
    onSaveNewCharacter,
    onAddStagedCharacter,
    onRelationUpdate,
    generateImageAction,
    relationsMode,
    playerId,
    playerName,
    currentLanguage,
}: {
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
}) {
  const [imageLoadingStates, setImageLoadingStates] = React.useState<Record<string, boolean>>({});
  const [describingAppearanceStates, setDescribingAppearanceStates] = React.useState<Record<string, boolean>>({});
  const [isClient, setIsClient] = React.useState(false);
  const [globalCharactersList, setGlobalCharactersList] = React.useState<Character[]>([]);
  const { toast } = useToast();

  React.useEffect(() => {
    setIsClient(true);
    const loadGlobalChars = () => {
      if (typeof window !== 'undefined') {
          try {
              const storedGlobalChars = localStorage.getItem('globalCharacters');
              if (storedGlobalChars) {
                  setGlobalCharactersList(JSON.parse(storedGlobalChars));
              }
          } catch (error) {
              console.error("Failed to load global characters from localStorage:", error);
              toast({
                  title: "Erreur de chargement",
                  description: "Impossible de charger les personnages globaux.",
                  variant: "destructive",
              });
          }
      }
    };
    loadGlobalChars();
    // Listen for storage changes from other components/tabs
    window.addEventListener('storage', loadGlobalChars);
    return () => {
      window.removeEventListener('storage', loadGlobalChars);
    }
  }, [toast]);

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

  const handleUploadPortrait = (characterId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
        const character = initialCharacters.find(c => c.id === characterId);
        if (character) {
            onCharacterUpdate({ ...character, portraitUrl: reader.result as string });
            toast({ title: "Portrait Téléchargé", description: `Le portrait de ${character.name} a été mis à jour.` });
        }
    };
    reader.readAsDataURL(file);
    if(event.target) event.target.value = '';
  };


   const handleFieldChange = (charId: string, field: keyof Character, value: string | number | boolean | null) => {
        const character = initialCharacters.find(c => c.id === charId);
        if (character) {
            if (field === 'locationId' && value === '__traveling__') {
                value = null; // Convert special value to null
            }
            const numberFields: (keyof Character)[] = ['level', 'affinity'];
            let processedValue = value;
            if (numberFields.includes(field) && typeof value === 'string') {
                 let numValue = parseInt(value, 10);
                 if (field === 'affinity') {
                    numValue = Math.max(0, Math.min(100, isNaN(numValue) ? 50 : numValue));
                 }
                 processedValue = isNaN(numValue) ? (field === 'affinity' ? 50 : 1) : numValue;
            } else if (field === 'affinity' && typeof processedValue === 'number') {
                processedValue = Math.max(0, Math.min(100, processedValue));
            }
            onCharacterUpdate({ ...character, [field]: processedValue });
        }
   };

    const handleNestedFieldChange = (charId: string, field: 'relations', key: string, value: string | number | boolean) => {
        const character = initialCharacters.find(c => c.id === charId);
        if (character) {
             const currentFieldData = character[field] || {};
             let finalValue = value;

             if (field === 'relations') {
                 onRelationUpdate(charId, key, String(finalValue));
             }
        }
    };

     const removeNestedField = (charId: string, field: 'relations', key: string) => {
        const character = initialCharacters.find(c => c.id === charId);
        if (character && character[field]) {
             if (field === 'relations') {
                 onRelationUpdate(charId, key, currentLanguage === 'fr' ? "Inconnu" : "Unknown");
             }
        }
    };

    const handleUpdateGlobalCharacter = (charToUpdate: Character) => {
        try {
            const updatedGlobalChars = globalCharactersList.map(gc => 
                gc.id === charToUpdate.id ? { ...gc, ...charToUpdate, _lastSaved: Date.now() } : gc
            );
            localStorage.setItem('globalCharacters', JSON.stringify(updatedGlobalChars));
            setGlobalCharactersList(updatedGlobalChars); // Update local state to reflect change
            onCharacterUpdate({ ...charToUpdate, _lastSaved: Date.now() }); // Update the character in the current adventure
            toast({ title: "Personnage Mis à Jour", description: `Les informations globales de ${charToUpdate.name} ont été synchronisées.` });
        } catch (e) {
            toast({ title: "Erreur", description: "Impossible de mettre à jour le personnage global.", variant: "destructive" });
        }
    };

    const getAffinityLabel = (affinity: number | undefined): string => {
        const value = affinity ?? 50;
        if (currentLanguage === 'fr') {
            if (value <= 10) return "Haine profonde";
            if (value <= 30) return "Hostile";
            if (value <= 45) return "Méfiant";
            if (value <= 55) return "Neutre";
            if (value <= 70) return "Amical";
            if (value <= 90) return "Loyal";
            return "Dévoué / Amour";
        }
        if (value <= 10) return "Deep Hate";
        if (value <= 30) return "Hostile";
        if (value <= 45) return "Wary";
        if (value <= 55) return "Neutral";
        if (value <= 70) return "Friendly";
        if (value <= 90) return "Loyal";
        return "Devoted / Love";
    };

  return (
    <div className="w-full">
        {isClient && (
            <Card className="mb-4 border-dashed">
                <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                         <span className="flex items-center gap-2">
                           <UserPlus className="h-5 w-5" />
                           Personnages Globaux
                         </span>
                         <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                     <div className="flex items-center justify-center h-6 w-6 bg-muted text-muted-foreground rounded-full text-xs font-bold">
                                        {globalCharactersList.length}
                                     </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Nombre de personnages sauvegardés globalement.</p>
                                </TooltipContent>
                            </Tooltip>
                         </TooltipProvider>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {globalCharactersList.length === 0 ? (
                         <p className="text-sm text-muted-foreground mt-1">
                           {currentLanguage === 'fr' ? 'Aucun personnage global sauvegardé pour l\'instant.' : 'No global characters saved yet.'}
                         </p>
                    ) : availableGlobalChars.length > 0 ? (
                        <Select onValueChange={handleAddGlobalCharToAdventure}>
                            <SelectTrigger>
                                <SelectValue placeholder={currentLanguage === 'fr' ? 'Ajouter un personnage existant...' : 'Add existing character...'} />
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
                           {currentLanguage === 'fr' ? 'Tous les personnages sauvegardés sont déjà dans cette aventure.' : 'All saved characters are already in this adventure.'}
                         </p>
                    )}
                </CardContent>
            </Card>
        )}

        {initialCharacters.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">{currentLanguage === 'fr' ? "Aucun personnage secondaire défini pour l'aventure en cours." : "No secondary characters defined for the current adventure."}</p>
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
                        describingAppearanceStates={describingAppearanceStates}
                        setDescribingAppearanceStates={setDescribingAppearanceStates}
                        onSaveNewCharacter={onSaveNewCharacter}
                        onUpdateGlobalCharacter={handleUpdateGlobalCharacter}
                        generateImageAction={generateImageAction}
                        handleUploadPortrait={handleUploadPortrait}
                        handleFieldChange={handleFieldChange}
                        handleNestedFieldChange={handleNestedFieldChange}
                        removeNestedField={removeNestedField}
                        onCharacterUpdate={onCharacterUpdate}
                        getAffinityLabel={getAffinityLabel}
                        relationsMode={relationsMode}
                        playerId={playerId}
                        playerName={playerName}
                        currentLanguage={currentLanguage}
                        allCharacters={initialCharacters}
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
    describingAppearanceStates,
    setDescribingAppearanceStates,
    onSaveNewCharacter,
    onUpdateGlobalCharacter,
    generateImageAction,
    handleUploadPortrait,
    handleFieldChange,
    handleNestedFieldChange,
    removeNestedField,
    onCharacterUpdate,
    getAffinityLabel,
    relationsMode,
    playerId,
    playerName,
    currentLanguage,
    allCharacters,
}: {
    character: Character;
    characterIndex: number;
    isClient: boolean;
    imageLoadingStates: Record<string, boolean>;
    setImageLoadingStates: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    describingAppearanceStates: Record<string, boolean>;
    setDescribingAppearanceStates: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    onSaveNewCharacter: (character: Character) => void;
    onUpdateGlobalCharacter: (character: Character) => void;
    generateImageAction: (input: GenerateSceneImageInput) => Promise<GenerateSceneImageOutput>;
    handleUploadPortrait: (characterId: string, event: React.ChangeEvent<HTMLInputElement>) => void;
    handleFieldChange: (charId: string, field: keyof Character, value: any) => void;
    handleNestedFieldChange: (charId: string, field: 'relations', key: string, value: string | number | boolean) => void;
    removeNestedField: (charId: string, field: 'relations', key: string) => void;
    onCharacterUpdate: (updatedCharacter: Character) => void;
    getAffinityLabel: (affinity: number | undefined) => string;
    relationsMode: boolean;
    playerId: string;
    playerName: string;
    currentLanguage: string;
    allCharacters: Character[];
}) {
    const { toast } = useToast();
    
    const [imageStyle, setImageStyle] = React.useState<string>("");
    const [customStyles, setCustomStyles] = React.useState<CustomImageStyle[]>([]);
    const [isUrlDialogOpen, setIsUrlDialogOpen] = React.useState(false);
    const [portraitUrl, setPortraitUrl] = React.useState(char.portraitUrl || "");
    const [visionConsentChecked, setVisionConsentChecked] = React.useState(false);

    const formMethods = useForm({
        defaultValues: char,
    });
    
    React.useEffect(() => {
        formMethods.reset(char);
    }, [char, formMethods]);
    
    const handleBlur = (field: keyof Character) => () => {
        const value = formMethods.getValues(field);
        handleFieldChange(char.id, field, value);
    };

    const isPlaceholder = char.isPlaceholder ?? false;

    const disclaimerText = i18n[currentLanguage as Language]?.visionConsent || i18n['en'].visionConsent;
    const memoryLabel = i18n[currentLanguage as Language]?.memory || i18n['en'].memory;

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

    const handleDescribeAppearance = async (char: Character) => {
        if (!char.portraitUrl || describingAppearanceStates[char.id]) return;

        setDescribingAppearanceStates(prev => ({ ...prev, [char.id]: true }));
        toast({ title: "Analyse de l'image...", description: `L'IA décrit l'apparence de ${char.name}.`});

        try {
            const result = await describeAppearance({ portraitUrl: char.portraitUrl });
            formMethods.setValue('appearanceDescription', result.description);
            onCharacterUpdate({
                ...char,
                appearanceDescription: result.description,
                lastAppearanceUpdate: Date.now(),
            });
            toast({ title: "Description Réussie!", description: `L'apparence de ${char.name} a été détaillée.` });
        } catch (error) {
            console.error("Error describing appearance:", error);
            toast({ title: "Erreur de Vision", description: `Impossible de décrire l'apparence. ${error instanceof Error ? error.message : ""}`, variant: "destructive" });
        } finally {
            setDescribingAppearanceStates(prev => ({ ...prev, [char.id]: false }));
        }
    };
    
    const handleGeneratePortrait = async () => {
        if (imageLoadingStates[char.id]) return;
        setImageLoadingStates(prev => ({ ...prev, [char.id]: true }));

        try {
          const prompt = `portrait of ${char.name}, ${char.characterClass}. Description: ${char.details}.`;
          const result = await generateImageAction({ sceneDescription: prompt, style: imageStyle });
          onCharacterUpdate({ ...char, portraitUrl: result.imageUrl });
          toast({
            title: "Portrait Généré",
            description: `Le portrait de ${char.name} a été généré.`,
          });
        } catch (error) {
          console.error(`Error generating portrait for ${char.name}:`, error);
          toast({
            title: "Erreur de Génération",
            description: `Impossible de générer le portrait de ${char.name}.`,
            variant: "destructive",
          });
        } finally {
          setImageLoadingStates(prev => ({ ...prev, [char.id]: false }));
        }
      };


    const handleSaveUrl = () => {
        handleFieldChange(char.id, 'portraitUrl', portraitUrl);
        setIsUrlDialogOpen(false);
        toast({ title: "Portrait mis à jour", description: "L'URL du portrait a été enregistrée." });
    };

    const isGloballySaved = isClient && char._lastSaved;
    const currentAffinity = char.affinity ?? 50;
    
    if (isPlaceholder) {
        return (
            <AccordionItem value={char.id}>
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback><UserCog /></AvatarFallback>
                        </Avatar>
                        <span className="font-medium truncate">{char.roleInStory || `Emplacement Vide ${characterIndex + 1}`}</span>
                        <span className="text-xs text-muted-foreground italic">(Emplacement)</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-4 bg-background">
                     <EditableField
                        label="Rôle du personnage (Emplacement)"
                        id={`${char.id}-roleInStory`}
                        value={char.roleInStory}
                        onChange={(e) => handleFieldChange(char.id, 'roleInStory', e.target.value)}
                        placeholder="Ex: Le/la partenaire romantique, rival..."
                    />
                </AccordionContent>
            </AccordionItem>
        );
    }
    
    const isValidUrl = (url: string | null | undefined): url is string => {
        if (!url) return false;
        return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image');
    };

    return (
        <FormProvider {...formMethods}>
            <AccordionItem value={char.id}>
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                            {imageLoadingStates[char.id] ? (
                                <AvatarFallback><Loader2 className="h-4 w-4 animate-spin"/></AvatarFallback>
                            ) : isValidUrl(char.portraitUrl) ? (
                                <AvatarImage src={char.portraitUrl} alt={char.name} />
                            ) : (
                                <AvatarFallback>{char.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            )}
                        </Avatar>
                        <span className="font-medium truncate">{char.name.split(' ')[0]}</span>
                        {!isGloballySaved && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span><Star className="h-3 w-3 text-yellow-500 ml-1 flex-shrink-0" /></span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">{currentLanguage === 'fr' ? "Nouveau personnage non sauvegardé globalement." : "New character not saved globally."}</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-4 bg-background">
                    <div className="flex gap-2">
                        {!isGloballySaved ? (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline" size="sm" className="flex-1" onClick={() => onSaveNewCharacter(char)}>
                                            <Save className="h-4 w-4 mr-1" /> {currentLanguage === 'fr' ? "Sauvegarder" : "Save"}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">{currentLanguage === 'fr' ? "Sauvegarder ce personnage pour le réutiliser dans d'autres aventures." : "Save this character for reuse in other adventures."}</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ) : (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline" size="sm" className="flex-1" onClick={() => onUpdateGlobalCharacter(char)}>
                                            <RefreshCcw className="h-4 w-4 mr-1" /> {currentLanguage === 'fr' ? "Mettre à jour" : "Update"}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">{currentLanguage === 'fr' ? "Mettre à jour la fiche globale avec les informations actuelles." : "Update the global character sheet with current info."}</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>


                <div className="flex flex-col items-center gap-2">
                        <div className="w-24 h-24 relative rounded-md overflow-hidden border bg-muted flex items-center justify-center">
                            {imageLoadingStates[char.id] ? (
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/>
                            ) : isValidUrl(char.portraitUrl) ? (
                                <Image src={char.portraitUrl} alt={`${char.name} portrait`} layout="fill" objectFit="cover" />
                            ) : (
                                <User className="h-10 w-10 text-muted-foreground"/>
                            )}
                        </div>
                        <div className="flex gap-2">
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
                                        <TooltipContent><p>{currentLanguage === 'fr' ? "Choisir un style d'image" : "Choose an image style"}</p></TooltipContent>
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
                                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleGeneratePortrait()} disabled={imageLoadingStates[char.id]}><Wand2 className="h-4 w-4"/></Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>{currentLanguage === 'fr' ? "Générer un portrait avec l'IA." : "Generate an AI portrait."}</p></TooltipContent>
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
                                    <TooltipContent><p>{currentLanguage === 'fr' ? "Télécharger un portrait personnalisé." : "Upload a custom portrait."}</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <Dialog open={isUrlDialogOpen} onOpenChange={setIsUrlDialogOpen}>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="icon" className="h-8 w-8">
                                                    <LinkIcon className="h-4 w-4"/>
                                                </Button>
                                            </DialogTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent>Définir le portrait depuis une URL</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Définir le Portrait depuis une URL</DialogTitle>
                                        <DialogDescription>
                                            Collez l'URL de l'image que vous souhaitez utiliser comme portrait pour {char.name}.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4">
                                        <Label htmlFor="portrait-url">URL de l'image</Label>
                                        <Input
                                            id="portrait-url"
                                            value={portraitUrl}
                                            onChange={(e) => setPortraitUrl(e.target.value)}
                                            placeholder="https://example.com/portrait.jpg"
                                            className="mt-1"
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsUrlDialogOpen(false)}>Annuler</Button>
                                        <Button onClick={handleSaveUrl}>Enregistrer l'URL</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                </div>

                    <Separator />
                     <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Eye className="h-4 w-4" /> Description de l'Apparence (par IA)</Label>
                         <FormField
                            control={formMethods.control}
                            name="appearanceDescription"
                            render={({ field }) => (
                                <FormControl>
                                <Textarea
                                    {...field}
                                    onBlur={handleBlur("appearanceDescription")}
                                    placeholder="Générez ou écrivez une description physique détaillée..."
                                    rows={4}
                                    className="text-xs text-muted-foreground bg-background border"
                                />
                                </FormControl>
                            )}
                        />
                        <div className="flex items-center gap-2 mt-2">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleDescribeAppearance(char)}
                                        disabled={!isValidUrl(char.portraitUrl) || describingAppearanceStates[char.id] || !visionConsentChecked}
                                    >
                                        {describingAppearanceStates[char.id] ? <Loader2 className="h-4 w-4 animate-spin"/> : <Eye className="h-4 w-4" />}
                                    </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{i18n[currentLanguage as Language]?.describeAppearanceTooltip || i18n.en.describeAppearanceTooltip}</p>
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
                    <Label className="block mb-2 mt-4 text-sm font-medium">Champs Narratifs Modifiables :</Label>
                    <EditableField
                        label="Nom"
                        id={`${char.id}-name`}
                        value={char.name}
                        onChange={(e) => handleFieldChange(char.id, 'name', e.target.value)}
                        onBlur={(e) => handleFieldChange(char.id, 'name', e.target.value)}
                    />
                    <EditableField
                        label={currentLanguage === 'fr' ? "Description Publique" : "Public Description"}
                        id={`${char.id}-details`}
                        value={char.details}
                        onChange={(e) => handleFieldChange(char.id, 'details', e.target.value)}
                        onBlur={(e) => handleFieldChange(char.id, 'details', e.target.value)}
                        rows={4}
                    />
                    <FormField
                        control={formMethods.control}
                        name="biographyNotes"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{currentLanguage === 'fr' ? "Biographie / Notes Privées" : "Biography / Private Notes"}</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        onBlur={handleBlur("biographyNotes")}
                                        placeholder={currentLanguage === 'fr' ? "Passé, secrets, objectifs... (pour contexte IA)" : "Background, secrets, goals... (for AI context)"}
                                        rows={5}
                                        className="text-sm bg-background border"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    <div className="space-y-2">
                        <Label htmlFor={`${char.id}-memory`} className="flex items-center gap-1"><MemoryStick className="h-4 w-4"/> {memoryLabel}</Label>
                        <FormField
                            control={formMethods.control}
                            name="memory"
                            render={({ field }) => (
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        onBlur={handleBlur("memory")}
                                        placeholder="Inscrire ici les souvenirs importants, les connaissances spécifiques ou les secrets du personnage..."
                                        rows={5}
                                        className="text-sm bg-background border"
                                    />
                                </FormControl>
                            )}
                        />
                    </div>
                    
                    {relationsMode && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor={`${char.id}-affinity`} className="flex items-center gap-1"><Heart className="h-4 w-4"/> {currentLanguage === 'fr' ? `Affinité avec ${playerName}` : `Affinity with ${playerName}`}</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id={`${char.id}-affinity`}
                                        type="number"
                                        min="0"
                                        max="100"
                                        defaultValue={currentAffinity}
                                        onBlur={(e) => handleFieldChange(char.id, 'affinity', e.target.value)}
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
                </AccordionContent>
            </AccordionItem>
        </FormProvider>
    );
});
