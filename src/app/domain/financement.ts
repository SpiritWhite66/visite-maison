import { calculerMontage, Echeancier, LigneMontage, Montage, PretCalcul, tableauMontage, taeg } from './amortissement';
import { Foyer, GestePlan, HypotheseTravaux, NoteEnergie, PlanFinancement, ReglagePret, TypeGeste } from './modeles';
import {
  ACTION_LOGEMENT,
  CategorieAnah,
  CategorieEcoPtz,
  COEF_FAMILIAL_PTZ,
  COEF_OPERATION_PTZ,
  DIVISEUR_REVENU_PTZ,
  DUREES_PTZ,
  ECO_PTZ,
  FRAIS_DOSSIER_DEFAUT,
  HCSF,
  MPR_AMPLEUR,
  PART_TRAVAUX_PTZ_ANCIEN_PCT,
  PLAFOND_OPERATION_PTZ_1P,
  PLAFOND_RESSOURCES_PTZ_1P,
  PLAFONDS_ANAH,
  QUOTITE_PTZ,
  TAUX_ASSURANCE_DEFAUT_PCT,
  TAUX_GARANTIE_DEFAUT_PCT,
  TAUX_MOYENS,
  TRANCHES_PTZ,
  ZonePtz,
  ZONES_PTZ_ANCIEN,
} from './regles-aides';

// ---------- Travaux de rénovation énergétique ----------

export interface DefinitionGeste {
  type: TypeGeste;
  libelle: string;
  /** Catégorie d'action éco-PTZ, ou `null` si le geste n'y ouvre pas droit. */
  ecoPtz: CategorieEcoPtz | null;
  /** Lignes du barème dont les postes alimentent ce geste. */
  baremeIds: readonly string[];
  /** Ordre de grandeur de la prime CEE (pas de barème officiel : elle dépend du fournisseur). */
  indicationCee: string | null;
  /** Encore finançable par MaPrimeRénov' par geste (depuis le 1er septembre 2026 : pompes à chaleur). */
  mprGeste: boolean;
}

export const GESTES: readonly DefinitionGeste[] = [
  { type: 'ISOLATION_TOITURE', libelle: 'Isolation des combles ou de la toiture', ecoPtz: 'TOITURE', baremeIds: ['bareme-04', 'bareme-32'], indicationCee: 'environ 700 à 1 500 € pour 100 m² de combles', mprGeste: false },
  { type: 'ISOLATION_MURS', libelle: 'Isolation des murs', ecoPtz: 'MURS', baremeIds: ['bareme-05', 'bareme-06'], indicationCee: 'environ 12 à 37 € par m² de mur', mprGeste: false },
  { type: 'ISOLATION_PLANCHER', libelle: 'Isolation du plancher bas', ecoPtz: 'PLANCHER_BAS', baremeIds: ['bareme-33'], indicationCee: 'quelques centaines d’euros', mprGeste: false },
  { type: 'FENETRES', libelle: 'Fenêtres et portes extérieures', ecoPtz: 'PAROIS_VITREES', baremeIds: ['bareme-07', 'bareme-08', 'bareme-34'], indicationCee: 'faible, souvent moins de 100 € par fenêtre', mprGeste: false },
  { type: 'PAC_AIR_EAU', libelle: 'Pompe à chaleur air/eau', ecoPtz: 'CHAUFFAGE_ENR', baremeIds: ['bareme-15'], indicationCee: 'environ 2 500 à 11 000 € (Coup de pouce, modèle agréé), en remplacement d’une chaudière fioul ou gaz', mprGeste: true },
  { type: 'PAC_GEOTHERMIE', libelle: 'Pompe à chaleur géothermique', ecoPtz: 'CHAUFFAGE_ENR', baremeIds: [], indicationCee: 'environ 5 000 à 7 500 € (Coup de pouce)', mprGeste: true },
  { type: 'CHAUFFAGE_BOIS', libelle: 'Poêle ou chaudière bois', ecoPtz: 'CHAUFFAGE_ENR', baremeIds: ['bareme-14'], indicationCee: 'chaudière biomasse : environ 2 500 à 4 000 € ; poêle : moins', mprGeste: false },
  { type: 'CHAUFFE_EAU_THERMO', libelle: 'Chauffe-eau thermodynamique ou solaire', ecoPtz: 'ECS_ENR', baremeIds: ['bareme-39'], indicationCee: 'une centaine d’euros', mprGeste: false },
  { type: 'VMC_DOUBLE_FLUX', libelle: 'VMC double flux', ecoPtz: null, baremeIds: ['bareme-47'], indicationCee: 'quelques centaines d’euros', mprGeste: false },
  { type: 'ASSAINISSEMENT', libelle: 'Assainissement non collectif (sans énergie)', ecoPtz: 'ANC', baremeIds: ['bareme-21'], indicationCee: null, mprGeste: false },
];

