import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun } from "docx";
import puppeteer from "puppeteer";
import { jsPDF } from "jspdf";
import { type Chapter, type Project } from "@shared/schema";
import fs from "fs";
import path from "path";

interface ExportOptions {
  format: 'docx' | 'pdf';
  includeChapterNumbers: boolean;
  includeProjectInfo: boolean;
  pageBreakBetweenChapters: boolean;
  copyrightInfo?: any;
}

// Memory-efficient function to parse HTML and preserve formatting for Word export
function parseHtmlToTextRuns(htmlContent: string): TextRun[] {
  // Clean and decode HTML entities first
  let text = htmlContent
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')  // Add double line breaks between paragraphs
    .replace(/<p[^>]*>/gi, '')               // Remove opening paragraph tags
    .replace(/<\/p>/gi, '')                  // Remove closing paragraph tags
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

  const textRuns: TextRun[] = [];
  
  // Memory-efficient approach: simple string splitting and processing
  
  // First handle bold text
  const boldParts = text.split(/<\/?(?:strong|b)>/gi);
  let currentText = '';
  let isBold = false;
  
  for (let i = 0; i < boldParts.length; i++) {
    if (i === 0) {
      // First part is always plain text
      currentText += boldParts[i];
    } else {
      // Toggle bold state
      isBold = !isBold;
      if (boldParts[i]) {
        if (isBold) {
          // This part should be bold
          const cleanPart = boldParts[i].replace(/<[^>]*>/g, '').trim();
          if (cleanPart) {
            textRuns.push(new TextRun({ text: cleanPart, bold: true }));
          }
        } else {
          // This part is plain text
          currentText += boldParts[i];
        }
      }
    }
  }
  
  // Process remaining plain text for italic formatting
  if (currentText) {
    const italicParts = currentText.split(/<\/?(?:em|i)>/gi);
    let isItalic = false;
    
    for (let i = 0; i < italicParts.length; i++) {
      if (i === 0) {
        // First part is plain text
        const cleanPart = italicParts[i].replace(/<[^>]*>/g, '').trim();
        if (cleanPart) {
          textRuns.push(new TextRun(cleanPart));
        }
      } else {
        // Toggle italic state
        isItalic = !isItalic;
        if (italicParts[i]) {
          const cleanPart = italicParts[i].replace(/<[^>]*>/g, '').trim();
          if (cleanPart) {
            if (isItalic) {
              textRuns.push(new TextRun({ text: cleanPart, italics: true }));
            } else {
              textRuns.push(new TextRun(cleanPart));
            }
          }
        }
      }
    }
  }

  return textRuns.length > 0 ? textRuns : [new TextRun(text.replace(/<[^>]*>/g, '').trim() || '')];
}

