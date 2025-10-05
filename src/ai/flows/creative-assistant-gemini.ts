"use server";
/**
 * @fileOverview Gemini-specific implementation for the creative assistant AI flow.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import type { AiConfig } from '@/types';

// Schemas are defined here but can be shared across different flow implementations
const SuggestionSchema = z.object({
  field: z.enum(['world', 'initialSituation', 'characterName', 'characterDetails']).describe("The target form field for the suggestion."),
  value: z.string().describe("The suggested text content for that field."),
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

const creativeAssistantPrompt = ai.definePrompt({
    name: 'creativeAssistantPrompt',
    system: `You are a creative assistant for a text-based adventure game creator. Your goal is to help the user brainstorm ideas for their world, story, and characters.
    - Be concise, creative, and inspiring.
    - When you provide a concrete idea for the world, initial situation, or a character, formalize it as a 'suggestion' in the output.
    - You can provide multiple suggestions in one response.
    - For character suggestions, provide one for 'characterName' and another for 'characterDetails'.
    - Respond in the same language as the user's request.`,
    input: {
        schema: z.object({
            userRequest: CreativeAssistantInputSchema.shape.userRequest,
        })
    },
    output: {
        schema: CreativeAssistantOutputSchema,
    },
    prompt: `{{userRequest}}`
});

export async function creativeAssistantWithGemini(input: CreativeAssistantInput): Promise<CreativeAssistantOutput> {
    const historyForAI = (input.history || []).map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
    }));

    try {
        const { output } = await creativeAssistantPrompt(
            { userRequest: input.userRequest },
            { history: historyForAI.slice(0, -1) } // Pass history excluding the last message
        );
        
        if (!output) {
            return { error: "AI response was empty.", response: "" };
        }

        return { ...output, error: undefined };
    } catch (e: any) {
        console.error("Error in creativeAssistantWithGemini flow:", e);
        const errorMessage = e.message || String(e);
        return { error: `An unexpected error occurred with Gemini: ${errorMessage}`, response: "" };
    }
}
