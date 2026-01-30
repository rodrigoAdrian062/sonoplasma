import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { bookContent } from '@/data/bookContent';
import jsPDF from 'jspdf';
import bookCover from '@/assets/book-cover.jpg';

export default function Livro() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    const lineHeight = 5;
    let y = margin;

    // Colors
    const goldColor: [number, number, number] = [184, 134, 11];
    const darkColor: [number, number, number] = [40, 40, 40];
    const grayColor: [number, number, number] = [100, 100, 100];

    const addPage = () => {
      pdf.addPage();
      y = margin;
    };

    const checkPageBreak = (neededSpace: number) => {
      if (y + neededSpace > pageHeight - margin) {
        addPage();
      }
    };

    const addText = (text: string, fontSize: number = 9, color: [number, number, number] = darkColor) => {
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...color);
      const lines = pdf.splitTextToSize(text, contentWidth);
      lines.forEach((line: string) => {
        checkPageBreak(lineHeight);
        pdf.text(line, margin, y);
        y += lineHeight;
      });
      y += 2;
    };

    const addCenteredText = (text: string, fontSize: number = 10, isBold: boolean = false, color: [number, number, number] = darkColor) => {
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
      pdf.setTextColor(...color);
      const lines = pdf.splitTextToSize(text, contentWidth - 10);
      lines.forEach((line: string) => {
        checkPageBreak(lineHeight + 2);
        pdf.text(line, pageWidth / 2, y, { align: 'center' });
        y += lineHeight + 1;
      });
    };

    const addSectionTitle = (text: string) => {
      checkPageBreak(18);
      y += 6;
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...goldColor);
      pdf.text(text, pageWidth / 2, y, { align: 'center' });
      y += 3;
      // Decorative line
      pdf.setDrawColor(...goldColor);
      pdf.setLineWidth(0.4);
      const lineWidth = Math.min(pdf.getTextWidth(text) + 16, contentWidth - 20);
      pdf.line((pageWidth - lineWidth) / 2, y, (pageWidth + lineWidth) / 2, y);
      y += 8;
    };

    const addChapterTitle = (text: string) => {
      checkPageBreak(16);
      y += 4;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...darkColor);
      
      // Split long titles
      const lines = pdf.splitTextToSize(text, contentWidth);
      lines.forEach((line: string) => {
        pdf.text(line, margin, y);
        y += 5;
      });
      y += 4;
    };

    const addPartPage = (title: string) => {
      addPage();
      y = pageHeight / 2 - 15;
      
      // Decorative line above
      pdf.setDrawColor(...goldColor);
      pdf.setLineWidth(0.8);
      pdf.line(pageWidth / 2 - 35, y - 12, pageWidth / 2 + 35, y - 12);
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...goldColor);
      
      // Split long part titles
      const lines = pdf.splitTextToSize(title, contentWidth - 20);
      lines.forEach((line: string) => {
        pdf.text(line, pageWidth / 2, y, { align: 'center' });
        y += 8;
      });
      
      // Decorative line below
      pdf.line(pageWidth / 2 - 35, y + 4, pageWidth / 2 + 35, y + 4);
    };

    // ========== COVER PAGE WITH IMAGE ==========
    // Add cover image
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = bookCover;
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          // Calculate image dimensions to fit the page
          const imgWidth = pageWidth - 40;
          const imgHeight = (img.height / img.width) * imgWidth;
          const imgX = (pageWidth - imgWidth) / 2;
          const imgY = 20;
          
          pdf.addImage(img, 'JPEG', imgX, imgY, imgWidth, Math.min(imgHeight, 120));
          resolve();
        };
        img.onerror = () => reject();
      });
    } catch (e) {
      console.log('Could not load cover image');
    }
    
    // Title below image
    y = 150;
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...goldColor);
    pdf.text('PROSPERAR', pageWidth / 2, y, { align: 'center' });
    y += 10;
    pdf.text('SEGUNDO A PALAVRA', pageWidth / 2, y, { align: 'center' });
    
    y += 14;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...grayColor);
    const subtitleLines = pdf.splitTextToSize(bookContent.subtitle, contentWidth - 20);
    subtitleLines.forEach((line: string) => {
      pdf.text(line, pageWidth / 2, y, { align: 'center' });
      y += 5;
    });

    y += 15;
    // Ornamental divider
    pdf.setDrawColor(...goldColor);
    pdf.setLineWidth(0.4);
    pdf.line(pageWidth / 2 - 25, y, pageWidth / 2 - 8, y);
    pdf.circle(pageWidth / 2, y, 1.5, 'S');
    pdf.line(pageWidth / 2 + 8, y, pageWidth / 2 + 25, y);
    
    y += 12;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...darkColor);
    pdf.text(bookContent.author, pageWidth / 2, y, { align: 'center' });
    
    y += 8;
    pdf.setFontSize(9);
    pdf.setTextColor(...grayColor);
    pdf.text(bookContent.year, pageWidth / 2, y, { align: 'center' });

    // ========== COPYRIGHT PAGE ==========
    addPage();
    y = pageHeight / 2 - 25;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...grayColor);
    const copyrightLines = pdf.splitTextToSize(bookContent.frontMatter.copyright, contentWidth - 20);
    copyrightLines.forEach((line: string) => {
      pdf.text(line, pageWidth / 2, y, { align: 'center' });
      y += 4;
    });

    // ========== DEDICATION ==========
    addPage();
    y = 45;
    addSectionTitle('DEDICATÓRIA');
    y += 8;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(...darkColor);
    const dedicationLines = pdf.splitTextToSize(bookContent.frontMatter.dedication, contentWidth - 30);
    dedicationLines.forEach((line: string) => {
      pdf.text(line, pageWidth / 2, y, { align: 'center' });
      y += 5;
    });

    // ========== ACKNOWLEDGMENTS ==========
    addPage();
    y = 35;
    addSectionTitle('AGRADECIMENTOS');
    addText(bookContent.frontMatter.acknowledgments, 9);

    // ========== PREFACE ==========
    addPage();
    y = 35;
    addSectionTitle('PREFÁCIO');
    addText(bookContent.frontMatter.preface, 9);

    // ========== INTRODUCTION ==========
    addPage();
    y = 35;
    addSectionTitle('INTRODUÇÃO');
    addText(bookContent.frontMatter.introduction, 9);

    // ========== PARTS AND CHAPTERS ==========
    for (const part of bookContent.parts) {
      addPartPage(part.title);
      
      for (const chapter of part.chapters) {
        addPage();
        y = 35;
        addChapterTitle(chapter.title);
        addText(chapter.content, 9);
      }
    }

    // ========== ABOUT AUTHOR ==========
    addPage();
    y = 35;
    addSectionTitle('SOBRE O AUTOR');
    addText(bookContent.aboutAuthor.content, 9);
    
    // Final decorative element
    y += 15;
    pdf.setDrawColor(...goldColor);
    pdf.setLineWidth(0.4);
    pdf.line(pageWidth / 2 - 25, y, pageWidth / 2 - 8, y);
    pdf.circle(pageWidth / 2, y, 1.5, 'S');
    pdf.line(pageWidth / 2 + 8, y, pageWidth / 2 + 25, y);

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
