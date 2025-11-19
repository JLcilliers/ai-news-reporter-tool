'use client';

import { useState } from 'react';

export default function Home() {
  const [businessData, setBusinessData] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!businessData.trim()) {
      setError('Please enter some business data');
      return;
    }

    setLoading(true);
    setError('');
    setVideoUrl('');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ businessData }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate video');
      }

      setVideoUrl(data.videoUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            AI News Reporter
          </h1>
          <p className="text-zinc-400 text-lg">
            Transform your business data into professional news videos
          </p>
        </header>

        <div className="bg-zinc-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-zinc-700">
          <label htmlFor="businessData" className="block text-sm font-semibold mb-3 text-zinc-300">
            Enter Your Weekly Business Data
          </label>
          <textarea
            id="businessData"
            value={businessData}
            onChange={(e) => setBusinessData(e.target.value)}
            placeholder="Example: This week we launched a new product, increased sales by 20%, hired 5 new team members..."
            className="w-full h-48 px-4 py-3 bg-zinc-900 border border-zinc-600 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            disabled={loading}
          />

          {error && (
            <div className="mt-4 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="mt-6 w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-zinc-600 disabled:to-zinc-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Video...
              </span>
            ) : (
              'Generate News Video'
            )}
          </button>
        </div>

        {videoUrl && (
          <div className="mt-8 bg-zinc-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-zinc-700">
            <h2 className="text-2xl font-bold mb-4 text-center">Your News Video is Ready!</h2>
            <div className="aspect-video bg-black rounded-xl overflow-hidden mb-6">
              <video
                controls
                className="w-full h-full"
                src={videoUrl}
              >
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="flex gap-4">
              <input
                type="text"
                value={videoUrl}
                readOnly
                className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-600 rounded-lg text-zinc-300 text-sm"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(videoUrl);
                  alert('URL copied to clipboard!');
                }}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Copy URL
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
