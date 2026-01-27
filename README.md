# CiteRight

CiteRight is a powerful and intuitive application designed to make generating academic citations effortless. Built for students, researchers, and professionals, CiteRight simplifies the creation of accurate citations in various styles, saving you time and ensuring your work is correctly referenced.

---

## 🚀 Key Features

- **Versatile Input Options**  
    Generate citations from a DOI, a URL, or by directly uploading a PDF file.

- **Multiple Citation Styles**  
    Supports APA, IEEE, ACM, Chicago, MLA, and more.

- **AI-Powered Accuracy**  
    Uses Google Gemini AI with Tavily web search to fetch comprehensive metadata and construct precise, well-formatted BibTeX entries.

- **Advanced PDF Processing**  
    Uses Groq Vision API for OCR to extract title and author information from PDF first pages.

- **Intelligent Web Search**  
    Tavily integration provides enhanced web search for DOI and URL inputs, gathering additional metadata for more accurate citations.

- **Smart Rate Limiting**  
    Built-in rate limiting prevents API quota exhaustion with clear error messages.

- **User-Friendly Interface**  
    Clean, modern UI for a seamless experience.

- **One-Click Copy**  
    Instantly copy the generated BibTeX citation.

---

## 🖼️ Example

### 1. Select Input Type

![Select Input Type](/public/homepage.png)

Choose between DOI, URL, or PDF as your source.

---

### 2. Enter Your Source

![Enter Source](/public/enter-source.png)

Paste the DOI/URL or upload your PDF document.

---

### 3. Choose Citation Style

![Choose Style](/public/choose-style.png)

Select the desired citation style from the dropdown.

---

### 4. Generate Citation & Copy BibTeX Output

![Generate Citation](/public/generate-citation.png)

Click **Generate Citation** to let the AI work its magic. Once done, the formatted BibTeX output will appear, ready for you to copy and use.


```bibtex
@article{smith2023deep,
    title={Deep Learning for Citation Generation},
    author={Smith, John and Doe, Jane},
    journal={Journal of AI Research},
    year={2023},
    doi={10.1234/jair.2023.5678}
}
```

---

## 🛠️ Technology Stack

- **Framework**: Next.js 15 with React 18
- **AI/ML**: 
  - Google Gemini 2.0 Flash (via Genkit) for citation generation
  - Groq Vision API (Llama 4 Scout) for PDF OCR
  - Tavily API for web search and content extraction
- **Styling**: Tailwind CSS with shadcn/ui components
- **Type Safety**: TypeScript

---

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CiteRight
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory with the following variables:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   GROQ_API_KEY=your_groq_api_key_here
   TAVILY_API_KEY=your_tavily_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:9002`

5. **Run Genkit development server** (optional, for AI flow testing)
   ```bash
   npm run genkit:dev
   ```

---

## 🔑 API Keys Required

### Google Gemini API
- Used for AI-powered citation generation
- Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Groq API
- Used for OCR extraction from PDF files
- Get your API key from [Groq Console](https://console.groq.com/)

### Tavily API
- Used for enhanced web search and content extraction
- Get your API key from [Tavily](https://tavily.com/)

---

## 📊 Rate Limits

The application implements rate limiting to prevent API quota exhaustion:

- **Requests**: 30 per minute, 1,000 per day
- **Tokens**: 30,000 per minute, 500,000 per day

Rate limit errors are handled gracefully with user-friendly error messages and automatic fallbacks.

---

## 🎯 How It Works

### DOI Input
1. Fetches metadata from CrossRef API
2. Performs Tavily web search for additional context
3. Combines both sources for comprehensive metadata
4. Generates BibTeX citation using AI

### URL Input
1. Extracts content from URL using Tavily Extract API
2. AI analyzes the content to extract citation metadata
3. Generates BibTeX citation

### PDF Input
1. Converts PDF first page to image
2. Uses Groq Vision API for OCR to extract text
3. Extracts title and author names using heuristics
4. Generates BibTeX citation using AI

---

## 🐛 Error Handling

The application includes comprehensive error handling:

- **Rate Limit Errors**: Clear messages when API quotas are exceeded
- **OCR Failures**: Graceful fallback - AI attempts to extract from PDF directly
- **Network Errors**: User-friendly error messages with retry suggestions
- **Invalid Input**: Validation with helpful error messages

---

## 📚 Outcomes

- **Accurate Citations**  
    Ensure your work is correctly referenced with AI-powered accuracy.

- **Time Saved**  
    Generate citations in seconds instead of minutes.

- **Consistent Formatting**  
    Meet academic standards with ease across multiple citation styles.

- **Comprehensive Metadata**  
    Web search integration ensures complete citation information.

---

## 🚧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run genkit:dev` - Start Genkit development server

### Project Structure

```
CiteRight/
├── src/
│   ├── ai/              # AI flows and Genkit configuration
│   ├── app/              # Next.js app directory
│   ├── components/       # React components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions
│   └── services/         # API services (OCR, web search, rate limiting)
├── public/               # Static assets
└── docs/                 # Documentation
```

---

## 📝 License

[Add your license here]

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

> **Try CiteRight today and simplify your citation workflow!**

