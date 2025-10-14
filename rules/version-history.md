# Historique des Versions

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

