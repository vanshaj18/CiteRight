'use server';

import OpenAI from 'openai';
import { CitationStyle } from '@/ai/flows/types';
import { CitationData, getCitationTemplate } from './citation-templates';

/**
 * OpenAI service for citation generation
 */

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Extract citation data from text using OpenAI
 * @param text - Text content (from OCR, web crawl, etc.)
 * @param citationStyle - Target citation style
 * @returns Extracted citation data
 */
export async function extractCitationData(
  text: string,
  citationStyle: CitationStyle
): Promise<{ data: CitationData; error?: string }> {
  try {
    const client = getOpenAIClient();
    
    const systemPrompt = `You are a citation extraction expert. Extract citation metadata from the provided text and return it as a JSON object with the following structure:
{
  "title": "string",
  "authors": ["string"],
  "year": "string (optional)",
  "journal": "string (optional)",
  "volume": "string (optional)",
  "issue": "string (optional)",
  "pages": "string (optional)",
  "doi": "string (optional)",
  "url": "string (optional)",
  "publisher": "string (optional)",
  "booktitle": "string (optional)",
  "institution": "string (optional)",
  "type": "article|inproceedings|book|techreport|misc"
}

Extract as much information as possible. If information is missing, omit the field (don't use null or empty strings).
Return ONLY valid JSON, no additional text.`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract citation metadata from this text:\n\n${text.substring(0, 8000)}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        data: { title: '', authors: [] },
        error: 'No response from OpenAI',
      };
    }

    const citationData = JSON.parse(content) as CitationData;
    return { data: citationData };
  } catch (error) {
    console.error('OpenAI extraction error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      data: { title: '', authors: [] },
      error: `Failed to extract citation data: ${errorMessage}`,
    };
  }
}

/**
 * Generate BibTeX citation from citation data and style
 * @param citationData - Extracted citation data
 * @param citationStyle - Target citation style
 * @returns BibTeX citation string
 */
export async function generateBibtexFromData(
  citationData: CitationData,
  citationStyle: CitationStyle
): Promise<string> {
  const template = await getCitationTemplate(citationStyle);
  return await template(citationData);
}
