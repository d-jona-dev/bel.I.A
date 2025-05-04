
'use server';

/**
 * @fileOverview Generates adventure narratives based on world, initial situation, characters, and user actions.
 * Includes optional RPG context handling and provides scene descriptions for image generation.
 *
 * - generateAdventure - A function that generates adventure narratives.
 * - GenerateAdventureInput - The input type for the generateAdventure function.
 * - GenerateAdventureOutput - The return type for the generateAdventure function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

// Define RPG context schema (optional)
const RpgContextSchema = z.object({
    playerStats: z.record(z.union([z.string(), z.number()])).optional().describe("Player character's statistics (e.g., HP, STR)."),
    characterDetails: z.array(z.object({
        name: z.string(),
        stats: z.record(z.union([z.string(), z.number()])).optional().describe("Character's statistics."),
        inventory: z.record(z.number()).optional().describe("Character's inventory (item name: quantity)."),
        // Add more fields like opinion, history snippets if useful for the prompt
    })).optional().describe("Details of relevant secondary characters."),
    mode: z.enum(["exploration", "dialogue", "combat"]).optional().describe("Current game mode."),
}).optional();


// Update Input Schema
const GenerateAdventureInputSchema = z.object({
  world: z.string().describe('Detailed description of the game world.'),
  initialSituation: z.string().describe('The current situation or narrative state.'), // Changed description for clarity
  secondaryCharacters: z
    .array(z.string()) // Keep simple string array for basic compatibility
    .describe('Array of basic descriptions for secondary characters.'),
  userAction: z.string().describe('The action taken by the user.'),
  promptConfig: z.object({ // Add optional promptConfig
      rpgContext: RpgContextSchema.optional()
  }).optional(),
});
export type GenerateAdventureInput = z.infer<typeof GenerateAdventureInputSchema>;

// Update Output Schema to include sceneDescriptionForImage
const GenerateAdventureOutputSchema = z.object({
  narrative: z.string().describe('The generated narrative continuation.'),
  sceneDescriptionForImage: z.string().optional().describe('A concise description of the current scene, suitable for an image generation prompt.'),
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
  // Updated Handlebars prompt to conditionally include RPG context and request scene description
  prompt: `You are an interactive fiction engine. Weave a cohesive and engaging story based on the context.

World: {{{world}}}

Current Situation: {{{initialSituation}}}

User Action: {{{userAction}}}

{{#if promptConfig.rpgContext}}
--- RPG Context ---
Mode: {{promptConfig.rpgContext.mode}}
{{#if promptConfig.rpgContext.playerStats}}
Player Stats: {{#each promptConfig.rpgContext.playerStats}}{{@key}}: {{this}} {{/each}}
{{/if}}
Relevant Characters:
{{#each promptConfig.rpgContext.characterDetails}}
- {{name}}:
  {{#if stats}}Stats: {{#each stats}}{{@key}}: {{this}} {{/each}}{{/if}}
  {{#if inventory}}Inventory: {{#each inventory}}{{@key}}: {{this}} {{/each}}{{/if}}
{{/each}}
---
{{/if}}

Narrative Continuation:
[Generate the next part of the story here.]

---
Based ONLY on the "Narrative Continuation" you just generated, provide a concise visual description suitable for generating an image of the scene. Focus on the key visual elements, characters present, setting, and mood. Place this description in the 'sceneDescriptionForImage' output field. If the narrative is purely dialogue or internal monologue with no strong visual scene, you can omit this field or provide a very brief summary like "Character thinking".
`,
});


// Flow definition remains largely the same, just uses the updated prompt and schema
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
     // TODO: Potentially pre-process input here if needed, e.g., summarizing long narratives
     // or selecting only *relevant* character details for the RPG context to avoid overly large prompts.

    console.log("Generating adventure with input:", JSON.stringify(input, null, 2)); // Log input for debugging

    const {output} = await prompt(input);

    // TODO: Post-process output if needed, e.g., extracting structured data
    // if the prompt was asked to generate choices, stats changes, etc.

    if (!output?.narrative) { // Check specifically for narrative
        throw new Error("AI failed to generate a narrative.");
    }
    console.log("AI Output:", JSON.stringify(output, null, 2)); // Log the full output

    // Return the full output including the optional scene description
    return output;
  }
);
