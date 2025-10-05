"use server";
/**
 * @fileOverview Gemini-specific implementation for the creative assistant AI flow.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import type { AiConfig } from '@/types';
import { 
    CreativeAssistantInputSchema, 
    CreativeAssistantOutputSchema, 
    type CreativeAssistantInput, 
    type CreativeAssistantOutput 
} from './creative-assistant-schemas';


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
        // Since the prompt input only expects userRequest, we create a sub-object.
        // History is passed in the second argument.
        const { output } = await creativeAssistantPrompt(
            { userRequest: input.userRequest },
            { history: historyForAI } 
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
