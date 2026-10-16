import { Component, ErrorHandler, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IconeComponent } from '../../shared/icone.component';
import { BiensService } from '../../application/biens.service';
import { PhotosService } from '../../application/photos.service';
import { PiecesService } from '../../application/pieces.service';
import { Piece } from '../../domain/modeles';
import { surfacePiece } from '../../domain/piece';
import { formaterNombre } from '../../shared/format';
import { AjoutPhotoComponent, GaleriePhotosComponent } from '../../shared/photos.component';

/** Fiche d'une pièce : enregistrée automatiquement dès qu'elle porte un nom. */
@Component({
  selector: 'app-piece-form',
  imports: [FormsModule, RouterLink, IconeComponent, AjoutPhotoComponent, GaleriePhotosComponent],
  templateUrl: './piece-form.page.html',
})
export class PieceFormPage implements OnInit {
  /** `:id` (bien) et `:pieceId` (absent à la création). */
  readonly id = input.required<string>();
  readonly pieceId = input<string>();
  private readonly pieces = inject(PiecesService);
  private readonly photos = inject(PhotosService);
  private readonly biens = inject(BiensService);
  protected readonly couvertureId = signal<string | undefined>(undefined);
  private readonly router = inject(Router);
  private readonly erreurs = inject(ErrorHandler);

  protected readonly piece = signal<Piece | null>(null);
  protected readonly existe = signal(false);
  protected readonly enregistre = signal(false);
  protected readonly photoEnCours = signal(false);
  protected readonly surface = surfacePiece;
  protected readonly nombre = formaterNombre;

  private ecriture: Promise<void> = Promise.resolve();

  async ngOnInit(): Promise<void> {
    this.couvertureId.set((await this.biens.obtenir(this.id()))?.photoCouvertureId);
    const pieceId = this.pieceId();
    if (!pieceId) {
      this.piece.set(this.pieces.nouvelle(this.id()));
      return;
    }
    const existante = await this.pieces.obtenir(pieceId);
    if (!existante) {
      await this.router.navigate(['/biens', this.id()], { queryParams: { onglet: 'pieces' } });
      return;
    }
    this.existe.set(true);
    this.piece.set(structuredClone(existante));
  }

  /** Les champs sont liés directement à `piece()` ; chaque saisie déclenche l'enregistrement. */
  protected modifie(): void {
    const p = this.piece();
    if (!p || !p.nom.trim()) return;
    this.existe.set(true);
    this.enregistre.set(false);
    const copie = structuredClone(p);
    copie.nom = copie.nom.trim();
    this.ecriture = this.ecriture
      .then(() => this.pieces.enregistrer(copie))
      .then(() => this.enregistre.set(true))
      .catch((e) => this.erreurs.handleError(e));
  }

  protected async ajouterPhoto(fichier: File): Promise<void> {
    const p = this.piece();
    if (!p) return;
    this.photoEnCours.set(true);
    try {
      const photo = await this.photos.ajouter(p.bienId, fichier);
      p.photoIds = [...p.photoIds, photo.id];
      this.piece.set({ ...p });
      this.modifie();
    } catch (e) {
      this.erreurs.handleError(e);
    } finally {
      this.photoEnCours.set(false);
    }
  }

  protected async retirerPhoto(photoId: string): Promise<void> {
    const p = this.piece();
    if (!p) return;
    p.photoIds = p.photoIds.filter((i) => i !== photoId);
    this.piece.set({ ...p });
    this.modifie();
    await this.photos.supprimer([photoId]);
  }

  protected async definirCouverture(photoId: string): Promise<void> {
    await this.biens.definirCouverture(this.id(), photoId);
    this.couvertureId.set(photoId);
  }

  protected async supprimer(): Promise<void> {
    const p = this.piece();
    if (!p || !confirm(`Supprimer la pièce « ${p.nom} » et ses photos ?`)) return;
    await this.ecriture;
    await this.pieces.supprimer(p);
    await this.router.navigate(['/biens', this.id()], { queryParams: { onglet: 'pieces' } });
  }
}
