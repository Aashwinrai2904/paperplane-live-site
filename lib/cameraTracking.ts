export type CameraTrackingMode =
  | "position"
  | "back"
  | "topBack"
  | "front"
  | "topFront"
  | "helicopter"
  | "drone"
  | "bird";

export const CAMERA_MODE_ORDER: CameraTrackingMode[] = [
  "position",
  "back",
  "topBack",
  "front",
  "topFront",
  "helicopter",
  "drone",
  "bird",
];

export const CAMERA_MODE_LABELS: Record<CameraTrackingMode, string> = {
  position: "Position only",
  back: "Back",
  topBack: "Top-back",
  front: "Front",
  topFront: "Top-front",
  helicopter: "Helicopter",
  drone: "Drone",
  bird: "Bird",
};

export interface CameraParams {
  pitch: number;
  bearing: number;
  zoom: number;
}

const HELICOPTER_ORBIT_PERIOD_MS = 24000;

/**
 * Maps a Mini Tokyo 3D-style tracking mode to MapLibre camera parameters,
 * given the followed vehicle's current heading and a monotonically
 * increasing clock (used only for the slow helicopter orbit).
 */
export function computeCameraParams(
  mode: CameraTrackingMode,
  vehicleBearing: number,
  now: number
): CameraParams {
  switch (mode) {
    case "position":
      return { pitch: 0, bearing: 0, zoom: 15 };
    case "back":
      return { pitch: 80, bearing: vehicleBearing, zoom: 18 };
    case "topBack":
      return { pitch: 55, bearing: vehicleBearing, zoom: 16.5 };
    case "front":
      return { pitch: 80, bearing: (vehicleBearing + 180) % 360, zoom: 18 };
    case "topFront":
      return { pitch: 55, bearing: (vehicleBearing + 180) % 360, zoom: 16.5 };
    case "helicopter": {
      const orbit = ((now % HELICOPTER_ORBIT_PERIOD_MS) / HELICOPTER_ORBIT_PERIOD_MS) * 360;
      return { pitch: 50, bearing: orbit, zoom: 15.5 };
    }
    case "drone":
      return { pitch: 68, bearing: vehicleBearing, zoom: 17.5 };
    case "bird":
      return { pitch: 15, bearing: 0, zoom: 13.5 };
  }
}
