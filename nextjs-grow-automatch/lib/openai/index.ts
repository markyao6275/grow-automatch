import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { 
  OpenAIGeneralInfo, 
  OpenAIIndustryLabels, 
  OpenAIFunctionLabels,
  OpenAIJobGeneralInfo
} from '@/types';

// Initialize OpenAI client
const openaiApiKey = process.env.OPENAI_API_KEY;
const defaultModel = 'gpt-4o';

let openaiClient: OpenAI | null = null;

/**
 * Get or create OpenAI client
 * @returns OpenAI client instance
 */
export function getOpenAIClient(): OpenAI | null {
  if (!openaiApiKey) {
    console.error('OpenAI API key not found');
    return null;
  }
  
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: openaiApiKey
    });
  }
  
  return openaiClient;
}

/**
 * Call OpenAI API with system and user prompts
 * @param systemPrompt System instructions for the model
 * @param userPrompt User message/content to process
 * @param model OpenAI model to use
 * @param tools Function calling tools to use
 * @returns OpenAI API response
 */
export async function callOpenAIApi(
  systemPrompt: string,
  userPrompt: string,
  model: string = defaultModel,
  tools?: OpenAI.Chat.Completions.CompletionCreateParams.Tool[]
) {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('OpenAI client not initialized');
  }

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.0,
      tools: tools 
    });

    if (!completion || !completion.choices || !completion.choices[0]) {
      return null;
    }

    // Log token usage
    if (completion.usage) {
      const tokenUsage = completion.usage.total_tokens;
      const logPath = path.join(process.cwd(), 'openai_usage.log');
      fs.appendFileSync(logPath, `${tokenUsage}\n`);
    }

    return completion.choices[0].message;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}

/**
 * Extract general information from resume text
 * @param resumeText Resume text content
 * @returns Structured candidate information
 */
export async function extractGeneralInfo(resumeText: string): Promise<OpenAIGeneralInfo | null> {
  const submitGeneralInfoTool = {
    type: 'function',
    function: {
      name: 'submit_general_info',
      description: "Submit candidate's general information",
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The name of the candidate',
          },
          current_company: {
            type: 'string',
            description: 'The current company of the candidate',
          },
          current_position: {
            type: 'string',
            description: 'The current position of the candidate',
          },
          previous_company_1: {
            type: 'string',
            description: 'The first previous company of the candidate',
          },
          previous_position_1: {
            type: 'string',
            description: 'The first previous position of the candidate',
          },
          previous_company_2: {
            type: 'string',
            description: 'The second previous company of the candidate',
          },
          previous_position_2: {
            type: 'string',
            description: 'The second previous position of the candidate',
          },
          country: {
            type: 'string',
            description: 'The country of the candidate',
          },
          city: {
            type: 'string',
            description: 'The city of the candidate',
          },
          age: {
            type: 'string',
            description: 'The age of the candidate',
          },
          gender: {
            type: 'string',
            description: 'The gender of the candidate',
          },
          japanese_level: {
            type: 'string',
            description: 'The Japanese level of the candidate',
          },
          english_level: {
            type: 'string',
            description: 'The English level of the candidate',
          },
          other_languages: {
            type: 'string',
            description: 'The other languages of the candidate',
          },
        },
        required: [
          'name',
          'current_company',
          'current_position',
          'previous_company_1',
          'previous_position_1',
          'previous_company_2',
          'previous_position_2',
          'country',
          'city',
          'age',
          'gender',
          'japanese_level',
          'english_level',
          'other_languages',
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
    const answer = await callOpenAIApi(systemPrompt, resumeText, defaultModel, [submitGeneralInfoTool]);
    
    if (!answer || !answer.tool_calls || !answer.tool_calls[0].function.arguments) {
      return null;
    }

    return JSON.parse(answer.tool_calls[0].function.arguments);
  } catch (error) {
    console.error('Error extracting general info:', error);
    return null;
  }
}

/**
 * Generate industry labels for a candidate
 * @param resumeText Resume text content
 * @returns Industry labels
 */
