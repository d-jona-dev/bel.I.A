
"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
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
    FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { AdventureFormValues } from "../adventure-form";

export function TimeConfig() {
    const { control, watch } = useFormContext<AdventureFormValues>();
    const timeEnabled = watch("timeManagement.enabled");

    return (
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="time-config">
                <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5" /> Gestion du Temps
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 space-y-4">
                     <FormField
                        control={control}
                        name="timeManagement.enabled"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                    <FormLabel>Activer la gestion du temps</FormLabel>
                                    <FormDescription>
                                        L'IA fera avancer le temps à chaque tour.
                                    </FormDescription>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )}
                    />
                    {timeEnabled && (
                        <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
                            <FormField control={control} name="timeManagement.day" render={({ field }) => (<FormItem><FormLabel>Jour de départ</FormLabel><FormControl><Input type="number" min="1" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={control} name="timeManagement.currentTime" render={({ field }) => (<FormItem><FormLabel>Heure de départ (HH:MM)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={control} name="timeManagement.timeElapsedPerTurn" render={({ field }) => (<FormItem><FormLabel>Temps par tour (HH:MM)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={control} name="timeManagement.dayNames" render={({ field }) => (<FormItem><FormLabel>Noms des jours (séparés par virgule)</FormLabel><FormControl><Input {...field} onChange={e => field.onChange(e.target.value.split(',').map(s => s.trim()))} value={(field.value || []).join(', ')}/></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={control} name="timeManagement.timeFormat" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Format de l'heure</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="24h">24 Heures</SelectItem>
                                            <SelectItem value="12h">12 Heures (AM/PM)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}/>
                        </div>
                    )}
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
