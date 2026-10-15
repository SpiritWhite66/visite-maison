import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BiensService } from '../../application/biens.service';
import { BudgetService } from '../../application/budget.service';
import { PiecesService } from '../../application/pieces.service';
import { TravauxService } from '../../application/travaux.service';
import { VisitesService } from '../../application/visites.service';
import { Fourchette } from '../../domain/budget';
import { compterEtats, progressionTotale } from '../../domain/checklist';
import { surfacePiece, surfaceTotale } from '../../domain/piece';
import { Bien, Piece, PosteTravaux, Priorite, Visite } from '../../domain/modeles';
import { formaterEuro, formaterFourchette, formaterNombre } from '../../shared/format';

type Onglet = 'synthese' | 'travaux' | 'visites' | 'pieces';
const ONGLETS: readonly Onglet[] = ['synthese', 'travaux', 'visites', 'pieces'];

export const LIBELLE_PRIORITE: Record<Priorite, string> = {
  URGENT: 'Urgent',
  COURT_TERME: 'Court terme',
  CONFORT: 'Confort',
};

@Component({
  selector: 'app-fiche-bien',
  imports: [RouterLink],
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
  private readonly router = inject(Router);

  protected readonly bien = signal<Bien | null>(null);
  protected readonly postes = signal<PosteTravaux[]>([]);
  protected readonly visites = signal<Visite[]>([]);
  protected readonly pieces = signal<Piece[]>([]);
  protected readonly onglet = signal<Onglet>('synthese');

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

  /** Résumé d'une visite : progression et points à suivre. */
  protected resumeVisite(v: Visite): string {
    const b = this.bien();
    if (!b) return '';
    const { verifies, total } = progressionTotale(b.typeBien, v);
    const c = compterEtats(b.typeBien, v);
    return `${verifies}/${total} points · ${c.TRAVAUX} travaux · ${c.A_SURVEILLER} à surveiller`;
  }

  private readonly formatDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
  protected dateVisite(v: Visite): string {
    return this.formatDate.format(new Date(v.date));
  }

  protected readonly euro = formaterEuro;
  protected readonly fourchette = (m: Fourchette) => formaterFourchette(m.bas, m.haut);
  protected readonly nombre = formaterNombre;
  protected readonly libellePriorite = LIBELLE_PRIORITE;

  async ngOnInit(): Promise<void> {
    const initial = ONGLETS.find((o) => o === this.ongletInitial());
    if (initial) this.onglet.set(initial);
    const bien = await this.biens.obtenir(this.id());
    if (!bien) {
      await this.router.navigate(['/biens']);
      return;
    }
    this.bien.set(bien);
    const [postes, visites, pieces] = await Promise.all([
      this.travaux.listerParBien(bien.id),
      this.visitesService.listerParBien(bien.id),
      this.piecesService.listerParBien(bien.id),
    ]);
    this.postes.set(postes);
    this.visites.set(visites);
    this.pieces.set(pieces);
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
    if (!b || !confirm(`Supprimer définitivement « ${b.titre} » et tout ce qui s’y rattache (travaux, visites, pièces, photos) ? Cette action est irréversible.`)) return;
    await this.biens.supprimer(b.id);
    await this.router.navigate(['/biens']);
  }
}
