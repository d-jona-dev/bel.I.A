
"use client";

import * as React from "react";
import Image from "next/image";
import { Castle, Trees, Mountain, Home as VillageIcon, Shield as ShieldIcon, Landmark, MoveRight, Search, Type as FontIcon, Wand2, Loader2, Move, Briefcase, Swords, PlusSquare, Building, Building2, TreeDeciduous, TreePine, Hammer, Gem } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Character, MapPointOfInterest } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface MapDisplayProps {
    playerId: string;
    pointsOfInterest: MapPointOfInterest[];
    onMapAction: (poiId: string, action: 'travel' | 'examine' | 'collect' | 'attack' | 'upgrade') => void;
    useAestheticFont: boolean;
    onToggleAestheticFont: () => void;
    mapImageUrl: string | null | undefined;
    onGenerateMap: () => Promise<void>;
    isGeneratingMap: boolean;
    onPoiPositionChange: (poiId: string, newPosition: { x: number, y: number }) => void;
    characters: Character[];
    playerName: string;
    onCreatePoi: (data: { name: string; description: string; type: MapPointOfInterest['icon']; ownerId: string }) => void;
}

const iconMap: Record<MapPointOfInterest['icon'] | 'Building' | 'Building2' | 'TreeDeciduous' | 'TreePine' | 'Hammer' | 'Gem', React.ElementType> = {
    Castle: Castle,
    Mountain: Mountain,
    Trees: Trees,
    Village: VillageIcon,
    Shield: ShieldIcon,
    Landmark: Landmark,
    Building: Building,
    Building2: Building2,
    TreeDeciduous: TreeDeciduous,
    TreePine: TreePine,
    Hammer: Hammer,
    Gem: Gem,
};

const getIconForPoi = (poi: MapPointOfInterest) => {
    const level = poi.level || 1;
    if (poi.icon === 'Village') {
        if (level <= 2) return iconMap.Village;
        if (level === 3) return iconMap.Building;
        if (level === 4) return iconMap.Building2;
        if (level === 5) return iconMap.Landmark;
        if (level >= 6) return iconMap.Castle;
    }
    if (poi.icon === 'Trees') { // Forêt
        if (level === 1) return iconMap.TreeDeciduous;
        if (level === 2) return iconMap.Trees;
        if (level >= 3) return iconMap.TreePine;
    }
    if (poi.icon === 'Shield') { // Mine
        if (level === 1) return iconMap.Shield;
        if (level === 2) return iconMap.Hammer;
        if (level >= 3) return iconMap.Gem;
    }
    return iconMap[poi.icon] || Landmark;
};

const poiLevelNameMap: Record<string, Record<number, string>> = {
    Village: {
        1: 'Village',
        2: 'Bourg',
        3: 'Petite Ville',
        4: 'Ville Moyenne',
        5: 'Grande Ville',
        6: 'Métropole',
    },
    Trees: {
        1: 'Petite Forêt',
        2: 'Forêt Moyenne',
        3: 'Grande Forêt',
    },
    Shield: {
        1: 'Petite Mine',
        2: 'Mine Moyenne',
        3: 'Grande Mine',
    }
};


