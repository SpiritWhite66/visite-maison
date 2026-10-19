import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BiensService } from '../../application/biens.service';
import { BudgetService } from '../../application/budget.service';
import { FinancementService } from '../../application/financement.service';
import { ParametresService } from '../../application/parametres.service';
import { TravauxService } from '../../application/travaux.service';
import { calculerFinancement, ResultatFinancement } from '../../domain/financement';
import { Bien } from '../../domain/modeles';
import { entreeFinancement } from './entree';
import { formaterEuro } from '../../shared/format';
import { IconeComponent } from '../../shared/icone.component';
import { LIBELLE_ETAPE } from '../../shared/libelles';

interface Ligne {
  bien: Bien;
  budgetBas: number;
  budgetHaut: number;
  resultat: ResultatFinancement | null;
}

/** Choix du bien à financer ; les biens qui ont déjà un plan affichent leur mensualité. */
@Component({
  selector: 'app-choix-bien',
  imports: [RouterLink, IconeComponent],
  template: `
    <header class="entete-page">
      <div>
        <h1>Financement</h1>
        <div class="meta">Choisis un bien pour monter son plan de financement : aides, prêts et tableau d’amortissement.</div>
      </div>
    </header>

    @if (lignes(); as l) {
      @if (l.length === 0) {
        <div class="vide">
          <p>Aucun bien pour l’instant.</p>
          <a class="bouton" routerLink="/biens/nouveau">Ajouter un bien</a>
        </div>
      } @else {
        <ul class="liste">
          @for (ligne of l; track ligne.bien.id) {
            <li>
              <a class="choix" [routerLink]="[ligne.bien.id]">
                <span class="titre">
                  <strong>{{ ligne.bien.titre }}</strong>
                  <span class="discret">{{ ligne.bien.commune || 'Commune non renseignée' }} · {{ libelleEtape[ligne.bien.etape] }}</span>
                </span>
                @if (ligne.resultat; as r) {
                  <span class="chiffres">
                    <strong class="chiffre">{{ euro(r.mensualiteMax) }}<small> / mois</small></strong>
                    <span class="discret chiffre">{{ euro(r.prets.reduce(somme, 0)) }} empruntés</span>
                  </span>
                } @else {
                  <span class="chiffres">
                    <span class="etiquette">À monter</span>
                    <span class="discret chiffre">budget {{ euro(ligne.budgetBas) }}@if (ligne.budgetHaut !== ligne.budgetBas) { – {{ euro(ligne.budgetHaut) }} }</span>
                  </span>
                }
                <app-icone nom="droite" [taille]="20" />
              </a>
            </li>
          }
        </ul>
      }
    }
  `,
  styles: `
    .liste { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.5rem; }
    .choix {
      display: flex; align-items: center; gap: 1rem; min-height: 72px; padding: 0.75rem 1rem;
      background: var(--surface); border: 1px solid var(--filet); border-radius: var(--rayon);
      color: var(--texte); text-decoration: none;
    }
    .choix:active { background: var(--surface-2); }
    .titre { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.15rem; }
    .titre strong { color: var(--encre); }
    .chiffres { display: flex; flex-direction: column; align-items: flex-end; gap: 0.15rem; text-align: right; }
    .chiffres strong { font-size: 1.1rem; color: var(--encre); }
    .chiffres small { font-size: 0.8rem; font-weight: 400; color: var(--texte-discret); }
  `,
})
export class ChoixBienPage implements OnInit {
  private readonly biens = inject(BiensService);
  private readonly travaux = inject(TravauxService);
  private readonly budgets = inject(BudgetService);
  private readonly financement = inject(FinancementService);
  private readonly parametres = inject(ParametresService);

  protected readonly lignes = signal<Ligne[] | null>(null);
  protected readonly euro = formaterEuro;
  protected readonly libelleEtape = LIBELLE_ETAPE;
  protected readonly somme = (s: number, p: { montant: number }) => s + p.montant;

  async ngOnInit(): Promise<void> {
    const [biens, postes, plans] = await Promise.all([this.biens.lister(), this.travaux.lister(), this.financement.lister()]);
    const foyer = this.financement.foyer();
    this.lignes.set(
      [...biens]
        .sort((a, b) => b.modifieLe.localeCompare(a.modifieLe))
        .map((bien) => {
          const postesBien = postes.filter((p) => p.bienId === bien.id);
          const budget = this.budgets.calculer(bien, postesBien);
          const plan = plans.find((p) => p.bienId === bien.id);
          const entree = entreeFinancement(bien, postesBien, budget, this.budgets, this.parametres.parametres().tauxNotairePct);
          return {
            bien,
            budgetBas: budget.total.bas,
            budgetHaut: budget.total.haut,
            resultat: plan ? calculerFinancement(entree, foyer, plan) : null,
          };
        }),
    );
  }
}
