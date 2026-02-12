'use server';
/**
 * @fileOverview An AI flow to parse natural language search queries into structured data.
 *
 * - parseSearchQuery - A function that handles the parsing process.
 * - SearchQueryInput - The input type for the parseSearchQuery function.
 * - SearchQueryOutput - The return type for the parseSearchQuery function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SearchQueryInputSchema = z.object({
  query: z.string().describe("The user's natural language search query."),
});
export type SearchQueryInput = z.infer<typeof SearchQueryInputSchema>;

const SearchQueryOutputSchema = z.object({
  text: z.string().optional().describe("General keywords to search for in the document text."),
  equipmentId: z.string().optional().describe("The specific equipment ID mentioned, if any."),
  anomalyType: z.string().optional().describe("The type of anomaly mentioned, if any."),
});
export type SearchQueryOutput = z.infer<typeof SearchQueryOutputSchema>;

export async function parseSearchQuery(input: SearchQueryInput): Promise<SearchQueryOutput> {
  return searchQueryParserFlow(input);
}

const prompt = ai.definePrompt({
  name: 'searchQueryParserPrompt',
  system: `You are an expert at parsing search queries for an industrial monitoring system.
Your task is to extract structured information from a user's natural language query.
The user is searching through a database of visual evidence (photos).
Extract keywords, specific equipment IDs (they often look like TG1, CR1, PUMP-001, B2.LUB.TPF), and anomaly types.
Anomaly types are: FUITES, CORROSION, FISSURES, SURCHAUFFE, DEFORMATION, USURE_ANORMALE, POSITION_INCORRECTE, OBSTRUCTION, ETIQUETAGE, PROPRETE.
If an anomaly or equipment type is mentioned, put its name in the 'text' field as well for keyword searching. For example, if the user says "fuites sur CR1", the output should have "CR1" in equipmentId and "fuites" in the text field.`,
  input: { schema: SearchQueryInputSchema },
  output: { schema: SearchQueryOutputSchema },
  prompt: 'Parse the following query: {{{query}}}',
});

const searchQueryParserFlow = ai.defineFlow(
  {
    name: 'searchQueryParserFlow',
    inputSchema: SearchQueryInputSchema,
    outputSchema: SearchQueryOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
