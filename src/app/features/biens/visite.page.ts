import { Component, ErrorHandler, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BiensService } from '../../application/biens.service';
import { PhotosService } from '../../application/photos.service';
import { VisitesService } from '../../application/visites.service';
import { modifierReponse, progression, progressionTotale, reponseDe, themesPourBien } from '../../domain/checklist';
import { PointChecklist } from '../../domain/checklist-catalogue';
import { Bien, EtatPoint, ReponseChecklist, TypeVisite, Visite } from '../../domain/modeles';
import { AjoutPhotoComponent, GaleriePhotosComponent } from '../../shared/photos.component';

const ETATS: { etat: Exclude<EtatPoint, 'NON_VERIFIE'>; libelle: string }[] = [
  { etat: 'OK', libelle: 'OK' },
  { etat: 'A_SURVEILLER', libelle: 'À surveiller' },
  { etat: 'TRAVAUX', libelle: 'Travaux' },
  { etat: 'NA', libelle: 'N/A' },
];

/**
 * Mode visite : chaque modification est enregistrée aussitôt (pas de bouton « Enregistrer »).
 * Les écritures sont chaînées pour que l'état final en base soit toujours le dernier affiché.
 */
@Component({
  selector: 'app-visite',
  imports: [FormsModule, RouterLink, AjoutPhotoComponent, GaleriePhotosComponent],
  templateUrl: './visite.page.html',
  styleUrl: './visite.page.scss',
})
export class VisitePage implements OnInit {
  /** `:id` (bien) et `:visiteId`. */
  readonly id = input.required<string>();
  readonly visiteId = input.required<string>();
  private readonly biens = inject(BiensService);
  private readonly visites = inject(VisitesService);
  private readonly photos = inject(PhotosService);
  private readonly router = inject(Router);
  private readonly erreurs = inject(ErrorHandler);

  protected readonly bien = signal<Bien | null>(null);
  protected readonly visite = signal<Visite | null>(null);
  protected readonly etatSauvegarde = signal<'ok' | 'en-cours' | 'erreur'>('ok');
  /** Points dont la zone de commentaire est ouverte. */
  protected readonly commentairesOuverts = signal<ReadonlySet<string>>(new Set());
  protected readonly photoEnCours = signal(false);

  protected readonly etats = ETATS;
  protected readonly reponseDe = reponseDe;
  protected themes: ReturnType<typeof themesPourBien> = [];

  private ecriture: Promise<void> = Promise.resolve();

  async ngOnInit(): Promise<void> {
    const [bien, visite] = await Promise.all([this.biens.obtenir(this.id()), this.visites.obtenir(this.visiteId())]);
    if (!bien || !visite) {
      await this.router.navigate(['/biens', this.id()], { queryParams: { onglet: 'visites' } });
      return;
    }
    this.themes = themesPourBien(bien.typeBien);
    this.bien.set(bien);
    this.visite.set(visite);
  }

  protected progressionTheme(points: readonly PointChecklist[]): string {
    const v = this.visite();
    if (!v) return '';
    const { verifies, total } = progression(points, v);
    return `${verifies}/${total}`;
  }

  protected progressionGlobale(): string {
    const b = this.bien();
    const v = this.visite();
    if (!b || !v) return '';
    const { verifies, total } = progressionTotale(b.typeBien, v);
    return `${verifies} / ${total} points vérifiés`;
  }

  protected commentaireVisible(r: ReponseChecklist): boolean {
    return !!r.commentaire || this.commentairesOuverts().has(r.pointId);
  }

  protected basculerCommentaire(pointId: string): void {
    this.commentairesOuverts.update((s) => {
      const copie = new Set(s);
      if (!copie.delete(pointId)) copie.add(pointId);
      return copie;
    });
  }

  /** Un second tap sur l'état actif le remet à « non vérifié ». */
  protected choisirEtat(pointId: string, etat: EtatPoint): void {
    const actuel = reponseDe(this.visite()!, pointId).etat;
    this.modifier(pointId, { etat: actuel === etat ? 'NON_VERIFIE' : etat });
  }

  protected modifierCommentaire(pointId: string, texte: string): void {
    this.modifier(pointId, { commentaire: texte || undefined });
  }

  protected changerType(type: TypeVisite): void {
    this.mettreAJour({ ...this.visite()!, typeVisite: type });
  }

  protected changerNotes(notes: string): void {
    this.mettreAJour({ ...this.visite()!, notes });
  }

  protected async ajouterPhoto(pointId: string, fichier: File): Promise<void> {
    const bien = this.bien();
    if (!bien) return;
    this.photoEnCours.set(true);
    try {
      const photo = await this.photos.ajouter(bien.id, fichier);
      const r = reponseDe(this.visite()!, pointId);
      this.modifier(pointId, { photoIds: [...r.photoIds, photo.id] });
    } catch (e) {
      this.erreurs.handleError(e);
      this.etatSauvegarde.set('erreur');
    } finally {
      this.photoEnCours.set(false);
    }
  }

  protected async retirerPhoto(pointId: string, photoId: string): Promise<void> {
    const r = reponseDe(this.visite()!, pointId);
    this.modifier(pointId, { photoIds: r.photoIds.filter((p) => p !== photoId) });
    await this.photos.supprimer([photoId]);
  }

  protected creerPoste(point: PointChecklist): void {
    const r = reponseDe(this.visite()!, point.id);
    void this.attendreEcritures().then(() =>
      this.router.navigate(['/biens', this.id(), 'travaux', 'nouveau'], {
        queryParams: {
          categorie: point.categorieTravaux,
          libelle: point.libelle,
          notes: r.commentaire,
          visiteId: this.visiteId(),
          pointId: point.id,
        },
      }),
    );
  }

  protected attendreEcritures(): Promise<void> {
    return this.ecriture;
  }

  private modifier(pointId: string, modification: Partial<Omit<ReponseChecklist, 'pointId'>>): void {
    this.mettreAJour(modifierReponse(this.visite()!, pointId, modification));
  }

  private mettreAJour(visite: Visite): void {
    this.visite.set(visite);
    this.etatSauvegarde.set('en-cours');
    this.ecriture = this.ecriture
      .then(() => this.visites.enregistrer(visite))
      .then(() => {
        if (this.visite() === visite) this.etatSauvegarde.set('ok');
      })
      .catch((e) => {
        this.erreurs.handleError(e);
        this.etatSauvegarde.set('erreur');
      });
  }
}
