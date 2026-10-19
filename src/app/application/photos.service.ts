import { inject, Injectable } from '@angular/core';
import { Photo } from '../domain/modeles';
import { PhotosPort } from '../ports/depots.port';
import { CompressionPhotoPort } from '../ports/photo.port';

@Injectable({ providedIn: 'root' })
export class PhotosService {
  private readonly port = inject(PhotosPort);
  private readonly compression = inject(CompressionPhotoPort);

  /** Compresse puis enregistre la photo ; l'appelant range l'identifiant dans la pièce ou le point. */
  async ajouter(bienId: string, fichier: Blob): Promise<Photo> {
    const photo: Photo = {
      id: crypto.randomUUID(),
      bienId,
      blob: await this.compression.compresser(fichier),
      prisLe: new Date().toISOString(),
    };
    await this.port.enregistrer(photo);
    return photo;
  }

  /** Toutes les photos d'un bien (couverture, pièces, visites). */
  listerParBien(bienId: string): Promise<Photo[]> {
    return this.port.listerParBien(bienId);
  }

  async blob(id: string): Promise<Blob | undefined> {
    return (await this.port.obtenir(id))?.blob;
  }

  supprimer(ids: readonly string[]): Promise<void> {
    return this.port.supprimer(ids);
  }
}
