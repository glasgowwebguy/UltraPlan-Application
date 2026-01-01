import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Race, Segment, ElevationLabel, SupportCrewMember, NutritionItem } from '@/shared/types';
import { localStorageService } from '@/react-app/services/localStorage';
import { calculateSegmentETA, formatRaceStartTime } from '@/react-app/utils/etaCalculations';
import { formatDistance, formatPace as formatPaceWithUnit, getDistanceUnit } from '@/react-app/utils/unitConversions';
import { calculateSegmentElevation } from '@/react-app/utils/elevationCalculations';

// Helper to get current unit preference from localStorage
const getUnitPreference = (): boolean => {
  const stored = localStorage.getItem('unit_preference');
  return stored === null || stored === 'miles';
};

const formatTime = (minutes: number | null) => {
  if (!minutes) return '--:--';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const mins = Math.floor(remainingMinutes);
  const secs = Math.round((remainingMinutes - mins) * 60);

  if (hours > 0) {
    if (secs > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  }

  if (secs > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins} min`;
};


const formatNutrition = (segment: Segment): string => {
  // NEW FORMAT: Check for segment_nutrition_items first (carb tracking)
  if (segment.segment_nutrition_items) {
    try {
      const nutritionItems: NutritionItem[] = JSON.parse(segment.segment_nutrition_items);

      if (nutritionItems.length > 0) {
        const totalCarbs = nutritionItems.reduce(
          (sum, item) => sum + (item.carbsPerServing * item.quantity),
          0
        );
        const totalSodium = nutritionItems.reduce(
          (sum, item) => sum + ((item.sodiumPerServing || 0) * item.quantity),
          0
        );
        const totalWater = nutritionItems.reduce(
          (sum, item) => sum + ((item.waterPerServing || 0) * item.quantity),
          0
        );

        const parts: string[] = [];

        // Add summary with carbs, sodium, water
        parts.push(`Carbs: ${totalCarbs}g | Sodium: ${totalSodium}mg | Water: ${totalWater}ml`);

        // Add rates per hour if we have segment time
        const segmentTimeHours = segment.predicted_segment_time_minutes
          ? segment.predicted_segment_time_minutes / 60
          : 0;
        if (segmentTimeHours > 0) {
          const carbsPerHour = totalCarbs / segmentTimeHours;
          const sodiumPerHour = totalSodium / segmentTimeHours;
          const waterPerHour = totalWater / segmentTimeHours;
          const carbGoal = segment.carb_goal_per_hour || 60;
          const sodiumGoal = segment.sodium_goal_per_hour || 300;
          const waterGoal = segment.water_goal_per_hour || 500;
          parts.push(`Rates: ${Math.round(carbsPerHour)}g/hr (goal: ${carbGoal}) | ${Math.round(sodiumPerHour)}mg/hr (goal: ${sodiumGoal}) | ${Math.round(waterPerHour)}ml/hr (goal: ${waterGoal})`);
        }

        // Add item breakdown with all nutrition data
        const itemsList = nutritionItems.map(item => {
          const itemCarbs = item.carbsPerServing * item.quantity;
          const itemSodium = (item.sodiumPerServing || 0) * item.quantity;
          const itemWater = (item.waterPerServing || 0) * item.quantity;
          let itemStr = `${item.productName} x${item.quantity} (${itemCarbs}g, ${itemSodium}mg`;
          if (itemWater > 0) {
            itemStr += `, ${itemWater}ml`;
          }
          itemStr += ')';
          return itemStr;
        });
        parts.push(...itemsList);

        // Add legacy notes if they exist
        if (segment.nutrition_plan) {
          try {
            const legacyData = JSON.parse(segment.nutrition_plan);
            if (legacyData.notes) {
              parts.push(`Notes: ${legacyData.notes}`);
            }
            if (legacyData.supportCrewMeal) {
              parts.push(`Meal: ${legacyData.supportCrewMeal}`);
            }
          } catch {
            // Ignore if can't parse
          }
        }

        return parts.join('\n');
      }
    } catch (e) {
      console.error('Error parsing segment_nutrition_items:', e);
    }
  }

  // LEGACY FORMAT: Fall back to old nutrition_plan format
  if (segment.nutrition_plan) {
    try {
      const data = JSON.parse(segment.nutrition_plan);
      const parts: string[] = [];

      // Calculate target carbs and current carb intake if segment has timing info
      const segmentTimeHours = segment.predicted_segment_time_minutes
        ? segment.predicted_segment_time_minutes / 60
        : 0;
      const carbGoal = segment.carb_goal_per_hour || 60;
      const targetCarbs = carbGoal * segmentTimeHours;

      // Add Target Carbs and Current Carb Intake if we have timing info
      if (segmentTimeHours > 0) {
        parts.push(`Target Carbs: ${Math.round(targetCarbs)}g`);
        parts.push(`Current Carb Intake: ${carbGoal}g/hr`);
      }

      if (data.products && data.products.length > 0) {
        parts.push(data.products.join(', '));
      }

      if (data.notes) {
        parts.push(`Notes: ${data.notes}`);
      }

      if (data.supportCrewMeal) {
        parts.push(`Meal: ${data.supportCrewMeal}`);
      }

      return parts.length > 0 ? parts.join('\n') : '-';
    } catch {
      // If it's not JSON, return as is
      return segment.nutrition_plan;
    }
  }

  return '-';
};

const formatSupportCrew = (segment: Segment): string => {
  if (!segment.support_crew_present || !segment.support_crew_members) return '';

  try {
    const crewMembers: SupportCrewMember[] = JSON.parse(segment.support_crew_members);
    if (crewMembers.length === 0) return '';

    return crewMembers.map(member => `${member.name} (${member.phone})`).join('\n');
  } catch {
    return '';
  }
};

const formatCutoffTime = (cutoffTime: string | null | undefined): string => {
  if (!cutoffTime) return '-';

  // Format time from 24h to 12h format
  const [hours, minutes] = cutoffTime.split(':');
  const hour = parseInt(hours);
  const period = hour >= 12 ? 'pm' : 'am';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${period}`;
};

export function exportToJSON(race: Race, segments: Segment[], elevationLabels: ElevationLabel[]) {
  const useMiles = getUnitPreference();

  // Get GPX file content if it exists
  let gpxFileContent: string | undefined;
  if (race.gpx_file_key) {
    const gpxFile = localStorageService.getGPXFile(race.gpx_file_key);
    if (gpxFile) {
      gpxFileContent = gpxFile.content;
    }
  }

  const data = {
    race,
    segments,
    elevationLabels,
    gpxFileContent,
    unitPreference: useMiles ? 'miles' : 'kilometers',
    exportedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${race.name.replace(/\s+/g, '_')}_race_plan.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToCSV(race: Race, segments: Segment[]) {
  const useMiles = getUnitPreference();
  const unit = getDistanceUnit(useMiles);
  const paceUnit = useMiles ? 'min/mi' : 'min/km';

  // Load GPX content if available for elevation calculations
  let gpxContent: string | null = null;
  if (race.gpx_file_key) {
    const gpxFile = localStorageService.getGPXFile(race.gpx_file_key);
    if (gpxFile) {
      gpxContent = gpxFile.content;
    }
  }

  const headers = [
    'Checkpoint',
    `Segment Distance (${unit})`,
    `Cumulative Distance (${unit})`,
    `Pace (${paceUnit})`,
    'Predicted Time',
  ];

  // Add ETA column if race has start time
  if (race.start_date_time) {
    headers.push('ETA', 'Cut-off Time');
  } else {
    headers.push('Cut-off Time');
  }

  // Add elevation columns
  headers.push('Elevation Gain (ft)', 'Elevation Loss (ft)', 'Net Elevation (ft)');

  // Add nutrition columns (Carbs, Sodium, Water)
  headers.push('Carbs (g)', 'Carbs/hr', 'Sodium (mg)', 'Sodium/hr', 'Water (ml)', 'Water/hr');

  headers.push('Terrain', 'Nutrition Details', 'Notes', 'Map Reference');

  const rows = segments.map((seg, index) => {
    const row = [
      seg.checkpoint_name,
      formatDistance(seg.segment_distance_miles, useMiles, 2).replace(` ${unit}`, ''), // Remove unit suffix
      formatDistance(seg.cumulative_distance_miles, useMiles, 2).replace(` ${unit}`, ''), // Remove unit suffix
      seg.custom_pace_min_per_mile ? formatPaceWithUnit(seg.custom_pace_min_per_mile, useMiles).replace(paceUnit, '') : 'No pace',
      formatTime(seg.predicted_segment_time_minutes ?? null),
    ];

    // Add ETA if race has start time
    if (race.start_date_time) {
      const eta = calculateSegmentETA(
        race.start_date_time,
        segments,
        index
      );
      row.push(eta ? `${eta.formattedTime} (${eta.isDaylight ? 'Day' : 'Night'})` : '-');
    }

    // Add cut-off time
    row.push(formatCutoffTime(seg.cutoff_time));

    // Add elevation data
    if (gpxContent) {
      const startDistance = index === 0 ? 0 : segments[index - 1].cumulative_distance_miles;
      const endDistance = seg.cumulative_distance_miles;
      const elevationStats = calculateSegmentElevation(gpxContent, startDistance, endDistance);

      if (elevationStats) {
        // Always show in feet for CSV
        const gainFeet = Math.round(elevationStats.gain * 3.28084);
        const lossFeet = Math.round(elevationStats.loss * 3.28084);
        const netFeet = Math.round(elevationStats.netElevation * 3.28084);
        row.push(gainFeet.toString(), lossFeet.toString(), netFeet.toString());
      } else {
        row.push('-', '-', '-');
      }
    } else {
      row.push('-', '-', '-');
    }

    // Add nutrition columns (Carbs, Sodium, Water totals and rates)
    const segmentTimeHours = seg.predicted_segment_time_minutes
      ? seg.predicted_segment_time_minutes / 60
      : 0;

    if (seg.segment_nutrition_items) {
      try {
        const nutritionItems: NutritionItem[] = JSON.parse(seg.segment_nutrition_items);
        const totalCarbs = nutritionItems.reduce((sum, item) => sum + (item.carbsPerServing * item.quantity), 0);
        const totalSodium = nutritionItems.reduce((sum, item) => sum + ((item.sodiumPerServing || 0) * item.quantity), 0);
        const totalWater = nutritionItems.reduce((sum, item) => sum + ((item.waterPerServing || 0) * item.quantity), 0);

        row.push(
          totalCarbs.toString(),
          segmentTimeHours > 0 ? Math.round(totalCarbs / segmentTimeHours).toString() : '-',
          totalSodium.toString(),
          segmentTimeHours > 0 ? Math.round(totalSodium / segmentTimeHours).toString() : '-',
          totalWater.toString(),
          segmentTimeHours > 0 ? Math.round(totalWater / segmentTimeHours).toString() : '-'
        );
      } catch {
        row.push('-', '-', '-', '-', '-', '-');
      }
    } else {
      row.push('-', '-', '-', '-', '-', '-');
    }

    row.push(seg.terrain_description || '', formatNutrition(seg), seg.notes || '', seg.map_reference || '');
    return row;
  });

  const totalTime = segments.reduce((sum, seg) => sum + (seg.predicted_segment_time_minutes ?? 0), 0);
  const totalRow = [
    'TOTAL',
    formatDistance(race.distance_miles, useMiles, 2).replace(` ${unit}`, ''), // Remove unit suffix
    '',
    '',
    formatTime(totalTime),
  ];

  if (race.start_date_time) {
    totalRow.push(''); // Empty ETA cell for total row
  }

  totalRow.push(''); // Empty cut-off time cell for total row
  totalRow.push('', '', ''); // Empty elevation cells for total row
  totalRow.push('', '', '', '', '', ''); // Empty nutrition cells for total row (Carbs, Carbs/hr, Sodium, Sodium/hr, Water, Water/hr)
  totalRow.push('', '', '', ''); // Terrain, Nutrition Details, Notes, Map Reference
  rows.push(totalRow);

  const csvHeader = [
    `Race: ${race.name}`,
  ];

  // Add race start time if set
  if (race.start_date_time) {
    csvHeader.push(`Start Time: ${formatRaceStartTime(race.start_date_time, race.timezone)}`);
  }

  let csvContent = [
    ...csvHeader,
    '',
  ];

  // Add Mandatory Kit section
  if (race.mandatory_kit) {
    try {
      const kitItems: string[] = JSON.parse(race.mandatory_kit);

      if (kitItems.length > 0) {
        csvContent.push('MANDATORY KIT CHECKLIST');
        csvContent.push('Check,Item');

        kitItems.forEach((item, index) => {
          csvContent.push(`"☐","${index + 1}. ${item.replace(/"/g, '""')}"`);
        });

        csvContent.push('');
      }
    } catch (error) {
      console.error('Failed to parse mandatory kit:', error);
    }
  }

  csvContent = csvContent.concat([
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ]);

  const csvContentStr = csvContent.join('\n');

  const blob = new Blob([csvContentStr], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${race.name.replace(/\s+/g, '_')}_race_plan.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportToPDF(race: Race, segments: Segment[], elevationLabels: ElevationLabel[]) {
  const useMiles = getUnitPreference();

  // Load GPX content if available for elevation calculations
  let gpxContent: string | null = null;
  if (race.gpx_file_key) {
    const gpxFile = localStorageService.getGPXFile(race.gpx_file_key);
    if (gpxFile) {
      gpxContent = gpxFile.content;
    }
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margins = { left: 14, right: 14, top: 20, bottom: 25 };
  const contentWidth = pageWidth - margins.left - margins.right;

  // Brand colors
  const colors = {
    primary: { r: 59, g: 130, b: 246 },      // Blue
    secondary: { r: 139, g: 92, b: 246 },    // Purple
    accent: { r: 16, g: 185, b: 129 },       // Green
    warning: { r: 245, g: 158, b: 11 },      // Orange
    danger: { r: 239, g: 68, b: 68 },        // Red
    dark: { r: 30, g: 41, b: 59 },           // Slate dark
    gray: { r: 100, g: 116, b: 139 },        // Slate gray
    lightGray: { r: 241, g: 245, b: 249 },   // Light background
  };

  // Helper to add page number footer
  const addFooter = (pageNum: number, totalPages?: number) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.gray.r, colors.gray.g, colors.gray.b);

    // Left side: UltraPlan branding
    doc.text('ultraplan.run', margins.left, pageHeight - 10);

    // Right side: Page number
    const pageText = totalPages ? `Page ${pageNum} of ${totalPages}` : `Page ${pageNum}`;
    doc.text(pageText, pageWidth - margins.right, pageHeight - 10, { align: 'right' });

    // Center: Generated timestamp
    doc.setFontSize(7);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    doc.setTextColor(0, 0, 0);
  };

  // Helper to check if we need a new page
  const checkPageBreak = (requiredSpace: number, currentY: number): number => {
    if (currentY + requiredSpace > pageHeight - margins.bottom) {
      doc.addPage();
      return margins.top;
    }
    return currentY;
  };

  // Helper to draw a rounded rectangle (simulated with regular rect for jsPDF compatibility)
  const drawCard = (x: number, y: number, width: number, height: number, fillColor?: { r: number; g: number; b: number }) => {
    if (fillColor) {
      doc.setFillColor(fillColor.r, fillColor.g, fillColor.b);
      doc.rect(x, y, width, height, 'F');
    }
    doc.setDrawColor(220, 220, 220);
    doc.rect(x, y, width, height, 'S');
  };

  let currentY = margins.top;

  // ========================================
  // HEADER SECTION - Premium gradient-style banner
  // ========================================
  const headerHeight = 35;

  // Draw gradient-like header (darker to lighter blue)
  doc.setFillColor(colors.dark.r, colors.dark.g, colors.dark.b);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  // Add subtle accent stripe
  doc.setFillColor(colors.primary.r, colors.primary.g, colors.primary.b);
  doc.rect(0, headerHeight - 3, pageWidth, 3, 'F');

  // Race name in white
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  const raceName = race.name.length > 40 ? race.name.substring(0, 37) + '...' : race.name;
  doc.text(raceName, margins.left, 18);

  // Subtitle with "Race Plan" and UltraPlan branding
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 180);
  doc.text('Race Plan by UltraPlan', margins.left, 27);

  doc.setTextColor(0, 0, 0);
  currentY = headerHeight + 15;

  // ========================================
  // RACE OVERVIEW SECTION - Styled stat boxes
  // ========================================
  const totalTime = segments.reduce((sum, seg) => sum + (seg.predicted_segment_time_minutes ?? 0), 0);

  // Draw overview container
  const overviewHeight = 40;
  drawCard(margins.left, currentY, contentWidth, overviewHeight, colors.lightGray);

  // Calculate box positions for 3 or 4 stat boxes
  const hasStartTime = !!race.start_date_time;
  const boxCount = hasStartTime ? 4 : 3;
  const boxWidth = (contentWidth - 20) / boxCount;
  const boxStartX = margins.left + 5;
  const boxY = currentY + 5;
  const boxHeight = overviewHeight - 10;

  // Stat box 1: Distance
  doc.setFillColor(255, 255, 255);
  doc.rect(boxStartX, boxY, boxWidth - 5, boxHeight, 'F');
  doc.setFontSize(8);
  doc.setTextColor(colors.gray.r, colors.gray.g, colors.gray.b);
  doc.text('DISTANCE', boxStartX + 5, boxY + 8);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);
  doc.text(formatDistance(race.distance_miles, useMiles), boxStartX + 5, boxY + 20);

  // Stat box 2: Predicted Time
  const box2X = boxStartX + boxWidth;
  doc.setFillColor(255, 255, 255);
  doc.rect(box2X, boxY, boxWidth - 5, boxHeight, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.gray.r, colors.gray.g, colors.gray.b);
  doc.text('PREDICTED TIME', box2X + 5, boxY + 8);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);
  doc.text(formatTime(totalTime), box2X + 5, boxY + 20);

  // Stat box 3: Checkpoints
  const box3X = boxStartX + boxWidth * 2;
  doc.setFillColor(255, 255, 255);
  doc.rect(box3X, boxY, boxWidth - 5, boxHeight, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.gray.r, colors.gray.g, colors.gray.b);
  doc.text('CHECKPOINTS', box3X + 5, boxY + 8);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);
  doc.text(segments.length.toString(), box3X + 5, boxY + 20);

  // Stat box 4: Start Time (if available)
  if (hasStartTime) {
    const box4X = boxStartX + boxWidth * 3;
    doc.setFillColor(255, 255, 255);
    doc.rect(box4X, boxY, boxWidth - 5, boxHeight, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.gray.r, colors.gray.g, colors.gray.b);
    doc.text('START TIME', box4X + 5, boxY + 8);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);
    const startTimeStr = formatRaceStartTime(race.start_date_time!, race.timezone);
    const truncatedStart = startTimeStr.length > 18 ? startTimeStr.substring(0, 15) + '...' : startTimeStr;
    doc.text(truncatedStart, box4X + 5, boxY + 20);
  }

  currentY += overviewHeight + 15;

  // ========================================
  // EMERGENCY CONTACT (if present)
  // ========================================
  if (race.emergency_contact_name || race.emergency_contact_phone) {
    currentY = checkPageBreak(25, currentY);

    const emergencyHeight = 20;
    doc.setFillColor(254, 242, 242); // Light red background
    doc.rect(margins.left, currentY, contentWidth, emergencyHeight, 'F');
    doc.setDrawColor(colors.danger.r, colors.danger.g, colors.danger.b);
    doc.rect(margins.left, currentY, contentWidth, emergencyHeight, 'S');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.danger.r, colors.danger.g, colors.danger.b);
    doc.text('⚠ EMERGENCY CONTACT', margins.left + 5, currentY + 8);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const contactInfo = [race.emergency_contact_name, race.emergency_contact_phone].filter(Boolean).join(' — ');
    doc.text(contactInfo, margins.left + 5, currentY + 16);

    currentY += emergencyHeight + 10;
  }

  // ========================================
  // MANDATORY KIT CHECKLIST
  // ========================================
  if (race.mandatory_kit) {
    try {
      const kitItems: string[] = JSON.parse(race.mandatory_kit);

      if (kitItems.length > 0) {
        // Calculate height needed
        const itemHeight = 6;
        const itemsPerColumn = Math.ceil(kitItems.length / 2);
        const sectionHeight = Math.max(30, itemsPerColumn * itemHeight + 25);

        currentY = checkPageBreak(sectionHeight, currentY);

        // Section header with colored bar
        doc.setFillColor(colors.primary.r, colors.primary.g, colors.primary.b);
        doc.rect(margins.left, currentY, 4, 20, 'F');

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(colors.dark.r, colors.dark.g, colors.dark.b);
        doc.text('Mandatory Kit Checklist', margins.left + 8, currentY + 7);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(colors.gray.r, colors.gray.g, colors.gray.b);
        doc.text('Check off each item as you pack for race day', margins.left + 8, currentY + 15);

        currentY += 22;

        // Two-column layout for items
        const columnWidth = (contentWidth - 10) / 2;
        let leftColumnY = currentY;
        let rightColumnY = currentY;

        kitItems.forEach((item, index) => {
          const isLeftColumn = index < itemsPerColumn;
          const columnX = isLeftColumn ? margins.left : margins.left + columnWidth + 10;
          const itemY = isLeftColumn ? leftColumnY : rightColumnY;

          // Check for page break
          if (itemY > pageHeight - margins.bottom - 10) {
            doc.addPage();
            leftColumnY = margins.top;
            rightColumnY = margins.top;
          }

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);

          // Draw checkbox
          doc.setDrawColor(colors.gray.r, colors.gray.g, colors.gray.b);
          doc.rect(columnX, itemY - 3, 4, 4, 'S');

          // Draw item text (truncate if too long)
          const maxItemWidth = columnWidth - 15;
          let itemText = item;
          while (doc.getTextWidth(itemText) > maxItemWidth && itemText.length > 10) {
            itemText = itemText.substring(0, itemText.length - 4) + '...';
          }
          doc.text(itemText, columnX + 7, itemY);

          if (isLeftColumn) {
            leftColumnY += itemHeight;
          } else {
            rightColumnY += itemHeight;
          }
        });

        currentY = Math.max(leftColumnY, rightColumnY) + 10;
      }
    } catch (error) {
      console.error('Failed to parse mandatory kit:', error);
    }
  }

  // ========================================
  // ELEVATION PROFILE
  // ========================================
  const chartElement = document.querySelector('.print-chart') as HTMLElement;
  if (chartElement) {
    try {
      const styleElement = document.createElement('style');
      styleElement.id = 'print-chart-styles';
      styleElement.textContent = `
        .print-chart { background-color: white !important; }
        .print-chart .recharts-cartesian-grid-horizontal line,
        .print-chart .recharts-cartesian-grid-vertical line {
          stroke: #d1d5db !important;
        }
        .print-chart .recharts-cartesian-axis-line {
          stroke: #000000 !important;
        }
        .print-chart .recharts-cartesian-axis-tick-line {
          stroke: #000000 !important;
        }
        .print-chart .recharts-text {
          fill: #000000 !important;
        }
        .print-chart .recharts-area-area {
          fill: none !important;
        }
        .print-chart .recharts-area-curve {
          stroke: #3b82f6 !important;
          stroke-width: 2px !important;
        }
      `;
      document.head.appendChild(styleElement);

      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2,
      });

      const tempStyle = document.getElementById('print-chart-styles');
      if (tempStyle) {
        tempStyle.remove();
      }

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Check if we need a new page
      currentY = checkPageBreak(imgHeight + 25, currentY);

      // Section header
      doc.setFillColor(colors.accent.r, colors.accent.g, colors.accent.b);
      doc.rect(margins.left, currentY, 4, 15, 'F');

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(colors.dark.r, colors.dark.g, colors.dark.b);
      doc.text('Elevation Profile', margins.left + 8, currentY + 10);
      currentY += 18;

      doc.addImage(imgData, 'PNG', margins.left, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 15;
    } catch (error) {
      console.error('Failed to capture elevation chart:', error);
    }
  }

  // ========================================
  // CHECKPOINT CARDS - Main Section
  // ========================================
  currentY = checkPageBreak(40, currentY);

  // Section header
  doc.setFillColor(colors.secondary.r, colors.secondary.g, colors.secondary.b);
  doc.rect(margins.left, currentY, 4, 15, 'F');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.dark.r, colors.dark.g, colors.dark.b);
  doc.text('Checkpoints & Segments', margins.left + 8, currentY + 10);
  currentY += 20;

  // Create checkpoint cards
  segments.forEach((seg, idx) => {
    // Calculate card height based on content
    const hasNutrition = seg.segment_nutrition_items || seg.nutrition_plan;
    const hasNotes = seg.notes && seg.notes.trim().length > 0;
    const hasSupportCrew = seg.support_crew_present && seg.support_crew_members;

    // Calculate nutrition section height if needed
    let nutritionHeight = 0;
    if (hasNutrition && seg.segment_nutrition_items) {
      try {
        const nutritionItems: NutritionItem[] = JSON.parse(seg.segment_nutrition_items);
        const productNames = nutritionItems.map(item => `${item.productName} x${item.quantity}`).join(', ');
        // Estimate lines needed for product names (roughly 160 chars per line at font size 7)
        const estimatedLines = Math.ceil(productNames.length / 160);
        nutritionHeight = 20 + (estimatedLines * 5); // Base + lines
      } catch {
        nutritionHeight = 25;
      }
    } else if (hasNutrition) {
      nutritionHeight = 25;
    }

    let cardHeight = 45; // Base height for main info
    if (hasNutrition) cardHeight += nutritionHeight;
    if (hasNotes) cardHeight += 15;
    if (hasSupportCrew) cardHeight += 15;

    // Check for page break BEFORE drawing the card
    currentY = checkPageBreak(cardHeight + 5, currentY);

    // Draw card background
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(220, 220, 220);
    doc.rect(margins.left, currentY, contentWidth, cardHeight, 'FD');

    // Checkpoint number badge
    doc.setFillColor(colors.primary.r, colors.primary.g, colors.primary.b);
    doc.rect(margins.left, currentY, 20, 18, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text((idx + 1).toString(), margins.left + 10, currentY + 12, { align: 'center' });

    // Checkpoint name
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.dark.r, colors.dark.g, colors.dark.b);
    const checkpointName = seg.checkpoint_name.length > 35 ? seg.checkpoint_name.substring(0, 32) + '...' : seg.checkpoint_name;
    doc.text(checkpointName, margins.left + 25, currentY + 10);

    // Plus code / Map reference on same line if present
    if (seg.plusCode || seg.map_reference) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(colors.gray.r, colors.gray.g, colors.gray.b);
      const refText = [seg.plusCode, seg.map_reference ? `Map: ${seg.map_reference}` : ''].filter(Boolean).join(' | ');
      doc.text(refText, margins.left + 25, currentY + 16);
    }

    // Stats row - positioned below the header
    const statsY = currentY + 25;
    const statWidth = contentWidth / 6;

    // Segment Distance
    doc.setFontSize(7);
    doc.setTextColor(colors.gray.r, colors.gray.g, colors.gray.b);
    doc.text('SEGMENT', margins.left + 5, statsY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(formatDistance(seg.segment_distance_miles, useMiles, 1), margins.left + 5, statsY + 7);

    // Cumulative Distance
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.gray.r, colors.gray.g, colors.gray.b);
    doc.text('CUMULATIVE', margins.left + 5 + statWidth, statsY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(formatDistance(seg.cumulative_distance_miles, useMiles, 1), margins.left + 5 + statWidth, statsY + 7);

    // Pace
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.gray.r, colors.gray.g, colors.gray.b);
    doc.text('PACE', margins.left + 5 + statWidth * 2, statsY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    const paceText = seg.custom_pace_min_per_mile ? formatPaceWithUnit(seg.custom_pace_min_per_mile, useMiles) : '--';
    doc.text(paceText, margins.left + 5 + statWidth * 2, statsY + 7);

    // Time
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.gray.r, colors.gray.g, colors.gray.b);
    doc.text('TIME', margins.left + 5 + statWidth * 3, statsY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(formatTime(seg.predicted_segment_time_minutes ?? null), margins.left + 5 + statWidth * 3, statsY + 7);

    // ETA (if race has start time)
    if (race.start_date_time) {
      const eta = calculateSegmentETA(race.start_date_time, segments, idx);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(colors.gray.r, colors.gray.g, colors.gray.b);
      doc.text('ETA', margins.left + 5 + statWidth * 4, statsY);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      if (eta) {
        doc.setTextColor(eta.isDaylight ? colors.accent.r : colors.secondary.r, eta.isDaylight ? colors.accent.g : colors.secondary.g, eta.isDaylight ? colors.accent.b : colors.secondary.b);
        doc.text(eta.formattedTime, margins.left + 5 + statWidth * 4, statsY + 7);
      } else {
        doc.setTextColor(0, 0, 0);
        doc.text('--', margins.left + 5 + statWidth * 4, statsY + 7);
      }
    }

    // Cut-off (if present)
    if (seg.cutoff_time) {
      const cutoffX = race.start_date_time ? margins.left + 5 + statWidth * 5 : margins.left + 5 + statWidth * 4;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(colors.gray.r, colors.gray.g, colors.gray.b);
      doc.text('CUT-OFF', cutoffX, statsY);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(colors.danger.r, colors.danger.g, colors.danger.b);
      doc.text(formatCutoffTime(seg.cutoff_time), cutoffX, statsY + 7);
    }

    // Elevation data (if GPX available)
    if (gpxContent) {
      const startDistance = idx === 0 ? 0 : segments[idx - 1].cumulative_distance_miles;
      const endDistance = seg.cumulative_distance_miles;
      const elevationStats = calculateSegmentElevation(gpxContent, startDistance, endDistance);

      if (elevationStats) {
        const elevY = statsY + 15;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colors.gray.r, colors.gray.g, colors.gray.b);

        const gainFeet = Math.round(elevationStats.gain * 3.28084);
        const lossFeet = Math.round(elevationStats.loss * 3.28084);

        doc.setTextColor(colors.accent.r, colors.accent.g, colors.accent.b);
        doc.text(`↑${gainFeet}ft`, margins.left + 5, elevY);

        doc.setTextColor(colors.danger.r, colors.danger.g, colors.danger.b);
        doc.text(`↓${lossFeet}ft`, margins.left + 35, elevY);

        // Terrain description
        if (seg.terrain_description) {
          doc.setTextColor(colors.gray.r, colors.gray.g, colors.gray.b);
          doc.text(`Terrain: ${seg.terrain_description}`, margins.left + 70, elevY);
        }
      }
    }

    let detailsY = statsY + 18;

    // Nutrition section (if present)
    if (hasNutrition) {
      detailsY += 5;
      doc.setFillColor(240, 253, 244); // Light green
      doc.rect(margins.left + 3, detailsY - 3, contentWidth - 6, nutritionHeight - 2, 'F');

      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(colors.accent.r, colors.accent.g, colors.accent.b);
      doc.text('NUTRITION', margins.left + 6, detailsY + 3);

      // Parse nutrition data
      if (seg.segment_nutrition_items) {
        try {
          const nutritionItems: NutritionItem[] = JSON.parse(seg.segment_nutrition_items);
          const totalCarbs = Math.round(nutritionItems.reduce((sum, item) => sum + (item.carbsPerServing * item.quantity), 0));
          const totalSodium = Math.round(nutritionItems.reduce((sum, item) => sum + ((item.sodiumPerServing || 0) * item.quantity), 0));
          const totalWater = Math.round(nutritionItems.reduce((sum, item) => sum + ((item.waterPerServing || 0) * item.quantity), 0));

          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          doc.text(`${totalCarbs}g carbs | ${totalSodium}mg sodium | ${totalWater}ml water`, margins.left + 6, detailsY + 11);

          // Product names - wrap across multiple lines
          const productNames = nutritionItems.map(item => `${item.productName} x${item.quantity}`).join(', ');
          doc.setFontSize(7);
          doc.setTextColor(colors.gray.r, colors.gray.g, colors.gray.b);
          const productLines = doc.splitTextToSize(productNames, contentWidth - 15);
          doc.text(productLines, margins.left + 6, detailsY + 17);
        } catch {
          // Silent fail
        }
      }

      // Adjust detailsY based on nutrition section height
      detailsY += nutritionHeight;
    }

    // Notes (if present)
    if (hasNotes) {
      detailsY += 3;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(colors.warning.r, colors.warning.g, colors.warning.b);
      doc.text('NOTES', margins.left + 6, detailsY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const truncatedNotes = seg.notes!.length > 100 ? seg.notes!.substring(0, 97) + '...' : seg.notes!;
      doc.text(truncatedNotes, margins.left + 25, detailsY);

      detailsY += 10;
    }

    // Support Crew (if present)
    if (hasSupportCrew) {
      detailsY += 3;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(colors.secondary.r, colors.secondary.g, colors.secondary.b);
      doc.text('CREW', margins.left + 6, detailsY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(formatSupportCrew(seg), margins.left + 25, detailsY);
    }

    currentY += cardHeight + 5;
  });

  // ========================================
  // ELEVATION LABELS (if present)
  // ========================================
  if (elevationLabels.length > 0) {
    currentY = checkPageBreak(30 + elevationLabels.length * 6, currentY);

    doc.setFillColor(colors.accent.r, colors.accent.g, colors.accent.b);
    doc.rect(margins.left, currentY, 4, 15, 'F');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.dark.r, colors.dark.g, colors.dark.b);
    doc.text('Elevation Labels', margins.left + 8, currentY + 10);
    currentY += 18;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    elevationLabels.forEach((label) => {
      doc.text(`• ${formatDistance(label.distance_miles, useMiles, 2)}: ${label.label}`, margins.left + 5, currentY);
      currentY += 6;
    });
  }

  // ========================================
  // ADD FOOTERS TO ALL PAGES
  // ========================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  doc.save(`${race.name.replace(/\s+/g, '_')}_race_plan.pdf`);
}
