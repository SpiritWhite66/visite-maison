import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Jeu d'icônes au trait, dessinées en 24 × 24 ; héritent de la couleur du texte. */
const TRACES = {
  maison: 'M3.5 10.5 12 4l8.5 6.5M5.5 9v11h13V9M10 20v-5.5h4V20',
  reglages: 'M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1M15 5v4M9 10v4M17 15v4',
  appareil: 'M3.5 8.5h3.5l1.8-2.5h6.4l1.8 2.5h3.5v10.5h-17zM12 16.2a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  bulle: 'M4.5 5.5h15v10h-9l-4.5 3.5v-3.5h-1.5z',
  plus: 'M12 5v14M5 12h14',
  gauche: 'M14.5 6 8.5 12l6 6',
  droite: 'M9.5 6l6 6-6 6',
  bas: 'M6 9.5l6 6 6-6',
  corbeille: 'M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5M10 10.5v6M14 10.5v6',
  coche: 'M5 12.5l4.5 4.5L19 7.5',
  crayon: 'M4.5 19.5h4l10-10-4-4-10 10zM13 7l4 4',
  outil: 'M14.5 4.5a4.5 4.5 0 0 0-4.2 6.1L4.5 16.4l3.1 3.1 5.8-5.8a4.5 4.5 0 0 0 6.1-4.2l-2.7 1.2-2.6-2.6z',
  fermer: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  visite: 'M8 4.5h8v2.5H8zM6 6h-1.5v14h15V6H18M8.5 12l2 2 4-4.5M8.5 17h7',
} as const;

export type NomIcone = keyof typeof TRACES;

@Component({
  selector: 'app-icone',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 24 24" [attr.width]="taille()" [attr.height]="taille()" aria-hidden="true" focusable="false">
      <path [attr.d]="trace()" />
    </svg>
  `,
  styles: `
    :host { display: inline-flex; flex-shrink: 0; }
    path { fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
  `,
})
export class IconeComponent {
  readonly nom = input.required<NomIcone>();
  readonly taille = input(22);
  protected readonly trace = computed(() => TRACES[this.nom()]);
}
