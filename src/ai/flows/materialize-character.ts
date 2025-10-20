
'use server';
/**
 * @fileOverview Materializes a character mentioned in the narrative into a full Character object.
 * This is the main entry point which routes to different implementations based on AI config.
 */

import type { AiConfig } from '@/types';
import { materializeCharacterWithGenkit } from './materialize-character-genkit';
import { materializeCharacterWithOpenRouter } from './materialize-character-openrouter';
import { materializeCharacterWithLocalLlm } from './materialize-character-local';
import { z } from 'zod';
import { NewCharacterSchema } from '@/types';

// Main Input Schema, now with aiConfig
const MaterializeCharacterInputSchema = z.object({
  narrativeContext: z.string().describe("The surrounding text from the adventure where a character was mentioned. This provides context for the AI."),
  existingCharacters: z.array(z.string()).describe("A list of names of characters who are already known, to avoid re-creating them."),
  rpgMode: z.boolean().describe("Whether RPG mode is active, to determine if stats should be generated."),
  currentLanguage: z.string().describe("The language for the output."),
  aiConfig: z.custom<AiConfig>().optional(), // Add aiConfig
});

export type MaterializeCharacterInput = z.infer<typeof MaterializeCharacterInputSchema>;
export type MaterializeCharacterOutput = z.infer<typeof NewCharacterSchema>;

// Main exported function that acts as a router
export async function materializeCharacter(input: MaterializeCharacterInput): Promise<MaterializeCharacterOutput> {
    const { aiConfig } = input;

    if (aiConfig?.llm.source === 'openrouter') {
        return materializeCharacterWithOpenRouter(input);
    }
    
    if (aiConfig?.llm.source === 'local') {
        return materializeCharacterWithLocalLlm(input);
    }
    
    // Default to Genkit/Gemini
    return materializeCharacterWithGenkit(input);
}
