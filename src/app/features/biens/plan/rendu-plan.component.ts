import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ElementPlan, EquipementPlan, EtiquettePlan, Mur, Ouverture } from '../../../domain/modeles';
import { geometrieOuverture, longueurMur, tracePorte } from '../../../domain/plan';
import { formaterNombre } from '../../../shared/format';
import { EQUIPEMENTS } from './libelles-plan';

export interface InfoPiece {
  nom: string;
  surface?: number;
}

const FOND = '#fffdf9';
const ENCRE = '#22201c';

/**
 * Dessin d'un étage, à placer dans un `<svg>` dont l'unité est le mètre.
 * `pxParMetre` permet de garder cotes et poignées à taille constante à l'écran.
 */
@Component({
  selector: 'g[appRenduPlan]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Murs -->
    @for (m of mursVisibles(); track m.id) {
      <svg:line
        [attr.x1]="m.x1" [attr.y1]="m.y1" [attr.x2]="m.x2" [attr.y2]="m.y2"
        [attr.stroke]="m.id === selectionId() ? '#2f5d50' : encre"
        [attr.stroke-width]="m.epaisseur" stroke-linecap="square"
      />
    }

    <!-- Portes et fenêtres : on « perce » le mur puis on dessine le symbole -->
    @for (o of ouvertures(); track o.ouverture.id) {
      <svg:line
        [attr.x1]="o.g.debut.x" [attr.y1]="o.g.debut.y" [attr.x2]="o.g.fin.x" [attr.y2]="o.g.fin.y"
        [attr.stroke]="fond" [attr.stroke-width]="o.mur.epaisseur + 0.02" stroke-linecap="butt"
      />
      @let c = o.ouverture.id === selectionId() ? '#2f5d50' : encre;
      @if (o.ouverture.type === 'FENETRE') {
        @for (d of [-0.5, 0, 0.5]; track d) {
          <svg:line
            [attr.x1]="o.g.debut.x + o.g.normale.x * o.mur.epaisseur * d" [attr.y1]="o.g.debut.y + o.g.normale.y * o.mur.epaisseur * d"
            [attr.x2]="o.g.fin.x + o.g.normale.x * o.mur.epaisseur * d" [attr.y2]="o.g.fin.y + o.g.normale.y * o.mur.epaisseur * d"
            [attr.stroke]="c" [attr.stroke-width]="d === 0 ? 0.025 : 0.035"
          />
        }
      } @else {
        <svg:path [attr.d]="o.trace" fill="none" [attr.stroke]="c" stroke-width="0.03" />
      }
    }

    <!-- Cotes des murs -->
    @if (cotes()) {
      @for (m of mursVisibles(); track m.id) {
        @let cm = cote(m);
        <svg:text
          [attr.x]="cm.x" [attr.y]="cm.y" [attr.transform]="'rotate(' + cm.angle + ' ' + cm.x + ' ' + cm.y + ')'"
          [attr.font-size]="taillePx(12)" text-anchor="middle" dominant-baseline="middle"
          fill="#6e675c" [attr.stroke]="fond" [attr.stroke-width]="taillePx(3)" paint-order="stroke"
        >{{ cm.texte }}</svg:text>
      }
    }

    <!-- Noms des pièces -->
    @for (e of etiquettes(); track e.id) {
      @let info = e.pieceId ? pieces()[e.pieceId] : undefined;
      <svg:text
        [attr.x]="e.x" [attr.y]="e.y" text-anchor="middle" font-weight="650" font-size="0.32"
        [attr.fill]="e.id === selectionId() ? '#2f5d50' : encre" [attr.stroke]="fond" stroke-width="0.08" paint-order="stroke"
      >
        <svg:tspan [attr.x]="e.x">{{ e.texte || info?.nom || 'Pièce' }}</svg:tspan>
        @if (info?.surface; as s) {
          <svg:tspan [attr.x]="e.x" dy="0.38" font-size="0.26" font-weight="400">{{ nombre(s) }} m²</svg:tspan>
        }
      </svg:text>
    }

    <!-- Équipements -->
    @for (q of equipements(); track q.id) {
      <svg:g [attr.transform]="'translate(' + q.x + ' ' + q.y + ')'">
        <svg:circle r="0.28" [attr.fill]="couleur(q)" [attr.stroke]="q.id === selectionId() ? '#22201c' : fond" stroke-width="0.05" />
        <svg:text text-anchor="middle" dominant-baseline="central" font-size="0.16" font-weight="800" fill="#fff">{{ sigle(q) }}</svg:text>
      </svg:g>
    }
  `,
})
export class RenduPlanComponent {
  readonly elements = input.required<readonly ElementPlan[]>();
  readonly pieces = input<Record<string, InfoPiece>>({});
  readonly selectionId = input<string | null>(null);
  readonly cotes = input(false);
  /** Échelle d'affichage ; sans elle, les cotes ont une taille fixe en mètres. */
  readonly pxParMetre = input<number | null>(null);

  protected readonly fond = FOND;
  protected readonly encre = ENCRE;
  protected readonly nombre = formaterNombre;

  protected readonly mursVisibles = computed(() => this.elements().filter((e): e is Mur => e.type === 'MUR'));
  protected readonly etiquettes = computed(() => this.elements().filter((e): e is EtiquettePlan => e.type === 'ETIQUETTE'));
  protected readonly equipements = computed(() => this.elements().filter((e): e is EquipementPlan => e.type === 'EQUIPEMENT'));
  protected readonly ouvertures = computed(() => {
    const parId = new Map(this.mursVisibles().map((m) => [m.id, m]));
    return this.elements()
      .filter((e): e is Ouverture => e.type === 'PORTE' || e.type === 'FENETRE')
      .flatMap((ouverture) => {
        const mur = parId.get(ouverture.murId);
        if (!mur) return [];
        return [{ ouverture, mur, g: geometrieOuverture(mur, ouverture), trace: ouverture.type === 'PORTE' ? tracePorte(mur, ouverture) : '' }];
      });
  });

  /** Taille en mètres équivalant à `px` pixels à l'écran. */
  protected taillePx(px: number): number {
    const k = this.pxParMetre();
    return k ? px / k : px / 40;
  }

  protected cote(m: Mur): { x: number; y: number; angle: number; texte: string } {
    const l = longueurMur(m) || 1;
    const nx = -(m.y2 - m.y1) / l;
    const ny = (m.x2 - m.x1) / l;
    const decalage = m.epaisseur / 2 + this.taillePx(11);
    let angle = (Math.atan2(m.y2 - m.y1, m.x2 - m.x1) * 180) / Math.PI;
    if (angle > 90) angle -= 180;
    if (angle <= -90) angle += 180;
    return {
      x: (m.x1 + m.x2) / 2 - nx * decalage,
      y: (m.y1 + m.y2) / 2 - ny * decalage,
      angle,
      texte: `${formaterNombre(longueurMur(m))} m`,
    };
  }

  protected couleur(q: EquipementPlan): string {
    return EQUIPEMENTS[q.nature].couleur;
  }

  protected sigle(q: EquipementPlan): string {
    return EQUIPEMENTS[q.nature].sigle;
  }
}
