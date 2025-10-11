
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
import { Package, PlusCircle, Trash2, Download, Upload } from "lucide-react";
import type { AdventureFormValues } from "../adventure-form";
import type { BaseItem } from "@/types";
import { BASE_WEAPONS, BASE_ARMORS, BASE_JEWELRY, BASE_CONSUMABLES } from "@/lib/items";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";


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

    const handleAddUniverse = () => {
        if (newUniverseName.trim() && ![...defaultUniverses, ...customUniverses].includes(newUniverseName.trim())) {
            saveCustomUniverses([...customUniverses, newUniverseName.trim()]);
            setNewUniverseName("");
            setIsUniverseDialogOpen(false);
        } else {
            toast({ title: "Erreur", description: "Ce nom d'univers est invalide ou existe déjà.", variant: "destructive" });
        }
    };
    
    const handleDeleteUniverse = (universeToDelete: string) => {
        saveCustomUniverses(customUniverses.filter(u => u !== universeToDelete));
        // Also uncheck it if it was active
        const currentActive = getValues("activeItemUniverses") || [];
        setValue("activeItemUniverses", currentActive.filter(u => u !== universeToDelete));
    };

    const allAvailableUniverses = React.useMemo(() => {
        const allItems = [...BASE_WEAPONS, ...BASE_ARMORS, ...BASE_JEWELRY, ...BASE_CONSUMABLES, ...customItems];
        const universes = new Set(allItems.map(item => item.universe));
        customUniverses.forEach(u => universes.add(u));
        return Array.from(universes);
    }, [customItems, customUniverses]);

    return (
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-config">
                <AccordionTrigger>Configuration des Objets & Univers</AccordionTrigger>
                <AccordionContent className="pt-2 space-y-4">
                    <div className="space-y-2 rounded-lg border p-3 shadow-sm">
                        <div className="flex justify-between items-center">
                            <FormLabel className="flex items-center gap-2"><Package className="h-4 w-4"/> Univers d'Objets Actifs</FormLabel>
                            <Dialog open={isUniverseDialogOpen} onOpenChange={setIsUniverseDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm"><PlusCircle className="h-4 w-4 mr-1"/> Gérer</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Gérer les Univers Personnalisés</DialogTitle>
                                        <DialogDescription>Ajoutez ou supprimez des univers thématiques pour vos objets.</DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4 space-y-4">
                                        <div className="flex gap-2">
                                            <Input value={newUniverseName} onChange={e => setNewUniverseName(e.target.value)} placeholder="Nom du nouvel univers..."/>
                                            <Button onClick={handleAddUniverse}>Ajouter</Button>
                                        </div>
                                        <p className="text-sm font-medium">Univers personnalisés :</p>
                                        <ScrollArea className="h-40 border rounded-md">
                                            <div className="p-2 space-y-1">
                                            {customUniverses.length > 0 ? customUniverses.map(uni => (
                                                <div key={uni} className="flex justify-between items-center p-1 hover:bg-muted/50 rounded">
                                                    <span className="text-sm">{uni}</span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteUniverse(uni)}>
                                                        <Trash2 className="h-4 w-4"/>
                                                    </Button>
                                                </div>
                                            )) : <p className="text-xs text-muted-foreground p-2">Aucun univers personnalisé.</p>}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsUniverseDialogOpen(false)}>Fermer</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <FormDescription>
                            Sélectionnez les univers dont les objets peuvent apparaître (marchands, butin).
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
                                                    <label
                                                        htmlFor={`universe-${universe}`}
                                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                    >
                                                        {universe}
                                                    </label>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                />
                            </div>
                        </ScrollArea>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}

