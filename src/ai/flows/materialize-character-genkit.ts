
'use server';
/**
 * @fileOverview Materializes a character mentioned in the narrative into a full Character object.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'zod';
import type { Character } from '@/types';
import { NewCharacterSchema } from '@/types';

// Input Schema for the flow
const MaterializeCharacterInputSchema = z.object({
  narrativeContext: z.string().describe("The surrounding text from the adventure where a character was mentioned. This provides context for the AI."),
  existingCharacters: z.array(z.string()).describe("A list of names of characters who are already known, to avoid re-creating them."),
  rpgMode: z.boolean().describe("Whether RPG mode is active, to determine if stats should be generated."),
  currentLanguage: z.string().describe("The language for the output."),
});
export type MaterializeCharacterInput = z.infer<typeof MaterializeCharacterInputSchema>;

// The output is a single character object
const MaterializeCharacterOutputSchema = NewCharacterSchema;
export type MaterializeCharacterOutput = z.infer<typeof MaterializeCharacterOutputSchema>;

// The prompt definition
const materializeCharacterPrompt = ai.definePrompt({
    name: 'materializeCharacterPrompt',
    input: { schema: MaterializeCharacterInputSchema },
    output: { schema: MaterializeCharacterOutputSchema },
    prompt: `You are a character creation assistant for a text-based adventure game.
Your task is to identify a NEW character mentioned in the narrative context and create a full character sheet for them.

CRITICAL RULE:
- Do NOT create characters from abstract concepts, inanimate objects, or natural elements (e.g., "the wind", "the sun", "a door", "a table"). Only create living beings who are actual characters.
- Do not create any character from this list of already existing characters: {{#each existingCharacters}}{{this}}, {{/each}}. If no new character is mentioned, you must respond with an error.

Here is the context where the character was mentioned:
"{{{narrativeContext}}}"

Based on this context, identify the new character and generate the following details for them in the language '{{currentLanguage}}':
1.  **name**: The name of the new character you identified.
2.  **details**: A brief but descriptive summary of the character's appearance, demeanor, and perceived role (e.g., 'A gruff-looking blacksmith', 'A cheerful elven merchant').
3.  **biographyNotes**: Any inferred background, motivations, or secrets. If none, state that.
4.  **initialHistoryEntry**: A log of how they were first encountered. E.g., 'Met at the Prancing Pony inn.'

{{#if rpgMode}}
5.  **RPG Stats**:
    -   **isHostile**: Determine if they are initially hostile based on the context. Default to false.
    -   **characterClass**: Infer a class (e.g., 'Merchant', 'Thug', 'Guard', 'Wizard').
    -   **level**: Infer a plausible starting level (usually 1).
    -   **hitPoints / maxHitPoints**: Assign a reasonable starting HP (e.g., 10-15 for non-fighters).
    -   **armorClass**: Assign a base AC (e.g., 10-12 for unarmored).
    -   **attackBonus**: Assign a base attack bonus (e.g., 0-1).
    -   **damageBonus**: Assign base damage (e.g., '1d4').
{{/if}}

CRITICAL: Provide ONLY the JSON object for the new character. Do not add any extra text or explanations. If you cannot identify a new, unlisted character, your output must trigger an error.`,
});


// The main flow function for Genkit
export async function materializeCharacterWithGenkit(input: MaterializeCharacterInput): Promise<MaterializeCharacterOutput> {
    try {
        const { output } = await materializeCharacterPrompt(input);

        if (!output?.name) {
            throw new Error(`L'IA n'a pas réussi à identifier de nouveau personnage dans le texte fourni.`);
        }

        const isExisting = input.existingCharacters.some(
            (name) => name.toLowerCase() === output.name.toLowerCase()
        );
        if (isExisting) {
            throw new Error(`Le personnage "${output.name}" existe déjà.`);
        }

        return output;

    } catch (e: any) {
        console.error("Error in materializeCharacterWithGenkit flow:", e);
        const errorMessage = e.message || String(e);
        if (errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota")) {
            throw new Error("Le quota de l'API a été dépassé. Veuillez réessayer plus tard.");
        }
        if (errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
            throw new Error("Le modèle d'IA est actuellement surchargé. Veuillez réessayer.");
        }
        throw new Error(`Erreur lors de la création du personnage : ${errorMessage}`);
    }
}
