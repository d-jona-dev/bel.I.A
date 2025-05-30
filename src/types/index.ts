
// src/types/index.ts
import { z } from 'genkit';

// Déplacé depuis generate-adventure.ts pour éviter les problèmes avec 'use server'
// Schéma pour les objets obtenus (loot, trouvés, donnés)
export const LootedItemSchema = z.object({
  itemName: z.string().describe("Name of the item. e.g., 'Potion de Soin Mineure', 'Dague Rouillée'. CRITICAL: DO NOT include currency (gold, coins, etc.) here; use currencyGained instead."),
  quantity: z.number().int().min(1).describe("Quantity of the item."),
  description: z.string().optional().describe("A brief description of the item, suitable for a tooltip. MUST be in {{../currentLanguage}}."),
  effect: z.string().optional().describe("Description of the item's effect (e.g., 'Restaure 10 PV', '+1 aux dégâts'). MUST be in {{../currentLanguage}}."),
  itemType: z.enum(['consumable', 'weapon', 'armor', 'quest', 'misc']).describe("Type of the item. This is CRUCIAL. 'consumable' items are used up. 'weapon', 'armor' can be equipped. 'quest' items are for specific objectives. 'misc' for others."),
  goldValue: z.number().int().optional().describe("Estimated gold piece value of the item, if applicable. Only for non-currency items."),
});
export type LootedItem = z.infer<typeof LootedItemSchema>;


export interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: number;
  sceneDescription?: string;
  loot?: LootedItem[];
  lootTaken?: boolean;
}

export interface StatusEffect {
  name: string;
  description: string;
  duration: number;
}

export interface CombatAction {
  actorId: string;
  actionType: 'attack' | 'spell' | 'skill' | 'defend' | 'flee' | 'dialogue';
  targetId?: string;
  description: string;
  outcome: string;
  damageDealt?: number;
  healingDone?: number;
}

export interface Combatant {
  characterId: string;
  name: string;
  currentHp: number;
  maxHp: number;
  currentMp?: number;
  maxMp?: number;
  team: 'player' | 'enemy' | 'neutral';
  isDefeated: boolean;
  statusEffects?: StatusEffect[];
}

export interface ActiveCombat {
  isActive: boolean;
  combatants: Combatant[];
  environmentDescription?: string;
  turnLog?: string[];
  playerAttemptedDeescalation?: boolean;
}


export interface Character {
  id: string;
  name: string;
  details: string;
  biographyNotes?: string;
  stats?: Record<string, number | string>;
  inventory?: Record<string, number>; // nom de l'objet: quantité
  history?: string[];
  opinion?: Record<string, string>;
  portraitUrl?: string | null;
  affinity?: number;
  relations?: Record<string, string>; // Clé: characterId ou 'player', Valeur: description de la relation
  level?: number;
  experience?: number;
  characterClass?: string;
  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  baseHitPoints?: number;
  hitPoints?: number;
  maxHitPoints?: number;
  manaPoints?: number;
  maxManaPoints?: number;
  armorClass?: number;
  attackBonus?: number;
  damageBonus?: string;
  skills?: Record<string, boolean | number>;
  spells?: string[];
  techniques?: string[];
  passiveAbilities?: string[];
  isHostile?: boolean;
  isQuestGiver?: boolean;
  _lastSaved?: number; // Timestamp of last global save
}

export interface PlayerInventoryItem {
  name: string;
  quantity: number;
  description?: string;
  effect?: string;
  type: 'consumable' | 'weapon' | 'armor' | 'quest' | 'misc';
  goldValue?: number;
  generatedImageUrl?: string | null;
}

export interface AdventureSettings {
    world: string;
    initialSituation: string;
    rpgMode: boolean;
    relationsMode?: boolean;
    playerName?: string;
    playerClass?: string;
    playerLevel?: number;
    playerCurrentHp?: number;
    playerMaxHp?: number;
    playerCurrentMp?: number;
    playerMaxMp?: number;
    playerCurrentExp?: number;
    playerExpToNextLevel?: number;
    playerInventory?: PlayerInventoryItem[];
    playerGold?: number;
}

export interface SaveData {
    adventureSettings: AdventureSettings;
    characters: Character[];
    narrative: Message[];
    currentLanguage: string;
    activeCombat?: ActiveCombat;
    saveFormatVersion: number;
    timestamp: string;
}
