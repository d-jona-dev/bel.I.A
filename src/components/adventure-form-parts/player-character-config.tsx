
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { User, Dices } from "lucide-react";
import type { AdventureFormValues } from "../adventure-form";
import { i18n, type Language } from "@/lib/i18n";


export function PlayerCharacterConfig({ currentLanguage }: { currentLanguage: Language }) {
    const { control } = useFormContext<AdventureFormValues>();
    const lang = i18n[currentLanguage];

    return (
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="player-config">
                <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <User className="h-5 w-5" /> {lang.playerCharacterTitle}
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 space-y-4">
                    <FormField
                        control={control}
                        name="playerName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{lang.playerNameLabel}</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name="playerDetails"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{lang.playerDetailsLabel}</FormLabel>
                                <FormControl><Textarea {...field} placeholder={lang.playerDetailsPlaceholder} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name="playerDescription"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{lang.playerBackgroundLabel}</FormLabel>
                                <FormControl><Textarea {...field} placeholder={lang.playerBackgroundPlaceholder} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={control}
                        name="playerOrientation"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{lang.playerOrientation}</FormLabel>
                                <FormControl><Input {...field} placeholder={lang.playerOrientationPlaceholder} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}

