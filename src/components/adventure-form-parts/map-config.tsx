
"use client";

import * as React from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Map, PlusCircle, Trash2 } from "lucide-react";

import type { AdventureFormValues } from "../adventure-form";
import type { Character } from "@/types";

export function MapConfig() {
    const { control, watch } = useFormContext<AdventureFormValues>();
    const { fields, append, remove } = useFieldArray({
        control,
        name: "mapPointsOfInterest"
    });
    const characters: Character[] = watch('characters') || [];

    return (
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="map-config">
                <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <Map className="h-5 w-5" /> Configuration de la Carte et des Lieux
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 space-y-4">
                    {fields.map((field, index) => (
                        <div key={field.id} className="p-4 border rounded-lg space-y-3 bg-muted/30 relative">
                            <FormField
                                control={control}
                                name={`mapPointsOfInterest.${index}.name`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nom du Lieu</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name={`mapPointsOfInterest.${index}.description`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl><Textarea {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={control}
                                    name={`mapPointsOfInterest.${index}.icon`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Type d'icône</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Village">Village</SelectItem>
                                                    <SelectItem value="Castle">Château</SelectItem>
                                                    <SelectItem value="Trees">Forêt</SelectItem>
                                                    <SelectItem value="Mountain">Montagne</SelectItem>
                                                    <SelectItem value="Shield">Mine / Donjon</SelectItem>
                                                    <SelectItem value="Landmark">Monument</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name={`mapPointsOfInterest.${index}.ownerId`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Propriétaire</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="player">Joueur</SelectItem>
                                                    {characters.map(char => (
                                                        char.id && <SelectItem key={char.id} value={char.id}>{char.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 text-destructive" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => append({ name: "", description: "", icon: 'Village', ownerId: 'player' })}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un Point d'Intérêt
                    </Button>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
