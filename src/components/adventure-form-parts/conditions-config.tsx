
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
import { i18n, type Language } from "@/lib/i18n";
import type { AdventureFormValues } from "../adventure-form";
import { Switch } from "../ui/switch";

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).substring(2)}`;

interface ConditionsConfigProps {
    currentLanguage: Language;
}

export function ConditionsConfig({ currentLanguage }: ConditionsConfigProps) {
    const { control, watch } = useFormContext<AdventureFormValues>();
    const { fields, append, remove } = useFieldArray({
        control,
        name: "conditions"
    });
    
    const characters = watch("characters") || [];
    const lang = i18n[currentLanguage] || i18n.en;

    const addCondition = () => append({
        id: uid(),
        targetCharacterId: "",
        triggerType: 'relation',
        triggerOperator: 'greater_than',
        triggerValue: 50,
        triggerValueMax: undefined,
        effect: "",
        hasTriggered: false,
        isOneTime: true,
    });

    return (
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="conditions-config">
                <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5" /> {lang.scenarioConditionsTitle}
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 space-y-4">
                    {fields.map((field, index) => {
                        const triggerType = watch(`conditions.${index}.triggerType`);
                        const triggerOperator = watch(`conditions.${index}.triggerOperator`);

                        return (
                            <div key={field.id} className="p-4 border rounded-lg space-y-3 bg-muted/30 relative">
                                <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 text-destructive" onClick={() => remove(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <FormField
                                    control={control}
                                    name={`conditions.${index}.targetCharacterId`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{lang.targetCharacterLabel}</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder={lang.chooseCharacterPlaceholder} /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {characters.map(char => (
                                                        <SelectItem key={char.id!} value={char.id!}>{char.name} {char.isPlaceholder ? `(${lang.placeholderLabelShort})` : ''}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-3 gap-2 items-end">
                                     <FormField
                                        control={control}
                                        name={`conditions.${index}.triggerType`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{lang.triggerLabel}</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="relation">{lang.affinityTrigger}</SelectItem>
                                                        <SelectItem value="day">{lang.dayTrigger}</SelectItem>
                                                        <SelectItem value="end">{lang.endOfStoryTrigger}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                    {triggerType !== 'end' && (
                                        <>
                                            <FormField control={control} name={`conditions.${index}.triggerOperator`} render={({ field }) => (<FormItem><FormLabel>{lang.operatorLabel}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="greater_than">{lang.greaterThanOperator}</SelectItem><SelectItem value="less_than">{lang.lessThanOperator}</SelectItem><SelectItem value="between">{lang.betweenOperator}</SelectItem></SelectContent></Select></FormItem>)}/>
                                            <FormField control={control} name={`conditions.${index}.triggerValue`} render={({ field }) => (<FormItem><FormLabel>{triggerOperator === 'between' ? 'Min' : lang.valueLabel}</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} /></FormControl></FormItem>)}/>
                                            {triggerOperator === 'between' && (
                                                <FormField control={control} name={`conditions.${index}.triggerValueMax`} render={({ field }) => (<FormItem><FormLabel>Max</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} /></FormControl></FormItem>)}/>
                                            )}
                                        </>
                                    )}
                                </div>
                                <FormField
                                    control={control}
                                    name={`conditions.${index}.effect`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{lang.effectInstructionLabel}</FormLabel>
                                            <FormControl><Textarea {...field} placeholder={lang.effectInstructionPlaceholder} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name={`conditions.${index}.isOneTime`}
                                    render={({ field }) => (
                                        <FormItem className="flex items-center gap-2 space-y-0">
                                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                            <FormLabel className="text-xs">{lang.oneTimeTriggerLabel}</FormLabel>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )
                    })}
                     <Button type="button" variant="outline" size="sm" onClick={addCondition}>
                        <PlusCircle className="mr-2 h-4 w-4"/> {lang.addConditionButton}
                    </Button>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
