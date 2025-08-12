
'use server';

/**
 * @fileOverview Generates an image using a local Stable Diffusion WebUI (like Automatic1111) API.
 */
import type { GenerateSceneImageInput, GenerateSceneImageFlowOutput } from '@/types';
import { getStyleEnhancedPrompt } from './prompt-styles';

export async function generateSceneImageWithLocalSd(
  input: GenerateSceneImageInput,
  localSdConfig: { apiUrl: string }
): Promise<GenerateSceneImageFlowOutput> {
  
  if (!localSdConfig.apiUrl) {
    return { imageUrl: "", error: "L'URL de l'API Stable Diffusion locale est requise." };
  }

  const finalPrompt = getStyleEnhancedPrompt(input.sceneDescription, input.style);
  // Default to /sdapi/v1/txt2img which is common for Automatic1111
  const fullApiUrl = new URL('/sdapi/v1/txt2img', localSdConfig.apiUrl).toString();

  try {
    const response = await fetch(
      fullApiUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
            prompt: finalPrompt,
            steps: 25,
            width: 512,
            height: 512,
            cfg_scale: 7,
            sampler_name: "DPM++ 2M Karras",
        }),
      }
    );

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Local Stable Diffusion API Error:", response.status, errorBody);
        return { imageUrl: "", error: `Erreur de l'API locale: ${response.status} ${errorBody}` };
    }

    const data = await response.json();
    const imageBase64 = data.images?.[0];

    if (!imageBase64) {
        console.error("Local Stable Diffusion API Error: Invalid response format", data);
        return { imageUrl: "", error: "Format de réponse invalide de l'API locale. Assurez-vous que l'API est bien celle d'Automatic1111." };
    }
        
    const imageUrl = `data:image/png;base64,${imageBase64}`;

    return { imageUrl, error: undefined };

  } catch (error) {
    console.error('Error calling Local Stable Diffusion API:', error);
    return { imageUrl: "", error: `Erreur de communication avec l'API locale: ${error instanceof Error ? error.message : String(error)}` };
  }
}
