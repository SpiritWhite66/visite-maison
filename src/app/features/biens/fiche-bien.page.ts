import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BiensService } from '../../application/biens.service';
import { BudgetService } from '../../application/budget.service';
import { AvisService } from '../../application/avis.service';
import { PersonnesService } from '../../application/personnes.service';
import { PhotosService } from '../../application/photos.service';
import { PiecesService } from '../../application/pieces.service';
import { PlanService } from '../../application/plan.service';
import { TravauxService } from '../../application/travaux.service';
import { VisitesService } from '../../application/visites.service';
import { Fourchette } from '../../domain/budget';
import { compterEtats, progressionTotale } from '../../domain/checklist';
import { surfacePiece, surfaceTotale } from '../../domain/piece';
import { montantOffre } from '../../domain/etapes';
import { avisDesPersonnes, resumerAvis, statutAvis } from '../../domain/avis';
import { Avis, Bien, EtatPoint, Piece, PosteTravaux, Visite } from '../../domain/modeles';
import { formaterEuro, formaterFourchette, formaterNombre } from '../../shared/format';
import { IconeComponent } from '../../shared/icone.component';
import { AjoutPhotoComponent, CouvertureBienComponent } from '../../shared/photos.component';
import { AvisOngletComponent } from './avis/avis-onglet.component';
import { EtoilesComponent } from '../../shared/etoiles.component';
import { SuiviOngletComponent } from './suivi/suivi-onglet.component';
import { PlanOngletComponent } from './plan/plan-onglet.component';
import { LIBELLE_ETAPE, LIBELLE_PRIORITE, LIBELLE_TYPE_BIEN } from '../../shared/libelles';

type Onglet = 'synthese' | 'travaux' | 'visites' | 'pieces' | 'plan' | 'avis' | 'suivi';
const ONGLETS: readonly Onglet[] = ['synthese', 'travaux', 'visites', 'pieces', 'plan', 'avis', 'suivi'];

interface ResumeVisite {
  verifies: number;
  total: number;
  pourcentage: number;
  etats: Record<EtatPoint, number>;
}

@Component({
  selector: 'app-fiche-bien',
  imports: [RouterLink, IconeComponent, PlanOngletComponent, CouvertureBienComponent, AjoutPhotoComponent, SuiviOngletComponent, AvisOngletComponent, EtoilesComponent],
  templateUrl: './fiche-bien.page.html',
  styleUrl: './fiche-bien.page.scss',
})
export class FicheBienPage implements OnInit {
  readonly id = input.required<string>();
  /** Paramètre de requête `?onglet=travaux` : permet de revenir sur l'onglet Travaux après une saisie. */
  readonly ongletInitial = input<string>(undefined, { alias: 'onglet' });
  private readonly biens = inject(BiensService);
  private readonly travaux = inject(TravauxService);
  private readonly visitesService = inject(VisitesService);
  private readonly piecesService = inject(PiecesService);
  private readonly budgets = inject(BudgetService);
  private readonly plans = inject(PlanService);
  private readonly photos = inject(PhotosService);
  private readonly avisService = inject(AvisService);
  private readonly personnesService = inject(PersonnesService);
  private readonly router = inject(Router);

  protected readonly bien = signal<Bien | null>(null);
  protected readonly postes = signal<PosteTravaux[]>([]);
  protected readonly visites = signal<Visite[]>([]);
  protected readonly pieces = signal<Piece[]>([]);
  protected readonly onglet = signal<Onglet>('synthese');
  protected readonly nombreEtages = signal(0);
  protected readonly avisBien = signal<Avis[]>([]);
  /** Avis des personnes qui existent encore. */
  private readonly avisValides = computed(() => avisDesPersonnes(this.avisBien(), this.personnesService.personnes()));
  protected readonly resumeAvis = computed(() => resumerAvis(this.avisValides()));
  /** « 2/3 » : personnes qui ont répondu (avis donné ou N/A) sur celles déclarées. */
  protected readonly avancementAvis = computed(() => {
    const parPersonne = new Map(this.avisValides().map((a) => [a.personneId, a]));
    const personnes = this.personnesService.personnes();
    return { repondu: personnes.filter((p) => statutAvis(parPersonne.get(p.id)) !== 'A_DONNER').length, total: personnes.length };
  });
  protected readonly offre = computed(() => {
    const b = this.bien();
    return b ? montantOffre(b) : undefined;
  });

  protected readonly budget = computed(() => {
    const b = this.bien();
    return b ? this.budgets.calculer(b, this.postes()) : null;
  });

  /** Postes groupés par catégorie, avec leur fourchette. */
  protected readonly groupes = computed(() => {
    const parCategorie = new Map<string, { poste: PosteTravaux; montant: Fourchette }[]>();
    for (const poste of this.postes()) {
      const liste = parCategorie.get(poste.categorie) ?? [];
      liste.push({ poste, montant: this.budgets.montantPoste(poste) });
      parCategorie.set(poste.categorie, liste);
    }
    return [...parCategorie].map(([categorie, lignes]) => ({ categorie, lignes }));
  });

  protected readonly surfaceTotale = computed(() => surfaceTotale(this.pieces()));
  protected readonly surfacePiece = surfacePiece;

