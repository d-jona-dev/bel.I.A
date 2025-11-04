
'use server';
/**
 * @fileOverview Gemini/Genkit implementation for summarizing a key event.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import type { MemorizeEventInput, MemorizeEventOutput } from './summarize-history-schemas';
import { MemorizeEventOutputSchema } from './summarize-history-schemas';

// The prompt definition, now specific to Genkit
const memorizeEventPrompt = ai.definePrompt({
    name: 'memorizeEventPrompt',
    input: { schema: z.custom<MemorizeEventInput>() },
    output: { schema: MemorizeEventOutputSchema },
    prompt: `You are a meticulous archivist for a text-based adventure game.
Your task is to read the provided narrative context and create ONE single, concise summary of the most significant event.
This summary will be added to the memory of the involved characters.

- Focus on the core action, decision, or impactful dialogue.
- The summary should be short (1-2 sentences) and written in the third person.
- The summary MUST be in the language '{{currentLanguage}}'.
- Identify who was primarily involved and list their names in 'involvedCharacterNames'.

Characters available: {{#each involvedCharacters}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}.

Here is the narrative context to analyze:
"{{{narrativeContext}}}"

CRITICAL: Provide ONLY the JSON object for the summarized event. Do not add any extra text or explanations.
Example output:
{
    "memory": "Le guerrier a défendu l'espionne lorsque le joueur l'a confrontée à propos de leur proximité.",
    "involvedCharacterNames": ["Le guerrier", "L'espionne"]
}`,
});


// The main flow function for Genkit
export async function memorizeEventWithGenkit(input: MemorizeEventInput): Promise<MemorizeEventOutput> {
    try {
      const { output } = await memorizeEventPrompt(input);

      if (!output?.memory) {
         throw new Error(`L'IA n'a pas réussi à résumer l'événement.`);
      }

      return output;
      
    } catch (e: any) {
      console.error("Error in memorizeEventWithGenkit flow:", e);
      const errorMessage = e.message || String(e);
       if (errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota")) {
             throw new Error("Le quota de l'API a été dépassé. Veuillez réessayer plus tard.");
        }
        if (errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
             throw new Error("Le modèle d'IA est actuellement surchargé. Veuillez réessayer.");
        }
      throw new Error(`Erreur lors de la mémorisation de l'événement : ${errorMessage}`);
    }
}