export function definitionGeste(type: TypeGeste): DefinitionGeste {
  return GESTES.find((g) => g.type === type)!;
}

/** Montant d'un poste selon l'hypothèse de travaux retenue. */
export function selonHypothese(m: { bas: number; haut: number }, h: HypotheseTravaux): number {
  return h === 'BAS' ? m.bas : h === 'HAUT' ? m.haut : (m.bas + m.haut) / 2;
}

// ---------- Catégorie de revenus Anah ----------

export function categorieAnah(revenu: number, occupants: number, ileDeFrance: boolean): CategorieAnah {
  const b = ileDeFrance ? PLAFONDS_ANAH.ileDeFrance : PLAFONDS_ANAH.autresRegions;
  const n = Math.max(1, Math.round(occupants));
  const plafond = (liste: readonly number[], parPersonne: number) => (n <= 5 ? liste[n - 1] : liste[4] + (n - 5) * parPersonne);
  if (revenu <= plafond(b.tresModeste, b.parPersonne[0])) return 'TRES_MODESTE';
  if (revenu <= plafond(b.modeste, b.parPersonne[1])) return 'MODESTE';
  if (revenu <= plafond(b.intermediaire, b.parPersonne[2])) return 'INTERMEDIAIRE';
  return 'SUPERIEUR';
}

// ---------- Résultat ----------

export type StatutAide = 'ELIGIBLE' | 'A_VERIFIER' | 'NON_ELIGIBLE' | 'INCOMPLET';

export interface ResultatAide {
  statut: StatutAide;
  /** Pourquoi ce statut (conditions remplies ou manquantes). */
  raisons: string[];
  /** Montant maximum possible. */
  maximum: number;
  /** Montant retenu dans le plan (0 si exclu ou non éligible). */
  retenu: number;
}

export interface ResultatPtz extends ResultatAide {
  tranche: number | null;
  revenuRetenu: number;
  coutOperation: number;
  dureeMois: number;
  differeMois: number;
}

export interface EntreeFinancement {
  prixNegocie: number;
  tauxNotairePct: number;
  /** Fourchette de travaux du bien. */
  travaux: { bas: number; haut: number };
  /** Postes au barème, avec leur fourchette, pour pré-remplir les gestes. */
  postes: readonly { baremeId?: string; montant: { bas: number; haut: number } }[];
  dpe: NoteEnergie | null;
}

export interface Emplois {
  prix: number;
  notaire: number;
  travaux: number;
  fraisDossier: number;
  garantie: number;
  courtage: number;
  total: number;
}

export interface ResultatFinancement {
  emplois: Emplois;
  gestes: { type: TypeGeste; libelle: string; montant: number; depuisPostes: boolean }[];
  totalGestes: number;
  categorieAnah: CategorieAnah;
  ptz: ResultatPtz;
  ecoPtz: ResultatAide & { dureeMois: number };
  actionLogementAccession: ResultatAide & { dureeMois: number };
  actionLogementTravaux: ResultatAide & { dureeMois: number };
  cee: ResultatAide;
  maPrimeRenov: ResultatAide;
  subventionsLocales: number;
  /** Primes et subventions retenues (CEE, MaPrimeRénov', aides locales). */
  primes: number;
  pretBanque: number;
  prets: PretCalcul[];
  montage: Montage;
  tableau: LigneMontage[];
  /** Plus haute mensualité totale (assurances comprises). */
  mensualiteMax: number;
  premiereMensualite: number;
  tauxEffortPct: number | null;
  /** Mensualité maximale à 35 % d'endettement, crédits en cours déduits. */
  capaciteMensuelle: number | null;
  dureeMaxBanqueMois: number;
  coutInterets: number;
  coutAssurance: number;
  coutFrais: number;
  taegBanquePct: number | null;
  /** Ce qui reste à financer si le prêt bancaire ne suffit pas (apport insuffisant ou excédentaire). */
  excedentApport: number;
  alertes: string[];
}

export const ID_PRET = {
  banque: 'banque',
  ptz: 'ptz',
  ecoPtz: 'eco-ptz',
  alAccession: 'action-logement',
  alTravaux: 'action-logement-travaux',
} as const;

const positif = (v: number | null | undefined) => Math.max(0, Number(v) || 0);

