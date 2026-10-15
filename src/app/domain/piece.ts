import { Piece } from './modeles';

/** Surface calculée si longueur × largeur sont renseignées, sinon la surface saisie. Aucun arrondi. */
export function surfacePiece(piece: Pick<Piece, 'longueur' | 'largeur' | 'surface'>): number | undefined {
  const { longueur, largeur, surface } = piece;
  if (longueur && largeur && longueur > 0 && largeur > 0) return longueur * largeur;
  return surface !== undefined && surface > 0 ? surface : undefined;
}

export function surfaceTotale(pieces: readonly Pick<Piece, 'longueur' | 'largeur' | 'surface'>[]): number {
  return pieces.reduce((somme, p) => somme + (surfacePiece(p) ?? 0), 0);
}
