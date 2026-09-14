export interface Dimensions {
  width: number;
  height: number;
}

export function calculateTargetDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth = 1600,
): Dimensions {
  if (originalWidth <= maxWidth) {
    return { width: originalWidth, height: originalHeight };
  }
  const ratio = maxWidth / originalWidth;
  return { width: maxWidth, height: Math.round(originalHeight * ratio) };
}

export function compressImageFile(
  file: File,
  quality = 0.75,
  maxWidth = 1600,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler o arquivo"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Falha ao carregar a imagem"));
      img.onload = () => {
        const { width, height } = calculateTargetDimensions(img.width, img.height, maxWidth);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas 2D context indisponível"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
