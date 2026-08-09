import { Header } from "@/components/Header";
import { MasonicFooter } from "@/components/MasonicFooter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, FileText, Layout } from "lucide-react";

const Acervo = () => {
  const items = [
    {
      title: "Artigos",
      description: "Textos, estudos e pesquisas sobre ritualística e história.",
      icon: <FileText className="w-8 h-8 text-gold" />,
      link: "#",
    },
    {
      title: "Peças de Arquitetura",
      description: "Trabalhos, pranchas e apresentações formais.",
      icon: <Layout className="w-8 h-8 text-gold" />,
      link: "#",
    },
    {
      title: "Outros",
      description: "Documentos diversos, manuais e referências complementares.",
      icon: <BookOpen className="w-8 h-8 text-gold" />,
      link: "#",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header onAddStage={() => {}} />
      <main className="container px-4 py-8 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">Acervo</h1>
          <p className="text-muted-foreground mt-2">
            Biblioteca de documentos, artigos e peças de arquitetura.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {items.map((item, index) => (
            <a 
              key={index} 
              href={item.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block group"
            >
              <Card className="h-full bg-card/50 backdrop-blur-sm border-border/40 hover:border-gold/40 transition-all duration-300 hover:-translate-y-1">
                <CardHeader>
                  <div className="mb-4 p-3 bg-gold/10 rounded-xl w-fit group-hover:bg-gold/20 transition-colors">
                    {item.icon}
                  </div>
                  <CardTitle className="group-hover:text-gold transition-colors">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-xs text-gold font-medium uppercase tracking-wider">Acessar conteúdo</span>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </main>
      <MasonicFooter />
    </div>
  );
};

export default Acervo;
