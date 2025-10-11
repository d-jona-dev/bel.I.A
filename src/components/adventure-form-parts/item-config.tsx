
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
    FormItem,
    FormLabel,
    FormDescription,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Package } from "lucide-react";
import type { AdventureFormValues } from "../adventure-form";
import { BASE_WEAPONS } from "@/lib/items";

export function ItemConfig() {
    const { control, getValues } = useFormContext<AdventureFormValues>();
    const availableUniverses = React.useMemo(() => {
        const universes = new Set(BASE_WEAPONS.map(item => item.universe));
        return Array.from(universes);
    }, []);

    return (
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-config">
                <AccordionTrigger>Configuration des Objets</AccordionTrigger>
                <AccordionContent className="pt-2 space-y-4">
                    <div className="space-y-2 rounded-lg border p-3 shadow-sm">
                        <FormLabel className="flex items-center gap-2"><Package className="h-4 w-4"/> Univers d'Objets Actifs</FormLabel>
                        <FormDescription>
                            Sélectionnez les univers thématiques dont les objets peuvent apparaître dans l'aventure (marchands, butin).
                        </FormDescription>
                        <div className="space-y-2 pt-2">
                             <Controller
                                control={control}
                                name="activeItemUniverses"
                                render={({ field }) => (
                                    <>
                                        {availableUniverses.map(universe => (
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
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
