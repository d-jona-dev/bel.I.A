
"use client";

import * as React from "react";
import Image from "next/image";
import { Castle, Trees, Mountain, Home as VillageIcon, Cave, Landmark, MoveRight, Search, Type as FontIcon, Wand2, Loader2, Move, Briefcase } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { MapPointOfInterest } from "@/types";

interface MapDisplayProps {
    playerId: string;
    pointsOfInterest: MapPointOfInterest[];
    onMapAction: (poiId: string, action: 'travel' | 'examine' | 'collect') => void;
    useAestheticFont: boolean;
    onToggleAestheticFont: () => void;
    mapImageUrl: string | null | undefined;
    onGenerateMap: () => Promise<void>;
    isGeneratingMap: boolean;
    onPoiPositionChange: (poiId: string, newPosition: { x: number, y: number }) => void;
}

const iconMap: Record<MapPointOfInterest['icon'], React.ElementType> = {
    Castle: Castle,
    Mountain: Mountain,
    Trees: Trees,
    Village: VillageIcon,
    Cave: Cave,
    Landmark: Landmark,
};

export function MapDisplay({ playerId, pointsOfInterest, onMapAction, useAestheticFont, onToggleAestheticFont, mapImageUrl, onGenerateMap, isGeneratingMap, onPoiPositionChange }: MapDisplayProps) {
    const [draggingPoi, setDraggingPoi] = React.useState<string | null>(null);
    const mapRef = React.useRef<HTMLDivElement>(null);

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
                const IconComponent = iconMap[poi.icon] || Landmark;
                const canCollect = poi.ownerId === playerId && (poi.resources?.length ?? 0) > 0;
                const isPlayerOwned = poi.ownerId === playerId;
                const haloColor = isPlayerOwned ? '#FFD700' : poi.factionColor; // Gold for player, otherwise faction color

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
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            })}
        </div>
    );
}
