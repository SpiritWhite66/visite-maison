import { describe, expect, it } from 'vitest';
import { ElementPlan, Mur, Ouverture } from './modeles';
import {
  aimanter,
  bornes,
  contraindreOuverture,
  deplacerExtremite,
  deplacerMur,
  fixerLongueur,
  geometrieOuverture,
  longueurMur,
  projeter,
  rectangleEnMurs,
  redresser,
  supprimerElement,
  tracePorte,
} from './plan';

const mur = (id: string, x1: number, y1: number, x2: number, y2: number): Mur => ({ type: 'MUR', id, x1, y1, x2, y2, epaisseur: 0.2 });
let n = 0;
const nouvelId = () => `m${++n}`;

describe('aimant', () => {
  it('colle à l’extrémité la plus proche dans le rayon', () => {
    expect(aimanter({ x: 2.08, y: 0.95 }, [{ x: 2, y: 1 }, { x: 5, y: 5 }], 0.2, 0.1)).toEqual({ x: 2, y: 1 });
  });

  it('arrondit à la grille sans erreur de virgule flottante', () => {
    expect(aimanter({ x: 0.29, y: 1.04 }, [], 0.2, 0.1)).toEqual({ x: 0.3, y: 1 });
  });

  it('redresse un mur presque horizontal ou à 45°, pas un mur franchement oblique', () => {
    expect(redresser({ x: 0, y: 0 }, { x: 4, y: 0.2 })).toEqual({ x: expect.closeTo(4, 6), y: 0 });
    const diag = redresser({ x: 0, y: 0 }, { x: 3, y: 3.1 });
    expect(diag.x).toBeCloseTo(diag.y, 6);
    expect(redresser({ x: 0, y: 0 }, { x: 4, y: 1.5 })).toEqual({ x: 4, y: 1.5 });
  });
});

describe('murs', () => {
  it('crée un rectangle fermé de quatre murs', () => {
    const r = rectangleEnMurs({ x: 0, y: 0 }, { x: 4, y: 3 }, 0.2, nouvelId);
    expect(r).toHaveLength(4);
    expect(r.map(longueurMur)).toEqual([4, 3, 4, 3]);
    expect([r[3].x2, r[3].y2]).toEqual([r[0].x1, r[0].y1]);
  });

  it('déplace une extrémité partagée par deux murs', () => {
    const els = deplacerExtremite([mur('a', 0, 0, 4, 0), mur('b', 4, 0, 4, 3)], { x: 4, y: 0 }, { x: 5, y: 0 });
    expect(els[0]).toMatchObject({ x2: 5, y2: 0 });
    expect(els[1]).toMatchObject({ x1: 5, y1: 0 });
  });

  it('translate un mur en entraînant les murs reliés', () => {
    const els = deplacerMur([mur('a', 0, 0, 4, 0), mur('b', 4, 0, 4, 3), mur('c', 0, 0, 0, 3)], 'a', 0, -1);
    expect(els[0]).toMatchObject({ y1: -1, y2: -1 });
    expect(els[1]).toMatchObject({ x1: 4, y1: -1, x2: 4, y2: 3 });
    expect(els[2]).toMatchObject({ x1: 0, y1: -1 });
  });

  it('fixe la longueur d’un mur en gardant sa direction', () => {
    const els = fixerLongueur([mur('a', 1, 1, 4, 5), mur('b', 4, 5, 8, 5)], 'a', 10);
    expect(longueurMur(els[0] as Mur)).toBeCloseTo(10, 6);
    expect(els[0]).toMatchObject({ x2: 7, y2: 9 });
    expect(els[1]).toMatchObject({ x1: 7, y1: 9 });
  });

  it('supprime les ouvertures avec leur mur', () => {
    const porte: Ouverture = { type: 'PORTE', id: 'p', murId: 'a', t: 0.5, largeur: 0.9, cote: 1, charniereFin: false };
    const els: ElementPlan[] = [mur('a', 0, 0, 4, 0), mur('b', 4, 0, 4, 3), porte];
    expect(supprimerElement(els, 'a').map((e) => e.id)).toEqual(['b']);
  });
});

describe('ouvertures', () => {
  const m = mur('a', 0, 0, 4, 0);

  it('projette un point sur un mur', () => {
    expect(projeter({ x: 1, y: 0.3 }, { x: 0, y: 0 }, { x: 4, y: 0 })).toEqual({ distance: 0.3, t: 0.25, point: { x: 1, y: 0 } });
  });

  it('garde l’ouverture entière dans le mur', () => {
    expect(contraindreOuverture(m, 0, 1)).toBeCloseTo(0.125, 6);
    expect(contraindreOuverture(m, 0.99, 1)).toBeCloseTo(0.875, 6);
    expect(contraindreOuverture(mur('c', 0, 0, 0.5, 0), 0.1, 0.9)).toBe(0.5);
  });

  it('calcule les extrémités d’une ouverture', () => {
    const g = geometrieOuverture(m, { t: 0.5, largeur: 1 });
    expect(g.debut).toEqual({ x: 1.5, y: 0 });
    expect(g.fin).toEqual({ x: 2.5, y: 0 });
  });

  it('trace une porte ouverte du côté demandé', () => {
    const p: Ouverture = { type: 'PORTE', id: 'p', murId: 'a', t: 0.5, largeur: 1, cote: 1, charniereFin: false };
    expect(tracePorte(m, p)).toBe('M 1.5 0 L 1.5 1 A 1 1 0 0 0 2.5 0');
    expect(tracePorte(m, { ...p, cote: -1 })).toBe('M 1.5 0 L 1.5 -1 A 1 1 0 0 1 2.5 0');
  });
});

describe('bornes', () => {
  it('englobe murs, étiquettes et équipements', () => {
    expect(bornes([])).toBeNull();
    expect(
      bornes([mur('a', 0, 0, 4, 0), { type: 'ETIQUETTE', id: 'e', x: 2, y: 5, texte: 'Séjour' }, { type: 'EQUIPEMENT', id: 'q', x: -1, y: 1, nature: 'ECS' }]),
    ).toEqual({ minX: -1, minY: 0, maxX: 4, maxY: 5 });
  });
});