export async function generateIndustryLabels(resumeText: string): Promise<OpenAIIndustryLabels | null> {
  const submitCandidateIndustryLabelsTool = {
    type: 'function',
    function: {
      name: 'submit_position_industry_labels',
      description: 'Submit industry labels for the candidate',
      parameters: {
        type: 'object',
        properties: {
          I1: {
            type: 'string',
            description: 'The industry label for I1',
          },
          I2: {
            type: 'string',
            description: 'The industry label for I2',
          },
          I3: {
            type: 'string',
            description: 'The industry label for I3',
          },
          I4: {
            type: 'string',
            description: 'The industry label for I4',
          },
        },
        required: ['I1', 'I2', 'I3', 'I4'],
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
I1: Consulting; I2: Corporate; I3: HR, Accounting, Marketing, Research;"
`;

  try {
    const answer = await callOpenAIApi(systemPrompt, resumeText, defaultModel, [submitCandidateIndustryLabelsTool]);

    if (!answer || !answer.tool_calls || !answer.tool_calls[0].function.arguments) {
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
 * @param resumeText Resume text content
 * @returns Function labels
 */
export async function generateFunctionLabels(resumeText: string): Promise<OpenAIFunctionLabels | null> {
  const submitCandidateFunctionLabelsTool = {
    type: 'function',
    function: {
      name: 'submit_candidate_function_labels',
      description: 'Submit function labels for the candidate',
      parameters: {
        type: 'object',
        properties: {
          F1: {
            type: 'string',
            description: 'The function label for F1',
          },
          F2: {
            type: 'string',
            description: 'The function label for F2',
          },
          F3: {
            type: 'string',
            description: 'The function label for F3',
          },
          F4: {
            type: 'string',
            description: 'The function label for F4',
          },
        },
        required: ['F1', 'F2', 'F3', 'F4'],
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
    const answer = await callOpenAIApi(systemPrompt, resumeText, defaultModel, [submitCandidateFunctionLabelsTool]);

    if (!answer || !answer.tool_calls || !answer.tool_calls[0].function.arguments) {
      return null;
    }

    return JSON.parse(answer.tool_calls[0].function.arguments);
  } catch (error) {
    console.error('Error generating function labels:', error);
    return null;
  }
}

/**
 * Extract job information from job description text
 * @param jobText Job description text
 * @returns Structured job information
 */
export async function extractJobGeneralInfo(jobText: string): Promise<OpenAIJobGeneralInfo | null> {
  const submitJobGeneralInfoTool = {
    type: 'function',
    function: {
      name: 'submit_job_general_info',
      description: "Submit job's general information",
      parameters: {
        type: 'object',
        properties: {
          company: {
            type: 'string',
            description: 'The name of the company',
          },
          position: {
            type: 'string',
            description: 'The position of the job description',
          },
          country: {
            type: 'string',
            description: 'The country of the job description',
          },
          city: {
            type: 'string',
            description: 'The city of the job description',
          },
          job_level: {
            type: 'number',
            enum: [4, 5, 6, 7, 8, 9, 10, 11, 12],
            description: 'The level of the job description',
          },
          company_size: {
            type: 'string',
            enum: ['0-10', '10-50', '50-100', '100+'],
            description: "The company's size",
          },
          company_hq_location: {
            type: 'string',
            enum: ['Japan', 'Global'],
            description: "The company's headquarters location",
          },
          employee_count_in_japan: {
            type: 'string',
            enum: ['0-10', '10-50', '50-100', '100+'],
            description: "The company's size",
          },
          english_level_required: {
            type: 'string',
            enum: ['Native', 'Fluent', 'Business', 'Reading/Writing', 'None'],
            description: 'The English level required for the job description',
          },
          japanese_level_required: {
            type: 'string',
            enum: ['Native', 'Fluent', 'Business', 'Reading/Writing', 'None'],
            description: 'The Japanese level required for the job description',
          },
          target_age: {
            type: 'number',
            description: 'The target age for the job description',
          },
        },
        required: [
          'company',
          'position',
          'country',
          'city',
          'job_level',
          'company_size',
          'company_hq_location',
          'employee_count_in_japan',
          'english_level_required',
          'japanese_level_required',
          'target_age',
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
    const answer = await callOpenAIApi(systemPrompt, jobText, defaultModel, [submitJobGeneralInfoTool]);

    if (!answer || !answer.tool_calls || !answer.tool_calls[0].function.arguments) {
      return null;
    }

    return JSON.parse(answer.tool_calls[0].function.arguments);
  } catch (error) {
    console.error('Error extracting job general info:', error);
    return null;
  }
}

/**
 * Generate OpenAI score for candidate match
 * @param resumeText Resume text content
 * @param jobData Job data for scoring
 * @returns Score between 0-100
 */
export async function getOpenAIScore(resumeText: string, jobData: any): Promise<number | null> {
  const scoreCandidateTool = {
    type: 'function',
    function: {
      name: 'score_candidate',
      description: 'Score the candidate based on the provided algorithm',
      parameters: {
        type: 'object',
        properties: {
          score: {
            type: 'number',
            description: 'Number between 0 and 100',
          },
        },
        required: ['score'],
      },
    },
  };

  const systemPrompt = `
You are a highly skilled assistant tasked with evaluating and scoring candidates for the ${jobData.position} position at ${jobData.company} in ${jobData.country}.

**Job Information:**
- **Company:** ${jobData.company}
- **Position:** ${jobData.position}
- **Location:** ${jobData.country}
- **Employee Count in Japan:** ${jobData.employee_count_in_japan}
- **Ideal English Level:** ${jobData.english_level_required}
- **Ideal Japanese Level:** ${jobData.japanese_level_required}
- **Target Age:** ${jobData.target_age}
- **Job Level:** ${jobData.job_level}

**Scoring Guidelines:**
Evaluate the candidate's résumé based on the following criteria, assigning points to each category as appropriate:

1. **Relevant Experience:**
2. **Education:**
3. **Skills:**
4. **Cultural Fit:**
5. **Achievements:**
6. **Additional Factors:**

**Instructions:**
1. **Analyze the candidate's résumé in detail**, considering each of the above categories.
2. **Ensure that the candidate receives a score that accurately reflects their suitability for the role.**
3. **Always call the function tool: \`score_candidate(<your_total_score>)\`**
`;

  try {
    const answer = await callOpenAIApi(systemPrompt, resumeText, defaultModel, [scoreCandidateTool]);

    if (!answer) {
      return null;
    }

    if (!answer.tool_calls) {
      const textualAnswer = answer.content || '';
      return extractScore(textualAnswer);
    }

    return JSON.parse(answer.tool_calls[0].function.arguments).score;
  } catch (error) {
    console.error('Error getting OpenAI score:', error);
    return null;
  }
}

/**
 * Extract numeric score from text response
 * @param text Text containing score
 * @returns Extracted numeric score
 */
function extractScore(text: string): number {
  // Strategy 1: Look for JSON code blocks and parse them
  const jsonBlockPattern = /```json\s*(\{.*?\})\s*```/is;
  const jsonMatches = text.match(jsonBlockPattern);
  
  if (jsonMatches && jsonMatches[1]) {
    try {
      const data = JSON.parse(jsonMatches[1]);
      // Navigate through the JSON structure
      let score = data;
      const keys = ['parameters', 'score'];
      for (const key of keys) {
        if (score && typeof score === 'object') {
          score = score[key];
        }
      }
      
      if (typeof score === 'number') {
        return score;
      }
    } catch (e) {
      // Continue to other strategies if JSON parsing fails
    }
  }

  // Strategy 2: Use regex patterns
  const regexPatterns = [
    /score\s*(?:of|:)\s*(\d+)/i,  // e.g., "score of 40" or "score: 40"
    /score\s*is\s*(\d+)/i,        // e.g., "score is 40"
    /score\s*=\s*(\d+)/i,         // e.g., "score = 40"
    /"score"\s*:\s*(\d+)/,        // e.g., '"score": 40'
    /score\s*\(\s*(\d+)\s*\)/i,   // e.g., 'score(40)'
  ];

  for (const pattern of regexPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }

  // Strategy 3: Find standalone numbers near "score"
  const fallbackPattern = /score.*?(\d{1,3})/i;
  const fallbackMatch = text.match(fallbackPattern);
  if (fallbackMatch && fallbackMatch[1]) {
    return parseInt(fallbackMatch[1], 10);
  }

  throw new Error('No numeric score found in the provided text.');
}