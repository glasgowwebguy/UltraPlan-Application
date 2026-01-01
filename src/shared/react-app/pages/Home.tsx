import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Helmet } from 'react-helmet-async';
import { Plus, Mountain, Activity, Upload } from 'lucide-react';
import { useRaces } from '@/react-app/hooks/useRaces';
import RaceCard from '@/react-app/components/RaceCard';
import CreateRaceModal from '@/react-app/components/CreateRaceModal';
import Footer from '@/react-app/components/Footer';
import { importFromJSON, createRaceFromImport } from '@/react-app/utils/importRace';
import { SAMPLE_RACES } from '@/react-app/utils/sampleData';

export default function Home() {
  const navigate = useNavigate();
  const { races, loading, createRace, deleteRace, refreshRaces } = useRaces();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load sample data on first app launch
  useEffect(() => {
    const loadSampleData = async () => {
      // Check if sample data has already been loaded
      const sampleLoaded = localStorage.getItem('sample_data_loaded');

      // Only load if no races exist and sample hasn't been loaded before
      if (!loading && races.length === 0 && !sampleLoaded) {
        try {
          console.log('Loading sample race data for first-time user...');
          // Load all sample races
          for (const sampleRace of SAMPLE_RACES) {
            await createRaceFromImport(sampleRace);
          }
          localStorage.setItem('sample_data_loaded', 'true');
          await refreshRaces();
          console.log('Sample data loaded successfully');
        } catch (error) {
          console.error('Failed to load sample data:', error);
        }
      }
    };

    loadSampleData();
  }, [loading, races.length, refreshRaces]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const importedData = await importFromJSON(file);
      const createdRace = await createRaceFromImport(importedData);
      await refreshRaces();
      navigate(`/race/${createdRace.id}`);
    } catch (error) {
      alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-[#1e2639] coloursplash:bg-splash-bg-page">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Activity className="w-12 h-12 text-blue-400 animate-bounce" />
          <div className="text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary font-medium">Loading your races...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Your Race Plans - UltraPlan</title>
        <meta name="description" content="Manage your ultramarathon race plans. Create, edit, and export race strategies with GPX analysis and nutrition tracking." />
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-[#1e2639] coloursplash:bg-splash-bg-page">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-pink-600/5"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="mb-6">
              <h2 className="text-4xl font-black text-gray-900 dark:text-white coloursplash:text-splash-text-primary tracking-tight mb-2">
                Your Race Plans
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted">Strategic planning for ultramarathon success</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 coloursplash:from-splash-green coloursplash:to-splash-green-hover text-white font-bold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Plus className="w-5 h-5" />
                Create Race Plan
              </button>

              <button
                onClick={handleImportClick}
                disabled={isImporting}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isImporting ? (
                  <>
                    <Activity className="w-5 h-5 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Import Race Plan
                  </>
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="flex items-center gap-3 px-6 py-4 bg-white dark:bg-[#2d3548] coloursplash:bg-white backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-700 coloursplash:border-splash-border shadow-sm">
                <div className="text-3xl font-black text-blue-400">{races.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted font-medium">
                  Race{races.length !== 1 ? 's' : ''} Planned
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Race Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {races.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full mb-6">
                <Mountain className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white coloursplash:text-splash-text-primary mb-3">No race plans yet</h3>
              <p className="text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted mb-8 max-w-md mx-auto">
                Create your first ultramarathon strategy plan to track checkpoints, nutrition, and pacing.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 coloursplash:from-splash-green coloursplash:to-splash-green-hover text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First Plan
                </button>

                <button
                  onClick={handleImportClick}
                  disabled={isImporting}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isImporting ? (
                    <>
                      <Activity className="w-5 h-5 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Import from File
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {races.map((race) => (
                <RaceCard
                  key={race.id}
                  race={race}
                  onDelete={deleteRace}
                  onClick={(id) => navigate(`/race/${id}`)}
                />
              ))}
            </div>
          )}
        </div>

        <CreateRaceModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={async (data) => {
            const race = await createRace(data);
            navigate(`/race/${race.id}`);
          }}
        />

        <Footer />
      </div>
    </>
  );
}
