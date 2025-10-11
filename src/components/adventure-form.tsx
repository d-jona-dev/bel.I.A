
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller, UseFieldArrayAppend } from "react-hook-form";
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
import { PlusCircle, Trash2, Upload, User, Users, Gamepad2, Coins, Dices, HelpCircle, BarChart2, Map, MapIcon, Link as LinkIcon, Heart, Clock, Box, FilePenLine, Search, PawPrint, ShieldHalf, Shield, Check, ChevronsUpDown, Clapperboard, BrainCircuit, Wand2, Eye, Replace, AlertTriangle, Languages, Loader2, UserCog, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { AdventureSettings, MapPointOfInterest, Character, PlayerAvatar, TimeManagementSettings, BaseItem, BaseFamiliarComponent, EnemyUnit, AiConfig, LocalizedText, PlayerInventoryItem } from '@/types';
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
import { BASE_CONSUMABLES, BASE_JEWELRY, BASE_ARMORS, BASE_WEAPONS, BASE_FAMILIAR_PHYSICAL_ITEMS, BASE_FAMILIAR_CREATURES, BASE_FAMILIAR_DESCRIPTORS } from "@/lib/items";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { BASE_ENEMY_UNITS } from "@/lib/enemies"; // Import base enemies
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { cn } from "@/lib/utils";
import { describeAppearance } from "@/ai/flows/describe-appearance";
import { translateText } from "@/ai/flows/translate-text";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { calculateEffectiveStats } from "@/hooks/systems/useAdventureState";


export type FormCharacterDefinition = {
  id?: string;
  name: string;
  details: string;
  portraitUrl?: string | null;
  faceSwapEnabled?: boolean;
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
    computedStats?: ReturnType<typeof calculateEffectiveStats>;
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
  faceSwapEnabled: z.boolean().optional(),
  appearanceDescription: z.string().optional(),
  factionColor: z.string().optional(),
  affinity: z.number().min(0).max(100).optional(),
  relations: z.record(z.string()).optional(),
  roleInStory: z.string().optional(),
}).refine(data => {
    // Si c'est un placeholder, seul le nom est requis
    if (data.isPlaceholder) return !!data.name;
    // Si ce n'est pas un placeholder et qu'un champ est rempli, les deux doivent l'être
    if (data.name || data.details) return !!(data.name && data.details);
    // Si les deux sont vides, c'est ok (en cours de création)
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
    defenderUnitIds: z.array(z.string()).optional(), // Add defenderUnitIds to schema
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
  world: z.record(z.string()).refine(val => Object.keys(val).length > 0 && Object.values(val).some(v => v.trim() !== ''), { message: "La description du monde est requise dans au moins une langue."}),
  initialSituation: z.record(z.string()).refine(val => Object.keys(val).length > 0 && Object.values(val).some(v => v.trim() !== ''), { message: "La situation initiale est requise dans au moins une langue."}),
  characters: z.array(characterSchema).optional(),
  rpgMode: z.boolean().default(true).optional(),
  relationsMode: z.boolean().default(true).optional(),
  strategyMode: z.boolean().default(true).optional(),
  comicModeActive: z.boolean().default(false).optional(),
  playerName: z.string().optional().default("Player").describe("Le nom du personnage joueur."),
  playerPortraitUrl: z.string().url().optional().or(z.literal("")).nullable(),
  playerFaceSwapEnabled: z.boolean().optional(),
  playerAppearanceDescription: z.string().optional(),
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
  computedStats: z.any().optional(), // To hold calculated stats without being part of the form data itself
});


