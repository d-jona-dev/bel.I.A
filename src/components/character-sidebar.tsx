
"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription as UICardDescription } from "@/components/ui/card"; // Renamed CardDescription to avoid conflict
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Wand2, Loader2, User, ScrollText, BarChartHorizontal, Brain, History, Star, Dices, Shield, Swords, Zap, PlusCircle, Trash2, Save, Heart, Link as LinkIcon, UserPlus, UploadCloud } from "lucide-react";
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

// Define props for the CharacterSidebar
interface CharacterSidebarProps {
    characters: Character[];
    onCharacterUpdate: (updatedCharacter: Character) => void;
    onSaveNewCharacter: (character: Character) => void;
    onAddStagedCharacter: (character: Character) => void;
    onRelationUpdate: (charId: string, targetId: string, newRelation: string) => void;
    generateImageAction: (input: GenerateSceneImageInput) => Promise<GenerateSceneImageOutput>;
    rpgMode: boolean;
    relationsMode: boolean;
    playerId: string;
    playerName: string;
    currentLanguage: string;
}

// Helper Components (defined outside CharacterSidebar)

const EditableField = ({ label, id, value, onChange, type = "text", placeholder, rows, min, max, disabled = false }: { label: string, id: string, value: string | number | undefined, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void, type?: string, placeholder?: string, rows?: number, min?: string | number, max?: string | number, disabled?: boolean }) => (
    <div className="space-y-1">
          <Label htmlFor={id}>{label}</Label>
          {rows ? (
              <Textarea id={id} value={value ?? ""} onChange={onChange} placeholder={placeholder} rows={rows} className="text-sm bg-background border" disabled={disabled}/>
          ) : (
              <Input id={id} type={type} value={value ?? ""} onChange={onChange} placeholder={placeholder} className="h-8 text-sm bg-background border" min={min} max={max} disabled={disabled}/>
          )}
      </div>
);

const NestedEditableCard = ({ charId, field, title, icon: Icon, data, addLabel, valueType = "text", onUpdate, onRemove, onAdd }: { charId: string, field: 'stats' | 'inventory' | 'opinion' | 'skills', title: string, icon: React.ElementType, data?: Record<string, string | number | boolean>, addLabel: string, valueType?: 'text' | 'number' | 'boolean', onUpdate: (charId: string, field: 'stats' | 'inventory' | 'opinion' | 'skills', key: string, value: string | number | boolean) => void, onRemove: (charId: string, field: 'stats' | 'inventory' | 'opinion' | 'skills', key: string) => void, onAdd: (charId: string, field: 'stats' | 'inventory' | 'opinion' | 'skills') => void }) => (
   <div className="space-y-2">
       <Label className="flex items-center gap-1"><Icon className="h-4 w-4"/> {title}</Label>
       <Card className="bg-muted/30 border">
           <CardContent className="p-3 space-y-2">
               {data && Object.keys(data).length > 0 ? (
                   Object.entries(data).map(([key, value]) => (
                       <div key={key} className="flex items-center gap-2">
                           <Label htmlFor={`${charId}-${field}-${key}`} className="w-1/3 capitalize truncate text-sm">{key}</Label>
                           <Input
                               id={`${charId}-${field}-${key}`}
                               type={valueType === 'number' ? 'number' : 'text'}
                               value={String(value)}
                               onChange={(e) => onUpdate(charId, field, key, e.target.value)}
                               className="h-8 text-sm flex-1 bg-background border"
                               min={valueType === 'number' ? "0" : undefined}
                           />
                           <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onRemove(charId, field, key)}>
                               <Trash2 className="h-4 w-4" />
                           </Button>
                       </div>
                   ))
               ) : (
                   <p className="text-muted-foreground italic text-sm">Aucun(e) {title.toLowerCase()} défini(e).</p>
               )}
               <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => onAdd(charId, field)}>
                  <PlusCircle className="mr-1 h-4 w-4"/> {addLabel}
               </Button>
           </CardContent>
       </Card>
   </div>
);

