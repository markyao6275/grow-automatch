import React, { useRef, useState } from 'react';
import { FILE_RESTRICTIONS } from '@/lib/config';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  label: string;
  accept?: string;
  multiple?: boolean;
  className?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  label,
  accept = 'application/pdf',
  multiple = true,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    
    if (e.target.files) {
      const files = Array.from(e.target.files);
      
      // Check file types
      const invalidFiles = files.filter(file => 
        !FILE_RESTRICTIONS.allowedTypes.includes(file.type)
      );
      
      if (invalidFiles.length > 0) {
        setError('Only PDF files are allowed');
        return;
      }
      
      // Check file sizes
      const oversizedFiles = files.filter(file => 
        file.size > FILE_RESTRICTIONS.maxSizeMB * 1024 * 1024
      );
      
      if (oversizedFiles.length > 0) {
        setError(`Files must be less than ${FILE_RESTRICTIONS.maxSizeMB}MB`);
        return;
      }
      
      // Check number of files
      if (files.length > FILE_RESTRICTIONS.maxFiles) {
        setError(`Maximum ${FILE_RESTRICTIONS.maxFiles} files allowed`);
        return;
      }
      
      setSelectedFiles(files);
      onFilesSelected(files);
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium">{label}</label>
        {selectedFiles.length > 0 && (
          <span className="text-xs text-gray-500">
            {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
          </span>
        )}
      </div>
      
      <div 
        onClick={handleClick}
        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={accept}
          multiple={multiple}
          className="hidden"
        />
        
        <div className="flex flex-col items-center justify-center gap-2">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6 text-gray-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3-3m0 0l3 3m-3-3v12" 
            />
          </svg>
          
          <p className="text-sm text-gray-500">
            Click to browse or drag and drop files
          </p>
          
          <p className="text-xs text-gray-400">
            Only PDF files, max {FILE_RESTRICTIONS.maxSizeMB}MB
          </p>
        </div>
      </div>
      
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
      
      {selectedFiles.length > 0 && (
        <div className="mt-2">
          <h4 className="text-sm font-medium mb-1">Selected Files:</h4>
          <ul className="text-xs text-gray-600 max-h-32 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <li key={index} className="truncate">
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUpload;