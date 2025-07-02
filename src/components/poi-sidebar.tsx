
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Castle, Trees, Mountain, Home as VillageIcon, Shield as ShieldIcon, Landmark, MoveRight, Search, Briefcase, Swords, Hourglass, ArrowUpCircle, Building, Building2, TreeDeciduous, TreePine, Hammer, Gem, PlusCircle } from 'lucide-react';
import type { Character, MapPointOfInterest } from "@/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "./ui/scroll-area";
import { BUILDING_DEFINITIONS, BUILDING_SLOTS, BUILDING_COST_PROGRESSION } from "@/lib/buildings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

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
    if (poi.icon === 'Trees') {
        if (level === 1) return iconMap.TreeDeciduous;
        if (level === 2) return iconMap.Trees;
        if (level >= 3) return iconMap.TreePine;
    }
    if (poi.icon === 'Shield') {
        if (level === 1) return iconMap.Shield;
        if (level === 2) return iconMap.Hammer;
        if (level >= 3) return iconMap.Gem;
    }
    return iconMap[poi.icon] || Landmark;
};

const poiLevelConfig: Record<string, Record<number, { upgradeCost: number | null }>> = {
    Village: {
        1: { upgradeCost: 50 },
        2: { upgradeCost: 200 },
        3: { upgradeCost: 500 },
        4: { upgradeCost: 1000 },
        5: { upgradeCost: 2500 },
        6: { upgradeCost: null },
    },
    Trees: {
        1: { upgradeCost: 100 },
        2: { upgradeCost: 500 },
        3: { upgradeCost: null },
    },
    Shield: {
        1: { upgradeCost: 100 },
        2: { upgradeCost: 500 },
        3: { upgradeCost: null },
    },
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

interface PoiSidebarProps {
    playerId: string;
    playerName: string;
    pointsOfInterest: MapPointOfInterest[];
    characters: Character[];
    onMapAction: (poiId: string, action: 'travel' | 'examine' | 'collect' | 'attack' | 'upgrade') => void;
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
                        turnsRemaining = Math.max(0, (lastCollected + COLLECTION_COOLDOWN) - currentTurn);
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
                                <div className="flex gap-2 mt-3">
                                    {poi.actions.includes('travel') && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onMapAction(poi.id, 'travel')} disabled={isLoading}>
                                                        <MoveRight className="h-4 w-4"/>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>Se déplacer vers {poi.name}</p></TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                    {poi.actions.includes('examine') && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onMapAction(poi.id, 'examine')} disabled={isLoading}>
                                                        <Search className="h-4 w-4"/>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>Examiner</p></TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                    {poi.actions.includes('collect') && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onMapAction(poi.id, 'collect')} disabled={!canCollectNow || isLoading}>
                                                        <Briefcase className="h-4 w-4"/>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>Collecter</p></TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                     {poi.actions.includes('attack') && !isPlayerOwned && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => onMapAction(poi.id, 'attack')} disabled={isLoading}>
                                                        <Swords className="h-4 w-4"/>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>Attaquer</p></TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                    {isUpgradable && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span tabIndex={!canAffordUpgrade || isLoading ? 0 : -1}>
                                                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onMapAction(poi.id, 'upgrade')} disabled={!canAffordUpgrade || isLoading}>
                                                            <ArrowUpCircle className="h-4 w-4"/>
                                                        </Button>
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{canAffordUpgrade ? `Améliorer pour ${upgradeCost} PO` : `Coût: ${upgradeCost} PO`}</p>
                                                    {!canAffordUpgrade && <p className="text-destructive">Fonds insuffisants</p>}
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                </div>
                                {isPlayerOwned && maxSlots > 0 && (
                                    <div className="mt-3 pt-3 border-t border-dashed">
                                        <h4 className="text-xs font-semibold mb-2">Aménagements ({builtBuildings.length}/{maxSlots})</h4>
                                        <div className="space-y-2">
                                            {builtBuildings.map(buildingId => {
                                                const def = BUILDING_DEFINITIONS.find(b => b.id === buildingId);
                                                return <p key={buildingId} className="text-xs p-1.5 bg-background rounded-md shadow-sm border">{def?.name || buildingId}</p>
                                            })}
                                            {emptySlots > 0 && Array.from({ length: emptySlots }).map((_, index) => (
                                                <div key={`slot-${index}`} className="p-1.5 bg-background/50 rounded-md border border-dashed">
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
