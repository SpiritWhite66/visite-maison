import { inject, Injectable } from '@angular/core';
import { Bien, Etage, FichierPlan, LigneBareme, Parametres, Photo, Piece, PosteTravaux, Visite } from '../../domain/modeles';
import { BaremePort, BiensPort, EtagesPort, FichiersPlanPort, ParametresPort, PhotosPort, PiecesPort, PostesTravauxPort, VisitesPort } from '../../ports/depots.port';
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
    const { biens, visites, pieces, photos, postesTravaux, etages, fichiersPlan } = this.db;
    await this.db.transaction('rw', [biens, visites, pieces, photos, postesTravaux, etages, fichiersPlan], async () => {
      await Promise.all([
        etages.where('bienId').equals(id).delete(),
        fichiersPlan.where('bienId').equals(id).delete(),
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

@Injectable()
export class VisitesDexie extends VisitesPort {
  private readonly db = inject(BaseDonneesDexie).db;

  listerParBien(bienId: string): Promise<Visite[]> {
    return this.db.visites.where('bienId').equals(bienId).toArray();
  }
  obtenir(id: string): Promise<Visite | undefined> {
    return this.db.visites.get(id);
  }
  async enregistrer(visite: Visite): Promise<void> {
    await this.db.visites.put(visite);
  }
  async supprimer(id: string): Promise<void> {
    await this.db.visites.delete(id);
  }
}

@Injectable()
export class PiecesDexie extends PiecesPort {
  private readonly db = inject(BaseDonneesDexie).db;

  listerParBien(bienId: string): Promise<Piece[]> {
    return this.db.pieces.where('bienId').equals(bienId).toArray();
  }
  obtenir(id: string): Promise<Piece | undefined> {
    return this.db.pieces.get(id);
  }
  async enregistrer(piece: Piece): Promise<void> {
    await this.db.pieces.put(piece);
  }
  async supprimer(id: string): Promise<void> {
    await this.db.pieces.delete(id);
  }
}

@Injectable()
export class PhotosDexie extends PhotosPort {
  private readonly db = inject(BaseDonneesDexie).db;

  obtenir(id: string): Promise<Photo | undefined> {
    return this.db.photos.get(id);
  }
  async enregistrer(photo: Photo): Promise<void> {
    await this.db.photos.put(photo);
  }
  async supprimer(ids: readonly string[]): Promise<void> {
    await this.db.photos.bulkDelete([...ids]);
  }
}

@Injectable()
export class EtagesDexie extends EtagesPort {
  private readonly db = inject(BaseDonneesDexie).db;

  listerParBien(bienId: string): Promise<Etage[]> {
    return this.db.etages.where('bienId').equals(bienId).toArray();
  }
  obtenir(id: string): Promise<Etage | undefined> {
    return this.db.etages.get(id);
  }
  async enregistrer(etage: Etage): Promise<void> {
    await this.db.etages.put(etage);
  }
  async supprimer(id: string): Promise<void> {
    const { etages, fichiersPlan } = this.db;
    await this.db.transaction('rw', [etages, fichiersPlan], async () => {
      await fichiersPlan.where('etageId').equals(id).delete();
      await etages.delete(id);
    });
  }
}

@Injectable()
export class FichiersPlanDexie extends FichiersPlanPort {
  private readonly db = inject(BaseDonneesDexie).db;

  listerParBien(bienId: string): Promise<FichierPlan[]> {
    return this.db.fichiersPlan.where('bienId').equals(bienId).toArray();
  }
  obtenir(id: string): Promise<FichierPlan | undefined> {
    return this.db.fichiersPlan.get(id);
  }
  async enregistrer(fichier: FichierPlan): Promise<void> {
    await this.db.fichiersPlan.put(fichier);
  }
  async supprimer(id: string): Promise<void> {
    await this.db.fichiersPlan.delete(id);
  }
}
