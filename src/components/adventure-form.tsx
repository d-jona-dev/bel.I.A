
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
import { PlusCircle, Trash2, Upload, Dices, User } from "lucide-react"; // Added User icon
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast"; 
import type { AdventureFormValues } from '@/app/page'; // Import AdventureFormValues

// Schema definition including characters array and player name
const characterSchema = z.object({
  id: z.string().optional(), // Keep ID if exists
  name: z.string().min(1, "Le nom est requis"),
  details: z.string().min(1, "Les détails sont requis"),
});

const adventureFormSchema = z.object({
  world: z.string().min(1, "La description du monde est requise"),
  initialSituation: z.string().min(1, "La situation initiale est requise"),
  characters: z.array(characterSchema).min(0, "Au moins un personnage secondaire est recommandé"), 
  enableRpgMode: z.boolean().default(false).optional(),
  playerName: z.string().optional().default("Player").describe("Le nom du personnage joueur."),
  currencyName: z.string().optional().describe("Le nom de la monnaie (si RPG activé).")
});


interface AdventureFormProps {
    key?: number; // Add key prop
    initialValues: AdventureFormValues; 
    onSettingsChange: (values: AdventureFormValues) => void; 
}

export function AdventureForm({ key: propKey, initialValues, onSettingsChange }: AdventureFormProps) {
  const { toast } = useToast();
  const form = useForm<AdventureFormValues>({
    resolver: zodResolver(adventureFormSchema),
    defaultValues: initialValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "characters",
  });

  // Effect to reset the form when initialValues prop changes (e.g., loading a save, or parent applies staged changes)
   React.useEffect(() => {
    console.log("AdventureForm: initialValues or key changed, resetting form.", initialValues, propKey);
    form.reset(initialValues);
   }, [initialValues, propKey, form]); // Add propKey to dependencies

  // Listen to form changes and call onSettingsChange to update staged state in parent
  React.useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      // Only call onSettingsChange if the change is not from a reset event
      // and the form is dirty (meaning user interaction has occurred)
      // This prevents infinite loops when parent updates staged state, which then updates initialValues.
      if (type !== 'reset' && form.formState.isDirty) {
         onSettingsChange(value as AdventureFormValues);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, onSettingsChange]);


  const handleLoadPrompt = () => {
    const loadedData: AdventureFormValues = {
        world: "Grande université populaire nommée \"hight scoole of futur\".",
        initialSituation: "Utilisateur marche dans les couloirs de hight scoole of futur et découvre sa petite amie discuter avec son meilleur ami, ils ont l'air très proches, trop proches ...",
        characters: [
            { name: "Rina", details: "jeune femme de 19 ans, petite amie de Utilisateur , se rapproche du meilleur ami de Utilisateur, étudiante à hight scoole of futur, calme, aimante, parfois un peu secrète, fille populaire de l'école, 165 cm, yeux marron, cheveux mi-long brun, traits fin, corpulence athlétique." },
            { name: "Kentaro", details: "Jeune homme de 20, meilleur ami de utilisateur, étudiant à hight scoole of futur, garçon populaire, charmant, 185 cm, athlétique voir costaud, yeux bleu, cheveux court blond, calculateur, impulsif, aime dragué les filles, se rapproche de la petite amie de Utilisateur, aime voir son meilleur ami souffrir." }
        ],
        enableRpgMode: true,
        playerName: "Héros", 
        currencyName: "Or", 
    };
    form.reset(loadedData); // This will trigger the watch and update parent's staged state if isDirty
    onSettingsChange(loadedData); // Directly call onSettingsChange to ensure parent is updated
    toast({ title: "Prompt Chargé", description: "La configuration de l'aventure a été chargée depuis l'exemple." });
  };


  return (
    <Form {...form}>
      {/* Removed onChange from form tag as useEffect handles changes */}
      <form className="space-y-4">

        <div className="space-y-4"> 
            <div className="flex justify-end"> 
                 <Button type="button" variant="outline" size="sm" onClick={handleLoadPrompt}>
                    <Upload className="mr-2 h-4 w-4" /> Charger Prompt Example
                </Button>
            </div>

             <FormField
              control={form.control}
              name="playerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><User className="h-4 w-4"/> Nom du Joueur</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nom du héros"
                      {...field}
                      className="bg-background border"
                    />
                  </FormControl>
                   <FormDescription>Le nom que le joueur portera dans l'aventure.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />


             <FormField
              control={form.control}
              name="enableRpgMode"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/50">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2"><Dices className="h-4 w-4"/> Mode Jeu de Rôle (RPG)</FormLabel>
                    <FormDescription>
                      Activer les systèmes RPG (stats, inventaire, etc.).
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch('enableRpgMode') && (
                 <FormField
                  control={form.control}
                  name="currencyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de la Monnaie</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Or, Crédits, Gemmes..."
                          {...field}
                          className="bg-background border"
                        />
                      </FormControl>
                       <FormDescription>Le nom de la monnaie utilisée (optionnel).</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            )}

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

             <Accordion type="single" collapsible className="w-full border-t pt-4"> 
               <AccordionItem value="character-definitions">
                <AccordionTrigger>Définir les Personnages Initiaux</AccordionTrigger>
                <AccordionContent>
                 <ScrollArea className="h-48 pr-3">
                    <div className="space-y-4">
                    {fields.map((item, index) => ( // Changed 'field' to 'item' to avoid conflict
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
                      <CardContent className="space-y-2">
                        <FormField
                          control={form.control}
                          name={`characters.${index}.name`}
                          render={({ field }) => ( // 'field' here is from FormField render prop
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
                          name={`characters.${index}.details`}
                          render={({ field }) => ( // 'field' here is from FormField render prop
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
                      </CardContent>
                    </Card>
                  ))}
                   <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ name: "", details: "" })}
                      className="mt-2 w-full"
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Ajouter un personnage
                    </Button>
                     <FormDescription className="mt-2 text-xs">
                        Les détails complets (stats, inventaire, historique, relations) sont gérés dans la section "Personnages Secondaires" une fois ajoutés.
                     </FormDescription>
                    </div>
                 </ScrollArea>
                 </AccordionContent>
              </AccordionItem>
            </Accordion>

          </div>
      </form>
    </Form>
  );
}

