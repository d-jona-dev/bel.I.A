
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

const GenerateSceneImageInputSchema = z.object({
  sceneDescription: z
    .string()
    .describe('A visual description of the scene to generate an image for. Should prioritize physical descriptions of characters over names.'),
  style: z.string().optional().describe("The artistic style for the image (e.g., 'Réaliste', 'Manga / Anime', 'Fantaisie Epique', or a custom user prompt)."),
});
export type GenerateSceneImageInput = z.infer<typeof GenerateSceneImageInputSchema>;

const GenerateSceneImageOutputSchema = z.object({
  imageUrl: z
    .string() // Data URI
    .describe('The generated image as a data URI.'),
});
export type GenerateSceneImageOutput = z.infer<typeof GenerateSceneImageOutputSchema>;

// Modified return type for the flow and its wrapper
export type GenerateSceneImageFlowOutput = GenerateSceneImageOutput & { error?: string };

const getDefaultOutput = (errorMsg?: string): GenerateSceneImageFlowOutput => ({
    imageUrl: "", // Default empty or null image URL
    error: errorMsg,
});

const getStyleEnhancedPrompt = (description: string, style?: string): string => {
  const negativePrompt = "Image only, no text, no letters, no numbers, no words, no captions, no signatures, no watermarks.";
  const sizePrompt = "Generate a square image, 512x512 pixels."
  
  // New logic: Check if the description is for a portrait to apply a specific prompt structure.
  const isPortrait = description.toLowerCase().includes('portrait of');

  if (isPortrait) {
      if (!style || style === "Par Défaut") {
        return `photorealistic portrait, highly detailed, dramatic lighting, ${description}`;
      }
      const stylePrompts: Record<string, string> = {
        'Réaliste': `photorealistic portrait, highly detailed, dramatic lighting, ${description}`,
        'Manga / Anime': `high-quality anime portrait, vibrant, detailed, by studio ghibli and makoto shinkai, ${description}`,
        'Fantaisie Epique': `epic fantasy portrait painting, detailed, D&D, ArtStation, dramatic lighting, by greg rutkowski, ${description}`,
        'Peinture à l\'huile': `classical oil painting portrait, detailed brushstrokes, masterpiece, ${description}`,
        'Comics': `bold american comic book style portrait, ink, vibrant colors, halftone dots, ${description}`,
      };
      const styledDescription = stylePrompts[style] || `${description}, in the art style of ${style}`;
      return `${negativePrompt} ${styledDescription}`;

  } else {
    // Original logic for scene images
    if (!style || style === "Par Défaut") {
        return `${negativePrompt} ${sizePrompt} ${description}`;
    }
     const stylePrompts: Record<string, string> = {
        'Réaliste': `A photorealistic, highly detailed image. Keywords: realistic, photorealism, 8k, sharp focus. ${sizePrompt} Scene: ${description}`,
        'Manga / Anime': `A high-quality, detailed image in a vibrant Manga/Anime style. Keywords: anime aesthetic, clean lines, cel shading, by Studio Ghibli and Makoto Shinkai. ${sizePrompt} Scene: ${description}`,
        'Fantaisie Epique': `A dramatic and epic digital fantasy painting. Keywords: fantasy art, epic, detailed, D&D, ArtStation, dramatic lighting, by Greg Rutkowski. ${sizePrompt} Scene: ${description}`,
        'Peinture à l\'huile': `An image in the style of a classical oil painting. Keywords: oil on canvas, classical, detailed brushstrokes, masterpiece. ${sizePrompt} Scene: ${description}`,
        'Comics': `An image in a bold, American comic book style. Keywords: comic book art, bold lines, ink, vibrant colors, halftone dots. ${sizePrompt} Scene: ${description}`,
    };
    const styledDescription = stylePrompts[style] || `${description}. Art style: ${style}`;
    return `${negativePrompt} ${styledDescription}`;
  }
};


export async function generateSceneImage(input: GenerateSceneImageInput): Promise<GenerateSceneImageFlowOutput>
{
  return generateSceneImageFlow(input);
}

// Note: ai.definePrompt is not directly used here as image generation uses ai.generate directly.
// The quality of the image depends heavily on the quality of the sceneDescription provided by the calling flow (e.g., generateAdventure).

const generateSceneImageFlow = ai.defineFlow<
  typeof GenerateSceneImageInputSchema,
  typeof GenerateSceneImageOutputSchema // Schema for AI output
>(
  {
    name: 'generateSceneImageFlow',
    inputSchema: GenerateSceneImageInputSchema,
    outputSchema: GenerateSceneImageOutputSchema,
  },
  async (input): Promise<GenerateSceneImageFlowOutput> => { // Explicitly type the Promise return
    let fullResponse;
    const finalPrompt = getStyleEnhancedPrompt(input.sceneDescription, input.style);
    
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

    return {imageUrl: media.url, error: undefined }; // Add error: undefined for successful case
  }
);
