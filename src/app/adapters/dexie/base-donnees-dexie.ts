import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Bien, LigneBareme, Parametres, Photo, Piece, PosteTravaux, Visite } from '../../domain/modeles';
import { BaseDonneesPort, EtatBaseDonnees } from '../../ports/base-donnees.port';

export interface LigneParametres {
  cle: string;
  valeur: Parametres;
}

export const CLE_PARAMETRES = 'parametres';

export class VisiteImmoDb extends Dexie {
  biens!: Table<Bien, string>;
  visites!: Table<Visite, string>;
  pieces!: Table<Piece, string>;
  photos!: Table<Photo, string>;
  postesTravaux!: Table<PosteTravaux, string>;
  bareme!: Table<LigneBareme, string>;
  parametres!: Table<LigneParametres, string>;

  constructor() {
    super('visite-immo');
    // Schéma inchangé depuis le lot 0 : seuls les types des tables ont été précisés.
    // Les champs non indexés (réponses, blob des photos…) ne demandent pas de migration.
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
