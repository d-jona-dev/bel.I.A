
'use server';
/**
 * @fileOverview Summarizes key events from a narrative context for a character's history.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import type { CharacterUpdateSchema } from '@/types';

// Input Schema for the flow
const SummarizeHistoryInputSchema = z.object({
  narrativeContext: z.string().describe("The surrounding text from the adventure where an event occurred. This provides context for the AI."),
  involvedCharacters: z.array(z.string()).describe("A list of names of characters involved in the event."),
  currentLanguage: z.string().describe("The language for the output summary."),
});
export type SummarizeHistoryInput = z.infer<typeof SummarizeHistoryInputSchema>;

// The output is an array of history entries
const SummarizeHistoryOutputSchema = z.array(
    z.object({
        characterName: z.string().describe("The name of the character whose history is being updated."),
        historyEntry: z.string().describe("The summarized event or quote to be added to the character's history log. MUST be in the specified language."),
    })
);

export type SummarizeHistoryOutput = z.infer<typeof SummarizeHistoryOutputSchema>;


// The prompt definition
const summarizeHistoryPrompt = ai.definePrompt({
    name: 'summarizeHistoryPrompt',
    input: { schema: SummarizeHistoryInputSchema },
    output: { schema: SummarizeHistoryOutputSchema },
    prompt: `You are a meticulous archivist for a text-based adventure game.
Your task is to read the provided narrative context and identify the most significant actions or quotes for each of the involved characters.
Create a concise summary for each character to be added to their personal history log.

- Focus on actions, decisions, or impactful dialogue.
- The summary should be short and to the point.
- Each summary MUST be in the language '{{currentLanguage}}'.
- If a character is mentioned but has no significant action, do not create an entry for them.

Characters involved: {{#each involvedCharacters}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}.

Here is the narrative context to analyze:
"{{{narrativeContext}}}"

CRITICAL: Provide ONLY a JSON array of history entries. Do not add any extra text or explanations.
Example output:
[
    { "characterName": "Rina", "historyEntry": "A semblé troublée par la question du joueur." },
    { "characterName": "Kentaro", "historyEntry": "A défendu Rina et a changé de sujet." }
]`,
});


// The main flow function
export const summarizeHistory = ai.defineFlow(
  {
    name: 'summarizeHistory',
    inputSchema: SummarizeHistoryInputSchema,
    outputSchema: SummarizeHistoryOutputSchema,
  },
  async (input): Promise<SummarizeHistoryOutput> => {
    try {
      const { output } = await summarizeHistoryPrompt(input);

      if (!output) {
         throw new Error(`L'IA n'a pas réussi à résumer l'événement.`);
      }

      return output;
      
    } catch (e: any) {
      console.error("Error in summarizeHistory flow:", e);
      const errorMessage = e.message || String(e);
       if (errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota")) {
             throw new Error("Le quota de l'API a été dépassé. Veuillez réessayer plus tard.");
        }
        if (errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
             throw new Error("Le modèle d'IA est actuellement surchargé. Veuillez réessayer.");
        }
      // Re-throw the error to be caught by the calling function in page.tsx
      throw new Error(`Erreur lors de la mémorisation de l'historique : ${errorMessage}`);
    }
  }
);

    