function montantRetenu(reglage: Pick<ReglagePret, 'inclus' | 'montant'>, statut: StatutAide, maximum: number): number {
  if (!reglage.inclus || statut === 'NON_ELIGIBLE' || statut === 'INCOMPLET') return 0;
  return reglage.montant === null ? maximum : Math.min(positif(reglage.montant), maximum);
}

function dureeChoisie(reglage: ReglagePret, maximum: number): number {
  return reglage.dureeMois ? Math.min(Math.max(12, Math.round(reglage.dureeMois)), maximum) : maximum;
}

// ---------- PTZ ----------

export function trancheEtPlafond(zone: ZonePtz, occupants: number, revenuRetenu: number): { tranche: number | null; plafond: number } {
  const n = Math.min(Math.max(1, Math.round(occupants)), COEF_FAMILIAL_PTZ.length);
  const coef = COEF_FAMILIAL_PTZ[n - 1];
  const plafond = PLAFOND_RESSOURCES_PTZ_1P[zone] * coef;
  if (revenuRetenu > plafond) return { tranche: null, plafond };
  const index = TRANCHES_PTZ[zone].findIndex((borne) => revenuRetenu / coef <= borne);
  return { tranche: index < 0 ? null : index + 1, plafond };
}

export function plafondOperationPtz(zone: ZonePtz, occupants: number): number {
  const n = Math.min(Math.max(1, Math.round(occupants)), COEF_OPERATION_PTZ.length);
  return PLAFOND_OPERATION_PTZ_1P[zone] * COEF_OPERATION_PTZ[n - 1];
}

/** Éligibilité et montant maximum du PTZ, avant le plafonnement par les autres prêts. */
export function evaluerPtz(
  foyer: Foyer,
  plan: Pick<PlanFinancement, 'zone' | 'typeOperation'>,
  prix: number,
  travaux: number,
  financeParEcoPtz: number,
): ResultatPtz {
  const coutTotal = prix + travaux;
  const coutOperation = Math.max(0, coutTotal - financeParEcoPtz);
  const revenuRetenu = Math.max(positif(foyer.revenuFiscalN2), coutOperation / DIVISEUR_REVENU_PTZ);
  const base: ResultatPtz = { statut: 'NON_ELIGIBLE', raisons: [], maximum: 0, retenu: 0, tranche: null, revenuRetenu, coutOperation, dureeMois: 0, differeMois: 0 };
  const raisons: string[] = [];
  if (!foyer.primoAccedant) raisons.push('Réservé aux primo-accédants (pas propriétaire de sa résidence principale depuis 2 ans).');
  if (!plan.zone) return { ...base, statut: 'INCOMPLET', raisons: [...raisons, 'Indique la zone de la commune (A, B1, B2 ou C).'] };
  if (plan.typeOperation === 'ANCIEN') {
    if (!ZONES_PTZ_ANCIEN.includes(plan.zone)) raisons.push(`Dans l’ancien, seulement en zones B2 et C (ici zone ${plan.zone}).`);
    const part = coutTotal > 0 ? (travaux / coutTotal) * 100 : 0;
    if (part < PART_TRAVAUX_PTZ_ANCIEN_PCT) {
      raisons.push(`Dans l’ancien, les travaux doivent faire au moins 25 % du coût total (ici ${Math.floor(part)} %, il faudrait ${Math.ceil(prix / 3 - travaux).toLocaleString('fr-FR')} € de travaux en plus).`);
    }
  }
  const { tranche, plafond } = trancheEtPlafond(plan.zone, foyer.occupants, revenuRetenu);
  if (tranche === null) raisons.push(`Revenu retenu (${Math.round(revenuRetenu).toLocaleString('fr-FR')} €) au-dessus du plafond de la zone (${plafond.toLocaleString('fr-FR')} €).`);
  if (raisons.length > 0 || tranche === null) return { ...base, raisons, tranche };
  const quotite = (plan.typeOperation === 'NEUF_INDIVIDUEL' ? QUOTITE_PTZ.NEUF_INDIVIDUEL : QUOTITE_PTZ.ANCIEN)[tranche - 1];
  const plafondOperation = plafondOperationPtz(plan.zone, foyer.occupants);
  const duree = DUREES_PTZ[tranche - 1];
  return {
    ...base,
    statut: 'ELIGIBLE',
    raisons: [
      `Tranche ${tranche} : ${quotite} % de ${Math.min(coutOperation, plafondOperation).toLocaleString('fr-FR')} € (coût retenu, plafonné à ${plafondOperation.toLocaleString('fr-FR')} €).`,
      duree.differe > 0 ? `${duree.differe} ans sans rien payer, puis ${duree.remboursement} ans de remboursement.` : `Remboursé sur ${duree.remboursement} ans, sans différé.`,
    ],
    tranche,
    maximum: (Math.min(coutOperation, plafondOperation) * quotite) / 100,
    dureeMois: (duree.differe + duree.remboursement) * 12,
    differeMois: duree.differe * 12,
  };
}

