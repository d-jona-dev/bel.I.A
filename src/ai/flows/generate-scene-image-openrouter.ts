
'use server';

/**
 * @fileOverview Generates an image using the OpenRouter API.
 */
import type { GenerateSceneImageInput, GenerateSceneImageFlowOutput, SceneDescriptionForImage } from '@/types';
import { getStyleEnhancedPrompt } from './prompt-styles'; // Reuse the prompt logic

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/images/generations";

export async function generateSceneImageWithOpenRouter(
  input: GenerateSceneImageInput,
  imageConfig: { model: string; apiKey: string }
): Promise<GenerateSceneImageFlowOutput> {
  
  if (!imageConfig.apiKey || !imageConfig.model) {
    return { imageUrl: "", error: "La clé API et le modèle OpenRouter pour les images sont requis." };
  }

  const finalPrompt = getStyleEnhancedPrompt(input.sceneDescription, input.style);

  if (!finalPrompt) {
    return { imageUrl: "", error: "La description de la scène est vide, impossible de générer une image." };
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${imageConfig.apiKey}`,
        'Content-Type': 'application/json',
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Aventurier Textuel",
      },
      body: JSON.stringify({
        model: imageConfig.model,
        prompt: finalPrompt,
        n: 1,
        size: "512x512", 
      }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("OpenRouter Image API Error:", response.status, errorBody);
        return { imageUrl: "", error: `Erreur de l'API OpenRouter (Image): ${response.status} ${errorBody}` };
    }

    const data = await response.json();
    const imageUrl = data?.data?.[0]?.url;

    if (!imageUrl) {
         console.error("OpenRouter Image API Error: Invalid response format", data);
        return { imageUrl: "", error: "Format de réponse invalide de l'API OpenRouter pour l'image." };
    }
    
    // Note: OpenRouter returns a URL. To display it, we might need to proxy it
    // or fetch it and convert to a data URI if there are CORS issues.
    // For now, we return the direct URL.
    return { imageUrl: imageUrl, error: undefined };

  } catch (error) {
    console.error('Error calling OpenRouter for image generation:', error);
    return { imageUrl: "", error: `Erreur de communication avec OpenRouter (Image): ${error instanceof Error ? error.message : String(error)}` };
  }
}
