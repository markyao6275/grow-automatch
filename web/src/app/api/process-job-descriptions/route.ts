import { NextRequest, NextResponse } from 'next/server';
import { processJobDescriptions } from '@/lib/processing/process-job-descriptions';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No job description files provided' },
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

    // Process job descriptions
    const jobDescriptions = await processJobDescriptions(files);

    return NextResponse.json({ 
      success: true,
      jobDescriptions,
      count: jobDescriptions.length,
    });
  } catch (error) {
    console.error('Error processing job descriptions:', error);
    return NextResponse.json(
      { error: 'Failed to process job descriptions' },
      { status: 500 }
    );
  }
}