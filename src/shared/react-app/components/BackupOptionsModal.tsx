import { useState } from 'react';
import { X, Download, Check, AlertCircle } from 'lucide-react';
import { localStorageService } from '@/react-app/services/localStorage';
import { exportToJSON } from '@/react-app/utils/exportRace';

interface BackupOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  raceId: number;
  raceName: string;
}

export default function BackupOptionsModal({
  isOpen,
  onClose,
  raceId,
  raceName,
}: BackupOptionsModalProps) {
  const [exportSuccess, setExportSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLocalExport = () => {
    try {
      // Get race data
      const race = localStorageService.getRace(raceId);
      if (!race) {
        setError('Race not found');
        return;
      }

      const segments = localStorageService.getSegmentsByRaceId(raceId);
      const elevationLabels = localStorageService.getElevationLabelsByRaceId(raceId);

      // Export to JSON
      exportToJSON(race, segments, elevationLabels);

      setExportSuccess(true);
      setError(null);

      // Close modal after export
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError('Failed to export race data');
      console.error('Export error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white dark:bg-[#2d3548] coloursplash:bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700 coloursplash:border-splash-border">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white coloursplash:text-splash-text-primary">
              Backup Options
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-secondary hover:text-gray-900 dark:hover:text-white coloursplash:hover:text-splash-text-primary hover:bg-gray-100 dark:hover:bg-[#333c52] coloursplash:hover:bg-splash-azure-light rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-4">
            <p className="text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-secondary">
              Export your race plan for: <strong className="text-gray-900 dark:text-white coloursplash:text-splash-text-primary">{raceName}</strong>
            </p>
          </div>

          {/* Success Message */}
          {exportSuccess && (
            <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-2 text-green-400">
              <Check className="w-5 h-5" />
              <span className="font-medium">Export successful!</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-2 text-red-400">
              <AlertCircle className="w-5 h-5 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Export Option */}
          <div className="space-y-3">
            <button
              onClick={handleLocalExport}
              className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-blue-500 to-purple-600 coloursplash:from-splash-azure coloursplash:to-splash-green hover:from-blue-600 hover:to-purple-700 rounded-lg transition-all text-left"
            >
              <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg">
                <Download className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white">
                  Export to JSON File
                </div>
                <div className="text-sm text-white/80">
                  Download a backup file to your device
                </div>
              </div>
            </button>
          </div>

          {/* Info */}
          <div className="mt-6 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="text-xs text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-secondary">
              <strong className="text-blue-400">Tip:</strong> You can import this JSON file later using the "Import Race Plan" button on the home screen.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
