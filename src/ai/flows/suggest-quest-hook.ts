'use server';
/**
 * @fileOverview Suggests a quest hook or objective based on the current adventure context.
 *
 * - suggestQuestHook - A function that suggests a quest hook.
 * - SuggestQuestHookInput - The input type for the suggestQuestHook function.
 * - SuggestQuestHookOutput - The return type for the suggestQuestHook function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const SuggestQuestHookInputSchema = z.object({
  worldDescription: z.string().describe('A detailed description of the game world.'),
  currentSituation: z.string().describe('A summary of the recent events or the current narrative state of the adventure.'),
  involvedCharacters: z.string().describe('A comma-separated list of names of characters currently involved or relevant to the situation.'),
  language: z.string().describe('The target language for the quest hook and justification (e.g., "fr", "en").'),
});
export type SuggestQuestHookInput = z.infer<typeof SuggestQuestHookInputSchema>;

const SuggestQuestHookOutputSchema = z.object({
  questHook: z.string().describe('A short (1-3 sentences) quest hook or objective suggestion, in the specified language.'),
  justification: z.string().describe('A brief explanation of why this quest hook is relevant to the current context, in the specified language.'),
});
export type SuggestQuestHookOutput = z.infer<typeof SuggestQuestHookOutputSchema>;

export async function suggestQuestHook(input: SuggestQuestHookInput): Promise<SuggestQuestHookOutput> {
  return suggestQuestHookFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestQuestHookPrompt',
  input: {schema: SuggestQuestHookInputSchema},
  output: {schema: SuggestQuestHookOutputSchema},
  prompt: `You are a creative assistant for a text-based adventure game.
Based on the provided world description, current situation, and involved characters, suggest a concise and engaging quest hook or objective for the player.
The quest hook should be 1-3 sentences long.
Also provide a brief justification for why this suggestion is relevant to the current context.
All output (questHook and justification) MUST be in the following language: {{language}}.

World Description:
{{{worldDescription}}}

Current Situation:
{{{currentSituation}}}

Involved Characters:
{{{involvedCharacters}}}

Generate a quest hook and its justification in {{language}}.`,
});

const suggestQuestHookFlow = ai.defineFlow(
  {
    name: 'suggestQuestHookFlow',
    inputSchema: SuggestQuestHookInputSchema,
    outputSchema: SuggestQuestHookOutputSchema,
  },
  async (input) => {
    try {
        const {output} = await prompt(input);
        if (!output?.questHook || !output?.justification) {
          throw new Error("AI failed to generate a quest hook or justification.");
        }
        return output;
    } catch (e: any) {
        console.error("Error in suggestQuestHook flow:", e);
        const errorMessage = e.message || String(e);
        if (errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
             throw new Error("Le modèle d'IA est actuellement surchargé. Veuillez réessayer.");
        }
        throw new Error(`Erreur lors de la suggestion de quête : ${errorMessage}`);
    }
  }
);
