
'use server';

/**
 * @fileOverview Generates an image based on a textual scene description and an optional style.
 * This file acts as a router to select the appropriate image generation service.
 */

import type { GenerateSceneImageInput, GenerateSceneImageFlowOutput, AiConfig } from '@/types';
import { generateSceneImageWithGenkit } from './generate-scene-image-genkit';
import { generateSceneImageWithOpenRouter } from './generate-scene-image-openrouter';
import { generateSceneImageWithHuggingFace } from './generate-scene-image-huggingface';
import { generateSceneImageWithLocalSd } from './generate-scene-image-local-sd';

// This is the main exported function that the application will call.
export async function generateSceneImage(
  input: GenerateSceneImageInput, 
  aiConfig: AiConfig
): Promise<GenerateSceneImageFlowOutput> {
  
  // Use the IMAGE model source configuration for routing.
  const imageConfig = aiConfig.image;

  switch (imageConfig?.source) {
    case 'openrouter':
      if (imageConfig.openRouter) {
        return generateSceneImageWithOpenRouter(input, imageConfig.openRouter);
      }
      break;

    case 'huggingface':
      if (imageConfig.huggingface) {
        return generateSceneImageWithHuggingFace(input, imageConfig.huggingface);
      }
      break;
    
    case 'local-sd':
      if (imageConfig.localSd) {
        return generateSceneImageWithLocalSd(input, imageConfig.localSd);
      }
      break;
  }
  
  // Default to Genkit/Gemini if no specific config is found or if it's explicitly set to 'gemini'
  return generateSceneImageWithGenkit(input);
}
