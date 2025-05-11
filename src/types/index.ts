// src/types/index.ts

export interface Message {
  id: string; // Unique ID for the message
  type: 'user' | 'ai' | 'system'; // system for initial setup messages
  content: string;
  timestamp: number; // For ordering and potential display
  sceneDescription?: string; // Optional: Description of the scene for image generation (added by AI message)
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

  // RPG specific fields (optional based on rpgMode)
  stats?: Record<string, number | string>; // e.g., { HP: 10, STR: 5, Class: 'Warrior' }
  inventory?: Record<string, number>; // e.g., { Gold: 100, Sword: 1 }
  history?: string[]; // Log of significant events, actions, or quotes involving the character, SHOULD be in target language
  opinion?: Record<string, string>; // e.g., { Player: 'Friendly', Rina: 'Suspicious' }, SHOULD be in target language
  portraitUrl?: string | null; // URL for generated portrait
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

export interface AdventureSettings {
    world: string;
    initialSituation: string;
    rpgMode: boolean;
    relationsMode?: boolean; // Added for the new "Mode jeux de Relations"
    // Add other global settings as needed (e.g., starting level, currency name)
    currencyName?: string; // e.g., "Gold", "Credits"
    playerName?: string; // Add player name setting
}

// Add other shared types as the application grows
export interface SaveData {
    adventureSettings: AdventureSettings;
    characters: Character[];
    narrative: Message[]; // Changed from string to Message[]
    currentLanguage: string;
    activeCombat?: ActiveCombat; // Save combat state
    // Add versioning or timestamp if needed
    saveFormatVersion?: number; // Bump version for AI relation updates (1.6)
    timestamp?: string;
}