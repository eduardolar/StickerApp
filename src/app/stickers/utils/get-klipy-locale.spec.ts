import { getKlipyLocale } from './get-klipy-locale';

describe('getKlipyLocale', () => {
  it('returns the region of the language in lower case', () => {
    expect(getKlipyLocale('es-ES')).toBe('es');
    expect(getKlipyLocale('es-MX')).toBe('mx');
    expect(getKlipyLocale('en-US')).toBe('us');
    expect(getKlipyLocale('zh-Hans-CN')).toBe('cn');
  });

  it('falls back to "es" when the language has no country', () => {
    expect(getKlipyLocale('en')).toBe('es');
    // 419 = Latinoamérica: es una región numérica, no un país
    expect(getKlipyLocale('es-419')).toBe('es');
    expect(getKlipyLocale(undefined)).toBe('es');
    expect(getKlipyLocale('')).toBe('es');
  });

  it('falls back to "es" when the language tag is not valid', () => {
    expect(getKlipyLocale('no es un idioma')).toBe('es');
  });
});
