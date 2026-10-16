import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

const ETOILE = 'M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3L2.8 9.5l6.4-.9z';

/**
 * Étoiles de 1 à 5. En lecture seule, une valeur décimale (une moyenne) remplit partiellement la dernière étoile ;
 * modifiable, chaque étoile est un bouton de 48 px et toucher l'étoile active la retire.
 */
@Component({
  selector: 'app-etoiles',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (modifiable()) {
      <div class="rangee" role="radiogroup" [attr.aria-label]="libelle()">
        @for (n of rang; track n) {
          <button type="button" role="radio" [attr.aria-checked]="valeur() === n" [attr.aria-label]="n + (n > 1 ? ' étoiles' : ' étoile')"
            [disabled]="desactive()" (click)="choisie.emit(n)">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="etoile" [class.pleine]="(valeur() ?? 0) >= n" /></svg>
          </button>
        }
      </div>
    } @else {
      <span class="lecture" role="img" [attr.aria-label]="texte()">
        <span class="fond">★★★★★</span>
        <span class="plein" [style.width.%]="pourcentage()">★★★★★</span>
      </span>
    }
  `,
  styles: `
    :host { display: inline-flex; }
    .rangee { display: flex; gap: 0.15rem; }
    button { padding: 0; width: 48px; height: 48px; background: none; border: 0; border-radius: 8px; color: inherit; }
    button:active { background: var(--primaire-pale); }
    button:disabled { opacity: 0.35; }
    svg { width: 36px; height: 36px; }
    path { fill: none; stroke: var(--filet-fort); stroke-width: 1.6; stroke-linejoin: round; }
    path.pleine { fill: #e0a21b; stroke: #b27417; }
    .lecture { position: relative; display: inline-block; font-size: 1.1em; line-height: 1; letter-spacing: 0.05em; white-space: nowrap; }
    .fond { color: var(--filet-fort); }
    .plein { position: absolute; left: 0; top: 0; overflow: hidden; color: #e0a21b; }
  `,
})
export class EtoilesComponent {
  readonly valeur = input<number | null>(null);
  readonly modifiable = input(false);
  readonly desactive = input(false);
  readonly libelle = input('Étoiles');
  readonly choisie = output<number>();

  protected readonly rang = [1, 2, 3, 4, 5];
  protected readonly etoile = ETOILE;
  protected readonly pourcentage = computed(() => Math.max(0, Math.min(100, ((this.valeur() ?? 0) / 5) * 100)));
  protected readonly texte = computed(() => (this.valeur() === null ? 'Pas de note' : `${this.valeur()} étoiles sur 5`));
}
