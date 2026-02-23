import { PROVIDER_INFO } from '../../lib/llm';

interface WebLLMSectionProps {
  model: string;
  setModel: (model: string) => void;
  downloadProgress: number;
  downloadStatus: string;
  isDownloading: boolean;
  statusIcon: string;
  onDownload: () => void;
}

export function WebLLMSection({
  model,
  setModel,
  downloadProgress,
  downloadStatus,
  isDownloading,
  statusIcon,
  onDownload,
}: WebLLMSectionProps) {
  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 mb-6">
      <h2 className="text-lg font-medium text-echo-text mb-4">
        {statusIcon} On-Device Model (WebLLM)
      </h2>

      <div className="mb-4">
        <label className="block text-sm text-echo-muted mb-2">Model</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={isDownloading}
          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-echo-text text-echo-text bg-white"
        >
          {PROVIDER_INFO.webllm.models.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Download progress */}
      {(isDownloading || downloadProgress > 0) && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-echo-muted">{downloadStatus}</span>
            <span className="text-echo-text">{downloadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-echo-text h-2 rounded-full transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        </div>
      )}

      <button
        onClick={onDownload}
        disabled={isDownloading || downloadProgress === 100}
        className="px-4 py-2 bg-gray-100 text-echo-text rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
      >
        {downloadProgress === 100
          ? 'Downloaded'
          : isDownloading
            ? 'Downloading...'
            : `Download Model (${model.includes('SmolLM2') ? '~250MB' : '~400MB'})`}
      </button>

      <p className="text-echo-hint text-xs mt-3">
        Runs entirely in your browser using WebGPU. Requires a modern browser with WebGPU support.
      </p>
    </section>
  );
}