export async function exportProjectToDocx(
  project: Project, 
  chapters: Chapter[], 
  options: ExportOptions
): Promise<Buffer> {
  // Group chapters by section
  const frontMatter = chapters.filter(ch => ch.section === 'front_matter').sort((a, b) => (a.order || 0) - (b.order || 0));
  const bodyChapters = chapters.filter(ch => ch.section === 'body').sort((a, b) => (a.order || 0) - (b.order || 0));
  const backMatter = chapters.filter(ch => ch.section === 'back_matter').sort((a, b) => (a.order || 0) - (b.order || 0));

  const allContent = [];

  // Helper function to create chapter content
  const createChapterContent = (chapter: Chapter, isBodyChapter = false, chapterNumber?: number) => {
    const chapterElements = [];
    
    // Determine if this should be centered (dedication or epigraph)
    const shouldCenter = chapter.chapterType === 'dedication' || chapter.chapterType === 'epigraph';
    
    // Chapter title
    let chapterTitle = chapter.title;
    if (isBodyChapter && options.includeChapterNumbers && chapterNumber) {
      chapterTitle = `Chapter ${chapterNumber}: ${chapter.title}`;
    }
    
    chapterElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: chapterTitle,
            bold: true,
            size: 28,
          }),
        ],
        heading: isBodyChapter ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
        alignment: shouldCenter ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { before: 400, after: 200 },
      })
    );

    // Chapter content with formatting preservation
    if (chapter.content) {
      // Split content into paragraphs, preserving HTML formatting
      const paragraphs = chapter.content
        .split(/<\/p>/gi)
        .map(p => p.replace(/<p[^>]*>/gi, '').trim())
        .filter(p => p.length > 0);
      
      // If no paragraph tags, treat as single paragraph
      if (paragraphs.length === 0 && chapter.content.trim()) {
        paragraphs.push(chapter.content.trim());
      }
      
      paragraphs.forEach(paragraph => {
        if (paragraph.trim()) {
          // Parse HTML formatting and convert to TextRuns
          const textRuns = parseHtmlToTextRuns(paragraph);
          
          if (textRuns.length > 0) {
            chapterElements.push(
              new Paragraph({
                children: textRuns,
                alignment: shouldCenter ? AlignmentType.CENTER : AlignmentType.LEFT,
                spacing: { after: 200 },
              })
            );
          }
        }
      });
    }

    // Add page break after chapter
    chapterElements.push(
      new Paragraph({
        children: [new TextRun({ text: "", break: 1 })],
        pageBreakBefore: true,
      })
    );

    return chapterElements;
  };

  // Add copyright page if copyright info exists
  if (options.copyrightInfo) {
    const copyright = options.copyrightInfo;
    const copyrightElements = [];

    // Title
    copyrightElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: project.title,
            bold: true,
            size: 28,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    // Logo if available
    if (copyright.publisherLogo) {
      try {
        const logoPath = path.join(process.cwd(), 'uploads', 'publisher-logos', path.basename(copyright.publisherLogo));
        if (fs.existsSync(logoPath)) {
          copyrightElements.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: fs.readFileSync(logoPath),
                  transformation: {
                    width: 100,
                    height: 100,
                  },
                  type: "png",
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            })
          );
        }
      } catch (error) {
        console.log("Could not include logo in export:", error);
      }
    }

    // Copyright text
    if (copyright.penName) {
      copyrightElements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `© ${copyright.yearOfPublication || new Date().getFullYear()} ${copyright.penName}`,
              size: 20,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        })
      );
    }

    if (copyright.publisherName) {
      copyrightElements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Published by ${copyright.publisherName}`,
              size: 18,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        })
      );
    }

    // Add page break after copyright
    copyrightElements.push(
      new Paragraph({
        children: [new TextRun({ text: "", break: 1 })],
        pageBreakBefore: true,
      })
    );

    allContent.push(...copyrightElements);
  }

  // Add front matter
  frontMatter.forEach(chapter => {
    allContent.push(...createChapterContent(chapter));
  });

  // Add body chapters
  bodyChapters.forEach((chapter, index) => {
    allContent.push(...createChapterContent(chapter, true, index + 1));
  });

  // Add back matter
  backMatter.forEach(chapter => {
    allContent.push(...createChapterContent(chapter));
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: allContent,
    }],
  });

  return await Packer.toBuffer(doc);
}

export async function exportProjectToPdf(
  project: Project, 
  chapters: Chapter[], 
  options: ExportOptions
): Promise<Buffer> {
  // Try Puppeteer first, fall back to jsPDF if it fails
  try {
    return await generatePdfWithPuppeteer(project, chapters, options);
  } catch (puppeteerError) {
    console.log("Puppeteer failed, using jsPDF fallback:", puppeteerError instanceof Error ? puppeteerError.message : 'Unknown error');
    return await generatePdfWithJsPdf(project, chapters, options);
  }
}

async function generatePdfWithPuppeteer(
  project: Project, 
  chapters: Chapter[], 
  options: ExportOptions
): Promise<Buffer> {
  // Create HTML content
  const htmlContent = generateHtmlForPdf(project, chapters, options);
  
  // Use Puppeteer to generate PDF
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  });
  
  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '1in',
        right: '1in',
        bottom: '1in',
        left: '1in',
      },
      printBackground: true,
    });
    
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

async function generatePdfWithJsPdf(
  project: Project, 
  chapters: Chapter[], 
  options: ExportOptions
): Promise<Buffer> {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxLineWidth = pageWidth - (margin * 2);
  let currentY = margin;

  // Helper function to add text with word wrapping
  const addWrappedText = (text: string, fontSize: number, isBold = false, spacing = 5) => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    
    const lines = pdf.splitTextToSize(text, maxLineWidth);
    
    for (let i = 0; i < lines.length; i++) {
      // Check if we need a new page
      if (currentY + spacing > pageHeight - margin) {
        pdf.addPage();
        currentY = margin;
      }
      
      pdf.text(lines[i], margin, currentY);
      currentY += spacing;
    }
    
    return currentY;
  };

  // Add project info if requested
  if (options.includeProjectInfo) {
    // Project title
    currentY = addWrappedText(project.title, 24, true, 12);
    currentY += 10;
    
    // Project description
    if (project.description) {
      currentY = addWrappedText(project.description, 12, false, 7);
      currentY += 10;
    }
    
    // Word count
    const totalWords = chapters.reduce((sum, ch) => 
      sum + (ch.content?.split(/\s+/).filter(word => word.length > 0).length || 0), 0
    );
    currentY = addWrappedText(`Total Word Count: ${totalWords.toLocaleString()}`, 10, false, 6);
    currentY += 20;
    
    // Start new page for chapters if we have project info
    if (options.pageBreakBetweenChapters) {
      pdf.addPage();
      currentY = margin;
    }
  }

  // Add chapters
  chapters.forEach((chapter, index) => {
    // Start new page for each chapter (except first if no project info)
    if (options.pageBreakBetweenChapters && index > 0) {
      pdf.addPage();
      currentY = margin;
    }
    
    // Chapter title
    const chapterTitle = options.includeChapterNumbers 
      ? `Chapter ${index + 1}: ${chapter.title}`
      : chapter.title;
    
    currentY = addWrappedText(chapterTitle, 16, true, 10);
    currentY += 10;
    
    // Chapter content
    if (chapter.content) {
      // Clean content similar to Word export
      const cleanContent = chapter.content
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<p>/gi, '\n')
        .replace(/<\/p>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"');
      
      const paragraphs = cleanContent
        .split(/\n\s*\n/)
        .filter(p => p.trim().length > 0)
        .map(p => p.trim());
      
      if (paragraphs.length === 0 && cleanContent.trim()) {
        paragraphs.push(cleanContent.trim());
      }
      
      paragraphs.forEach(paragraph => {
        const formattedText = paragraph.replace(/\n/g, ' ').trim();
        if (formattedText) {
          currentY = addWrappedText(formattedText, 11, false, 6);
          currentY += 8; // Extra space between paragraphs
        }
      });
    }
    
    currentY += 15; // Extra space after chapter
  });

  return Buffer.from(pdf.output('arraybuffer'));
}

function generateHtmlForPdf(project: Project, chapters: Chapter[], options: ExportOptions): string {
  // Group chapters by section
  const frontMatter = chapters.filter(ch => ch.section === 'front_matter').sort((a, b) => (a.order || 0) - (b.order || 0));
  const bodyChapters = chapters.filter(ch => ch.section === 'body').sort((a, b) => (a.order || 0) - (b.order || 0));
  const backMatter = chapters.filter(ch => ch.section === 'back_matter').sort((a, b) => (a.order || 0) - (b.order || 0));

  // Helper function to generate chapter HTML
  const generateChapterHtml = (chapter: Chapter, isBodyChapter = false, chapterNumber?: number) => {
    const shouldCenter = chapter.chapterType === 'dedication' || chapter.chapterType === 'epigraph';
    let chapterTitle = chapter.title;
    
    if (isBodyChapter && options.includeChapterNumbers && chapterNumber) {
      chapterTitle = `Chapter ${chapterNumber}: ${chapter.title}`;
    }

    const cleanContent = chapter.content
      ? chapter.content
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<p>/gi, '\n')
          .replace(/<\/p>/gi, '')
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
      : '';

    const paragraphs = cleanContent
      .split(/\n\s*\n/)
      .filter(p => p.trim().length > 0)
      .map(p => p.trim().replace(/\n/g, ' '));

    return `
      <div class="chapter ${shouldCenter ? 'centered-chapter' : ''}" style="page-break-before: always;">
        <h2 class="chapter-title ${shouldCenter ? 'centered' : ''}">${chapterTitle}</h2>
        <div class="chapter-content ${shouldCenter ? 'centered' : ''}">
          ${paragraphs.map(p => `<p>${p}</p>`).join('')}
        </div>
      </div>
    `;
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${project.title}</title>
      <style>
        body {
          font-family: 'Times New Roman', serif;
          line-height: 1.6;
          color: #333;
          max-width: 8.5in;
          margin: 0 auto;
          padding: 0;
        }
        .copyright-page {
          text-align: center;
          margin-bottom: 2in;
          page-break-after: always;
          padding-top: 2in;
        }
        .copyright-title {
          font-size: 28pt;
          font-weight: bold;
          margin-bottom: 1in;
        }
        .copyright-logo {
          margin: 1in 0;
        }
        .copyright-text {
          font-size: 16pt;
          margin-bottom: 0.5in;
        }
        .publisher-text {
          font-size: 14pt;
          margin-bottom: 1in;
        }
        .chapter {
          margin-bottom: 1in;
          page-break-before: always;
        }
        .chapter:first-child {
          page-break-before: auto;
        }
        .chapter-title {
          font-size: 20pt;
          font-weight: bold;
          margin-bottom: 0.5in;
          color: #2c3e50;
        }
        .chapter-content {
          font-size: 12pt;
          text-align: justify;
          line-height: 1.8;
        }
        .chapter-content p {
          margin-bottom: 0.25in;
          text-indent: 0.5in;
        }
        .chapter-content p:first-child {
          text-indent: 0;
        }
        .centered {
          text-align: center;
        }
        .centered-chapter .chapter-content {
          text-align: center;
          text-indent: 0;
        }
        .centered-chapter .chapter-content p {
          text-indent: 0;
        }
      </style>
    </head>
    <body>
      ${options.copyrightInfo ? `
        <div class="copyright-page">
          <h1 class="copyright-title">${project.title}</h1>
          ${options.copyrightInfo.publisherLogo ? `
            <div class="copyright-logo">
              <img src="${options.copyrightInfo.publisherLogo}" alt="Publisher Logo" style="max-width: 200px; max-height: 200px;">
            </div>
          ` : ''}
          ${options.copyrightInfo.penName ? `
            <div class="copyright-text">© ${options.copyrightInfo.yearOfPublication || new Date().getFullYear()} ${options.copyrightInfo.penName}</div>
          ` : ''}
          ${options.copyrightInfo.publisherName ? `
            <div class="publisher-text">Published by ${options.copyrightInfo.publisherName}</div>
          ` : ''}
        </div>
      ` : ''}
      
      ${frontMatter.map(chapter => generateChapterHtml(chapter)).join('')}
      
      ${bodyChapters.map((chapter, index) => generateChapterHtml(chapter, true, index + 1)).join('')}
      
      ${backMatter.map(chapter => generateChapterHtml(chapter)).join('')}
    </body>
    </html>
  `;
}

