'use server';

import { GetDocumentMetadataInput } from "../ai/flows/types";
import { PDFIO } from "pdf-io";
import { extractTextFromPdfFirstPage } from "./pdf-ocr";
import { tavilySearchDoi, tavilyExtractUrl } from "./tavily-search";
/**
 * @fileOverview A service to fetch document metadata.
 *
 * - getDocumentMetadata - A function that fetches metadata for a document.
 * - extractPdfMetadata - A function that extracts metadata from PDF using OCR.
 * - extractUrlMetadata - A function that extracts metadata from URLs using Tavily.
 */

interface CrossRefAuthor {
  given?: string;
  family?: string;
  name?: string;
}

/**
 * Fetches metadata for a document.
 * If the input is a DOI, it uses the CrossRef API and Tavily web search.
 * If the input is a URL, it uses Tavily extract API.
 * @param {GetDocumentMetadataInput} input - The input for fetching metadata.
 * @returns {Promise<object>} A promise that resolves to the document metadata.
 */
export async function getDocumentMetadata(input: GetDocumentMetadataInput): Promise<{ title: string; authors: string[]; date: string; publication: string; webSearchContent?: string; }> {
  console.log(`Fetching metadata for ${input.inputType}: ${input.input.substring(0, 100)}...`);

  if (input.inputType === 'doi') {
    try {
      // First, get metadata from CrossRef API
      const url = `https://api.crossref.org/works/${encodeURIComponent(input.input)}`
      const response = await fetch(url);
      console.log(response);
      
      let title = 'Unknown Title';
      let authors: string[] = ['Unknown Author'];
      let date = 'Unknown Date';
      let publication = 'Unknown Publication';
      let webSearchContent = '';

      if (response.ok) {
        const data = await response.json();
        const work = data.message;

        title = work.title?.[0] || 'Unknown Title';
        
        authors = (work.author || []).map((auth: CrossRefAuthor) => {
          if (auth.given && auth.family) {
            return `${auth.given} ${auth.family}`;
          }
          if (auth.name) {
            return auth.name;
          }
          return 'Unknown Author';
        });

        const dateParts = work['published-print']?.['date-parts']?.[0] || work['published-online']?.['date-parts']?.[0] || [];
        date = dateParts.join('-') || 'Unknown Date';

        publication = work['container-title']?.[0] || 'Unknown Publication';
      }

      // Also perform web search using Tavily to gather additional information
      try {
        const tavilyResults = await tavilySearchDoi(input.input);
        
        // Handle rate limit errors gracefully - continue with CrossRef data only
        if (tavilyResults.rateLimitError) {
          console.warn('Tavily quota exceeded, continuing with CrossRef data only');
        } else if (tavilyResults.results && tavilyResults.results.length > 0) {
          // Combine all search results content
          webSearchContent = tavilyResults.results
            .map(result => `${result.title}\n${result.content}`)
            .join('\n\n---\n\n');
          
          // If CrossRef didn't provide title, try to extract from web search
          if (title === 'Unknown Title' && tavilyResults.results[0].title) {
            title = tavilyResults.results[0].title;
          }
        }
      } catch (tavilyError) {
        console.warn('Tavily DOI search failed, continuing with CrossRef data only:', tavilyError);
      }

      return { title, authors, date, publication, webSearchContent };

    } catch (error) {
      console.error('Error fetching from CrossRef:', error);
      // Fallback: try Tavily search only
      try {
        const tavilyResults = await tavilySearchDoi(input.input);
        
        // If rate limited, return error indication
        if (tavilyResults.rateLimitError) {
          return {
            title: 'Could not fetch title',
            authors: ['Unknown Author'],
            date: 'Unknown Date',
            publication: 'Unknown Publication',
            webSearchContent: '', // Rate limited, no additional content
          };
        }
        
        if (tavilyResults.results && tavilyResults.results.length > 0) {
          const firstResult = tavilyResults.results[0];
          return {
            title: firstResult.title || 'Could not fetch title',
            authors: ['Unknown Author'],
            date: 'Unknown Date',
            publication: 'Unknown Publication',
            webSearchContent: tavilyResults.results.map(r => `${r.title}\n${r.content}`).join('\n\n---\n\n'),
          };
        }
      } catch (tavilyError) {
        console.error('Both CrossRef and Tavily failed:', tavilyError);
      }
      
      return {
        title: 'Could not fetch title',
        authors: ['Unknown Author'],
        date: 'Unknown Date',
        publication: 'Unknown Publication',
      };
    }
  }

  // For URL, use Tavily extract API
  if (input.inputType === 'url') {
    try {
      const extractResult = await tavilyExtractUrl(input.input);
      
      // Handle rate limit errors - return empty but don't fail completely
      if (extractResult.rateLimitError) {
        console.warn('Tavily quota exceeded for URL extraction');
        return {
          title: '',
          authors: [],
          date: '',
          publication: '',
          webSearchContent: '', // Rate limited, will rely on AI to extract from URL directly
        };
      }
      
      if (extractResult.error) {
        return {
          title: '',
          authors: [],
          date: '',
          publication: '',
          webSearchContent: '',
        };
      }

      return {
        title: extractResult.title || '',
        authors: [], // Authors will be extracted by AI from content
        date: '',
        publication: '',
        webSearchContent: extractResult.content,
      };
    } catch (error) {
      console.error('Error extracting URL metadata:', error);
      return {
        title: '',
        authors: [],
        date: '',
        publication: '',
        webSearchContent: '',
      };
    }
  }

  // Fallback for other types
  return {
    title: 'Example Paper Title',
    authors: ['Author One', 'Author Two'],
    date: '2023-01-01',
    publication: 'Journal of Examples',
  };
}

