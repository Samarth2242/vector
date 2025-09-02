import React from 'react';

function JobStatus({ jobId, jobStatus, error, videoUrl, handleCleanup }) {
  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg border border-gray-700 mt-8">
      <h2 className="text-lg font-semibold mb-4">Job Status</h2>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {jobId && jobStatus && (
        <div className="border border-gray-700 rounded-md p-4 mb-4">
          <p>
            <strong>Job ID:</strong> {jobId}
          </p>
          <p>
            <strong>Status:</strong> {jobStatus.status}
          </p>
          {jobStatus.status === 'processing' && (
            <div className="w-full bg-gray-700 rounded-full h-2.5 my-4">
              <div className="bg-blue-600 h-2.5 rounded-full w-1/2"></div>
            </div>
          )}
        </div>
      )}

      {videoUrl && (
        <div className="border border-gray-700 rounded-md p-4">
          <h2 className="text-lg font-semibold mb-4">Result</h2>
          <video controls className="w-full border rounded mb-4">
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          <div className="flex space-x-2">
            <a
              href={videoUrl}
              download
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors duration-300"
            >
              Download Video
            </a>
            <button
              onClick={handleCleanup}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors duration-300"
            >
              Clear Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default JobStatus;
