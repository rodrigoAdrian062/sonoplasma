import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Book, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { bookContent } from '@/data/bookContent';
import jsPDF from 'jspdf';

export default function Livro() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 25;
    const contentWidth = pageWidth - 2 * margin;
    const lineHeight = 6;
    let y = margin;

    // Colors
    const goldColor: [number, number, number] = [184, 134, 11];
    const darkColor: [number, number, number] = [30, 30, 30];
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

    const addText = (text: string, fontSize: number = 11, color: [number, number, number] = darkColor) => {
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

    const addCenteredText = (text: string, fontSize: number = 12, isBold: boolean = false, color: [number, number, number] = darkColor) => {
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
      pdf.setTextColor(...color);
      checkPageBreak(lineHeight + 4);
      pdf.text(text, pageWidth / 2, y, { align: 'center' });
      y += lineHeight + 2;
    };

    const addSectionTitle = (text: string) => {
      checkPageBreak(20);
      y += 8;
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...goldColor);
      pdf.text(text, pageWidth / 2, y, { align: 'center' });
      y += 4;
      // Decorative line
      pdf.setDrawColor(...goldColor);
      pdf.setLineWidth(0.5);
      const lineWidth = Math.min(pdf.getTextWidth(text) + 20, contentWidth);
      pdf.line((pageWidth - lineWidth) / 2, y, (pageWidth + lineWidth) / 2, y);
      y += 12;
    };

    const addChapterTitle = (text: string) => {
      checkPageBreak(20);
      y += 6;
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...darkColor);
      pdf.text(text, margin, y);
      y += 10;
    };

    const addPartPage = (title: string) => {
      addPage();
      y = pageHeight / 2 - 20;
      
      // Decorative line above
      pdf.setDrawColor(...goldColor);
      pdf.setLineWidth(1);
      pdf.line(pageWidth / 2 - 40, y - 15, pageWidth / 2 + 40, y - 15);
      
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...goldColor);
      pdf.text(title, pageWidth / 2, y, { align: 'center' });
      
      // Decorative line below
      pdf.line(pageWidth / 2 - 40, y + 10, pageWidth / 2 + 40, y + 10);
    };

    // ========== COVER PAGE ==========
    // Background rectangle
    pdf.setFillColor(250, 248, 245);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Top decorative border
    pdf.setDrawColor(...goldColor);
    pdf.setLineWidth(2);
    pdf.line(margin, 20, pageWidth - margin, 20);
    pdf.setLineWidth(0.5);
    pdf.line(margin, 24, pageWidth - margin, 24);
    
    y = 70;
    pdf.setFontSize(32);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...goldColor);
    pdf.text('PROSPERAR', pageWidth / 2, y, { align: 'center' });
    y += 14;
    pdf.text('SEGUNDO A PALAVRA', pageWidth / 2, y, { align: 'center' });
    
    y += 20;
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...grayColor);
    const subtitleLines = pdf.splitTextToSize(bookContent.subtitle, contentWidth - 20);
    subtitleLines.forEach((line: string) => {
      pdf.text(line, pageWidth / 2, y, { align: 'center' });
      y += 7;
    });

    y += 30;
    // Ornamental divider
    pdf.setDrawColor(...goldColor);
    pdf.setLineWidth(0.5);
    pdf.line(pageWidth / 2 - 30, y, pageWidth / 2 - 10, y);
    pdf.circle(pageWidth / 2, y, 2, 'S');
    pdf.line(pageWidth / 2 + 10, y, pageWidth / 2 + 30, y);
    
    y += 25;
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...darkColor);
    pdf.text(bookContent.author, pageWidth / 2, y, { align: 'center' });
    
    y += 10;
    pdf.setFontSize(11);
    pdf.setTextColor(...grayColor);
    pdf.text(bookContent.year, pageWidth / 2, y, { align: 'center' });
    
    // Bottom decorative border
    pdf.setDrawColor(...goldColor);
    pdf.setLineWidth(0.5);
    pdf.line(margin, pageHeight - 24, pageWidth - margin, pageHeight - 24);
    pdf.setLineWidth(2);
    pdf.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);

    // ========== COPYRIGHT PAGE ==========
    addPage();
    y = pageHeight / 2 - 30;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...grayColor);
    const copyrightLines = pdf.splitTextToSize(bookContent.frontMatter.copyright, contentWidth);
    copyrightLines.forEach((line: string) => {
      pdf.text(line, pageWidth / 2, y, { align: 'center' });
      y += 5;
    });

    // ========== DEDICATION ==========
    addPage();
    y = 50;
    addSectionTitle('DEDICATÓRIA');
    y += 10;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(...darkColor);
    const dedicationLines = pdf.splitTextToSize(bookContent.frontMatter.dedication, contentWidth - 40);
    dedicationLines.forEach((line: string) => {
      pdf.text(line, pageWidth / 2, y, { align: 'center' });
      y += 7;
    });

    // ========== ACKNOWLEDGMENTS ==========
    addPage();
    y = 40;
    addSectionTitle('AGRADECIMENTOS');
    addText(bookContent.frontMatter.acknowledgments);

    // ========== PREFACE ==========
    addPage();
    y = 40;
    addSectionTitle('PREFÁCIO');
    addText(bookContent.frontMatter.preface);

    // ========== INTRODUCTION ==========
    addPage();
    y = 40;
    addSectionTitle('INTRODUÇÃO');
    addText(bookContent.frontMatter.introduction);

    // ========== PARTS AND CHAPTERS ==========
    for (const part of bookContent.parts) {
      addPartPage(part.title);
      
      for (const chapter of part.chapters) {
        addPage();
        y = 40;
        addChapterTitle(chapter.title);
        addText(chapter.content);
      }
    }

    // ========== ABOUT AUTHOR ==========
    addPage();
    y = 40;
    addSectionTitle('SOBRE O AUTOR');
    addText(bookContent.aboutAuthor.content);
    
    // Final decorative element
    y += 20;
    pdf.setDrawColor(...goldColor);
    pdf.setLineWidth(0.5);
    pdf.line(pageWidth / 2 - 30, y, pageWidth / 2 - 10, y);
    pdf.circle(pageWidth / 2, y, 2, 'S');
    pdf.line(pageWidth / 2 + 10, y, pageWidth / 2 + 30, y);

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

      <main className="container py-12 max-w-4xl">
        <div className="text-center mb-16">
          <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-gold/30 to-gold/10 rounded-full flex items-center justify-center shadow-lg border border-gold/20">
            <Book className="text-gold drop-shadow-md" size={56} />
          </div>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-gold via-amber-400 to-gold bg-clip-text text-transparent mb-6 leading-tight tracking-tight">
            Prosperar Segundo a Palavra
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-4 max-w-2xl mx-auto leading-relaxed">
            {bookContent.subtitle}
          </p>
          <div className="flex items-center justify-center gap-2 text-gold font-semibold text-lg">
            <span className="w-8 h-px bg-gold/50"></span>
            <span>Por {bookContent.author}</span>
            <span className="w-8 h-px bg-gold/50"></span>
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
