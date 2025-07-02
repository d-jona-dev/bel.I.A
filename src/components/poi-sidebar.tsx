
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Castle, Trees, Mountain, Home as VillageIcon, Shield as ShieldIcon, Landmark, MoveRight, Search, Briefcase, Swords, Hourglass } from 'lucide-react';
import type { Character, MapPointOfInterest } from "@/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "./ui/scroll-area";

const iconMap: Record<MapPointOfInterest['icon'], React.ElementType> = {
    Castle: Castle,
    Mountain: Mountain,
    Trees: Trees,
    Village: VillageIcon,
    Shield: ShieldIcon,
    Landmark: Landmark,
};

interface PoiSidebarProps {
    playerId: string;
    playerName: string;
    pointsOfInterest: MapPointOfInterest[];
    characters: Character[];
    onMapAction: (poiId: string, action: 'travel' | 'examine' | 'collect' | 'attack') => void;
    currentTurn: number;
    isLoading: boolean;
}

const COLLECTION_COOLDOWN = 10; // This should match the logic in page.tsx

export function PoiSidebar({ playerId, playerName, pointsOfInterest, characters, onMapAction, currentTurn, isLoading }: PoiSidebarProps) {

    if (!pointsOfInterest || pointsOfInterest.length === 0) {
        return <p className="text-sm text-muted-foreground p-2">Aucun point d'intérêt connu.</p>
    }

    return (
        <ScrollArea className="h-72">
            <div className="space-y-3 pr-3">
                {pointsOfInterest.map(poi => {
                    const IconComponent = iconMap[poi.icon] || Landmark;
                    const isPlayerOwned = poi.ownerId === playerId;
                    const owner = isPlayerOwned ? { name: playerName, factionColor: '#FFD700' } : characters.find(c => c.id === poi.ownerId);

                    const lastCollected = poi.lastCollectedTurn;
                    let turnsRemaining = 0;
                    if (isPlayerOwned && poi.resources && poi.resources.length > 0 && lastCollected !== undefined) {
                        turnsRemaining = Math.max(0, (lastCollected + COLLECTION_COOLDOWN) - currentTurn);
                    }
                    const canCollectNow = isPlayerOwned && turnsRemaining === 0 && poi.resources && poi.resources.length > 0;

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
                                    <p><strong>Type:</strong> {poi.icon}</p>
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
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </ScrollArea>
    );
}
