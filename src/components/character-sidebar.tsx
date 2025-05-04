
"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Wand2, Loader2, User, ScrollText, BarChartHorizontal, Brain, History, HeartPulse, Star, Dices, Shield, BookOpen, Swords, Zap, Sparkles, PlusCircle, Trash2, Save } from "lucide-react"; // Added Save icon
import { Separator } from "@/components/ui/separator";
import type { GenerateSceneImageInput, GenerateSceneImageOutput } from "@/ai/flows/generate-scene-image"; // Image generation types
import { useToast } from "@/hooks/use-toast";
import type { Character } from "@/types"; // Import shared Character type

// Define props for the CharacterSidebar
interface CharacterSidebarProps {
    characters: Character[];
    onCharacterUpdate: (updatedCharacter: Character) => void; // Callback to update parent state
    onSaveNewCharacter: (character: Character) => void; // Callback to save a new character globally
    generateImageAction: (input: GenerateSceneImageInput) => Promise<GenerateSceneImageOutput>; // For portraits
    rpgMode: boolean; // To show/hide RPG elements
    // isNew?: boolean; // Optional flag to identify characters not yet saved globally
}

export function CharacterSidebar({
    characters,
    onCharacterUpdate,
    onSaveNewCharacter,
    generateImageAction,
    rpgMode,
}: CharacterSidebarProps) {
  const [imageLoadingStates, setImageLoadingStates] = React.useState<Record<string, boolean>>({});
  const [isClient, setIsClient] = React.useState(false); // State to track client-side rendering
  const { toast } = useToast();

  // Set isClient to true only on the client-side after mount
  React.useEffect(() => {
    setIsClient(true);
  }, []);


  const handleGeneratePortrait = async (character: Character) => {
    if (imageLoadingStates[character.id]) return;

    setImageLoadingStates(prev => ({ ...prev, [character.id]: true }));

    try {
      // Create a prompt for the portrait based on character details
      const prompt = `Generate a portrait of ${character.name}. Description: ${character.details}. ${rpgMode ? `Class: ${character.characterClass || 'Unknown'}.` : ''}`; // Add class if RPG mode
      const result = await generateImageAction({ sceneDescription: prompt });

      // Update the specific character with the new portrait URL via callback
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

   // Handle direct edits to character fields (string, number, boolean)
   const handleFieldChange = (charId: string, field: keyof Character, value: string | number | boolean | null) => {
        const character = characters.find(c => c.id === charId);
        if (character) {
            // Basic type checking/conversion for numbers
            const numberFields: (keyof Character)[] = ['level', 'experience', 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'hitPoints', 'maxHitPoints', 'armorClass'];
            if (numberFields.includes(field) && typeof value === 'string') {
                const numValue = parseInt(value, 10);
                onCharacterUpdate({ ...character, [field]: isNaN(numValue) ? 0 : numValue }); // Default to 0 if parse fails
            } else {
                 onCharacterUpdate({ ...character, [field]: value });
            }
        }
   };

    // Handle nested field changes (stats, inventory, opinion, skills)
    const handleNestedFieldChange = (charId: string, field: 'stats' | 'inventory' | 'opinion' | 'skills', key: string, value: string | number | boolean) => {
        const character = characters.find(c => c.id === charId);
        if (character) {
             const currentFieldData = character[field] || {};
             // Ensure correct type for inventory/skills if they are numbers/booleans
             let finalValue = value;
             if ((field === 'inventory' || (field === 'skills' && typeof value === 'string'))) {
                 const numValue = parseInt(value as string, 10);
                 finalValue = isNaN(numValue) ? (field === 'inventory' ? 0 : value) : numValue; // Keep string for non-numeric skills
             }
             const updatedField = { ...currentFieldData, [key]: finalValue };
             onCharacterUpdate({ ...character, [field]: updatedField });
        }
    };

     const removeNestedField = (charId: string, field: 'stats' | 'inventory' | 'opinion' | 'skills', key: string) => {
        const character = characters.find(c => c.id === charId);
        if (character && character[field]) {
            const updatedField = { ...character[field] };
            delete updatedField[key];
            onCharacterUpdate({ ...character, [field]: updatedField });
        }
    };

    const addNestedField = (charId: string, field: 'stats' | 'inventory' | 'opinion' | 'skills') => {
        const key = prompt(`Entrez le nom du nouveau champ pour ${field} :`);
        if (key) {
            let valuePrompt = `Entrez la valeur pour ${key} :`;
            let defaultValue: string | number | boolean = '';
            if (field === 'inventory') {
                 valuePrompt = `Entrez la quantité pour ${key} :`;
                 defaultValue = 1;
            } else if (field === 'opinion') {
                 defaultValue = 'Neutre';
            } else if (field === 'skills') {
                 valuePrompt = `Entrez la valeur/bonus pour ${key} (ou laissez vide pour compétence acquise) :`;
                 defaultValue = true; // Default to boolean true (proficient)
            } else if (field === 'stats') {
                 valuePrompt = `Entrez la valeur pour la statistique ${key} :`;
                 defaultValue = 10;
            }

            const valueInput = prompt(valuePrompt);
            if (valueInput !== null) { // Check if prompt was cancelled
                 let value: string | number | boolean = valueInput.trim() === '' ? defaultValue : valueInput;
                 handleNestedFieldChange(charId, field, key, value);
            }
        }
    };

     // Handle changes to array fields (history, spells, techniques, passiveAbilities)
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


  // --- Sub-components for Readability ---

  const EditableField = ({ label, id, value, onChange, type = "text", placeholder, rows }: { label: string, id: string, value: string | number | undefined, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void, type?: string, placeholder?: string, rows?: number }) => (
      <div className="space-y-1">
            <Label htmlFor={id}>{label}</Label>
            {rows ? (
                <Textarea id={id} value={value ?? ""} onChange={onChange} placeholder={placeholder} rows={rows} className="text-sm bg-background border"/>
            ) : (
                <Input id={id} type={type} value={value ?? ""} onChange={onChange} placeholder={placeholder} className="h-8 text-sm bg-background border"/>
            )}
        </div>
  );

 const NestedEditableCard = ({ charId, field, title, icon: Icon, data, addLabel, valueType = "text" }: { charId: string, field: 'stats' | 'inventory' | 'opinion' | 'skills', title: string, icon: React.ElementType, data?: Record<string, string | number | boolean>, addLabel: string, valueType?: 'text' | 'number' | 'boolean' }) => (
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
                                 value={String(value)} // Input value must be string
                                 onChange={(e) => handleNestedFieldChange(charId, field, key, e.target.value)}
                                 className="h-8 text-sm flex-1"
                                 min={valueType === 'number' ? "0" : undefined}
                             />
                             <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeNestedField(charId, field, key)}>
                                 <Trash2 className="h-4 w-4" />
                             </Button>
                         </div>
                     ))
                 ) : (
                     <p className="text-muted-foreground italic text-sm">Aucun(e) {title.toLowerCase()} défini(e).</p>
                 )}
                 <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => addNestedField(charId, field)}>
                    <PlusCircle className="mr-1 h-4 w-4"/> {addLabel}
                 </Button>
             </CardContent>
         </Card>
     </div>
 );

 const ArrayEditableCard = ({ charId, field, title, icon: Icon, data, addLabel }: { charId: string, field: 'history' | 'spells' | 'techniques' | 'passiveAbilities', title: string, icon: React.ElementType, data?: string[], addLabel: string }) => (
     <div className="space-y-2">
         <Label className="flex items-center gap-1"><Icon className="h-4 w-4"/> {title}</Label>
         <Card className="bg-muted/30 border">
             <CardContent className="p-3 space-y-2">
                 {data && data.length > 0 ? (
                      <ScrollArea className="h-32"> {/* Make history scrollable */}
                        {data.map((item, index) => (
                            <div key={index} className="flex items-center gap-2 mb-1">
                                <Textarea // Use Textarea for history
                                    value={item}
                                    onChange={(e) => handleArrayFieldChange(charId, field, index, e.target.value)}
                                    className="text-sm flex-1 bg-background border"
                                    placeholder={`Entrée ${index + 1}`}
                                    rows={1} // Start with 1 row, auto-grow
                                />
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive self-start" onClick={() => removeArrayFieldItem(charId, field, index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                     </ScrollArea>
                 ) : (
                     <p className="text-muted-foreground italic text-sm">Aucun(e) {title.toLowerCase()} ajouté(e).</p>
                 )}
                  <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => addArrayFieldItem(charId, field)}>
                     <PlusCircle className="mr-1 h-4 w-4"/> {addLabel}
                 </Button>
             </CardContent>
         </Card>
     </div>
 );


  // The component now returns the Accordion directly, meant to be placed inside another container
  return (
    <div className="w-full"> {/* Added container div */}
        {characters.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Aucun personnage secondaire défini.</p>
        ) : (
            <Accordion type="multiple" className="w-full">
                {characters.map((char) => {
                    // Determine if this character might be considered "new"
                    // Only check localStorage on the client side
                    const isPotentiallyNew = isClient && !localStorage.getItem(`character_${char.name.toLowerCase()}`);

                    return (
                    <AccordionItem value={char.id} key={char.id}>
                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50"> {/* Adjusted hover */}
                            <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                     {imageLoadingStates[char.id] ? (
                                        <AvatarFallback><Loader2 className="h-4 w-4 animate-spin"/></AvatarFallback>
                                     ) : char.portraitUrl ? (
                                        <AvatarImage src={char.portraitUrl} alt={char.name} data-ai-hint={`${char.name} portrait`} />
                                     ) : (
                                        <AvatarFallback>{char.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                     )}
                                </Avatar>
                                <span className="font-medium">{char.name} {rpgMode && char.level ? `(Niv. ${char.level})` : ''}</span>
                                {/* Optional: Add a small badge/icon if 'isNew' or potentially new */}
                                {isPotentiallyNew && <Star className="h-3 w-3 text-yellow-500 ml-1" />}
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 space-y-4 bg-background"> {/* Ensure background for content */}
                           {/* Save New Character Button - Only render if potentially new and on client */}
                            {isClient && isPotentiallyNew && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="outline" size="sm" className="w-full mb-2" onClick={() => onSaveNewCharacter(char)}>
                                                <Save className="h-4 w-4 mr-1" /> Sauvegarder Globalement
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Sauvegarder ce personnage pour le réutiliser dans d'autres aventures.</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}

                           {/* Portrait Generation */}
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
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="outline" size="sm" onClick={() => handleGeneratePortrait(char)} disabled={imageLoadingStates[char.id]}>
                                                <Wand2 className="h-4 w-4 mr-1"/> Générer Portrait
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Générer un portrait avec l'IA basé sur la description.</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                           </div>

                            <Separator />

                            {/* Base Details (Editable) */}
                            <EditableField
                                label="Description"
                                id={`${char.id}-details`}
                                value={char.details}
                                onChange={(e) => handleFieldChange(char.id, 'details', e.target.value)}
                                rows={4}
                            />


                            {/* RPG Sections (Conditional & Editable) */}
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
                                     <EditableField label="Classe d'Armure (CA)" id={`${char.id}-ac`} type="number" value={char.armorClass} onChange={(e) => handleFieldChange(char.id, 'armorClass', e.target.value)} />

                                    <Separator />
                                    {/* D&D Stats */}
                                     <Label className="flex items-center gap-1"><Dices className="h-4 w-4"/> Caractéristiques</Label>
                                     <div className="grid grid-cols-3 gap-2">
                                        <EditableField label="FOR" id={`${char.id}-str`} type="number" value={char.strength} onChange={(e) => handleFieldChange(char.id, 'strength', e.target.value)} />
                                        <EditableField label="DEX" id={`${char.id}-dex`} type="number" value={char.dexterity} onChange={(e) => handleFieldChange(char.id, 'dexterity', e.target.value)} />
                                        <EditableField label="CON" id={`${char.id}-con`} type="number" value={char.constitution} onChange={(e) => handleFieldChange(char.id, 'constitution', e.target.value)} />
                                        <EditableField label="INT" id={`${char.id}-int`} type="number" value={char.intelligence} onChange={(e) => handleFieldChange(char.id, 'intelligence', e.target.value)} />
                                        <EditableField label="SAG" id={`${char.id}-wis`} type="number" value={char.wisdom} onChange={(e) => handleFieldChange(char.id, 'wisdom', e.target.value)} />
                                        <EditableField label="CHA" id={`${char.id}-cha`} type="number" value={char.charisma} onChange={(e) => handleFieldChange(char.id, 'charisma', e.target.value)} />
                                    </div>


                                    {/* General Stats (if needed beyond D&D) */}
                                    <NestedEditableCard charId={char.id} field="stats" title="Statistiques Diverses" icon={BarChartHorizontal} data={char.stats} addLabel="Ajouter Stat" />

                                    {/* Skills */}
                                    <NestedEditableCard charId={char.id} field="skills" title="Compétences" icon={Star} data={char.skills} addLabel="Ajouter Compétence" valueType="text"/> {/* Value can be boolean or number */}


                                    {/* Inventory */}
                                    <NestedEditableCard charId={char.id} field="inventory" title="Inventaire" icon={ScrollText} data={char.inventory} addLabel="Ajouter Objet" valueType="number"/>

                                     {/* Spells */}
                                    <ArrayEditableCard charId={char.id} field="spells" title="Sorts" icon={Zap} data={char.spells} addLabel="Ajouter Sort" />

                                     {/* Techniques */}
                                    <ArrayEditableCard charId={char.id} field="techniques" title="Techniques de Combat" icon={Swords} data={char.techniques} addLabel="Ajouter Technique" />

                                     {/* Passive Abilities */}
                                    <ArrayEditableCard charId={char.id} field="passiveAbilities" title="Capacités Passives" icon={Shield} data={char.passiveAbilities} addLabel="Ajouter Capacité" />

                                </>
                            )}

                            <Separator />

                            {/* History (Editable List) */}
                             <ArrayEditableCard charId={char.id} field="history" title="Historique Narratif" icon={History} data={char.history} addLabel="Ajouter Entrée Historique" />

                            {/* Opinion (Editable) */}
                            <NestedEditableCard charId={char.id} field="opinion" title="Opinions" icon={Brain} data={char.opinion} addLabel="Ajouter Opinion"/>

                        </AccordionContent>
                    </AccordionItem>
                    )
                })}
            </Accordion>
        )}
    </div>
  );
}
