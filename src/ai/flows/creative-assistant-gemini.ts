
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
    The game focuses ONLY on relationship mode. Do not suggest RPG or strategy elements.
    
    - Be concise, creative, and inspiring.
    - When you provide a concrete idea for the world, initial situation, or a character, formalize it as a 'suggestion' in the output.
    - For 'world' and 'initialSituation', the 'value' MUST be a JSON object with language codes as keys (e.g., { "fr": "Un monde de...", "en": "A world of..." }). Start with the user's language.
    - You can suggest toggling game modes like 'comicModeActive' or 'timeManagement.enabled' by setting their boolean value in a suggestion if it makes sense for the user's request.
    - You can provide multiple suggestions in one response.
    - For a fully fleshed out character, provide two suggestions: one for 'characterName' and another for 'characterDetails'. These values should be strings.
    - To suggest a character ROLE or PLACEHOLDER (e.g., 'The rival', 'The wise mentor'), provide a suggestion for the 'characterPlaceholder' field. The value should be a string representing the role's name.
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
        
        let parsedOutput = output;

        if (!parsedOutput) {
            return { error: "AI response was empty.", response: "" };
        }
        
        // Handle cases where the model returns an array of suggestions directly
        if (Array.isArray(parsedOutput)) {
            parsedOutput = {
                response: "Voici quelques suggestions :",
                suggestions: parsedOutput,
            };
        }

        // Ensure response field exists if suggestions are present
        if (!parsedOutput.response && parsedOutput.suggestions && parsedOutput.suggestions.length > 0) {
            parsedOutput.response = "Voici quelques suggestions basées sur votre demande :";
        }


        const validationResult = CreativeAssistantOutputSchema.safeParse(parsedOutput);

        if (!validationResult.success) {
            console.error("Zod validation failed (Gemini):", validationResult.error.errors);
            return {
                response: (parsedOutput as any).response || "L'IA a retourné une réponse malformée.",
                suggestions: (parsedOutput as any).suggestions || [],
                error: `Zod validation failed: ${validationResult.error.message}`
            };
        }

        return { ...validationResult.data, error: undefined };

    } catch (e: any) {
        console.error("Error in creativeAssistantWithGemini flow:", e);
        const errorMessage = e.message || String(e);
        return { error: `An unexpected error occurred with Gemini: ${errorMessage}`, response: "" };
    }
}
