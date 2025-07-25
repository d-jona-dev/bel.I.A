
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
import { Wand2, Loader2, User, ScrollText, BarChartHorizontal, Brain, History, Star, Dices, Shield, Swords, Zap, PlusCircle, Trash2, Save, Heart, Link as LinkIcon, UserPlus, UploadCloud, Users, FilePenLine, BarChart2 as ExpIcon, MapPin } from "lucide-react"; // Added ExpIcon and MapPin
import { Separator } from "@/components/ui/separator";
import type { GenerateSceneImageInput, GenerateSceneImageOutput } from "@/ai/flows/generate-scene-image";
import { useToast } from "@/hooks/use-toast";
import type { Character, MapPointOfInterest } from "@/types";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const BASE_ATTRIBUTE_VALUE_FORM = 8;
const ATTRIBUTE_POINTS_PER_LEVEL_GAIN_FORM = 5;
const INITIAL_CREATION_ATTRIBUTE_POINTS_NPC_DEFAULT = 5;


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
    strategyMode: boolean;
    playerId: string;
    playerName: string;
    currentLanguage: string;
    pointsOfInterest: MapPointOfInterest[]; // Add POIs for location selection
}

// Helper Components (defined outside CharacterSidebar)

const EditableField = ({ label, id, value, onChange, onBlur, type = "text", placeholder, rows, min, max, disabled = false }: { label: string, id: string, value: string | number | undefined, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void, onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void, type?: string, placeholder?: string, rows?: number, min?: string | number, max?: string | number, disabled?: boolean }) => (
    <div className="space-y-1">
          <Label htmlFor={id}>{label}</Label>
          {rows ? (
              <Textarea id={id} defaultValue={value ?? ""} onChange={onChange} onBlur={onBlur} placeholder={placeholder} rows={rows} className="text-sm bg-background border" disabled={disabled}/>
          ) : (
              <Input id={id} type={type} defaultValue={value ?? ""} onChange={onChange} onBlur={onBlur} placeholder={placeholder} className="h-8 text-sm bg-background border" min={min} max={max} disabled={disabled}/>
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
                      <Label htmlFor={`${charId}-relations-${playerId}`} className="w-1/3 truncate text-sm">{playerName} (Joueur)</Label>
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
                          <Label htmlFor={`${charId}-relations-${otherChar.id}`} className="w-1/3 truncate text-sm">{otherChar.name}</Label>
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

const ArrayEditableCard = ({ charId, field, title, icon: Icon, data, addLabel, onUpdate, onRemove, onAdd, currentLanguage, disabled = false }: { charId: string, field: 'history' | 'spells', title: string, icon: React.ElementType, data?: string[], addLabel: string, onUpdate: (charId: string, field: 'history' | 'spells', index: number, value: string) => void, onRemove: (charId: string, field: 'history' | 'spells', index: number) => void, onAdd: (charId: string, field: 'history' | 'spells') => void, currentLanguage: string, disabled?: boolean }) => (
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
                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => onAdd(charId, field)} disabled={disabled}>
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
    strategyMode,
    playerId,
    playerName,
    currentLanguage,
    pointsOfInterest,
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
    if (!charId) return;
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
    if(event.target) event.target.value = '';
  };


   const handleFieldChange = (charId: string, field: keyof Character, value: string | number | boolean | null) => {
        const character = characters.find(c => c.id === charId);
        if (character) {
            if (field === 'locationId' && value === '__traveling__') {
                value = null; // Convert special value to null
            }
            const numberFields: (keyof Character)[] = ['level', 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'hitPoints', 'maxHitPoints', 'manaPoints', 'maxManaPoints', 'armorClass', 'affinity', 'initialAttributePoints', 'currentExp', 'expToNextLevel'];
            let processedValue = value;
            if (numberFields.includes(field) && typeof value === 'string') {
                 let numValue = parseInt(value, 10);
                 if (field === 'affinity') {
                    numValue = Math.max(0, Math.min(100, isNaN(numValue) ? 50 : numValue));
                 } else if (field === 'initialAttributePoints') {
                    numValue = Math.max(0, isNaN(numValue) ? INITIAL_CREATION_ATTRIBUTE_POINTS_NPC_DEFAULT : numValue);
                 } else if (field === 'currentExp' || field === 'expToNextLevel') {
                    numValue = Math.max(0, isNaN(numValue) ? (field === 'expToNextLevel' ? 100 : 0) : numValue);
                 }
                 processedValue = isNaN(numValue) ? (field === 'affinity' ? 50 : (field === 'manaPoints' || field === 'maxManaPoints' || field === 'currentExp' ? 0 : (field === 'expToNextLevel' ? 100 : 10) )) : numValue;
            } else if (field === 'affinity' && typeof processedValue === 'number') {
                processedValue = Math.max(0, Math.min(100, processedValue));
            } else if (field === 'initialAttributePoints' && typeof processedValue === 'number') {
                processedValue = Math.max(0, processedValue);
            } else if ((field === 'currentExp' || field === 'expToNextLevel') && typeof processedValue === 'number') {
                processedValue = Math.max(0, processedValue);
            }
            onCharacterUpdate({ ...character, [field]: processedValue });
        }
   };

    const handleNestedFieldChange = (charId: string, field: 'relations', key: string, value: string | number | boolean) => {
        const character = characters.find(c => c.id === charId);
        if (character) {
             const currentFieldData = character[field] || {};
             let finalValue = value;

             if (field === 'relations') {
                 onRelationUpdate(charId, key, String(finalValue));
             }
        }
    };

     const removeNestedField = (charId: string, field: 'relations', key: string) => {
        const character = characters.find(c => c.id === charId);
        if (character && character[field]) {
             if (field === 'relations') {
                 onRelationUpdate(charId, key, currentLanguage === 'fr' ? "Inconnu" : "Unknown");
             }
        }
    };

    const handleArrayFieldChange = (charId: string, field: 'history' | 'spells', index: number, value: string) => {
        const character = characters.find(c => c.id === charId);
        if (character && character[field]) {
            const updatedArray = [...character[field]!];
            updatedArray[index] = value;
            onCharacterUpdate({ ...character, [field]: updatedArray });
        }
    };

    const addArrayFieldItem = (charId: string, field: 'history' | 'spells') => {
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

    const removeArrayFieldItem = (charId: string, field: 'history' | 'spells', index: number) => {
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

    const handleNpcAttributeBlur = (charId: string, fieldName: keyof Character, value: string) => {
        const char = characters.find(c => c.id === charId);
        if (!char || !char.isAlly || !rpgMode) return;
    
        const creationPoints = char.initialAttributePoints ?? INITIAL_CREATION_ATTRIBUTE_POINTS_NPC_DEFAULT;
        const levelPoints = (char.level && char.level > 1) ? (char.level - 1) * ATTRIBUTE_POINTS_PER_LEVEL_GAIN_FORM : 0;
        const totalDistributable = creationPoints + levelPoints;
    
        const attributes: (keyof Character)[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
        
        let spentOnOtherAttrs = 0;
        attributes.forEach(attrKey => {
            if (attrKey !== fieldName) {
                spentOnOtherAttrs += (Number(char[attrKey] || BASE_ATTRIBUTE_VALUE_FORM)) - BASE_ATTRIBUTE_VALUE_FORM;
            }
        });

        let newAttributeValue = parseInt(value, 10);
        if (isNaN(newAttributeValue) || newAttributeValue < BASE_ATTRIBUTE_VALUE_FORM) {
            newAttributeValue = BASE_ATTRIBUTE_VALUE_FORM;
        }

        const pointsForThisAttr = newAttributeValue - BASE_ATTRIBUTE_VALUE_FORM;
        
        if (spentOnOtherAttrs + pointsForThisAttr > totalDistributable) {
            const maxPointsForThis = totalDistributable - spentOnOtherAttrs;
            newAttributeValue = BASE_ATTRIBUTE_VALUE_FORM + maxPointsForThis;
        }
        
        onCharacterUpdate({ ...char, [fieldName]: newAttributeValue });
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
                {characters.map((char) => (
                    <CharacterAccordionItem
                        key={char.id}
                        character={char}
                        isClient={isClient}
                        imageLoadingStates={imageLoadingStates}
                        onSaveNewCharacter={onSaveNewCharacter}
                        handleGeneratePortrait={handleGeneratePortrait}
                        handleUploadPortrait={handleUploadPortrait}
                        handleFieldChange={handleFieldChange}
                        handleNestedFieldChange={handleNestedFieldChange}
                        removeNestedField={removeNestedField}
                        handleArrayFieldChange={handleArrayFieldChange}
                        addArrayFieldItem={addArrayFieldItem}
                        removeArrayFieldItem={removeArrayFieldItem}
                        handleNpcAttributeBlur={handleNpcAttributeBlur}
                        onCharacterUpdate={onCharacterUpdate}
                        getAffinityLabel={getAffinityLabel}
                        rpgMode={rpgMode}
                        relationsMode={relationsMode}
                        strategyMode={strategyMode}
                        playerId={playerId}
                        playerName={playerName}
                        currentLanguage={currentLanguage}
                        pointsOfInterest={pointsOfInterest}
                        allCharacters={characters}
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
    isClient,
    imageLoadingStates,
    onSaveNewCharacter,
    handleGeneratePortrait,
    handleUploadPortrait,
    handleFieldChange,
    handleNestedFieldChange,
    removeNestedField,
    handleArrayFieldChange,
    addArrayFieldItem,
    removeArrayFieldItem,
    handleNpcAttributeBlur,
    onCharacterUpdate,
    getAffinityLabel,
    rpgMode,
    relationsMode,
    strategyMode,
    playerId,
    playerName,
    currentLanguage,
    pointsOfInterest,
    allCharacters,
}: {
    character: Character;
    isClient: boolean;
    imageLoadingStates: Record<string, boolean>;
    onSaveNewCharacter: (character: Character) => void;
    handleGeneratePortrait: (character: Character) => void;
    handleUploadPortrait: (characterId: string, event: React.ChangeEvent<HTMLInputElement>) => void;
    handleFieldChange: (charId: string, field: keyof Character, value: any) => void;
    handleNestedFieldChange: (charId: string, field: 'relations', key: string, value: string | number | boolean) => void;
    removeNestedField: (charId: string, field: 'relations', key: string) => void;
    handleArrayFieldChange: (charId: string, field: 'history' | 'spells', index: number, value: string) => void;
    addArrayFieldItem: (charId: string, field: 'history' | 'spells') => void;
    removeArrayFieldItem: (charId: string, field: 'history' | 'spells', index: number) => void;
    handleNpcAttributeBlur: (charId: string, fieldName: keyof Character, value: string) => void;
    onCharacterUpdate: (updatedCharacter: Character) => void;
    getAffinityLabel: (affinity: number | undefined) => string;
    rpgMode: boolean;
    relationsMode: boolean;
    strategyMode: boolean;
    playerId: string;
    playerName: string;
    currentLanguage: string;
    pointsOfInterest: MapPointOfInterest[];
    allCharacters: Character[];
}) {

    React.useEffect(() => {
        if (rpgMode && char.isAlly) {
            const creationPoints = char.initialAttributePoints ?? INITIAL_CREATION_ATTRIBUTE_POINTS_NPC_DEFAULT;
            const levelPoints = (char.level && char.level > 1) ? (char.level - 1) * ATTRIBUTE_POINTS_PER_LEVEL_GAIN_FORM : 0;
            const totalDistributable = creationPoints + levelPoints;

            const attributes: (keyof Character)[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
            let spentPoints = 0;
            let updatedChar = { ...char };
            let changed = false;

            attributes.forEach(attr => {
                if (updatedChar[attr] === undefined) {
                    (updatedChar as any)[attr] = BASE_ATTRIBUTE_VALUE_FORM;
                    changed = true;
                }
                spentPoints += (Number(updatedChar[attr]) - BASE_ATTRIBUTE_VALUE_FORM);
            });

            if (spentPoints > totalDistributable) {
                let pointsOver = spentPoints - totalDistributable;
                const sortedAttrs = attributes.map(attr => ({ name: attr, value: Number(updatedChar[attr]) })).sort((a, b) => b.value - a.value);

                for (const attr of sortedAttrs) {
                    if (pointsOver <= 0) break;
                    const currentValue = attr.value;
                    const reduction = Math.min(pointsOver, currentValue - BASE_ATTRIBUTE_VALUE_FORM);
                    if (reduction > 0) {
                        (updatedChar as any)[attr.name] = currentValue - reduction;
                        pointsOver -= reduction;
                        changed = true;
                    }
                }
            }
            
            if (changed) {
                onCharacterUpdate(updatedChar);
            }
        }
    }, [char, rpgMode, onCharacterUpdate]);
    
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
    const isAllyAndRpg = rpgMode && char.isAlly;
    
    const creationPointsNpc = char.initialAttributePoints ?? INITIAL_CREATION_ATTRIBUTE_POINTS_NPC_DEFAULT;
    const levelPointsNpc = (rpgMode && char.level && char.level > 1) ? (char.level - 1) * ATTRIBUTE_POINTS_PER_LEVEL_GAIN_FORM : 0;
    const totalDistributableNpc = creationPointsNpc + levelPointsNpc;

    const attributes: (keyof Character)[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    const currentNpcSpentPoints = attributes.reduce((acc, attr) => {
        return acc + ((Number(char[attr]) || BASE_ATTRIBUTE_VALUE_FORM) - BASE_ATTRIBUTE_VALUE_FORM);
    }, 0);

    const remainingNpcPoints = totalDistributableNpc - currentNpcSpentPoints;

    const RULER_CLASSES = ["impératrice", "empereur", "duc", "duchesse", "roi", "reine", "noble"];
    const AFFINITY_THRESHOLD = 80;

    const isRuler = RULER_CLASSES.some(rulerClass =>
        char.characterClass?.toLowerCase().includes(rulerClass)
    );

    const canRecruit = !isRuler || (char.affinity ?? 0) >= AFFINITY_THRESHOLD;
    const isAllySwitchDisabled = !canRecruit;

    const tooltipContent = isAllySwitchDisabled
        ? `L'affinité doit être d'au moins ${AFFINITY_THRESHOLD} pour recruter ce dirigeant. (Actuelle: ${char.affinity ?? 50})`
        : null;

    return (
        <AccordionItem value={char.id}>
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
                    <span className="font-medium truncate">{char.name} {rpgMode && char.level ? `(Niv. ${char.level})` : ''} {char.isAlly && rpgMode ? <Users className="inline h-4 w-4 ml-1 text-green-500"/> : ''}</span>
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
                
                {strategyMode && (
                    <div className="space-y-1">
                        <Label htmlFor={`${char.id}-location`} className="flex items-center gap-1"><MapPin className="h-4 w-4"/> Localisation Actuelle</Label>
                        <Select value={char.locationId ?? "__traveling__"} onValueChange={(value) => handleFieldChange(char.id, 'locationId', value)}>
                            <SelectTrigger id={`${char.id}-location`} className="h-8 text-sm bg-background border">
                                <SelectValue placeholder="Sélectionner un lieu..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__traveling__">Aucun lieu (En voyage)</SelectItem>
                                {pointsOfInterest.map(poi => (
                                    <SelectItem key={poi.id} value={poi.id}>{poi.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {rpgMode && (
                    <TooltipProvider>
                        <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                                <div className={`flex items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/30 ${isAllySwitchDisabled ? 'cursor-not-allowed' : ''}`}>
                                    <div className="space-y-0.5">
                                        <Label htmlFor={`${char.id}-isAlly`} className="flex items-center gap-2"><Users className="h-4 w-4 text-green-600"/> Allié du Joueur</Label>
                                        <UICardDescription className="text-xs">
                                            Permet de modifier ses attributs et de l'intégrer à l'équipe.
                                        </UICardDescription>
                                    </div>
                                    {/* The span wrapper is a trick to make tooltips work on disabled elements */}
                                    <span tabIndex={isAllySwitchDisabled ? 0 : -1}>
                                        <Switch
                                            id={`${char.id}-isAlly`}
                                            checked={char.isAlly ?? false}
                                            onCheckedChange={(checked) => handleFieldChange(char.id, 'isAlly', checked)}
                                            disabled={isAllySwitchDisabled}
                                        />
                                    </span>
                                </div>
                            </TooltipTrigger>
                            {tooltipContent && (
                                <TooltipContent>
                                    <p>{tooltipContent}</p>
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </TooltipProvider>
                )}

                {rpgMode && (
                    <Card className="border-dashed bg-muted/20">
                        <CardHeader className="pb-2 pt-4">
                            <UICardDescription className="text-xs uppercase tracking-wider flex items-center gap-1">
                                <FilePenLine className="h-3 w-3" />
                                Fiche Personnage {char.isAlly ? "(Modifiable si Allié)" : "(Lecture Seule)"}
                            </UICardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <EditableField label="Classe" id={`${char.id}-class`} value={char.characterClass} onChange={(e) => handleFieldChange(char.id, 'characterClass', e.target.value)} onBlur={e => handleFieldChange(char.id, 'characterClass', e.target.value)} placeholder="Guerrier, Mage..." disabled={!isAllyAndRpg} />
                            <EditableField label="Niveau" id={`${char.id}-level`} type="number" value={char.level} onChange={(e) => handleFieldChange(char.id, 'level', e.target.value)} onBlur={e => handleFieldChange(char.id, 'level', e.target.value)} disabled={!isAllyAndRpg} />
                            {char.level !== undefined && char.level >=1 && (
                                <>
                                <div className="flex justify-between items-center mb-0.5">
                                    <Label htmlFor={`${char.id}-exp`} className="text-xs font-medium flex items-center"><ExpIcon className="h-3 w-3 mr-1 text-yellow-500"/>EXP</Label>
                                    <span className="text-xs text-muted-foreground">{char.currentExp ?? 0} / {char.expToNextLevel ?? (100 * Math.pow(1.5, char.level -1))}</span>
                                </div>
                                <Progress id={`${char.id}-exp`} value={(((char.currentExp ?? 0) / (char.expToNextLevel || 1))) * 100} className="h-1.5 [&>div]:bg-yellow-500" />
                                </>
                            )}
                            <Separator className="my-1"/>
                            <div className="flex justify-between items-center">
                                <Label className="text-xs font-medium flex items-center"><Heart className="h-3 w-3 mr-1 text-red-500"/>PV</Label>
                                <span className="text-xs">{char.hitPoints ?? 'N/A'} / {char.maxHitPoints ?? 'N/A'}</span>
                            </div>
                            <Progress value={((char.hitPoints ?? 0) / (char.maxHitPoints || 1)) * 100} className="h-1.5 [&>div]:bg-red-500" />
                            {(char.maxManaPoints ?? 0) > 0 && (
                                <>
                                <div className="flex justify-between items-center mt-1">
                                    <Label className="text-xs font-medium flex items-center"><Zap className="h-3 w-3 mr-1 text-blue-500"/>PM</Label>
                                    <span className="text-xs">{char.manaPoints ?? 'N/A'} / {char.maxManaPoints ?? 'N/A'}</span>
                                </div>
                                <Progress value={((char.manaPoints ?? 0) / (char.maxManaPoints || 1)) * 100} className="h-1.5 [&>div]:bg-blue-500" />
                                </>
                            )}
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
                            {isAllyAndRpg && (
                                <>
                                    <Separator className="my-2"/>
                                    <Label className="flex items-center gap-1 text-xs uppercase tracking-wider"><Dices className="h-3 w-3"/> Attributs</Label>
                                    <EditableField label="Points d'Attributs de Création" id={`${char.id}-initialAttributePoints`} type="number" value={char.initialAttributePoints ?? INITIAL_CREATION_ATTRIBUTE_POINTS_NPC_DEFAULT} onChange={(e) => handleFieldChange(char.id, 'initialAttributePoints', e.target.value)} onBlur={e => handleFieldChange(char.id, 'initialAttributePoints', e.target.value)} min="0" disabled={!isAllyAndRpg}/>
                                    <div className="text-xs text-muted-foreground">Total distribuables (Niv. {char.level || 1}): {totalDistributableNpc}</div>
                                     <div className="p-1 border rounded-md bg-background text-center text-xs">
                                        Points d'attributs restants : <span className={`font-bold ${remainingNpcPoints < 0 ? 'text-destructive' : 'text-primary'}`}>{remainingNpcPoints}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {attributes.map(attr => (
                                            <EditableField 
                                                key={attr} 
                                                label={attr.charAt(0).toUpperCase() + attr.slice(1)} 
                                                id={`${char.id}-${attr}`} type="number" 
                                                value={char[attr]} 
                                                onChange={(e) => onCharacterUpdate({ ...char, [attr]: isNaN(parseInt(e.target.value)) ? char[attr] : parseInt(e.target.value) })}
                                                onBlur={e => handleNpcAttributeBlur(char.id, attr, e.target.value)} 
                                                min={BASE_ATTRIBUTE_VALUE_FORM.toString()} 
                                                disabled={!isAllyAndRpg}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}
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
                 <EditableField
                    label={currentLanguage === 'fr' ? "Biographie / Notes Privées" : "Biography / Private Notes"}
                    id={`${char.id}-biographyNotes`}
                    value={char.biographyNotes || ""}
                    onChange={(e) => handleFieldChange(char.id, 'biographyNotes', e.target.value)}
                    onBlur={(e) => handleFieldChange(char.id, 'biographyNotes', e.target.value)}
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
                {rpgMode && (
                    <>
                        <Separator />
                        <ArrayEditableCard charId={char.id} field="spells" title="Sorts" icon={Zap} data={char.spells} addLabel="Ajouter Sort" onUpdate={handleArrayFieldChange} onRemove={removeArrayFieldItem} onAdd={addArrayFieldItem} currentLanguage={currentLanguage} disabled={!isAllyAndRpg}/>
                    </>
                )}
                <Separator />
                 <ArrayEditableCard charId={char.id} field="history" title={currentLanguage === 'fr' ? "Historique Narratif" : "Narrative History"} icon={History} data={char.history} addLabel={currentLanguage === 'fr' ? "Ajouter Entrée Historique" : "Add History Entry"} onUpdate={handleArrayFieldChange} onRemove={removeArrayFieldItem} onAdd={addArrayFieldItem} currentLanguage={currentLanguage}/>
            </AccordionContent>
        </AccordionItem>
    );
});

    