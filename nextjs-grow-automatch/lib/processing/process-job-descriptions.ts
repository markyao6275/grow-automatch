import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { createObjectCsvWriter } from 'csv-writer';
import { JobDescription } from '@/types';
import { processPdf } from '../pdf-parser';
import { 
  extractJobGeneralInfo,
  generateIndustryLabels,
  generateFunctionLabels
} from '../openai';

interface ProcessJobDescriptionResult {
  csvFilePath: string;
  processedJobs: JobDescription[];
}

/**
 * Determine compensation range based on job level
 * @param jobLevel Job level (4-12)
 * @returns Formatted compensation range
 */
function determineCompensationRange(jobLevel: number): string {
  const compensationRanges: Record<number, string> = {
    4: "6,000,000-10,000,000",
    5: "8,000,000-12,000,000",
    6: "12,000,000-18,000,000",
    7: "16,000,000-26,000,000",
    8: "22,000,000-30,000,000",
    9: "24,000,000-32,000,000",
    10: "30,000,000-45,000,000",
    11: "35,000,000-50,000,000",
    12: "47,000,000-60,000,000",
  };

  return compensationRanges[jobLevel] || "Unknown";
}

/**
 * Process job description files and extract structured data
 * @param files Array of job description file buffers with metadata
 * @returns Path to generated CSV and processed job descriptions
 */
export async function processJobDescriptions(
  files: { buffer: Buffer; name: string; path: string }[]
): Promise<ProcessJobDescriptionResult> {
  const jobDescriptions: JobDescription[] = [];
  
  // Create output directory if it doesn't exist
  const outputDir = path.join(process.cwd(), 'output');
  fs.mkdirSync(outputDir, { recursive: true });
  
  // Process each file
  for (const file of files) {
    try {
      console.log(`Processing job description: ${file.name}`);
      
      // Parse PDF to text
      const pdfText = await processPdf(file.buffer);
      
      // Extract data using OpenAI
      const jobDescription: Partial<JobDescription> = {
        filename: file.name
      };
      
      const generalInfo = await extractJobGeneralInfo(pdfText);
      
      if (generalInfo) {
        // Determine compensation range based on job level
        const compensationRange = determineCompensationRange(generalInfo.job_level);
        
        // Extract industry and function labels
        const industryLabels = await generateIndustryLabels(pdfText);
        const functionLabels = await generateFunctionLabels(pdfText);
        
        if (industryLabels && functionLabels) {
          Object.assign(jobDescription, {
            ...generalInfo,
            compensation_range: compensationRange,
            ...industryLabels,
            ...functionLabels,
            job_description_text: pdfText
          });
          
          jobDescriptions.push(jobDescription as JobDescription);
        }
      }
    } catch (error) {
      console.error(`Error processing job description ${file.name}:`, error);
    }
  }
  
  // Generate timestamp for filename
  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
  const outputFile = path.join(outputDir, `job_descriptions_${timestamp}.csv`);
  
  // Write to CSV
  if (jobDescriptions.length > 0) {
    // Get all field names
    const allFields = new Set<string>();
    jobDescriptions.forEach(job => {
      Object.keys(job).forEach(key => allFields.add(key));
    });
    
    // Create CSV writer
    const csvWriter = createObjectCsvWriter({
      path: outputFile,
      header: Array.from(allFields).sort().map(field => ({
        id: field,
        title: field
      }))
    });
    
    await csvWriter.writeRecords(jobDescriptions);
  }
  
  return {
    csvFilePath: outputFile,
    processedJobs: jobDescriptions
  };
}