/**
 * Extract metadata from PDF first page using OCR
 * Specifically extracts title and author names
 * @param {GetDocumentMetadataInput} input - The input containing PDF content
 * @returns {Promise<object>} A promise that resolves to the extracted metadata
 */
export async function extractPdfMetadata(input: GetDocumentMetadataInput): Promise<{ 
  title: string; 
  authors: string[]; 
  error?: string;
  rateLimitError?: boolean;
}> {
  if (input.inputType !== 'pdf') {
    return {
      title: '',
      authors: [],
      error: 'Input type must be PDF',
    };
  }

  try {
    // Convert PDF input to appropriate format
    let pdfContent: string | Buffer | Uint8Array;
    
    if (typeof input.input === 'string') {
      // If it's a base64 string, decode it
      if (input.input.startsWith('data:')) {
        const base64Data = input.input.split(',')[1];
        pdfContent = Buffer.from(base64Data, 'base64');
      } else {
        // Assume it's already a base64 string without data URL prefix
        pdfContent = Buffer.from(input.input, 'base64');
      }
    } else if (Buffer.isBuffer(input.input)) {
      pdfContent = input.input;
    } else if (input.input && typeof input.input === 'object' && 'byteLength' in input.input) {
      // Handle Uint8Array
      pdfContent = Buffer.from(input.input as Uint8Array);
    } else {
      return {
        title: '',
        authors: [],
        error: 'Unsupported PDF input format',
      };
    }

    const ocrResult = await extractTextFromPdfFirstPage(pdfContent);
    
    if (ocrResult.error) {
      return {
        title: '',
        authors: [],
        error: ocrResult.error,
        rateLimitError: ocrResult.rateLimitError,
      };
    }

    return {
      title: ocrResult.title || '',
      authors: ocrResult.authors || [],
    };
  } catch (error) {
    console.error('Error extracting PDF metadata:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      title: '',
      authors: [],
      error: `Failed to extract PDF metadata: ${errorMessage}`,
    };
  }
}

// parse pdf to image
export async function parsePdfToFirstImage(input: GetDocumentMetadataInput): Promise<{image: Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>; error?: string | ""}>{
  try {
    // let pdfSource: string | Buffer;
    // if (typeof input.input === 'string' || Buffer.isBuffer(input.input)) {
    //   pdfSource = input.input;
    // } else if (input.input instanceof Uint8Array) {
    //   pdfSource = Buffer.from(input.input);
    // } else {
    //   throw new Error('Unsupported input type for PDFIO');
    // }
    const extractor = new PDFIO(input.input)
    // extract images from it
    const images = await extractor.extractImages()
    if (images && images.length > 0) {
      const firstImage = images[0]
      return { 
        image: firstImage, error: ""
      }
    } else {
      return {
        image: new Uint8Array([]),
        error: ""
      }
    }
  }catch(error){
    return { 
      image: new Uint8Array([]),
      error: 'Failed to convert PDF to image'
    }
  }
}