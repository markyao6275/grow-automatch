import { CandidateProfile } from '@/types';
import { processPdf } from '../pdf-parser';
import { callOpenAI } from '../openai';
import { createHash } from 'crypto';

/**
 * Process resume PDF files
 * @param files Array of resume files
 * @returns Array of processed candidate profiles
 */
export async function processResumes(files: File[]): Promise<CandidateProfile[]> {
  const candidateProfiles: CandidateProfile[] = [];
  
  for (const file of files) {
    try {
      console.log(`Processing resume: ${file.name}`);
      
      // Convert File to Buffer
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Extract text from PDF
      const pdfText = await processPdf(buffer);
      
      // Generate a unique ID based on file content
      const id = createHash('md5').update(pdfText).digest('hex');
      
      // Extract information from resume text
      const generalInfo = await extractGeneralInfo(pdfText);
      const industryLabels = await generateIndustryLabels(pdfText);
      const functionLabels = await generateFunctionLabels(pdfText);
      
      if (generalInfo && industryLabels && functionLabels) {
        const candidateProfile: CandidateProfile = {
          id,
          filename: file.name,
          ...generalInfo,
          ...industryLabels,
          ...functionLabels,
          resume_text: pdfText,
        };
        
        candidateProfiles.push(candidateProfile);
      }
    } catch (error) {
      console.error(`Error processing resume ${file.name}:`, error);
      throw error;
    }
  }
  
  return candidateProfiles;
}

/**
 * Extract general information from resume text
 * @param pdfText The resume text
 * @returns The general information object
 */
async function extractGeneralInfo(pdfText: string) {
  const submitGeneralInfoTool = {
    type: "function",
    function: {
      name: "submit_general_info",
      description: "Submit candidate's general information",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The name of the candidate",
          },
          current_company: {
            type: "string",
            description: "The current company of the candidate",
          },
          current_position: {
            type: "string",
            description: "The current position of the candidate",
          },
          previous_company_1: {
            type: "string",
            description: "The first previous company of the candidate",
          },
          previous_position_1: {
            type: "string",
            description: "The first previous position of the candidate",
          },
          previous_company_2: {
            type: "string",
            description: "The second previous company of the candidate",
          },
          previous_position_2: {
            type: "string",
            description: "The second previous position of the candidate",
          },
          country: {
            type: "string",
            description: "The country of the candidate",
          },
          city: {
            type: "string",
            description: "The city of the candidate",
          },
          age: {
            type: "string",
            description: "The age of the candidate",
          },
          gender: {
            type: "string",
            description: "The gender of the candidate",
          },
          japanese_level: {
            type: "string",
            description: "The Japanese level of the candidate",
          },
          english_level: {
            type: "string",
            description: "The English level of the candidate",
          },
          other_languages: {
            type: "string",
            description: "The other languages of the candidate",
          },
        },
        required: [
          "name",
          "current_company",
          "current_position",
          "previous_company_1",
          "previous_position_1",
          "previous_company_2",
          "previous_position_2",
          "country",
          "city",
          "age",
          "gender",
          "japanese_level",
          "english_level",
          "other_languages",
        ],
      },
    },
  };

  const currentDate = new Date().toISOString().split('T')[0];
  
  const systemPrompt = `
You are a helpful assistant specialized in extracting candidate information from a resume.

Your task:
- Call the function \`submit_general_info\` **exactly once**.
- Provide the data in the function's named parameters.

1. **Full Name**: If not explicit, guess from context or say 'Unknown'.
2. **Current Company** / **Current Position**: Best possible inference or 'Unknown'.
3. **Previous Company 1** / **Position 1** / **Previous Company 2** / **Position 2**: 
   - Extract as many past roles/companies as possible (up to 2). If not available, say 'Unknown'.
4. **Current Country** and **Current City**: Provide best guess or 'Unknown'.
   - Japanese living abroad, say 'Japan'.
5. **Age** (with margin of error): Use the format "35 +/- 2" (example). 
   - If the resume suggests a graduation date, assume graduation age is 21.
   - If there are any timelines (e.g., first employment year), try to infer an approximate age.
   - Always guess.
6. **Gender**:
    1) Male
    2) Female
   - If not mentioned, guess or choose "Unknown".
7. **Japanese Level** (Choose one):
    1) Native
    2) Fluent (Fluent communication in Japanese, or N1, or advanced)
    3) Business (N2 level; can speak but not fluent)
    4) Reading/Writing (Can communicate over email/resume)
    5) None
    - If not mentioned, guess or choose "Unknown".
8. **English Level** (Choose one):
    1) Native
    2) Fluent (Fluent communication, studied abroad, or TOEIC > 900)
    3) Business (Can speak English, not fluent)
    4) Reading/Writing (Can communicate over email/resume)
    5) None
    - If not mentioned, guess or choose "Unknown".
9. **Other Languages**: Provide a list of other relevant languages or say "Unknown".

For reference, today's date is ${currentDate}.

Instructions:
- **Output must be exactly one function call** to \`submit_general_info\` with the arguments above.
- Do not provide any extra text or explanation. 
- Fill in every argument (never leave any argument out).
- If multiple possibilities exist, choose the most likely.
`;

  try {
    const answer = await callOpenAI(systemPrompt, pdfText, [submitGeneralInfoTool]);
    
    if (!answer || !answer.tool_calls || !answer.tool_calls[0]?.function?.arguments) {
      console.error('Failed to extract general info from resume');
      return null;
    }
    
    return JSON.parse(answer.tool_calls[0].function.arguments);
  } catch (error) {
    console.error('Error extracting general info:', error);
    throw error
  }
}

