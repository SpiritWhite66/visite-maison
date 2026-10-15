export interface EntreeErreur {
  date: string;
  source: string;
  message: string;
}

export const TAILLE_MAX_JOURNAL = 20;

/** Ajoute une entrée en tête du journal et le tronque (les plus récentes d'abord). */
export function ajouterErreur(
  journal: readonly EntreeErreur[],
  entree: EntreeErreur,
  max: number = TAILLE_MAX_JOURNAL,
): EntreeErreur[] {
  return [entree, ...journal].slice(0, max);
}
