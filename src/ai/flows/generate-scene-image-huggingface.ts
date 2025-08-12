
'use server';

/**
 * @fileOverview Generates an image using the Hugging Face Inference API.
 */
import type { GenerateSceneImageInput, GenerateSceneImageFlowOutput } from '@/types';
import { getStyleEnhancedPrompt } from './prompt-styles';

export async function generateSceneImageWithHuggingFace(
  input: GenerateSceneImageInput,
  imageConfig: { model: string; apiKey: string }
): Promise<GenerateSceneImageFlowOutput> {
  
  if (!imageConfig.model) {
    return { imageUrl: "", error: "L'identifiant du modèle Hugging Face est requis." };
  }

  const finalPrompt = getStyleEnhancedPrompt(input.sceneDescription, input.style);
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

    const imageBlob = await response.blob();
    
    // Convert Blob to Base64 Data URI
    const reader = new FileReader();
    const dataUriPromise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageBlob);
    });

    const imageUrl = await dataUriPromise;

    if (!imageUrl) {
        return { imageUrl: "", error: "Impossible de convertir la réponse de l'API en image." };
    }
    
    return { imageUrl, error: undefined };

  } catch (error) {
    console.error('Error calling Hugging Face for image generation:', error);
    return { imageUrl: "", error: `Erreur de communication avec Hugging Face: ${error instanceof Error ? error.message : String(error)}` };
  }
}
