import { ElementPlan, Mur, Ouverture } from './modeles';

/** Géométrie du plan, en mètres (axe y vers le bas, comme le SVG). */
export interface Point {
  x: number;
  y: number;
}

export interface Bornes {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const EPSILON = 1e-6;

export const EPAISSEUR_MUR = 0.2;
export const EPAISSEUR_CLOISON = 0.1;
export const LARGEUR_PORTE = 0.9;
export const LARGEUR_FENETRE = 1.2;

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function longueurMur(m: Mur): number {
  return Math.hypot(m.x2 - m.x1, m.y2 - m.y1);
}

export function murs(elements: readonly ElementPlan[]): Mur[] {
  return elements.filter((e): e is Mur => e.type === 'MUR');
}

/** Projection d'un point sur un segment : distance, paramètre t ∈ [0, 1] et point projeté. */
export function projeter(p: Point, a: Point, b: Point): { distance: number; t: number; point: Point } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  const point = { x: a.x + t * dx, y: a.y + t * dy };
  return { distance: distance(p, point), t, point };
}

export function extremites(elements: readonly ElementPlan[]): Point[] {
  return murs(elements).flatMap((m) => [
    { x: m.x1, y: m.y1 },
    { x: m.x2, y: m.y2 },
  ]);
}

/**
 * Aimant : colle le point à l'extrémité de mur la plus proche si elle est à moins de `rayon`,
 * sinon l'arrondit à la grille de pas `pas`.
 */
export function aimanter(p: Point, cibles: readonly Point[], rayon: number, pas: number): Point {
  let meilleure: Point | null = null;
  let dMin = rayon;
  for (const c of cibles) {
    const d = distance(p, c);
    if (d <= dMin) {
      dMin = d;
      meilleure = c;
    }
  }
  if (meilleure) return { ...meilleure };
  return { x: arrondir(p.x, pas), y: arrondir(p.y, pas) };
}

function arrondir(v: number, pas: number): number {
  // Le second arrondi efface les erreurs de virgule flottante (0.30000000000000004).
  return Math.round(Math.round(v / pas) * pas * 1e6) / 1e6;
}

/** Redresse un segment presque horizontal, vertical ou à 45° (tolérance en degrés). */
export function redresser(depart: Point, p: Point, toleranceDeg = 7): Point {
  const dx = p.x - depart.x;
  const dy = p.y - depart.y;
  const longueur = Math.hypot(dx, dy);
  if (longueur < EPSILON) return p;
  const angle = Math.atan2(dy, dx);
  const cran = Math.PI / 4;
  const cible = Math.round(angle / cran) * cran;
  if (Math.abs(angle - cible) > (toleranceDeg * Math.PI) / 180) return p;
  // Projection sur la direction cible : la longueur suit le doigt.
  const ux = Math.cos(cible);
  const uy = Math.sin(cible);
  const l = dx * ux + dy * uy;
  return { x: nettoyer(depart.x + l * ux), y: nettoyer(depart.y + l * uy) };
}

