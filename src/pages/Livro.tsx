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
    const margin = 20;
    const lineHeight = 7;
    let y = margin;

    const addPage = () => {
      pdf.addPage();
      y = margin;
    };

    const checkPageBreak = (neededSpace: number) => {
      if (y + neededSpace > pageHeight - margin) {
        addPage();
      }
    };

    const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
      const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin);
      lines.forEach((line: string) => {
        checkPageBreak(lineHeight);
        pdf.text(line, margin, y);
        y += lineHeight;
      });
    };

    const addCenteredText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
      checkPageBreak(lineHeight);
      pdf.text(text, pageWidth / 2, y, { align: 'center' });
      y += lineHeight;
    };

    // Cover Page
    y = 60;
    addCenteredText(bookContent.title, 28, true);
    y += 10;
    addCenteredText(bookContent.subtitle, 14);
    y += 40;
    addCenteredText(`Por ${bookContent.author}`, 16);
    y += 10;
    addCenteredText(bookContent.year, 12);

    // Copyright
    addPage();
    addText(bookContent.frontMatter.copyright, 10);

    // Dedication
    addPage();
    addCenteredText('DEDICATÓRIA', 18, true);
    y += 15;
    addText(bookContent.frontMatter.dedication);

    // Acknowledgments
    addPage();
    addCenteredText('AGRADECIMENTOS', 18, true);
    y += 15;
    addText(bookContent.frontMatter.acknowledgments);

    // Preface
    addPage();
    addCenteredText('PREFÁCIO', 18, true);
    y += 15;
    addText(bookContent.frontMatter.preface);

    // Introduction
    addPage();
    addCenteredText('INTRODUÇÃO', 18, true);
    y += 15;
    addText(bookContent.frontMatter.introduction);

    // Parts and Chapters
    for (const part of bookContent.parts) {
      addPage();
      y = 80;
      addCenteredText(part.title, 20, true);
      
      for (const chapter of part.chapters) {
        addPage();
        addCenteredText(chapter.title, 16, true);
        y += 10;
        addText(chapter.content);
      }
    }

    // About Author
    addPage();
    addCenteredText('SOBRE O AUTOR', 18, true);
    y += 15;
    addText(bookContent.aboutAuthor.content);

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
