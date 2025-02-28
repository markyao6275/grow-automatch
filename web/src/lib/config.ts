// Default number of candidates to score with OpenAI
// 0 means only score candidates with a bucket score >= 71
export const DEFAULT_CANDIDATES_TO_SCORE = 0;

// Application settings
export const APP_SETTINGS = {
  title: 'Grow AutoMatch',
  description: 'AI-powered resume matching for the Japanese job market',
  version: '1.0.0',
  logoPath: '/grow_logo.png',
  backgroundPath: '/grow_bg.jpeg',
};

// Output file settings
export const OUTPUT_SETTINGS = {
  directory: 'output',
  scoredCandidatesDir: 'scored_candidates',
  csvTimestampFormat: 'yyyyMMdd_HHmmss',
};

// OpenAI settings
export const OPENAI_SETTINGS = {
  model: 'gpt-4o',
  temperature: 0,
  logFilePath: 'logs/openai_usage.log',
};

// File type restrictions
export const FILE_RESTRICTIONS = {
  allowedTypes: ['application/pdf'],
  maxSizeMB: 10, // Maximum file size in MB
  maxFiles: 20, // Maximum number of files per upload
};

// Path configuration
export const PATHS = {
  resumes: '/resumes',
  jobDescriptions: '/job-descriptions',
  results: '/results',
  api: {
    processResumes: '/api/process-resumes',
    processJobDescriptions: '/api/process-job-descriptions',
    scoreCandidates: '/api/score-candidates',
  },
};