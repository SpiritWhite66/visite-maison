import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BiensService } from '../../application/biens.service';
import { BudgetService } from '../../application/budget.service';
import { TravauxService } from '../../application/travaux.service';
import { Fourchette } from '../../domain/budget';
import { Bien, PosteTravaux, Priorite } from '../../domain/modeles';
import { formaterEuro, formaterFourchette, formaterNombre } from '../../shared/format';

type Onglet = 'synthese' | 'travaux';

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
  private readonly budgets = inject(BudgetService);
  private readonly router = inject(Router);

  protected readonly bien = signal<Bien | null>(null);
  protected readonly postes = signal<PosteTravaux[]>([]);
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

  protected readonly euro = formaterEuro;
  protected readonly fourchette = (m: Fourchette) => formaterFourchette(m.bas, m.haut);
  protected readonly nombre = formaterNombre;
  protected readonly libellePriorite = LIBELLE_PRIORITE;

  async ngOnInit(): Promise<void> {
    if (this.ongletInitial() === 'travaux') this.onglet.set('travaux');
    const bien = await this.biens.obtenir(this.id());
    if (!bien) {
      await this.router.navigate(['/biens']);
      return;
    }
    this.bien.set(bien);
    this.postes.set(await this.travaux.listerParBien(bien.id));
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
    if (!b || !confirm(`Supprimer définitivement « ${b.titre} » et ses postes de travaux ? Cette action est irréversible.`)) return;
    await this.biens.supprimer(b.id);
    await this.router.navigate(['/biens']);
  }
}
