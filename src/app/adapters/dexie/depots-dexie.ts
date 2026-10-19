import { inject, Injectable } from '@angular/core';
import { Avis, Bien, Etage, FichierPlan, LigneBareme, Parametres, Personne, Photo, Piece, PlanFinancement, PosteTravaux, Visite, Devis, FichierDevis } from '../../domain/modeles';
import { AvisPort, BaremePort, BiensPort, EtagesPort, FichiersPlanPort, ParametresPort, PersonnesPort, PhotosPort, PiecesPort, PlansFinancementPort, DevisPort, PostesTravauxPort, VisitesPort } from '../../ports/depots.port';
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
    const { biens, visites, pieces, photos, postesTravaux, etages, fichiersPlan, avis, plansFinancement, devis, fichiersDevis } = this.db;
    await this.db.transaction('rw', [biens, visites, pieces, photos, postesTravaux, etages, fichiersPlan, avis, plansFinancement, devis, fichiersDevis], async () => {
      await Promise.all([
        devis.where('bienId').equals(id).delete(),
        fichiersDevis.where('bienId').equals(id).delete(),
        plansFinancement.where('bienId').equals(id).delete(),
        avis.where('bienId').equals(id).delete(),
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
    const { postesTravaux, devis } = this.db;
    await this.db.transaction('rw', [postesTravaux, devis], async () => {
      await devis.where('posteId').equals(id).modify((d) => {
        d.posteId = null;
        if (d.statut === 'ACCEPTE') d.statut = 'EN_ATTENTE';
      });
      await postesTravaux.delete(id);
    });
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
  listerParBien(bienId: string): Promise<Photo[]> {
    return this.db.photos.where('bienId').equals(bienId).toArray();
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

@Injectable()
export class PersonnesDexie extends PersonnesPort {
  private readonly db = inject(BaseDonneesDexie).db;

  lister(): Promise<Personne[]> {
    return this.db.personnes.toArray();
  }
  async enregistrer(personne: Personne): Promise<void> {
    await this.db.personnes.put(personne);
  }
  async supprimer(id: string): Promise<void> {
    const { personnes, avis } = this.db;
    await this.db.transaction('rw', [personnes, avis], async () => {
      await avis.where('personneId').equals(id).delete();
      await personnes.delete(id);
    });
  }
}

@Injectable()
export class AvisDexie extends AvisPort {
  private readonly db = inject(BaseDonneesDexie).db;

  listerParBien(bienId: string): Promise<Avis[]> {
    return this.db.avis.where('bienId').equals(bienId).toArray();
  }
  lister(): Promise<Avis[]> {
    return this.db.avis.toArray();
  }
  async enregistrer(avis: Avis): Promise<void> {
    await this.db.avis.put(avis);
  }
  async supprimer(id: string): Promise<void> {
    await this.db.avis.delete(id);
  }
}

@Injectable()
export class PlansFinancementDexie extends PlansFinancementPort {
  private readonly db = inject(BaseDonneesDexie).db;

  obtenir(bienId: string): Promise<PlanFinancement | undefined> {
    return this.db.plansFinancement.get(bienId);
  }
  lister(): Promise<PlanFinancement[]> {
    return this.db.plansFinancement.toArray();
  }
  async enregistrer(plan: PlanFinancement): Promise<void> {
    await this.db.plansFinancement.put(plan);
  }
  async supprimer(bienId: string): Promise<void> {
    await this.db.plansFinancement.delete(bienId);
  }
}

@Injectable()
export class DevisDexie extends DevisPort {
  private readonly db = inject(BaseDonneesDexie).db;

  listerParBien(bienId: string): Promise<Devis[]> {
    return this.db.devis.where('bienId').equals(bienId).toArray();
  }
  obtenir(id: string): Promise<Devis | undefined> {
    return this.db.devis.get(id);
  }
  async enregistrer(liste: readonly Devis[], postes: readonly PosteTravaux[]): Promise<void> {
    const { devis, postesTravaux } = this.db;
    await this.db.transaction('rw', [devis, postesTravaux], async () => {
      await devis.bulkPut([...liste]);
      await postesTravaux.bulkPut([...postes]);
    });
  }
  async supprimer(id: string, postes: readonly PosteTravaux[]): Promise<void> {
    const { devis, fichiersDevis, postesTravaux } = this.db;
    await this.db.transaction('rw', [devis, fichiersDevis, postesTravaux], async () => {
      await fichiersDevis.where('devisId').equals(id).delete();
      await devis.delete(id);
      await postesTravaux.bulkPut([...postes]);
    });
  }
  listerFichiers(devisId: string): Promise<FichierDevis[]> {
    return this.db.fichiersDevis.where('devisId').equals(devisId).sortBy('ajouteLe');
  }
  async compterFichiers(bienId: string): Promise<Map<string, number>> {
    const compte = new Map<string, number>();
    await this.db.fichiersDevis.where('bienId').equals(bienId).each((f) => compte.set(f.devisId, (compte.get(f.devisId) ?? 0) + 1));
    return compte;
  }
  obtenirFichier(id: string): Promise<FichierDevis | undefined> {
    return this.db.fichiersDevis.get(id);
  }
  async enregistrerFichier(fichier: FichierDevis): Promise<void> {
    await this.db.fichiersDevis.put(fichier);
  }
  async supprimerFichier(id: string): Promise<void> {
    await this.db.fichiersDevis.delete(id);
  }
}
