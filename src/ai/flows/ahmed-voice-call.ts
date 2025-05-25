
'use server';

/**
 * @fileOverview This flow allows users to call Ahmed, an AI teacher specializing in Arabic explanations of English grammar.
 *
 * - ahmedVoiceCall - A function to initiate a voice call with Ahmed.
 * - AhmedVoiceCallInput - The input type for the ahmedVoiceCall function.
 * - AhmedVoiceCallOutput - The return type for the ahmedVoiceCall function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the schema for a single conversation entry
const ConversationEntrySchema = z.object({
  speaker: z.enum(['User', 'Ahmed']), // Speaker can be User or Ahmed
  message: z.string(),
});

// Define the input schema for Ahmed's voice call, including conversation history
const AhmedVoiceCallInputSchema = z.object({
  englishGrammarConcept: z
    .string()
    .describe('The English grammar concept or question from the user. This might be in English, Arabic, or a garbled version from speech-to-text.'),
  conversationHistory: z.array(ConversationEntrySchema).optional().describe('The history of the conversation so far, to provide context for follow-up questions.'),
});
export type AhmedVoiceCallInput = z.infer<typeof AhmedVoiceCallInputSchema>;

const AhmedVoiceCallOutputSchema = z.object({
  explanation: z
    .string()
    .describe('The explanation of the English grammar concept in Arabic, or an answer to the user\'s question.'),
});
export type AhmedVoiceCallOutput = z.infer<typeof AhmedVoiceCallOutputSchema>;

export async function ahmedVoiceCall(input: AhmedVoiceCallInput): Promise<AhmedVoiceCallOutput> {
  return ahmedVoiceCallFlow(input);
}

const prompt = ai.definePrompt({
  name: 'ahmedVoiceCallPrompt',
  input: {schema: AhmedVoiceCallInputSchema},
  output: {schema: AhmedVoiceCallOutputSchema},
  prompt: `You are Ahmed, an AI teacher specializing in explaining English grammar concepts in Arabic with speed of mastery. Address yourself as AI teacher. You are male.

{{#if conversationHistory}}
You are in an ongoing conversation. Here's the history so far:
{{#each conversationHistory}}
{{this.speaker}}: {{this.message}}
{{/each}}
---
The user's NEWEST message/question, building on this conversation, is: "{{englishGrammarConcept}}"
Your task is to understand this newest message in the context of the conversation history and provide a clear explanation or answer in Arabic. Focus on the newest message. If the newest message is unclear even with history, ask for clarification in Arabic.
{{else}}
The user is starting a new conversation. Their first message/question is: "{{englishGrammarConcept}}"
This input might be in English, Arabic, or a garbled version from speech-to-text.
Your task is to interpret this first message to identify the most likely English grammar concept or question they are asking about. Then, explain that concept or answer the question clearly in Arabic. If the input is too unclear, politely ask for clarification in Arabic.
{{/if}}`,
});

const ahmedVoiceCallFlow = ai.defineFlow(
  {
    name: 'ahmedVoiceCallFlow',
    inputSchema: AhmedVoiceCallInputSchema,
    outputSchema: AhmedVoiceCallOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
