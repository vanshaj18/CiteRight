'use server';

import { generateBibtex, type GenerateBibtexInput } from '@/ai/flows/generate-bibtex';

export async function getBibtex(input: GenerateBibtexInput): Promise<{ bibtex?: string; error?: string }> {
  try {
    const result = await generateBibtex(input);
    if (result.bibtex) {
      return { bibtex: result.bibtex };
    } else {
      return { error: 'Failed to generate BibTeX. The result was empty.' };
    }
  } catch (e) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { error: `An error occurred during BibTeX generation: ${errorMessage}` };
  }
}
