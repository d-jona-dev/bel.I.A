
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
import { PlusCircle, Trash2, Upload, User, Users, Gamepad2, Coins, Dices, HelpCircle, BarChart2, Map, MapIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { AdventureSettings, MapPointOfInterest } from '@/types';
import { Separator } from "./ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

export type FormCharacterDefinition = { id?: string; name: string; details: string };

export type AdventureFormValues = Partial<Omit<AdventureSettings, 'rpgMode' | 'relationsMode' | 'strategyMode'>> & {
    characters: FormCharacterDefinition[];
    usePlayerAvatar?: boolean;
    // These are for form control only
    rpgMode?: boolean;
    relationsMode?: boolean;
    strategyMode?: boolean;
};


const characterSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Le nom est requis"),
  details: z.string().min(1, "Les détails sont requis"),
});

const BASE_ATTRIBUTE_VALUE_FORM = 8;
const POINTS_PER_LEVEL_GAIN_FORM = 5;

const adventureFormSchema = z.object({
  world: z.string().min(1, "La description du monde est requise"),
  initialSituation: z.string().min(1, "La situation initiale est requise"),
  characters: z.array(characterSchema).min(0),
  rpgMode: z.boolean().default(false).optional(),
  relationsMode: z.boolean().default(true).optional(),
  strategyMode: z.boolean().default(true).optional(),
  usePlayerAvatar: z.boolean().default(false).optional(),
  playerName: z.string().optional().default("Player").describe("Le nom du personnage joueur."),
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
  mapPointsOfInterest: z.array(z.any()).optional(),
});


interface AdventureFormProps {
    formPropKey: number;
    initialValues: AdventureFormValues;
    onSettingsChange: (values: AdventureFormValues) => void;
}

