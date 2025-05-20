
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
    let fullResponse;
    try {
      fullResponse = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp',
        prompt: input.sceneDescription,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });
    } catch (e: any) {
      console.error("Error during ai.generate call for image:", e);
      // Re-throw the original error or a new one with more context
      throw new Error(`AI image generation call failed: ${e.message || String(e)}`);
    }
    

    const media = fullResponse?.media;

    if (!media?.url) {
        // Log the full response if media or media.url is missing to help diagnose
        console.error(
          "Image generation failed: media or media.url is missing from the response. Full response from ai.generate:",
          JSON.stringify(fullResponse, null, 2)
        );
        throw new Error("Image generation failed or returned no URL. Check server console for details.");
    }

    console.log(`Image generated for prompt: "${input.sceneDescription.substring(0, 100)}..."`);

    return {imageUrl: media.url};
  }
);