/**
 * Generate industry labels for a candidate
 * @param pdfText The resume text
 * @returns The industry labels object
 */
async function generateIndustryLabels(pdfText: string) {
  const submitCandidateIndustryLabelsTool = {
    type: "function",
    function: {
      name: "submit_position_industry_labels",
      description: "Submit industry labels for the candidate",
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
You are a helpful assistant evaluating candidate information from a resume.
Use the function 'submit_candidate_industry_labels' to provide the candidate's:
Reference the following Industry grid and select the best fit option.
Select one at a time starting from I1, then selecting one of the options from I2, then from I3. I4 is free space for GPT to tag English keywords for better sorting.
You cannot change rows. For example, anyone in I2 Cloud must be in SaaS, XaaS, Security, or Consulting for I3.
I1: Digital; I2: Cloud; I3: SaaS, XaaS, Security, Consulting; I4: Sales, Marketing, Analytics, Network, Security Eng, Design, HR, Finance, Cloud Compute, AI, Data Other[Propose]
I1: Digital; I2: Platform; I3: e-commerce, Marketplace, AdTech, Subscription, Gaming, FinTech, Web3; I4:Food Delivery, Logistics, EdTech, TravelTech,  Social Media, Chatapps, Payments, Insurtech, Exchange, Blockchain
I1: Physical; I2: Robotics; I3: Mobility, Space, VR&AR, Smart Cities, Robots, 3D Printing; I4: Autonomus Driving/Robots/Satellites/Launch
I1: Physical; I2: Semicon; I3: Telco, Data CenterChip Design, Fabrication, Quantum; I4: Licensing, inhouse
I1: Physical; I2: Energy; I3: Solar, Nuclear, Hydrogen, Batteries, Charging; I4: Materials
I1: Consulting; I2: Strategy; I3: Strategy, Management; I4: MBB, Big Consutling, Other
I1: Consulting; I2: Corporate; I3: HR, Accounting, Marketing, Research;
`;

  try {
    const answer = await callOpenAI(systemPrompt, pdfText, [submitCandidateIndustryLabelsTool]);
    
    if (!answer || !answer.tool_calls || !answer.tool_calls[0]?.function?.arguments) {
      console.error('Failed to generate industry labels');
      return null;
    }
    
    return JSON.parse(answer.tool_calls[0].function.arguments);
  } catch (error) {
    console.error('Error generating industry labels:', error);
    return null;
  }
}

/**
 * Generate function labels for a candidate
 * @param pdfText The resume text
 * @returns The function labels object
 */
async function generateFunctionLabels(pdfText: string) {
  const submitCandidateFunctionLabelsTool = {
    type: "function",
    function: {
      name: "submit_candidate_function_labels",
      description: "Submit function labels for the candidate",
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
Use the function 'submit_candidate_function_labels' to provide the candidate's:
Reference the following Function grid and select the best fit option.
Select one at a time starting from F1, then selecting one of the options from F2, then from F3. F4 is free space for GPT to tag English keywords for better sorting.
You cannot change rows. For example, anyone in F2 Sales must be in AE, BDM, CSM, Inside Sales, SE, Partner, Consultant, Other for F3.

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
    const answer = await callOpenAI(systemPrompt, pdfText, [submitCandidateFunctionLabelsTool]);
    
    if (!answer || !answer.tool_calls || !answer.tool_calls[0]?.function?.arguments) {
      console.error('Failed to generate function labels');
      return null;
    }
    
    return JSON.parse(answer.tool_calls[0].function.arguments);
  } catch (error) {
    console.error('Error generating function labels:', error);
    return null;
  }
}