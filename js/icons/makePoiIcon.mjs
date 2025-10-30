import { iconFor } from "./makiIconFor.mjs";

// Returns a fixed 33x33 DivIcon with a 16x16 glyph
export function makePoiIcon(tags) {
    const glyphUrl = iconFor(tags); // absolute/relative URL to the SVG

    return L.divIcon({
        className: "poi-icon",
        html: `
      <div class="poi-badge">
        <div class="poi-badge__glyph" style="--glyph: url('${glyphUrl}')"></div>
      </div>
    `,
        iconSize: [33, 33],
        iconAnchor: [16, 30],    // pin bottom-ish
        popupAnchor: [0, -20],
        tooltipAnchor: [0, -16],
    });
}