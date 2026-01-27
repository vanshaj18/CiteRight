import { GenerateBibtexInput } from "./types";


const promptTemplate = (input: GenerateBibtexInput) => `You are a citation generation assistant. Your task is to output BibTeX entries formatted according to the specified citation style. 
  You will receive metadata (e.g., title, author, year, journal, etc.) and a target citation style.

      You must:
      1. Generate a valid BibTeX entry.
      2. Format fields according to the target citation style's conventions.
      3. Use consistent BibTeX keys based on author+year+short title.
      4. Support common types: @article, @techreport, @inproceedings, @book, @misc.

      Citation styles supported:
      - APA
      - IEEE
      - ACM
      - Chicago
      - MLA

      If data is missing, use placeholder values (e.g., {Unknown}). Keep BibTeX fields present even if they are empty.

      Input Type: ${input.inputType}
      Citation Style: ${input.citationStyle}
      Input: ${input.input}
      
      Metadata: 
      Authors : ${input.metaData.authors}
      Title: ${input.metaData.title}
      ${input.metaData.webSearchContent ? `\n      Additional Web Search Content:\n      ${input.metaData.webSearchContent.substring(0, 2000)}${input.metaData.webSearchContent.length > 2000 ? '...' : ''}` : ''}

      Generate a BibTeX entry based on the provided input. Use the web search content to extract additional metadata like publication date, journal name, publisher, page numbers, etc. if not already provided in the metadata.
      Ensure the BibTeX entry is accurate and well-formatted.  
      Return ONLY a valid BibTeX entry.
  `;

export { promptTemplate };