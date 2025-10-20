

"use client";

import * as React from "react";
import { useForm, FormProvider, useFieldArray, type UseFieldArrayAppend } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import type { AdventureSettings, AiConfig, LocalizedText, AdventureCondition } from '@/types';
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

import { PlayerCharacterConfig } from './adventure-form-parts/player-character-config';
import { NpcCharacterConfig } from './adventure-form-parts/npc-character-config';
import { TimeConfig } from './adventure-form-parts/time-config';
import { GameModesConfig } from './adventure-form-parts/game-modes-config';
import { WorldConfig } from './adventure-form-parts/world-config';
import { ConditionsConfig } from "./adventure-form-parts/conditions-config"; // NOUVEAU

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
}

interface AdventureFormProps {
    initialValues: AdventureFormValues;
    onFormValidityChange?: (isValid: boolean) => void;
    rpgMode: boolean;
    relationsMode: boolean;
    strategyMode: boolean;
    aiConfig?: AiConfig;
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
    triggerOperator: z.enum(['greater_than', 'less_than']),
    triggerValue: z.number(),
    effect: z.string().min(1, "L'effet de la condition est requis."),
    hasTriggered: z.boolean().default(false),
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
  conditions: z.array(adventureConditionSchema).optional(), // NOUVEAU
});

export const AdventureForm = React.forwardRef<AdventureFormHandle, AdventureFormProps>(
    ({ initialValues, onFormValidityChange, rpgMode, relationsMode, strategyMode, aiConfig }, ref) => {
    
    const { toast } = useToast();

    const form = useForm<AdventureFormValues>({
        resolver: zodResolver(adventureFormSchema),
        defaultValues: initialValues,
        mode: "onChange",
    });

    const { append } = useFieldArray({
        control: form.control,
        name: "characters",
    });
    
    React.useEffect(() => {
        form.reset(initialValues);
    }, [initialValues, form]);

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
    }));

    React.useEffect(() => {
        if (onFormValidityChange) {
            const subscription = form.watch(() => {
                onFormValidityChange(form.formState.isValid);
            });
            return () => subscription.unsubscribe();
        }
    }, [form, onFormValidityChange]);

    const handleLoadPrompt = () => {
        const loadedData: AdventureFormValues = {
            world: {
                fr: "Grande université populaire nommée 'hight scoole of futur'.",
                en: "Large popular university named 'hight scoole of futur'."
            },
            initialSituation: {
                fr: "Utilisateur marche dans les couloirs de hight scoole of futur et découvre sa petite amie discuter avec son meilleur ami, ils ont l'air très proches, trop proches ...",
                en: "User is walking down the halls of 'hight scoole of futur' and discovers his girlfriend talking with his best friend, they seem very close, too close..."
            },
            characters: [
                { id: 'rina-prompt-1', name: "Rina", details: "jeune femme de 19 ans, petite amie de Utilisateur , se rapproche du meilleur ami de Utilisateur, étudiante à hight scoole of futur, calme, aimante, parfois un peu secrète, fille populaire de l'école, 165 cm, yeux marron, cheveux mi-long brun, traits fin, corpulence athlétique.", portraitUrl: null, factionColor: '#FF69B4', affinity: 95, relations: { 'player': "Petite amie", "kentaro-prompt-1": "Ami d'enfance" }, roleInStory: "Petite amie" },
                { id: 'kentaro-prompt-1', name: "Kentaro", details: "Jeune homme de 20, meilleur ami de utilisateur, étudiant à hight scoole of futur, garçon populaire, charmant, 185 cm, athlétique voir costaud, yeux bleu, cheveux court blond, calculateur, impulsif, aime dragué les filles, se rapproche de la petite amie de Utilisateur, aime voir son meilleur ami souffrir.", portraitUrl: null, factionColor: '#4682B4', affinity: 30, relations: { 'player': "Meilleur ami (en apparence)", "rina-prompt-1": "Intérêt amoureux secret" } }
            ],
            rpgMode: false,
            relationsMode: true,
            strategyMode: false,
            comicModeActive: true,
            playerName: "Héros",
            playerClass: "Étudiant",
            playerLevel: 1,
            mapPointsOfInterest: [],
        };
        form.reset(loadedData);
        toast({ title: "Prompt Exemple Chargé", description: "La configuration a été mise à jour." });
    };

    return (
        <FormProvider {...form}>
            <form className="space-y-4 p-1" onSubmit={(e) => e.preventDefault()}>
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <Button type="button" variant="outline" size="sm" onClick={handleLoadPrompt}>
                            <Upload className="mr-2 h-4 w-4" /> Charger Prompt Exemple
                        </Button>
                    </div>
                    
                    <WorldConfig />
                    <GameModesConfig />
                    
                    <PlayerCharacterConfig 
                        aiConfig={aiConfig} 
                    />
                                        
                    <NpcCharacterConfig relationsMode={relationsMode} />

                    <ConditionsConfig />
                    
                    <TimeConfig />
                </div>
            </form>
        </FormProvider>
    );
});
AdventureForm.displayName = "AdventureForm";
