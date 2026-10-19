/**
 * Prêts et tableau d'amortissement (SPEC §12). TypeScript pur, aucun arrondi intermédiaire.
 *
 * - Échéance constante classique : M = P × r / (1 − (1 + r)^−n), r = taux annuel / 12.
 * - Différé : `TOTAL` (rien n'est payé, les intérêts s'ajoutent au capital ; sans effet sur un prêt à 0 %)
 *   ou `PARTIEL` (seuls les intérêts et l'assurance sont payés).
 * - Assurance : taux annuel appliqué au capital initial, payée chaque mois pendant toute la durée.
 * - Lissage : la mensualité du prêt principal varie pour que le total (tous prêts, assurances comprises)
 *   reste constant tant que le prêt principal court.
 */

export type TypeDiffere = 'TOTAL' | 'PARTIEL';

export interface PretCalcul {
  id: string;
  libelle: string;
  montant: number;
  /** Taux nominal annuel, en %. */
  tauxPct: number;
  /** Durée totale en mois, différé compris. */
  dureeMois: number;
  differeMois: number;
  differe: TypeDiffere;
  /** Taux annuel d'assurance, en % du capital initial. */
  tauxAssurancePct: number;
}

export interface LigneAmortissement {
  /** 1 = première échéance. */
  mois: number;
  capitalDebut: number;
  interets: number;
  capitalAmorti: number;
  assurance: number;
  /** Capital + intérêts, hors assurance. */
  echeance: number;
  capitalFin: number;
}

export interface Echeancier {
  pret: PretCalcul;
  lignes: LigneAmortissement[];
  totalInterets: number;
  totalAssurance: number;
}

const EPSILON = 1e-7;

function tauxMensuel(tauxPct: number): number {
  return tauxPct / 100 / 12;
}

export function assuranceMensuelle(pret: Pick<PretCalcul, 'montant' | 'tauxAssurancePct'>): number {
  return (pret.montant * pret.tauxAssurancePct) / 100 / 12;
}

/** Échéance constante (hors assurance) pour rembourser `capital` en `n` mois. */
export function mensualiteConstante(capital: number, tauxPct: number, n: number): number {
  if (n <= 0) return capital;
  const r = tauxMensuel(tauxPct);
  if (r === 0) return capital / n;
  return (capital * r) / (1 - Math.pow(1 + r, -n));
}

function normaliser(pret: PretCalcul): PretCalcul {
  const dureeMois = Math.max(0, Math.round(pret.dureeMois || 0));
  return {
    ...pret,
    montant: Math.max(0, pret.montant || 0),
    tauxPct: Math.max(0, pret.tauxPct || 0),
    tauxAssurancePct: Math.max(0, pret.tauxAssurancePct || 0),
    dureeMois,
    differeMois: Math.min(Math.max(0, Math.round(pret.differeMois || 0)), Math.max(0, dureeMois - 1)),
  };
}

function totaliser(pret: PretCalcul, lignes: LigneAmortissement[]): Echeancier {
  return {
    pret,
    lignes,
    totalInterets: lignes.reduce((s, l) => s + l.interets, 0),
    totalAssurance: lignes.reduce((s, l) => s + l.assurance, 0),
  };
}

/**
 * Échéancier d'un prêt. `paiement(mois, capital, interets)` peut imposer la part capital + intérêts d'un mois
 * (lissage) ; sinon l'échéance est constante après le différé. La dernière échéance solde toujours le prêt.
 */
