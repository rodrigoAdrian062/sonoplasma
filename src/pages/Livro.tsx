import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { bookContent } from '@/data/bookContent';
import jsPDF from 'jspdf';
import bookCover from '@/assets/book-cover.jpg';
import bookPart1 from '@/assets/book-part1.jpg';
import bookPart2 from '@/assets/book-part2.jpg';
import bookPart3 from '@/assets/book-part3.jpg';
import bookPart4 from '@/assets/book-part4.jpg';
import bookPart5 from '@/assets/book-part5.jpg';
import bookPart6 from '@/assets/book-part6.jpg';
import bookPart7 from '@/assets/book-part7.jpg';
import bookPart8 from '@/assets/book-part8.jpg';
import bookPart9 from '@/assets/book-part9.jpg';
import bookPart10 from '@/assets/book-part10.jpg';
import authorPhoto from '@/assets/author-photo.jpg';

export default function Livro() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);

  const partImages = [bookPart1, bookPart2, bookPart3, bookPart4, bookPart5, bookPart6, bookPart7, bookPart8, bookPart9, bookPart10];

  const generatePDF = async () => {
    setIsGenerating(true);
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    const lineHeight = 5;
    let y = margin;
    let currentPage = 1;

    // Function to normalize text for PDF (remove problematic characters)
    const normalizeText = (text: string): string => {
      // First, normalize using built-in function to decompose accented characters
      let normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      // Additional replacements for special characters
      const replacements: [RegExp, string][] = [
        [/[\u2018\u2019\u201A\u201B]/g, "'"],  // Various single quotes
        [/[\u201C\u201D\u201E\u201F]/g, '"'],  // Various double quotes
        [/[\u2013\u2014\u2015]/g, '-'],        // Various dashes
        [/\u2026/g, '...'],                     // Ellipsis
        [/\u2022/g, '*'],                       // Bullet point
        [/\u00B7/g, '*'],                       // Middle dot
        [/\u2023/g, '>'],                       // Triangular bullet
        [/\u2043/g, '-'],                       // Hyphen bullet
        [/\u00A0/g, ' '],                       // Non-breaking space
        [/\u00BA/g, 'o'],                       // Masculine ordinal
        [/\u00AA/g, 'a'],                       // Feminine ordinal
        [/\u00AB/g, '"'],                       // Left guillemet
        [/\u00BB/g, '"'],                       // Right guillemet
        [/\u00AD/g, ''],                        // Soft hyphen
        [/\u200B/g, ''],                        // Zero width space
        [/\u200C/g, ''],                        // Zero width non-joiner
        [/\u200D/g, ''],                        // Zero width joiner
        [/\uFEFF/g, ''],                        // BOM
      ];
      
      for (const [pattern, replacement] of replacements) {
        normalized = normalized.replace(pattern, replacement);
      }
      
      // Filter out any remaining non-ASCII characters that might cause issues
      // Keep only printable ASCII and common extended ASCII
      normalized = normalized.split('').map(char => {
        const code = char.charCodeAt(0);
        // Keep standard ASCII (32-126), tab, newline, carriage return
        if ((code >= 32 && code <= 126) || code === 9 || code === 10 || code === 13) {
          return char;
        }
        return '';
      }).join('');
      
      return normalized;
    };

    // Colors
    const goldColor: [number, number, number] = [184, 134, 11];
    const darkColor: [number, number, number] = [55, 45, 35];
    const grayColor: [number, number, number] = [120, 100, 80];
    const beigeColor: [number, number, number] = [245, 235, 220];
    const beigeDark: [number, number, number] = [225, 210, 185];
    const borderColor: [number, number, number] = [200, 180, 150];

    // Track page numbers for TOC
    const tocEntries: { title: string; page: number; isChapter?: boolean }[] = [];

    // Add parchment background with decorative elements
    const addParchmentBackground = () => {
      // Main beige background
      pdf.setFillColor(...beigeColor);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      
      // Subtle gradient effect - darker edges
      pdf.setFillColor(...beigeDark);
      // Top edge gradient
      for (let i = 0; i < 8; i++) {
        pdf.setFillColor(245 - i * 2, 235 - i * 2, 220 - i * 3);
        pdf.rect(0, i * 1.5, pageWidth, 1.5, 'F');
      }
      // Bottom edge gradient
      for (let i = 0; i < 8; i++) {
        pdf.setFillColor(245 - i * 2, 235 - i * 2, 220 - i * 3);
        pdf.rect(0, pageHeight - (i + 1) * 1.5, pageWidth, 1.5, 'F');
      }
      // Left edge gradient
      for (let i = 0; i < 6; i++) {
        pdf.setFillColor(245 - i * 2, 235 - i * 2, 220 - i * 3);
        pdf.rect(i * 1, 0, 1, pageHeight, 'F');
      }
      // Right edge gradient
      for (let i = 0; i < 6; i++) {
        pdf.setFillColor(245 - i * 2, 235 - i * 2, 220 - i * 3);
        pdf.rect(pageWidth - (i + 1) * 1, 0, 1, pageHeight, 'F');
      }
      
      // ========== SUBTLE WATERMARK PATTERNS ==========
      const watermarkColor: [number, number, number] = [235, 225, 205];
      pdf.setDrawColor(...watermarkColor);
      pdf.setLineWidth(0.15);
      
      // Draw subtle olive branch pattern in corners
      const drawOliveBranch = (x: number, y: number, scale: number, flip: boolean) => {
        const s = scale;
        const fx = flip ? -1 : 1;
        
        // Main stem
        pdf.line(x, y, x + 15 * s * fx, y - 8 * s);
        
        // Leaves on stem
        for (let i = 0; i < 4; i++) {
          const lx = x + (3 + i * 3) * s * fx;
          const ly = y - (2 + i * 1.5) * s;
          // Left leaf
          pdf.ellipse(lx - 1.5 * s * fx, ly - 1 * s, 2 * s, 0.8 * s, 'S');
          // Right leaf
          pdf.ellipse(lx + 1.5 * s * fx, ly + 1 * s, 2 * s, 0.8 * s, 'S');
        }
      };
      
      // Draw subtle cross pattern
      const drawCross = (x: number, y: number, size: number) => {
        pdf.line(x - size, y, x + size, y);
        pdf.line(x, y - size * 1.3, x, y + size * 0.7);
      };
      
      // Draw subtle wheat stalk
      const drawWheat = (x: number, y: number, scale: number) => {
        // Stem
        pdf.line(x, y, x, y - 20 * scale);
        // Grains
        for (let i = 0; i < 5; i++) {
          const gy = y - (8 + i * 2.5) * scale;
          pdf.ellipse(x - 2 * scale, gy, 1.5 * scale, 0.6 * scale, 'S');
          pdf.ellipse(x + 2 * scale, gy, 1.5 * scale, 0.6 * scale, 'S');
        }
      };
      
      // Draw subtle star/light rays
      const drawLightRays = (x: number, y: number, size: number) => {
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          const x2 = x + Math.cos(angle) * size;
          const y2 = y + Math.sin(angle) * size;
          pdf.line(x, y, x2, y2);
        }
        pdf.circle(x, y, size * 0.3, 'S');
      };
      
      // Place watermarks strategically
      // Top left olive branch
      drawOliveBranch(25, 45, 0.8, false);
      
      // Top right olive branch (mirrored)
      drawOliveBranch(pageWidth - 25, 45, 0.8, true);
      
      // Center subtle cross
      pdf.setDrawColor(230, 218, 195);
      drawCross(pageWidth / 2, pageHeight / 2, 25);
      
      // Light rays behind cross
      pdf.setDrawColor(238, 228, 210);
      drawLightRays(pageWidth / 2, pageHeight / 2, 35);
      
      // Bottom corners - wheat
      pdf.setDrawColor(...watermarkColor);
      drawWheat(35, pageHeight - 30, 0.7);
      drawWheat(pageWidth - 35, pageHeight - 30, 0.7);
      
      // Subtle decorative circles pattern
      pdf.setDrawColor(240, 232, 218);
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 4; col++) {
          const cx = 50 + col * 40;
          const cy = 80 + row * 45;
          pdf.circle(cx, cy, 0.5, 'S');
        }
      }
      
      // ========== CORNER ORNAMENTS ==========
      pdf.setDrawColor(...borderColor);
      pdf.setLineWidth(0.3);
      
      // Top-left corner
      pdf.line(8, 12, 22, 12);
      pdf.line(12, 8, 12, 22);
      pdf.circle(12, 12, 2, 'S');
      
      // Top-right corner
      pdf.line(pageWidth - 22, 12, pageWidth - 8, 12);
      pdf.line(pageWidth - 12, 8, pageWidth - 12, 22);
      pdf.circle(pageWidth - 12, 12, 2, 'S');
      
      // Bottom-left corner
      pdf.line(8, pageHeight - 12, 22, pageHeight - 12);
      pdf.line(12, pageHeight - 22, 12, pageHeight - 8);
      pdf.circle(12, pageHeight - 12, 2, 'S');
      
      // Bottom-right corner
      pdf.line(pageWidth - 22, pageHeight - 12, pageWidth - 8, pageHeight - 12);
      pdf.line(pageWidth - 12, pageHeight - 22, pageWidth - 12, pageHeight - 8);
      pdf.circle(pageWidth - 12, pageHeight - 12, 2, 'S');
      
      // Inner decorative border
      pdf.setDrawColor(...goldColor);
      pdf.setLineWidth(0.2);
      pdf.rect(15, 18, pageWidth - 30, pageHeight - 36, 'S');
    };

    // Add background to first page
    addParchmentBackground();

    // Track current chapter for headers
    let currentChapterTitle = '';
    let currentPartTitle = '';

    const addPageNumber = () => {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...grayColor);
      pdf.text(String(currentPage), pageWidth / 2, pageHeight - 14, { align: 'center' });
    };

    // Add page header with book/chapter title
    const addPageHeader = (leftText: string, rightText: string) => {
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(...grayColor);
      const normalizedLeft = normalizeText(leftText);
      const normalizedRight = normalizeText(rightText);
      pdf.text(normalizedLeft, margin, 24);
      pdf.text(normalizedRight, pageWidth - margin, 24, { align: 'right' });
      // Subtle line under header
      pdf.setDrawColor(...borderColor);
      pdf.setLineWidth(0.1);
      pdf.line(margin, 26, pageWidth - margin, 26);
    };

    const addPage = (skipPageNumber = false, skipHeader = false) => {
      if (!skipPageNumber && currentPage > 2) {
        addPageNumber();
      }
      pdf.addPage();
      currentPage++;
      addParchmentBackground();
      if (!skipHeader && currentPage > 5 && currentChapterTitle) {
        addPageHeader(bookContent.title, currentChapterTitle);
        y = margin + 15;
      } else {
        y = margin + 5;
      }
    };

    const checkPageBreak = (neededSpace: number) => {
      if (y + neededSpace > pageHeight - margin - 20) {
        addPageNumber();
        pdf.addPage();
        currentPage++;
        addParchmentBackground();
        if (currentChapterTitle) {
          addPageHeader(bookContent.title, currentChapterTitle);
          y = margin + 15;
        } else {
          y = margin + 5;
        }
      }
    };

    // Add decorative drop cap (capitular)
    const addDropCap = (letter: string) => {
      pdf.setFontSize(36);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...goldColor);
      const normalizedLetter = normalizeText(letter.toUpperCase());
      pdf.text(normalizedLetter, margin, y + 8);
      
      // Decorative box around drop cap
      pdf.setDrawColor(...goldColor);
      pdf.setLineWidth(0.3);
      const capWidth = 12;
      pdf.rect(margin - 1, y - 4, capWidth + 2, 15, 'S');
      
      return capWidth + 4; // Return indent for first paragraph
    };

    // Add highlighted quote box for Bible verses
    const addQuoteBox = (quote: string, reference: string) => {
      checkPageBreak(35);
      y += 4;
      
      const quoteBoxMargin = 8;
      const quoteWidth = contentWidth - quoteBoxMargin * 2;
      
      // Quote box background
      pdf.setFillColor(235, 225, 205);
      pdf.setDrawColor(...goldColor);
      pdf.setLineWidth(0.5);
      
      // Calculate quote height
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'italic');
      const normalizedQuote = normalizeText(quote);
      const quoteLines = pdf.splitTextToSize(normalizedQuote, quoteWidth - 10);
      const quoteHeight = quoteLines.length * 5 + 18;
      
      // Draw box
      pdf.roundedRect(margin + quoteBoxMargin, y, quoteWidth, quoteHeight, 2, 2, 'FD');
      
      // Opening quote mark
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...goldColor);
      pdf.text('"', margin + quoteBoxMargin + 4, y + 10);
      
      // Quote text
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(...darkColor);
      let quoteY = y + 8;
      quoteLines.forEach((line: string) => {
        pdf.text(line, margin + quoteBoxMargin + 12, quoteY);
        quoteY += 5;
      });
      
      // Reference
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...goldColor);
      const normalizedRef = normalizeText(reference);
      pdf.text('- ' + normalizedRef, margin + quoteBoxMargin + quoteWidth - 10, quoteY + 2, { align: 'right' });
      
      y += quoteHeight + 8;
    };

    const addText = (text: string, fontSize: number = 9, color: [number, number, number] = darkColor, withDropCap = false) => {
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...color);
      const normalizedText = normalizeText(text);
      
      // Check for Bible verses to highlight (lines starting with quotes and containing "—" or chapter:verse pattern)
      const paragraphs = normalizedText.split('\n\n');
      let isFirstParagraph = true;
      
      paragraphs.forEach(para => {
        if (para.trim().startsWith('"') && (para.includes('-') || /\d+:\d+/.test(para))) {
          // This looks like a Bible verse - extract quote and reference
          const match = para.match(/^"(.+?)"\s*[-—]\s*(.+)$/s);
          if (match) {
            addQuoteBox(match[1], match[2]);
            isFirstParagraph = false;
            return;
          }
        }
        
        // Regular paragraph with optional drop cap
        let indent = 0;
        if (withDropCap && isFirstParagraph && para.trim().length > 0) {
          const firstLetter = para.trim()[0];
          indent = addDropCap(firstLetter);
          para = para.trim().substring(1);
          isFirstParagraph = false;
        }
        
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...color);
        
        const lines = pdf.splitTextToSize(para, contentWidth - indent);
        lines.forEach((line: string, lineIdx: number) => {
          checkPageBreak(lineHeight);
          if (lineIdx === 0 && indent > 0) {
            pdf.text(line, margin + indent, y);
            indent = 0; // Only indent first line
          } else {
            pdf.text(line, margin, y);
          }
          y += lineHeight;
        });
        y += 2;
      });
    };

    const addSectionTitle = (text: string) => {
      checkPageBreak(18);
      y += 6;
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...goldColor);
      const normalizedText = normalizeText(text);
      pdf.text(normalizedText, pageWidth / 2, y, { align: 'center' });
      y += 3;
      pdf.setDrawColor(...goldColor);
      pdf.setLineWidth(0.4);
      const lineWidth = Math.min(pdf.getTextWidth(normalizedText) + 16, contentWidth - 20);
      pdf.line((pageWidth - lineWidth) / 2, y, (pageWidth + lineWidth) / 2, y);
      y += 8;
    };

    const addChapterTitle = (text: string, withDropCap = false) => {
      checkPageBreak(16);
      y += 4;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...darkColor);
      const normalizedText = normalizeText(text);
      currentChapterTitle = normalizedText;
      const lines = pdf.splitTextToSize(normalizedText, contentWidth);
      lines.forEach((line: string) => {
        pdf.text(line, margin, y);
        y += 5;
      });
      
      // Decorative line under chapter title
      y += 2;
      pdf.setDrawColor(...goldColor);
      pdf.setLineWidth(0.3);
      pdf.line(margin, y, margin + 40, y);
      y += 6;
    };

    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };

    const addPartPage = async (title: string, partIndex: number) => {
      addPage(true);
      
      // Add part image
      try {
        const img = await loadImage(partImages[partIndex]);
        const imgSize = 60;
        const imgX = (pageWidth - imgSize) / 2;
        pdf.addImage(img, 'JPEG', imgX, 40, imgSize, imgSize);
      } catch (e) {
        console.log('Could not load part image');
      }
      
      y = 115;
      
      // Decorative line above
      pdf.setDrawColor(...goldColor);
      pdf.setLineWidth(0.8);
      pdf.line(pageWidth / 2 - 35, y - 8, pageWidth / 2 + 35, y - 8);
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...goldColor);
      
      // Split long part titles
      const normalizedTitle = normalizeText(title);
      const lines = pdf.splitTextToSize(normalizedTitle, contentWidth - 20);
      lines.forEach((line: string) => {
        pdf.text(line, pageWidth / 2, y, { align: 'center' });
        y += 7;
      });
      
      // Decorative line below
      pdf.line(pageWidth / 2 - 35, y + 4, pageWidth / 2 + 35, y + 4);
      
      addPageNumber();
    };

    // ========== PROFESSIONAL COVER PAGE ==========
    // Dark elegant background for cover
    pdf.setFillColor(15, 25, 45); // Deep navy blue
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Decorative gold border frame
    pdf.setDrawColor(...goldColor);
    pdf.setLineWidth(1.5);
    pdf.rect(8, 8, pageWidth - 16, pageHeight - 16, 'S');
    pdf.setLineWidth(0.5);
    pdf.rect(12, 12, pageWidth - 24, pageHeight - 24, 'S');
    
    // Corner ornaments for cover
    const drawCoverCorner = (cx: number, cy: number, flipX: boolean, flipY: boolean) => {
      const fx = flipX ? -1 : 1;
      const fy = flipY ? -1 : 1;
      pdf.setLineWidth(0.4);
      // Diamond shape
      pdf.line(cx, cy + 8 * fy, cx + 8 * fx, cy);
      pdf.line(cx + 8 * fx, cy, cx, cy - 8 * fy);
      pdf.line(cx, cy - 8 * fy, cx - 8 * fx, cy);
      pdf.line(cx - 8 * fx, cy, cx, cy + 8 * fy);
      // Extended lines
      pdf.line(cx + 12 * fx, cy, cx + 25 * fx, cy);
      pdf.line(cx, cy + 12 * fy, cx, cy + 25 * fy);
    };
    
    drawCoverCorner(20, 20, false, false);
    drawCoverCorner(pageWidth - 20, 20, true, false);
    drawCoverCorner(20, pageHeight - 20, false, true);
    drawCoverCorner(pageWidth - 20, pageHeight - 20, true, true);
    
    // Top decorative element
    pdf.setLineWidth(0.3);
    pdf.line(pageWidth / 2 - 50, 30, pageWidth / 2 - 15, 30);
    pdf.circle(pageWidth / 2, 30, 3, 'S');
    pdf.circle(pageWidth / 2, 30, 1.5, 'F');
    pdf.line(pageWidth / 2 + 15, 30, pageWidth / 2 + 50, 30);
    
    // Cover image with gold frame
    try {
      const img = await loadImage(bookCover);
      const imgWidth = 100;
      const imgHeight = (img.height / img.width) * imgWidth;
      const imgX = (pageWidth - imgWidth) / 2;
      const imgY = 42;
      
      // Gold frame around image
      pdf.setFillColor(...goldColor);
      pdf.rect(imgX - 3, imgY - 3, imgWidth + 6, Math.min(imgHeight, 95) + 6, 'F');
      pdf.addImage(img, 'JPEG', imgX, imgY, imgWidth, Math.min(imgHeight, 95));
    } catch (e) {
      console.log('Could not load cover image');
    }
    
    // Title section
    y = 155;
    
    // Decorative line above title
    pdf.setDrawColor(...goldColor);
    pdf.setLineWidth(0.5);
    pdf.line(pageWidth / 2 - 60, y - 8, pageWidth / 2 + 60, y - 8);
    
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...goldColor);
    pdf.text('PROSPERAR', pageWidth / 2, y, { align: 'center' });
    y += 12;
    pdf.setFontSize(22);
    pdf.text('SEGUNDO A PALAVRA', pageWidth / 2, y, { align: 'center' });
    
    // Decorative line below title
    y += 8;
    pdf.line(pageWidth / 2 - 60, y, pageWidth / 2 + 60, y);
    
    // Subtitle
    y += 15;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(200, 200, 210);
    const subtitleLines = pdf.splitTextToSize(normalizeText(bookContent.subtitle), contentWidth - 30);
    subtitleLines.forEach((line: string) => {
      pdf.text(line, pageWidth / 2, y, { align: 'center' });
      y += 5;
    });

    // Ornamental divider
    y += 12;
    pdf.setDrawColor(...goldColor);
    pdf.setLineWidth(0.4);
    // Left flourish
    pdf.line(pageWidth / 2 - 40, y, pageWidth / 2 - 12, y);
    pdf.line(pageWidth / 2 - 40, y, pageWidth / 2 - 45, y - 3);
    pdf.line(pageWidth / 2 - 40, y, pageWidth / 2 - 45, y + 3);
    // Center diamond
    pdf.setFillColor(...goldColor);
    const dx = pageWidth / 2;
    pdf.line(dx - 5, y, dx, y - 3);
    pdf.line(dx, y - 3, dx + 5, y);
    pdf.line(dx + 5, y, dx, y + 3);
    pdf.line(dx, y + 3, dx - 5, y);
    // Right flourish
    pdf.line(pageWidth / 2 + 12, y, pageWidth / 2 + 40, y);
    pdf.line(pageWidth / 2 + 40, y, pageWidth / 2 + 45, y - 3);
    pdf.line(pageWidth / 2 + 40, y, pageWidth / 2 + 45, y + 3);
    
    // Author name
    y += 18;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...goldColor);
    pdf.text(bookContent.author, pageWidth / 2, y, { align: 'center' });
    
    // Year
    y += 8;
    pdf.setFontSize(10);
    pdf.setTextColor(180, 180, 190);
    pdf.text(bookContent.year, pageWidth / 2, y, { align: 'center' });
    
    // Bottom decorative element
    pdf.setDrawColor(...goldColor);
    pdf.setLineWidth(0.3);
    pdf.line(pageWidth / 2 - 50, pageHeight - 30, pageWidth / 2 - 15, pageHeight - 30);
    pdf.circle(pageWidth / 2, pageHeight - 30, 3, 'S');
    pdf.circle(pageWidth / 2, pageHeight - 30, 1.5, 'F');
    pdf.line(pageWidth / 2 + 15, pageHeight - 30, pageWidth / 2 + 50, pageHeight - 30);

    // ========== EPIGRAPH PAGE ==========
    addPage(true, true);
    
    // Center the epigraph vertically
    y = pageHeight / 2 - 30;
    
    // Decorative top element
    pdf.setDrawColor(...goldColor);
    pdf.setLineWidth(0.5);
    pdf.line(pageWidth / 2 - 25, y - 15, pageWidth / 2 + 25, y - 15);
    pdf.circle(pageWidth / 2, y - 15, 2, 'S');
    
    // Opening quote mark
    pdf.setFontSize(48);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...goldColor);
    pdf.text('"', pageWidth / 2, y, { align: 'center' });
    y += 10;
    
    // Quote text
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(...darkColor);
    const epigraphLines = pdf.splitTextToSize(normalizeText(bookContent.epigraph.quote), contentWidth - 40);
    epigraphLines.forEach((line: string) => {
      pdf.text(line, pageWidth / 2, y, { align: 'center' });
      y += 6;
    });
    
    // Closing quote mark
    y += 5;
    pdf.setFontSize(48);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...goldColor);
    pdf.text('"', pageWidth / 2, y, { align: 'center' });
    y += 10;
    
    // Reference
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...goldColor);
    pdf.text('- ' + normalizeText(bookContent.epigraph.reference), pageWidth / 2, y, { align: 'center' });
    
    // Decorative bottom element
    y += 15;
    pdf.setLineWidth(0.5);
    pdf.line(pageWidth / 2 - 25, y, pageWidth / 2 + 25, y);
    pdf.circle(pageWidth / 2, y, 2, 'S');

    // ========== ABOUT AUTHOR PAGE ==========
    addPage(true, true);
    y = 30;
    
    // Title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...goldColor);
    pdf.text('SOBRE O AUTOR', pageWidth / 2, y, { align: 'center' });
    y += 4;
    pdf.setDrawColor(...goldColor);
    pdf.setLineWidth(0.5);
    pdf.line(pageWidth / 2 - 30, y, pageWidth / 2 + 30, y);
    y += 12;
    
    // Author photo
    try {
      const authorImg = await loadImage(authorPhoto);
      const imgSize = 50;
      const imgX = (pageWidth - imgSize) / 2;
      
      // Gold frame around photo
      pdf.setFillColor(...goldColor);
      pdf.roundedRect(imgX - 2, y - 2, imgSize + 4, imgSize + 4, 3, 3, 'F');
      pdf.addImage(authorImg, 'JPEG', imgX, y, imgSize, imgSize);
      y += imgSize + 10;
    } catch (e) {
      console.log('Could not load author photo');
      y += 10;
    }
    
    // Author biography
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...darkColor);
    const bioLines = pdf.splitTextToSize(normalizeText(bookContent.aboutAuthor.biography), contentWidth);
    bioLines.forEach((line: string) => {
      checkPageBreak(lineHeight);
      pdf.text(line, margin, y);
      y += lineHeight;
    });
    
    // Decorative end element
    y += 8;
    pdf.setDrawColor(...goldColor);
    pdf.setLineWidth(0.4);
    pdf.line(pageWidth / 2 - 20, y, pageWidth / 2 - 6, y);
    pdf.circle(pageWidth / 2, y, 1.2, 'S');
    pdf.line(pageWidth / 2 + 6, y, pageWidth / 2 + 20, y);

    // ========== COPYRIGHT PAGE ==========
    addPage(true);
    y = pageHeight / 2 - 25;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...grayColor);
    const copyrightLines = pdf.splitTextToSize(normalizeText(bookContent.frontMatter.copyright), contentWidth - 20);
    copyrightLines.forEach((line: string) => {
      pdf.text(line, pageWidth / 2, y, { align: 'center' });
      y += 4;
    });

    // ========== TABLE OF CONTENTS ==========
    addPage(true);
    y = 30;
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...goldColor);
    pdf.text('SUMÁRIO', pageWidth / 2, y, { align: 'center' });
    y += 4;
    pdf.setDrawColor(...goldColor);
    pdf.setLineWidth(0.5);
    pdf.line(pageWidth / 2 - 25, y, pageWidth / 2 + 25, y);
    y += 15;

    // Calculate page numbers for TOC
    let pageCounter = 4; // Start after cover, copyright, and TOC
    
    // Front matter entries
    const frontMatterItems = [
      { title: 'Dedicatória', page: pageCounter++ },
      { title: 'Agradecimentos', page: pageCounter++ },
      { title: 'Prefácio', page: pageCounter++ },
      { title: 'Introdução', page: pageCounter++ },
    ];

    // Parts and chapters
    const partsWithPages: { title: string; page: number; chapters: { title: string; page: number }[] }[] = [];
    
    for (let i = 0; i < bookContent.parts.length; i++) {
      const part = bookContent.parts[i];
      const partPage = pageCounter++;
      const chapters: { title: string; page: number }[] = [];
      
      for (const chapter of part.chapters) {
        chapters.push({ title: chapter.title, page: pageCounter++ });
      }
      
      partsWithPages.push({ title: part.title, page: partPage, chapters });
    }

    // Draw TOC entries
    pdf.setFontSize(10);
    
    // Front matter
    frontMatterItems.forEach(item => {
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...darkColor);
      const normalizedTitle = normalizeText(item.title);
      pdf.text(normalizedTitle, margin, y);
      pdf.text(String(item.page), pageWidth - margin, y, { align: 'right' });
      // Dotted line
      pdf.setDrawColor(...grayColor);
      pdf.setLineDashPattern([1, 1], 0);
      const textWidth = pdf.getTextWidth(normalizedTitle);
      const pageNumWidth = pdf.getTextWidth(String(item.page));
      pdf.line(margin + textWidth + 3, y - 1, pageWidth - margin - pageNumWidth - 3, y - 1);
      pdf.setLineDashPattern([], 0);
      y += 6;
    });

    y += 4;

    // Parts and chapters
    partsWithPages.forEach(part => {
      if (y > pageHeight - 40) {
        addPage(true);
        y = 30;
      }
      
      // Part title
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...goldColor);
      pdf.setFontSize(10);
      const partLines = pdf.splitTextToSize(normalizeText(part.title), contentWidth - 30);
      partLines.forEach((line: string, idx: number) => {
        pdf.text(line, margin, y);
        if (idx === partLines.length - 1) {
          pdf.text(String(part.page), pageWidth - margin, y, { align: 'right' });
        }
        y += 5;
      });
      y += 2;
      
      // Chapters
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...darkColor);
      pdf.setFontSize(9);
      
      part.chapters.forEach(chapter => {
        if (y > pageHeight - 25) {
          addPage(true);
          y = 30;
        }
        
        const chapterLines = pdf.splitTextToSize(normalizeText(chapter.title), contentWidth - 45);
        chapterLines.forEach((line: string, idx: number) => {
          pdf.text(`   ${line}`, margin, y);
          if (idx === chapterLines.length - 1) {
            pdf.text(String(chapter.page), pageWidth - margin, y, { align: 'right' });
          }
          y += 4.5;
        });
      });
      
      y += 4;
    });

    // About author
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...darkColor);
    pdf.setFontSize(10);
    const aboutPage = pageCounter;
    pdf.text('Sobre o Autor', margin, y);
    pdf.text(String(aboutPage), pageWidth - margin, y, { align: 'right' });

    addPageNumber();

    // ========== DEDICATION ==========
    addPage();
    y = 45;
    addSectionTitle('DEDICATÓRIA');
    y += 8;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(...darkColor);
    const dedicationLines = pdf.splitTextToSize(normalizeText(bookContent.frontMatter.dedication), contentWidth - 30);
    dedicationLines.forEach((line: string) => {
      pdf.text(line, pageWidth / 2, y, { align: 'center' });
      y += 5;
    });
    addPageNumber();

    // ========== ACKNOWLEDGMENTS ==========
    addPage();
    y = 35;
    addSectionTitle('AGRADECIMENTOS');
    addText(bookContent.frontMatter.acknowledgments, 9);
    addPageNumber();

    // ========== PREFACE ==========
    addPage();
    y = 35;
    addSectionTitle('PREFÁCIO');
    addText(bookContent.frontMatter.preface, 9);
    addPageNumber();

    // ========== INTRODUCTION ==========
    addPage();
    y = 35;
    addSectionTitle('INTRODUÇÃO');
    addText(bookContent.frontMatter.introduction, 9);
    addPageNumber();

    // ========== PARTS AND CHAPTERS ==========
    for (let partIndex = 0; partIndex < bookContent.parts.length; partIndex++) {
      const part = bookContent.parts[partIndex];
      currentPartTitle = normalizeText(part.title);
      await addPartPage(part.title, partIndex);
      
      for (const chapter of part.chapters) {
        addPage(false, true);
        y = 35;
        addChapterTitle(chapter.title, true);
        addText(chapter.content, 9, darkColor, true);
        addPageNumber();
      }
    }

    // ========== RECOMMENDED READINGS ==========
    addPage(false, true);
    y = 35;
    currentChapterTitle = 'Leituras Recomendadas';
    addSectionTitle('LEITURAS RECOMENDADAS');
    y += 5;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...darkColor);
    pdf.text(normalizeText('Para aprofundar seus conhecimentos sobre prosperidade biblica, recomendamos as seguintes leituras:'), margin, y);
    y += 12;
    
    bookContent.recommendedReadings.forEach((reading, idx) => {
      checkPageBreak(20);
      
      // Book number
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...goldColor);
      pdf.text(String(idx + 1) + '.', margin, y);
      
      // Title
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...darkColor);
      pdf.text(normalizeText(reading.title), margin + 8, y);
      y += 5;
      
      // Author
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(...grayColor);
      pdf.text(normalizeText('por ' + reading.author), margin + 8, y);
      y += 5;
      
      // Description
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...darkColor);
      pdf.text(normalizeText(reading.description), margin + 8, y);
      y += 10;
    });
    
    addPageNumber();

    // ========== BACK COVER (Professional) ==========
    addPage(true, true);
    
    // Dark background for back cover
    pdf.setFillColor(15, 25, 45);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Decorative border
    pdf.setDrawColor(...goldColor);
    pdf.setLineWidth(1);
    pdf.rect(10, 10, pageWidth - 20, pageHeight - 20, 'S');
    pdf.setLineWidth(0.3);
    pdf.rect(14, 14, pageWidth - 28, pageHeight - 28, 'S');
    
    y = 30;
    
    // Book title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...goldColor);
    pdf.text(normalizeText(bookContent.title.toUpperCase()), pageWidth / 2, y, { align: 'center' });
    y += 10;
    
    // Decorative line
    pdf.setLineWidth(0.5);
    pdf.line(pageWidth / 2 - 30, y, pageWidth / 2 + 30, y);
    y += 15;
    
    // Synopsis
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(200, 200, 210);
    const synopsisLines = pdf.splitTextToSize(normalizeText(bookContent.backCover.synopsis), contentWidth - 20);
    synopsisLines.forEach((line: string) => {
      pdf.text(line, pageWidth / 2, y, { align: 'center' });
      y += 5;
    });
    
    y += 10;
    
    // Endorsement box
    pdf.setFillColor(25, 35, 55);
    pdf.setDrawColor(...goldColor);
    pdf.setLineWidth(0.3);
    const endorseLines = pdf.splitTextToSize(normalizeText(bookContent.backCover.endorsement), contentWidth - 40);
    const endorseHeight = endorseLines.length * 5 + 10;
    pdf.roundedRect(margin + 10, y, contentWidth - 20, endorseHeight, 2, 2, 'FD');
    
    y += 8;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(220, 200, 150);
    endorseLines.forEach((line: string) => {
      pdf.text(line, pageWidth / 2, y, { align: 'center' });
      y += 5;
    });
    
    y += endorseHeight - endorseLines.length * 5 + 10;
    
    // Author photo and bio (small)
    try {
      const authorImg = await loadImage(authorPhoto);
      const imgSize = 30;
      pdf.setFillColor(...goldColor);
      pdf.circle(pageWidth / 2, y + imgSize / 2, imgSize / 2 + 2, 'F');
      pdf.addImage(authorImg, 'JPEG', pageWidth / 2 - imgSize / 2, y, imgSize, imgSize);
      y += imgSize + 8;
    } catch (e) {
      y += 10;
    }
    
    // Author name
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...goldColor);
    pdf.text(normalizeText(bookContent.author), pageWidth / 2, y, { align: 'center' });
    y += 6;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(180, 180, 190);
    pdf.text('Escritor, Conferencista e Mentor', pageWidth / 2, y, { align: 'center' });
    
    // ISBN and barcode area at bottom
    y = pageHeight - 40;
    pdf.setFillColor(255, 255, 255);
    pdf.rect(pageWidth / 2 - 35, y, 70, 25, 'F');
    
    // Simulated barcode lines
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    for (let i = 0; i < 30; i++) {
      const barX = pageWidth / 2 - 30 + i * 2;
      const barHeight = Math.random() > 0.3 ? 15 : 12;
      pdf.line(barX, y + 3, barX, y + 3 + barHeight);
    }
    
    // ISBN text
    pdf.setFontSize(7);
    pdf.setTextColor(0, 0, 0);
    pdf.text(normalizeText('ISBN: ' + bookContent.isbn), pageWidth / 2, y + 22, { align: 'center' });

    pdf.save('Prosperar-Segundo-a-Palavra-Rodrigo-Adriani.pdf');
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft size={20} />
            Voltar
          </Button>
          <Button onClick={generatePDF} disabled={isGenerating} className="gap-2 bg-gold hover:bg-gold/90 text-primary-foreground">
            {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
            {isGenerating ? 'Gerando PDF...' : 'Baixar Livro (PDF)'}
          </Button>
        </div>
      </header>

      <main className="container py-12 max-w-5xl">
        <div className="flex flex-col lg:flex-row gap-12 items-center mb-16">
          {/* Book Cover Image */}
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-gold/20 to-transparent rounded-lg blur-xl"></div>
              <img 
                src={bookCover} 
                alt="Capa do Livro Prosperar Segundo a Palavra" 
                className="relative w-64 md:w-80 rounded-lg shadow-2xl border-2 border-gold/30"
              />
            </div>
          </div>
          
          {/* Book Info */}
          <div className="text-center lg:text-left flex-1">
            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gold via-amber-400 to-gold bg-clip-text text-transparent mb-6 leading-tight tracking-tight">
              Prosperar Segundo a Palavra
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-6 max-w-2xl leading-relaxed">
              {bookContent.subtitle}
            </p>
            <div className="flex items-center justify-center lg:justify-start gap-2 text-gold font-semibold text-lg mb-8">
              <span className="w-8 h-px bg-gold/50"></span>
              <span>Por {bookContent.author}</span>
              <span className="w-8 h-px bg-gold/50"></span>
            </div>
            <Button 
              onClick={generatePDF} 
              disabled={isGenerating} 
              size="lg"
              className="gap-2 bg-gold hover:bg-gold/90 text-primary-foreground font-semibold shadow-lg"
            >
              {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
              {isGenerating ? 'Gerando PDF...' : 'Baixar Livro Completo (PDF)'}
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 md:p-8 border border-border mb-8">
          <h2 className="font-display text-xl font-semibold mb-4">Sobre o Livro</h2>
          <p className="text-muted-foreground leading-relaxed">
            Este livro completo de mais de 150 páginas ensina como prosperar segundo princípios bíblicos, 
            transformando mentalidade, vida financeira e propósito. Inclui planos práticos de 30, 90 dias e 1 ano.
          </p>
        </div>

        <div className="bg-card rounded-lg p-6 md:p-8 border border-border">
          <h2 className="font-display text-xl font-semibold mb-4">Conteúdo</h2>
          <ul className="space-y-3">
            {bookContent.parts.map((part, i) => (
              <li key={i}>
                <p className="font-medium text-gold">{part.title}</p>
                <ul className="ml-4 mt-1 space-y-1">
                  {part.chapters.map((ch, j) => (
                    <li key={j} className="text-sm text-muted-foreground">• {ch.title}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
