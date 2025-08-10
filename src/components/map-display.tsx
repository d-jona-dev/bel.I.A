
"use client";

import * as React from "react";
import Image from "next/image";
import { Castle, Trees, Mountain, Home as VillageIcon, Shield as ShieldIcon, Landmark, MoveRight, Search, Type as FontIcon, Wand2, Loader2, Move, Briefcase, Swords, PlusSquare, Building, Building2, TreeDeciduous, TreePine, Hammer, Gem, User as UserIcon, UploadCloud } from 'lucide-react';
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Separator } from "./ui/separator";
import { BUILDING_DEFINITIONS, BUILDING_SLOTS, poiLevelConfig, poiLevelNameMap } from "@/lib/buildings";
import { ScrollArea } from "./ui/scroll-area";
import { Checkbox } from "./ui/checkbox";

interface MapDisplayProps {
    playerId: string;
    pointsOfInterest: MapPointOfInterest[];
    onMapAction: (poiId: string, action: 'travel' | 'examine' | 'collect' | 'attack' | 'upgrade' | 'visit', buildingId?: string) => void;
    useAestheticFont: boolean;
    onToggleAestheticFont: () => void;
    mapImageUrl: string | null | undefined;
    onGenerateMap: () => Promise<void>;
    isGeneratingMap: boolean;
    onPoiPositionChange: (poiId: string, newPosition: { x: number, y: number }) => void;
    characters: Character[];
    playerName: string;
    onCreatePoi: (data: { name: string; description: string; type: MapPointOfInterest['icon']; ownerId: string; level: number; buildings: string[]; }) => void;
    playerLocationId?: string;
    onMapImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
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


export function MapDisplay({ playerId, pointsOfInterest, onMapAction, useAestheticFont, onToggleAestheticFont, mapImageUrl, onGenerateMap, isGeneratingMap, onPoiPositionChange, characters, playerName, onCreatePoi, playerLocationId, onMapImageUpload }: MapDisplayProps) {
    const { toast } = useToast();
    const [draggingPoi, setDraggingPoi] = React.useState<string | null>(null);
    const mapRef = React.useRef<HTMLDivElement>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
    
    // Form state for new POI
    const [newPoiName, setNewPoiName] = React.useState("");
    const [newPoiDescription, setNewPoiDescription] = React.useState("");
    const [newPoiType, setNewPoiType] = React.useState<MapPointOfInterest['icon']>("Village");
    const [newPoiOwnerId, setNewPoiOwnerId] = React.useState(playerId);
    const [newPoiLevel, setNewPoiLevel] = React.useState(1);
    const [newPoiBuildings, setNewPoiBuildings] = React.useState<string[]>([]);

    const playerCurrentPoi = pointsOfInterest.find(p => p.id === playerLocationId);

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

    const resetCreateForm = () => {
        setNewPoiName("");
        setNewPoiDescription("");
        setNewPoiType("Village");
        setNewPoiOwnerId(playerId);
        setNewPoiLevel(1);
        setNewPoiBuildings([]);
    }

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
            level: newPoiLevel,
            buildings: newPoiBuildings,
        });
        setIsCreateDialogOpen(false);
        resetCreateForm();
    };
    
    const availableLevelsForType = Object.keys(poiLevelConfig[newPoiType] || {}).map(Number);
    const buildingSlotsForLevel = BUILDING_SLOTS[newPoiType]?.[newPoiLevel] ?? 0;
    const availableBuildingsForType = BUILDING_DEFINITIONS.filter(def => def.applicablePoiTypes.includes(newPoiType));

    const handleBuildingSelection = (buildingId: string, checked: boolean) => {
        setNewPoiBuildings(prev => {
            const newSelection = checked ? [...prev, buildingId] : prev.filter(id => id !== buildingId);
            if (newSelection.length > buildingSlotsForLevel) {
                toast({
                    title: "Limite de bâtiments atteinte",
                    description: `Vous ne pouvez sélectionner que ${buildingSlotsForLevel} bâtiment(s) pour ce niveau.`,
                    variant: "destructive"
                });
                return prev;
            }
            return newSelection;
        });
    };
    
    React.useEffect(() => {
        // Reset level and buildings if type changes
        setNewPoiLevel(1);
        setNewPoiBuildings([]);
    }, [newPoiType]);
    
    React.useEffect(() => {
        // Prune selected buildings if they exceed the new slot limit
        if (newPoiBuildings.length > buildingSlotsForLevel) {
            setNewPoiBuildings(prev => prev.slice(0, buildingSlotsForLevel));
        }
    }, [newPoiLevel, buildingSlotsForLevel, newPoiBuildings.length]);


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
                                <Label htmlFor="poi-level" className="text-right">Niveau</Label>
                                <Select value={String(newPoiLevel)} onValueChange={(value) => setNewPoiLevel(Number(value))}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Choisir un niveau" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableLevelsForType.map(level => (
                                            <SelectItem key={level} value={String(level)}>
                                                Niveau {level} - {poiLevelNameMap[newPoiType]?.[level] || `Type ${level}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                             {buildingSlotsForLevel > 0 && (
                                <div className="grid grid-cols-4 items-start gap-4">
                                    <Label className="text-right pt-2">Bâtiments</Label>
                                    <div className="col-span-3 space-y-2">
                                        <p className="text-sm text-muted-foreground">
                                            Emplacements disponibles: {buildingSlotsForLevel - newPoiBuildings.length}/{buildingSlotsForLevel}
                                        </p>
                                        <ScrollArea className="h-32 w-full rounded-md border p-2">
                                            {availableBuildingsForType.map(building => (
                                                <div key={building.id} className="flex items-center space-x-2 mb-1">
                                                     <Checkbox
                                                        id={`building-${building.id}`}
                                                        checked={newPoiBuildings.includes(building.id)}
                                                        onCheckedChange={(checked) => handleBuildingSelection(building.id, !!checked)}
                                                    />
                                                    <Label htmlFor={`building-${building.id}`} className="text-sm font-normal">{building.name}</Label>
                                                </div>
                                            ))}
                                        </ScrollArea>
                                    </div>
                                </div>
                            )}

                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetCreateForm(); }}>Annuler</Button>
                            <Button type="button" onClick={handleCreateClick}>Créer</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={onMapImageUpload}
                    className="hidden"
                />
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <Button
                                variant="outline"
                                size="icon"
                                className="bg-background/70 backdrop-blur-sm"
                                aria-label="Charger une image de carte"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <UploadCloud className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" align="center">
                           Charger une image de carte
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
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

            {/* Render Player Avatar */}
            {playerCurrentPoi && playerCurrentPoi.position && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <div
                                className="absolute z-30"
                                style={{
                                    left: `calc(${playerCurrentPoi.position.x}% + 20px)`, // Offset from POI
                                    top: `${playerCurrentPoi.position.y}%`,
                                    transform: 'translate(-50%, -50%)',
                                }}
                            >
                                <Avatar className="h-8 w-8 border-2 border-primary ring-2 ring-primary-foreground">
                                    <AvatarFallback><UserIcon /></AvatarFallback>
                                </Avatar>
                            </div>
                        </TooltipTrigger>
                         <TooltipContent side="bottom" align="center" className={cn("text-base z-30", useAestheticFont && "font-medieval")}>
                            <p className="font-semibold">{playerName} (Vous)</p>
                            <p className="text-sm text-muted-foreground">Localisation: {playerCurrentPoi.name}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
            
            {pointsOfInterest.map((poi) => {
                const IconComponent = getIconForPoi(poi);
                const isPlayerOwned = poi.ownerId === playerId;
                
                const owner = isPlayerOwned ? { name: playerName, factionColor: '#FFD700' } : characters.find(c => c.id === poi.ownerId);
                let haloColor: string | undefined = '#808080'; // Default grey
                if (isPlayerOwned) {
                    haloColor = '#FFD700'; // Gold for player
                } else if (owner?.factionColor) {
                    haloColor = owner.factionColor;
                }

                const hasResources = (poi.resources?.length ?? 0) > 0;
                const canCollect = isPlayerOwned && hasResources;
                const isAttackable = !isPlayerOwned && poi.actions?.includes('attack');
                
                const level = poi.level || 1;
                const levelName = (poiLevelNameMap[poi.icon as keyof typeof poiLevelNameMap] && poiLevelNameMap[poi.icon as keyof typeof poiLevelNameMap][level as keyof typeof poiLevelNameMap[keyof typeof poiLevelNameMap]])
                    ? poiLevelNameMap[poi.icon as keyof typeof poiLevelNameMap][level as keyof typeof poiLevelNameMap[keyof typeof poiLevelNameMap]]
                    : null;
                    
                const charactersAtPoi = characters.filter(c => c.locationId === poi.id);

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
                                    <TooltipContent side="top" align="center" className={cn("text-base z-30 max-w-xs", useAestheticFont && "font-medieval")}>
                                        <p className="font-semibold flex items-center gap-1">{poi.name}</p>
                                        {levelName && <p className="text-sm font-medium text-foreground/90">{levelName} (Niveau {level})</p>}
                                        <p className="text-sm text-muted-foreground">{poi.description}</p>
                                        {charactersAtPoi.length > 0 && (
                                            <>
                                                <Separator className="my-2" />
                                                <h4 className="font-semibold text-sm">Personnages Présents :</h4>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                {charactersAtPoi.map(char => (
                                                    <div key={char.id} className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-md">
                                                        <Avatar className="h-5 w-5">
                                                            {char.portraitUrl ? <AvatarImage src={char.portraitUrl} alt={char.name} /> : <AvatarFallback className="text-xs">{char.name.substring(0, 1)}</AvatarFallback>}
                                                        </Avatar>
                                                        <span className="text-xs">{char.name}</span>
                                                    </div>
                                                ))}
                                                </div>
                                            </>
                                        )}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <DropdownMenuContent className="z-30">
                                {poi.actions?.includes('travel') && (
                                    <DropdownMenuItem onSelect={() => onMapAction(poi.id, 'travel')}>
                                        <MoveRight className="mr-2 h-4 w-4" />
                                        <span>Se déplacer vers {poi.name}</span>
                                    </DropdownMenuItem>
                                )}
                                {poi.actions?.includes('examine') && (
                                    <DropdownMenuItem onSelect={() => onMapAction(poi.id, 'examine')}>
                                        <Search className="mr-2 h-4 w-4" />
                                        <span>Examiner les environs</span>
                                    </DropdownMenuItem>
                                )}
                                {poi.actions?.includes('collect') && (
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
