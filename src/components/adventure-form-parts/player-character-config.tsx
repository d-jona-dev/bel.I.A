
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
  Card,
  CardContent,
} from "@/components/ui/card";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Dices, HelpCircle, User, UserCircle } from "lucide-react";

import type { AdventureFormValues } from "../adventure-form";
import type { PlayerAvatar, AiConfig } from "@/types";

const BASE_ATTRIBUTE_VALUE_FORM = 8;
const POINTS_PER_LEVEL_GAIN_FORM = 5;

interface PlayerCharacterConfigProps {
    aiConfig?: AiConfig;
    initialValues: AdventureFormValues;
}

export function PlayerCharacterConfig({ aiConfig, initialValues }: PlayerCharacterConfigProps) {
    const { control, watch, setValue, getValues } = useFormContext<AdventureFormValues>();
    const [savedAvatars, setSavedAvatars] = React.useState<PlayerAvatar[]>([]);

    const watchedValues = watch();

    React.useEffect(() => {
        try {
            const storedAvatars = localStorage.getItem('playerAvatars_v2');
            if (storedAvatars) setSavedAvatars(JSON.parse(storedAvatars));
        } catch (error) {
            console.error("Failed to load avatars from localStorage", error);
        }
    }, []);

    const ATTRIBUTES: (keyof AdventureFormValues)[] = ['playerStrength', 'playerDexterity', 'playerConstitution', 'playerIntelligence', 'playerWisdom', 'playerCharisma'];

    React.useEffect(() => {
        const level = getValues('playerLevel') || 1;
        const initialPoints = getValues('playerInitialAttributePoints') || 10;
        const levelPoints = (level > 1) ? ((level - 1) * POINTS_PER_LEVEL_GAIN_FORM) : 0;
        const totalPoints = initialPoints + levelPoints;
        setValue('totalDistributableAttributePoints', totalPoints);
    }, [watchedValues.playerLevel, watchedValues.playerInitialAttributePoints, setValue, getValues]);
    
    const spentPoints = ATTRIBUTES.reduce((acc, attr) => {
        const value = watchedValues[attr] as number | undefined;
        return acc + ((value || BASE_ATTRIBUTE_VALUE_FORM) - BASE_ATTRIBUTE_VALUE_FORM);
    }, 0);
    const totalPoints = watchedValues.totalDistributableAttributePoints || 0;
    const remainingPoints = totalPoints - spentPoints;

    const handleAttributeBlur = (field: keyof AdventureFormValues) => {
        let value = getValues(field) as number;
        if (isNaN(value) || value < BASE_ATTRIBUTE_VALUE_FORM) {
            value = BASE_ATTRIBUTE_VALUE_FORM;
        }
        
        const currentSpentExcludingThis = ATTRIBUTES.reduce((acc, attr) => {
            if (attr === field) return acc;
            return acc + ((getValues(attr) as number || BASE_ATTRIBUTE_VALUE_FORM) - BASE_ATTRIBUTE_VALUE_FORM);
        }, 0);
        
        if (currentSpentExcludingThis + (value - BASE_ATTRIBUTE_VALUE_FORM) > totalPoints) {
            value = totalPoints - currentSpentExcludingThis + BASE_ATTRIBUTE_VALUE_FORM;
        }
        
        setValue(field, value, { shouldDirty: true, shouldValidate: true });
    }

    const handleAvatarSelection = (avatarId: string) => {
        const avatar = savedAvatars.find(a => a.id === avatarId);
        if (avatar) {
            setValue('playerName', avatar.name);
            setValue('playerClass', avatar.class);
            setValue('playerLevel', avatar.level);
            setValue('playerDetails', avatar.details);
            setValue('playerDescription', avatar.description);
            setValue('playerOrientation', avatar.orientation);
            setValue('playerPortraitUrl', avatar.portraitUrl);
        } else {
            setValue('playerName', 'Héros');
            setValue('playerClass', 'Aventurier');
            setValue('playerLevel', 1);
            setValue('playerDetails', '');
            setValue('playerDescription', '');
            setValue('playerOrientation', '');
            setValue('playerPortraitUrl', null);
        }
    };
    
    const bonusFor = (stat: keyof (AdventureFormValues['computedStats']['bonuses'])): number => {
        return initialValues.computedStats?.bonuses?.[stat] || 0;
    };


    return (
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
                                <FormField control={control} name="playerName" render={({ field }) => (<FormItem><FormLabel>Nom du Héros</FormLabel><FormControl><Input placeholder="Nom du héros" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={control} name="playerPortraitUrl" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>URL du Portrait</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="https://example.com/portrait.png" 
                                        {...field}
                                        value={field.value || ''}
                                        onBlur={(e) => setValue('playerPortraitUrl', e.target.value, { shouldValidate: true, shouldDirty: true })}
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
                        <FormField control={control} name="playerDetails" render={({ field }) => (<FormItem className="mt-4"><FormLabel>Détails (Physique, Âge)</FormLabel><FormControl><Textarea placeholder="Décrivez l'apparence physique de votre héros..." {...field} value={field.value || ""} rows={2} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={control} name="playerOrientation" render={({ field }) => (<FormItem className="mt-4"><FormLabel>Orientation Amoureuse</FormLabel><FormControl><Input placeholder="Ex: Hétérosexuel, Bisexuel..." {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={control} name="playerDescription" render={({ field }) => (<FormItem className="mt-4"><FormLabel>Description (Background)</FormLabel><FormControl><Textarea placeholder="Racontez son histoire, ses capacités spéciales..." {...field} value={field.value || ""} rows={3} /></FormControl><FormMessage /></FormItem>)}/>
                        
                        {watchedValues.rpgMode && (
                            <>
                                <Separator className="my-4"/>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={control} name="playerClass" render={({ field }) => (<FormItem><FormLabel>Classe du Joueur</FormLabel><FormControl><Input placeholder="Ex: Guerrier, Mage..." {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>)}/>
                                    <FormField control={control} name="playerLevel" render={({ field }) => (<FormItem><FormLabel>Niveau de départ</FormLabel><FormControl><Input type="number" min="1" {...field} value={field.value || 1} onChange={e => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>)}/>
                                    <FormField control={control} name="playerGold" render={({ field }) => (<FormItem><FormLabel>Or de départ</FormLabel><FormControl><Input type="number" min="0" {...field} value={field.value || 0} onChange={e => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>)}/>
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
                                            const bonusValue = bonusFor(attr as keyof typeof initialValues.computedStats.bonuses);
                                            return (
                                                 <FormField
                                                    key={attr}
                                                    control={control}
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
    );
}

    