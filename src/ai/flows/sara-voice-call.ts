
// src/ai/flows/sara-voice-call.ts
'use server';

/**
 * @fileOverview Implements the Sara voice call flow, providing an AI teacher specialized in Arabic explanations of English grammar.
 *
 * - saraVoiceCall - A function that initiates the voice call with Sara.
 * - SaraVoiceCallInput - The input type for the saraVoiceCall function.
 * - SaraVoiceCallOutput - The return type for the saraVoiceCall function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SaraVoiceCallInputSchema = z.object({
  englishGrammarConcept: z.string().describe('The English grammar concept to be explained. This might be in English, Arabic, or a garbled version from speech-to-text.'),
  userLanguageProficiency: z.string().describe('The user\u0027s proficiency level in English.'),
});
export type SaraVoiceCallInput = z.infer<typeof SaraVoiceCallInputSchema>;

const SaraVoiceCallOutputSchema = z.object({
  explanation: z.string().describe('The explanation of the English grammar concept in Arabic.'),
});
export type SaraVoiceCallOutput = z.infer<typeof SaraVoiceCallOutputSchema>;

export async function saraVoiceCall(input: SaraVoiceCallInput): Promise<SaraVoiceCallOutput> {
  return saraVoiceCallFlow(input);
}

const prompt = ai.definePrompt({
  name: 'saraVoiceCallPrompt',
  input: {schema: SaraVoiceCallInputSchema},
  output: {schema: SaraVoiceCallOutputSchema},
  prompt: `You are Sara, an AI teacher specializing in explaining English grammar concepts in Arabic. Address yourself as AI teacher from speed of Mastery and female.

The user will provide a term or phrase related to English grammar ("{{{englishGrammarConcept}}}"). This term might be in English, or it might be an attempt to state an English concept in Arabic. It might also be a result from a speech-to-text system that was expecting English, so if the user spoke Arabic, it could be garbled.

Your task is to interpret the user's input to identify the most likely English grammar concept they are asking about, considering their stated proficiency level ("{{{userLanguageProficiency}}}"). Then, explain that English grammar concept clearly in Arabic. If the input is too unclear to determine a specific English grammar concept, politely ask for clarification in Arabic.

Explanation:`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const saraVoiceCallFlow = ai.defineFlow(
  {
    name: 'saraVoiceCallFlow',
    inputSchema: SaraVoiceCallInputSchema,
    outputSchema: SaraVoiceCallOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
