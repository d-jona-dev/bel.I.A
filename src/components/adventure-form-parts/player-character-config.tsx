
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

interface PlayerCharacterConfigProps {
    aiConfig?: AiConfig;
}

export function PlayerCharacterConfig({ aiConfig }: PlayerCharacterConfigProps) {
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
                        
                    </Card>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
