/**
 * AutoPaceSetup Component
 *
 * Race-level control panel for automatic pace derivation
 * Allows users to upload FIT files and configure auto-pacing settings
 */

import React, { useState, useRef, useEffect } from 'react';
import { Zap, Upload, X, CheckCircle, AlertCircle, Loader2, RefreshCw, Info, Heart, TrendingUp, ChevronDown, ChevronUp, Trash2, Scale } from 'lucide-react';
import type { Race, Segment, AutoPaceSettings, AthleteSettings } from '@/shared/types';
import { localStorageService } from '../services/localStorage';
import { analyzeFITForPacing, applyAutoPacingToRace, formatPaceMinPerMile } from '../utils/autoPaceCalculation';
import { analyzeGAPProfile, type GAPProfile } from '../utils/gapProfileAnalyzer';
import GAPProfileCard from './GAPProfileCard';
import GAPProfileChart from './GAPProfileChart';

interface AutoPaceSetupProps {
  race: Race;
  segments: Segment[];
  gpxContent: string | null;
  onSegmentsUpdate: () => void; // Callback to trigger segment refresh
}

export function AutoPaceSetup({ race, segments, gpxContent, onSegmentsUpdate }: AutoPaceSetupProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSavingHR, setIsSavingHR] = useState(false);
  const [isGeneratingGAP, setIsGeneratingGAP] = useState(false);
  const [showGAPChart, setShowGAPChart] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get GAP profile from localStorage
  const [gapProfile, setGapProfile] = useState<GAPProfile | null>(() =>
    localStorageService.getGAPProfile() as GAPProfile | null
  );

  // Get current auto-pace settings
  const settings = race.id ? localStorageService.getAutoPaceSettings(race.id) : null;
  const hasFitFile = Boolean(race.fit_autopace_file_key);

  // Get FIT file data if available
  const fitData = race.fit_autopace_file_key
    ? localStorageService.getAutoPaceFITFile(race.fit_autopace_file_key)
    : null;

  // State for athlete HR settings
  const [restingHR, setRestingHR] = useState<number | ''>(settings?.athleteSettings?.restingHR || '');
  const [maxHR, setMaxHR] = useState<number | ''>(settings?.athleteSettings?.maxHR || '');

  // State for athlete body metrics (for energy balance calculations)
  const [bodyWeightKg, setBodyWeightKg] = useState<number | ''>(settings?.athleteSettings?.bodyWeightKg || '');
  const [gearWeightKg, setGearWeightKg] = useState<number | ''>(settings?.athleteSettings?.gearWeightKg || '');

  // HR validation bounds
  const HR_BOUNDS = {
    restingHR: { min: 30, max: 100 },
    maxHR: { min: 120, max: 220 }
  };

  // Body metrics validation bounds
  const WEIGHT_BOUNDS = {
    bodyWeightKg: { min: 30, max: 200 }, // kg
    gearWeightKg: { min: 0, max: 30 } // kg
  };

  // Validation error states
  const [hrErrors, setHrErrors] = useState<{ restingHR?: string; maxHR?: string }>({});
  const [weightErrors, setWeightErrors] = useState<{ bodyWeightKg?: string; gearWeightKg?: string }>({});

  // Validate HR value and return error message if invalid
  const validateHR = (value: number | '', type: 'restingHR' | 'maxHR'): string | undefined => {
    if (value === '') return undefined; // Empty is allowed (optional)

    const bounds = HR_BOUNDS[type];
    if (value < bounds.min || value > bounds.max) {
      return `Must be ${bounds.min}-${bounds.max} bpm`;
    }

    // Cross-validation: max HR must be greater than resting HR
    if (type === 'maxHR' && restingHR !== '' && value <= restingHR) {
      return 'Must be greater than Resting HR';
    }
    if (type === 'restingHR' && maxHR !== '' && value >= maxHR) {
      return 'Must be less than Max HR';
    }

    return undefined;
  };

  // Handle HR input with sanitization and bounds clamping
  const handleHRChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'restingHR' | 'maxHR') => {
    // Strip non-numeric characters
    const rawValue = e.target.value.replace(/[^0-9]/g, '');

    if (rawValue === '') {
      if (type === 'restingHR') setRestingHR('');
      else setMaxHR('');
      setHrErrors(prev => ({ ...prev, [type]: undefined }));
      return;
    }

    const numValue = parseInt(rawValue, 10);
    const bounds = HR_BOUNDS[type];

    // Clamp to reasonable maximum to prevent massive numbers
    const clampedValue = Math.min(numValue, bounds.max + 50);

    if (type === 'restingHR') setRestingHR(clampedValue);
    else setMaxHR(clampedValue);

    // Validate and set error
    const error = validateHR(clampedValue, type);
    setHrErrors(prev => ({ ...prev, [type]: error }));
  };

  // Check if HR form is valid (for disabling save button)
  const isHRFormValid = !hrErrors.restingHR && !hrErrors.maxHR;

  // Validate weight value and return error message if invalid
  const validateWeight = (value: number | '', type: 'bodyWeightKg' | 'gearWeightKg'): string | undefined => {
    if (value === '') return undefined; // Empty is allowed (optional)

    const bounds = WEIGHT_BOUNDS[type];
    if (value < bounds.min || value > bounds.max) {
      return `Must be ${bounds.min}-${bounds.max} kg`;
    }

    return undefined;
  };

  // Handle weight input with sanitization
  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'bodyWeightKg' | 'gearWeightKg') => {
    // Allow decimal input
    const rawValue = e.target.value.replace(/[^0-9.]/g, '');

    if (rawValue === '') {
      if (type === 'bodyWeightKg') setBodyWeightKg('');
      else setGearWeightKg('');
      setWeightErrors(prev => ({ ...prev, [type]: undefined }));
      return;
    }

    const numValue = parseFloat(rawValue);
    if (isNaN(numValue)) return;

    const bounds = WEIGHT_BOUNDS[type];

    // Clamp to reasonable maximum
    const clampedValue = Math.min(numValue, bounds.max + 10);

    if (type === 'bodyWeightKg') setBodyWeightKg(clampedValue);
    else setGearWeightKg(clampedValue);

    // Validate and set error
    const error = validateWeight(clampedValue, type);
    setWeightErrors(prev => ({ ...prev, [type]: error }));
  };

  // Check if weight form is valid
  const isWeightFormValid = !weightErrors.bodyWeightKg && !weightErrors.gearWeightKg;

  // Extract detected HR values from FIT data for display
  const recordsWithHR = fitData?.records.filter(r => r.heartRate && r.heartRate > 0) || [];
  const detectedMaxHR = recordsWithHR.length > 0 ? Math.max(...recordsWithHR.map(r => r.heartRate!)) : null;
  const detectedMinHR = recordsWithHR.length > 0 ? Math.min(...recordsWithHR.map(r => r.heartRate!)) : null;

  // Update state when settings change (e.g., after file upload)
  useEffect(() => {
    if (settings?.athleteSettings?.restingHR) {
      setRestingHR(settings.athleteSettings.restingHR);
    }
    if (settings?.athleteSettings?.maxHR) {
      setMaxHR(settings.athleteSettings.maxHR);
    }
    if (settings?.athleteSettings?.bodyWeightKg) {
      setBodyWeightKg(settings.athleteSettings.bodyWeightKg);
    }
    if (settings?.athleteSettings?.gearWeightKg) {
      setGearWeightKg(settings.athleteSettings.gearWeightKg);
    }
  }, [settings?.athleteSettings?.restingHR, settings?.athleteSettings?.maxHR, settings?.athleteSettings?.bodyWeightKg, settings?.athleteSettings?.gearWeightKg]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !race.id) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      // Upload FIT file
      const fileKey = await localStorageService.setAutoPaceFITFile(race.id, file);
      console.log('[AutoPaceSetup] FIT file uploaded:', fileKey);

      // Trigger update
      onSegmentsUpdate();

      // Show success briefly
      setTimeout(() => {
        setIsUploading(false);
      }, 500);
    } catch (error) {
      console.error('[AutoPaceSetup] Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload FIT file');
      setIsUploading(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFitFile = () => {
    if (!race.id || !race.fit_autopace_file_key) return;

    // Delete FIT file
    localStorageService.deleteAutoPaceFITFile(race.fit_autopace_file_key);

    // Update race
    localStorageService.updateRace(race.id, { fit_autopace_file_key: null });

    // Delete settings
    localStorageService.deleteAutoPaceSettings(race.id);

    // Trigger update
    onSegmentsUpdate();
  };

  const handleRecalculateAll = async () => {
    if (!race.id || !fitData || segments.length === 0) return;

    setIsCalculating(true);

    try {
      // Analyze FIT file and derive paces for all segments
      const paceResults = await applyAutoPacingToRace(segments, fitData, gpxContent);

      // Update all segments with derived paces
      segments.map((segment) => {
        if (!segment.id) return segment;

        const paceResult = paceResults.get(segment.id);
        if (!paceResult) return segment;

        // Update segment with auto-pace data
        localStorageService.updateSegment(segment.id, {
          auto_derived_pace: paceResult.paceMinPerMile,
          auto_pace_confidence: paceResult.confidence,
          auto_pace_reasoning: paceResult.reasoning,
          // Don't automatically enable auto-pace, let user toggle manually
        });

        return segment;
      });

      // Save settings
      const config = analyzeFITForPacing(fitData);
      const newSettings: AutoPaceSettings = {
        enabled: true,
        sourceType: 'fit_upload',
        fitFileKey: race.fit_autopace_file_key || undefined,
        lastCalculated: new Date().toISOString(),
        config,
      };
      localStorageService.saveAutoPaceSettings(race.id, newSettings);

      console.log('[AutoPaceSetup] Recalculated paces for', paceResults.size, 'segments');

      // Trigger update
      onSegmentsUpdate();

      setIsCalculating(false);
    } catch (error) {
      console.error('[AutoPaceSetup] Calculation error:', error);
      setIsCalculating(false);
    }
  };

  // Handler to save athlete HR settings and recalculate zones
  const handleSaveAthleteSettings = async () => {
    if (!race.id || !fitData) return;

    setIsSavingHR(true);

    try {
      // Get current settings or create new
      const currentSettings = localStorageService.getAutoPaceSettings(race.id) || {
        enabled: true,
        sourceType: 'fit_upload' as const,
      };

      // Build athlete settings with user overrides
      const athleteSettings: AthleteSettings = {
        ...(currentSettings.athleteSettings || {}),
        restingHR: restingHR !== '' ? restingHR : undefined,
        maxHR: maxHR !== '' ? maxHR : undefined,
        bodyWeightKg: bodyWeightKg !== '' ? bodyWeightKg : undefined,
        gearWeightKg: gearWeightKg !== '' ? gearWeightKg : undefined,
      };

      // Recalculate config with new athlete settings
      const newConfig = analyzeFITForPacing(fitData, athleteSettings);

      const newSettings: AutoPaceSettings = {
        ...currentSettings,
        athleteSettings,
        config: newConfig,
        fitFileKey: race.fit_autopace_file_key || undefined,
        lastCalculated: new Date().toISOString(),
      };

      localStorageService.saveAutoPaceSettings(race.id, newSettings);

      console.log('[AutoPaceSetup] Saved athlete settings:', athleteSettings);
      console.log('[AutoPaceSetup] New HR zones:', newConfig.hrZones);

      // Trigger update to refresh UI
      onSegmentsUpdate();

      setIsSavingHR(false);
    } catch (error) {
      console.error('[AutoPaceSetup] Error saving athlete settings:', error);
      setIsSavingHR(false);
    }
  };

  // Handler to generate/update GAP profile from FIT data
  const handleGenerateGAPProfile = async () => {
    console.log('[AutoPaceSetup] handleGenerateGAPProfile called, fitData:', fitData ? 'present' : 'null');

    if (!fitData) {
      console.error('[AutoPaceSetup] No FIT data available to generate GAP profile');
      setUploadError('No FIT file data available. Please upload a FIT file first.');
      return;
    }

    setIsGeneratingGAP(true);
    setUploadError(null);

    try {
      console.log('[AutoPaceSetup] Analyzing FIT data for GAP profile...');
      // Analyze FIT data to create GAP profile
      const profile = analyzeGAPProfile(fitData);

      // Save to localStorage
      localStorageService.saveGAPProfile(profile);

      // Update state
      setGapProfile(profile);

      console.log('[AutoPaceSetup] GAP profile generated successfully:', profile);
    } catch (error) {
      console.error('[AutoPaceSetup] Error generating GAP profile:', error);
      setUploadError('Failed to generate GAP profile. Please try again.');
    }

    setIsGeneratingGAP(false);
  };

  // Handler to delete GAP profile
  const handleDeleteGAPProfile = () => {
    localStorageService.deleteGAPProfile();
    setGapProfile(null);
    setShowGAPChart(false);
    console.log('[AutoPaceSetup] GAP profile deleted');
  };

  return (
    <div className="bg-gray-800 dark:bg-gray-800 coloursplash:bg-white rounded-lg p-6 border border-gray-700 coloursplash:border-splash-border">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-blue-500/20 coloursplash:bg-splash-azure/20 flex items-center justify-center">
          <Zap className="w-5 h-5 text-blue-400 coloursplash:text-splash-azure" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white coloursplash:text-splash-text-primary">Smart Pace Predictions</h3>
          <p className="text-sm text-gray-400 coloursplash:text-splash-text-secondary">
            Upload a FIT file from a previous race to automatically calculate personalized segment paces based on your running patterns, elevation handling, and fatigue characteristics
          </p>
        </div>
      </div>

      {/* FIT File Status */}
      {hasFitFile && fitData ? (
        <div className="bg-[rgb(42,53,72)] dark:bg-[rgb(42,53,72)] coloursplash:bg-white border border-green-500/30 coloursplash:border-splash-azure rounded-lg p-4 mb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 coloursplash:text-splash-green flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-400 coloursplash:text-splash-green mb-1">{fitData.fileName}</p>
                <div className="text-sm text-gray-300 coloursplash:text-splash-text-primary space-y-0.5">
                  <p>
                    {fitData.totalDistance.toFixed(1)} miles | {' '}
                    {(fitData.totalTime / 3600).toFixed(1)} hours
                  </p>
                  {settings?.config && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 coloursplash:text-splash-text-secondary">
                        Base pace: {formatPaceMinPerMile(settings.config.baselineFlat)} min/mi
                      </span>
                      <div className="relative group">
                        <Info className="w-3.5 h-3.5 text-gray-500 coloursplash:text-splash-text-secondary cursor-help" />
                        <div className="absolute left-0 bottom-6 z-50 w-64 p-3 bg-gray-900 text-gray-100 text-xs rounded-lg shadow-xl border border-gray-700 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                          <div className="font-semibold mb-1">Base Pace Calculation:</div>
                          <p className="mb-2">Median pace from flat terrain sections (±2% gradient) in your FIT file.</p>
                          <div className="space-y-1 text-xs text-gray-400">
                            <p>• Uphill adjust: +{settings.config.elevationGainFactor}s per 100ft gain</p>
                            <p>• Downhill adjust: +{settings.config.elevationLossFactor}s per 100ft loss</p>
                            <p>• Fatigue factor: {settings.config.fatigueFactor.toFixed(1)}% per 10 miles</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {settings?.lastCalculated && (
                    <p className="text-xs text-gray-500 coloursplash:text-splash-text-secondary">
                      Last calculated: {new Date(settings.lastCalculated).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleRemoveFitFile}
              className="text-gray-400 coloursplash:text-splash-text-secondary hover:text-red-400 coloursplash:hover:text-red-600 transition-colors p-1"
              title="Remove FIT file"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Recalculate Button */}
          <div className="mt-4 pt-4 border-t border-green-500/20 coloursplash:border-splash-green/20">
            <button
              onClick={handleRecalculateAll}
              disabled={isCalculating || segments.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 coloursplash:bg-splash-green text-white rounded-lg hover:bg-blue-600 coloursplash:hover:bg-splash-green-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCalculating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Recalculate All Paces
                </>
              )}
            </button>
            {segments.length === 0 && (
              <p className="text-xs text-gray-500 coloursplash:text-splash-text-secondary mt-2">
                Add segments first to calculate paces
              </p>
            )}
          </div>

          {/* Heart Rate Settings Override */}
          <div className="mt-4 pt-4 border-t border-gray-700 coloursplash:border-splash-border">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-4 h-4 text-red-400 coloursplash:text-red-500" />
              <p className="text-sm font-medium text-gray-300 coloursplash:text-splash-text-primary">
                Heart Rate Settings
              </p>
            </div>
            <p className="text-xs text-gray-400 coloursplash:text-splash-text-secondary mb-3">
              For accurate HR zones, enter your known resting and max HR. The FIT file detected
              min HR of <span className="text-yellow-400 coloursplash:text-yellow-600 font-medium">{detectedMinHR || '?'} bpm</span> (during race, not resting!)
              and max HR of <span className="text-green-400 coloursplash:text-green-600 font-medium">{detectedMaxHR || '?'} bpm</span>.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-3">
              {/* Resting HR Input */}
              <div>
                <label className="block text-xs text-gray-400 coloursplash:text-splash-text-secondary mb-1">
                  Resting HR (bpm)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={restingHR}
                  onChange={(e) => handleHRChange(e, 'restingHR')}
                  placeholder="e.g., 50"
                  className={`w-full px-3 py-2 bg-gray-700 coloursplash:bg-white border rounded-lg text-white coloursplash:text-splash-text-primary text-sm focus:ring-2 focus:ring-blue-500 coloursplash:focus:ring-splash-azure focus:border-transparent placeholder-gray-500 ${hrErrors.restingHR
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-600 coloursplash:border-splash-border'
                    }`}
                />
                {hrErrors.restingHR ? (
                  <p className="text-xs text-red-400 mt-1">{hrErrors.restingHR}</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">Measure when waking up (30-100 bpm)</p>
                )}
              </div>

              {/* Max HR Input */}
              <div>
                <label className="block text-xs text-gray-400 coloursplash:text-splash-text-secondary mb-1">
                  Max HR (bpm)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={maxHR}
                  onChange={(e) => handleHRChange(e, 'maxHR')}
                  placeholder={detectedMaxHR ? `Detected: ${detectedMaxHR}` : 'e.g., 180'}
                  className={`w-full px-3 py-2 bg-gray-700 coloursplash:bg-white border rounded-lg text-white coloursplash:text-splash-text-primary text-sm focus:ring-2 focus:ring-blue-500 coloursplash:focus:ring-splash-azure focus:border-transparent placeholder-gray-500 ${hrErrors.maxHR
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-600 coloursplash:border-splash-border'
                    }`}
                />
                {hrErrors.maxHR ? (
                  <p className="text-xs text-red-400 mt-1">{hrErrors.maxHR}</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">From max effort test (120-220 bpm)</p>
                )}
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveAthleteSettings}
              disabled={isSavingHR || !isHRFormValid}
              className={`flex items-center gap-2 px-4 py-2 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isHRFormValid
                ? 'bg-red-500/80 coloursplash:bg-red-500 hover:bg-red-600 coloursplash:hover:bg-red-600'
                : 'bg-gray-500'
                }`}
            >
              {isSavingHR ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4" />
                  Save HR Settings & Recalculate Zones
                </>
              )}
            </button>

            {/* Display Calculated HR Zones */}
            {settings?.config?.hrZones && (
              <div className="mt-4">
                <p className="text-xs text-gray-400 coloursplash:text-splash-text-secondary mb-2">
                  Calculated HR Zones (Karvonen formula):
                </p>
                <div className="grid grid-cols-5 gap-1 text-xs">
                  <div className="text-center p-2 bg-blue-500/20 coloursplash:bg-blue-100 rounded">
                    <p className="font-medium text-blue-400 coloursplash:text-blue-600">Zone 1</p>
                    <p className="text-gray-300 coloursplash:text-gray-700">{settings.config.hrZones.zone1.min}-{settings.config.hrZones.zone1.max}</p>
                    <p className="text-gray-500 text-[10px]">Recovery</p>
                  </div>
                  <div className="text-center p-2 bg-green-500/20 coloursplash:bg-green-100 rounded">
                    <p className="font-medium text-green-400 coloursplash:text-green-600">Zone 2</p>
                    <p className="text-gray-300 coloursplash:text-gray-700">{settings.config.hrZones.zone2.min}-{settings.config.hrZones.zone2.max}</p>
                    <p className="text-gray-500 text-[10px]">Aerobic</p>
                  </div>
                  <div className="text-center p-2 bg-yellow-500/20 coloursplash:bg-yellow-100 rounded">
                    <p className="font-medium text-yellow-400 coloursplash:text-yellow-600">Zone 3</p>
                    <p className="text-gray-300 coloursplash:text-gray-700">{settings.config.hrZones.zone3.min}-{settings.config.hrZones.zone3.max}</p>
                    <p className="text-gray-500 text-[10px]">Tempo</p>
                  </div>
                  <div className="text-center p-2 bg-orange-500/20 coloursplash:bg-orange-100 rounded">
                    <p className="font-medium text-orange-400 coloursplash:text-orange-600">Zone 4</p>
                    <p className="text-gray-300 coloursplash:text-gray-700">{settings.config.hrZones.zone4.min}-{settings.config.hrZones.zone4.max}</p>
                    <p className="text-gray-500 text-[10px]">Threshold</p>
                  </div>
                  <div className="text-center p-2 bg-red-500/20 coloursplash:bg-red-100 rounded">
                    <p className="font-medium text-red-400 coloursplash:text-red-600">Zone 5</p>
                    <p className="text-gray-300 coloursplash:text-gray-700">{settings.config.hrZones.zone5.min}-{settings.config.hrZones.zone5.max}</p>
                    <p className="text-gray-500 text-[10px]">VO2max</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Athlete Body Metrics Section */}
          <div className="mt-4 pt-4 border-t border-gray-700 coloursplash:border-splash-border">
            <div className="flex items-center gap-2 mb-3">
              <Scale className="w-4 h-4 text-green-400 coloursplash:text-green-500" />
              <p className="text-sm font-medium text-gray-300 coloursplash:text-splash-text-primary">
                Athlete Body Metrics
              </p>
            </div>
            <p className="text-xs text-gray-400 coloursplash:text-splash-text-secondary mb-3">
              Body weight enables energy balance calculations, glycogen depletion modeling, and personalized caffeine recommendations.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-3">
              {/* Body Weight Input */}
              <div>
                <label className="block text-xs text-gray-400 coloursplash:text-splash-text-secondary mb-1">
                  Body Weight (kg)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9.]*"
                  value={bodyWeightKg}
                  onChange={(e) => handleWeightChange(e, 'bodyWeightKg')}
                  placeholder="e.g., 70"
                  className={`w-full px-3 py-2 bg-gray-700 coloursplash:bg-white border rounded-lg text-white coloursplash:text-splash-text-primary text-sm focus:ring-2 focus:ring-green-500 coloursplash:focus:ring-splash-green focus:border-transparent placeholder-gray-500 ${weightErrors.bodyWeightKg
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-600 coloursplash:border-splash-border'
                    }`}
                />
                {weightErrors.bodyWeightKg ? (
                  <p className="text-xs text-red-400 mt-1">{weightErrors.bodyWeightKg}</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">Used for calorie burn & caffeine calculations</p>
                )}
              </div>

              {/* Gear Weight Input */}
              <div>
                <label className="block text-xs text-gray-400 coloursplash:text-splash-text-secondary mb-1">
                  Gear Weight (kg)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9.]*"
                  value={gearWeightKg}
                  onChange={(e) => handleWeightChange(e, 'gearWeightKg')}
                  placeholder="e.g., 3"
                  className={`w-full px-3 py-2 bg-gray-700 coloursplash:bg-white border rounded-lg text-white coloursplash:text-splash-text-primary text-sm focus:ring-2 focus:ring-green-500 coloursplash:focus:ring-splash-green focus:border-transparent placeholder-gray-500 ${weightErrors.gearWeightKg
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-600 coloursplash:border-splash-border'
                    }`}
                />
                {weightErrors.gearWeightKg ? (
                  <p className="text-xs text-red-400 mt-1">{weightErrors.gearWeightKg}</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">Vest, bottles, food, etc. (0-30 kg)</p>
                )}
              </div>
            </div>

            {/* Combined Save Button for all athlete settings */}
            <button
              onClick={handleSaveAthleteSettings}
              disabled={isSavingHR || !isHRFormValid || !isWeightFormValid}
              className={`flex items-center gap-2 px-4 py-2 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${(isHRFormValid && isWeightFormValid)
                ? 'bg-green-500/80 coloursplash:bg-green-500 hover:bg-green-600 coloursplash:hover:bg-green-600'
                : 'bg-gray-500'
                }`}
            >
              {isSavingHR ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Scale className="w-4 h-4" />
                  Save All Athlete Settings
                </>
              )}
            </button>
          </div>

          {/* GAP Profile Section */}
          <div className="mt-4 pt-4 border-t border-gray-700 coloursplash:border-splash-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400 coloursplash:text-purple-600" />
                <p className="text-sm font-medium text-gray-300 coloursplash:text-splash-text-primary">
                  Grade Adjusted Pace Profile
                </p>
              </div>
              {gapProfile && (
                <button
                  onClick={handleDeleteGAPProfile}
                  className="text-gray-500 hover:text-red-400 transition-colors p-1"
                  title="Delete GAP Profile"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <p className="text-xs text-gray-400 coloursplash:text-splash-text-secondary mb-3">
              Your personal GAP profile identifies whether you&apos;re a climber, descender, or all-rounder
              based on how your pace changes with terrain.
            </p>

            {gapProfile ? (
              <div className="space-y-3">
                {/* GAP Profile Card */}
                <GAPProfileCard profile={gapProfile} showDetails={true} />

                {/* Toggle Chart Button */}
                <button
                  onClick={() => setShowGAPChart(!showGAPChart)}
                  className="flex items-center gap-2 text-sm text-purple-400 coloursplash:text-purple-600 hover:text-purple-300 transition-colors"
                >
                  {showGAPChart ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Hide Chart
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      View Pace vs Gradient Chart
                    </>
                  )}
                </button>

                {/* GAP Profile Chart */}
                {showGAPChart && (
                  <div className="bg-gray-900/50 coloursplash:bg-white rounded-lg p-4 border border-gray-700 coloursplash:border-splash-border">
                    <GAPProfileChart profile={gapProfile} showStandardComparison={true} />
                  </div>
                )}

                {/* Regenerate Button */}
                <button
                  onClick={handleGenerateGAPProfile}
                  disabled={isGeneratingGAP || !fitData}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs bg-purple-500/20 coloursplash:bg-purple-100 text-purple-400 coloursplash:text-purple-600 rounded-lg hover:bg-purple-500/30 coloursplash:hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingGAP ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3" />
                      Refresh from Current FIT
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button
                onClick={handleGenerateGAPProfile}
                disabled={isGeneratingGAP || !fitData}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 coloursplash:bg-purple-100 text-purple-400 coloursplash:text-purple-600 rounded-lg hover:bg-purple-500/30 coloursplash:hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingGAP ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Profile...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    Generate GAP Profile
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-blue-500/10 coloursplash:bg-splash-azure/10 border border-blue-500/30 coloursplash:border-splash-azure/30 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 coloursplash:text-splash-azure flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-blue-400 coloursplash:text-splash-azure mb-1">No FIT File Uploaded</p>
              <p className="text-sm text-gray-300 coloursplash:text-splash-text-primary mb-3">
                Upload a FIT file from a previous race or training run to enable automatic pace calculation.
                The FIT file should be from a similar course or terrain type for best results.
              </p>

              <div className="space-y-2 text-xs text-gray-400 coloursplash:text-splash-text-secondary mb-3">
                <p className="font-medium text-gray-300 coloursplash:text-splash-text-primary">How to get a FIT file:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    <span className="font-medium">Garmin Connect:</span> Open activity → ⚙️ → Export Original
                  </li>
                  <li>
                    <span className="font-medium">Strava:</span> Open activity → ... → Download GPX
                  </li>
                  <li>
                    <span className="font-medium">Your GPS watch:</span> Connect via USB and copy .FIT files
                  </li>
                </ul>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".fit"
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 coloursplash:bg-splash-azure text-white rounded-lg hover:bg-blue-600 coloursplash:hover:bg-splash-azure/90 transition-colors disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload FIT File
                  </>
                )}
              </button>

              {uploadError && (
                <p className="text-sm text-red-400 coloursplash:text-red-600 mt-2">{uploadError}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tips Section */}
      <div className="bg-gray-900/50 coloursplash:bg-splash-bg-subtle rounded-lg p-4 border border-gray-700 coloursplash:border-splash-border">
        <p className="text-sm font-medium text-gray-300 coloursplash:text-splash-text-primary mb-2">💡 Tips for best results:</p>
        <ul className="text-xs text-gray-400 coloursplash:text-splash-text-secondary space-y-1 list-disc list-inside">
          <li>Use a FIT file from a race with similar terrain (hills vs flat)</li>
          <li>Choose a race where you ran well (not injured or DNF)</li>
          <li>The route doesn't need to match exactly – the algorithm extracts your running characteristics</li>
          <li>After uploading, click "Recalculate All Paces" to update all segments</li>
          <li>You can toggle individual segments between manual and auto-pace in the segment editor</li>
        </ul>
      </div>
    </div>
  );
}
