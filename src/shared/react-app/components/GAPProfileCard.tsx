/**
 * GAP Profile Card Component
 *
 * Displays a user's personalized GAP profile showing their
 * climbing and descending strengths.
 */

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Activity, Info, Mountain } from 'lucide-react';
import type { GAPProfile } from '../utils/gapProfileAnalyzer';
import { compareToStandardModel, getAthleteType } from '../utils/gapProfileAnalyzer';

interface GAPProfileCardProps {
  profile: GAPProfile;
  showDetails?: boolean;
}

const GAPProfileCard: React.FC<GAPProfileCardProps> = ({ profile, showDetails = false }) => {
  const comparison = compareToStandardModel(profile);
  const athleteType = getAthleteType(profile);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);

  // Get icon and color for athlete type
  const getAthleteTypeDisplay = () => {
    switch (athleteType) {
      case 'climber':
        return {
          icon: <TrendingUp className="w-5 h-5" />,
          color: 'text-green-600 dark:text-green-400',
          label: 'STRONG CLIMBER',
          description: 'You handle uphills better than most runners'
        };
      case 'descender':
        return {
          icon: <TrendingDown className="w-5 h-5" />,
          color: 'text-blue-600 dark:text-blue-400',
          label: 'STRONG DESCENDER',
          description: 'You excel on downhill sections'
        };
      case 'all-rounder':
        return {
          icon: <Mountain className="w-5 h-5" />,
          color: 'text-purple-600 dark:text-purple-400',
          label: 'MOUNTAIN GOAT',
          description: 'You handle all terrain types well'
        };
      default:
        return {
          icon: <Activity className="w-5 h-5" />,
          color: 'text-orange-600 dark:text-orange-400',
          label: 'HILLS CHALLENGE YOU',
          description: 'Hills slow you more than average - great area for improvement!'
        };
    }
  };

  const typeDisplay = getAthleteTypeDisplay();

  // Get strength indicator
  const getStrengthBadge = (strength: 'strong' | 'average' | 'weak') => {
    const colors = {
      strong: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      average: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400',
      weak: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
    };

    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[strength]}`}>
        {strength.toUpperCase()}
      </span>
    );
  };

  // Get data quality badge
  const getDataQualityBadge = () => {
    const colors = {
      high: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
      low: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
    };

    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[profile.dataQuality]}`}>
        {profile.dataQuality.toUpperCase()} CONFIDENCE
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-[#2a3244] rounded-lg p-4 shadow-md dark:shadow-none">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          {typeDisplay.icon}
          <span>Your Running Profile</span>
        </h3>
        {getDataQualityBadge()}
      </div>

      <div className="space-y-3">
        {/* Climbing Strength */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Climbing</span>
          </div>
          <div className="flex items-center gap-2">
            {getStrengthBadge(profile.climbingStrength)}
            {showDetails && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({profile.uphillFactor.toFixed(0)}s/100ft)
              </span>
            )}
          </div>
        </div>

        {/* Descending Strength */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Descending</span>
          </div>
          <div className="flex items-center gap-2">
            {getStrengthBadge(profile.descendingStrength)}
            {showDetails && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({profile.downhillFactor.toFixed(0)}s/100ft)
              </span>
            )}
          </div>
        </div>

        {/* Athlete Type */}
        <div className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Athlete Type</div>
          <div className={`text-sm font-semibold ${typeDisplay.color} flex items-center gap-2`}>
            {typeDisplay.icon}
            {typeDisplay.label}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {typeDisplay.description}
          </div>
        </div>

        {/* Descent Strategy Recommendations */}
        {profile.descendingStrength === 'weak' && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300 mb-2">
              <TrendingDown className="w-4 h-4" />
              Descent Training Tips
            </div>
            <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-1">
              <li>• Practice downhill running to build eccentric strength</li>
              <li>• Include plyometrics and step-downs in training</li>
              <li>• On steep descents (&gt;10%), consider walking to save your quads</li>
              <li>• Use trekking poles for technical descents</li>
            </ul>
          </div>
        )}
        {profile.descendingStrength === 'strong' && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300 mb-2">
              <TrendingDown className="w-4 h-4" />
              Your Descent Advantage
            </div>
            <ul className="text-xs text-green-600 dark:text-green-400 space-y-1">
              <li>• You can make up time on downhills - use them strategically</li>
              <li>• Your eccentric strength is above average</li>
              <li>• Push descents when others are braking</li>
              <li>• Maintain momentum through rolling terrain</li>
            </ul>
          </div>
        )}

        {/* Show details if requested */}
        {showDetails && (
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <strong>vs Average:</strong>
            </div>
            <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
              <div>• {comparison.uphillComparison}</div>
              <div>• {comparison.downhillComparison}</div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {comparison.overallAssessment}
            </div>

            {/* Source Race Info */}
            <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
              <div className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                📊 Profile Source
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Based on {profile.distanceCovered.toFixed(1)} miles from <span className="font-medium">{profile.createdFromFIT}</span>
              </div>
            </div>

            {/* Context/Limitations Info */}
            <div className="relative">
              <button
                onClick={() => setShowInfoTooltip(!showInfoTooltip)}
                className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mt-2"
              >
                <Info className="w-3 h-3" />
                <span>What affects this analysis?</span>
              </button>

              {showInfoTooltip && (
                <div className="absolute bottom-full left-0 mb-2 w-80 p-3 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-xl z-10">
                  <div className="font-medium mb-2">⚠️ Factors Not Accounted For:</div>
                  <ul className="space-y-1 text-gray-300">
                    <li>• Technical terrain (rocks, mud, bog)</li>
                    <li>• Ultra-distance fatigue (hills feel harder late in race)</li>
                    <li>• Weather conditions on race day</li>
                    <li>• Aid station stops that may be on hills</li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-gray-600 text-gray-400">
                    Compared to lab-based Minetti model (smooth treadmill, fresh legs). Real ultra performance will often look "slower" than lab baseline.
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-600">
                    <div className="font-medium text-green-400 mb-1">✓ Age-Independent:</div>
                    <div className="text-gray-300">This compares YOUR hill pace to YOUR flat pace, so age doesn't significantly affect the comparison.</div>
                  </div>
                  <div className="absolute bottom-0 left-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900 dark:bg-gray-700"></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GAPProfileCard;
