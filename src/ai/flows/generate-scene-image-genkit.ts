
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
  sceneDescription: SceneDescriptionForImageSchema.optional(), // Make optional to handle undefined
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
    
    const finalPrompt = getStyleEnhancedPrompt(input.sceneDescription, input.style);

    if (!finalPrompt) {
        return getDefaultOutput("La description de la scène est vide, impossible de générer une image.");
    }
    
    console.log("FINAL PROMPT SENT TO MODEL:\n", finalPrompt);

    let fullResponse;
    
    try {
      fullResponse = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp',
        prompt: finalPrompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });
      console.log("FULL RESPONSE FROM MODEL:\n", JSON.stringify(fullResponse, null, 2));

    } catch (e: any) {
      console.error("Error during ai.generate call for image:", e);
      const errorMessage = e.message || String(e);
       if (errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota")) {
            return getDefaultOutput("Le quota de l'API d'images a été dépassé. Veuillez réessayer plus tard.");
        }
       if (errorMessage.includes("INVALID_ARGUMENT")) {
            return getDefaultOutput("Argument invalide pour la génération d'image. Le prompt est peut-être vide ou malformé.");
       }
      if (errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
          return getDefaultOutput("Le modèle d'IA pour la génération d'images est actuellement surchargé. Veuillez réessayer.");
      }
      return getDefaultOutput(`Échec de la génération d'image par l'IA: ${errorMessage}`);
    }
    
    const media = fullResponse?.media ?? fullResponse?.outputs ?? fullResponse?.images ?? null;
    let imageUrl = "";

    if (Array.isArray(media)) {
      // try common places
      imageUrl = media[0]?.url || media[0]?.image || "";
    } else if (typeof media === 'object' && media !== null) {
      imageUrl = media.url || (media as any)[0]?.url || (media as any).image || "";
    }

    if (!imageUrl && fullResponse) {
      // fallback check nested fields
      imageUrl = (fullResponse as any)?.data?.[0]?.url || (fullResponse as any)?.outputs?.[0]?.image || "";
    }

    if (!imageUrl) {
        console.error("No image URL found. Response dump:", JSON.stringify(fullResponse, null, 2));
        return getDefaultOutput("La génération d'image n'a pas retourné d'URL. Voir logs serveur pour la réponse complète.");
    }


    console.log(`Image generated for prompt: "${finalPrompt.substring(0, 100)}..."`);

    return {imageUrl: imageUrl, error: undefined };
  }
);
