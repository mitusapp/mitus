// src/lib/imageCompression.js
export async function compressImageToWeb(file, { maxDim = 2048, quality = 0.80, type = 'image/webp' } = {}) {
  const loadInput = async (f) => {
    try { return await createImageBitmap(f); } catch {
      const url = URL.createObjectURL(f);
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      try { URL.revokeObjectURL(url); } catch {}
      return img;
    }
  };
  const bmp = await loadInput(file);
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const can = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(w, h) : (() => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; })();
  const ctx = can.getContext('2d');
  ctx.drawImage(bmp, 0, 0, w, h);
  const blob = (can.convertToBlob)
    ? await can.convertToBlob({ type, quality })
    : await new Promise((res) => can.toBlob(res, type, quality));
  return { blob, w, h };
}

export async function makeWebAndThumb(file) {
  const web = await compressImageToWeb(file, { maxDim: 2048, quality: 0.80 });
  const thumb = await compressImageToWeb(file, { maxDim: 1200, quality: 0.80 });
  return { web, thumb };
}
