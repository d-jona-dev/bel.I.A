'use server';

/**
 * @fileOverview This file acts as a router for the describe appearance AI flow.
 * It determines which underlying implementation to use (Gemini, OpenRouter, Local, etc.)
 * based on the provided AI configuration.
 */

import type { AiConfig } from '@/types';
import type { DescribeAppearanceInput, DescribeAppearanceOutput } from './describe-appearance-genkit';
import { describeAppearanceWithGenkit } from './describe-appearance-genkit';
import { describeAppearanceWithOpenRouter } from './describe-appearance-openrouter';
import { describeAppearanceWithLocalLlm } from './describe-appearance-local';
import { describeAppearanceWithCustomLocalLlm } from './describe-appearance-custom-local';


export async function describeAppearance(input: DescribeAppearanceInput): Promise<DescribeAppearanceOutput> {
  const { aiConfig } = input;

  // Use the IMAGE model source for routing vision-related tasks.
  const source = aiConfig?.image?.source || 'gemini';

  switch (source) {
    case 'openrouter':
      return describeAppearanceWithOpenRouter(input);
    case 'local-sd': // We route local Stable Diffusion to the local LLM vision model (Ollama)
      return describeAppearanceWithLocalLlm(input);
    case 'gemini':
    default:
       // Check if a custom local LLM is configured; it might be a vision model.
       if (aiConfig?.llm.source === 'custom-local') {
          return describeAppearanceWithCustomLocalLlm(input);
       }
       // Fallback to the default Genkit/Gemini implementation.
      return describeAppearanceWithGenkit(input);
  }
}
