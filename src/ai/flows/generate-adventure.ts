
'use server';

import type { GenerateAdventureInput, GenerateAdventureFlowOutput } from '@/types';
import { generateAdventureWithGenkit } from './generate-adventure-genkit';
import { generateAdventureWithOpenRouter } from './generate-adventure-openrouter';
import { generateAdventureWithLocalLlm } from './generate-adventure-local';
import { generateAdventureWithCustomLocalLlm } from './generate-adventure-custom-local';


export async function generateAdventure(input: GenerateAdventureInput): Promise<GenerateAdventureFlowOutput> {
  const { aiConfig, systemPrompt } = input; // NOUVEAU: extraire systemPrompt

  // Transférer le systemPrompt à toutes les implémentations
  const inputWithPrompt = { ...input, systemPrompt };

  if (aiConfig?.llm.source === 'openrouter') {
    return generateAdventureWithOpenRouter(inputWithPrompt);
  }
  
  if (aiConfig?.llm.source === 'local') {
    return generateAdventureWithLocalLlm(inputWithPrompt);
  }

  if (aiConfig?.llm.source === 'custom-local') {
    return generateAdventureWithCustomLocalLlm(inputWithPrompt);
  }
  
  // Default to Genkit/Gemini
  return generateAdventureWithGenkit(inputWithPrompt);
}
