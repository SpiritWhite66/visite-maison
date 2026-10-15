import { inject, Injectable } from '@angular/core';
import { montantsPoste } from '../domain/budget';
import { PosteTravaux } from '../domain/modeles';
import { PostesTravauxPort } from '../ports/depots.port';
import { BaremeService } from './bareme.service';
import { ParametresService } from './parametres.service';

@Injectable({ providedIn: 'root' })
export class TravauxService {
  private readonly port = inject(PostesTravauxPort);
  private readonly bareme = inject(BaremeService);
  private readonly parametres = inject(ParametresService);

  listerParBien(bienId: string): Promise<PosteTravaux[]> {
    return this.port.listerParBien(bienId);
  }

  lister(): Promise<PosteTravaux[]> {
    return this.port.lister();
  }

  nouveau(bienId: string): PosteTravaux {
    return {
      id: crypto.randomUUID(),
      bienId,
      categorie: 'Autre',
      libelle: '',
      modeChiffrage: 'BAREME',
      realisation: 'ARTISAN',
      montantBas: 0,
      montantHaut: 0,
      priorite: 'COURT_TERME',
    };
  }

  /** Pour un poste au barème, les montants enregistrés sont recalculés (repli si la ligne disparaît). */
  async enregistrer(poste: PosteTravaux): Promise<void> {
    const final =
      poste.modeChiffrage === 'BAREME'
        ? {
            ...poste,
            ...(() => {
              const m = montantsPoste(poste, this.bareme.lignes(), this.parametres.parametres().coefDiyDefaut);
              return { montantBas: m.bas, montantHaut: m.haut };
            })(),
          }
        : { ...poste, baremeId: undefined, quantite: undefined };
    await this.port.enregistrer(final);
  }

  supprimer(id: string): Promise<void> {
    return this.port.supprimer(id);
  }
}
