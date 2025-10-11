
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
    FormDescription,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Clapperboard, Gamepad2, Heart, Link as LinkIcon, Map } from "lucide-react";

import type { AdventureFormValues } from "../adventure-form";

export function GameModesConfig() {
    const { control, watch } = useFormContext<AdventureFormValues>();
    const rpgMode = watch("rpgMode");

    return (
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="game-modes-config">
                <AccordionTrigger>Configuration des Modes de Jeu</AccordionTrigger>
                <AccordionContent className="pt-2 space-y-4">
                    <FormField control={control} name="rpgMode" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel className="flex items-center gap-2"><Gamepad2 className="h-4 w-4"/> Mode Jeu de Rôle (RPG)</FormLabel>
                                <FormDescription>Active les statistiques, le combat, l'inventaire et l'expérience.</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}/>
                    <FormField control={control} name="relationsMode" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel className="flex items-center gap-2"><Heart className="h-4 w-4"/> Mode Relations</FormLabel>
                                <FormDescription>Active la gestion de l'affinité et des relations entre personnages.</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}/>
                     <FormField control={control} name="strategyMode" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel className="flex items-center gap-2"><Map className="h-4 w-4"/> Mode Stratégie</FormLabel>
                                <FormDescription>Active la gestion de la carte, des territoires et des ressources.</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}/>
                    <FormField control={control} name="comicModeActive" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel className="flex items-center gap-2"><Clapperboard className="h-4 w-4"/> Mode Bande Dessinée</FormLabel>
                                <FormDescription>Structure la narration de l'IA avec des dialogues ("...") et des pensées (*...*).</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}/>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
