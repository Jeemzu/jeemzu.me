import { pdf } from "@react-pdf/renderer";
import { GddPdf } from "./GddPdf";
import type { GddDocument } from "./document";
import type { PdfImage } from "./images";

export async function generatePdf(
  content: GddDocument,
  images: Record<string, PdfImage>,
): Promise<Blob> {
  const pageNumbers: Record<string, number> = {};
  // A measuring pass supplies actual section destinations after flowing pagination.
  await pdf(
    <GddPdf
      content={content}
      images={images}
      pageNumbers={{}}
      recordPage={(id, page) => {
        pageNumbers[id] = page;
      }}
    />,
  ).toBlob();
  if (
    content.sections.some((section) => pageNumbers[section.id] === undefined)
  ) {
    throw new Error(
      "Could not calculate the contents page. Try generating the PDF again.",
    );
  }
  return pdf(
    <GddPdf content={content} images={images} pageNumbers={pageNumbers} />,
  ).toBlob();
}
