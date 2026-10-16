import { Component, computed, ErrorHandler, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AvisService } from '../../../application/avis.service';
import { PersonnesService } from '../../../application/personnes.service';
import { avisVierge, basculerEtoiles, marquerAbsente, resumerAvis, statutAvis } from '../../../domain/avis';
import { Avis, Personne } from '../../../domain/modeles';
import { formaterNombre } from '../../../shared/format';
import { IconeComponent } from '../../../shared/icone.component';
import { couleurPersonne, initiale } from '../../../shared/personnes';
import { EtoilesComponent } from '../../../shared/etoiles.component';

const LIBELLE_STATUT = { A_DONNER: 'À donner', ABSENTE: 'N/A · absent·e', DONNE: 'Avis donné' } as const;

/** Onglet « Avis » : chaque personne note le bien (étoiles + commentaire) ou est marquée N/A si elle n'était pas là. */
@Component({
  selector: 'app-avis-onglet',
  imports: [FormsModule, RouterLink, EtoilesComponent, IconeComponent],
  templateUrl: './avis-onglet.component.html',
  styleUrl: './avis-onglet.component.scss',
})
export class AvisOngletComponent implements OnInit {
  readonly bienId = input.required<string>();
  /** Avis déjà enregistrés pour ce bien (chargés par la fiche). */
  readonly avis = input.required<Avis[]>();
  readonly avisChange = output<Avis[]>();
  private readonly avisService = inject(AvisService);
  protected readonly personnesService = inject(PersonnesService);
  private readonly erreurs = inject(ErrorHandler);

  protected readonly etat = signal<'ok' | 'en-cours' | 'erreur'>('ok');
  protected readonly libelleStatut = LIBELLE_STATUT;
  protected readonly nombre = formaterNombre;
  protected readonly couleur = couleurPersonne;
  protected readonly initiale = initiale;
  protected readonly statutAvis = statutAvis;

  protected readonly lignes = computed(() => {
    const parPersonne = new Map(this.avis().map((a) => [a.personneId, a]));
    return this.personnesService.personnes().map((personne) => ({ personne, avis: parPersonne.get(personne.id) ?? avisVierge(this.bienId(), personne.id) }));
  });
  protected readonly resume = computed(() => resumerAvis(this.lignes().map((l) => l.avis)));

  private ecriture: Promise<void> = Promise.resolve();

  async ngOnInit(): Promise<void> {
    await this.personnesService.charger();
  }

  protected etoiles(p: Personne, avis: Avis, n: number): void {
    this.maj({ ...avis, etoiles: basculerEtoiles(avis.etoiles, n) });
  }

  protected absente(avis: Avis): void {
    this.maj(marquerAbsente(avis, !avis.absente));
  }

  protected commentaire(avis: Avis, texte: string): void {
    this.maj({ ...avis, commentaire: texte });
  }

  /** Remplace l'avis dans la liste affichée et l'enregistre aussitôt (pas de bouton « Enregistrer »). */
  private maj(avis: Avis): void {
    const autres = this.avis().filter((a) => a.id !== avis.id);
    this.avisChange.emit([...autres, avis]);
    this.etat.set('en-cours');
    this.ecriture = this.ecriture
      .then(() => this.avisService.enregistrer(avis))
      .then(() => this.etat.set('ok'))
      .catch((e) => {
        this.erreurs.handleError(e);
        this.etat.set('erreur');
      });
  }
}
