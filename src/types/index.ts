
// src/types/index.ts
import { z } from 'genkit'; // Import z from genkit

// Déplacé depuis generate-adventure.ts pour éviter les problèmes avec 'use server'
export const LootedItemSchema = z.object({
  itemName: z.string().describe("Name of the item. e.g., 'Potion de Soin Mineure', 'Dague Rouillée', 'Parchemin de Feu Faible', '50 {{../currencyName}}'."),
  quantity: z.number().int().min(1).describe("Quantity of the item dropped."),
  description: z.string().optional().describe("A brief description of the item, suitable for a tooltip. MUST be in {{../currentLanguage}}."),
  effect: z.string().optional().describe("Description of the item's effect (e.g., 'Restaure 10 PV', '+1 aux dégâts'). MUST be in {{../currentLanguage}}."),
  itemType: z.enum(['consumable', 'weapon', 'armor', 'quest', 'misc']).describe("Type of the item. This is CRUCIAL. 'consumable' items are used up. 'weapon', 'armor' can be equipped. 'quest' items are for specific objectives. 'misc' for others."),
});
export type LootedItem = z.infer<typeof LootedItemSchema>;


export interface Message {
  id: string; // Unique ID for the message
  type: 'user' | 'ai' | 'system'; // system for initial setup messages
  content: string;
  timestamp: number; // For ordering and potential display
  sceneDescription?: string; // Optional: Description of the scene for image generation (added by AI message)
  loot?: LootedItem[]; // Utilise le type LootedItem importé
  lootTaken?: boolean; // Optional: Flag to indicate if the loot has been processed
}

export interface StatusEffect {
  name: string; // ex: "Empoisonné", "Étourdi"
  description: string; // ex: "Subit 2 dégâts par tour", "Ne peut pas agir"
  duration: number; // Nombre de tours restants, -1 pour permanent/jusqu'à guérison
}

export interface CombatAction {
  actorId: string; // player or character.id
  actionType: 'attack' | 'spell' | 'skill' | 'defend' | 'flee' | 'dialogue';
  targetId?: string; // character.id or player
  description: string; // "Player attacks Goblin with sword"
  outcome: string; // "Hit for 5 damage", "Missed", "Goblin is stunned"
  damageDealt?: number;
  healingDone?: number;
}

export interface Combatant {
  characterId: string; // Corresponds to Character.id or 'player'
  name: string; // Name of the combatant
  currentHp: number;
  maxHp: number;
  currentMp?: number; // Current Mana Points
  maxMp?: number; // Maximum Mana Points
  team: 'player' | 'enemy' | 'neutral'; // Team alignment
  isDefeated: boolean;
  statusEffects?: StatusEffect[]; // Active status effects
  // Potentially more combat-specific stats like temporary AC boost, conditions etc.
}

export interface ActiveCombat {
  isActive: boolean;
  combatants: Combatant[];
  environmentDescription?: string; // e.g., "a dark cave", "a bustling tavern"
  turnLog?: string[]; // Summary of major events from previous turns
  playerAttemptedDeescalation?: boolean; // Flag if player tried to talk out of it
}


export interface Character {
  id: string; // Unique ID for the character
  name: string;
  details: string; // Base description, SHOULD be in target language
  biographyNotes?: string; // Detailed biography or private notes, SHOULD be in target language if user-provided

  // RPG specific fields (optional based on rpgMode)
  stats?: Record<string, number | string>; // e.g., { HP: 10, STR: 5, Class: 'Warrior' }
  inventory?: Record<string, number>; // e.g., { Gold: 100, Sword: 1 }
  history?: string[]; // Log of significant events, actions, or quotes involving the character, SHOULD be in target language
  opinion?: Record<string, string>; // e.g., { Player: 'Friendly', Rina: 'Suspicious' }, SHOULD be in target language
  portraitUrl?: string | null; // URL for generated portrait or uploaded Data URI
  affinity?: number; // Affinity towards the player (0-100)
  relations?: Record<string, string>; // Relationship status towards other characters/player (key: character ID or 'player', value: status e.g., "Petite amie", "Meilleur ami", "Ennemi juré"), SHOULD be in target language

  // Potential future fields for RPG mode (aligned with D&D concepts)
  level?: number;
  experience?: number; // Current EXP towards next level
  characterClass?: string; // e.g., 'Fighter', 'Wizard', 'Rogue'
  // D&D style ability scores
  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  baseHitPoints?: number; // Base HP before CON modifier, etc.
  hitPoints?: number; // Current HP
  maxHitPoints?: number; // Maximum HP
  manaPoints?: number; // Current MP/Mana
  maxManaPoints?: number; // Maximum MP/Mana
  armorClass?: number;
  attackBonus?: number; // General to-hit bonus
  damageBonus?: string; // e.g. "+2", "1d4+STR" - simplified for LLM for now
  // Skills/Proficiencies might be a list or record
  skills?: Record<string, boolean | number>; // e.g., { 'Athletics': true, 'Stealth': 2 }
  // Spells/Techniques could be lists
  spells?: string[]; // Known spells
  techniques?: string[]; // Special combat moves
  passiveAbilities?: string[]; // Innate abilities
  
  isHostile?: boolean; // Indicates if the character is currently hostile towards the player
  isQuestGiver?: boolean; // Flag for quest-related NPCs
  
  _lastSaved?: number; // Timestamp of last global save to help UI distinguish new characters
}

export interface PlayerInventoryItem {
  name: string;
  quantity: number;
  description?: string;
  effect?: string;
  type: 'consumable' | 'weapon' | 'armor' | 'quest' | 'misc'; // Made type mandatory
  // iconUrl?: string; // Optional: for custom item icons
  // iconName?: string; // Optional: for lucide-react icon names
}

export interface AdventureSettings {
    world: string;
    initialSituation: string;
    rpgMode: boolean;
    relationsMode?: boolean;
    currencyName?: string;
    playerName?: string; 
    playerClass?: string;
    playerLevel?: number;
    playerCurrentHp?: number;
    playerMaxHp?: number;
    playerCurrentMp?: number; 
    playerMaxMp?: number;   
    playerCurrentExp?: number;
    playerExpToNextLevel?: number;
    playerInventory?: PlayerInventoryItem[]; // Player's inventory
}

export interface SaveData {
    adventureSettings: AdventureSettings;
    characters: Character[];
    narrative: Message[];
    currentLanguage: string;
    activeCombat?: ActiveCombat;
    saveFormatVersion?: number;
    timestamp?: string;
}

