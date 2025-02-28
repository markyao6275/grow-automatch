import { NextRequest, NextResponse } from 'next/server';
import { scoreCandidates } from '@/lib/scoring';
import { CandidateProfile, JobDescription } from '@/types';
import { DEFAULT_CANDIDATES_TO_SCORE } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { candidates, jobDescription, candidatesToScore = DEFAULT_CANDIDATES_TO_SCORE } = body;
    
    if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
      return NextResponse.json(
        { error: 'No candidates provided' },
        { status: 400 }
      );
    }
    
    if (!jobDescription) {
      return NextResponse.json(
        { error: 'No job description provided' },
        { status: 400 }
      );
    }
    
    // Score candidates
    const scoredCandidates = await scoreCandidates(
      candidates as CandidateProfile[],
      jobDescription as JobDescription,
      candidatesToScore as number
    );
    
    return NextResponse.json({
      success: true,
      scoredCandidates,
      count: scoredCandidates.length,
      jobDescription,
    });
  } catch (error) {
    console.error('Error scoring candidates:', error);
    return NextResponse.json(
      { error: 'Failed to score candidates' },
      { status: 500 }
    );
  }
}