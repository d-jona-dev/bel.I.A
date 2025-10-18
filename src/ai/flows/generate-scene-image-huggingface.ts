
'use server';

/**
 * @fileOverview Generates an image using the Hugging Face Inference API.
 */
import type { GenerateSceneImageInput, GenerateSceneImageFlowOutput, SceneDescriptionForImage } from '@/types';
import { getStyleEnhancedPrompt } from './prompt-styles';

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


export async function generateSceneImageWithHuggingFace(
  input: GenerateSceneImageInput,
  imageConfig: { model: string; apiKey: string }
): Promise<GenerateSceneImageFlowOutput> {
  
  if (!imageConfig.model) {
    return { imageUrl: "", error: "L'identifiant du modèle Hugging Face est requis." };
  }

  const finalPrompt = buildImagePrompt(input.sceneDescription, input.style);
  const apiUrl = `https://api-inference.huggingface.co/models/${imageConfig.model}`;

  try {
    const response = await fetch(
      apiUrl,
      {
        headers: {
          Authorization: `Bearer ${imageConfig.apiKey}`,
          "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify({ inputs: finalPrompt }),
      }
    );

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Hugging Face API Error:", response.status, errorBody);
        return { imageUrl: "", error: `Erreur de l'API Hugging Face: ${response.status} ${errorBody}` };
    }

    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('image/')) {
        const imageArrayBuffer = await response.arrayBuffer();
        const imageBuffer = Buffer.from(imageArrayBuffer);
        const base64Image = imageBuffer.toString('base64');
        const imageUrl = `data:${contentType};base64,${base64Image}`;

        if (!imageUrl) {
            return { imageUrl: "", error: "Impossible de convertir la réponse de l'API en image." };
        }
        
        return { imageUrl, error: undefined };
    } else {
        // Handle non-image responses (e.g., model loading error)
        const errorResponse = await response.json();
        const errorMessage = errorResponse.error || "Réponse inattendue de l'API Hugging Face.";
        console.warn("Hugging Face non-image response:", errorMessage);
        return { imageUrl: "", error: `Hugging Face: ${errorMessage}. Le modèle est peut-être en cours de chargement, veuillez réessayer dans un instant.` };
    }

  } catch (error) {
    console.error('Error calling Hugging Face for image generation:', error);
    return { imageUrl: "", error: `Erreur de communication avec Hugging Face: ${error instanceof Error ? error.message : String(error)}` };
  }
}
