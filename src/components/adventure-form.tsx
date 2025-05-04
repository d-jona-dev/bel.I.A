
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
import { PlusCircle, Trash2, Upload, Dices } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast"; // Added for feedback on load

// Schema definition including characters array
const characterSchema = z.object({
  id: z.string().optional(), // Keep ID if exists
  name: z.string().min(1, "Le nom est requis"),
  details: z.string().min(1, "Les détails sont requis"),
});

const adventureFormSchema = z.object({
  world: z.string().min(1, "La description du monde est requise"),
  initialSituation: z.string().min(1, "La situation initiale est requise"),
  characters: z.array(characterSchema).min(0, "Au moins un personnage secondaire est recommandé"), // Allow 0 characters initially
  enableRpgMode: z.boolean().default(false).optional(),
});

type AdventureFormValues = z.infer<typeof adventureFormSchema>;

interface AdventureFormProps {
    initialValues: AdventureFormValues; // Receive initial values from parent
    onSettingsChange: (values: AdventureFormValues) => void; // Callback to update parent
}

export function AdventureForm({ initialValues, onSettingsChange }: AdventureFormProps) {
  const { toast } = useToast();
  const form = useForm<AdventureFormValues>({
    resolver: zodResolver(adventureFormSchema),
    // Use initialValues passed from the parent component
    defaultValues: initialValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "characters",
  });

  // Watch for changes and call the onSettingsChange callback
  React.useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (type === 'change') {
        // Call the callback passed from the parent component
        onSettingsChange(value as AdventureFormValues);
        console.log("Form changed, notifying parent:", value);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, onSettingsChange]);

   // Effect to reset the form when initialValues prop changes (e.g., loading a save)
   React.useEffect(() => {
    form.reset(initialValues);
    console.log("AdventureForm reset with initialValues:", initialValues);
   }, [initialValues, form]);


  const handleLoadPrompt = () => {
    // Example data to load - replace with actual file loading logic if needed
    const loadedData = {
        world: "Grande université populaire nommée \"hight scoole of futur\".",
        initialSituation: "Utilisateur marche dans les couloirs de hight scoole of futur et découvre sa petite amie discuter avec son meilleur ami, ils ont l'air très proches, trop proches ...",
        characters: [
            { name: "Rina", details: "jeune femme de 19 ans, petite amie de Utilisateur , se rapproche du meilleur ami de Utilisateur, étudiante à hight scoole of futur, calme, aimante, parfois un peu secrète, fille populaire de l'école, 165 cm, yeux marron, cheveux mi-long brun, traits fin, corpulence athlétique." },
            { name: "Kentaro", details: "Jeune homme de 20, meilleur ami de utilisateur, étudiant à hight scoole of futur, garçon populaire, charmant, 185 cm, athlétique voir costaud, yeux bleu, cheveux court blond, calculateur, impulsif, aime dragué les filles, se rapproche de la petite amie de Utilisateur, aime voir son meilleur ami souffrir." }
        ],
        enableRpgMode: true,
    };
    // Reset form with loaded data, which triggers the watch effect and updates parent
    form.reset(loadedData);
    toast({ title: "Prompt Chargé", description: "La configuration de l'aventure a été chargée depuis l'exemple." });
  };


  return (
    <Form {...form}>
      {/* No onSubmit needed here as updates happen via watch -> onSettingsChange */}
      <form className="space-y-4">
        <Card>
          <CardHeader>
             <div className="flex justify-between items-center">
                 <CardTitle>Configuration de l'Aventure</CardTitle>
                 {/* Keep Load Prompt button functional */}
                 <Button type="button" variant="outline" size="sm" onClick={handleLoadPrompt}>
                    <Upload className="mr-2 h-4 w-4" /> Charger Prompt Example
                </Button>
            </div>
            <CardDescription>
              Définissez les paramètres de base de votre aventure textuelle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

             {/* Character definition fields (kept in the form for adding/removing) */}
             <Accordion type="single" collapsible className="w-full">
               <AccordionItem value="character-definitions">
                <AccordionTrigger>Définir les Personnages</AccordionTrigger>
                <AccordionContent>
                 <ScrollArea className="h-48 pr-3">
                    <div className="space-y-4">
                    {fields.map((field, index) => (
                    <Card key={field.id} className="relative pt-6">
                         <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6"
                            onClick={() => remove(index)}
                            // disabled={fields.length <= 1} // Allow removing all characters
                        >
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      <CardContent className="space-y-2">
                        <FormField
                          control={form.control}
                          name={`characters.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nom du Personnage</FormLabel>
                              <FormControl>
                                <Input placeholder="Nom" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
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
                        Les détails complets (stats, inventaire, historique) sont gérés dans la section "Personnages Secondaires" une fois ajoutés.
                     </FormDescription>
                    </div>
                 </ScrollArea>
                 </AccordionContent>
              </AccordionItem>
            </Accordion>

          </CardContent>
        </Card>
      </form>
    </Form>
  );
}

    