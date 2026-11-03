import { canShowInterstitial } from './can-show-interstitial';

const MINUTE = 60 * 1000;
const base = { appStartedAt: 0, minIntervalMs: 3 * MINUTE, firstDelayMs: MINUTE };

describe('canShowInterstitial', () => {
  it('does not show anything right after the app starts', () => {
    expect(canShowInterstitial({ ...base, now: 0, lastShownAt: null })).toBe(false);
    expect(canShowInterstitial({ ...base, now: MINUTE - 1, lastShownAt: null })).toBe(false);
  });

  it('shows the first one once the initial delay has passed', () => {
    expect(canShowInterstitial({ ...base, now: MINUTE, lastShownAt: null })).toBe(true);
  });

  it('waits the minimum interval since the last one', () => {
    const lastShownAt = 2 * MINUTE;

    expect(canShowInterstitial({ ...base, now: lastShownAt + 3 * MINUTE - 1, lastShownAt })).toBe(
      false,
    );
    expect(canShowInterstitial({ ...base, now: lastShownAt + 3 * MINUTE, lastShownAt })).toBe(true);
  });

  it('respects the initial delay even if the interval has passed', () => {
    expect(
      canShowInterstitial({
        ...base,
        appStartedAt: 10 * MINUTE,
        now: 10 * MINUTE + 1,
        lastShownAt: 0,
      }),
    ).toBe(false);
  });
});
