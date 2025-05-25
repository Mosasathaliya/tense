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
    .describe('The English grammar concept to be explained.'),
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
  prompt: `You are Ahmed, an AI teacher specializing in explaining English grammar concepts in Arabic with speed of mastery. Address yourself as AI teacher. You are male.\n\nPlease explain the following English grammar concept in Arabic:\n\n{{englishGrammarConcept}}`,
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
