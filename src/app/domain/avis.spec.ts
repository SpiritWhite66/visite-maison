import { describe, expect, it } from 'vitest';
import { avisDesPersonnes, avisVierge, basculerEtoiles, idAvis, marquerAbsente, prenomValide, resumerAvis, statutAvis } from './avis';

describe('étoiles', () => {
  it('toucher une étoile la pose, la retoucher la retire, une autre la remplace', () => {
    expect(basculerEtoiles(null, 4)).toBe(4);
    expect(basculerEtoiles(4, 4)).toBeNull();
    expect(basculerEtoiles(4, 2)).toBe(2);
  });

  it('ignore une valeur hors de 1 à 5', () => {
    expect(basculerEtoiles(3, 0)).toBe(3);
    expect(basculerEtoiles(3, 6)).toBe(3);
    expect(basculerEtoiles(null, 2.5)).toBeNull();
  });
});

describe('avis d’une personne', () => {
  it('a un identifiant stable par bien et par personne', () => {
    expect(idAvis('b1', 'p1')).toBe('b1:p1');
    expect(avisVierge('b1', 'p1').id).toBe('b1:p1');
    expect(avisVierge('b1', 'p1')).toMatchObject({ absente: false, etoiles: null, commentaire: '' });
  });

  it('absente (N/A) efface les étoiles ; redevenir présente ne les rend pas', () => {
    const note = { ...avisVierge('b', 'p'), etoiles: 4 };
    const absente = marquerAbsente(note, true);
    expect(absente).toMatchObject({ absente: true, etoiles: null });
    expect(marquerAbsente(absente, false)).toMatchObject({ absente: false, etoiles: null });
    expect(marquerAbsente(note, false).etoiles).toBe(4);
  });

  it('donne le statut : à donner, absente ou donné', () => {
    expect(statutAvis(undefined)).toBe('A_DONNER');
    expect(statutAvis(avisVierge('b', 'p'))).toBe('A_DONNER');
    expect(statutAvis({ absente: true, etoiles: null, commentaire: '' })).toBe('ABSENTE');
    expect(statutAvis({ absente: false, etoiles: 3, commentaire: '' })).toBe('DONNE');
    expect(statutAvis({ absente: false, etoiles: null, commentaire: ' Beau jardin ' })).toBe('DONNE');
    expect(statutAvis({ absente: false, etoiles: null, commentaire: '   ' })).toBe('A_DONNER');
  });
});

describe('moyenne des étoiles', () => {
  it('ignore les absents et les avis sans étoiles', () => {
    const r = resumerAvis([
      { absente: false, etoiles: 5 },
      { absente: false, etoiles: 4 },
      { absente: true, etoiles: null },
      { absente: false, etoiles: null },
    ]);
    expect(r).toEqual({ moyenne: 4.5, notes: 2, absentes: 1 });
  });

  it('n’a pas de moyenne sans aucune étoile', () => {
    expect(resumerAvis([])).toEqual({ moyenne: null, notes: 0, absentes: 0 });
    expect(resumerAvis([{ absente: true, etoiles: null }]).moyenne).toBeNull();
  });
});

describe('personnes', () => {
  const personnes = [{ id: 'p1', prenom: 'Alice' }, { id: 'p2', prenom: 'Bob' }];

  it('ne garde que les avis de personnes qui existent encore', () => {
    const avis = [avisVierge('b', 'p1'), avisVierge('b', 'p3')];
    expect(avisDesPersonnes(avis, personnes).map((a) => a.personneId)).toEqual(['p1']);
  });

  it('valide un prénom : nettoyé, non vide, sans doublon (casse ignorée)', () => {
    expect(prenomValide('  Claire   Marie ', personnes)).toBe('Claire Marie');
    expect(prenomValide('   ', personnes)).toBeNull();
    expect(prenomValide('alice', personnes)).toBeNull();
    expect(prenomValide('ALICE', personnes, 'p1')).toBe('ALICE');
  });
});
