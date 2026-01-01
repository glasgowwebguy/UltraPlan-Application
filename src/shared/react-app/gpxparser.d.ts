declare module 'gpxparser' {
  export default class GPXParser {
    parse(gpxString: string): void;
    tracks: Array<{
      distance: { total: number };
      elevation: { max: number; min: number };
      points: Array<{
        lat: number;
        lon: number;
        ele: number;
        time?: Date;
      }>;
    }>;
  }
}
