import { ajouterErreur, EntreeErreur, TAILLE_MAX_JOURNAL } from './journal-erreurs';

const entree = (n: number): EntreeErreur => ({ date: `2026-01-0${n}`, source: 'test', message: `e${n}` });

describe('journal des erreurs', () => {
  it('place la plus récente en premier', () => {
    const j = ajouterErreur([entree(1)], entree(2));
    expect(j.map((e) => e.message)).toEqual(['e2', 'e1']);
  });

  it('tronque au maximum', () => {
    let j: EntreeErreur[] = [];
    for (let i = 0; i < TAILLE_MAX_JOURNAL + 5; i++) j = ajouterErreur(j, entree(1));
    expect(j.length).toBe(TAILLE_MAX_JOURNAL);
  });

  it('ne modifie pas le journal d’origine', () => {
    const original = [entree(1)];
    ajouterErreur(original, entree(2));
    expect(original.length).toBe(1);
  });
});
