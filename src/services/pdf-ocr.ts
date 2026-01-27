'use server';

import { Groq } from 'groq-sdk';
import { PDFIO } from 'pdf-io';

/**
 * OCR service for extracting text from PDF first page using Groq Vision API
 * Specifically extracts title and author names
 */

let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is not set');
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

/**
 * Check if an error is a rate limit or quota error
 */
function isRateLimitError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const statusCode = error.status || error.statusCode || error.response?.status;
  
  // Check for common rate limit/quota indicators
  return (
    statusCode === 429 || // Too Many Requests
    statusCode === 403 || // Forbidden (often used for quota exceeded)
    errorMessage.includes('rate limit') ||
    errorMessage.includes('quota') ||
    errorMessage.includes('too many requests') ||
    errorMessage.includes('limit exceeded') ||
    errorMessage.includes('429')
  );
}

/**
 * Extract text from PDF first and second pages using Groq Vision API
 * @param pdfInput - PDF file content as string (base64) or Buffer
 * @returns Extracted text from both pages
 */
export async function extractTextFromPdfPages(
  pdfInput: string | Buffer | Uint8Array
): Promise<{
  text: string;
  error?: string;
  rateLimitError?: boolean;
}> {
  try {
    // Convert PDF pages to images
    // PDFIO expects Buffer or string, convert Uint8Array to Buffer
    const pdfBuffer = pdfInput instanceof Uint8Array ? Buffer.from(pdfInput) : pdfInput;
    const extractor = new PDFIO(pdfBuffer);
    const images = await extractor.extractImages();
    
    if (!images || images.length === 0) {
      return {
        text: '',
        error: 'No images found in PDF',
      };
    }

    // Get first and second page images (if available)
    const pagesToProcess = images.slice(0, 2);
    const allTexts: string[] = [];
    
    try {
      const groq = getGroqClient();
      
      // Process each page
      for (let i = 0; i < pagesToProcess.length; i++) {
        const image = pagesToProcess[i];
        const imageBuffer = Buffer.from(image);
        const base64Image = imageBuffer.toString('base64');
        const dataUrl = `data:image/png;base64,${base64Image}`;
        
        const chatCompletion = await groq.chat.completions.create({
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Extract all text from this PDF page ${i + 1}. Return the full text content exactly as it appears.`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: dataUrl,
                  },
                },
              ],
            },
          ],
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          temperature: 0.1,
          max_completion_tokens: 2048,
          top_p: 1,
          stream: false,
        });

        const pageText = chatCompletion.choices[0]?.message?.content || '';
        if (pageText) {
          allTexts.push(`--- Page ${i + 1} ---\n${pageText}`);
        }
      }

      const combinedText = allTexts.join('\n\n');
      
      if (!combinedText) {
        return {
          text: '',
          error: 'No text extracted from PDF pages',
        };
      }

      return {
        text: combinedText,
      };
    } catch (groqError: any) {
      // Handle rate limit/quota errors
      if (isRateLimitError(groqError)) {
        console.warn('Groq API rate limit/quota exceeded');
        return {
          text: '',
          error: 'OCR service quota exceeded. Please try again later.',
          rateLimitError: true,
        };
      }
      
      // Re-throw other errors
      throw groqError;
    }
  } catch (error) {
    console.error('OCR extraction error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const rateLimitError = isRateLimitError(error);
    
    return {
      text: '',
      error: rateLimitError 
        ? 'OCR service quota exceeded. Please try again later.'
        : `OCR extraction failed: ${errorMessage}`,
      rateLimitError,
    };
  }
}

/**
 * Extract text from PDF first page using Groq Vision API (legacy function for backward compatibility)
 */
export async function extractTextFromPdfFirstPage(
  pdfInput: string | Buffer | Uint8Array
): Promise<{
  text: string;
  title?: string;
  authors?: string[];
  error?: string;
  rateLimitError?: boolean;
}> {
  const result = await extractTextFromPdfPages(pdfInput);
  
  if (result.error) {
    return {
      text: '',
      error: result.error,
      rateLimitError: result.rateLimitError,
    };
  }
  
  // Extract title and authors from OCR text
  const { title, authors } = extractTitleAndAuthors(result.text);
  
  return {
    text: result.text,
    title,
    authors,
  };
}

/**
 * Extract title and author names from OCR text
 * Uses heuristics to identify title (usually first few lines, larger text)
 * and authors (usually after title, before abstract/introduction)
 */
function extractTitleAndAuthors(text: string): {
  title?: string;
  authors?: string[];
} {
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) {
    return {};
  }

  // Title is usually in the first 1-3 lines, often the longest line
  // Skip very short lines (likely noise)
  const potentialTitles = lines
    .slice(0, 5)
    .filter(line => line.length > 10 && !line.match(/^\d+$/))
    .sort((a, b) => b.length - a.length);

  const title = potentialTitles[0] || lines[0];

  // Authors are usually after title, before abstract/introduction
  // Look for lines with common author patterns:
  // - Contains "and" or "&" or commas
  // - Contains email-like patterns
  // - Contains affiliation keywords (University, Institute, etc.)
  // - Usually 2-5 lines after title
  
  const authorKeywords = ['university', 'institute', 'college', 'department', '@', 'email'];
  const authorPatterns = [
    /\band\b/i,
    /&/,
    /,.*,/,
    /@/,
  ];

  let authors: string[] = [];
  const titleIndex = lines.findIndex(line => line === title);
  const searchStart = Math.max(0, titleIndex);
  const searchEnd = Math.min(lines.length, searchStart + 8);

  for (let i = searchStart; i < searchEnd; i++) {
    const line = lines[i];
    
    // Skip if it's the title
    if (line === title) continue;
    
    // Skip if it looks like a date or page number
    if (line.match(/^\d{4}$/) || line.match(/^page\s+\d+/i)) continue;
    
    // Check if line matches author patterns
    const hasAuthorPattern = authorPatterns.some(pattern => pattern.test(line));
    const hasAuthorKeyword = authorKeywords.some(keyword => 
      line.toLowerCase().includes(keyword)
    );
    
    if (hasAuthorPattern || hasAuthorKeyword) {
      // Try to extract author names from the line
      // Split by common delimiters
      const authorCandidates = line
        .split(/[,;&]|\band\b/i)
        .map(name => name.trim())
        .filter(name => name.length > 2 && name.length < 100);
      
      if (authorCandidates.length > 0) {
        authors.push(...authorCandidates);
      } else {
        authors.push(line);
      }
    }
    
    // Stop if we hit abstract/introduction keywords
    if (line.toLowerCase().match(/^(abstract|introduction|keywords|doi|http)/i)) {
      break;
    }
  }

  // Limit authors to reasonable number (usually 1-10)
  authors = authors.slice(0, 10);

  // Clean up author names
  authors = authors.map(author => {
    // Remove email addresses
    author = author.replace(/[^\s]+@[^\s]+/g, '').trim();
    // Remove common prefixes/suffixes
    author = author.replace(/^(dr\.?|prof\.?|mr\.?|mrs\.?|ms\.?)\s+/i, '').trim();
    // Remove extra whitespace
    author = author.replace(/\s+/g, ' ').trim();
    return author;
  }).filter(author => author.length > 2);

  return {
    title: title || undefined,
    authors: authors.length > 0 ? authors : undefined,
  };
}
