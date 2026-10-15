import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RitualDetailsEditor } from './RitualDetailsEditor';

const harmonyDetails =
  '<p>Texto <span data-ritual-harmony="https://example.com/audio.mp3" data-ritual-harmony-name="Faixa" data-ritual-harmony-label="Antigo">Antigo ▶</span></p>';

describe('ritual harmony buttons in the editor', () => {
  it('allows renaming a harmony button', () => {
    const onChange = vi.fn();
    const { container } = render(
      <RitualDetailsEditor value={harmonyDetails} onChange={onChange} placeholder="Detalhes" />,
    );
    const marker = container.querySelector('[data-ritual-harmony]');
    expect(marker).not.toBeNull();
    fireEvent.click(marker!);

    const labelInput = screen.getByRole('textbox', { name: 'Nome do botão de harmonia' });
    fireEvent.change(labelInput, { target: { value: 'Entrada solene' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nome do botão' }));

    expect(onChange).toHaveBeenLastCalledWith(expect.stringContaining('data-ritual-harmony-label="Entrada solene"'));
    expect(onChange).toHaveBeenLastCalledWith(expect.stringContaining('Entrada solene ▶'));
  });

  it('allows deleting a harmony button without deleting the surrounding text', () => {
    const onChange = vi.fn();
    const { container } = render(
      <RitualDetailsEditor value={harmonyDetails} onChange={onChange} placeholder="Detalhes" />,
    );
    fireEvent.click(container.querySelector('[data-ritual-harmony]')!);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir botão de harmonia' }));

    expect(onChange).toHaveBeenLastCalledWith(expect.stringContaining('Texto'));
    expect(onChange).toHaveBeenLastCalledWith(expect.not.stringContaining('data-ritual-harmony='));
  });
});
