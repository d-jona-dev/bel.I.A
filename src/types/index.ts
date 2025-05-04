
// src/types/index.ts

export interface Message {
  id: string; // Unique ID for the message
  type: 'user' | 'ai' | 'system'; // system for initial setup messages
  content: string;
  timestamp: number; // For ordering and potential display
  sceneDescription?: string; // Optional: Description of the scene for image generation (added by AI message)
}


export interface Character {
  id: string; // Unique ID for the character
  name: string;
  details: string; // Base description from the form

  // RPG specific fields (optional based on rpgMode)
  stats?: Record<string, number | string>; // e.g., { HP: 10, STR: 5, Class: 'Warrior' }
  inventory?: Record<string, number>; // e.g., { Gold: 100, Sword: 1 }
  history?: string[]; // Log of significant events, actions, or quotes involving the character
  opinion?: Record<string, string>; // e.g., { Player: 'Friendly', Rina: 'Suspicious' }
  portraitUrl?: string | null; // URL for generated portrait

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
  hitPoints?: number; // Current HP
  maxHitPoints?: number; // Maximum HP
  armorClass?: number;
  // Skills/Proficiencies might be a list or record
  skills?: Record<string, boolean | number>; // e.g., { 'Athletics': true, 'Stealth': 2 }
  // Spells/Techniques could be lists
  spells?: string[]; // Known spells
  techniques?: string[]; // Special combat moves
  passiveAbilities?: string[]; // Innate abilities
  // Add alignment, background, etc. if needed
}

export interface AdventureSettings {
    world: string;
    initialSituation: string;
    rpgMode: boolean;
    // Add other global settings as needed (e.g., starting level, currency name)
    currencyName?: string; // e.g., "Gold", "Credits"
}

// Add other shared types as the application grows
export interface SaveData {
    adventureSettings: AdventureSettings;
    characters: Character[];
    narrative: Message[]; // Changed from string to Message[]
    currentLanguage: string;
    // Add versioning or timestamp if needed
    saveFormatVersion?: number; // Changed to 1.1 previously, keep or increment as needed
    timestamp?: string;
}
