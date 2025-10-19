
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
import type { Character, ClothingItem } from "@/types";
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
}

// Helper Components (defined outside CharacterSidebar)

const EditableField = ({ label, id, value, onChange, onBlur, type = "text", placeholder, rows, min, max, disabled = false }: { label: React.ReactNode, id: string, value: string | number | undefined, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void, onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void, type?: string, placeholder?: string, rows?: number, min?: string | number, max?: string, disabled?: boolean }) => {
    
    return (
        <div className="space-y-1">
            <Label htmlFor={id}>{label}</Label>
            {rows ? (
                <Textarea id={id} value={value ?? ""} onChange={onChange} onBlur={onBlur} placeholder={placeholder} rows={rows} className="text-sm bg-background border" disabled={disabled}/>
            ) : (
                <Input id={id} type={type} value={value ?? ""} onChange={onChange} onBlur={onBlur} placeholder={placeholder} className="h-8 text-sm bg-background border" min={min} max={max} disabled={disabled}/>
            )}
        </div>
    );
};

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
    onSaveNewCharacter: onSaveNewCharacterProp,
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
                title: "Erreur de chargement",
                description: "Impossible de charger les personnages globaux.",
                variant: "destructive",
            });
        }
    }
  }, [toast]);

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
            // Update existing character
            updatedGlobalChars = [...globalChars];
            updatedGlobalChars[charIndex] = newChar;
            toast({ title: "Personnage Mis à Jour", description: `Les informations globales de ${charToSave.name} ont été synchronisées.` });
        } else {
            // Add new character
            updatedGlobalChars = [...globalChars, newChar];
            toast({ title: "Personnage Sauvegardé", description: `${charToSave.name} est maintenant disponible globalement.` });
        }
        
        localStorage.setItem('globalCharacters', JSON.stringify(updatedGlobalChars));
        setGlobalCharactersList(updatedGlobalChars); // Update local state to reflect change
        onCharacterUpdate(newChar); // Update the character in the current adventure
        
    } catch (e) {
        toast({ title: "Erreur de Sauvegarde", variant: "destructive" });
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


   const handleFieldChange = (charId: string, field: keyof Character, value: string | number | boolean | null | string[]) => {
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
                        onSaveOrUpdateCharacter={onSaveOrUpdateCharacter}
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
    onSaveOrUpdateCharacter,
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
    onSaveOrUpdateCharacter: (character: Character) => void;
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
    
    const [localChar, setLocalChar] = React.useState(char);
    const [localClothingDescription, setLocalClothingDescription] = React.useState(char.clothingDescription || '');
    const [imageStyle, setImageStyle] = React.useState<string>("");
    const [customStyles, setCustomStyles] = React.useState<CustomImageStyle[]>([]);
    const [isUrlDialogOpen, setIsUrlDialogOpen] = React.useState(false);
    const [portraitUrl, setPortraitUrl] = React.useState(char.portraitUrl || "");
    const [visionConsentChecked, setVisionConsentChecked] = React.useState(false);
    const [wardrobe, setWardrobe] = React.useState<ClothingItem[]>([]);

    React.useEffect(() => {
        setLocalChar(char);
    }, [char]);

    React.useEffect(() => {
        setLocalClothingDescription(char.clothingDescription || '');
    }, [char.clothingDescription]);

    const handleLocalFieldChange = (field: keyof Character, value: any) => {
        const updated = { ...localChar, [field]: value };
        setLocalChar(updated);
        onCharacterUpdate(updated);
    };

    const handleClothingDescriptionChange = (value: string) => {
        setLocalClothingDescription(value);
        handleFieldChange(char.id, 'clothingDescription', value);
    };

    const handleLoadFromWardrobe = (itemDescription: string) => {
        setLocalClothingDescription(itemDescription);
        handleFieldChange(char.id, 'clothingDescription', itemDescription);
        toast({
            title: "Vêtement chargé",
            description: `La description de ${char.name} a été mise à jour.`
        });
    };

    const isPlaceholder = localChar.isPlaceholder ?? false;

    const disclaimerText = i18n[currentLanguage as Language]?.visionConsent || i18n.en.visionConsent;
    const memoryLabel = i18n[currentLanguage as Language]?.memory || i18n.en.memory;

    React.useEffect(() => {
        const loadData = () => {
             try {
                const savedStyles = localStorage.getItem("customImageStyles_v1");
                if (savedStyles) setCustomStyles(JSON.parse(savedStyles));

                const savedWardrobe = localStorage.getItem("wardrobe_items_v1");
                if (savedWardrobe) setWardrobe(JSON.parse(savedWardrobe));
                
            } catch (error) {
                console.error("Failed to load data:", error);
            }
        };
        loadData();
        window.addEventListener('storage', loadData);
        return () => window.removeEventListener('storage', loadData);
    }, []);

    const handleDescribeAppearance = async () => {
        if (!localChar.portraitUrl || describingAppearanceStates[localChar.id]) return;

        setDescribingAppearanceStates(prev => ({ ...prev, [localChar.id]: true }));
        toast({ title: "Analyse de l'image...", description: `L'IA décrit l'apparence de ${localChar.name}.`});

        try {
            const result = await describeAppearance({ portraitUrl: localChar.portraitUrl });
            handleLocalFieldChange('appearanceDescription', result.description);
            handleLocalFieldChange('lastAppearanceUpdate', Date.now());
            
            toast({ title: "Description Réussie!", description: `L'apparence de ${localChar.name} a été détaillée.` });
        } catch (error) {
            console.error("Error describing appearance:", error);
            toast({ title: "Erreur de Vision", description: `Impossible de décrire l'apparence. ${error instanceof Error ? error.message : ""}`, variant: "destructive" });
        } finally {
            setDescribingAppearanceStates(prev => ({ ...prev, [localChar.id]: false }));
        }
    };
    
    const handleGeneratePortrait = async () => {
        if (imageLoadingStates[localChar.id]) return;
        setImageLoadingStates(prev => ({ ...prev, [localChar.id]: true }));

        try {
          const prompt = `portrait of ${localChar.name}, ${localChar.characterClass}. Description: ${localChar.details}.`;
          const result = await generateImageAction({ sceneDescription: prompt, style: imageStyle });
          handleLocalFieldChange('portraitUrl', result.imageUrl);
          toast({
            title: "Portrait Généré",
            description: `Le portrait de ${localChar.name} a été généré.`,
          });
        } catch (error) {
          console.error(`Error generating portrait for ${localChar.name}:`, error);
          toast({
            title: "Erreur de Génération",
            description: `Impossible de générer le portrait de ${localChar.name}.`,
            variant: "destructive",
          });
        } finally {
          setImageLoadingStates(prev => ({ ...prev, [localChar.id]: false }));
        }
      };


    const handleSaveUrl = () => {
        handleLocalFieldChange('portraitUrl', portraitUrl);
        setIsUrlDialogOpen(false);
        toast({ title: "Portrait mis à jour", description: "L'URL du portrait a été enregistrée." });
    };

    const isGloballySaved = isClient && localChar._lastSaved;
    const currentAffinity = localChar.affinity ?? 50;
    
    if (isPlaceholder) {
        return (
            <AccordionItem value={localChar.id}>
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback><UserCog /></AvatarFallback>
                        </Avatar>
                        <span className="font-medium truncate">{localChar.roleInStory || `Emplacement Vide ${characterIndex + 1}`}</span>
                        <span className="text-xs text-muted-foreground italic">(Emplacement)</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-4 bg-background">
                     <EditableField
                        label="Rôle du personnage (Emplacement)"
                        id={`${localChar.id}-roleInStory`}
                        value={localChar.roleInStory}
                        onChange={(e) => handleLocalFieldChange('roleInStory', e.target.value)}
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
        <AccordionItem value={localChar.id}>
        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                        {imageLoadingStates[localChar.id] ? (
                            <AvatarFallback><Loader2 className="h-4 w-4 animate-spin"/></AvatarFallback>
                        ) : isValidUrl(localChar.portraitUrl) ? (
                            <AvatarImage src={localChar.portraitUrl} alt={localChar.name} />
                        ) : (
                            <AvatarFallback>{localChar.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        )}
                    </Avatar>
                    <span className="font-medium truncate">{localChar.name.split(' ')[0]}</span>
                    {isGloballySaved && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span><Save className="h-3 w-3 text-primary ml-1 flex-shrink-0" /></span>
                                </TooltipTrigger>
                                <TooltipContent side="top">{currentLanguage === 'fr' ? "Personnage sauvegardé globalement." : "Character saved globally."}</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-4 bg-background">
                <div className="flex gap-2">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" className="flex-1" onClick={() => onSaveOrUpdateCharacter(localChar)}>
                                    {isGloballySaved ? <RefreshCcw className="h-4 w-4 mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                                    {isGloballySaved ? (currentLanguage === 'fr' ? "Mettre à jour" : "Update") : (currentLanguage === 'fr' ? "Sauvegarder" : "Save")}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                {isGloballySaved
                                    ? (currentLanguage === 'fr' ? "Mettre à jour la fiche globale avec les informations actuelles." : "Update the global character sheet with current info.")
                                    : (currentLanguage === 'fr' ? "Sauvegarder ce personnage pour le réutiliser dans d'autres aventures." : "Save this character for reuse in other adventures.")
                                }
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

            <div className="flex items-start gap-4">
                    <div className="w-24 h-24 relative rounded-md overflow-hidden border bg-muted flex items-center justify-center flex-shrink-0">
                        {imageLoadingStates[localChar.id] ? (
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/>
                        ) : isValidUrl(localChar.portraitUrl) ? (
                            <Image src={localChar.portraitUrl} alt={`${localChar.name} portrait`} layout="fill" objectFit="cover" />
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
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleGeneratePortrait} disabled={imageLoadingStates[localChar.id]}><Wand2 className="h-4 w-4"/></Button>
                                </TooltipTrigger>
                                <TooltipContent><p>{currentLanguage === 'fr' ? "Générer un portrait avec l'IA." : "Generate an AI portrait."}</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <input
                            type="file"
                            accept="image/*"
                            id={`upload-portrait-${localChar.id}`}
                            className="hidden"
                            onChange={(e) => handleUploadPortrait(localChar.id, e)}
                        />
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => document.getElementById(`upload-portrait-${localChar.id}`)?.click()}><UploadCloud className="h-4 w-4"/></Button>
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
                                        Collez l'URL de l'image que vous souhaitez utiliser comme portrait pour {localChar.name}.
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

                <div className="space-y-1">
                    <div className="flex items-center justify-between">
                         <Label htmlFor={`${char.id}-clothingDescription`} className="flex items-center gap-2">
                            <Shirt className="h-4 w-4" /> Vêtements (Description)
                        </Label>
                        <DropdownMenu>
                           <TooltipProvider>
                               <Tooltip>
                                   <TooltipTrigger asChild>
                                       <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                                                <Library className="h-4 w-4" />
                                            </Button>
                                       </DropdownMenuTrigger>
                                   </TooltipTrigger>
                                   <TooltipContent>
                                       <p>Charger depuis la penderie</p>
                                   </TooltipContent>
                               </Tooltip>
                           </TooltipProvider>
                            <DropdownMenuContent>
                                {wardrobe.length > 0 ? (
                                    wardrobe.map(item => (
                                        <DropdownMenuItem 
                                            key={item.id} 
                                            onSelect={() => handleLoadFromWardrobe(item.description)}
                                        >
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
                                    <DropdownMenuItem disabled>
                                        Penderie vide
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <Textarea
                        id={`${char.id}-clothingDescription`}
                        value={localClothingDescription}
                        onChange={(e) => handleClothingDescriptionChange(e.target.value)}
                        placeholder={currentLanguage === 'fr' 
                            ? "Décrivez les vêtements du personnage..." 
                            : "Describe the character's clothing..."
                        }
                        rows={3}
                        className="text-sm bg-background border"
                    />
                </div>
                
                 <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Eye className="h-4 w-4" /> Description de l'Apparence (par IA)</Label>
                     <EditableField
                        label=""
                        id={`${localChar.id}-appearanceDescription`}
                        value={localChar.appearanceDescription}
                        onChange={(e) => handleLocalFieldChange('appearanceDescription', e.target.value)}
                        placeholder="Générez ou écrivez une description physique détaillée..."
                        rows={4}
                    />
                    <div className="flex items-center gap-2 mt-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={handleDescribeAppearance}
                                    disabled={!isValidUrl(localChar.portraitUrl) || describingAppearanceStates[localChar.id] || !visionConsentChecked}
                                >
                                    {describingAppearanceStates[localChar.id] ? <Loader2 className="h-4 w-4 animate-spin"/> : <Eye className="h-4 w-4" />}
                                </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{i18n[currentLanguage as Language]?.describeAppearanceTooltip || i18n.en.describeAppearanceTooltip}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <div className="flex items-center space-x-2">
                            <Checkbox id={`vision-consent-${localChar.id}`} checked={visionConsentChecked} onCheckedChange={(checked) => setVisionConsentChecked(!!checked)} />
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Label htmlFor={`vision-consent-${localChar.id}`} className="cursor-pointer">
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
                    id={`${localChar.id}-name`}
                    value={localChar.name}
                    onChange={(e) => handleLocalFieldChange('name', e.target.value)}
                />
                <EditableField
                    label={currentLanguage === 'fr' ? "Description Publique" : "Public Description"}
                    id={`${localChar.id}-details`}
                    value={localChar.details}
                    onChange={(e) => handleLocalFieldChange('details', e.target.value)}
                    rows={4}
                />
                <EditableField
                    label={currentLanguage === 'fr' ? "Biographie / Notes Privées" : "Biography / Private Notes"}
                    id={`${localChar.id}-biographyNotes`}
                    value={localChar.biographyNotes}
                    onChange={(e) => handleLocalFieldChange('biographyNotes', e.target.value)}
                    placeholder={currentLanguage === 'fr' ? "Passé, secrets, objectifs... (pour contexte IA)" : "Background, secrets, goals... (for AI context)"}
                    rows={5}
                />
                
                <div className="space-y-2">
                    <Label htmlFor={`${localChar.id}-memory`} className="flex items-center gap-1"><MemoryStick className="h-4 w-4"/> {memoryLabel}</Label>
                    <EditableField
                        label=""
                        id={`${localChar.id}-memory`}
                        value={localChar.memory}
                        onChange={(e) => handleLocalFieldChange('memory', e.target.value)}
                        placeholder="Inscrire ici les souvenirs importants, les connaissances spécifiques ou les secrets du personnage..."
                        rows={5}
                    />
                </div>
                
                {relationsMode && (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor={`${localChar.id}-affinity`} className="flex items-center gap-1"><Heart className="h-4 w-4"/> {currentLanguage === 'fr' ? `Affinité avec ${playerName}` : `Affinity with ${playerName}`}</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id={`${localChar.id}-affinity`}
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={currentAffinity}
                                    onChange={(e) => handleLocalFieldChange('affinity', e.target.value)}
                                    className="h-8 text-sm w-20 flex-none bg-background border"
                                />
                                <Progress value={currentAffinity} className="flex-1 h-2" />
                                <span className="text-xs text-muted-foreground w-24 text-right shrink-0">{getAffinityLabel(currentAffinity)}</span>
                            </div>
                        </div>
                        <RelationsEditableCard
                            charId={localChar.id}
                            data={localChar.relations}
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
    );
});

    