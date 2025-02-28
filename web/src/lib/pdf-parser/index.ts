import { ProcessedPdfResult } from '@/types';

/**
 * Parse PDF content to extract text using pdf2json
 * @param buffer PDF file buffer
 * @returns Extracted text from the PDF
 */
export async function parsePdfToText(buffer: Buffer): Promise<ProcessedPdfResult> {
  // Dynamically import pdf2json to ensure it's only loaded on the server
  const PDFParser = (await import('pdf2json')).default;
  
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    
    pdfParser.on('pdfParser_dataError', (errData: Error) => {
      reject(new Error(`PDF parsing error: ${errData.message}`));
    });
    
    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        // Extract text from each page
        const pages = pdfData.Pages || [];
        const textArray: string[] = [];
        
        for (const page of pages) {
          const texts = page.Texts || [];
          const pageTexts: string[] = [];
          
          for (const text of texts) {
            if (text.R && Array.isArray(text.R)) {
              for (const r of text.R) {
                if (r.T) {
                  // Decode URI component (pdf2json encodes spaces and special chars)
                  const decodedText = decodeURIComponent(r.T);
                  pageTexts.push(decodedText);
                }
              }
            }
          }
          
          // Join all text elements on the page
          textArray.push(pageTexts.join(' '));
        }
        
        // Join all pages with newlines
        const fullText = textArray.join('\n\n');
        
        resolve({
          text: fullText
        });
      } catch (error) {
        reject(new Error(`Failed to process PDF data: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
    
    // Load PDF from buffer
    pdfParser.parseBuffer(buffer);
  });
}

/**
 * Enhanced PDF parser for resumes and job descriptions
 * This function replicates some functionality from the Python parser
 * @param buffer PDF file buffer
 * @returns Processed PDF content with OCR-like extraction
 */
export async function processPdf(buffer: Buffer): Promise<string> {
  try {
    const result = await parsePdfToText(buffer);
    
    // Post-process the text (clean up, normalize spaces, etc.)
    let text = result.text;
    
    // Remove excessive whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    // Fix common PDF extraction issues
    text = text.replace(/(\w)- (\w)/g, '$1$2'); // Fix hyphenated words
    
    // Format similar to Python version
    const formattedText = 
      "=== EXTRACTED TEXT ===\n" +
      text + "\n";
    
    return formattedText;
  } catch (error) {
    console.error('Error processing PDF:', error);
    throw error;
  }
}