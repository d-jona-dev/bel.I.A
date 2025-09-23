
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Trash2, Upload, User, Users, Gamepad2, Coins, Dices, HelpCircle, BarChart2, Map, MapIcon, Link as LinkIcon, Heart, Clock, Box, FilePenLine } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { AdventureSettings, MapPointOfInterest, Character, PlayerAvatar, TimeManagementSettings, BaseItem } from '@/types';
import { Separator } from "./ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BUILDING_DEFINITIONS, BUILDING_SLOTS } from "@/lib/buildings";
import { Checkbox } from "./ui/checkbox";
import { poiLevelNameMap, poiLevelConfig } from "@/lib/buildings";
import { Slider } from "./ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { BASE_CONSUMABLES, BASE_JEWELRY, BASE_ARMORS, BASE_WEAPONS } from "@/lib/items";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";


export type FormCharacterDefinition = {
  id?: string;
  name: string;
  details: string;
  portraitUrl?: string | null;
  factionColor?: string;
  affinity?: number;
  relations?: Record<string, string>;
};


export type AdventureFormValues = Partial<Omit<AdventureSettings, 'characters'>> & {
    characters: FormCharacterDefinition[];
};

export interface AdventureFormHandle {
    getFormData: () => Promise<AdventureFormValues | null>;
    getValues: (name?: keyof AdventureFormValues | (keyof AdventureFormValues)[]) => any;
    setValue: (name: keyof AdventureFormValues, value: any, options?: { shouldValidate?: boolean, shouldDirty?: boolean }) => void;
}

interface AdventureFormProps {
    formPropKey: number;
    initialValues: AdventureFormValues;
    onSettingsChange?: (newSettings: AdventureFormValues) => void;
    rpgMode: boolean;
    relationsMode: boolean;
    strategyMode: boolean;
}


const characterSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Le nom est requis"),
  details: z.string().min(1, "Les détails sont requis"),
  portraitUrl: z.string().url().or(z.literal("")).optional().nullable(),
  factionColor: z.string().optional(),
  affinity: z.number().min(0).max(100).optional(),
  relations: z.record(z.string()).optional(),
});

const mapPointOfInterestSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Le nom est requis"),
    description: z.string().optional(),
    icon: z.enum(['Castle', 'Mountain', 'Trees', 'Village', 'Shield', 'Landmark']),
    ownerId: z.string().optional(),
    level: z.number().optional(),
    buildings: z.array(z.string()).optional(),
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


const BASE_ATTRIBUTE_VALUE_FORM = 8;
const POINTS_PER_LEVEL_GAIN_FORM = 5;

const adventureFormSchema = z.object({
  world: z.string().min(1, "La description du monde est requise"),
  initialSituation: z.string().min(1, "La situation initiale est requise"),
  characters: z.array(characterSchema).min(0),
  rpgMode: z.boolean().default(true).optional(),
  relationsMode: z.boolean().default(true).optional(),
  strategyMode: z.boolean().default(true).optional(),
  playerName: z.string().optional().default("Player").describe("Le nom du personnage joueur."),
  playerPortraitUrl: z.string().url().optional().or(z.literal("")).nullable(),
  playerDetails: z.string().optional(),
  playerDescription: z.string().optional(),
  playerOrientation: z.string().optional(),
  playerClass: z.string().optional().default("Aventurier").describe("Classe du joueur."),
  playerLevel: z.number().int().min(1).optional().default(1).describe("Niveau initial du joueur."),
  playerInitialAttributePoints: z.number().int().min(0).optional().default(10).describe("Points d'attributs de création (au niveau 1)."),
  totalDistributableAttributePoints: z.number().int().min(0).optional().default(10).describe("Points d'attributs totaux à distribuer pour le niveau actuel (création + niveaux)."),
  playerStrength: z.number().int().min(BASE_ATTRIBUTE_VALUE_FORM).optional().default(BASE_ATTRIBUTE_VALUE_FORM),
  playerDexterity: z.number().int().min(BASE_ATTRIBUTE_VALUE_FORM).optional().default(BASE_ATTRIBUTE_VALUE_FORM),
  playerConstitution: z.number().int().min(BASE_ATTRIBUTE_VALUE_FORM).optional().default(BASE_ATTRIBUTE_VALUE_FORM),
  playerIntelligence: z.number().int().min(BASE_ATTRIBUTE_VALUE_FORM).optional().default(BASE_ATTRIBUTE_VALUE_FORM),
  playerWisdom: z.number().int().min(BASE_ATTRIBUTE_VALUE_FORM).optional().default(BASE_ATTRIBUTE_VALUE_FORM),
  playerCharisma: z.number().int().min(BASE_ATTRIBUTE_VALUE_FORM).optional().default(BASE_ATTRIBUTE_VALUE_FORM),
  playerGold: z.number().int().min(0).optional().default(0),
  mapPointsOfInterest: z.array(mapPointOfInterestSchema).optional(),
  timeManagement: timeManagementSchema.optional(),
  activeItemUniverses: z.array(z.string()).optional(),
});


