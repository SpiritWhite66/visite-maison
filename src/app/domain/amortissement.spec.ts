import { describe, expect, it } from 'vitest';
import {
  calculerMontage,
  echeancierPret,
  mensualiteConstante,
  moisCalendrier,
  paliers,
  PretCalcul,
  resumeAnnuel,
  tableauMontage,
  taeg,
} from './amortissement';

const pret = (p: Partial<PretCalcul>): PretCalcul => ({
  id: 'p',
  libelle: 'Prêt',
  montant: 200_000,
  tauxPct: 3.5,
  dureeMois: 300,
  differeMois: 0,
  differe: 'TOTAL',
  tauxAssurancePct: 0,
  ...p,
});

describe('amortissement', () => {
  it('calcule une échéance constante classique', () => {
    expect(mensualiteConstante(200_000, 3.5, 300)).toBeCloseTo(1001.25, 2);
    expect(mensualiteConstante(120_000, 0, 240)).toBe(500);
  });

  it('rembourse exactement le capital, sans arrondi intermédiaire', () => {
    const e = echeancierPret(pret({}));
    expect(e.lignes).toHaveLength(300);
    expect(e.lignes[0].interets).toBeCloseTo((200_000 * 0.035) / 12, 8);
    expect(e.lignes.at(-1)!.capitalFin).toBe(0);
    expect(e.lignes.reduce((s, l) => s + l.capitalAmorti, 0)).toBeCloseTo(200_000, 6);
    expect(e.totalInterets).toBeCloseTo(mensualiteConstante(200_000, 3.5, 300) * 300 - 200_000, 6);
  });

  it('applique l’assurance sur le capital initial', () => {
    const e = echeancierPret(pret({ tauxAssurancePct: 0.3 }));
    expect(e.lignes[0].assurance).toBe(50);
    expect(e.lignes.at(-1)!.assurance).toBe(50);
    expect(e.totalAssurance).toBeCloseTo(15_000, 6);
  });

  it('gère le différé total d’un prêt à taux zéro', () => {
    const e = echeancierPret(pret({ montant: 60_000, tauxPct: 0, dureeMois: 300, differeMois: 180 }));
    expect(e.lignes.slice(0, 180).every((l) => l.echeance === 0)).toBe(true);
    expect(e.lignes[180].echeance).toBe(500);
    expect(e.lignes.at(-1)!.capitalFin).toBe(0);
  });

  it('différé partiel : seuls les intérêts sont payés, puis amortissement sur la durée restante', () => {
    const e = echeancierPret(pret({ montant: 100_000, tauxPct: 3, dureeMois: 120, differeMois: 12, differe: 'PARTIEL' }));
    expect(e.lignes[0].echeance).toBeCloseTo(250, 8);
    expect(e.lignes[11].capitalFin).toBeCloseTo(100_000, 8);
    expect(e.lignes[12].echeance).toBeCloseTo(mensualiteConstante(100_000, 3, 108), 8);
    expect(e.lignes.at(-1)!.capitalFin).toBe(0);
  });

  it('différé total à taux non nul : les intérêts s’ajoutent au capital', () => {
    const e = echeancierPret(pret({ montant: 10_000, tauxPct: 12, dureeMois: 24, differeMois: 2 }));
    expect(e.lignes[1].capitalFin).toBeCloseTo(10_000 * 1.01 * 1.01, 8);
  });

  it('lisse le total mensuel avec un PTZ en différé', () => {
    const principal = pret({ id: 'banque', montant: 200_000, tauxAssurancePct: 0.3 });
    const ptz = pret({ id: 'ptz', montant: 60_000, tauxPct: 0, differeMois: 180 });
    const montage = calculerMontage([principal, ptz], 'banque', true);
    const tableau = tableauMontage(montage);
    expect(montage.mensualiteLissee).not.toBeNull();
    expect(tableau.every((l) => Math.abs(l.total - montage.mensualiteLissee!) < 1e-4)).toBe(true);
    expect(montage.echeanciers[0].lignes.at(-1)!.capitalFin).toBe(0);
    expect(tableau.at(-1)!.capitalRestant).toBe(0);
    expect(paliers(tableau)).toHaveLength(1);
    // Le lissage coûte plus d'intérêts que deux prêts empilés, mais le total reste stable.
    const empiles = tableauMontage(calculerMontage([principal, ptz], 'banque', false));
    expect(paliers(empiles)).toHaveLength(2);
  });

  it('sans lissage, chaque prêt garde son échéance', () => {
    const montage = calculerMontage([pret({ id: 'a' }), pret({ id: 'b', montant: 20_000, tauxPct: 0, dureeMois: 120 })], 'a', false);
    const t = tableauMontage(montage);
    expect(t[0].total).toBeCloseTo(1001.25 + 166.67, 1);
    expect(t[200].total).toBeCloseTo(1001.25, 1);
  });

  it('résume par année et ignore les prêts vides', () => {
    const montage = calculerMontage([pret({ dureeMois: 24 }), pret({ id: 'vide', montant: 0 })], 'p', true);
    expect(montage.echeanciers).toHaveLength(1);
    const annees = resumeAnnuel(tableauMontage(montage));
    expect(annees).toHaveLength(2);
    expect(annees[0].capitalAmorti + annees[1].capitalAmorti).toBeCloseTo(200_000, 6);
    expect(annees[1].capitalRestant).toBe(0);
  });

  it('calcule un TAEG supérieur au taux nominal avec frais et assurance', () => {
    const e = echeancierPret(pret({ tauxAssurancePct: 0.3 }));
    const t = taeg(200_000 - 3_000, e.lignes.map((l) => l.echeance + l.assurance))!;
    expect(t).toBeGreaterThan(3.9);
    expect(t).toBeLessThan(4.4);
    // Sans frais ni assurance : taux actuariel équivalent au nominal proportionnel.
    const sans = taeg(200_000, echeancierPret(pret({})).lignes.map((l) => l.echeance))!;
    expect(sans).toBeCloseTo((Math.pow(1 + 0.035 / 12, 12) - 1) * 100, 6);
  });

  it('donne le mois calendaire d’une échéance', () => {
    expect(moisCalendrier('2027-03', 1)).toEqual({ annee: 2027, mois: 3 });
    expect(moisCalendrier('2027-03', 11)).toEqual({ annee: 2028, mois: 1 });
    expect(moisCalendrier('', 1)).toBeNull();
  });
});
