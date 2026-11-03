import { blobToBase64 } from './blob-to-base64';

describe('blobToBase64', () => {
  it('returns the content in base64 without the data URL prefix', async () => {
    const result = await blobToBase64(new Blob(['hola'], { type: 'image/gif' }));

    expect(result).toBe('aG9sYQ==');
  });

  it('works with files that have no type', async () => {
    const result = await blobToBase64(new File(['sticker'], 'sticker.gif'));

    expect(result).toBe(btoa('sticker'));
  });

  it('returns an empty string for an empty blob', async () => {
    const result = await blobToBase64(new Blob([]));

    expect(result).toBe('');
  });
});
