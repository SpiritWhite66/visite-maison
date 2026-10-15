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

  async enregistrer(parametres: Parametres): Promise<void> {
    await this.port.enregistrer(parametres);
    this.parametres.set(parametres);
  }
}
