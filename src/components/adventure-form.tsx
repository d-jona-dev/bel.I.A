"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { PlusCircle, Trash2, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";

// Schema definition based on user request
const characterSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  details: z.string().min(1, "Les détails sont requis"),
});

const adventureFormSchema = z.object({
  world: z.string().min(1, "La description du monde est requise"),
  initialSituation: z.string().min(1, "La situation initiale est requise"),
  characters: z.array(characterSchema).min(1, "Au moins un personnage secondaire est requis"),
});

type AdventureFormValues = z.infer<typeof adventureFormSchema>;

export function AdventureForm() {
  const form = useForm<AdventureFormValues>({
    resolver: zodResolver(adventureFormSchema),
    defaultValues: {
      world: "",
      initialSituation: "",
      characters: [{ name: "", details: "" }],
    },
  });

   const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "characters",
  });


  function onSubmit(data: AdventureFormValues) {
    // TODO: Handle form submission - likely triggering the AI generation
    console.log(data);
    // Placeholder for AI call or state update
  }

   const handleLoadPrompt = () => {
    // TODO: Implement prompt loading logic
    console.log("Chargement du prompt...");
    // Example of resetting form with loaded data (replace with actual loaded data)
    form.reset({
        world: "Grande université populaire nommée \"hight scoole of futur\".",
        initialSituation: "Utilisateur marche dans les couloirs de hight scoole of futur et découvre sa petite amie discuter avec son meilleur ami, ils ont l'air très proches, trop proches ...",
        characters: [
            { name: "Rina", details: "jeune femme de 19 ans, petite amie de Utilisateur , se rapproche du meilleur ami de Utilisateur, étudiante à hight scoole of futur, calme, aimante, parfois un peu secrète, fille populaire de l'école, 165 cm, yeux marron, cheveux mi-long brun, traits fin, corpulence athlétique." },
            { name: "Kentaro", details: "Jeune homme de 20, meilleur ami de utilisateur, étudiant à hight scoole of futur, garçon populaire, charmant, 185 cm, athlétique voir costaud, yeux bleu, cheveux court blond, calculateur, impulsif, aime dragué les filles, se rapproche de la petite amie de Utilisateur, aime voir son meilleur ami souffrir." }
        ]
    });
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
             <div className="flex justify-between items-center">
                 <CardTitle>Configuration de l'Aventure</CardTitle>
                 <Button type="button" variant="outline" size="sm" onClick={handleLoadPrompt}>
                    <Upload className="mr-2 h-4 w-4" /> Charger Prompt
                </Button>
            </div>
            <CardDescription>
              Définissez les paramètres de votre aventure textuelle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
               <AccordionItem value="item-0">
                <AccordionTrigger>Personnages Secondaires ({fields.length})</AccordionTrigger>
                <AccordionContent>
                 <ScrollArea className="h-48 pr-3"> {/* Added ScrollArea */}
                    <div className="space-y-4">
                    {fields.map((field, index) => (
                    <Card key={field.id} className="relative pt-6">
                         <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6"
                            onClick={() => remove(index)}
                            disabled={fields.length <= 1}
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
                              <FormLabel>Détails</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Caractère, historique, physique, etc."
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
                    </div>
                 </ScrollArea>
                 </AccordionContent>
              </AccordionItem>
            </Accordion>


            {/* Submit button is removed as configuration might not need explicit submission,
                it could update the state directly or be used by another component */}
            {/* <Button type="submit">Démarrer l'Aventure</Button> */}
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
