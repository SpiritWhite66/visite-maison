import { Component, computed, ErrorHandler, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BiensService } from '../../../application/biens.service';
import { BudgetService } from '../../../application/budget.service';
import { PhotosService } from '../../../application/photos.service';
import { PiecesService } from '../../../application/pieces.service';
import { PlanService } from '../../../application/plan.service';
import { TravauxService } from '../../../application/travaux.service';
import { VisitesService } from '../../../application/visites.service';
import { progressionTotale } from '../../../domain/checklist';
import { pointsSignales, recapitulatifParTheme, trierPostes, visitesAImprimer } from '../../../domain/compte-rendu';
import { montantOffre } from '../../../domain/etapes';
import { Bien, Etage, Piece, PosteTravaux, Visite } from '../../../domain/modeles';
import { bornes } from '../../../domain/plan';
import { surfacePiece, surfaceTotale } from '../../../domain/piece';
import { formaterEuro, formaterFourchette, formaterNombre } from '../../../shared/format';
import { IconeComponent } from '../../../shared/icone.component';
import { LIBELLE_ETAPE, LIBELLE_PRIORITE, LIBELLE_TYPE_BIEN } from '../../../shared/libelles';
import { InfoPiece, RenduPlanComponent } from '../plan/rendu-plan.component';

/**
 * Compte rendu du bien : un document mis en page pour l'impression.
 * « Imprimer » ouvre la fenêtre d'impression de Chrome, où l'on choisit « Enregistrer au format PDF » :
 * pas de librairie PDF, la feuille de style `@media print` fait tout le travail.
 */
@Component({
  selector: 'app-compte-rendu',
  imports: [FormsModule, RouterLink, IconeComponent, RenduPlanComponent],
  templateUrl: './compte-rendu.page.html',
  styleUrl: './compte-rendu.page.scss',
})
export class CompteRenduPage implements OnInit, OnDestroy {
  readonly id = input.required<string>();
  private readonly biens = inject(BiensService);
  private readonly travaux = inject(TravauxService);
  private readonly visitesService = inject(VisitesService);
  private readonly piecesService = inject(PiecesService);
  private readonly plans = inject(PlanService);
  private readonly photos = inject(PhotosService);
  private readonly budgets = inject(BudgetService);
  private readonly router = inject(Router);
  private readonly erreurs = inject(ErrorHandler);
  private readonly titre = inject(Title);
  private readonly titreInitial = this.titre.getTitle();

  protected readonly bien = signal<Bien | null>(null);
  protected readonly postes = signal<PosteTravaux[]>([]);
  protected readonly visites = signal<Visite[]>([]);
  protected readonly pieces = signal<Piece[]>([]);
  protected readonly etages = signal<Etage[]>([]);
  /** Adresses locales des images (photos signalées et couverture), prêtes avant l'impression. */
  protected readonly images = signal<Record<string, string>>({});
  protected readonly prete = signal(false);

  protected readonly choixVisite = signal('derniere');
  protected readonly avecPhotos = signal(true);
  protected readonly avecPlans = signal(true);
  protected readonly edition = new Date();

  protected readonly euro = formaterEuro;
  protected readonly nombre = formaterNombre;
  protected readonly fourchette = formaterFourchette;
  protected readonly libelleEtape = LIBELLE_ETAPE;
  protected readonly libellePriorite = LIBELLE_PRIORITE;
  protected readonly libelleType = LIBELLE_TYPE_BIEN;
  protected readonly surfacePiece = surfacePiece;

  protected readonly budget = computed(() => {
    const b = this.bien();
    return b ? this.budgets.calculer(b, this.postes()) : null;
  });
  protected readonly offre = computed(() => {
    const b = this.bien();
    return b ? montantOffre(b) : undefined;
  });
  protected readonly lignesPostes = computed(() =>
    trierPostes(this.postes()).map((poste) => ({ poste, montant: this.budgets.montantPoste(poste) })),
  );
  protected readonly surfaceTotale = computed(() => surfaceTotale(this.pieces()));
  protected readonly postesParId = computed(() => new Map(this.postes().map((p) => [p.id, p])));

