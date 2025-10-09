
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { AdventureSettings, Character, Combatant, ActiveCombat, PlayerInventoryItem, CombatUpdatesSchema } from "@/types";
import { calculateEffectiveStats } from "@/hooks/systems/useAdventureState";

const PLAYER_ID = "player";
const uid = (n = 6) => Math.random().toString(36).slice(2, 2 + n);


interface UseCombatProps {
    adventureSettings: AdventureSettings;
    setAdventureSettings: React.Dispatch<React.SetStateAction<AdventureSettings>>;
    characters: Character[];
    setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
    baseCharacters: Character[];
    handleNarrativeUpdate: (content: string, type: 'user' | 'ai', sceneDesc?: string, lootItems?: any[], imageUrl?: string, imageTransform?: any, speakingCharacterNames?: string[]) => void;
    addCurrencyToPlayer: (amount: number) => void;
    handleTakeLoot: (messageId: string, itemsToTake: PlayerInventoryItem[], silent?: boolean) => void;
    handlePoiOwnershipChange: (changes: { poiId: string; newOwnerId: string }[]) => void;
}

export function useCombat({
    adventureSettings,
    setAdventureSettings,
    characters,
    setCharacters,
    baseCharacters,
    handleNarrativeUpdate,
    addCurrencyToPlayer,
    handleTakeLoot,
    handlePoiOwnershipChange,
}: UseCombatProps) {
    const { toast } = useToast();
    const [activeCombat, setActiveCombat] = React.useState<ActiveCombat | undefined>(undefined);
    const [itemToUse, setItemToUse] = React.useState<PlayerInventoryItem | null>(null);
    const [isTargeting, setIsTargeting] = React.useState(false);

    const handleCombatUpdates = React.useCallback((updates: CombatUpdatesSchema) => {
        if (!updates) return;

        if (updates.updatedCombatants) {
            const combatantsMap = new Map(updates.updatedCombatants.map(c => [c.combatantId, c]));
            setCharacters(prev =>
                prev.map(char => {
                    const update = combatantsMap.get(char.id);
                    if (update) {
                        return {
                            ...char,
                            hitPoints: update.newHp,
                            manaPoints: update.newMp ?? char.manaPoints,
                            statusEffects: update.newStatusEffects ?? char.statusEffects,
                        };
                    }
                    return char;
                })
            );
        }

        const playerUpdate = updates.updatedCombatants?.find(c => c.combatantId === PLAYER_ID);
        if (playerUpdate) {
            setAdventureSettings(prev => ({
                ...prev,
                playerCurrentHp: playerUpdate.newHp,
                playerCurrentMp: playerUpdate.newMp ?? prev.playerCurrentMp,
            }));
        }

        if (updates.combatEnded) {
            let lootMessage = "Le combat est terminé ! ";
            if (updates.expGained && updates.expGained > 0) {
                lootMessage += `Vous gagnez ${updates.expGained} points d'expérience. `;
                setAdventureSettings(prev => {
                    const newExp = (prev.playerCurrentExp || 0) + updates.expGained!;
                    let updatedFamiliars = prev.familiars || [];
                    const activeFamiliar = updatedFamiliars.find(f => f.isActive);
                    if (activeFamiliar) {
                        activeFamiliar.currentExp += updates.expGained!;
                        if (activeFamiliar.currentExp >= activeFamiliar.expToNextLevel) {
                            activeFamiliar.level += 1;
                            activeFamiliar.currentExp -= activeFamiliar.currentExpToNextLevel;
                            activeFamiliar.expToNextLevel = Math.floor(100 * Math.pow(1.5, activeFamiliar.level - 1));
                            React.startTransition(() => {
                                toast({
                                    title: "Familier a monté de niveau!",
                                    description: `${activeFamiliar.name} est maintenant niveau ${activeFamiliar.level}!`
                                });
                            });
                        }
                    }
                    return { ...prev, playerCurrentExp: newExp, familiars: updatedFamiliars };
                });
            }
            if (updates.currencyGained && updates.currencyGained > 0) {
                lootMessage += `Vous trouvez ${updates.currencyGained} pièces d'or.`;
                addCurrencyToPlayer(updates.currencyGained);
            }
            if (lootMessage.trim() !== "Le combat est terminé!") {
                const lootItems = (updates.itemsObtained || []).map(item => ({...item, id: uid() } as any));
                handleNarrativeUpdate(lootMessage, 'system', undefined, lootItems);
            }
            setActiveCombat(undefined);
        } else if (updates.nextActiveCombatState) {
            setActiveCombat(updates.nextActiveCombatState);
        }
    }, [handleNarrativeUpdate, addCurrencyToPlayer, toast, setCharacters, setAdventureSettings]);
    
     const resolveCombatTurn = React.useCallback(
        (
            currentCombatState: ActiveCombat,
            settings: AdventureSettings,
            allCharacters: Character[]
        ): {
            nextCombatState: ActiveCombat;
            turnLog: string[];
            combatUpdates: CombatUpdatesSchema;
            conquestHappened: boolean;
            
        } => {
            let turnLog: string[] = [];
            let updatedCombatants = JSON.parse(JSON.stringify(currentCombatState.combatants)) as Combatant[];
            const effectivePlayerStats = calculateEffectiveStats(settings);
            let conquestHappened = false;
            
            
            const getDamage = (damageBonus: string | undefined): number => {
                if (!damageBonus) return 1;
                const match = damageBonus.match(/(\d+)d(\d+)([+-]\d+)?/);
                let damage = 1;
                if (match) {
                    const [_, diceCount, diceSides, bonus] = match;
                    damage = 0;
                    for (let i = 0; i < parseInt(diceCount, 10); i++) {
                        damage += Math.floor(Math.random() * parseInt(diceSides, 10)) + 1;
                    }
                    if (bonus) damage += parseInt(bonus, 10);
                } else if (!isNaN(parseInt(damageBonus, 10))) {
                    damage = parseInt(damageBonus, 10);
                }
                return Math.max(1, damage);
            };
            
            const player = updatedCombatants.find(c => c.characterId === PLAYER_ID);
            if (player && !player.isDefeated) {
                 const target = updatedCombatants.find(c => c.team === 'enemy' && !c.isDefeated);
                 if(target) {
                     const attackRoll = Math.floor(Math.random() * 20) + 1;
                     const totalAttack = attackRoll + (effectivePlayerStats.playerAttackBonus || 0);
                     const targetData = allCharacters.find(c => c.id === target.characterId);
                     const targetAC = targetData?.armorClass ?? 10;
      
                     if (totalAttack >= targetAC) {
                         const damage = getDamage(effectivePlayerStats.playerDamageBonus);
                         target.currentHp = Math.max(0, target.currentHp - damage);
                         turnLog.push(`${player.name} touche ${target.name} et inflige ${damage} points de dégâts.`);
                         if (target.currentHp === 0) {
                             target.isDefeated = true;
                             turnLog.push(`${target.name} est vaincu!`);
                         }
                     } else {
                         turnLog.push(`${player.name} attaque ${target.name} mais rate son coup.`);
                     }
                 }
            }
        
            updatedCombatants.filter(c => c.team === 'enemy' && !c.isDefeated).forEach(enemy => {
                const targetPool = updatedCombatants.filter(t => t.team === 'player' && !t.isDefeated);
                if (targetPool.length > 0) {
                    const target = targetPool[Math.floor(Math.random() * targetPool.length)];
                    const enemyData = allCharacters.find(c => c.id === enemy.characterId);
                    const attackRoll = Math.floor(Math.random() * 20) + 1;
                    const totalAttack = attackRoll + (enemyData?.attackBonus || 0);
                    
                    let targetAC = 10;
                    if (target.characterId === PLAYER_ID) {
                        targetAC = effectivePlayerStats.playerArmorClass || 10;
                    } else {
                        const allyData = allCharacters.find(c => c.id === target.characterId);
                        targetAC = allyData?.armorClass ?? 10;
                    }
        
                    if (totalAttack >= targetAC) {
                        const damage = getDamage(enemyData?.damageBonus);
                        target.currentHp = Math.max(0, target.currentHp - damage);
                        turnLog.push(`${enemy.name} attaque ${target.name} et inflige ${damage} points de dégâts.`);
                        if (target.currentHp === 0) {
                            target.isDefeated = true;
                            turnLog.push(`${target.name} est vaincu!`);
                        }
                    } else {
                        turnLog.push(`${enemy.name} attaque ${target.name} et rate.`);
                     }
                }
            });
            
            const allEnemiesDefeated = updatedCombatants.filter(c => c.team === 'enemy').every(c => c.isDefeated);
            const allPlayersDefeated = updatedCombatants.filter(c => c.team === 'player').every(c => c.isDefeated);
            
            const hasHuntReward = updatedCombatants.some(c => c.team === 'enemy' && c.isDefeated && c.rewardItem);
            
            let isCombatOver = allEnemiesDefeated || allPlayersDefeated;
            if (isCombatOver && allEnemiesDefeated && hasHuntReward) {
                isCombatOver = false;
            }

            let expGained = 0;
            let currencyGained = 0;
            let itemsObtained: PlayerInventoryItem[] = [];
      
            if (isCombatOver && allEnemiesDefeated) {
                updatedCombatants.filter(c => c.team === 'enemy' && c.isDefeated).forEach(enemy => {
                    const enemyData = baseCharacters.find(bc => bc.id === enemy.characterId);
                    if (enemyData) {
                        expGained += (enemyData.level || 1) * 10;
                        currencyGained += Math.floor(Math.random() * (enemyData.level || 1) * 5) + (enemyData.level || 1);
                    }
                });

                turnLog.push(`Victoire!`);
                
                if(currentCombatState.contestedPoiId) {
                    conquestHappened = true; // Signal that a conquest happened
                    const poiName = settings.mapPointsOfInterest?.find(p=>p.id === currentCombatState.contestedPoiId)?.name || "Territoire Inconnu";
                    turnLog.push(`Le territoire de ${poiName} est conquis!`);
                }
                
                
            }
      
            const combatUpdates: CombatUpdatesSchema = {
                updatedCombatants: updatedCombatants.map(c => ({
                    combatantId: c.characterId,
                    newHp: c.currentHp,
                    newMp: c.currentMp,
                    isDefeated: c.isDefeated,
                    newStatusEffects: c.statusEffects,
                })),
                combatEnded: isCombatOver,
                expGained: expGained,
                currencyGained: currencyGained,
                itemsObtained: itemsObtained.map(item => ({
                    itemName: item.name,
                    quantity: item.quantity,
                    description: item.description,
                    effect: item.effect,
                    itemType: item.type,
                    goldValue: item.goldValue,
                    statBonuses: item.statBonuses,
                })),
                turnNarration: turnLog.join('\n'), // For AI context
                nextActiveCombatState: {
                    ...currentCombatState,
                    combatants: updatedCombatants,
                    isActive: !isCombatOver,
                }
            };
      
            return {
                nextCombatState: combatUpdates.nextActiveCombatState!,
                turnLog,
                combatUpdates,
                conquestHappened,
            };
        }, [baseCharacters]
    );

     const handleClaimHuntReward = React.useCallback((combatantId: string) => {
        const combatant = activeCombat?.combatants.find(c => c.characterId === combatantId);
        if (!combatant || !combatant.isDefeated || !combatant.rewardItem) return;
    
        handleTakeLoot("", [combatant.rewardItem], false);
        setActiveCombat(undefined); // End combat
        handleNarrativeUpdate(`Vous avez récupéré ${combatant.rewardItem.name} sur la créature vaincue.`, 'system');
    
    }, [activeCombat, handleTakeLoot, handleNarrativeUpdate]);
    
    const applyCombatItemEffect = React.useCallback((targetId?: string) => {
        if (!itemToUse || !activeCombat?.isActive) return;

        const { effectDetails } = itemToUse;
        let narrativeAction = `J'utilise ${itemToUse.name}`;
        let effectAppliedMessage = "";

        setAdventureSettings(prevSettings => {
            const newInventory = [...(prevSettings.playerInventory || [])];
            const itemIndex = newInventory.findIndex(invItem => invItem.id === itemToUse.id);
            if (itemIndex > -1) {
                newInventory[itemIndex].quantity -= 1;
                if (newInventory[itemIndex].quantity <= 0) {
                    newInventory.splice(itemIndex, 1);
                }
            }
            return { ...prevSettings, playerInventory: newInventory };
        });

        if (effectDetails?.type === 'heal') {
            const hpChange = effectDetails.amount;
            setAdventureSettings(prev => ({
                ...prev,
                playerCurrentHp: Math.min(prev.playerMaxHp || 0, (prev.playerCurrentHp || 0) + hpChange)
            }));
            narrativeAction += `, restaurant ${hpChange} PV.`;
            effectAppliedMessage = `Vous avez utilisé ${itemToUse.name} et restauré ${hpChange} PV.`;
        } else if (effectDetails?.type === 'damage_single' && targetId) {
            const target = activeCombat.combatants.find(c => c.characterId === targetId);
            narrativeAction += ` sur ${target?.name}, lui infligeant ${effectDetails.amount} points de dégâts.`;
            effectAppliedMessage = `Vous avez utilisé ${itemToUse.name} sur ${target?.name} pour ${effectDetails.amount} dégâts.`;
            setActiveCombat(prev => {
                if (!prev) return prev;
                const newCombatants = prev.combatants.map(c =>
                    c.characterId === targetId ? { ...c, currentHp: Math.max(0, c.currentHp - effectDetails.amount) } : c
                );
                return { ...prev, combatants: newCombatants };
            });
        } else if (effectDetails?.type === 'damage_all') {
            narrativeAction += `, infligeant ${effectDetails.amount} points de dégâts à tous les ennemis.`;
            effectAppliedMessage = `Vous avez utilisé ${itemToUse.name}, infligeant ${effectDetails.amount} dégâts à tous les ennemis.`;
            setActiveCombat(prev => {
                if (!prev) return prev;
                const newCombatants = prev.combatants.map(c =>
                    c.team === 'enemy' ? { ...c, currentHp: Math.max(0, c.currentHp - effectDetails.amount) } : c
                );
                return { ...prev, combatants: newCombatants };
            });
        }
        
        React.startTransition(() => {
            toast({ title: "Action en Combat", description: effectAppliedMessage });
        });
        
        // This will now be handled by the caller, which is `page.tsx`
        // handleNarrativeUpdate(narrativeAction, 'user');
        // callGenerateAdventure(narrativeAction);
        // The hook should return the action to be dispatched
        
        setIsTargeting(false);
        setItemToUse(null);

        return narrativeAction;

    }, [itemToUse, activeCombat, toast, setAdventureSettings]);


    return {
        activeCombat,
        setActiveCombat,
        itemToUse,
        setItemToUse,
        isTargeting,
        setIsTargeting,
        resolveCombatTurn,
        handleCombatUpdates,
        handleClaimHuntReward,
        applyCombatItemEffect,
    };
}
