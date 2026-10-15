import { Component, computed, ElementRef, ErrorHandler, inject, input, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PiecesService } from '../../../application/pieces.service';
import { PlanService } from '../../../application/plan.service';
import { ElementPlan, EquipementPlan, Etage, EtiquettePlan, Mur, NATURES_EQUIPEMENT, NatureEquipement, Ouverture } from '../../../domain/modeles';
import {
  aimanter,
  bornes,
  contraindreOuverture,
  deplacerExtremite,
  deplacerMur,
  distance,
  EPAISSEUR_CLOISON,
  EPAISSEUR_MUR,
  extremites,
  fixerLongueur,
  LARGEUR_FENETRE,
  LARGEUR_PORTE,
  longueurMur,
  murs,
  Point,
  projeter,
  rectangleEnMurs,
  redresser,
  supprimerElement,
} from '../../../domain/plan';
import { surfacePiece } from '../../../domain/piece';
import { formaterNombre } from '../../../shared/format';
import { IconeComponent, NomIcone } from '../../../shared/icone.component';
import { EQUIPEMENTS } from './libelles-plan';
import { InfoPiece, RenduPlanComponent } from './rendu-plan.component';

type Outil = 'selection' | 'mur' | 'rectangle' | 'porte' | 'fenetre' | 'texte' | 'equipement';

interface Vue {
  /** Coin haut-gauche visible, en mètres. */
  x: number;
  y: number;
  /** Pixels par mètre. */
  k: number;
}

type Geste =
  | { type: 'pan'; depart: Point; vue: Vue }
  | { type: 'dessin'; outil: 'mur' | 'rectangle'; a: Point }
  | { type: 'pose'; outil: 'porte' | 'fenetre' | 'texte' | 'equipement'; depart: Point }
  | { type: 'mur'; id: string; depart: Point; avant: ElementPlan[] }
  | { type: 'extremite'; ancien: Point; fixe: Point; avant: ElementPlan[] }
  | { type: 'point'; id: string; decalage: Point; avant: ElementPlan[] }
  | { type: 'ouverture'; id: string; avant: ElementPlan[] }
  | { type: 'pincement'; d0: number; milieu0: Point; vue: Vue };

/** Pas de la grille magnétique, en mètres. */
const PAS = 0.1;
/** En dessous de ce déplacement (px), un appui reste un simple toucher. */
const SEUIL_DEPLACEMENT = 6;
const K_MIN = 6;
const K_MAX = 400;
const HISTORIQUE_MAX = 60;

const OUTILS: { id: Outil; libelle: string; icone: NomIcone; aide: string }[] = [
  { id: 'selection', libelle: 'Sélection', icone: 'curseur', aide: 'Touchez un élément pour le modifier ou le déplacer. Glissez dans le vide pour bouger, pincez pour zoomer.' },
  { id: 'mur', libelle: 'Mur', icone: 'mur', aide: 'Glissez le doigt pour tracer un mur. Partez d’une extrémité pour enchaîner.' },
  { id: 'rectangle', libelle: 'Pièce', icone: 'rectangle', aide: 'Glissez d’un coin à l’autre : quatre murs sont créés.' },
  { id: 'porte', libelle: 'Porte', icone: 'porte', aide: 'Touchez un mur pour y placer une porte.' },
  { id: 'fenetre', libelle: 'Fenêtre', icone: 'fenetre', aide: 'Touchez un mur pour y placer une fenêtre.' },
  { id: 'texte', libelle: 'Nom', icone: 'texte', aide: 'Touchez l’endroit où écrire le nom de la pièce.' },
  { id: 'equipement', libelle: 'Équipement', icone: 'equipement', aide: 'Touchez l’endroit où se trouve l’équipement.' },
];

