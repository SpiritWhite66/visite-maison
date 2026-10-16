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
  plan: 'M4 4.5h16v15H4zM4 11h7M11 4.5v4M11 13.5v6M15 11h5',
  curseur: 'M6.5 4l11 6.6-4.8 1.2 2.8 5.2-2.2 1.2-2.8-5.2-4 3z',
  mur: 'M5.5 18.5l13-13M3.5 16.5l4 4M16.5 3.5l4 4',
  rectangle: 'M4.5 6.5h15v11h-15z',
  porte: 'M4 19.5h16M7.5 19.5V5.5M7.5 5.5a14 14 0 0 1 12 14',
  fenetre: 'M4.5 5.5h15v13h-15zM12 5.5v13M4.5 12h15',
  texte: 'M5.5 7V5h13v2M12 5v14M9.5 19h5',
  equipement: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 7.5v4.5l3 2',
  annuler: 'M8.5 6.5l-4 4 4 4M4.5 10.5h10a4.5 4.5 0 0 1 0 9h-3',
  retablir: 'M15.5 6.5l4 4-4 4M19.5 10.5h-10a4.5 4.5 0 0 0 0 9h3',
  aimant: 'M6 4.5v8a6 6 0 0 0 12 0v-8h-3.5v8a2.5 2.5 0 0 1-5 0v-8zM6 8.5h3.5M14.5 8.5H18',
  cadrer: 'M4.5 9V4.5H9M15 4.5h4.5V9M19.5 15v4.5H15M9 19.5H4.5V15',
  cote: 'M4 7.5v9M20 7.5v9M4 12h16M7 9.5 4.5 12 7 14.5M17 9.5l2.5 2.5-2.5 2.5',
  moins: 'M5 12h14',
  cloche: 'M6.5 16.5v-5a5.5 5.5 0 0 1 11 0v5l1.5 2h-14zM10 20.5a2 2 0 0 0 4 0',
  telecharger: 'M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14',
  importer: 'M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14',
  stylet: 'M15.5 4.5l4 4L9 19l-5 1 1-5zM13.5 6.5l4 4',
  fichier: 'M6 3.5h8l4 4v13H6zM14 3.5v4h4M9 13h6M9 16.5h6',
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
