import { Piece, Visite } from './modeles';

/**
 * Galerie du bien (SPEC §14) : toutes ses photos, rangées par provenance.
 * Une photo peut apparaître dans plusieurs groupes (la couverture est souvent aussi une photo de pièce).
 */

export interface PhotoInfo {
  id: string;
  prisLe: string;
  legende?: string;
}

export type TypeGroupe = 'COUVERTURE' | 'PIECE' | 'VISITE' | 'AUTRE';

export interface PhotoGalerie extends PhotoInfo {
  /** Ce que montre la photo : « Séjour », « Toiture · État des tuiles »… */
  libelle: string;
}

export interface GroupeGalerie {
  cle: string;
  type: TypeGroupe;
  titre: string;
  /** Pièce ou visite d'origine, pour y revenir. */
  pieceId?: string;
  visiteId?: string;
  photos: PhotoGalerie[];
}

export interface ContexteGalerie {
  couvertureId?: string;
  pieces: readonly Piece[];
  /** Les plus récentes d'abord de préférence. */
  visites: readonly Visite[];
  /** Libellé d'un point de checklist et de son thème. */
  point: (pointId: string) => { libelle: string; theme: string } | undefined;
  /** « mar. 14 octobre 2026 » */
  dateVisite: (visite: Visite) => string;
}

const parDate = (a: PhotoInfo, b: PhotoInfo) => a.prisLe.localeCompare(b.prisLe);

export function grouperPhotos(photos: readonly PhotoInfo[], ctx: ContexteGalerie): GroupeGalerie[] {
  const parId = new Map(photos.map((p) => [p.id, p]));
  const rangees = new Set<string>();
  const prendre = (id: string, libelle: string): PhotoGalerie | null => {
    const p = parId.get(id);
    if (!p) return null; // photo disparue : on l'ignore
    rangees.add(id);
    return { ...p, libelle: p.legende || libelle };
  };
  const groupes: GroupeGalerie[] = [];

  if (ctx.couvertureId) {
    const p = prendre(ctx.couvertureId, 'Photo de couverture');
    if (p) groupes.push({ cle: 'couverture', type: 'COUVERTURE', titre: 'Couverture', photos: [p] });
  }

  for (const piece of ctx.pieces) {
    const liste = piece.photoIds.map((id) => prendre(id, piece.nom)).filter((p): p is PhotoGalerie => p !== null).sort(parDate);
    if (liste.length) groupes.push({ cle: `piece-${piece.id}`, type: 'PIECE', titre: piece.nom || 'Pièce sans nom', pieceId: piece.id, photos: liste });
  }

  for (const visite of ctx.visites) {
    const liste: PhotoGalerie[] = [];
    for (const r of visite.reponses) {
      const pt = ctx.point(r.pointId);
      const libelle = pt ? `${pt.theme} · ${pt.libelle}` : 'Point de visite';
      for (const id of r.photoIds) {
        const p = prendre(id, libelle);
        if (p) liste.push(p);
      }
    }
    if (liste.length) {
      groupes.push({ cle: `visite-${visite.id}`, type: 'VISITE', titre: `Visite du ${ctx.dateVisite(visite)}`, visiteId: visite.id, photos: liste.sort(parDate) });
    }
  }

  const autres = photos.filter((p) => !rangees.has(p.id)).sort(parDate).map((p) => ({ ...p, libelle: p.legende || 'Photo' }));
  if (autres.length) groupes.push({ cle: 'autres', type: 'AUTRE', titre: 'Autres photos', photos: autres });
  return groupes;
}

/** Nombre de photos distinctes dans des groupes (une photo présente deux fois compte une fois). */
export function nombrePhotos(groupes: readonly GroupeGalerie[]): number {
  return new Set(groupes.flatMap((g) => g.photos.map((p) => p.id))).size;
}
