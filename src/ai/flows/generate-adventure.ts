'use server';

/**
 * @fileOverview Generates adventure narratives based on world, initial situation, characters, and user actions.
 *
 * - generateAdventure - A function that generates adventure narratives.
 * - GenerateAdventureInput - The input type for the generateAdventure function.
 * - GenerateAdventureOutput - The return type for the generateAdventure function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateAdventureInputSchema = z.object({
  world: z.string().describe('Detailed description of the game world.'),
  initialSituation: z.string().describe('The initial situation of the hero.'),
  secondaryCharacters: z
    .array(z.string())
    .describe('Array of descriptions for secondary characters.'),
  userAction: z.string().describe('The action taken by the user.'),
});
export type GenerateAdventureInput = z.infer<typeof GenerateAdventureInputSchema>;

const GenerateAdventureOutputSchema = z.object({
  narrative: z.string().describe('The generated narrative of the adventure.'),
});
export type GenerateAdventureOutput = z.infer<typeof GenerateAdventureOutputSchema>;

export async function generateAdventure(input: GenerateAdventureInput): Promise<GenerateAdventureOutput> {
  return generateAdventureFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAdventurePrompt',
  input: {
    schema: z.object({
      world: z.string().describe('Detailed description of the game world.'),
      initialSituation: z.string().describe('The initial situation of the hero.'),
      secondaryCharacters: z
        .array(z.string())
        .describe('Array of descriptions for secondary characters.'),
      userAction: z.string().describe('The action taken by the user.'),
    }),
  },
  output: {
    schema: z.object({
      narrative: z.string().describe('The generated narrative of the adventure.'),
    }),
  },
  prompt: `You are an interactive fiction engine. You take the world, initial situation, secondary characters and user action to weave a cohesive and engaging story.

World: {{{world}}}

Initial Situation: {{{initialSituation}}}

Secondary Characters:
{{#each secondaryCharacters}}
- {{{this}}}
{{/each}}

User Action: {{{userAction}}}

Narrative:`,
});

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
    const {output} = await prompt(input);
    return output!;
  }
);
