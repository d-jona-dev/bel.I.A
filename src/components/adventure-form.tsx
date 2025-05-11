
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
import { PlusCircle, Trash2, Upload, Dices, User, Users, Heart, Gamepad2, Coins } from "lucide-react"; // Added icons
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { AdventureFormValues } from '@/app/page';

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
  enableRelationsMode: z.boolean().default(true).optional(), 
  playerName: z.string().optional().default("Player").describe("Le nom du personnage joueur."),
  currencyName: z.string().optional().describe("Le nom de la monnaie (si RPG activé)."),
  playerClass: z.string().optional().default("Aventurier").describe("Classe du joueur."),
  playerLevel: z.number().int().min(1).optional().default(1).describe("Niveau initial du joueur."),
  playerMaxHp: z.number().int().min(1).optional().default(20).describe("Points de vie maximum initiaux."),
  playerMaxMp: z.number().int().min(0).optional().default(0).describe("Points de magie maximum initiaux (0 si pas de magie)."),
  playerExpToNextLevel: z.number().int().min(1).optional().default(100).describe("EXP requis pour le prochain niveau."),
});

interface AdventureFormProps {
    propKey: number;
    initialValues: AdventureFormValues;
    onSettingsChange: (values: AdventureFormValues) => void;
}

export function AdventureForm({ propKey, initialValues, onSettingsChange }: AdventureFormProps) {
  const { toast } = useToast();
  const form = useForm<AdventureFormValues>({
    resolver: zodResolver(adventureFormSchema),
    defaultValues: initialValues,
    key: String(propKey), // Ensure form re-initializes when propKey changes
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "characters",
  });
  
  React.useEffect(() => {
    form.reset(initialValues);
  }, [initialValues, form, propKey]);


  React.useEffect(() => {
    const subscription = form.watch((value ) => {
      onSettingsChange(value as AdventureFormValues);
    });
    return () => {
      subscription.unsubscribe();
    };
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
        enableRelationsMode: true, 
        playerName: "Héros",
        currencyName: "Or",
        playerClass: "Étudiant Combattant",
        playerLevel: 1,
        playerMaxHp: 25,
        playerMaxMp: 10,
        playerExpToNextLevel: 100,
    };
    onSettingsChange(loadedData); // Update staged settings
    form.reset(loadedData); // Reset form with new values
    
    toast({ title: "Prompt Exemple Chargé", description: "La configuration de l'aventure a été chargée. Cliquez sur 'Enregistrer les modifications' pour appliquer." });
  };


  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>

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
                      value={field.value || ""}
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
              name="enableRelationsMode"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/50">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2"><Users className="h-4 w-4"/> Mode jeux de Relations</FormLabel>
                    <FormDescription>
                      Activer l'influence de l'affinité et des relations.
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
              name="enableRpgMode"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/50">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2"><Gamepad2 className="h-4 w-4"/> Mode Jeu de Rôle (RPG)</FormLabel>
                    <FormDescription>
                      Activer les systèmes RPG (stats, combat, EXP, etc.).
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
              <Card className="p-4 space-y-3 border-dashed bg-muted/20">
                 <FormDescription>Configurez les statistiques initiales du joueur pour le mode RPG.</FormDescription>
                 <FormField
                  control={form.control}
                  name="playerClass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Classe du Joueur</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Guerrier, Mage, Étudiant..." {...field} value={field.value || ""} className="bg-background border"/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="playerLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Niveau Initial</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1" {...field} value={field.value || 1} onChange={e => field.onChange(parseInt(e.target.value,10) || 1)} className="bg-background border"/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="playerMaxHp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PV Max Initiaux</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="20" {...field} value={field.value || 20} onChange={e => field.onChange(parseInt(e.target.value,10) || 1)} className="bg-background border"/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="playerMaxMp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PM Max Initiaux</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} value={field.value || 0} onChange={e => field.onChange(parseInt(e.target.value,10) || 0)} className="bg-background border"/>
                      </FormControl>
                       <FormDescription>Mettre 0 si le joueur n'utilise pas de magie.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="playerExpToNextLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>EXP pour Niveau Suivant</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="100" {...field} value={field.value || 100} onChange={e => field.onChange(parseInt(e.target.value,10) || 1)} className="bg-background border"/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="currencyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><Coins className="h-4 w-4"/>Nom de la Monnaie</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Or, Crédits, Gemmes..."
                          {...field}
                          value={field.value || ""}
                          className="bg-background border"
                        />
                      </FormControl>
                       <FormDescription>Le nom de la monnaie utilisée (optionnel).</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Card>
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
                    {fields.map((item, index) => (
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
                        Les détails complets (stats, inventaire, historique, relations) sont gérés dans la section "Personnages Secondaires" une fois ajoutés via "Enregistrer les modifications".
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

