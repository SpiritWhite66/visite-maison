import { Component, inject, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ParametresService } from '../../application/parametres.service';
import { Parametres } from '../../domain/modeles';

@Component({
  selector: 'app-reglages-budget',
  imports: [FormsModule],
  template: `
    <section class="carte">
      <h2>Budget</h2>
      <form (ngSubmit)="enregistrer()">
        <label class="champ">Taux de frais de notaire (%)
          <input name="notaire" type="number" inputmode="decimal" min="0" step="0.1" [(ngModel)]="valeurs().tauxNotairePct" />
        </label>
        <label class="champ">Marge de négociation par défaut (%)
          <input name="marge" type="number" inputmode="decimal" min="0" max="100" step="0.5" [(ngModel)]="valeurs().margeNegociationDefautPct" />
        </label>
        <label class="champ">Coefficient DIY (0,4 ≈ matériaux seuls)
          <input name="diy" type="number" inputmode="decimal" min="0" step="0.05" [(ngModel)]="valeurs().coefDiyDefaut" />
        </label>
        <div class="pied">
          <button type="submit">Enregistrer</button>
          @if (enregistre()) { <span class="ok" role="status">Enregistré</span> }
        </div>
      </form>
    </section>
  `,
  styles: `.pied { display: flex; align-items: center; gap: 1rem; } .ok { color: var(--etat-ok); font-weight: 600; }`,
})
export class ReglagesBudgetComponent {
  private readonly service = inject(ParametresService);
  /** Copie de travail des réglages ; elle repart des réglages enregistrés quand ils changent (import d'une sauvegarde). */
  protected readonly valeurs = linkedSignal<Parametres>(() => ({ ...this.service.parametres() }));
  protected readonly enregistre = signal(false);

  protected async enregistrer(): Promise<void> {
    const v = this.valeurs();
    await this.service.enregistrer({
      ...this.service.parametres(),
      tauxNotairePct: v.tauxNotairePct ?? 0,
      margeNegociationDefautPct: v.margeNegociationDefautPct ?? 0,
      coefDiyDefaut: v.coefDiyDefaut ?? 0,
    });
    this.enregistre.set(true);
    setTimeout(() => this.enregistre.set(false), 2500);
  }
}
