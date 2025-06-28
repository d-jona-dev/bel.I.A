
"use client";

import * as React from "react";
import Image from "next/image";
import { Castle, Trees, Mountain, Home as VillageIcon, Cave, Landmark, MoveRight, Search, Type as FontIcon, Wand2, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { MapPointOfInterest } from "@/types";

interface MapDisplayProps {
    pointsOfInterest: MapPointOfInterest[];
    onMapAction: (poiId: string, action: 'travel' | 'examine') => void;
    useAestheticFont: boolean;
    onToggleAestheticFont: () => void;
    mapImageUrl: string | null | undefined;
    onGenerateMap: () => Promise<void>;
    isGeneratingMap: boolean;
}

const iconMap: Record<MapPointOfInterest['icon'], React.ElementType> = {
    Castle: Castle,
    Mountain: Mountain,
    Trees: Trees,
    Village: VillageIcon,
    Cave: Cave,
    Landmark: Landmark,
};

export function MapDisplay({ pointsOfInterest, onMapAction, useAestheticFont, onToggleAestheticFont, mapImageUrl, onGenerateMap, isGeneratingMap }: MapDisplayProps) {

    return (
        <div className="relative w-full h-full bg-amber-50 rounded-md overflow-hidden border flex items-center justify-center">
            {mapImageUrl && (
                <Image
                    src={mapImageUrl}
                    alt="Fantasy Map Background"
                    layout="fill"
                    objectFit="cover"
                    className="z-0"
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
                return (
                    <DropdownMenu key={poi.id}>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            className="absolute -translate-x-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-accent/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-110 z-20"
                                            style={{
                                                left: `${poi.position.x}%`,
                                                top: `${poi.position.y}%`,
                                                boxShadow: poi.factionColor ? `0 0 12px 4px ${poi.factionColor}` : undefined,
                                            }}
                                        >
                                            <IconComponent className="h-6 w-6 text-foreground/80" />
                                        </button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="top" align="center" className={cn("text-base z-30", useAestheticFont && "font-medieval")}>
                                    <p className="font-semibold">{poi.name}</p>
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
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            })}
        </div>
    );
}
