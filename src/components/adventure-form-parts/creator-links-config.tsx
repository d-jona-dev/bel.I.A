
"use client";

import * as React from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, PlusCircle, Trash2 } from "lucide-react";
import { i18n, type Language } from "@/lib/i18n";
import type { AdventureFormValues } from "../adventure-form";
import type { CreatorLinkPlatform } from "@/types";

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).substring(2)}`;

const availablePlatforms: CreatorLinkPlatform[] = ['youtube', 'x', 'facebook', 'patreon', 'ko-fi', 'tipeee', 'instagram', 'threads', 'tiktok', 'bsky', 'linkedin', 'reddit', 'pinterest', 'mastodon', 'buymeacoffee', 'liberapay', 'itch', 'substack'];

interface CreatorLinksConfigProps {
    currentLanguage: Language;
}

export function CreatorLinksConfig({ currentLanguage }: CreatorLinksConfigProps) {
    const { control } = useFormContext<AdventureFormValues>();
    const { fields, append, remove } = useFieldArray({
        control,
        name: "creatorLinks"
    });
    
    const lang = i18n[currentLanguage] || i18n.en;

    const addLink = () => {
        if (fields.length < 3) {
            append({
                id: uid(),
                platform: 'youtube',
                identifier: ''
            });
        }
    };

    return (
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="creator-links-config">
                <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <Link className="h-5 w-5" /> {lang.creatorLinksTitle}
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 space-y-4">
                    <p className="text-sm text-muted-foreground">{lang.creatorLinksDescription}</p>
                    {fields.map((field, index) => (
                        <div key={field.id} className="flex items-end gap-2">
                            <FormField
                                control={control}
                                name={`creatorLinks.${index}.platform`}
                                render={({ field }) => (
                                    <FormItem className="w-1/3">
                                        <FormLabel>{lang.platformLabel}</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {availablePlatforms.map(platform => (
                                                    <SelectItem key={platform} value={platform}>
                                                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name={`creatorLinks.${index}.identifier`}
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>{lang.identifierLabel}</FormLabel>
                                        <FormControl><Input {...field} placeholder={lang.identifierPlaceholder} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    {fields.length < 3 && (
                        <Button type="button" variant="outline" size="sm" onClick={addLink}>
                            <PlusCircle className="mr-2 h-4 w-4"/> {lang.addLinkButton}
                        </Button>
                    )}
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
