'use server';

/**
 * @fileOverview Generates a BibTeX entry from a DOI, URL, or PDF.
 *
 * - generateBibtex - A function that handles the BibTeX generation process.
 * - GenerateBibtexInput - The input type for the generateBibtex function.
 * - GenerateBibtexOutput - The return type for the generateBibtex function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBibtexInputSchema = z.object({
  input: z.string().describe('The DOI, URL, or PDF content to generate a BibTeX entry from.'),
  inputType: z.enum(['doi', 'url', 'pdf']).describe('The type of input provided.'),
  citationStyle: z
    .enum(['APA', 'IEEE', 'ACM', 'Chicago', 'MLA'])
    .describe('The desired citation style.'),
});
export type GenerateBibtexInput = z.infer<typeof GenerateBibtexInputSchema>;

const GenerateBibtexOutputSchema = z.object({
  bibtex: z.string().describe('The generated BibTeX entry.'),
});
export type GenerateBibtexOutput = z.infer<typeof GenerateBibtexOutputSchema>;

export async function generateBibtex(input: GenerateBibtexInput): Promise<GenerateBibtexOutput> {
  return generateBibtexFlow(input);
}

const generateBibtexPrompt = ai.definePrompt({
  name: 'generateBibtexPrompt',
  input: {schema: GenerateBibtexInputSchema},
  output: {schema: GenerateBibtexOutputSchema},
  prompt: `You are a citation generation assistant. Your task is to output BibTeX entries formatted according to the specified citation style. You will receive metadata (e.g., title, author, year, journal, etc.) and a target citation style.

      You must:
      1. Generate a valid BibTeX entry.
      2. Format fields according to the target citation style's conventions.
      3. Use consistent BibTeX keys based on author+year+short title.
      4. Support common types: @article, @techreport, @inproceedings, @book, @misc.

      Citation styles supported:
      - APA
      - IEEE
      - ACM
      - Chicago
      - MLA

      If data is missing, use placeholder values (e.g., {Unknown}). Keep BibTeX fields present even if they are empty.

      Input Type: {{{inputType}}}
      Citation Style: {{{citationStyle}}}
      Input: {{{input}}}

      Generate a BibTeX entry based on the provided input. Ensure the BibTeX entry is accurate and well-formatted.  
      Return ONLY a valid BibTeX entry.

  `,
});

const generateBibtexFlow = ai.defineFlow(
  {
    name: 'generateBibtexFlow',
    inputSchema: GenerateBibtexInputSchema,
    outputSchema: GenerateBibtexOutputSchema,
  },
  async input => {
    const {output} = await generateBibtexPrompt(input);
    return output!;
  }
);
