
// src/types/index.ts
import { z } from 'genkit';

// Déplacé depuis generate-adventure.ts pour éviter les problèmes avec 'use server'
// Schéma pour les objets obtenus (loot, trouvés, donnés)
export const LootedItemSchema = z.object({
  itemName: z.string().describe("Name of the item. e.g., 'Potion de Soin Mineure', 'Dague Rouillée'. CRITICAL: DO NOT include currency (gold, coins, etc.) here; use currencyGained instead."),
  quantity: z.number().int().min(1).describe("Quantity of the item."),
  description: z.string().optional().describe("A brief description of the item, suitable for a tooltip. MUST be in {{../currentLanguage}}."),
  effect: z.string().optional().describe("Description of the item's effect (e.g., 'Restaure 10 PV', '+1 aux dégâts'). MUST be in {{../currentLanguage}}."),
  itemType: z.enum(['consumable', 'weapon', 'armor', 'quest', 'misc', 'jewelry']).describe("Type of the item. This is CRUCIAL. 'consumable' items are used up. 'weapon', 'armor', 'jewelry' can be equipped. 'quest' items are for specific objectives. 'misc' for others."),
  goldValue: z.number().int().optional().describe("Estimated gold piece value of the item, if applicable. Only for non-currency items."),
  statBonuses: z.object({
    ac: z.number().optional().describe("Armor Class bonus."),
    attack: z.number().optional().describe("Attack roll bonus."),
    damage: z.string().optional().describe("Damage bonus or dice (e.g., '+2', '1d6'). This will typically override player's base damage if it's a weapon."),
    str: z.number().optional().describe("Strength bonus."),
    dex: z.number().optional().describe("Dexterity bonus."),
    con: z.number().optional().describe("Constitution bonus."),
    int: z.number().optional().describe("Intelligence bonus."),
    wis: z.number().optional().describe("Wisdom bonus."),
    cha: z.number().optional().describe("Charisma bonus."),
  }).optional().describe("Stat bonuses provided by the item if equipped."),
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
  id: string; // Unique ID for each item instance
  name: string;
  quantity: number;
  description?: string;
  effect?: string;
  type: 'consumable' | 'weapon' | 'armor' | 'quest' | 'misc' | 'jewelry';
  goldValue?: number;
  generatedImageUrl?: string | null;
  isEquipped?: boolean;
  statBonuses?: {
    ac?: number;
    attack?: number;
    damage?: string; // e.g. "1d8", "+2"
    str?: number;
    dex?: number;
    con?: number;
    int?: number;
    wis?: number;
    cha?: number;
  };
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
    playerInitialAttributePoints?: number; 
    playerStrength?: number;
    playerDexterity?: number;
    playerConstitution?: number;
    playerIntelligence?: number;
    playerWisdom?: number;
    playerCharisma?: number;
    playerArmorClass?: number; // This will become the base AC before equipment
    playerAttackBonus?: number; // This will become the base attack bonus
    playerDamageBonus?: string; // This will become the base/unarmed damage bonus
    equippedItemIds?: { // IDs of equipped items
        weapon: string | null;
        armor: string | null;
        jewelry: string | null;
    };
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
