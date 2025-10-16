

// src/types/index.ts
import { z } from 'genkit';

// NEW: Type for localized text fields
export type LocalizedText = { [key: string]: string };

// RPG & Strategy types are removed.

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
  loot?: PlayerInventoryItem[]; // Kept for potential simple item findings, but logic is removed
  lootTaken?: boolean;
  speakingCharacterNames?: string[];
}

export interface MapPointOfInterest {
  id: string;
  name: string;
  level: number;
  description: string;
  icon: 'Castle' | 'Mountain' | 'Trees' | 'Village' | 'Shield' | 'Landmark';
  position?: { x: number; y: number };
  ownerId?: string;
  buildings?: string[];
}

export interface Character {
  id: string;
  name: string;
  details: string;
  isPlaceholder?: boolean;
  roleInStory?: string;
  biographyNotes?: string;
  appearanceDescription?: string;
  lastAppearanceUpdate?: number;
  history?: string[];
  memory?: string;
  opinion?: Record<string, string>;
  portraitUrl?: string | null;
  faceSwapEnabled?: boolean;
  affinity?: number;
  relations?: Record<string, string>;
  isAlly?: boolean;
  factionColor?: string;
  locationId?: string | null;
  _lastSaved?: number;
  race?: string;
}

// Simplified for non-RPG use
export interface PlayerInventoryItem {
  id: string;
  name: string;
  quantity: number;
  description?: string;
  type: 'quest' | 'misc';
  goldValue?: number;
  generatedImageUrl?: string | null;
}

export interface PlayerSkill {
  id: string;
  name: string;
  description: string;
  category?: 'social' | 'utility';
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
    currentTime: string;
    timeFormat: '24h' | '12h';
    currentEvent: string;
    timeElapsedPerTurn: string;
}

export interface AdventureSettings {
  world: LocalizedText;
  initialSituation: LocalizedText;
  rpgMode: boolean; // Kept for schema compatibility, but will be forced to false
  relationsMode: boolean;
  strategyMode: boolean; // Kept for schema compatibility, but will be forced to false
  comicModeActive: boolean;
  playerName?: string;
  playerPortraitUrl?: string | null;
  playerDetails?: string;
  playerDescription?: string;
  playerOrientation?: string;
  playerFaceSwapEnabled?: boolean;
  playerClass?: string;
  playerLevel?: number;
  mapPointsOfInterest?: MapPointOfInterest[];
  mapImageUrl?: string | null;
  playerLocationId?: string;
  timeManagement?: TimeManagementSettings;
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
  characterId?: string;
  fontSize?: number;
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
    saveFormatVersion: number; // Increment this on schema changes
    timestamp: string;
    aiConfig?: AiConfig;
}

// ZOD SCHEMAS FOR GENKIT FLOW (Simplified)

const BaseCharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  details: z.string(),
  biographyNotes: z.string().optional().describe("Detailed biography or private notes about the character."),
  affinity: z.number().optional().default(50).describe("Affinity score (0-100) indicating the character's feeling towards the player."),
  relations: z.record(z.string(), z.string()).optional().describe("Relationship status towards other characters/player."),
  isAlly: z.boolean().optional().default(false),
  locationId: z.string().optional(),
  faceSwapEnabled: z.boolean().optional(),
  portraitUrl: z.string().nullable().optional(),
}).passthrough();

const ContextSummarySchema = z.object({
    historySummary: z.string().optional().describe('A brief summary of the last few history entries.'),
    relationsSummary: z.string().optional().describe('A pre-processed summary of the character\'s relationship statuses.'),
});

export const CharacterWithContextSummarySchema = z.intersection(
    BaseCharacterSchema,
    ContextSummarySchema
);

const PointOfInterestSchemaForAI = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    level: z.number().optional().default(1),
    ownerId: z.string().optional(),
    ownerName: z.string().optional(),
    buildings: z.array(z.string()).optional(),
});

const AiConfigForAdventureInputSchema = z.object({
    llm: z.object({ source: z.enum(['gemini', 'openrouter', 'local']) }).passthrough(),
    image: z.object({ source: z.enum(['gemini', 'openrouter', 'huggingface', 'local-sd']) }).passthrough(),
}).passthrough();

const TimeManagementSchemaForAI = z.object({
    enabled: z.boolean(),
    day: z.number(),
    dayName: z.string(),
    currentTime: z.string(),
    currentEvent: z.string().optional(),
    timeElapsedPerTurn: z.string(),
});

export const GenerateAdventureInputSchema = z.object({
  world: z.string(),
  initialSituation: z.string(),
  characters: z.array(CharacterWithContextSummarySchema),
  userAction: z.string(),
  currentLanguage: z.string(),
  playerName: z.string(),
  relationsModeActive: z.boolean().optional().default(true),
  rpgModeActive: z.boolean().optional().default(false), // Forced to false
  comicModeActive: z.boolean().optional().default(false),
  playerFaceSwapEnabled: z.boolean().optional(),
  playerPortraitUrl: z.string().nullable().optional(),
  aiConfig: AiConfigForAdventureInputSchema.optional(),
  timeManagement: TimeManagementSchemaForAI.optional(),
});

// Simplified for relationship-only version
export type GenerateAdventureInput = Omit<z.infer<typeof GenerateAdventureInputSchema>, 'characters' | 'aiConfig' | 'timeManagement' | 'world' | 'initialSituation'> & {
    characters: Character[];
    aiConfig?: AiConfig;
    timeManagement?: TimeManagementSettings;
    world: string;
    initialSituation: string;
};

export const NewCharacterSchema = z.object({
    name: z.string().describe("The name of the newly introduced character."),
    details: z.string().optional().describe("A brief description of the new character derived from the narrative context."),
    portraitUrl: z.string().nullable().optional(),
    biographyNotes: z.string().optional(),
    initialHistoryEntry: z.string().optional(),
    initialRelations: z.array(z.object({
        targetName: z.string(),
        description: z.string(),
    })).optional(),
});
export type NewCharacterSchema = z.infer<typeof NewCharacterSchema>;

export const CharacterUpdateSchema = z.object({
    characterName: z.string(),
    historyEntry: z.string(),
});
export type CharacterUpdateSchema = z.infer<typeof CharacterUpdateSchema>;

export const AffinityUpdateSchema = z.object({
    characterName: z.string(),
    change: z.number().int().min(-10).max(10),
    reason: z.string().optional()
});
export type AffinityUpdateSchema = z.infer<typeof AffinityUpdateSchema>;

export const RelationUpdateSchema = z.object({
    characterName: z.string(),
    targetName: z.string(),
    newRelation: z.string(),
    reason: z.string().optional()
});
export type RelationUpdateSchema = z.infer<typeof RelationUpdateSchema>;

const UpdatedTimeSchema = z.object({
    newEvent: z.string().optional(),
});

export const GenerateAdventureOutputSchema = z.object({
  narrative: z.string(),
  speakingCharacterNames: z.array(z.string()).optional(),
  sceneDescriptionForImage: z.string().optional(),
  affinityUpdates: z.array(AffinityUpdateSchema).optional(),
  relationUpdates: z.array(RelationUpdateSchema).optional(),
  updatedTime: UpdatedTimeSchema.optional(),
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