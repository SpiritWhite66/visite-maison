import { Avis, Personne } from './modeles';

export const ETOILES_MAX = 5;

export function idAvis(bienId: string, personneId: string): string {
  return `${bienId}:${personneId}`;
}

/** Avis vierge d'une personne pour un bien (rien de renseigné). */
export function avisVierge(bienId: string, personneId: string, maintenant = new Date()): Avis {
  return { id: idAvis(bienId, personneId), bienId, personneId, absente: false, etoiles: null, commentaire: '', modifieLe: maintenant.toISOString() };
}

/** Toucher l'étoile déjà active la retire ; toute autre étoile la remplace. Hors bornes : ignoré. */
export function basculerEtoiles(actuelles: number | null, touchee: number): number | null {
  if (!Number.isInteger(touchee) || touchee < 1 || touchee > ETOILES_MAX) return actuelles;
  return actuelles === touchee ? null : touchee;
}

/** Marquer une personne absente efface ses étoiles : N/A et note s'excluent. */
export function marquerAbsente(avis: Avis, absente: boolean): Avis {
  return { ...avis, absente, etoiles: absente ? null : avis.etoiles };
}

export interface ResumeAvis {
  /** Moyenne des étoiles données, `null` si personne n'en a donné. */
  moyenne: number | null;
  /** Nombre d'avis avec des étoiles. */
  notes: number;
  absentes: number;
}

/** Les personnes absentes (N/A) et les avis sans étoiles ne comptent pas dans la moyenne. */
export function resumerAvis(avis: readonly Pick<Avis, 'absente' | 'etoiles'>[]): ResumeAvis {
  const etoiles = avis.filter((a) => !a.absente && a.etoiles !== null).map((a) => a.etoiles as number);
  return {
    moyenne: etoiles.length ? etoiles.reduce((s, e) => s + e, 0) / etoiles.length : null,
    notes: etoiles.length,
    absentes: avis.filter((a) => a.absente).length,
  };
}

export type StatutAvis = 'A_DONNER' | 'ABSENTE' | 'DONNE';

/** Où en est chaque personne pour un bien : un avis compte comme donné dès qu'il a des étoiles ou un commentaire. */
export function statutAvis(avis: Pick<Avis, 'absente' | 'etoiles' | 'commentaire'> | undefined): StatutAvis {
  if (!avis) return 'A_DONNER';
  if (avis.absente) return 'ABSENTE';
  return avis.etoiles !== null || avis.commentaire.trim() ? 'DONNE' : 'A_DONNER';
}

/** Ne garde que les avis de personnes qui existent encore. */
export function avisDesPersonnes(avis: readonly Avis[], personnes: readonly Personne[]): Avis[] {
  const ids = new Set(personnes.map((p) => p.id));
  return avis.filter((a) => ids.has(a.personneId));
}

/** Prénom nettoyé, ou `null` s'il est vide ou déjà pris (sans tenir compte de la casse). */
export function prenomValide(saisi: string, existants: readonly Personne[], ignorerId?: string): string | null {
  const prenom = saisi.trim().replace(/\s+/g, ' ');
  if (!prenom) return null;
  const deja = existants.some((p) => p.id !== ignorerId && p.prenom.toLocaleLowerCase('fr') === prenom.toLocaleLowerCase('fr'));
  return deja ? null : prenom;
}
