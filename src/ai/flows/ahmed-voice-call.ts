
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

const AhmedVoiceCallInputSchema = z.object({
  englishGrammarConcept: z
    .string()
    .describe('The English grammar concept to be explained. This might be in English, Arabic, or a garbled version from speech-to-text.'),
});
export type AhmedVoiceCallInput = z.infer<typeof AhmedVoiceCallInputSchema>;

const AhmedVoiceCallOutputSchema = z.object({
  explanation: z
    .string()
    .describe('The explanation of the English grammar concept in Arabic.'),
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

The user will provide a term or phrase related to English grammar. This term might be in English, or it might be an attempt to state an English concept in Arabic. It might also be a result from a speech-to-text system that was expecting English, so if the user spoke Arabic, it could be garbled.

Your task is to interpret the user's input ("{{englishGrammarConcept}}") to identify the most likely English grammar concept they are asking about. Then, explain that English grammar concept clearly in Arabic. If the input is too unclear to determine a specific English grammar concept, politely ask for clarification in Arabic.`,
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
