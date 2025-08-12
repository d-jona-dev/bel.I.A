
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

    const imageArrayBuffer = await response.arrayBuffer();
    
    // Convert ArrayBuffer to Base64 Data URI using Buffer (server-side)
    const imageBuffer = Buffer.from(imageArrayBuffer);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    const imageUrl = `data:${mimeType};base64,${base64Image}`;

    if (!imageUrl) {
        return { imageUrl: "", error: "Impossible de convertir la réponse de l'API en image." };
    }
    
    return { imageUrl, error: undefined };

  } catch (error) {
    console.error('Error calling Hugging Face for image generation:', error);
    return { imageUrl: "", error: `Erreur de communication avec Hugging Face: ${error instanceof Error ? error.message : String(error)}` };
  }
}
