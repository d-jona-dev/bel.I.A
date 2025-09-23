
// src/types/index.ts
import { z } from 'genkit';

// NEW: Base definition for items in our database
export interface BaseItem {
  id: string;
  name: string;
  description: string;
  type: 'weapon' | 'armor' | 'jewelry' | 'consumable' | 'quest' | 'misc';
  damage?: string; // e.g., "1d6", "2d8"
  ac?: string; // e.g., "11 + Mod.Dex", "14"
  baseGoldValue: number;
  universe: 'Médiéval-Fantastique' | 'Post-Apo' | 'Futuriste' | 'Space-Opéra' | string;
  rarity?: 'Commun' | 'Rare' | 'Epique' | 'Légendaire' | 'Divin';
  effectType?: 'stat' | 'narrative' | 'combat';
  statBonuses?: PlayerInventoryItem['statBonuses'];
  effectDetails?: {
    type: 'heal' | 'damage_single' | 'damage_all';
    amount: number;
  };
}

export interface BaseFamiliar {
    id: string;
    name: string;
    description: string;
    universe: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    basePassiveBonus: FamiliarPassiveBonus;
}


// NEW: Represents an item being sold by a merchant, with its final price.
export interface SellingItem {
  baseItemId: string;
  name: string;
  description: string;
  type: BaseItem['type'];
  damage?: string;
  ac?: string;
  rarity: 'Commun' | 'Rare' | 'Epique' | 'Légendaire' | 'Divin';
  finalGoldValue: number;
  statBonuses?: PlayerInventoryItem['statBonuses'];
  effectType?: 'stat' | 'narrative' | 'combat';
  effectDetails?: BaseItem['effectDetails'];
}


// Déplacé depuis generate-adventure.ts pour éviter les problèmes avec 'use server'
export const LootedItemSchema = z.object({
  itemName: z.string().describe("Name of the item. e.g., 'Potion de Soin Mineure', 'Dague Rouillée'. CRITICAL: DO NOT include currency (gold, coins, etc.) here; use currencyGained instead."),
  quantity: z.number().int().min(1).describe("Quantity of the item."),
  description: z.string().optional().describe("A brief description of the item, suitable for a tooltip. MUST be in {{../currentLanguage}}."),
  effect: z.string().optional().describe("Description of the item's effect (e.g., 'Restaure 10 PV', '+1 aux dégâts'). MUST be in {{../currentLanguage}}."),
  itemType: z.enum(['consumable', 'weapon', 'armor', 'quest', 'misc', 'jewelry']).describe("Type of the item. This is CRUCIAL. 'consumable' items are used up. 'weapon', 'armor', 'jewelry' can be equipped. 'quest' items are for specific objectives. 'misc' for others."),
  goldValue: z.number().int().optional().describe("Estimated gold piece value of the item, if applicable. Only for non-currency items. If an item has minimal or nuisance value, assign it a goldValue of 1. Do not omit goldValue for such items."),
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
    hp: z.number().optional().describe("Hit Points bonus."),
  }).optional().describe("Stat bonuses provided by the item if equipped."),
});
export type LootedItem = z.infer<typeof LootedItemSchema>;

export const FamiliarPassiveBonusSchema = z.object({
    type: z.enum(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'gold_find', 'exp_gain', 'armor_class', 'attack_bonus', 'narrative']).describe("The type of passive bonus the familiar provides."),
    value: z.number().describe("The base value of the bonus per level (e.g., if value is 1, at level 3 the bonus is +3). For narrative bonuses, this can be 0."),
    description: z.string().describe("A template for the bonus description, using 'X' as a placeholder for the calculated value (e.g., '+X en Force'). For narrative bonuses, this is the full description of the effect. MUST be in {{currentLanguage}}."),
});
export type FamiliarPassiveBonus = z.infer<typeof FamiliarPassiveBonusSchema>;


export const NewFamiliarSchema = z.object({
    name: z.string().describe("Name of the new familiar."),
    description: z.string().describe("A brief description of the familiar, including its appearance and context of acquisition. MUST be in {{currentLanguage}}."),
    rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']).describe("Rarity of the familiar."),
    passiveBonus: FamiliarPassiveBonusSchema.describe("The passive bonus this familiar provides."),
});
export type NewFamiliarSchema = z.infer<typeof NewFamiliarSchema>;

export interface ImageTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

export interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: number;
  sceneDescription?: string;
  imageUrl?: string | null;
  imageTransform?: ImageTransform;
  loot?: PlayerInventoryItem[];
  lootTaken?: boolean;
}

