# Historique des Versions

## Version 0.9.10 - Interface Utilisateur et Détection Précoce
**Date :** 16 Octobre 2025

• **Détection précoce de la taille** : La taille du fichier est suivie en temps réel pendant l'enregistrement
• **Indicateur de taille en temps réel** : Affichage de la taille actuelle (KB/MB) pendant l'enregistrement avec codes couleur
• **Avertissements automatiques** : Notification à 20 MB (80% de la limite) et à 25 MB (limite atteinte)
• **Progression visuelle améliorée** : Barre de progression, pourcentage et estimation du temps restant pour les chunks
• **Interface utilisateur enrichie** : Indicateurs visuels clairs avec animations pour les états critiques
• **Suivi en temps réel** : Mise à jour toutes les 2 secondes de la taille pendant l'enregistrement

**Problème résolu** :
- ❌ Avant (v0.9.9) : L'utilisateur ne savait pas si son fichier approchait de la limite de 25 MB pendant l'enregistrement
- ✅ Après (v0.9.10) : L'utilisateur voit la taille en temps réel et est averti si le fichier approche de la limite

**Architecture** :
- Modification de `currentRecording` : Ajout de `currentSize` et `sizeWarningShown` pour le suivi en temps réel
- Modification de `setupMediaRecorderEvents()` : Suivi de la taille à chaque événement `dataavailable`
- Modification de `startNewRecording()` : Utilisation de `timeslice` (2000ms) pour émettre des événements réguliers
- Nouvelle méthode `updateRecordingSize()` : Met à jour la taille et avertit si nécessaire
- Nouvelle méthode `getRecordingSize()` : Obtient la taille actuelle en MB
- Modification de `ai-recording-view.ts` : Ajout de `sizeDisplay` et méthode `updateSizeDisplay()`
- Amélioration de l'affichage de progression : Barre de progression, pourcentage et estimation du temps restant
- Nouveaux styles CSS : Indicateurs de taille avec codes couleur (normal, warning, danger)

**Fonctionnement** :
1. **Pendant l'enregistrement** : MediaRecorder émet des événements `dataavailable` toutes les 2 secondes
2. **Suivi de la taille** : Chaque événement met à jour `currentSize` et appelle `updateRecordingSize()`
3. **Affichage en temps réel** : L'indicateur de taille est mis à jour avec codes couleur :
   - Normal (< 20 MB) : Indicateur bleu avec icône 📊
   - Warning (≥ 20 MB) : Indicateur jaune avec avertissement
   - Danger (≥ 25 MB) : Indicateur rouge avec animation pulse
4. **Avertissements** : Notification automatique à 20 MB et à 25 MB (une seule fois par seuil)
5. **Progression des chunks** : Barre de progression, pourcentage et estimation du temps restant

**Bénéfices** :
- ✅ **Transparence** : L'utilisateur voit la taille en temps réel pendant l'enregistrement
- ✅ **Prévention** : Avertissement précoce si le fichier approche de la limite
- ✅ **Expérience utilisateur** : Interface claire avec codes couleur et animations
- ✅ **Progression visuelle** : Barre de progression et estimation du temps pour les chunks
- ✅ **Rassurance** : L'utilisateur sait que le découpage automatique sera activé si nécessaire

**Codes couleur** :
- 🔵 **Normal** (< 20 MB) : Indicateur bleu discret
- 🟡 **Warning** (≥ 20 MB) : Indicateur jaune avec bordure
- 🔴 **Danger** (≥ 25 MB) : Indicateur rouge avec animation pulse

**Améliorations futures** :
- Compression audio optimisée pour réduire la taille sans perte de qualité significative
- Estimation plus précise du temps restant basée sur l'historique des transcriptions
- Option pour ajuster le seuil d'avertissement (par défaut 20 MB)

## Version 0.9.9 - Transcription Multi-Chunks et Combinaison
**Date :** 16 Octobre 2025

• **Transcription multi-chunks** : Chaque chunk est transcrit individuellement et séquentiellement
• **Combinaison automatique** : Les transcriptions sont combinées dans l'ordre chronologique pour créer une transcription complète
• **Progression visuelle** : Affichage de la progression (chunk X/Y) dans l'interface utilisateur
• **Gestion des erreurs avec retry** : Chaque chunk bénéficie de 3 tentatives de transcription en cas d'erreur
• **Ordre chronologique garanti** : Les chunks sont transcrits séquentiellement pour maintenir l'ordre temporel
• **Transcription fluide** : Les transcriptions sont combinées avec des espaces pour une lecture fluide
• **Nettoyage automatique** : Les chunks temporaires sont nettoyés après transcription réussie

**Problème résolu** :
- ❌ Avant (v0.9.8) : Les chunks étaient créés mais pas encore transcrits (TODO)
- ✅ Après (v0.9.9) : Les chunks sont transcrits individuellement et combinés automatiquement

