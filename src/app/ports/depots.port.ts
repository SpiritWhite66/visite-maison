import { Bien, LigneBareme, Parametres, Photo, Piece, PosteTravaux, Visite } from '../domain/modeles';

export abstract class BiensPort {
  abstract lister(): Promise<Bien[]>;
  abstract obtenir(id: string): Promise<Bien | undefined>;
  abstract enregistrer(bien: Bien): Promise<void>;
  /** Supprime le bien et tout ce qui lui est rattaché (postes, visites, pièces, photos). */
  abstract supprimer(id: string): Promise<void>;
}

export abstract class PostesTravauxPort {
  abstract listerParBien(bienId: string): Promise<PosteTravaux[]>;
  abstract lister(): Promise<PosteTravaux[]>;
  abstract enregistrer(poste: PosteTravaux): Promise<void>;
  abstract supprimer(id: string): Promise<void>;
}

export abstract class BaremePort {
  abstract lister(): Promise<LigneBareme[]>;
  abstract enregistrer(ligne: LigneBareme): Promise<void>;
  abstract supprimer(id: string): Promise<void>;
  /** Remplace tout le barème (initialisation, restauration des valeurs par défaut). */
  abstract remplacer(lignes: readonly LigneBareme[]): Promise<void>;
}

export abstract class ParametresPort {
  /** `undefined` tant que l'utilisateur n'a rien enregistré. */
  abstract lire(): Promise<Parametres | undefined>;
  abstract enregistrer(parametres: Parametres): Promise<void>;
}

export abstract class VisitesPort {
  abstract listerParBien(bienId: string): Promise<Visite[]>;
  abstract obtenir(id: string): Promise<Visite | undefined>;
  abstract enregistrer(visite: Visite): Promise<void>;
  abstract supprimer(id: string): Promise<void>;
}

export abstract class PiecesPort {
  abstract listerParBien(bienId: string): Promise<Piece[]>;
  abstract obtenir(id: string): Promise<Piece | undefined>;
  abstract enregistrer(piece: Piece): Promise<void>;
  abstract supprimer(id: string): Promise<void>;
}

export abstract class PhotosPort {
  abstract obtenir(id: string): Promise<Photo | undefined>;
  abstract enregistrer(photo: Photo): Promise<void>;
  abstract supprimer(ids: readonly string[]): Promise<void>;
}
