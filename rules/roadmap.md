# Roadmap de Développement - AI Recording Plugin

## 🎯 Vue d'Ensemble
Roadmap équilibrée pour construire et tester le plugin Obsidian AI Recording, avec 10 étapes de valeur pour une progression efficace et contrôlée.

---

## 📋 Release 0.1 - Environnement de Développement Complet
**Objectif** : Mettre en place l'environnement de développement conforme aux standards Obsidian
**Description** : Créer la structure du projet, initialiser Git, configurer `package.json` avec dépendances et scripts, créer `tsconfig.json` et `esbuild.config.mjs`, créer `manifest.json` et `versions.json`, créer le plugin squelette de base avec message de chargement
**Tests** : Le projet se structure correctement, `npm install` et `npm run build` fonctionnent, le plugin se charge dans Obsidian sans erreur, le message de chargement apparaît dans la console

---

## 📋 Release 0.2 - Interface Sidebar de Base
**Objectif** : Créer la sidebar principale avec la structure de base et les zones de contrôle
**Description** : Ajouter le bouton microphone dans le ribbon, créer la sidebar qui s'ouvre/ferme, implémenter les zones de contrôle (supérieure) et historique (inférieure), créer le système d'états visuels (IDLE/RECORDING/etc.), implémenter un design moderne shadcn-like
**Tests** : Le bouton microphone apparaît dans le ribbon, la sidebar s'ouvre/ferme correctement, les deux zones sont visibles et bien structurées, les états sont affichés visuellement, le design est moderne et cohérent

---

## 📋 Release 0.2.1 - Amélioration des Contrôles Sidebar
**Objectif** : Améliorer la logique d'états et les contrôles de la sidebar pour une meilleure expérience utilisateur
**Description** : Refactoriser la logique d'états (IDLE/RECORDING/PAUSED/FINISHED/DELETED), implémenter une logique de boutons plus intuitive avec pause/resume, terminer l'enregistrement (action positive), et stop avec suppression (action destructive), ajouter des confirmations pour les actions destructives, améliorer les transitions d'états et les feedbacks visuels
**Tests** : Les états se comportent correctement selon la logique définie, les boutons pause/resume fonctionnent, l'action "terminer" marque l'enregistrement comme fini, l'action "stop + supprimer" détruit l'enregistrement avec confirmation, les transitions d'états sont fluides et cohérentes

---

## 📋 Release 0.3 - Enregistrement Audio Fonctionnel
**Objectif** : Implémenter l'enregistrement audio complet avec tous les contrôles
**Description** : Gérer les permissions microphone, implémenter MediaRecorder pour capturer l'audio, créer les boutons Start/Stop/Pause/Resume fonctionnels, ajouter le timer d'enregistrement en temps réel, gérer les états et transitions, implémenter la gestion d'erreurs robuste
**Tests** : Les permissions microphone sont demandées et gérées, l'enregistrement démarre/arrête correctement, les boutons Pause/Resume fonctionnent, le timer s'affiche et s'incrémente, les erreurs sont capturées et affichées clairement

---

## 📋 Release 0.4 - Sauvegarde et Organisation des Fichiers
**Objectif** : Sauvegarder les fichiers audio et créer la structure de données pour l'historique
**Description** : Sauvegarder les fichiers audio dans le vault avec `createBinary()`, créer la structure de données pour les métadonnées d'enregistrement, implémenter le découpage automatique des fichiers lourds, organiser les fichiers par date (YYYY-MM-DD), maintenir un index des enregistrements
**Tests** : Les fichiers audio sont sauvegardés dans le vault, les métadonnées sont stockées et persistantes, les fichiers lourds sont découpés automatiquement, l'organisation par date fonctionne, l'index reste cohérent

---

## 📋 Release 0.5 - Interface Historique et Cartes
**Objectif** : Créer l'interface d'historique avec les cartes d'enregistrement et leurs actions
**Description** : Créer des cartes collapsibles pour chaque enregistrement, implémenter le header avec titre auto (date+heure), durée et statut, créer les onglets Summary/Transcript, ajouter les boutons Copy/Expand/Collapse/Delete, implémenter le tri du plus récent au plus ancien, ajouter les animations d'état
**Tests** : Les cartes sont créées pour chaque enregistrement, le header affiche les bonnes informations, les onglets sont fonctionnels, les boutons d'action marchent, le tri est correct, les animations sont fluides

---

## 📋 Release 0.6 - Paramètres Complets
**Objectif** : Créer l'interface de paramètres complète avec toutes les options
**Description** : Créer l'onglet de paramètres dans Obsidian, organiser en sections (Transcription, Résumé, Export, Divers), implémenter tous les paramètres (providers, modèles, langues, modes, templates), gérer la persistance des paramètres, implémenter les paramètres par défaut
**Tests** : L'onglet de paramètres est accessible, toutes les sections sont organisées, tous les paramètres sont configurables, la persistance fonctionne au redémarrage, les paramètres par défaut sont appliqués

