
'use server';
/**
 * @fileOverview This file acts as a router for the memorize event AI flow.
 * It determines which underlying implementation to use based on the provided AI configuration.
 */

import { z } from 'zod';
import type { AiConfig } from '@/types';
import { memorizeEventWithGenkit } from './summarize-history-genkit';
import { memorizeEventWithOpenRouter } from './summarize-history-openrouter';
import { memorizeEventWithLocalLlm } from './summarize-history-local';

// Input Schema for the flow
export const MemorizeEventInputSchema = z.object({
  narrativeContext: z.string().describe("The surrounding text from the adventure where an event occurred."),
  involvedCharacters: z.array(z.string()).describe("A list of names of characters involved in the event."),
  currentLanguage: z.string().describe("The language for the output summary."),
  aiConfig: z.custom<AiConfig>().optional(),
});
export type MemorizeEventInput = z.infer<typeof MemorizeEventInputSchema>;

// The output is a single summary string
export const MemorizeEventOutputSchema = z.object({
    memory: z.string().describe("A concise summary of the key event, decision, or quote from the context. This should be a single, self-contained sentence or two. MUST be in the specified language."),
    involvedCharacterNames: z.array(z.string()).describe("The names of the characters who are primarily involved in this memory.")
});
export type MemorizeEventOutput = z.infer<typeof MemorizeEventOutputSchema>;


// The main flow function that acts as a router
export async function memorizeEvent(input: MemorizeEventInput): Promise<MemorizeEventOutput> {
    const { aiConfig } = input;

    if (aiConfig?.llm.source === 'openrouter') {
        return memorizeEventWithOpenRouter(input);
    }
    
    if (aiConfig?.llm.source === 'local') {
        return memorizeEventWithLocalLlm(input);
    }
    
    // Default to Genkit/Gemini
    return memorizeEventWithGenkit(input);
}
