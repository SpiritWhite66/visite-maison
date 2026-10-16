import { Component, inject, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { PhotosService } from '../application/photos.service';
import { IconeComponent } from './icone.component';

/**
 * Boutons d'ajout de photo : « Photo » ouvre directement l'appareil photo, « Galerie » laisse
 * choisir une image déjà présente sur l'appareil (sans `capture`, Android propose galerie et fichiers).
 */
@Component({
  selector: 'app-ajout-photo',
  imports: [IconeComponent],
  template: `
    <label class="bouton bouton-texte" [class.desactive]="desactive()">
      <app-icone nom="appareil" [taille]="20" /> Photo
      <input type="file" accept="image/*" capture="environment" hidden [disabled]="desactive()" (change)="choisir($event)" />
    </label>
    @if (galerie()) {
      <label class="bouton bouton-texte" [class.desactive]="desactive()">
        <app-icone nom="image" [taille]="20" /> Galerie
        <input type="file" accept="image/*" hidden [multiple]="plusieurs()" [disabled]="desactive()" (change)="choisir($event)" />
      </label>
    }
  `,
  styles: `
    :host { display: contents; }
    label { cursor: pointer; }
    label.desactive { opacity: 0.5; pointer-events: none; }
  `,
})
export class AjoutPhotoComponent {
  readonly desactive = input(false);
  /** Propose aussi de choisir une image dans la galerie. */
  readonly galerie = input(true);
  /** Autorise plusieurs images d'un coup depuis la galerie. */
  readonly plusieurs = input(false);
  readonly choisie = output<File>();

  protected choisir(evenement: Event): void {
    const champ = evenement.target as HTMLInputElement;
    const fichiers = [...(champ.files ?? [])];
    champ.value = ''; // permet de reprendre la même photo
    for (const fichier of fichiers) this.choisie.emit(fichier);
  }
}

@Component({
  selector: 'app-vignette-photo',
  template: `
    @if (url(); as u) {
      <img [src]="u" alt="Photo" />
    } @else {
      <span class="attente"></span>
    }
  `,
  styles: `
    :host { display: block; }
    img, .attente { display: block; width: 100%; height: 100%; object-fit: cover; background: #dde2e7; }
  `,
})
export class VignettePhotoComponent implements OnInit, OnDestroy {
  readonly photoId = input.required<string>();
  protected readonly url = signal<string | null>(null);
  private readonly photos = inject(PhotosService);

  async ngOnInit(): Promise<void> {
    const blob = await this.photos.blob(this.photoId());
    if (blob) this.url.set(URL.createObjectURL(blob));
  }

  ngOnDestroy(): void {
    const u = this.url();
    if (u) URL.revokeObjectURL(u);
  }
}

/** Photo de couverture d'un bien, ou un fond neutre avec une maison s'il n'y en a pas. */
@Component({
  selector: 'app-couverture-bien',
  imports: [IconeComponent],
  template: `
    @if (url(); as u) {
      <img [src]="u" alt="" />
    } @else {
      <span class="sans-photo"><app-icone nom="maison" [taille]="taille()" /></span>
    }
  `,
  styles: `
    /* La taille vient du parent (aspect-ratio, largeur, hauteur) : l'image est toujours recadrée, jamais étirée. */
    :host { position: relative; display: block; overflow: hidden; background: var(--surface-2); }
    img, .sans-photo { position: absolute; inset: 0; width: 100%; height: 100%; }
    img { object-fit: cover; }
    .sans-photo { display: grid; place-items: center; color: var(--filet-fort); }
  `,
})
export class CouvertureBienComponent implements OnInit, OnDestroy {
  readonly photoId = input<string | undefined>();
  /** Taille de la maison affichée quand il n'y a pas de photo. */
  readonly taille = input(32);
  protected readonly url = signal<string | null>(null);
  private readonly photos = inject(PhotosService);

  async ngOnInit(): Promise<void> {
    const id = this.photoId();
    if (!id) return;
    // Photo supprimée entre-temps : on retombe simplement sur le fond neutre.
    const blob = await this.photos.blob(id);
    if (blob) this.url.set(URL.createObjectURL(blob));
  }

  ngOnDestroy(): void {
    const u = this.url();
    if (u) URL.revokeObjectURL(u);
  }
}

/** Miniatures ; un tap ouvre la photo en grand, avec suppression. */
@Component({
  selector: 'app-galerie-photos',
  imports: [VignettePhotoComponent],
  template: `
    <div class="miniatures">
      @for (id of photoIds(); track id) {
        <button type="button" class="miniature" aria-label="Voir la photo" (click)="ouverte.set(id)">
          <app-vignette-photo [photoId]="id" />
        </button>
      }
    </div>
    @if (ouverte(); as id) {
      <div class="voile" role="dialog" aria-modal="true" aria-label="Photo">
        <div class="grande"><app-vignette-photo [photoId]="id" /></div>
        <div class="barre">
          <button type="button" class="bouton-secondaire" (click)="ouverte.set(null)">Fermer</button>
          @if (peutDefinirCouverture()) {
            @if (id === couvertureId()) {
              <span class="est-couverture">Photo de couverture du bien</span>
            } @else {
              <button type="button" class="bouton-secondaire" (click)="choisirCouverture(id)">Photo de couverture</button>
            }
          }
          <button type="button" class="danger" (click)="retirer(id)">Supprimer</button>
        </div>
      </div>
    }
  `,
  styles: `
    .miniatures { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .miniature { width: 88px; height: 88px; min-width: 88px; padding: 0; overflow: hidden; border-radius: 6px; background: none; border: 1px solid var(--filet); }
    .voile { position: fixed; inset: 0; z-index: 50; background: rgba(20, 18, 15, 0.94); display: flex; flex-direction: column; padding: 0.75rem; gap: 0.75rem; }
    .grande { flex: 1; min-height: 0; }
    .grande app-vignette-photo { height: 100%; }
    .grande ::ng-deep img { object-fit: contain; background: none; }
    .barre { display: flex; gap: 0.5rem; justify-content: space-between; align-items: center; flex-wrap: wrap; }
    .est-couverture { color: var(--fond); font-size: 0.9rem; font-weight: 600; }
  `,
})
export class GaleriePhotosComponent {
  readonly photoIds = input.required<readonly string[]>();
  readonly supprimer = output<string>();
  /** Propose « Photo de couverture » dans la visionneuse (photos rattachées à un bien). */
  readonly peutDefinirCouverture = input(false);
  readonly couvertureId = input<string | undefined>();
  readonly couverture = output<string>();
  protected readonly ouverte = signal<string | null>(null);

  protected choisirCouverture(id: string): void {
    this.couverture.emit(id);
  }

  protected retirer(id: string): void {
    if (!confirm('Supprimer cette photo ?')) return;
    this.ouverte.set(null);
    this.supprimer.emit(id);
  }
}