/** Éditeur de plan d'un étage : dessin au doigt, enregistrement automatique. */
@Component({
  selector: 'app-plan-editeur',
  imports: [FormsModule, RouterLink, IconeComponent, RenduPlanComponent],
  templateUrl: './plan-editeur.page.html',
  styleUrl: './plan-editeur.page.scss',
})
export class PlanEditeurPage implements OnInit, OnDestroy {
  /** `:id` (bien) et `:etageId`. */
  readonly id = input.required<string>();
  readonly etageId = input.required<string>();
  private readonly plans = inject(PlanService);
  private readonly piecesService = inject(PiecesService);
  private readonly router = inject(Router);
  private readonly erreurs = inject(ErrorHandler);
  private readonly zone = viewChild<ElementRef<HTMLElement>>('zone');

  protected readonly etage = signal<Etage | null>(null);
  protected readonly elements = signal<ElementPlan[]>([]);
  protected readonly pieces = signal<Record<string, InfoPiece>>({});
  protected readonly listePieces = signal<{ id: string; nom: string }[]>([]);
  protected readonly outil = signal<Outil>('selection');
  protected readonly nature = signal<NatureEquipement>('ECS');
  protected readonly epaisseur = signal(EPAISSEUR_MUR);
  protected readonly aimant = signal(true);
  protected readonly cotes = signal(true);
  protected readonly selectionId = signal<string | null>(null);
  protected readonly vue = signal<Vue>({ x: -2, y: -2, k: 40 });
  protected readonly taille = signal({ l: 800, h: 600 });
  protected readonly apercu = signal<{ outil: 'mur' | 'rectangle'; a: Point; b: Point } | null>(null);
  protected readonly message = signal('');
  protected readonly etatSauvegarde = signal<'ok' | 'en-cours' | 'erreur'>('ok');

  private passe: ElementPlan[][] = [];
  private futur: ElementPlan[][] = [];
  protected readonly peutAnnuler = signal(false);
  protected readonly peutRetablir = signal(false);

  protected readonly outils = OUTILS;
  protected readonly natures = NATURES_EQUIPEMENT;
  protected readonly equipementsInfo = EQUIPEMENTS;
  protected readonly nombre = formaterNombre;
  protected readonly epaisseurs = [
    { valeur: EPAISSEUR_CLOISON, libelle: 'Cloison 10 cm' },
    { valeur: EPAISSEUR_MUR, libelle: 'Mur 20 cm' },
    { valeur: 0.4, libelle: 'Mur épais 40 cm' },
  ];

  protected readonly viewBox = computed(() => {
    const v = this.vue();
    const t = this.taille();
    return `${v.x} ${v.y} ${t.l / v.k} ${t.h / v.k}`;
  });

  /** Lignes de grille visibles : tous les mètres, et tous les 50 cm quand on zoome. */
  protected readonly grille = computed(() => {
    const v = this.vue();
    const t = this.taille();
    const pas = v.k >= 30 ? 0.5 : v.k >= 12 ? 1 : 5;
    const x0 = Math.floor(v.x / pas) * pas;
    const y0 = Math.floor(v.y / pas) * pas;
    const x1 = v.x + t.l / v.k;
    const y1 = v.y + t.h / v.k;
    const lignes: { x1: number; y1: number; x2: number; y2: number; fort: boolean }[] = [];
    const fort = (c: number) => Math.abs(c / (pas < 1 ? 1 : 5) - Math.round(c / (pas < 1 ? 1 : 5))) < 1e-6;
    for (let x = x0; x <= x1 && lignes.length < 400; x += pas) lignes.push({ x1: x, y1: v.y, x2: x, y2: y1, fort: fort(x) });
    for (let y = y0; y <= y1 && lignes.length < 800; y += pas) lignes.push({ x1: v.x, y1: y, x2: x1, y2: y, fort: fort(y) });
    return lignes;
  });

  protected readonly aideOutil = computed(() => OUTILS.find((o) => o.id === this.outil())!.aide);

  protected readonly selection = computed(() => this.elements().find((e) => e.id === this.selectionId()) ?? null);

  protected readonly murSelectionne = computed(() => {
    const s = this.selection();
    return s?.type === 'MUR' ? s : null;
  });

