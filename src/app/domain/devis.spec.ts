import { describe, expect, it } from 'vitest';
import { montantsPoste } from './budget';
import { devisRetenuPour, estExpire, integrerDevis, memeDevisRetenu, positionDansFourchette, resumerDevis } from './devis';
import { grouperPhotos, nombrePhotos } from './galerie';
import { Devis, Piece, PosteTravaux, Visite } from './modeles';

const poste = (id: string, p: Partial<PosteTravaux> = {}): PosteTravaux => ({
  id, bienId: 'b', categorie: 'Toiture', libelle: id, modeChiffrage: 'MANUEL', realisation: 'ARTISAN', montantBas: 1_000, montantHaut: 2_000, priorite: 'URGENT', ...p,
});
const devis = (id: string, p: Partial<Devis> = {}): Devis => ({
  id, bienId: 'b', posteId: 'p1', entreprise: id, objet: '', montantTtc: 1_500, date: '2026-10-01', valableJusquau: null, statut: 'EN_ATTENTE', notes: '', ajouteLe: '', modifieLe: '', ...p,
});

describe('devis', () => {
  it('le devis retenu remplace l’estimation du poste', () => {
    expect(montantsPoste(poste('p1', { devisRetenu: { devisId: 'd1', montant: 1_750 } }), [], 0.4)).toEqual({ bas: 1_750, haut: 1_750 });
    // Même pour un poste au barème réalisé soi-même : le devis est un prix réel.
    const auBareme = poste('p2', { modeChiffrage: 'BAREME', baremeId: 'x', quantite: 10, realisation: 'DIY', devisRetenu: { devisId: 'd', montant: 900 } });
    expect(montantsPoste(auBareme, [{ id: 'x', categorie: 'Sols', libelle: '', unite: 'M2', prixBas: 10, prixHaut: 20 }], 0.4)).toEqual({ bas: 900, haut: 900 });
  });

  it('trouve le devis accepté d’un poste', () => {
    const liste = [devis('d1'), devis('d2', { statut: 'ACCEPTE', montantTtc: 1_200 }), devis('d3', { posteId: 'p2', statut: 'ACCEPTE' })];
    expect(devisRetenuPour('p1', liste)).toEqual({ devisId: 'd2', montant: 1_200 });
    expect(devisRetenuPour('p9', liste)).toBeUndefined();
    expect(memeDevisRetenu(undefined, undefined)).toBe(true);
    expect(memeDevisRetenu({ devisId: 'd2', montant: 1_200 }, { devisId: 'd2', montant: 1_300 })).toBe(false);
  });

  it('un seul devis accepté par poste : l’ancien repasse en attente', () => {
    const liste = [devis('d1', { statut: 'ACCEPTE' }), devis('d2'), devis('d3', { posteId: 'p2', statut: 'ACCEPTE' })];
    const apres = integrerDevis(liste, devis('d2', { statut: 'ACCEPTE' }));
    expect(apres.find((d) => d.id === 'd1')!.statut).toBe('EN_ATTENTE');
    expect(apres.find((d) => d.id === 'd2')!.statut).toBe('ACCEPTE');
    expect(apres.find((d) => d.id === 'd3')!.statut).toBe('ACCEPTE');
    expect(apres).toHaveLength(3);
    // Un devis sans poste accepté ne touche à rien.
    expect(integrerDevis(liste, devis('d4', { posteId: null, statut: 'ACCEPTE' })).find((d) => d.id === 'd1')!.statut).toBe('ACCEPTE');
  });

  it('repère un devis expiré encore en attente', () => {
    expect(estExpire(devis('d', { valableJusquau: '2026-09-30' }), '2026-10-19')).toBe(true);
    expect(estExpire(devis('d', { valableJusquau: '2026-10-19' }), '2026-10-19')).toBe(false);
    expect(estExpire(devis('d', { valableJusquau: '2026-09-30', statut: 'ACCEPTE' }), '2026-10-19')).toBe(false);
  });

  it('résume les devis poste par poste', () => {
    const postes = [poste('p1'), poste('p2'), poste('p3')];
    const liste = [
      devis('cher', { montantTtc: 2_400 }),
      devis('moins', { montantTtc: 1_300, statut: 'ACCEPTE' }),
      devis('refuse', { montantTtc: 900, statut: 'REFUSE' }),
      devis('libre', { posteId: null, montantTtc: 500 }),
      devis('orphelin', { posteId: 'supprime' }),
    ];
    const r = resumerDevis(postes, liste, (p) => ({ bas: p.montantBas, haut: p.montantHaut }));
    expect(r.groupes).toHaveLength(1);
    expect(r.groupes[0].devis.map((d) => d.id)).toEqual(['refuse', 'moins', 'cher']);
    expect(r.groupes[0].moinsCher!.id).toBe('moins'); // le devis refusé n'est pas comparé
    expect(r.groupes[0].retenu!.id).toBe('moins');
    expect(r.sansPoste.map((d) => d.id)).toEqual(['libre', 'orphelin']);
    expect(r).toMatchObject({ nombre: 5, enAttente: 3, postesCouverts: 1, postesTotal: 3, totalRetenu: 1_300, estimationCouverte: { bas: 1_000, haut: 2_000 } });
    expect(positionDansFourchette(1_300, r.groupes[0].estimation)).toBe('DANS');
    expect(positionDansFourchette(2_400, r.groupes[0].estimation)).toBe('DESSUS');
    expect(positionDansFourchette(900, r.groupes[0].estimation)).toBe('DESSOUS');
  });
});

describe('galerie', () => {
  const photos = ['c', 'p1', 'p2', 'v1', 'v2', 'libre'].map((id, i) => ({ id, prisLe: `2026-10-0${i + 1}` }));
  const pieces: Piece[] = [
    { id: 'sejour', bienId: 'b', nom: 'Séjour', photoIds: ['p2', 'p1', 'c'], notes: '' },
    { id: 'vide', bienId: 'b', nom: 'Cave', photoIds: [], notes: '' },
  ];
  const visites: Visite[] = [
    { id: 'v', bienId: 'b', date: '2026-10-10', typeVisite: 'PREMIERE', notes: '', reponses: [{ pointId: 'tuiles', etat: 'TRAVAUX', photoIds: ['v2', 'v1', 'disparue'] }] },
  ];
  const groupes = grouperPhotos(photos, {
    couvertureId: 'c',
    pieces,
    visites,
    point: (id) => (id === 'tuiles' ? { libelle: 'État des tuiles', theme: 'Toiture' } : undefined),
    dateVisite: () => '10 octobre',
  });

  it('range les photos par provenance, sans les photos disparues', () => {
    expect(groupes.map((g) => g.cle)).toEqual(['couverture', 'piece-sejour', 'visite-v', 'autres']);
    expect(groupes[1].photos.map((p) => p.id)).toEqual(['c', 'p1', 'p2']); // par date de prise
    expect(groupes[2].photos.map((p) => p.libelle)).toEqual(['Toiture · État des tuiles', 'Toiture · État des tuiles']);
    expect(groupes[2].titre).toBe('Visite du 10 octobre');
    expect(groupes[3].photos.map((p) => p.id)).toEqual(['libre']);
  });

  it('compte chaque photo une seule fois', () => {
    expect(nombrePhotos(groupes)).toBe(6);
  });
});
