
"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Wand2, Loader2, PawPrint, Save, UploadCloud, Star, BarChart2, CheckCircle, Diamond, Palette, Trash2, RefreshCw } from "lucide-react";
import type { GenerateSceneImageInput, GenerateSceneImageOutput } from "@/ai/flows/generate-scene-image";
import { useToast } from "@/hooks/use-toast";
import type { Familiar } from "@/types";
import { Progress } from "@/components/ui/progress";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";


interface FamiliarSidebarProps {
    familiars: Familiar[];
    onFamiliarUpdate: (updatedFamiliar: Familiar) => void;
    onSaveFamiliar: (familiar: Familiar) => void;
    onAddStagedFamiliar: (familiar: Familiar) => void;
    generateImageAction: (input: GenerateSceneImageInput) => Promise<GenerateSceneImageOutput>;
    rpgMode: boolean;
    onRefreshGlobalFamiliars?: () => void; // Optional refresh function
}

interface CustomImageStyle {
  name: string;
  prompt: string;
}

const defaultImageStyles: Array<{ name: string; isDefault: true }> = [
    { name: "Par Défaut", isDefault: true },
    { name: "Réaliste", isDefault: true },
    { name: "Manga / Anime", isDefault: true },
    { name: "Fantaisie Epique", isDefault: true },
    { name: "Peinture à l'huile", isDefault: true },
    { name: "Comics", isDefault: true },
];


