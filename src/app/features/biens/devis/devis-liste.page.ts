import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BiensService } from '../../../application/biens.service';
import { BudgetService } from '../../../application/budget.service';
import { DevisService } from '../../../application/devis.service';
import { TravauxService } from '../../../application/travaux.service';
import { Fourchette } from '../../../domain/budget';
import { estExpire, positionDansFourchette, resumerDevis } from '../../../domain/devis';
import { Bien, Devis, PosteTravaux } from '../../../domain/modeles';
import { formaterEuro, formaterFourchette } from '../../../shared/format';
import { IconeComponent } from '../../../shared/icone.component';
import { LIBELLE_STATUT_DEVIS } from '../../../shared/libelles';

const LIBELLE_POSITION = { DESSOUS: 'sous l’estimation', DANS: 'dans l’estimation', DESSUS: 'au-dessus de l’estimation' } as const;

@Component({
  selector: 'app-devis-liste',
  imports: [RouterLink, IconeComponent],
  templateUrl: './devis-liste.page.html',
  styleUrl: './devis.scss',
})
export class DevisListePage implements OnInit {
  readonly id = input.required<string>();
  private readonly biens = inject(BiensService);
  private readonly travaux = inject(TravauxService);
  private readonly budgets = inject(BudgetService);
  private readonly service = inject(DevisService);
  private readonly router = inject(Router);

  protected readonly bien = signal<Bien | null>(null);
  private readonly postes = signal<PosteTravaux[]>([]);
  private readonly devis = signal<Devis[]>([]);
  protected readonly nbFichiers = signal(new Map<string, number>());
  protected readonly resume = computed(() =>
    resumerDevis(this.postes(), this.devis(), (p) => this.budgets.montantPoste({ ...p, devisRetenu: undefined })),
  );
  protected readonly libelleStatut = LIBELLE_STATUT_DEVIS;
  protected readonly euro = formaterEuro;
  protected readonly fourchette = (f: Fourchette) => formaterFourchette(f.bas, f.haut);
  private readonly aujourdhui = new Date().toISOString().slice(0, 10);
  private readonly formatDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  async ngOnInit(): Promise<void> {
    const bien = await this.biens.obtenir(this.id());
    if (!bien) {
      await this.router.navigate(['/biens']);
      return;
    }
    this.bien.set(bien);
    await this.recharger();
  }

  private async recharger(): Promise<void> {
    const [postes, devis, fichiers] = await Promise.all([
      this.travaux.listerParBien(this.id()),
      this.service.listerParBien(this.id()),
      this.service.compterFichiers(this.id()),
    ]);
    this.postes.set(postes);
    this.devis.set(devis);
    this.nbFichiers.set(fichiers);
  }

  protected date(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(`${iso}T12:00:00`);
    return Number.isNaN(d.getTime()) ? '' : this.formatDate.format(d);
  }

  protected expire(d: Devis): boolean {
    return estExpire(d, this.aujourdhui);
  }

  protected position(d: Devis, estimation: Fourchette): { cle: string; libelle: string } {
    const p = positionDansFourchette(d.montantTtc, estimation);
    return { cle: p.toLowerCase(), libelle: LIBELLE_POSITION[p] };
  }

  /** Accepter en un tap depuis la liste. */
  protected async accepter(d: Devis): Promise<void> {
    await this.service.enregistrer({ ...d, statut: 'ACCEPTE' });
    await this.recharger();
  }
}
