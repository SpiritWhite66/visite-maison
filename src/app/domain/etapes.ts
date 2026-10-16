import { Bien, EntreeHistorique, Etape, ETAPES } from './modeles';

/** Parcours d'un achat, dans l'ordre. */
export const ETAPES_PARCOURS = ['REPERE', 'VISITE_PLANIFIEE', 'VISITE', 'CONTRE_VISITE', 'OFFRE_FAITE', 'OFFRE_ACCEPTEE', 'COMPROMIS'] as const satisfies readonly Etape[];
/** Fins de parcours : le bien n'est plus à l'étude. */
export const ETAPES_TERMINALES = ['OFFRE_REFUSEE', 'ABANDONNE'] as const satisfies readonly Etape[];

export function estTerminee(etape: Etape): boolean {
  return (ETAPES_TERMINALES as readonly Etape[]).includes(etape);
}

export interface ChangementEtape {
  etape: Etape;
  commentaire?: string;
  /** Seulement pour `OFFRE_FAITE`. */
  montant?: number;
  /** Date du changement ; maintenant par défaut. */
  date?: Date;
}

/** Nouveau bien avec l'étape et une entrée de plus dans l'historique ; le bien d'origine n'est pas modifié. */
export function changerEtape(bien: Bien, changement: ChangementEtape): Bien {
  const commentaire = changement.commentaire?.trim();
  const entree: EntreeHistorique = {
    etape: changement.etape,
    date: (changement.date ?? new Date()).toISOString(),
    ...(commentaire ? { commentaire } : {}),
    ...(changement.etape === 'OFFRE_FAITE' && changement.montant !== undefined && changement.montant >= 0
      ? { montant: changement.montant }
      : {}),
  };
  return { ...bien, etape: changement.etape, historiqueEtapes: [...bien.historiqueEtapes, entree] };
}

/** Retire la dernière entrée de l'historique et revient à l'étape précédente. L'étape initiale reste. */
export function annulerDernierChangement(bien: Bien): Bien {
  if (bien.historiqueEtapes.length <= 1) return bien;
  const historiqueEtapes = bien.historiqueEtapes.slice(0, -1);
  return { ...bien, etape: historiqueEtapes[historiqueEtapes.length - 1].etape, historiqueEtapes };
}

/** Dernière offre faite sur le bien, ou `undefined`. */
export function montantOffre(bien: Pick<Bien, 'historiqueEtapes'>): number | undefined {
  for (let i = bien.historiqueEtapes.length - 1; i >= 0; i--) {
    const m = bien.historiqueEtapes[i].montant;
    if (m !== undefined) return m;
  }
  return undefined;
}

/** Date d'entrée dans l'étape actuelle (dernière entrée de l'historique). */
export function dateEtapeActuelle(bien: Pick<Bien, 'historiqueEtapes'>): string | undefined {
  return bien.historiqueEtapes[bien.historiqueEtapes.length - 1]?.date;
}

export type FiltreBiens = { type: 'EN_COURS' } | { type: 'TERMINES' } | { type: 'TOUS' } | { type: 'ETAPE'; etape: Etape };

/** Par défaut, les biens terminés sont masqués (SPEC §7). */
export const FILTRE_DEFAUT: FiltreBiens = { type: 'EN_COURS' };

export function filtrerBiens<T extends Pick<Bien, 'etape'>>(biens: readonly T[], filtre: FiltreBiens): T[] {
  switch (filtre.type) {
    case 'TOUS':
      return [...biens];
    case 'EN_COURS':
      return biens.filter((b) => !estTerminee(b.etape));
    case 'TERMINES':
      return biens.filter((b) => estTerminee(b.etape));
    case 'ETAPE':
      return biens.filter((b) => b.etape === filtre.etape);
  }
}

export interface DecompteEtapes {
  enCours: number;
  termines: number;
  tous: number;
  parEtape: Record<Etape, number>;
}

export function compterBiens(biens: readonly Pick<Bien, 'etape'>[]): DecompteEtapes {
  const parEtape = Object.fromEntries(ETAPES.map((e) => [e, 0])) as Record<Etape, number>;
  for (const b of biens) parEtape[b.etape]++;
  const termines = biens.filter((b) => estTerminee(b.etape)).length;
  return { enCours: biens.length - termines, termines, tous: biens.length, parEtape };
}

export function memeFiltre(a: FiltreBiens, b: FiltreBiens): boolean {
  return a.type === b.type && (a.type !== 'ETAPE' || (b.type === 'ETAPE' && a.etape === b.etape));
}
