import { NextRequest, NextResponse } from 'next/server';
import { processResumes } from '@/lib/processing/process-resumes';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No resume files provided' },
        { status: 400 }
      );
    }

    // Only allow PDF files
    const invalidFiles = files.filter(file => file.type !== 'application/pdf');
    if (invalidFiles.length > 0) {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Process resumes
    const candidateProfiles = await processResumes(files);

    return NextResponse.json({ 
      success: true,
      candidateProfiles,
      count: candidateProfiles.length,
    });
  } catch (error) {
    console.error('Error processing resumes:', error);
    return NextResponse.json(
      { error: 'Failed to process resumes' },
      { status: 500 }
    );
  }
}