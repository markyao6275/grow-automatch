import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { 
  CandidateProfile, 
  JobDescription,
  BucketResult,
  BucketTableEntry
} from '@/types';
import { getOpenAIScore } from '../openai';

// Bucket mapping table
const BUCKETS_TABLE: Record<string, string> = {
  'F1,I1': 'Too Basic',
  'F1,I2': 'Iffy Match',
  'F1,I3': 'Okay',
  'F1,I4': 'Iffy Match',
  'F2,I1': 'Iffy Match',
  'F2,I2': 'Good Match',
  'F2,I3': 'Good Match',
  'F2,I4': 'Out of the box',
  'F3,I1': 'Okay',
  'F3,I2': 'Good Match',
  'F3,I3': 'Strong Match',
  'F3,I4': 'Perfect Match',
  'F4,I1': 'Iffy Match',
  'F4,I2': 'Good Match',
  'F4,I3': 'Strong Match',
  'F4,I4': 'Perfect Match',
};

// Score ranges for buckets
const SCORES_TABLE: Record<string, BucketTableEntry> = {
  'Too Basic': {
    min: 0,
    max: 10,
  },
  'Iffy Match': {
    min: 10,
    max: 20,
  },
  'Okay': {
    min: 20,
    max: 30,
  },
  'Good Match': {
    min: 30,
    max: 40,
  },
  'Strong Match': {
    min: 40,
    max: 69,
  },
  'Perfect Match': {
    min: 70,
    max: 100,
  },
  'Out of the box': {
    min: 15,
    max: 35,
  },
};

/**
 * Sanitize a string for use as a filename
 * @param filename Input string
 * @returns Sanitized string
 */
function sanitizeFilename(filename: string): string {
  return filename.replace(/[^\w\-]/g, '_');
}

/**
 * Determine which bucket a candidate falls into based on matching
 * @param candidateData Candidate profile
 * @param jobData Job description
 * @returns Bucket determination result
 */
function determineBucket(
  candidateData: CandidateProfile, 
  jobData: JobDescription
): BucketResult {
  const jobLabels = {
    I1: jobData.I1,
    I2: jobData.I2,
    I3: jobData.I3,
    F1: jobData.F1,
    F2: jobData.F2,
    F3: jobData.F3,
  };

  function getFinalMatchedLevel(
    labels: Record<string, string>,
    candidateLabels: Record<string, string>,
    category: 'I' | 'F'
  ): string {
    let lastMatched = '0'; // Initialize to '0' indicating no match yet
    
    for (const level of ['1', '2', '3']) {
      const key = `${category}${level}`;
      const jobLabel = labels[key];
      const candidateLabel = candidateLabels[key];
      
      if (jobLabel === candidateLabel) {
        lastMatched = level;
      } else {
        break; // Stop at the first mismatch
      }
    }
    
    return `${category}${lastMatched}`;
  }

  const finalI = getFinalMatchedLevel(jobLabels, candidateData, 'I');
  const finalF = getFinalMatchedLevel(jobLabels, candidateData, 'F');
  
  // Lookup in buckets table with the finalF,finalI format
  const lookupKey = `${finalF},${finalI}`;
  const bucketName = BUCKETS_TABLE[lookupKey] || '';

  return {
    final_I: finalI,
    final_F: finalF,
    bucket: bucketName,
  };
}

/**
 * Calculate additional points based on I4 and F4 matching
 * @param candidateData Candidate profile
 * @param jobData Job description
 * @returns Additional points
 */
function getI4AndF4Points(
  candidateData: CandidateProfile,
  jobData: JobDescription
): number {
  if (candidateData.final_I !== 'I4' && candidateData.final_F !== 'F4') {
    return 0;
  }

  function calculatePoints(
    candidateTags: string[],
    jobTags: string[]
  ): number {
    // Convert to sets so duplicates won't affect scoring
    const uniqueCandidateTags = new Set(candidateTags);
    const uniqueJobTags = new Set(jobTags);
    const maxPoints = 15;

    let points = 0;
    const jobTagsCount = uniqueJobTags.size;

    // No job tags => max_points
    if (jobTagsCount === 0) {
      points = maxPoints;
    }
    // Exactly 1 job tag => if it matches, award max_points
    else if (jobTagsCount === 1) {
      const jobTag = Array.from(uniqueJobTags)[0];
      if (uniqueCandidateTags.has(jobTag)) {
        points = maxPoints;
      }
    }
    // Exactly 2 job tags => each matching tag awards max_points/2
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

    // Cap the points at max_points
    return Math.min(points, maxPoints);
  }

  const candidateI4 = candidateData.I4 || '';
  const candidateF4 = candidateData.F4 || '';
  const jobI4 = jobData.I4 || '';
  const jobF4 = jobData.F4 || '';

  const candidateF4Tags = candidateF4.split(',').map(tag => tag.trim());
  const candidateI4Tags = candidateI4.split(',').map(tag => tag.trim());
  const jobF4Tags = jobF4.split(',').map(tag => tag.trim());
  const jobI4Tags = jobI4.split(',').map(tag => tag.trim());

  const f4Points = calculatePoints(candidateF4Tags, jobF4Tags);
  const i4Points = calculatePoints(candidateI4Tags, jobI4Tags);

  return f4Points + i4Points;
}

/**
 * Get rule-based score for a candidate
 * @param candidateData Candidate profile
 * @param jobData Job description
 * @returns Rule-based score
 */