export const StatusEffectSchema = z.object({
  name: z.string().describe("Name of the status effect (e.g., 'Poisoned', 'Stunned')."),
  description: z.string().describe("Brief description of the effect (e.g., 'Takes 1d4 damage per turn', 'Cannot act')."),
  duration: z.number().int().describe("Remaining duration in turns. -1 for permanent or until cured."),
});
export type StatusEffect = z.infer<typeof StatusEffectSchema>;

export const CombatantSchema = z.object({
    characterId: z.string().describe("ID of the character or 'player'."),
    name: z.string().describe("Name of the combatant."),
    currentHp: z.number().describe("Current HP of the combatant."),
    maxHp: z.number().describe("Maximum HP of the combatant."),
    currentMp: z.number().optional().describe("Current MP of the combatant if applicable."),
    maxMp: z.number().optional().describe("Maximum MP of the combatant if applicable."),
    team: z.enum(['player', 'enemy', 'neutral']).describe("Team alignment. 'player' team includes the main player and any allied NPCs."),
    isDefeated: z.boolean().default(false).describe("Is this combatant defeated?"),
    statusEffects: z.array(StatusEffectSchema).optional().describe("Active status effects on the combatant."),
});
export type Combatant = z.infer<typeof CombatantSchema>;


export const ActiveCombatSchema = z.object({
    isActive: z.boolean().describe("Is combat currently active?"),
    combatants: z.array(CombatantSchema).describe("List of all characters involved in combat, including player, allies, and enemies."),
    environmentDescription: z.string().optional().describe("Brief description of the combat environment (e.g., 'a narrow corridor', 'an open field')."),
    turnLog: z.array(z.string()).optional().describe("Summary of major events from previous combat turns."),
    contestedPoiId: z.string().optional().describe("The ID of the Point of Interest being fought over, if this is a territory combat. This is CRUCIAL for determining conquest rewards.")
});
export type ActiveCombat = z.infer<typeof ActiveCombatSchema>;


export interface GeneratedResource {
  type: 'item' | 'currency';
  name: string; // e.g., "Pièces d'Or", "Bois", "Minerai de Fer"
  quantity: number;
}

export interface MapPointOfInterest {
  id: string;
  name: string;
  level: number; // Level is now mandatory
  description: string;
  icon: 'Castle' | 'Mountain' | 'Trees' | 'Village' | 'Shield' | 'Landmark';
  position?: { x: number; y: number }; // Pourcentage, now optional
  ownerId?: string; // ID of the character or 'player' who owns/rules this POI
  resources?: GeneratedResource[]; // Resources generated by this POI
  lastCollectedTurn?: number; // The turn number (message count) when resources were last collected
  buildings?: string[]; // Array of building IDs
}

export interface Character {
  id: string;
  name: string;
  details: string;
  biographyNotes?: string;
  history?: string[];
  opinion?: Record<string, string>;
  portraitUrl?: string | null;
  faceSwapEnabled?: boolean; // Added for FaceSwap feature
  affinity?: number;
  relations?: Record<string, string>; // Clé: characterId ou 'player', Valeur: description de la relation
  level?: number;
  characterClass?: string;
  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  hitPoints?: number;
  maxHitPoints?: number;
  manaPoints?: number;
  maxManaPoints?: number;
  armorClass?: number;
  attackBonus?: number;
  damageBonus?: string;
  spells?: string[];
  isHostile?: boolean;
  isQuestGiver?: boolean;
  isAlly?: boolean; // New field to mark NPC as an ally
  initialAttributePoints?: number; // New field for NPC creation attribute points
  currentExp?: number; // For NPC progression
  expToNextLevel?: number; // For NPC progression
  factionColor?: string; // e.g. '#FF0000' for a faction's color
  locationId?: string | null; // ID of the MapPointOfInterest where the character is currently located.
  statusEffects?: StatusEffect[];
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
    damage?: string;
    str?: number;
    dex?: number;
    con?: number;
    int?: number;
    wis?: number;
    cha?: number;
    hp?: number;
  };
  effectType?: 'stat' | 'narrative' | 'combat';
  effectDetails?: {
    type: 'heal' | 'damage_single' | 'damage_all';
    amount: number;
  };
}

export interface PlayerSkill {
  id: string;
  name: string;
  description: string;
  category?: 'class' | 'social' | 'utility' | 'combat'; // 'combat' pour les compétences de combat de classe
  // Ajout potentiel : type: 'passive' | 'active', cost: number, cooldown: number, etc.
}

export interface Familiar {
    id: string;
    name: string;
    description: string; // Includes appearance and origin
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    level: number;
    currentExp: number;
    expToNextLevel: number;
    isActive: boolean; // Is this the active companion?
    passiveBonus: FamiliarPassiveBonus;
    portraitUrl?: string | null;
    _lastSaved?: number;
}

