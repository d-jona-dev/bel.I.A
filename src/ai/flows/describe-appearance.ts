
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

  // Use the LLM model source for routing vision-related tasks, as many LLMs are multimodal.
  const source = aiConfig?.llm.source || 'gemini';

  switch (source) {
    case 'openrouter':
      return describeAppearanceWithOpenRouter(input);
    case 'local':
      return describeAppearanceWithLocalLlm(input);
    case 'custom-local':
       return describeAppearanceWithCustomLocalLlm(input);
    case 'gemini':
    default:
       // Fallback to the default Genkit/Gemini implementation.
      return describeAppearanceWithGenkit(input);
  }
}
