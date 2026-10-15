import { describe, expect, it } from 'vitest';
import { dimensionsCompressees } from './photo';
import { surfacePiece, surfaceTotale } from './piece';

describe('surface des pièces', () => {
  it('calcule longueur × largeur sans arrondi', () => {
    expect(surfacePiece({ longueur: 4.2, largeur: 3.5 })).toBeCloseTo(14.7, 10);
  });

  it('préfère le calcul à la surface saisie', () => {
    expect(surfacePiece({ longueur: 5, largeur: 4, surface: 99 })).toBe(20);
  });

  it('utilise la surface saisie quand une dimension manque', () => {
    expect(surfacePiece({ longueur: 5, surface: 18 })).toBe(18);
  });

  it('renvoie undefined sans aucune donnée', () => {
    expect(surfacePiece({})).toBeUndefined();
  });

  it('additionne les surfaces connues', () => {
    expect(surfaceTotale([{ longueur: 5, largeur: 4 }, { surface: 12.5 }, {}])).toBe(32.5);
  });
});

describe('compression des photos', () => {
  it('réduit le grand côté à la limite en gardant les proportions', () => {
    expect(dimensionsCompressees(4000, 3000, 1600)).toEqual({ largeur: 1600, hauteur: 1200 });
    expect(dimensionsCompressees(3000, 4000, 1600)).toEqual({ largeur: 1200, hauteur: 1600 });
  });

  it('n’agrandit jamais une petite image', () => {
    expect(dimensionsCompressees(800, 600, 1600)).toEqual({ largeur: 800, hauteur: 600 });
  });
});
