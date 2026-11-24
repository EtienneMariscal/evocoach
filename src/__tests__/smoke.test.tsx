import { render, screen } from '@testing-library/react-native';

import Index from '@/app/index';

describe('smoke', () => {
  it('resuelve el alias @/ y renderiza la pantalla provisional', async () => {
    await render(<Index />);

    expect(screen.getByText('evocoach')).toBeTruthy();
  });
});