export function echeancierPret(
  pretBrut: PretCalcul,
  paiement?: (mois: number, capitalDebut: number, interets: number) => number,
): Echeancier {
  const pret = normaliser(pretBrut);
  const r = tauxMensuel(pret.tauxPct);
  const assurance = assuranceMensuelle(pret);
  const lignes: LigneAmortissement[] = [];
  let capital = pret.montant;
  let constante = 0;
  for (let mois = 1; mois <= pret.dureeMois && pret.montant > 0; mois++) {
    const interets = capital * r;
    let echeance: number;
    if (mois <= pret.differeMois) {
      echeance = pret.differe === 'PARTIEL' ? interets : 0;
    } else {
      if (mois === pret.differeMois + 1) constante = mensualiteConstante(capital, pret.tauxPct, pret.dureeMois - pret.differeMois);
      echeance = mois === pret.dureeMois ? capital + interets : paiement ? paiement(mois, capital, interets) : constante;
      echeance = Math.min(Math.max(echeance, interets), capital + interets);
    }
    const capitalAmorti = echeance - interets;
    const capitalFin = capital - capitalAmorti;
    lignes.push({ mois, capitalDebut: capital, interets, capitalAmorti, assurance, echeance, capitalFin: Math.abs(capitalFin) < EPSILON ? 0 : capitalFin });
    capital = capitalFin;
  }
  return totaliser(pret, lignes);
}

/** Charge mensuelle (échéance + assurance) de chaque mois, indexée à partir de 1. */
function chargesParMois(echeanciers: readonly Echeancier[], nbMois: number): number[] {
  const charges = new Array<number>(nbMois + 1).fill(0);
  for (const e of echeanciers) for (const l of e.lignes) if (l.mois <= nbMois) charges[l.mois] += l.echeance + l.assurance;
  return charges;
}

/** Capital restant dû en fin de prêt si le total mensuel visé est `total`. */
function soldeFinal(principal: PretCalcul, autres: number[], total: number): number {
  const r = tauxMensuel(principal.tauxPct);
  const assurance = assuranceMensuelle(principal);
  let capital = principal.montant;
  for (let mois = 1; mois <= principal.dureeMois; mois++) {
    const interets = capital * r;
    const echeance = Math.min(Math.max(total - assurance - (autres[mois] ?? 0), interets), capital + interets);
    capital -= echeance - interets;
  }
  return capital;
}

export interface Montage {
  echeanciers: Echeancier[];
  /** Total mensuel lissé (tous prêts, assurances comprises), ou `null` sans lissage. */
  mensualiteLissee: number | null;
}

/**
 * Montage de plusieurs prêts. Avec `lisser`, le prêt `principalId` (sans différé) absorbe les variations
 * des autres prêts pour garder un total constant. Si un autre prêt coûte à lui seul plus que ce total certains mois,
 * le prêt principal ne paie que ses intérêts ces mois-là (le total dépasse alors la mensualité lissée).
 */
export function calculerMontage(prets: readonly PretCalcul[], principalId: string | null, lisser: boolean): Montage {
  const valides = prets.map(normaliser).filter((p) => p.montant > 0 && p.dureeMois > 0);
  const principal = valides.find((p) => p.id === principalId);
  const autres = valides.filter((p) => p !== principal).map((p) => echeancierPret(p));
  if (!principal || !lisser || autres.length === 0) {
    return { echeanciers: valides.map((p) => (p === principal ? echeancierPret(p) : autres.find((e) => e.pret.id === p.id)!)), mensualiteLissee: null };
  }
  const lisse: PretCalcul = { ...principal, differeMois: 0 };
  const charges = chargesParMois(autres, lisse.dureeMois);
  // Recherche du total constant par dichotomie : le solde final décroît quand le total augmente.
  let bas = 0;
  let haut = Math.max(...charges) + assuranceMensuelle(lisse) + lisse.montant + 1;
  for (let i = 0; i < 200 && haut - bas > 1e-9; i++) {
    const milieu = (bas + haut) / 2;
    if (soldeFinal(lisse, charges, milieu) > 0) bas = milieu;
    else haut = milieu;
  }
  const total = haut;
  const assurance = assuranceMensuelle(lisse);
  const echeancierPrincipal = echeancierPret(lisse, (mois) => total - assurance - (charges[mois] ?? 0));
  return {
    echeanciers: valides.map((p) => (p === principal ? echeancierPrincipal : autres.find((e) => e.pret.id === p.id)!)),
    mensualiteLissee: total,
  };
}

