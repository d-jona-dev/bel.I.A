// use server'

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

const generateSceneImagePrompt = ai.definePrompt({
  name: 'generateSceneImagePrompt',
  input: {
    schema: z.object({
      sceneDescription: z
        .string()
        .describe('A description of the scene to generate an image for.'),
    }),
  },
  output: {
    schema: z.object({
      imageUrl: z.string().describe('The generated image as a data URI.'),
    }),
  },
  prompt: `Generate a detailed image of the following scene, focusing on visual elements and atmosphere. Return the image as a data URI. Consider composition, color, and lighting to create an engaging visual representation.

Scene Description: {{{sceneDescription}}}`, // Ensure the prompt is well-formatted and utilizes the scene description effectively.
});

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
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: input.sceneDescription,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    return {imageUrl: media.url!};
  }
);
