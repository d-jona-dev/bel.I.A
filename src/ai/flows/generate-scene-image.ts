
'use server';

/**
 * @fileOverview Generates an image based on a textual scene description.
 * Assumes the input description prioritizes visual details and physical descriptions over names.
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
    .describe('A visual description of the scene to generate an image for. Should prioritize physical descriptions of characters over names.'),
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
// The quality of the image depends heavily on the quality of the sceneDescription provided by the calling flow (e.g., generateAdventure).

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
      // Pass the scene description directly. It's expected to be well-formatted by the caller.
      prompt: input.sceneDescription,
      config: {
        // IMPORTANT: Must specify both TEXT and IMAGE modalities
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    // Ensure media and URL exist before returning
    if (!media?.url) {
        throw new Error("Image generation failed or returned no URL.");
    }

    console.log(`Image generated for prompt: "${input.sceneDescription.substring(0, 100)}..."`); // Log truncated prompt

    return {imageUrl: media.url};
  }
);
