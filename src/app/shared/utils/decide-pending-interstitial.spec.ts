import { decidePendingInterstitial } from './decide-pending-interstitial';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const base = {
  appStartedAt: 0,
  minIntervalMs: 3 * MINUTE,
  firstDelayMs: MINUTE,
  quietMs: 2 * SECOND,
  maxAgeMs: 2 * MINUTE,
  lastShownAt: null,
  resumedAt: null,
};

describe('decidePendingInterstitial', () => {
  it('does nothing when there is no pending opportunity', () => {
    expect(decidePendingInterstitial({ ...base, now: 10 * MINUTE, opportunityAt: null })).toBe('none');
  });

  it('shows it at the next transition once the quiet time has passed', () => {
    expect(
      decidePendingInterstitial({ ...base, now: 5 * MINUTE + 2 * SECOND, opportunityAt: 5 * MINUTE }),
    ).toBe('show');
  });

  it('waits right after the share or save (lets the toast be read)', () => {
    expect(
      decidePendingInterstitial({ ...base, now: 5 * MINUTE + SECOND, opportunityAt: 5 * MINUTE }),
    ).toBe('wait');
  });

  it('waits right after returning to the app, even if the opportunity is older', () => {
    expect(
      decidePendingInterstitial({
        ...base,
        opportunityAt: 5 * MINUTE,
        resumedAt: 6 * MINUTE,
        now: 6 * MINUTE + SECOND,
      }),
    ).toBe('wait');
    expect(
      decidePendingInterstitial({
        ...base,
        opportunityAt: 5 * MINUTE,
        resumedAt: 6 * MINUTE,
        now: 6 * MINUTE + 2 * SECOND,
      }),
    ).toBe('show');
  });

  it('ignores an old return to the app', () => {
    expect(
      decidePendingInterstitial({
        ...base,
        resumedAt: MINUTE,
        opportunityAt: 5 * MINUTE,
        now: 5 * MINUTE + 3 * SECOND,
      }),
    ).toBe('show');
  });

  it('discards it when the frequency limit does not allow it', () => {
    expect(
      decidePendingInterstitial({
        ...base,
        lastShownAt: 4 * MINUTE,
        opportunityAt: 5 * MINUTE,
        now: 5 * MINUTE + 3 * SECOND,
      }),
    ).toBe('discard');
  });

  it('discards it during the first delay after starting the app', () => {
    expect(
      decidePendingInterstitial({ ...base, opportunityAt: 10 * SECOND, now: 20 * SECOND }),
    ).toBe('discard');
  });

  it('still shows it right at the maximum age', () => {
    expect(
      decidePendingInterstitial({ ...base, opportunityAt: 5 * MINUTE, now: 7 * MINUTE }),
    ).toBe('show');
  });

  it('discards an opportunity older than the maximum age', () => {
    expect(
      decidePendingInterstitial({ ...base, opportunityAt: 5 * MINUTE, now: 7 * MINUTE + 1 }),
    ).toBe('discard');
  });

  it('discards an expired opportunity even right after returning to the app', () => {
    expect(
      decidePendingInterstitial({
        ...base,
        opportunityAt: 5 * MINUTE,
        resumedAt: 8 * MINUTE,
        now: 8 * MINUTE + SECOND,
      }),
    ).toBe('discard');
  });
});
