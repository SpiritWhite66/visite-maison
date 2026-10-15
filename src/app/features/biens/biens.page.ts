import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BiensService } from '../../application/biens.service';
import { BudgetService } from '../../application/budget.service';
import { TravauxService } from '../../application/travaux.service';
import { Budget } from '../../domain/budget';
import { Bien } from '../../domain/modeles';
import { formaterFourchette } from '../../shared/format';

interface CarteBien {
  bien: Bien;
  budget: Budget;
}

@Component({
  selector: 'app-biens',
  imports: [RouterLink],
  template: `
    <h1>Biens</h1>
    <div class="actions"><a class="bouton" routerLink="nouveau">+ Bien</a></div>
    @if (cartes() === null) {
      <p class="discret">Chargement…</p>
    } @else if (cartes()!.length === 0) {
      <p class="discret">Aucun bien pour l'instant. Touchez « + Bien » pour en ajouter un.</p>
    } @else {
      @for (c of cartes(); track c.bien.id) {
        <a class="carte" [routerLink]="[c.bien.id]">
          <strong>{{ c.bien.titre || 'Sans titre' }}</strong>
          <span class="discret">{{ c.bien.commune }}</span>
          <span class="budget">{{ fourchette(c.budget) }}</span>
          <span class="discret">budget total (négocié + notaire + travaux)</span>
        </a>
      }
    }
  `,
  styles: `
    .carte { display: flex; flex-direction: column; gap: 0.15rem; color: inherit; text-decoration: none; min-height: 44px; }
    .budget { font-size: 1.15rem; font-weight: 700; color: var(--primaire); }
  `,
})
export class BiensPage implements OnInit {
  private readonly biens = inject(BiensService);
  private readonly travaux = inject(TravauxService);
  private readonly budgets = inject(BudgetService);
  protected readonly cartes = signal<CarteBien[] | null>(null);

  async ngOnInit(): Promise<void> {
    const [biens, postes] = await Promise.all([this.biens.lister(), this.travaux.lister()]);
    this.cartes.set(
      biens.map((bien) => ({ bien, budget: this.budgets.calculer(bien, postes.filter((p) => p.bienId === bien.id)) })),
    );
  }

  protected fourchette(b: Budget): string {
    return formaterFourchette(b.total.bas, b.total.haut);
  }
}
