import { JobDescription } from '@/types';
import { processPdf } from '../pdf-parser';
import { callOpenAI } from '../openai';
import { createHash } from 'crypto';

/**
 * Process job description PDF files
 * @param files Array of job description files
 * @returns Array of processed job descriptions
 */
export async function processJobDescriptions(files: File[]): Promise<JobDescription[]> {
  const jobDescriptions: JobDescription[] = [];
  
  for (const file of files) {
    try {
      console.log(`Processing job description: ${file.name}`);
      
      // Convert File to Buffer
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Extract text from PDF
      const pdfText = await processPdf(buffer);
      
      // Generate a unique ID based on file content
      const id = createHash('md5').update(pdfText).digest('hex');
      
      // Extract information from job description text
      const generalInfo = await extractJobGeneralInfo(pdfText);
      if (!generalInfo) continue;
      
      const compensationRange = determineCompensationRange(generalInfo.job_level);
      const industryLabels = await generateIndustryLabels(pdfText);
      const functionLabels = await generateFunctionLabels(pdfText);
      
      if (generalInfo && industryLabels && functionLabels) {
        const jobDescription: JobDescription = {
          id,
          filename: file.name,
          ...generalInfo,
          ...compensationRange,
          ...industryLabels,
          ...functionLabels,
          job_description_text: pdfText,
        };
        
        jobDescriptions.push(jobDescription);
      }
    } catch (error) {
      console.error(`Error processing job description ${file.name}:`, error);
    }
  }
  
  return jobDescriptions;
}

/**
 * Extract general information from job description text
 * @param pdfText The job description text
 * @returns The general information object
 */
async function extractJobGeneralInfo(pdfText: string) {
  const submitJobGeneralInfoTool = {
    type: "function",
    function: {
      name: "submit_job_general_info",
      description: "Submit job's general information",
      parameters: {
        type: "object",
        properties: {
          company: {
            type: "string",
            description: "The name of the company",
          },
          position: {
            type: "string",
            description: "The position of the job description",
          },
          country: {
            type: "string",
            description: "The country of the job description",
          },
          city: {
            type: "string",
            description: "The city of the job description",
          },
          job_level: {
            type: "number",
            enum: [4, 5, 6, 7, 8, 9, 10, 11, 12],
            description: "The level of the job description",
          },
          company_size: {
            type: "string",
            enum: ["0-10", "10-50", "50-100", "100+"],
            description: "The company's size",
          },
          company_hq_location: {
            type: "string",
            enum: ["Japan", "Global"],
            description: "The company's headquarters location",
          },
          employee_count_in_japan: {
            type: "string",
            enum: [
              "0-10",
              "10-50",
              "50-100",
              "100+",
            ],
            description: "The company's size",
          },
          english_level_required: {
            type: "string",
            enum: [
              "Native",
              "Fluent",
              "Business",
              "Reading/Writing",
              "None",
            ],
            description: "The English level required for the job description",
          },
          japanese_level_required: {
            type: "string",
            enum: [
              "Native",
              "Fluent",
              "Business",
              "Reading/Writing",
              "None",
            ],
            description: "The Japanese level required for the job description",
          },
          target_age: {
            type: "number",
            description: "The target age for the job description",
          },
        },
        required: [
          "company",
          "position",
          "country",
          "city",
          "job_level",
          "company_size",
          "company_hq_location",
          "employee_count_in_japan",
          "english_level_required",
          "japanese_level_required",
          "target_age",
        ],
      },
    },
  };

  const systemPrompt = `
You are a helpful assistant extracting job information from a job description.

Your goal is to identify and provide the following details by calling the function 'submit_job_general_info' with these exact parameters:

1. company (Required)
2. position (Required)
3. country (Required)
4. city (Required)
5. job_level (Required) — Must be one of [4, 5, 6, 7, 8, 9, 10, 11, 12].
   Examples for job_level:
     - 4:  Customer Support, SDR/BDR
     - 5:  Digital Marketing, SMB
     - 6:  Field Marketing, CSM, Solution Eng, Partner/Channel Sales, Mid Market
     - 7:  Enterprise
     - 8:  Head of Marketing, Head of CSM, Head of Solution Eng, Head of Partner/Channel, Sales Manager (Commercial), Director
     - 9:  Sales Manager (Enterprise), Sr. Director
     - 10: RVP
     - 11: Area VP
     - 12: VP
6. company_size (Required) — Must be one of:
   ["0-10", "10-50", "50-100", "100+"]
7. employee_count_in_japan (Required) — Must be one of: ["0-10", "10-50", "50-100", "100+"]
8. company_hq_location (Required) — Must be one of: ["Japan", "Global"]
9. english_level_required (Required) — Must be one of:  ["Native", "Fluent", "Business", "Reading/Writing", "None"]
10. japanese_level_required (Required) — Must be one of: ["Native", "Fluent", "Business", "Reading/Writing", "None"]
11. target_age (Required)

If you cannot infer a particular detail, guess as best as you can.

Return your final result by calling the function 'submit_job_general_info' with these fields as parameters.
`;

  try {
    const answer = await callOpenAI(systemPrompt, pdfText, [submitJobGeneralInfoTool]);
    
    if (!answer || !answer.tool_calls || !answer.tool_calls[0]?.function?.arguments) {
      console.error('Failed to extract general info from job description');
      return null;
    }
    
    return JSON.parse(answer.tool_calls[0].function.arguments);
  } catch (error) {
    console.error('Error extracting job general info:', error);
    return null;
  }
}

/**
 * Generate industry labels for a job
 * @param pdfText The job description text
 * @returns The industry labels object
 */