  protected readonly longueurApercu = computed(() => {
    const a = this.apercu();
    if (!a) return '';
    if (a.outil === 'mur') return `${formaterNombre(distance(a.a, a.b))} m`;
    return `${formaterNombre(Math.abs(a.b.x - a.a.x))} × ${formaterNombre(Math.abs(a.b.y - a.a.y))} m`;
  });

  private geste: Geste | null = null;
  private aBouge = false;
  private departEcran: Point = { x: 0, y: 0 };
  private readonly pointeurs = new Map<number, Point>();
  private observateur?: ResizeObserver;
  private ecriture: Promise<void> = Promise.resolve();
  private minuterieMessage?: ReturnType<typeof setTimeout>;

  async ngOnInit(): Promise<void> {
    const [etage, pieces] = await Promise.all([this.plans.obtenirEtage(this.etageId()), this.piecesService.listerParBien(this.id())]);
    if (!etage) {
      await this.router.navigate(['/biens', this.id()], { queryParams: { onglet: 'plan' } });
      return;
    }
    this.etage.set(etage);
    this.elements.set(etage.elements);
    this.pieces.set(Object.fromEntries(pieces.map((p) => [p.id, { nom: p.nom, surface: surfacePiece(p) }])));
    this.listePieces.set(pieces.map((p) => ({ id: p.id, nom: p.nom })));
    // La zone de dessin n'existe qu'une fois l'étage affiché.
    requestAnimationFrame(() => this.observerTaille());
  }

  ngOnDestroy(): void {
    this.observateur?.disconnect();
    clearTimeout(this.minuterieMessage);
  }

  private observerTaille(): void {
    const el = this.zone()?.nativeElement;
    if (!el) return;
    const mesurer = () => this.taille.set({ l: el.clientWidth || 1, h: el.clientHeight || 1 });
    mesurer();
    this.cadrer();
    this.observateur = new ResizeObserver(mesurer);
    this.observateur.observe(el);
  }

  /* ---------- Vue ---------- */

  protected cadrer(): void {
    const b = bornes(this.elements());
    const t = this.taille();
    if (!b) {
      // Origine décalée pour laisser la place à la barre d'options en haut à gauche.
      this.vue.set({ x: -3, y: -3, k: 40 });
      return;
    }
    const marge = 1.5;
    const l = b.maxX - b.minX + 2 * marge;
    const h = b.maxY - b.minY + 2 * marge;
    const k = Math.min(K_MAX, Math.max(K_MIN, Math.min(t.l / l, t.h / h)));
    this.vue.set({ x: (b.minX + b.maxX) / 2 - t.l / k / 2, y: (b.minY + b.maxY) / 2 - t.h / k / 2, k });
  }

  protected zoomer(facteur: number): void {
    const t = this.taille();
    this.zoomerAutour({ x: t.l / 2, y: t.h / 2 }, facteur);
  }

  private zoomerAutour(ecran: Point, facteur: number): void {
    const v = this.vue();
    const k = Math.min(K_MAX, Math.max(K_MIN, v.k * facteur));
    const monde = { x: v.x + ecran.x / v.k, y: v.y + ecran.y / v.k };
    this.vue.set({ x: monde.x - ecran.x / k, y: monde.y - ecran.y / k, k });
  }

  protected molette(e: WheelEvent): void {
    e.preventDefault();
    this.zoomerAutour(this.ecran(e), e.deltaY < 0 ? 1.15 : 1 / 1.15);
  }

