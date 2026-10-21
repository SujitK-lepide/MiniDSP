import { describe, expect, it } from 'vitest';

describe('test harness', () => {
  it('runs vitest with jsdom and jest-dom matchers', () => {
    const el = document.createElement('p');
    el.textContent = 'MiniDSP';
    document.body.appendChild(el);
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('MiniDSP');
  });
});
