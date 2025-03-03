import { BucketResult, BucketsTable, CandidateProfile, JobDescription, ScoresTable, ScoredCandidate } from '@/types';
import { callOpenAI } from '../openai';

// Define the buckets table for scoring
const BUCKETS_TABLE: BucketsTable = {
  "F1,I1": "Too Basic",
  "F1,I2": "Iffy Match",
  "F1,I3": "Okay",
  "F1,I4": "Iffy Match",
  "F2,I1": "Iffy Match",
  "F2,I2": "Good Match",
  "F2,I3": "Good Match",
  "F2,I4": "Out of the box",
  "F3,I1": "Okay",
  "F3,I2": "Good Match",
  "F3,I3": "Strong Match",
  "F3,I4": "Perfect Match",
  "F4,I1": "Iffy Match",
  "F4,I2": "Good Match",
  "F4,I3": "Strong Match",
  "F4,I4": "Perfect Match",
};

// Define the scores table
const SCORES_TABLE: ScoresTable = {
  "Too Basic": {
    min: 0,
    max: 10,
  },
  "Iffy Match": {
    min: 10,
    max: 20,
  },
  "Okay": {
    min: 20,
    max: 30,
  },
  "Good Match": {
    min: 30,
    max: 40,
  },
  "Strong Match": {
    min: 40,
    max: 69,
  },
  "Perfect Match": {
    min: 70,
    max: 100,
  },
  "Out of the box": {
    min: 15,
    max: 35,
  },
};

/**
 * Score candidates against a job description
 * @param candidates Array of candidate profiles
 * @param jobData Job description to score against
 * @param candidatesToScore Number of candidates to score with OpenAI (0 means all)
 * @returns Array of scored candidates
 */
export async function scoreCandidates(
  candidates: CandidateProfile[],
  jobData: JobDescription,
  candidatesToScore: number = 0
): Promise<ScoredCandidate[]> {
  const scoredCandidates: ScoredCandidate[] = [];
  
  for (let i = 0; i < candidates.length; i++) {
    try {
      const candidate = candidates[i];
      console.log(`Scoring candidate: ${candidate.name}`);
      
      // Determine bucket and initial score
      const bucket = determineBucket(candidate, jobData);
      
      const scoredCandidate: ScoredCandidate = {
        ...candidate,
        final_I: bucket.final_I,
        final_F: bucket.final_F,
        bucket: bucket.bucket,
        bucket_score: 0,
        openai_score: 0,
        rule_based_score: 0,
        final_score: 0,
      };


      
      if (bucket.bucket) {
        // Get initial score from bucket
        const initialScore = SCORES_TABLE[bucket.bucket].max;
        
        // Add points for I4 and F4 matching
        const i4AndF4Points = getI4AndF4Points(candidate, jobData);
        scoredCandidate.bucket_score = initialScore + i4AndF4Points;
        
        // Update bucket if score is high enough
        if (scoredCandidate.bucket_score >= 70) {
          scoredCandidate.bucket = "Perfect Match";
        }
        
        // Use OpenAI for high scores or top N candidates
        if (scoredCandidate.bucket_score >= 71 || (candidatesToScore > 0 && i < candidatesToScore)) {
          const openaiScore = await getOpenAIScore(candidate.resume_text || "", jobData);
          scoredCandidate.openai_score = openaiScore;
          scoredCandidate.final_score = openaiScore;
        } else {
          // Use rule-based scoring for the rest
          const ruleBasedScore = getRuleBasedScore(candidate, jobData);
          scoredCandidate.rule_based_score = ruleBasedScore;
          scoredCandidate.final_score = ruleBasedScore;
        }
      }
      
      // Remove the resume text to reduce payload size
      delete scoredCandidate.resume_text;
      
      scoredCandidates.push(scoredCandidate);
    } catch (error) {
      console.error(`Error scoring candidate:`, error);
    }
  }
  
  // Sort candidates by final score, descending
  return scoredCandidates.sort((a, b) => b.final_score - a.final_score);
}

/**
 * Determine the bucket for a candidate
 * @param candidate Candidate profile
 * @param jobData Job description
 * @returns Bucket result with final_I, final_F, and bucket name
 */