export const AdventureForm = React.forwardRef<AdventureFormHandle, AdventureFormProps>(
    ({ formPropKey, initialValues, onSettingsChange, rpgMode, relationsMode, strategyMode }, ref) => {
    const { toast } = useToast();
    const [savedAvatars, setSavedAvatars] = React.useState<PlayerAvatar[]>([]);
    
    // State for item management
    const [consumables, setConsumables] = React.useState<BaseItem[]>(BASE_CONSUMABLES);
    const [editingItem, setEditingItem] = React.useState<BaseItem | null>(null);
    const [isItemEditorOpen, setIsItemEditorOpen] = React.useState(false);
    
    // State for new POI form
    const [newPoiName, setNewPoiName] = React.useState("");
    const [newPoiDescription, setNewPoiDescription] = React.useState("");
    const [newPoiType, setNewPoiType] = React.useState<MapPointOfInterest['icon']>("Village");
    const [newPoiOwnerId, setNewPoiOwnerId] = React.useState(initialValues.playerName || 'player');
    const [newPoiLevel, setNewPoiLevel] = React.useState(1);
    const [newPoiBuildings, setNewPoiBuildings] = React.useState<string[]>([]);


    const form = useForm<AdventureFormValues>({
        resolver: zodResolver(adventureFormSchema),
        defaultValues: {
            ...initialValues,
            timeManagement: initialValues.timeManagement ?? {
                enabled: false,
                day: 1,
                dayName: "Lundi",
                dayNames: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
                currentTime: '12:00',
                timeFormat: '24h',
                currentEvent: '',
                timeElapsedPerTurn: '00:15',
            },
            activeItemUniverses: initialValues.activeItemUniverses || ['Médiéval-Fantastique'],
        },
        mode: "onBlur",
    });

     React.useEffect(() => {
        try {
            const storedAvatars = localStorage.getItem('playerAvatars_v2');
            if (storedAvatars) setSavedAvatars(JSON.parse(storedAvatars));

            const storedConsumables = localStorage.getItem('custom_consumables');
            if (storedConsumables) setConsumables(JSON.parse(storedConsumables));

        } catch (error) {
            console.error("Failed to load data from localStorage", error);
        }
    }, []);

    const saveConsumables = (items: BaseItem[]) => {
        setConsumables(items);
        localStorage.setItem('custom_consumables', JSON.stringify(items));
    }

    const handleSaveItem = () => {
        if (!editingItem || !editingItem.name.trim() || !editingItem.description.trim()) {
            toast({ title: "Erreur", description: "Le nom et la description de l'objet sont requis.", variant: "destructive" });
            return;
        }

        const isNew = !consumables.some(item => item.id === editingItem.id);
        let updatedItems;

        if (isNew) {
            updatedItems = [...consumables, editingItem];
        } else {
            updatedItems = consumables.map(item => item.id === editingItem.id ? editingItem : item);
        }
        
        saveConsumables(updatedItems);
        toast({ title: "Objet sauvegardé", description: `"${editingItem.name}" a été mis à jour.` });
        setIsItemEditorOpen(false);
        setEditingItem(null);
    };

    const handleAddNewItem = () => {
        setEditingItem({
            id: `cons-${Date.now()}`,
            name: "",
            description: "",
            type: 'consumable',
            baseGoldValue: 5,
            universe: 'Médiéval-Fantastique',
            rarity: 'Commun',
            effectType: 'narrative',
        });
        setIsItemEditorOpen(true);
    };

    const handleDeleteItem = (itemId: string) => {
        const updatedItems = consumables.filter(item => item.id !== itemId);
        saveConsumables(updatedItems);
        toast({ title: "Objet supprimé" });
    };

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
    }));

    React.useEffect(() => {
        form.reset({
            ...initialValues,
            timeManagement: initialValues.timeManagement ?? {
                enabled: false,
                day: 1,
                dayName: "Lundi",
                dayNames: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
                currentTime: '12:00',
                timeFormat: '24h',
                currentEvent: '',
                timeElapsedPerTurn: '00:15',
            }
        });
    }, [formPropKey, initialValues, form]);


    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "characters",
    });
    
    const { fields: poiFields, append: appendPoi, remove: removePoi, update: updatePoi } = useFieldArray({
        control: form.control,
        name: "mapPointsOfInterest"
    });


    const handleLoadPrompt = () => {
        const loadedData: AdventureFormValues = {
            world: "Grande université populaire nommée \"hight scoole of futur\".",
            initialSituation: "Utilisateur marche dans les couloirs de hight scoole of futur et découvre sa petite amie discuter avec son meilleur ami, ils ont l'air très proches, trop proches ...",
            characters: [
                { id: 'rina-prompt-1', name: "Rina", details: "jeune femme de 19 ans, petite amie de Utilisateur , se rapproche du meilleur ami de Utilisateur, étudiante à hight scoole of futur, calme, aimante, parfois un peu secrète, fille populaire de l'école, 165 cm, yeux marron, cheveux mi-long brun, traits fin, corpulence athlétique.", portraitUrl: null, factionColor: '#FF69B4', affinity: 95, relations: { 'player': "Petite amie", "kentaro-prompt-1": "Ami d'enfance" } },
                { id: 'kentaro-prompt-1', name: "Kentaro", details: "Jeune homme de 20, meilleur ami de utilisateur, étudiant à hight scoole of futur, garçon populaire, charmant, 185 cm, athlétique voir costaud, yeux bleu, cheveux court blond, calculateur, impulsif, aime dragué les filles, se rapproche de la petite amie de Utilisateur, aime voir son meilleur ami souffrir.", portraitUrl: null, factionColor: '#4682B4', affinity: 30, relations: { 'player': "Meilleur ami (en apparence)", "rina-prompt-1": "Intérêt amoureux secret" } }
            ],
            rpgMode: true,
            relationsMode: true,
            strategyMode: true,
            playerName: "Héros",
            playerClass: "Étudiant Combattant",
            playerLevel: 1,
            playerInitialAttributePoints: 10,
            playerStrength: 8,
            playerDexterity: 8,
            playerConstitution: 8,
            playerIntelligence: 8,
            playerWisdom: 8,
            playerCharisma: 8,
            playerGold: 50,
            mapPointsOfInterest: [],
            activeItemUniverses: ['Médiéval-Fantastique'],
        };
        form.reset(loadedData);
        toast({ title: "Prompt Exemple Chargé", description: "La configuration a été mise à jour." });
    };
    
    const watchedValues = form.watch();

    const ATTRIBUTES: (keyof AdventureFormValues)[] = ['playerStrength', 'playerDexterity', 'playerConstitution', 'playerIntelligence', 'playerWisdom', 'playerCharisma'];
    
    React.useEffect(() => {
        const level = form.getValues('playerLevel') || 1;
        const initialPoints = form.getValues('playerInitialAttributePoints') || 10;
        const levelPoints = (level > 1) ? ((level - 1) * POINTS_PER_LEVEL_GAIN_FORM) : 0;
        const totalPoints = initialPoints + levelPoints;
        form.setValue('totalDistributableAttributePoints', totalPoints);
    }, [watchedValues.playerLevel, watchedValues.playerInitialAttributePoints, form]);
    
    const spentPoints = ATTRIBUTES.reduce((acc, attr) => {
        const value = watchedValues[attr] as number | undefined;
        return acc + ((value || BASE_ATTRIBUTE_VALUE_FORM) - BASE_ATTRIBUTE_VALUE_FORM);
    }, 0);
    const totalPoints = watchedValues.totalDistributableAttributePoints || 0;
    const remainingPoints = totalPoints - spentPoints;
    
    const handleAttributeBlur = (field: keyof AdventureFormValues) => {
        let value = form.getValues(field) as number;
        if (isNaN(value) || value < BASE_ATTRIBUTE_VALUE_FORM) {
            value = BASE_ATTRIBUTE_VALUE_FORM;
        }
        
        const currentSpentExcludingThis = ATTRIBUTES.reduce((acc, attr) => {
            if (attr === field) return acc;
            return acc + ((form.getValues(attr) as number || BASE_ATTRIBUTE_VALUE_FORM) - BASE_ATTRIBUTE_VALUE_FORM);
        }, 0);
        
        if (currentSpentExcludingThis + (value - BASE_ATTRIBUTE_VALUE_FORM) > totalPoints) {
            value = totalPoints - currentSpentExcludingThis + BASE_ATTRIBUTE_VALUE_FORM;
        }
        
        form.setValue(field, value, { shouldDirty: true, shouldValidate: true });
    }

    const handleAvatarSelection = (avatarId: string) => {
        if (avatarId === 'custom') {
            // Reset to default custom hero if user wants to create a new one
            form.reset({
                ...form.getValues(),
                playerName: "Héros",
                playerClass: "Aventurier",
                playerLevel: 1,
                playerDetails: "",
                playerDescription: "",
                playerOrientation: "",
                playerPortraitUrl: null,
                // Reset stats if you want a completely fresh start
                playerStrength: BASE_ATTRIBUTE_VALUE_FORM,
                playerDexterity: BASE_ATTRIBUTE_VALUE_FORM,
                playerConstitution: BASE_ATTRIBUTE_VALUE_FORM,
                playerIntelligence: BASE_ATTRIBUTE_VALUE_FORM,
                playerWisdom: BASE_ATTRIBUTE_VALUE_FORM,
                playerCharisma: BASE_ATTRIBUTE_VALUE_FORM,
            });
            return;
        }

        const selectedAvatar = savedAvatars.find(a => a.id === avatarId);
        if (selectedAvatar) {
            form.setValue('playerName', selectedAvatar.name);
            form.setValue('playerClass', selectedAvatar.class);
            form.setValue('playerLevel', selectedAvatar.level);
            form.setValue('playerDetails', selectedAvatar.details);
            form.setValue('playerDescription', selectedAvatar.description);
            form.setValue('playerOrientation', selectedAvatar.orientation);
            form.setValue('playerPortraitUrl', selectedAvatar.portraitUrl);
            // Here you might want to also load stats if they are saved with the avatar
            toast({ title: "Avatar Chargé", description: `Les informations de ${selectedAvatar.name} ont été appliquées.` });
        }
    };

    const { availableLevelsForType, buildingSlotsForLevel, availableBuildingsForType } = React.useMemo(() => {
        const typeConfig = poiLevelConfig[newPoiType as keyof typeof poiLevelConfig];
        const levels = Object.keys(typeConfig || {}).map(Number);
        const slots = BUILDING_SLOTS[newPoiType]?.[newPoiLevel] ?? 0;
        const buildings = BUILDING_DEFINITIONS.filter(def => def.applicablePoiTypes.includes(newPoiType));
        return { availableLevelsForType: levels, buildingSlotsForLevel: slots, availableBuildingsForType: buildings };
    }, [newPoiType, newPoiLevel]);

    const handleBuildingSelection = (buildingId: string, checked: boolean) => {
        setNewPoiBuildings(prev => {
            const newSelection = checked ? [...prev, buildingId] : prev.filter(id => id !== buildingId);
            if (newSelection.length > buildingSlotsForLevel) {
                toast({
                    title: "Limite de bâtiments atteinte",
                    description: `Vous ne pouvez sélectionner que ${buildingSlotsForLevel} bâtiment(s) pour ce niveau.`,
                    variant: "destructive"
                });
                return prev;
            }
            return newSelection;
        });
    };
    
    React.useEffect(() => {
        // Reset level and buildings if type changes
        setNewPoiLevel(1);
        setNewPoiBuildings([]);
    }, [newPoiType]);
    
    React.useEffect(() => {
        // Prune selected buildings if they exceed the new slot limit
        if (newPoiBuildings.length > buildingSlotsForLevel) {
            setNewPoiBuildings(prev => prev.slice(0, buildingSlotsForLevel));
        }
    }, [newPoiLevel, buildingSlotsForLevel, newPoiBuildings]);


    return (
        <Form {...form}>
        <form className="space-y-4 p-1" onSubmit={(e) => e.preventDefault()}>

            <div className="space-y-4">
                <div className="flex justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={handleLoadPrompt}>
                        <Upload className="mr-2 h-4 w-4" /> Charger Prompt Exemple
                    </Button>
                </div>
                
                <FormField
                control={form.control}
                name="world"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Monde</FormLabel>
                    <FormControl>
                        <Textarea
                        placeholder="Décrivez l'univers de votre aventure..."
                        {...field}
                        rows={4}
                        className="bg-background border"
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <FormField
                control={form.control}
                name="initialSituation"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Situation Initiale</FormLabel>
                    <FormControl>
                        <Textarea
                        placeholder="Comment commence l'aventure pour le héros ?"
                        {...field}
                        rows={3}
                        className="bg-background border"
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <Card className="p-4 space-y-3 bg-muted/20 border-dashed">
                    <CardDescription>Activez ou désactivez les systèmes de jeu.</CardDescription>
                     <FormField
                        control={form.control}
                        name="rpgMode"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background">
                                <div className="space-y-0.5">
                                    <FormLabel className="flex items-center gap-2 text-sm"><Gamepad2 className="h-4 w-4"/> Mode Jeu de Rôle (RPG)</FormLabel>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="relationsMode"
                        render={({ field }) => (
                           <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background">
                                <div className="space-y-0.5">
                                    <FormLabel className="flex items-center gap-2 text-sm"><LinkIcon className="h-4 w-4"/> Mode Relations</FormLabel>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="strategyMode"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background">
                                <div className="space-y-0.5">
                                    <FormLabel className="flex items-center gap-2 text-sm"><Map className="h-4 w-4"/> Mode Stratégie</FormLabel>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )}
                    />
                </Card>


                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-config">
                        <AccordionTrigger>Configuration des Objets</AccordionTrigger>
                        <AccordionContent className="pt-2 space-y-4">
                            <Card className="p-4 bg-background">
                                <FormField
                                    control={form.control}
                                    name="activeItemUniverses"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="mb-4">
                                                <FormLabel className="text-base flex items-center gap-2"><Box className="h-5 w-5" /> Univers d'Objets Actifs</FormLabel>
                                                <FormDescription>
                                                    Sélectionnez les univers dont les objets pourront apparaître dans les butins et chez les marchands.
                                                </FormDescription>
                                            </div>
                                            {(['Médiéval-Fantastique', 'Post-Apo', 'Futuriste', 'Space-Opéra'] as Array<BaseItem['universe']>).map((universe) => (
                                                <FormField
                                                    key={universe}
                                                    control={form.control}
                                                    name="activeItemUniverses"
                                                    render={({ field }) => {
                                                        return (
                                                            <FormItem
                                                                key={universe}
                                                                className="flex flex-row items-start space-x-3 space-y-0"
                                                            >
                                                                <FormControl>
                                                                    <Checkbox
                                                                        checked={field.value?.includes(universe)}
                                                                        onCheckedChange={(checked) => {
                                                                            return checked
                                                                                ? field.onChange([...(field.value || []), universe])
                                                                                : field.onChange(
                                                                                    (field.value || []).filter(
                                                                                        (value) => value !== universe
                                                                                    )
                                                                                )
                                                                        }}
                                                                    />
                                                                </FormControl>
                                                                <FormLabel className="font-normal">
                                                                    {universe}
                                                                </FormLabel>
                                                            </FormItem>
                                                        )
                                                    }}
                                                />
                                            ))}
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <Separator className="my-4" />
                                <Tabs defaultValue="consumables">
                                    <TabsList>
                                        <TabsTrigger value="consumables">Consommables</TabsTrigger>
                                        <TabsTrigger value="equipment" disabled>Équipement (Bientôt)</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="consumables" className="mt-4">
                                         <div className="flex justify-between items-center mb-2">
                                            <CardDescription>Gérez la liste des potions et parchemins.</CardDescription>
                                            <Button size="sm" variant="outline" onClick={handleAddNewItem}><PlusCircle className="mr-2 h-4 w-4"/>Ajouter</Button>
                                         </div>
                                        <ScrollArea className="h-64 border rounded-md p-2">
                                            <div className="space-y-2">
                                            {consumables.map(item => (
                                                <Card key={item.id} className="p-2 flex justify-between items-center bg-muted/20">
                                                    <div>
                                                        <p className="font-semibold text-sm">{item.name}</p>
                                                        <p className="text-xs text-muted-foreground">{item.description}</p>
                                                    </div>
                                                    <div className="flex gap-1">
                                                         <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteItem(item.id)}>
                                                            <Trash2 className="h-4 w-4"/>
                                                         </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingItem(JSON.parse(JSON.stringify(item))); setIsItemEditorOpen(true);}}>
                                                            <FilePenLine className="h-4 w-4"/>
                                                        </Button>
                                                    </div>
                                                </Card>
                                            ))}
                                            </div>
                                        </ScrollArea>
                                    </TabsContent>
                                </Tabs>
                            </Card>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="time-management-config">
                        <AccordionTrigger>Gestion avancée du temps</AccordionTrigger>
                        <AccordionContent className="pt-2 space-y-4">
                            <FormField
                                control={form.control}
                                name="timeManagement.enabled"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background">
                                        <div className="space-y-0.5">
                                            <FormLabel className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4"/> Activer la gestion du temps</FormLabel>
                                        </div>
                                        <FormControl><Switch checked={field.value} onCheckedChange={(checked) => {
                                            field.onChange(checked);
                                            if (checked) {
                                                form.setValue('timeManagement.day', 1);
                                                form.setValue('timeManagement.dayName', 'Lundi');
                                            }
                                        }} /></FormControl>
                                    </FormItem>
                                )}
                            />
                            {watchedValues.timeManagement?.enabled && (
                                <Card className="p-4 bg-background space-y-4">
                                     <FormField
                                        control={form.control}
                                        name="timeManagement.dayName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Jour de départ</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {(watchedValues.timeManagement?.dayNames || []).map((day, index) => (
                                                            <SelectItem key={day} value={day}>{day}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="timeManagement.currentEvent"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Événement en cours</FormLabel>
                                                <FormControl><Input placeholder="Ex: Début du cours, Réunion d'équipe..." {...field} /></FormControl>
                                                <FormDescription className="text-xs">Donne un contexte précis à l'IA sur l'activité actuelle.</FormDescription>
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                         <FormField
                                            control={form.control}
                                            name="timeManagement.currentTime"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Heure actuelle</FormLabel>
                                                    <FormControl><Input type="text" {...field} placeholder="HH:MM" /></FormControl>
                                                    <FormMessage/>
                                                </FormItem>
                                            )}
                                        />
                                         <FormField
                                            control={form.control}
                                            name="timeManagement.timeElapsedPerTurn"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Temps par tour</FormLabel>
                                                    <FormControl><Input type="text" {...field} placeholder="HH:MM" /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name="timeManagement.timeFormat"
                                        render={({ field }) => (
                                            <FormItem className="space-y-3">
                                            <FormLabel>Format de l'heure</FormLabel>
                                            <FormControl>
                                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                                    <FormItem className="flex items-center space-x-2">
                                                        <FormControl><RadioGroupItem value="24h" id="24h" /></FormControl>
                                                        <FormLabel htmlFor="24h" className="font-normal">24 Heures</FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-2">
                                                        <FormControl><RadioGroupItem value="12h" id="12h" /></FormControl>
                                                        <FormLabel htmlFor="12h" className="font-normal">12 Heures (AM/PM)</FormLabel>
                                                    </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </Card>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
                
                <Accordion type="single" collapsible className="w-full" defaultValue="player-character-config">
                    <AccordionItem value="player-character-config">
                        <AccordionTrigger>Configuration du Héros</AccordionTrigger>
                        <AccordionContent className="pt-2 space-y-4">
                             <div className="space-y-2">
                                <Label>Personnage Joueur</Label>
                                <Select onValueChange={handleAvatarSelection}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choisir un avatar ou créer un héros personnalisé..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="custom">-- Héros Personnalisé --</SelectItem>
                                        <Separator className="my-1"/>
                                        {savedAvatars.map(avatar => (
                                            <SelectItem key={avatar.id} value={avatar.id}>{avatar.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormDescription>
                                    Sélectionnez un de vos avatars sauvegardés pour pré-remplir les informations du héros, ou choisissez "Héros Personnalisé" pour en créer un spécifique à cette histoire.
                                </FormDescription>
                            </div>

                            <Card className="p-4 bg-background">
                                <div className="flex gap-4 items-start">
                                    <div className="flex-1 space-y-4">
                                        <FormField control={form.control} name="playerName" render={({ field }) => (<FormItem><FormLabel>Nom du Héros</FormLabel><FormControl><Input placeholder="Nom du héros" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>)}/>
                                        <FormField control={form.control} name="playerPortraitUrl" render={({ field }) => (<FormItem><FormLabel>URL du Portrait</FormLabel><FormControl><Input placeholder="https://example.com/portrait.png" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>)}/>
                                    </div>
                                     <Avatar className="h-24 w-24">
                                        <AvatarImage src={watchedValues.playerPortraitUrl || undefined} alt={watchedValues.playerName || 'Héros'} />
                                        <AvatarFallback><User /></AvatarFallback>
                                    </Avatar>
                                </div>
                                <FormField control={form.control} name="playerDetails" render={({ field }) => (<FormItem className="mt-4"><FormLabel>Détails (Physique, Âge)</FormLabel><FormControl><Textarea placeholder="Décrivez l'apparence physique de votre héros..." {...field} value={field.value || ""} rows={2} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="playerOrientation" render={({ field }) => (<FormItem className="mt-4"><FormLabel>Orientation Amoureuse</FormLabel><FormControl><Input placeholder="Ex: Hétérosexuel, Bisexuel..." {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="playerDescription" render={({ field }) => (<FormItem className="mt-4"><FormLabel>Description (Background)</FormLabel><FormControl><Textarea placeholder="Racontez son histoire, ses capacités spéciales..." {...field} value={field.value || ""} rows={3} /></FormControl><FormMessage /></FormItem>)}/>
                                
                                {watchedValues.rpgMode && (
                                    <>
                                        <Separator className="my-4"/>
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="playerClass" render={({ field }) => (<FormItem><FormLabel>Classe du Joueur</FormLabel><FormControl><Input placeholder="Ex: Guerrier, Mage..." {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>)}/>
                                            <FormField control={form.control} name="playerLevel" render={({ field }) => (<FormItem><FormLabel>Niveau de départ</FormLabel><FormControl><Input type="number" min="1" {...field} value={field.value || 1} onChange={e => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>)}/>
                                            <FormField control={form.control} name="playerGold" render={({ field }) => (<FormItem><FormLabel>Or de départ</FormLabel><FormControl><Input type="number" min="0" {...field} value={field.value || 0} onChange={e => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>)}/>
                                        </div>
                                         <div className="space-y-2 pt-4">
                                            <Label className="flex items-center gap-2"><Dices className="h-4 w-4"/> Attributs du Joueur</Label>
                                            <div className="p-2 border rounded-md bg-muted/50 text-center text-sm">
                                                Points à distribuer : <span className={`font-bold ${remainingPoints < 0 ? 'text-destructive' : 'text-primary'}`}>{remainingPoints}</span>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild><HelpCircle className="inline h-3 w-3 ml-1 text-muted-foreground cursor-help"/></TooltipTrigger>
                                                        <TooltipContent>
                                                            <p className="max-w-xs">Les attributs de base sont à 8. Chaque point au-delà coûte un point de distribution. Vous gagnez des points à la création et à chaque niveau.</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                                {ATTRIBUTES.map(attr => (
                                                    <FormField
                                                    key={attr}
                                                    control={form.control}
                                                    name={attr as any}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-xs capitalize">{attr.replace('player', '')}</FormLabel>
                                                            <FormControl>
                                                                <Input 
                                                                    type="number" 
                                                                    {...field}
                                                                    value={field.value || BASE_ATTRIBUTE_VALUE_FORM}
                                                                    onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                                                                    onBlur={() => handleAttributeBlur(attr as any)}
                                                                    className="h-8"
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </Card>

                        </AccordionContent>
                    </AccordionItem>
                </Accordion>


                {watchedValues.strategyMode && (
                    <Card className="p-4 space-y-3 border-dashed bg-muted/20">
                        <CardDescription>Configurez les points d'intérêt de votre aventure.</CardDescription>
                        <ScrollArea className="h-48 pr-3">
                             <div className="space-y-2">
                                {poiFields.map((item, index) => {
                                    const currentPoiType = watchedValues.mapPointsOfInterest?.[index]?.icon || 'Village';
                                    const currentPoiLevel = watchedValues.mapPointsOfInterest?.[index]?.level || 1;
                                    const buildingSlots = BUILDING_SLOTS[currentPoiType]?.[currentPoiLevel] ?? 0;
                                    const availableBuildingsForType = BUILDING_DEFINITIONS.filter(def => def.applicablePoiTypes.includes(currentPoiType));

                                    return (
                                    <Card key={item.id} className="relative pt-6 bg-background border mb-2">
                                        <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removePoi(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        <CardContent className="space-y-2 p-3">
                                            <FormField control={form.control} name={`mapPointsOfInterest.${index}.name`} render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`mapPointsOfInterest.${index}.description`} render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`mapPointsOfInterest.${index}.icon`} render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Type</FormLabel>
                                                    <Select onValueChange={(value) => { field.onChange(value); updatePoi(index, {...item, icon: value as any, level: 1, buildings:[]}); }} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Village">Ville (Produit de l'or)</SelectItem>
                                                            <SelectItem value="Trees">Forêt (Produit bois/viande)</SelectItem>
                                                            <SelectItem value="Shield">Mine (Produit du minerai)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                            <FormField
                                                control={form.control}
                                                name={`mapPointsOfInterest.${index}.ownerId`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Propriétaire</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="player">{watchedValues.playerName || 'Joueur'}</SelectItem>
                                                                {watchedValues.characters?.map(char => (
                                                                    <SelectItem key={char.id} value={char.id!}>{char.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`mapPointsOfInterest.${index}.level`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Niveau</FormLabel>
                                                        <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={String(field.value || 1)}>
                                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                            <SelectContent>
                                                                {Object.keys(poiLevelConfig[currentPoiType as keyof typeof poiLevelConfig] || {}).map(Number).map(level => (
                                                                    <SelectItem key={level} value={level.toString()}>Niveau {level} - {poiLevelNameMap[currentPoiType]?.[Number(level)]}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                            {buildingSlots > 0 && (
                                                <div className="space-y-1">
                                                    <Label>Bâtiments ({watchedValues.mapPointsOfInterest?.[index]?.buildings?.length || 0}/{buildingSlots})</Label>
                                                    <div className="p-2 border rounded-md max-h-24 overflow-y-auto">
                                                        {availableBuildingsForType.map(building => (
                                                            <FormField
                                                                key={building.id}
                                                                control={form.control}
                                                                name={`mapPointsOfInterest.${index}.buildings`}
                                                                render={({ field }) => (
                                                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                                        <FormControl>
                                                                            <Checkbox
                                                                                checked={field.value?.includes(building.id)}
                                                                                onCheckedChange={(checked) => {
                                                                                    const currentBuildings = field.value || [];
                                                                                    if (checked) {
                                                                                        if (currentBuildings.length < buildingSlots) {
                                                                                            field.onChange([...currentBuildings, building.id]);
                                                                                        } else {
                                                                                            toast({ title: "Limite de bâtiments atteinte", variant: "destructive" });
                                                                                        }
                                                                                    } else {
                                                                                        field.onChange(currentBuildings.filter((value) => value !== building.id));
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </FormControl>
                                                                        <FormLabel className="font-normal text-sm">{building.name}</FormLabel>
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                        </CardContent>
                                    </Card>
                                    )
                                })}
                                 <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full mt-2"
                                    onClick={() => appendPoi({ id: `new-poi-${Date.now()}`, name: "", description: "", icon: 'Village', ownerId: 'player', level: 1, buildings: [] })}
                                >
                                    <MapIcon className="mr-2 h-4 w-4"/>Ajouter un lieu
                                </Button>
                            </div>
                        </ScrollArea>
                    </Card>
                )}

                <Accordion type="single" collapsible className="w-full border-t pt-4" defaultValue="character-definitions">
                <AccordionItem value="character-definitions">
                    <AccordionTrigger>Définir les Personnages Initiaux</AccordionTrigger>
                    <AccordionContent>
                    <ScrollArea className="h-48 pr-3">
                        <div className="space-y-4">
                        <div className="hidden">
                            
                        </div>
                        {fields.map((item, index) => {
                          const characterPortrait = watchedValues.characters?.[index]?.portraitUrl;
                          return (
                            <Card key={item.id} className="relative pt-6 bg-muted/30 border">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-1 right-1 h-6 w-6"
                                    onClick={() => remove(index)}
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            <CardContent className="space-y-2 p-3">
                                <div className="flex gap-4 items-start">
                                    <div className="flex-1 space-y-2">
                                        <FormField
                                        control={form.control}
                                        name={`characters.${index}.name`}
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Nom du Personnage</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nom" {...field} className="bg-background border"/>
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                        />
                                        <FormField
                                        control={form.control}
                                        name={`characters.${index}.portraitUrl`}
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>URL du Portrait</FormLabel>
                                            <FormControl>
                                                <Input placeholder="https://example.com/image.png" {...field} value={field.value ?? ""} className="bg-background border"/>
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                        />
                                    </div>
                                    <Avatar className="h-20 w-20">
                                      <AvatarImage src={characterPortrait || undefined} alt={item.name} />
                                      <AvatarFallback><Users/></AvatarFallback>
                                    </Avatar>
                                </div>
                                <FormField
                                control={form.control}
                                name={`characters.${index}.details`}
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Détails (Description Initiale)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                        placeholder="Caractère, physique, rôle initial..."
                                        {...field}
                                        rows={3}
                                        className="bg-background border"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                                 {watchedValues.strategyMode && (
                                    <FormField
                                        control={form.control}
                                        name={`characters.${index}.factionColor`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Couleur de Faction</FormLabel>
                                                <FormControl>
                                                    <div className="flex items-center gap-2">
                                                        <Input type="color" {...field} value={field.value || ''} className="w-10 h-10 p-1"/>
                                                        <Input placeholder="#RRGGBB" {...field} value={field.value || ''} className="bg-background border"/>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                 )}
                                 {watchedValues.relationsMode && (
                                     <>
                                    <FormField
                                        control={form.control}
                                        name={`characters.${index}.affinity`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2"><Heart className="h-4 w-4"/> Affinité avec {watchedValues.playerName || "le Héros"}</FormLabel>
                                                <FormControl>
                                                    <div className="flex items-center gap-2">
                                                        <Slider
                                                            min={0} max={100} step={1}
                                                            defaultValue={[50]}
                                                            value={[field.value ?? 50]}
                                                            onValueChange={(value) => field.onChange(value[0])}
                                                        />
                                                        <span className="text-sm font-medium w-8 text-center">{field.value ?? 50}</span>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value="relations">
                                            <AccordionTrigger className="text-sm p-2 hover:no-underline">Relations</AccordionTrigger>
                                            <AccordionContent className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Label className="w-1/3 truncate text-xs">{watchedValues.playerName || 'Héros'}</Label>
                                                    <FormField
                                                        control={form.control}
                                                        name={`characters.${index}.relations.player`}
                                                        render={({ field }) => (
                                                            <Input {...field} value={field.value || ''} placeholder="Relation avec le joueur" className="h-8"/>
                                                        )}
                                                    />
                                                </div>
                                                {fields.filter((_, otherIndex) => otherIndex !== index).map(otherChar => (
                                                     <div key={otherChar.id} className="flex items-center gap-2">
                                                        <Label className="w-1/3 truncate text-xs">{otherChar.name}</Label>
                                                        <FormField
                                                            control={form.control}
                                                            name={`characters.${index}.relations.${otherChar.id}`}
                                                            render={({ field }) => (
                                                                <Input {...field} value={field.value || ''} placeholder={`Relation avec ${otherChar.name}`} className="h-8"/>
                                                            )}
                                                        />
                                                    </div>
                                                ))}
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                    </>
                                 )}
                            </CardContent>
                            </Card>
                          )
                        })}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => append({ id: `new-${Date.now()}`, name: "", details: "", portraitUrl: null, affinity: 50, relations: {}, factionColor: `#${Math.floor(Math.random()*16777215).toString(16)}` })}
                            className="mt-2 w-full"
                            >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Ajouter un personnage
                            </Button>
                            <FormDescription className="mt-2 text-xs">
                                Les détails complets (stats, etc.) sont gérés dans le panneau latéral une fois l'aventure commencée.
                            </FormDescription>
                            </div>
                        </ScrollArea>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
             <Dialog open={isItemEditorOpen} onOpenChange={setIsItemEditorOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingItem?.id.startsWith('cons-') ? "Modifier l'objet" : "Créer un nouvel objet"}</DialogTitle>
                    </DialogHeader>
                    {editingItem && (
                        <div className="space-y-4 py-4">
                             <div className="space-y-2">
                                <Label htmlFor="item-name">Nom</Label>
                                <Input id="item-name" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} />
                             </div>
                              <div className="space-y-2">
                                <Label htmlFor="item-desc">Description</Label>
                                <Textarea id="item-desc" value={editingItem.description} onChange={e => setEditingItem({...editingItem, description: e.target.value})} />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-2">
                                    <Label htmlFor="item-rarity">Rareté</Label>
                                    <Select value={editingItem.rarity} onValueChange={(v: BaseItem['rarity']) => setEditingItem({...editingItem, rarity: v})}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Commun">Commun</SelectItem>
                                            <SelectItem value="Rare">Rare</SelectItem>
                                            <SelectItem value="Epique">Épique</SelectItem>
                                            <SelectItem value="Légendaire">Légendaire</SelectItem>
                                            <SelectItem value="Divin">Divin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                 </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="item-value">Valeur (PO)</Label>
                                    <Input id="item-value" type="number" value={editingItem.baseGoldValue} onChange={e => setEditingItem({...editingItem, baseGoldValue: parseInt(e.target.value) || 0})} />
                                 </div>
                             </div>
                             <div className="space-y-2">
                                <Label htmlFor="item-universe">Univers</Label>
                                <Select value={editingItem.universe} onValueChange={(v: BaseItem['universe']) => setEditingItem({...editingItem, universe: v})}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Médiéval-Fantastique">Médiéval-Fantastique</SelectItem>
                                        <SelectItem value="Post-Apo">Post-Apo</SelectItem>
                                        <SelectItem value="Futuriste">Futuriste</SelectItem>
                                        <SelectItem value="Space-Opéra">Space-Opéra</SelectItem>
                                    </SelectContent>
                                </Select>
                             </div>
                             <div className="space-y-2">
                                <Label htmlFor="item-effect-type">Type d'effet</Label>
                                <Select value={editingItem.effectType} onValueChange={(v: BaseItem['effectType']) => setEditingItem({...editingItem, effectType: v, effectDetails: undefined })}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="narrative">Narratif</SelectItem>
                                        <SelectItem value="combat">Combat</SelectItem>
                                    </SelectContent>
                                </Select>
                             </div>
                             {editingItem.effectType === 'combat' && (
                                <Card className="p-4 bg-muted/50">
                                    <div className="space-y-2">
                                        <Label>Détails de l'effet de combat</Label>
                                        <Select value={editingItem.effectDetails?.type} onValueChange={(v: BaseItem['effectDetails']['type']) => setEditingItem({...editingItem, effectDetails: { type: v, amount: editingItem.effectDetails?.amount || 0}})}>
                                            <SelectTrigger><SelectValue placeholder="Choisir un effet..."/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="heal">Soin (cible: joueur)</SelectItem>
                                                <SelectItem value="damage_single">Dégâts (cible unique)</SelectItem>
                                                <SelectItem value="damage_all">Dégâts (tous les ennemis)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {editingItem.effectDetails?.type && (
                                            <Input type="number" placeholder="Quantité (ex: 10)" value={editingItem.effectDetails.amount} onChange={e => setEditingItem({...editingItem, effectDetails: {...editingItem.effectDetails!, amount: parseInt(e.target.value) || 0}})} />
                                        )}
                                    </div>
                                </Card>
                             )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsItemEditorOpen(false); setEditingItem(null); }}>Annuler</Button>
                        <Button onClick={handleSaveItem}>Sauvegarder</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </form>
        </Form>
    );
});
AdventureForm.displayName = "AdventureForm";

    