async function generateIndustryLabels(pdfText: string) {
  const submitJobIndustryLabelsTool = {
    type: "function",
    function: {
      name: "submit_job_industry_labels",
      description: "Submit job's industry labels",
      parameters: {
        type: "object",
        properties: {
          I1: {
            type: "string",
            description: "The industry label for I1",
          },
          I2: {
            type: "string",
            description: "The industry label for I2",
          },
          I3: {
            type: "string",
            description: "The industry label for I3",
          },
          I4: {
            type: "string",
            description: "The industry label for I4",
          },
        },
        required: ["I1", "I2", "I3", "I4"],
      },
    },
  };

  const systemPrompt = `
You are a helpful assistant evaluating information from a job description.
Use the function 'submit_job_industry_labels' to provide the candidate's:
Reference the following Industry grid and select the best fit option.
Select one at a time starting from I1, then selecting one of the options from I2, then from I3. I4 is free space for GPT to tag English keywords for better sorting.
You cannot change rows. For example,anyone in I2 Cloud must be in SaaS, XaaS, Security, or Consulting for I3.
I1: Digital; I2: Cloud; I3: SaaS, XaaS, Security, Consulting; I4: Sales, Marketing, Analytics, Network, Security Eng, Design, HR, Finance, Cloud Compute, AI, Data Other[Propose]
I1: Digital; I2: Platform; I3: e-commerce, Marketplace, AdTech, Subscription, Gaming, FinTech, Web3; I4:Food Delivery, Logistics, EdTech, TravelTech,  Social Media, Chatapps, Payments, Insurtech, Exchange, Blockchain
I1: Physical; I2: Robotics; I3: Mobility, Space, VR&AR, Smart Cities, Robots, 3D Printing; I4: Autonomus Driving/Robots/Satellites/Launch
I1: Physical; I2: Semicon; I3: Telco, Data CenterChip Design, Fabrication, Quantum; I4: Licensing, inhouse
I1: Physical; I2: Energy; I3: Solar, Nuclear, Hydrogen, Batteries, Charging; I4: Materials
I1: Consulting; I2: Strategy; I3: Strategy, Management; I4: MBB, Big Consutling, Other
I1: Consulting; I2: Corporate; I3: HR, Accounting, Marketing, Research;
`;

  try {
    const answer = await callOpenAI(systemPrompt, pdfText, [submitJobIndustryLabelsTool]);
    
    if (!answer || !answer.tool_calls || !answer.tool_calls[0]?.function?.arguments) {
      console.error('Failed to generate industry labels for job');
      return null;
    }
    
    return JSON.parse(answer.tool_calls[0].function.arguments);
  } catch (error) {
    console.error('Error generating job industry labels:', error);
    return null;
  }
}

/**
 * Generate function labels for a job
 * @param pdfText The job description text
 * @returns The function labels object
 */
async function generateFunctionLabels(pdfText: string) {
  const submitJobFunctionLabelsTool = {
    type: "function",
    function: {
      name: "submit_job_function_labels",
      description: "Submit job's function labels",
      parameters: {
        type: "object",
        properties: {
          F1: {
            type: "string",
            description: "The function label for F1",
          },
          F2: {
            type: "string",
            description: "The function label for F2",
          },
          F3: {
            type: "string",
            description: "The function label for F3",
          },
          F4: {
            type: "string",
            description: "The function label for F4",
          },
        },
        required: ["F1", "F2", "F3", "F4"],
      },
    },
  };

  const systemPrompt = `
You are a helpful assistant evaluating candidate information from a resume.
Use the function 'submit_job_function_labels' to provide the candidate's:
Reference the following Function grid and select the best fit option.
Select one at a time starting from F1, then selecting one of the options from F2, then from F3. F4 is free space for GPT to tag English keywords for better sorting.
You cannot change rows. For example,anyone in F2 Sales must be in AE, BDM, CSM, Inside Sales, SE, Partner, Consultant, Other for F3.
F1: GTM; F2: Sales; F3: AE, BDM, CSM, Inside Sales, SE, Partner, Consultant, Other
F1: GTM; F2: Marketing; F3: Digital, Field, Community, PR, Comms, Growth, Social, Content
F1: GTM; F2: Consulting/PS; F3: Delivery, Implementation, Customer Success, TAM, Pre-sales
F1: GTM; F2: Operations; F3: Strategy, CS, Analytics, Product, Project, Procurement, Supply Chain
F1: Corporate; F2: Finance & Accounting; F3: FP&A, Compensation, M&A
F1: Corporate; F2: HR & Admin; F3: HRBP, Recruiting, Office Manager, Onboarding, Training
F1: Corporate; F2: Legal & Compliance; F3: Legal, Compilance, GR, Policy
F1: Corporate; F2: Internal IT; F3: IT Support, Onboarding
F1: Product & Eng; F2: Computer Science; F3: Product, UX, SWE, QA, DevOps
F1: Product & Eng; F2: Physics; F3: Electrical, Mechanical, Embedded etc.
`;

  try {
    const answer = await callOpenAI(systemPrompt, pdfText, [submitJobFunctionLabelsTool]);
    
    if (!answer || !answer.tool_calls || !answer.tool_calls[0]?.function?.arguments) {
      console.error('Failed to generate function labels for job');
      return null;
    }
    
    return JSON.parse(answer.tool_calls[0].function.arguments);
  } catch (error) {
    console.error('Error generating job function labels:', error);
    throw error
  }
}

/**
 * Determine compensation range based on job level
 * @param jobLevel The job level
 * @returns The compensation range object
 */
function determineCompensationRange(jobLevel: number) {
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

  return {
    compensation_range: compensationRanges[jobLevel] || "Unknown",
  };
}