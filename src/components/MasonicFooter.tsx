import { useState, useEffect } from 'react';

const MASONIC_QUOTES = [
  "Conhece-te a ti mesmo e conhecerás o universo e os deuses.",
  "A verdadeira luz é aquela que ilumina o interior do homem.",
  "Desbastar a pedra bruta é o primeiro dever do maçom.",
  "A tolerância é a virtude que torna a paz possível.",
  "Livre pensar é só pensar.",
  "O silêncio é a primeira pedra do templo da sabedoria.",
  "A caridade é o cimento que une os irmãos.",
  "Ordo ab chao — A ordem nasce do caos.",
  "O esquadro e o compasso guiam nossas ações.",
  "Faz ao próximo o que queres que te façam.",
  "A virtude é a estrela que guia o maçom na escuridão.",
  "O trabalho é a oração do maçom.",
  "A fraternidade é o laço invisível que une os corações.",
  "Saber, querer, ousar e calar.",
  "A perfeição se alcança polindo a pedra interior.",
  "Vitriol — Visita o interior da terra e encontrarás a pedra oculta.",
  "A luz não se dá, conquista-se.",
  "Cada grau é um degrau na escada de Jacó.",
  "O avental é o símbolo do trabalho e da dignidade.",
  "A verdade é a argamassa que sustenta o templo.",
];

export function MasonicFooter() {
  const [quoteIndex, setQuoteIndex] = useState(() =>
    Math.floor(Math.random() * MASONIC_QUOTES.length)
  );
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setQuoteIndex((prev) => {
          let next: number;
          do {
            next = Math.floor(Math.random() * MASONIC_QUOTES.length);
          } while (next === prev && MASONIC_QUOTES.length > 1);
          return next;
        });
        setFade(true);
      }, 500);
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="mt-auto pt-12 py-6 border-t border-border space-y-3">
      <p
        className={`text-center text-xs italic text-gold/60 px-4 transition-opacity duration-500 ${
          fade ? 'opacity-100' : 'opacity-0'
        }`}
      >
        "{MASONIC_QUOTES[quoteIndex]}"
      </p>
      <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
        Desenvolvido com <span className="text-red-500">❤</span> pelo Ir∴ Rodrigo Adriano
      </p>
    </footer>
  );
}
