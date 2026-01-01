import React from 'react';
import { Watch, Battery, MapPin } from 'lucide-react';
import type { ParsedFITData, GPSDeviceInfo, ExtendedParsedFITData } from '../../shared/types';

interface GPSDeviceDisplayProps {
  fitData: ParsedFITData | ExtendedParsedFITData;
}

/**
 * Map Garmin product IDs to model names
 * Source: Garmin FIT SDK documentation
 */
const GARMIN_PRODUCT_MAP: Record<number, string> = {
  // Fenix Series
  3589: 'Fenix 7X',
  3590: 'Fenix 7S',
  3591: 'Fenix 7',
  4024: 'Fenix 7X Pro',
  4025: 'Fenix 7S Pro',
  4026: 'Fenix 7 Pro',
  2697: 'Fenix 6X Pro',
  2998: 'Fenix 6 Pro',
  3003: 'Fenix 6S Pro',
  2859: 'Fenix 6 Solar',
  3122: 'Fenix 6X Pro Solar',
  2604: 'Fenix 5X Plus',
  2703: 'Fenix 5 Plus',
  2733: 'Fenix 5S Plus',
  1967: 'Fenix 5X',
  2050: 'Fenix 5',
  2051: 'Fenix 5S',

  // Forerunner Series
  3729: 'Forerunner 955',
  3730: 'Forerunner 955 Solar',
  3558: 'Forerunner 265',
  3559: 'Forerunner 265S',
  3786: 'Forerunner 165',
  3837: 'Forerunner 165 Music',
  3441: 'Forerunner 255',
  3442: 'Forerunner 255S',
  3443: 'Forerunner 255 Music',
  3289: 'Forerunner 945 LTE',
  2691: 'Forerunner 945',
  2713: 'Forerunner 745',
  2769: 'Forerunner 55',
  2888: 'Forerunner 245',
  2886: 'Forerunner 245 Music',
  2606: 'Forerunner 935',
  2431: 'Forerunner 735XT',
  2147: 'Forerunner 645',
  2438: 'Forerunner 645 Music',
  1551: 'Forerunner 235',
  1632: 'Forerunner 630',
  1561: 'Forerunner 230',

  // MARQ Series
  3406: 'MARQ Athlete',
  3407: 'MARQ Adventurer',
  3408: 'MARQ Captain',
  3409: 'MARQ Commander',
  3410: 'MARQ Aviator',
  3739: 'MARQ Athlete Gen 2',
  3740: 'MARQ Adventurer Gen 2',
  3741: 'MARQ Captain Gen 2',
  3742: 'MARQ Commander Gen 2',
  3743: 'MARQ Aviator Gen 2',

  // Enduro Series
  3215: 'Enduro',
  3791: 'Enduro 2',
  4268: 'Enduro 3',
  4575: 'Enduro 3',

  // Epix Series
  3624: 'Epix Gen 2',
  3702: 'Epix Pro 42mm',
  3703: 'Epix Pro 47mm',
  3704: 'Epix Pro 51mm',

  // Instinct Series
  3222: 'Instinct 2',
  3223: 'Instinct 2 Solar',
  3224: 'Instinct 2S',
  3225: 'Instinct 2X Solar',
  3226: 'Instinct Crossover',
  4289: 'Instinct 3',

  // Edge Series (Cycling)
  3869: 'Edge 1040',
  3870: 'Edge 1040 Solar',
  3678: 'Edge 1030 Plus',
  3112: 'Edge 530',
  2738: 'Edge 830',
  4033: 'Edge 540',
  4034: 'Edge 840',
  2067: 'Edge 1030',
  2530: 'Edge 520 Plus',
  2909: 'Edge 130 Plus',

  // Vivoactive Series
  3794: 'Vivoactive 5',
  3793: 'Vivoactive 4S',
  3769: 'Vivoactive 4',
  2700: 'Vivoactive 3 Music',
  2368: 'Vivoactive 3',

  // Venu Series
  3446: 'Venu 2 Plus',
  3568: 'Venu 3',
  3569: 'Venu 3S',
  3287: 'Venu 2',
  3288: 'Venu 2S',
  3111: 'Venu Sq',
  3110: 'Venu Sq Music',

  // Tactix Series
  3501: 'Tactix 7',
  3705: 'Tactix 7 Pro',

  // Quatix Series
  3598: 'Quatix 7',
  3824: 'Quatix 7 Pro',

  // Approach (Golf) Series
  3806: 'Approach S70',
  3722: 'Approach S62',
  2788: 'Approach S60',

  // Lily Series
  3803: 'Lily 2',
  3563: 'Lily',

  // Descent (Diving) Series
  3331: 'Descent Mk2',
  3333: 'Descent Mk2i',
  4154: 'Descent Mk3',
};

