import { DonneesBase, ResumeSauvegarde } from '../domain/sauvegarde';

/** Lecture et écriture de toute la base d'un seul bloc. */
export abstract class SauvegardePort {
  abstract lireTout(): Promise<DonneesBase>;
  /** Efface tout puis écrit les données : la base devient identique à la sauvegarde. */
  abstract remplacer(donnees: DonneesBase): Promise<void>;
  /** Ajoute ou met à jour les biens et ce qui s'y rattache ; réglages et barème locaux restent. */
  abstract fusionner(donnees: DonneesBase): Promise<void>;
}

export interface SauvegardeLue {
  donnees: DonneesBase;
  resume: ResumeSauvegarde;
  exporteLe: string;
  versionApp: string;
}

/** Raison lisible pour l'utilisateur quand un fichier ne peut pas être importé. */
export class SauvegardeInvalideError extends Error {}

/** Fichier de sauvegarde : écriture (images encodées dedans) et lecture contrôlée. */
export abstract class FormatSauvegardePort {
  abstract ecrire(donnees: DonneesBase, versionApp: string, exporteLe: Date): Promise<Blob>;
  /** @throws SauvegardeInvalideError si le fichier n'est pas une sauvegarde utilisable. */
  abstract lire(fichier: Blob): Promise<SauvegardeLue>;
}
