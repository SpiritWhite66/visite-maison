import { inject, Injectable } from '@angular/core';
import { DonneesBase } from '../../domain/sauvegarde';
import { SauvegardePort } from '../../ports/sauvegarde.port';
import { BaseDonneesDexie, CLE_PARAMETRES } from './base-donnees-dexie';

@Injectable()
export class SauvegardeDexie extends SauvegardePort {
  private readonly db = inject(BaseDonneesDexie).db;

  private get tables() {
    const d = this.db;
    return [d.biens, d.postesTravaux, d.visites, d.pieces, d.etages, d.bareme, d.parametres, d.photos, d.fichiersPlan, d.personnes, d.avis, d.plansFinancement];
  }

  async lireTout(): Promise<DonneesBase> {
    const d = this.db;
    return d.transaction('r', this.tables, async () => ({
      biens: await d.biens.toArray(),
      postesTravaux: await d.postesTravaux.toArray(),
      visites: await d.visites.toArray(),
      pieces: await d.pieces.toArray(),
      etages: await d.etages.toArray(),
      bareme: await d.bareme.toArray(),
      parametres: (await d.parametres.get(CLE_PARAMETRES))?.valeur,
      photos: await d.photos.toArray(),
      fichiersPlan: await d.fichiersPlan.toArray(),
      personnes: await d.personnes.toArray(),
      avis: await d.avis.toArray(),
      plansFinancement: await d.plansFinancement.toArray(),
    }));
  }

  /** Tout ou rien : si une écriture échoue, la transaction est annulée et la base reste intacte. */
  async remplacer(s: DonneesBase): Promise<void> {
    const d = this.db;
    await d.transaction('rw', this.tables, async () => {
      await Promise.all(this.tables.map((t) => t.clear()));
      await d.biens.bulkPut(s.biens);
      await d.postesTravaux.bulkPut(s.postesTravaux);
      await d.visites.bulkPut(s.visites);
      await d.pieces.bulkPut(s.pieces);
      await d.etages.bulkPut(s.etages);
      await d.bareme.bulkPut(s.bareme);
      if (s.parametres) await d.parametres.put({ cle: CLE_PARAMETRES, valeur: s.parametres });
      await d.photos.bulkPut(s.photos);
      await d.fichiersPlan.bulkPut(s.fichiersPlan);
      await d.personnes.bulkPut(s.personnes);
      await d.avis.bulkPut(s.avis);
      await d.plansFinancement.bulkPut(s.plansFinancement);
    });
  }

  async fusionner(s: DonneesBase): Promise<void> {
    const d = this.db;
    await d.transaction('rw', this.tables, async () => {
      await d.biens.bulkPut(s.biens);
      await d.postesTravaux.bulkPut(s.postesTravaux);
      await d.visites.bulkPut(s.visites);
      await d.pieces.bulkPut(s.pieces);
      await d.etages.bulkPut(s.etages);
      await d.photos.bulkPut(s.photos);
      await d.fichiersPlan.bulkPut(s.fichiersPlan);
      await d.personnes.bulkPut(s.personnes);
      await d.avis.bulkPut(s.avis);
      await d.plansFinancement.bulkPut(s.plansFinancement);
    });
  }
}
