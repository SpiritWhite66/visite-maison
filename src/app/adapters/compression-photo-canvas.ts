import { Injectable } from '@angular/core';
import { dimensionsCompressees } from '../domain/photo';
import { CompressionPhotoPort } from '../ports/photo.port';

const COTE_MAX = 1600;
const QUALITE_JPEG = 0.75;

@Injectable()
export class CompressionPhotoCanvas extends CompressionPhotoPort {
  async compresser(fichier: Blob): Promise<Blob> {
    // `from-image` applique l'orientation EXIF : les photos de téléphone arrivent à l'endroit.
    const image = await createImageBitmap(fichier, { imageOrientation: 'from-image' });
    try {
      const { largeur, hauteur } = dimensionsCompressees(image.width, image.height, COTE_MAX);
      const canvas = document.createElement('canvas');
      canvas.width = largeur;
      canvas.height = hauteur;
      const contexte = canvas.getContext('2d');
      if (!contexte) throw new Error('Canvas 2D indisponible');
      contexte.drawImage(image, 0, 0, largeur, hauteur);
      return await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Compression de la photo impossible'))), 'image/jpeg', QUALITE_JPEG),
      );
    } finally {
      image.close();
    }
  }
}
