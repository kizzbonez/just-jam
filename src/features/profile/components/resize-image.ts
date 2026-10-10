const SIZE = 256;
const QUALITY = 0.86;

/**
 * Center-crops an image file to a square and re-encodes it as a small JPEG in
 * the browser, so uploads stay tiny and carry no metadata.
 */
export async function resizeToAvatar(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available in this browser.");
  const left = (bitmap.width - side) / 2;
  const top = (bitmap.height - side) / 2;
  context.drawImage(bitmap, left, top, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the image."))),
      "image/jpeg",
      QUALITY,
    );
  });
}
