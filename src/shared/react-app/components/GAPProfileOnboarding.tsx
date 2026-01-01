/**
 * GAP Profile Onboarding Component
 *
 * A guided step-by-step flow to help users create their personalized
 * Grade Adjusted Pace profile from FIT data.
 */

import React, { useState, useRef } from 'react';
import { X, Upload, TrendingUp, Loader2, CheckCircle, ChevronRight, Mountain, Zap, Target } from 'lucide-react';
import type { ParsedFITData } from '@/shared/types';
import { localStorageService } from '../services/localStorage';
import { analyzeGAPProfile, type GAPProfile } from '../utils/gapProfileAnalyzer';
import GAPProfileCard from './GAPProfileCard';

interface GAPProfileOnboardingProps {
    onComplete: (profile: GAPProfile) => void;
    onCancel: () => void;
    existingFitData?: ParsedFITData | null;
}

type OnboardingStep = 'intro' | 'upload' | 'analyzing' | 'results';

export function GAPProfileOnboarding({
    onComplete,
    onCancel,
    existingFitData,
}: GAPProfileOnboardingProps) {
    const [step, setStep] = useState<OnboardingStep>('intro');
    const [profile, setProfile] = useState<GAPProfile | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // If existing FIT data is provided, skip to analysis
    React.useEffect(() => {
        if (existingFitData && step === 'intro') {
            handleAnalyze(existingFitData);
        }
    }, [existingFitData]);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadError(null);

        try {
            // Use localStorage service to parse FIT file synchronously for now
            // This is a simplified version - in production, you'd use the full parsing flow
            const fileKey = `temp_gap_fit_${Date.now()}`;
            await localStorageService.setAutoPaceFITFile(0, file);

            // Get the parsed data back
            const data = localStorageService.getAutoPaceFITFile(fileKey);
            if (data) {
                handleAnalyze(data);
            } else {
                throw new Error('Failed to parse FIT file');
            }
        } catch (error) {
            console.error('[GAPOnboarding] Upload error:', error);
            setUploadError(error instanceof Error ? error.message : 'Failed to upload FIT file');
            setIsUploading(false);
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleAnalyze = async (data: ParsedFITData) => {
        setStep('analyzing');
        setIsUploading(false);

        // Simulate a brief delay for UX
        await new Promise(resolve => setTimeout(resolve, 1500));

        try {
            const newProfile = analyzeGAPProfile(data);
            setProfile(newProfile);
            setStep('results');
        } catch (error) {
            console.error('[GAPOnboarding] Analysis error:', error);
            setUploadError('Failed to analyze FIT data');
            setStep('upload');
        }
    };

    const handleSaveProfile = () => {
        if (profile) {
            localStorageService.saveGAPProfile(profile);
            onComplete(profile);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 dark:bg-gray-900 coloursplash:bg-white rounded-xl max-w-lg w-full shadow-2xl border border-gray-700 coloursplash:border-splash-border overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700 coloursplash:border-splash-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white coloursplash:text-splash-text-primary">
                                Create Your GAP Profile
                            </h2>
                            <p className="text-xs text-gray-400 coloursplash:text-splash-text-secondary">
                                {step === 'intro' && 'Learn about your climbing & descending abilities'}
                                {step === 'upload' && 'Upload a FIT file from a hilly run'}
                                {step === 'analyzing' && 'Analyzing your running patterns...'}
                                {step === 'results' && 'Your personalized profile is ready!'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-white transition-colors p-1"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Step 1: Introduction */}
                    {step === 'intro' && (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-start gap-3 text-gray-300 coloursplash:text-splash-text-primary">
                                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                                        <Mountain className="w-4 h-4 text-green-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Discover Your Climbing Strength</p>
                                        <p className="text-sm text-gray-400 coloursplash:text-splash-text-secondary">
                                            See how your uphill pace compares to the average runner
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 text-gray-300 coloursplash:text-splash-text-primary">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                        <Zap className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Analyze Your Descending Skills</p>
                                        <p className="text-sm text-gray-400 coloursplash:text-splash-text-secondary">
                                            Understand how you handle technical downhills
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 text-gray-300 coloursplash:text-splash-text-primary">
                                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                        <Target className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Get Personalized Pace Predictions</p>
                                        <p className="text-sm text-gray-400 coloursplash:text-splash-text-secondary">
                                            More accurate segment times based on YOUR abilities
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setStep('upload')}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
                            >
                                Get Started
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Step 2: Upload */}
                    {step === 'upload' && (
                        <div className="space-y-6">
                            <div className="bg-gray-800/50 coloursplash:bg-splash-bg-subtle rounded-lg p-4 border border-dashed border-gray-600 coloursplash:border-splash-border text-center">
                                <Upload className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                                <p className="text-gray-300 coloursplash:text-splash-text-primary mb-1">
                                    Upload a FIT file with hills
                                </p>
                                <p className="text-xs text-gray-500 mb-4">
                                    Best results from a race with 1000+ ft of elevation change
                                </p>

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
                                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4 inline mr-2" />
                                            Choose FIT File
                                        </>
                                    )}
                                </button>
                            </div>

                            {uploadError && (
                                <p className="text-sm text-red-400 text-center">{uploadError}</p>
                            )}

                            <button
                                onClick={() => setStep('intro')}
                                className="w-full text-gray-400 hover:text-white transition-colors text-sm"
                            >
                                ← Back
                            </button>
                        </div>
                    )}

                    {/* Step 3: Analyzing */}
                    {step === 'analyzing' && (
                        <div className="py-8 text-center">
                            <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
                            <p className="text-lg text-white coloursplash:text-splash-text-primary mb-2">
                                Analyzing your running patterns...
                            </p>
                            <p className="text-sm text-gray-400 coloursplash:text-splash-text-secondary">
                                Examining pace changes across different gradients
                            </p>
                        </div>
                    )}

                    {/* Step 4: Results */}
                    {step === 'results' && profile && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-center gap-2 text-green-400">
                                <CheckCircle className="w-6 h-6" />
                                <span className="font-medium">Profile Created!</span>
                            </div>

                            <GAPProfileCard profile={profile} showDetails={true} />

                            <div className="flex gap-3">
                                <button
                                    onClick={onCancel}
                                    className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveProfile}
                                    className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
                                >
                                    Save Profile
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Progress indicator */}
                <div className="px-6 pb-4">
                    <div className="flex gap-2">
                        {['intro', 'upload', 'analyzing', 'results'].map((s, i) => (
                            <div
                                key={s}
                                className={`h-1 flex-1 rounded-full transition-colors ${['intro', 'upload', 'analyzing', 'results'].indexOf(step) >= i
                                    ? 'bg-purple-500'
                                    : 'bg-gray-700'
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GAPProfileOnboarding;
