import { useParams, useNavigate } from 'react-router';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Edit2, Save, X, Download, User, Phone, Calendar, ChevronDown, ChevronUp, Info, Upload } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useRaceDetails } from '@/react-app/hooks/useRaceDetails';
import SegmentForm from '@/react-app/components/SegmentForm';
import SegmentList from '@/react-app/components/SegmentList';
import ElevationChart from '@/react-app/components/ElevationChart';
import GPXMapViewer from '@/react-app/components/GPXMapViewer';
import Footer from '@/react-app/components/Footer';
import { exportToJSON, exportToCSV, exportToPDF } from '@/react-app/utils/exportRace';
import { formatRaceStartTime, getUserTimezone } from '@/react-app/utils/etaCalculations';
import { useUnit } from '@/react-app/contexts/UnitContext';
import { formatDistance, getDistanceUnitName, inputToMiles } from '@/react-app/utils/unitConversions';
import { Tooltip } from '@/react-app/components/Tooltip';
import { localStorageService } from '@/react-app/services/localStorage';
import type { ParsedFITData } from '@/shared/types';
import GPSDeviceDisplay from '@/react-app/components/GPSDeviceDisplay';
import RaceComparisonDashboard from '@/react-app/components/RaceComparisonDashboard';
import { AutoPaceSetup } from '@/react-app/components/AutoPaceSetup';
import RaceTimeSummaryPanel from '@/react-app/components/RaceTimeSummaryPanel';
import { calculateRaceTimeSummary } from '@/react-app/utils/raceTimeSummary';
import EccentricLoadSummary from '@/react-app/components/EccentricLoadSummary';
import EnergyBalancePanel from '@/react-app/components/EnergyBalancePanel';

