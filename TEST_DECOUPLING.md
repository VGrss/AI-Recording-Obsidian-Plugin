# Guide de Test - Découplage Contrôles et Cartes (v0.9.5)

## Objectif
Vérifier que les contrôles d'enregistrement sont découplés des cartes de traitement, permettant de lancer plusieurs enregistrements même pendant que d'autres sont en cours de traitement.

## Prérequis
- Plugin AI Recording installé dans Obsidian
- Clé API OpenAI configurée dans les paramètres
- Transcription et résumé activés

## Tests à Effectuer

### Test 1 : Libération Immédiate des Contrôles
**Objectif** : Vérifier que les contrôles retournent à IDLE immédiatement après avoir terminé un enregistrement.

**Étapes** :
1. Ouvrir la sidebar AI Recording
2. Cliquer sur "Commencer" pour démarrer un enregistrement
3. Parler pendant quelques secondes
4. Cliquer sur "Terminer"
5. **Vérification** : Les contrôles doivent immédiatement afficher le bouton "Commencer" (état IDLE)
6. **Vérification** : Une nouvelle carte doit apparaître dans l'historique avec le statut "⏳ Traitement en cours..."

**Résultat Attendu** :
- ✓ Les contrôles sont immédiatement disponibles
- ✓ La carte affiche son statut de traitement indépendamment
- ✓ Le bouton "Commencer" est cliquable même pendant le traitement

### Test 2 : Traitement Asynchrone en Arrière-Plan
**Objectif** : Vérifier que le traitement (transcription + résumé) s'effectue en arrière-plan sans bloquer l'interface.

**Étapes** :
1. Terminer un enregistrement (voir Test 1)
2. Observer la carte de l'enregistrement dans l'historique
3. **Vérification** : Le statut doit passer de "⏳ Traitement en cours..." à "✓ Terminé" automatiquement
4. **Vérification** : Le titre de la carte doit être mis à jour avec le titre AI en 3 mots
5. **Vérification** : Les onglets "Summary" et "Transcript" doivent contenir les données

**Résultat Attendu** :
- ✓ Le traitement se fait en arrière-plan
- ✓ Le statut de la carte se met à jour automatiquement
- ✓ Les données sont disponibles une fois le traitement terminé

### Test 3 : Enregistrements Multiples Simultanés
**Objectif** : Vérifier qu'on peut lancer plusieurs enregistrements pendant que d'autres sont en traitement.

**Étapes** :
1. Commencer un premier enregistrement
2. Parler pendant 5 secondes
3. Cliquer sur "Terminer"
4. **IMMÉDIATEMENT** cliquer sur "Commencer" pour un deuxième enregistrement
5. Parler pendant 5 secondes
6. Cliquer sur "Terminer"
7. **IMMÉDIATEMENT** cliquer sur "Commencer" pour un troisième enregistrement
8. Parler pendant 5 secondes
9. Cliquer sur "Terminer"
10. Observer l'historique

**Résultat Attendu** :
- ✓ Les 3 enregistrements sont créés sans bloquer l'interface
- ✓ Les 3 cartes apparaissent dans l'historique
- ✓ Chaque carte affiche "⏳ Traitement en cours..." indépendamment
- ✓ Les cartes se mettent à jour au fur et à mesure que leur traitement se termine
- ✓ Plusieurs cartes peuvent être en traitement simultanément

### Test 4 : Statuts Visuels des Cartes
**Objectif** : Vérifier que les statuts visuels des cartes sont corrects et bien différenciés.

**Étapes** :
1. Créer plusieurs enregistrements (voir Test 3)
2. Observer les badges de statut sur chaque carte

**Statuts à Observer** :
- ⏸️ En attente : Badge gris (si l'enregistrement n'est pas encore traité)
- ⏳ Traitement en cours... : Badge orange avec animation de pulsation
- ✓ Terminé : Badge vert
- ❌ Erreur : Badge rouge (peut être simulé en désactivant temporairement la clé API)

