/**
 * Règles des aides au financement (SPEC §12), état au 19 octobre 2026.
 * Valeurs recoupées sur economie.gouv.fr, anil.org, ecologie.gouv.fr, le guide Anah 2026 et plusieurs courtiers.
 * Elles changent souvent (lois de finances, arrêtés) : à relire avant chaque nouvelle version.
 */

export const DATE_REGLES = '19 octobre 2026';

export type ZonePtz = 'A' | 'B1' | 'B2' | 'C';
export const ZONES_PTZ: readonly ZonePtz[] = ['A', 'B1', 'B2', 'C'];

// ---------- PTZ (CCH L.31-10-1 et suivants ; décret et arrêté du 29/03/2025, valables jusqu'au 31/12/2027) ----------

/** Coefficient familial selon le nombre d'occupants (1 à 8 et plus). */
export const COEF_FAMILIAL_PTZ = [1, 1.5, 1.8, 2.1, 2.4, 2.7, 3, 3.3] as const;

/** Plafond de ressources pour 1 personne = borne haute de la tranche 4 ; multiplié par le coefficient familial. */
export const PLAFOND_RESSOURCES_PTZ_1P: Record<ZonePtz, number> = { A: 49_000, B1: 34_500, B2: 31_500, C: 28_500 };

/** Bornes hautes des tranches 1 à 4, appliquées au revenu retenu ÷ coefficient familial. */
export const TRANCHES_PTZ: Record<ZonePtz, readonly [number, number, number, number]> = {
  A: [25_000, 31_000, 37_000, 49_000],
  B1: [21_500, 26_000, 30_000, 34_500],
  B2: [18_000, 22_500, 27_000, 31_500],
  C: [15_000, 19_500, 24_000, 28_500],
};

/** Plafond du coût de l'opération pour 1 personne ; coefficients 1 / 1,5 / 1,8 / 2,1 / 2,4 (plafonnés à 5 personnes). */
export const PLAFOND_OPERATION_PTZ_1P: Record<ZonePtz, number> = { A: 150_000, B1: 135_000, B2: 110_000, C: 100_000 };
export const COEF_OPERATION_PTZ = [1, 1.5, 1.8, 2.1, 2.4] as const;

/** Quotité par tranche (1 à 4). */
export const QUOTITE_PTZ = {
  /** Ancien avec travaux, neuf collectif, vente HLM. */
  ANCIEN: [50, 40, 40, 20],
  NEUF_INDIVIDUEL: [30, 20, 20, 10],
} as const;

/** Durées par tranche, en années : différé total puis remboursement. */
export const DUREES_PTZ: readonly { differe: number; remboursement: number }[] = [
  { differe: 10, remboursement: 15 },
  { differe: 8, remboursement: 12 },
  { differe: 2, remboursement: 13 },
  { differe: 0, remboursement: 10 },
];

/** Ancien : seulement en zones B2 et C, avec des travaux d'au moins 25 % du coût total de l'opération. */
export const ZONES_PTZ_ANCIEN: readonly ZonePtz[] = ['B2', 'C'];
export const PART_TRAVAUX_PTZ_ANCIEN_PCT = 25;
/** Le revenu retenu est au moins le coût de l'opération divisé par 9. */
export const DIVISEUR_REVENU_PTZ = 9;

// ---------- Éco-PTZ (logement achevé depuis plus de 2 ans, résidence principale, sans condition de ressources) ----------

export type CategorieEcoPtz = 'TOITURE' | 'MURS' | 'PAROIS_VITREES' | 'PLANCHER_BAS' | 'CHAUFFAGE_ENR' | 'ECS_ENR' | 'ANC';

export const ECO_PTZ = {
  fenetresSeules: 7_000,
  uneAction: 15_000,
  deuxActions: 25_000,
  troisActions: 30_000,
  performanceGlobale: 50_000,
  assainissement: 10_000,
  dureeMois: 15 * 12,
  dureePerformanceGlobaleMois: 20 * 12,
} as const;

// ---------- Plafonds Anah 2026 (MaPrimeRénov', CEE « précarité ») : 1 à 5 personnes, puis par personne en plus ----------

export type CategorieAnah = 'TRES_MODESTE' | 'MODESTE' | 'INTERMEDIAIRE' | 'SUPERIEUR';

