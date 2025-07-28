"use client";

import { useState, useRef, type FormEvent, type ChangeEvent } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getBibtex } from "@/app/actions";
import {
  FileText,
  Link as LinkIcon,
  Globe,
  Copy,
  Loader2,
  AlertCircle,
} from "lucide-react";

type InputType = "doi" | "url" | "pdf";
type CitationStyle = "APA" | "IEEE" | "ACM" | "Chicago" | "MLA";

export default function CiteRightForm() {
  const { toast } = useToast();
  const [inputType, setInputType] = useState<InputType>("doi");
  const [citationStyle, setCitationStyle] = useState<CitationStyle>("APA");
  const [inputValue, setInputValue] = useState("");
  const [bibtexResult, setBibtexResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");

  const handleCopy = () => {
    navigator.clipboard.writeText(bibtexResult);
    toast({
      title: "Copied to clipboard!",
      description: "The BibTeX entry has been copied.",
    });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === "string") {
            setInputValue(text);
        } else if (text instanceof ArrayBuffer) {
            const decoder = new TextDecoder('utf-8');
            setInputValue(decoder.decode(text));
        }
      };
      reader.onerror = () => {
        setError("Failed to read the file.");
        setFileName("");
      }
      reader.readAsText(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setBibtexResult("");

    let finalInput = inputValue;
    if (inputType === 'pdf') {
      if (!fileInputRef.current?.files?.[0]) {
        setError("Please upload a PDF file.");
        setIsLoading(false);
        return;
      }
      if (!finalInput) {
        setError("Could not read the PDF file content. Please try again or use a different file.");
        setIsLoading(false);
        return;
      }
    } else if (!finalInput.trim()) {
      setError("Please enter a value for the selected input type.");
      setIsLoading(false);
      return;
    }

    const response = await getBibtex({
      inputType,
      citationStyle,
      input: finalInput,
    });

    if (response.error) {
      setError(response.error);
    } else if (response.bibtex) {
      setBibtexResult(response.bibtex);
    }

    setIsLoading(false);
  };
  
  const handleTabChange = (value: string) => {
    setInputType(value as InputType);
    setInputValue("");
    setFileName("");
    setError("");
    setBibtexResult("");
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  const renderInput = () => {
    if (inputType === "pdf") {
      return (
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="pdf-upload">Upload PDF</Label>
          <Input
            id="pdf-upload"
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf"
            className="file:text-primary-foreground file:font-semibold"
            disabled={isLoading}
          />
          {fileName && <p className="text-sm text-muted-foreground truncate" title={fileName}>{fileName}</p>}
        </div>
      );
    }
    const placeholder =
      inputType === "doi"
        ? "e.g., 10.1109/5.771073"
        : "e.g., https://example.com/article";
    return (
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor={inputType}>{inputType.toUpperCase()}</Label>
        <Input
          id={inputType}
          type={inputType === 'url' ? 'url' : 'text'}
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isLoading}
        />
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-3xl font-headline">CiteRight</CardTitle>
        <CardDescription>
          Generate academic citations with AI. Select your source type, provide
          the input, and get your BibTeX entry.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs
            defaultValue="doi"
            onValueChange={handleTabChange}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="doi" disabled={isLoading}>
                <LinkIcon className="mr-2 h-4 w-4" /> DOI
              </TabsTrigger>
              <TabsTrigger value="url" disabled={isLoading}>
                <Globe className="mr-2 h-4 w-4" /> URL
              </TabsTrigger>
              <TabsTrigger value="pdf" disabled={isLoading}>
                <FileText className="mr-2 h-4 w-4" /> PDF
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderInput()}
            
            <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="citation-style">Citation Style</Label>
                <Select value={citationStyle} onValueChange={(value) => setCitationStyle(value as CitationStyle)} disabled={isLoading}>
                    <SelectTrigger id="citation-style">
                        <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="APA">APA</SelectItem>
                        <SelectItem value="IEEE">IEEE</SelectItem>
                        <SelectItem value="ACM">ACM</SelectItem>
                        <SelectItem value="Chicago">Chicago</SelectItem>
                        <SelectItem value="MLA">MLA</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>

          <Button type="submit" className="w-full text-base font-semibold" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Fetch Metadata
          </Button>
        </form>

        {error && (
            <div className="mt-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        )}
        
        {bibtexResult && (
            <div className="mt-6 space-y-4 animate-in fade-in-50">
                <Separator />
                <h3 className="text-lg font-semibold">BibTeX Output</h3>
                <div className="relative rounded-md bg-muted/50 p-4">
                    <Button
                        variant="accent"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={handleCopy}
                    >
                        <Copy className="h-4 w-4" />
                        <span className="sr-only">Copy to clipboard</span>
                    </Button>
                    <pre className="text-sm overflow-x-auto font-code pr-12 py-2">
                        <code>{bibtexResult}</code>
                    </pre>
                </div>
            </div>
        )}

      </CardContent>
    </Card>
  );
}
