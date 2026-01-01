// Type definitions for fit-file-parser
declare module 'fit-file-parser' {
  interface FitParserData {
    records?: Array<{
      timestamp: number | Date;
      position_lat?: number;
      position_long?: number;
      distance?: number;
      altitude?: number;
      speed?: number;
      heart_rate?: number;
      cadence?: number;
      [key: string]: any;
    }>;

    sessions?: Array<{
      start_time?: Date;
      sport?: string;
      [key: string]: any;
    }>;

    laps?: Array<{
      [key: string]: any;
    }>;

    activity?: {
      [key: string]: any;
    };
  }

  export default class FitParser {
    constructor(options?: {
      force?: boolean;
      speedUnit?: string;
      lengthUnit?: string;
      temperatureUnit?: string;
      pressureUnit?: string;
      elapsedRecordField?: boolean;
      mode?: string;
    });

    parse(content: ArrayBuffer | Uint8Array | Buffer, callback?: (error: Error | null, data: FitParserData) => void): void;
  }
}
