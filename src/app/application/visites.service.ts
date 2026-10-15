import { inject, Injectable } from '@angular/core';
import { Visite } from '../domain/modeles';
import { VisitesPort } from '../ports/depots.port';
import { PhotosService } from './photos.service';

@Injectable({ providedIn: 'root' })
export class VisitesService {
  private readonly port = inject(VisitesPort);
  private readonly photos = inject(PhotosService);

  /** Plus récentes d'abord. */
  async listerParBien(bienId: string): Promise<Visite[]> {
    const visites = await this.port.listerParBien(bienId);
    return visites.sort((a, b) => b.date.localeCompare(a.date));
  }

  obtenir(id: string): Promise<Visite | undefined> {
    return this.port.obtenir(id);
  }

  /** Nouvelle visite, enregistrée tout de suite : une contre-visite si le bien en a déjà une. */
  async demarrer(bienId: string): Promise<Visite> {
    const existantes = await this.port.listerParBien(bienId);
    const visite: Visite = {
      id: crypto.randomUUID(),
      bienId,
      date: new Date().toISOString(),
      typeVisite: existantes.length > 0 ? 'CONTRE_VISITE' : 'PREMIERE',
      reponses: [],
      notes: '',
    };
    await this.port.enregistrer(visite);
    return visite;
  }

  enregistrer(visite: Visite): Promise<void> {
    return this.port.enregistrer(visite);
  }

  /** Supprime la visite et les photos de ses points. Les postes de travaux créés restent. */
  async supprimer(visite: Visite): Promise<void> {
    await this.photos.supprimer(visite.reponses.flatMap((r) => r.photoIds));
    await this.port.supprimer(visite.id);
  }

  /** Relie un poste de travaux au point de checklist dont il est issu. */
  async lierPoste(visiteId: string, pointId: string, posteTravauxId: string): Promise<void> {
    const visite = await this.port.obtenir(visiteId);
    if (!visite) return;
    const existe = visite.reponses.some((r) => r.pointId === pointId);
    const reponses = existe
      ? visite.reponses.map((r) => (r.pointId === pointId ? { ...r, posteTravauxId } : r))
      : [...visite.reponses, { pointId, etat: 'TRAVAUX' as const, photoIds: [], posteTravauxId }];
    await this.port.enregistrer({ ...visite, reponses });
  }
}