  private ecran(e: { clientX: number; clientY: number }): Point {
    const r = this.zone()!.nativeElement.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private monde(ecran: Point): Point {
    const v = this.vue();
    return { x: v.x + ecran.x / v.k, y: v.y + ecran.y / v.k };
  }

  /** Rayon de capture du doigt, en mètres. */
  private rayon(px: number): number {
    return px / this.vue().k;
  }

  /* ---------- Aimant ---------- */

  private accrocher(p: Point, exclure?: Point): Point {
    if (!this.aimant()) return p;
    const cibles = extremites(this.elements()).filter((c) => !exclure || distance(c, exclure) > 1e-6);
    return aimanter(p, cibles, this.rayon(18), PAS);
  }

  /** Extrémité d'un mur en cours de tracé : aimant, puis redressement à 0/45/90°. */
  private pointMur(depart: Point, p: Point, exclure?: Point): Point {
    if (!this.aimant()) return p;
    const cibles = extremites(this.elements()).filter((c) => !exclure || distance(c, exclure) > 1e-6);
    const proche = cibles.find((c) => distance(c, p) <= this.rayon(18));
    if (proche) return { ...proche };
    const r = redresser(depart, p);
    if (r.x === p.x && r.y === p.y) return aimanter(p, [], 0, PAS);
    // Redressé : on arrondit la longueur au pas, dans la direction obtenue.
    const l = distance(depart, r);
    const lArrondie = Math.round(l / PAS) * PAS;
    if (l < 1e-9) return depart;
    return {
      x: Math.round((depart.x + ((r.x - depart.x) / l) * lArrondie) * 1e6) / 1e6,
      y: Math.round((depart.y + ((r.y - depart.y) / l) * lArrondie) * 1e6) / 1e6,
    };
  }

  /* ---------- Gestes ---------- */

  protected appui(e: PointerEvent): void {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const ecran = this.ecran(e);
    this.pointeurs.set(e.pointerId, ecran);

    if (this.pointeurs.size === 2) {
      this.annulerGeste();
      const [a, b] = [...this.pointeurs.values()];
      this.geste = { type: 'pincement', d0: distance(a, b), milieu0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, vue: this.vue() };
      return;
    }
    if (this.pointeurs.size > 2) return;

    this.aBouge = false;
    this.departEcran = ecran;
    const p = this.monde(ecran);
    const outil = this.outil();
    if (outil === 'mur' || outil === 'rectangle') {
      const a = this.accrocher(p);
      this.geste = { type: 'dessin', outil, a };
      this.apercu.set({ outil, a, b: a });
      return;
    }
    if (outil !== 'selection') {
      this.geste = { type: 'pose', outil, depart: ecran };
      return;
    }
    this.geste = this.saisir(p) ?? { type: 'pan', depart: ecran, vue: this.vue() };
  }

  /** Outil sélection : trouve l'élément sous le doigt et prépare son déplacement. */
  private saisir(p: Point): Geste | null {
    const avant = this.elements();
    const mur = this.murSelectionne();
    if (mur) {
      for (const [bout, fixe] of [
        [{ x: mur.x1, y: mur.y1 }, { x: mur.x2, y: mur.y2 }],
        [{ x: mur.x2, y: mur.y2 }, { x: mur.x1, y: mur.y1 }],
      ]) {
        if (distance(p, bout) <= this.rayon(24)) return { type: 'extremite', ancien: bout, fixe, avant };
      }
    }
    const rayonPoint = Math.max(0.35, this.rayon(22));
    for (const e of [...avant].reverse()) {
      if ((e.type === 'EQUIPEMENT' || e.type === 'ETIQUETTE') && distance(p, e) <= rayonPoint) {
        this.selectionId.set(e.id);
        return { type: 'point', id: e.id, decalage: { x: e.x - p.x, y: e.y - p.y }, avant };
      }
    }
    const parId = new Map(murs(avant).map((m) => [m.id, m]));
    for (const e of avant) {
      if (e.type !== 'PORTE' && e.type !== 'FENETRE') continue;
      const m = parId.get(e.murId);
      if (!m) continue;
      const centre = { x: m.x1 + (m.x2 - m.x1) * e.t, y: m.y1 + (m.y2 - m.y1) * e.t };
      if (distance(p, centre) <= Math.max(e.largeur / 2, this.rayon(20))) {
        this.selectionId.set(e.id);
        return { type: 'ouverture', id: e.id, avant };
      }
    }
    let plusProche: { mur: Mur; d: number } | null = null;
    for (const m of murs(avant)) {
      const d = projeter(p, { x: m.x1, y: m.y1 }, { x: m.x2, y: m.y2 }).distance;
      if (d <= Math.max(m.epaisseur / 2, this.rayon(18)) && (!plusProche || d < plusProche.d)) plusProche = { mur: m, d };
    }
    if (plusProche) {
      this.selectionId.set(plusProche.mur.id);
      return { type: 'mur', id: plusProche.mur.id, depart: p, avant };
    }
    this.selectionId.set(null);
    return null;
  }

  protected deplacement(e: PointerEvent): void {
    if (!this.pointeurs.has(e.pointerId)) return;
    const ecran = this.ecran(e);
    this.pointeurs.set(e.pointerId, ecran);
    const g = this.geste;
    if (!g) return;

    if (g.type === 'pincement') {
      const [a, b] = [...this.pointeurs.values()];
      if (!b) return;
      const milieu = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const k = Math.min(K_MAX, Math.max(K_MIN, g.vue.k * (distance(a, b) / (g.d0 || 1))));
      const monde0 = { x: g.vue.x + g.milieu0.x / g.vue.k, y: g.vue.y + g.milieu0.y / g.vue.k };
      this.vue.set({ x: monde0.x - milieu.x / k, y: monde0.y - milieu.y / k, k });
      return;
    }

    if (!this.aBouge) {
      // Un doigt qui tremble ne doit pas déplacer ce qu'il vient de toucher.
      if (g.type !== 'dessin' && distance(this.departEcran, ecran) < SEUIL_DEPLACEMENT) return;
      this.aBouge = true;
    }
    if (g.type === 'pose') return;

    const p = this.monde(ecran);
    switch (g.type) {
      case 'pan': {
        this.vue.set({ ...g.vue, x: g.vue.x - (ecran.x - g.depart.x) / g.vue.k, y: g.vue.y - (ecran.y - g.depart.y) / g.vue.k });
        break;
      }
      case 'dessin': {
        const b = g.outil === 'mur' ? this.pointMur(g.a, p) : this.accrocher(p);
        this.apercu.set({ outil: g.outil, a: g.a, b });
        break;
      }
      case 'mur': {
        let dx = p.x - g.depart.x;
        let dy = p.y - g.depart.y;
        if (this.aimant()) {
          dx = Math.round(dx / PAS) * PAS;
          dy = Math.round(dy / PAS) * PAS;
        }
        this.elements.set(deplacerMur(g.avant, g.id, dx, dy));
        break;
      }
      case 'extremite': {
        const cible = this.pointMur(g.fixe, p, g.ancien);
        this.elements.set(deplacerExtremite(g.avant, g.ancien, cible));
        break;
      }
      case 'point': {
        let x = p.x + g.decalage.x;
        let y = p.y + g.decalage.y;
        if (this.aimant()) {
          x = Math.round(x / PAS) * PAS;
          y = Math.round(y / PAS) * PAS;
        }
        this.elements.set(g.avant.map((el) => (el.id === g.id ? ({ ...el, x, y } as ElementPlan) : el)));
        break;
      }
      case 'ouverture': {
        this.elements.set(
          g.avant.map((el) => {
            if (el.id !== g.id || (el.type !== 'PORTE' && el.type !== 'FENETRE')) return el;
            const m = murs(g.avant).find((x) => x.id === el.murId);
            if (!m) return el;
            const t = projeter(p, { x: m.x1, y: m.y1 }, { x: m.x2, y: m.y2 }).t;
            return { ...el, t: contraindreOuverture(m, t, el.largeur) };
          }),
        );
        break;
      }
    }
  }

  protected relache(e: PointerEvent): void {
    if (!this.pointeurs.delete(e.pointerId)) return;
    const g = this.geste;
    if (!g) return;
    if (g.type === 'pincement') {
      // On attend que tous les doigts soient levés avant un nouveau geste.
      if (this.pointeurs.size === 0) this.geste = null;
      return;
    }
    this.geste = null;
    const p = this.monde(this.ecran(e));

    switch (g.type) {
      case 'dessin': {
        const a = this.apercu();
        this.apercu.set(null);
        if (!a) return;
        if (a.outil === 'mur' && distance(a.a, a.b) >= 0.1) {
          const mur: Mur = { type: 'MUR', id: crypto.randomUUID(), x1: a.a.x, y1: a.a.y, x2: a.b.x, y2: a.b.y, epaisseur: this.epaisseur() };
          this.valider([...this.elements(), mur]);
        } else if (a.outil === 'rectangle' && Math.abs(a.b.x - a.a.x) >= 0.2 && Math.abs(a.b.y - a.a.y) >= 0.2) {
          this.valider([...this.elements(), ...rectangleEnMurs(a.a, a.b, this.epaisseur(), () => crypto.randomUUID())]);
        } else {
          this.signaler(a.outil === 'mur' ? 'Glissez le doigt pour tracer un mur.' : 'Glissez le doigt d’un coin à l’autre de la pièce.');
        }
        return;
      }
      case 'pose':
        if (!this.aBouge) this.poser(g.outil, p);
        return;
      case 'mur':
      case 'extremite':
      case 'point':
      case 'ouverture':
        if (this.aBouge) this.valider(this.elements(), g.avant);
        return;
    }
  }

  private annulerGeste(): void {
    const g = this.geste;
    if (g && 'avant' in g) this.elements.set(g.avant);
    this.apercu.set(null);
    this.geste = null;
  }

  private poser(outil: 'porte' | 'fenetre' | 'texte' | 'equipement', p: Point): void {
    if (outil === 'porte' || outil === 'fenetre') {
      let cible: { mur: Mur; t: number; d: number } | null = null;
      for (const m of murs(this.elements())) {
        const pr = projeter(p, { x: m.x1, y: m.y1 }, { x: m.x2, y: m.y2 });
        if (pr.distance <= Math.max(0.5, this.rayon(30)) && (!cible || pr.distance < cible.d)) cible = { mur: m, t: pr.t, d: pr.distance };
      }
      if (!cible) {
        this.signaler(`Touchez un mur pour y placer la ${outil === 'porte' ? 'porte' : 'fenêtre'}.`);
        return;
      }
      const largeur = Math.min(outil === 'porte' ? LARGEUR_PORTE : LARGEUR_FENETRE, longueurMur(cible.mur));
      const o: Ouverture = {
        type: outil === 'porte' ? 'PORTE' : 'FENETRE',
        id: crypto.randomUUID(),
        murId: cible.mur.id,
        t: contraindreOuverture(cible.mur, cible.t, largeur),
        largeur,
        cote: 1,
        charniereFin: false,
      };
      this.valider([...this.elements(), o]);
      this.selectionId.set(o.id);
      return;
    }
    const pos = this.aimant() ? aimanter(p, [], 0, PAS) : p;
    if (outil === 'texte') {
      const e: EtiquettePlan = { type: 'ETIQUETTE', id: crypto.randomUUID(), x: pos.x, y: pos.y, texte: 'Pièce' };
      this.valider([...this.elements(), e]);
      this.selectionId.set(e.id);
      this.outil.set('selection');
      return;
    }
    const q: EquipementPlan = { type: 'EQUIPEMENT', id: crypto.randomUUID(), x: pos.x, y: pos.y, nature: this.nature() };
    this.valider([...this.elements(), q]);
    this.selectionId.set(q.id);
  }

  /* ---------- Propriétés de la sélection ---------- */

  protected longueur(m: Mur): number {
    return Math.round(longueurMur(m) * 1000) / 1000;
  }

  protected changerLongueur(m: Mur, valeur: number | null): void {
    if (!valeur || valeur <= 0) return;
    this.valider(fixerLongueur(this.elements(), m.id, valeur));
  }

  protected modifier(id: string, changement: Partial<ElementPlan>): void {
    this.valider(this.elements().map((e) => (e.id === id ? ({ ...e, ...changement } as ElementPlan) : e)));
  }

  protected changerLargeur(o: Ouverture, valeur: number | null): void {
    const m = murs(this.elements()).find((x) => x.id === o.murId);
    if (!m || !valeur || valeur <= 0) return;
    const largeur = Math.min(valeur, longueurMur(m));
    this.modifier(o.id, { largeur, t: contraindreOuverture(m, o.t, largeur) });
  }

  protected choisirPiece(e: EtiquettePlan, pieceId: string): void {
    const nom = this.pieces()[pieceId]?.nom;
    const texte = nom && (!e.texte.trim() || e.texte === 'Pièce') ? nom : e.texte;
    this.modifier(e.id, { pieceId: pieceId || undefined, texte } as Partial<EtiquettePlan>);
  }

  protected supprimerSelection(): void {
    const id = this.selectionId();
    if (!id) return;
    this.valider(supprimerElement(this.elements(), id));
    this.selectionId.set(null);
  }

  protected choisirOutil(outil: Outil): void {
    this.outil.set(outil);
    if (outil !== 'selection') this.selectionId.set(null);
  }

  /* ---------- Historique et enregistrement ---------- */

  /** Applique un nouvel état : il entre dans l'historique et part en base. */
  private valider(nouveaux: ElementPlan[], avant: ElementPlan[] = this.elements()): void {
    this.passe.push(avant);
    if (this.passe.length > HISTORIQUE_MAX) this.passe.shift();
    this.futur = [];
    this.appliquer(nouveaux);
  }

  protected annuler(): void {
    const precedent = this.passe.pop();
    if (!precedent) return;
    this.futur.push(this.elements());
    this.appliquer(precedent);
  }

  protected retablir(): void {
    const suivant = this.futur.pop();
    if (!suivant) return;
    this.passe.push(this.elements());
    this.appliquer(suivant);
  }

  private appliquer(elements: ElementPlan[]): void {
    this.elements.set(elements);
    if (this.selectionId() && !elements.some((e) => e.id === this.selectionId())) this.selectionId.set(null);
    this.peutAnnuler.set(this.passe.length > 0);
    this.peutRetablir.set(this.futur.length > 0);
    const etage = this.etage();
    if (!etage) return;
    const copie: Etage = { ...etage, elements };
    this.etage.set(copie);
    this.etatSauvegarde.set('en-cours');
    this.ecriture = this.ecriture
      .then(() => this.plans.enregistrerEtage(copie))
      .then(() => {
        if (this.etage() === copie) this.etatSauvegarde.set('ok');
      })
      .catch((e) => {
        this.erreurs.handleError(e);
        this.etatSauvegarde.set('erreur');
      });
  }

  private signaler(texte: string): void {
    this.message.set(texte);
    clearTimeout(this.minuterieMessage);
    this.minuterieMessage = setTimeout(() => this.message.set(''), 2500);
  }

  protected renommer(): void {
    const etage = this.etage();
    if (!etage) return;
    const nom = prompt('Nom du niveau', etage.nom)?.trim();
    if (!nom || nom === etage.nom) return;
    const copie = { ...etage, nom };
    this.etage.set(copie);
    this.ecriture = this.ecriture.then(() => this.plans.enregistrerEtage(copie)).catch((e) => this.erreurs.handleError(e));
  }

  /* ---------- Gabarits ---------- */

  protected estMur(e: ElementPlan | null): e is Mur {
    return e?.type === 'MUR';
  }
  protected estOuverture(e: ElementPlan | null): e is Ouverture {
    return e?.type === 'PORTE' || e?.type === 'FENETRE';
  }
  protected estEtiquette(e: ElementPlan | null): e is EtiquettePlan {
    return e?.type === 'ETIQUETTE';
  }
  protected estEquipement(e: ElementPlan | null): e is EquipementPlan {
    return e?.type === 'EQUIPEMENT';
  }

  protected taillePx(px: number): number {
    return px / this.vue().k;
  }
}
