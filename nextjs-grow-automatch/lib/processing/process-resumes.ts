import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { createObjectCsvWriter } from 'csv-writer';
import { CandidateProfile } from '@/types';
import { processPdf } from '../pdf-parser';
import { 
  extractGeneralInfo, 
  generateIndustryLabels, 
  generateFunctionLabels
} from '../openai';

interface ProcessResumeResult {
  csvFilePath: string;
  processedProfiles: CandidateProfile[];
}

/**
 * Process resume files and extract structured data
 * @param files Array of resume file buffers with metadata
 * @returns Path to generated CSV and processed profiles
 */
export async function processResumes(
  files: { buffer: Buffer; name: string; path: string }[]
): Promise<ProcessResumeResult> {
  const candidateProfiles: CandidateProfile[] = [];
  
  // Create output directory if it doesn't exist
  const outputDir = path.join(process.cwd(), 'output');
  fs.mkdirSync(outputDir, { recursive: true });
  
  // Process each file
  for (const file of files) {
    try {
      console.log(`Processing resume: ${file.name}`);
      
      // Parse PDF to text
      const pdfText = await processPdf(file.buffer);
      
      // Extract data using OpenAI
      const candidateProfile: Partial<CandidateProfile> = {
        filename: file.name
      };
      
      const generalInfo = await extractGeneralInfo(pdfText);
      const industryLabels = await generateIndustryLabels(pdfText);
      const functionLabels = await generateFunctionLabels(pdfText);
      
      if (generalInfo && industryLabels && functionLabels) {
        Object.assign(candidateProfile, {
          ...generalInfo,
          ...industryLabels,
          ...functionLabels,
          resume_text: pdfText
        });
        
        candidateProfiles.push(candidateProfile as CandidateProfile);
      }
    } catch (error) {
      console.error(`Error processing resume ${file.name}:`, error);
    }
  }
  
  // Generate timestamp for filename
  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
  const outputFile = path.join(outputDir, `resumes_${timestamp}.csv`);
  
  // Write to CSV
  if (candidateProfiles.length > 0) {
    // Get all field names
    const allFields = new Set<string>();
    candidateProfiles.forEach(profile => {
      Object.keys(profile).forEach(key => allFields.add(key));
    });
    
    // Create CSV writer
    const csvWriter = createObjectCsvWriter({
      path: outputFile,
      header: Array.from(allFields).sort().map(field => ({
        id: field,
        title: field
      }))
    });
    
    await csvWriter.writeRecords(candidateProfiles);
  }
  
  return {
    csvFilePath: outputFile,
    processedProfiles: candidateProfiles
  };
}