import { describe, expect, it } from 'vitest';
import { CHECKLIST_CATALOGUE, THEMES_CHECKLIST } from './checklist-catalogue';
import { compterEtats, modifierReponse, progression, progressionTotale, reponseDe, themesPourBien } from './checklist';
import { Visite } from './modeles';

const visiteVide = (): Visite => ({
  id: 'v1',
  bienId: 'b1',
  date: '2026-01-01T10:00:00.000Z',
  typeVisite: 'PREMIERE',
  reponses: [],
  notes: '',
});

describe('catalogue de checklist', () => {
  it('a des identifiants uniques', () => {
    const ids = CHECKLIST_CATALOGUE.map((pt) => pt.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('rattache chaque point à un thème existant', () => {
    const themes = new Set(THEMES_CHECKLIST.map((t) => t.id));
    expect(CHECKLIST_CATALOGUE.every((pt) => themes.has(pt.theme))).toBe(true);
  });

  it('réserve assainissement, terrain, eau et chauffage bois au rural', () => {
    const ville = themesPourBien('VILLE').map((t) => t.id);
    const rural = themesPourBien('RURAL').map((t) => t.id);
    for (const id of ['assainissement', 'terrain', 'eau', 'chauffage-dpe']) {
      expect(ville).not.toContain(id);
      expect(rural).toContain(id);
    }
    expect(ville.length).toBe(10);
    expect(rural.length).toBe(14);
  });

  it('n’a aucun thème vide', () => {
    for (const type of ['VILLE', 'RURAL'] as const) {
      expect(themesPourBien(type).every((t) => t.points.length > 0)).toBe(true);
    }
  });
});

describe('réponses de visite', () => {
  it('renvoie NON_VERIFIE pour un point jamais touché', () => {
    expect(reponseDe(visiteVide(), 'structure.enduit')).toEqual({
      pointId: 'structure.enduit',
      etat: 'NON_VERIFIE',
      photoIds: [],
    });
  });

  it('ajoute puis met à jour une réponse sans modifier la visite d’origine', () => {
    const v0 = visiteVide();
    const v1 = modifierReponse(v0, 'structure.enduit', { etat: 'TRAVAUX' });
    const v2 = modifierReponse(v1, 'structure.enduit', { commentaire: 'à refaire' });
    expect(v0.reponses).toHaveLength(0);
    expect(v2.reponses).toHaveLength(1);
    expect(reponseDe(v2, 'structure.enduit')).toMatchObject({ etat: 'TRAVAUX', commentaire: 'à refaire' });
  });

  it('compte les points vérifiés par thème, N/A compris', () => {
    let v = visiteVide();
    v = modifierReponse(v, 'toiture.tuiles', { etat: 'OK' });
    v = modifierReponse(v, 'toiture.faitage', { etat: 'NA' });
    v = modifierReponse(v, 'toiture.age-couverture', { etat: 'NON_VERIFIE' });
    const toiture = themesPourBien('VILLE').find((t) => t.id === 'toiture')!;
    expect(progression(toiture.points, v)).toEqual({ verifies: 2, total: toiture.points.length });
  });

  it('calcule la progression totale et le décompte par état', () => {
    let v = visiteVide();
    v = modifierReponse(v, 'toiture.tuiles', { etat: 'TRAVAUX' });
    v = modifierReponse(v, 'humidite.salpetre', { etat: 'A_SURVEILLER' });
    const total = themesPourBien('VILLE').flatMap((t) => t.points).length;
    expect(progressionTotale('VILLE', v)).toEqual({ verifies: 2, total });
    const c = compterEtats('VILLE', v);
    expect(c.TRAVAUX).toBe(1);
    expect(c.A_SURVEILLER).toBe(1);
    expect(c.NON_VERIFIE).toBe(total - 2);
  });

  it('ignore les points d’un thème rural pour un bien de ville', () => {
    const v = modifierReponse(visiteVide(), 'assainissement.anc-type', { etat: 'OK' });
    expect(progressionTotale('VILLE', v).verifies).toBe(0);
    expect(progressionTotale('RURAL', v).verifies).toBe(1);
  });
});
