import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { BaseDonneesPort, EtatBaseDonnees } from '../../ports/base-donnees.port';

/** Enregistrement générique : les modèles typés arrivent avec le lot 1. */
export interface Enregistrement {
  id: string;
  bienId?: string;
}

export class VisiteImmoDb extends Dexie {
  biens!: Table<Enregistrement, string>;
  visites!: Table<Enregistrement, string>;
  pieces!: Table<Enregistrement, string>;
  photos!: Table<Enregistrement, string>;
  postesTravaux!: Table<Enregistrement, string>;
  bareme!: Table<Enregistrement, string>;
  parametres!: Table<{ cle: string }, string>;

  constructor() {
    super('visite-immo');
    this.version(1).stores({
      biens: 'id',
      visites: 'id, bienId',
      pieces: 'id, bienId',
      photos: 'id, bienId',
      postesTravaux: 'id, bienId',
      bareme: 'id',
      parametres: 'cle',
    });
  }
}

@Injectable()
export class BaseDonneesDexie extends BaseDonneesPort {
  readonly db = new VisiteImmoDb();

  async etat(): Promise<EtatBaseDonnees> {
    try {
      await this.db.open();
      return { ouverte: true, version: this.db.verno };
    } catch (e) {
      return { ouverte: false, version: null, erreur: e instanceof Error ? e.message : String(e) };
    }
  }
}