export function FamiliarSidebar({
    familiars,
    onFamiliarUpdate,
    onSaveFamiliar,
    onAddStagedFamiliar,
    generateImageAction,
    rpgMode,
    onRefreshGlobalFamiliars,
}: FamiliarSidebarProps) {
  const [imageLoadingStates, setImageLoadingStates] = React.useState<Record<string, boolean>>({});
  const [isClient, setIsClient] = React.useState(false);
  const [globalFamiliars, setGlobalFamiliars] = React.useState<Familiar[]>([]);
  const { toast } = useToast();
  const [imageStyle, setImageStyle] = React.useState<string>("");
  const [customStyles, setCustomStyles] = React.useState<CustomImageStyle[]>([]);


  const loadGlobalFamiliars = React.useCallback(() => {
     if (typeof window !== 'undefined') {
        try {
            const storedGlobal = localStorage.getItem('globalFamiliars');
            if (storedGlobal) {
                setGlobalFamiliars(JSON.parse(storedGlobal));
            } else {
                setGlobalFamiliars([]);
            }
        } catch (error) {
            console.error("Failed to load global familiars:", error);
        }
    }
  }, []);

  React.useEffect(() => {
    setIsClient(true);
    loadGlobalFamiliars();

    const savedStyles = localStorage.getItem("customImageStyles_v1");
    if (savedStyles) {
        setCustomStyles(JSON.parse(savedStyles));
    }
    
    // Listen for storage changes from other tabs/windows
    window.addEventListener('storage', loadGlobalFamiliars);
    return () => {
      window.removeEventListener('storage', loadGlobalFamiliars);
    }
  }, [loadGlobalFamiliars]);
  
  const handleRefresh = () => {
    loadGlobalFamiliars();
    if(onRefreshGlobalFamiliars) {
      onRefreshGlobalFamiliars();
    }
    toast({ title: "Liste Actualisée", description: "La liste des familiers sauvegardés a été rechargée."});
  };

  const handleGeneratePortrait = async (familiar: Familiar) => {
    if (imageLoadingStates[familiar.id]) return;
    setImageLoadingStates(prev => ({ ...prev, [familiar.id]: true }));

    try {
      const prompt = `Generate a portrait of a fantasy creature: ${familiar.name}. Description: ${familiar.description}. Rarity: ${familiar.rarity}.`;
      const result = await generateImageAction({ sceneDescription: prompt, style: imageStyle });
      onFamiliarUpdate({ ...familiar, portraitUrl: result.imageUrl });
      toast({ title: "Portrait Généré", description: `Le portrait de ${familiar.name} a été généré.` });
    } catch (error) {
      console.error(`Error generating portrait for ${familiar.name}:`, error);
      toast({ title: "Erreur", description: `Impossible de générer le portrait de ${familiar.name}.`, variant: "destructive" });
    } finally {
      setImageLoadingStates(prev => ({ ...prev, [familiar.id]: false }));
    }
  };

  const handleUploadPortrait = (familiarId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
        const familiar = familiars.find(f => f.id === familiarId);
        if (familiar) {
            onFamiliarUpdate({ ...familiar, portraitUrl: reader.result as string });
        }
    };
    reader.readAsDataURL(file);
    if(event.target) event.target.value = '';
  };
  
  const handleToggleActive = (familiarId: string) => {
      const familiar = familiars.find(f => f.id === familiarId);
      if (familiar) {
          onFamiliarUpdate({ ...familiar, isActive: !familiar.isActive });
      }
  }

  const rarityColorClass = (rarity: Familiar['rarity']) => {
    switch (rarity) {
      case 'common': return 'text-gray-500';
      case 'uncommon': return 'text-green-500';
      case 'rare': return 'text-blue-500';
      case 'epic': return 'text-purple-500';
      case 'legendary': return 'text-orange-500';
      default: return 'text-gray-500';
    }
  };
  
  const availableGlobalFamiliars = globalFamiliars.filter(gf => !familiars.some(sf => sf.id === gf.id || sf.name === gf.name));


  return (
    <div className="w-full">
        {isClient && (
            <Card className="mb-4 border-dashed">
                <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                        <span className="flex items-center gap-2">Ajouter un Familier Sauvegardé</span>
                         <TooltipProvider>
                           <Tooltip>
                               <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRefresh}>
                                        <RefreshCw className="h-4 w-4"/>
                                    </Button>
                               </TooltipTrigger>
                               <TooltipContent>
                                   <p>Actualiser la liste globale</p>
                               </TooltipContent>
                           </Tooltip>
                       </TooltipProvider>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {globalFamiliars.length === 0 ? (
                        <p className="text-sm text-muted-foreground mt-1">
                            Aucun familier global sauvegardé pour l'instant.
                        </p>
                    ) : availableGlobalFamiliars.length > 0 ? (
                        <Select onValueChange={(id) => {
                            const familiar = globalFamiliars.find(f => f.id === id);
                            if (familiar) onAddStagedFamiliar(familiar);
                        }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner pour ajouter..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableGlobalFamiliars.map(gf => (
                                    <SelectItem key={gf.id} value={gf.id}>
                                        {gf.name} ({gf.rarity})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <p className="text-sm text-muted-foreground mt-1">
                            Tous les familiers sauvegardés sont déjà dans l'aventure.
                        </p>
                    )}
                </CardContent>
            </Card>
        )}

        {familiars.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Aucun familier dans l'aventure actuelle.</p>
        ) : (
            <Accordion type="multiple" className="w-full">
                {familiars.map((familiar) => (
                    <AccordionItem value={familiar.id} key={familiar.id}>
                       <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                     {imageLoadingStates[familiar.id] ? <AvatarFallback><Loader2 className="h-4 w-4 animate-spin"/></AvatarFallback>
                                     : familiar.portraitUrl ? <AvatarImage src={familiar.portraitUrl} alt={familiar.name} />
                                     : <AvatarFallback><PawPrint /></AvatarFallback>}
                                </Avatar>
                                <div className="truncate">
                                    <span className="font-medium truncate">{familiar.name}</span>
                                    {familiar.isActive && <CheckCircle className="inline h-4 w-4 ml-1 text-green-500" />}
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 space-y-4 bg-background">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-24 h-24 relative rounded-md overflow-hidden border bg-muted flex items-center justify-center">
                                    {imageLoadingStates[familiar.id] ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/>
                                     : familiar.portraitUrl ? <Image src={familiar.portraitUrl} alt={`${familiar.name} portrait`} layout="fill" objectFit="cover" />
                                     : <PawPrint className="h-10 w-10 text-muted-foreground"/>}
                                </div>
                                <div className="flex gap-2">
                                     <DropdownMenu>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="icon" className="h-8 w-8">
                                                            <Palette className="h-4 w-4"/>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Choisir un style d'image</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        <DropdownMenuContent>
                                            {defaultImageStyles.map(style => (
                                                <DropdownMenuItem key={style.name} onSelect={() => setImageStyle(style.name === "Par Défaut" ? "" : style.name)}>{style.name}</DropdownMenuItem>
                                            ))}
                                            {customStyles.length > 0 && <DropdownMenuSeparator />}
                                            {customStyles.map(style => (
                                                 <DropdownMenuItem key={style.name} onSelect={() => setImageStyle(style.prompt)}>{style.name}</DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    <Button variant="outline" size="sm" onClick={() => handleGeneratePortrait(familiar)} disabled={imageLoadingStates[familiar.id]}><Wand2 className="h-4 w-4 mr-1"/> IA</Button>
                                    <input type="file" accept="image/*" id={`upload-familiar-${familiar.id}`} className="hidden" onChange={(e) => handleUploadPortrait(familiar.id, e)} />
                                    <Button variant="outline" size="sm" onClick={() => document.getElementById(`upload-familiar-${familiar.id}`)?.click()}><UploadCloud className="h-4 w-4 mr-1"/> Télécharger</Button>
                                </div>
                           </div>
                           <Separator/>
                           <Card className="border-dashed bg-muted/20">
                                <CardContent className="pt-4 space-y-2 text-sm">
                                    <p className="font-semibold text-base">{familiar.name}</p>
                                    <p className={`capitalize font-bold ${rarityColorClass(familiar.rarity)} flex items-center gap-1`}>
                                        <Diamond className="h-4 w-4" /> Rareté: {familiar.rarity}
                                    </p>
                                    <p>{familiar.description}</p>
                                    <p className="font-semibold text-primary">Bonus Actif (Niv. {familiar.level}): {familiar.passiveBonus.description.replace('X', String(familiar.passiveBonus.value * familiar.level))}</p>
                                    {rpgMode && (
                                        <div>
                                            <Label className="text-xs font-medium flex items-center"><BarChart2 className="h-3 w-3 mr-1 text-yellow-500"/>EXP</Label>
                                            <Progress value={(familiar.currentExp / familiar.expToNextLevel) * 100} className="h-1.5 mt-1 [&>div]:bg-yellow-500" />
                                            <p className="text-xs text-muted-foreground text-right">{familiar.currentExp} / {familiar.expToNextLevel}</p>
                                        </div>
                                    )}
                                </CardContent>
                           </Card>
                           <div className="flex flex-col gap-2">
                                <Button variant={familiar.isActive ? "secondary" : "default"} onClick={() => handleToggleActive(familiar.id)}>{familiar.isActive ? 'Renvoyer' : 'Faire Suivre'}</Button>
                                <Button variant="outline" onClick={() => onSaveFamiliar(familiar)}>
                                    <Save className="h-4 w-4 mr-2" />
                                    {familiar._lastSaved ? `Sauvegardé` : 'Sauvegarder Globalement'}
                                </Button>
                           </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        )}
    </div>
  );
}