const RelationsEditableCard = ({ charId, data, characters, playerId, playerName, currentLanguage, onUpdate, onRemove }: { charId: string, data?: Record<string, string>, characters: Character[], playerId: string, playerName: string, currentLanguage: string, onUpdate: (charId: string, field: 'relations', key: string, value: string | number | boolean) => void, onRemove: (charId: string, field: 'relations', key: string) => void }) => {
  const otherCharacters = characters.filter(c => c.id !== charId);
  const unknownRelation = currentLanguage === 'fr' ? "Inconnu" : "Unknown";

  return (
      <div className="space-y-2">
          <Label className="flex items-center gap-1"><LinkIcon className="h-4 w-4" /> Relations</Label>
          <Card className="bg-muted/30 border">
              <CardContent className="p-3 space-y-2">
                   <div className="flex items-center gap-2">
                      <Label htmlFor={`${charId}-relations-${playerId}`} className="w-1/3 truncate text-sm">{playerName} (Joueur)</Label>
                      <Input
                          id={`${charId}-relations-${playerId}`}
                          type="text"
                          value={data?.[playerId] || unknownRelation}
                          onChange={(e) => onUpdate(charId, 'relations', playerId, e.target.value)}
                          className="h-8 text-sm flex-1 bg-background border"
                          placeholder={currentLanguage === 'fr' ? "Ami, Ennemi, Parent..." : "Friend, Enemy, Parent..."}
                      />
                   </div>

                  {otherCharacters.map(otherChar => (
                      <div key={otherChar.id} className="flex items-center gap-2">
                          <Label htmlFor={`${charId}-relations-${otherChar.id}`} className="w-1/3 truncate text-sm">{otherChar.name}</Label>
                          <Input
                              id={`${charId}-relations-${otherChar.id}`}
                              type="text"
                              value={data?.[otherChar.id] || unknownRelation}
                              onChange={(e) => onUpdate(charId, 'relations', otherChar.id, e.target.value)}
                              className="h-8 text-sm flex-1 bg-background border"
                              placeholder={currentLanguage === 'fr' ? "Ami, Ennemi, Parent..." : "Friend, Enemy, Parent..."}
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onRemove(charId, 'relations', otherChar.id)} title={currentLanguage === 'fr' ? "Réinitialiser la relation à Inconnu" : "Reset relation to Unknown"}>
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

const ArrayEditableCard = ({ charId, field, title, icon: Icon, data, addLabel, onUpdate, onRemove, onAdd, currentLanguage }: { charId: string, field: 'history' | 'spells' | 'techniques' | 'passiveAbilities', title: string, icon: React.ElementType, data?: string[], addLabel: string, onUpdate: (charId: string, field: 'history' | 'spells' | 'techniques' | 'passiveAbilities', index: number, value: string) => void, onRemove: (charId: string, field: 'history' | 'spells' | 'techniques' | 'passiveAbilities', index: number) => void, onAdd: (charId: string, field: 'history' | 'spells' | 'techniques' | 'passiveAbilities') => void, currentLanguage: string }) => (
   <div className="space-y-2">
       <Label className="flex items-center gap-1"><Icon className="h-4 w-4"/> {title}</Label>
       <Card className="bg-muted/30 border">
           <CardContent className="p-3 space-y-2">
               {data && data.length > 0 ? (
                    <ScrollArea className="h-32">
                      {data.map((item, index) => (
                          <div key={index} className="flex items-center gap-2 mb-1">
                              <Textarea
                                  value={item}
                                  onChange={(e) => onUpdate(charId, field, index, e.target.value)}
                                  className="text-sm flex-1 bg-background border"
                                  placeholder={`${currentLanguage === 'fr' ? 'Entrée' : 'Entry'} ${index + 1}`}
                                  rows={1}
                              />
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive self-start" onClick={() => onRemove(charId, field, index)}>
                                  <Trash2 className="h-4 w-4" />
                              </Button>
                          </div>
                      ))}
                   </ScrollArea>
               ) : (
                   <p className="text-muted-foreground italic text-sm">{currentLanguage === 'fr' ? `Aucun(e) ${title.toLowerCase()} ajouté(e).` : `No ${title.toLowerCase()} added.`}</p>
               )}
                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => onAdd(charId, field)}>
                   <PlusCircle className="mr-1 h-4 w-4"/> {addLabel}
               </Button>
           </CardContent>
       </Card>
   </div>
);


export function CharacterSidebar({
    characters,
    onCharacterUpdate,
    onSaveNewCharacter,
    onAddStagedCharacter,
    onRelationUpdate,
    generateImageAction,
    rpgMode,
    relationsMode,
    playerId,
    playerName,
    currentLanguage,
}: CharacterSidebarProps) {
  const [imageLoadingStates, setImageLoadingStates] = React.useState<Record<string, boolean>>({});
  const [isClient, setIsClient] = React.useState(false);
  const [globalCharactersList, setGlobalCharactersList] = React.useState<Character[]>([]);
  const { toast } = useToast();

  React.useEffect(() => {
    setIsClient(true);
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

  const availableGlobalChars = React.useMemo(() => {
    if (!isClient) return [];
    return globalCharactersList.filter(
        gc => !characters.some(sc => sc.id === gc.id)
    );
  }, [globalCharactersList, characters, isClient]);

  const handleAddGlobalCharToAdventure = (charId: string) => {
    if (!charId) return; // Do nothing if no character is selected
    const charToAdd = globalCharactersList.find(gc => gc.id === charId);
    if (charToAdd) {
        onAddStagedCharacter(charToAdd);
    }
  };

  const handleGeneratePortrait = async (character: Character) => {
    if (imageLoadingStates[character.id]) return;
    setImageLoadingStates(prev => ({ ...prev, [character.id]: true }));

    try {
      const prompt = `Generate a portrait of ${character.name}. Description: ${character.details}. ${rpgMode && character.characterClass ? `Class: ${character.characterClass}.` : ''}`;
      const result = await generateImageAction({ sceneDescription: prompt });
      onCharacterUpdate({ ...character, portraitUrl: result.imageUrl });
      toast({
        title: "Portrait Généré",
        description: `Le portrait de ${character.name} a été généré.`,
      });
    } catch (error) {
      console.error(`Error generating portrait for ${character.name}:`, error);
      toast({
        title: "Erreur de Génération",
        description: `Impossible de générer le portrait de ${character.name}.`,
        variant: "destructive",
      });
    } finally {
      setImageLoadingStates(prev => ({ ...prev, [character.id]: false }));
    }
  };

  const handleUploadPortrait = (characterId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
        const character = characters.find(c => c.id === characterId);
        if (character) {
            onCharacterUpdate({ ...character, portraitUrl: reader.result as string });
            toast({ title: "Portrait Téléchargé", description: `Le portrait de ${character.name} a été mis à jour.` });
        }
    };
    reader.readAsDataURL(file);
    if(event.target) event.target.value = ''; // Reset file input
  };


   const handleFieldChange = (charId: string, field: keyof Character, value: string | number | boolean | null) => {
        const character = characters.find(c => c.id === charId);
        if (character) {
            const numberFields: (keyof Character)[] = ['level', 'experience', 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'hitPoints', 'maxHitPoints', 'manaPoints', 'maxManaPoints', 'armorClass', 'affinity'];
            let processedValue = value;
            if (numberFields.includes(field) && typeof value === 'string') {
                 let numValue = parseInt(value, 10);
                 if (field === 'affinity') {
                    numValue = Math.max(0, Math.min(100, isNaN(numValue) ? 50 : numValue));
                 }
                 processedValue = isNaN(numValue) ? (field === 'affinity' ? 50 : (field === 'manaPoints' || field === 'maxManaPoints' ? 0 :10 )) : numValue;
            } else if (field === 'affinity' && typeof processedValue === 'number') {
                processedValue = Math.max(0, Math.min(100, processedValue));
            }
            onCharacterUpdate({ ...character, [field]: processedValue });
        }
   };

    const handleNestedFieldChange = (charId: string, field: 'stats' | 'inventory' | 'opinion' | 'skills' | 'relations', key: string, value: string | number | boolean) => {
        const character = characters.find(c => c.id === charId);
        if (character) {
             const currentFieldData = character[field] || {};
             let finalValue = value;
             if ((field === 'inventory' || (field === 'skills' && typeof value === 'string'))) {
                 const numValue = parseInt(value as string, 10);
                 finalValue = isNaN(numValue) ? (field === 'inventory' ? 0 : value) : numValue;
             }

             if (field === 'relations') {
                 onRelationUpdate(charId, key, String(finalValue));
             } else {
                const updatedField = { ...currentFieldData, [key]: finalValue };
                onCharacterUpdate({ ...character, [field]: updatedField });
             }
        }
    };

     const removeNestedField = (charId: string, field: 'stats' | 'inventory' | 'opinion' | 'skills' | 'relations', key: string) => {
        const character = characters.find(c => c.id === charId);
        if (character && character[field]) {
             if (field === 'relations') {
                 onRelationUpdate(charId, key, currentLanguage === 'fr' ? "Inconnu" : "Unknown");
             } else {
                const updatedField = { ...character[field] };
                delete updatedField[key];
                onCharacterUpdate({ ...character, [field]: updatedField });
             }
        }
    };

    const addNestedField = (charId: string, field: 'stats' | 'inventory' | 'opinion' | 'skills' | 'relations') => {
        if (field === 'relations') {
             toast({ title: "Modification de Relation", description: "Modifiez les relations existantes via la liste déroulante ou le champ texte.", variant: "default" });
             return;
         }

        const key = prompt(`Entrez le nom du nouveau champ pour ${field} :`);
        if (key) {
            let valuePrompt = `Entrez la valeur pour ${key} :`;
            let defaultValue: string | number | boolean = '';
            if (field === 'inventory') {
                 valuePrompt = `Entrez la quantité pour ${key} :`;
                 defaultValue = 1;
            } else if (field === 'opinion') {
                 defaultValue = currentLanguage === 'fr' ? 'Neutre' : 'Neutral';
            } else if (field === 'skills') {
                 valuePrompt = `Entrez la valeur/bonus pour ${key} (ou laissez vide pour compétence acquise) :`;
                 defaultValue = true;
            } else if (field === 'stats') {
                 valuePrompt = `Entrez la valeur pour la statistique ${key} :`;
                 defaultValue = 10;
            }

            const valueInput = prompt(valuePrompt);
            if (valueInput !== null) {
                 let value: string | number | boolean = valueInput.trim() === '' ? defaultValue : valueInput;
                 handleNestedFieldChange(charId, field, key, value);
            }
        }
    };

    const handleArrayFieldChange = (charId: string, field: 'history' | 'spells' | 'techniques' | 'passiveAbilities', index: number, value: string) => {
        const character = characters.find(c => c.id === charId);
        if (character && character[field]) {
            const updatedArray = [...character[field]!];
            updatedArray[index] = value;
            onCharacterUpdate({ ...character, [field]: updatedArray });
        }
    };

    const addArrayFieldItem = (charId: string, field: 'history' | 'spells' | 'techniques' | 'passiveAbilities') => {
        const character = characters.find(c => c.id === charId);
        if (character) {
             let promptMessage = `Ajouter un nouvel élément à ${field} :`;
             if (field === 'history') promptMessage = "Ajouter une entrée à l'historique (action, citation...):"
             const value = prompt(promptMessage);
             if (value) {
                 const currentArray = character[field] || [];
                 onCharacterUpdate({ ...character, [field]: [...currentArray, value] });
             }
        }
    };

    const removeArrayFieldItem = (charId: string, field: 'history' | 'spells' | 'techniques' | 'passiveAbilities', index: number) => {
        const character = characters.find(c => c.id === charId);
         if (character && character[field]) {
            const updatedArray = [...character[field]!];
            updatedArray.splice(index, 1);
            onCharacterUpdate({ ...character, [field]: updatedArray });
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
                    <CardTitle className="text-base flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        {currentLanguage === 'fr' ? 'Ajouter un Personnage Sauvegardé' : 'Add Saved Character'}
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
                                <SelectValue placeholder={currentLanguage === 'fr' ? 'Sélectionner pour ajouter...' : 'Select to add...'} />
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

        {characters.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">{currentLanguage === 'fr' ? "Aucun personnage secondaire défini pour l'aventure en cours." : "No secondary characters defined for the current adventure."}</p>
        ) : (
            <Accordion type="multiple" className="w-full">
                {characters.map((char) => {
                    let isPotentiallyNew = false;
                    if (isClient) {
                        try {
                            const globalCharsStr = localStorage.getItem('globalCharacters');
                            const globalChars: Character[] = globalCharsStr ? JSON.parse(globalCharsStr) : [];
                            isPotentiallyNew = !globalChars.some(gc => gc.id === char.id) && !(char as any)._lastSaved;
                        } catch (e) {
                            console.error("Error accessing localStorage:", e);
                        }
                    }
                    const currentAffinity = char.affinity ?? 50;

                    return (
                    <AccordionItem value={char.id} key={char.id}>
                       <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                     {imageLoadingStates[char.id] ? (
                                        <AvatarFallback><Loader2 className="h-4 w-4 animate-spin"/></AvatarFallback>
                                     ) : char.portraitUrl ? (
                                        <AvatarImage src={char.portraitUrl} alt={char.name} data-ai-hint={`${char.name} portrait`} />
                                     ) : (
                                        <AvatarFallback>{char.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                     )}
                                </Avatar>
                                <span className="font-medium truncate">{char.name} {rpgMode && char.level ? `(Niv. ${char.level})` : ''}</span>
                                {isClient && isPotentiallyNew && (
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
                            {isClient && isPotentiallyNew && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="outline" size="sm" className="w-full mb-2" onClick={() => onSaveNewCharacter(char)}>
                                                <Save className="h-4 w-4 mr-1" /> {currentLanguage === 'fr' ? "Sauvegarder Globalement" : "Save Globally"}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom">{currentLanguage === 'fr' ? "Sauvegarder ce personnage pour le réutiliser dans d'autres aventures." : "Save this character for reuse in other adventures."}</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}

                           <div className="flex flex-col items-center gap-2">
                                <div className="w-24 h-24 relative rounded-md overflow-hidden border bg-muted flex items-center justify-center">
                                    {imageLoadingStates[char.id] ? (
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/>
                                     ) : char.portraitUrl ? (
                                        <Image src={char.portraitUrl} alt={`${char.name} portrait`} layout="fill" objectFit="cover" data-ai-hint={`${char.name} portrait`} />
                                     ) : (
                                        <User className="h-10 w-10 text-muted-foreground"/>
                                     )}
                                </div>
                                <div className="flex gap-2">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="outline" size="sm" onClick={() => handleGeneratePortrait(char)} disabled={imageLoadingStates[char.id]}>
                                                <Wand2 className="h-4 w-4 mr-1"/> {currentLanguage === 'fr' ? "IA" : "AI"}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>{currentLanguage === 'fr' ? "Générer un portrait avec l'IA." : "Generate an AI portrait."}</TooltipContent>
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
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => document.getElementById(`upload-portrait-${char.id}`)?.click()}
                                            >
                                                <UploadCloud className="h-4 w-4 mr-1"/> {currentLanguage === 'fr' ? "Télécharger" : "Upload"}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>{currentLanguage === 'fr' ? "Télécharger un portrait personnalisé." : "Upload a custom portrait."}</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                </div>
                           </div>

                            <Separator />

                            {rpgMode && (
                                <Card className="border-dashed bg-muted/20">
                                    <CardHeader className="pb-2 pt-4">
                                        <UICardDescription className="text-xs uppercase tracking-wider">Fiche Technique</UICardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                        <div className="flex justify-between"><span>Classe:</span> <span className="font-medium">{char.characterClass || 'N/A'}</span></div>
                                        <div className="flex justify-between"><span>Niveau:</span> <span className="font-medium">{char.level || 'N/A'}</span></div>
                                        <Separator className="my-1"/>
                                        <div>
                                            <div className="flex justify-between items-center">
                                                <Label className="text-xs font-medium flex items-center"><Heart className="h-3 w-3 mr-1 text-red-500"/>PV</Label>
                                                <span className="text-xs">{char.hitPoints ?? 'N/A'} / {char.maxHitPoints ?? 'N/A'}</span>
                                            </div>
                                            <Progress value={((char.hitPoints ?? 0) / (char.maxHitPoints || 1)) * 100} className="h-1.5 [&>div]:bg-red-500" />
                                        </div>
                                        {(char.maxManaPoints ?? 0) > 0 && (
                                            <div>
                                                <div className="flex justify-between items-center">
                                                    <Label className="text-xs font-medium flex items-center"><Zap className="h-3 w-3 mr-1 text-blue-500"/>PM</Label>
                                                    <span className="text-xs">{char.manaPoints ?? 'N/A'} / {char.maxManaPoints ?? 'N/A'}</span>
                                                </div>
                                                <Progress value={((char.manaPoints ?? 0) / (char.maxManaPoints || 1)) * 100} className="h-1.5 [&>div]:bg-blue-500" />
                                            </div>
                                        )}
                                        <Separator className="my-1"/>
                                        <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-xs">
                                            <span>FOR: {char.strength ?? 'N/A'}</span>
                                            <span>DEX: {char.dexterity ?? 'N/A'}</span>
                                            <span>CON: {char.constitution ?? 'N/A'}</span>
                                            <span>INT: {char.intelligence ?? 'N/A'}</span>
                                            <span>SAG: {char.wisdom ?? 'N/A'}</span>
                                            <span>CHA: {char.charisma ?? 'N/A'}</span>
                                        </div>
                                        <Separator className="my-1"/>
                                        <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-xs">
                                            <span>CA: {char.armorClass ?? 'N/A'}</span>
                                            <span className="truncate">Atk: +{char.attackBonus ?? 'N/A'}</span>
                                            <span className="truncate">Dmg: {char.damageBonus || 'N/A'}</span>
                                        </div>
                                         {char.isHostile !== undefined && (
                                            <div className={`text-xs ${char.isHostile ? 'text-destructive' : 'text-green-600'}`}>
                                                {char.isHostile ? (currentLanguage === 'fr' ? 'Hostile' : 'Hostile') : (currentLanguage === 'fr' ? 'Non-Hostile' : 'Non-Hostile')}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                            <Separator />
                            <Label className="block mb-2 mt-4 text-sm font-medium">Champs Éditables :</Label>
                            <EditableField
                                label="Nom"
                                id={`${char.id}-name`}
                                value={char.name}
                                onChange={(e) => handleFieldChange(char.id, 'name', e.target.value)}
                            />
                            <EditableField
                                label={currentLanguage === 'fr' ? "Description Publique" : "Public Description"}
                                id={`${char.id}-details`}
                                value={char.details}
                                onChange={(e) => handleFieldChange(char.id, 'details', e.target.value)}
                                rows={4}
                            />
                             <EditableField
                                label={currentLanguage === 'fr' ? "Biographie / Notes Privées" : "Biography / Private Notes"}
                                id={`${char.id}-biographyNotes`}
                                value={char.biographyNotes || ""}
                                onChange={(e) => handleFieldChange(char.id, 'biographyNotes', e.target.value)}
                                rows={5}
                                placeholder={currentLanguage === 'fr' ? "Passé, secrets, objectifs... (pour contexte IA)" : "Background, secrets, goals... (for AI context)"}
                            />
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
                                                value={currentAffinity}
                                                onChange={(e) => handleFieldChange(char.id, 'affinity', e.target.value)}
                                                className="h-8 text-sm w-20 flex-none bg-background border"
                                            />
                                            <Progress value={currentAffinity} className="flex-1 h-2" />
                                            <span className="text-xs text-muted-foreground w-24 text-right shrink-0">{getAffinityLabel(currentAffinity)}</span>
                                        </div>
                                    </div>
                                    <RelationsEditableCard
                                        charId={char.id}
                                        data={char.relations}
                                        characters={characters}
                                        playerId={playerId}
                                        playerName={playerName}
                                        currentLanguage={currentLanguage}
                                        onUpdate={handleNestedFieldChange}
                                        onRemove={removeNestedField}
                                    />
                                </>
                            )}
                            {rpgMode && (
                                <>
                                    <Separator />
                                    <div className="grid grid-cols-2 gap-4">
                                        <EditableField label="Classe" id={`${char.id}-class`} value={char.characterClass} onChange={(e) => handleFieldChange(char.id, 'characterClass', e.target.value)} placeholder="Guerrier, Mage..." />
                                        <EditableField label="Niveau" id={`${char.id}-level`} type="number" value={char.level} onChange={(e) => handleFieldChange(char.id, 'level', e.target.value)} />
                                    </div>
                                     <EditableField label="Expérience (XP)" id={`${char.id}-exp`} type="number" value={char.experience} onChange={(e) => handleFieldChange(char.id, 'experience', e.target.value)} />
                                     <div className="grid grid-cols-2 gap-4">
                                        <EditableField label="PV Actuels" id={`${char.id}-hp`} type="number" value={char.hitPoints} onChange={(e) => handleFieldChange(char.id, 'hitPoints', e.target.value)} />
                                        <EditableField label="PV Max" id={`${char.id}-maxHp`} type="number" value={char.maxHitPoints} onChange={(e) => handleFieldChange(char.id, 'maxHitPoints', e.target.value)} />
                                     </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <EditableField label="PM Actuels" id={`${char.id}-mp`} type="number" value={char.manaPoints ?? 0} onChange={(e) => handleFieldChange(char.id, 'manaPoints', e.target.value)} />
                                        <EditableField label="PM Max" id={`${char.id}-maxMp`} type="number" value={char.maxManaPoints ?? 0} onChange={(e) => handleFieldChange(char.id, 'maxManaPoints', e.target.value)} />
                                     </div>
                                     <EditableField label="Classe d'Armure (CA)" id={`${char.id}-ac`} type="number" value={char.armorClass} onChange={(e) => handleFieldChange(char.id, 'armorClass', e.target.value)} />
                                      <div className="grid grid-cols-2 gap-4">
                                        <EditableField label="Bonus Attaque" id={`${char.id}-atkBonus`} type="number" value={char.attackBonus} onChange={(e) => handleFieldChange(char.id, 'attackBonus', e.target.value)} />
                                        <EditableField label="Bonus Dégâts" id={`${char.id}-dmgBonus`} value={char.damageBonus} onChange={(e) => handleFieldChange(char.id, 'damageBonus', e.target.value)} placeholder="ex: 1d6+2" />
                                     </div>
                                    <div className="flex items-center space-x-2 pt-2">
                                        <input
                                            type="checkbox"
                                            id={`${char.id}-isHostile`}
                                            checked={char.isHostile ?? false}
                                            onChange={(e) => handleFieldChange(char.id, 'isHostile', e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                        <Label htmlFor={`${char.id}-isHostile`} className="text-sm">
                                            {currentLanguage === 'fr' ? 'Est Hostile ?' : 'Is Hostile?'}
                                        </Label>
                                    </div>
                                    <Separator />
                                     <Label className="flex items-center gap-1"><Dices className="h-4 w-4"/> Caractéristiques</Label>
                                     <div className="grid grid-cols-3 gap-2">
                                        <EditableField label="FOR" id={`${char.id}-str`} type="number" value={char.strength} onChange={(e) => handleFieldChange(char.id, 'strength', e.target.value)} />
                                        <EditableField label="DEX" id={`${char.id}-dex`} type="number" value={char.dexterity} onChange={(e) => handleFieldChange(char.id, 'dexterity', e.target.value)} />
                                        <EditableField label="CON" id={`${char.id}-con`} type="number" value={char.constitution} onChange={(e) => handleFieldChange(char.id, 'constitution', e.target.value)} />
                                        <EditableField label="INT" id={`${char.id}-int`} type="number" value={char.intelligence} onChange={(e) => handleFieldChange(char.id, 'intelligence', e.target.value)} />
                                        <EditableField label="SAG" id={`${char.id}-wis`} type="number" value={char.wisdom} onChange={(e) => handleFieldChange(char.id, 'wisdom', e.target.value)} />
                                        <EditableField label="CHA" id={`${char.id}-cha`} type="number" value={char.charisma} onChange={(e) => handleFieldChange(char.id, 'charisma', e.target.value)} />
                                    </div>
                                    <NestedEditableCard charId={char.id} field="stats" title="Statistiques Diverses" icon={BarChartHorizontal} data={char.stats} addLabel="Ajouter Stat" onUpdate={handleNestedFieldChange} onRemove={removeNestedField} onAdd={addNestedField}/>
                                    <NestedEditableCard charId={char.id} field="skills" title="Compétences" icon={Star} data={char.skills} addLabel="Ajouter Compétence" valueType="text" onUpdate={handleNestedFieldChange} onRemove={removeNestedField} onAdd={addNestedField}/>
                                    <NestedEditableCard charId={char.id} field="inventory" title="Inventaire" icon={ScrollText} data={char.inventory} addLabel="Ajouter Objet" valueType="number" onUpdate={handleNestedFieldChange} onRemove={removeNestedField} onAdd={addNestedField}/>
                                    <ArrayEditableCard charId={char.id} field="spells" title="Sorts" icon={Zap} data={char.spells} addLabel="Ajouter Sort" onUpdate={handleArrayFieldChange} onRemove={removeArrayFieldItem} onAdd={addArrayFieldItem} currentLanguage={currentLanguage}/>
                                    <ArrayEditableCard charId={char.id} field="techniques" title="Techniques de Combat" icon={Swords} data={char.techniques} addLabel="Ajouter Technique" onUpdate={handleArrayFieldChange} onRemove={removeArrayFieldItem} onAdd={addArrayFieldItem} currentLanguage={currentLanguage}/>
                                    <ArrayEditableCard charId={char.id} field="passiveAbilities" title="Capacités Passives" icon={Shield} data={char.passiveAbilities} addLabel="Ajouter Capacité" onUpdate={handleArrayFieldChange} onRemove={removeArrayFieldItem} onAdd={addArrayFieldItem} currentLanguage={currentLanguage}/>
                                </>
                            )}
                            <Separator />
                             <ArrayEditableCard charId={char.id} field="history" title={currentLanguage === 'fr' ? "Historique Narratif" : "Narrative History"} icon={History} data={char.history} addLabel={currentLanguage === 'fr' ? "Ajouter Entrée Historique" : "Add History Entry"} onUpdate={handleArrayFieldChange} onRemove={removeArrayFieldItem} onAdd={addArrayFieldItem} currentLanguage={currentLanguage}/>
                            <NestedEditableCard charId={char.id} field="opinion" title={currentLanguage === 'fr' ? "Opinions" : "Opinions"} icon={Brain} data={char.opinion} addLabel={currentLanguage === 'fr' ? "Ajouter Opinion" : "Add Opinion"} onUpdate={handleNestedFieldChange} onRemove={removeNestedField} onAdd={addNestedField}/>
                        </AccordionContent>
                    </AccordionItem>
                    )
                })}
            </Accordion>
        )}
    </div>
  );
}

    