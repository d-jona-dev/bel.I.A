'use server';

/**
 * @fileOverview Generates an image based on a textual scene description.
 *
 * - generateSceneImage - A function that generates an image of the current scene.
 * - GenerateSceneImageInput - The input type for the generateSceneImage function.
 * - GenerateSceneImageOutput - The return type for the generateSceneImage function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateSceneImageInputSchema = z.object({
  sceneDescription: z
    .string()
    .describe('A description of the scene to generate an image for.'),
});
export type GenerateSceneImageInput = z.infer<typeof GenerateSceneImageInputSchema>;

const GenerateSceneImageOutputSchema = z.object({
  imageUrl: z
    .string() // Data URI
    .describe('The generated image as a data URI.'),
});
export type GenerateSceneImageOutput = z.infer<typeof GenerateSceneImageOutputSchema>;

export async function generateSceneImage(input: GenerateSceneImageInput): Promise<GenerateSceneImageOutput>
{
  return generateSceneImageFlow(input);
}

// Note: ai.definePrompt is not directly used here as image generation uses ai.generate directly.
// If more complex logic or structured output was needed alongside the image, a prompt might be used.

const generateSceneImageFlow = ai.defineFlow<
  typeof GenerateSceneImageInputSchema,
  typeof GenerateSceneImageOutputSchema
>(
  {
    name: 'generateSceneImageFlow',
    inputSchema: GenerateSceneImageInputSchema,
    outputSchema: GenerateSceneImageOutputSchema,
  },
  async input => {
    // Use ai.generate for image generation with the specified experimental model
    const {media} = await ai.generate({
      // IMPORTANT: Use the correct model for image generation
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: input.sceneDescription, // Pass the scene description directly
      config: {
        // IMPORTANT: Must specify both TEXT and IMAGE modalities
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    // Ensure media and URL exist before returning
    if (!media?.url) {
        throw new Error("Image generation failed or returned no URL.");
    }

    return {imageUrl: media.url};
  }
);
