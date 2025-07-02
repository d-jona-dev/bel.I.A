
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Castle, Trees, Mountain, Home as VillageIcon, Shield as ShieldIcon, Landmark, MoveRight, Search, Briefcase, Swords, Hourglass, ArrowUpCircle, Building, Building2 } from 'lucide-react';
import type { Character, MapPointOfInterest } from "@/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "./ui/scroll-area";

const iconMap: Record<MapPointOfInterest['icon'] | 'Building' | 'Building2', React.ElementType> = {
    Castle: Castle,
    Mountain: Mountain,
    Trees: Trees,
    Village: VillageIcon,
    Shield: ShieldIcon,
    Landmark: Landmark,
    Building: Building,
    Building2: Building2,
};

const getIconForPoi = (poi: MapPointOfInterest) => {
    if (poi.icon === 'Village') {
        const level = poi.level || 1;
        if (level <= 2) return iconMap.Village;
        if (level === 3) return iconMap.Building;
        if (level === 4) return iconMap.Building2;
        if (level === 5) return iconMap.Landmark;
        if (level >= 6) return iconMap.Castle;
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
    }
};

const poiLevelNameMap = {
    Village: {
        1: 'Village',
        2: 'Bourg',
        3: 'Petite Ville',
        4: 'Ville Moyenne',
        5: 'Grande Ville',
        6: 'Métropole',
    }
};

interface PoiSidebarProps {
    playerId: string;
    playerName: string;
    pointsOfInterest: MapPointOfInterest[];
    characters: Character[];
    onMapAction: (poiId: string, action: 'travel' | 'examine' | 'collect' | 'attack' | 'upgrade') => void;
    currentTurn: number;
    isLoading: boolean;
    playerGold?: number;
}

const COLLECTION_COOLDOWN = 10;

export function PoiSidebar({ playerId, playerName, pointsOfInterest, characters, onMapAction, currentTurn, isLoading, playerGold }: PoiSidebarProps) {

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

                    const lastCollected = poi.lastCollectedTurn;
                    let turnsRemaining = 0;
                    if (isPlayerOwned && poi.resources && poi.resources.length > 0 && lastCollected !== undefined) {
                        turnsRemaining = Math.max(0, (lastCollected + COLLECTION_COOLDOWN) - currentTurn);
                    }
                    const canCollectNow = isPlayerOwned && turnsRemaining === 0 && poi.resources && poi.resources.length > 0;
                    
                    const isUpgradable = isPlayerOwned && poi.icon === 'Village' && level < 6;
                    const upgradeConfig = isUpgradable ? poiLevelConfig.Village[level] : null;
                    const upgradeCost = upgradeConfig?.upgradeCost ?? null;
                    const canAffordUpgrade = upgradeCost !== null && (playerGold || 0) >= upgradeCost;

                    const levelName = (poi.icon === 'Village' && poiLevelNameMap.Village[level as keyof typeof poiLevelNameMap.Village])
                        ? poiLevelNameMap.Village[level as keyof typeof poiLevelNameMap.Village]
                        : null;

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
                                    <p><strong>Type:</strong> {poi.icon}{levelName ? ` (${levelName})` : ''} (Niveau: {level})</p>
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
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </ScrollArea>
    );
}