  /** Une section par visite imprimée. */
  protected readonly sections = computed(() => {
    const b = this.bien();
    if (!b) return [];
    return visitesAImprimer(this.visites(), this.choixVisite()).map((visite) => ({
      visite,
      signales: pointsSignales(b.typeBien, visite),
      recap: recapitulatifParTheme(b.typeBien, visite),
      progression: progressionTotale(b.typeBien, visite),
    }));
  });

  protected readonly infosPieces = computed<Record<string, InfoPiece>>(() =>
    Object.fromEntries(this.pieces().map((p) => [p.id, { nom: p.nom, surface: surfacePiece(p) }])),
  );
  protected readonly etagesDessines = computed(() => this.etages().filter((e) => e.elements.length > 0));

  private readonly urls: string[] = [];
  private readonly formatDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });
  private readonly formatDateHeure = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' });

  async ngOnInit(): Promise<void> {
    const bien = await this.biens.obtenir(this.id());
    if (!bien) {
      await this.router.navigate(['/biens']);
      return;
    }
    const [postes, visites, pieces, etages] = await Promise.all([
      this.travaux.listerParBien(bien.id),
      this.visitesService.listerParBien(bien.id),
      this.piecesService.listerParBien(bien.id),
      this.plans.listerEtages(bien.id),
    ]);
    // Chrome propose le titre de la page comme nom du fichier PDF.
    this.titre.setTitle(`Compte rendu - ${bien.titre}`);
    this.bien.set(bien);
    this.postes.set(postes);
    this.visites.set(visites);
    this.pieces.set(pieces);
    this.etages.set(etages);
    await this.preparerImages(bien, visites);
    this.prete.set(true);
  }

  ngOnDestroy(): void {
    this.titre.setTitle(this.titreInitial);
    for (const u of this.urls) URL.revokeObjectURL(u);
  }

  /** Charge et décode toutes les images utiles : l'impression ne doit jamais partir avec des images manquantes. */
  private async preparerImages(bien: Bien, visites: Visite[]): Promise<void> {
    const ids = new Set<string>();
    if (bien.photoCouvertureId) ids.add(bien.photoCouvertureId);
    for (const v of visites) {
      for (const r of v.reponses) {
        if (r.etat === 'TRAVAUX' || r.etat === 'A_SURVEILLER') r.photoIds.forEach((p) => ids.add(p));
      }
    }
    const images: Record<string, string> = {};
    await Promise.all(
      [...ids].map(async (photoId) => {
        try {
          const blob = await this.photos.blob(photoId);
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          this.urls.push(url);
          const image = new Image();
          image.src = url;
          await image.decode();
          images[photoId] = url;
        } catch (e) {
          this.erreurs.handleError(e);
        }
      }),
    );
    this.images.set(images);
  }

  protected imprimer(): void {
    window.print();
  }

  protected date(iso: string): string {
    const t = Date.parse(iso);
    return Number.isNaN(t) ? '' : this.formatDate.format(t);
  }

  protected dateHeure(d: Date): string {
    return this.formatDateHeure.format(d);
  }

  protected libelleVisite(v: Visite): string {
    return `${v.typeVisite === 'PREMIERE' ? 'Première visite' : 'Contre-visite'} du ${this.date(v.date)}`;
  }

  protected cadre(e: Etage): string {
    const b = bornes(e.elements)!;
    return `${b.minX - 1} ${b.minY - 1} ${b.maxX - b.minX + 2} ${b.maxY - b.minY + 2}`;
  }

  protected lieu(b: Bien): string {
    return [b.adresse, b.commune].filter((x) => x.trim()).join(', ') || 'Adresse non renseignée';
  }

  protected budgetPoste(poste: PosteTravaux): { bas: number; haut: number } {
    return this.budgets.montantPoste(poste);
  }

  protected photosDe(ids: readonly string[]): string[] {
    const images = this.images();
    return ids.map((i) => images[i]).filter((u): u is string => !!u);
  }
}
