import { Component, computed, HostListener, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BiensService } from '../../../application/biens.service';
import { PhotosService } from '../../../application/photos.service';
import { PiecesService } from '../../../application/pieces.service';
import { VisitesService } from '../../../application/visites.service';
import { THEMES_CHECKLIST } from '../../../domain/checklist-catalogue';
import { pointParId } from '../../../domain/checklist';
import { GroupeGalerie, grouperPhotos, nombrePhotos, PhotoGalerie, TypeGroupe } from '../../../domain/galerie';
import { Bien, Visite } from '../../../domain/modeles';
import { IconeComponent } from '../../../shared/icone.component';

type Filtre = 'TOUTES' | TypeGroupe;

interface Vue {
  photo: PhotoGalerie;
  groupe: GroupeGalerie;
}

/** Toutes les photos du bien, par provenance ; un tap ouvre la visionneuse (glisser ou flèches pour passer à la suivante). */
@Component({
  selector: 'app-photos-bien',
  imports: [RouterLink, IconeComponent],
  templateUrl: './photos.page.html',
  styleUrl: './photos.page.scss',
})
export class PhotosPage implements OnInit, OnDestroy {
  readonly id = input.required<string>();
  private readonly biens = inject(BiensService);
  private readonly photos = inject(PhotosService);
  private readonly pieces = inject(PiecesService);
  private readonly visites = inject(VisitesService);
  private readonly router = inject(Router);

  protected readonly bien = signal<Bien | null>(null);
  protected readonly groupes = signal<GroupeGalerie[]>([]);
  protected readonly urls = signal(new Map<string, string>());
  protected readonly charge = signal(false);
  protected readonly filtre = signal<Filtre>('TOUTES');
  /** Index dans `sequence` de la photo ouverte. */
  protected readonly ouverte = signal<number | null>(null);

  protected readonly total = computed(() => nombrePhotos(this.groupes()));
  protected readonly filtres = computed(() => {
    const g = this.groupes();
    const compte = (t: TypeGroupe) => nombrePhotos(g.filter((x) => x.type === t));
    return [
      { cle: 'TOUTES' as Filtre, libelle: 'Toutes', nombre: this.total() },
      { cle: 'PIECE' as Filtre, libelle: 'Pièces', nombre: compte('PIECE') },
      { cle: 'VISITE' as Filtre, libelle: 'Visites', nombre: compte('VISITE') },
      { cle: 'AUTRE' as Filtre, libelle: 'Autres', nombre: compte('AUTRE') },
    ].filter((f) => f.cle === 'TOUTES' || f.nombre > 0);
  });
  protected readonly visibles = computed(() => {
    const f = this.filtre();
    return f === 'TOUTES' ? this.groupes() : this.groupes().filter((g) => g.type === f);
  });
  /** Ordre de défilement dans la visionneuse : celui de l'écran. */
  protected readonly sequence = computed<Vue[]>(() => this.visibles().flatMap((groupe) => groupe.photos.map((photo) => ({ photo, groupe }))));
  protected readonly vue = computed(() => {
    const i = this.ouverte();
    return i === null ? null : (this.sequence()[i] ?? null);
  });

  private readonly formatVisite = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  private readonly formatPrise = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  async ngOnInit(): Promise<void> {
    const bien = await this.biens.obtenir(this.id());
    if (!bien) {
      await this.router.navigate(['/biens']);
      return;
    }
    const [photos, pieces, visites] = await Promise.all([
      this.photos.listerParBien(bien.id),
      this.pieces.listerParBien(bien.id),
      this.visites.listerParBien(bien.id),
    ]);
    this.urls.set(new Map(photos.map((p) => [p.id, URL.createObjectURL(p.blob)])));
    this.bien.set(bien);
    this.grouper(bien, photos, pieces, [...visites].sort((a, b) => b.date.localeCompare(a.date)));
    this.charge.set(true);
  }

  private contexte?: Parameters<typeof grouperPhotos>;

  private grouper(bien: Bien, photos: { id: string; prisLe: string; legende?: string }[], pieces: Parameters<typeof grouperPhotos>[1]['pieces'], visites: Visite[]): void {
    this.contexte = [
      photos.map(({ id, prisLe, legende }) => ({ id, prisLe, legende })),
      {
        couvertureId: bien.photoCouvertureId,
        pieces,
        visites,
        point: (id) => {
          const p = pointParId(id);
          return p ? { libelle: p.libelle, theme: THEMES_CHECKLIST.find((t) => t.id === p.theme)?.libelle ?? '' } : undefined;
        },
        dateVisite: (v) => this.formatVisite.format(new Date(v.date)),
      },
    ];
    this.groupes.set(grouperPhotos(...this.contexte));
  }

  ngOnDestroy(): void {
    for (const u of this.urls().values()) URL.revokeObjectURL(u);
  }

  protected ouvrir(photo: PhotoGalerie, groupe: GroupeGalerie): void {
    this.ouverte.set(this.sequence().findIndex((v) => v.photo === photo && v.groupe === groupe));
  }

  protected fermer(): void {
    this.ouverte.set(null);
  }

  protected deplacer(pas: number): void {
    const i = this.ouverte();
    const n = this.sequence().length;
    if (i === null || n === 0) return;
    this.ouverte.set((i + pas + n) % n);
  }

  @HostListener('document:keydown', ['$event'])
  protected clavier(e: KeyboardEvent): void {
    if (this.ouverte() === null) return;
    if (e.key === 'ArrowRight') this.deplacer(1);
    else if (e.key === 'ArrowLeft') this.deplacer(-1);
    else if (e.key === 'Escape') this.fermer();
  }

  // Glisser du doigt pour passer d'une photo à l'autre.
  private departX: number | null = null;
  protected appui(e: PointerEvent): void {
    this.departX = e.clientX;
  }
  protected relache(e: PointerEvent): void {
    if (this.departX === null) return;
    const dx = e.clientX - this.departX;
    this.departX = null;
    if (Math.abs(dx) > 50) this.deplacer(dx < 0 ? 1 : -1);
  }

  protected prise(photo: PhotoGalerie): string {
    const d = new Date(photo.prisLe);
    return Number.isNaN(d.getTime()) ? '' : this.formatPrise.format(d);
  }

  /** Lien vers la pièce ou la visite d'origine. */
  protected origine(g: GroupeGalerie): unknown[] | null {
    if (g.pieceId) return ['/biens', this.id(), 'pieces', g.pieceId];
    if (g.visiteId) return ['/biens', this.id(), 'visites', g.visiteId];
    return null;
  }

  protected async definirCouverture(photo: PhotoGalerie): Promise<void> {
    const bien = this.bien();
    if (!bien || !this.contexte) return;
    await this.biens.definirCouverture(bien.id, photo.id);
    const maj = { ...bien, photoCouvertureId: photo.id };
    this.bien.set(maj);
    const vue = this.vue();
    this.contexte[1] = { ...this.contexte[1], couvertureId: photo.id };
    this.groupes.set(grouperPhotos(...this.contexte));
    // Rester sur la même photo dans la nouvelle séquence.
    if (vue) this.ouverte.set(Math.max(0, this.sequence().findIndex((v) => v.photo.id === vue.photo.id && v.groupe.cle === vue.groupe.cle)));
  }
}
