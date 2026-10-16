import { Bien, Categorie, Gamme, GAMME_DEFAUT, GAMMES, LigneBareme, Parametres, PosteTravaux, Priorite, Realisation } from './modeles';

export interface Fourchette {
  bas: number;
  haut: number;
}

export const ZERO: Fourchette = { bas: 0, haut: 0 };

function somme(a: Fourchette, b: Fourchette): Fourchette {
  return { bas: a.bas + b.bas, haut: a.haut + b.haut };
}

export function prixNegocie(prixAffiche: number, margeNegociationPct: number): number {
  return prixAffiche * (1 - margeNegociationPct / 100);
}

export function fraisNotaire(prixNegocieEuros: number, tauxNotairePct: number): number {
  return (prixNegocieEuros * tauxNotairePct) / 100;
}

/** Gammes proposées pour une ligne : le moyen de gamme, plus celles dont le prix est renseigné. */
export function gammesDisponibles(ligne: LigneBareme): Gamme[] {
  return GAMMES.filter((g) => g === 'STANDARD' || !!ligne.gammes?.[g]);
}

/** Prix unitaire d'une ligne pour une gamme ; une gamme non renseignée retombe sur le moyen de gamme. */
export function prixLigne(ligne: LigneBareme, gamme: Gamme = GAMME_DEFAUT): Fourchette {
  const prix = gamme === 'STANDARD' ? undefined : ligne.gammes?.[gamme];
  return prix ? { bas: prix.prixBas, haut: prix.prixHaut } : { bas: ligne.prixBas, haut: ligne.prixHaut };
}

/**
 * Fourchette d'un poste.
 * - BAREME : quantité × prix de la gamme choisie × (coefficient DIY si réalisé soi-même), recalculé depuis la ligne de barème.
 *   Si la ligne a disparu du barème, on garde les montants enregistrés.
 * - MANUEL : montants saisis, tels quels.
 */
export function montantsPoste(
  poste: PosteTravaux,
  bareme: readonly LigneBareme[],
  coefDiyDefaut: number,
): Fourchette {
  if (poste.modeChiffrage === 'MANUEL') return { bas: poste.montantBas, haut: poste.montantHaut };
  const ligne = bareme.find((l) => l.id === poste.baremeId);
  if (!ligne) return { bas: poste.montantBas, haut: poste.montantHaut };
  const coef = poste.realisation === 'DIY' ? (ligne.coefDiy ?? coefDiyDefaut) : 1;
  const quantite = poste.quantite ?? 0;
  const prix = prixLigne(ligne, poste.gamme);
  return { bas: quantite * prix.bas * coef, haut: quantite * prix.haut * coef };
}

export interface Budget {
  prixNegocie: number;
  fraisNotaire: number;
  travaux: Fourchette;
  total: Fourchette;
  parCategorie: { categorie: Categorie; montant: Fourchette }[];
  parPriorite: { priorite: Priorite; montant: Fourchette }[];
  parRealisation: Record<Realisation, Fourchette>;
}

function regrouper<K extends string>(
  postes: { cle: K; montant: Fourchette }[],
): { cle: K; montant: Fourchette }[] {
  const groupes = new Map<K, Fourchette>();
  for (const { cle, montant } of postes) groupes.set(cle, somme(groupes.get(cle) ?? ZERO, montant));
  return [...groupes].map(([cle, montant]) => ({ cle, montant }));
}

export function calculerBudget(
  bien: Pick<Bien, 'prixAffiche' | 'margeNegociationPct'>,
  postes: readonly PosteTravaux[],
  bareme: readonly LigneBareme[],
  parametres: Parametres,
): Budget {
  const negocie = prixNegocie(bien.prixAffiche, bien.margeNegociationPct);
  const notaire = fraisNotaire(negocie, parametres.tauxNotairePct);
  const lignes = postes.map((p) => ({ poste: p, montant: montantsPoste(p, bareme, parametres.coefDiyDefaut) }));
  const travaux = lignes.reduce((acc, l) => somme(acc, l.montant), ZERO);

  const parRealisation: Record<Realisation, Fourchette> = { ARTISAN: ZERO, DIY: ZERO };
  for (const l of lignes) parRealisation[l.poste.realisation] = somme(parRealisation[l.poste.realisation], l.montant);

  return {
    prixNegocie: negocie,
    fraisNotaire: notaire,
    travaux,
    total: { bas: negocie + notaire + travaux.bas, haut: negocie + notaire + travaux.haut },
    parCategorie: regrouper(lignes.map((l) => ({ cle: l.poste.categorie, montant: l.montant }))).map((g) => ({
      categorie: g.cle,
      montant: g.montant,
    })),
    parPriorite: regrouper(lignes.map((l) => ({ cle: l.poste.priorite, montant: l.montant }))).map((g) => ({
      priorite: g.cle,
      montant: g.montant,
    })),
    parRealisation,
  };
}