/**
 * Get manufacturer name from manufacturer ID
 */
function getManufacturerName(manufacturerId: string | number | undefined): string {
  if (!manufacturerId) return 'Unknown';
  const id = typeof manufacturerId === 'string' ? parseInt(manufacturerId) : manufacturerId;

  // Common manufacturer IDs from FIT SDK
  const manufacturers: Record<number, string> = {
    1: 'Garmin',
    2: 'Garmin FR405 ANTFS',
    15: 'Suunto',
    89: 'Wahoo',
    265: 'Polar',
    267: 'COROS',
  };

  return manufacturers[id] || 'Unknown';
}

/**
 * Extract device information from FIT file data
 */
function extractDeviceInfo(fitData: ParsedFITData | ExtendedParsedFITData): GPSDeviceInfo {
  const extendedData = fitData as ExtendedParsedFITData;

  // Get manufacturer name
  const manufacturer = getManufacturerName(extendedData.deviceManufacturer);

  // Debug logging
  console.log('[GPSDeviceDisplay] Extracting device info:', {
    deviceManufacturer: extendedData.deviceManufacturer,
    deviceProduct: extendedData.deviceProduct,
    deviceProductId: extendedData.deviceProductId,
    deviceModel: extendedData.deviceModel,
    manufacturer,
  });

  // Get model name from product ID mapping
  let model = 'GPS Watch';

  // Try to get product ID from various sources
  let productId: number | undefined;

  if (extendedData.deviceProductId !== undefined && extendedData.deviceProductId !== null) {
    productId = typeof extendedData.deviceProductId === 'string'
      ? parseInt(extendedData.deviceProductId)
      : extendedData.deviceProductId;

    // Check if parsing failed
    if (isNaN(productId)) {
      console.warn('[GPSDeviceDisplay] Failed to parse deviceProductId:', extendedData.deviceProductId);
      productId = undefined;
    }
  }

  // Try deviceProduct as a fallback for product ID
  if (!productId && extendedData.deviceProduct !== undefined && extendedData.deviceProduct !== null) {
    const deviceProductNum = typeof extendedData.deviceProduct === 'string'
      ? parseInt(extendedData.deviceProduct)
      : extendedData.deviceProduct;

    if (!isNaN(deviceProductNum)) {
      productId = deviceProductNum;
    }
  }

  console.log('[GPSDeviceDisplay] Product ID resolved to:', productId);

  // Look up model name in the product map
  if (productId !== undefined && GARMIN_PRODUCT_MAP[productId]) {
    model = GARMIN_PRODUCT_MAP[productId];
    console.log('[GPSDeviceDisplay] Found model in map:', model);
  } else if (extendedData.deviceModel) {
    // Use deviceModel if available (this often contains the actual product name)
    model = extendedData.deviceModel;
    console.log('[GPSDeviceDisplay] Using deviceModel:', model);
  } else if (extendedData.deviceProduct && typeof extendedData.deviceProduct === 'string') {
    // Use deviceProduct string if it's not a number
    model = extendedData.deviceProduct;
    console.log('[GPSDeviceDisplay] Using deviceProduct string:', model);
  } else if (productId !== undefined) {
    // Product ID exists but not in our map - show it for debugging
    model = `GPS Watch (ID: ${productId})`;
    console.warn('[GPSDeviceDisplay] Unknown product ID:', productId, '- Please report this ID');
  } else {
    console.warn('[GPSDeviceDisplay] Could not determine device model, using default:', model);
  }

  // Determine final manufacturer and model display
  // If model already includes manufacturer name, don't prepend it again
  let displayManufacturer = manufacturer;
  let displayModel = model;

  // Check if model name already includes the manufacturer
  const modelLower = model.toLowerCase();
  const mfgLower = manufacturer.toLowerCase();

  if (modelLower.startsWith(mfgLower + ' ') || modelLower === mfgLower) {
    // Model already includes manufacturer, so just use the model
    displayManufacturer = '';
    displayModel = model;
  } else if (manufacturer === 'Unknown' && (
    modelLower.includes('garmin') ||
    modelLower.includes('suunto') ||
    modelLower.includes('coros') ||
    modelLower.includes('polar')
  )) {
    // Manufacturer is Unknown but model contains a known brand name
    // Just use the model as-is
    displayManufacturer = '';
    displayModel = model;
  } else if (manufacturer === 'Unknown' && productId !== undefined && GARMIN_PRODUCT_MAP[productId]) {
    // If we found the model in the Garmin product map, it's definitely a Garmin
    displayManufacturer = 'Garmin';
    displayModel = model;
  }

  return {
    manufacturer: displayManufacturer,
    product: extendedData.deviceProduct?.toString() || 'Unknown',
    model: displayModel,
    firmwareVersion: extendedData.firmwareVersion?.toString(),
    batteryStatus: extendedData.batteryStatus,
    gpsAccuracy: extendedData.gpsAccuracy || 'High',
    recordingInterval: extendedData.recordingInterval || 1,
  };
}