  /** Part de chaque catégorie dans le haut de fourchette des travaux, pour les barres de la synthèse. */
  protected readonly categories = computed(() => {
    const bu = this.budget();
    if (!bu) return [];
    const max = Math.max(...bu.parCategorie.map((c) => c.montant.haut), 1);
    return [...bu.parCategorie]
      .sort((a, b) => b.montant.haut - a.montant.haut)
      .map((c) => ({ ...c, part: (c.montant.haut / max) * 100 }));
  });

  /** Résumé d'une visite : progression et décompte des constats. */
  protected resumeVisite(v: Visite): ResumeVisite {
    const typeBien = this.bien()?.typeBien ?? 'VILLE';
    const { verifies, total } = progressionTotale(typeBien, v);
    return { verifies, total, pourcentage: total ? (verifies / total) * 100 : 0, etats: compterEtats(typeBien, v) };
  }

  private readonly formatDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  protected dateVisite(v: Visite): string {
    return this.formatDate.format(new Date(v.date));
  }

  protected readonly euro = formaterEuro;
  protected readonly fourchette = (m: Fourchette) => formaterFourchette(m.bas, m.haut);
  protected readonly nombre = formaterNombre;
  protected readonly libellePriorite = LIBELLE_PRIORITE;
  protected readonly libelleEtape = LIBELLE_ETAPE;
  protected readonly libelleType = LIBELLE_TYPE_BIEN;

  async ngOnInit(): Promise<void> {
    const initial = ONGLETS.find((o) => o === this.ongletInitial());
    if (initial) this.onglet.set(initial);
    const bien = await this.biens.obtenir(this.id());
    if (!bien) {
      await this.router.navigate(['/biens']);
      return;
    }
    this.bien.set(bien);
    const [postes, visites, pieces, etages, avis] = await Promise.all([
      this.travaux.listerParBien(bien.id),
      this.visitesService.listerParBien(bien.id),
      this.piecesService.listerParBien(bien.id),
      this.plans.listerEtages(bien.id),
      this.avisService.listerParBien(bien.id),
      this.personnesService.charger(),
    ]);
    this.nombreEtages.set(etages.length);
    this.avisBien.set(avis);
    this.postes.set(postes);
    this.visites.set(visites);
    this.pieces.set(pieces);
  }

  protected readonly couvertureEnCours = signal(false);
  protected readonly couvertureOuverte = signal(false);

  /** Une photo ajoutée seulement comme couverture n'appartient à rien d'autre : on la supprime avec son remplacement. */
  private photoUtilisee(photoId: string): boolean {
    return (
      this.visites().some((v) => v.reponses.some((r) => r.photoIds.includes(photoId))) ||
      this.pieces().some((p) => p.photoIds.includes(photoId))
    );
  }

  protected async changerCouverture(fichier: File): Promise<void> {
    const bien = this.bien();
    if (!bien) return;
    this.couvertureEnCours.set(true);
    try {
      const photo = await this.photos.ajouter(bien.id, fichier);
      const ancienne = bien.photoCouvertureId;
      await this.biens.definirCouverture(bien.id, photo.id);
      this.bien.set({ ...bien, photoCouvertureId: photo.id });
      if (ancienne && !this.photoUtilisee(ancienne)) await this.photos.supprimer([ancienne]);
      this.couvertureOuverte.set(false);
    } finally {
      this.couvertureEnCours.set(false);
    }
  }

  protected async retirerCouverture(): Promise<void> {
    const bien = this.bien();
    const ancienne = bien?.photoCouvertureId;
    if (!bien || !ancienne) return;
    await this.biens.definirCouverture(bien.id, undefined);
    this.bien.set({ ...bien, photoCouvertureId: undefined });
    if (!this.photoUtilisee(ancienne)) await this.photos.supprimer([ancienne]);
    this.couvertureOuverte.set(false);
  }

  protected async demarrerVisite(): Promise<void> {
    const visite = await this.visitesService.demarrer(this.id());
    await this.router.navigate(['/biens', this.id(), 'visites', visite.id]);
  }

  protected async supprimerVisite(visite: Visite): Promise<void> {
    if (!confirm('Supprimer cette visite, ses réponses et ses photos ? Les postes de travaux créés restent.')) return;
    await this.visitesService.supprimer(visite);
    this.visites.update((l) => l.filter((v) => v.id !== visite.id));
  }

  protected async basculerRealisation(poste: PosteTravaux): Promise<void> {
    const maj: PosteTravaux = { ...poste, realisation: poste.realisation === 'DIY' ? 'ARTISAN' : 'DIY' };
    await this.travaux.enregistrer(maj);
    this.postes.set(await this.travaux.listerParBien(this.id()));
  }

  protected async supprimerPoste(poste: PosteTravaux): Promise<void> {
    if (!confirm(`Supprimer le poste « ${poste.libelle} » ?`)) return;
    await this.travaux.supprimer(poste.id);
    this.postes.update((l) => l.filter((p) => p.id !== poste.id));
  }

  protected async supprimerBien(): Promise<void> {
    const b = this.bien();
    if (!b || !confirm(`Supprimer définitivement « ${b.titre} » et tout ce qui s’y rattache (travaux, visites, pièces, photos, plans) ? Cette action est irréversible.`)) return;
    await this.biens.supprimer(b.id);
    await this.router.navigate(['/biens']);
  }
}
