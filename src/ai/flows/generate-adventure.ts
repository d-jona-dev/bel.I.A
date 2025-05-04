
'use server';

/**
 * @fileOverview Generates adventure narratives based on world, initial situation, characters, and user actions.
 * Includes optional RPG context handling and provides scene descriptions for image generation.
 * Detects newly introduced characters.
 *
 * - generateAdventure - A function that generates adventure narratives.
 * - GenerateAdventureInput - The input type for the generateAdventure function.
 * - GenerateAdventureOutput - The return type for the generateAdventure function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import type { Character } from '@/types'; // Import Character type for better context

// Define RPG context schema (optional) - Kept from previous version
const RpgContextSchema = z.object({
    playerStats: z.record(z.union([z.string(), z.number()])).optional().describe("Player character's statistics (e.g., HP, STR)."),
    characterDetails: z.array(z.object({
        name: z.string(),
        details: z.string().optional().describe("Brief description of the character for context."),
        stats: z.record(z.union([z.string(), z.number()])).optional().describe("Character's statistics."),
        inventory: z.record(z.number()).optional().describe("Character's inventory (item name: quantity)."),
    })).optional().describe("Details of relevant secondary characters already known."),
    mode: z.enum(["exploration", "dialogue", "combat"]).optional().describe("Current game mode."),
}).optional();


// Update Input Schema - include full character objects for better context
const GenerateAdventureInputSchema = z.object({
  world: z.string().describe('Detailed description of the game world.'),
  initialSituation: z.string().describe('The current situation or narrative state, including recent events and dialogue.'),
  // Pass the full character objects for better context, especially for physical descriptions
  characters: z.custom<Character[]>().describe('Array of currently known characters with their details.'),
  userAction: z.string().describe('The action taken by the user.'),
  promptConfig: z.object({
      rpgContext: RpgContextSchema.optional()
  }).optional(),
});
export type GenerateAdventureInput = z.infer<typeof GenerateAdventureInputSchema>;

// Define schema for newly introduced characters
const NewCharacterSchema = z.object({
    name: z.string().describe("The name of the newly introduced character."),
    details: z.string().optional().describe("A brief description of the new character derived from the narrative context."),
});

// Update Output Schema to include sceneDescriptionForImage and newCharacters
const GenerateAdventureOutputSchema = z.object({
  narrative: z.string().describe('The generated narrative continuation.'),
  sceneDescriptionForImage: z
    .string()
    .optional()
    .describe('A concise visual description of the current scene, suitable for an image generation prompt. Describe characters using their physical appearance, not their names.'),
  newCharacters: z
    .array(NewCharacterSchema)
    .optional()
    .describe('List of characters newly introduced in this narrative segment.'),
});
export type GenerateAdventureOutput = z.infer<typeof GenerateAdventureOutputSchema>;

export async function generateAdventure(input: GenerateAdventureInput): Promise<GenerateAdventureOutput> {
  return generateAdventureFlow(input);
}

// Update Prompt Definition
const prompt = ai.definePrompt({
  name: 'generateAdventurePrompt',
  input: {
    schema: GenerateAdventureInputSchema, // Use the updated input schema
  },
  output: {
    schema: GenerateAdventureOutputSchema, // Use the updated output schema
  },
  // Updated Handlebars prompt
  prompt: `You are an interactive fiction engine. Weave a cohesive and engaging story based on the context provided.

World: {{{world}}}

Current Situation/Recent Narrative:
{{{initialSituation}}}

Known Characters:
{{#each characters}}
- Name: {{this.name}}
  Description: {{this.details}}
  {{#if this.characterClass}}Class: {{this.characterClass}}{{/if}}
  {{#if this.level}}Level: {{this.level}}{{/if}}
  {{#if this.stats}}Stats: {{#each this.stats}}{{@key}}: {{this}} {{/each}}{{/if}}
  {{#if this.inventory}}Inventory: {{#each this.inventory}}{{@key}}: {{this}} ({{this}}) {{/each}}{{/if}}
{{/each}}

User Action: {{{userAction}}}

{{#if promptConfig.rpgContext}}
--- RPG Context ---
Mode: {{promptConfig.rpgContext.mode}}
{{#if promptConfig.rpgContext.playerStats}}
Player Stats: {{#each promptConfig.rpgContext.playerStats}}{{@key}}: {{this}} {{/each}}
{{/if}}
{{! Already included full character details above }}
---
{{/if}}

Tasks:
1.  Generate the next part of the story ("Narrative Continuation") based on all the context and the user's action. Be creative and engaging.
2.  Analyze the "Narrative Continuation" you just generated. Identify any characters mentioned by name that are NOT in the "Known Characters" list above. List these newly introduced characters in the 'newCharacters' output field, including their name and a brief description derived from the context if available.
3.  Based ONLY on the "Narrative Continuation", provide a concise visual description suitable for generating an image of the scene. Focus on the key visual elements, setting, mood, and any characters present. IMPORTANT: Describe any characters using their physical appearance or role (e.g., "a tall man with blond hair", "the bartender", "a young woman with brown hair") INSTEAD of their names. Place this description in the 'sceneDescriptionForImage' output field. If the narrative is purely dialogue or internal monologue with no strong visual scene, you can omit this field or provide a very brief summary like "Character thinking".

Narrative Continuation:
[Generate the next part of the story here.]
`,
});


// Flow definition
const generateAdventureFlow = ai.defineFlow<
  typeof GenerateAdventureInputSchema,
  typeof GenerateAdventureOutputSchema
>(
  {
    name: 'generateAdventureFlow',
    inputSchema: GenerateAdventureInputSchema,
    outputSchema: GenerateAdventureOutputSchema,
  },
  async input => {
    // Pre-processing: Ensure characters have at least basic details for the prompt
    const charactersWithDetails = input.characters.map(c => ({
        ...c,
        details: c.details || "No details provided.", // Add default if missing
    }));

    const processedInput = { ...input, characters: charactersWithDetails };

    console.log("Generating adventure with input:", JSON.stringify(processedInput, null, 2)); // Log input for debugging

    const {output} = await prompt(processedInput);

    if (!output?.narrative) {
        throw new Error("AI failed to generate a narrative.");
    }
    console.log("AI Output:", JSON.stringify(output, null, 2)); // Log the full output

    // Return the full output including the optional scene description and new characters
    return output;
  }
);
