
/**
 * @fileOverview Schemas and types for the creative assistant AI flow.
 * This file does not contain server-side logic and can be imported by client/server components.
 */

import { z } from 'genkit';
import type { AiConfig } from '@/types';

// Schemas are defined here and can be shared across different flow implementations
const SuggestionSchema = z.object({
  field: z.enum([
      'world', 
      'initialSituation', 
      'characterName', 
      'characterDetails',
      'rpgMode',
      'relationsMode',
      'strategyMode',
      'comicModeActive'
    ]).describe("The target form field for the suggestion."),
  value: z.union([z.string(), z.boolean()]).describe("The suggested content for that field (string or boolean)."),
});

const HistoryMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export const CreativeAssistantInputSchema = z.object({
  userRequest: z.string().describe("The user's latest request for creative help."),
  history: z.array(HistoryMessageSchema).optional().describe("The conversation history between the user and the assistant."),
  aiConfig: z.custom<AiConfig>().optional(),
});

export const CreativeAssistantOutputSchema = z.object({
  response: z.string().describe("The assistant's helpful and creative response to the user's request."),
  suggestions: z.array(SuggestionSchema).optional().describe("Specific, actionable suggestions that can be directly applied to form fields."),
});

export type CreativeAssistantInput = z.infer<typeof CreativeAssistantInputSchema>;
export type CreativeAssistantOutput = z.infer<typeof CreativeAssistantOutputSchema> & { error?: string };
