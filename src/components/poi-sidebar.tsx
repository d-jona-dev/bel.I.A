
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Castle, Trees, Mountain, Home as VillageIcon, Shield as ShieldIcon, Landmark, MoveRight, Search, Briefcase, Swords, Hourglass, ArrowUpCircle, Building, Building2, TreeDeciduous, TreePine, Hammer, Gem, PlusCircle } from 'lucide-react';
import type { Character, MapPointOfInterest } from "@/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "./ui/scroll-area";
import { BUILDING_DEFINITIONS, BUILDING_SLOTS, BUILDING_COST_PROGRESSION, poiLevelConfig, poiLevelNameMap } from "@/lib/buildings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


const iconMap: Record<string, React.ElementType> = {
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

interface PoiSidebarProps {
    playerId: string;
    playerName: string;
    pointsOfInterest: MapPointOfInterest[];
    characters: Character[];
    onMapAction: (poiId: string, action: 'travel' | 'examine' | 'collect' | 'attack' | 'upgrade' | 'visit', buildingId?: string) => void;
    onBuildInPoi: (poiId: string, buildingId: string) => void;
    currentTurn: number;
    isLoading: boolean;
    playerGold?: number;
}

const COLLECTION_COOLDOWN = 10;

export function PoiSidebar({ playerId, playerName, pointsOfInterest, characters, onMapAction, onBuildInPoi, currentTurn, isLoading, playerGold }: PoiSidebarProps) {

    if (!pointsOfInterest || pointsOfInterest.length === 0) {
        return <p className="text-sm text-muted-foreground p-2">Aucun point d'intérêt connu.</p>
    }

    return (
        <ScrollArea className="h-72">
            <div className="space-y-3 pr-3">
                {pointsOfInterest.map(poi => {
                    const IconComponent = getIconForPoi(poi);
                    const isPlayerOwned = poi.ownerId === playerId;
                    const owner = isPlayerOwned ? { name: playerName, factionColor: '#FFD700' } : characters.find(c => c.id === poi.ownerId);
                    const level = poi.level || 1;
                    const poiType = poi.icon;

                    const lastCollected = poi.lastCollectedTurn;
                    let turnsRemaining = 0;
                    if (isPlayerOwned && poi.resources && poi.resources.length > 0 && lastCollected !== undefined) {
                        const hasBerlines = (poi.buildings || []).includes('berlines');
                        const cooldownDuration = hasBerlines ? 5 : COLLECTION_COOLDOWN;
                        turnsRemaining = Math.max(0, (lastCollected + cooldownDuration) - currentTurn);
                    }
                    const canCollectNow = isPlayerOwned && turnsRemaining === 0 && poi.resources && poi.resources.length > 0;
                    
                    const typeConfig = poiLevelConfig[poiType as keyof typeof poiLevelConfig];
                    const isUpgradable = isPlayerOwned && typeConfig && level < Object.keys(typeConfig).length;
                    const upgradeConfig = isUpgradable ? typeConfig[level as keyof typeof typeConfig] : null;
                    const upgradeCost = upgradeConfig?.upgradeCost ?? null;
                    const canAffordUpgrade = upgradeCost !== null && (playerGold || 0) >= upgradeCost;
                    
                    const levelName = (poiLevelNameMap[poiType as keyof typeof poiLevelNameMap] && poiLevelNameMap[poiType as keyof typeof poiLevelNameMap][level as keyof typeof poiLevelNameMap[keyof typeof poiLevelNameMap]])
                        ? poiLevelNameMap[poiType as keyof typeof poiLevelNameMap][level as keyof typeof poiLevelNameMap[keyof typeof poiLevelNameMap]]
                        : null;
                    
                    const builtBuildings = poi.buildings || [];
                    const maxSlots = BUILDING_SLOTS[poiType] ? BUILDING_SLOTS[poiType][level] : 0;
                    const emptySlots = maxSlots - builtBuildings.length;

                    const availableBuildings = BUILDING_DEFINITIONS.filter(def => 
                        def.applicablePoiTypes.includes(poiType) && !builtBuildings.includes(def.id)
                    );
                    
                    const nextBuildingCost = BUILDING_COST_PROGRESSION[builtBuildings.length] ?? Infinity;
                    const canAffordBuilding = (playerGold || 0) >= nextBuildingCost;


                    return (
                        <Card key={poi.id} className="bg-muted/30 border">
                            <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <IconComponent className="h-5 w-5" style={{ color: owner?.factionColor || '#808080' }} />
                                    <CardTitle className="text-base">{poi.name}</CardTitle>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-6 px-2">Actions</Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onSelect={() => onMapAction(poi.id, 'travel')} disabled={isLoading}>
                                            <MoveRight className="mr-2 h-4 w-4"/> Se Déplacer
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => onMapAction(poi.id, 'examine')} disabled={isLoading}>
                                            <Search className="mr-2 h-4 w-4"/> Examiner
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => onMapAction(poi.id, 'collect')} disabled={!canCollectNow || isLoading}>
                                            <Briefcase className="mr-2 h-4 w-4"/> Collecter
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => onMapAction(poi.id, 'upgrade')} disabled={!isUpgradable || !canAffordUpgrade || isLoading}>
                                            <ArrowUpCircle className="mr-2 h-4 w-4"/> Améliorer ({upgradeCost} PO)
                                        </DropdownMenuItem>
                                         {isPlayerOwned && builtBuildings.length > 0 && (
                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger>
                                                    <Building className="mr-2 h-4 w-4"/> Visiter un Bâtiment
                                                </DropdownMenuSubTrigger>
                                                <DropdownMenuSubContent>
                                                    {builtBuildings.map(buildingId => {
                                                        const def = BUILDING_DEFINITIONS.find(b => b.id === buildingId);
                                                        return (
                                                            <DropdownMenuItem key={buildingId} onSelect={() => onMapAction(poi.id, 'visit', buildingId)} disabled={isLoading}>
                                                                {def?.name || buildingId}
                                                            </DropdownMenuItem>
                                                        )
                                                    })}
                                                </DropdownMenuSubContent>
                                            </DropdownMenuSub>
                                        )}
                                        {!isPlayerOwned && (
                                            <DropdownMenuItem onSelect={() => onMapAction(poi.id, 'attack')} disabled={isLoading} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                                <Swords className="mr-2 h-4 w-4"/> Attaquer
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardHeader>
                            <CardContent className="p-3 pt-0 text-sm">
                                <CardDescription className="text-xs mb-2">{poi.description}</CardDescription>
                                <div className="space-y-1 text-xs">
                                    <p><strong>Propriétaire:</strong> <span style={{ color: owner?.factionColor || '#808080' }}>{owner?.name || 'Inconnu'}</span></p>
                                    <p><strong>Type:</strong> {levelName || poi.icon} (Niveau: {level})</p>
                                    {isPlayerOwned && poi.resources && poi.resources.length > 0 && (
                                        <div className="flex items-center gap-1">
                                            <Hourglass className="h-3 w-3" />
                                            <span>
                                                {turnsRemaining > 0 ? `Collecte possible dans ${turnsRemaining} tour(s)` : 'Ressources prêtes'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                
                                {isPlayerOwned && maxSlots > 0 && (
                                    <div className="mt-3 pt-3 border-t border-dashed">
                                        <h4 className="text-xs font-semibold mb-2">Aménagements ({builtBuildings.length}/{maxSlots})</h4>
                                        <div className="space-y-2">
                                            {builtBuildings.map(buildingId => {
                                                const def = BUILDING_DEFINITIONS.find(b => b.id === buildingId);
                                                return <p key={`${poi.id}-${buildingId}`} className="text-xs p-1.5 bg-background rounded-md shadow-sm border">{def?.name || buildingId}</p>
                                            })}
                                            {emptySlots > 0 && Array.from({ length: emptySlots }).map((_, index) => (
                                                <div key={`slot-${poi.id}-${index}`} className="p-1.5 bg-background/50 rounded-md border border-dashed">
                                                    <Select onValueChange={(buildingId) => onBuildInPoi(poi.id, buildingId)} disabled={isLoading || !canAffordBuilding}>
                                                        <SelectTrigger className="h-8 text-xs" disabled={isLoading || !canAffordBuilding}>
                                                            <SelectValue placeholder={`Construire (Coût: ${nextBuildingCost} PO)`} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {availableBuildings.map(building => (
                                                                <SelectItem key={building.id} value={building.id}>
                                                                    <TooltipProvider>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild><p>{building.name}</p></TooltipTrigger>
                                                                            <TooltipContent side="right" align="start">
                                                                                <p className="font-semibold">{building.name}</p>
                                                                                <p className="text-xs text-muted-foreground max-w-xs">{building.description}</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </ScrollArea>
    );
}
