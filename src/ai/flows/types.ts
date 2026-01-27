// 'use server';

const inputTypes = ['doi', 'url', 'pdf'] as const;
const citationStyles = ['APA', 'IEEE', 'ACM', 'Chicago', 'MLA'] as const;
export interface metaDataFields{
    title: string,
    authors: string[],
    webSearchContent?: string, // Additional content from web search (Tavily)
} 

export type InputType = typeof inputTypes[number];
export type CitationStyle = typeof citationStyles[number];

export interface GetDocumentMetadataInput {
    input: string ;
    inputType: InputType;
}

export interface GenerateBibtexInput {
    input: string 
    inputType: InputType;
    citationStyle: CitationStyle;
    metaData: metaDataFields;
}

export const metaData: metaDataFields = {
      title: "", 
      authors: []
    } ;