interface BaremeAnah {
  tresModeste: readonly number[];
  modeste: readonly number[];
  intermediaire: readonly number[];
  /** Par personne en plus au-delà de 5 : [très modeste, modeste, intermédiaire]. */
  parPersonne: readonly [number, number, number];
}

export const PLAFONDS_ANAH: { ileDeFrance: BaremeAnah; autresRegions: BaremeAnah } = {
  ileDeFrance: {
    tresModeste: [24_031, 35_270, 42_357, 49_455, 56_580],
    modeste: [29_253, 42_933, 51_564, 60_208, 68_877],
    intermediaire: [40_851, 60_051, 71_846, 84_562, 96_817],
    parPersonne: [7_116, 8_663, 12_257],
  },
  autresRegions: {
    tresModeste: [17_363, 25_393, 30_540, 35_676, 40_835],
    modeste: [22_259, 32_553, 39_148, 45_735, 52_348],
    intermediaire: [31_185, 45_842, 55_196, 64_550, 73_907],
    parPersonne: [5_151, 6_597, 9_356],
  },
};

// ---------- MaPrimeRénov' rénovation d'ampleur (logements classés E, F ou G, accompagnateur Rénov' obligatoire) ----------

export const MPR_AMPLEUR = {
  tauxPct: { TRES_MODESTE: 80, MODESTE: 60, INTERMEDIAIRE: 45, SUPERIEUR: 10 } as Record<CategorieAnah, number>,
  /** Écrêtement : toutes aides confondues, en % du coût TTC. */
  ecretementPct: { TRES_MODESTE: 100, MODESTE: 90, INTERMEDIAIRE: 80, SUPERIEUR: 50 } as Record<CategorieAnah, number>,
  plafondHt2Classes: 30_000,
  plafondHt3Classes: 40_000,
  /** TVA à 5,5 % sur les travaux de rénovation énergétique. */
  tauxTva: 5.5,
  classesEligibles: ['E', 'F', 'G'] as readonly string[],
} as const;

// ---------- Action Logement (salariés d'une entreprise privée non agricole d'au moins 10 salariés) ----------

export const ACTION_LOGEMENT = {
  accession: { montantMax: 30_000, tauxPct: 1, dureeMaxMois: 25 * 12 },
  travaux: { montantMax: 10_000, tauxPct: 1.5, dureeMaxMois: 10 * 12 },
} as const;

// ---------- Règles bancaires (HCSF) et valeurs par défaut ----------

export const HCSF = {
  tauxEffortMaxPct: 35,
  dureeMaxMois: 25 * 12,
  /** Neuf, ou achat avec travaux d'au moins 10 % du coût total : 27 ans (différé de 2 ans au plus). */
  dureeMaxAvecTravauxMois: 27 * 12,
  partTravauxPourDureeLonguePct: 10,
} as const;

/** Taux moyens observés en octobre 2026 (hors assurance), pour pré-remplir. */
export const TAUX_MOYENS = { 15: 3.5, 20: 3.65, 25: 3.75 } as const;
export const TAUX_ASSURANCE_DEFAUT_PCT = 0.3;
/** Caution type Crédit Logement : environ 1 % du capital (une partie est restituée en fin de prêt). */
export const TAUX_GARANTIE_DEFAUT_PCT = 1;
export const FRAIS_DOSSIER_DEFAUT = 1_000;

/** Liens pour vérifier ou compléter (zone d'une commune, aides locales). */
export const LIENS_AIDES = {
  zonePtz: 'https://www.service-public.fr/simulateur/calcul/zonage-abc',
  ptz: 'https://www.economie.gouv.fr/particuliers/emprunter-et-sassurer/pret-taux-zero-ptz-tout-ce-quil-faut-savoir',
  ecoPtz: 'https://www.anil.org/aj-eco-pret-a-taux-zero/',
  anah: 'https://www.anah.gouv.fr',
  franceRenov: 'https://france-renov.gouv.fr',
  mesAidesReno: 'https://mesaidesreno.beta.gouv.fr',
  actionLogement: 'https://www.actionlogement.fr',
  aidesLocales: 'https://www.anil.org/aides-locales-travaux/',
} as const;