export function MapDisplay({ playerId, pointsOfInterest, onMapAction, useAestheticFont, onToggleAestheticFont, mapImageUrl, onGenerateMap, isGeneratingMap, onPoiPositionChange, characters, playerName, onCreatePoi }: MapDisplayProps) {
    const { toast } = useToast();
    const [draggingPoi, setDraggingPoi] = React.useState<string | null>(null);
    const mapRef = React.useRef<HTMLDivElement>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
    const [newPoiName, setNewPoiName] = React.useState("");
    const [newPoiDescription, setNewPoiDescription] = React.useState("");
    const [newPoiType, setNewPoiType] = React.useState<MapPointOfInterest['icon']>("Village");
    const [newPoiOwnerId, setNewPoiOwnerId] = React.useState(playerId);


    const handleMouseDown = (e: React.MouseEvent, poiId: string) => {
        e.preventDefault();
        setDraggingPoi(poiId);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!draggingPoi || !mapRef.current) return;

        const mapRect = mapRef.current.getBoundingClientRect();
        const x = e.clientX - mapRect.left;
        const y = e.clientY - mapRect.top;

        const newX = Math.max(0, Math.min(100, (x / mapRect.width) * 100));
        const newY = Math.max(0, Math.min(100, (y / mapRect.height) * 100));

        onPoiPositionChange(draggingPoi, { x: newX, y: newY });
    };

    const handleMouseUp = () => {
        setDraggingPoi(null);
    };

    const handleCreateClick = () => {
        if (!newPoiName.trim()) {
            toast({ title: "Erreur", description: "Le nom du point d'intérêt est requis.", variant: "destructive" });
            return;
        }
        onCreatePoi({
            name: newPoiName,
            description: newPoiDescription,
            type: newPoiType,
            ownerId: newPoiOwnerId,
        });
        setIsCreateDialogOpen(false);
        // Reset form
        setNewPoiName("");
        setNewPoiDescription("");
        setNewPoiType("Village");
        setNewPoiOwnerId(playerId);
    };

    return (
        <div 
            ref={mapRef}
            className={cn(
                "relative w-full h-full bg-amber-50 rounded-md overflow-hidden border flex items-center justify-center",
                draggingPoi ? "cursor-grabbing" : ""
            )}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {mapImageUrl && (
                <Image
                    src={mapImageUrl}
                    alt="Fantasy Map Background"
                    layout="fill"
                    objectFit="cover"
                    className="z-0 pointer-events-none"
                    data-ai-hint="fantasy map background"
                />
            )}
             {/* Grid Overlay */}
            <div 
                className="absolute inset-0 pointer-events-none z-10"
                style={{
                    backgroundImage:
                        `linear-gradient(to right, rgba(204, 172, 112, 0.4) 1px, transparent 1px),
                         linear-gradient(to bottom, rgba(204, 172, 112, 0.4) 1px, transparent 1px)`,
                    backgroundSize: '2rem 2rem',
                }}
            />
            
            <div className="absolute top-2 right-2 z-20 flex gap-2">
                 <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="bg-background/70 backdrop-blur-sm"
                                        aria-label="Créer un point d'intérêt"
                                    >
                                        <PlusSquare className="h-4 w-4" />
                                    </Button>
                                </DialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent side="left" align="center">
                                Créer un Point d'Intérêt
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Créer un nouveau Point d'Intérêt</DialogTitle>
                            <DialogDescription>
                                Définissez les détails de votre nouveau lieu. Il apparaîtra au centre de la carte et vous pourrez le déplacer.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="poi-name" className="text-right">Nom</Label>
                                <Input id="poi-name" value={newPoiName} onChange={e => setNewPoiName(e.target.value)} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="poi-description" className="text-right">Description</Label>
                                <Textarea id="poi-description" value={newPoiDescription} onChange={e => setNewPoiDescription(e.target.value)} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="poi-type" className="text-right">Type</Label>
                                <Select value={newPoiType} onValueChange={(value) => setNewPoiType(value as MapPointOfInterest['icon'])}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Choisir un type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Village">Ville (Produit de l'or)</SelectItem>
                                        <SelectItem value="Trees">Forêt (Produit bois/viande)</SelectItem>
                                        <SelectItem value="Shield">Mine (Produit du minerai)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="poi-owner" className="text-right">Propriétaire</Label>
                                <Select value={newPoiOwnerId} onValueChange={setNewPoiOwnerId}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Choisir un propriétaire" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={playerId}>{playerName} (Joueur)</SelectItem>
                                        {characters.map(char => (
                                            <SelectItem key={char.id} value={char.id}>{char.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" onClick={handleCreateClick}>Créer</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={onGenerateMap}
                                className="bg-background/70 backdrop-blur-sm"
                                aria-label="Générer fond de carte"
                                disabled={isGeneratingMap}
                            >
                                {isGeneratingMap ? <Loader2 className="h-4 w-4 animate-spin"/> : <Wand2 className="h-4 w-4" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" align="center">
                            Générer un fond de carte avec l'IA
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={onToggleAestheticFont}
                                className="bg-background/70 backdrop-blur-sm"
                                aria-label="Changer la police de la carte"
                            >
                                <FontIcon className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" align="center">
                            {useAestheticFont ? "Utiliser la police standard" : "Utiliser la police médiévale"}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            
            {pointsOfInterest.map((poi) => {
                const IconComponent = getIconForPoi(poi);
                const isPlayerOwned = poi.ownerId === playerId;
                
                const owner = characters.find(c => c.id === poi.ownerId);
                let haloColor: string | undefined = '#808080'; // Default grey
                if (isPlayerOwned) {
                    haloColor = '#FFD700'; // Gold for player
                } else if (owner?.factionColor) {
                    haloColor = owner.factionColor;
                }

                const hasResources = (poi.resources?.length ?? 0) > 0;
                const canCollect = isPlayerOwned && hasResources;
                const isAttackable = !isPlayerOwned && poi.actions.includes('attack');
                
                const level = poi.level || 1;
                const levelName = (poiLevelNameMap[poi.icon as keyof typeof poiLevelNameMap] && poiLevelNameMap[poi.icon as keyof typeof poiLevelNameMap][level as keyof typeof poiLevelNameMap[keyof typeof poiLevelNameMap]])
                    ? poiLevelNameMap[poi.icon as keyof typeof poiLevelNameMap][level as keyof typeof poiLevelNameMap[keyof typeof poiLevelNameMap]]
                    : null;

                return (
                    <div
                        key={poi.id}
                        className="absolute z-20"
                        style={{
                            left: `${poi.position.x}%`,
                            top: `${poi.position.y}%`,
                            transform: 'translate(-50%, -50%)',
                        }}
                    >
                        <DropdownMenu>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                className={cn(
                                                    "p-2 rounded-full bg-background/80 hover:bg-accent/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-110",
                                                    "cursor-grab active:cursor-grabbing",
                                                    draggingPoi === poi.id && "ring-2 ring-primary scale-110"
                                                )}
                                                style={{
                                                    boxShadow: haloColor ? `0 0 12px 4px ${haloColor}` : undefined,
                                                }}
                                                onMouseDown={(e) => handleMouseDown(e, poi.id)}
                                            >
                                                <IconComponent className="h-6 w-6 text-foreground/80 pointer-events-none" />
                                            </button>
                                        </DropdownMenuTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" align="center" className={cn("text-base z-30", useAestheticFont && "font-medieval")}>
                                        <p className="font-semibold flex items-center gap-1"><Move className="h-3 w-3"/>{poi.name}</p>
                                        {levelName && <p className="text-sm font-medium text-foreground/90">{levelName} (Niveau {level})</p>}
                                        <p className="text-sm text-muted-foreground">{poi.description}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <DropdownMenuContent className="z-30">
                                {poi.actions.includes('travel') && (
                                    <DropdownMenuItem onSelect={() => onMapAction(poi.id, 'travel')}>
                                        <MoveRight className="mr-2 h-4 w-4" />
                                        <span>Se déplacer vers {poi.name}</span>
                                    </DropdownMenuItem>
                                )}
                                {poi.actions.includes('examine') && (
                                    <DropdownMenuItem onSelect={() => onMapAction(poi.id, 'examine')}>
                                        <Search className="mr-2 h-4 w-4" />
                                        <span>Examiner les environs</span>
                                    </DropdownMenuItem>
                                )}
                                {poi.actions.includes('collect') && (
                                    <DropdownMenuItem onSelect={() => onMapAction(poi.id, 'collect')} disabled={!canCollect}>
                                        <Briefcase className="mr-2 h-4 w-4" />
                                        <span>Collecter les ressources</span>
                                    </DropdownMenuItem>
                                )}
                                {isAttackable && (
                                    <DropdownMenuItem onSelect={() => onMapAction(poi.id, 'attack')} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                        <Swords className="mr-2 h-4 w-4" />
                                        <span>Attaquer</span>
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            })}
        </div>
    );
}
