import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import i18n from '@/i18n';
import { MoneyInput } from './Form';

function Harness({ initial }: { initial?: number }) {
  const [value, setValue] = useState<number | undefined>(initial);
  return (
    <>
      <MoneyInput aria-label="price" value={value} onChange={setValue} />
      <output data-testid="value">{value === undefined ? 'empty' : String(value)}</output>
    </>
  );
}

describe('MoneyInput', () => {
  afterEach(() => i18n.changeLanguage('vi'));

  it('groups thousands with dots in Vietnamese while typing and keeps the raw number', async () => {
    await i18n.changeLanguage('vi');
    render(<Harness />);
    await userEvent.type(screen.getByLabelText('price'), '1250000');
    expect(screen.getByLabelText('price')).toHaveValue('1.250.000');
    expect(screen.getByTestId('value')).toHaveTextContent('1250000');
  });

  it('groups thousands with commas in English', async () => {
    await i18n.changeLanguage('en');
    render(<Harness />);
    await userEvent.type(screen.getByLabelText('price'), '8500');
    expect(screen.getByLabelText('price')).toHaveValue('8,500');
  });

  it('ignores letters, and clearing the field gives no value', async () => {
    render(<Harness initial={42000} />);
    const input = screen.getByLabelText('price');
    expect(input).toHaveValue('42.000');
    await userEvent.type(input, 'abc');
    expect(input).toHaveValue('42.000');
    await userEvent.clear(input);
    expect(input).toHaveValue('');
    expect(screen.getByTestId('value')).toHaveTextContent('empty');
  });

  it('removes the digit before a separator on backspace', async () => {
    render(<Harness initial={1250000} />);
    const input = screen.getByLabelText('price') as HTMLInputElement;
    // Caret right after the first separator: "1.|250.000".
    await userEvent.click(input);
    input.setSelectionRange(2, 2);
    await userEvent.keyboard('{Backspace}');
    expect(input).toHaveValue('250.000');
  });
});
