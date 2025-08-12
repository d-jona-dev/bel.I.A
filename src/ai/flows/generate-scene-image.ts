
'use server';

/**
 * @fileOverview Generates an image based on a textual scene description and an optional style.
 * This file acts as a router to select the appropriate image generation service.
 */

import type { GenerateSceneImageInput, GenerateSceneImageFlowOutput, AiConfig } from '@/types';
import { generateSceneImageWithGenkit } from './generate-scene-image-genkit';
import { generateSceneImageWithOpenRouter } from './generate-scene-image-openrouter';
import { generateSceneImageWithHuggingFace } from './generate-scene-image-huggingface';

// This is the main exported function that the application will call.
export async function generateSceneImage(
  input: GenerateSceneImageInput, 
  aiConfig: AiConfig
): Promise<GenerateSceneImageFlowOutput> {
  
  const imageConfig = aiConfig.image;

  if (imageConfig?.source === 'openrouter' && imageConfig.openRouter) {
    return generateSceneImageWithOpenRouter(input, imageConfig.openRouter);
  }

  if (imageConfig?.source === 'huggingface' && imageConfig.huggingface) {
    return generateSceneImageWithHuggingFace(input, imageConfig.huggingface);
  }
  
  // Default to Genkit/Gemini if no specific config is found or if it's explicitly set to 'gemini'
  return generateSceneImageWithGenkit(input);
}
