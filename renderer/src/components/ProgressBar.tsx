import { useStore } from '../store/useStore';

export function ProgressBar() {
  const { processingStatus, progress, errorMessage, setProcessingStatus } = useStore();

  if (processingStatus === 'idle') return null;

  const handleDismiss = () => {
    setProcessingStatus('idle');
  };

  return (
    <div className="fixed bottom-4 right-4 left-4 md:left-auto md:w-96 bg-background-200 
                    rounded-lg shadow-xl border border-background-300 p-4 z-50">
      {processingStatus === 'processing' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-text-900">Processing...</span>
            <span className="text-sm text-text-600">{progress}%</span>
          </div>
          <div className="w-full bg-background-300 rounded-full h-2">
            <div
              className="bg-primary-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <button
            onClick={async () => {
              await window.quickcut.cancelJob();
              setProcessingStatus('cancelled');
            }}
            className="mt-3 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {processingStatus === 'completed' && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-text-900">Export completed!</span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-text-600 hover:text-text-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {processingStatus === 'error' && (
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-text-900">Export failed</span>
            </div>
            <button
              onClick={handleDismiss}
              className="text-text-600 hover:text-text-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {errorMessage && (
            <p className="mt-2 text-xs text-red-400">{errorMessage}</p>
          )}
        </div>
      )}

      {processingStatus === 'cancelled' && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm text-text-900">Export cancelled</span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-text-600 hover:text-text-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