function determineBucket(candidate: CandidateProfile, jobData: JobDescription): BucketResult {
  // Extract job labels
  const jobLabels = {
    I1: jobData.I1,
    I2: jobData.I2,
    I3: jobData.I3,
    F1: jobData.F1,
    F2: jobData.F2,
    F3: jobData.F3,
  };

  
  // Find the last matching level for a category
  function getFinalMatchedLevel(category: 'I' | 'F'): string {
    let lastMatched = '0'; // Initialize with no match
    
    for (let level = 1; level <= 3; level++) {
      const key = `${category}${level}` as keyof typeof jobLabels;
      const candidateKey = key as keyof CandidateProfile;
      
      if (jobLabels[key] === candidate[candidateKey]) {
        lastMatched = level.toString();
      } else {
        break; // Stop at the first mismatch
      }
    }
    
    return `${category}${lastMatched}`;
  }
  
  // Get final matched levels
  const final_I = getFinalMatchedLevel('I');
  const final_F = getFinalMatchedLevel('F');
  
  // Get the bucket name from the bucket table
  const bucketKey = `${final_F},${final_I}`;
  const bucket = BUCKETS_TABLE[bucketKey] || "";
  
  return {
    final_I,
    final_F,
    bucket,
  };
}

/**
 * Calculate additional points for I4 and F4 matching
 * @param candidate Candidate profile
 * @param jobData Job description
 * @returns Additional points (0-30)
 */
function getI4AndF4Points(candidate: CandidateProfile, jobData: JobDescription): number {
  // Check if final_I and final_F are not I4 and F4
  if (candidate.final_I !== 'I4' && candidate.final_F !== 'F4') {
    return 0;
  }
  
  function calculatePoints(candidateTags: string[], jobTags: string[]): number {
    // Convert to sets for unique tags
    const uniqueCandidateTags = new Set(candidateTags);
    const uniqueJobTags = new Set(jobTags);
    const maxPoints = 15;
    
    let points = 0;
    const jobTagsCount = uniqueJobTags.size;
    
    // No job tags => max points
    if (jobTagsCount === 0) {
      points = maxPoints;
    }
    // One job tag => if it matches, award max points
    else if (jobTagsCount === 1) {
      const jobTag = Array.from(uniqueJobTags)[0];
      if (uniqueCandidateTags.has(jobTag)) {
        points = maxPoints;
      }
    }
    // Two job tags => each matching tag awards max_points/2
    else if (jobTagsCount === 2) {
      for (const tag of uniqueJobTags) {
        if (uniqueCandidateTags.has(tag)) {
          points += Math.ceil(maxPoints / 2);
        }
      }
    }
    // More than 2 job tags => each matching tag awards max_points/3
    else {
      for (const tag of uniqueJobTags) {
        if (uniqueCandidateTags.has(tag)) {
          points += Math.ceil(maxPoints / 3);
        }
      }
    }
    
    // Cap points at maxPoints
    return Math.min(points, maxPoints);
  }
  
  // Split tags into arrays
  const candidateI4Tags = candidate.I4.split(',').map(tag => tag.trim());
  const candidateF4Tags = candidate.F4.split(',').map(tag => tag.trim());
  const jobI4Tags = jobData.I4.split(',').map(tag => tag.trim());
  const jobF4Tags = jobData.F4.split(',').map(tag => tag.trim());
  
  // Calculate points for I4 and F4
  const i4Points = calculatePoints(candidateI4Tags, jobI4Tags);
  const f4Points = calculatePoints(candidateF4Tags, jobF4Tags);
  
  return i4Points + f4Points;
}

/**
 * Calculate rule-based score for a candidate
 * @param candidate Candidate profile
 * @param jobData Job description
 * @returns Rule-based score (0-100)
 */
