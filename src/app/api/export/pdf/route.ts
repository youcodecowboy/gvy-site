import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

export const maxDuration = 30; // 30 second timeout for serverless

interface ExportOptions {
  showVersion?: boolean;
  versionString?: string;
  showPageNumbers?: boolean;
  margins?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
}

// Get logo as base64 data URL
function getLogoDataUrl(): string {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'main-logo.png');
    const logoBuffer = fs.readFileSync(logoPath);
    const base64 = logoBuffer.toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('Failed to load logo:', error);
    return '';
  }
}

// Format current date
function formatDate(): string {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * POST /api/export/pdf
 * Generates a PDF from TipTap HTML content using Puppeteer
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { html, title, options } = await request.json() as {
      html: string;
      title?: string;
      options?: ExportOptions;
    };

    if (!html) {
      return NextResponse.json({ error: 'HTML content required' }, { status: 400 });
    }

    const versionString = options?.versionString || 'v1.0';
    const documentDate = formatDate();
    const logoDataUrl = getLogoDataUrl();

    // Create styled HTML document optimized for PDF - minimal, clean design
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title || 'Document'}</title>
        <style>
          @page {
            size: A4;
            margin: 2cm 2cm 2.5cm 2cm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            font-family: 'Arial', 'Helvetica Neue', 'Helvetica', sans-serif;
            font-size: 9.5pt;
            line-height: 1.5;
            color: #222;
            max-width: 100%;
            margin: 0;
            padding: 0;
          }

          /* Headings - clean and minimal */
          h1 {
            font-size: 14pt;
            font-weight: 600;
            margin: 16pt 0 10pt 0;
            page-break-after: avoid;
            page-break-inside: avoid;
            color: #111;
          }

          /* Major sections (h1) start on new pages, except the first one */
          h1:not(:first-of-type) {
            page-break-before: always;
          }

          h2 {
            font-size: 12pt;
            font-weight: 600;
            margin: 14pt 0 8pt 0;
            page-break-after: avoid;
            page-break-inside: avoid;
            color: #222;
          }

          /* If h2 would be orphaned at bottom of page, move to next page */
          h2 {
            break-after: avoid-page;
          }

          h3 {
            font-size: 11pt;
            font-weight: 600;
            margin: 12pt 0 6pt 0;
            page-break-after: avoid;
            page-break-inside: avoid;
            color: #333;
          }

          h4, h5, h6 {
            font-size: 10pt;
            font-weight: 600;
            margin: 10pt 0 5pt 0;
            page-break-after: avoid;
            page-break-inside: avoid;
            color: #444;
          }

          /* Paragraphs */
          p {
            margin: 0 0 8pt 0;
            orphans: 4;
            widows: 4;
          }

          /* Keep first paragraph after heading with the heading */
          h1 + p, h2 + p, h3 + p, h4 + p {
            page-break-before: avoid;
          }

          /* Lists */
          ul, ol {
            margin: 0 0 8pt 0;
            padding-left: 18pt;
            orphans: 3;
            widows: 3;
          }

          /* Keep first list after heading with the heading */
          h1 + ul, h1 + ol, h2 + ul, h2 + ol, h3 + ul, h3 + ol {
            page-break-before: avoid;
          }

          li {
            margin: 2pt 0;
            page-break-inside: avoid;
          }

          li > ul, li > ol {
            margin: 2pt 0 2pt 0;
          }

          /* Task lists */
          ul[data-type="taskList"] {
            list-style: none;
            padding-left: 0;
          }

          ul[data-type="taskList"] li {
            display: flex;
            align-items: flex-start;
            gap: 6pt;
          }

          ul[data-type="taskList"] li input[type="checkbox"] {
            margin-top: 3pt;
          }

          /* Blockquotes - minimal style */
          blockquote {
            margin: 10pt 0;
            padding: 8pt 12pt;
            border-left: 2px solid #ddd;
            background: #fafafa;
            color: #555;
            font-size: 9pt;
            page-break-inside: avoid;
          }

          blockquote p:last-child {
            margin-bottom: 0;
          }

          /* Code blocks */
          pre {
            background: #f6f6f6;
            padding: 8pt;
            border-radius: 3pt;
            font-family: 'Consolas', 'Monaco', 'Menlo', 'Courier New', monospace;
            font-size: 8pt;
            overflow-x: auto;
            page-break-inside: avoid;
            white-space: pre-wrap;
            word-wrap: break-word;
            border: 1px solid #e5e5e5;
          }

          code {
            background: #f3f3f3;
            padding: 1pt 2pt;
            border-radius: 2pt;
            font-family: 'Consolas', 'Monaco', 'Menlo', 'Courier New', monospace;
            font-size: 8pt;
          }

          pre code {
            background: none;
            padding: 0;
          }

          /* Tables */
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 10pt 0;
            font-size: 9pt;
            page-break-inside: auto;
          }

          /* Keep table with preceding heading */
          h1 + table, h2 + table, h3 + table, h4 + table,
          h1 + p + table, h2 + p + table, h3 + p + table {
            page-break-before: avoid;
          }

          /* Try to keep table header with at least first row */
          thead {
            display: table-header-group;
          }

          /* Avoid breaking inside table rows */
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          th, td {
            border: 1px solid #ddd;
            padding: 5pt 6pt;
            text-align: left;
            vertical-align: top;
          }

          th {
            background: #f5f5f5;
            font-weight: 600;
          }

          tr:nth-child(even) td {
            background: #fafafa;
          }

          /* Images - auto-resize to fit page */
          img {
            max-width: 100%;
            max-height: 700px;
            height: auto;
            display: block;
            margin: 10pt auto;
            page-break-inside: avoid;
            object-fit: contain;
          }

          figure {
            margin: 14pt 0;
            text-align: center;
            page-break-inside: avoid;
          }

          figcaption {
            font-size: 9pt;
            color: #666;
            margin-top: 6pt;
          }

          /* Links */
          a {
            color: #0066cc;
            text-decoration: none;
          }

          /* Horizontal rule */
          hr {
            border: none;
            border-top: 1px solid #e0e0e0;
            margin: 20pt 0;
          }

          /* Highlights */
          mark {
            background: #fff3a8;
            padding: 0 2pt;
          }

          /* Section links (custom node) */
          .section-link-node {
            margin: 14pt 0;
            padding: 10pt 14pt;
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4pt;
            page-break-inside: avoid;
          }

          /* Subscript/Superscript */
          sub {
            font-size: 8pt;
            vertical-align: sub;
          }

          sup {
            font-size: 8pt;
            vertical-align: super;
          }

          /* Page break summary rules */

          /* Headings: never leave a heading alone at bottom of page */
          h1, h2, h3, h4, h5, h6 {
            page-break-after: avoid;
            page-break-inside: avoid;
          }

          /* Block elements: avoid splitting these across pages */
          figure, blockquote, pre {
            page-break-inside: avoid;
          }

          /* Image containers - ensure they fit */
          [data-type="image"], .image-wrapper {
            max-width: 100%;
            page-break-inside: avoid;
          }

          /* Horizontal rules can be good page break points */
          hr {
            page-break-after: auto;
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
      </html>
    `;

    // Launch puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();

    // Set content and wait for images to load
    await page.setContent(fullHtml, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 20000,
    });

    // Use screen media type for better styling
    await page.emulateMediaType('screen');

    // Header template with logo in top-right (with padding above and below)
    const headerTemplate = logoDataUrl ? `
      <div style="width: 100%; padding: 0.5cm 2cm 0.8cm 2cm; display: flex; justify-content: flex-end;">
        <img src="${logoDataUrl}" style="height: 36px; width: auto;" />
      </div>
    ` : '<div></div>';

    // Footer template with version+date on left, page numbers on right
    const footerTemplate = `
      <div style="width: 100%; padding: 0 2cm; display: flex; justify-content: space-between; font-family: Arial, sans-serif; font-size: 8pt; color: #888;">
        <span>${versionString} · ${documentDate}</span>
        <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
      </div>
    `;

    // Generate PDF
    const margins = options?.margins || {};
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: margins.top || '3.5cm',
        bottom: margins.bottom || '2cm',
        left: margins.left || '2cm',
        right: margins.right || '2cm',
      },
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
    });

    await browser.close();

    // Filename includes version number
    const safeTitle = (title || 'document').replace(/[^a-zA-Z0-9\s-]/g, '').trim();
    const filename = `${safeTitle} (${versionString}).pdf`;

    // Return PDF - convert Uint8Array to Buffer for NextResponse
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('PDF export failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