// ---------- Éco-PTZ ----------

export function plafondEcoPtz(categories: readonly CategorieEcoPtz[], performanceGlobale: boolean): number {
  if (performanceGlobale) return ECO_PTZ.performanceGlobale;
  const distinctes = [...new Set(categories)];
  if (distinctes.length === 0) return 0;
  if (distinctes.length === 1) {
    if (distinctes[0] === 'PAROIS_VITREES') return ECO_PTZ.fenetresSeules;
    if (distinctes[0] === 'ANC') return ECO_PTZ.assainissement;
    return ECO_PTZ.uneAction;
  }
  return distinctes.length === 2 ? ECO_PTZ.deuxActions : ECO_PTZ.troisActions;
}

// ---------- Plan complet ----------

export function gestesDuPlan(gestes: readonly GestePlan[], entree: EntreeFinancement, h: HypotheseTravaux) {
  return gestes.map((g) => {
    const def = definitionGeste(g.type);
    const depuisPostes = g.montant === null;
    const montant = depuisPostes
      ? entree.postes.filter((p) => p.baremeId && def.baremeIds.includes(p.baremeId)).reduce((s, p) => s + selonHypothese(p.montant, h), 0)
      : positif(g.montant);
    return { type: g.type, libelle: def.libelle, montant, depuisPostes };
  });
}

