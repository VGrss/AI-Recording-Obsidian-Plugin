# Historique des Versions

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