**Architecture** :
- Nouvelle méthode `transcribeChunks()` : Transcrit chaque chunk séquentiellement avec progression
- Nouvelle méthode `combineTranscriptions()` : Combine les transcriptions dans l'ordre chronologique
- Modification de `processRecording()` : Détecte les chunks et utilise `transcribeChunks()` au lieu de la transcription simple
- Modification de `ai-recording-view.ts` : Affichage de la progression (chunk X/Y) dans le statut de la carte
- Statut dynamique : Le statut `processing_chunk_X_Y` permet d'afficher la progression en temps réel
- Retry automatique : Chaque chunk bénéficie de 3 tentatives avec backoff exponentiel en cas d'erreur

**Fonctionnement** :
1. Détection des chunks (v0.9.8) : Si des chunks existent, la transcription multi-chunks est lancée
2. Transcription séquentielle : Chaque chunk est transcrit un par un pour maintenir l'ordre chronologique
3. Progression en temps réel : Le statut est mis à jour pour chaque chunk (chunk X/Y)
4. Retry automatique : En cas d'erreur, le chunk est retranscrit jusqu'à 3 fois
5. Combinaison : Les transcriptions sont triées et combinées dans l'ordre chronologique
6. Sauvegarde : La transcription combinée est sauvegardée comme une transcription normale
7. Nettoyage : Les chunks temporaires sont nettoyés après transcription réussie

**Bénéfices** :
- ✅ Transcription complète des fichiers volumineux (> 25 MB)
- ✅ Progression visuelle claire pour l'utilisateur
- ✅ Robustesse avec retry automatique
- ✅ Transcription fluide et cohérente malgré les coupures
- ✅ Ordre chronologique garanti
- ✅ Aucune perte de texte entre les chunks

**Limitations connues** :
- ⚠️ La transcription séquentielle peut prendre du temps pour les fichiers avec beaucoup de chunks
- ⚠️ Les erreurs de transcription d'un chunk bloquent temporairement la progression (avec retry)
- ⚠️ La combinaison des transcriptions est simple (espaces) et peut nécessiter des ajustements manuels

**Améliorations futures (v0.9.10)** :
- Interface utilisateur améliorée avec progression visuelle plus détaillée
- Détection précoce de la taille du fichier pendant l'enregistrement
- Compression audio optimisée pour réduire la taille sans perte de qualité

## Version 0.9.8 - Découpage Automatique des Fichiers Audio Volumineux
**Date :** 16 Octobre 2025

• **Découpage automatique** : Les fichiers audio > 25 MB sont automatiquement découpés en chunks de moins de 25 MB
• **Détection automatique** : Détection de la taille du fichier après l'enregistrement et découpage si nécessaire
• **Chunks temporaires** : Les chunks sont sauvegardés temporairement pour transcription, puis nettoyés automatiquement
• **Fichier original préservé** : Le fichier audio original complet est toujours sauvegardé pour référence
• **Gestion des erreurs** : Gestion complète des erreurs de découpage avec messages clairs
• **Nettoyage automatique** : Les chunks temporaires sont nettoyés après transcription (succès ou erreur)
• **Architecture préparée** : Structure prête pour la transcription multi-chunks (v0.9.9)

**Problème résolu** :
- ❌ Avant : Les fichiers audio > 25 MB ne pouvaient pas être transcrits (erreur API)
- ✅ Après : Les fichiers volumineux sont automatiquement découpés en chunks transcribables

**Architecture** :
- Nouvelle méthode `chunkAudioIfNeeded()` : Détecte et découpe les fichiers volumineux
- Nouvelle méthode `splitAudioIntoChunks()` : Découpe un fichier audio en chunks valides
- Nouvelle méthode `extractAudioSegment()` : Extrait un segment temporel d'un AudioBuffer
- Nouvelle méthode `encodeAudioToWebM()` : Encode un AudioBuffer en WebM via MediaRecorder
- Nouvelle méthode `cleanupChunks()` : Nettoie les chunks temporaires après traitement
- Modification de `saveRecording()` : Sauvegarde le fichier original + chunks temporaires
- Modification de `RecordingMetadata` : Ajout du champ `audioChunks` pour stocker les chemins
- Modification de `processRecording()` : Détecte les chunks et prépare la transcription multi-chunks (v0.9.9)

