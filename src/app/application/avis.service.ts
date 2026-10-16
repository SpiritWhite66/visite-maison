import { inject, Injectable } from '@angular/core';
import { Avis } from '../domain/modeles';
import { AvisPort } from '../ports/depots.port';

@Injectable({ providedIn: 'root' })
export class AvisService {
  private readonly port = inject(AvisPort);

  listerParBien(bienId: string): Promise<Avis[]> {
    return this.port.listerParBien(bienId);
  }

  /** Tous les avis, pour les moyennes de la liste des biens. */
  lister(): Promise<Avis[]> {
    return this.port.lister();
  }

  enregistrer(avis: Avis): Promise<void> {
    return this.port.enregistrer({ ...avis, modifieLe: new Date().toISOString() });
  }
}
