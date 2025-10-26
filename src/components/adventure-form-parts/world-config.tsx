

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
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Globe } from "lucide-react";

import type { AdventureFormValues } from "../adventure-form";
import { i18n, type Language } from "@/lib/i18n";


export function WorldConfig() {
    const { control, watch } = useFormContext<AdventureFormValues>();
    const currentLanguage = watch('currentLanguage') || 'fr';
    const lang = i18n[currentLanguage as Language] || i18n.en;

    return (
        <Accordion type="single" collapsible className="w-full" defaultValue="world-config">
            <AccordionItem value="world-config">
                <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5" /> {lang.worldConfigTitle}
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 space-y-4">
                    <FormField
                        control={control}
                        name="world.fr"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{lang.worldDescriptionLabel}</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Décrivez l'univers, son histoire, ses factions, sa magie..."
                                        className="resize-y"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}

    

    