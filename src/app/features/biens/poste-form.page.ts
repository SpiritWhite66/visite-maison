import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BaremeService } from '../../application/bareme.service';
import { BudgetService } from '../../application/budget.service';
import { TravauxService } from '../../application/travaux.service';
import { CATEGORIES, LigneBareme, PosteTravaux, UniteBareme } from '../../domain/modeles';
import { formaterFourchette } from '../../shared/format';

const LIBELLE_UNITE: Record<UniteBareme, string> = { M2: 'm²', ML: 'ml', UNITE: 'unité(s)', FORFAIT: 'forfait(s)' };

@Component({
  selector: 'app-poste-form',
  imports: [FormsModule, RouterLink],
  templateUrl: './poste-form.page.html',
})
export class PosteFormPage implements OnInit {
  /** Identifiant du bien (`:id`) et du poste en édition (`:posteId`, absent à la création). */
  readonly id = input.required<string>();
  readonly posteId = input<string>();
  private readonly travaux = inject(TravauxService);
  private readonly budgets = inject(BudgetService);
  private readonly router = inject(Router);
  protected readonly baremeService = inject(BaremeService);

  protected readonly poste = signal<PosteTravaux | null>(null);
  protected readonly categories = CATEGORIES;
  protected readonly erreur = signal('');

  async ngOnInit(): Promise<void> {
    const posteId = this.posteId();
    if (!posteId) {
      this.poste.set(this.travaux.nouveau(this.id()));
      return;
    }
    const existant = (await this.travaux.listerParBien(this.id())).find((p) => p.id === posteId);
    if (!existant) {
      await this.router.navigate(['/biens', this.id()]);
      return;
    }
    this.poste.set(structuredClone(existant));
  }

  protected ligne(p: PosteTravaux): LigneBareme | undefined {
    return this.baremeService.lignes().find((l) => l.id === p.baremeId);
  }

  protected unite(p: PosteTravaux): string {
    const l = this.ligne(p);
    return l ? LIBELLE_UNITE[l.unite] : '';
  }

  /** Choisir une ligne de barème pré-remplit catégorie et libellé. */
  protected choisirLigne(p: PosteTravaux, baremeId: string): void {
    p.baremeId = baremeId || undefined;
    const l = this.ligne(p);
    if (l) {
      p.categorie = l.categorie;
      p.libelle = l.libelle;
      p.quantite ??= 1;
    }
  }

  protected apercu(p: PosteTravaux): string {
    const m = this.budgets.montantPoste(p);
    return formaterFourchette(m.bas, m.haut);
  }

  protected async enregistrer(): Promise<void> {
    const p = this.poste();
    if (!p) return;
    if (!p.libelle.trim()) {
      this.erreur.set('Le libellé est obligatoire.');
      return;
    }
    if (p.modeChiffrage === 'BAREME' && (!this.ligne(p) || !(p.quantite && p.quantite > 0))) {
      this.erreur.set('Choisissez une ligne du barème et une quantité.');
      return;
    }
    await this.travaux.enregistrer({
      ...p,
      libelle: p.libelle.trim(),
      montantBas: p.montantBas ?? 0,
      montantHaut: p.montantHaut ?? 0,
      notes: p.notes?.trim() || undefined,
    });
    await this.router.navigate(['/biens', this.id()], { queryParams: { onglet: 'travaux' } });
  }
}
