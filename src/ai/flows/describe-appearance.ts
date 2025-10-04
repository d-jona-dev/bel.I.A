
'use server';

/**
 * @fileOverview Describes a character's appearance based on a portrait image.
 *
 * - describeAppearance - A function that takes an image and returns a detailed description.
 * - DescribeAppearanceInput - The input type for the describeAppearance function.
 * - DescribeAppearanceOutput - The return type for the describeAppearance function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const DescribeAppearanceInputSchema = z.object({
  portraitUrl: z
    .string()
    .describe(
      "A portrait image of a character, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type DescribeAppearanceInput = z.infer<typeof DescribeAppearanceInputSchema>;

const DescribeAppearanceOutputSchema = z.object({
  description: z.string().describe("A detailed physical description of the character in the image, focusing on facial features, hair, clothing, and any distinguishing marks. This description should be suitable for use in an image generation prompt to recreate the character."),
});
export type DescribeAppearanceOutput = z.infer<typeof DescribeAppearanceOutputSchema>;


const describeAppearancePrompt = ai.definePrompt({
  name: 'describeAppearancePrompt',
  input: { schema: DescribeAppearanceInputSchema },
  output: { schema: DescribeAppearanceOutputSchema },
  prompt: `You are an expert character artist and writer, specializing in creating vivid descriptions for game development.
Your task is to analyze the provided character portrait and generate a detailed, objective physical description.

Focus exclusively on visual details that would be crucial for another artist (or an AI) to reproduce the character's likeness.

- **Face:** Describe the face shape (oval, square, heart-shaped), jawline, skin tone, and any notable features like scars, tattoos, or wrinkles.
- **Eyes:** Detail the eye color, shape (almond, round), and expression (piercing, gentle, tired). Mention eyebrow shape and color.
- **Hair:** Describe the hair color, style (long, short, braided, messy), texture, and any accessories.
- **Clothing & Accessories:** Detail the character's attire, including type of clothing, colors, materials (leather, silk, metal), and any visible accessories like jewelry, armor pieces, or headwear.
- **Overall Build:** Briefly mention the character's apparent build (slender, muscular, stocky) if discernible.

**CRITICAL RULE:** Do NOT invent any personality traits, backstory, or names. Stick strictly to what is visually present in the image. The output should be a single block of descriptive text.

Portrait to describe: {{media url=portraitUrl}}
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
        const { output } = await describeAppearancePrompt(input);
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