export interface PlayerAvatar {
  id: string;
  name: string;
  portraitUrl: string | null;
  details: string;
  description: string;
  orientation: string;
  class: string;
  level: number;
}

export interface TimeManagementSettings {
    enabled: boolean;
    day: number;
    dayName: string;
    dayNames: string[];
    currentTime: string; // "HH:MM" (24h format internal)
    timeFormat: '24h' | '12h';
    currentEvent: string;
    timeElapsedPerTurn: string; // "HH:MM"
}

export interface AdventureSettings {
  world: string;
  initialSituation: string;
  rpgMode: boolean;
  relationsMode: boolean;
  strategyMode: boolean;
  comicModeActive: boolean;
  playerName?: string;
  playerPortraitUrl?: string | null;
  playerDetails?: string;
  playerDescription?: string;
  playerOrientation?: string;
  playerFaceSwapEnabled?: boolean;
  playerClass?: string;
  playerLevel?: number;
  playerInitialAttributePoints?: number;
  playerStrength?: number;
  playerDexterity?: number;
  playerConstitution?: number;
  playerIntelligence?: number;
  playerWisdom?: number;
  playerCharisma?: number;
  playerCurrentHp?: number;
  playerMaxHp?: number;
  playerCurrentMp?: number;
  playerMaxMp?: number;
  playerCurrentExp?: number;
  playerExpToNextLevel?: number;
  playerGold?: number;
  playerInventory?: PlayerInventoryItem[];
  playerSkills?: PlayerSkill[];
  equippedItemIds?: {
    weapon: string | null;
    armor: string | null;
    jewelry: string | null;
  };
  familiars?: Familiar[];
  mapPointsOfInterest?: MapPointOfInterest[];
  mapImageUrl?: string | null;
  playerLocationId?: string;
  timeManagement?: TimeManagementSettings;
  // New: List of item universes to include for loot/merchants
  activeItemUniverses?: Array<BaseItem['universe']>;
}

export interface ModelDefinition {
    id: string;
    name: string;
    source: 'gemini' | 'openrouter' | 'local';
    modelName?: string;
    apiKey?: string;
    enforceStructuredResponse?: boolean;
    compatibilityMode?: boolean;
    iconUrl?: string;
}

export interface ImageModelDefinition {
    id: string;
    name: string;
    source: 'gemini' | 'openrouter' | 'huggingface' | 'local-sd';
    modelName?: string; // For HuggingFace/OpenRouter
    apiKey?: string; // For HuggingFace/OpenRouter
    apiUrl?: string; // For local-sd
}


export interface AiConfig {
    llm: {
        source: 'gemini' | 'openrouter' | 'local';
        openRouter?: {
            model: string;
            apiKey: string;
            enforceStructuredResponse: boolean;
            compatibilityMode?: boolean; 
        };
        local?: {
            model: string;
        }
    },
    image: {
        source: 'gemini' | 'openrouter' | 'huggingface' | 'local-sd';
        openRouter?: {
            model: string;
            apiKey: string;
        };
        huggingface?: {
            model: string;
            apiKey: string;
        };
        localSd?: {
            apiUrl: string;
        };
    }
}

export interface Bubble {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  type: 'parole' | 'pensée' | 'cri' | 'chuchotement';
}

export interface Panel {
    id: string;
    imageUrl: string | null;
    bubbles: Bubble[];
}

export interface ComicPage {
    id: string;
    panels: Panel[];
    gridCols: number;
}


export interface SaveData {
    adventureSettings: AdventureSettings;
    characters: Character[];
    narrative: Message[];
    currentLanguage: string;
    activeCombat?: ActiveCombat;
    saveFormatVersion: number;
    timestamp: string;
    aiConfig?: AiConfig;
}

// ZOD SCHEMAS FOR GENKIT FLOW

export const RpgContextSchema = z.object({
    playerStats: z.object({
        Name: z.string().optional(),
        Class: z.string().optional(),
        Level: z.number().optional(),
        HP: z.string().optional().describe("Player HP, e.g., '15/20'"),
        MP: z.string().optional().describe("Player MP, e.g., '10/10' or 'N/A'"),
        EXP: z.string().optional().describe("Player EXP, e.g., '50/100'"),
    }).optional().describe("Player character's statistics (e.g., HP, MP, STR)."),
    characterDetails: z.array(z.object({
        name: z.string(),
        details: z.string().optional().describe("Brief description of the character for context."),
        stats: z.record(z.union([z.string(), z.number()])).optional().describe("Character's statistics."),
        relations: z.string().optional().describe("Summary of relations towards player and others.")
    })).optional().describe("Details of relevant secondary characters already known."),
    mode: z.enum(["exploration", "dialogue", "combat"]).optional().describe("Current game mode."),
}).optional();

const BaseCharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  details: z.string(),
  biographyNotes: z.string().optional().describe("Detailed biography or private notes about the character. Provides deep context for personality and motivations. MUST be in the specified language if provided from user input in that language."),
  affinity: z.number().optional().default(50).describe("Affinity score (0-100) indicating the character's feeling towards the player. 0=Hate, 50=Neutral, 100=Love/Devotion. This score dictates the character's baseline behavior and responses toward the player. Small, gradual changes for typical interactions (+/- 1-2), larger changes (+/- 5+) for major events."),
  relations: z.record(z.string(), z.string()).optional().describe("Relationship status towards other characters/player (key: character ID or 'player', value: status e.g., 'Petite amie', 'Meilleur ami', 'Ennemi juré'). This status describes the fundamental nature of their bond (e.g., family, rival, lover) and influences specific interactions. MUST be in the specified language. If 'Inconnu' or similar, attempt to define it based on new interactions."),
  hitPoints: z.number().optional().describe("Current Hit Points. If undefined in RPG mode, assume a default like 10."),
  maxHitPoints: z.number().optional().describe("Maximum Hit Points. If undefined in RPG mode, assume a default like 10."),
  manaPoints: z.number().optional().describe("Current Mana Points. If undefined in RPG mode for a spellcaster, assume a default like 10 if applicable, or 0."),
  maxManaPoints: z.number().optional().describe("Maximum Mana Points. If undefined in RPG mode for a spellcaster, assume a default like 10 if applicable, or 0."),
  armorClass: z.number().optional().describe("Armor Class. If undefined in RPG mode, assume a default like 10."),
  attackBonus: z.number().optional().describe("Bonus to attack rolls. If undefined, assume 0."),
  damageBonus: z.string().optional().describe("Damage bonus, e.g., '+2' or '1d4'. If undefined, assume basic unarmed damage (e.g., 1d3 or 1)."),
  characterClass: z.string().optional().describe("Character's class, e.g., 'Warrior', 'Mage', 'Marchand'."),
  level: z.number().optional().describe("Character's level."),
  isHostile: z.boolean().optional().default(false).describe("Is the character currently hostile to the player?"),
  isAlly: z.boolean().optional().default(false).describe("Is this character currently an ally of the player in combat?"),
  spells: z.array(z.string()).optional().describe("List of spells known by the character (e.g., ['Boule de Feu', 'Soin Léger']). For AI decision making."),
  locationId: z.string().optional().describe("The ID of the POI where the character is currently located. This is the source of truth for location."),
  faceSwapEnabled: z.boolean().optional().describe("Whether FaceSwap is enabled for this character's portrait."),
  portraitUrl: z.string().nullable().optional().describe("The URL of the character's portrait, to be used for FaceSwap if enabled."),
}).passthrough();


const ContextSummarySchema = z.object({
    historySummary: z.string().optional().describe('A brief summary of the last few history entries.'),
    relationsSummary: z.string().optional().describe('A pre-processed summary of the character\'s relationship statuses for prompt context. MUST be in the specified language.'),
});

export const CharacterWithContextSummarySchema = z.intersection(
    BaseCharacterSchema,
    ContextSummarySchema
);

const InventoryItemForAISchema = z.object({
    itemName: z.string().describe("Name of the item. DO NOT include currency here."),
    quantity: z.number().int().min(1).describe("Quantity of the item.")
});

const PlayerSkillSchemaForAI = z.object({
    name: z.string(),
    description: z.string(),
    category: z.enum(['class', 'social', 'utility', 'combat']).optional(),
});

const PointOfInterestSchemaForAI = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    level: z.number().optional().default(1),
    ownerId: z.string().optional().describe("The ID of the character who owns this POI, or 'player'."),
    ownerName: z.string().optional().describe("The name of the current owner of this POI."),
    buildings: z.array(z.string()).optional().describe("A list of building IDs that exist at this location, e.g., ['forgeron', 'auberge']."),
});

const AiConfigForAdventureInputSchema = z.object({
    llm: z.object({
        source: z.enum(['gemini', 'openrouter', 'local']),
        openRouter: z.object({
            model: z.string(),
            apiKey: z.string(),
            enforceStructuredResponse: z.boolean(),
            compatibilityMode: z.boolean().optional(),
        }).optional(),
        local: z.object({
            model: z.string(),
        }).optional(),
    }),
    image: z.object({
        source: z.enum(['gemini', 'openrouter', 'huggingface', 'local-sd']),
        openRouter: z.object({
            model: z.string(),
            apiKey: z.string(),
        }).optional(),
        huggingface: z.object({
            model: z.string(),
            apiKey: z.string(),
        }).optional(),
        localSd: z.object({
            apiUrl: z.string(),
        }).optional(),
    }),
}).passthrough();