**Résultat Attendu** :
- ✓ Chaque statut a une couleur et une icône distinctes
- ✓ Le badge "Traitement en cours" a une animation de pulsation
- ✓ Les statuts se mettent à jour automatiquement

### Test 5 : Gestion des Erreurs
**Objectif** : Vérifier que les erreurs de traitement n'impactent pas les autres enregistrements.

**Étapes** :
1. Créer un enregistrement normal
2. Pendant le traitement du premier, modifier la clé API dans les paramètres (la rendre invalide)
3. Créer un deuxième enregistrement
4. Observer les deux cartes
5. Restaurer la clé API valide
6. Créer un troisième enregistrement

**Résultat Attendu** :
- ✓ Le premier enregistrement se termine correctement (✓ Terminé)
- ✓ Le deuxième enregistrement affiche une erreur (❌ Erreur)
- ✓ Le troisième enregistrement se termine correctement (✓ Terminé)
- ✓ Les erreurs d'un enregistrement n'impactent pas les autres
- ✓ Les contrôles restent fonctionnels même en cas d'erreur

### Test 6 : Retranscription Manuelle
**Objectif** : Vérifier qu'on peut retranscrire un enregistrement existant sans bloquer les contrôles.

**Étapes** :
1. Créer un enregistrement mais désactiver la transcription automatique dans les paramètres
2. L'enregistrement est créé sans transcription
3. Cliquer sur le bouton "🔄 Transcrire" dans la carte
4. **IMMÉDIATEMENT** créer un nouvel enregistrement

**Résultat Attendu** :
- ✓ La retranscription se lance
- ✓ Les contrôles restent disponibles
- ✓ On peut créer un nouvel enregistrement pendant la retranscription

## Résumé des Améliorations (v0.9.5)

### Avant (v0.9.4 et antérieures)
- ❌ Les contrôles étaient bloqués pendant le traitement
- ❌ Les états UPLOADING, TRANSCRIBING, SUMMARIZING bloquaient l'interface
- ❌ Impossible de créer un nouvel enregistrement pendant le traitement
- ❌ Le statut de traitement était affiché dans la zone de contrôle

### Après (v0.9.5)
- ✅ Les contrôles retournent immédiatement à IDLE après avoir terminé un enregistrement
- ✅ Le traitement s'effectue de manière asynchrone en arrière-plan
- ✅ Chaque carte affiche son propre statut de traitement
- ✅ Plusieurs enregistrements peuvent être créés et traités en parallèle
- ✅ Les statuts visuels sont clairs et animés
- ✅ Les erreurs d'un enregistrement n'impactent pas les autres

## Architecture Technique

### Changements Principaux

1. **finishRecording()** : Retourne immédiatement à IDLE et lance `processRecording()` en arrière-plan
2. **processRecording()** : Nouvelle méthode qui gère le traitement asynchrone complet (transcription + résumé)
3. **RecordingMetadata.status** : Chaque enregistrement a son propre statut (pending, processing, completed, error)
4. **Suppression des états globaux bloquants** : UPLOADING, TRANSCRIBING, SUMMARIZING ne bloquent plus les contrôles
5. **Affichage décentralisé** : Chaque carte affiche son propre statut de traitement

### File de Traitement
Les enregistrements sont traités de manière asynchrone et indépendante. Chaque appel à `processRecording()` s'exécute dans sa propre Promise, permettant plusieurs traitements en parallèle.

## Notes pour le Développement Futur

### Améliorations Possibles
- Ajouter une limite au nombre de traitements simultanés pour éviter de surcharger l'API
- Implémenter une vraie file d'attente (queue) avec priorités
- Ajouter un indicateur de progression plus détaillé (% de completion)
- Permettre d'annuler un traitement en cours
- Ajouter un journal des traitements dans les paramètres

### Performance
- Les traitements en parallèle peuvent consommer plus de ressources
- Surveiller l'utilisation de la mémoire avec plusieurs enregistrements lourds
- Considérer un pool de workers pour les traitements longs