const GPSDeviceDisplay: React.FC<GPSDeviceDisplayProps> = ({ fitData }) => {
  const deviceInfo = extractDeviceInfo(fitData);

  // Format device display name
  // If manufacturer is "Unknown" and model contains a known manufacturer name, just show the model
  const knownManufacturers = ['Garmin', 'Suunto', 'Wahoo', 'Polar', 'COROS', 'Apple'];
  const modelContainsManufacturer = knownManufacturers.some(m => deviceInfo.model.includes(m));
  const displayName = deviceInfo.manufacturer === 'Unknown' && modelContainsManufacturer
    ? deviceInfo.model
    : `${deviceInfo.manufacturer} ${deviceInfo.model}`;

  return (
    <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg p-3 mb-4 border border-blue-800/30">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-3">
          <Watch className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-white">
              {displayName}
            </div>
            {deviceInfo.firmwareVersion && (
              <div className="text-xs text-gray-400">
                Firmware: {deviceInfo.firmwareVersion}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs flex-wrap">
          {deviceInfo.batteryStatus !== undefined && (
            <div className="flex items-center space-x-1">
              <Battery className="w-4 h-4 text-green-400" />
              <span className="text-gray-300">{deviceInfo.batteryStatus}%</span>
            </div>
          )}

          {deviceInfo.gpsAccuracy && (
            <div className="flex items-center space-x-1">
              <MapPin className="w-4 h-4 text-yellow-400" />
              <span className="text-gray-300">{deviceInfo.gpsAccuracy}</span>
            </div>
          )}

          <div className="text-gray-400">
            Recording: {deviceInfo.recordingInterval}s intervals
          </div>
        </div>
      </div>

      {fitData.fileName && (
        <div className="mt-2 text-xs text-gray-500">
          File: {fitData.fileName}
        </div>
      )}
    </div>
  );
};

export default GPSDeviceDisplay;
