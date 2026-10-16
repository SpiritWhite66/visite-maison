import { inject, Injectable, signal } from '@angular/core';
import { Parametres } from '../domain/modeles';
import { PARAMETRES_DEFAUT } from '../domain/parametres-defaut';
import { ParametresPort } from '../ports/depots.port';

@Injectable({ providedIn: 'root' })
export class ParametresService {
  private readonly port = inject(ParametresPort);
  readonly parametres = signal<Parametres>(PARAMETRES_DEFAUT);

  async charger(): Promise<void> {
    this.parametres.set({ ...PARAMETRES_DEFAUT, ...(await this.port.lire()) });
  }

  /** Note la date de la dernière sauvegarde sans toucher aux autres réglages. */
  async noterSauvegarde(dateIso: string): Promise<void> {
    await this.enregistrer({ ...this.parametres(), derniereSauvegarde: dateIso });
  }

  async enregistrer(parametres: Parametres): Promise<void> {
    await this.port.enregistrer(parametres);
    this.parametres.set(parametres);
  }
}
