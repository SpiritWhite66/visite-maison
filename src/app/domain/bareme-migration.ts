import { LigneBareme } from './modeles';

/** Nombre de lignes du barème d'origine (lot 1) : les lignes suivantes sont des ajouts. */
export const LIGNES_ORIGINE = 28;

function numero(id: string): number | null {
  const m = /^bareme-(\d+)$/.exec(id);
  return m ? Number(m[1]) : null;
}

/**
 * Met à niveau un barème déjà enregistré avec un barème par défaut enrichi, sans rien écraser :
 * - une ligne d'origine reçoit les prix des autres gammes si elle n'en a pas encore (son prix, éventuellement
 *   modifié par l'utilisateur, reste le moyen de gamme) ;
 * - les lignes nouvelles sont ajoutées ; une ligne d'origine supprimée par l'utilisateur ne revient pas.
 */
export function enrichirBareme(existantes: readonly LigneBareme[], defaut: readonly LigneBareme[]): LigneBareme[] {
  const parId = new Map(defaut.map((l) => [l.id, l]));
  const presentes = new Set(existantes.map((l) => l.id));
  const misesAJour = existantes.map((l) => {
    const reference = parId.get(l.id);
    return !l.gammes && reference?.gammes ? { ...l, gammes: reference.gammes } : l;
  });
  const nouvelles = defaut.filter((l) => !presentes.has(l.id) && (numero(l.id) ?? 0) > LIGNES_ORIGINE);
  return [...misesAJour, ...nouvelles];
}