function getRuleBasedScore(candidate: CandidateProfile, jobData: JobDescription): number {
  let ruleBasedScore = candidate.bucket_score || 0;
  
  // Location
  if (candidate.country !== "Japan") {
    if (candidate.japanese_level === "Native") {
      ruleBasedScore -= 40;
    } else {
      ruleBasedScore -= 90;
    }
  }
  
  // Age
  const ageMatch = candidate.age.match(/\d+/);
  if (ageMatch) {
    const candidateAge = parseInt(ageMatch[0], 10);
    const jobTargetAge = jobData.target_age;
    const ageDifference = Math.abs(candidateAge - jobTargetAge);
    
    // Apply penalty outside +/- 6 year range
    if (ageDifference > 6) {
      // -1 point every 3 years beyond the 6-year range
      ruleBasedScore -= Math.floor((ageDifference - 6) / 3);
    }
    
    // Additional age-based penalties
    if (candidateAge > 60) {
      ruleBasedScore -= 20;
    } else if (candidateAge > 55) {
      ruleBasedScore -= 10;
    } else if (candidateAge > 50) {
      ruleBasedScore -= 5;
    }
  }
  
  // Gender
  if (candidate.gender === "Female") {
    ruleBasedScore += 5;
  }
  
  // Japanese Level
  if (candidate.japanese_level === "Fluent") {
    ruleBasedScore -= 5;
  } else if (candidate.japanese_level === "Business") {
    ruleBasedScore -= 15;
  } else if (
    candidate.japanese_level === "Reading/Writing" ||
    candidate.japanese_level === "None"
  ) {
    ruleBasedScore -= 80;
  }
  
  // English Level
  if (jobData.company_hq_location === "Japan") {
    if (candidate.english_level === "Native") {
      ruleBasedScore += 5;
    } else if (candidate.english_level === "Fluent") {
      ruleBasedScore += 4;
    } else if (candidate.english_level === "Business") {
      ruleBasedScore += 3;
    } else if (candidate.english_level === "Reading/Writing") {
      ruleBasedScore += 1;
    }
  } else {
    if (
      candidate.english_level === "Native" ||
      candidate.english_level === "Fluent"
    ) {
      ruleBasedScore += 10;
    } else if (candidate.english_level === "Reading/Writing") {
      ruleBasedScore -= 10;
    } else if (candidate.english_level === "None") {
      ruleBasedScore -= 20;
    }
  }
  
  // Ensure score is not negative
  return Math.max(ruleBasedScore, 0);
}

/**
 * Get score from OpenAI for a candidate
 * @param resumeText Resume text
 * @param jobData Job description
 * @returns OpenAI score (0-100)
 */
async function getOpenAIScore(resumeText: string, jobData: JobDescription): Promise<number> {
  const scoreCandidateTool = {
    type: "function",
    function: {
      name: "score_candidate",
      description: "Score the candidate based on the provided algorithm",
      parameters: {
        type: "object",
        properties: {
          score: {
            type: "number",
            description: "Number between 0 and 100",
          },
        },
        required: ["score"],
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
    const answer = await callOpenAI(systemPrompt, resumeText, [scoreCandidateTool]);
    
    if (!answer) {
      console.error('Failed to get OpenAI score');
      return 0;
    }
    
    // Handle tool call response
    if (answer.tool_calls && answer.tool_calls[0]?.function?.arguments) {
      const result = JSON.parse(answer.tool_calls[0].function.arguments);
      return result.score;
    }
    
    // Handle text response (fallback)
    if (answer.content) {
      return extractScoreFromText(answer.content);
    }
    
    return 0;
  } catch (error) {
    console.error('Error getting OpenAI score:', error);
    return 0;
  }
}

/**
 * Extract score from text response
 * @param text Text response
 * @returns Extracted score (0-100)
 */
function extractScoreFromText(text: string): number {
  // Try to extract JSON from the text
  const jsonBlockPattern = /```json\s*(\{.*?\})\s*```/s;
  const jsonMatches = text.match(jsonBlockPattern);
  
  if (jsonMatches && jsonMatches[1]) {
    try {
      const data = JSON.parse(jsonMatches[1]);
      if (data.score && typeof data.score === 'number') {
        return data.score;
      }
    } catch (error) {
      // Continue with regex extraction if JSON parsing fails
    }
  }
  
  // Use regex patterns to extract score
  const patterns = [
    /score\s*(?:of|:)\s*(\d+)/i,
    /score\s*is\s*(\d+)/i,
    /score\s*=\s*(\d+)/i,
    /"score"\s*:\s*(\d+)/i,
    /score\s*\(\s*(\d+)\s*\)/i,
    /score.*?(\d{1,3})/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const score = parseInt(match[1], 10);
      if (!isNaN(score) && score >= 0 && score <= 100) {
        return score;
      }
    }
  }
  
  // Default score if no match found
  return 0;
}