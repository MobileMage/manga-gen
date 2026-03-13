/** Shared panel layout utilities used by StoryboardStep and ReaderStep */

export const PAGE_ASPECT: [number, number] = [7, 10];

const GEMINI_RATIOS: [string, number][] = [
  ["1:1", 1],
  ["3:4", 3 / 4],
  ["4:3", 4 / 3],
  ["2:3", 2 / 3],
  ["3:2", 3 / 2],
  ["16:9", 16 / 9],
  ["9:16", 9 / 16],
  ["4:5", 4 / 5],
  ["5:4", 5 / 4],
];

function snapToGeminiRatio(ratio: number): string {
  let best = GEMINI_RATIOS[0][0];
  let bestDist = Infinity;
  for (const [label, value] of GEMINI_RATIOS) {
    const dist = Math.abs(ratio - value);
    if (dist < bestDist) {
      bestDist = dist;
      best = label;
    }
  }
  return best;
}

export function panelKey(page: number, panel: number) {
  return `p${page}_n${panel}`;
}

/** Compute Gemini-compatible aspect ratios for each panel in a page layout */
export function getPanelAspectRatios(panelCount: number): string[] {
  const { gridTemplateColumns, spans } = getPanelGridStyle(panelCount);

  // Parse total columns from CSS grid template
  const repeatMatch = gridTemplateColumns.match(/repeat\((\d+),/);
  const totalCols = repeatMatch
    ? parseInt(repeatMatch[1])
    : gridTemplateColumns.split(/\s+/).filter((s) => s === "1fr").length;

  // Simulate CSS grid auto-placement to find number of rows
  let col = 0;
  let numRows = 1;
  for (const span of spans) {
    if (col + span > totalCols) {
      numRows++;
      col = 0;
    }
    col += span;
  }

  // Compute aspect ratio for each panel cell
  const [PAGE_W, PAGE_H] = PAGE_ASPECT;
  return spans.map((colSpan) => {
    const cellRatio = (colSpan * PAGE_W * numRows) / (totalCols * PAGE_H);
    return snapToGeminiRatio(cellRatio);
  });
}

/** Derive CSS grid layout from panel count */
export function getPanelGridStyle(panelCount: number): {
  gridTemplateColumns: string;
  spans: number[];
} {
  switch (panelCount) {
    case 1:
      return { gridTemplateColumns: "1fr", spans: [1] };
    case 2:
      return { gridTemplateColumns: "1fr", spans: [1, 1] };
    case 3:
      // 1 wide on top, 2 below
      return { gridTemplateColumns: "1fr 1fr", spans: [2, 1, 1] };
    case 4:
      return { gridTemplateColumns: "1fr 1fr", spans: [1, 1, 1, 1] };
    case 5:
      // 2 on top, 3 below
      return {
        gridTemplateColumns: "repeat(6, 1fr)",
        spans: [3, 3, 2, 2, 2],
      };
    case 6:
      return { gridTemplateColumns: "1fr 1fr", spans: [1, 1, 1, 1, 1, 1] };
    default:
      return {
        gridTemplateColumns: "1fr 1fr",
        spans: Array(panelCount).fill(1),
      };
  }
}
