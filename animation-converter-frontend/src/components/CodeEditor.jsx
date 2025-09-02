import React from 'react';

function CodeEditor({ formData, handleInputChange }) {
  const getPreviewUri = () => {
    if (formData.input_type === 'svg') {
      return `data:image/svg+xml;base64,${btoa(formData.input_code)}`;
    } else {
      return `data:text/html;charset=utf-8,${encodeURIComponent(formData.input_code)}`;
    }
  };

  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg border border-gray-700">
      <h2 className="text-lg font-semibold mb-4">Code</h2>
      <div>
        <label className="block text-sm font-medium mb-2">
          Input Type
          <select
            name="input_type"
            value={formData.input_type}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-white shadow-sm p-2 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="svg">SVG</option>
            <option value="html">HTML</option>
          </select>
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2 mt-4">
          Input Code
          <textarea
            name="input_code"
            value={formData.input_code}
            onChange={handleInputChange}
            rows="15"
            className="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-white shadow-sm p-2 border font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </label>
      </div>
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">Live Preview</h3>
        <iframe
          className="border border-gray-700 rounded-md w-full h-64 bg-white"
          src={getPreviewUri()}
          sandbox="allow-scripts"
        />
      </div>
    </div>
  );
}

export default CodeEditor;
