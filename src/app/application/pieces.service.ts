import { inject, Injectable } from '@angular/core';
import { surfacePiece } from '../domain/piece';
import { Piece } from '../domain/modeles';
import { PiecesPort } from '../ports/depots.port';
import { PhotosService } from './photos.service';

@Injectable({ providedIn: 'root' })
export class PiecesService {
  private readonly port = inject(PiecesPort);
  private readonly photos = inject(PhotosService);

  async listerParBien(bienId: string): Promise<Piece[]> {
    const pieces = await this.port.listerParBien(bienId);
    return pieces.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  }

  obtenir(id: string): Promise<Piece | undefined> {
    return this.port.obtenir(id);
  }

  nouvelle(bienId: string): Piece {
    return { id: crypto.randomUUID(), bienId, nom: '', photoIds: [], notes: '' };
  }

  /** Quand longueur et largeur sont connues, la surface enregistrée est celle qui en découle. */
  enregistrer(piece: Piece): Promise<void> {
    return this.port.enregistrer({ ...piece, surface: surfacePiece(piece) });
  }

  async supprimer(piece: Piece): Promise<void> {
    await this.photos.supprimer(piece.photoIds);
    await this.port.supprimer(piece.id);
  }
}
