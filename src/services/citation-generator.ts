'use server';

import { CitationStyle } from '@/ai/flows/types';
import { extractCitationData } from './openai-service';
import { tavilyCrawlUrl } from './tavily-search';
import { fetchArXivMetadata, extractArXivId } from './arxiv-api';
import { extractTextFromPdfPages } from './pdf-ocr';
import { getDocumentMetadata } from './metadata-fetches';
import { getCitationTemplate } from './citation-templates';

/**
 * Unified citation generation service
 * Single point of entry for all citation generation
 */

export interface CitationRequest {
  inputType: 'doi' | 'url' | 'pdf';
  citationStyle: CitationStyle;
  input: string;
}

export interface CitationResponse {
  bibtex?: string;
  error?: string;
}

/**
 * Generate citation for DOI input
 */
async function generateDoiCitation(
  doi: string,
  citationStyle: CitationStyle
): Promise<CitationResponse> {
  try {
    const doiUrl = `https://doi.org/${doi}`;
    
    // Run CrossRef, Tavily crawl, and template preparation in parallel
    const [crossrefData, crawlResult, template] = await Promise.all([
      // 1. Fetch metadata from CrossRef
      getDocumentMetadata({
        input: doi,
        inputType: 'doi',
      }),
      // 2. Use Tavily crawl to get additional content (don't fail if this errors)
      tavilyCrawlUrl(doiUrl).catch(error => {
        console.warn('Tavily crawl failed for DOI, continuing with CrossRef data:', error);
        return { content: '', title: '', error: 'Crawl failed' };
      }),
      // 3. Prepare template in parallel
      getCitationTemplate(citationStyle),
    ]);
    
    // Combine data for OpenAI extraction
    const crawledContent = crawlResult.error ? '' : crawlResult.content;
    const combinedText = `
Title: ${crossrefData.title}
Authors: ${crossrefData.authors.join(', ')}
Year: ${crossrefData.date}
Journal: ${crossrefData.publication}
DOI: ${doi}
${crawledContent ? `\nAdditional Content:\n${crawledContent}` : ''}
    `.trim();
    
    // Extract citation data using OpenAI and generate BibTeX in parallel
    const [extractionResult] = await Promise.all([
      extractCitationData(combinedText, citationStyle),
    ]);
    
    if (extractionResult.error) {
      return { error: extractionResult.error };
    }
    
    // Generate BibTeX using the prepared template
    const bibtex = await template(extractionResult.data);
    
    return { bibtex };
  } catch (error) {
    console.error('DOI citation generation error:', error);
    return {
      error: `Failed to generate citation: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Generate citation for URL input
 */
async function generateUrlCitation(
  url: string,
  citationStyle: CitationStyle
): Promise<CitationResponse> {
  try {
    // Check if it's an ArXiv URL, prepare template, and start Tavily crawl in parallel
    const [arxivId, template, crawlResult] = await Promise.all([
      extractArXivId(url),
      getCitationTemplate(citationStyle),
      tavilyCrawlUrl(url).catch(error => {
        console.warn('Tavily crawl failed, will try ArXiv if applicable:', error);
        return { content: '', title: '', error: 'Crawl failed' };
      }),
    ]);
    
    if (arxivId) {
      // Use ArXiv API (already have template ready)
      const arxivResult = await fetchArXivMetadata(arxivId);
      
      if (arxivResult.data) {
        const arxivText = `
        Title: ${arxivResult.data.title}
        Authors: ${arxivResult.data.authors.join(', ')}
        Published: ${arxivResult.data.published}
        Summary: ${arxivResult.data.summary}
        DOI: ${arxivResult.data.doi || ''}
        Journal: ${arxivResult.data.journal || ''}
                `.trim();
        
        const extractionResult = await extractCitationData(arxivText, citationStyle);
        
        if (extractionResult.error) {
          return { error: extractionResult.error };
        }
        
        const bibtex = await template(extractionResult.data);
        return { bibtex };
      }
    }
    
    // Use Tavily crawl result (already fetched in parallel)
    if (crawlResult.error) {
      return { error: crawlResult.error };
    }
    
    // Extract citation data using OpenAI
    const extractionResult = await extractCitationData(crawlResult.content, citationStyle);
    
    if (extractionResult.error) {
      return { error: extractionResult.error };
    }
    
    // Generate BibTeX using the prepared template
    const bibtex = await template(extractionResult.data);
    
    return { bibtex };
  } catch (error) {
    console.error('URL citation generation error:', error);
    return {
      error: `Failed to generate citation: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Generate citation for PDF input
 */
async function generatePdfCitation(
  pdfInput: string | Buffer | Uint8Array,
  citationStyle: CitationStyle
): Promise<CitationResponse> {
  try {
    // Extract text from PDF and prepare template in parallel
    const [ocrResult, template] = await Promise.all([
      extractTextFromPdfPages(pdfInput),
      getCitationTemplate(citationStyle),
    ]);
    
    if (ocrResult.error) {
      return { error: ocrResult.error };
    }
    
    // Use OpenAI to extract citation data from OCR output
    const extractionResult = await extractCitationData(ocrResult.text, citationStyle);
    
    if (extractionResult.error) {
      return { error: extractionResult.error };
    }
    
    // Generate BibTeX using the prepared template
    const bibtex = await template(extractionResult.data);
    
    return { bibtex };
  } catch (error) {
    console.error('PDF citation generation error:', error);
    return {
      error: `Failed to generate citation: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Main citation generation function - single point of entry
 */
export async function generateCitation(
  request: CitationRequest
): Promise<CitationResponse> {
  try {
    switch (request.inputType) {
      case 'doi':
        return await generateDoiCitation(request.input, request.citationStyle);
      
      case 'url':
        return await generateUrlCitation(request.input, request.citationStyle);
      
      case 'pdf':
        // Convert base64 string to Buffer if needed
        let pdfBuffer: Buffer | Uint8Array;
        if (typeof request.input === 'string') {
          if (request.input.startsWith('data:')) {
            const base64Data = request.input.split(',')[1];
            pdfBuffer = Buffer.from(base64Data, 'base64');
          } else {
            pdfBuffer = Buffer.from(request.input, 'base64');
          }
        } else {
          pdfBuffer = request.input;
        }
        return await generatePdfCitation(pdfBuffer, request.citationStyle);
      
      default:
        return { error: `Unsupported input type: ${request.inputType}` };
    }
  } catch (error) {
    console.error('Citation generation error:', error);
    return {
      error: `Failed to generate citation: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
