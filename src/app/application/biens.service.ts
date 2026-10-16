import { inject, Injectable } from '@angular/core';
import { annulerDernierChangement, ChangementEtape, changerEtape } from '../domain/etapes';
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

  /** Change l'étape du bien (historique daté) et renvoie le bien à jour. */
  async changerEtape(bienId: string, changement: ChangementEtape): Promise<Bien | undefined> {
    const bien = await this.port.obtenir(bienId);
    if (!bien) return undefined;
    const maj = changerEtape(bien, changement);
    await this.enregistrer(maj);
    return maj;
  }

  async annulerDernierChangement(bienId: string): Promise<Bien | undefined> {
    const bien = await this.port.obtenir(bienId);
    if (!bien) return undefined;
    const maj = annulerDernierChangement(bien);
    await this.enregistrer(maj);
    return maj;
  }

  /** Choisit (ou retire, avec `undefined`) la photo de couverture d'un bien. */
  async definirCouverture(bienId: string, photoId: string | undefined): Promise<void> {
    const bien = await this.port.obtenir(bienId);
    if (bien) await this.enregistrer({ ...bien, photoCouvertureId: photoId });
  }

  supprimer(id: string): Promise<void> {
    return this.port.supprimer(id);
  }
}
