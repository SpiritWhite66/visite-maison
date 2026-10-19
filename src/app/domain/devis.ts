import { Fourchette } from './budget';
import { Devis, PosteTravaux } from './modeles';

/**
 * Devis (SPEC §13). Un poste peut avoir plusieurs devis à comparer ; au plus un est accepté,
 * et son montant remplace l'estimation du poste dans tous les budgets.
 */

/** Le devis accepté d'un poste, tel qu'il doit être recopié sur le poste. */
export function devisRetenuPour(posteId: string, devis: readonly Devis[]): PosteTravaux['devisRetenu'] {
  const accepte = devis.find((d) => d.posteId === posteId && d.statut === 'ACCEPTE');
  return accepte ? { devisId: accepte.id, montant: accepte.montantTtc } : undefined;
}

export function memeDevisRetenu(a: PosteTravaux['devisRetenu'], b: PosteTravaux['devisRetenu']): boolean {
  return a?.devisId === b?.devisId && a?.montant === b?.montant;
}

/**
 * Enregistre un devis dans la liste : s'il est accepté, l'ancien devis accepté du même poste
 * repasse « en attente ». Renvoie toute la liste à jour.
 */
export function integrerDevis(liste: readonly Devis[], devis: Devis): Devis[] {
  const autres = liste
    .filter((d) => d.id !== devis.id)
    .map((d) => (devis.statut === 'ACCEPTE' && devis.posteId !== null && d.posteId === devis.posteId && d.statut === 'ACCEPTE' ? { ...d, statut: 'EN_ATTENTE' as const } : d));
  return [...autres, devis];
}

/** Devis dont la date de validité est passée (et qui n'est ni accepté ni refusé). */
export function estExpire(devis: Devis, aujourdhui: string): boolean {
  return devis.statut === 'EN_ATTENTE' && !!devis.valableJusquau && devis.valableJusquau < aujourdhui;
}

export interface GroupeDevis {
  poste: PosteTravaux;
  /** Estimation du poste sans tenir compte du devis retenu. */
  estimation: Fourchette;
  /** Du moins cher au plus cher. */
  devis: Devis[];
  retenu: Devis | null;
  moinsCher: Devis | null;
}

export interface ResumeDevis {
  groupes: GroupeDevis[];
  sansPoste: Devis[];
  nombre: number;
  enAttente: number;
  /** Postes couverts par un devis accepté, sur le total des postes. */
  postesCouverts: number;
  postesTotal: number;
  totalRetenu: number;
  /** Estimation des postes couverts, pour comparer au total retenu. */
  estimationCouverte: Fourchette;
}

const parMontant = (a: Devis, b: Devis) => a.montantTtc - b.montantTtc || a.entreprise.localeCompare(b.entreprise, 'fr');

/** Vue d'ensemble des devis d'un bien, poste par poste. */
export function resumerDevis(
  postes: readonly PosteTravaux[],
  devis: readonly Devis[],
  estimation: (poste: PosteTravaux) => Fourchette,
): ResumeDevis {
  const groupes: GroupeDevis[] = postes
    .map((poste) => {
      const liste = devis.filter((d) => d.posteId === poste.id).sort(parMontant);
      const comparables = liste.filter((d) => d.statut !== 'REFUSE');
      return {
        poste,
        estimation: estimation(poste),
        devis: liste,
        retenu: liste.find((d) => d.statut === 'ACCEPTE') ?? null,
        moinsCher: comparables[0] ?? null,
      };
    })
    .filter((g) => g.devis.length > 0);
  const idsPostes = new Set(postes.map((p) => p.id));
  const sansPoste = devis.filter((d) => d.posteId === null || !idsPostes.has(d.posteId)).sort(parMontant);
  const couverts = groupes.filter((g) => g.retenu);
  return {
    groupes,
    sansPoste,
    nombre: devis.length,
    enAttente: devis.filter((d) => d.statut === 'EN_ATTENTE').length,
    postesCouverts: couverts.length,
    postesTotal: postes.length,
    totalRetenu: couverts.reduce((s, g) => s + g.retenu!.montantTtc, 0),
    estimationCouverte: couverts.reduce((s, g) => ({ bas: s.bas + g.estimation.bas, haut: s.haut + g.estimation.haut }), { bas: 0, haut: 0 }),
  };
}

/** Position d'un montant par rapport à une fourchette : « dans », « en dessous » ou « au-dessus ». */
export function positionDansFourchette(montant: number, f: Fourchette): 'DESSOUS' | 'DANS' | 'DESSUS' {
  if (montant < f.bas) return 'DESSOUS';
  if (montant > f.haut) return 'DESSUS';
  return 'DANS';
}