function nettoyer(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

/** Quatre murs formant un rectangle à partir de deux coins opposés. */
export function rectangleEnMurs(a: Point, b: Point, epaisseur: number, nouvelId: () => string): Mur[] {
  const coins = [
    { x: a.x, y: a.y },
    { x: b.x, y: a.y },
    { x: b.x, y: b.y },
    { x: a.x, y: b.y },
  ];
  return coins.map((c, i) => {
    const s = coins[(i + 1) % 4];
    return { type: 'MUR', id: nouvelId(), x1: c.x, y1: c.y, x2: s.x, y2: s.y, epaisseur };
  });
}

function memePoint(x: number, y: number, p: Point): boolean {
  return Math.abs(x - p.x) < EPSILON && Math.abs(y - p.y) < EPSILON;
}

/** Déplace toutes les extrémités de murs situées en `ancien` : les murs reliés restent reliés. */
export function deplacerExtremite(elements: readonly ElementPlan[], ancien: Point, nouveau: Point): ElementPlan[] {
  return elements.map((e) => {
    if (e.type !== 'MUR') return e;
    let m = e;
    if (memePoint(m.x1, m.y1, ancien)) m = { ...m, x1: nouveau.x, y1: nouveau.y };
    if (memePoint(m.x2, m.y2, ancien)) m = { ...m, x2: nouveau.x, y2: nouveau.y };
    return m;
  });
}

/** Translate un mur ; les extrémités des murs voisins qui le touchaient suivent. */
export function deplacerMur(elements: readonly ElementPlan[], murId: string, dx: number, dy: number): ElementPlan[] {
  const m = elements.find((e): e is Mur => e.id === murId && e.type === 'MUR');
  if (!m) return [...elements];
  const a = { x: m.x1, y: m.y1 };
  const b = { x: m.x2, y: m.y2 };
  return elements.map((e) => {
    if (e.type !== 'MUR') return e;
    let r = e;
    if (memePoint(r.x1, r.y1, a)) r = { ...r, x1: a.x + dx, y1: a.y + dy };
    else if (memePoint(r.x1, r.y1, b)) r = { ...r, x1: b.x + dx, y1: b.y + dy };
    if (memePoint(r.x2, r.y2, a)) r = { ...r, x2: a.x + dx, y2: a.y + dy };
    else if (memePoint(r.x2, r.y2, b)) r = { ...r, x2: b.x + dx, y2: b.y + dy };
    return r;
  });
}

/** Donne au mur la longueur voulue en déplaçant son extrémité « fin » (et les murs qui y sont reliés). */
export function fixerLongueur(elements: readonly ElementPlan[], murId: string, longueur: number): ElementPlan[] {
  const m = elements.find((e): e is Mur => e.id === murId && e.type === 'MUR');
  if (!m || longueur <= 0) return [...elements];
  const actuelle = longueurMur(m);
  const ux = actuelle > EPSILON ? (m.x2 - m.x1) / actuelle : 1;
  const uy = actuelle > EPSILON ? (m.y2 - m.y1) / actuelle : 0;
  const nouveau = { x: nettoyer(m.x1 + ux * longueur), y: nettoyer(m.y1 + uy * longueur) };
  return deplacerExtremite(elements, { x: m.x2, y: m.y2 }, nouveau);
}

/** Supprime un élément ; supprimer un mur supprime aussi ses portes et fenêtres. */
export function supprimerElement(elements: readonly ElementPlan[], id: string): ElementPlan[] {
  return elements.filter((e) => e.id !== id && !((e.type === 'PORTE' || e.type === 'FENETRE') && e.murId === id));
}

/** Position `t` ramenée pour que l'ouverture tienne entière dans le mur. */
export function contraindreOuverture(mur: Mur, t: number, largeur: number): number {
  const l = longueurMur(mur);
  if (l <= largeur) return 0.5;
  const marge = largeur / 2 / l;
  return Math.min(1 - marge, Math.max(marge, t));
}

export interface GeometrieOuverture {
  debut: Point;
  fin: Point;
  /** Vecteur unitaire le long du mur. */
  direction: Point;
  /** Vecteur unitaire perpendiculaire au mur. */
  normale: Point;
}

export function geometrieOuverture(mur: Mur, o: Pick<Ouverture, 't' | 'largeur'>): GeometrieOuverture {
  const l = longueurMur(mur) || 1;
  const direction = { x: (mur.x2 - mur.x1) / l, y: (mur.y2 - mur.y1) / l };
  const normale = { x: -direction.y, y: direction.x };
  const centre = { x: mur.x1 + (mur.x2 - mur.x1) * o.t, y: mur.y1 + (mur.y2 - mur.y1) * o.t };
  const demi = o.largeur / 2;
  return {
    debut: { x: centre.x - direction.x * demi, y: centre.y - direction.y * demi },
    fin: { x: centre.x + direction.x * demi, y: centre.y + direction.y * demi },
    direction,
    normale,
  };
}

/** Tracé SVG d'une porte : le battant ouvert à 90° et l'arc de son débattement. */
export function tracePorte(mur: Mur, o: Ouverture): string {
  const g = geometrieOuverture(mur, o);
  const charniere = o.charniereFin ? g.fin : g.debut;
  const autre = o.charniereFin ? g.debut : g.fin;
  const bout = { x: charniere.x + g.normale.x * o.cote * o.largeur, y: charniere.y + g.normale.y * o.cote * o.largeur };
  const v1 = { x: bout.x - charniere.x, y: bout.y - charniere.y };
  const v2 = { x: autre.x - charniere.x, y: autre.y - charniere.y };
  const balayage = v1.x * v2.y - v1.y * v2.x > 0 ? 1 : 0;
  const f = (n: number) => nettoyer(n);
  return `M ${f(charniere.x)} ${f(charniere.y)} L ${f(bout.x)} ${f(bout.y)} A ${o.largeur} ${o.largeur} 0 0 ${balayage} ${f(autre.x)} ${f(autre.y)}`;
}

/** Rectangle englobant le dessin, ou `null` s'il est vide. */
export function bornes(elements: readonly ElementPlan[]): Bornes | null {
  const pts: Point[] = [];
  for (const e of elements) {
    if (e.type === 'MUR') pts.push({ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 });
    else if (e.type === 'ETIQUETTE' || e.type === 'EQUIPEMENT') pts.push({ x: e.x, y: e.y });
  }
  if (pts.length === 0) return null;
  return {
    minX: Math.min(...pts.map((p) => p.x)),
    minY: Math.min(...pts.map((p) => p.y)),
    maxX: Math.max(...pts.map((p) => p.x)),
    maxY: Math.max(...pts.map((p) => p.y)),
  };
}
