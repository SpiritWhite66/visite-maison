import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Bien, LigneBareme, Parametres, PosteTravaux } from '../../domain/modeles';
import { BaseDonneesPort, EtatBaseDonnees } from '../../ports/base-donnees.port';

/** Tables encore non typées : leurs modèles arrivent avec les lots suivants. */
export interface Enregistrement {
  id: string;
  bienId?: string;
}

export interface LigneParametres {
  cle: string;
  valeur: Parametres;
}

export const CLE_PARAMETRES = 'parametres';

export class VisiteImmoDb extends Dexie {
  biens!: Table<Bien, string>;
  visites!: Table<Enregistrement, string>;
  pieces!: Table<Enregistrement, string>;
  photos!: Table<Enregistrement, string>;
  postesTravaux!: Table<PosteTravaux, string>;
  bareme!: Table<LigneBareme, string>;
  parametres!: Table<LigneParametres, string>;

  constructor() {
    super('visite-immo');
    // Schéma inchangé depuis le lot 0 : seuls les types des tables ont été précisés.
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