const LocalizedTextArea = ({ name, label, placeholder, rows, form }: { name: "world" | "initialSituation", label: string, placeholder: string, rows: number, form: any }) => {
    const { toast } = useToast();
    const [currentLang, setCurrentLang] = React.useState('fr');
    const [isTranslating, setIsTranslating] = React.useState(false);

    const availableLangs = ['fr', 'en', 'es', 'it', 'ja', 'de', 'ru', 'zh'];

    const handleTranslateField = async (targetLang: string) => {
        const sourceText = form.getValues(`${name}.${currentLang}`);
        if (!sourceText) {
            toast({ title: "Texte manquant", description: "Veuillez d'abord écrire une description dans la langue actuelle.", variant: "destructive" });
            return;
        }
        setIsTranslating(true);
        try {
            const result = await translateText({ text: sourceText, language: targetLang });
            form.setValue(`${name}.${targetLang}`, result.translatedText, { shouldValidate: true, shouldDirty: true });
            setCurrentLang(targetLang);
            toast({ title: "Traduction réussie!" });
        } catch (e) {
            console.error(e);
            toast({ title: "Erreur de traduction", description: e instanceof Error ? e.message : "Erreur inconnue", variant: "destructive" });
        } finally {
            setIsTranslating(false);
        }
    };
    
    return (
        <FormItem>
            <div className="flex justify-between items-center">
                <FormLabel className="flex items-center">
                    {label}
                    {!form.watch(`${name}.${currentLang}`) && <AlertTriangle className="h-4 w-4 text-amber-500 ml-2" />}
                </FormLabel>
                <div className="flex items-center gap-1">
                     {isTranslating && <Loader2 className="h-4 w-4 animate-spin"/>}
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="xs" className="flex gap-1">
                                <Languages className="h-4 w-4"/>
                                Traduire
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {availableLangs.filter(lang => lang !== currentLang).map(lang => (
                                <DropdownMenuItem key={lang} onSelect={() => handleTranslateField(lang)}>
                                    vers {lang.toUpperCase()}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                     <Select value={currentLang} onValueChange={setCurrentLang}>
                        <SelectTrigger className="w-[80px] h-7 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                             {availableLangs.map(lang => (
                                <SelectItem key={lang} value={lang} className={cn(form.getValues(`${name}.${lang}`) ? "font-bold" : "font-normal")}>
                                    {lang.toUpperCase()}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
             <FormControl>
                <Textarea
                    placeholder={placeholder}
                    value={form.getValues(`${name}.${currentLang}`) || ''}
                    onChange={(e) => form.setValue(`${name}.${currentLang}`, e.target.value, { shouldValidate: true, shouldDirty: true })}
                    rows={rows}
                    className="bg-background border"
                />
            </FormControl>
            <FormMessage />
        </FormItem>
    );
};


export const AdventureForm = React.forwardRef<AdventureFormHandle, AdventureFormProps>(
    ({ initialValues, onFormValidityChange, rpgMode, relationsMode, strategyMode, aiConfig }, ref) => {
    const { toast } = useToast();
    const [savedAvatars, setSavedAvatars] = React.useState<PlayerAvatar[]>([]);
    
    const [allUniverses, setAllUniverses] = React.useState<string[]>(['Médiéval-Fantastique', 'Post-Apo', 'Futuriste', 'Space-Opéra']);
    const [newUniverse, setNewUniverse] = React.useState('');

    // Item States
    const [consumables, setConsumables] = React.useState<BaseItem[]>([]);
    const [weapons, setWeapons] = React.useState<BaseItem[]>([]);
    const [armors, setAllArmors] = React.useState<BaseItem[]>([]);
    const [jewelry, setAllJewelry] = React.useState<BaseItem[]>([]);

    // Familiar Component States
    const [physicalFamiliarItems, setPhysicalFamiliarItems] = React.useState<BaseFamiliarComponent[]>([]);
    const [creatureFamiliarItems, setCreatureFamiliarItems] = React.useState<BaseFamiliarComponent[]>([]);
    const [descriptorFamiliarItems, setDescriptorFamiliarItems] = React.useState<BaseFamiliarComponent[]>([]);
    
    const [editingItem, setEditingItem] = React.useState<BaseItem | null>(null);
    const [isItemEditorOpen, setIsItemEditorOpen] = React.useState(false);
    const [editingItemType, setEditingItemType] = React.useState<BaseItem['type']>('consumable');

    // Familiar Component Editor State
    const [editingFamiliarComponent, setEditingFamiliarComponent] = React.useState<BaseFamiliarComponent | null>(null);
    const [isFamiliarEditorOpen, setIsFamiliarEditorOpen] = React.useState(false);
    const [editingFamiliarComponentType, setEditingFamiliarComponentType] = React.useState<'physical' | 'creature' | 'descriptor'>('physical');
    
    const [newPoiName, setNewPoiName] = React.useState("");
    const [newPoiDescription, setNewPoiDescription] = React.useState("");
    const [newPoiType, setNewPoiType] = React.useState<MapPointOfInterest['icon']>("Village");
    const [newPoiOwnerId, setNewPoiOwnerId] = React.useState(initialValues.playerName || 'player');
    const [newPoiLevel, setNewPoiLevel] = React.useState(1);
    const [newPoiBuildings, setNewPoiBuildings] = React.useState<string[]>([]);
    
    const [isDebugItemsOpen, setIsDebugItemsOpen] = React.useState(false);
    const [debugItems, setDebugItems] = React.useState<Record<string, BaseItem[]>>({});
    
    // NEW: Enemy Management State
    const [enemies, setEnemies] = React.useState<EnemyUnit[]>([]);
    const [editingEnemy, setEditingEnemy] = React.useState<EnemyUnit | null>(null);
    const [isEnemyEditorOpen, setIsEnemyEditorOpen] = React.useState(false);

    const form = useForm<AdventureFormValues>({
        resolver: zodResolver(adventureFormSchema),
        defaultValues: initialValues,
        mode: "onChange",
    });
    
    React.useEffect(() => {
        form.reset(initialValues);
    }, [initialValues, form]);


     React.useEffect(() => {
        try {
            const storedAvatars = localStorage.getItem('playerAvatars_v2');
            if (storedAvatars) setSavedAvatars(JSON.parse(storedAvatars));

            const storedUniverses = localStorage.getItem('custom_universes');
            if (storedUniverses) {
                const customUniverses = JSON.parse(storedUniverses);
                setAllUniverses(prev => Array.from(new Set([...prev, ...customUniverses])));
            }
            
            const loadData = (key: string, baseData: any[]) => {
              try {
                const storedData = localStorage.getItem(key);
                return storedData ? JSON.parse(storedData) : baseData;
              } catch {
                return baseData;
              }
            };
            
            setConsumables(loadData('custom_consumables', BASE_CONSUMABLES));
            setWeapons(loadData('custom_weapons', BASE_WEAPONS));
            setAllArmors(loadData('custom_armors', BASE_ARMORS));
            setAllJewelry(loadData('custom_jewelry', BASE_JEWELRY));
            setPhysicalFamiliarItems(loadData('custom_familiar_physical', BASE_FAMILIAR_PHYSICAL_ITEMS));
            setCreatureFamiliarItems(loadData('custom_familiar_creatures', BASE_FAMILIAR_CREATURES));
            setDescriptorFamiliarItems(loadData('custom_familiar_descriptors', BASE_FAMILIAR_DESCRIPTORS));
            
            // Load enemies
            const customEnemies = loadData('custom_enemies', []);
            const allEnemies = [...BASE_ENEMY_UNITS, ...customEnemies].reduce((acc, current) => {
                if (!acc.find(item => item.id === current.id)) {
                    acc.push(current);
                }
                return acc;
            }, [] as EnemyUnit[]);
            setEnemies(allEnemies);

        } catch (error) {
            console.error("Failed to load data from localStorage", error);
        }
    }, []);
    
    // NEW: Enemy Management Functions
    const saveEnemies = (updatedEnemies: EnemyUnit[]) => {
        const customEnemies = updatedEnemies.filter(enemy => !BASE_ENEMY_UNITS.some(base => base.id === enemy.id));
        setEnemies(updatedEnemies);
        localStorage.setItem('custom_enemies', JSON.stringify(customEnemies));
    };

    const handleSaveEnemy = () => {
        if (!editingEnemy || !editingEnemy.name.trim()) {
            toast({ title: "Erreur", description: "Le nom de l'ennemi est requis.", variant: "destructive" });
            return;
        }
        
        const isNew = editingEnemy.id.startsWith('new-');
        let updatedEnemies;

        if (isNew) {
            const newEnemy = {...editingEnemy, id: `custom-${editingEnemy.name.toLowerCase().replace(/\s/g, '-')}-${Date.now()}`};
            updatedEnemies = [...enemies, newEnemy];
        } else {
            updatedEnemies = enemies.map(e => e.id === editingEnemy.id ? editingEnemy : e);
        }
        
        saveEnemies(updatedEnemies);
        toast({ title: "Ennemi Sauvegardé", description: `"${editingEnemy.name}" a été mis à jour.`});
        setIsEnemyEditorOpen(false);
        setEditingEnemy(null);
    };
    
    const handleAddNewEnemy = () => {
        setEditingEnemy({
            id: `new-enemy-${Date.now()}`,
            name: "",
            race: "",
            class: "",
            level: 1,
            hitPoints: 10,
            armorClass: 10,
            attackBonus: 0,
            damage: "1d6",
            expValue: 10,
            goldValue: 5,
            universe: 'Médiéval-Fantastique',
            lootTable: [],
        });
        setIsEnemyEditorOpen(true);
    };

    const handleDeleteEnemy = (enemyId: string) => {
        const enemyToDelete = enemies.find(e => e.id === enemyId);
        if (enemyToDelete && BASE_ENEMY_UNITS.some(base => base.id === enemyId)) {
            toast({ title: "Suppression Impossible", description: "Vous ne pouvez pas supprimer un ennemi de base.", variant: 'destructive'});
            return;
        }
        const updatedEnemies = enemies.filter(e => e.id !== enemyId);
        saveEnemies(updatedEnemies);
        toast({ title: "Ennemi Supprimé" });
    };

    const handleLootTableChange = (enemyId: string, itemId: string, checked: boolean) => {
        if (!editingEnemy || editingEnemy.id !== enemyId) return;

        let newLootTable = [...(editingEnemy.lootTable || [])];
        if (checked) {
            if (!newLootTable.some(item => item.itemId === itemId)) {
                newLootTable.push({ itemId, dropChance: 0.1 }); // Default drop chance
            }
        } else {
            newLootTable = newLootTable.filter(item => item.itemId !== itemId);
        }
        setEditingEnemy({ ...editingEnemy, lootTable: newLootTable });
    };

    const handleDropChanceChange = (enemyId: string, itemId: string, chance: number) => {
        if (!editingEnemy || editingEnemy.id !== enemyId) return;
        const newLootTable = (editingEnemy.lootTable || []).map(item =>
            item.itemId === itemId ? { ...item, dropChance: chance } : item
        );
        setEditingEnemy({ ...editingEnemy, lootTable: newLootTable });
    };


    const saveItems = (type: BaseItem['type'], items: BaseItem[]) => {
        const keyMap = {
            consumable: 'custom_consumables',
            weapon: 'custom_weapons',
            armor: 'custom_armors',
            jewelry: 'custom_jewelry',
        };
        const stateSetterMap = {
            consumable: setConsumables,
            weapon: setWeapons,
            armor: setAllArmors,
            jewelry: setAllJewelry,
        };
        
        const key = keyMap[type as keyof typeof keyMap];
        const setter = stateSetterMap[type as keyof typeof stateSetterMap];

        if (key && setter) {
            setter(items);
            localStorage.setItem(key, JSON.stringify(items));
        }
    };
    
    const getItemsForType = (type: BaseItem['type']): BaseItem[] => {
        switch(type) {
            case 'consumable': return consumables;
            case 'weapon': return weapons;
            case 'armor': return armors;
            case 'jewelry': return jewelry;
            default: return [];
        }
    }

    const saveFamiliarComponents = (type: 'physical' | 'creature' | 'descriptor', components: BaseFamiliarComponent[]) => {
        const keyMap = {
            physical: 'custom_familiar_physical',
            creature: 'custom_familiar_creatures',
            descriptor: 'custom_familiar_descriptors'
        };
        const stateSetterMap = {
            physical: setPhysicalFamiliarItems,
            creature: setCreatureFamiliarItems,
            descriptor: setDescriptorFamiliarItems
        };
        const key = keyMap[type];
        const setter = stateSetterMap[type];
        setter(components);
        localStorage.setItem(key, JSON.stringify(components));
    }

    const getFamiliarComponentsForType = (type: 'physical' | 'creature' | 'descriptor'): BaseFamiliarComponent[] => {
        switch (type) {
            case 'physical': return physicalFamiliarItems;
            case 'creature': return creatureFamiliarItems;
            case 'descriptor': return descriptorFamiliarItems;
            default: return [];
        }
    }

    const handleSaveFamiliarComponent = () => {
        if (!editingFamiliarComponent || !editingFamiliarComponent.name.trim()) {
            toast({ title: "Erreur", description: "Le nom du composant est requis.", variant: "destructive" });
            return;
        }

        const components = getFamiliarComponentsForType(editingFamiliarComponentType);
        const isNew = editingFamiliarComponent.id.startsWith('new-');
        let updatedComponents;

        if (isNew) {
            updatedComponents = [...components, editingFamiliarComponent];
        } else {
            updatedComponents = components.map(c => c.id === editingFamiliarComponent.id ? editingFamiliarComponent : c);
        }
        
        saveFamiliarComponents(editingFamiliarComponentType, updatedComponents);
        toast({ title: "Composant de familier sauvegardé", description: `"${editingFamiliarComponent.name}" a été mis à jour.` });
        setIsFamiliarEditorOpen(false);
        setEditingFamiliarComponent(null);
    };

    const handleAddNewFamiliarComponent = (type: 'physical' | 'creature' | 'descriptor') => {
        setEditingFamiliarComponentType(type);
        setEditingFamiliarComponent({
            id: `new-${type.slice(0,3)}-${Date.now()}`,
            name: "",
            universe: 'Médiéval-Fantastique',
        });
        setIsFamiliarEditorOpen(true);
    };

    const handleDeleteFamiliarComponent = (componentId: string, type: 'physical' | 'creature' | 'descriptor') => {
        const components = getFamiliarComponentsForType(type);
        const updatedComponents = components.filter(c => c.id !== componentId);
        saveFamiliarComponents(type, updatedComponents);
        toast({ title: "Composant de familier supprimé" });
    };


    const handleSaveItem = () => {
        if (!editingItem || !editingItem.name.trim()) {
            toast({ title: "Erreur", description: "Le nom de l'objet est requis.", variant: "destructive" });
            return;
        }

        const items = getItemsForType(editingItem.type);
        const isNew = !items.some(item => item.id === editingItem.id);
        let updatedItems;

        if (isNew) {
            updatedItems = [...items, editingItem];
        } else {
            updatedItems = items.map(item => item.id === editingItem.id ? editingItem : item);
        }
        
        saveItems(editingItem.type, updatedItems);
        toast({ title: "Objet sauvegardé", description: `"${editingItem.name}" a été mis à jour.` });
        setIsItemEditorOpen(false);
        setEditingItem(null);
    };

    const handleAddNewItem = (type: BaseItem['type']) => {
        setEditingItemType(type);
        setEditingItem({
            id: `${type.slice(0,4)}-${Date.now()}`,
            name: "",
            description: "",
            type: type,
            baseGoldValue: 5,
            universe: 'Médiéval-Fantastique',
            rarity: 'Commun',
            effectType: 'narrative',
            statBonuses: {},
        });
        setIsItemEditorOpen(true);
    };

    const handleDeleteItem = (itemId: string, type: BaseItem['type']) => {
        const items = getItemsForType(type);
        const updatedItems = items.filter(item => item.id !== itemId);
        saveItems(type, updatedItems);
        toast({ title: "Objet supprimé" });
    };

    const handleAddUniverse = () => {
        if (newUniverse && !allUniverses.includes(newUniverse)) {
            const updatedUniverses = [...allUniverses, newUniverse];
            setAllUniverses(updatedUniverses);
            const customUniverses = updatedUniverses.filter(u => !['Médiéval-Fantastique', 'Post-Apo', 'Futuriste', 'Space-Opéra'].includes(u));
            localStorage.setItem('custom_universes', JSON.stringify(customUniverses));
            setNewUniverse('');
            toast({ title: 'Univers ajouté', description: `L'univers "${newUniverse}" est maintenant disponible.`});
        }
    };
    
    const handleDeleteUniverse = (universeToDelete: string) => {
        const defaultUniverses = ['Médiéval-Fantastique', 'Post-Apo', 'Futuriste', 'Space-Opéra'];
        if (defaultUniverses.includes(universeToDelete)) {
            toast({ title: 'Suppression impossible', description: 'Vous ne pouvez pas supprimer un univers par défaut.', variant: 'destructive'});
            return;
        }
        const updatedUniverses = allUniverses.filter(u => u !== universeToDelete);
        setAllUniverses(updatedUniverses);
        const customUniverses = updatedUniverses.filter(u => !defaultUniverses.includes(u));
        localStorage.setItem('custom_universes', JSON.stringify(customUniverses));
        form.setValue('activeItemUniverses', form.getValues('activeItemUniverses')?.filter(u => u !== universeToDelete));
        toast({ title: 'Univers supprimé', description: `L'univers "${universeToDelete}" a été retiré.`});
    };
    
    const runItemDebug = () => {
        const activeUniverses = form.getValues('activeItemUniverses') || [];
        const rarityOrder: { [key in BaseItem['rarity'] as string]: number } = { 'Commun': 1, 'Rare': 2, 'Epique': 3, 'Légendaire': 4, 'Divin': 5 };
        const inventoryConfig: Record<number, { size: number, minRarity: number, maxRarity: number }> = {
            1: { size: 3, minRarity: 1, maxRarity: 1 }, 2: { size: 4, minRarity: 1, maxRarity: 2 },
            3: { size: 5, minRarity: 1, maxRarity: 3 }, 4: { size: 6, minRarity: 2, maxRarity: 4 },
            5: { size: 7, minRarity: 3, maxRarity: 5 }, 6: { size: 10, minRarity: 4, maxRarity: 5 },
        };
        const buildingToSourceMap = {
            'forgeron': [...weapons, ...armors],
            'bijoutier': jewelry,
            'magicien': consumables,
        };

        let debugResults: Record<string, BaseItem[]> = {};

        for (const [building, sourcePool] of Object.entries(buildingToSourceMap)) {
            for (let level = 1; level <= 6; level++) {
                const config = inventoryConfig[level];
                const itemsInUniverse = sourcePool.filter(item => activeUniverses.includes(item.universe));
                const availableItems = itemsInUniverse.filter(item => {
                    const itemRarityValue = rarityOrder[item.rarity || 'Commun'] || 1;
                    return itemRarityValue >= config.minRarity && itemRarityValue <= config.maxRarity;
                });
                debugResults[`${building}-Niv${level}`] = availableItems;
            }
        }
        setDebugItems(debugResults);
        setIsDebugItemsOpen(true);
    };

    const { fields, append, remove, update } = useFieldArray({
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
        append: append as UseFieldArrayAppend<AdventureFormValues, "characters">,
    }));

    React.useEffect(() => {
        if (onFormValidityChange) {
            const subscription = form.watch(() => {
                onFormValidityChange(form.formState.isValid);
            });
            return () => subscription.unsubscribe();
        }
    }, [form, onFormValidityChange]);


    
    const { fields: poiFields, append: appendPoi, remove: removePoi, update: updatePoi } = useFieldArray({
        control: form.control,
        name: "mapPointsOfInterest"
    });


    const handleLoadPrompt = () => {
        const loadedData: AdventureFormValues = {
            world: {
                fr: "Grande université populaire nommée \"hight scoole of futur\".",
                en: "Large popular university named 'hight scoole of futur'."
            },
            initialSituation: {
                fr: "Utilisateur marche dans les couloirs de hight scoole of futur et découvre sa petite amie discuter avec son meilleur ami, ils ont l'air très proches, trop proches ...",
                en: "User is walking down the halls of 'hight scoole of futur' and discovers his girlfriend talking with his best friend, they seem very close, too close..."
            },
            characters: [
                { id: 'rina-prompt-1', name: "Rina", details: "jeune femme de 19 ans, petite amie de Utilisateur , se rapproche du meilleur ami de Utilisateur, étudiante à hight scoole of futur, calme, aimante, parfois un peu secrète, fille populaire de l'école, 165 cm, yeux marron, cheveux mi-long brun, traits fin, corpulence athlétique.", portraitUrl: null, faceSwapEnabled: false, factionColor: '#FF69B4', affinity: 95, relations: { 'player': "Petite amie", "kentaro-prompt-1": "Ami d'enfance" }, roleInStory: "Petite amie" },
                { id: 'kentaro-prompt-1', name: "Kentaro", details: "Jeune homme de 20, meilleur ami de utilisateur, étudiant à hight scoole of futur, garçon populaire, charmant, 185 cm, athlétique voir costaud, yeux bleu, cheveux court blond, calculateur, impulsif, aime dragué les filles, se rapproche de la petite amie de Utilisateur, aime voir son meilleur ami souffrir.", portraitUrl: null, faceSwapEnabled: false, factionColor: '#4682B4', affinity: 30, relations: { 'player': "Meilleur ami (en apparence)", "rina-prompt-1": "Intérêt amoureux secret" } }
            ],
            rpgMode: true,
            relationsMode: true,
            strategyMode: true,
            comicModeActive: true,
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
        const avatar = savedAvatars.find(a => a.id === avatarId);
        if (avatar) {
            form.setValue('playerName', avatar.name);
            form.setValue('playerClass', avatar.class);
            form.setValue('playerLevel', avatar.level);
            form.setValue('playerDetails', avatar.details);
            form.setValue('playerDescription', avatar.description);
            form.setValue('playerOrientation', avatar.orientation);
            form.setValue('playerPortraitUrl', avatar.portraitUrl);
        } else { // Custom hero reset
            form.setValue('playerName', 'Héros');
            form.setValue('playerClass', 'Aventurier');
            form.setValue('playerLevel', 1);
            form.setValue('playerDetails', '');
            form.setValue('playerDescription', '');
            form.setValue('playerOrientation', '');
            form.setValue('playerPortraitUrl', null);
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

    const rarityColorClass = (rarity?: 'Commun' | 'Rare' | 'Epique' | 'Légendaire' | 'Divin') => {
        switch (rarity) {
          case 'Commun': return 'text-gray-500';
          case 'Rare': return 'text-blue-500';
          case 'Epique': return 'text-purple-500';
          case 'Légendaire': return 'text-orange-500';
          case 'Divin': return 'text-yellow-400';
          default: return 'text-gray-500';
        }
    };

    const renderFamiliarComponentManager = (type: 'physical' | 'creature' | 'descriptor', title: string, components: BaseFamiliarComponent[]) => (
        <div className="p-2 border rounded-lg bg-background">
            <div className="flex justify-between items-center mb-2">
                <h5 className="font-semibold text-xs">{title}</h5>
                <Button size="xs" variant="outline" onClick={() => handleAddNewFamiliarComponent(type)}><PlusCircle className="mr-1 h-3 w-3"/> Ajouter</Button>
            </div>
            <ScrollArea className="h-40">
                <div className="space-y-1 pr-2">
                    {components.map(comp => (
                         <div key={comp.id} className="flex justify-between items-center text-xs p-1 rounded bg-muted/50">
                            <span>{comp.name} <span className="text-muted-foreground">({comp.universe})</span></span>
                            <div>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingFamiliarComponentType(type); setEditingFamiliarComponent(comp); setIsFamiliarEditorOpen(true); }}><FilePenLine className="h-3 w-3"/></Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDeleteFamiliarComponent(comp.id, type)}><Trash2 className="h-3 w-3"/></Button>
                            </div>
                         </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
    const renderItemManager = (type: BaseItem['type'], title: string, items: BaseItem[]) => (
        <div className="p-2 border rounded-lg">
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold">{title}</h4>
                <Button size="sm" variant="outline" onClick={() => handleAddNewItem(type)}><PlusCircle className="mr-2 h-4 w-4"/>Ajouter</Button>
            </div>
            <ScrollArea className="h-64">
                <div className="space-y-2 pr-2">
                {items.map(item => (
                    <Card key={item.id} className="p-2 bg-muted/20">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-sm">{item.name}</p>
                                <p className={`text-xs font-semibold ${rarityColorClass(item.rarity)}`}>{item.rarity}</p>
                            </div>
                             <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingItemType(type); setEditingItem(JSON.parse(JSON.stringify(item))); setIsItemEditorOpen(true); }}><FilePenLine className="h-4 w-4"/></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteItem(item.id, type)}><Trash2 className="h-4 w-4"/></Button>
                             </div>
                        </div>
                    </Card>
                ))}
                </div>
            </ScrollArea>
        </div>
    );

    const bonusFor = (stat: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'): number => {
        return watchedValues.computedStats?.bonuses?.[stat] || 0;
    };


    return (
        <Form {...form}>
        <form className="space-y-4 p-1" onSubmit={(e) => e.preventDefault()}>

            <div className="space-y-4">
                <div className="flex justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={handleLoadPrompt}>
                        <Upload className="mr-2 h-4 w-4" /> Charger Prompt Exemple
                    </Button>
                </div>
                
                <LocalizedTextArea
                    name="world"
                    label="Monde"
                    placeholder="Décrivez l'univers de votre aventure..."
                    rows={4}
                    form={form}
                />
                
                <LocalizedTextArea
                    name="initialSituation"
                    label="Situation Initiale"
                    placeholder="Comment commence l'aventure pour le héros ?"
                    rows={3}
                    form={form}
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
                     <FormField
                        control={form.control}
                        name="comicModeActive"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background">
                                <div className="space-y-0.5">
                                    <FormLabel className="flex items-center gap-2 text-sm"><Clapperboard className="h-4 w-4"/> Mode BD (Narration Avancée)</FormLabel>
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
                                            <div className="mb-4 flex justify-between items-center">
                                                <div>
                                                    <FormLabel className="text-base flex items-center gap-2"><Box className="h-5 w-5" /> Univers d'Objets Actifs</FormLabel>
                                                    <FormDescription>
                                                        Sélectionnez les univers dont les objets pourront apparaître.
                                                    </FormDescription>
                                                </div>
                                                <Dialog open={isDebugItemsOpen} onOpenChange={setIsDebugItemsOpen}>
                                                    <DialogTrigger asChild>
                                                        <Button variant="secondary" size="sm" onClick={runItemDebug}><Search className="mr-2 h-4 w-4" /> Vérifier</Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-[80vw]">
                                                        <DialogHeader>
                                                            <DialogTitle>Vérification des Inventaires de Marchands</DialogTitle>
                                                            <DialogDescription>
                                                                Voici les objets disponibles pour chaque marchand à chaque niveau de ville, basés sur les univers actifs.
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <ScrollArea className="h-[70vh] p-4">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                {Object.entries(debugItems).map(([key, items]) => (
                                                                    <Card key={key}>
                                                                        <CardHeader className="p-3">
                                                                            <CardTitle className="text-sm capitalize">{key.replace('-', ' - ')}</CardTitle>
                                                                        </CardHeader>
                                                                        <CardContent className="p-3">
                                                                            {items.length === 0 ? <p className="text-xs text-muted-foreground italic">Aucun objet disponible.</p> : (
                                                                                <ul className="text-xs space-y-1">
                                                                                    {items.map(item => <li key={item.id} className={rarityColorClass(item.rarity)}>{item.name} ({item.rarity})</li>)}
                                                                                </ul>
                                                                            )}
                                                                        </CardContent>
                                                                    </Card>
                                                                ))}
                                                            </div>
                                                        </ScrollArea>
                                                    </DialogContent>
                                                </Dialog>

                                            </div>
                                            <div className="space-y-2">
                                                {allUniverses.map((universe) => (
                                                    <div key={universe} className="flex items-center justify-between">
                                                        <FormField
                                                            control={form.control}
                                                            name="activeItemUniverses"
                                                            render={({ field: checkboxField }) => {
                                                                return (
                                                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                                                        <FormControl>
                                                                            <Checkbox
                                                                                checked={checkboxField.value?.includes(universe)}
                                                                                onCheckedChange={(checked) => {
                                                                                    return checked
                                                                                        ? checkboxField.onChange([...(checkboxField.value || []), universe])
                                                                                        : checkboxField.onChange((checkboxField.value || []).filter((value) => value !== universe))
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
                                                        {!['Médiéval-Fantastique', 'Post-Apo', 'Futuriste', 'Space-Opéra'].includes(universe) && (
                                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteUniverse(universe)}>
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex gap-2 mt-4">
                                    <Input
                                        value={newUniverse}
                                        onChange={(e) => setNewUniverse(e.target.value)}
                                        placeholder="Nom du nouvel univers..."
                                    />
                                    <Button onClick={handleAddUniverse} type="button">Ajouter</Button>
                                </div>
                                <Separator className="my-4" />
                                <Tabs defaultValue="consumables">
                                    <TabsList className="grid w-full grid-cols-5">
                                        <TabsTrigger value="consumables">Consommables</TabsTrigger>
                                        <TabsTrigger value="weapons">Armes</TabsTrigger>
                                        <TabsTrigger value="armors">Armures</TabsTrigger>
                                        <TabsTrigger value="jewelry">Bijoux</TabsTrigger>
                                        <TabsTrigger value="familiars">Familiers</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="consumables" className="mt-4">
                                        {renderItemManager('consumable', 'Consommables', consumables)}
                                    </TabsContent>
                                    <TabsContent value="weapons" className="mt-4">
                                        {renderItemManager('weapon', 'Armes', weapons)}
                                    </TabsContent>
                                     <TabsContent value="armors" className="mt-4">
                                        {renderItemManager('armor', 'Armures', armors)}
                                    </TabsContent>
                                     <TabsContent value="jewelry" className="mt-4">
                                        {renderItemManager('jewelry', 'Bijoux', jewelry)}
                                    </TabsContent>
                                     <TabsContent value="familiars" className="mt-4 space-y-4">
                                        <div className="p-2 border rounded-lg bg-muted/20">
                                            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><PawPrint className="h-4 w-4"/>Composants de Familiers</h4>
                                            {renderFamiliarComponentManager('physical', 'Objets Physiques', physicalFamiliarItems)}
                                            <Separator className="my-4" />
                                            {renderFamiliarComponentManager('creature', 'Types de Créatures', creatureFamiliarItems)}
                                            <Separator className="my-4" />
                                            {renderFamiliarComponentManager('descriptor', 'Descripteurs', descriptorFamiliarItems)}
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </Card>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="enemy-config">
                        <AccordionTrigger>Configuration des Ennemis</AccordionTrigger>
                        <AccordionContent className="pt-2 space-y-4">
                             <div className="flex justify-between items-center">
                                <CardDescription>Gérez la base de données des unités ennemies.</CardDescription>
                                <Button size="sm" variant="outline" onClick={handleAddNewEnemy}><PlusCircle className="mr-2 h-4 w-4"/>Ajouter</Button>
                            </div>
                            <ScrollArea className="h-96 border rounded-md p-2">
                                <div className="space-y-2">
                                    {enemies.map(enemy => (
                                        <Card key={enemy.id} className="p-2 flex justify-between items-center bg-muted/20">
                                            <div>
                                                <p className="font-semibold text-sm">{enemy.name} <span className="text-xs text-muted-foreground">(Niv. {enemy.level}, {enemy.race})</span></p>
                                                <p className="text-xs text-muted-foreground">{enemy.class}</p>
                                            </div>
                                            <div className="flex gap-1">
                                                {!BASE_ENEMY_UNITS.some(base => base.id === enemy.id) && (
                                                     <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteEnemy(enemy.id)}>
                                                        <Trash2 className="h-4 w-4"/>
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingEnemy(JSON.parse(JSON.stringify(enemy))); setIsEnemyEditorOpen(true);}}>
                                                    <FilePenLine className="h-4 w-4"/>
                                                </Button>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </ScrollArea>
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


                <Accordion type="single" collapsible className="w-full">
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
                                        <FormField control={form.control} name="playerPortraitUrl" render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>URL du Portrait</FormLabel>
                                            <FormControl>
                                              <Input 
                                                placeholder="https://example.com/portrait.png" 
                                                {...field}
                                                value={field.value || ''}
                                                onBlur={(e) => form.setValue('playerPortraitUrl', e.target.value, { shouldValidate: true, shouldDirty: true })}
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}/>
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
                                            <div className="grid grid-cols-3 gap-x-3 gap-y-2">
                                                {(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const).map(attr => {
                                                    const bonusValue = bonusFor(attr);
                                                    return (
                                                         <FormField
                                                            key={attr}
                                                            control={form.control}
                                                            name={`player${attr.charAt(0).toUpperCase() + attr.slice(1)}` as any}
                                                            render={({ field }) => (
                                                              <FormItem>
                                                                <div className="flex items-center justify-between">
                                                                  <FormLabel className="text-xs capitalize">{attr}</FormLabel>
                                                                  {bonusValue > 0 && (
                                                                      <span className="text-xs font-bold text-green-600">[+{bonusValue}]</span>
                                                                  )}
                                                                </div>
                                                                <FormControl>
                                                                  <Input
                                                                    type="number"
                                                                    {...field}
                                                                    onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                                                                    onBlur={() => handleAttributeBlur(`player${attr.charAt(0).toUpperCase() + attr.slice(1)}` as any)}
                                                                    className="h-8"
                                                                  />
                                                                </FormControl>
                                                              </FormItem>
                                                            )}
                                                          />
                                                    )
                                                })}
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
                                             <FormField
                                                control={form.control}
                                                name={`mapPointsOfInterest.${index}.defenderUnitIds`}
                                                render={({ field: defenderField }) => (
                                                <FormItem>
                                                    <FormLabel className="flex items-center gap-2"><Shield className="h-4 w-4"/> Défenseurs</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    variant="outline"
                                                                    role="combobox"
                                                                    className={cn(
                                                                        "w-full justify-between h-auto text-left font-normal",
                                                                        !defenderField.value && "text-muted-foreground"
                                                                    )}
                                                                >
                                                                    {defenderField.value && defenderField.value.length > 0 ? (
                                                                        <div className="flex flex-col items-start">
                                                                            {defenderField.value.map(id => (
                                                                                <span key={id} className="block truncate text-xs p-0.5">- {enemies.find(e => e.id === id)?.name || id}</span>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-muted-foreground">Défenseurs...</span>
                                                                    )}
                                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                            <Command>
                                                                <CommandInput placeholder="Rechercher un ennemi..." />
                                                                <CommandList>
                                                                <CommandEmpty>Aucun ennemi trouvé.</CommandEmpty>
                                                                <CommandGroup>
                                                                    {enemies.map((enemy) => (
                                                                    <CommandItem
                                                                        value={enemy.name}
                                                                        key={enemy.id}
                                                                        onSelect={() => {
                                                                            const selected = defenderField.value || [];
                                                                            const newSelection = selected.includes(enemy.id)
                                                                                ? selected.filter(id => id !== enemy.id)
                                                                                : [...selected, enemy.id];
                                                                            defenderField.onChange(newSelection);
                                                                        }}
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            (defenderField.value || []).includes(enemy.id)
                                                                                ? "opacity-100"
                                                                                : "opacity-0"
                                                                            )}
                                                                        />
                                                                        {enemy.name}
                                                                    </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormDescription className="text-xs">
                                                        Garnison qui défendra ce lieu en cas d'attaque.
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                                )}
                                            />
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
                                                                    <SelectItem key={level} value={String(level)}>
                                                                        Niveau {level} - {poiLevelNameMap[currentPoiType]?.[level] || `Type ${level}`}
                                                                    </SelectItem>
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
                                                                render={({ field: checkboxField }) => (
                                                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                                        <FormControl>
                                                                            <Checkbox
                                                                                checked={checkboxField.value?.includes(building.id)}
                                                                                onCheckedChange={(checked) => {
                                                                                    const currentBuildings = checkboxField.value || [];
                                                                                    if (checked) {
                                                                                        if (currentBuildings.length < buildingSlots) {
                                                                                            checkboxField.onChange([...currentBuildings, building.id]);
                                                                                        } else {
                                                                                            toast({ title: "Limite de bâtiments atteinte", variant: "destructive" });
                                                                                        }
                                                                                    } else {
                                                                                        checkboxField.onChange(currentBuildings.filter((value) => value !== building.id));
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
                        <div>
                           <Controller
                                control={form.control}
                                name="characters"
                                render={({ field }) => (
                                    <input {...field} value={field.value as any} type="hidden" />
                                )}
                            />
                        </div>
                        {fields.map((item, index) => {
                          const characterPortrait = watchedValues.characters?.[index]?.portraitUrl;
                          const isPlaceholder = watchedValues.characters?.[index]?.isPlaceholder;
                          return (
                            <Card key={item.id} className={cn("relative pt-6 bg-muted/30 border", isPlaceholder && "border-dashed border-primary")}>
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
                                {isPlaceholder ? (
                                    <FormField
                                        control={form.control}
                                        name={`characters.${index}.name`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-primary flex items-center gap-2"><UserCog className="h-4 w-4"/>Rôle Conseillé</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Ex: Partenaire romantique, rival..." {...field} className="bg-background border-primary"/>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                ) : (
                                <>
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
                                                  <Input 
                                                    placeholder="https://example.com/image.png" 
                                                    {...field}
                                                    value={field.value || ''}
                                                    onBlur={(e) => form.setValue(`characters.${index}.portraitUrl`, e.target.value, { shouldValidate: true, shouldDirty: true })}
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}/>
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
                                                            name={`characters.${index}.relations.player` as any}
                                                            render={({ field }) => (
                                                                <Input {...field} value={field.value || ""} placeholder="Relation avec le joueur" className="h-8"/>
                                                            )}
                                                        />
                                                    </div>
                                                    {fields.filter((_, otherIndex) => otherIndex !== index).map(otherChar => (
                                                         <div key={otherChar.id} className="flex items-center gap-2">
                                                            <Label className="w-1/3 truncate text-xs">{otherChar.name}</Label>
                                                            <FormField
                                                                control={form.control}
                                                                name={`characters.${index}.relations.${otherChar.id}` as any}
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
                                </>
                                )}
                            </CardContent>
                            </Card>
                          )
                        })}
                        <div className="flex gap-2 mt-2">
                            <TooltipProvider>
                               <Tooltip>
                                 <TooltipTrigger asChild>
                                    <Button type="button" variant="outline" size="icon" onClick={() => append({ id: `new-char-${Date.now()}`, name: "", details: "", isPlaceholder: false, portraitUrl: null, faceSwapEnabled: false, affinity: 50, relations: {}, factionColor: `#${Math.floor(Math.random()*16777215).toString(16)}` })}>
                                        <UserPlus className="h-5 w-5"/>
                                    </Button>
                                 </TooltipTrigger>
                                 <TooltipContent><p>Ajouter un personnage</p></TooltipContent>
                               </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button type="button" variant="outline" size="icon" onClick={() => append({ id: `placeholder-${Date.now()}`, name: "", details: "", isPlaceholder: true })}>
                                            <UserCog className="h-5 w-5"/>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Ajouter un emplacement de personnage</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <FormDescription className="mt-2 text-xs">
                            Les détails complets (stats, etc.) sont gérés dans le panneau latéral une fois l'aventure commencée.
                        </FormDescription>
                        </div>
                    </ScrollArea>
                    </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
            {/* ITEM EDITOR DIALOG */}
             <Dialog open={isItemEditorOpen} onOpenChange={setIsItemEditorOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingItem?.id.startsWith(editingItemType.slice(0,4)) ? "Modifier l'objet" : "Créer un nouvel objet"}
                        </DialogTitle>
                    </DialogHeader>
                    {editingItem && (
                        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
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
                                        {allUniverses.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                             </div>
                            
                            <div className="space-y-2">
                                <Label>Type d'Effet</Label>
                                <Select value={editingItem.effectType} onValueChange={(v: BaseItem['effectType']) => setEditingItem({...editingItem, effectType: v, effectDetails: undefined, statBonuses: {} })}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="narrative">Narratif</SelectItem>
                                        <SelectItem value="stat">Statistiques</SelectItem>
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

                             {editingItem.effectType === 'stat' && (
                                 <Card className="p-4 bg-muted/50 space-y-2">
                                     <Label>Bonus de Statistiques</Label>
                                     <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                         {(Object.keys(editingItem.statBonuses || {}) as Array<keyof PlayerInventoryItem['statBonuses']>).map(key => (
                                             <div key={key} className="space-y-1">
                                                 <Label className="capitalize">{key}</Label>
                                                 <Input type="number" value={(editingItem.statBonuses || {})[key] || ''} 
                                                        onChange={e => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            setEditingItem({ ...editingItem, statBonuses: { ...editingItem.statBonuses, [key]: val }});
                                                        }}
                                                 />
                                             </div>
                                         ))}
                                          {Object.keys({str:0, dex:0, con:0, int:0, wis:0, cha:0, hp:0, ac:0, attack:0}).filter(k => !(editingItem.statBonuses && k in editingItem.statBonuses)).map(key => (
                                             <div key={key} className="space-y-1">
                                                 <Label className="capitalize text-muted-foreground">{key}</Label>
                                                 <Input type="number" placeholder="0"
                                                        onChange={e => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            if (val !== 0) {
                                                                setEditingItem({ ...editingItem, statBonuses: { ...editingItem.statBonuses, [key]: val }});
                                                            }
                                                        }}
                                                 />
                                             </div>
                                          ))}

                                     </div>
                                 </Card>
                             )}

                            {editingItemType === 'weapon' && (
                                <div className="space-y-2">
                                    <Label>Dégâts</Label>
                                    <div className="flex items-center gap-2">
                                        <Input type="number" value={editingItem.damage?.split('d')[0] || 1} onChange={e => {
                                            const parts = editingItem.damage?.split('d') || ['1', '6'];
                                            const bonusMatch = parts[1]?.match(/([+-]\d+)/);
                                            const diceType = parts[1]?.replace(bonusMatch?.[0] || '', '');
                                            setEditingItem({...editingItem, damage: `${e.target.value}d${diceType}${bonusMatch?.[0] || ''}`})
                                        }} className="w-16" />
                                        <Select value={editingItem.damage?.split('d')[1]?.replace(/[+-]\d+/, '') || '6'} onValueChange={v => {
                                            const parts = editingItem.damage?.split('d') || ['1', '6'];
                                            const bonusMatch = parts[1]?.match(/([+-]\d+)/);
                                            setEditingItem({...editingItem, damage: `${parts[0]}d${v}${bonusMatch?.[0] || ''}`});
                                        }}>
                                            <SelectTrigger className="w-[80px]"><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                {[4,6,8,10,12,20,100].map(d => <SelectItem key={d} value={String(d)}>d{d}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <Input type="number" placeholder="+/-" value={editingItem.damage?.match(/([+-]\d+)/)?.[0] || ''} onChange={e => {
                                            const parts = editingItem.damage?.split('d') || ['1', '6'];
                                            const dicePart = parts[1]?.replace(/[+-]\d+/, '');
                                            let bonus = e.target.value;
                                            if (bonus && !bonus.startsWith('+') && !bonus.startsWith('-')) bonus = `+${bonus}`;
                                            if (bonus === '+' || bonus === '-') bonus = '';
                                            setEditingItem({...editingItem, damage: `${parts[0]}d${dicePart}${bonus}`});
                                        }} className="w-20" />
                                    </div>
                                </div>
                            )}
                           {editingItemType === 'armor' && (
                                <div className="space-y-2">
                                    <Label>Classe d'Armure (CA)</Label>
                                    <div className="flex items-center gap-2">
                                        <Input type="number" placeholder="CA de base" value={editingItem.ac?.match(/^\d+/)?.[0] || ''} onChange={e => {
                                            const dexMatch = editingItem.ac?.match(/\s*\+\s*Mod.Dex(\s*\(max\s*\+\d+\))?/);
                                            setEditingItem({...editingItem, ac: `${e.target.value}${dexMatch?.[0] || ''}`});
                                        }} className="flex-1"/>
                                         <Select value={editingItem.ac?.includes('Mod.Dex') ? (editingItem.ac.includes('max') ? 'max' : 'yes') : 'no'} onValueChange={v => {
                                            const baseAc = editingItem.ac?.match(/^\d+/)?.[0] || '10';
                                            if (v === 'no') setEditingItem({...editingItem, ac: baseAc});
                                            else if (v === 'yes') setEditingItem({...editingItem, ac: `${baseAc} + Mod.Dex`});
                                            else if (v === 'max') {
                                                const maxVal = editingItem.ac?.match(/\(max\s*\+(\d+)\)/)?.[1] || '2';
                                                setEditingItem({...editingItem, ac: `${baseAc} + Mod.Dex (max +${maxVal})`});
                                            }
                                        }}>
                                            <SelectTrigger className="w-[180px]"><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="no">Non applicable</SelectItem>
                                                <SelectItem value="yes">+ Mod.Dex</SelectItem>
                                                <SelectItem value="max">+ Mod.Dex (avec max)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {editingItem.ac?.includes('(max') && (
                                            <Input type="number" placeholder="Max" className="w-16" value={editingItem.ac?.match(/\(max\s*\+(\d+)\)/)?.[1] || '2'} onChange={e => {
                                                const basePart = editingItem.ac?.match(/(\d+\s*\+\s*Mod.Dex)/)?.[0] || '10 + Mod.Dex';
                                                setEditingItem({...editingItem, ac: `${basePart} (max +${e.target.value})`})
                                            }}/>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsItemEditorOpen(false); setEditingItem(null); }}>Annuler</Button>
                        <Button onClick={handleSaveItem}>Sauvegarder</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <Dialog open={isFamiliarEditorOpen} onOpenChange={setIsFamiliarEditorOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingFamiliarComponent?.id.startsWith('new-') ? "Créer un composant" : "Modifier un composant"}
                        </DialogTitle>
                    </DialogHeader>
                    {editingFamiliarComponent && (
                        <div className="space-y-4 py-4">
                             <div className="space-y-2">
                                <Label htmlFor="fam-comp-name">Nom</Label>
                                <Input id="fam-comp-name" value={editingFamiliarComponent.name} onChange={e => setEditingFamiliarComponent({...editingFamiliarComponent, name: e.target.value})} />
                             </div>
                             <div className="space-y-2">
                                <Label htmlFor="fam-comp-universe">Univers</Label>
                                <Select value={editingFamiliarComponent.universe} onValueChange={(v: BaseFamiliarComponent['universe']) => setEditingFamiliarComponent({...editingFamiliarComponent, universe: v})}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        {allUniverses.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                             </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsFamiliarEditorOpen(false); setEditingFamiliarComponent(null); }}>Annuler</Button>
                        <Button onClick={handleSaveFamiliarComponent}>Sauvegarder</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* ENEMY EDITOR DIALOG */}
            <Dialog open={isEnemyEditorOpen} onOpenChange={setIsEnemyEditorOpen}>
                 <DialogContent className="max-w-4xl">
                     <DialogHeader>
                         <DialogTitle>{editingEnemy?.id.startsWith('new-') ? "Créer une Unité Ennemie" : `Modifier ${editingEnemy?.name}`}</DialogTitle>
                     </DialogHeader>
                     {editingEnemy && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 max-h-[70vh] overflow-y-auto pr-2">
                             {/* Left Column: Basic Info */}
                             <div className="space-y-4">
                                 <div className="space-y-2">
                                     <Label>Nom</Label>
                                     <Input value={editingEnemy.name} onChange={e => setEditingEnemy({...editingEnemy, name: e.target.value})} />
                                 </div>
                                 <div className="space-y-2">
                                     <Label>Race</Label>
                                     <Input value={editingEnemy.race} onChange={e => setEditingEnemy({...editingEnemy, race: e.target.value})} />
                                 </div>
                                 <div className="space-y-2">
                                     <Label>Classe</Label>
                                     <Input value={editingEnemy.class} onChange={e => setEditingEnemy({...editingEnemy, class: e.target.value})} />
                                 </div>
                                 <div className="space-y-2">
                                    <Label>Univers</Label>
                                    <Select value={editingEnemy.universe} onValueChange={(v) => setEditingEnemy({...editingEnemy, universe: v})}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{allUniverses.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                                    </Select>
                                 </div>
                                 <div className="space-y-2">
                                     <Label>Portrait URL</Label>
                                     <Input value={editingEnemy.portraitUrl || ''} onChange={e => setEditingEnemy({...editingEnemy, portraitUrl: e.target.value})} />
                                 </div>
                             </div>
                             {/* Right Column: Stats & Loot */}
                             <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                     <div className="space-y-2"><Label>Niveau</Label><Input type="number" value={editingEnemy.level} onChange={e => setEditingEnemy({...editingEnemy, level: Number(e.target.value)})} /></div>
                                     <div className="space-y-2"><Label>PV</Label><Input type="number" value={editingEnemy.hitPoints} onChange={e => setEditingEnemy({...editingEnemy, hitPoints: Number(e.target.value)})} /></div>
                                     <div className="space-y-2"><Label>CA</Label><Input type="number" value={editingEnemy.armorClass} onChange={e => setEditingEnemy({...editingEnemy, armorClass: Number(e.target.value)})} /></div>
                                     <div className="space-y-2"><Label>Bonus Attaque</Label><Input type="number" value={editingEnemy.attackBonus} onChange={e => setEditingEnemy({...editingEnemy, attackBonus: Number(e.target.value)})} /></div>
                                     <div className="space-y-2"><Label>Dégâts</Label><Input value={editingEnemy.damage} onChange={e => setEditingEnemy({...editingEnemy, damage: e.target.value})} /></div>
                                     <div className="space-y-2"><Label>EXP Donnée</Label><Input type="number" value={editingEnemy.expValue} onChange={e => setEditingEnemy({...editingEnemy, expValue: Number(e.target.value)})} /></div>
                                     <div className="space-y-2"><Label>Or Donné</Label><Input type="number" value={editingEnemy.goldValue} onChange={e => setEditingEnemy({...editingEnemy, goldValue: Number(e.target.value)})} /></div>
                                  </div>
                                  <Separator/>
                                   <div className="space-y-2">
                                     <Label>Table de Butin</Label>
                                     <ScrollArea className="h-40 border rounded-md p-2">
                                         <div className="space-y-2">
                                         {[...consumables, ...weapons, ...armors, ...jewelry].map(item => (
                                             <div key={item.id} className="flex items-center justify-between p-1 bg-background rounded">
                                                 <div className="flex items-center space-x-2">
                                                     <Checkbox
                                                        id={`loot-${item.id}`}
                                                        checked={editingEnemy.lootTable?.some(loot => loot.itemId === item.id)}
                                                        onCheckedChange={checked => handleLootTableChange(editingEnemy!.id, item.id, !!checked)}
                                                     />
                                                     <Label htmlFor={`loot-${item.id}`} className="text-xs font-normal truncate">{item.name}</Label>
                                                 </div>
                                                 {editingEnemy.lootTable?.some(loot => loot.itemId === item.id) && (
                                                      <div className="flex items-center gap-1">
                                                        <Input 
                                                          type="number" 
                                                          min="0" max="1" step="0.01" 
                                                          className="h-7 w-20 text-xs" 
                                                          value={editingEnemy.lootTable.find(loot => loot.itemId === item.id)?.dropChance || 0.1}
                                                          onChange={e => handleDropChanceChange(editingEnemy!.id, item.id, Number(e.target.value))}
                                                        />
                                                      </div>
                                                 )}
                                             </div>
                                         ))}
                                         </div>
                                     </ScrollArea>
                                 </div>
                             </div>
                         </div>
                     )}
                     <DialogFooter>
                         <Button variant="outline" onClick={() => { setIsEnemyEditorOpen(false); setEditingEnemy(null); }}>Annuler</Button>
                         <Button onClick={handleSaveEnemy}>Sauvegarder</Button>
                     </DialogFooter>
                 </DialogContent>
            </Dialog>
        </form>
        </Form>
    );
});
AdventureForm.displayName = "AdventureForm";

const RelationsEditableCard = ({ charId, data, characters, playerId, playerName, currentLanguage, onUpdate, onRemove, disabled = false, control, fields }: { charId: string, data?: Record<string, string>, characters: Character[], playerId: string, playerName: string, currentLanguage: string, onUpdate: (charId: string, field: 'relations', key: string, value: string | number | boolean) => void, onRemove: (charId: string, field: 'relations', key: string) => void, disabled?: boolean, control: any, fields: any[] }) => {
    const otherCharacters = characters.filter(c => c.id !== charId);
  
    return (
        <div className="space-y-2">
            <Label className="flex items-center gap-1"><LinkIcon className="h-4 w-4" /> Relations</Label>
            <Card className="bg-muted/30 border">
                <CardContent className="p-3 space-y-2">
                     <div className="flex items-center gap-2">
                        <Label htmlFor={`${charId}-relations-${playerId}`} className="truncate text-sm shrink-0">{playerName} (Joueur)</Label>
                        <FormField
                            control={control}
                            name={`relations.player`}
                            render={({ field }) => (
                                <Input
                                    id={`${charId}-relations-${playerId}`}
                                    {...field}
                                    value={field.value || ""}
                                    className="h-8 text-sm flex-1 bg-background border"
                                    placeholder={currentLanguage === 'fr' ? "Ami, Ennemi..." : "Friend, Enemy..."}
                                    disabled={disabled}
                                />
                            )}
                        />
                     </div>
  
                    {otherCharacters.map(otherChar => (
                        <div key={otherChar.id} className="flex items-center gap-2">
                            <Label htmlFor={`${charId}-relations-${otherChar.id}`} className="truncate text-sm shrink-0">{otherChar.name}</Label>
                            <FormField
                                control={control}
                                name={`relations.${otherChar.id}`}
                                render={({ field }) => (
                                    <Input
                                        id={`${charId}-relations-${otherChar.id}`}
                                        {...field}
                                        value={field.value || ''}
                                        placeholder={`Relation avec ${otherChar.name}`}
                                        className="h-8 text-sm flex-1 bg-background border"
                                        disabled={disabled}
                                    />
                                )}
                            />
                        </div>
                    ))}
                     <p className="text-xs text-muted-foreground pt-1">{currentLanguage === 'fr' ? "Décrivez la relation de ce personnage envers les autres." : "Describe this character's relationship towards others."}</p>
                </CardContent>
            </Card>
        </div>
    );
};
    

    

    




    

    

    



    