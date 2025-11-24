'use server';

/**
 * @fileOverview Describes a character's appearance or clothing based on an image.
 *
 * - describeAppearance - A function that takes an image and returns a detailed description.
 * - DescribeAppearanceInput - The input type for the describeAppearance function.
 * - DescribeAppearanceOutput - The return type for the describeAppearance function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import type { AiConfig } from '@/types';

const DescribeAppearanceInputSchema = z.object({
  portraitUrl: z
    .string()
    .describe(
      "An image of a character or a piece of clothing, as a data URI. Format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  aiConfig: z.custom<AiConfig>().optional(),
});
export type DescribeAppearanceInput = z.infer<typeof DescribeAppearanceInputSchema>;

const DescribeAppearanceOutputSchema = z.object({
  description: z.string().describe("A detailed, objective description suitable for an image generation prompt."),
});
export type DescribeAppearanceOutput = z.infer<typeof DescribeAppearanceOutputSchema>;


const describeAppearancePrompt = ai.definePrompt({
  name: 'describeAppearancePrompt',
  input: { schema: DescribeAppearanceInputSchema.omit({ aiConfig: true }) },
  output: { schema: DescribeAppearanceOutputSchema },
  prompt: `You are an expert fashion and character artist, specializing in creating vivid descriptions for game development.
Your task is to analyze the provided image and generate a detailed, objective description focusing *only* on what is visible.

**CRITICAL RULES:**
1.  **Analyze the image content:** Determine if the primary subject is a PERSON or an ITEM OF CLOTHING.
2.  **If it's a person:** Describe their permanent physical traits (face, hair, build). DO NOT describe clothing, accessories, armor, background, or lighting.
3.  **If it's an item of clothing:** Describe the clothing exclusively. Detail its type (e.g., 'tunic', 'dress', 'armor'), cut, color, material, and any patterns or notable details. DO NOT describe the person wearing it (if any) or the background.
4.  **DO NOT** invent personality, backstory, or names. Stick strictly to what is visually present.
5.  The output must be a single block of descriptive text, suitable for an image generation prompt.

Image to describe: {{media url=portraitUrl}}
`,
});


export const describeAppearance = ai.defineFlow(
  {
    name: 'describeAppearance',
    inputSchema: DescribeAppearanceInputSchema,
    outputSchema: DescribeAppearanceOutputSchema,
  },
  async (input) => {
    try {
        // On ne sélectionne plus le modèle dynamiquement ici.
        // On se fie au modèle par défaut configuré dans `ai-instance.ts`,
        // qui doit être un modèle avec capacité de vision.
        const { output } = await describeAppearancePrompt({ portraitUrl: input.portraitUrl });

        if (!output?.description) {
            throw new Error("AI failed to generate an appearance description.");
        }
        return output;
    } catch (e: any) {
        console.error("Error in describeAppearance flow:", e);
        const errorMessage = e.message || String(e);
        if (errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota")) {
             throw new Error("Le quota de l'API a été dépassé. Veuillez réessayer plus tard.");
        }
        if (errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
             throw new Error("Le modèle d'IA est actuellement surchargé. Veuillez réessayer.");
        }
        throw new Error(`Erreur lors de la description de l'apparence : ${errorMessage}`);
    }
  }
);
