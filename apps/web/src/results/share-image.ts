/**
 * Hands the image to the menu of the phone to share it, as a file, where the browser can; anywhere
 * else, it downloads it. Whether the player then shares it is up to them.
 */
export async function shareImage(
  blob: Blob,
  fileName: string,
  title: string,
): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], fileName, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (error) {
      // Closing the menu of the phone is not an error.
      if (error instanceof DOMException && error.name === 'AbortError') return 'shared';
      throw error;
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
