
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { Familiar, PlayerInventoryItem, AdventureSettings, FamiliarPassiveBonus } from "@/types";
import { calculateEffectiveStats } from "./useAdventureState";

const uid = (n = 6) => Math.random().toString(36).slice(2, 2 + n);

interface UseFamiliarProps {
    adventureSettings: AdventureSettings;
    setAdventureSettings: React.Dispatch<React.SetStateAction<AdventureSettings>>;
    toast: ReturnType<typeof useToast>['toast'];
    handleSendSpecificAction: (action: string) => void;
}

interface FamiliarNamingState {
    itemUsedId: string;
    baseFamiliar: Omit<Familiar, 'id' | 'name' | 'isActive' | '_lastSaved'>;
}

export function useFamiliar({
    adventureSettings,
    setAdventureSettings,
    toast,
    handleSendSpecificAction,
}: UseFamiliarProps) {
    const [namingFamiliarState, setNamingFamiliarState] = React.useState<FamiliarNamingState | null>(null);
    const [newFamiliarName, setNewFamiliarName] = React.useState("");
    const [familiarNameError, setFamiliarNameError] = React.useState<string | null>(null);

    const handleUseFamiliarItem = React.useCallback((item: PlayerInventoryItem) => {
        if (!item.familiarDetails) {
            toast({ title: "Action Impossible", description: "Cet objet ne peut pas être utilisé pour invoquer un familier.", variant: "destructive" });
            return;
        }
        const baseFamiliarData: Omit<Familiar, 'id' | 'name' | 'isActive' | '_lastSaved'> = { ...item.familiarDetails };
        setNamingFamiliarState({ itemUsedId: item.id, baseFamiliar: baseFamiliarData });
        setNewFamiliarName(item.familiarDetails.name || "");
        setFamiliarNameError(null);
    }, [toast]);

    const handleConfirmFamiliarName = (confirm: boolean) => {
        if (!confirm) {
            setNamingFamiliarState(null);
            return;
        }

        if (!namingFamiliarState || !newFamiliarName.trim()) {
            setFamiliarNameError("Le nom ne peut pas être vide.");
            return;
        }

        const isNameTaken = (adventureSettings.familiars || []).some(f => f.name.toLowerCase() === newFamiliarName.trim().toLowerCase());
        if (isNameTaken) {
            setFamiliarNameError("Ce nom est déjà utilisé par un autre familier.");
            return;
        }

        const newFamiliar: Familiar = {
            ...namingFamiliarState.baseFamiliar,
            id: `familiar-${newFamiliarName.toLowerCase().replace(/\s/g, '-')}-${uid()}`,
            name: newFamiliarName.trim(),
            isActive: false,
        };

        setAdventureSettings(prev => {
            const newInventory = [...(prev.playerInventory || [])];
            const itemIndex = newInventory.findIndex(i => i.id === namingFamiliarState.itemUsedId);
            if (itemIndex > -1) {
                newInventory[itemIndex].quantity -= 1;
            }
            const updatedFamiliars = [...(prev.familiars || []), newFamiliar];
            return {
                ...prev,
                familiars: updatedFamiliars,
                playerInventory: newInventory.filter(i => i.quantity > 0),
            };
        });

        try {
            const existingFamiliarsStr = localStorage.getItem('globalFamiliars');
            let existingFamiliars: Familiar[] = existingFamiliarsStr ? JSON.parse(existingFamiliarsStr) : [];
            if (!existingFamiliars.some(f => f.id === newFamiliar.id || f.name === newFamiliar.name)) {
                existingFamiliars.push(newFamiliar);
                localStorage.setItem('globalFamiliars', JSON.stringify(existingFamiliars));
            }
        } catch (error) { console.error("Failed to save familiar globally:", error); }

        toast({ title: "Familier Invoqué!", description: `${newFamiliar.name} a été ajouté à votre aventure.` });
        setNamingFamiliarState(null);
        setNewFamiliarName("");
        setFamiliarNameError(null);

        const narrativeAction = `En utilisant l'objet, j'invoque mon nouveau compagnon et le nomme : ${newFamiliar.name} !`;
        handleSendSpecificAction(narrativeAction);
    };

    const handleFamiliarUpdate = React.useCallback((updatedFamiliar: Familiar) => {
        setAdventureSettings(prevSettings => {
            let newSettings = { ...prevSettings };
            const familiars = newSettings.familiars || [];
            
            // Toggle active state: if activating one, deactivate others
            const updatedFamiliars = familiars.map(f =>
                f.id === updatedFamiliar.id ? updatedFamiliar : (updatedFamiliar.isActive ? { ...f, isActive: false } : f)
            );
            newSettings.familiars = updatedFamiliars;

            // Recalculate stats immediately based on the new active familiar state
            const effectiveStats = calculateEffectiveStats(newSettings);
            const newLiveSettings: AdventureSettings = {
                ...newSettings,
                ...effectiveStats,
                playerCurrentHp: Math.min(newSettings.playerCurrentHp ?? effectiveStats.playerMaxHp, effectiveStats.playerMaxHp),
                playerCurrentMp: Math.min(newSettings.playerCurrentMp ?? effectiveStats.playerMaxMp, effectiveStats.playerMaxMp),
            };

            return newLiveSettings;
        });
    }, [setAdventureSettings]);

    const handleSaveFamiliar = React.useCallback((familiarToSave: Familiar) => {
        try {
            const existingFamiliarsStr = localStorage.getItem('globalFamiliars');
            let existingFamiliars: Familiar[] = existingFamiliarsStr ? JSON.parse(existingFamiliarsStr) : [];
            const familiarIndex = existingFamiliars.findIndex(f => f.id === familiarToSave.id);

            if (familiarIndex > -1) {
                existingFamiliars[familiarIndex] = { ...familiarToSave, _lastSaved: Date.now() };
            } else {
                existingFamiliars.push({ ...familiarToSave, _lastSaved: Date.now() });
            }
            localStorage.setItem('globalFamiliars', JSON.stringify(existingFamiliars));
            toast({ title: "Familier Sauvegardé Globalement" });
            handleFamiliarUpdate({ ...familiarToSave, _lastSaved: Date.now() });
        } catch (error) {
            console.error("Failed to save familiar to localStorage:", error);
            toast({ title: "Erreur de Sauvegarde Globale", variant: "destructive" });
        }
    }, [toast, handleFamiliarUpdate]);

    const handleAddStagedFamiliar = React.useCallback((familiarToAdd: Familiar) => {
        setAdventureSettings(prev => {
            if (prev.familiars?.some(f => f.id === familiarToAdd.id)) {
                toast({ title: "Familier déjà présent", variant: "default" });
                return prev;
            }
            const updatedFamiliars = [...(prev.familiars || []), familiarToAdd];
            toast({ title: "Familier Ajouté" });
            return { ...prev, familiars: updatedFamiliars };
        });
    }, [setAdventureSettings, toast]);

    const generateDynamicFamiliarBonus = React.useCallback((rarity: Familiar['rarity']): FamiliarPassiveBonus => {
        const statTypes: Array<FamiliarPassiveBonus['type']> = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'armor_class', 'attack_bonus'];
        const statNames: { [key in Exclude<FamiliarPassiveBonus['type'], 'narrative' | 'gold_find' | 'exp_gain'>]: string } = {
            strength: 'Force',
            dexterity: 'Dextérité',
            constitution: 'Constitution',
            intelligence: 'Intelligence',
            wisdom: 'Sagesse',
            charisma: 'Charisme',
            armor_class: "Classe d'Armure",
            attack_bonus: "Bonus d'Attaque"
        };
        const bonusValues: Record<Familiar['rarity'], number> = { 'common': 1, 'uncommon': 2, 'rare': 5, 'epic': 10, 'legendary': 15 };
        
        if (Math.random() < 0.2) {
            return { type: 'narrative', value: 0, description: "Rend les PNJ plus enclins à discuter." };
        }
        
        const bonusType = statTypes[Math.floor(Math.random() * statTypes.length)];
        const bonusValue = bonusValues[rarity] || 1;
        const bonusName = statNames[bonusType as keyof typeof statNames] || bonusType;
        let description = `+X en ${bonusName}`;

        return { type: bonusType, value: bonusValue, description: description };
    }, []);

    return {
        namingFamiliarState,
        newFamiliarName,
        familiarNameError,
        setNewFamiliarName,
        setFamiliarNameError,
        handleUseFamiliarItem,
        handleConfirmFamiliarName,
        handleFamiliarUpdate,
        handleSaveFamiliar,
        handleAddStagedFamiliar,
        generateDynamicFamiliarBonus,
    };
}
