
"use client";

import * as React from "react";
import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Users, PlusCircle, Trash2, Link as LinkIcon, Palette } from "lucide-react";

import type { AdventureFormValues } from "../adventure-form";
import { i18n, type Language } from "@/lib/i18n";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";


interface NpcCharacterConfigProps {
    relationsMode: boolean;
}

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).substring(2)}`;

export function NpcCharacterConfig({ relationsMode }: NpcCharacterConfigProps) {
    const { control, watch } = useFormContext<AdventureFormValues>();
    const { fields, append, remove } = useFieldArray({
        control,
        name: "characters"
    });
    const currentLanguage = watch("currentLanguage", "fr");
    const playerName = watch("playerName", "Héros");

    const addCharacter = () => append({ id: uid(), name: "", details: "" });
    const addPlaceholder = () => append({ id: uid(), name: "", details: "placeholder", isPlaceholder: true });

    return (
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="npc-character-config">
                <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5" /> Personnages Secondaires (PNJ)
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 space-y-4">
                    {fields.map((field, index) => (
                        <div key={field.id} className="p-4 border rounded-lg space-y-3 bg-muted/30 relative">
                            <FormField
                                control={control}
                                name={`characters.${index}.isPlaceholder`}
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>
                                                Est un Emplacement de Personnage ?
                                            </FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name={`characters.${index}.name`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{watch(`characters.${index}.isPlaceholder`) ? "Rôle/Nom de l'Emplacement" : "Nom du Personnage"}</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {!watch(`characters.${index}.isPlaceholder`) && (
                                <>
                                    <FormField control={control} name={`characters.${index}.details`} render={({ field }) => (<FormItem><FormLabel>Détails</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem>)}/>
                                    <FormField control={control} name={`characters.${index}.portraitUrl`} render={({ field }) => (<FormItem><FormLabel>URL du Portrait</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)}/>
                                    
                                    {relationsMode && (
                                        <Card>
                                            <CardContent className="p-3">
                                                 <Label className="flex items-center gap-1 mb-2"><LinkIcon className="h-4 w-4"/> Relation avec {playerName}</Label>
                                                 <FormField
                                                    control={control}
                                                    name={`characters.${index}.relations.player`}
                                                    defaultValue="Inconnu"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl><Input {...field} value={field.value || 'Inconnu'}/></FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            </CardContent>
                                        </Card>
                                    )}
                                </>
                            )}
                            <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 text-destructive" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                     <div className="flex gap-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button type="button" variant="outline" size="sm" onClick={addCharacter}>
                                        <PlusCircle className="h-4 w-4"/>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{i18n[currentLanguage as Language]?.addCharacterTooltip || 'Ajouter un personnage'}</p>
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button type="button" variant="secondary" size="sm" onClick={addPlaceholder}>
                                        <PlusCircle className="h-4 w-4"/> Emplacement
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                     <p>{i18n[currentLanguage as Language]?.addPlaceholderTooltip || 'Ajouter un emplacement de personnage'}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
