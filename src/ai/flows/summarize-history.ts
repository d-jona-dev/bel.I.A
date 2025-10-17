
'use server';
/**
 * @fileOverview Summarizes a key event from a narrative context into a single memory entry.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

// Input Schema for the flow
const MemorizeEventInputSchema = z.object({
  narrativeContext: z.string().describe("The surrounding text from the adventure where an event occurred. This provides context for the AI."),
  involvedCharacters: z.array(z.string()).describe("A list of names of characters involved in the event."),
  currentLanguage: z.string().describe("The language for the output summary."),
});
export type MemorizeEventInput = z.infer<typeof MemorizeEventInputSchema>;

// The output is a single summary string
const MemorizeEventOutputSchema = z.object({
    memory: z.string().describe("A concise summary of the key event, decision, or quote from the context. This should be a single, self-contained sentence or two. MUST be in the specified language."),
    involvedCharacterNames: z.array(z.string()).describe("The names of the characters who are primarily involved in this memory.")
});
export type MemorizeEventOutput = z.infer<typeof MemorizeEventOutputSchema>;


// The prompt definition
const memorizeEventPrompt = ai.definePrompt({
    name: 'memorizeEventPrompt',
    input: { schema: MemorizeEventInputSchema },
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
    "memory": "Kentaro a défendu Rina lorsque le joueur l'a confrontée à propos de leur proximité.",
    "involvedCharacterNames": ["Kentaro", "Rina"]
}`,
});


// The main flow function
export const memorizeEvent = ai.defineFlow(
  {
    name: 'memorizeEvent',
    inputSchema: MemorizeEventInputSchema,
    outputSchema: MemorizeEventOutputSchema,
  },
  async (input): Promise<MemorizeEventOutput> => {
    try {
      const { output } = await memorizeEventPrompt(input);

      if (!output?.memory) {
         throw new Error(`L'IA n'a pas réussi à résumer l'événement.`);
      }

      return output;
      
    } catch (e: any) {
      console.error("Error in memorizeEvent flow:", e);
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
);
