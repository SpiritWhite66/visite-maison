import { describe, expect, it } from 'vitest';
import { calculerFinancement, categorieAnah, EntreeFinancement, evaluerPtz, FOYER_DEFAUT, gestesSuggeres, nouveauPlan, plafondEcoPtz, tauxMoyen, trancheEtPlafond } from './financement';
import { Foyer, PlanFinancement } from './modeles';

const foyer: Foyer = { ...FOYER_DEFAUT, occupants: 2, revenuFiscalN2: 30_000, revenusNetsMensuels: 4_000 };
const entree: EntreeFinancement = {
  prixNegocie: 150_000,
  tauxNotairePct: 8,
  travaux: { bas: 50_000, haut: 70_000 },
  postes: [
    { baremeId: 'bareme-04', montant: { bas: 4_000, haut: 6_000 } },
    { baremeId: 'bareme-15', montant: { bas: 12_000, haut: 18_000 } },
    { baremeId: 'bareme-18', montant: { bas: 2_000, haut: 3_000 } },
  ],
  dpe: 'F',
};
const plan = (p: Partial<PlanFinancement> = {}): PlanFinancement => ({ ...nouveauPlan('b1', new Date(2026, 9, 19)), zone: 'C', apport: 20_000, ...p });

describe('PTZ', () => {
  it('détermine la tranche avec le coefficient familial', () => {
    expect(trancheEtPlafond('C', 2, 30_000)).toEqual({ tranche: 3, plafond: 42_750 });
    expect(trancheEtPlafond('C', 1, 15_000).tranche).toBe(1);
    expect(trancheEtPlafond('A', 8, 161_700).tranche).toBe(4);
    expect(trancheEtPlafond('C', 2, 42_751).tranche).toBeNull();
  });

  it('calcule le montant dans l’ancien en zone C avec 25 % de travaux', () => {
    const r = evaluerPtz(foyer, { zone: 'C', typeOperation: 'ANCIEN' }, 150_000, 60_000, 0);
    expect(r.statut).toBe('ELIGIBLE');
    expect(r.tranche).toBe(3);
    expect(r.maximum).toBe(60_000); // 40 % de 150 000 (plafond 2 personnes en zone C)
    expect(r.dureeMois).toBe(180);
    expect(r.differeMois).toBe(24);
  });

  it('refuse l’ancien hors B2/C ou avec trop peu de travaux, et le non primo-accédant', () => {
    expect(evaluerPtz(foyer, { zone: 'B1', typeOperation: 'ANCIEN' }, 150_000, 60_000, 0).statut).toBe('NON_ELIGIBLE');
    const peu = evaluerPtz(foyer, { zone: 'C', typeOperation: 'ANCIEN' }, 150_000, 40_000, 0);
    expect(peu.statut).toBe('NON_ELIGIBLE');
    expect(peu.raisons[0]).toMatch(/10\s000 € de travaux en plus/);
    expect(evaluerPtz({ ...foyer, primoAccedant: false }, { zone: 'C', typeOperation: 'ANCIEN' }, 150_000, 60_000, 0).statut).toBe('NON_ELIGIBLE');
    expect(evaluerPtz(foyer, { zone: null, typeOperation: 'ANCIEN' }, 150_000, 60_000, 0).statut).toBe('INCOMPLET');
  });

  it('retient au moins le coût de l’opération divisé par 9', () => {
    const r = evaluerPtz({ ...foyer, revenuFiscalN2: 10_000 }, { zone: 'A', typeOperation: 'NEUF_INDIVIDUEL' }, 450_000, 0, 0);
    expect(r.revenuRetenu).toBe(50_000);
    expect(r.tranche).toBe(3); // 50 000 / 1,5 = 33 333 € en zone A
    expect(r.maximum).toBe(45_000); // tranche 3 : 20 % de 225 000 €
  });
});

describe('autres aides', () => {
  it('classe les revenus selon les plafonds Anah 2026', () => {
    expect(categorieAnah(25_393, 2, false)).toBe('TRES_MODESTE');
    expect(categorieAnah(30_000, 2, false)).toBe('MODESTE');
    expect(categorieAnah(45_000, 2, false)).toBe('INTERMEDIAIRE');
    expect(categorieAnah(42_000, 2, true)).toBe('MODESTE');
    expect(categorieAnah(46_000, 7, false)).toBe('TRES_MODESTE'); // 40 835 + 2 × 5 151
  });

  it('plafonne l’éco-PTZ selon le nombre d’actions', () => {
    expect(plafondEcoPtz(['PAROIS_VITREES'], false)).toBe(7_000);
    expect(plafondEcoPtz(['TOITURE'], false)).toBe(15_000);
    expect(plafondEcoPtz(['TOITURE', 'CHAUFFAGE_ENR'], false)).toBe(25_000);
    expect(plafondEcoPtz(['TOITURE', 'MURS', 'CHAUFFAGE_ENR', 'TOITURE'], false)).toBe(30_000);
    expect(plafondEcoPtz(['ANC'], false)).toBe(10_000);
    expect(plafondEcoPtz([], true)).toBe(50_000);
  });

  it('propose les gestes d’après les postes du bien', () => {
    expect(gestesSuggeres(entree.postes).map((g) => g.type)).toEqual(['ISOLATION_TOITURE', 'PAC_AIR_EAU']);
  });

  it('interpole les taux moyens', () => {
    expect(tauxMoyen(180)).toBe(3.5);
    expect(tauxMoyen(300)).toBe(3.75);
    expect(tauxMoyen(270)).toBeCloseTo(3.7, 6);
  });
});

