
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
import { PlusCircle, Trash2, Upload, User, Users, Gamepad2, Coins, Dices, HelpCircle, BarChart2, Map } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { AdventureFormValues } from '@/app/page';
import { Separator } from "./ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

const characterSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Le nom est requis"),
  details: z.string().min(1, "Les détails sont requis"),
});

const BASE_ATTRIBUTE_VALUE_FORM = 8;
const ATTRIBUTE_POINTS_PER_LEVEL_GAIN_FORM = 5; // Correspond à ATTRIBUTE_POINTS_PER_LEVEL_GAIN dans page.tsx

const adventureFormSchema = z.object({
  world: z.string().min(1, "La description du monde est requise"),
  initialSituation: z.string().min(1, "La situation initiale est requise"),
  characters: z.array(characterSchema).min(0),
  enableRpgMode: z.boolean().default(false).optional(),
  enableRelationsMode: z.boolean().default(true).optional(),
  enableStrategyMode: z.boolean().default(true).optional(),
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
  playerAttackBonus: z.number().int().optional().default(0),
  playerDamageBonus: z.string().optional().default("1"),
  playerMaxHp: z.number().int().min(1).optional().default(20),
  playerMaxMp: z.number().int().min(0).optional().default(0),
  playerArmorClass: z.number().int().optional().default(10),
  playerExpToNextLevel: z.number().int().min(1).optional().default(100),
  playerGold: z.number().int().min(0).optional().default(0),
}).superRefine((data, ctx) => {
    if (data.enableRpgMode) {
        const attributes = [
            data.playerStrength, data.playerDexterity, data.playerConstitution,
            data.playerIntelligence, data.playerWisdom, data.playerCharisma
        ];
        let spentPointsFromBase = 0;
        attributes.forEach(attr => {
            spentPointsFromBase += (attr || BASE_ATTRIBUTE_VALUE_FORM) - BASE_ATTRIBUTE_VALUE_FORM;
        });

        const totalDistributablePointsForLevel = data.totalDistributableAttributePoints || 0;


        if (spentPointsFromBase > totalDistributablePointsForLevel) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Vous avez dépassé le nombre de points d'attributs disponibles. (Dépensés au-delà de la base: ${spentPointsFromBase}, Disponibles: ${totalDistributablePointsForLevel})`,
                path: ["totalDistributableAttributePoints"],
            });
        }
    }
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
    values: initialValues,
    mode: "onBlur",
  });

  React.useEffect(() => {
    form.reset(initialValues);
  }, [formPropKey, initialValues, form]);


  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "characters",
  });

  const handleSettingsBlur = () => {
    onSettingsChange(form.getValues());
  };

  const handleSettingsChange = () => {
      // This function will be used for controls like switches that update immediately.
      onSettingsChange(form.getValues());
  }


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
        enableStrategyMode: true,
        playerName: "Héros",
        playerClass: "Étudiant Combattant",
        playerLevel: 1,
        playerInitialAttributePoints: 10,
        totalDistributableAttributePoints: 10, // Au niveau 1, total = création
        playerStrength: 8,
        playerDexterity: 8,
        playerConstitution: 8,
        playerIntelligence: 8,
        playerWisdom: 8,
        playerCharisma: 8,
        playerAttackBonus: 0,
        playerDamageBonus: "1d4",
        playerMaxHp: 25,
        playerMaxMp: 10,
        playerArmorClass: 10,
        playerExpToNextLevel: 100,
        playerGold: 50,
    };
    onSettingsChange(loadedData);
    toast({ title: "Prompt Exemple Chargé", description: "La configuration de l'aventure a été chargée. Cliquez sur 'Enregistrer les modifications' pour appliquer." });
  };

  const isRpgModeEnabled = form.watch('enableRpgMode');

  const totalDistributablePointsForCurrentLevel = React.useMemo(() => {
    return initialValues.totalDistributableAttributePoints || 0;
  }, [initialValues.totalDistributableAttributePoints]);


  const calculateSpentPoints = React.useCallback(() => {
    let spent = 0;
    const currentValues = form.getValues();
    const attributesToSum: (keyof AdventureFormValues)[] = [
        "playerStrength", "playerDexterity", "playerConstitution",
        "playerIntelligence", "playerWisdom", "playerCharisma"
    ];
    attributesToSum.forEach(attrKey => {
        spent += (Number(currentValues[attrKey]) || BASE_ATTRIBUTE_VALUE_FORM) - BASE_ATTRIBUTE_VALUE_FORM;
    });
    return spent;
  }, [form]);

  const [spentPoints, setSpentPoints] = React.useState(() => calculateSpentPoints());

  React.useEffect(() => {
    setSpentPoints(calculateSpentPoints());
  }, [
      form.watch("playerStrength"), form.watch("playerDexterity"), form.watch("playerConstitution"),
      form.watch("playerIntelligence"), form.watch("playerWisdom"), form.watch("playerCharisma"),
      calculateSpentPoints
  ]);

  const remainingPoints = totalDistributablePointsForCurrentLevel - spentPoints;

  const handleAttributeBlur = (
    fieldName: keyof AdventureFormValues,
    value: string
  ) => {
    const numericValue = parseInt(value, 10);
    let newAttributeValue = isNaN(numericValue) || numericValue < BASE_ATTRIBUTE_VALUE_FORM
        ? BASE_ATTRIBUTE_VALUE_FORM
        : numericValue;

    const currentAttributeValue = Number(form.getValues(fieldName)) || BASE_ATTRIBUTE_VALUE_FORM;
    const spentBeforeThisChange = calculateSpentPoints() - (currentAttributeValue - BASE_ATTRIBUTE_VALUE_FORM);
    const costOfNewValue = newAttributeValue - BASE_ATTRIBUTE_VALUE_FORM;
    const projectedTotalSpentPoints = spentBeforeThisChange + costOfNewValue;

    if (projectedTotalSpentPoints > totalDistributablePointsForCurrentLevel) {
        const pointsOver = projectedTotalSpentPoints - totalDistributablePointsForCurrentLevel;
        newAttributeValue -= pointsOver;
    }

    form.setValue(fieldName, newAttributeValue, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    handleSettingsBlur();
  };


  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>

        <div className="space-y-4">
            <div className="flex justify-end">
                 <Button type="button" variant="outline" size="sm" onClick={handleLoadPrompt}>
                    <Upload className="mr-2 h-4 w-4" /> Charger Prompt Exemple
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
                      onBlur={handleSettingsBlur}
                    />
                  </FormControl>
                   <FormDescription>Le nom que le joueur portera dans l'aventure.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="enableStrategyMode"
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
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        handleSettingsChange();
                      }}
                    />
                  </FormControl>
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
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        handleSettingsChange();
                      }}
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
                      Activer les systèmes RPG (stats, combat, etc.).
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        handleSettingsChange();
                      }}
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
                  name="playerClass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Classe du Joueur</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Guerrier, Mage, Étudiant..." {...field} value={field.value || ""} className="bg-background border" onBlur={handleSettingsBlur}/>
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
                      <FormLabel>Niveau Joueur</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1" {...field} value={field.value || 1} onChange={e => field.onChange(parseInt(e.target.value,10) || 1)} className="bg-background border" onBlur={handleSettingsBlur}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Separator className="my-3"/>
                <div className="flex items-center gap-2">
                    <Dices className="h-5 w-5 text-primary"/>
                    <h4 className="font-semibold">Distribution des Points d'Attributs</h4>
                </div>
                 <FormField
                  control={form.control}
                  name="playerInitialAttributePoints"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Points d'Attributs de Création (Niv. 1)</FormLabel>
                      <FormControl>
                        <Input
                            type="number"
                            {...field}
                            value={field.value || 0}
                            onChange={e => field.onChange(parseInt(e.target.value,10) || 0)}
                            onBlur={handleSettingsBlur}
                            className="bg-background border"
                        />
                      </FormControl>
                       <FormDescription>
                         Points bonus à ajouter aux scores de base (8) lors de la création du personnage.
                       </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                    <FormLabel>Total de Points d'Attributs Bonus Distribuables (Niv. {initialValues.playerLevel || 1})</FormLabel>
                    <Input
                        type="number"
                        value={totalDistributablePointsForCurrentLevel}
                        readOnly
                        className="bg-muted border text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 cursor-default"
                    />
                    <FormDescription>
                        ({initialValues.playerInitialAttributePoints || 0} points de création + {ATTRIBUTE_POINTS_PER_LEVEL_GAIN_FORM} points par niveau après le Niv. 1).
                    </FormDescription>
                     {form.formState.errors.totalDistributableAttributePoints && (
                        <p className="text-xs text-destructive">{form.formState.errors.totalDistributableAttributePoints.message}</p>
                    )}
                </FormItem>

                 <div className="p-2 border rounded-md bg-background text-center">
                    <p className="text-sm font-medium">Points d'attributs restants à distribuer : <span className={`font-bold ${remainingPoints < 0 ? 'text-destructive' : 'text-primary'}`}>{remainingPoints}</span></p>
                </div>

                 <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {(["playerStrength", "playerDexterity", "playerConstitution", "playerIntelligence", "playerWisdom", "playerCharisma"] as const).map(attr => (
                         <FormField
                            key={attr}
                            control={form.control}
                            name={attr}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="capitalize">{attr.replace("player", "")} (Base {BASE_ATTRIBUTE_VALUE_FORM})</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            {...field}
                                            value={field.value ?? ''}
                                            onBlur={e => handleAttributeBlur(attr, e.target.value)}
                                            min={BASE_ATTRIBUTE_VALUE_FORM}
                                            className="bg-background border"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    ))}
                 </div>
                 <Separator className="my-3"/>
                 <div className="flex items-center gap-2">
                    <BarChart2 className="h-5 w-5 text-primary"/>
                    <h4 className="font-semibold">Statistiques de Combat et Autres (Calculées)</h4>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <FormItem>
                      <FormLabel>Bonus d'Attaque</FormLabel>
                      <FormControl>
                        <Input type="text" value={initialValues.playerAttackBonus ? `+${initialValues.playerAttackBonus}` : '0'} readOnly className="bg-muted border text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 cursor-default"/>
                      </FormControl>
                    </FormItem>
                    <FormItem>
                      <FormLabel>Bonus de Dégâts</FormLabel>
                      <FormControl>
                        <Input value={initialValues.playerDamageBonus || "1"} readOnly className="bg-muted border text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 cursor-default"/>
                      </FormControl>
                    </FormItem>
                    <FormItem>
                      <FormLabel>PV Max</FormLabel>
                      <FormControl>
                        <Input type="number" value={initialValues.playerMaxHp || 0} readOnly className="bg-muted border text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 cursor-default"/>
                      </FormControl>
                    </FormItem>
                    <FormItem>
                      <FormLabel>PM Max</FormLabel>
                      <FormControl>
                        <Input type="number" value={initialValues.playerMaxMp || 0} readOnly className="bg-muted border text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 cursor-default"/>
                      </FormControl>
                    </FormItem>
                    <FormItem>
                        <FormLabel>Classe d'Armure (CA)</FormLabel>
                        <FormControl>
                            <Input type="number" value={initialValues.playerArmorClass || 0} readOnly className="bg-muted border text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 cursor-default"/>
                        </FormControl>
                    </FormItem>
                 </div>
                 <Separator className="my-3"/>
                <FormField
                  control={form.control}
                  name="playerExpToNextLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>EXP pour Niveau Suivant</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="100" {...field} value={field.value || 100} onChange={e => field.onChange(parseInt(e.target.value,10) || 1)} className="bg-background border" onBlur={handleSettingsBlur}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="playerGold"
                  render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center gap-1"><Coins className="h-4 w-4"/> Or Initial</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} value={field.value || 0} onChange={e => field.onChange(parseInt(e.target.value,10) || 0)} className="bg-background border" onBlur={handleSettingsBlur}/>
                      </FormControl>
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
                      onBlur={handleSettingsBlur}
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
                      onBlur={handleSettingsBlur}
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
                      <CardContent className="space-y-2">
                        <FormField
                          control={form.control}
                          name={`characters.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nom du Personnage</FormLabel>
                              <FormControl>
                                <Input placeholder="Nom" {...field} className="bg-background border" onBlur={handleSettingsBlur}/>
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
                                  onBlur={handleSettingsBlur}
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
