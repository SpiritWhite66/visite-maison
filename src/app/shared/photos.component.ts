import { Component, inject, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { PhotosService } from '../application/photos.service';
import { IconeComponent } from './icone.component';

/** Bouton « Photo » : ouvre l'appareil photo (ou la galerie) et renvoie les fichiers choisis. */
@Component({
  selector: 'app-ajout-photo',
  imports: [IconeComponent],
  template: `
    <label class="bouton bouton-texte" [class.desactive]="desactive()">
      <app-icone nom="appareil" [taille]="20" /> Photo
      <input
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        [disabled]="desactive()"
        (change)="choisir($event)"
      />
    </label>
  `,
  styles: `
    label { cursor: pointer; }
    label.desactive { opacity: 0.5; pointer-events: none; }
  `,
})
export class AjoutPhotoComponent {
  readonly desactive = input(false);
  readonly choisie = output<File>();

  protected choisir(evenement: Event): void {
    const champ = evenement.target as HTMLInputElement;
    const fichier = champ.files?.[0];
    champ.value = ''; // permet de reprendre la même photo
    if (fichier) this.choisie.emit(fichier);
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
    .barre { display: flex; gap: 0.5rem; justify-content: space-between; }
  `,
})
export class GaleriePhotosComponent {
  readonly photoIds = input.required<readonly string[]>();
  readonly supprimer = output<string>();
  protected readonly ouverte = signal<string | null>(null);

  protected retirer(id: string): void {
    if (!confirm('Supprimer cette photo ?')) return;
    this.ouverte.set(null);
    this.supprimer.emit(id);
  }
}
