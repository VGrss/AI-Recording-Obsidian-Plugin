# Historique des Versions

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

