

'use server';

import type { GenerateAdventureInput, GenerateAdventureFlowOutput } from '@/types';
import { generateAdventureWithGenkit } from './generate-adventure-genkit';
import { generateAdventureWithOpenRouter } from './generate-adventure-openrouter';


export async function generateAdventure(input: GenerateAdventureInput): Promise<GenerateAdventureFlowOutput> {
  const { aiConfig } = input;

  if (aiConfig && aiConfig.source === 'openrouter') {
    // Pass the entire input object to the OpenRouter flow
    return generateAdventureWithOpenRouter(input);
  }
  
  // Default to Genkit/Gemini
  return generateAdventureWithGenkit(input);
}
