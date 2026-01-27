'use server';

import { tavily } from '@tavily/core';

/**
 * Tavily web search service
 * Provides enhanced web search capabilities for citation generation
 */

let tavilyClient: ReturnType<typeof tavily> | null = null;

function getTavilyClient(): ReturnType<typeof tavily> {
  if (!tavilyClient) {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      throw new Error('TAVILY_API_KEY environment variable is not set');
    }
    tavilyClient = tavily({ apiKey });
  }
  return tavilyClient;
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
 * Search the web using Tavily API
 * @param query - The search query
 * @returns Search results with content and URLs
 */
export async function tavilySearch(query: string): Promise<{
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
  }>;
  error?: string;
  rateLimitError?: boolean;
}> {
  try {
    const client = getTavilyClient();
    const response = await client.search(query, {
      searchDepth: 'basic',
      includeAnswer: true,
      includeRawContent: true as any, // Type workaround for Tavily SDK
      maxResults: 5,
    });

    return {
      results: (response.results || []).map((result: any) => ({
        title: result.title || '',
        url: result.url || '',
        content: result.content || result.rawContent || '',
        score: result.score || 0,
      })),
    };
  } catch (error: any) {
    console.error('Tavily search error:', error);
    
    if (isRateLimitError(error)) {
      return {
        results: [],
        error: 'Search service quota exceeded. Please try again later.',
        rateLimitError: true,
      };
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      results: [],
      error: `Tavily search failed: ${errorMessage}`,
    };
  }
}

/**
 * Search for a specific URL using Tavily extract API
 * @param url - The URL to extract information from
 * @returns Extracted content from the URL
 */
export async function tavilyExtractUrl(url: string): Promise<{
  title: string;
  url: string;
  content: string;
  error?: string;
  rateLimitError?: boolean;
}> {
  try {
    const client = getTavilyClient();
    // Use extract API for specific URLs - this gets raw content from the page
    const response = await client.extract([url]);

    if (response.failedResults && response.failedResults.length > 0) {
      // If extract failed, try search instead
      try {
      const searchResponse = await client.search(url, {
        searchDepth: 'advanced',
        includeAnswer: true,
        includeRawContent: true as any, // Type workaround for Tavily SDK
        maxResults: 1,
      });

        if (searchResponse.results && searchResponse.results.length > 0) {
          const result = searchResponse.results[0];
          return {
            title: result.title || '',
            url: result.url || url,
            content: result.content || result.rawContent || '',
          };
        }
      } catch (searchError: any) {
        if (isRateLimitError(searchError)) {
          return {
            title: '',
            url: url,
            content: '',
            error: 'Search service quota exceeded. Please try again later.',
            rateLimitError: true,
          };
        }
        // Continue to fallback error
      }

      return {
        title: '',
        url: url,
        content: '',
        error: 'Failed to extract content from URL',
      };
    }

    if (response.results && response.results.length > 0) {
      const result = response.results[0] as any;
      return {
        title: result.title || '',
        url: result.url || url,
        content: result.rawContent || result.content || '',
      };
    }

    return {
      title: '',
      url: url,
      content: '',
      error: 'No content extracted from URL',
    };
  } catch (error: any) {
    console.error('Tavily URL extract error:', error);
    
    if (isRateLimitError(error)) {
      return {
        title: '',
        url: url,
        content: '',
        error: 'Search service quota exceeded. Please try again later.',
        rateLimitError: true,
      };
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      title: '',
      url: url,
      content: '',
      error: `Tavily URL extraction failed: ${errorMessage}`,
    };
  }
}

/**
 * Search for a specific URL using Tavily (legacy function for backward compatibility)
 * @param url - The URL to search for
 * @returns Search results for the URL
 */
export async function tavilySearchUrl(url: string): Promise<{
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
  }>;
  error?: string;
}> {
  const extractResult = await tavilyExtractUrl(url);
  
  if (extractResult.error) {
    return {
      results: [],
      error: extractResult.error,
    };
  }

  return {
    results: [{
      title: extractResult.title,
      url: extractResult.url,
      content: extractResult.content,
      score: 1.0,
    }],
  };
}

/**
 * Crawl URL using Tavily crawl API
 * @param url - The URL to crawl
 * @returns Crawled content
 */
export async function tavilyCrawlUrl(url: string): Promise<{
  content: string;
  title: string;
  error?: string;
  rateLimitError?: boolean;
}> {
  try {
    const client = getTavilyClient();
    
    // Try crawl API first (if available)
    try {
      const crawlResponse = await (client as any).crawl?.(url, {
        instructions: 'Extract all text content, title, authors, publication details, and metadata from this page',
        maxDepth: 1,
      });
      
      if (crawlResponse?.results && crawlResponse.results.length > 0) {
        const result = crawlResponse.results[0];
        return {
          content: result.content || result.rawContent || '',
          title: result.title || '',
        };
      }
    } catch (crawlError) {
      // If crawl fails, fall back to extract
      console.warn('Tavily crawl not available, using extract instead');
    }
    
    // Fallback to extract API
    const extractResponse = await client.extract([url]);
    
    if (extractResponse.results && extractResponse.results.length > 0) {
      const result = extractResponse.results[0] as any;
      return {
        content: result.rawContent || result.content || '',
        title: result.title || '',
      };
    }

    return {
      content: '',
      title: '',
      error: 'No content extracted from URL',
    };
  } catch (error: any) {
    console.error('Tavily crawl/extract error:', error);
    
    if (isRateLimitError(error)) {
      return {
        content: '',
        title: '',
        error: 'Crawl service quota exceeded. Please try again later.',
        rateLimitError: true,
      };
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: '',
      title: '',
      error: `Tavily crawl failed: ${errorMessage}`,
    };
  }
}

/**
 * Search for DOI using Tavily web search
 * Searches for the DOI to gather additional information
 * @param doi - The DOI to search for
 * @returns Search results with DOI-related information
 */
export async function tavilySearchDoi(doi: string): Promise<{
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
  }>;
  error?: string;
  rateLimitError?: boolean;
}> {
  try {
    const client = getTavilyClient();
    // Search for the DOI - this will find papers, articles, and metadata
    const searchQuery = `DOI:${doi} OR "${doi}"`;
    const response = await client.search(searchQuery, {
      searchDepth: 'advanced',
      includeAnswer: true,
      includeRawContent: true as any, // Type workaround for Tavily SDK
      maxResults: 5,
    });

    return {
      results: (response.results || []).map((result: any) => ({
        title: result.title || '',
        url: result.url || '',
        content: result.content || result.rawContent || '',
        score: result.score || 0,
      })),
    };
  } catch (error: any) {
    console.error('Tavily DOI search error:', error);
    
    if (isRateLimitError(error)) {
      return {
        results: [],
        error: 'Search service quota exceeded. Please try again later.',
        rateLimitError: true,
      };
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      results: [],
      error: `Tavily DOI search failed: ${errorMessage}`,
    };
  }
}
