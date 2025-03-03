'use client';

import React, { useState } from 'react';
import Image from "next/image";
import FileUpload from '@/components/FileUpload';
import LoadingSpinner from '@/components/LoadingSpinner';
import CandidatesTable from '@/components/CandidatesTable';
import { CandidateProfile, JobDescription, ScoredCandidate } from '@/types';
import { DEFAULT_CANDIDATES_TO_SCORE } from '@/lib/config';
import candidatesJson from '@/mocks/candidates.json';
import jobDescriptionsJson from '@/mocks/asana.json';

export default function Home() {
  // State for file uploads
  const [resumeFiles, setResumeFiles] = useState<File[]>([]);
  const [jobDescriptionFiles, setJobDescriptionFiles] = useState<File[]>([]);
  const [candidatesToScore, setCandidatesToScore] = useState<number>(DEFAULT_CANDIDATES_TO_SCORE);
  
  // State for processing
  const [processingResumes, setProcessingResumes] = useState<boolean>(false);
  const [processingJobDescriptions, setProcessingJobDescriptions] = useState<boolean>(false);
  const [scoringCandidates, setScoringCandidates] = useState<boolean>(false);
  
  // State for results
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([]);
  const [scoredCandidates, setScoredCandidates] = useState<ScoredCandidate[]>([]);
  const [selectedJobDescription, setSelectedJobDescription] = useState<JobDescription | null>(null);
  
  // State for errors
  const [error, setError] = useState<string | null>(null);

  // Process resume files
  const handleProcessResumes = async () => {
    if (resumeFiles.length === 0) {
      setError('Please select at least one resume file');
      return;
    }
    
    setError(null);
    setProcessingResumes(true);
    
    try {
      // const formData = new FormData();
      // resumeFiles.forEach(file => {
      //   formData.append('files', file);
      // });
      
      // const response = await fetch('/api/process-resumes', {
      //   method: 'POST',
      //   body: formData,
      // });
      
      // const data = await response.json();
      
      // if (!response.ok) {
      //   throw new Error(data.error || 'Failed to process resumes');
      // }
      
      // setCandidates(data.candidateProfiles);
      setCandidates(candidatesJson)
      setProcessingResumes(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to process resumes');
    } finally {
      setProcessingResumes(false);
    }
  };
  
  // Process job description files
  const handleProcessJobDescriptions = async () => {
    if (jobDescriptionFiles.length === 0) {
      setError('Please select at least one job description file');
      return;
    }
    
    setError(null);
    setProcessingJobDescriptions(true);
    
    try {
      // const formData = new FormData();
      // jobDescriptionFiles.forEach(file => {
      //   formData.append('files', file);
      // });
      
      // const response = await fetch('/api/process-job-descriptions', {
      //   method: 'POST',
      //   body: formData,
      // });
      
      // const data = await response.json();
      
      // if (!response.ok) {
      //   throw new Error(data.error || 'Failed to process job descriptions');
      // }

      const data = { jobDescriptions: jobDescriptionsJson}

      
      setJobDescriptions(data.jobDescriptions);
      if (data.jobDescriptions.length > 0) {
        setSelectedJobDescription(data.jobDescriptions[0]);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to process job descriptions');
    } finally {
      setProcessingJobDescriptions(false);
    }
  };
  
  // Score candidates against selected job description
  const handleScoreCandidates = async () => {
    if (candidates.length === 0) {
      setError('Please process resumes first');
      return;
    }
    
    if (!selectedJobDescription) {
      setError('Please select a job description');
      return;
    }
    
    setError(null);
    setScoringCandidates(true);
    
    try {
      const response = await fetch('/api/score-candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidates,
          jobDescription: selectedJobDescription,
          candidatesToScore,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to score candidates');
      }
      
      setScoredCandidates(data.scoredCandidates);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to score candidates');
    } finally {
      setScoringCandidates(false);
    }
  };
  
  // Start the full processing workflow
  const handleStartProcessing = async () => {
    if (resumeFiles.length === 0 || jobDescriptionFiles.length === 0) {
      setError('Please select both resume and job description files');
      return;
    }
    
    setError(null);
    
    // Process resumes
    await handleProcessResumes();
    
    // Process job descriptions
    await handleProcessJobDescriptions();
    
    // Score candidates (only if both previous steps succeeded)
    if (candidates.length > 0 && jobDescriptions.length > 0) {
      await handleScoreCandidates();
    }
  };
  
  // Handle job description selection
  const handleJobDescriptionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const jobId = e.target.value;
    const selected = jobDescriptions.find(job => job.id === jobId) || null;
    setSelectedJobDescription(selected);
    
    // Clear scored candidates when changing job description
    setScoredCandidates([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center">
            {/* <Image 
              src="/grow_logo.png" 
              alt="Grow Logo" 
              width={40} 
              height={100} 
              className="mr-2"
            /> */}
            <h1 className="text-xl font-bold text-blue-900">Grow </h1>
          </div>
          <div className="text-sm text-gray-500">
            {/* TODO: Navbar */}
            
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-8">
        {/* File Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <FileUpload 
              label="Upload Resumes"
              onFilesSelected={setResumeFiles}
            />
            <div className="mt-2 text-xs text-gray-500">
              {resumeFiles.length > 0 && `${resumeFiles.length} resumes selected`}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <FileUpload 
              label="Upload Job Descriptions"
              onFilesSelected={setJobDescriptionFiles}
            />
            <div className="mt-2 text-xs text-gray-500">
              {jobDescriptionFiles.length > 0 && `${jobDescriptionFiles.length} job descriptions selected`}
            </div>
          </div>
        </div>
        
        {/* Options & Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-black">Options</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Candidates to Score with OpenAI
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={candidatesToScore}
                  onChange={(e) => setCandidatesToScore(Number(e.target.value))}
                  className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                <span className="ml-2 text-sm text-gray-500">
                  (0 = only score candidates with bucket score ≥ 71)
                </span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Job Description
              </label>
              <select
                value={selectedJobDescription?.id || ''}
                onChange={handleJobDescriptionChange}
                disabled={jobDescriptions.length === 0}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                {jobDescriptions.length === 0 ? (
                  <option value="">No job descriptions available</option>
                ) : (
                  jobDescriptions.map(job => (
                    <option key={job.id} value={job.id}>
                      {job.position} at {job.company}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
          
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleStartProcessing}
              disabled={resumeFiles.length === 0 || jobDescriptionFiles.length === 0 || processingResumes || processingJobDescriptions || scoringCandidates}
              className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(processingResumes || processingJobDescriptions || scoringCandidates) ? (
                <LoadingSpinner size="sm" text="Processing..." />
              ) : (
                'Start Processing'
              )}
            </button>
            
            <button
              onClick={handleScoreCandidates}
              disabled={candidates.length === 0 || !selectedJobDescription || scoringCandidates}
              className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {scoringCandidates ? (
                <LoadingSpinner size="sm" text="Scoring..." />
              ) : (
                'Score Candidates'
              )}
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-100 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}
          
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div className="rounded-md bg-blue-50 p-3">
              <p className="font-medium text-blue-800">Resumes:</p>
              <p className="text-blue-600">{candidates.length} processed</p>
            </div>
            <div className="rounded-md bg-green-50 p-3">
              <p className="font-medium text-green-800">Job Descriptions:</p>
              <p className="text-green-600">{jobDescriptions.length} processed</p>
            </div>
            <div className="rounded-md bg-purple-50 p-3">
              <p className="font-medium text-purple-800">Candidates Matched:</p>
              <p className="text-purple-600">{scoredCandidates.length} matched</p>
            </div>
          </div>
        </div>
        
        {/* Results Section */}
        {scoredCandidates.length > 0 && selectedJobDescription && (
          <div className="bg-white rounded-lg shadow-md p-6 overflow-hidden">
            <h2 className="text-lg font-semibold mb-4 text-black">Results</h2>
            
            <CandidatesTable 
              candidates={scoredCandidates.sort((a, b) => b.final_score - a.final_score)}
              position={selectedJobDescription.position}
              company={selectedJobDescription.company}
            />
          </div>
        )}
      </div>
      
      {/* Footer */}
      <footer className="bg-gray-50 py-4 mt-8 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Grow AutoMatch. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