const TimeManagementSchemaForAI = z.object({
    enabled: z.boolean(),
    day: z.number().describe("The current day number of the adventure (e.g., 1, 2, 3...)."),
    dayName: z.string().describe("The name of the current day (e.g., Lundi, Mardi...)."),
    currentTime: z.string().describe("Current time in the story, e.g., '18:23' or '6:36pm'."),
    currentEvent: z.string().optional().describe("Description of the current event, e.g., 'Début du cours'."),
    timeElapsedPerTurn: z.string().describe("The fixed amount of time that should pass in this turn, e.g., '01:00' for one hour. The AI MUST strictly adhere to this duration for its narrative."),
});


// NEW: Schema for items for sale, provided to the AI for context
const SellingItemSchemaForAI = z.object({
    name: z.string(),
    description: z.string(),
    rarity: z.string(),
    price: z.number(),
    damage: z.string().optional(),
    ac: z.string().optional(),
});

export const GenerateAdventureInputSchema = z.object({
  world: z.string().describe('Detailed description of the game world.'),
  initialSituation: z.string().describe('The current situation or narrative state, including recent events and dialogue. If combat is active, this should describe the last action or current standoff.'),
  characters: z.array(CharacterWithContextSummarySchema).describe('Array of currently known characters who are PRESENT at the player\'s location, with their details, including current affinity, relationship statuses summary, and history summary. Relations and history summaries MUST be in the specified language. Include isAlly status.'),
  userAction: z.string().describe('The action taken by the user. If in combat, this is their combat action (e.g., "I attack Kentaro with my sword", "I cast Fireball at the Intimidator", "I use a Potion of Healing", "J\'achète l\'épée", "Je vends Dague Rouillée", "J\'utilise ma compétence : Coup Puissant"). If not in combat, it is a general narrative action or skill use.'),
  currentLanguage: z.string().describe('The current language code (e.g., "fr", "en") for generating history entries and new character details.'),
  playerName: z.string().describe('The name of the player character.'),
  relationsModeActive: z.boolean().optional().default(true).describe("Indicates if the relationship and affinity system is active for the current turn. If false, affinity and relations should not be updated or heavily influence behavior."),
  rpgModeActive: z.boolean().optional().default(false).describe("Indicates if RPG systems (combat, stats, EXP, MP, Gold) are active. If true, combat rules apply."),
  activeCombat: ActiveCombatSchema.optional().describe("Current state of combat, if any. If undefined or isActive is false, assume no combat is ongoing. If combat is active, ensure combatants includes the player, all their active allies (characters with isAlly: true), and all active enemies/neutrals."),
  playerGold: z.number().int().optional().describe("Player's current amount of Gold Pieces if RPG mode is active. This is a single currency value representing the player's total wealth in the game's primary currency."),
  promptConfig: z.object({
      rpgContext: RpgContextSchema.optional()
  }).optional(),
  playerClass: z.string().optional().describe("Player's character class if RPG mode is active."),
  playerLevel: z.number().optional().describe("Player's current level if RPG mode is active."),
  playerCurrentHp: z.number().optional().describe("Player's current HP if RPG mode is active."),
  playerMaxHp: z.number().optional().describe("Player's maximum HP if RPG mode is active."),
  playerCurrentMp: z.number().optional().describe("Player's current MP if RPG mode is active and applicable."),
  playerMaxMp: z.number().optional().describe("Player's maximum MP if RPG mode is active and applicable."),
  playerCurrentExp: z.number().optional().describe("Player's current EXP if RPG mode is active."),
  playerExpToNextLevel: z.number().optional().describe("EXP needed for player's next level if RPG mode is active."),
  playerStrength: z.number().optional(),
  playerDexterity: z.number().optional(),
  playerConstitution: z.number().optional(),
  playerIntelligence: z.number().optional(),
  playerWisdom: z.number().optional(),
  playerCharisma: z.number().optional(),
  playerArmorClass: z.number().optional().describe("Player's effective Armor Class including equipment."),
  playerAttackBonus: z.number().optional().describe("Player's effective Attack Bonus including equipment."),
  playerDamageBonus: z.string().optional().describe("Player's effective Damage (e.g. '1d8+3') including equipment."),
  playerFaceSwapEnabled: z.boolean().optional().describe("Whether FaceSwap is enabled for the player's portrait."),
  playerPortraitUrl: z.string().nullable().optional().describe("The URL of the player's portrait, to be used for FaceSwap if enabled."),
  equippedWeaponName: z.string().optional().describe("Name of the player's equipped weapon, if any."),
  equippedArmorName: z.string().optional().describe("Name of the player's equipped armor, if any."),
  equippedJewelryName: z.string().optional().describe("Name of the player's equipped jewelry, if any."),
  playerSkills: z.array(PlayerSkillSchemaForAI).optional().describe("List of skills the player possesses. The AI should consider these if the userAction indicates skill use."),
  playerLocationId: z.string().optional().describe("The ID of the POI where the player is currently located. This is the source of truth for location."),
  mapPointsOfInterest: z.array(PointOfInterestSchemaForAI).optional().describe("List of known points of interest on the map, including their ID, current owner, and a list of building IDs."),
  playerLocation: PointOfInterestSchemaForAI.optional().describe("Details of the player's current location. Provided for easy access in the prompt."),
  aiConfig: AiConfigForAdventureInputSchema.optional(),
  timeManagement: TimeManagementSchemaForAI.optional().describe("Advanced time management settings for the story."),
  merchantInventory: z.array(SellingItemSchemaForAI).optional().describe("A list of items currently being sold by a local merchant. This is for context only; the AI should not invent new items."),
});

