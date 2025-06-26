
"use client";

import * as React from "react";
import { Castle, Trees, Mountain, Home as VillageIcon, Cave, Landmark, MoveRight, Search } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { MapPointOfInterest } from "@/types";

interface MapDisplayProps {
    pointsOfInterest: MapPointOfInterest[];
    onMapAction: (poiId: string, action: 'travel' | 'examine') => void;
}

const iconMap: Record<MapPointOfInterest['icon'], React.ElementType> = {
    Castle: Castle,
    Mountain: Mountain,
    Trees: Trees,
    Village: VillageIcon,
    Cave: Cave,
    Landmark: Landmark,
};

export function MapDisplay({ pointsOfInterest, onMapAction }: MapDisplayProps) {

    return (
        <div className="relative w-full h-full bg-amber-50 rounded-md overflow-hidden border">
             {/* Grid Overlay */}
            <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage:
                        `linear-gradient(to right, rgba(204, 172, 112, 0.4) 1px, transparent 1px),
                         linear-gradient(to bottom, rgba(204, 172, 112, 0.4) 1px, transparent 1px)`,
                    backgroundSize: '2rem 2rem',
                }}
            />
            
            {pointsOfInterest.map((poi) => {
                const IconComponent = iconMap[poi.icon] || Landmark;
                return (
                    <DropdownMenu key={poi.id}>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            className="absolute -translate-x-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-accent/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 backdrop-blur-sm shadow-lg transition-transform hover:scale-110"
                                            style={{
                                                left: `${poi.position.x}%`,
                                                top: `${poi.position.y}%`,
                                            }}
                                        >
                                            <IconComponent className="h-6 w-6 text-foreground/80" />
                                        </button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="top" align="center" className="font-medieval text-base">
                                    <p className="font-semibold">{poi.name}</p>
                                    <p className="text-sm text-muted-foreground">{poi.description}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <DropdownMenuContent>
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
