import { inject, Injectable } from '@angular/core';
import { Bien } from '../domain/modeles';
import { BiensPort } from '../ports/depots.port';
import { ParametresService } from './parametres.service';

@Injectable({ providedIn: 'root' })
export class BiensService {
  private readonly port = inject(BiensPort);
  private readonly parametres = inject(ParametresService);

  async lister(): Promise<Bien[]> {
    const biens = await this.port.lister();
    return biens.sort((a, b) => b.modifieLe.localeCompare(a.modifieLe));
  }

  obtenir(id: string): Promise<Bien | undefined> {
    return this.port.obtenir(id);
  }

  /** Bien vierge pré-rempli avec la marge de négociation par défaut. */
  nouveau(): Bien {
    const maintenant = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      titre: '',
      typeBien: 'VILLE',
      adresse: '',
      commune: '',
      contact: { nom: '' },
      prixAffiche: 0,
      margeNegociationPct: this.parametres.parametres().margeNegociationDefautPct,
      dpe: null,
      ges: null,
      etape: 'REPERE',
      historiqueEtapes: [{ etape: 'REPERE', date: maintenant }],
      impressionGlobale: null,
      notes: '',
      creeLe: maintenant,
      modifieLe: maintenant,
    };
  }

  async enregistrer(bien: Bien): Promise<void> {
    await this.port.enregistrer({ ...bien, modifieLe: new Date().toISOString() });
  }

  supprimer(id: string): Promise<void> {
    return this.port.supprimer(id);
  }
}
