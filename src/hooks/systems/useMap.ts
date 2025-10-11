
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { AdventureSettings, Character, MapPointOfInterest } from "@/types";
import type { GenerateSceneImageFlowOutput, GenerateSceneImageInput } from "@/types";
import { BUILDING_COST_PROGRESSION, poiLevelConfig, BUILDING_DEFINITIONS, BUILDING_SLOTS, poiLevelNameMap } from "@/lib/buildings";
import { getLocalizedText } from "./useAdventureState";
import { generateSceneImage } from "@/ai/flows/generate-scene-image";
import type { AiConfig } from "@/types";

const PLAYER_ID = "player";

interface UseMapProps {
    adventureSettings: AdventureSettings;
    setAdventureSettings: React.Dispatch<React.SetStateAction<AdventureSettings>>;
    characters: Character[];
    toast: ReturnType<typeof useToast>['toast'];
    generateSceneImageActionWrapper: (input: GenerateSceneImageInput) => Promise<GenerateSceneImageFlowOutput>;
    aiConfig: AiConfig;
    handleSendSpecificAction: (action: string, locationIdOverride?: string) => void;
}

export function useMap({
    adventureSettings,
    setAdventureSettings,
    characters,
    toast,
    generateSceneImageActionWrapper,
    aiConfig,
    handleSendSpecificAction,
}: UseMapProps) {
    const [isGeneratingMap, setIsGeneratingMap] = React.useState(false);

    const handlePoiPositionChange = React.useCallback((poiId: string, newPosition: { x: number, y: number }) => {
        setAdventureSettings(prev => {
            if (!prev.mapPointsOfInterest) return prev;
            const newPois = prev.mapPointsOfInterest.map(poi =>
                poi.id === poiId ? { ...poi, position: newPosition } : poi
            );
            return { ...prev, mapPointsOfInterest: newPois };
        });
    }, [setAdventureSettings]);

    const handleCreatePoi = React.useCallback((data: { name: string; description: string; type: MapPointOfInterest['icon']; ownerId: string; level: number; buildings: string[]; defenderUnitIds?: string[] }) => {
        const newPoi: MapPointOfInterest = {
            id: `poi-${data.name.toLowerCase().replace(/\s/g, '-')}-${Date.now()}`,
            name: data.name,
            description: data.description || `Un(e) nouveau/nouvelle ${poiLevelNameMap[data.type]?.[data.level || 1]?.toLowerCase() || 'lieu'} plein(e) de potentiel.`,
            icon: data.type,
            level: data.level || 1,
            position: undefined,
            ownerId: data.ownerId,
            lastCollectedTurn: undefined,
            resources: poiLevelConfig[data.type as keyof typeof poiLevelConfig]?.[data.level as keyof typeof poiLevelConfig[keyof typeof poiLevelConfig]]?.resources || [],
            buildings: data.buildings || [],
            defenderUnitIds: data.defenderUnitIds || [],
        };
        
        const updater = (prev: AdventureSettings) => ({
            ...prev,
            mapPointsOfInterest: [...(prev.mapPointsOfInterest || []), newPoi],
        });
    
        setAdventureSettings(updater);
        
        React.startTransition(() => {
            toast({
                title: "Point d'Intérêt Créé",
                description: `"${data.name}" a été ajouté. Vous pouvez maintenant le placer sur la carte via le bouton "+".`,
            });
        });
    }, [toast, setAdventureSettings]);

    const handleMapImageUpload = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast({
                title: "Fichier Invalide",
                description: "Veuillez sélectionner un fichier image (jpeg, png, etc.).",
                variant: "destructive",
            });
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target?.result as string;
            setAdventureSettings(prev => ({ ...prev, mapImageUrl: imageUrl }));
            toast({
                title: "Image de Carte Chargée",
                description: "Le fond de la carte a été mis à jour avec votre image.",
            });
        };
        reader.readAsDataURL(file);
        if(event.target) event.target.value = '';
      }, [toast, setAdventureSettings]);

    const handleMapImageUrlChange = React.useCallback((url: string) => {
        setAdventureSettings(prev => ({ ...prev, mapImageUrl: url }));
        toast({
            title: "Image de Carte Chargée",
            description: "Le fond de la carte a été mis à jour depuis l'URL.",
        });
    }, [toast, setAdventureSettings]);

    const handleAddPoiToMap = React.useCallback((poiId: string) => {
        setAdventureSettings(prev => {
            const pois = prev.mapPointsOfInterest || [];
            const poiExists = pois.some(p => p.id === poiId && p.position);
            if (poiExists) {
                toast({ title: "Déjà sur la carte", description: "Ce point d'intérêt est déjà sur la carte.", variant: "default" });
                return prev;
            }

            const newPois = pois.map(p => {
                if (p.id === poiId) {
                    toast({ title: "POI Ajouté", description: `"${p.name}" a été ajouté à la carte.` });
                    return { ...p, position: { x: 50, y: 50 } };
                }
                return p;
            });

            return { ...prev, mapPointsOfInterest: newPois };
        });
    }, [toast, setAdventureSettings]);
    
    const handleBuildInPoi = React.useCallback((poiId: string, buildingId: string) => {
        const poi = adventureSettings.mapPointsOfInterest?.find(p => p.id === poiId);
        if (!poi || poi.ownerId !== PLAYER_ID) {
            toast({ title: "Construction Impossible", description: "Vous devez posséder le lieu pour y construire.", variant: "destructive" });
            return;
        }

        const buildingDef = BUILDING_DEFINITIONS.find(b => b.id === buildingId);
        if (!buildingDef) {
            toast({ title: "Erreur", description: "Définition du bâtiment introuvable.", variant: "destructive" });
            return;
        }

        const currentBuildings = poi.buildings || [];
        if (currentBuildings.includes(buildingId)) {
            toast({ title: "Construction Impossible", description: "Ce bâtiment existe déjà dans ce lieu.", variant: "default" });
            return;
        }

        const maxSlots = BUILDING_SLOTS[poi.icon]?.[poi.level || 1] ?? 0;
        if (currentBuildings.length >= maxSlots) {
            toast({ title: "Construction Impossible", description: "Tous les emplacements de construction sont utilisés.", variant: "destructive" });
            return;
        }

        const cost = BUILDING_COST_PROGRESSION[currentBuildings.length] ?? Infinity;
        if ((adventureSettings.playerGold || 0) < cost) {
            toast({ title: "Fonds Insuffisants", description: `Il vous faut ${cost} PO pour construire ${buildingDef.name}.`, variant: "destructive" });
            return;
        }

        setAdventureSettings(prev => {
            const newPois = prev.mapPointsOfInterest!.map(p => {
                if (p.id === poiId) {
                    return { ...p, buildings: [...(p.buildings || []), buildingId] };
                }
                return p;
            });
            return {
                ...prev,
                playerGold: (prev.playerGold || 0) - cost,
                mapPointsOfInterest: newPois,
            };
        });

        toast({ title: "Bâtiment Construit!", description: `${buildingDef.name} a été construit à ${poi.name} pour ${cost} PO.` });
    }, [adventureSettings, toast, setAdventureSettings]);
    
    const generateMapImage = React.useCallback(async () => {
        setIsGeneratingMap(true);
        toast({ title: "Génération de la carte..." });
        try {
            const prompt = `A fantasy map of a world. Key locations: ${adventureSettings.mapPointsOfInterest?.map(poi => poi.name).join(', ') || 'terres inconnues'}. World context: ${getLocalizedText(adventureSettings.world, 'en')}`;
            const result = await generateSceneImageActionWrapper({ sceneDescription: prompt });
            if (result.imageUrl) {
                setAdventureSettings(prev => ({ ...prev, mapImageUrl: result.imageUrl }));
            }
        } catch (error) {
            toast({ title: "Erreur de génération de carte", variant: "destructive" });
        } finally {
            setIsGeneratingMap(false);
        }
    }, [generateSceneImageActionWrapper, toast, adventureSettings, setAdventureSettings, getLocalizedText]);

    return {
        isGeneratingMap,
        generateMapImage,
        handlePoiPositionChange,
        handleCreatePoi,
        handleMapImageUpload,
        handleMapImageUrlChange,
        handleAddPoiToMap,
        handleBuildInPoi,
    };
}
