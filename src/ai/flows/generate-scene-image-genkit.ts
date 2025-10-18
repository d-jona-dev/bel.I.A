
'use server';

/**
 * @fileOverview Generates an image based on a textual scene description and an optional style.
 * Assumes the input description prioritizes visual details and physical descriptions over names.
 *
 * - generateSceneImage - A function that generates an image of the current scene.
 * - GenerateSceneImageInput - The input type for the generateSceneImage function.
 * - GenerateSceneImageOutput - The return type for the generateSceneImage function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import type { GenerateSceneImageInput, GenerateSceneImageFlowOutput, SceneDescriptionForImage } from '@/types';
import { getStyleEnhancedPrompt } from './prompt-styles';


const SceneDescriptionForImageSchema = z.object({
    action: z.string(),
    charactersInScene: z.array(z.object({
        name: z.string(),
        appearanceDescription: z.string().optional(),
    })),
});

const GenerateSceneImageInputSchema = z.object({
  sceneDescription: SceneDescriptionForImageSchema,
  style: z.string().optional().describe("The artistic style for the image (e.g., 'Réaliste', 'Manga / Anime', 'Fantaisie Epique', or a custom user prompt)."),
});

const GenerateSceneImageOutputSchema = z.object({
  imageUrl: z
    .string() // Data URI
    .describe('The generated image as a data URI.'),
});

const getDefaultOutput = (errorMsg?: string): GenerateSceneImageFlowOutput => ({
    imageUrl: "", // Default empty or null image URL
    error: errorMsg,
});

// Helper function to build the final prompt from the rich description object
const buildImagePrompt = (description: SceneDescriptionForImage, style?: string): string => {
    let finalDescription = description.action;

    // Inject character appearance descriptions into the action string
    description.charactersInScene.forEach(char => {
        if (char.appearanceDescription) {
            const regex = new RegExp(`\\b${char.name}\\b`, 'gi');
            finalDescription = finalDescription.replace(regex, `${char.name} (${char.appearanceDescription})`);
        }
    });
    
    return getStyleEnhancedPrompt(finalDescription, style);
};

export async function generateSceneImageWithGenkit(input: GenerateSceneImageInput): Promise<GenerateSceneImageFlowOutput>
{
  return generateSceneImageFlow(input);
}

// Note: ai.definePrompt is not directly used here as image generation uses ai.generate directly.
const generateSceneImageFlow = ai.defineFlow<
  typeof GenerateSceneImageInputSchema,
  typeof GenerateSceneImageOutputSchema
>(
  {
    name: 'generateSceneImageGenkitFlow',
    inputSchema: GenerateSceneImageInputSchema,
    outputSchema: GenerateSceneImageOutputSchema,
  },
  async (input): Promise<GenerateSceneImageFlowOutput> => {
    let fullResponse;
    const finalPrompt = buildImagePrompt(input.sceneDescription, input.style);
    
    try {
      fullResponse = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp',
        prompt: finalPrompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });
    } catch (e: any) {
      console.error("Error during ai.generate call for image:", e);
      const errorMessage = e.message || String(e);
       if (errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota")) {
            return getDefaultOutput("Le quota de l'API d'images a été dépassé. Veuillez réessayer plus tard.");
        }
      if (errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
          return getDefaultOutput("Le modèle d'IA pour la génération d'images est actuellement surchargé. Veuillez réessayer.");
      }
      return getDefaultOutput(`Échec de la génération d'image par l'IA: ${errorMessage}`);
    }
    

    const media = fullResponse?.media;

    if (!media?.url) {
        console.error(
          "Image generation failed: media or media.url is missing from the response. Full response from ai.generate:",
          JSON.stringify(fullResponse, null, 2)
        );
        return getDefaultOutput("La génération d'images a échoué ou n'a pas retourné d'URL. Vérifiez la console du serveur pour les détails.");
    }

    console.log(`Image generated for prompt: "${finalPrompt.substring(0, 100)}..."`);

    return {imageUrl: media.url, error: undefined };
  }
);
