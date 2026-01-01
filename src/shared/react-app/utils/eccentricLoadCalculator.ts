/**
 * Eccentric Load Calculator
 * 
 * Calculates muscle stress from downhill running based on gradient and distance.
 * Eccentric contractions (muscle lengthening under load) occur during descent
 * and cause significantly more muscle damage than concentric work.
 */

export interface EccentricLoadLevel {
    level: 'low' | 'moderate' | 'high' | 'extreme';
    color: string;
    bgColor: string;
    icon: string;
    message: string;
    trainingAdvice: string;
}

export interface DescentStrategy {
    category: 'easy' | 'moderate' | 'technical' | 'extreme';
    gradient: number;
    color: string;
    textColor: string;
    bgColor: string;
    icon: '⬇️' | '⚠️' | '🔶' | '🛑';
    advice: string;
    paceMultiplier: number; // Applied on top of terrain factor
}

export interface SegmentEccentricAnalysis {
    gradient: number;
    elevationLoss: number; // feet
    distance: number; // miles
    eccentricScore: number; // 0-100
    descentStrategy: DescentStrategy;
    warnings: string[];
}

export interface RaceEccentricSummary {
    totalElevationLoss: number; // feet
    totalEccentricScore: number;
    loadLevel: EccentricLoadLevel;
    steepDescentSegments: number; // segments with gradient < -10%
    extremeDescentSegments: number; // segments with gradient < -15%
    recommendations: string[];
}

// Thresholds for descent categories
export const DESCENT_THRESHOLDS = {
    EASY: -6,        // 0% to -6%
    MODERATE: -10,   // -6% to -10%
    TECHNICAL: -15,  // -10% to -15%
    EXTREME: -20     // Beyond -15%
};

/**
 * Get descent strategy based on average gradient
 */
export function getDescentStrategy(gradientPercent: number): DescentStrategy {
    if (gradientPercent >= DESCENT_THRESHOLDS.EASY) {
        return {
            category: 'easy',
            gradient: gradientPercent,
            color: 'green',
            textColor: 'text-green-600 dark:text-green-400',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
            icon: '⬇️',
            advice: 'Let gravity assist. Maintain upright posture and quick turnover.',
            paceMultiplier: 0.95 // 5% faster
        };
    } else if (gradientPercent >= DESCENT_THRESHOLDS.MODERATE) {
        return {
            category: 'moderate',
            gradient: gradientPercent,
            color: 'yellow',
            textColor: 'text-yellow-600 dark:text-yellow-400',
            bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
            icon: '⚠️',
            advice: 'Optimal efficiency zone. Controlled speed, lean slightly forward.',
            paceMultiplier: 1.0
        };
    } else if (gradientPercent >= DESCENT_THRESHOLDS.TECHNICAL) {
        return {
            category: 'technical',
            gradient: gradientPercent,
            color: 'orange',
            textColor: 'text-orange-600 dark:text-orange-400',
            bgColor: 'bg-orange-50 dark:bg-orange-900/20',
            icon: '🔶',
            advice: 'High quad load. Shorten stride, increase cadence, protect knees.',
            paceMultiplier: 1.1 // 10% slower due to braking
        };
    } else {
        return {
            category: 'extreme',
            gradient: gradientPercent,
            color: 'red',
            textColor: 'text-red-600 dark:text-red-400',
            bgColor: 'bg-red-50 dark:bg-red-900/20',
            icon: '🛑',
            advice: 'Extreme eccentric load. Consider walking, use trekking poles if available.',
            paceMultiplier: 1.25 // 25% slower, may need to walk
        };
    }
}

/**
 * Calculate eccentric load score for a segment
 * Score considers both gradient severity and distance
 */
export function calculateSegmentEccentricScore(
    gradientPercent: number,
    distanceMiles: number,
    elevationLossFeet: number
): number {
    // Only calculate for descents
    if (gradientPercent >= 0) return 0;

    // Base score from gradient severity (exponential beyond -10%)
    let gradientScore = 0;
    const absGradient = Math.abs(gradientPercent);

    if (absGradient <= 6) {
        gradientScore = absGradient * 2; // 0-12 points
    } else if (absGradient <= 10) {
        gradientScore = 12 + (absGradient - 6) * 4; // 12-28 points
    } else if (absGradient <= 15) {
        gradientScore = 28 + (absGradient - 10) * 8; // 28-68 points
    } else {
        gradientScore = 68 + (absGradient - 15) * 12; // 68+ points
    }

    // Multiply by distance (longer descents = more cumulative load)
    const distanceMultiplier = Math.min(distanceMiles, 5) / 2; // Cap at 5 miles

    // Multiply by elevation loss factor
    const elevationMultiplier = Math.min(elevationLossFeet / 1000, 3); // Cap at 3000ft

    return Math.min(100, gradientScore * distanceMultiplier * elevationMultiplier);
}

/**
 * Analyze eccentric load for a single segment
 */
