import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Avis, Bien, Etage, FichierPlan, LigneBareme, Parametres, Personne, Photo, Piece, PlanFinancement, PosteTravaux, Visite } from '../../domain/modeles';
import { BAREME_DEFAUT } from '../../domain/bareme-defaut';
import { enrichirBareme } from '../../domain/bareme-migration';
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
  etages!: Table<Etage, string>;
  fichiersPlan!: Table<FichierPlan, string>;
  personnes!: Table<Personne, string>;
  avis!: Table<Avis, string>;
  plansFinancement!: Table<PlanFinancement, string>;

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
    // v2 : plans (étages dessinés et fichiers de plan). Les tables existantes ne changent pas.
    this.version(2).stores({
      etages: 'id, bienId',
      fichiersPlan: 'id, bienId, etageId',
    });
    // v3 : personnes (Paramètres) et leurs avis sur chaque bien.
    this.version(3).stores({
      personnes: 'id',
      avis: 'id, bienId, personneId',
    });
    // v4 : gammes. Schéma inchangé, mise à niveau des données existantes (une seule fois) :
    // les postes existants au barème passent en moyen de gamme, le barème reçoit les gammes et les nouvelles lignes.
    this.version(4)
      .stores({})
      .upgrade(async (tx) => {
        await tx.table<PosteTravaux, string>('postesTravaux').toCollection().modify((p) => {
          if (p.modeChiffrage === 'BAREME') p.gamme ??= 'STANDARD';
        });
        const bareme = tx.table<LigneBareme, string>('bareme');
        const existantes = await bareme.toArray();
        // Barème vide : il sera pré-rempli au démarrage avec le barème complet.
        if (existantes.length > 0) await bareme.bulkPut(enrichirBareme(existantes, BAREME_DEFAUT));
      });
    // v5 : plans de financement (un par bien). Le foyer emprunteur est rangé dans les réglages.
    this.version(5).stores({
      plansFinancement: 'id, bienId',
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
