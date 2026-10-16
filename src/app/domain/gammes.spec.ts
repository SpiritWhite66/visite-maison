import { describe, expect, it } from 'vitest';
import { BAREME_DEFAUT } from './bareme-defaut';
import { enrichirBareme, LIGNES_ORIGINE } from './bareme-migration';
import { gammesDisponibles, montantsPoste, prixLigne } from './budget';
import { CATEGORIES, LigneBareme, PosteTravaux } from './modeles';

const parquet: LigneBareme = {
  id: 'bareme-18', categorie: 'Sols', libelle: 'Parquet posé', unite: 'M2', prixBas: 40, prixHaut: 90,
  gammes: { ECO: { prixBas: 30, prixHaut: 50 }, HAUT: { prixBas: 80, prixHaut: 160 } },
};
const demolition: LigneBareme = { id: 'bareme-28', categorie: 'Gros œuvre', libelle: 'Démolition', unite: 'FORFAIT', prixBas: 1000, prixHaut: 5000 };
const poste = (extra: Partial<PosteTravaux>): PosteTravaux => ({
  id: 'p', bienId: 'b', categorie: 'Sols', libelle: 'Parquet', modeChiffrage: 'BAREME', baremeId: 'bareme-18', quantite: 20,
  realisation: 'ARTISAN', montantBas: 0, montantHaut: 0, priorite: 'CONFORT', ...extra,
});

describe('gammes', () => {
  it('prend le prix de la gamme choisie', () => {
    expect(prixLigne(parquet, 'ECO')).toEqual({ bas: 30, haut: 50 });
    expect(prixLigne(parquet, 'STANDARD')).toEqual({ bas: 40, haut: 90 });
    expect(prixLigne(parquet, 'HAUT')).toEqual({ bas: 80, haut: 160 });
  });

  it('retombe sur le moyen de gamme quand la gamme n’est pas renseignée', () => {
    expect(prixLigne(demolition, 'HAUT')).toEqual({ bas: 1000, haut: 5000 });
    expect(prixLigne(parquet)).toEqual({ bas: 40, haut: 90 });
  });

  it('ne propose que les gammes renseignées', () => {
    expect(gammesDisponibles(parquet)).toEqual(['ECO', 'STANDARD', 'HAUT']);
    expect(gammesDisponibles(demolition)).toEqual(['STANDARD']);
  });

  it('chiffre un poste au barème selon sa gamme, moyen de gamme par défaut (postes existants)', () => {
    expect(montantsPoste(poste({}), [parquet], 0.4)).toEqual({ bas: 800, haut: 1800 });
    expect(montantsPoste(poste({ gamme: 'HAUT' }), [parquet], 0.4)).toEqual({ bas: 1600, haut: 3200 });
    expect(montantsPoste(poste({ gamme: 'ECO', realisation: 'DIY' }), [parquet], 0.4)).toEqual({ bas: 240, haut: 400 });
  });

  it('ignore la gamme d’un poste saisi à la main', () => {
    expect(montantsPoste(poste({ modeChiffrage: 'MANUEL', gamme: 'HAUT', montantBas: 100, montantHaut: 200 }), [parquet], 0.4)).toEqual({ bas: 100, haut: 200 });
  });
});

describe('barème par défaut', () => {
  it('garde les 28 lignes d’origine avec leurs prix, et en ajoute', () => {
    expect(BAREME_DEFAUT.length).toBeGreaterThan(LIGNES_ORIGINE);
    for (let n = 1; n <= LIGNES_ORIGINE; n++) expect(BAREME_DEFAUT.some((l) => l.id === `bareme-${String(n).padStart(2, '0')}`)).toBe(true);
    expect(BAREME_DEFAUT.find((l) => l.id === 'bareme-18')).toMatchObject({ prixBas: 40, prixHaut: 90 });
  });

  it('a des identifiants uniques, des catégories connues et des fourchettes cohérentes (bas ≤ moyen ≤ haut)', () => {
    expect(new Set(BAREME_DEFAUT.map((l) => l.id)).size).toBe(BAREME_DEFAUT.length);
    for (const l of BAREME_DEFAUT) {
      expect(CATEGORIES).toContain(l.categorie);
      expect(l.prixBas).toBeLessThanOrEqual(l.prixHaut);
      for (const g of Object.values(l.gammes ?? {})) expect(g.prixBas).toBeLessThanOrEqual(g.prixHaut);
      if (l.gammes?.ECO) expect(l.gammes.ECO.prixBas).toBeLessThanOrEqual(l.prixBas);
      if (l.gammes?.HAUT) expect(l.gammes.HAUT.prixHaut).toBeGreaterThanOrEqual(l.prixHaut);
    }
  });
});

describe('mise à niveau d’un barème enregistré', () => {
  const origine = BAREME_DEFAUT.filter((l) => Number(l.id.slice(7)) <= LIGNES_ORIGINE).map(({ gammes, ...l }) => l);

  it('ajoute les gammes aux lignes d’origine en gardant les prix modifiés par l’utilisateur', () => {
    const modifie = origine.map((l) => (l.id === 'bareme-18' ? { ...l, prixBas: 55, prixHaut: 95 } : l));
    const r = enrichirBareme(modifie, BAREME_DEFAUT);
    const p = r.find((l) => l.id === 'bareme-18')!;
    expect(p).toMatchObject({ prixBas: 55, prixHaut: 95 });
    expect(p.gammes?.HAUT).toEqual({ prixBas: 80, prixHaut: 160 });
  });

  it('ajoute les nouvelles lignes, sans faire revenir une ligne d’origine supprimée', () => {
    const sansParquet = origine.filter((l) => l.id !== 'bareme-18');
    const r = enrichirBareme(sansParquet, BAREME_DEFAUT);
    expect(r.some((l) => l.id === 'bareme-18')).toBe(false);
    expect(r.length).toBe(BAREME_DEFAUT.length - 1);
  });

  it('ne touche ni aux lignes personnelles ni aux gammes déjà réglées', () => {
    const perso: LigneBareme = { id: 'perso-1', categorie: 'Autre', libelle: 'Puits', unite: 'FORFAIT', prixBas: 1, prixHaut: 2 };
    const regle = { ...origine[0], gammes: { HAUT: { prixBas: 999, prixHaut: 1999 } } };
    const r = enrichirBareme([regle, perso], BAREME_DEFAUT);
    expect(r.find((l) => l.id === 'perso-1')).toEqual(perso);
    expect(r.find((l) => l.id === regle.id)?.gammes).toEqual({ HAUT: { prixBas: 999, prixHaut: 1999 } });
  });

  it('est sans effet une seconde fois', () => {
    const une = enrichirBareme(origine, BAREME_DEFAUT);
    expect(enrichirBareme(une, BAREME_DEFAUT)).toEqual(une);
  });
});