function getRuleBasedScore(
  candidateData: CandidateProfile,
  jobData: JobDescription
): number {
  let ruleBasedScore = candidateData.bucket_score || 0;

  // Location
  if (candidateData.country !== 'Japan') {
    if (candidateData.japanese_level === 'Native') {
      ruleBasedScore -= 40;
    } else {
      ruleBasedScore -= 90;
    }
  }

  // Age
  const ageMatch = candidateData.age.match(/\d+/);
  const candidateAge = ageMatch ? parseInt(ageMatch[0], 10) : 0;
  const jobTargetAge = jobData.target_age;
  const ageDifference = Math.abs(candidateAge - jobTargetAge);
  
  // Only apply penalty if outside the +/- 6 year range
  if (ageDifference > 6) {
    // -1 point every 3 years beyond the 6-year range
    ruleBasedScore -= Math.floor((ageDifference - 6) / 3);
  }
  
  if (candidateAge > 60) {
    ruleBasedScore -= 20;
  } else if (candidateAge > 55) {
    ruleBasedScore -= 10;
  } else if (candidateAge > 50) {
    ruleBasedScore -= 5;
  }

  // Gender
  if (candidateData.gender === 'Female') {
    ruleBasedScore += 5;
  }

  // Japanese Level
  if (candidateData.japanese_level === 'Fluent') {
    ruleBasedScore -= 5;
  } else if (candidateData.japanese_level === 'Business') {
    ruleBasedScore -= 15;
  } else if (
    candidateData.japanese_level === 'Reading/Writing' ||
    candidateData.japanese_level === 'None'
  ) {
    ruleBasedScore -= 80;
  }

  // English Level
  if (jobData.company_hq_location === 'Japan') {
    if (candidateData.english_level === 'Native') {
      ruleBasedScore += 5;
    } else if (candidateData.english_level === 'Fluent') {
      ruleBasedScore += 4;
    } else if (candidateData.english_level === 'Business') {
      ruleBasedScore += 3;
    } else if (candidateData.english_level === 'Reading/Writing') {
      ruleBasedScore += 1;
    }
  } else {
    if (
      candidateData.english_level === 'Native' ||
      candidateData.english_level === 'Fluent'
    ) {
      ruleBasedScore += 10;
    } else if (candidateData.english_level === 'Reading/Writing') {
      ruleBasedScore -= 10;
    } else if (candidateData.english_level === 'None') {
      ruleBasedScore -= 20;
    }
  }

  return ruleBasedScore > 0 ? ruleBasedScore : 0;
}

/**
 * Score candidates against a job description
 * @param jobData Job description
 * @param candidates Array of candidate profiles
 * @param candidatesToScoreCount Number of candidates to score with OpenAI
 * @returns Scored candidates
 */
export async function scoreCandidates(
  jobData: JobDescription,
  candidates: CandidateProfile[],
  candidatesToScoreCount: number = 0
): Promise<CandidateProfile[]> {
  const scoredCandidates: CandidateProfile[] = [];

  for (let i = 0; i < candidates.length; i++) {
    try {
      const candidateData = { ...candidates[i] };
      console.log(`Scoring candidate: ${candidateData.name}`);

      // Determine initial bucket
      const bucket = determineBucket(candidateData, jobData);
      candidateData.final_I = bucket.final_I;
      candidateData.final_F = bucket.final_F;
      candidateData.bucket = bucket.bucket;
      candidateData.bucket_score = 0;
      candidateData.openai_score = 0;
      candidateData.rule_based_score = 0;
      candidateData.final_score = 0;

      if (candidateData.bucket) {
        // Calculate initial score based on bucket
        const initialScore = SCORES_TABLE[bucket.bucket].max;
        const i4AndF4Points = getI4AndF4Points(candidateData, jobData);
        candidateData.bucket_score = initialScore + i4AndF4Points;

        // Update bucket if score is high enough
        if (candidateData.bucket_score >= 70) {
          candidateData.bucket = 'Perfect Match';
        }

        // Use OpenAI for high-scoring candidates or limited number based on setting
        if (candidateData.bucket_score >= 71 || (candidatesToScoreCount > 0 && i < candidatesToScoreCount)) {
          const openaiScore = await getOpenAIScore(candidateData.resume_text || '', jobData);
          candidateData.openai_score = openaiScore || 0;
          candidateData.final_score = openaiScore || 0;
        } else {
          // Use rule-based scoring for the rest
          const ruleBasedScore = getRuleBasedScore(candidateData, jobData);
          candidateData.rule_based_score = ruleBasedScore;
          candidateData.final_score = ruleBasedScore;
        }
      }

      // Remove resume text for CSV output
      delete candidateData.resume_text;
      scoredCandidates.push(candidateData);
    } catch (error) {
      console.error(`Error scoring candidate for job ${jobData.position}:`, error);
    }
  }

  // Save the results to a CSV file
  await saveScoredCandidates(scoredCandidates, jobData);

  return scoredCandidates;
}

/**
 * Save scored candidates to a CSV file
 * @param scoredCandidates Array of scored candidate profiles
 * @param jobData Job description
 */
async function saveScoredCandidates(
  scoredCandidates: CandidateProfile[],
  jobData: JobDescription
): Promise<void> {
  const outputDir = path.join(process.cwd(), 'output', 'scored_candidates');
  fs.mkdirSync(outputDir, { recursive: true });
  
  const outputFile = path.join(
    outputDir,
    `${sanitizeFilename(jobData.company)}_${sanitizeFilename(jobData.position)}_scored_candidates.csv`
  );
  
  // Sort by final score in descending order
  const sortedCandidates = [...scoredCandidates].sort(
    (a, b) => (b.final_score || 0) - (a.final_score || 0)
  );
  
  if (sortedCandidates.length > 0) {
    const fields = Object.keys(sortedCandidates[0]);
    
    const csvWriter = createObjectCsvWriter({
      path: outputFile,
      header: fields.map(field => ({
        id: field,
        title: field
      }))
    });
    
    await csvWriter.writeRecords(sortedCandidates);
  }
}