
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
import { i18n, type Language } from "@/lib/i18n";
import type { AdventureFormValues } from "../adventure-form";

interface TimeConfigProps {
    currentLanguage: Language;
}

export function TimeConfig({ currentLanguage }: TimeConfigProps) {
    const { control, watch, setValue, getValues } = useFormContext<AdventureFormValues>();
    const timeEnabled = watch("timeManagement.enabled");
    const lang = i18n[currentLanguage] || i18n.en;
    
    const defaultDayNamesString = i18n.en.dayNamesDefault;
    const frDayNamesString = i18n.fr.dayNamesDefault;

    React.useEffect(() => {
        const currentDayNames = getValues("timeManagement.dayNames");
        const currentDayNamesString = Array.isArray(currentDayNames) ? currentDayNames.join(', ') : '';
        
        const translatedDefault = lang.dayNamesDefault || defaultDayNamesString;

        // Update only if the current value is one of the default values (English or French) or empty
        if (!currentDayNamesString || currentDayNamesString === defaultDayNamesString || currentDayNamesString === frDayNamesString) {
            setValue("timeManagement.dayNames", translatedDefault.split(',').map(s => s.trim()), { shouldDirty: false });
        }
    }, [currentLanguage, lang.dayNamesDefault, setValue, getValues, defaultDayNamesString, frDayNamesString]);

    return (
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="time-config">
                <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5" /> {lang.timeManagementTitle}
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 space-y-4">
                     <FormField
                        control={control}
                        name="timeManagement.enabled"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                    <FormLabel>{lang.enableTimeManagementLabel}</FormLabel>
                                    <FormDescription>
                                        {lang.enableTimeManagementDescription}
                                    </FormDescription>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )}
                    />
                    {timeEnabled && (
                        <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
                            <FormField control={control} name="timeManagement.day" render={({ field }) => (<FormItem><FormLabel>{lang.startDayLabel}</FormLabel><FormControl><Input type="number" min="1" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={control} name="timeManagement.currentTime" render={({ field }) => (<FormItem><FormLabel>{lang.startTimeLabel}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={control} name="timeManagement.timeElapsedPerTurn" render={({ field }) => (<FormItem><FormLabel>{lang.timePerTurnLabel}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField 
                                control={control} 
                                name="timeManagement.dayNames" 
                                render={({ field }) => {
                                    // Ensure value is a string for the input
                                    const valueAsString = Array.isArray(field.value) ? field.value.join(', ') : (field.value || '');
                                    return (
                                        <FormItem>
                                            <FormLabel>{lang.dayNamesLabel}</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    {...field} 
                                                    onChange={e => field.onChange(e.target.value.split(',').map(s => s.trim()))} 
                                                    value={valueAsString}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    );
                                }}
                            />
                            <FormField control={control} name="timeManagement.timeFormat" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{lang.timeFormatLabel}</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="24h">{lang.timeFormat24h}</SelectItem>
                                            <SelectItem value="12h">{lang.timeFormat12h}</SelectItem>
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
