
'use server';

import type { GenerateAdventureInput, GenerateAdventureFlowOutput } from '@/types';
import { generateAdventureWithGenkit } from './generate-adventure-genkit';
import { generateAdventureWithOpenRouter } from './generate-adventure-openrouter';
import { generateAdventureWithLocalLlm } from './generate-adventure-local';
import { readFileSync } from 'fs';
import path from 'path';

export async function generateAdventure(input: GenerateAdventureInput): Promise<GenerateAdventureFlowOutput> {
  const { aiConfig, activeCombat } = input;

  // NEW: Check if combat is active
  if (aiConfig?.llm.source === 'openrouter' && activeCombat?.isActive) {
    console.log("[Adventure Flow] Routing to OpenRouter with dedicated COMBAT prompt.");
    
    // Read the dedicated combat prompt file
    const combatPromptTemplate = readFileSync(path.join(process.cwd(), 'src', 'ai', 'prompts', 'combat.prompt'), 'utf-8');
    
    // Pass the combat prompt template to the OpenRouter flow
    return generateAdventureWithOpenRouter(input, combatPromptTemplate);
  }

  if (aiConfig?.llm.source === 'openrouter') {
    console.log("[Adventure Flow] Routing to OpenRouter with standard prompt.");
    return generateAdventureWithOpenRouter(input);
  }
  
  if (aiConfig?.llm.source === 'local') {
     console.log("[Adventure Flow] Routing to Local LLM.");
    return generateAdventureWithLocalLlm(input);
  }
  
  // Default to Genkit/Gemini
  console.log("[Adventure Flow] Routing to Genkit/Gemini.");
  return generateAdventureWithGenkit(input);
}
