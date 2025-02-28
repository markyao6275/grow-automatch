import React from 'react';
import { ScoredCandidate } from '@/types';

interface CandidatesTableProps {
  candidates: ScoredCandidate[];
  position: string;
  company: string;
}

const CandidatesTable: React.FC<CandidatesTableProps> = ({ 
  candidates, 
  position,
  company,
}) => {
  if (!candidates || candidates.length === 0) {
    return (
      <div className="text-center p-4 border rounded-lg">
        <p className="text-gray-500">No candidates found</p>
      </div>
    );
  }

  // Get bucket color class based on score
  const getBucketColorClass = (bucket: string | undefined) => {
    switch (bucket) {
      case 'Perfect Match':
        return 'bg-green-100 text-green-800';
      case 'Strong Match':
        return 'bg-teal-100 text-teal-800';
      case 'Good Match':
        return 'bg-blue-100 text-blue-800';
      case 'Okay':
        return 'bg-yellow-100 text-yellow-800';
      case 'Iffy Match':
        return 'bg-orange-100 text-orange-800';
      case 'Too Basic':
        return 'bg-red-100 text-red-800';
      case 'Out of the box':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get score color class based on score
  const getScoreColorClass = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-blue-600';
    if (score >= 30) return 'text-yellow-600';
    if (score >= 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="overflow-x-auto">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{position} at {company}</h2>
        <p className="text-sm text-gray-600">{candidates.length} candidates matched</p>
      </div>
      
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Candidate
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Current Position
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Languages
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Location
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Matching
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Score
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {candidates.map((candidate, index) => (
            <tr key={candidate.id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {candidate.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {candidate.current_company}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{candidate.current_position}</div>
                <div className="text-xs text-gray-500">
                  Age: {candidate.age}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  JP: {candidate.japanese_level}
                </div>
                <div className="text-sm text-gray-900">
                  EN: {candidate.english_level}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {candidate.city}, {candidate.country}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getBucketColorClass(candidate.bucket)}`}>
                  {candidate.bucket}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span className={`font-bold ${getScoreColorClass(candidate.final_score)}`}>
                  {candidate.final_score}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CandidatesTable;