export function analyzeSegmentEccentricLoad(
    gradientPercent: number,
    distanceMiles: number,
    elevationLossFeet: number
): SegmentEccentricAnalysis {
    const eccentricScore = calculateSegmentEccentricScore(
        gradientPercent,
        distanceMiles,
        elevationLossFeet
    );

    const descentStrategy = getDescentStrategy(gradientPercent);
    const warnings: string[] = [];

    // Generate warnings based on severity
    if (gradientPercent < DESCENT_THRESHOLDS.TECHNICAL) {
        warnings.push(`Steep descent (${Math.abs(gradientPercent).toFixed(1)}%) - High eccentric load on quads`);
    }

    if (elevationLossFeet > 1500) {
        warnings.push(`Significant elevation loss (${elevationLossFeet.toFixed(0)}ft) - Pace yourself`);
    }

    if (eccentricScore > 50) {
        warnings.push('Consider pre-race downhill training for this segment');
    }

    if (gradientPercent < DESCENT_THRESHOLDS.EXTREME) {
        warnings.push('Extreme gradient - Trekking poles strongly recommended');
    }

    return {
        gradient: gradientPercent,
        elevationLoss: elevationLossFeet,
        distance: distanceMiles,
        eccentricScore,
        descentStrategy,
        warnings
    };
}

/**
 * Get eccentric load level description
 */
export function getEccentricLoadLevel(totalScore: number): EccentricLoadLevel {
    if (totalScore < 100) {
        return {
            level: 'low',
            color: 'green',
            bgColor: 'bg-green-100 dark:bg-green-900/30',
            icon: '🟢',
            message: 'Low eccentric load - Standard quad conditioning sufficient',
            trainingAdvice: 'Normal training should prepare you well for this race.'
        };
    } else if (totalScore < 250) {
        return {
            level: 'moderate',
            color: 'yellow',
            bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
            icon: '🟡',
            message: 'Moderate eccentric load - Expect quad fatigue in latter half',
            trainingAdvice: 'Include 1-2 weekly downhill sessions in your training block.'
        };
    } else if (totalScore < 500) {
        return {
            level: 'high',
            color: 'orange',
            bgColor: 'bg-orange-100 dark:bg-orange-900/30',
            icon: '🟠',
            message: 'High eccentric load - Downhill training essential',
            trainingAdvice: 'Include 2-3 weekly downhill repeats. Consider eccentric-focused strength work.'
        };
    } else {
        return {
            level: 'extreme',
            color: 'red',
            bgColor: 'bg-red-100 dark:bg-red-900/30',
            icon: '🔴',
            message: 'Extreme eccentric load - Race demands serious downhill preparation',
            trainingAdvice: 'Prioritize downhill training. Consider trekking poles. Build up gradually to prevent injury.'
        };
    }
}

/**
 * Calculate race-level eccentric load summary
 */
export function calculateRaceEccentricSummary(
    segments: Array<{
        gradient: number;
        distanceMiles: number;
        elevationLossFeet: number;
    }>
): RaceEccentricSummary {
    let totalElevationLoss = 0;
    let totalEccentricScore = 0;
    let steepDescentSegments = 0;
    let extremeDescentSegments = 0;

    for (const segment of segments) {
        if (segment.gradient < 0) {
            totalElevationLoss += segment.elevationLossFeet;
            totalEccentricScore += calculateSegmentEccentricScore(
                segment.gradient,
                segment.distanceMiles,
                segment.elevationLossFeet
            );

            if (segment.gradient < DESCENT_THRESHOLDS.MODERATE) {
                steepDescentSegments++;
            }
            if (segment.gradient < DESCENT_THRESHOLDS.TECHNICAL) {
                extremeDescentSegments++;
            }
        }
    }

    const loadLevel = getEccentricLoadLevel(totalEccentricScore);
    const recommendations: string[] = [];

    // Generate recommendations
    if (totalElevationLoss > 5000) {
        recommendations.push(`Total descent of ${totalElevationLoss.toFixed(0)}ft - significant cumulative quad stress`);
    }

    if (steepDescentSegments > 0) {
        recommendations.push(`${steepDescentSegments} segment(s) with steep descent (>10% grade)`);
    }

    if (extremeDescentSegments > 0) {
        recommendations.push(`${extremeDescentSegments} segment(s) with extreme descent - consider poles`);
    }

    if (loadLevel.level === 'high' || loadLevel.level === 'extreme') {
        recommendations.push('Pre-race eccentric training strongly recommended');
        recommendations.push('Consider slower start to preserve quads for descents');
    }

    return {
        totalElevationLoss,
        totalEccentricScore,
        loadLevel,
        steepDescentSegments,
        extremeDescentSegments,
        recommendations
    };
}

/**
 * Get color for gradient visualization on elevation chart
 */
export function getGradientColor(gradientPercent: number): string {
    if (gradientPercent > 2) {
        // Uphill - green shades
        if (gradientPercent > 15) return '#15803d'; // dark green
        if (gradientPercent > 10) return '#22c55e'; // green
        if (gradientPercent > 5) return '#86efac'; // light green
        return '#bbf7d0'; // very light green
    } else if (gradientPercent < -2) {
        // Downhill - yellow to red
        if (gradientPercent < -15) return '#dc2626'; // red
        if (gradientPercent < -10) return '#f97316'; // orange
        if (gradientPercent < -6) return '#eab308'; // yellow
        return '#fef08a'; // light yellow
    }
    // Flat - blue
    return '#3b82f6';
}
