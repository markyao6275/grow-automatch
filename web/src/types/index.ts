// PDF Processing Types
export interface ProcessedPdfResult {
  text: string;
}

// Candidate Profile Types
export interface CandidateProfile {
  id?: string;
  filename: string;
  name: string;
  current_company: string;
  current_position: string;
  previous_company_1: string;
  previous_position_1: string;
  previous_company_2: string;
  previous_position_2: string;
  country: string;
  city: string;
  age: string;
  gender: string;
  japanese_level: string;
  english_level: string;
  other_languages: string;
  I1: string;
  I2: string;
  I3: string;
  I4: string;
  F1: string;
  F2: string;
  F3: string;
  F4: string;
  resume_text?: string;
  final_I?: string;
  final_F?: string;
  bucket?: string;
  bucket_score?: number;
  openai_score?: number;
  rule_based_score?: number;
  final_score?: number;
}

// Job Description Types
export interface JobDescription {
  id?: string;
  filename: string;
  company: string;
  position: string;
  country: string;
  city: string;
  job_level: number;
  company_size: string;
  company_hq_location: string;
  employee_count_in_japan: string;
  english_level_required: string;
  japanese_level_required: string;
  target_age: number;
  compensation_range: string;
  I1: string;
  I2: string;
  I3: string;
  I4: string;
  F1: string;
  F2: string;
  F3: string;
  F4: string;
  job_description_text?: string;
}

// Scoring Types
export interface BucketResult {
  final_I: string;
  final_F: string;
  bucket: string;
}

export interface BucketTableEntry {
  min: number;
  max: number;
}

export interface ScoresTable {
  [key: string]: BucketTableEntry;
}

export interface BucketsTable {
  [key: string]: string;
}

// Form Types
export interface UploadFormData {
  resumes: File[];
  jobDescriptions: File[];
  candidatesToScore: number;
}

// Results Types
export interface ScoredCandidate extends CandidateProfile {
  final_score: number;
}

export interface ProcessingResult {
  jobDescription: JobDescription;
  candidates: ScoredCandidate[];
}