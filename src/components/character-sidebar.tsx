
"use client";

import * as React from "react";
import Image from "next/image";
// Removed Sidebar imports as this is now content within another sidebar/accordion
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Wand2, Loader2, User, ScrollText, BarChartHorizontal, Brain, History, HeartPulse } from "lucide-react"; // Added HeartPulse for HP
import { Separator } from "@/components/ui/separator";
import type { GenerateSceneImageInput, GenerateSceneImageOutput } from "@/ai/flows/generate-scene-image"; // Image generation types
import { useToast } from "@/hooks/use-toast";

// Define Character type (should match the one in page.tsx or a shared type file)
interface Character {
  id: string;
  name: string;
  details: string;
  stats?: Record<string, number | string>;
  inventory?: Record<string, number>;
  history?: string[];
  opinion?: Record<string, string>;
  portraitUrl?: string | null;
}

// Define props for the CharacterSidebar
interface CharacterSidebarProps {
    characters: Character[];
    onCharacterUpdate: (updatedCharacter: Character) => void; // Callback to update parent state
    generateImageAction: (input: GenerateSceneImageInput) => Promise<GenerateSceneImageOutput>; // For portraits
    rpgMode: boolean; // To show/hide RPG elements
}

export function CharacterSidebar({
    characters,
    onCharacterUpdate,
    generateImageAction,
    rpgMode,
}: CharacterSidebarProps) {
  const [imageLoadingStates, setImageLoadingStates] = React.useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const handleGeneratePortrait = async (character: Character) => {
    if (imageLoadingStates[character.id]) return;

    setImageLoadingStates(prev => ({ ...prev, [character.id]: true }));

    try {
      // Create a prompt for the portrait based on character details
      const prompt = `Generate a portrait of ${character.name}. Description: ${character.details}`;
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

   // Handle direct edits to character fields (e.g., manually setting stats)
   const handleFieldChange = (charId: string, field: keyof Character, value: any) => {
        const character = characters.find(c => c.id === charId);
        if (character) {
            onCharacterUpdate({ ...character, [field]: value });
        }
   };

    // Handle nested field changes (stats, inventory, opinion)
    const handleNestedFieldChange = (charId: string, field: 'stats' | 'inventory' | 'opinion', key: string, value: string | number) => {
        const character = characters.find(c => c.id === charId);
        if (character && character[field]) {
            const updatedField = { ...character[field], [key]: value };
            onCharacterUpdate({ ...character, [field]: updatedField });
        } else if (character) {
             // Initialize field if it doesn't exist
             onCharacterUpdate({ ...character, [field]: { [key]: value } });
        }
    };

     const removeNestedField = (charId: string, field: 'stats' | 'inventory' | 'opinion', key: string) => {
        const character = characters.find(c => c.id === charId);
        if (character && character[field]) {
            const updatedField = { ...character[field] };
            delete updatedField[key];
            onCharacterUpdate({ ...character, [field]: updatedField });
        }
    };

    const addNestedField = (charId: string, field: 'stats' | 'inventory' | 'opinion') => {
        // Simple prompt for now, could use a dialog later
        const key = prompt(`Entrez le nom du nouveau champ pour ${field} :`);
        if (key) {
            const value = field === 'opinion' ? prompt(`Entrez la valeur pour ${key} :`) : (field === 'inventory' ? parseInt(prompt(`Entrez la quantité pour ${key} :`) || '1', 10) : prompt(`Entrez la valeur pour ${key} :`));
            if (value !== null) { // Check if prompt was cancelled
                handleNestedFieldChange(charId, field, key, value);
            }
        }
    };


  // The component now returns the Accordion directly, meant to be placed inside another container
  return (
    <div className="w-full"> {/* Added container div */}
        {characters.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Aucun personnage secondaire défini.</p>
        ) : (
            <Accordion type="multiple" className="w-full">
                {characters.map((char) => (
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
                                <span className="font-medium">{char.name}</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 space-y-4 bg-background"> {/* Ensure background for content */}
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
                            <div>
                                <Label htmlFor={`${char.id}-details`}>Description</Label>
                                <Textarea
                                    id={`${char.id}-details`}
                                    value={char.details}
                                    onChange={(e) => handleFieldChange(char.id, 'details', e.target.value)}
                                    rows={4}
                                    className="mt-1 text-sm bg-background border" // Use background, add border
                                />
                            </div>

                            {/* RPG Sections (Conditional & Editable) */}
                            {rpgMode && (
                                <>
                                    <Separator />
                                    {/* Stats */}
                                    <div className="space-y-2">
                                         <Label className="flex items-center gap-1"><BarChartHorizontal className="h-4 w-4"/> Statistiques</Label>
                                        <Card className="bg-muted/30 border">
                                            <CardContent className="p-3 space-y-2">
                                                {char.stats && Object.keys(char.stats).length > 0 ? (
                                                    Object.entries(char.stats).map(([key, value]) => (
                                                        <div key={key} className="flex items-center gap-2">
                                                            <Label htmlFor={`${char.id}-stat-${key}`} className="w-1/3 capitalize truncate">{key}</Label>
                                                            <Input
                                                                id={`${char.id}-stat-${key}`}
                                                                value={value}
                                                                onChange={(e) => handleNestedFieldChange(char.id, 'stats', key, e.target.value)} // Allow string input for flexibility (e.g., Class)
                                                                className="h-8 text-sm flex-1"
                                                            />
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeNestedField(char.id, 'stats', key)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-muted-foreground italic text-sm">Aucune statistique définie.</p>
                                                )}
                                                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => addNestedField(char.id, 'stats')}>Ajouter Stat</Button>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Inventory */}
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-1"><ScrollText className="h-4 w-4"/> Inventaire</Label>
                                        <Card className="bg-muted/30 border">
                                            <CardContent className="p-3 space-y-2">
                                                {char.inventory && Object.keys(char.inventory).length > 0 ? (
                                                     Object.entries(char.inventory).map(([key, value]) => (
                                                        <div key={key} className="flex items-center gap-2">
                                                            <Label htmlFor={`${char.id}-inv-${key}`} className="w-1/3 capitalize truncate">{key}</Label>
                                                             <Input
                                                                id={`${char.id}-inv-${key}`}
                                                                type="number"
                                                                value={value}
                                                                onChange={(e) => handleNestedFieldChange(char.id, 'inventory', key, parseInt(e.target.value, 10) || 0)}
                                                                className="h-8 text-sm flex-1"
                                                                min="0"
                                                            />
                                                             <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeNestedField(char.id, 'inventory', key)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ))
                                                ) : (
                                                     <p className="text-muted-foreground italic text-sm">Inventaire vide.</p>
                                                )}
                                                 <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => addNestedField(char.id, 'inventory')}>Ajouter Objet</Button>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </>
                            )}

                            <Separator />

                            {/* History (Read-only for now, populated by AI/narrative analysis) */}
                            <div className="space-y-1">
                                <Label className="flex items-center gap-1"><History className="h-4 w-4"/> Historique (Géré par l'IA)</Label>
                                <ScrollArea className="h-24 w-full rounded-md border bg-muted p-2">
                                    {char.history && char.history.length > 0 ? (
                                        char.history.map((entry, index) => (
                                            <p key={index} className="text-xs text-muted-foreground mb-1 leading-tight">{`- ${entry}`}</p>
                                        ))
                                    ) : (
                                         <p className="text-xs text-muted-foreground italic">Aucun historique enregistré.</p>
                                    )}
                                </ScrollArea>
                            </div>

                            {/* Opinion (Editable) */}
                             <div className="space-y-2">
                                <Label className="flex items-center gap-1"><Brain className="h-4 w-4"/> Opinions</Label>
                                <Card className="bg-muted/30 border">
                                    <CardContent className="p-3 space-y-2">
                                        {char.opinion && Object.keys(char.opinion).length > 0 ? (
                                             Object.entries(char.opinion).map(([key, value]) => (
                                                <div key={key} className="flex items-center gap-2">
                                                    <Label htmlFor={`${char.id}-op-${key}`} className="w-1/3 capitalize truncate">{key}</Label>
                                                    <Input
                                                        id={`${char.id}-op-${key}`}
                                                        value={value}
                                                        onChange={(e) => handleNestedFieldChange(char.id, 'opinion', key, e.target.value)}
                                                        className="h-8 text-sm flex-1"
                                                        placeholder="Neutre, Amical, Hostile..."
                                                    />
                                                     <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeNestedField(char.id, 'opinion', key)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))
                                        ) : (
                                             <p className="text-muted-foreground italic text-sm">Aucune opinion enregistrée.</p>
                                        )}
                                        <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => addNestedField(char.id, 'opinion')}>Ajouter Opinion</Button>
                                    </CardContent>
                                </Card>
                             </div>

                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        )}
    </div>
  );
}

    