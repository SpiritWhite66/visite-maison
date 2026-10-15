export interface Dimensions {
  largeur: number;
  hauteur: number;
}

/** Réduit une image pour que son grand côté ne dépasse pas `max` ; ne l'agrandit jamais. */
export function dimensionsCompressees(largeur: number, hauteur: number, max: number): Dimensions {
  const plusGrand = Math.max(largeur, hauteur);
  if (plusGrand <= max) return { largeur, hauteur };
  const echelle = max / plusGrand;
  return { largeur: Math.round(largeur * echelle), hauteur: Math.round(hauteur * echelle) };
}