export interface LigneMontage {
  mois: number;
  /** Une entrée par prêt, dans l'ordre du montage ; `null` si le prêt n'a pas d'échéance ce mois-là. */
  parPret: (LigneAmortissement | null)[];
  interets: number;
  capitalAmorti: number;
  assurance: number;
  /** Tout compris : capital + intérêts + assurance. */
  total: number;
  capitalRestant: number;
}

export function tableauMontage(montage: Montage): LigneMontage[] {
  const nbMois = Math.max(0, ...montage.echeanciers.map((e) => e.lignes.length));
  const lignes: LigneMontage[] = [];
  for (let mois = 1; mois <= nbMois; mois++) {
    const parPret = montage.echeanciers.map((e) => e.lignes[mois - 1] ?? null);
    const presentes = parPret.filter((l): l is LigneAmortissement => l !== null);
    const interets = presentes.reduce((s, l) => s + l.interets, 0);
    const capitalAmorti = presentes.reduce((s, l) => s + l.capitalAmorti, 0);
    const assurance = presentes.reduce((s, l) => s + l.assurance, 0);
    lignes.push({
      mois,
      parPret,
      interets,
      capitalAmorti,
      assurance,
      total: interets + capitalAmorti + assurance,
      capitalRestant: presentes.reduce((s, l) => s + l.capitalFin, 0),
    });
  }
  return lignes;
}

export interface LigneAnnuelle {
  annee: number;
  interets: number;
  capitalAmorti: number;
  assurance: number;
  total: number;
  capitalRestant: number;
}

/** Regroupement par année de remboursement (12 échéances), la 1re année commençant à la 1re échéance. */
export function resumeAnnuel(lignes: readonly LigneMontage[]): LigneAnnuelle[] {
  const annees: LigneAnnuelle[] = [];
  for (const l of lignes) {
    const annee = Math.ceil(l.mois / 12);
    let a = annees[annee - 1];
    if (!a) {
      a = { annee, interets: 0, capitalAmorti: 0, assurance: 0, total: 0, capitalRestant: 0 };
      annees.push(a);
    }
    a.interets += l.interets;
    a.capitalAmorti += l.capitalAmorti;
    a.assurance += l.assurance;
    a.total += l.total;
    a.capitalRestant = l.capitalRestant;
  }
  return annees;
}

/** Périodes où le total mensuel est stable : « 1 450 € du mois 1 au mois 180 ». */
export interface Palier {
  du: number;
  au: number;
  total: number;
}

export function paliers(lignes: readonly LigneMontage[], tolerance = 0.5): Palier[] {
  const resultat: Palier[] = [];
  for (const l of lignes) {
    const dernier = resultat[resultat.length - 1];
    if (dernier && Math.abs(dernier.total - l.total) <= tolerance) dernier.au = l.mois;
    else resultat.push({ du: l.mois, au: l.mois, total: l.total });
  }
  return resultat;
}

/**
 * TAEG (taux actuariel annuel) : taux qui égalise le montant réellement reçu (capital − frais)
 * et les mensualités payées (assurance comprise). `null` si non calculable.
 */
export function taeg(montantRecu: number, mensualites: readonly number[]): number | null {
  const paye = mensualites.reduce((s, m) => s + m, 0);
  if (montantRecu <= 0 || mensualites.length === 0 || paye < montantRecu) return null;
  const valeur = (i: number) => mensualites.reduce((s, m, k) => s + m / Math.pow(1 + i, k + 1), 0);
  let bas = 0;
  let haut = 1;
  for (let k = 0; k < 200; k++) {
    const milieu = (bas + haut) / 2;
    if (valeur(milieu) > montantRecu) bas = milieu;
    else haut = milieu;
  }
  return (Math.pow(1 + (bas + haut) / 2, 12) - 1) * 100;
}

/** « 2027-03 » + 13 mois → « 2028-03 ». */
export function moisCalendrier(debut: string, mois: number): { annee: number; mois: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(debut);
  if (!m) return null;
  const index = Number(m[1]) * 12 + Number(m[2]) - 1 + (mois - 1);
  return { annee: Math.floor(index / 12), mois: (index % 12) + 1 };
}