export type GenerateAdventureInput = Omit<z.infer<typeof GenerateAdventureInputSchema>, 'characters' | 'activeCombat' | 'playerSkills' | 'mapPointsOfInterest' | 'playerLocation' | 'aiConfig' | 'timeManagement' | 'merchantInventory'> & {
    characters: Character[];
    activeCombat?: z.infer<typeof ActiveCombatSchema>;
    playerSkills?: PlayerSkill[];
    mapPointsOfInterest?: MapPointOfInterest[];
    aiConfig?: AiConfig;
    timeManagement?: TimeManagementSettings;
    merchantInventory?: SellingItem[];
};

// Represents the output from the flow to the main application, including potential errors.
export type GenerateAdventureFlowOutput = z.infer<typeof GenerateAdventureOutputSchema> & { error?: string };


export const NewCharacterSchema = z.object({
    name: z.string().describe("The name of the newly introduced character."),
    details: z.string().optional().describe("A brief description of the new character derived from the narrative context, including their appearance, perceived role/class (e.g., 'Thug', 'Shopkeeper', 'Marchand'), and the location/circumstance of meeting if possible. MUST be in the specified language."),
    portraitUrl: z.string().nullable().optional().describe("URL to an image for the character's portrait, if one can be inferred or is relevant."),
    biographyNotes: z.string().optional().describe("Initial private notes or observations about the new character if any can be inferred. Keep this brief for new characters. MUST be in the specified language."),
    initialHistoryEntry: z.string().optional().describe("A brief initial history entry (in the specified language) about meeting the character, including location if identifiable (e.g., 'Rencontré {{playerName}} au marché noir de Neo-Kyoto.', 'A interpellé {{playerName}} dans les couloirs de Hight School of Future.'). MUST be in the specified language."),
    initialRelations: z.array(
        z.object({
            targetName: z.string().describe("Name of the known character or the player's name."),
            description: z.string().describe("String description of the new character's initial relationship *status* towards this target (e.g., 'Curieux', 'Indifférent', 'Ami potentiel', 'Rivale potentielle', 'Client', 'Employé'). MUST be in {{currentLanguage}}. If 'Inconnu' or similar is the only option due to lack of context, use it, but prefer a more descriptive status if possible. ALL relation descriptions MUST be in {{currentLanguage}}."),
        })
    ).optional().describe("An array of objects, where each object defines the new character's initial relationship status towards a known character or the player. Example: `[{\"targetName\": \"PLAYER_NAME_EXAMPLE\", \"description\": \"Curieux\"}, {\"targetName\": \"Rina\", \"description\": \"Indifférent\"}]`. If no specific interaction implies a relation for a target, use a descriptive status like 'Inconnu' (or its {{currentLanguage}} equivalent) ONLY if no other relation can be inferred. ALL relation descriptions MUST be in {{currentLanguage}}."),
    isHostile: z.boolean().optional().default(false).describe("Is this new character initially hostile to the player? Relevant if rpgModeActive is true."),
    hitPoints: z.number().optional().describe("Initial HP for the new character if introduced as a combatant in RPG mode."),
    maxHitPoints: z.number().optional().describe("Max HP, same as initial HP for new characters."),
    manaPoints: z.number().optional().describe("Initial MP for the new character if a spellcaster and introduced in RPG mode."),
    maxManaPoints: z.number().optional().describe("Max MP, same as initial MP for new spellcasters."),
    armorClass: z.number().optional().describe("AC for new combatant."),
    attackBonus: z.number().optional().describe("Attack bonus for new combatant."),
    damageBonus: z.string().optional().describe("Damage bonus (e.g. '+1', '1d6') for new combatant."),
    characterClass: z.string().optional().describe("Class if relevant (e.g. 'Bandit Thug', 'School Bully', 'Sorcerer Apprentice', 'Marchand d'armes')."),
    level: z.number().optional().describe("Level if relevant."),
    isAlly: z.boolean().optional().default(false).describe("Is this new character initially an ally of the player? This MUST be set to true if the character is purchased at a slave market."),
});
export type NewCharacterSchema = z.infer<typeof NewCharacterSchema>;

