import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { PageScript, PageImage } from "@/contexts/MangaContext";

// A5 dimensions in mm (standard manga tankobon)
const PAGE_W = 148;
const PAGE_H = 210;

interface ExportOptions {
  title: string;
  pages: PageScript[];
  pageImages: Map<number, PageImage>;
  coverRef: HTMLElement;
}

export async function exportMangaPdf({
  title,
  pages,
  pageImages,
  coverRef,
}: ExportOptions) {
  console.log("[export] Starting PDF export", { title, pageCount: pages.length });
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
    pdf.addImage(coverDataUrl, "PNG", 0, 0, PAGE_W, PAGE_H);
    console.log("[export] Cover added to PDF");
  } catch (err) {
    console.error("[export] Cover render failed:", err);
    throw err;
  }

  // --- Manga pages (one image per page) ---
  for (const page of pages) {
    console.log(`[export] Processing page ${page.page_number}`);
    pdf.addPage("a5", "portrait");

    const img = pageImages.get(page.page_number);
    if (img?.status === "complete" && img.imageDataUrl) {
      try {
        pdf.addImage(img.imageDataUrl, "PNG", 0, 0, PAGE_W, PAGE_H);
      } catch (err) {
        console.error(`[export] Failed to add page ${page.page_number}:`, err);
        // White fallback
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, PAGE_W, PAGE_H, "F");
      }
    } else {
      console.log(`[export] Page ${page.page_number} missing or incomplete`);
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, PAGE_W, PAGE_H, "F");
    }
  }

  // Save
  const safeName = title.replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "manga";
  console.log(`[export] Saving PDF as "${safeName}.pdf"`);
  pdf.save(`${safeName}.pdf`);
  console.log("[export] PDF export complete");
}
