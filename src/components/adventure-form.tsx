

"use client";

import * as React from "react";
import { useForm, FormProvider, useFieldArray, type UseFieldArrayAppend } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import type { AdventureSettings, AiConfig, LocalizedText, AdventureCondition } from '@/types';
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, User, UserPlus } from "lucide-react";

import { PlayerCharacterConfig } from './adventure-form-parts/player-character-config';
import { NpcCharacterConfig } from './adventure-form-parts/npc-character-config';
import { TimeConfig } from './adventure-form-parts/time-config';
import { GameModesConfig } from './adventure-form-parts/game-modes-config';
import { WorldConfig } from './adventure-form-parts/world-config';
import { ConditionsConfig } from "./adventure-form-parts/conditions-config";
import { i18n, type Language } from "@/lib/i18n";
import { Textarea } from "./ui/textarea";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Rocket } from "lucide-react";


// Schemas are kept here as they define the shape for the entire form,
// which is still managed by this parent component.

export type FormCharacterDefinition = {
  id?: string;
  name: string;
  details: string;
  portraitUrl?: string | null;
  appearanceDescription?: string;
  isPlaceholder?: boolean;
  factionColor?: string;
  affinity?: number;
  relations?: Record<string, string>;
  roleInStory?: string;
};

export type AdventureFormValues = Partial<Omit<AdventureSettings, 'characters' | 'world' | 'initialSituation'>> & {
    world: LocalizedText;
    initialSituation: LocalizedText;
    characters: FormCharacterDefinition[];
    conditions?: AdventureCondition[]; // NOUVEAU
};

export interface AdventureFormHandle {
    getFormData: () => Promise<AdventureFormValues | null>;
    getValues: (name?: keyof AdventureFormValues | (keyof AdventureFormValues)[]) => any;
    setValue: (name: any, value: any, options?: { shouldValidate?: boolean, shouldDirty?: boolean }) => void;
    append: UseFieldArrayAppend<AdventureFormValues, "characters">;
    reset: (values: Partial<AdventureFormValues>) => void;
}

interface AdventureFormProps {
    initialValues: AdventureFormValues;
    onFormValidityChange?: (isValid: boolean) => void;
    rpgMode: boolean;
    relationsMode: boolean;
    strategyMode: boolean;
    aiConfig?: AiConfig;
    isLiveAdventure?: boolean;
    adventureSettings?: AdventureSettings; // Make this optional
    currentLanguage?: Language;
}

const characterSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  details: z.string(),
  isPlaceholder: z.boolean().optional(),
  portraitUrl: z.string().url().or(z.literal("")).optional().nullable(),
  appearanceDescription: z.string().optional(),
  factionColor: z.string().optional(),
  affinity: z.number().min(0).max(100).optional(),
  relations: z.record(z.string()).optional(),
  roleInStory: z.string().optional(),
}).refine(data => {
    if (data.isPlaceholder) return !!data.name;
    if (data.name || data.details) return !!(data.name && data.details);
    return true;
}, {
    message: "Le nom et les détails sont tous deux requis pour définir un personnage complet.",
    path: ['name'],
});

const mapPointOfInterestSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Le nom est requis"),
    description: z.string().optional(),
    icon: z.enum(['Castle', 'Mountain', 'Trees', 'Village', 'Shield', 'Landmark']),
    ownerId: z.string().optional(),
    level: z.number().optional(),
    buildings: z.array(z.string()).optional(),
    defenderUnitIds: z.array(z.string()).optional(),
});

