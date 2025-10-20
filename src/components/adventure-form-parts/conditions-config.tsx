
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
import { Zap, PlusCircle, Trash2 } from "lucide-react";

import type { AdventureFormValues } from "../adventure-form";

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).substring(2)}`;

export function ConditionsConfig() {
    const { control, watch } = useFormContext<AdventureFormValues>();
    const { fields, append, remove } = useFieldArray({
        control,
        name: "conditions"
    });
    
    const characters = watch("characters") || [];

    const addCondition = () => append({
        id: uid(),
        targetCharacterId: "",
        triggerType: 'relation',
        triggerOperator: 'greater_than',
        triggerValue: 50,
        effect: "",
        hasTriggered: false
    });

    return (
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="conditions-config">
                <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5" /> Conditions de Scénario
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 space-y-4">
                    {fields.map((field, index) => {
                        const triggerType = watch(`conditions.${index}.triggerType`);

                        return (
                            <div key={field.id} className="p-4 border rounded-lg space-y-3 bg-muted/30 relative">
                                <FormField
                                    control={control}
                                    name={`conditions.${index}.targetCharacterId`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Personnage Cible</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Choisir un personnage..." /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {characters.map(char => (
                                                        <SelectItem key={char.id!} value={char.id!}>{char.name} {char.isPlaceholder ? '(Emplacement)' : ''}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-3 gap-2">
                                     <FormField
                                        control={control}
                                        name={`conditions.${index}.triggerType`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Déclencheur</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="relation">Affinité</SelectItem>
                                                        <SelectItem value="day">Jour</SelectItem>
                                                        <SelectItem value="end">Fin de l'histoire</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                    {triggerType !== 'end' && (
                                        <>
                                            <FormField control={control} name={`conditions.${index}.triggerOperator`} render={({ field }) => (<FormItem><FormLabel>Opérateur</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="greater_than">Supérieur à</SelectItem><SelectItem value="less_than">Inférieur à</SelectItem></SelectContent></Select></FormItem>)}/>
                                            <FormField control={control} name={`conditions.${index}.triggerValue`} render={({ field }) => (<FormItem><FormLabel>Valeur</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} /></FormControl></FormItem>)}/>
                                        </>
                                    )}
                                </div>
                                <FormField
                                    control={control}
                                    name={`conditions.${index}.effect`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Effet (Instruction pour l'IA)</FormLabel>
                                            <FormControl><Textarea {...field} placeholder="Ex: Lyra devient plus méfiante envers le joueur." /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 text-destructive" onClick={() => remove(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        )
                    })}
                     <Button type="button" variant="outline" size="sm" onClick={addCondition}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Ajouter une Condition
                    </Button>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