export function calculerFinancement(entree: EntreeFinancement, foyer: Foyer, plan: PlanFinancement): ResultatFinancement {
  const alertes: string[] = [];
  const prix = plan.prixAchat ?? entree.prixNegocie;
  const notaire = plan.fraisNotaire ?? (prix * (plan.typeOperation === 'NEUF_INDIVIDUEL' ? 2.5 : entree.tauxNotairePct)) / 100;
  const travaux = plan.travaux ?? selonHypothese(entree.travaux, plan.hypotheseTravaux);
  const gestes = gestesDuPlan(plan.gestes, entree, plan.hypotheseTravaux);
  const totalGestes = gestes.reduce((s, g) => s + g.montant, 0);
  if (totalGestes > travaux + 0.5) alertes.push('Les travaux de rénovation énergétique dépassent le total des travaux du plan : vérifie les montants.');
  const categorie = categorieAnah(positif(foyer.revenuFiscalAnah ?? foyer.revenuFiscalN2), foyer.occupants, foyer.ileDeFrance);

  // Éco-PTZ
  const categoriesEco = gestes.filter((g) => g.montant > 0).map((g) => definitionGeste(g.type).ecoPtz).filter((c): c is CategorieEcoPtz => c !== null);
  const montantEligibleEco = gestes.filter((g) => definitionGeste(g.type).ecoPtz).reduce((s, g) => s + g.montant, 0);
  const dureeMaxEco = plan.ecoPtz.performanceGlobale ? ECO_PTZ.dureePerformanceGlobaleMois : ECO_PTZ.dureeMois;
  let ecoPtz: ResultatFinancement['ecoPtz'];
  if (plan.typeOperation !== 'ANCIEN') {
    ecoPtz = { statut: 'NON_ELIGIBLE', raisons: ['Réservé aux logements achevés depuis plus de 2 ans.'], maximum: 0, retenu: 0, dureeMois: dureeMaxEco };
  } else if (categoriesEco.length === 0 && !plan.ecoPtz.performanceGlobale) {
    ecoPtz = { statut: 'INCOMPLET', raisons: ['Aucun travaux éligible : coche des travaux de rénovation énergétique ci-dessus.'], maximum: 0, retenu: 0, dureeMois: dureeMaxEco };
  } else {
    const plafond = plafondEcoPtz(categoriesEco, plan.ecoPtz.performanceGlobale);
    const maximum = Math.min(plan.ecoPtz.performanceGlobale ? totalGestes : montantEligibleEco, plafond);
    const statut: StatutAide = maximum > 0 ? 'ELIGIBLE' : 'INCOMPLET';
    ecoPtz = {
      statut,
      raisons: [
        plan.ecoPtz.performanceGlobale
          ? 'Performance globale : jusqu’à 50 000 € sur 20 ans (audit, gain d’au moins 2 classes, chauffage décarboné).'
          : `${new Set(categoriesEco).size} action(s) : plafond ${plafond.toLocaleString('fr-FR')} €, sur 15 ans au plus.`,
        'Sans condition de ressources ; artisans RGE ; demande possible avec le prêt d’achat, travaux dans les 3 ans.',
      ],
      maximum,
      retenu: 0,
      dureeMois: dureeChoisie(plan.ecoPtz, dureeMaxEco),
    };
    ecoPtz.retenu = montantRetenu(plan.ecoPtz, statut, maximum);
  }

  // Action Logement
  const alA = ACTION_LOGEMENT.accession;
  const alAccession: ResultatFinancement['actionLogementAccession'] = foyer.salariePrive && foyer.primoAccedant
    ? {
        statut: 'A_VERIFIER',
        raisons: [
          `Jusqu’à ${alA.montantMax.toLocaleString('fr-FR')} € à ${alA.tauxPct.toLocaleString('fr-FR')} %, sous plafonds de ressources.`,
          plan.typeOperation === 'ANCIEN' ? 'Surtout réservé au neuf : à confirmer avec Action Logement pour un achat dans l’ancien.' : 'Achat dans le neuf : à confirmer avec Action Logement.',
        ],
        maximum: alA.montantMax,
        retenu: 0,
        dureeMois: dureeChoisie(plan.actionLogementAccession, alA.dureeMaxMois),
      }
    : { statut: 'NON_ELIGIBLE', raisons: [foyer.salariePrive ? 'Réservé aux primo-accédants.' : 'Réservé aux salariés d’une entreprise privée d’au moins 10 salariés.'], maximum: 0, retenu: 0, dureeMois: alA.dureeMaxMois };
  alAccession.retenu = montantRetenu(plan.actionLogementAccession, alAccession.statut, alAccession.maximum);

  const alT = ACTION_LOGEMENT.travaux;
  const alTravaux: ResultatFinancement['actionLogementTravaux'] = !foyer.salariePrive
    ? { statut: 'NON_ELIGIBLE', raisons: ['Réservé aux salariés d’une entreprise privée d’au moins 10 salariés.'], maximum: 0, retenu: 0, dureeMois: alT.dureeMaxMois }
    : totalGestes <= 0
      ? { statut: 'INCOMPLET', raisons: ['Pour des travaux de rénovation énergétique : coche-les ci-dessus.'], maximum: 0, retenu: 0, dureeMois: alT.dureeMaxMois }
      : {
          statut: 'A_VERIFIER',
          raisons: [`Jusqu’à ${alT.montantMax.toLocaleString('fr-FR')} € à ${alT.tauxPct.toLocaleString('fr-FR')} % sur 10 ans au plus, artisans RGE, sous plafonds de ressources.`, 'Demande en principe une fois propriétaire : à confirmer avec Action Logement.'],
          maximum: Math.min(alT.montantMax, totalGestes),
          retenu: 0,
          dureeMois: dureeChoisie(plan.actionLogementTravaux, alT.dureeMaxMois),
        };
  alTravaux.retenu = montantRetenu(plan.actionLogementTravaux, alTravaux.statut, alTravaux.maximum);

  // CEE : montant saisi (devis du fournisseur d'énergie)
  const gestesCee = gestes.filter((g) => g.montant > 0 && definitionGeste(g.type).indicationCee);
  const cee: ResultatAide = gestesCee.length === 0
    ? { statut: 'INCOMPLET', raisons: ['Aucun travaux éligible coché.'], maximum: 0, retenu: 0 }
    : {
        statut: positif(plan.cee.montant) > 0 ? 'A_VERIFIER' : 'INCOMPLET',
        raisons: [
          'Montant variable selon le fournisseur d’énergie : saisis celui de ton devis ou d’une simulation.',
          'À demander avant de signer le devis, versée après les travaux.',
          ...(categorie === 'TRES_MODESTE' || categorie === 'MODESTE' ? ['Revenus « modestes » : primes bonifiées.'] : []),
        ],
        maximum: positif(plan.cee.montant),
        retenu: 0,
      };
  cee.retenu = plan.cee.inclus && cee.statut === 'A_VERIFIER' ? cee.maximum : 0;

  // MaPrimeRénov'
  let mpr: ResultatAide;
  if (plan.maPrimeRenov.parcours === 'AMPLEUR') {
    const raisons: string[] = [];
    if (!entree.dpe || !MPR_AMPLEUR.classesEligibles.includes(entree.dpe)) raisons.push(`Rénovation d’ampleur : logements classés E, F ou G seulement (DPE du bien : ${entree.dpe ?? 'non renseigné'}).`);
    if (plan.gainClasses < 2) raisons.push('Il faut gagner au moins 2 classes DPE : indique le gain prévu.');
    if (totalGestes <= 0) raisons.push('Coche les travaux de rénovation énergétique prévus.');
    if (raisons.length > 0) {
      mpr = { statut: entree.dpe && MPR_AMPLEUR.classesEligibles.includes(entree.dpe) ? 'INCOMPLET' : 'NON_ELIGIBLE', raisons, maximum: 0, retenu: 0 };
    } else {
      const plafondHt = plan.gainClasses >= 3 ? MPR_AMPLEUR.plafondHt3Classes : MPR_AMPLEUR.plafondHt2Classes;
      const ht = totalGestes / (1 + MPR_AMPLEUR.tauxTva / 100);
      const taux = MPR_AMPLEUR.tauxPct[categorie];
      const brut = (Math.min(ht, plafondHt) * taux) / 100;
      const ecretement = (totalGestes * MPR_AMPLEUR.ecretementPct[categorie]) / 100 - cee.retenu;
      const maximum = Math.max(0, Math.min(brut, ecretement));
      mpr = {
        statut: 'A_VERIFIER',
        raisons: [
          `${taux} % de ${Math.round(Math.min(ht, plafondHt)).toLocaleString('fr-FR')} € HT (plafond ${plafondHt.toLocaleString('fr-FR')} € pour ${plan.gainClasses >= 3 ? '3 classes ou plus' : '2 classes'}).`,
          'Accompagnateur Rénov’ et audit obligatoires ; dossier à déposer une fois propriétaire, avant les travaux ; plus d’aide si un chauffage gaz ou fioul est gardé.',
        ],
        maximum,
        retenu: 0,
      };
    }
  } else {
    const pac = gestes.some((g) => g.montant > 0 && definitionGeste(g.type).mprGeste);
    mpr = categorie === 'SUPERIEUR'
      ? { statut: 'NON_ELIGIBLE', raisons: ['Par geste : réservé aux revenus très modestes, modestes et intermédiaires.'], maximum: 0, retenu: 0 }
      : !pac
        ? { statut: 'NON_ELIGIBLE', raisons: ['Par geste, depuis le 1er septembre 2026 : seulement pompes à chaleur, réseau de chaleur et audit.'], maximum: 0, retenu: 0 }
        : {
            statut: positif(plan.maPrimeRenov.montant) > 0 ? 'A_VERIFIER' : 'INCOMPLET',
            raisons: ['Forfait selon les revenus et l’équipement : saisis le montant donné par France Rénov’ ou Mes Aides Réno.'],
            maximum: positif(plan.maPrimeRenov.montant),
            retenu: 0,
          };
  }
  mpr.retenu = plan.maPrimeRenov.inclus && (mpr.statut === 'A_VERIFIER' || mpr.statut === 'ELIGIBLE') ? mpr.maximum : 0;

  const subventionsLocales = plan.aidesLocales.filter((a) => a.nature === 'SUBVENTION').reduce((s, a) => s + positif(a.montant), 0);
  const primes = cee.retenu + mpr.retenu + subventionsLocales;
  const pretsLocaux = plan.aidesLocales.filter((a) => a.nature === 'PRET' && positif(a.montant) > 0 && positif(a.dureeMois) > 0);

  // PTZ, puis prêt bancaire : PTZ ≤ somme des autres prêts ; la garantie dépend du montant du prêt bancaire.
  const ptzEval = evaluerPtz(foyer, plan, prix, travaux, ecoPtz.retenu);
  const fraisDossier = positif(plan.fraisDossier);
  const courtage = positif(plan.fraisCourtage);
  const g = Math.min(positif(plan.tauxGarantiePct), 50) / 100;
  const autresPrets = ecoPtz.retenu + alAccession.retenu + alTravaux.retenu + pretsLocaux.reduce((s, a) => s + positif(a.montant), 0);
  const base = prix + notaire + travaux + fraisDossier + courtage - positif(plan.apport) - (plan.primesDeduites ? primes : 0) - autresPrets;
  const plafondAutresPrets = Math.max(0, (base + autresPrets * (1 - g)) / (2 - g));
  let ptzRetenu = montantRetenu(plan.ptz, ptzEval.statut, ptzEval.maximum);
  if (ptzRetenu > plafondAutresPrets + 0.005) {
    ptzRetenu = plafondAutresPrets;
    ptzEval.raisons.push('Plafonné : le PTZ ne peut pas dépasser le total des autres prêts.');
  }
  const ptz: ResultatPtz = { ...ptzEval, retenu: ptzRetenu };
  const pretBanque = Math.max(0, (base - ptzRetenu) / (1 - g));
  const garantie = pretBanque * g;
  const excedentApport = Math.max(0, -(base - ptzRetenu));
  if (excedentApport > 0.5) alertes.push(`Apport et aides couvrent tout : ${Math.round(excedentApport).toLocaleString('fr-FR')} € de trop, aucun prêt bancaire nécessaire.`);

  const prets: PretCalcul[] = [];
  const assurance = positif(plan.banque.tauxAssurancePct);
  if (pretBanque > 0) prets.push({ id: ID_PRET.banque, libelle: 'Prêt bancaire', montant: pretBanque, tauxPct: positif(plan.banque.tauxPct), dureeMois: positif(plan.banque.dureeMois), differeMois: 0, differe: 'TOTAL', tauxAssurancePct: assurance });
  if (ptz.retenu > 0) prets.push({ id: ID_PRET.ptz, libelle: 'PTZ', montant: ptz.retenu, tauxPct: 0, dureeMois: ptz.dureeMois, differeMois: ptz.differeMois, differe: 'TOTAL', tauxAssurancePct: assurance });
  if (ecoPtz.retenu > 0) prets.push({ id: ID_PRET.ecoPtz, libelle: 'Éco-PTZ', montant: ecoPtz.retenu, tauxPct: 0, dureeMois: ecoPtz.dureeMois, differeMois: 0, differe: 'TOTAL', tauxAssurancePct: assurance });
  if (alAccession.retenu > 0) prets.push({ id: ID_PRET.alAccession, libelle: 'Prêt Action Logement', montant: alAccession.retenu, tauxPct: ACTION_LOGEMENT.accession.tauxPct, dureeMois: alAccession.dureeMois, differeMois: 0, differe: 'TOTAL', tauxAssurancePct: assurance });
  if (alTravaux.retenu > 0) prets.push({ id: ID_PRET.alTravaux, libelle: 'Prêt travaux Action Logement', montant: alTravaux.retenu, tauxPct: ACTION_LOGEMENT.travaux.tauxPct, dureeMois: alTravaux.dureeMois, differeMois: 0, differe: 'TOTAL', tauxAssurancePct: assurance });
  for (const a of pretsLocaux) prets.push({ id: a.id, libelle: a.libelle || 'Prêt local', montant: positif(a.montant), tauxPct: positif(a.tauxPct), dureeMois: positif(a.dureeMois), differeMois: 0, differe: 'TOTAL', tauxAssurancePct: assurance });

  const montage = calculerMontage(prets, pretBanque > 0 ? ID_PRET.banque : null, plan.lisser);
  const tableau = tableauMontage(montage);
  const mensualiteMax = Math.max(0, ...tableau.map((l) => l.total));
  const premiereMensualite = tableau[0]?.total ?? 0;
  const revenus = positif(foyer.revenusNetsMensuels);
  const charges = positif(foyer.chargesCreditsMensuelles);
  const tauxEffortPct = revenus > 0 ? ((mensualiteMax + charges) / revenus) * 100 : null;
  const capaciteMensuelle = revenus > 0 ? Math.max(0, (revenus * HCSF.tauxEffortMaxPct) / 100 - charges) : null;
  if (tauxEffortPct !== null && tauxEffortPct > HCSF.tauxEffortMaxPct + 1e-9) {
    alertes.push(`Taux d’endettement de ${tauxEffortPct.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} % : au-delà de 35 %, les banques refusent sauf exception.`);
  }
  if (revenus <= 0) alertes.push('Renseigne les revenus nets du foyer pour calculer le taux d’endettement.');
  const coutTotalOperation = prix + travaux;
  const dureeMaxBanqueMois = plan.typeOperation === 'NEUF_INDIVIDUEL' || (coutTotalOperation > 0 && (travaux / coutTotalOperation) * 100 >= HCSF.partTravauxPourDureeLonguePct) ? HCSF.dureeMaxAvecTravauxMois : HCSF.dureeMaxMois;
  const dureeTotale = Math.max(0, ...prets.map((p) => p.dureeMois));
  if (pretBanque > 0 && positif(plan.banque.dureeMois) > dureeMaxBanqueMois) alertes.push(`Durée du prêt bancaire au-delà de ${dureeMaxBanqueMois / 12} ans : hors des règles des banques.`);
  else if (dureeTotale > dureeMaxBanqueMois) alertes.push(`Un prêt dure ${dureeTotale / 12} ans : les banques limitent l’ensemble à ${dureeMaxBanqueMois / 12} ans, différé compris.`);
  if (positif(plan.apport) < notaire + fraisDossier + garantie + courtage) alertes.push('L’apport ne couvre pas les frais (notaire, banque) : les banques le demandent souvent.');
  if (primes > 0 && plan.primesDeduites) alertes.push(`Les primes (${Math.round(primes).toLocaleString('fr-FR')} €) sont versées après les travaux : il faudra avancer cette somme.`);

  const echeancierBanque: Echeancier | undefined = montage.echeanciers.find((e) => e.pret.id === ID_PRET.banque);
  const taegBanquePct = echeancierBanque
    ? taeg(pretBanque - fraisDossier - garantie - courtage, echeancierBanque.lignes.map((l) => l.echeance + l.assurance))
    : null;

  return {
    emplois: { prix, notaire, travaux, fraisDossier, garantie, courtage, total: prix + notaire + travaux + fraisDossier + garantie + courtage },
    gestes,
    totalGestes,
    categorieAnah: categorie,
    ptz,
    ecoPtz,
    actionLogementAccession: alAccession,
    actionLogementTravaux: alTravaux,
    cee,
    maPrimeRenov: mpr,
    subventionsLocales,
    primes,
    pretBanque,
    prets,
    montage,
    tableau,
    mensualiteMax,
    premiereMensualite,
    tauxEffortPct,
    capaciteMensuelle,
    dureeMaxBanqueMois,
    coutInterets: montage.echeanciers.reduce((s, e) => s + e.totalInterets, 0),
    coutAssurance: montage.echeanciers.reduce((s, e) => s + e.totalAssurance, 0),
    coutFrais: fraisDossier + garantie + courtage,
    taegBanquePct,
    excedentApport,
    alertes,
  };
}

