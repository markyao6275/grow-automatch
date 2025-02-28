# Grow AutoMatch - Web Version

A Next.js application for matching resumes with job descriptions using AI, focusing on the Japanese job market.

## Features

- PDF resume and job description processing
- AI-powered profile extraction
- Sophisticated candidate scoring system
- Rule-based and OpenAI-powered matching
- Web-based user interface

## Getting Started

### Prerequisites

- Node.js 18.0.0 or later
- OpenAI API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/grow-automatch.git
   cd grow-automatch/web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Build for Production

Build the application for production:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

## Usage

1. Upload resume PDFs using the resume upload area
2. Upload job description PDFs using the job description upload area
3. Set the number of candidates to score with OpenAI (0 means only score candidates with a bucket score ≥ 71)
4. Click "Start Processing" to process everything
5. View the results in the table below

## Project Structure

```
grow-automatch/web/
├── public/              # Static assets
├── src/
│   ├── app/             # Next.js app directory
│   │   ├── api/         # API routes
│   │   │   ├── process-resumes/
│   │   │   ├── process-job-descriptions/
│   │   │   └── score-candidates/
│   │   ├── globals.css  # Global styles
│   │   ├── layout.tsx   # Root layout
│   │   └── page.tsx     # Main page
│   ├── components/      # React components
│   ├── lib/             # Utility functions
│   │   ├── config.ts    # Configuration
│   │   ├── openai/      # OpenAI API client
│   │   ├── pdf-parser/  # PDF parsing utilities
│   │   ├── processing/  # Data processing
│   │   └── scoring/     # Candidate scoring
│   └── types/           # TypeScript types
└── ...
```

This project is a NextJS migration of the original Python-based Grow AutoMatch application, using the same algorithms but with a web interface.

## Technology Stack

- **Frontend**: Next.js, React, TypeScript, TailwindCSS
- **PDF Processing**: pdf2json
- **AI Integration**: OpenAI API (GPT-4o)
- **API**: Next.js API Routes

## License

This project is proprietary.