describe('plan de financement', () => {
  it('assemble emplois, aides et prêt bancaire', () => {
    const r = calculerFinancement(entree, foyer, plan({ gestes: gestesSuggeres(entree.postes) }));
    expect(r.emplois.prix).toBe(150_000);
    expect(r.emplois.notaire).toBe(12_000);
    expect(r.emplois.travaux).toBe(60_000);
    expect(r.totalGestes).toBe(20_000); // 5 000 + 15 000 en milieu de fourchette
    expect(r.ecoPtz.retenu).toBe(20_000);
    expect(r.ptz.retenu).toBe(60_000);
    // Besoin : 150 000 + 12 000 + 60 000 + 1 000 de dossier − 20 000 d'apport − 80 000 de prêts aidés, garantie de 1 % incluse.
    expect(r.pretBanque).toBeCloseTo(123_000 / 0.99, 6);
    expect(r.emplois.garantie).toBeCloseTo(r.pretBanque * 0.01, 6);
    const ressources = 20_000 + r.pretBanque + r.ptz.retenu + r.ecoPtz.retenu;
    expect(ressources).toBeCloseTo(r.emplois.total, 6);
    expect(r.categorieAnah).toBe('MODESTE');
    expect(r.maPrimeRenov.statut).toBe('INCOMPLET'); // gain de classes non renseigné
    // Lissage : total constant pendant les 25 ans du prêt bancaire.
    expect(r.montage.mensualiteLissee).not.toBeNull();
    expect(r.tableau.slice(0, 300).every((l) => Math.abs(l.total - r.montage.mensualiteLissee!) < 1e-3)).toBe(true);
    expect(r.tauxEffortPct).toBeCloseTo((r.mensualiteMax / 4_000) * 100, 6);
    expect(r.taegBanquePct).toBeGreaterThan(3.75);
  });

  it('plafonne le PTZ au total des autres prêts', () => {
    const r = calculerFinancement(entree, foyer, plan({ apport: 170_000 }));
    expect(r.ptz.retenu).toBeCloseTo(r.pretBanque, 6);
    expect(r.ptz.raisons.at(-1)).toContain('Plafonné');
  });

  it('calcule MaPrimeRénov’ rénovation d’ampleur et déduit les primes si demandé', () => {
    const p = plan({ gestes: gestesSuggeres(entree.postes), gainClasses: 3, primesDeduites: true, cee: { inclus: true, montant: 4_000 } });
    const r = calculerFinancement(entree, foyer, p);
    expect(r.maPrimeRenov.statut).toBe('A_VERIFIER');
    expect(r.maPrimeRenov.retenu).toBeCloseTo((20_000 / 1.055) * 0.6, 6);
    expect(r.primes).toBeCloseTo(4_000 + r.maPrimeRenov.retenu, 6);
    const sans = calculerFinancement(entree, foyer, { ...p, primesDeduites: false });
    expect(sans.pretBanque - r.pretBanque).toBeCloseTo(r.primes / 0.99, 6);
  });

  it('signale un endettement trop élevé et une durée trop longue', () => {
    const r = calculerFinancement(entree, { ...foyer, revenusNetsMensuels: 2_000 }, plan({ banque: { tauxPct: 3.75, dureeMois: 360, tauxAssurancePct: 0.3 } }));
    expect(r.alertes.some((a) => a.includes('endettement'))).toBe(true);
    expect(r.alertes.some((a) => a.includes('27 ans'))).toBe(true);
  });

  it('ajoute les aides locales : subvention déduite, prêt dans le montage', () => {
    const r = calculerFinancement(entree, foyer, plan({
      primesDeduites: true,
      aidesLocales: [
        { id: 'l1', libelle: 'Aide commune', nature: 'SUBVENTION', montant: 2_000, tauxPct: 0, dureeMois: 0 },
        { id: 'l2', libelle: 'Prêt région', nature: 'PRET', montant: 10_000, tauxPct: 0, dureeMois: 120 },
      ],
    }));
    expect(r.subventionsLocales).toBe(2_000);
    expect(r.prets.map((p) => p.id)).toContain('l2');
  });
});
