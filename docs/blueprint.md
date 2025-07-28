# **App Name**: CiteRight

## Core Features:

- Input Type Selection: Allows the user to select DOI, URL or PDF as an input source to generate the citation.
- Input Field: Provides either a text field for DOI/URL input, or a file upload component for PDFs.
- Metadata Fetch: Fetches metadata using the DOI, URL or PDF using a "Fetch Metadata" button; this button will display a loading spinner when in progress.
- AI Citation Generation: Utilizes Vertex AI as a tool, connecting the user-provided input to VertexAI and then parsing the output as a valid BibTex entry, ensuring citation accuracy.
- BibTeX Output: Displays fetched BibTeX output in a styled code block, along with a "Copy to Clipboard" button.
- Citation Style Selection: Provides a dropdown to select citation styles (APA, IEEE, ACM, Chicago, MLA).

## Style Guidelines:

- Primary color: Soft white (#E6E8E6) to evoke trust and reliability, aligning with academic rigor. This primary color can be used for the "Fetch Metadata" button.
- Background color: Dark, #161032 to maintain a calm, professional interface.
- Accent color: Carrot orange (#F49D37) to highlight interactive elements like the 'Copy to Clipboard' button.
- Body and headline font: 'Inter' (sans-serif) for a clean, modern, neutral style suitable for all text.
- Simple, outlined icons from a library like FontAwesome to represent different input types (DOI, URL, PDF).
- Responsive design with clear sections for input, style selection, and output, using TailwindCSS grid and flexbox utilities.
- Subtle animations for loading states and button interactions, such as a fade-in effect for the BibTeX output and a progress spinner on the "Fetch Metadata" button.