**Limitations connues (v0.9.8)** :
- ⚠️ L'encodage via MediaRecorder nécessite que l'audio soit "joué", ce qui peut être lent pour les longs fichiers
- ⚠️ La transcription multi-chunks sera implémentée dans v0.9.9 (pour l'instant, détection uniquement)
- ⚠️ Les fichiers très volumineux (> 50 MB) peuvent prendre du temps à découper

**Améliorations futures (v0.9.9)** :
- Transcription séquentielle de chaque chunk
- Combinaison automatique des transcriptions dans l'ordre chronologique
- Progression visuelle (chunk X/Y) dans l'interface

**Bénéfices** :
- ✅ Plus d'erreur "fichier trop volumineux"
- ✅ Découpage automatique sans intervention utilisateur
- ✅ Nettoyage automatique des fichiers temporaires
- ✅ Structure prête pour la transcription multi-chunks

## Version 0.9.7 - Simplification de l'Organisation des Fichiers
**Date :** 16 Octobre 2025

• **2 fichiers seulement** : Organisation ultra-simplifiée avec un fichier .md et un fichier audio
• **Fichier .md unique** : `Titre IA - YYYY-MM-DD HH-MM-SS.md` contenant tout (lien audio + résumé + transcription)
• **Fichier audio renommé** : `Audio - Titre IA - YYYY-MM-DD HH-MM-SS.webm` avec nom descriptif
• **Plus d'onglets** : L'affichage des cartes montre directement le contenu du fichier
• **Bouton "Ouvrir dans Obsidian"** : Pour consulter le fichier complet dans l'éditeur Obsidian
• **Mise à jour automatique des liens** : Le lien audio dans le fichier .md est automatiquement mis à jour après renommage

**Structure des fichiers avant (v0.9.6)** :
```
AI Recordings/2025-10-16/
├── Recording_2025-10-16_14-30-00.webm (audio)
├── Reunion Projet - 2025-10-16 14-30-00.md (transcription)
├── Reunion Projet - 2025-10-16 14-30-00_summary.md (résumé)
└── Reunion Projet - 2025-10-16 14-30-00_combined.md (note combinée)
```

**Structure des fichiers après (v0.9.7)** :
```
AI Recordings/2025-10-16/
├── Audio - Reunion Projet - 2025-10-16 14-30-00.webm ✨
└── Reunion Projet - 2025-10-16 14-30-00.md ✨ (fichier unique avec tout)
```

**Architecture** :
- Refactorisation de `saveTranscription()` : Crée directement le fichier .md unique et complet
- Refactorisation de `saveSummary()` : Met à jour le fichier .md existant au lieu de créer un fichier séparé
- Refactorisation de `renameRecordingFiles()` : Renomme aussi le fichier audio + met à jour les liens
- Nouvelle méthode `updateAudioLinkInFile()` : Met à jour le lien audio dans le fichier .md
- Nouvelle méthode `loadCombinedFileContent()` : Charge et affiche le contenu du fichier unique
- Nouvelle méthode `openFileInObsidian()` : Ouvre le fichier directement dans Obsidian
- Suppression des onglets dans l'interface (plus besoin avec un seul fichier)
- Suppression des méthodes obsolètes : `loadTranscriptContent()`, `loadSummaryContent()`, `openInNewNote()`

**Bénéfices** :
- 🎯 **Simplicité** : 4 fichiers → 2 fichiers (réduction de 50%)
- 📁 **Organisation claire** : Plus de confusion entre transcription/résumé/note combinée
- 🔍 **Recherche facilitée** : Un seul fichier à chercher pour tout le contenu
- 📝 **Édition facile** : Tout le contenu est dans un seul fichier Obsidian
- 🚀 **Performance** : Moins de fichiers à gérer et à renommer
- ⚡ **Maintenance** : Code plus simple et moins de méthodes

## Version 0.9.6 - Renommage Automatique des Notes avec Titre AI
**Date :** 16 Octobre 2025

• **Renommage automatique des fichiers** : Les fichiers .md sont automatiquement renommés avec le titre AI généré + date/heure
• **Organisation améliorée** : Fini les noms peu lisibles (Recording_2025-10-16_14-30-00.md), place aux noms descriptifs (Reunion Projet - 2025-10-16 14-30-00.md)
• **Renommage complet** : Transcription, résumé et note combinée sont renommés avec le titre AI comme base
• **Fichier audio préservé** : Le fichier audio garde son nom technique pour éviter les problèmes de liens
• **Index mis à jour** : Tous les chemins sont automatiquement mis à jour dans l'index
• **Notification utilisateur** : Message de confirmation après le renommage réussi

**Structure des fichiers avant (v0.9.5)** :
```
AI Recordings/2025-10-16/
├── Recording_2025-10-16_14-30-00.webm (audio)
├── Recording_2025-10-16_14-30-00.md (transcription)
├── Recording_2025-10-16_14-30-00_summary.md (résumé)
└── Recording_2025-10-16_14-30-00_combined.md (note combinée)
```

**Structure des fichiers après (v0.9.6)** :
```
AI Recordings/2025-10-16/
├── Recording_2025-10-16_14-30-00.webm (audio - nom préservé)
├── Reunion Projet - 2025-10-16 14-30-00.md (transcription renommée)
├── Reunion Projet - 2025-10-16 14-30-00_summary.md (résumé renommé)
└── Reunion Projet - 2025-10-16 14-30-00_combined.md (note combinée renommée)
```

**Architecture** :
- Nouvelle méthode `renameRecordingFiles(recordingId, aiTitle)` : Gère le renommage de tous les fichiers
- Nouvelle méthode `sanitizeFilename(filename)` : Nettoie le titre pour utilisation comme nom de fichier
- Nouvelle méthode `renameFile(oldPath, newPath)` : Renomme un fichier via l'API Obsidian
- Intégration dans `generateAITitle()` : Le renommage se fait automatiquement après génération du titre
- Mise à jour automatique de `RecordingMetadata` avec les nouveaux chemins
- Utilisation de `app.fileManager.renameFile()` pour un renommage sûr avec gestion des liens

**Sécurité** :
- Suppression des caractères invalides dans les noms de fichiers (<>:"/\\|?*)
- Vérification de l'existence des fichiers avant renommage
- Éviter les doublons (ne renomme pas si le nouveau nom existe déjà)
- Gestion d'erreurs complète avec logs détaillés

**Bénéfices** :
- Meilleure lisibilité dans l'explorateur de fichiers Obsidian
- Navigation plus intuitive avec des noms descriptifs
- Organisation professionnelle du vault
- Recherche facilitée par des noms significatifs

## Version 0.9.5 - Découplage Contrôles et Traitement des Cartes
**Date :** 16 Octobre 2025

• **Libération immédiate des contrôles** : Les contrôles retournent à IDLE dès qu'un enregistrement est terminé
• **Traitement asynchrone en arrière-plan** : La transcription et le résumé s'effectuent sans bloquer l'interface
• **File de traitement décentralisée** : Chaque enregistrement gère son propre traitement indépendamment
• **Traitements simultanés** : Possibilité de créer plusieurs enregistrements pendant que d'autres sont en cours de traitement
• **Statuts visuels par carte** : Chaque carte affiche son propre statut de traitement (⏳ En cours, ✓ Terminé, ❌ Erreur)
• **Animation de pulsation** : Le badge "En traitement" a une animation visuelle pour indiquer l'activité
• **Suppression des états bloquants** : Les états UPLOADING, TRANSCRIBING, SUMMARIZING ne bloquent plus les contrôles
• **Amélioration UX majeure** : Pas besoin d'attendre la fin du traitement pour démarrer un nouvel enregistrement

**Comportement avant (v0.9.4 et antérieures)** :
- 🚫 Les contrôles restaient bloqués pendant toute la durée du traitement
- 🚫 Impossible de créer un nouvel enregistrement pendant la transcription/résumé
- 🚫 Le statut de traitement était affiché dans la zone de contrôle
- 🚫 Un seul enregistrement pouvait être traité à la fois

**Comportement après (v0.9.5)** :
- ✅ Les contrôles se libèrent immédiatement après avoir terminé un enregistrement
- ✅ Possibilité de lancer plusieurs enregistrements consécutifs sans attendre
- ✅ Chaque carte affiche son propre statut de traitement
- ✅ Plusieurs enregistrements peuvent être traités en parallèle
- ✅ Les erreurs d'un enregistrement n'impactent pas les autres

**Architecture** :
- Nouvelle méthode `processRecording()` : Gère le traitement asynchrone complet (transcription + résumé)
- Refactorisation de `finishRecording()` : Retourne immédiatement à IDLE et lance le traitement en arrière-plan
- Refactorisation de `transcribeRecording()` : Utilise le statut de la carte au lieu de l'état global
- Refactorisation de `generateSummary()` : Utilise le statut de la carte au lieu de l'état global
- Suppression de `createProcessingButtons()` et `updateTranscriptionStatus()` : Plus nécessaires
- Amélioration de l'affichage des badges de statut avec 4 états visuels différents
- Animation CSS de pulsation pour le statut "En traitement"

**Nouveaux états visuels des cartes** :
- ⏸️ En attente (gris) : L'enregistrement n'a pas encore été traité
- ⏳ Traitement en cours... (orange, animé) : Transcription/résumé en cours
- ✓ Terminé (vert) : Traitement terminé avec succès
- ❌ Erreur (rouge) : Erreur durant le traitement

**Impact technique** :
- Chaque `processRecording()` s'exécute dans sa propre Promise
- File de traitement implicite via promises asynchrones
- Pas de limite sur le nombre de traitements simultanés (peut être ajouté plus tard si nécessaire)
- Meilleure gestion des erreurs avec isolation par enregistrement

**Documentation** :
- Nouveau fichier `TEST_DECOUPLING.md` avec guide de test complet
- 6 tests détaillés pour valider le découplage
- Documentation du changement d'architecture

## Version 0.9.4 - Ouverture Automatique de la Sidebar
**Date :** 14 Octobre 2025

• **Ouverture automatique** : Le clic sur l'icône microphone ouvre automatiquement la sidebar au lieu de la basculer
• **Révélation intelligente** : Si la sidebar existe déjà, elle est révélée/activée plutôt que fermée
• **Expérience optimisée** : Accès plus rapide et intuitif aux contrôles d'enregistrement
• **Comportement cohérent** : La sidebar reste accessible à tout moment via l'icône microphone

**Changement de comportement** :
- Avant : Clic sur microphone = Toggle (ouvre/ferme alternativement)
- Après : Clic sur microphone = Ouvre toujours (ou révèle si déjà ouverte)

**Architecture** :
- Modification de la méthode `toggleSidebar()` dans main.ts
- Utilisation de `workspace.getLeavesOfType()` pour détecter les sidebars existantes
- Utilisation de `workspace.revealLeaf()` pour révéler une sidebar déjà ouverte

## Version 0.9.3 - Titres AI et Interface Améliorée
**Date :** 14 Octobre 2025

• **Titres AI générés** : Génération automatique d'un titre en 3 mots à partir de la transcription via GPT-4o-mini
• **Format de titre optimisé** : "Titre AI (3 mots) - MM:SS" avec la durée de l'enregistrement
• **Header simplifié** : Titre en primaire (plus grand, 16px), date + durée en secondaire avec séparateur "•"
• **Statut de processing dans les cartes** : Le badge "⏳ En traitement..." s'affiche dans la carte individuelle
• **Mise en page améliorée** : Header vertical avec meilleure hiérarchie visuelle

**Exemple de titre généré** :
- Avant : `Enregistrement 2025-10-14 10:30:00`
- Après : `Réunion Projet - 5:23` (titre AI contextuel + durée)

**Flux de génération du titre** :
1. Transcription complétée
2. Résumé généré
3. Titre AI généré (3 mots via GPT-4o-mini)
4. Format final : `[Titre AI] - [Durée]`

**Architecture** :
- Nouvelle fonction `generateShortTitle()` dans summary-service.ts
- Nouvelle fonction `generateAITitle()` dans main.ts
- Header redesigné avec structure verticale
- Styles CSS améliorés pour la hiérarchie visuelle

## Version 0.9.2 - Lecteur Audio Intégré
**Date :** 14 Octobre 2025

• **Lecteur audio embed** : La note combinée affiche maintenant un lecteur audio intégré avec `![[fichier.webm]]`
• **Section Audio dédiée** : Nouvelle section "🎵 Audio" avec le player intégré
• **Expérience améliorée** : Écoute directe depuis la note sans ouvrir le fichier audio séparément
• **Format optimisé** : Meilleure organisation visuelle de la note combinée

**Avant** :
```markdown
**Fichier audio:** [[Recording_....webm]]  (lien simple)
```

**Après** :
```markdown
## 🎵 Audio
![[Recording_....webm]]  (lecteur intégré)
```

**Avantage** : La note devient vraiment "tout-en-un" avec le lecteur audio directement accessible.

## Version 0.9.1 - Organisation Unifiée des Fichiers
**Date :** 14 Octobre 2025

• **Centralisation des fichiers** : La note exportée est maintenant créée dans le dossier AI Recordings/[DATE]/ au lieu de la racine du vault
• **Nom cohérent** : Format `Recording_YYYY-MM-DD_HH-MM-SS_combined.md` pour la note exportée
• **Organisation améliorée** : Tous les fichiers d'un enregistrement regroupés au même endroit

**Structure finale par enregistrement** :
```
AI Recordings/2025-10-14/
├── Recording_2025-10-14_10-30-00.webm (audio)
├── Recording_2025-10-14_10-30-00.md (transcription)
├── Recording_2025-10-14_10-30-00_summary.md (résumé)
└── Recording_2025-10-14_10-30-00_combined.md (note exportée) ← NOUVEAU
```

**Avantages** :
- Tout est centralisé dans un seul dossier par date
- Facilite la navigation et l'organisation
- Les liens relatifs fonctionnent mieux
- Cohérence dans la structure des fichiers

## Version 0.9.0 - Fonctionnalités Avancées
**Date :** 14 Octobre 2025

• **Export combiné amélioré** : Création de notes complètes avec transcript + résumé chargés depuis les fichiers
• **Bouton de retranscription** : Possibilité de lancer la transcription sur d'anciens enregistrements sans transcription
• **Raccourcis clavier configurables** : 4 commandes enregistrées (toggle sidebar, start, stop, pause/resume)
• **Confirmation d'écrasement** : Demande de confirmation avant d'écraser une note existante lors de l'export
• **Lien vers fichier audio** : Les notes exportées incluent un lien Obsidian vers le fichier audio source
• **Amélioration UX** : Interface plus complète avec emojis et meilleure organisation

**Raccourcis clavier ajoutés** :
- `Ouvrir/Fermer la sidebar AI Recording` - Basculer l'affichage de la sidebar
- `Démarrer un enregistrement` - Lancer un nouveau enregistrement
- `Terminer l'enregistrement en cours` - Finaliser et sauvegarder
- `Pause/Reprendre l'enregistrement` - Toggle pause pendant l'enregistrement

**Format de note exportée** :
```markdown
# [Titre]
**Date:** ...
**Durée:** ...
**Fichier audio:** [[lien]]

## 📝 Résumé
[contenu du résumé]

## 📄 Transcription Complète
[contenu de la transcription]
```

**Architecture** :
- Nouvelle fonction `registerCommands()` dans main.ts
- Fonction `openInNewNote()` complètement réécrite pour charger les vrais contenus
- Bouton conditionnel de retranscription dans les cartes d'historique
- Gestion améliorée des fichiers existants

## Version 0.8.1 - Fix Transition État DELETED → IDLE
**Date :** 14 Octobre 2025

• **Fix critique** : Correction de la transition automatique de l'état DELETED vers IDLE après suppression d'un enregistrement
• **Problème résolu** : Lorsqu'un enregistrement en cours était supprimé via "Stop & Supprimer", l'interface restait bloquée sur l'état DELETED sans bouton d'action disponible
• **Solution** : Ajout d'une transition automatique vers IDLE après 500ms, permettant de démarrer immédiatement un nouvel enregistrement
• **Impact** : Amélioration de l'expérience utilisateur en évitant le blocage de l'interface

## Version 0.8.0 - Intégration Résumé IA avec OpenAI GPT
**Date :** 14 Octobre 2025

• **Service de résumé OpenAI GPT** : Intégration complète pour générer des résumés à partir des transcriptions
• **Nouvel état SUMMARIZING** : Affichage visuel distinct pendant la génération du résumé (cyan)
• **Système de variables dans templates** : Remplacement automatique de {{transcript}}, {{language}}, {{datetime}}, {{duration}}, {{title}}, {{date}}
• **Flux automatique complet** : Enregistrement → Transcription → Résumé (si configuré)
• **Sauvegarde en fichiers _summary.md** : Création de fichiers de résumé avec métadonnées
• **Affichage dynamique** : Chargement et affichage des résumés dans l'onglet Summary
• **Configuration de longueur** : Court (1-2 paragraphes), Moyen (3-5), Long (détaillé)
• **Gestion d'erreurs robuste** : Système de retry avec 3 tentatives pour le résumé
• **Templates personnalisables** : Template de prompt éditable dans les paramètres (déjà présent depuis 0.6)

**Architecture** :
- Nouveau fichier `summary-service.ts` avec la classe `SummaryService`
- Méthode `generateSummary()` dans le plugin principal
- Fonction `saveSummary()` pour créer les fichiers _summary.md
- État étendu : `RecordingState` inclut maintenant SUMMARIZING
- Fonction `replaceVariables()` pour le système de templates
- Interface mise à jour avec zone de statut pour le résumé

**Fichiers de résumé** :
- Format : `Recording_YYYY-MM-DD_HH-MM-SS_summary.md`
- Structure : Header + Métadonnées + Séparateur + Texte du résumé
- Sauvegarde dans le même dossier que l'audio et la transcription
- Index mis à jour avec le champ `summaryFile`

**Flux complet** :
1. Enregistrement audio → FINISHED
2. Upload et transcription → UPLOADING → TRANSCRIBING
3. Génération résumé → SUMMARIZING
4. Retour → IDLE
5. Fichiers créés : .webm (audio) + .md (transcription) + _summary.md (résumé)

## Version 0.7.0 - Intégration Transcription OpenAI Whisper
**Date :** 14 Octobre 2025

• **Service de transcription OpenAI Whisper** : Intégration complète de l'API Whisper pour la transcription automatique
• **Nouveaux états de traitement** : UPLOADING et TRANSCRIBING avec affichage visuel distinct
• **Gestion d'erreurs robuste** : Système de retry avec 3 tentatives automatiques en cas d'échec
• **Upload sécurisé** : Validation de la taille des fichiers (25 MB max) et gestion FormData
• **Transcription automatique** : Déclenchement automatique après la fin d'un enregistrement si OpenAI configuré
• **Sauvegarde en fichiers .md** : Création de fichiers de transcription avec métadonnées (date, durée, langue détectée)
• **Affichage dynamique** : Chargement et affichage des transcriptions dans l'onglet Transcript des cartes
• **Statut de progression** : Messages en temps réel du processus de transcription
• **Support multilingue** : Auto-détection ou choix manuel de la langue
• **Format verbose_json** : Récupération de la langue détectée et de la durée

**Architecture** :
- Nouveau fichier `transcription-service.ts` avec la classe `TranscriptionService`
- Méthode `transcribeRecording()` dans le plugin principal
- Fonction `saveTranscription()` pour créer les fichiers .md
- États étendus : `RecordingState` inclut maintenant UPLOADING et TRANSCRIBING
- Interface mise à jour avec zone de statut de transcription
- Gestion des clés API OpenAI depuis les paramètres

**Fichiers de transcription** :
- Format : `Recording_YYYY-MM-DD_HH-MM-SS.md`
- Structure : Header + Métadonnées + Séparateur + Texte de transcription
- Sauvegarde dans le même dossier que l'audio
- Index mis à jour avec le champ `transcriptFile`

## Version 0.6.2 - Fix Chargement Historique et Reconstruction Auto de l'Index
**Date :** 14 Octobre 2025

• **Fix critique du chargement de l'index** : Utilisation de l'événement `onLayoutReady` pour charger l'index après que le vault soit complètement initialisé
• **Reconstruction automatique de l'index** : Si l'index est absent, le plugin reconstruit automatiquement à partir des fichiers audio existants
• **Suppression des enregistrements de test** : Plus de données de test dans l'historique
• **Fix de création de sidebar** : La sidebar ne se crée plus automatiquement au démarrage (évite les erreurs de null reference)
• **Affichage complet de l'historique** : Tous les enregistrements passés sont maintenant visibles dans l'historique
• **Logs de debug améliorés** : Meilleure traçabilité du chargement de l'index et de la reconstruction

**Problème résolu** : Le plugin chargeait l'index trop tôt, quand le vault Obsidian n'avait pas encore indexé les fichiers (0 fichiers détectés). L'index apparaissait vide même avec des enregistrements existants. Le plugin ajoutait aussi automatiquement 2 enregistrements de test.

**Architecture** :
- Utilisation de `app.workspace.onLayoutReady()` pour attendre que le vault soit prêt
- Nouvelle fonction `rebuildRecordingsIndex()` qui scanne les fichiers .webm et reconstruit l'index
- Suppression des fonctions de test : `addTestRecordings()`, `hasTestRecordings()`, `clearTestRecordings()`
- Création de sidebar uniquement à la demande (via bouton ribbon)

## Version 0.6.1 - (Non publiée - Développement)
**Date :** 14 Octobre 2025

## Version 0.6.0 - Paramètres Complets
**Date :** 10 Octobre 2025

• **Interface de paramètres complète** avec onglet dédié dans les paramètres Obsidian
• **Section Transcription** : Choix du provider (OpenAI/Local), modèle, langue, mode qualité/rapide
• **Section Résumé IA** : Provider (OpenAI/Anthropic/Local), modèles spécifiques, longueur configurable
• **Template de prompt éditable** avec variables dynamiques ({{transcript}}, {{language}}, {{datetime}}, etc.)
• **Section Export** : Format audio/transcript, organisation par date, découpage automatique
• **Paramètres divers** : Avertissement initial, suppression automatique, raccourcis clavier
• **Persistance complète** : Tous les paramètres sauvegardés et restaurés au redémarrage
• **Valeurs par défaut intelligentes** : Configuration optimale dès l'installation
• **Interface dynamique** : Les options changent selon le provider sélectionné
• **Gestion des clés API** : Champs sécurisés pour OpenAI et Anthropic
• **Slider interactifs** : Pour taille des segments et délai de suppression
• **Bouton de réinitialisation** : Pour restaurer le template par défaut

**Architecture** :
- Nouveau fichier `settings.ts` avec interface `AIRecordingSettings`
- Classe `AIRecordingSettingTab` pour l'interface utilisateur
- Intégration complète dans `main.ts` avec `loadSettings()` et `saveSettings()`
- Support multi-provider préparé pour futures intégrations

## Version 0.5.3 - Correction Bug Sauvegarde Enregistrements
**Date :** 10 Octobre 2025

• **FIX CRITIQUE:** Correction du bug de timing empêchant la sauvegarde des enregistrements
• Ajout d'une Promise pour attendre la création du blob audio avant sauvegarde
• L'événement onstop du MediaRecorder est maintenant correctement attendu
• Les enregistrements sont désormais sauvegardés et affichés dans l'historique
• Amélioration de la robustesse de la méthode finishRecording()
• Timeout de 100ms ajouté pour garantir la création complète du blob
• Synchronisation parfaite entre arrêt d'enregistrement et sauvegarde

**Contexte technique:** Le bug était causé par l'appel asynchrone de `mediaRecorder.stop()` qui ne créait pas immédiatement l'audioBlob, provoquant un retour prématuré dans `saveRecording()`.

## Version 0.5.2 - Rafraîchissement Temps Réel de l'Historique
**Date :** Octobre 2025

• Rafraîchissement automatique de l'historique après sauvegarde d'enregistrement
• Mise à jour en temps réel de l'interface lors de la fin d'enregistrement
• Synchronisation complète entre sauvegarde et affichage des cartes
• Nettoyage automatique des données de test quand de vrais enregistrements sont ajoutés
• Logs détaillés pour tracer le cycle complet d'enregistrement → affichage
• Méthode clearTestRecordings() pour gérer les données de test intelligemment
• Amélioration de updateSidebar() avec logs de diagnostic
• Correction du problème: les cartes s'ajoutent maintenant automatiquement à l'historique

## Version 0.5.1 - Correction Affichage des Cartes
**Date :** Octobre 2025

• Diagnostic complet des problèmes d'affichage des cartes
• Ajout de données de test automatiques pour tester l'affichage
• Bouton de debug pour diagnostiquer les problèmes en temps réel
• Logs détaillés pour tracer la création et l'affichage des cartes
• Correction des erreurs TypeScript (segments, formatDuration)
• Amélioration des styles CSS avec transitions et opacité
• Vérification de la logique d'expansion des cartes
• Tests automatiques avec enregistrements de test
• Interface de debug intégrée pour résoudre les problèmes

## Version 0.5.0 - Interface Historique et Cartes Avancées
**Date :** Octobre 2025

• Cartes collapsibles pour chaque enregistrement avec animations fluides
• Header complet avec titre auto (date+heure), durée et statut visuel
• Onglets Summary/Transcript fonctionnels avec navigation
• Boutons d'action: Copy (presse-papiers), Expand/Collapse, Delete
• Tri automatique du plus récent au plus ancien
• Animations d'état avec transitions CSS fluides
• Interface moderne avec hover states et feedback visuel
• Actions avancées: lecture audio, copie contenu, ouverture note
• Design responsive avec cartes expansibles
• Gestion complète des interactions utilisateur

## Version 0.4.0 - Sauvegarde et Organisation des Fichiers
**Date :** Octobre 2025

• Sauvegarde des fichiers audio dans le vault avec createBinary()
• Structure de données complète pour les métadonnées d'enregistrement
• Découpage automatique des fichiers lourds (limite 25MB)
• Organisation des fichiers par date (YYYY-MM-DD)
• Index des enregistrements avec persistence JSON
• Interface d'historique avec cartes d'enregistrement
• Actions sur les enregistrements (écouter, supprimer)
• Gestion complète du cycle de vie des fichiers

## Version 0.3.0 - Enregistrement Audio Fonctionnel
**Date :** Octobre 2025

• Gestion des permissions microphone avec vérification et demande d'accès
• Implémentation complète de MediaRecorder pour capturer l'audio
• Boutons Start/Stop/Pause/Resume fonctionnels avec MediaRecorder
• Timer d'enregistrement en temps réel avec gestion des pauses
• Gestion robuste des états et transitions d'enregistrement
• Gestion d'erreurs complète avec messages utilisateur
• Configuration audio optimisée (echoCancellation, noiseSuppression, autoGainControl)
• Support du format audio/webm avec codec opus

## Version 0.2.1 - Amélioration des Contrôles Sidebar
**Date :** 2 Octobre 2025

• Refactorisation de la logique d'états (IDLE/RECORDING/PAUSED/FINISHED/DELETED)
• Logique de boutons pause/resume intuitive
• Action "terminer" (positive) avec confirmation
• Action "stop + supprimer" (destructive) avec confirmation
• Timer en temps réel avec gestion des pauses
• Modales de confirmation pour les actions critiques
• Boutons contextuels selon l'état actuel

## Version 0.2.0 - Interface Sidebar de Base
**Date :** 2 Octobre 2025

• Bouton microphone ajouté dans le ribbon
• Sidebar qui s'ouvre/ferme avec vue personnalisée
• Zones de contrôle (supérieure) et historique (inférieure)
• Système d'états visuels (IDLE/RECORDING/PAUSED/PROCESSING/READY/ERROR)
• Design moderne shadcn-like avec styles CSS intégrés
• Boutons Start/Pause/Stop fonctionnels avec simulation

## Version 0.1.0 - Environnement de Développement Complet
**Date :** 2 Octobre 2025

• Structure du projet conforme aux standards Obsidian
• Configuration TypeScript et build system (esbuild)
• Plugin squelette de base avec message de chargement
• Script de versioning automatique
• Tests: npm install, npm run build fonctionnent
• Plugin se charge dans Obsidian sans erreur