export default function RacePlanner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { useMiles } = useUnit();
  const { race, segments, elevationLabels, loading, updateRace, createSegment, updateSegment, deleteSegment, uploadGPX, regeneratePlusCodes, refresh } = useRaceDetails(id!);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDistance, setEditDistance] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isEditingEmergency, setIsEditingEmergency] = useState(false);
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [editStartDateTime, setEditStartDateTime] = useState('');
  const [editTimezone, setEditTimezone] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');

  // FIT comparison state
  const [fitComparisonData, setFitComparisonData] = useState<ParsedFITData | null>(null);

  // Mandatory kit state
  const [showMandatoryKit, setShowMandatoryKit] = useState(false);
  const [customKitItem, setCustomKitItem] = useState('');
  const [addingCustomItem, setAddingCustomItem] = useState(false);

  // FIT file upload ref
  const fitFileInputRef = useRef<HTMLInputElement>(null);

  // Fatigue curve state - shared between ElevationChart and RaceTimeSummaryPanel
  const [showFatigueCurve, setShowFatigueCurve] = useState(false);
  const [fatigueRate, setFatigueRate] = useState(3.0); // Default 3% per 10 miles

  // Automatically regenerate Plus Codes when segments are loaded and don't have Plus Codes
  useEffect(() => {
    if (!loading && race && race.gpx_file_key && segments.length > 0) {
      // Check if any segments are missing Plus Codes
      const missingPlusCodes = segments.some(segment => !segment.plusCode);
      if (missingPlusCodes) {
        console.log('Regenerating Plus Codes for segments...');
        regeneratePlusCodes().catch(err => {
          console.error('Failed to regenerate Plus Codes:', err);
        });
      }
    }
  }, [loading, race, segments, regeneratePlusCodes]);

  // Load FIT comparison data on mount
  useEffect(() => {
    if (race?.fit_comparison_file_key) {
      const fitData = localStorageService.getFITFile(race.fit_comparison_file_key);
      setFitComparisonData(fitData);
    } else {
      setFitComparisonData(null);
    }
  }, [race?.fit_comparison_file_key]);

  // Notify Header about current race for backup options
  useEffect(() => {
    if (race) {
      const event = new CustomEvent('openBackupOptions', {
        detail: { raceId: race.id, raceName: race.name }
      });
      window.dispatchEvent(event);
    }

    // Clear race info from header when component unmounts
    return () => {
      const event = new CustomEvent('openBackupOptions', {
        detail: { raceId: null, raceName: '' }
      });
      window.dispatchEvent(event);
    };
  }, [race]);

  if (loading || !race) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#1e2639] coloursplash:bg-splash-bg-page">
        <div className="animate-pulse text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary font-medium">Loading race details...</div>
      </div>
    );
  }


  const handleAddCustomKitItem = async () => {
    if (!customKitItem.trim() || !race) return;

    try {
      setAddingCustomItem(true);

      // Parse existing kit items
      const existingItems: string[] = race.mandatory_kit
        ? JSON.parse(race.mandatory_kit)
        : [];

      // Add new item if it doesn't already exist
      if (!existingItems.includes(customKitItem.trim())) {
        const updatedItems = [...existingItems, customKitItem.trim()];

        // Update race with new kit items
        await updateRace({
          name: race.name,
          distance_miles: race.distance_miles,
          emergency_contact_name: race.emergency_contact_name || undefined,
          emergency_contact_phone: race.emergency_contact_phone || undefined,
          start_date_time: race.start_date_time,
          timezone: race.timezone,
          mandatory_kit: JSON.stringify(updatedItems),
        });

        setCustomKitItem('');
      }
    } catch (error) {
      console.error('Failed to add custom kit item:', error);
    } finally {
      setAddingCustomItem(false);
    }
  };

  const handleRemoveKitItem = async (itemToRemove: string) => {
    if (!race || !race.mandatory_kit) return;

    try {
      const existingItems: string[] = JSON.parse(race.mandatory_kit);
      const updatedItems = existingItems.filter(item => item !== itemToRemove);

      await updateRace({
        name: race.name,
        distance_miles: race.distance_miles,
        emergency_contact_name: race.emergency_contact_name || undefined,
        emergency_contact_phone: race.emergency_contact_phone || undefined,
        start_date_time: race.start_date_time,
        timezone: race.timezone,
        mandatory_kit: updatedItems.length > 0 ? JSON.stringify(updatedItems) : null,
      });
    } catch (error) {
      console.error('Failed to remove kit item:', error);
    }
  };

  const startEditing = () => {
    setEditName(race.name);
    // Display distance in user's preferred unit
    const displayDistance = useMiles ? race.distance_miles : race.distance_miles * 1.60934;
    setEditDistance(displayDistance.toString());

    // Set timing fields
    if (race.start_date_time) {
      // Convert ISO string to datetime-local format (YYYY-MM-DDTHH:mm)
      const date = new Date(race.start_date_time);
      const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setEditStartDateTime(localDateTime);
    } else {
      setEditStartDateTime('');
    }
    setEditTimezone(race.timezone || getUserTimezone());
    setEditLogoUrl(race.logo_url || '');

    setIsEditing(true);
  };

  const saveEdits = async () => {
    // Convert input back to miles for storage
    const distanceInMiles = inputToMiles(parseFloat(editDistance), useMiles);
    await updateRace({
      name: editName,
      distance_miles: distanceInMiles,
      start_date_time: editStartDateTime ? new Date(editStartDateTime).toISOString() : null,
      timezone: editTimezone || null,
      logo_url: editLogoUrl || null,
    });
    setIsEditing(false);
  };

  const saveEmergencyContact = async () => {
    await updateRace({
      name: race.name,
      distance_miles: race.distance_miles,
      emergency_contact_name: emergencyName,
      emergency_contact_phone: emergencyPhone,
    });
    setIsEditingEmergency(false);
  };

  const startEditingEmergency = () => {
    setEmergencyName(race.emergency_contact_name || '');
    setEmergencyPhone(race.emergency_contact_phone || '');
    setIsEditingEmergency(true);
  };

  const handleExport = async (format: 'json' | 'csv' | 'pdf') => {
    if (!race) return;

    switch (format) {
      case 'json':
        exportToJSON(race, segments, elevationLabels);
        break;
      case 'csv':
        exportToCSV(race, segments);
        break;
      case 'pdf':
        await exportToPDF(race, segments, elevationLabels);
        break;
    }
    setShowExportMenu(false);
  };

  const handleFITUpload = async (file: File) => {
    if (!race?.id) return;

    try {
      // Store FIT file and get file key
      const fileKey = await localStorageService.setFITFile(race.id, file);

      // Update race with FIT file key
      await updateRace({
        name: race.name,
        distance_miles: race.distance_miles,
        fit_comparison_file_key: fileKey,
      });

      // Refresh race data to trigger FIT data load
      await refresh();
    } catch (error) {
      console.error('Failed to upload FIT file:', error);
      alert('Failed to upload FIT file. Please ensure it is a valid .FIT file.');
    }
  };

  const handleFITRemove = async () => {
    if (!race?.id || !race.fit_comparison_file_key) return;

    try {
      // Remove FIT file from localStorage
      localStorageService.deleteFITFile(race.fit_comparison_file_key);

      // Update race to remove FIT file key
      await updateRace({
        name: race.name,
        distance_miles: race.distance_miles,
        fit_comparison_file_key: null,
      });

      // Clear local state
      setFitComparisonData(null);

      // Refresh race data
      await refresh();
    } catch (error) {
      console.error('Failed to remove FIT file:', error);
      alert('Failed to remove FIT file.');
    }
  };

  const handleFITFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!race.gpx_file_key) {
      alert('Please upload a GPX file first to enable race comparison.');
      return;
    }

    try {
      await handleFITUpload(file);
    } catch (error: any) {
      console.error('Failed to upload FIT file:', error);
      alert(error?.message || 'Failed to upload FIT file. Please try again.');
    } finally {
      // Reset file input
      if (fitFileInputRef.current) {
        fitFileInputRef.current.value = '';
      }
    }
  };

  // Fatigue curve settings handler
  const handleFatigueSettingsChange = (show: boolean, rate: number) => {
    setShowFatigueCurve(show);
    setFatigueRate(rate);
  };

  // GPX upload handler with tracking
  const handleGPXUpload = async (file: File) => {
    await uploadGPX(file);
    // Track GPX upload for admin usage analytics
  };

  return (
    <>
      <Helmet>
        <title>{race?.name ? `${race.name} - UltraPlan` : 'Race Plan - UltraPlan'}</title>
        <meta
          name="description"
          content={race ? `Plan your ${race.name} ultramarathon. ${race.distance_miles.toFixed(1)} miles with detailed checkpoint and nutrition planning.` : 'Plan your ultramarathon race with UltraPlan.'}
        />
      </Helmet>

      <div className="min-h-screen bg-white dark:bg-[#1e2639] coloursplash:bg-splash-bg-page">
        {/* Header */}
        <div className="bg-gray-100 dark:bg-[#252d3f] coloursplash:bg-splash-bg-subtle border-b border-gray-300 dark:border-gray-700 coloursplash:border-splash-border shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-secondary hover:text-gray-900 dark:hover:text-white coloursplash:hover:text-splash-text-primary font-medium transition-all min-h-[44px]"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm sm:text-base">Back to Races</span>
              </button>

              <div className="flex flex-wrap gap-2 sm:gap-3">
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="inline-flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 coloursplash:from-splash-green coloursplash:to-splash-green-hover text-white font-semibold rounded-lg transition-all shadow-lg text-sm sm:text-base min-h-[44px] hover:from-orange-600 hover:to-orange-700 hover:shadow-xl cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export As Document</span>
                    <span className="sm:hidden">Export</span>
                  </button>

                  {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#2d3548] coloursplash:bg-white rounded-lg shadow-xl border border-gray-300 dark:border-gray-700 coloursplash:border-splash-border py-2 z-20">
                      <button
                        onClick={() => handleExport('csv')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-primary hover:bg-gray-100 dark:hover:bg-[#333c52] coloursplash:hover:bg-splash-azure-light transition-colors"
                      >
                        Export as CSV
                      </button>
                      <button
                        onClick={() => handleExport('pdf')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-primary hover:bg-gray-100 dark:hover:bg-[#333c52] coloursplash:hover:bg-splash-azure-light transition-colors"
                      >
                        Export as PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Race Info Card */}
          <div className="bg-white dark:bg-[#2d3548] coloursplash:bg-white rounded-lg sm:rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 coloursplash:border-splash-border p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 sm:h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 coloursplash:from-splash-azure coloursplash:via-splash-green coloursplash:to-splash-green"></div>

            {!isEditing ? (
              <>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 sm:gap-0 mb-4 sm:mb-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 dark:text-white coloursplash:text-splash-text-primary break-words">{race.name}</h1>
                      {race.logo_url && (
                        <div className="h-24 w-24 bg-white rounded-md p-2 flex items-center justify-center">
                          <img
                            src={race.logo_url}
                            alt={`${race.name} logo`}
                            className="h-full w-full object-contain"
                            onError={(e) => {
                              // Hide parent div if image fails to load
                              const parent = e.currentTarget.parentElement;
                              if (parent) parent.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-lg text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary">
                      <span className="font-semibold">
                        {formatDistance(race.distance_miles, useMiles)}
                      </span>
                    </div>
                    {race.start_date_time && (
                      <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/40 rounded-lg text-blue-300">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {formatRaceStartTime(race.start_date_time, race.timezone)}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={startEditing}
                    className="inline-flex items-center gap-2 px-4 py-2 text-blue-400 coloursplash:text-splash-azure rounded-lg font-medium transition-all hover:bg-gray-100 dark:hover:bg-[#333c52] coloursplash:hover:bg-splash-azure-light cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white coloursplash:text-splash-text-primary">Edit Race Details</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-secondary hover:bg-gray-100 dark:hover:bg-[#333c52] coloursplash:hover:bg-splash-azure-light rounded-lg font-medium transition-all"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={saveEdits}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 coloursplash:from-splash-green coloursplash:to-splash-green-hover text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary mb-2">Race Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#3a4458] coloursplash:bg-splash-bg-subtle border border-gray-300 dark:border-gray-600 coloursplash:border-splash-border text-gray-900 dark:text-white coloursplash:text-splash-text-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary mb-2">Distance ({getDistanceUnitName(useMiles)})</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editDistance}
                      onChange={(e) => setEditDistance(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#3a4458] coloursplash:bg-splash-bg-subtle border border-gray-300 dark:border-gray-600 coloursplash:border-splash-border text-gray-900 dark:text-white coloursplash:text-splash-text-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary">
                      Race Logo URL (Optional)
                    </label>
                    <div className="relative group">
                      <Info className="w-4 h-4 text-gray-400 coloursplash:text-splash-text-muted cursor-help" />
                      <div className="absolute left-0 top-6 z-50 w-72 p-3 bg-white dark:bg-gray-900 coloursplash:bg-white text-gray-900 dark:text-white coloursplash:text-splash-text-primary text-xs rounded-lg shadow-xl border border-gray-300 dark:border-gray-700 coloursplash:border-splash-border opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                        <div className="font-semibold mb-2">How to get the logo URL:</div>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Visit the race website</li>
                          <li>Locate the race logo/icon</li>
                          <li>Right-click on the logo</li>
                          <li>Select "Copy Image Address"</li>
                          <li>Paste the URL here</li>
                        </ol>
                        <div className="mt-2 text-yellow-700 dark:text-yellow-400">
                          Note: Logo is private and won't appear on shared plans
                        </div>
                      </div>
                    </div>
                  </div>
                  <input
                    type="url"
                    value={editLogoUrl}
                    onChange={(e) => setEditLogoUrl(e.target.value)}
                    placeholder="https://example.com/race-logo.png"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#3a4458] coloursplash:bg-splash-bg-subtle border border-gray-300 dark:border-gray-600 coloursplash:border-splash-border text-gray-900 dark:text-white coloursplash:text-splash-text-primary placeholder-gray-500 coloursplash:placeholder-splash-text-muted rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div className="border-t border-gray-300 dark:border-gray-600 coloursplash:border-splash-border pt-4 mt-2">
                  <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted mb-3">Race Timing (Optional)</div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary mb-2">
                        Start Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={editStartDateTime}
                        onChange={(e) => setEditStartDateTime(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#3a4458] coloursplash:bg-splash-bg-subtle border border-gray-300 dark:border-gray-600 coloursplash:border-splash-border text-gray-900 dark:text-white coloursplash:text-splash-text-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="text-xs text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted mt-1">
                        Set to show ETAs at checkpoints
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary mb-2">
                        Timezone
                      </label>
                      <select
                        value={editTimezone}
                        onChange={(e) => setEditTimezone(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#3a4458] coloursplash:bg-splash-bg-subtle border border-gray-300 dark:border-gray-600 coloursplash:border-splash-border text-gray-900 dark:text-white coloursplash:text-splash-text-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="Europe/London">UK (Europe/London)</option>
                        <option value="Europe/Dublin">Ireland (Europe/Dublin)</option>
                        <option value="America/New_York">US Eastern (America/New_York)</option>
                        <option value="America/Chicago">US Central (America/Chicago)</option>
                        <option value="America/Denver">US Mountain (America/Denver)</option>
                        <option value="America/Los_Angeles">US Pacific (America/Los_Angeles)</option>
                        <option value="Europe/Paris">Central Europe (Europe/Paris)</option>
                        <option value="Europe/Berlin">Germany (Europe/Berlin)</option>
                        <option value="Asia/Tokyo">Japan (Asia/Tokyo)</option>
                        <option value="Australia/Sydney">Australia (Australia/Sydney)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Race Time Summary Panel */}
          {segments.length > 0 && (() => {
            const summary = calculateRaceTimeSummary(segments, race);
            // Get base pace from first segment with custom pace
            const basePace = segments.find(s => s.custom_pace_min_per_mile)?.custom_pace_min_per_mile || 10;
            return (
              <div className="mb-8">
                <RaceTimeSummaryPanel
                  summary={summary}
                  showFatigueCurve={showFatigueCurve}
                  fatigueFactor={fatigueRate}
                  basePace={basePace}
                />
              </div>
            );
          })()}

          {/* Elevation Chart */}
          <div className="mb-8">
            <ElevationChart
              raceId={id!}
              onUpload={handleGPXUpload}
              elevationLabels={elevationLabels}
              segments={segments}
              onRefresh={refresh}
              fitComparisonData={fitComparisonData}
              onFITRemove={handleFITRemove}
              onFatigueSettingsChange={handleFatigueSettingsChange}
            />
          </div>

          {/* FIT File Comparison */}
          {segments.length > 0 && (
            <div className="mb-8">
              <div className="bg-gray-100 dark:bg-[#2a3548] coloursplash:bg-splash-bg-subtle rounded-lg border-2 border-gray-300 dark:border-gray-700 coloursplash:border-splash-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white coloursplash:text-splash-text-primary mb-1">
                      Compare with Previous Activity
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-secondary">
                      Upload a .FIT file from a previous race to compare your plan with actual performance
                    </p>
                  </div>
                </div>

                {!race.gpx_file_key && (
                  <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-sm text-blue-300">
                      <Info className="w-4 h-4 inline mr-2" />
                      Upload a GPX file in the elevation chart section above to enable FIT file comparison
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <Tooltip content={!race.gpx_file_key ? "Upload a GPX file first to enable FIT comparison" : ""}>
                    <div className="w-full sm:w-auto">
                      <input
                        ref={fitFileInputRef}
                        type="file"
                        accept=".fit"
                        onChange={handleFITFileInputChange}
                        className="hidden"
                        disabled={!race.gpx_file_key}
                      />
                      <button
                        onClick={() => fitFileInputRef.current?.click()}
                        disabled={!race.gpx_file_key}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 coloursplash:from-splash-green coloursplash:to-splash-green-hover text-white text-sm font-semibold rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                        title={!race.gpx_file_key ? "Upload GPX file first" : "Upload FIT file from previous race"}
                      >
                        <Upload className="w-4 h-4" />
                        <span className="hidden sm:inline">Upload .FIT file</span>
                        <span className="sm:hidden">Upload .FIT</span>
                      </button>
                    </div>
                  </Tooltip>

                  {fitComparisonData && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span>Currently comparing with:</span>
                      <span className="text-blue-400 font-semibold">
                        {fitComparisonData.fileName || 'FIT Upload'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Auto-Pace Setup */}
          <div className="mb-8">
            <AutoPaceSetup
              race={race}
              segments={segments}
              gpxContent={race.gpx_file_key ? localStorageService.getGPXFile(race.gpx_file_key)?.content || null : null}
              onSegmentsUpdate={refresh}
            />
          </div>

          {/* Enhanced Race Comparison - Show when FIT data is available */}
          {fitComparisonData && fitComparisonData.records && fitComparisonData.records.length > 0 && segments.length > 0 && (
            <div className="mb-8 space-y-6">
              {/* GPS Device Information */}
              <GPSDeviceDisplay fitData={fitComparisonData} />

              {/* Comprehensive Race Analysis Dashboard */}
              <RaceComparisonDashboard
                plannedRace={race}
                actualFitData={fitComparisonData}
                segments={segments}
              />
            </div>
          )}

          {/* GPX Map Viewer */}
          <GPXMapViewer
            segments={segments}
            gpxFileKey={race.gpx_file_key}
          />

          {/* Mandatory Kit Display with Purchase Tab */}
          {race.mandatory_kit && (() => {
            try {
              const kitItems: string[] = JSON.parse(race.mandatory_kit);

              if (kitItems.length > 0) {
                return (
                  <div className="bg-gray-100 dark:bg-[#2d3548] coloursplash:bg-splash-bg-subtle rounded-lg shadow-sm border border-gray-300 dark:border-gray-700 coloursplash:border-splash-border p-6 mb-8">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-300 dark:border-gray-600 coloursplash:border-splash-border pb-3">
                      <span className="flex items-center gap-2 px-4 py-2 font-medium text-blue-400">
                        <span>Mandatory Kit List</span>
                        <span className="text-xs bg-blue-500/30 px-2 py-0.5 rounded-full">
                          {kitItems.length} items
                        </span>
                      </span>

                      {/* Collapse/Expand Button */}
                      <button
                        onClick={() => setShowMandatoryKit(!showMandatoryKit)}
                        className="ml-auto p-2 text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-secondary hover:text-gray-900 dark:hover:text-white coloursplash:hover:text-splash-text-primary hover:bg-gray-200 dark:hover:bg-[#333c52] coloursplash:hover:bg-splash-azure-light rounded-lg transition-all"
                        aria-label={showMandatoryKit ? 'Hide' : 'Show'}
                      >
                        {showMandatoryKit ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>

                    {showMandatoryKit && (
                      <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                              {kitItems.map((item, index) => (
                                <div
                                  key={index}
                                  className="flex items-start justify-between gap-2 text-sm text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-primary p-2 bg-white dark:bg-[#3a4458] coloursplash:bg-white rounded border border-gray-300 dark:border-gray-700 coloursplash:border-splash-border group"
                                >
                                  <div className="flex items-start gap-2 flex-1">
                                    <span className="text-blue-400 coloursplash:text-splash-azure font-mono">
                                      {(index + 1).toString().padStart(2, '0')}.
                                    </span>
                                    <span>{item}</span>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveKitItem(item)}
                                    className="opacity-0 group-hover:opacity-100 text-red-400 coloursplash:text-splash-coral hover:text-red-300 coloursplash:hover:text-splash-coral transition-all p-1"
                                    aria-label={`Remove ${item}`}
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>

                            {/* Add Custom Item */}
                            <div className="border-t border-gray-300 dark:border-gray-600 coloursplash:border-splash-border pt-4">
                              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary mb-2">
                                Add Custom Item
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={customKitItem}
                                  onChange={(e) => setCustomKitItem(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomKitItem()}
                                  placeholder="e.g., Extra batteries, GPS watch..."
                                  className="flex-1 px-4 py-2 bg-white dark:bg-[#3a4458] coloursplash:bg-white border border-gray-300 dark:border-gray-600 coloursplash:border-splash-border text-gray-900 dark:text-white coloursplash:text-splash-text-primary placeholder-gray-400 dark:placeholder-gray-500 coloursplash:placeholder-splash-text-muted rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                  disabled={addingCustomItem}
                                />
                                <button
                                  onClick={handleAddCustomKitItem}
                                  disabled={!customKitItem.trim() || addingCustomItem}
                                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 coloursplash:from-splash-green coloursplash:to-splash-green-hover text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm shadow-lg"
                                >
                                  {addingCustomItem ? 'Adding...' : 'Add'}
                                </button>
                              </div>
                            </div>

                        <div className="mt-4 text-xs text-gray-400 bg-blue-500/10 rounded-lg p-3 border border-blue-500/30">
                          <strong>Tip:</strong> These items will appear as a checklist on your printed race plan PDF
                        </div>
                      </>
                    )}
                  </div>
                );
              }
            } catch {
              return null;
            }

            return null;
          })()}

          {/* Eccentric Load Analysis & Energy Balance - Below Mandatory Gear */}
          {segments.length > 0 && (() => {
            const gpxContent = race.gpx_file_key ? localStorageService.getGPXFile(race.gpx_file_key)?.content || null : null;
            return (
              <div className="mb-8 space-y-4">
                {/* Eccentric Load Summary - only show if GPX is available */}
                <EccentricLoadSummary
                  segments={segments}
                  gpxContent={gpxContent}
                />
                {/* Energy Balance Panel - shows glycogen/bonk risk */}
                {(() => {
                  const autoPaceSettings = race.id ? localStorageService.getAutoPaceSettings(race.id) : null;
                  const athleteSettings = autoPaceSettings?.athleteSettings;
                  if (!athleteSettings?.bodyWeightKg) return null;

                  // Calculate segment times in minutes from pace and distance
                  const segmentTimes = segments.map(seg => {
                    const pace = seg.use_auto_pace && seg.auto_derived_pace
                      ? seg.auto_derived_pace
                      : (seg.custom_pace_min_per_mile || 12);
                    return seg.segment_distance_miles * pace;
                  });

                  return (
                    <EnergyBalancePanel
                      segments={segments}
                      athleteMetrics={{
                        bodyWeightKg: athleteSettings.bodyWeightKg,
                        gearWeightKg: athleteSettings.gearWeightKg || 0
                      }}
                      segmentTimes={segmentTimes}
                    />
                  );
                })()}
              </div>
            );
          })()}

          {/* Segments Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <SegmentList
                segments={segments}
                onDelete={deleteSegment}
                onUpdate={updateSegment}
                emergencyContactName={race.emergency_contact_name}
                emergencyContactPhone={race.emergency_contact_phone}
                onEditEmergencyContact={startEditingEmergency}
                raceStartTime={race.start_date_time}
                timezone={race.timezone}
                fitComparisonData={fitComparisonData}
              />
            </div>

            <div>
              <SegmentForm
                onSubmit={createSegment}
                existingSegments={segments}
                race={race}
                gpxContent={race.gpx_file_key ? localStorageService.getGPXFile(race.gpx_file_key)?.content || null : null}
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact Modal */}
        {isEditingEmergency && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsEditingEmergency(false)}></div>
            <div className="relative bg-[#2d3548] coloursplash:bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 overflow-hidden border-2 border-red-500/40 coloursplash:border-splash-border">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500"></div>

              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white coloursplash:text-splash-text-primary">Emergency Contact</h2>
                  <button
                    onClick={() => setIsEditingEmergency(false)}
                    className="p-2 text-gray-400 coloursplash:text-splash-text-secondary hover:text-white coloursplash:hover:text-splash-text-primary hover:bg-[#333c52] coloursplash:hover:bg-splash-azure-light rounded-lg transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 coloursplash:text-splash-text-secondary mb-2">
                      <User className="w-4 h-4 inline-block mr-1" />
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      placeholder="e.g., John Doe"
                      className="w-full px-4 py-2.5 bg-[#3a4458] coloursplash:bg-splash-bg-subtle border border-gray-600 coloursplash:border-splash-border text-white coloursplash:text-splash-text-primary placeholder-gray-500 coloursplash:placeholder-splash-text-muted rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 coloursplash:text-splash-text-secondary mb-2">
                      <Phone className="w-4 h-4 inline-block mr-1" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder="e.g., +1 234 567 8900"
                      className="w-full px-4 py-2.5 bg-[#3a4458] coloursplash:bg-splash-bg-subtle border border-gray-600 coloursplash:border-splash-border text-white coloursplash:text-splash-text-primary placeholder-gray-500 coloursplash:placeholder-splash-text-muted rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsEditingEmergency(false)}
                      className="flex-1 px-6 py-3 border border-gray-600 coloursplash:border-splash-border text-gray-300 coloursplash:text-splash-text-secondary font-semibold rounded-lg hover:bg-[#333c52] coloursplash:hover:bg-splash-azure-light transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveEmergencyContact}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-600 coloursplash:from-splash-green coloursplash:to-splash-green-hover text-white font-semibold rounded-lg hover:from-red-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl"
                    >
                      Save Contact
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <Footer />
      </div>
    </>
  );
}