/** Taux moyen pour une durée (octobre 2026), interpolé entre 15, 20 et 25 ans. */
export function tauxMoyen(dureeMois: number): number {
  const ans = dureeMois / 12;
  if (ans <= 15) return TAUX_MOYENS[15];
  if (ans <= 20) return TAUX_MOYENS[15] + ((TAUX_MOYENS[20] - TAUX_MOYENS[15]) * (ans - 15)) / 5;
  if (ans <= 25) return TAUX_MOYENS[20] + ((TAUX_MOYENS[25] - TAUX_MOYENS[20]) * (ans - 20)) / 5;
  return TAUX_MOYENS[25];
}

const PRET_VIDE: ReglagePret = { inclus: true, montant: null, dureeMois: null };

/** Plan de départ pour un bien : maison ancienne, travaux en milieu de fourchette, prêt sur 25 ans. */
export function nouveauPlan(bienId: string, maintenant: Date, gestes: GestePlan[] = []): PlanFinancement {
  const mois = new Date(maintenant.getFullYear(), maintenant.getMonth() + 4, 1);
  return {
    id: bienId,
    bienId,
    typeOperation: 'ANCIEN',
    zone: null,
    hypotheseTravaux: 'MILIEU',
    prixAchat: null,
    fraisNotaire: null,
    travaux: null,
    apport: 0,
    fraisDossier: FRAIS_DOSSIER_DEFAUT,
    tauxGarantiePct: TAUX_GARANTIE_DEFAUT_PCT,
    fraisCourtage: 0,
    gestes,
    gainClasses: 0,
    ptz: { ...PRET_VIDE },
    ecoPtz: { ...PRET_VIDE, performanceGlobale: false },
    actionLogementAccession: { ...PRET_VIDE, inclus: false },
    actionLogementTravaux: { ...PRET_VIDE, inclus: false },
    cee: { inclus: true, montant: 0 },
    maPrimeRenov: { inclus: true, parcours: 'AMPLEUR', montant: null },
    aidesLocales: [],
    primesDeduites: false,
    banque: { tauxPct: TAUX_MOYENS[25], dureeMois: 300, tauxAssurancePct: TAUX_ASSURANCE_DEFAUT_PCT },
    lisser: true,
    premiereEcheance: `${mois.getFullYear()}-${String(mois.getMonth() + 1).padStart(2, '0')}`,
    modifieLe: maintenant.toISOString(),
  };
}

/** Gestes proposés d'office : ceux pour lesquels le bien a déjà des postes de travaux. */
export function gestesSuggeres(postes: readonly { baremeId?: string }[]): GestePlan[] {
  return GESTES.filter((d) => postes.some((p) => p.baremeId && d.baremeIds.includes(p.baremeId))).map((d) => ({ type: d.type, montant: null }));
}

export const FOYER_DEFAUT: Foyer = {
  occupants: 2,
  revenuFiscalN2: 0,
  revenuFiscalAnah: null,
  revenusNetsMensuels: 0,
  chargesCreditsMensuelles: 0,
  primoAccedant: true,
  ileDeFrance: false,
  salariePrive: false,
};
