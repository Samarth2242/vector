import React from 'react';

function RenderOptions({ formData, handleInputChange, handleSubmit, isLoading }) {
  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg border border-gray-700">
      <h2 className="text-lg font-semibold mb-4">Render Options</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Duration (seconds)
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                min="1"
                max="60"
                step="0.5"
                className="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-white shadow-sm p-2 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Bitrate
              <select
                name="bitrate"
                value={formData.bitrate}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-white shadow-sm p-2 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="4000k">Low (4000k)</option>
                <option value="8000k">Medium (8000k)</option>
                <option value="16000k">High (16000k)</option>
                <option value="24000k">Ultra (24000k)</option>
              </select>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Scale Factor
              <input
                type="number"
                name="scale_factor"
                value={formData.scale_factor}
                onChange={handleInputChange}
                min="1"
                max="4"
                step="0.5"
                className="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-white shadow-sm p-2 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Width × Height
              <div className="flex space-x-2">
                <input
                  type="number"
                  name="width"
                  value={formData.width}
                  onChange={handleInputChange}
                  min="100"
                  max="3840"
                  className="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-white shadow-sm p-2 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="mt-3">×</span>
                <input
                  type="number"
                  name="height"
                  value={formData.height}
                  onChange={handleInputChange}
                  min="100"
                  max="2160"
                  className="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-white shadow-sm p-2 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </label>
          </div>
        </div>

        <div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors duration-300 disabled:bg-gray-500"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Render Animation'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default RenderOptions;
