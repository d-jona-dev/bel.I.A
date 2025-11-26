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

  // Route to the appropriate implementation based on the image generation source.
  // We use the image source because vision models are usually tied to image models.
  const source = aiConfig?.image?.source || 'gemini';

  switch (source) {
    case 'openrouter':
      return describeAppearanceWithOpenRouter(input);
    case 'local-sd': // Assuming local vision runs on the same machine as local SD
      // We will try to call an Ollama endpoint by convention.
      return describeAppearanceWithLocalLlm(input);
    case 'gemini':
    default:
       // The 'custom-local' for LLM might have a vision model, let's try it.
       if (aiConfig?.llm.source === 'custom-local') {
          return describeAppearanceWithCustomLocalLlm(input);
       }
       // Fallback to Genkit/Gemini
      return describeAppearanceWithGenkit(input);
  }
}