const timeManagementSchema = z.object({
    enabled: z.boolean().default(false),
    day: z.number().int().min(1).default(1),
    dayName: z.string().default("Lundi"),
    dayNames: z.array(z.string()).min(1).default(["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]),
    currentTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format HH:MM (24h) requis").default("12:00"),
    timeFormat: z.enum(['24h', '12h']).default('24h'),
    currentEvent: z.string().optional().default(""),
    timeElapsedPerTurn: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format HH:MM requis").default("00:15"),
}).optional();

// NOUVEAU: Schéma pour les conditions
const adventureConditionSchema = z.object({
    id: z.string(),
    targetCharacterId: z.string().min(1, "Un personnage cible est requis."),
    triggerType: z.enum(['relation', 'day', 'end']),
    triggerOperator: z.enum(['greater_than', 'less_than']).optional(),
    triggerValue: z.number().optional(),
    effect: z.string().min(1, "L'effet de la condition est requis."),
    hasTriggered: z.boolean().default(false),
}).refine(data => {
    if (data.triggerType !== 'end') {
        return data.triggerOperator !== undefined && data.triggerValue !== undefined;
    }
    return true;
}, {
    message: "L'opérateur et la valeur sont requis pour ce type de déclencheur.",
    path: ["triggerValue"],
});


const adventureFormSchema = z.object({
  world: z.record(z.string()).refine(val => Object.keys(val).length > 0 && Object.values(val).some(v => v.trim() !== ''), { message: "La description du monde est requise dans au moins une langue."}),
  initialSituation: z.record(z.string()).refine(val => Object.keys(val).length > 0 && Object.values(val).some(v => v.trim() !== ''), { message: "La situation initiale est requise dans au moins une langue."}),
  characters: z.array(characterSchema).optional(),
  rpgMode: z.boolean().default(true).optional(),
  relationsMode: z.boolean().default(true).optional(),
  strategyMode: z.boolean().default(true).optional(),
  comicModeActive: z.boolean().default(false).optional(),
  playerName: z.string().optional().default("Player").describe("Le nom du personnage joueur."),
  playerPortraitUrl: z.string().url().optional().or(z.literal("")).nullable(),
  playerAppearanceDescription: z.string().optional(),
  playerDetails: z.string().optional(),
  playerDescription: z.string().optional(),
  playerOrientation: z.string().optional(),
  playerClass: z.string().optional().default("Aventurier").describe("Classe du joueur."),
  playerLevel: z.number().int().min(1).optional().default(1).describe("Niveau initial du joueur."),
  mapPointsOfInterest: z.array(mapPointOfInterestSchema).optional(),
  timeManagement: timeManagementSchema.optional(),
  conditions: z.array(adventureConditionSchema).optional(),
});

export const AdventureForm = React.forwardRef<AdventureFormHandle, AdventureFormProps>(
    ({ initialValues, onFormValidityChange, rpgMode, relationsMode, strategyMode, aiConfig, isLiveAdventure = false, adventureSettings, currentLanguage = 'fr' }, ref) => {
    
    const { toast } = useToast();

    const form = useForm<AdventureFormValues>({
        resolver: zodResolver(adventureFormSchema),
        defaultValues: initialValues,
        mode: "onChange",
    });

    const { append, fields, remove, update } = useFieldArray({
        control: form.control,
        name: "characters",
    });
    
    React.useImperativeHandle(ref, () => ({
        getFormData: async () => {
            const isValid = await form.trigger();
            if (isValid) {
                return form.getValues();
            }
            toast({
                title: "Erreur de validation",
                description: "Veuillez corriger les erreurs dans le formulaire.",
                variant: "destructive",
            });
            return null;
        },
        getValues: form.getValues,
        setValue: form.setValue,
        append: append,
        reset: (values) => form.reset(values),
    }));

    React.useEffect(() => {
        if (onFormValidityChange) {
            const subscription = form.watch(() => {
                onFormValidityChange(form.formState.isValid);
            });
            return () => subscription.unsubscribe();
        }
    }, [form, onFormValidityChange]);
    
    const handleAddCharacter = (isPlaceholder = false) => {
        const lang = i18n[currentLanguage as Language] || i18n.en;
        const addCharacterTooltip = lang.addCharacterTooltip;
        const addPlaceholderTooltip = lang.addPlaceholderTooltip;

        append({
            id: `char-new-${Date.now()}`,
            name: isPlaceholder ? 'Emplacement PNJ' : '',
            details: '',
            isPlaceholder: isPlaceholder,
            affinity: 50,
            relations: { player: 'Inconnu' }
        });
         toast({ title: isPlaceholder ? addPlaceholderTooltip : addCharacterTooltip });
    };

    return (
        <FormProvider {...form}>
            <form className="space-y-4 p-1" onSubmit={(e) => e.preventDefault()}>
                <div className="space-y-4">
                    <WorldConfig currentLanguage={currentLanguage} />
                    
                    {!isLiveAdventure && (
                         <Accordion type="single" collapsible className="w-full" defaultValue="initial-situation-config">
                            <AccordionItem value="initial-situation-config">
                                <AccordionTrigger>
                                    <div className="flex items-center gap-2">
                                        <Rocket className="h-5 w-5" /> Situation de Départ
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-2 space-y-4">
                                     <FormField
                                        control={form.control}
                                        name="initialSituation.fr"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Situation de départ</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Décrivez comment l'aventure commence..."
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
                    )}

                     {!isLiveAdventure && (
                        <>
                            <NpcCharacterConfig 
                                fields={fields} 
                                remove={remove} 
                                onAddCharacter={handleAddCharacter}
                                currentLanguage={currentLanguage}
                            />
                            <ConditionsConfig />
                        </>
                    )}
                    <GameModesConfig />
                    <TimeConfig currentLanguage={currentLanguage} />
                </div>
            </form>
        </FormProvider>
    );
});
AdventureForm.displayName = "AdventureForm";

    
