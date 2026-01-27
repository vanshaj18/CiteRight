'use server';

import { CitationStyle, InputType } from '@/ai/flows/types';
import { checkRateLimit, recordUsage } from '@/services/rate-limiter';
import { generateCitation, CitationRequest } from '@/services/citation-generator';

/**
 * Single point of entry for frontend citation generation
 */
export async function getBibtex({ 
  inputType, 
  citationStyle, 
  input
}: {
  inputType: string;
  citationStyle: string;
  input: string;
}): Promise<{ bibtex?: string; error?: string }> {
  try {
    // Check rate limits before processing
    // Estimate tokens: ~1000 tokens for extraction + ~500 tokens for generation = ~1500 tokens
    const estimatedTokens = 1500;
    const rateLimitCheck = await checkRateLimit(estimatedTokens);
    
    if (!rateLimitCheck.allowed) {
      return {
        error: rateLimitCheck.reason || 'Rate limit exceeded. Please try again later.',
      };
    }
    
    // Generate citation using unified service
    const request: CitationRequest = {
      inputType: inputType as InputType,
      citationStyle: citationStyle as CitationStyle,
      input,
    };
    
    const result = await generateCitation(request);
    
    // Record usage
    await recordUsage(estimatedTokens);
    
    return result;
    
  } catch (e) {
    console.error('Citation generation error:', e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    
    // Check if it's a rate limit error from the API
    if (errorMessage.includes('rate limit') || errorMessage.includes('quota') || errorMessage.includes('429')) {
      return { error: 'API rate limit exceeded. Please try again in a few minutes.' };
    }
    
    return { error: `An error occurred during BibTeX generation: ${errorMessage}` };
  }
}
