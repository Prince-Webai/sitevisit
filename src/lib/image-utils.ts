export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.7
): Promise<File> {
  return new Promise((resolve, reject) => {
    // Prevent infinite hang on unsupported formats (e.g. HEIC on non-Safari browsers)
    const timer = setTimeout(() => reject(new Error('Image processing timed out')), 15000);
    const done = (result: File | Error) => {
      clearTimeout(timer);
      result instanceof Error ? reject(result) : resolve(result);
    };

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          done(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              done(new Error('Could not create blob from canvas'));
              return;
            }
            done(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => done(new Error('Failed to decode image'));
    };
    reader.onerror = () => done(new Error('Failed to read file'));
  });
}
