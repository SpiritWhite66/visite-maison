export abstract class CompressionPhotoPort {
  /** Réduit et recompresse une image en JPEG. */
  abstract compresser(fichier: Blob): Promise<Blob>;
}
