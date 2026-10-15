import { inject, Injectable } from '@angular/core';
import { Bien, LigneBareme, Parametres, PosteTravaux } from '../../domain/modeles';
import { BaremePort, BiensPort, ParametresPort, PostesTravauxPort } from '../../ports/depots.port';
import { BaseDonneesDexie, CLE_PARAMETRES } from './base-donnees-dexie';

@Injectable()
export class BiensDexie extends BiensPort {
  private readonly db = inject(BaseDonneesDexie).db;

  lister(): Promise<Bien[]> {
    return this.db.biens.toArray();
  }
  obtenir(id: string): Promise<Bien | undefined> {
    return this.db.biens.get(id);
  }
  async enregistrer(bien: Bien): Promise<void> {
    await this.db.biens.put(bien);
  }
  async supprimer(id: string): Promise<void> {
    const { biens, visites, pieces, photos, postesTravaux } = this.db;
    await this.db.transaction('rw', [biens, visites, pieces, photos, postesTravaux], async () => {
      await Promise.all([
        visites.where('bienId').equals(id).delete(),
        pieces.where('bienId').equals(id).delete(),
        photos.where('bienId').equals(id).delete(),
        postesTravaux.where('bienId').equals(id).delete(),
      ]);
      await biens.delete(id);
    });
  }
}

@Injectable()
export class PostesTravauxDexie extends PostesTravauxPort {
  private readonly db = inject(BaseDonneesDexie).db;

  listerParBien(bienId: string): Promise<PosteTravaux[]> {
    return this.db.postesTravaux.where('bienId').equals(bienId).toArray();
  }
  lister(): Promise<PosteTravaux[]> {
    return this.db.postesTravaux.toArray();
  }
  async enregistrer(poste: PosteTravaux): Promise<void> {
    await this.db.postesTravaux.put(poste);
  }
  async supprimer(id: string): Promise<void> {
    await this.db.postesTravaux.delete(id);
  }
}

@Injectable()
export class BaremeDexie extends BaremePort {
  private readonly db = inject(BaseDonneesDexie).db;

  lister(): Promise<LigneBareme[]> {
    return this.db.bareme.toArray();
  }
  async enregistrer(ligne: LigneBareme): Promise<void> {
    await this.db.bareme.put(ligne);
  }
  async supprimer(id: string): Promise<void> {
    await this.db.bareme.delete(id);
  }
  async remplacer(lignes: readonly LigneBareme[]): Promise<void> {
    await this.db.transaction('rw', this.db.bareme, async () => {
      await this.db.bareme.clear();
      await this.db.bareme.bulkPut([...lignes]);
    });
  }
}

@Injectable()
export class ParametresDexie extends ParametresPort {
  private readonly db = inject(BaseDonneesDexie).db;

  async lire(): Promise<Parametres | undefined> {
    return (await this.db.parametres.get(CLE_PARAMETRES))?.valeur;
  }
  async enregistrer(parametres: Parametres): Promise<void> {
    await this.db.parametres.put({ cle: CLE_PARAMETRES, valeur: parametres });
  }
}
