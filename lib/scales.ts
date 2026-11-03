import { interpolateGnBu, interpolateBlues, interpolateRdBu } from "d3-scale-chromatic";
import { scaleDiverging, scaleSequential } from "d3-scale";
import type { MapMetric } from "./url-state";

export interface ColourScale {
  color: (v: number) => string;
  ticks: number[];
}

export function colourScale(metric: MapMetric, maxRevenue = 1): ColourScale {
  switch (metric) {
    case "growth": {
      const s = scaleDiverging(interpolateRdBu).domain([-0.1, 0, 0.2]).clamp(true);
      return { color: (v) => s(v), ticks: [-0.1, 0, 0.2] };
    }
    case "attainment": {
      const s = scaleDiverging(interpolateRdBu).domain([0.85, 1, 1.1]).clamp(true);
      return { color: (v) => s(v), ticks: [0.85, 1, 1.1] };
    }
    case "revenue": {
      const s = scaleSequential(interpolateBlues).domain([0, maxRevenue]).clamp(true);
      return { color: (v) => s(v * 0.85), ticks: [0, maxRevenue / 2, maxRevenue] };
    }
    case "share": {
      const s = scaleSequential(interpolateGnBu).domain([0, 0.4]).clamp(true);
      return { color: (v) => s(v), ticks: [0, 0.2, 0.4] };
    }
  }
}

export const SERIES_COLORS = ["#0072B2", "#D55E00", "#009E73", "#CC79A7", "#E69F00", "#56B4E9"] as const;
export const SERIES_DASH = ["", "6 3", "2 3", "8 3 2 3", "10 4", "1 3"] as const;
