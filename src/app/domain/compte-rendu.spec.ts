import { describe, expect, it } from 'vitest';
import { modifierReponse, themesPourBien } from './checklist';
import { pointsSignales, recapitulatifParTheme, trierPostes, visitesAImprimer } from './compte-rendu';
import { PosteTravaux, Visite } from './modeles';

const visite = (id = 'v1', date = '2026-01-01T10:00:00.000Z'): Visite => ({ id, bienId: 'b', date, typeVisite: 'PREMIERE', reponses: [], notes: '' });

describe('points signalés', () => {
  it('liste les points Travaux et À surveiller, pas les OK, dans l’ordre du catalogue', () => {
    let v = visite();
    v = modifierReponse(v, 'humidite.salpetre', { etat: 'A_SURVEILLER', commentaire: 'Trace ancienne' });
    v = modifierReponse(v, 'structure.fissures-facade', { etat: 'TRAVAUX', commentaire: 'En escalier', photoIds: ['p1'] });
    v = modifierReponse(v, 'toiture.tuiles', { etat: 'OK' });
    v = modifierReponse(v, 'toiture.faitage', { etat: 'TRAVAUX' });
    const s = pointsSignales('VILLE', v);
    expect(s.travaux.map((p) => p.point.id)).toEqual(['structure.fissures-facade', 'toiture.faitage']);
    expect(s.aSurveiller.map((p) => p.point.id)).toEqual(['humidite.salpetre']);
    expect(s.travaux[0].theme).toBe('Structure et extérieur');
    expect(s.travaux[0].reponse.photoIds).toEqual(['p1']);
  });

  it('ignore les points d’un thème rural pour un bien de ville', () => {
    const v = modifierReponse(visite(), 'assainissement.anc-type', { etat: 'TRAVAUX' });
    expect(pointsSignales('VILLE', v).travaux).toHaveLength(0);
    expect(pointsSignales('RURAL', v).travaux).toHaveLength(1);
  });

  it('renvoie des listes vides pour une visite sans réponse', () => {
    expect(pointsSignales('RURAL', visite())).toEqual({ travaux: [], aSurveiller: [] });
  });
});

describe('récapitulatif par thème', () => {
  it('compte chaque état par thème, la somme faisant le total', () => {
    let v = visite();
    v = modifierReponse(v, 'toiture.tuiles', { etat: 'OK' });
    v = modifierReponse(v, 'toiture.faitage', { etat: 'OK' });
    v = modifierReponse(v, 'toiture.combles-isolation', { etat: 'NA' });
    v = modifierReponse(v, 'toiture.age-couverture', { etat: 'TRAVAUX' });
    const lignes = recapitulatifParTheme('VILLE', v);
    const toiture = lignes.find((l) => l.theme === 'Toiture et charpente')!;
    expect(toiture).toMatchObject({ total: 5, ok: 2, na: 1, travaux: 1, aSurveiller: 0, nonVerifie: 1 });
    for (const l of lignes) expect(l.ok + l.aSurveiller + l.travaux + l.na + l.nonVerifie).toBe(l.total);
  });

  it('a une ligne par thème du type de bien', () => {
    expect(recapitulatifParTheme('VILLE', visite())).toHaveLength(themesPourBien('VILLE').length);
    expect(recapitulatifParTheme('RURAL', visite())).toHaveLength(themesPourBien('RURAL').length);
  });
});

describe('tri des postes', () => {
  const poste = (libelle: string, categorie: PosteTravaux['categorie'], priorite: PosteTravaux['priorite']): PosteTravaux =>
    ({ id: libelle, libelle, categorie, priorite }) as PosteTravaux;

  it('trie par priorité, puis catégorie, puis libellé, sans modifier la liste d’origine', () => {
    const postes = [
      poste('Peinture', 'Finitions', 'CONFORT'),
      poste('Tuiles', 'Toiture', 'URGENT'),
      poste('ANC', 'Assainissement', 'URGENT'),
      poste('Fenêtres', 'Menuiseries', 'COURT_TERME'),
    ];
    expect(trierPostes(postes).map((p) => p.libelle)).toEqual(['ANC', 'Tuiles', 'Fenêtres', 'Peinture']);
    expect(postes[0].libelle).toBe('Peinture');
  });
});

describe('visites à imprimer', () => {
  const visites = [visite('v2', '2026-03-01T10:00:00.000Z'), visite('v1', '2026-01-01T10:00:00.000Z'), visite('v3', '2026-02-01T10:00:00.000Z')];

  it('prend la plus récente par défaut', () => {
    expect(visitesAImprimer(visites, 'derniere').map((v) => v.id)).toEqual(['v2']);
  });
  it('prend toutes les visites dans l’ordre chronologique', () => {
    expect(visitesAImprimer(visites, 'toutes').map((v) => v.id)).toEqual(['v1', 'v3', 'v2']);
  });
  it('prend une visite précise, ou rien si elle n’existe plus', () => {
    expect(visitesAImprimer(visites, 'v3').map((v) => v.id)).toEqual(['v3']);
    expect(visitesAImprimer(visites, 'absente')).toEqual([]);
    expect(visitesAImprimer([], 'derniere')).toEqual([]);
  });
});
