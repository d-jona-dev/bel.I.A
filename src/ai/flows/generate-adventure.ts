
'use server';

import type { GenerateAdventureInput, GenerateAdventureFlowOutput } from '@/types';
import { generateAdventureWithGenkit } from './generate-adventure-genkit';
import { generateAdventureWithOpenRouter } from './generate-adventure-openrouter';
import { generateAdventureWithLocalLlm } from './generate-adventure-local';
import { readFileSync } from 'fs';
import path from 'path';


export async function generateAdventure(input: GenerateAdventureInput): Promise<GenerateAdventureFlowOutput> {
  const { aiConfig, activeCombat, userAction } = input;
  const isCombatAction = activeCombat?.isActive || userAction.toLowerCase().includes('attaque');

  // NEW: Check if combat is active or being initiated
  if (aiConfig?.llm.source === 'openrouter' && isCombatAction) {
    console.log("[Adventure Flow] Routing to OpenRouter with dedicated COMBAT prompt.");
    
    // Read the dedicated combat prompt file
    try {
        const combatPromptTemplate = readFileSync(path.join(process.cwd(), 'src', 'ai', 'prompts', 'combat.prompt'), 'utf-8');
         // Pass the combat prompt template to the OpenRouter flow
        return generateAdventureWithOpenRouter(input, combatPromptTemplate);
    } catch(e) {
        console.error("Critical Error: combat.prompt file not found or unreadable.", e);
        return { error: "Fichier de configuration de combat manquant. Impossible de continuer.", narrative: "" };
    }
  }

  // Fallback to original logic for non-combat OpenRouter calls or other models
  if (aiConfig?.llm.source === 'openrouter') {
    console.log("[Adventure Flow] Routing to OpenRouter with STANDARD prompt for non-combat action.");
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
