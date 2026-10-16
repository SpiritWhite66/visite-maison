import { Component, computed, ErrorHandler, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BiensService } from '../../../application/biens.service';
import { dateEtapeActuelle, estTerminee, ETAPES_PARCOURS, ETAPES_TERMINALES, montantOffre } from '../../../domain/etapes';
import { Bien, EntreeHistorique, Etape } from '../../../domain/modeles';
import { joursDepuis } from '../../../domain/sauvegarde';
import { prixNegocie } from '../../../domain/budget';
import { formaterEuro } from '../../../shared/format';
import { IconeComponent } from '../../../shared/icone.component';
import { LIBELLE_ETAPE } from '../../../shared/libelles';

/** Onglet « Suivi » : étape actuelle, changement d'étape libre et historique daté. */
@Component({
  selector: 'app-suivi-onglet',
  imports: [FormsModule, IconeComponent],
  templateUrl: './suivi-onglet.component.html',
  styleUrl: './suivi-onglet.component.scss',
})
export class SuiviOngletComponent {
  readonly bien = input.required<Bien>();
  readonly bienChange = output<Bien>();
  private readonly biens = inject(BiensService);
  private readonly erreurs = inject(ErrorHandler);

  protected readonly parcours = ETAPES_PARCOURS;
  protected readonly terminales = ETAPES_TERMINALES;
  protected readonly libelle = LIBELLE_ETAPE;
  protected readonly euro = formaterEuro;
  protected readonly estTerminee = estTerminee;

  /** Étape choisie et pas encore validée : ouvre le formulaire de commentaire (et de montant). */
  protected readonly cible = signal<Etape | null>(null);
  protected commentaire = '';
  protected montant: number | null = null;
  protected readonly enCours = signal(false);

  protected readonly offre = computed(() => montantOffre(this.bien()));
  protected readonly jours = computed(() => joursDepuis(dateEtapeActuelle(this.bien()), new Date()));
  /** Plus récent d'abord. */
  protected readonly historique = computed<EntreeHistorique[]>(() => [...this.bien().historiqueEtapes].reverse());
  protected readonly peutAnnuler = computed(() => this.bien().historiqueEtapes.length > 1);

  private readonly formatDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  protected date(iso: string): string {
    const t = Date.parse(iso);
    return Number.isNaN(t) ? '' : this.formatDate.format(t);
  }

  protected choisir(etape: Etape): void {
    // Rester sur l'étape actuelle n'a de sens que pour enregistrer une nouvelle offre.
    if (etape === this.bien().etape && etape !== 'OFFRE_FAITE') {
      this.cible.set(null);
      return;
    }
    this.commentaire = '';
    this.montant = etape === 'OFFRE_FAITE' ? (this.offre() ?? Math.round(prixNegocie(this.bien().prixAffiche, this.bien().margeNegociationPct))) : null;
    this.cible.set(etape);
  }

  protected annuler(): void {
    this.cible.set(null);
  }

  protected async valider(): Promise<void> {
    const etape = this.cible();
    if (!etape) return;
    await this.executer(() =>
      this.biens.changerEtape(this.bien().id, {
        etape,
        commentaire: this.commentaire,
        montant: etape === 'OFFRE_FAITE' && this.montant !== null ? this.montant : undefined,
      }),
    );
    this.cible.set(null);
  }

  protected async annulerDernier(): Promise<void> {
    if (!confirm('Annuler le dernier changement d’étape ?')) return;
    await this.executer(() => this.biens.annulerDernierChangement(this.bien().id));
    this.cible.set(null);
  }

  private async executer(action: () => Promise<Bien | undefined>): Promise<void> {
    this.enCours.set(true);
    try {
      const maj = await action();
      if (maj) this.bienChange.emit(maj);
    } catch (e) {
      this.erreurs.handleError(e);
    } finally {
      this.enCours.set(false);
    }
  }
}
