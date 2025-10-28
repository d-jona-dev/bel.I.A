
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
import { Dices, Clapperboard, HeartHandshake } from "lucide-react";
import { i18n, type Language } from "@/lib/i18n";


interface GameModesConfigProps {
    currentLanguage: Language;
}

export function GameModesConfig({ currentLanguage }: GameModesConfigProps) {
    const { control } = useFormContext();
    const lang = i18n[currentLanguage] || i18n.en;

    return (
         <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="game-modes-config">
                <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <Dices className="h-5 w-5" /> {lang.gameModesTitle}
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 space-y-4">
                     <FormField
                        control={control}
                        name="relationsMode"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                    <FormLabel className="flex items-center gap-2"><HeartHandshake className="h-4 w-4"/>{lang.relationsModeLabel}</FormLabel>
                                    <FormDescription>
                                        {lang.relationsModeDescription}
                                    </FormDescription>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name="comicModeActive"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                    <FormLabel className="flex items-center gap-2"><Clapperboard className="h-4 w-4"/>{lang.comicModeLabel}</FormLabel>
                                    <FormDescription>
                                        {lang.comicModeDescription}
                                    </FormDescription>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )}
                    />
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}

