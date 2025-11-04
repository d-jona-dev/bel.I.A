/**
 * @fileOverview Schemas and types for the summarize history (memorize event) AI flow.
 * This file does not contain server-side logic and can be imported by client/server components.
 */

import { z } from 'zod';
import type { AiConfig } from '@/types';

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
