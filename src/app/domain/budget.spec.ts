import { BAREME_DEFAUT } from './bareme-defaut';
import { calculerBudget, fraisNotaire, montantsPoste, prixNegocie } from './budget';
import { LigneBareme, PosteTravaux } from './modeles';
import { PARAMETRES_DEFAUT } from './parametres-defaut';

const fenetre: LigneBareme = {
  id: 'f', categorie: 'Menuiseries', libelle: 'Fenêtre', unite: 'UNITE', prixBas: 600, prixHaut: 1200,
};
const peinture: LigneBareme = {
  id: 'p', categorie: 'Finitions', libelle: 'Peinture', unite: 'M2', prixBas: 25, prixHaut: 45, coefDiy: 0.5,
};
const bareme = [fenetre, peinture];

function poste(p: Partial<PosteTravaux>): PosteTravaux {
  return {
    id: 'x', bienId: 'b', categorie: 'Autre', libelle: 'x', modeChiffrage: 'MANUEL', realisation: 'ARTISAN',
    montantBas: 0, montantHaut: 0, priorite: 'COURT_TERME', ...p,
  };
}

describe('prix négocié et frais de notaire', () => {
  it('applique la marge de négociation', () => {
    expect(prixNegocie(200_000, 5)).toBeCloseTo(190_000);
    expect(prixNegocie(200_000, 0)).toBe(200_000);
  });
  it('applique le taux de notaire sur le prix négocié', () => {
    expect(fraisNotaire(190_000, 8)).toBeCloseTo(15_200);
  });
});

describe('montantsPoste', () => {
  it('multiplie quantité × prix au barème (artisan)', () => {
    const m = montantsPoste(poste({ modeChiffrage: 'BAREME', baremeId: 'f', quantite: 6 }), bareme, 0.4);
    expect(m).toEqual({ bas: 3600, haut: 7200 });
  });
  it('applique le coefficient DIY par défaut', () => {
    const m = montantsPoste(poste({ modeChiffrage: 'BAREME', baremeId: 'f', quantite: 5, realisation: 'DIY' }), bareme, 0.4);
    expect(m.bas).toBeCloseTo(1200);
    expect(m.haut).toBeCloseTo(2400);
  });
  it('préfère le coefDiy de la ligne au coefficient global', () => {
    const m = montantsPoste(poste({ modeChiffrage: 'BAREME', baremeId: 'p', quantite: 100, realisation: 'DIY' }), bareme, 0.4);
    expect(m).toEqual({ bas: 1250, haut: 2250 });
  });
  it('reprend les montants saisis en mode manuel, sans coefficient', () => {
    const m = montantsPoste(poste({ montantBas: 1000, montantHaut: 3000, realisation: 'DIY' }), bareme, 0.4);
    expect(m).toEqual({ bas: 1000, haut: 3000 });
  });
  it('garde les montants enregistrés si la ligne de barème a disparu', () => {
    const m = montantsPoste(poste({ modeChiffrage: 'BAREME', baremeId: 'absent', quantite: 2, montantBas: 10, montantHaut: 20 }), bareme, 0.4);
    expect(m).toEqual({ bas: 10, haut: 20 });
  });
  it('ne fait aucun arrondi intermédiaire', () => {
    const m = montantsPoste(poste({ modeChiffrage: 'BAREME', baremeId: 'p', quantite: 33.3, realisation: 'DIY' }), bareme, 0.4);
    expect(m.bas).toBeCloseTo(33.3 * 25 * 0.5, 10);
  });
});

describe('calculerBudget', () => {
  const bien = { prixAffiche: 200_000, margeNegociationPct: 5 };

  it('sans travaux : négocié + notaire', () => {
    const b = calculerBudget(bien, [], bareme, PARAMETRES_DEFAUT);
    expect(b.prixNegocie).toBeCloseTo(190_000);
    expect(b.fraisNotaire).toBeCloseTo(15_200);
    expect(b.travaux).toEqual({ bas: 0, haut: 0 });
    expect(b.total.bas).toBeCloseTo(205_200);
    expect(b.total.haut).toBeCloseTo(205_200);
  });

  it('somme les postes, ventile par catégorie, priorité et réalisation', () => {
    const postes = [
      poste({ categorie: 'Menuiseries', modeChiffrage: 'BAREME', baremeId: 'f', quantite: 5, priorite: 'URGENT' }),
      poste({ categorie: 'Finitions', modeChiffrage: 'BAREME', baremeId: 'p', quantite: 100, realisation: 'DIY', priorite: 'CONFORT' }),
      poste({ categorie: 'Menuiseries', montantBas: 500, montantHaut: 700, priorite: 'URGENT' }),
    ];
    const b = calculerBudget(bien, postes, bareme, PARAMETRES_DEFAUT);
    expect(b.travaux).toEqual({ bas: 3000 + 1250 + 500, haut: 6000 + 2250 + 700 });
    expect(b.total.bas).toBeCloseTo(205_200 + 4750);
    expect(b.total.haut).toBeCloseTo(205_200 + 8950);
    expect(b.parCategorie.find((c) => c.categorie === 'Menuiseries')?.montant).toEqual({ bas: 3500, haut: 6700 });
    expect(b.parCategorie.find((c) => c.categorie === 'Finitions')?.montant).toEqual({ bas: 1250, haut: 2250 });
    expect(b.parPriorite.find((p) => p.priorite === 'URGENT')?.montant).toEqual({ bas: 3500, haut: 6700 });
    expect(b.parRealisation.DIY).toEqual({ bas: 1250, haut: 2250 });
    expect(b.parRealisation.ARTISAN).toEqual({ bas: 3500, haut: 6700 });
  });

  it('suit le taux de notaire et le coefficient DIY des paramètres', () => {
    const postes = [poste({ modeChiffrage: 'BAREME', baremeId: 'f', quantite: 10, realisation: 'DIY' })];
    const b = calculerBudget(bien, postes, bareme, { tauxNotairePct: 2.5, margeNegociationDefautPct: 5, coefDiyDefaut: 0.5 });
    expect(b.fraisNotaire).toBeCloseTo(4750);
    expect(b.travaux).toEqual({ bas: 3000, haut: 6000 });
  });
});

describe('barème par défaut', () => {
  it('contient les lignes de la SPEC, cohérentes', () => {
    expect(BAREME_DEFAUT.length).toBe(65);
    expect(new Set(BAREME_DEFAUT.map((l) => l.id)).size).toBe(65);
    for (const l of BAREME_DEFAUT) expect(l.prixBas).toBeLessThanOrEqual(l.prixHaut);
  });
});
