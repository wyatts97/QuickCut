import { useStore, OutputFormat } from '../store/useStore';

const formats: { value: OutputFormat; label: string; description: string }[] = [
  { value: 'mp4', label: 'MP4', description: 'Most compatible' },
  { value: 'webm', label: 'WebM', description: 'Web optimized' },
  { value: 'mov', label: 'MOV', description: 'Apple compatible' },
];

export function FormatSelector() {
  const { outputFormat, setOutputFormat, processingStatus } = useStore();

  const isDisabled = processingStatus === 'processing';

  return (
    <div className="bg-background-200 rounded-lg p-4">
      <h3 className="text-sm font-medium text-text-900 mb-3">Output Format</h3>
      
      <div className="flex gap-2">
        {formats.map((format) => (
          <button
            key={format.value}
            onClick={() => setOutputFormat(format.value)}
            disabled={isDisabled}
            className={`flex-1 px-3 py-2 rounded-lg border transition-colors
              ${outputFormat === format.value
                ? 'bg-primary-500/20 border-primary-500 text-primary-600'
                : 'bg-background-300 border-background-400 text-text-700 hover:border-background-500'
              }
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="text-sm font-medium">{format.label}</div>
            <div className="text-xs opacity-70">{format.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
