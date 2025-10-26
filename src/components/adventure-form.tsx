
"use client";

import * as React from "react";
import { useForm, FormProvider, useFieldArray, type UseFieldArrayAppend } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import type { AdventureSettings, AiConfig, LocalizedText } from '@/types';
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, User, UserPlus, Languages, Loader2, Rocket, Users as UsersIcon, Globe } from "lucide-react";

import { PlayerCharacterConfig } from './adventure-form-parts/player-character-config';
import { NpcCharacterConfig } from './adventure-form-parts/npc-character-config';
import { TimeConfig } from './adventure-form-parts/time-config';
import { GameModesConfig } from './adventure-form-parts/game-modes-config';
import { WorldConfig } from './adventure-form-parts/world-config';
import { i18n, type Language } from "@/lib/i18n";
import { Textarea } from "./ui/textarea";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { translateText } from "@/ai/flows/translate-text";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Label } from "@/components/ui/label";


// Schemas are kept here as they define the shape for the entire form,
// which is still managed by this parent component.

export type FormCharacterDefinition = {
  id?: string;
  name: string;
  details: string;
  isPlaceholder?: boolean;
  roleInStory?: string;
};

export type AdventureFormValues = Partial<Omit<AdventureSettings, 'characters' | 'world' | 'initialSituation'>> & {
    world: LocalizedText;
    initialSituation: LocalizedText;
    characters: FormCharacterDefinition[];
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
  roleInStory: z.string().optional(),
}).refine(data => {
    if (data.isPlaceholder) return !!data.name;
    if (data.name || data.details) return !!(data.name && data.details);
    return true;
}, {
    message: "Le nom et les détails sont tous deux requis pour définir un personnage complet.",
    path: ['name'],
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


const adventureFormSchema = z.object({
  world: z.record(z.string()).refine(val => Object.keys(val).length > 0 && Object.values(val).some(v => v.trim() !== ''), { message: "La description du monde est requise dans au moins une langue."}),
  initialSituation: z.record(z.string()).refine(val => Object.keys(val).length > 0 && Object.values(val).some(v => v.trim() !== ''), { message: "La situation initiale est requise dans au moins une langue."}),
  characters: z.array(characterSchema).optional(),
  rpgMode: z.boolean().default(true).optional(),
  relationsMode: z.boolean().default(true).optional(),
  strategyMode: z.boolean().default(true).optional(),
  comicModeActive: z.boolean().default(false).optional(),
  playerName: z.string().optional().default("Player").describe("Le nom du personnage joueur."),
  playerClass: z.string().optional().default("Aventurier").describe("Classe du joueur."),
  playerLevel: z.number().int().min(1).optional().default(1).describe("Niveau initial du joueur."),
  timeManagement: timeManagementSchema.optional(),
});

const LanguageTextarea = ({
    field,
    placeholder
}: {
    field: any;
    placeholder: string;
}) => (
    <Textarea
        placeholder={placeholder}
        className="resize-y"
        {...field}
    />
);

const allLanguageCodes: Language[] = ['fr', 'en', 'es', 'it', 'de', 'ja', 'ru', 'zh', 'pt', 'hi'];


export const AdventureForm = React.forwardRef<AdventureFormHandle, AdventureFormProps>(
    ({ initialValues, onFormValidityChange, rpgMode, relationsMode, strategyMode, aiConfig, isLiveAdventure = false, adventureSettings, currentLanguage = 'fr' }, ref) => {
    
    const { toast } = useToast();
    const [isTranslating, setIsTranslating] = React.useState<Record<string, boolean>>({});

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
        append({
            id: `char-new-${Date.now()}`,
            name: isPlaceholder ? 'Emplacement PNJ' : '',
            details: '',
            isPlaceholder: isPlaceholder,
        });
         toast({ title: isPlaceholder ? 'Emplacement de personnage ajouté' : 'Personnage ajouté' });
    };

    const handleTranslate = async (field: 'world' | 'initialSituation', sourceLang: Language, targetLang: Language) => {
        const textToTranslate = form.getValues(`${field}.${sourceLang}`);
        if (!textToTranslate) {
            toast({ title: "Texte manquant", description: `Veuillez d'abord écrire le texte en ${sourceLang.toUpperCase()}.`, variant: "destructive" });
            return;
        }

        const translationKey = `${field}-${sourceLang}-${targetLang}`;
        setIsTranslating(prev => ({ ...prev, [translationKey]: true }));
        toast({ title: "Traduction en cours...", description: `Traduction de ${sourceLang.toUpperCase()} vers ${targetLang.toUpperCase()}.` });

        try {
            const targetLanguageName = new Intl.DisplayNames(['en'], { type: 'language' }).of(targetLang) || targetLang;
            const result = await translateText({ text: textToTranslate, language: targetLanguageName });
            form.setValue(`${field}.${targetLang}`, result.translatedText, { shouldValidate: true, shouldDirty: true });
            toast({ title: "Traduction terminée!", description: `Le champ ${targetLang.toUpperCase()} a été mis à jour.` });
        } catch (error) {
            console.error(`Translation from ${sourceLang} to ${targetLang} failed:`, error);
            toast({ title: "Erreur de traduction", description: error instanceof Error ? error.message : "Une erreur inconnue est survenue.", variant: "destructive" });
        } finally {
            setIsTranslating(prev => ({ ...prev, [translationKey]: false }));
        }
    };
    

    return (
        <FormProvider {...form}>
            <form className="space-y-4 p-1" onSubmit={(e) => e.preventDefault()}>
                <div className="space-y-4">
                     <Accordion type="single" collapsible className="w-full" defaultValue="world-config">
                        <AccordionItem value="world-config">
                            <AccordionTrigger>
                                <div className="flex items-center gap-2">
                                    <Globe className="h-5 w-5" /> Description du Monde
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 space-y-4">
                                <Tabs defaultValue="fr" className="w-full">
                                    <TabsList>
                                        {allLanguageCodes.map(lang => (
                                            <TabsTrigger key={lang} value={lang}>{lang.toUpperCase()}</TabsTrigger>
                                        ))}
                                    </TabsList>
                                    {allLanguageCodes.map(lang => (
                                        <TabsContent key={lang} value={lang} className="mt-4">
                                             <FormField
                                                control={form.control}
                                                name={`world.${lang}` as const}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <LanguageTextarea field={field} placeholder={`Description du monde en ${lang}...`} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            {lang !== 'en' ? (
                                                <Button type="button" onClick={() => handleTranslate('world', lang, 'en')} disabled={isTranslating[`world-${lang}-en`]} size="sm" variant="ghost" className="mt-2">
                                                    {isTranslating[`world-${lang}-en`] ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Languages className="mr-2 h-4 w-4"/>}
                                                    Traduire en Anglais
                                                </Button>
                                            ) : (
                                                <div className="mt-2 space-y-2">
                                                    <Label className="text-xs text-muted-foreground">Traduire depuis l'Anglais vers :</Label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {allLanguageCodes.filter(l => l !== 'en').map(targetLang => (
                                                            <Button key={targetLang} type="button" onClick={() => handleTranslate('world', 'en', targetLang)} disabled={isTranslating[`world-en-${targetLang}`]} size="xs" variant="outline">
                                                                {isTranslating[`world-en-${targetLang}`] ? <Loader2 className="mr-1 h-3 w-3 animate-spin"/> : null}
                                                                {targetLang.toUpperCase()}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </TabsContent>
                                    ))}
                                </Tabs>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                    
                    {!isLiveAdventure && (
                         <Accordion type="single" collapsible className="w-full" defaultValue="initial-situation-config">
                            <AccordionItem value="initial-situation-config">
                                <AccordionTrigger>
                                    <div className="flex items-center gap-2">
                                        <Rocket className="h-5 w-5" /> Situation de Départ
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-2 space-y-4">
                                     <Tabs defaultValue="fr" className="w-full">
                                        <TabsList>
                                            {allLanguageCodes.map(lang => (
                                                <TabsTrigger key={lang} value={lang}>{lang.toUpperCase()}</TabsTrigger>
                                            ))}
                                        </TabsList>
                                        {allLanguageCodes.map(lang => (
                                            <TabsContent key={lang} value={lang} className="mt-4">
                                                <FormField
                                                    control={form.control}
                                                    name={`initialSituation.${lang}` as const}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <LanguageTextarea field={field} placeholder={`Situation de départ en ${lang}...`} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                {lang !== 'en' ? (
                                                    <Button type="button" onClick={() => handleTranslate('initialSituation', lang, 'en')} disabled={isTranslating[`initialSituation-${lang}-en`]} size="sm" variant="ghost" className="mt-2">
                                                        {isTranslating[`initialSituation-${lang}-en`] ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Languages className="mr-2 h-4 w-4"/>}
                                                        Traduire en Anglais
                                                    </Button>
                                                ) : (
                                                    <div className="mt-2 space-y-2">
                                                        <Label className="text-xs text-muted-foreground">Traduire depuis l'Anglais vers :</Label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {allLanguageCodes.filter(l => l !== 'en').map(targetLang => (
                                                                <Button key={targetLang} type="button" onClick={() => handleTranslate('initialSituation', 'en', targetLang)} disabled={isTranslating[`initialSituation-en-${targetLang}`]} size="xs" variant="outline">
                                                                    {isTranslating[`initialSituation-en-${targetLang}`] ? <Loader2 className="mr-1 h-3 w-3 animate-spin"/> : null}
                                                                    {targetLang.toUpperCase()}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </TabsContent>
                                        ))}
                                    </Tabs>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )}

                    <NpcCharacterConfig 
                        fields={fields} 
                        remove={remove} 
                        onAddCharacter={handleAddCharacter}
                        currentLanguage={currentLanguage}
                    />

                    <GameModesConfig />
                    <TimeConfig currentLanguage={currentLanguage} />
                </div>
            </form>
        </FormProvider>
    );
});
AdventureForm.displayName = "AdventureForm";
