'use server';

/**
 * ArXiv API service for fetching paper metadata
 */

interface ArXivEntry {
  id: string;
  title: string;
  authors: string[];
  published: string;
  summary: string;
  doi?: string;
  journal?: string;
}

/**
 * Fetch paper metadata from ArXiv API
 * @param arxivId - ArXiv ID (e.g., "2210.03347" or "arXiv:2210.03347")
 * @returns Paper metadata
 */
export async function fetchArXivMetadata(arxivId: string): Promise<{
  data?: ArXivEntry;
  error?: string;
}> {
  try {
    // Clean ArXiv ID (remove "arXiv:" prefix if present)
    const cleanId = arxivId.replace(/^arxiv:/i, '').trim();
    
    // Use id_list parameter for direct ID lookup
    const url = `http://export.arxiv.org/api/query?id_list=${cleanId}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return {
        error: `ArXiv API returned status ${response.status}`,
      };
    }
    
    const xml = await response.text();
    
    // Parse ATOM XML structure
    // Find entry element (skip the feed title)
    const entryMatch = xml.match(/<entry[^>]*>([\s\S]*?)<\/entry>/);
    if (!entryMatch) {
      return {
        error: 'No entry found in ArXiv response',
      };
    }
    
    const entryXml = entryMatch[1];
    
    // Extract title (inside entry, skip feed title)
    const titleMatch = entryXml.match(/<title[^>]*>([\s\S]*?)<\/title>/);
    const title = titleMatch?.[1]?.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim() || '';
    
    // Extract authors (multiple <author><name> elements)
    const authorMatches = entryXml.matchAll(/<author[^>]*>[\s\S]*?<name[^>]*>(.*?)<\/name>[\s\S]*?<\/author>/g);
    const authors: string[] = Array.from(authorMatches, m => m[1]?.trim()).filter(Boolean);
    
    // Extract published date
    const publishedMatch = entryXml.match(/<published[^>]*>(.*?)<\/published>/);
    const published = publishedMatch?.[1]?.trim() || '';
    
    // Extract summary (abstract)
    const summaryMatch = entryXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);
    const summary = summaryMatch?.[1]?.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim() || '';
    
    // Extract journal reference (arxiv:journal_ref)
    const journalMatch = entryXml.match(/<arxiv:journal_ref[^>]*>(.*?)<\/arxiv:journal_ref>/);
    const journal = journalMatch?.[1]?.trim();
    
    // Extract DOI (if present in arxiv:doi)
    const doiMatch = entryXml.match(/<arxiv:doi[^>]*>(.*?)<\/arxiv:doi>/);
    const doi = doiMatch?.[1]?.trim();
    
    // Extract ArXiv ID from entry id
    const idMatch = entryXml.match(/<id[^>]*>(.*?)<\/id>/);
    const arxivUrl = idMatch?.[1]?.trim() || '';
    const extractedId = arxivUrl.match(/arxiv\.org\/abs\/(.+)$/)?.[1] || cleanId;
    
    if (!title || title.includes('ArXiv Query:')) {
      return {
        error: 'No paper found with the given ArXiv ID',
      };
    }
    
    return {
      data: {
        id: extractedId,
        title,
        authors: authors.length > 0 ? authors : ['Unknown Author'],
        published,
        summary,
        doi,
        journal,
      },
    };
  } catch (error) {
    console.error('ArXiv API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      error: `ArXiv API failed: ${errorMessage}`,
    };
  }
}

/**
 * Check if a URL is an ArXiv URL and extract ID
 */
export async function extractArXivId(url: string): Promise<string | null> {
  const patterns = [
    /arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5})/i,
    /arxiv[:\s]+(\d{4}\.\d{4,5})/i,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}
