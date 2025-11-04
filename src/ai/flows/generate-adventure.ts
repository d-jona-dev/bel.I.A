
'use server';

import type { GenerateAdventureInput, GenerateAdventureFlowOutput } from '@/types';
import { generateAdventureWithGenkit } from './generate-adventure-genkit';
import { generateAdventureWithOpenRouter } from './generate-adventure-openrouter';
import { generateAdventureWithLocalLlm } from './generate-adventure-local';
import { generateAdventureWithCustomLocalLlm } from './generate-adventure-custom-local';


export async function generateAdventure(input: GenerateAdventureInput): Promise<GenerateAdventureFlowOutput> {
  const { aiConfig } = input;

  if (aiConfig?.llm.source === 'openrouter') {
    return generateAdventureWithOpenRouter(input);
  }
  
  if (aiConfig?.llm.source === 'local') {
    return generateAdventureWithLocalLlm(input);
  }

  if (aiConfig?.llm.source === 'custom-local') {
    return generateAdventureWithCustomLocalLlm(input);
  }
  
  // Default to Genkit/Gemini
  return generateAdventureWithGenkit(input);
}