export function AdventureForm({ formPropKey, initialValues, onSettingsChange }: AdventureFormProps) {
  const { toast } = useToast();
  
  const form = useForm<AdventureFormValues>({
    resolver: zodResolver(adventureFormSchema),
    defaultValues: initialValues,
    mode: "onBlur",
  });
  
  const formRef = React.useRef(form);
  formRef.current = form;
  
  React.useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
        if(type === 'change') {
            onSettingsChange(value as AdventureFormValues);
        }
    });
    return () => subscription.unsubscribe();
  }, [form.watch, onSettingsChange]);

  React.useEffect(() => {
    form.reset(initialValues);
  }, [formPropKey, initialValues, form]);


  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "characters",
  });
  
  const { fields: poiFields, append: appendPoi, remove: removePoi } = useFieldArray({
    control: form.control,
    name: "mapPointsOfInterest"
  });


  const handleLoadPrompt = () => {
    // This is a placeholder for a more complex implementation.
    // In a real scenario, this would likely fetch from an API or a predefined list.
    const loadedData: AdventureFormValues = {
        world: "Grande université populaire nommée \"hight scoole of futur\".",
        initialSituation: "Utilisateur marche dans les couloirs de hight scoole of futur et découvre sa petite amie discuter avec son meilleur ami, ils ont l'air très proches, trop proches ...",
        characters: [
            { name: "Rina", details: "jeune femme de 19 ans, petite amie de Utilisateur , se rapproche du meilleur ami de Utilisateur, étudiante à hight scoole of futur, calme, aimante, parfois un peu secrète, fille populaire de l'école, 165 cm, yeux marron, cheveux mi-long brun, traits fin, corpulence athlétique." },
            { name: "Kentaro", details: "Jeune homme de 20, meilleur ami de utilisateur, étudiant à hight scoole of futur, garçon populaire, charmant, 185 cm, athlétique voir costaud, yeux bleu, cheveux court blond, calculateur, impulsif, aime dragué les filles, se rapproche de la petite amie de Utilisateur, aime voir son meilleur ami souffrir." }
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
    };
    form.reset(loadedData);
    onSettingsChange(loadedData);
    toast({ title: "Prompt Exemple Chargé", description: "La configuration a été mise à jour." });
  };
  
  const watchedValues = form.watch();
  const isRpgModeEnabled = watchedValues.rpgMode;
  const isRelationsModeEnabled = watchedValues.relationsMode;
  const isStrategyModeEnabled = watchedValues.strategyMode;
  const usePlayerAvatar = watchedValues.usePlayerAvatar;

  const ATTRIBUTES: (keyof AdventureFormValues)[] = ['playerStrength', 'playerDexterity', 'playerConstitution', 'playerIntelligence', 'playerWisdom', 'playerCharisma'];
  
  React.useEffect(() => {
    const level = form.getValues('playerLevel') || 1;
    const initialPoints = form.getValues('playerInitialAttributePoints') || 10;
    const levelPoints = (level > 1) ? ((level - 1) * POINTS_PER_LEVEL_GAIN_FORM) : 0;
    const totalPoints = initialPoints + levelPoints + (level === 1 ? 5 : 0);
    form.setValue('totalDistributableAttributePoints', totalPoints);
  }, [watchedValues.playerLevel, watchedValues.playerInitialAttributePoints, form]);
  
  const spentPoints = ATTRIBUTES.reduce((acc, attr) => {
    const value = watchedValues[attr] as number | undefined;
    return acc + ((value || BASE_ATTRIBUTE_VALUE_FORM) - BASE_ATTRIBUTE_VALUE_FORM);
  }, 0);
  const totalPoints = watchedValues.totalDistributableAttributePoints || 0;
  const remainingPoints = totalPoints - spentPoints;
  
  const handleAttributeChange = (field: keyof AdventureFormValues, value: number) => {
    const oldValue = form.getValues(field) as number || BASE_ATTRIBUTE_VALUE_FORM;
    const change = value - oldValue;
    
    if (change > 0 && change > remainingPoints) {
      value = oldValue + remainingPoints;
    }
    
    form.setValue(field, value);
  }

  const handleAttributeBlur = (field: keyof AdventureFormValues) => {
      let value = form.getValues(field) as number;
      if (isNaN(value) || value < BASE_ATTRIBUTE_VALUE_FORM) {
          value = BASE_ATTRIBUTE_VALUE_FORM;
          form.setValue(field, value);
      }
  }


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
              name="strategyMode"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/50">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2"><Map className="h-4 w-4"/> Mode Stratégie</FormLabel>
                    <FormDescription>
                      Activer la carte et la gestion des lieux.
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

            {isStrategyModeEnabled && (
                <Card className="p-4 space-y-3 border-dashed bg-muted/20">
                     <FormDescription>Configurez les points d'intérêt de votre aventure.</FormDescription>
                    <ScrollArea className="h-48 pr-3">
                        {poiFields.map((item, index) => (
                           <Card key={item.id} className="relative pt-6 bg-background border mb-2">
                                <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removePoi(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                               <CardContent className="space-y-2 p-3">
                                   <FormField control={form.control} name={`mapPointsOfInterest.${index}.name`} render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                   <FormField control={form.control} name={`mapPointsOfInterest.${index}.description`} render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>)} />
                                   <FormField control={form.control} name={`mapPointsOfInterest.${index}.icon`} render={({ field }) => (
                                     <FormItem>
                                       <FormLabel>Type</FormLabel>
                                       <Select onValueChange={field.onChange} defaultValue={field.value}>
                                         <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                         <SelectContent>
                                           <SelectItem value="Village">Ville</SelectItem>
                                           <SelectItem value="Trees">Forêt</SelectItem>
                                           <SelectItem value="Shield">Mine</SelectItem>
                                           <SelectItem value="Mountain">Montagne</SelectItem>
                                           <SelectItem value="Castle">Château</SelectItem>
                                           <SelectItem value="Landmark">Point d'intérêt</SelectItem>
                                         </SelectContent>
                                       </Select>
                                     </FormItem>
                                   )} />
                               </CardContent>
                           </Card>
                        ))}
                    </ScrollArea>
                    <Button type="button" variant="outline" size="sm" className="w-full mt-2" onClick={() => appendPoi({ name: "", description: "", icon: 'Village' })}>
                        <MapIcon className="mr-2 h-4 w-4"/>Ajouter un lieu
                    </Button>
                </Card>
            )}

            <FormField
              control={form.control}
              name="relationsMode"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/50">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2"><Users className="h-4 w-4"/> Mode Relations</FormLabel>
                    <FormDescription>
                      Activer l'affinité et les statuts relationnels.
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
            
             {isRelationsModeEnabled && (
                 <Card className="p-4 space-y-3 border-dashed bg-muted/20">
                     <p className="text-sm text-muted-foreground">La gestion détaillée des relations et affinités sera bientôt disponible ici.</p>
                 </Card>
            )}

             <FormField
              control={form.control}
              name="rpgMode"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/50">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2"><Gamepad2 className="h-4 w-4"/> Mode Jeu de Rôle (RPG)</FormLabel>
                    <FormDescription>
                      Activer les stats, le combat, l'inventaire...
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

            {isRpgModeEnabled && (
              <Card className="p-4 space-y-3 border-dashed bg-muted/20">
                 <FormDescription>Configurez les statistiques initiales du joueur pour le mode RPG.</FormDescription>
                 <FormField
                    control={form.control}
                    name="usePlayerAvatar"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel>Personnage Joueur</FormLabel>
                            <FormControl>
                                <RadioGroup
                                onValueChange={(value) => field.onChange(value === 'true')}
                                defaultValue={String(field.value)}
                                className="flex flex-col space-y-1"
                                >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl><RadioGroupItem value="false" /></FormControl>
                                    <FormLabel className="font-normal">Créer un héros prédéfini pour cette histoire</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl><RadioGroupItem value="true" /></FormControl>
                                    <FormLabel className="font-normal">Laisser le joueur utiliser son propre avatar</FormLabel>
                                </FormItem>
                                </RadioGroup>
                            </FormControl>
                        </FormItem>
                    )}
                 />

                {!usePlayerAvatar && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <FormField control={form.control} name="playerName" render={({ field }) => (<FormItem><FormLabel>Nom du Joueur</FormLabel><FormControl><Input placeholder="Nom du héros" {...field} value={field.value || ""} className="bg-background border"/></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="playerClass" render={({ field }) => (<FormItem><FormLabel>Classe du Joueur</FormLabel><FormControl><Input placeholder="Ex: Guerrier, Mage..." {...field} value={field.value || ""} className="bg-background border"/></FormControl><FormMessage /></FormItem>)}/>
                    </div>
                )}
                 <div className="grid grid-cols-2 gap-4">
                     <FormField control={form.control} name="playerLevel" render={({ field }) => (<FormItem><FormLabel>Niveau de départ</FormLabel><FormControl><Input type="number" min="1" {...field} value={field.value || 1} onChange={e => field.onChange(Number(e.target.value))} className="bg-background border"/></FormControl><FormMessage /></FormItem>)}/>
                 </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Dices className="h-4 w-4"/> Attributs du Joueur</Label>
                    <div className="p-2 border rounded-md bg-background text-center text-sm">
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
                                            onBlur={(e) => {
                                                let value = parseInt(e.target.value, 10);
                                                if (isNaN(value) || value < BASE_ATTRIBUTE_VALUE_FORM) {
                                                    value = BASE_ATTRIBUTE_VALUE_FORM;
                                                }
                                                handleAttributeChange(attr as any, value);
                                            }}
                                            className="h-8"
                                        />
                                    </FormControl>
                                </FormItem>
                              )}
                            />
                        ))}
                    </div>
                  </div>
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

             <Accordion type="single" collapsible className="w-full border-t pt-4" defaultValue="character-definitions">
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
                      <CardContent className="space-y-2 p-3">
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
                      onClick={() => append({ id: `new-${Date.now()}`, name: "", details: "" })}
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
      </form>
    </Form>
  );
}
