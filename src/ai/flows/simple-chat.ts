
'use server';
/**
 * @fileOverview A simple chat AI agent for interacting with a single character.
 *
 * - simpleChat - A function that handles the chat process with a character.
 * - SimpleChatInput - The input type for the simpleChat function.
 * - SimpleChatOutput - The return type for the simpleChat function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import type { MessagePart } from 'genkit'; // Import MessagePart

// Define the schema for individual chat messages in history
const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']), // Gemini specific roles. 'system' messages will be mapped to 'user'.
  parts: z.array(z.object({ text: z.string() })),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

const SimpleChatInputSchema = z.object({
  characterName: z.string().describe('The name of the character to chat with.'),
  characterDetails: z.string().describe('A brief description of the character, including personality traits, background, and how they might speak. This is CRUCIAL for the AI to adopt the persona.'),
  chatHistory: z.array(ChatMessageSchema).optional().describe('The history of the conversation so far. The last message in history is often the latest user message if the user just sent something.'),
  userMessage: z.string().describe('The latest message from the user to the character.'),
});
export type SimpleChatInput = z.infer<typeof SimpleChatInputSchema>;

const SimpleChatOutputSchema = z.object({
  response: z.string().describe("The character's response to the user's message."),
});
export type SimpleChatOutput = z.infer<typeof SimpleChatOutputSchema>;

export async function simpleChat(input: SimpleChatInput): Promise<SimpleChatOutput> {
  return simpleChatFlow(input);
}


const prompt = ai.definePrompt({
  name: 'simpleChatPrompt',
  // System message to set the persona
  system: `You are {{characterName}}.
Your personality and background: {{characterDetails}}.
Respond naturally as this character, keeping your persona in mind.
Engage in a conversation based on the history provided and the user's latest message.
Keep your responses concise and in character.`,
  // Input schema for the prompt (excluding chatHistory, which is handled by `messages` field)
  input: {
    schema: z.object({
        characterName: SimpleChatInputSchema.shape.characterName,
        characterDetails: SimpleChatInputSchema.shape.characterDetails,
        userMessage: SimpleChatInputSchema.shape.userMessage, // Add userMessage here
    })
  },
  output: { // Define output schema for structured response, though we only need a string here
    schema: SimpleChatOutputSchema
  },
  // The prompt itself is mostly handled by the system message and chat history.
  // We add the user message explicitly here.
  prompt: `{{userMessage}}`, 
});


const simpleChatFlow = ai.defineFlow<
  typeof SimpleChatInputSchema,
  typeof SimpleChatOutputSchema
>(
  {
    name: 'simpleChatFlow',
    inputSchema: SimpleChatInputSchema,
    outputSchema: SimpleChatOutputSchema,
  },
  async (input) => {
    // History should not include the current userMessage if it's passed directly to the prompt
    const historyForPrompt: ChatMessage[] = input.chatHistory || [];
    
    // Ensure the last message in historyForPrompt is not the current userMessage
    // if the caller includes it there. The prompt itself now handles userMessage.
    // This logic assumes that `input.chatHistory` might redundantly include the `input.userMessage`
    // as its last element. If `input.chatHistory` is guaranteed to be only *previous* messages,
    // this check can be simplified or removed.
    const lastHistoryMessageText = historyForPrompt.length > 0 ? historyForPrompt[historyForPrompt.length - 1].parts[0]?.text : undefined;
    
    let actualHistoryToSend = historyForPrompt;
    if (lastHistoryMessageText === input.userMessage) {
        // If the last message in history is identical to the userMessage,
        // assume it's a duplicate and remove it from history before sending.
        actualHistoryToSend = historyForPrompt.slice(0, -1);
    }


    console.log("SimpleChat Flow Input:", JSON.stringify(input, null, 2));
    console.log("SimpleChat Flow actualHistoryToSend:", JSON.stringify(actualHistoryToSend, null, 2));


    const {output, history: updatedHistory} = await prompt( // Renamed 'history' from prompt response to 'updatedHistory'
      // Pass characterName, characterDetails and userMessage for the prompt's handlebars
      {
        characterName: input.characterName,
        characterDetails: input.characterDetails,
        userMessage: input.userMessage,
      },
      // Pass the (potentially adjusted) conversation history
      {
        history: actualHistoryToSend,
      }
    );

    if (!output?.response) {
      console.error("AI did not return a response. History from call:", updatedHistory);
      throw new Error("AI failed to generate a response for the character.");
    }
    console.log("SimpleChat Flow Output:", JSON.stringify(output, null, 2));
    console.log("SimpleChat Flow History after call:", JSON.stringify(updatedHistory, null, 2));


    return { response: output.response };
  }
);

