import { describe, expect, it } from 'vitest';
import { joursDepuis, nomFichierSauvegarde, sauvegardeAFaire, validerSauvegarde, VERSION_FORMAT } from './sauvegarde';

const valide = () => ({
  format: 'visite-immo',
  version: 1,
  exporteLe: '2026-10-16T10:00:00.000Z',
  versionApp: '0.5.0',
  biens: [{ id: 'b1' }],
  photos: [{ id: 'p1', bienId: 'b1', type: 'image/jpeg', prisLe: '', donnees: 'AAAA' }],
});

describe('validation d’une sauvegarde', () => {
  it('accepte une sauvegarde correcte et lit les tables absentes comme vides', () => {
    const r = validerSauvegarde(valide());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.sauvegarde.visites).toEqual([]);
      expect(r.sauvegarde.fichiersPlan).toEqual([]);
      expect(r.sauvegarde.biens).toHaveLength(1);
    }
  });

  it('refuse un fichier qui n’est pas une sauvegarde', () => {
    expect(validerSauvegarde({ foo: 1 }).ok).toBe(false);
    expect(validerSauvegarde([]).ok).toBe(false);
    expect(validerSauvegarde(null).ok).toBe(false);
  });

  it('refuse une sauvegarde d’une version plus récente que l’appli', () => {
    const r = validerSauvegarde({ ...valide(), version: VERSION_FORMAT + 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreur).toContain('plus récente');
  });

  it('refuse une table mal formée, un élément sans identifiant ou un fichier sans contenu', () => {
    expect(validerSauvegarde({ ...valide(), biens: 'x' }).ok).toBe(false);
    expect(validerSauvegarde({ ...valide(), biens: [{ titre: 'sans id' }] }).ok).toBe(false);
    expect(validerSauvegarde({ ...valide(), photos: [{ id: 'p1' }] }).ok).toBe(false);
    expect(validerSauvegarde({ ...valide(), parametres: 3 }).ok).toBe(false);
  });
});

describe('rappel de sauvegarde', () => {
  const maintenant = new Date('2026-10-16T12:00:00.000Z');

  it('compte les jours écoulés', () => {
    expect(joursDepuis('2026-10-16T08:00:00.000Z', maintenant)).toBe(0);
    expect(joursDepuis('2026-10-01T12:00:00.000Z', maintenant)).toBe(15);
    expect(joursDepuis(undefined, maintenant)).toBeNull();
    expect(joursDepuis('n’importe quoi', maintenant)).toBeNull();
  });

  it('rappelle seulement s’il y a des données et pas de sauvegarde récente', () => {
    expect(sauvegardeAFaire(undefined, maintenant, true)).toBe(true);
    expect(sauvegardeAFaire(undefined, maintenant, false)).toBe(false);
    expect(sauvegardeAFaire('2026-10-10T12:00:00.000Z', maintenant, true)).toBe(false);
    expect(sauvegardeAFaire('2026-09-20T12:00:00.000Z', maintenant, true)).toBe(true);
  });

  it('nomme le fichier avec la date du jour', () => {
    expect(nomFichierSauvegarde(new Date(2026, 9, 6))).toBe('visite-immo-2026-10-06.json');
  });
});
