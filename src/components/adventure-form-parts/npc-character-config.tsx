
"use client";

import * as React from "react";
import { useFormContext, useFieldArray, type UseFieldArrayRemove } from "react-hook-form";
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
import { Users, PlusCircle, Trash2, UserCog, User } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { i18n, type Language } from "@/lib/i18n";
import type { FormCharacterDefinition } from "../adventure-form";


interface NpcCharacterConfigProps {
    fields: Record<"id", string>[];
    remove: UseFieldArrayRemove;
    onAddCharacter: (isPlaceholder: boolean) => void;
}

export function NpcCharacterConfig({ fields, remove, onAddCharacter }: NpcCharacterConfigProps) {
    const { control, watch } = useFormContext();
    const lang = 'fr'; // Or get from context
    const addCharacterTooltip = i18n[lang as Language]?.addCharacterTooltip || 'Ajouter un personnage';
    const addPlaceholderTooltip = i18n[lang as Language]?.addPlaceholderTooltip || 'Ajouter un emplacement de personnage';

    return (
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="npc-config">
                <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5" /> Personnages Secondaires (PNJ)
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 space-y-4">
                     {fields.map((field, index) => {
                        const isPlaceholder = watch(`characters.${index}.isPlaceholder`);
                        return (
                            <div key={field.id} className="p-4 border rounded-lg space-y-3 bg-muted/30 relative">
                                <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 text-destructive" onClick={() => remove(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <div className="flex items-center space-x-2">
                                     <FormField
                                        control={control}
                                        name={`characters.${index}.isPlaceholder`}
                                        render={({ field }) => (
                                            <FormItem className="flex items-center gap-2 space-y-0">
                                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                                <FormLabel className="text-xs">Emplacement ?</FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={control}
                                    name={`characters.${index}.name`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{isPlaceholder ? "Nom de l'emplacement" : "Nom du PNJ"}</FormLabel>
                                            <FormControl><Input {...field} placeholder={isPlaceholder ? "Ex: Le Guerrier, Le Marchand..." : "Ex: Roric, Elara..."} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {!isPlaceholder && (
                                    <FormField
                                        control={control}
                                        name={`characters.${index}.details`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Détails du PNJ</FormLabel>
                                                <FormControl><Textarea {...field} placeholder="Description, personnalité, rôle..." rows={3} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>
                        );
                    })}
                    <div className="flex gap-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button type="button" variant="outline" size="icon" onClick={() => onAddCharacter(false)}>
                                        <User className="h-4 w-4"/>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{addCharacterTooltip}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                     <Button type="button" variant="outline" size="icon" onClick={() => onAddCharacter(true)}>
                                        <UserCog className="h-4 w-4"/>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{addPlaceholderTooltip}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
