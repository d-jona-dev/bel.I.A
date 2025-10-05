
"use server";
/**
 * @fileOverview Gemini-specific implementation for the creative assistant AI flow.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
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
    - You can also suggest toggling game modes (rpgMode, relationsMode, strategyMode, comicModeActive) by setting their boolean value in a suggestion if it makes sense for the user's request (e.g., user asks for a more complex story -> suggest activating relationsMode).
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
            { history: historyForAI } 
        );
        
        if (!output) {
            return { error: "AI response was empty.", response: "" };
        }
        
        // FIX: Handle cases where the model returns an array of suggestions directly
        if (Array.isArray(output)) {
            const suggestions = CreativeAssistantOutputSchema.shape.suggestions.parse(output);
            return {
                response: "Voici quelques suggestions :",
                suggestions: suggestions,
                error: undefined,
            }
        }


        return { ...output, error: undefined };
    } catch (e: any) {
        console.error("Error in creativeAssistantWithGemini flow:", e);
        const errorMessage = e.message || String(e);
        return { error: `An unexpected error occurred with Gemini: ${errorMessage}`, response: "" };
    }
}
