import z from "zod";

export const RaceSchema = z.object({
  id: z.number().optional(),
  userId: z.string().optional(), // Firebase user ID
  name: z.string().min(1, "Race name is required"),
  distance_miles: z.number().positive("Distance must be positive"),
  distance_km: z.number().positive("Distance must be positive"),
  gpx_file_key: z.string().nullable().optional(),
  fit_comparison_file_key: z.string().nullable().optional(), // FIT file for race comparison
  fit_autopace_file_key: z.string().nullable().optional(), // FIT file for automatic pace derivation
  emergency_contact_name: z.string().nullable().optional(),
  emergency_contact_phone: z.string().nullable().optional(),
  start_date_time: z.string().nullable().optional(), // ISO 8601 datetime string
  timezone: z.string().nullable().optional(), // IANA timezone (e.g., "America/New_York")
  mandatory_kit: z.string().nullable().optional(), // JSON stringified array of kit items
  logo_url: z.string().nullable().optional(), // URL to race logo image (private, not shared)
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const SupportCrewMemberSchema = z.object({
  name: z.string().min(1, "Crew member name is required"),
  phone: z.string().min(1, "Phone number is required"),
});

// Nutrition Item Interface for carb, sodium, water, and caffeine tracking
export interface NutritionItem {
  id: string;
  productName: string;
  quantity: number;
  carbsPerServing: number;
  sodiumPerServing: number;  // mg of sodium per serving
  waterPerServing: number;    // ml of water per serving
  caffeinePerServing?: number; // mg of caffeine per serving
  servingSize: string;
  isCustom: boolean;
  isEditingCarbs: boolean;
  isEditingSodium: boolean;  // for editing sodium values
  isEditingWater: boolean;   // for editing water values
  isEditingCaffeine?: boolean; // for editing caffeine values
}

export const SegmentSchema = z.object({
  id: z.number().optional(),
  race_id: z.number(),
  checkpoint_name: z.string().min(1, "Checkpoint name is required"),
  segment_distance_miles: z.number().nonnegative("Distance must be non-negative"),
  segment_distance_km: z.number().nonnegative("Distance must be non-negative"),
  cumulative_distance_miles: z.number().nonnegative("Distance must be non-negative"),
  cumulative_distance_km: z.number().nonnegative("Distance must be non-negative"),
  terrain_description: z.string().nullable().optional(),
  terrain_factor: z.number().nullable().optional(), // Multiplier: 0.8 (fast) to 1.5 (technical). Default 1.0
  nutrition_plan: z.string().nullable().optional(), // Legacy field for backward compatibility
  carb_goal_per_hour: z.number().nullable().optional(), // User's carb goal per hour (g/hr)
  sodium_goal_per_hour: z.number().nullable().optional(), // User's sodium goal per hour (mg/hr)
  water_goal_per_hour: z.number().nullable().optional(),  // User's water goal per hour (ml/hr)
  caffeine_goal_per_hour: z.number().nullable().optional(), // User's caffeine goal per hour (mg/hr)
  segment_nutrition_items: z.string().nullable().optional(), // JSON array of NutritionItem[]
  notes: z.string().nullable().optional(),
  segment_order: z.number().int().nonnegative(),
  predicted_segment_time_minutes: z.number().nullable().optional(),
  custom_pace_min_per_mile: z.number().nullable().optional(),
  auto_derived_pace: z.number().nullable().optional(), // Auto-calculated pace from FIT file
  use_auto_pace: z.boolean().nullable().optional(), // Whether to use auto-pace or manual pace
  auto_pace_confidence: z.enum(['high', 'medium', 'low']).nullable().optional(),
  auto_pace_reasoning: z.string().nullable().optional(),
  cutoff_time: z.string().nullable().optional(), // Time string (e.g., "6:00 AM")
  checkpoint_time_minutes: z.number().nullable().optional(), // Time spent at checkpoint
  plusCode: z.string().nullable().optional(),
  map_reference: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  support_crew_present: z.boolean().nullable().optional(),
  support_crew_names: z.string().nullable().optional(),
  support_crew_members: z.string().nullable().optional(), // JSON stringified array of SupportCrewMember
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const CreateRaceInputSchema = z.object({
  name: z.string().min(1),
  distance_miles: z.number().positive(),
});

export const CreateSegmentInputSchema = z.object({
  race_id: z.number(),
  checkpoint_name: z.string().min(1),
  segment_distance_miles: z.number().nonnegative(),
  terrain_description: z.string().optional(),
  nutrition_plan: z.string().optional(),
  notes: z.string().optional(),
  segment_order: z.number().int().nonnegative(),
});

export const UpdateSegmentInputSchema = CreateSegmentInputSchema.partial().extend({
  id: z.number(),
  custom_pace_min_per_mile: z.number().optional(),
});

export const ElevationLabelSchema = z.object({
  id: z.number().optional(),
  race_id: z.number(),
  distance_miles: z.number().nonnegative(),
  label: z.string().min(1),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const CreateElevationLabelInputSchema = z.object({
  race_id: z.number(),
  distance_miles: z.number().nonnegative(),
  label: z.string().min(1),
});

export type SupportCrewMember = z.infer<typeof SupportCrewMemberSchema>;
export type Race = z.infer<typeof RaceSchema>;
export type Segment = z.infer<typeof SegmentSchema>;
export type CreateRaceInput = z.infer<typeof CreateRaceInputSchema>;
export type CreateSegmentInput = z.infer<typeof CreateSegmentInputSchema>;
export type UpdateSegmentInput = z.infer<typeof UpdateSegmentInputSchema>;
export type ElevationLabel = z.infer<typeof ElevationLabelSchema>;
export type CreateElevationLabelInput = z.infer<typeof CreateElevationLabelInputSchema>;

export interface ElevationPoint {
  distance: number;
  elevation: number;
}

// ETA (Expected Time of Arrival) data for segments
export interface SegmentETA {
  eta: Date;
  formattedTime: string; // "2:30 PM"
  formatted24h: string; // "14:30"
  dayOfWeek: string; // "Saturday"
  fullDate: string; // "Jun 15, 2:30 PM"
  cumulativeTimeMinutes: number; // Total minutes from start
  segmentTimeMinutes: number; // This segment's duration in minutes
  isDaylight: boolean;
  isNight: boolean;
  crossesMidnight: boolean;
}

// Segment with computed ETA fields
export interface SegmentWithETA extends Segment {
  eta?: SegmentETA;
}

// ============================================
// COMMUNITY PLANS TYPES
// ============================================

// Community Plan Schema
export const CommunityPlanSchema = z.object({
  id: z.string(),
  userId: z.string(), // Creator's Firebase UID
  displayName: z.string(), // User's chosen display name (NOT real name)
  // No photoURL - using initials-based avatars (free tier friendly)
  shareProfile: z.boolean(), // Whether to show profile info

  // Race data (snapshot at time of sharing)
  raceName: z.string(),
  distanceMiles: z.number(),
  distanceKm: z.number(),
  startDateTime: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),

  // Plan details
  segmentCount: z.number(),
  totalCheckpoints: z.number(),
  hasGPX: z.boolean(),
  hasMandatoryKit: z.boolean(),

  // Metadata
  createdAt: z.string(), // ISO 8601
  updatedAt: z.string(),
  views: z.number(),

  // Reactions
  reactions: z.object({
    thumbsUp: z.number(),
    love: z.number(),
  }),

  // Full plan data (JSON snapshot)
  planData: z.object({
    race: RaceSchema,
    segments: z.array(SegmentSchema),
    elevationLabels: z.array(ElevationLabelSchema),
    gpxContent: z.string().nullable().optional(), // GPX file XML content for importing
  }),
});

export type CommunityPlan = z.infer<typeof CommunityPlanSchema>;

// User Reaction Schema
export const UserReactionSchema = z.object({
  userId: z.string(),
  reactionType: z.enum(['thumbsUp', 'love']).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type UserReaction = z.infer<typeof UserReactionSchema>;

// User Profile Schema
export const UserProfileSchema = z.object({
  userId: z.string(),
  displayName: z.string(), // User-chosen display name
  // No photoURL - using initials-based avatars (free tier friendly)
  bio: z.string().nullable().optional(), // Optional bio
  location: z.string().nullable().optional(), // Optional location

  // Privacy settings
  shareProfileByDefault: z.boolean(), // Default checkbox state

  // Stats
  sharedPlansCount: z.number(),
  totalReactionsReceived: z.number(),

  // Rate limiting
  lastShareDate: z.string().nullable().optional(), // Last date user shared (YYYY-MM-DD)
  sharesCountToday: z.number(), // Number of shares today (max 2)

  // Metadata
  createdAt: z.string(),
  updatedAt: z.string(),
  lastUpdated: z.string(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// Community plan with reaction type
export interface CommunityPlanWithReaction extends CommunityPlan {
  userReaction?: 'thumbsUp' | 'love' | null;
}

// ============================================
// FIT FILE COMPARISON TYPES
// ============================================

export interface FITRecord {
  timestamp: Date;
  distance: number; // cumulative miles
  elevation: number; // meters
  heartRate?: number; // bpm
  speed?: number; // mph or km/h from FIT
  pace?: number; // min/mile calculated from speed
  cadence?: number; // steps per minute
  power?: number; // watts
  lat?: number;
  lon?: number;
}

// FIT Record with GAP data
export interface FITRecordWithGAP extends FITRecord {
  gap?: number; // Grade Adjusted Pace in min/mile
  gradient?: number; // Grade percentage at this point
}

export interface ParsedFITData {
  fileName: string;
  raceName?: string;
  raceDate?: string;
  totalDistance: number; // miles
  totalTime: number; // seconds
  deviceManufacturer?: string | number;
  deviceProduct?: string | number;
  deviceProductId?: string | number;
  deviceModel?: string;
  firmwareVersion?: string | number;
  recordingInterval?: number;
  records: FITRecord[];
  // Strava-specific properties
  source?: string;
  stravaActivityId?: number;
  stravaActivityName?: string;
}

export interface SegmentComparisonData {
  segmentIndex: number;
  previousAvgHR?: number; // from FIT file (actual HR from previous race)
  previousAvgPace?: number; // min/mile from FIT file (actual pace from previous race)
  plannedPace?: number; // min/mile from segment.custom_pace_min_per_mile
  distanceMatch: boolean; // true if FIT has data for this distance range
  comparisonMetrics?: {
    paceVariance: number; // percentage difference (negative = faster, positive = slower)
  };
}

// Chart overlay configuration
export interface ChartOverlayConfig {
  showElevation: boolean;
  showPlannedPace: boolean;
  showActualPace: boolean;
  showHeartRate: boolean;
  showPaceZones: boolean;
  showHeartRateZones: boolean;
}

// Device information from FIT file
export interface DeviceInfo {
  manufacturer: string;
  product: string;
  model: string;
  firmwareVersion?: string;
  recordingInterval: number;
}

// ============================================
// ENHANCED RACE COMPARISON TYPES
// ============================================

export interface CheckpointSplitAnalysis {
  segmentIndex: number;
  checkpointName: string;

  // Distance metrics
  segmentDistance: number;
  cumulativeDistance: number;

  // Time metrics
  plannedTime: number;        // Based on planned pace (minutes)
  actualTime: number;          // From FIT file (minutes)
  timeDifference: number;      // Actual - Planned (minutes)

  // Pace metrics
  plannedPace: number;         // min/mile
  actualPace: number;          // min/mile from FIT
  paceVariance: number;        // percentage

  // GAP (Grade Adjusted Pace) metrics
  avgGAP?: number;             // Average Grade Adjusted Pace for this segment (actual from FIT)
  plannedGAP?: number;         // Planned Grade Adjusted Pace (based on planned pace + elevation)
  gapVariance?: number;        // Percentage difference between GAP and actual pace

  // Performance indicators
  effortLevel: 'easy' | 'moderate' | 'hard' | 'maximal';
  fatigueIndex: number;        // Based on pace degradation

  // Physiological metrics
  avgHeartRate: number;
  maxHeartRate: number;
  avgCadence?: number;
  avgPower?: number;           // If available

  // Environmental factors
  elevationGain: number;
  elevationLoss: number;
  avgGrade: number;            // percentage
  temperature?: number;        // If available in FIT
}

export interface OverlayConfig {
  showElevation: boolean;
  showPace: boolean;
  showHeartRate: boolean;
  showPower: boolean;
  showCadence: boolean;
  showTemperature: boolean;
  showGrade: boolean;
  showSplits: boolean;
  showPaceZones: boolean;
  showHeartRateZones: boolean;
}

export interface GPSDeviceInfo {
  manufacturer: string;
  product: string;
  model: string;
  firmwareVersion?: string;
  batteryStatus?: number;
  gpsAccuracy?: string;
  recordingInterval?: number;
}

// Extended ParsedFITData with device information
export interface ExtendedParsedFITData extends ParsedFITData {
  deviceManufacturer?: string | number;
  deviceProduct?: string | number;
  deviceProductId?: string | number;
  deviceModel?: string;
  firmwareVersion?: string | number;
  batteryStatus?: number;
  gpsAccuracy?: string;
  recordingInterval?: number;
  avgCadence?: number;
  avgPower?: number;
  avgTemperature?: number;
}

export interface RaceAnalytics {
  actualFinishTime: number;      // seconds
  timeDifference: number;         // seconds (actual - planned)
  avgPace: number;                // min/mile
  paceVariance: number;           // percentage
  avgHeartRate: number;           // bpm
  avgHRZone: number;              // 1-5
  efficiencyScore: number;        // 0-100
  efficiencyGrade: string;        // A, B, C, D, F
  negativeSplit: boolean;
  pacingConsistency: string;      // "Excellent", "Good", "Fair", "Poor"
  fadeRate: number;               // % per hour
  splits: CheckpointSplitAnalysis[];
  insights: PerformanceInsight[];
}

export interface PerformanceInsight {
  type: 'pacing' | 'nutrition' | 'training' | 'strategy' | 'recovery';
  priority: 'high' | 'medium' | 'low';
  message: string;
  recommendation: string;
  details?: string;
}

// ============================================
// STRAVA INTEGRATION TYPES
// ============================================

// Strava OAuth tokens
export interface StravaTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
}

// Strava athlete (user) data
export interface StravaAthlete {
  id: number;
  username?: string;
  firstname: string;
  lastname: string;
  profile: string; // Avatar URL
  city?: string;
  state?: string;
  country?: string;
}

// Strava activity summary (from list endpoint)
export interface StravaActivitySummary {
  id: number;
  name: string;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  total_elevation_gain: number; // meters
  type: string; // "Run", "Trail Run", "Race", etc.
  sport_type: string;
  start_date: string; // ISO 8601
  start_date_local: string;
  start_latlng: [number, number] | null; // [lat, lng]
  end_latlng: [number, number] | null;
  average_speed: number; // m/s
  max_speed: number; // m/s
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  has_heartrate: boolean;
  elev_high?: number; // meters
  elev_low?: number; // meters
  map: {
    id: string;
    summary_polyline: string; // Encoded polyline
    polyline?: string;
  };
}

// Detailed Strava activity (from single activity endpoint)
export interface StravaActivity extends StravaActivitySummary {
  description?: string;
  calories?: number;
  device_name?: string;
  splits_metric?: StravaActivitySplit[];
  splits_standard?: StravaActivitySplit[];
  laps?: StravaLap[];
}

// Strava activity split
export interface StravaActivitySplit {
  distance: number; // meters
  elapsed_time: number; // seconds
  elevation_difference: number; // meters
  moving_time: number; // seconds
  split: number; // split number
  average_speed: number; // m/s
  average_heartrate?: number;
  pace_zone?: number;
}

// Strava lap data
export interface StravaLap {
  id: number;
  name: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
}

// Strava activity streams
export interface StravaStreams {
  time?: StravaStream;
  distance?: StravaStream;
  latlng?: StravaStream;
  altitude?: StravaStream;
  velocity_smooth?: StravaStream;
  heartrate?: StravaStream;
  cadence?: StravaStream;
  temp?: StravaStream;
  moving?: StravaStream;
  grade_smooth?: StravaStream;
}

export interface StravaStream {
  data: any[];
  series_type: string;
  original_size: number;
  resolution: string;
}

// Activity matching criteria
export interface ActivityMatchCriteria {
  plannedDistance: number; // miles
  startLat?: number;
  startLng?: number;
  elevationGain?: number; // meters
  activityType?: 'Run' | 'Trail Run' | 'Race';
  dateAfter?: number; // Unix timestamp
  dateBefore?: number; // Unix timestamp
  distanceTolerancePercent?: number; // default 10%
  startLocationRadiusMeters?: number; // default 500m
}

// Matched activity with score
export interface MatchedActivity {
  activity: StravaActivitySummary;
  matchScore: number; // 0-100
  matchDetails: {
    distanceScore: number; // 0-40
    locationScore: number; // 0-30
    elevationScore: number; // 0-20
    routeOverlapScore?: number; // 0-10
  };
  distanceDifferencePercent: number;
  startLocationDistanceMeters?: number;
}

// Rate limit status
export interface StravaRateLimitStatus {
  shortTerm: {
    limit: number; // 100 per 15 min
    usage: number;
    remaining: number;
  };
  daily: {
    limit: number; // 1000 per day
    usage: number;
    remaining: number;
  };
}

// Strava API error
export interface StravaError {
  message: string;
  errors?: Array<{
    resource: string;
    field: string;
    code: string;
  }>;
}

// Converted Strava activity to FIT format
export interface StravaToFITData extends ParsedFITData {
  stravaActivityId: number;
  stravaActivityName: string;
  source: 'strava';
}

// ============================================
// NUTRITION PRODUCTS TYPES
// ============================================

// User's custom nutrition products library
export interface UserNutritionProduct {
  id: string;
  name: string;
  carbsPerServing: number;       // grams
  sodiumPerServing: number;      // mg
  waterPerServing: number;       // ml
  caffeinePerServing?: number;   // mg of caffeine per serving
  servingSize: string;           // e.g., "bar", "scoop", "500ml"
  category?: string;             // Standard categories: "Gels", "Drinks", "Electrolytes", "Bars", "Real Food", "Other"
  brand?: string;                // Optional brand name
  notes?: string;                // Optional user notes
  excludeFromSmartFill?: boolean; // If true, exclude from Smart Nutrition suggestions
  createdAt: string;             // ISO timestamp
  updatedAt: string;
}

// Export/Import file format
export interface NutritionProductsExport {
  version: string;               // "1.0.0"
  exportedAt: string;            // ISO timestamp
  exportedBy?: string;           // Optional username
  products: UserNutritionProduct[];
  metadata?: {
    totalProducts: number;
    categories?: string[];
  };
}

// Community nutrition products collection (for Firebase)
export const CommunityNutritionProductsSchema = z.object({
  id: z.string(),
  userId: z.string(),
  displayName: z.string(),
  shareProfile: z.boolean(),

  title: z.string(),                 // e.g., "My Ultra Gel Collection"
  description: z.string().nullable().optional(),
  products: z.array(z.any()),        // Array of UserNutritionProduct

  productCount: z.number(),
  categories: z.array(z.string()),   // Unique categories in this collection

  reactions: z.object({
    thumbsUp: z.number(),
    love: z.number(),
  }),
  downloads: z.number(),
  views: z.number(),

  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CommunityNutritionProducts = z.infer<typeof CommunityNutritionProductsSchema>;

// Community nutrition products with reaction type
export interface CommunityNutritionProductsWithReaction extends CommunityNutritionProducts {
  userReaction?: 'thumbsUp' | 'love' | null;
}

// ============================================
// RECENTLY USED PRODUCTS TYPES
// ============================================

export interface RecentlyUsedProduct {
  productName: string;
  usageCount: number;
  lastUsedAt: string; // ISO timestamp
}

// ============================================
// AUTO-PACE DERIVATION TYPES
// ============================================

// HR Zone Types
export interface HRZone {
  min: number;
  max: number;
}

export interface HRZones {
  zone1: HRZone;  // Recovery (50-60% HRR)
  zone2: HRZone;  // Aerobic (60-70% HRR)
  zone3: HRZone;  // Tempo (70-80% HRR)
  zone4: HRZone;  // Threshold (80-90% HRR)
  zone5: HRZone;  // VO2max (90-100% HRR)
}

// Power Zone Types
export interface PowerZone {
  min: number;
  max: number;
  percentFTP: string;
}

export interface PowerZones {
  easy: PowerZone;         // 0-55% FTP
  moderate: PowerZone;     // 56-75% FTP
  tempo: PowerZone;        // 76-90% FTP
  threshold: PowerZone;    // 91-105% FTP
  vo2max: PowerZone;       // 106-120% FTP
}

// HR/Power zone suggestion for a segment
export interface HRZoneSuggestion {
  minBPM: number;
  maxBPM: number;
  zoneName: 'Zone 1' | 'Zone 2' | 'Zone 3' | 'Zone 4' | 'Zone 5';
  reasoning: string;
}

export interface PowerZoneSuggestion {
  minWatts: number;
  maxWatts: number;
  zoneName: 'Easy' | 'Moderate' | 'Tempo' | 'Threshold' | 'VO2max';
  percentageOfFTP: { min: number; max: number };
  reasoning: string;
}

// Athlete settings (for manual overrides)
export interface AthleteSettings {
  // HR Settings
  maxHR?: number;           // Override detected max
  restingHR?: number;       // Override detected min
  ltHR?: number;            // Lactate threshold HR if known

  // Power Settings
  ftp?: number;             // Functional threshold power (watts)
  criticalPower?: number;   // Critical power if known

  // Body Metrics (for energy balance calculations)
  bodyWeightKg?: number;    // Athlete body weight in kg
  gearWeightKg?: number;    // Gear/pack weight in kg
}

// Auto-pace settings for a race
export interface AutoPaceSettings {
  enabled: boolean;
  sourceType: 'fit_upload' | 'strava' | 'manual_baseline';
  fitFileKey?: string; // Key for FIT file stored in localStorage/Firebase
  stravaActivityId?: number;
  manualBasePace?: number; // min/mile
  lastCalculated?: string; // ISO timestamp
  config?: AutoPaceConfig; // Calculated configuration
  athleteSettings?: AthleteSettings; // Manual athlete overrides
}

// Auto-pace configuration from FIT analysis
export interface AutoPaceConfig {
  baselineFlat: number;           // min/mile on flat terrain
  elevationGainFactor: number;    // seconds per 100ft gain per mile
  elevationLossFactor: number;    // seconds per 100ft loss per mile
  fatigueFactor: number;          // % pace degradation per 10 miles
  heartRateThreshold: number;     // HR threshold
  hrZones?: HRZones;              // Calculated HR zones from FIT data
  powerZones?: PowerZones;        // Calculated power zones from FIT data (if available)
  hasPowerData?: boolean;         // Whether FIT file contains power data
}

// Auto-pace result for a segment
export interface SegmentAutoPace {
  derivedPaceMinPerMile: number;
  confidence: 'high' | 'medium' | 'low';
  basePace: number;
  elevationAdjustment: number;
  fatigueAdjustment: number;
  reasoning: string;
  suggestedHRZone?: HRZoneSuggestion;      // NEW: HR zone suggestion
  suggestedPowerZone?: PowerZoneSuggestion; // NEW: Power zone suggestion
}

// Multi-tier auto-pace selection types
export type AutoPaceTier = 'aggressive' | 'balanced' | 'conservative';

export interface AutoPaceOption {
  tier: AutoPaceTier;
  paceMinPerMile: number;
  confidence: 'high' | 'medium' | 'low';
  adjustmentPercent: number;
  description: string;
  bestFor: string;
  suggestedHRZone?: HRZoneSuggestion;      // NEW: HR zone for this tier
  suggestedPowerZone?: PowerZoneSuggestion; // NEW: Power zone for this tier
}

// ============================================
// ENERGY BALANCE TYPES
// ============================================

export interface EnergyBalanceCalculation {
  segmentCaloriesBurned: number;
  segmentCaloriesConsumed: number;
  segmentDeficit: number;           // Consumed - Burned (negative = deficit)
  cumulativeDeficit: number;
  estimatedGlycogenRemaining: number; // grams
  estimatedGlycogenPercent: number;   // 0-100%
  timeToBonk: number | null;          // minutes until glycogen depletion (null if fueling adequately)
  bonkRisk: 'none' | 'low' | 'moderate' | 'high' | 'critical';
  segmentWarnings: string[];         // Warnings specific to this segment
  generalTips: string[];             // General tips not tied to specific segment
}

export interface AthleteMetricsForEnergy {
  bodyWeightKg: number;
  gearWeightKg: number;
  fitnessLevel?: 'recreational' | 'trained' | 'elite';
}

// ============================================
// GI DISTRESS TYPES
// ============================================

export interface GIDistressAssessment {
  riskLevel: 'low' | 'moderate' | 'high' | 'very-high';
  riskScore: number;                  // 0-100
  riskFactors: string[];
  recommendations: string[];
  tolerancePercentage: number;        // % of max tolerable carb rate
}

export interface ProductIntolerance {
  id: string;
  productName: string;
  distanceMile: number;
  issueType: 'nausea' | 'cramping' | 'bloating' | 'other';
  severity: 1 | 2 | 3;                // 1=mild, 2=moderate, 3=severe
  notes?: string;
  raceId?: number;
  timestamp: string;                   // ISO timestamp
}

// ============================================
// CAFFEINE RECOMMENDATION TYPES
// ============================================

export interface CaffeineRecommendation {
  recommendedTotal: number;           // mg total for race
  recommendedPerDose: number;         // mg per intake
  dosesRecommended: number;
  timing: string[];
  warnings: string[];
}
