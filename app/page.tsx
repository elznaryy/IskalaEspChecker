'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('');
  const [downloadLink, setDownloadLink] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [showCheckboxes, setShowCheckboxes] = useState(false);
  const [estimatedProgress, setEstimatedProgress] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false); // State for dark mode


  const providerOptions = [
    { value: 'Google', label: 'Google' },
    { value: 'Outlook', label: 'Outlook' },
    { value: 'GoogleAndOthers', label: 'Google & Others' },
    { value: 'OthersOnly', label: 'Others Only' },
    { value: 'All', label: 'All but categorized' },
  ];

  useEffect(() => {
    if (file) {
      setShowCheckboxes(true);
    } else {
      setShowCheckboxes(false);
      setSelectedProviders([]);
    }
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setStatus('');
      setProgress(0);
    } else {
      setFile(null);
      setStatus('Please select a valid CSV file.');
    }
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSelectedProviders(prev => 
      e.target.checked 
        ? [...prev, value]
        : prev.filter(item => item !== value)
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setStatus('Please select a file first.');
      return;
    }

    if (selectedProviders.length === 0) {
      setStatus('Please select at least one provider option.');
      return;
    }

    setStatus('Processing...');
    setIsProcessing(true);
    setProgress(0);
    setEstimatedProgress(0);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('providers', JSON.stringify(selectedProviders));

    // Start the estimated progress animation
    const progressInterval = setInterval(() => {
      setEstimatedProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + (95 - prev) * 0.1;
      });
    }, 500);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          try {
            const data = JSON.parse(chunk);
            if (data.progress) {
              setProgress(data.progress);
              setEstimatedProgress(data.progress);
            }
            if (data.success) {
              clearInterval(progressInterval);
              setEstimatedProgress(100);
              if (data.fileUrl) {
                setStatus('File processed successfully!');
                setDownloadLink(data.fileUrl);
              } else {
                setStatus('Processing completed, but no file was generated. Please try again.');
              }
              break;
            }
          } catch {
            // Not a JSON chunk, ignore
          }
        }
      } else {
        const data = await response.json();
        if (data.success && data.fileUrl) {
          setStatus('File processed successfully!');
          setDownloadLink(data.fileUrl);
        } else {
          setStatus(`Failed to process file: ${data.message || 'No file generated'}`);
        }
      }
    } catch (error) {
      clearInterval(progressInterval);
      setStatus(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      clearInterval(progressInterval);
      setIsProcessing(false);
    }
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-indigo-100 to-purple-100'}`}>
      <header className="flex justify-between items-center p-4">
        {/* Dark mode toggle button */}
        <button 
          onClick={toggleDarkMode} 
          className="mt-4 p-2 rounded-md"
          aria-label="Toggle Dark Mode"
        >
          {isDarkMode ? (
            <span role="img" aria-label="Light Mode">🌞</span> // Sun icon for light mode
          ) : (
            <span role="img" aria-label="Dark Mode">🌜</span> // Moon icon for dark mode
          )}
        </button>
      </header>
      <main className="flex-grow flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8 dark:bg-gray-800">
          <h1 className="text-4xl font-bold mb-6 text-center text-indigo-700">Iskala ESP Checker</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="mb-4">
              <label htmlFor="csvFile" className="block text-sm font-medium text-gray-700 mb-2">
                Upload CSV File
              </label>
              <input
                type="file"
                id="csvFile"
                accept=".csv"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            {showCheckboxes && (
              <div className="mb-4">
                <p className="block text-sm font-medium text-gray-700 mb-2">Select ESP Providers:</p>
                {providerOptions.map((option) => (
                  <div key={option.value} className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id={option.value}
                      value={option.value}
                      checked={selectedProviders.includes(option.value)}
                      onChange={handleProviderChange}
                      className="mr-2"
                    />
                    <label htmlFor={option.value}>{option.label}</label>
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              disabled={isProcessing || !file || selectedProviders.length === 0}
            >
              {isProcessing ? 'Processing...' : 'Process File'}
            </button>
          </form>

          {isProcessing && (
            <div className="mt-4 w-full max-w-md">
              <div className="bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div 
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
                  style={{ width: `${Math.max(estimatedProgress, progress)}%` }}
                ></div>
              </div>
              <p className="text-center mt-2">{Math.round(Math.max(estimatedProgress, progress))}% Complete</p>
            </div>
          )}
          {status && <p className="mt-4 text-center text-sm text-gray-700">{status}</p>}
          {downloadLink && (
            <a
              href={downloadLink}
              download
              className="mt-4 text-indigo-600 hover:text-indigo-800"
            >
              Download Processed File
            </a>
          )}
        </div>
      </main>

      <footer className="w-full bg-indigo-700 text-white py-4 px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <p>© 2024 Iskala ESP Checker</p>
          <p>
            <Link href="https://leadgen.iskala.net/" target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-200 transition duration-200">
              iskala
            </Link> | {' '}
            <Link href="https://www.linkedin.com/in/ahmed-elznary-82b66a1b7/" target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-200 transition duration-200">
              Ahmed Elznary
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
