
// src/types/index.ts
import { z } from 'genkit';

export type LocalizedText = { [key: string]: string };

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
  sceneDescriptionForImage?: SceneDescriptionForImage; // Changed to new type
  imageUrl?: string | null;
  imageTransform?: ImageTransform;
  speakingCharacterNames?: string[];
}

export type CreatorLinkPlatform = 'youtube' | 'x' | 'patreon' | 'facebook' | 'ko-fi' | 'tipeee' | 'instagram' | 'threads' | 'tiktok' | 'bsky' | 'linkedin' | 'reddit' | 'pinterest' | 'mastodon' | 'buymeacoffee' | 'liberapay' | 'itch' | 'substack';
export interface CreatorLink {
  id: string;
  platform: CreatorLinkPlatform;
  identifier: string;
}

export interface ClothingItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
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
  memory?: string;
  portraitUrl?: string | null;
  affinity?: number;
  relations?: Record<string, string>;
  isAlly?: boolean;
  factionColor?: string;
  locationId?: string | null;
  _lastSaved?: number;
  faceSwapEnabled?: boolean;
  clothingItemIds?: string[];
  clothingDescription?: string;
  
  // Champs RPG conservés pour la structure mais non utilisés activement
  characterClass?: string;
  level?: number;
}

export interface PlayerAvatar {
  id: string;
  name: string;
  portraitUrl: string | null;
  details: string;
  description: string;
  orientation: string;
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

export interface AdventureCondition {
  id: string;
  targetCharacterId: string;
  triggerType: 'relation' | 'day' | 'end';
  triggerOperator: 'greater_than' | 'less_than' | 'between';
  triggerValue: number;
  triggerValueMax?: number;
  effect: string;
  hasTriggered: boolean;
  isOneTime: boolean;
}

export interface NarrativeStyleSettings {
  dialogueStartSymbol: string;
  dialogueEndSymbol: string;
  thoughtStartSymbol: string;
  thoughtEndSymbol: string;
}


export interface AdventureSettings {
  world: LocalizedText;
  initialSituation: LocalizedText;
  rpgMode: boolean;
  relationsMode: boolean;
  strategyMode: boolean;
  comicModeActive: boolean;
  narrativeStyle?: NarrativeStyleSettings;
  playerName?: string;
  playerPortraitUrl?: string | null;
  playerDetails?: string;
  playerDescription?: string;
  playerOrientation?: string;
  playerClass?: string;
  playerLevel?: number;
  playerLocationId?: string;
  playerFaceSwapEnabled?: boolean;
  systemPrompt?: string;
  timeManagement?: TimeManagementSettings;
  mapPointsOfInterest?: MapPointOfInterest[]; // Gardé pour la structure, non utilisé
  conditions?: AdventureCondition[];
  creatorLinks?: CreatorLink[];
}

export interface MapPointOfInterest {
    id: string;
    name: string;
    description?: string;
    icon: 'Castle' | 'Mountain' | 'Trees' | 'Village' | 'Shield' | 'Landmark';
    position?: { x: number, y: number };
    ownerId?: string;
    level?: number;
    buildings?: string[];
    resources?: GeneratedResource[];
    lastCollected?: number;
}

export interface GeneratedResource {
    type: 'currency' | 'item';
    name: string;
    quantity: number;
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
    modelName?: string;
    apiKey?: string;
    apiUrl?: string;
}


export interface AiConfig {
    llm: {
        source: 'gemini' | 'openrouter' | 'local' | 'custom-local';
        gemini?: {
            apiKey?: string;
        },
        openRouter?: {
            model: string;
            apiKey: string;
            enforceStructuredResponse: boolean;
            compatibilityMode?: boolean; 
            maxTokens?: number;
        };
        local?: {
            model: string;
            compatibilityMode?: boolean;
        };
        customLocal?: {
            apiUrl: string;
            model?: string;
            apiKey?: string;
            compatibilityMode?: boolean;
            maxTokens?: number;
        };
    },
    image: {
        source: 'gemini' | 'openrouter' | 'huggingface' | 'local-sd';
        gemini?: {
            apiKey?: string;
        },
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
  text: string;
  style: string;
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
    saveFormatVersion: number;
    timestamp: string;
    aiConfig?: AiConfig;
}

export interface SceneDescriptionForImage {
    action: string;
    cameraAngle?: string;
    charactersInScene: Array<{
        name: string;
        appearanceDescription?: string;
        clothingDescription?: string;
    }>;
}


// ZOD SCHEMAS FOR GENKIT FLOW
const CharacterWithContextSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  details: z.string(),
  biographyNotes: z.string().optional().describe("Detailed biography or private notes about the character."),
  appearanceDescription: z.string().optional().describe("A detailed physical description of the character, to be used for image generation."),
  affinity: z.number().optional().default(50).describe("Affinity score (0-100) indicating the character's feeling towards the player."),
  relations: z.record(z.string(), z.string()).optional().describe("Relationship status towards other characters/player."),
  relationsSummary: z.string().optional().describe('A pre-processed summary of the character\'s relationship statuses.'),
  portraitUrl: z.string().nullable().optional(),
});


export const GenerateAdventureInputSchema = z.object({
  world: z.string(),
  initialSituation: z.string(),
  characters: z.array(CharacterWithContextSummarySchema),
  userAction: z.string(),
  currentLanguage: z.string(),
  playerName: z.string(),
  systemPrompt: z.string().optional().describe("A custom system prompt to guide the AI narrator's persona and style."),
  relationsModeActive: z.boolean().optional().default(true),
  comicModeActive: z.boolean().optional().default(true),
  narrativeStyle: z.custom<NarrativeStyleSettings>().optional(),
  playerPortraitUrl: z.string().nullable().optional(),
  playerDetails: z.string().optional(),
  playerDescription: z.string().optional(),
  playerOrientation: z.string().optional(),
  aiConfig: z.any().optional(),
  timeManagement: z.any().optional(),
  activeConditions: z.array(z.string()).optional().describe("A list of active condition effects to apply to the narrative."),
});

export type GenerateAdventureInput = z.infer<typeof GenerateAdventureInputSchema> & {
    characters: Character[];
};

export const NewCharacterSchema = z.object({
    name: z.string().describe("The name of the newly introduced character."),
    details: z.string().optional().describe("A brief description of the new character derived from the narrative context."),
    biographyNotes: z.string().optional(),
});
export type NewCharacterSchema = z.infer<typeof NewCharacterSchema>;

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

export const SceneDescriptionForImageSchema = z.object({
    action: z.string().describe("Minimalist description (in ENGLISH) of the scene: who is doing what, where. Example: 'Rina and Kentaro are arguing in a classroom.'"),
    cameraAngle: z.string().optional().describe("A dynamic camera angle in English. Examples: 'dynamic low-angle shot', 'aerial view', 'first-person perspective', 'cinematic wide shot', 'over-the-shoulder shot'. Be creative."),
});

export const GenerateAdventureOutputSchema = z.object({
  narrative: z.string(),
  sceneDescriptionForImage: SceneDescriptionForImageSchema.optional(),
  affinityUpdates: z.array(AffinityUpdateSchema).optional(),
  relationUpdates: z.array(RelationUpdateSchema).optional(),
  newEvent: z.string().optional().describe("If the narrative implies a change of event (e.g., class ends), describe the new event. Otherwise, leave empty."),
});

export type GenerateAdventureOutput = z.infer<typeof GenerateAdventureOutputSchema>;

export interface GenerateSceneImageInput {
  sceneDescription?: SceneDescriptionForImage | string;
  style?: string;
}

export interface GenerateSceneImageFlowOutput {
  imageUrl: string;
  error?: string;
}
