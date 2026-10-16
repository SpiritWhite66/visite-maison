import { describe, expect, it } from 'vitest';
import { Bien } from './modeles';
import {
  annulerDernierChangement,
  changerEtape,
  compterBiens,
  dateEtapeActuelle,
  ETAPES_PARCOURS,
  ETAPES_TERMINALES,
  filtrerBiens,
  memeFiltre,
  montantOffre,
} from './etapes';
import { ETAPES } from './modeles';

const bien = (etape: Bien['etape'] = 'REPERE'): Bien =>
  ({ id: 'b', etape, historiqueEtapes: [{ etape: 'REPERE', date: '2026-01-01T10:00:00.000Z' }] }) as Bien;

describe('étapes du parcours', () => {
  it('couvre toutes les étapes, parcours et fins de parcours', () => {
    expect([...ETAPES_PARCOURS, ...ETAPES_TERMINALES].sort()).toEqual([...ETAPES].sort());
  });
});

describe('changement d’étape', () => {
  it('change l’étape et ajoute une entrée horodatée, sans modifier le bien d’origine', () => {
    const b0 = bien();
    const b1 = changerEtape(b0, { etape: 'VISITE', date: new Date('2026-02-03T09:30:00.000Z'), commentaire: '  Visite avec l’agent  ' });
    expect(b0.historiqueEtapes).toHaveLength(1);
    expect(b1.etape).toBe('VISITE');
    expect(b1.historiqueEtapes.at(-1)).toEqual({ etape: 'VISITE', date: '2026-02-03T09:30:00.000Z', commentaire: 'Visite avec l’agent' });
  });

  it('n’impose aucun ordre : on peut revenir en arrière ou sauter des étapes', () => {
    const b = changerEtape(changerEtape(bien(), { etape: 'COMPROMIS' }), { etape: 'VISITE_PLANIFIEE' });
    expect(b.etape).toBe('VISITE_PLANIFIEE');
    expect(b.historiqueEtapes.map((e) => e.etape)).toEqual(['REPERE', 'COMPROMIS', 'VISITE_PLANIFIEE']);
  });

  it('n’enregistre un montant que pour une offre', () => {
    const offre = changerEtape(bien(), { etape: 'OFFRE_FAITE', montant: 185000 });
    expect(offre.historiqueEtapes.at(-1)?.montant).toBe(185000);
    const visite = changerEtape(bien(), { etape: 'VISITE', montant: 185000 });
    expect(visite.historiqueEtapes.at(-1)?.montant).toBeUndefined();
  });

  it('garde la dernière offre faite, même après un refus', () => {
    let b = changerEtape(bien(), { etape: 'OFFRE_FAITE', montant: 180000 });
    b = changerEtape(b, { etape: 'OFFRE_REFUSEE' });
    b = changerEtape(b, { etape: 'OFFRE_FAITE', montant: 190000 });
    expect(montantOffre(b)).toBe(190000);
    expect(montantOffre(bien())).toBeUndefined();
  });

  it('annule le dernier changement en revenant à l’étape précédente et à l’offre précédente', () => {
    let b = changerEtape(bien(), { etape: 'OFFRE_FAITE', montant: 180000 });
    b = changerEtape(b, { etape: 'OFFRE_FAITE', montant: 190000 });
    const annule = annulerDernierChangement(b);
    expect(annule.etape).toBe('OFFRE_FAITE');
    expect(montantOffre(annule)).toBe(180000);
    expect(annulerDernierChangement(annulerDernierChangement(annule)).etape).toBe('REPERE');
  });

  it('ne supprime jamais l’étape initiale', () => {
    const b = bien();
    expect(annulerDernierChangement(b)).toBe(b);
  });

  it('donne la date d’entrée dans l’étape actuelle', () => {
    expect(dateEtapeActuelle(changerEtape(bien(), { etape: 'VISITE', date: new Date('2026-03-01T08:00:00.000Z') }))).toBe('2026-03-01T08:00:00.000Z');
  });
});

describe('filtre de la liste', () => {
  const biens = [{ etape: 'REPERE' }, { etape: 'VISITE' }, { etape: 'OFFRE_FAITE' }, { etape: 'ABANDONNE' }, { etape: 'OFFRE_REFUSEE' }, { etape: 'VISITE' }] as Bien[];

  it('masque les biens terminés par défaut', () => {
    expect(filtrerBiens(biens, { type: 'EN_COURS' })).toHaveLength(4);
  });

  it('montre uniquement les biens terminés, une seule étape, ou tout', () => {
    expect(filtrerBiens(biens, { type: 'TERMINES' }).map((b) => b.etape)).toEqual(['ABANDONNE', 'OFFRE_REFUSEE']);
    expect(filtrerBiens(biens, { type: 'ETAPE', etape: 'VISITE' })).toHaveLength(2);
    expect(filtrerBiens(biens, { type: 'TOUS' })).toHaveLength(6);
  });

  it('compte les biens par filtre', () => {
    const c = compterBiens(biens);
    expect(c).toMatchObject({ enCours: 4, termines: 2, tous: 6 });
    expect(c.parEtape.VISITE).toBe(2);
    expect(c.parEtape.COMPROMIS).toBe(0);
  });

  it('compare deux filtres', () => {
    expect(memeFiltre({ type: 'EN_COURS' }, { type: 'EN_COURS' })).toBe(true);
    expect(memeFiltre({ type: 'ETAPE', etape: 'VISITE' }, { type: 'ETAPE', etape: 'VISITE' })).toBe(true);
    expect(memeFiltre({ type: 'ETAPE', etape: 'VISITE' }, { type: 'ETAPE', etape: 'REPERE' })).toBe(false);
    expect(memeFiltre({ type: 'TOUS' }, { type: 'TERMINES' })).toBe(false);
  });
});
