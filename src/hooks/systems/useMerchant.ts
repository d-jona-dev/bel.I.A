
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { AdventureSettings, Character, PlayerInventoryItem, SellingItem, BaseItem, MapPointOfInterest, LocalizedText } from "@/types";
import { BASE_WEAPONS, BASE_ARMORS, BASE_JEWELRY, BASE_CONSUMABLES } from "@/lib/items";
import { poiLevelConfig } from "@/lib/buildings";


const uid = (n = 6) => Math.random().toString(36).slice(2, 2 + n);

interface UseMerchantProps {
    adventureSettings: AdventureSettings;
    setAdventureSettings: React.Dispatch<React.SetStateAction<AdventureSettings>>;
    addCurrencyToPlayer: (amount: number) => void;
    handleNewCharacters: (newChars: Omit<Character, 'id'>[]) => void;
    toast: ReturnType<typeof useToast>['toast'];
}

export function useMerchant({
    adventureSettings,
    setAdventureSettings,
    addCurrencyToPlayer,
    handleNewCharacters,
    toast,
}: UseMerchantProps) {
    const [merchantInventory, setMerchantInventory] = React.useState<SellingItem[]>([]);
    const [shoppingCart, setShoppingCart] = React.useState<SellingItem[]>([]);

    const initializeMerchantInventory = React.useCallback((currentPoi: MapPointOfInterest | undefined, visitedBuildingId?: string): SellingItem[] => {
        
        if (!currentPoi || !visitedBuildingId || !['forgeron', 'bijoutier', 'magicien'].includes(visitedBuildingId)) {
            setMerchantInventory([]);
            return [];
        }

        const buildingToSourceMap: Record<string, BaseItem[]> = {
            'forgeron': [...BASE_WEAPONS, ...BASE_ARMORS],
            'bijoutier': BASE_JEWELRY,
            'magicien': BASE_CONSUMABLES,
        };

        const itemPool: BaseItem[] = buildingToSourceMap[visitedBuildingId] || [];

        if (itemPool.length === 0) {
            setMerchantInventory([]);
            return [];
        }

        const activeUniverses = adventureSettings.activeItemUniverses || [];
        const rarityOrder: { [key: string]: number } = { 'Commun': 1, 'Rare': 2, 'Epique': 3, 'Légendaire': 4, 'Divin': 5 };
        
        const inventoryConfig: Record<number, { size: number, minRarity: number, maxRarity: number }> = {
            1: { size: 3, minRarity: 1, maxRarity: 1 }, 2: { size: 4, minRarity: 1, maxRarity: 2 },
            3: { size: 5, minRarity: 1, maxRarity: 3 }, 4: { size: 6, minRarity: 2, maxRarity: 4 },
            5: { size: 7, minRarity: 3, maxRarity: 5 }, 6: { size: 10, minRarity: 4, maxRarity: 5 },
        };
        const poiLevel = currentPoi.level || 1;
        const config = inventoryConfig[poiLevel] || inventoryConfig[1];

        const itemsInUniverse = itemPool.filter(item => activeUniverses.includes(item.universe));
        
        const availableItems = itemsInUniverse.filter(item => {
            const itemRarityValue = rarityOrder[item.rarity] || 1;
            return itemRarityValue >= config.minRarity && itemRarityValue <= config.maxRarity;
        });

        const shuffledItems = availableItems.sort(() => 0.5 - Math.random());

        const finalInventory = shuffledItems.slice(0, config.size).map(item => ({
            ...item,
            baseItemId: item.id,
            finalGoldValue: Math.max(1, Math.floor(item.baseGoldValue * (poiLevelConfig[currentPoi.icon as keyof typeof poiLevelConfig]?.[poiLevel]?.resources.find(r => r.type === 'currency')?.quantity || 10) / 10)),
        }));
        
        setMerchantInventory(finalInventory);
        return finalInventory;
    }, [adventureSettings.activeItemUniverses]);

    const handleAddToCart = React.useCallback((item: SellingItem) => {
        setShoppingCart(prevCart => {
            const existingItem = prevCart.find(cartItem => cartItem.baseItemId === item.baseItemId && cartItem.name === item.name);
            if (existingItem) {
                return prevCart.map(cartItem =>
                    cartItem.baseItemId === item.baseItemId && cartItem.name === item.name
                        ? { ...cartItem, quantity: (cartItem.quantity || 1) + 1 }
                        : cartItem
                );
            }
            return [...prevCart, { ...item, quantity: 1 }];
        });
    }, []);

    const handleRemoveFromCart = React.useCallback((itemName: string) => {
        setShoppingCart(prevCart => {
            const existingItem = prevCart.find(cartItem => cartItem.name === itemName);
            if (existingItem && existingItem.quantity! > 1) {
                return prevCart.map(cartItem =>
                    cartItem.name === itemName
                        ? { ...cartItem, quantity: cartItem.quantity! - 1 }
                        : cartItem
                );
            }
            return prevCart.filter(cartItem => cartItem.name !== itemName);
        });
    }, []);

    const handleFinalizePurchase = React.useCallback((): string | null => {
        const totalCost = shoppingCart.reduce((acc, item) => acc + (item.finalGoldValue * (item.quantity || 1)), 0);

        if ((adventureSettings.playerGold || 0) < totalCost) {
            React.startTransition(() => {
                toast({ title: "Fonds insuffisants", description: "Vous n'avez pas assez d'or pour cet achat.", variant: "destructive" });
            });
            return null;
        }

        const boughtItemsSummary: string[] = [];

        const itemsToInventory = shoppingCart.filter(item => item.type !== 'npc');
        if (itemsToInventory.length > 0) {
            setAdventureSettings(prev => {
                const newInventory = [...(prev.playerInventory || [])];
                itemsToInventory.forEach(cartItem => {
                    const newItem: PlayerInventoryItem = {
                        id: `${cartItem.baseItemId}-${uid()}`,
                        name: cartItem.name,
                        quantity: cartItem.quantity || 1,
                        description: cartItem.description,
                        type: cartItem.type as any,
                        goldValue: cartItem.finalGoldValue,
                        damage: cartItem.damage,
                        ac: cartItem.ac,
                        statBonuses: cartItem.statBonuses,
                        effectType: cartItem.effectType,
                        effectDetails: cartItem.effectDetails,
                        familiarDetails: cartItem.familiarDetails,
                        generatedImageUrl: null,
                        isEquipped: false
                    };
                    const existingIndex = newInventory.findIndex(invItem => invItem.name === newItem.name);
                    if (existingIndex > -1) {
                        newInventory[existingIndex].quantity += newItem.quantity;
                    } else {
                        newInventory.push(newItem);
                    }
                    boughtItemsSummary.push(`${newItem.quantity}x ${newItem.name}`);
                });
                return { ...prev, playerInventory: newInventory };
            });
        }

        const npcsToRecruit = shoppingCart.filter(item => item.type === 'npc');
        if (npcsToRecruit.length > 0) {
            const newCharactersToAdd: Omit<Character, 'id'>[] = npcsToRecruit.map(npcItem => {
                boughtItemsSummary.push(`1x Compagnon: ${npcItem.name}`);
                return {
                    name: npcItem.name,
                    details: npcItem.description,
                    isAlly: true,
                    isHostile: false,
                    affinity: 70,
                    level: 1,
                    characterClass: "Mercenaire",
                    hitPoints: 15,
                    maxHitPoints: 15,
                    locationId: adventureSettings.playerLocationId,
                };
            });
            handleNewCharacters(newCharactersToAdd);
        }

        addCurrencyToPlayer(-totalCost);
        
        const summaryText = boughtItemsSummary.join(', ');
        React.startTransition(() => {
            toast({ title: "Achat Terminé!", description: `Vous avez acquis : ${summaryText}.` });
        });
        
        setShoppingCart([]);
        setMerchantInventory([]);

        return summaryText;
    }, [shoppingCart, adventureSettings.playerGold, toast, setAdventureSettings, addCurrencyToPlayer, handleNewCharacters, adventureSettings.playerLocationId]);

    const closeMerchantPanel = React.useCallback(() => {
        setMerchantInventory([]);
        setShoppingCart([]);
    }, []);

    return {
        merchantInventory,
        shoppingCart,
        handleAddToCart,
        handleRemoveFromCart,
        handleFinalizePurchase,
        initializeMerchantInventory,
        closeMerchantPanel,
    };
}