export const CharacterUpdateSchema = z.object({
    characterName: z.string().describe("The name of the known character involved."),
    historyEntry: z.string().describe("A concise summary (in the specified language) of a significant action or quote by this character in the current narrative segment. MUST be in the specified language. Include location context if relevant and known (e.g. 'Au marché: A proposé une affaire douteuse à {{playerName}}.', 'Dans le couloir: A semblé troublée par la question de {{playerName}}.' )."),
});
export type CharacterUpdateSchema = z.infer<typeof CharacterUpdateSchema>;


export const AffinityUpdateSchema = z.object({
    characterName: z.string().describe("The name of the known character whose affinity **towards the player** changed."),
    change: z.number().int().min(-10).max(10).describe("The integer change in affinity towards the player (+/-). Keep changes **very small and gradual** for typical interactions (e.g., +1 for a kind word, -1 or -2 for a minor disagreement/misstep, 0 for neutral). Reserve larger changes (+/- 3 to +/-5) for significant events. Extreme changes (+/- 6 to +/-10) for major betrayals/heroic acts. Affinity is 0 (hate) to 100 (love/devotion), 50 is neutral."),
    reason: z.string().optional().describe("Brief justification for the affinity change based on the interaction.")
});
export type AffinityUpdateSchema = z.infer<typeof AffinityUpdateSchema>;


export const RelationUpdateSchema = z.object({
    characterName: z.string().describe("The name of the character whose relation is updated (the source)."),
    targetName: z.string().describe("The name of the target character OR the player's name."),
    newRelation: z.string().describe("The new *status* of the relationship from the source's perspective (e.g., 'Ennemi juré', 'Ami proche', 'Ex-petite amie', 'Rivale', 'Amant secret', 'Confidente', 'Collègue'). Be specific and clear. If an existing relation was 'Inconnu' (or equivalent), provide a more specific relation status if the narrative now allows it. MUST be in the specified language."),
    reason: z.string().optional().describe("Brief justification for the relation change based on the narrative interaction or event.")
});
export type RelationUpdateSchema = z.infer<typeof RelationUpdateSchema>;

const CombatOutcomeSchema = z.object({
    combatantId: z.string().describe("ID of the combatant (character.id or 'player')."),
    newHp: z.number().describe("The combatant's HP after this turn's actions."),
    newMp: z.number().optional().describe("The combatant's MP after this turn's actions, if applicable."),
    isDefeated: z.boolean().default(false).describe("True if the combatant was defeated this turn (HP <= 0)."),
    newStatusEffects: z.array(StatusEffectSchema).optional().describe("Updated list of status effects for this combatant."),
});


export const CombatUpdatesSchema = z.object({
    updatedCombatants: z.array(CombatOutcomeSchema).describe("An array detailing the HP, MP, status, and defeat outcomes for every combatant involved in this turn. This field is MANDATORY if a combat turn occurred. It must reflect the state of combatants *after* this turn's actions."),
    expGained: z.number().int().optional().describe("Experience points gained by the player if any enemies were defeated. Award based on enemy difficulty/level (e.g., 5-20 for easy, 25-75 for medium, 100+ for hard/bosses). IF NO EXP GAINED, PROVIDE 0."),
    itemsObtained: z.array(LootedItemSchema).optional().describe("Items looted by the player if combat is won. **CRITICAL: The AI should provide a simple text list of item names in `lootItemsText` instead of filling this directly.**"),
    lootItemsText: z.string().optional().describe("A simple, comma-separated string of item names looted by the player if combat is won (e.g., 'Rusty Sword, 15 Gold, Health Potion'). This is preferred over the complex `itemsObtained` field for better AI compatibility."),
    currencyGained: z.number().int().optional().describe("Total amount of Gold Pieces looted by the player if combat is won. IF NO CURRENCY CHANGE, PROVIDE 0."),
    combatEnded: z.boolean().default(false).describe("True if the combat encounter has concluded (e.g., all enemies defeated/fled, or player/allies defeated/fled)."),
    turnNarration: z.string().describe("A detailed narration of the combat actions and outcomes for this turn. This is MANDATORY if combat took place. This will be part of the main narrative output as well."),
    nextActiveCombatState: ActiveCombatSchema.optional().describe("The state of combat to be used for the *next* turn, if combat is still ongoing. Ensure combatant IDs and teams are correct. If combatEnded is true, this can be omitted or isActive set to false."),
});
export type CombatUpdatesSchema = z.infer<typeof CombatUpdatesSchema>;


