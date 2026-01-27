'use server';

/**
 * Citation style templates for BibTeX generation
 * These templates define the structure and formatting for each citation style
 */

export interface CitationData {
  title: string;
  authors: string[];
  year?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  publisher?: string;
  booktitle?: string;
  institution?: string;
  type?: 'article' | 'inproceedings' | 'book' | 'techreport' | 'misc';
}

/**
 * Generate BibTeX key from citation data
 */
function generateBibtexKey(data: CitationData): string {
  if (!data.authors || data.authors.length === 0) {
    return 'unknown';
  }
  
  const firstAuthor = data.authors[0].toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 10);
  const year = data.year || 'unknown';
  const shortTitle = (data.title || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 10);
  
  return `${firstAuthor}${year}${shortTitle}`;
}

/**
 * Format authors according to BibTeX format
 */
function formatAuthors(authors: string[]): string {
  if (!authors || authors.length === 0) {
    return 'Unknown Author';
  }
  
  return authors.join(' and ');
}

/**
 * APA Style Template
 */
export async function generateAPACitation(data: CitationData): Promise<string> {
  const key = generateBibtexKey(data);
  const authors = formatAuthors(data.authors);
  const type = data.type || 'article';
  
  let bibtex = `@${type}{${key},\n`;
  bibtex += `  author = {${authors}},\n`;
  bibtex += `  title = {${data.title || 'Unknown Title'}},\n`;
  
  if (data.year) bibtex += `  year = {${data.year}},\n`;
  if (data.journal) bibtex += `  journal = {${data.journal}},\n`;
  if (data.volume) bibtex += `  volume = {${data.volume}},\n`;
  if (data.issue) bibtex += `  number = {${data.issue}},\n`;
  if (data.pages) bibtex += `  pages = {${data.pages}},\n`;
  if (data.doi) bibtex += `  doi = {${data.doi}},\n`;
  if (data.url) bibtex += `  url = {${data.url}},\n`;
  if (data.publisher) bibtex += `  publisher = {${data.publisher}},\n`;
  if (data.booktitle) bibtex += `  booktitle = {${data.booktitle}},\n`;
  if (data.institution) bibtex += `  institution = {${data.institution}},\n`;
  
  bibtex += `}`;
  return bibtex;
}

/**
 * IEEE Style Template
 */
export async function generateIEEECitation(data: CitationData): Promise<string> {
  const key = generateBibtexKey(data);
  const authors = formatAuthors(data.authors);
  const type = data.type || 'article';
  
  let bibtex = `@${type}{${key},\n`;
  bibtex += `  author = {${authors}},\n`;
  bibtex += `  title = {${data.title || 'Unknown Title'}},\n`;
  
  if (data.journal) bibtex += `  journal = {${data.journal}},\n`;
  if (data.year) bibtex += `  year = {${data.year}},\n`;
  if (data.volume) bibtex += `  volume = {${data.volume}},\n`;
  if (data.issue) bibtex += `  number = {${data.issue}},\n`;
  if (data.pages) bibtex += `  pages = {${data.pages}},\n`;
  if (data.doi) bibtex += `  doi = {${data.doi}},\n`;
  if (data.publisher) bibtex += `  publisher = {${data.publisher}},\n`;
  if (data.booktitle) bibtex += `  booktitle = {${data.booktitle}},\n`;
  
  bibtex += `}`;
  return bibtex;
}

/**
 * ACM Style Template
 */
export async function generateACMCitation(data: CitationData): Promise<string> {
  const key = generateBibtexKey(data);
  const authors = formatAuthors(data.authors);
  const type = data.type || 'article';
  
  let bibtex = `@${type}{${key},\n`;
  bibtex += `  author = {${authors}},\n`;
  bibtex += `  title = {${data.title || 'Unknown Title'}},\n`;
  
  if (data.year) bibtex += `  year = {${data.year}},\n`;
  if (data.journal) bibtex += `  journal = {${data.journal}},\n`;
  if (data.volume) bibtex += `  volume = {${data.volume}},\n`;
  if (data.issue) bibtex += `  number = {${data.issue}},\n`;
  if (data.pages) bibtex += `  pages = {${data.pages}},\n`;
  if (data.doi) bibtex += `  doi = {${data.doi}},\n`;
  if (data.publisher) bibtex += `  publisher = {${data.publisher}},\n`;
  if (data.booktitle) bibtex += `  booktitle = {${data.booktitle}},\n`;
  
  bibtex += `}`;
  return bibtex;
}

/**
 * Chicago Style Template
 */
export async function generateChicagoCitation(data: CitationData): Promise<string> {
  const key = generateBibtexKey(data);
  const authors = formatAuthors(data.authors);
  const type = data.type || 'article';
  
  let bibtex = `@${type}{${key},\n`;
  bibtex += `  author = {${authors}},\n`;
  bibtex += `  title = {${data.title || 'Unknown Title'}},\n`;
  
  if (data.journal) bibtex += `  journal = {${data.journal}},\n`;
  if (data.year) bibtex += `  year = {${data.year}},\n`;
  if (data.volume) bibtex += `  volume = {${data.volume}},\n`;
  if (data.issue) bibtex += `  number = {${data.issue}},\n`;
  if (data.pages) bibtex += `  pages = {${data.pages}},\n`;
  if (data.doi) bibtex += `  doi = {${data.doi}},\n`;
  if (data.publisher) bibtex += `  publisher = {${data.publisher}},\n`;
  if (data.booktitle) bibtex += `  booktitle = {${data.booktitle}},\n`;
  
  bibtex += `}`;
  return bibtex;
}

/**
 * MLA Style Template
 */
export async function generateMLACitation(data: CitationData): Promise<string>   {
  const key = generateBibtexKey(data);
  const authors = formatAuthors(data.authors);
  const type = data.type || 'article';
  
  let bibtex = `@${type}{${key},\n`;
  bibtex += `  author = {${authors}},\n`;
  bibtex += `  title = {${data.title || 'Unknown Title'}},\n`;
  
  if (data.journal) bibtex += `  journal = {${data.journal}},\n`;
  if (data.year) bibtex += `  year = {${data.year}},\n`;
  if (data.volume) bibtex += `  volume = {${data.volume}},\n`;
  if (data.issue) bibtex += `  number = {${data.issue}},\n`;
  if (data.pages) bibtex += `  pages = {${data.pages}},\n`;
  if (data.doi) bibtex += `  doi = {${data.doi}},\n`;
  if (data.publisher) bibtex += `  publisher = {${data.publisher}},\n`;
  
  bibtex += `}`;
  return bibtex;
}

/**
 * Get citation template function based on style
 */
export async function getCitationTemplate(
  style: string
): Promise<(data: CitationData) => Promise<string>> {
  const styleMap: Record<string, (data: CitationData) => Promise<string>> = {
    'APA': generateAPACitation,
    'IEEE': generateIEEECitation,
    'ACM': generateACMCitation,
    'Chicago': generateChicagoCitation,
    'MLA': generateMLACitation,
  };

  // Default to APA citation template if unknown style
  return styleMap[style] || generateAPACitation;
}
