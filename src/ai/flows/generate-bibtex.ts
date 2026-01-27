'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as cheerio from 'cheerio';
import { promptTemplate } from './prompt_template';
import { GenerateBibtexInput } from './types';
import { tavilySearch, tavilySearchUrl } from '@/services/tavily-search';

// Basic web search tool (fallback)
const webSearch = ai.defineTool(
  {
    name: "webSearch",
    description: "Given a URL, access the web to find more information about it.",
    inputSchema: z.object({ url: z.string() }),
    outputSchema: z.string(),
  },
  async ({ url }) => {
    try {
      const res = await fetch(url);
      const html = await res.text();
      const $ = cheerio.load(html);
      $("script, style, noscript").remove();
      return $("article").length ? $("article").text() : $("body").text();
    } catch (error) {
      return `Error fetching URL: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
);

// Tavily web search tool
const tavilyWebSearch = ai.defineTool(
  {
    name: "tavilyWebSearch",
    description: "Search the web using Tavily API to find comprehensive information about a topic, URL, or query. Use this for finding citation metadata, paper details, author information, and publication data.",
    inputSchema: z.object({ 
      query: z.string().describe("The search query or URL to look up"),
    }),
    outputSchema: z.string(),
  },
  async ({ query }) => {
    try {
      // Check if query looks like a URL
      const isUrl = /^https?:\/\//i.test(query);
      
      const searchResult = isUrl 
        ? await tavilySearchUrl(query)
        : await tavilySearch(query);
      
      if (searchResult.error) {
        return `Tavily search error: ${searchResult.error}`;
      }
      
      if (searchResult.results.length === 0) {
        return `No results found for query: ${query}`;
      }
      
      // Format results as a readable string
      const formattedResults = searchResult.results
        .map((result, index) => {
          return `Result ${index + 1}:
Title: ${result.title}
URL: ${result.url}
Content: ${result.content.substring(0, 1000)}${result.content.length > 1000 ? '...' : ''}
---`;
        })
        .join('\n\n');
      
      return formattedResults;
    } catch (error) {
      return `Tavily search error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
);

// Output schema
const GenerateBibtexOutputSchema = z.object({
  bibtex: z.string(),
});
type GenerateBibtexOutput = { bibtex: string };

// Main function
export async function generateBibtex(input: GenerateBibtexInput): Promise<GenerateBibtexOutput> {
  const output = await ai.generate({
    prompt: promptTemplate(input),
    tools: [tavilyWebSearch, webSearch], // Tavily first, then fallback to basic web search
  });
  return { bibtex: output.text };
}