const PoiOwnershipChangeSchema = z.object({
    poiId: z.string().describe("The ID of the Point of Interest whose ownership is changing (e.g., 'poi-grotte')."),
    newOwnerId: z.string().describe("The ID of the new owner (e.g., 'player', 'frak-1')."),
});

const UpdatedTimeSchema = z.object({
    newEvent: z.string().optional().describe("An optional updated event description (e.g., 'Milieu du cours', 'Fin de la réunion'). The AI can suggest a new event description if the narrative context has changed significantly.")
});

export const GenerateAdventureOutputSchema = z.object({
  narrative: z.string().describe('The generated narrative continuation. If in combat, this includes the description of actions and outcomes for the current turn. **This field MUST contain ONLY plain text story. DO NOT include any JSON or structured data here. CRITICAL: DO NOT describe the items or gold obtained from combat loot in this narrative field. The game client will display the loot separately based on the structured data provided in other fields.**'),
  sceneDescriptionForImage: z
    .string()
    .optional()
    .describe('A concise visual description of the current scene, suitable for an image generation prompt. Describe characters using their physical appearance, not their names. Include key actions or mood if relevant.'),
  newCharacters: z
    .array(NewCharacterSchema)
    .optional()
    .describe('List of characters newly introduced in this narrative segment. All textual fields (details, history, relations) MUST be in the specified language. If rpgModeActive, include combat stats for new hostiles.'),
  characterUpdates: z
    .array(CharacterUpdateSchema)
    .optional()
    .describe('List of significant events or quotes involving known characters in this narrative segment, for logging in their history. MUST be in the specified language.'),
  affinityUpdates: z
    .array(AffinityUpdateSchema)
    .optional()
    .describe("List of affinity changes for known characters **towards the player** based on the user's action and the resulting narrative. Only if relationsModeActive."),
  relationUpdates: z
    .array(RelationUpdateSchema)
    .optional()
    .describe("List of relationship status changes between characters OR towards the player based on the narrative. Only if relationsModeActive."),
  combatUpdates: CombatUpdatesSchema.optional().describe("This field is deprecated for AI output. Combat results are now handled internally by the application. The AI should not populate this field."),
  itemsObtained: z.array(LootedItemSchema).optional().describe("Items obtained by the player this turn through NON-COMBAT means (e.g., finding, gifts). **If items are obtained from combat loot, they MUST be returned inside the `combatUpdates` object, not here.** IF NO ITEMS, PROVIDE EMPTY ARRAY []. When a player is visiting a merchant, DO NOT populate this field, as the game system handles purchases."),
  currencyGained: z.number().int().optional().describe("Total amount of Gold Pieces gained or LOST by the player this turn from NON-COMBAT means. Use a negative value for losses/expenses (e.g., -50 if player pays 50 Gold Pieces). **If currency is obtained from combat loot, it MUST be returned inside the `combatUpdates` object, not here.** IF NO CURRENCY CHANGE, PROVIDE 0."),
  poiOwnershipChanges: z.array(PoiOwnershipChangeSchema).optional().describe("This field is deprecated for AI output. POI ownership changes are now handled internally by the application. The AI should not populate this field."),
  newFamiliars: z.array(NewFamiliarSchema).optional().describe("List of new familiars the player has just acquired through capture or other special means. This should NOT be used for familiars bought from a menagerie (use itemsObtained for that)."),
  updatedTime: UpdatedTimeSchema.optional().describe("The updated time of day if time management is enabled."),
  lootItemsText: z.string().optional().describe("A simple, comma-separated string of item names looted by the player (e.g., 'Rusty Sword, 15 Gold, Health Potion'). This is preferred over the complex `itemsObtained` field for better AI compatibility."),
});
export type GenerateAdventureOutput = z.infer<typeof GenerateAdventureOutputSchema>;

// Types for Image Generation flows
export interface GenerateSceneImageInput {
  sceneDescription: string;
  style?: string;
}

export interface GenerateSceneImageFlowOutput {
  imageUrl: string;
  error?: string;
}