---

## 📋 Release 0.7 - Intégration Transcription OpenAI
**Objectif** : Intégrer complètement la transcription avec OpenAI Whisper API
**Description** : Implémenter l'authentification et la gestion sécurisée des clés API, créer la fonction d'upload des fichiers audio avec FormData, gérer les états UPLOADING/TRANSCRIBING, afficher la transcription dans l'onglet Transcript, implémenter la gestion d'erreurs avec retry, sauvegarder la transcription avec l'enregistrement
**Tests** : L'authentification fonctionne, l'upload marche avec différents formats, les états sont affichés correctement, la transcription s'affiche dans l'onglet, les erreurs sont gérées avec retry, la transcription est sauvegardée

---

## 📋 Release 0.8 - Intégration Résumé IA
**Objectif** : Implémenter la génération de résumés IA à partir des transcriptions
**Description** : Intégrer le provider de résumé (OpenAI GPT), implémenter le système de variables dans les templates, générer le résumé avec la longueur configurée, gérer l'état SUMMARIZING, afficher le résumé dans l'onglet Summary, sauvegarder le résumé avec l'enregistrement
**Tests** : L'intégration GPT fonctionne, les variables sont remplacées dans les templates, les résumés respectent la longueur demandée, l'état SUMMARIZING est affiché, le résumé s'affiche correctement, le résumé est sauvegardé

---

## 📋 Release 0.9 - Fonctionnalités Avancées
**Objectif** : Ajouter les fonctionnalités avancées et optimisations
**Description** : Implémenter les raccourcis clavier configurables, créer l'export combiné (note unique avec transcript + résumé), implémenter la copie presse-papiers pour transcript/résumé, ajouter l'option de suppression automatique, créer l'architecture multi-provider, optimiser les performances et la gestion mémoire
**Tests** : Les raccourcis clavier fonctionnent, l'export combiné crée une note complète, la copie presse-papiers marche, la suppression automatique est configurable, l'architecture multi-provider fonctionne, les performances sont optimisées


## 📋 Release 0.9.1 - Organisation Unifiée des Fichiers
**Objectif** : Centraliser tous les fichiers d'un enregistrement dans le même dossier AI Recordings/[DATE]/
**Description** : Modifier l'export combiné pour créer la note dans AI Recordings/[DATE]/ au lieu de la racine du vault, avec un nom cohérent (Recording_..._combined.md). Tous les fichiers d'un enregistrement (audio, transcription, résumé, note combinée) sont ainsi regroupés au même endroit.
**Tests** : La note exportée est créée dans AI Recordings/[DATE]/, le nom suit le pattern Recording_..._combined.md, le lien audio fonctionne, tout est bien organisé dans le même dossier

## 📋 Release 0.9.2 - Lecteur Audio Intégré
**Objectif** : Intégrer un lecteur audio directement dans la note combinée
**Description** : Remplacer le simple lien `[[fichier.webm]]` par un embed `![[fichier.webm]]` pour afficher un lecteur audio intégré. Ajouter une section "🎵 Audio" dédiée avec le player. L'utilisateur peut écouter l'enregistrement directement depuis la note sans ouvrir le fichier séparément.
**Tests** : Le lecteur audio s'affiche dans la note combinée, le player fonctionne (play/pause/timeline), l'audio est lisible directement depuis la note, la section Audio est bien visible avec emoji

---

## 📋 Release 0.9.3 - Improve card display
- Improve Recording card : I would like a 3 words AI generated Name for the 
note to be the title of the card
- Improve Recording card : only keep in the header the title of the card as 
primary information and the date of recording + the lenght of recording as 
secondary information
- Improve the Processing status : it should appear not in the Zone de 
contrôle but in the Card within the Zone historique with the list of 
recordings
- Improve the saving of the Recording on Notion so that the Title of the recording is : Recording title (AI generated in 3 words) - {duration of the recording}

## 📋 Release 0.9.4 - Ouverture Automatique de la Sidebar
**Objectif** : Améliorer l'expérience utilisateur en ouvrant automatiquement la sidebar au clic sur l'icône microphone
**Description** : Implémenter l'ouverture automatique de la sidebar droite lors du clic sur l'icône microphone dans la barre de navigation gauche (ribbon). Si la sidebar est déjà ouverte, le clic la révèle/active. Cette fonctionnalité permet un accès plus rapide et intuitif aux contrôles d'enregistrement.
**Tests** : Le clic sur l'icône microphone ouvre la sidebar si elle est fermée, la sidebar s'active/se révèle si elle est déjà ouverte, le comportement est cohérent et fluide, aucune régression sur les autres fonctionnalités ribbon