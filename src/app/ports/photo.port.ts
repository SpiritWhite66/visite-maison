export abstract class CompressionPhotoPort {
  /** Réduit et recompresse une image en JPEG (grand côté limité à `coteMax` pixels, 1600 par défaut). */
  abstract compresser(fichier: Blob, coteMax?: number, qualite?: number): Promise<Blob>;
}
