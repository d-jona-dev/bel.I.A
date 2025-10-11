
"use client";

import * as React from "react";
import { useFormContext, Controller } from "react-hook-form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
    FormLabel,
    FormDescription,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Package, PlusCircle, Trash2, Edit2, Download, Upload, PawPrint } from "lucide-react";
import type { AdventureFormValues } from "../adventure-form";
import type { BaseItem, Familiar, FamiliarPassiveBonus } from "@/types";
import { BASE_WEAPONS, BASE_ARMORS, BASE_JEWELRY, BASE_CONSUMABLES, BASE_FAMILIAR_PHYSICAL_ITEMS, BASE_FAMILIAR_CREATURES, BASE_FAMILIAR_DESCRIPTORS } from "@/lib/items";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFamiliar } from "@/hooks/systems/useFamiliar";
import { useAdventureState } from "@/hooks/systems/useAdventureState";


const defaultUniverses = ['Médiéval-Fantastique', 'Post-Apo', 'Futuriste', 'Space-Opéra'];
const uid = (n = 6) => Math.random().toString(36).slice(2, 2 + n);


export function ItemConfig() {
    const { control, getValues, setValue } = useFormContext<AdventureFormValues>();
    const { toast } = useToast();
    const importFileRef = React.useRef<HTMLInputElement>(null);

    const [customUniverses, setCustomUniverses] = React.useState<string[]>([]);
    const [customItems, setCustomItems] = React.useState<BaseItem[]>([]);
    
    const [isUniverseDialogOpen, setIsUniverseDialogOpen] = React.useState(false);
    const [newUniverseName, setNewUniverseName] = React.useState("");

    const [isItemDialogOpen, setIsItemDialogOpen] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<BaseItem | null>(null);

    // Familiar creation state
    const [selectedCreature, setSelectedCreature] = React.useState<string | undefined>(undefined);
    const [selectedPhysical, setSelectedPhysical] = React.useState<string | undefined>(undefined);
    const [selectedDescriptor, setSelectedDescriptor] = React.useState<string | undefined>(undefined);
    const [selectedRarity, setSelectedRarity] = React.useState<Familiar['rarity']>('common');
    const [generatedBonus, setGeneratedBonus] = React.useState<FamiliarPassiveBonus | null>(null);
    
    const { createInitialState } = useAdventureState();
    const { generateDynamicFamiliarBonus } = useFamiliar({
        adventureSettings: createInitialState().adventureSettings,
        setAdventureSettings: () => {},
        toast,
        handleSendSpecificAction: () => {},
    });

    React.useEffect(() => {
        try {
            const storedUniverses = localStorage.getItem('custom_item_universes');
            if (storedUniverses) setCustomUniverses(JSON.parse(storedUniverses));
            const storedItems = localStorage.getItem('custom_items');
            if (storedItems) setCustomItems(JSON.parse(storedItems));
        } catch (error) {
            console.error("Failed to load custom item data:", error);
        }
    }, []);

    const saveCustomUniverses = (universes: string[]) => {
        setCustomUniverses(universes);
        localStorage.setItem('custom_item_universes', JSON.stringify(universes));
    };

    const saveCustomItems = (items: BaseItem[]) => {
        setCustomItems(items);
        localStorage.setItem('custom_items', JSON.stringify(items));
    }

    const handleAddUniverse = () => {
        if (newUniverseName.trim() && ![...defaultUniverses, ...customUniverses].includes(newUniverseName.trim())) {
            saveCustomUniverses([...customUniverses, newUniverseName.trim()]);
            setNewUniverseName("");
        } else {
            toast({ title: "Erreur", description: "Ce nom d'univers est invalide ou existe déjà.", variant: "destructive" });
        }
    };

    const handleItemAction = (action: 'add' | 'edit', item?: BaseItem, type?: BaseItem['type']) => {
        if (action === 'add' && type) {
            setEditingItem({
                id: `custom-${type}-${uid()}`,
                name: "",
                description: "",
                type: type,
                baseGoldValue: 1,
                universe: 'Médiéval-Fantastique',
                rarity: 'Commun',
            });
        } else if (action === 'edit' && item) {
            setEditingItem(JSON.parse(JSON.stringify(item)));
        }
        setIsItemDialogOpen(true);
    };

    const handleSaveItem = () => {
        if (!editingItem || !editingItem.name) {
            toast({ title: "Erreur", description: "Le nom de l'objet est requis.", variant: "destructive" });
            return;
        }
        const isNew = !customItems.some(item => item.id === editingItem.id);
        const updatedItems = isNew ? [...customItems, editingItem] : customItems.map(item => item.id === editingItem.id ? editingItem : item);
        saveCustomItems(updatedItems);
        setIsItemDialogOpen(false);
        setEditingItem(null);
    };

    const handleDeleteItem = (itemId: string) => {
        saveCustomItems(customItems.filter(item => item.id !== itemId));
    }
    
    const handleGenerateBonus = () => {
        setGeneratedBonus(generateDynamicFamiliarBonus(selectedRarity));
    };

    const handleSaveFamiliarItem = () => {
        if (!selectedCreature || !selectedPhysical || !generatedBonus) {
            toast({ title: "Champs Requis", description: "Veuillez sélectionner une créature, un composant physique et générer un bonus.", variant: "destructive" });
            return;
        }
        
        const creature = BASE_FAMILIAR_CREATURES.find(c => c.id === selectedCreature)!;
        const physical = BASE_FAMILIAR_PHYSICAL_ITEMS.find(c => c.id === selectedPhysical)!;
        const descriptor = BASE_FAMILIAR_DESCRIPTORS.find(c => c.id === selectedDescriptor);

        const familiarName = `${creature.name}${descriptor ? ` ${descriptor.name}` : ''}`;
        const itemName = `${physical.name} de ${familiarName}`;
        
        const newFamiliarItem: BaseItem = {
            id: `cons-familiar-${creature.id}-${physical.id}${descriptor ? `-${descriptor.id}` : ''}`,
            name: itemName,
            description: `Un objet mystique qui permet d'invoquer et de se lier à un ${familiarName}.`,
            type: 'consumable',
            baseGoldValue: 50,
            universe: creature.universe,
            rarity: selectedRarity.charAt(0).toUpperCase() + selectedRarity.slice(1) as any,
            effectType: 'narrative',
            familiarDetails: {
                name: familiarName,
                description: `Un ${familiarName} loyal invoqué via un(e) ${physical.name}.`,
                rarity: selectedRarity,
                level: 1,
                currentExp: 0,
                expToNextLevel: 100,
                passiveBonus: generatedBonus,
            },
        };
        
        const isDuplicate = customItems.some(item => item.id === newFamiliarItem.id);
        if (isDuplicate) {
             toast({ title: "Objet Existant", description: "Un objet d'invocation pour ce familier existe déjà.", variant: "default" });
             return;
        }

        saveCustomItems([...customItems, newFamiliarItem]);
        toast({ title: "Objet d'Invocation Créé", description: `L'objet "${itemName}" a été ajouté à votre liste d'objets personnalisés.` });
    };

    const allAvailableUniverses = React.useMemo(() => {
        const allItems = [...BASE_WEAPONS, ...BASE_ARMORS, ...BASE_JEWELRY, ...BASE_CONSUMABLES, ...customItems];
        const universes = new Set(allItems.map(item => item.universe));
        defaultUniverses.forEach(u => universes.add(u));
        customUniverses.forEach(u => universes.add(u));
        return Array.from(universes).sort();
    }, [customItems, customUniverses]);

    const itemLists: Record<BaseItem['type'], BaseItem[]> = {
        weapon: [...BASE_WEAPONS, ...customItems.filter(i => i.type === 'weapon')],
        armor: [...BASE_ARMORS, ...customItems.filter(i => i.type === 'armor')],
        jewelry: [...BASE_JEWELRY, ...customItems.filter(i => i.type === 'jewelry')],
        consumable: [...BASE_CONSUMABLES, ...customItems.filter(i => i.type === 'consumable')],
        quest: customItems.filter(i => i.type === 'quest'),
        misc: customItems.filter(i => i.type === 'misc'),
        npc: customItems.filter(i => i.type === 'npc'),
    }

    const renderItemList = (type: BaseItem['type']) => (
        <div className="space-y-2">
            <Button size="sm" onClick={() => handleItemAction('add', undefined, type)}><PlusCircle className="h-4 w-4 mr-2"/>Ajouter</Button>
            <ScrollArea className="h-48 mt-2 border rounded-md">
                <div className="p-2 space-y-1">
                {itemLists[type].map(item => (
                    <Card key={item.id} className="p-2 bg-background shadow-sm">
                         <div className="flex justify-between items-start">
                             <div>
                                 <p className="font-semibold text-sm">{item.name}</p>
                                 <p className="text-xs text-muted-foreground">{item.rarity} - {item.universe}</p>
                             </div>
                             <div className="flex gap-1">
                                 <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleItemAction('edit', item)}><Edit2 className="h-4 w-4"/></Button>
                                 {item.id.startsWith('custom-') && <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteItem(item.id)}><Trash2 className="h-4 w-4"/></Button>}
                             </div>
                         </div>
                    </Card>
                ))}
                </div>
            </ScrollArea>
        </div>
    );

    return (
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-config">
                <AccordionTrigger>Configuration des Objets & Univers</AccordionTrigger>
                <AccordionContent className="pt-2 space-y-4">
                    <div className="space-y-2 rounded-lg border p-3 shadow-sm">
                        <div className="flex justify-between items-center">
                            <FormLabel className="flex items-center gap-2"><Package className="h-4 w-4"/> Univers d'Objets Actifs</FormLabel>
                        </div>
                        <FormDescription>
                            Sélectionnez les univers dont les objets peuvent apparaître.
                        </FormDescription>
                        <ScrollArea className="h-32 border rounded-md p-2">
                            <div className="space-y-2 pt-2">
                                <Controller
                                    control={control}
                                    name="activeItemUniverses"
                                    render={({ field }) => (
                                        <>
                                            {allAvailableUniverses.map(universe => (
                                                <div key={universe} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`universe-${universe}`}
                                                        checked={field.value?.includes(universe)}
                                                        onCheckedChange={(checked) => {
                                                            const currentValues = getValues("activeItemUniverses") || [];
                                                            if (checked) {
                                                                field.onChange([...currentValues, universe]);
                                                            } else {
                                                                field.onChange(currentValues.filter(value => value !== universe));
                                                            }
                                                        }}
                                                    />
                                                    <label htmlFor={`universe-${universe}`} className="text-sm font-medium leading-none">{universe}</label>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                />
                            </div>
                        </ScrollArea>
                        <div className="flex gap-2 pt-2">
                            <Input value={newUniverseName} onChange={e => setNewUniverseName(e.target.value)} placeholder="Nom du nouvel univers..." className="h-8"/>
                            <Button size="sm" onClick={handleAddUniverse}>Ajouter</Button>
                        </div>
                    </div>
                    
                    <Tabs defaultValue="weapon">
                        <TabsList className="h-auto flex-wrap">
                            <TabsTrigger value="weapon">Armes</TabsTrigger>
                            <TabsTrigger value="armor">Armures</TabsTrigger>
                            <TabsTrigger value="jewelry">Bijoux</TabsTrigger>
                            <TabsTrigger value="consumable">Consommables</TabsTrigger>
                            <TabsTrigger value="familiar"><PawPrint className="h-4 w-4 mr-1"/>Familiers</TabsTrigger>
                        </TabsList>
                        <TabsContent value="weapon">{renderItemList('weapon')}</TabsContent>
                        <TabsContent value="armor">{renderItemList('armor')}</TabsContent>
                        <TabsContent value="jewelry">{renderItemList('jewelry')}</TabsContent>
                        <TabsContent value="consumable">{renderItemList('consumable')}</TabsContent>
                         <TabsContent value="familiar">
                            <Card className="p-4">
                                <CardContent className="space-y-4">
                                    <h3 className="font-semibold">Créateur d'Objets d'Invocation</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>Composant Physique</Label>
                                            <Select value={selectedPhysical} onValueChange={setSelectedPhysical}>
                                                <SelectTrigger><SelectValue placeholder="Choisir..."/></SelectTrigger>
                                                <SelectContent>
                                                    {BASE_FAMILIAR_PHYSICAL_ITEMS.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                         <div className="space-y-2">
                                            <Label>Créature de Base</Label>
                                            <Select value={selectedCreature} onValueChange={setSelectedCreature}>
                                                <SelectTrigger><SelectValue placeholder="Choisir..."/></SelectTrigger>
                                                <SelectContent>
                                                    {BASE_FAMILIAR_CREATURES.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                         <div className="space-y-2">
                                            <Label>Descripteur (Optionnel)</Label>
                                            <Select value={selectedDescriptor} onValueChange={setSelectedDescriptor}>
                                                <SelectTrigger><SelectValue placeholder="Choisir..."/></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Aucun</SelectItem>
                                                    {BASE_FAMILIAR_DESCRIPTORS.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Rareté du familier</Label>
                                        <Select value={selectedRarity} onValueChange={(v) => setSelectedRarity(v as Familiar['rarity'])}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="common">Commun</SelectItem>
                                                <SelectItem value="uncommon">Peu Commun</SelectItem>
                                                <SelectItem value="rare">Rare</SelectItem>
                                                <SelectItem value="epic">Épique</SelectItem>
                                                <SelectItem value="legendary">Légendaire</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button onClick={handleGenerateBonus} variant="secondary">Générer un Bonus Passif</Button>
                                    {generatedBonus && (
                                        <div className="p-2 border rounded-md bg-background">
                                            <p className="font-semibold text-sm">Bonus généré :</p>
                                            <p className="text-sm">{generatedBonus.description.replace('X', String(generatedBonus.value * 1))}</p>
                                        </div>
                                    )}
                                    <Button onClick={handleSaveFamiliarItem} disabled={!generatedBonus}>Sauvegarder l'Objet d'Invocation</Button>
                                </CardContent>
                            </Card>
                         </TabsContent>
                    </Tabs>

                    <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingItem?.id.startsWith('custom-') ? "Modifier l'objet" : "Détails de l'objet"}</DialogTitle>
                            </DialogHeader>
                            {editingItem && (
                                <div className="space-y-3 py-4 max-h-[70vh] overflow-y-auto">
                                    <div className="space-y-1">
                                        <Label>Nom</Label>
                                        <Input value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} disabled={!editingItem.id.startsWith('custom-')}/>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Description</Label>
                                        <Textarea value={editingItem.description} onChange={e => setEditingItem({...editingItem, description: e.target.value})} disabled={!editingItem.id.startsWith('custom-')}/>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label>Type</Label>
                                            <Select value={editingItem.type} onValueChange={(v) => setEditingItem({...editingItem, type: v as BaseItem['type']})} disabled={!editingItem.id.startsWith('custom-')}>
                                                <SelectTrigger><SelectValue/></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="weapon">Arme</SelectItem>
                                                    <SelectItem value="armor">Armure</SelectItem>
                                                    <SelectItem value="jewelry">Bijou</SelectItem>
                                                    <SelectItem value="consumable">Consommable</SelectItem>
                                                    <SelectItem value="quest">Quête</SelectItem>
                                                    <SelectItem value="misc">Divers</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                         <div className="space-y-1">
                                            <Label>Rareté</Label>
                                            <Select value={editingItem.rarity} onValueChange={(v) => setEditingItem({...editingItem, rarity: v as BaseItem['rarity']})} disabled={!editingItem.id.startsWith('custom-')}>
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
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Valeur de base (PO)</Label>
                                        <Input type="number" value={editingItem.baseGoldValue} onChange={e => setEditingItem({...editingItem, baseGoldValue: Number(e.target.value)})} disabled={!editingItem.id.startsWith('custom-')}/>
                                    </div>
                                </div>
                            )}
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsItemDialogOpen(false)}>Fermer</Button>
                                {editingItem?.id.startsWith('custom-') && <Button onClick={handleSaveItem}>Sauvegarder</Button>}
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