// Documentation export function
export async function exportDocumentationToPDF(title: string = 'MyNovelCraft Documentation'): Promise<{ buffer: Buffer; filename: string }> {
  const documentationContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 8.5in;
          margin: 0 auto;
          padding: 1in;
        }
        .header {
          text-align: center;
          margin-bottom: 2in;
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 1in;
        }
        .title {
          font-size: 32pt;
          font-weight: bold;
          color: #1e40af;
          margin-bottom: 0.5in;
        }
        .subtitle {
          font-size: 18pt;
          color: #6b7280;
          margin-bottom: 0.25in;
        }
        .version {
          font-size: 12pt;
          color: #9ca3af;
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          display: inline-block;
        }
        .section {
          margin-bottom: 1.5in;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 20pt;
          font-weight: bold;
          color: #1e40af;
          margin-bottom: 0.5in;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 8px;
        }
        .subsection {
          margin-bottom: 0.75in;
        }
        .subsection-title {
          font-size: 16pt;
          font-weight: bold;
          color: #374151;
          margin-bottom: 0.25in;
        }
        .feature-list {
          margin-left: 0.5in;
          margin-bottom: 0.5in;
        }
        .feature-item {
          margin-bottom: 0.15in;
          padding-left: 0.25in;
          position: relative;
        }
        .feature-item:before {
          content: "•";
          color: #3b82f6;
          font-weight: bold;
          position: absolute;
          left: 0;
        }
        .quick-start {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 0.5in;
          margin-bottom: 1in;
        }
        .quick-start-steps {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.5in;
        }
        .step {
          text-align: center;
          padding: 0.25in;
        }
        .step-number {
          width: 2em;
          height: 2em;
          background-color: #3b82f6;
          color: white;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          margin-bottom: 0.25in;
        }
        .tip-box {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 0.25in;
          margin: 0.25in 0;
          border-radius: 0 4px 4px 0;
        }
        .tip-title {
          font-weight: bold;
          color: #92400e;
          margin-bottom: 0.1in;
        }
        .footer {
          text-align: center;
          margin-top: 2in;
          padding-top: 0.5in;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 11pt;
        }
        .table-of-contents {
          margin-bottom: 1.5in;
          padding: 0.5in;
          background-color: #f9fafb;
          border-radius: 8px;
        }
        .toc-title {
          font-size: 18pt;
          font-weight: bold;
          margin-bottom: 0.5in;
          color: #1e40af;
        }
        .toc-item {
          margin-bottom: 0.1in;
          padding-left: 0.25in;
        }
        @page {
          margin: 1in;
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <h1 class="title">MyNovelCraft Documentation</h1>
        <p class="subtitle">Your complete guide to AI-powered novel writing</p>
        <div class="version">Version 2.0 - July 2025</div>
      </div>

      <!-- Table of Contents -->
      <div class="table-of-contents">
        <div class="toc-title">Table of Contents</div>
        <div class="toc-item">1. Quick Start Guide</div>
        <div class="toc-item">2. Project Management</div>
        <div class="toc-item">3. Advanced Writing Tools</div>
        <div class="toc-item">4. AI Writing Assistant</div>
        <div class="toc-item">5. Export & Publishing</div>
        <div class="toc-item">6. Pro Tips & Best Practices</div>
      </div>

      <!-- Quick Start Guide -->
      <div class="section">
        <h2 class="section-title">Quick Start Guide</h2>
        <div class="quick-start">
          <p><strong>Get up and running with MyNovelCraft in four simple steps:</strong></p>
          <div class="quick-start-steps">
            <div class="step">
              <div class="step-number">1</div>
              <h4>Create Project</h4>
              <p>Start with a new novel project and set your writing goals</p>
            </div>
            <div class="step">
              <div class="step-number">2</div>
              <h4>Add Characters</h4>
              <p>Build your cast with detailed character profiles</p>
            </div>
            <div class="step">
              <div class="step-number">3</div>
              <h4>Write Chapters</h4>
              <p>Use the advanced editor with AI assistance</p>
            </div>
            <div class="step">
              <div class="step-number">4</div>
              <h4>Export & Share</h4>
              <p>Download as Word or PDF when ready</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Project Management -->
      <div class="section">
        <h2 class="section-title">Project Management</h2>
        
        <div class="subsection">
          <h3 class="subsection-title">Creating Projects</h3>
          <p>Start your novel by creating a new project with essential details:</p>
          <div class="feature-list">
            <div class="feature-item"><strong>Title & Description:</strong> Define your novel's identity</div>
            <div class="feature-item"><strong>Target Word Count:</strong> Set writing goals and track progress</div>
            <div class="feature-item"><strong>Time Period:</strong> Historical context for AI research</div>
            <div class="feature-item"><strong>Setting:</strong> Geographic location for authentic details</div>
            <div class="feature-item"><strong>Genre:</strong> Literary style for targeted AI assistance</div>
          </div>
        </div>
        
        <div class="subsection">
          <h3 class="subsection-title">Project Organization</h3>
          <div class="feature-list">
            <div class="feature-item">View all projects from the main dashboard</div>
            <div class="feature-item">Edit project details anytime with the edit button</div>
            <div class="feature-item">Track word count progress with visual indicators</div>
            <div class="feature-item">Access detailed writing statistics for each project</div>
          </div>
        </div>
      </div>

      <!-- Advanced Writing Tools -->
      <div class="section">
        <h2 class="section-title">Advanced Writing Tools</h2>
        
        <div class="subsection">
          <h3 class="subsection-title">Rich Text Editor</h3>
          <div class="feature-list">
            <div class="feature-item"><strong>Professional Formatting:</strong> Bookman Old Style 12pt font</div>
            <div class="feature-item"><strong>Paragraph Indentation:</strong> Automatic 1.27cm manuscript formatting</div>
            <div class="feature-item"><strong>Line Spacing:</strong> Single, 1.5x, or Double spacing options</div>
            <div class="feature-item"><strong>Auto-save:</strong> Never lose your work with continuous saving</div>
            <div class="feature-item"><strong>Distraction-free modes:</strong> Focus and minimal UI options</div>
          </div>
        </div>
        
        <div class="subsection">
          <h3 class="subsection-title">Writing Tools Panel</h3>
          <div class="feature-list">
            <div class="feature-item"><strong>Thesaurus:</strong> Find alternative words and synonyms</div>
            <div class="feature-item"><strong>Grammar Checker:</strong> Real-time grammar suggestions</div>
            <div class="feature-item"><strong>Spell Checker:</strong> Catch typos and spelling errors</div>
            <div class="feature-item"><strong>Find & Replace:</strong> Comprehensive text search and editing</div>
          </div>
        </div>
        
        <div class="subsection">
          <h3 class="subsection-title">Advanced Editor Features</h3>
          <div class="feature-list">
            <div class="feature-item"><strong>Drag & Drop:</strong> Resize and move editor window</div>
            <div class="feature-item"><strong>Session Tracking:</strong> Monitor writing time and targets</div>
            <div class="feature-item"><strong>Undo/Redo:</strong> Full editing history navigation</div>
            <div class="feature-item"><strong>Word Count:</strong> Real-time progress tracking</div>
          </div>
        </div>
      </div>

      <!-- AI Writing Assistant -->
      <div class="section">
        <h2 class="section-title">AI Writing Assistant</h2>
        
        <div class="subsection">
          <h3 class="subsection-title">Smart Suggestions</h3>
          <div class="feature-list">
            <div class="feature-item"><strong>Plot Ideas:</strong> Generate compelling story developments</div>
            <div class="feature-item"><strong>Character Development:</strong> Create realistic character traits</div>
            <div class="feature-item"><strong>Scene Descriptions:</strong> Enhance settings and atmosphere</div>
            <div class="feature-item"><strong>Story Progression:</strong> Context-aware creative suggestions</div>
          </div>
        </div>
        
        <div class="subsection">
          <h3 class="subsection-title">AI Literary Editor</h3>
          <div class="feature-list">
            <div class="feature-item"><strong>Chapter Analysis:</strong> Professional feedback on structure and pacing</div>
            <div class="feature-item"><strong>Character Review:</strong> Dialogue and development suggestions</div>
            <div class="feature-item"><strong>Style Improvement:</strong> Writing quality and flow analysis</div>
            <div class="feature-item"><strong>Interactive Chat:</strong> Ask specific writing questions</div>
          </div>
        </div>
        
        <div class="subsection">
          <h3 class="subsection-title">Historical Research</h3>
          <div class="feature-list">
            <div class="feature-item"><strong>Period-Specific Research:</strong> Authentic historical details</div>
            <div class="feature-item"><strong>Quick Topics:</strong> Daily life, politics, technology, culture</div>
            <div class="feature-item"><strong>Geographic Context:</strong> Location-specific information</div>
            <div class="feature-item"><strong>Research History:</strong> Save and review past conversations</div>
          </div>
          <div class="tip-box">
            <div class="tip-title">💡 Pro Tip</div>
            Access Historical Research from any chapter's AI tools menu for period-authentic writing assistance.
          </div>
        </div>
      </div>

      <!-- Export & Publishing -->
      <div class="section">
        <h2 class="section-title">Export & Publishing</h2>
        
        <div class="subsection">
          <h3 class="subsection-title">Export Formats</h3>
          <div class="feature-list">
            <div class="feature-item"><strong>Microsoft Word (.docx):</strong> Professional manuscript format</div>
            <div class="feature-item"><strong>PDF:</strong> Print-ready documents with proper formatting</div>
            <div class="feature-item"><strong>Custom Options:</strong> Include/exclude chapter numbers, project info</div>
            <div class="feature-item"><strong>Page Breaks:</strong> Automatic chapter separation</div>
          </div>
        </div>
        
        <div class="subsection">
          <h3 class="subsection-title">AI Detection</h3>
          <div class="feature-list">
            <div class="feature-item"><strong>Authenticity Testing:</strong> Verify human-written content</div>
            <div class="feature-item"><strong>Percentage Scores:</strong> Human vs AI likelihood analysis</div>
            <div class="feature-item"><strong>Pass/Fail Indicators:</strong> Publishing readiness assessment</div>
            <div class="feature-item"><strong>Confidence Ratings:</strong> HIGH, MEDIUM, LOW accuracy levels</div>
          </div>
        </div>
      </div>

      <!-- Pro Tips -->
      <div class="section">
        <h2 class="section-title">Pro Tips & Best Practices</h2>
        
        <div class="tip-box">
          <div class="tip-title">Maximize AI Assistance</div>
          Provide detailed character and setting information for more contextual AI suggestions.
        </div>
        
        <div class="tip-box">
          <div class="tip-title">Efficient Writing</div>
          Use distraction-free mode and set session targets to maintain focus and productivity.
        </div>
        
        <div class="tip-box">
          <div class="tip-title">Professional Formatting</div>
          Let the editor handle manuscript formatting automatically - just focus on writing.
        </div>
        
        <div class="subsection">
          <h3 class="subsection-title">Getting Help</h3>
          <p>Need assistance? Try these resources:</p>
          <div class="feature-list">
            <div class="feature-item">Use the AI Assistant for writing questions</div>
            <div class="feature-item">Check the Literary Editor for chapter feedback</div>
            <div class="feature-item">Access Historical Research for period details</div>
            <div class="feature-item">Review Writing Statistics for progress insights</div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>MyNovelCraft - Empowering writers with AI-driven creativity and professional tools.</p>
        <p>Last updated: July 2025</p>
      </div>
    </body>
    </html>
  `;

  // Try Puppeteer first, fall back to jsPDF
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });
    
    try {
      const page = await browser.newPage();
      await page.setContent(documentationContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '1in',
          right: '1in',
          bottom: '1in',
          left: '1in',
        },
        printBackground: true,
      });
      
      return { 
        buffer: Buffer.from(pdfBuffer), 
        filename: 'MyNovelCraft-Documentation.pdf' 
      };
    } finally {
      await browser.close();
    }
  } catch (puppeteerError) {
    console.log("Puppeteer failed for documentation PDF, using comprehensive jsPDF fallback:", puppeteerError instanceof Error ? puppeteerError.message : 'Unknown error');
    
    // Comprehensive jsPDF fallback for documentation
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const maxLineWidth = pageWidth - (margin * 2);
    let currentY = margin;

    // Helper function to add text with word wrapping
    const addWrappedText = (text: string, fontSize: number, isBold = false, spacing = 5) => {
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
      
      const lines = pdf.splitTextToSize(text, maxLineWidth);
      
      for (let i = 0; i < lines.length; i++) {
        // Check if we need a new page
        if (currentY + spacing > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
        }
        
        pdf.text(lines[i], margin, currentY);
        currentY += spacing;
      }
      
      currentY += spacing; // Extra space after each text block
    };

    // Title page
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('MyNovelCraft Documentation', pageWidth / 2, 60, { align: 'center' });
    
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Your complete guide to AI-powered novel writing', pageWidth / 2, 80, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.text('Version 2.0 - July 2025', pageWidth / 2, 100, { align: 'center' });
    
    currentY = 140;

    // Table of Contents
    addWrappedText('Table of Contents', 18, true, 8);
    addWrappedText('1. Quick Start Guide', 12, false, 6);
    addWrappedText('2. Project Management', 12, false, 6);
    addWrappedText('3. Advanced Writing Tools', 12, false, 6);
    addWrappedText('4. AI Writing Assistant', 12, false, 6);
    addWrappedText('5. Export & Publishing', 12, false, 6);
    addWrappedText('6. Pro Tips & Best Practices', 12, false, 6);
    
    currentY += 20;

    // Quick Start Guide
    addWrappedText('Quick Start Guide', 16, true, 8);
    addWrappedText('Get up and running with MyNovelCraft in four simple steps:', 12, false, 6);
    addWrappedText('1. Create Project - Start with a new novel project and set your writing goals', 11, false, 5);
    addWrappedText('2. Add Characters - Build your cast with detailed character profiles', 11, false, 5);
    addWrappedText('3. Write Chapters - Use the advanced editor with AI assistance', 11, false, 5);
    addWrappedText('4. Export & Share - Download as Word or PDF when ready', 11, false, 5);

    // Project Management
    addWrappedText('Project Management', 16, true, 8);
    addWrappedText('Creating Projects:', 14, true, 6);
    addWrappedText('Start your novel by creating a new project with essential details:', 12, false, 6);
    addWrappedText('• Title & Description: Define your novel\'s identity', 11, false, 5);
    addWrappedText('• Target Word Count: Set writing goals and track progress', 11, false, 5);
    addWrappedText('• Time Period: Historical context for AI research', 11, false, 5);
    addWrappedText('• Setting: Geographic location for authentic details', 11, false, 5);
    addWrappedText('• Genre: Literary style for targeted AI assistance', 11, false, 5);

    addWrappedText('Project Organization:', 14, true, 6);
    addWrappedText('• View all projects from the main dashboard', 11, false, 5);
    addWrappedText('• Edit project details anytime with the edit button', 11, false, 5);
    addWrappedText('• Track word count progress with visual indicators', 11, false, 5);
    addWrappedText('• Access detailed writing statistics for each project', 11, false, 5);

    // Advanced Writing Tools
    addWrappedText('Advanced Writing Tools', 16, true, 8);
    addWrappedText('Rich Text Editor:', 14, true, 6);
    addWrappedText('• Professional Formatting: Bookman Old Style 12pt font', 11, false, 5);
    addWrappedText('• Paragraph Indentation: Automatic 1.27cm manuscript formatting', 11, false, 5);
    addWrappedText('• Line Spacing: Single, 1.5x, or Double spacing options', 11, false, 5);
    addWrappedText('• Auto-save: Never lose your work with continuous saving', 11, false, 5);
    addWrappedText('• Distraction-free modes: Focus and minimal UI options', 11, false, 5);

    addWrappedText('Writing Tools Panel:', 14, true, 6);
    addWrappedText('• Thesaurus: Find alternative words and synonyms', 11, false, 5);
    addWrappedText('• Grammar Checker: Real-time grammar suggestions', 11, false, 5);
    addWrappedText('• Spell Checker: Catch typos and spelling errors', 11, false, 5);
    addWrappedText('• Find & Replace: Comprehensive text search and editing', 11, false, 5);

    // AI Writing Assistant
    addWrappedText('AI Writing Assistant', 16, true, 8);
    addWrappedText('Smart Suggestions:', 14, true, 6);
    addWrappedText('• Plot Ideas: Generate compelling story developments', 11, false, 5);
    addWrappedText('• Character Development: Create realistic character traits', 11, false, 5);
    addWrappedText('• Scene Descriptions: Enhance settings and atmosphere', 11, false, 5);
    addWrappedText('• Story Progression: Context-aware creative suggestions', 11, false, 5);

    addWrappedText('AI Literary Editor:', 14, true, 6);
    addWrappedText('• Chapter Analysis: Professional feedback on structure and pacing', 11, false, 5);
    addWrappedText('• Character Review: Dialogue and development suggestions', 11, false, 5);
    addWrappedText('• Style Improvement: Writing quality and flow analysis', 11, false, 5);
    addWrappedText('• Interactive Chat: Ask specific writing questions', 11, false, 5);

    addWrappedText('Historical Research:', 14, true, 6);
    addWrappedText('• Period-Specific Research: Authentic historical details', 11, false, 5);
    addWrappedText('• Quick Topics: Daily life, politics, technology, culture', 11, false, 5);
    addWrappedText('• Geographic Context: Location-specific information', 11, false, 5);
    addWrappedText('• Research History: Save and review past conversations', 11, false, 5);
    addWrappedText('💡 Pro Tip: Access Historical Research from any chapter\'s AI tools menu', 10, false, 5);

    // Export & Publishing
    addWrappedText('Export & Publishing', 16, true, 8);
    addWrappedText('Export Formats:', 14, true, 6);
    addWrappedText('• Microsoft Word (.docx): Professional manuscript format', 11, false, 5);
    addWrappedText('• PDF: Print-ready documents with proper formatting', 11, false, 5);
    addWrappedText('• Custom Options: Include/exclude chapter numbers, project info', 11, false, 5);
    addWrappedText('• Page Breaks: Automatic chapter separation', 11, false, 5);

    addWrappedText('AI Detection:', 14, true, 6);
    addWrappedText('• Authenticity Testing: Verify human-written content', 11, false, 5);
    addWrappedText('• Percentage Scores: Human vs AI likelihood analysis', 11, false, 5);
    addWrappedText('• Pass/Fail Indicators: Publishing readiness assessment', 11, false, 5);
    addWrappedText('• Confidence Ratings: HIGH, MEDIUM, LOW accuracy levels', 11, false, 5);

    // Pro Tips
    addWrappedText('Pro Tips & Best Practices', 16, true, 8);
    addWrappedText('• Maximize AI Assistance: Provide detailed character and setting information for more contextual AI suggestions', 11, false, 5);
    addWrappedText('• Efficient Writing: Use distraction-free mode and set session targets to maintain focus and productivity', 11, false, 5);
    addWrappedText('• Professional Formatting: Let the editor handle manuscript formatting automatically - just focus on writing', 11, false, 5);

    addWrappedText('Getting Help:', 14, true, 6);
    addWrappedText('• Use the AI Assistant for writing questions', 11, false, 5);
    addWrappedText('• Check the Literary Editor for chapter feedback', 11, false, 5);
    addWrappedText('• Access Historical Research for period details', 11, false, 5);
    addWrappedText('• Review Writing Statistics for progress insights', 11, false, 5);

    // Footer
    currentY += 20;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('MyNovelCraft - Empowering writers with AI-driven creativity and professional tools.', pageWidth / 2, currentY, { align: 'center' });
    pdf.text('Last updated: July 2025', pageWidth / 2, currentY + 10, { align: 'center' });
    
    return { 
      buffer: Buffer.from(pdf.output('arraybuffer')), 
      filename: 'MyNovelCraft-Documentation.pdf' 
    };
  }
}