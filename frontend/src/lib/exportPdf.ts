import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { getPanelGridStyle } from "@/lib/panelLayout";
import type { PageScript, PanelImage } from "@/contexts/MangaContext";

// A5 dimensions in mm (standard manga tankobon)
const PAGE_W = 148;
const PAGE_H = 210;
const MARGIN = 6;
const GAP = 1.5;

interface ExportOptions {
  title: string;
  pages: PageScript[];
  panelImages: Map<string, PanelImage>;
  coverRef: HTMLElement;
  direction?: "ltr" | "rtl";
}

export async function exportMangaPdf({
  title,
  pages,
  panelImages,
  coverRef,
  direction = "rtl",
}: ExportOptions) {
  console.log("[export] Starting PDF export", { title, pageCount: pages.length, panelCount: panelImages.size });
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });

  // --- Cover page via html2canvas ---
  console.log("[export] Rendering cover with html2canvas...");
  try {
    const canvas = await html2canvas(coverRef, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      onclone: (_doc: Document, element: HTMLElement) => {
        // Force inline RGB styles so html2canvas doesn't choke on lab/oklch
        const origEls = [coverRef, ...coverRef.querySelectorAll("*")];
        const clonedEls = [element, ...element.querySelectorAll("*")];
        origEls.forEach((orig, i) => {
          const cloned = clonedEls[i];
          if (orig instanceof HTMLElement && cloned instanceof HTMLElement) {
            const s = getComputedStyle(orig);
            cloned.style.color = s.color;
            cloned.style.backgroundColor = s.backgroundColor;
            cloned.style.borderColor = s.borderColor;
          }
        });
      },
    });
    console.log("[export] Cover canvas rendered", { width: canvas.width, height: canvas.height });
    const coverDataUrl = canvas.toDataURL("image/png");
    console.log("[export] Cover data URL length:", coverDataUrl.length);
    pdf.addImage(coverDataUrl, "PNG", 0, 0, PAGE_W, PAGE_H);
    console.log("[export] Cover added to PDF");
  } catch (err) {
    console.error("[export] Cover render failed:", err);
    throw err;
  }

  // --- Manga pages ---
  for (const page of pages) {
    console.log(`[export] Processing page ${page.page_number} (${page.panels.length} panels)`);
    pdf.addPage("a5", "portrait");

    const panels = page.panels;
    const { gridTemplateColumns, spans } = getPanelGridStyle(panels.length);

    // Parse column count from grid template
    const colCount = gridTemplateColumns.startsWith("repeat(")
      ? parseInt(gridTemplateColumns.match(/repeat\((\d+)/)?.[1] ?? "2")
      : gridTemplateColumns.split(" ").length;

    const contentW = PAGE_W - MARGIN * 2;
    const contentH = PAGE_H - MARGIN * 2;
    const colW = (contentW - GAP * (colCount - 1)) / colCount;

    // Lay out panels row by row
    let curCol = 0;
    let curRow = 0;
    // First pass: compute row count
    const panelPositions: { x: number; y: number; w: number; h: number }[] = [];
    const rowPanels: { span: number; index: number }[][] = [[]];

    for (let i = 0; i < panels.length; i++) {
      const span = spans[i] ?? 1;
      if (curCol + span > colCount && curCol > 0) {
        curRow++;
        curCol = 0;
        rowPanels.push([]);
      }
      rowPanels[curRow].push({ span, index: i });
      curCol += span;
    }

    const totalRows = rowPanels.length;
    const rowH = (contentH - GAP * (totalRows - 1)) / totalRows;

    // Second pass: compute positions
    for (let r = 0; r < rowPanels.length; r++) {
      // For RTL, reverse the order of panels within each row
      const row = direction === "rtl" ? [...rowPanels[r]].reverse() : rowPanels[r];
      let col = 0;
      for (const { span, index } of row) {
        const x = MARGIN + col * (colW + GAP);
        const y = MARGIN + r * (rowH + GAP);
        const w = colW * span + GAP * (span - 1);
        panelPositions[index] = { x, y, w, h: rowH };
        col += span;
      }
    }

    // Draw black background for panel borders
    pdf.setFillColor(0, 0, 0);
    pdf.rect(MARGIN - 0.5, MARGIN - 0.5, contentW + 1, contentH + 1, "F");

    // Place each panel image
    for (let i = 0; i < panels.length; i++) {
      const key = `p${page.page_number}_n${panels[i].panel_number}`;
      const img = panelImages.get(key);
      const pos = panelPositions[i];
      if (!pos) continue;

      if (img?.status === "complete" && img.imageDataUrl) {
        console.log(`[export] Adding panel ${key} (dataUrl len: ${img.imageDataUrl.length})`);
        try {
          pdf.addImage(img.imageDataUrl, "PNG", pos.x, pos.y, pos.w, pos.h);
        } catch (err) {
          console.error(`[export] Failed to add panel ${key}:`, err);
        }
      } else {
        console.log(`[export] Panel ${key} missing or incomplete (status: ${img?.status ?? "none"})`);
        // Empty white panel for missing images
        pdf.setFillColor(255, 255, 255);
        pdf.rect(pos.x, pos.y, pos.w, pos.h, "F");
      }
    }
  }

  // Save
  const safeName = title.replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "manga";
  console.log(`[export] Saving PDF as "${safeName}.pdf"`);
  pdf.save(`${safeName}.pdf`);
  console.log("[export] PDF export complete");
}
