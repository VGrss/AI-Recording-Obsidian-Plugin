# Règles du Projet AI Recording Obsidian Plugin

## 📋 Règles Générales

### Langue et Communication
- **Langue principale** : Français (documentation, commentaires, interface utilisateur)
- **Code** : Anglais pour les noms de variables, fonctions et classes
- **Commits Git** : Français pour les messages de commit

### Structure du Code
- **Indentation** : 1 tabulation (pas d'espaces)
- **Encodage** : UTF-8
- **Fin de ligne** : LF (Unix)
- **Longueur de ligne** : Maximum 120 caractères

## 🎯 Règles de Développement

### TypeScript
- Utiliser des types explicites pour tous les paramètres de fonction
- Éviter `any` sauf pour les APIs externes (Obsidian)
- Préférer les interfaces aux types pour les objets complexes
- Utiliser `async/await` plutôt que les Promises avec `.then()`

### Obsidian Plugin API
- Toujours vérifier la disponibilité des APIs avant utilisation
- Gérer les erreurs avec des `try/catch` appropriés
- Utiliser les notifications `Notice` pour informer l'utilisateur
- Respecter les conventions de nommage d'Obsidian

### Gestion des Erreurs
- Toujours capturer les erreurs d'enregistrement audio
- Vérifier la validité de la clé API avant les appels
- Fournir des messages d'erreur explicites en français
- Logger les erreurs pour le débogage

## 🔒 Règles de Sécurité

### Clés API
- **JAMAIS** commiter de clés API dans le code
- Stocker les clés dans les paramètres du plugin uniquement
- Valider le format des clés API avant utilisation
- Informer l'utilisateur sur la sécurité des données

### Données Audio
- Demander explicitement l'autorisation microphone
- Informer l'utilisateur sur l'utilisation des données
- Permettre la suppression des fichiers audio
- Respecter la vie privée de l'utilisateur

## 📁 Règles de Structure

### Fichiers
- **main.ts** : Code principal du plugin uniquement
- **manifest.json** : Configuration du plugin
- **package.json** : Dépendances et scripts
- **README.md** : Documentation utilisateur
- **RULES.md** : Ce fichier de règles

### Organisation du Code
- Classes principales en haut du fichier
- Interfaces et types après les imports
- Méthodes publiques avant les méthodes privées
- Configuration des paramètres à la fin

## 🧪 Règles de Test

### Tests Manuels
- Tester l'enregistrement sur différents navigateurs
- Vérifier la transcription avec différents accents
- Tester la sauvegarde des fichiers
- Valider l'interface de paramètres

### Tests Automatisés
- Vérifier la compilation TypeScript
- Tester le build de production
- Valider la structure des fichiers

## 🚀 Règles de Déploiement

### Versioning
- Utiliser le versioning sémantique (SemVer)
- Incrémenter le numéro de version dans `manifest.json` et `package.json`
- Documenter les changements dans le README

### Build
- Toujours tester le build avant commit
- Vérifier que `main.js` est généré correctement
- S'assurer que les fichiers sont dans `.gitignore`

## 📝 Règles de Documentation

### Code
- Commenter les fonctions complexes
- Expliquer les algorithmes non évidents
- Documenter les APIs externes utilisées
- Maintenir la cohérence des commentaires

### README
- Mettre à jour les instructions d'installation
- Documenter les nouvelles fonctionnalités
- Maintenir la liste des prérequis
- Inclure des exemples d'utilisation

## 🔄 Règles de Maintenance

### Code Legacy
- Refactoriser le code ancien progressivement
- Maintenir la compatibilité avec les versions précédentes
- Documenter les changements breaking

### Dépendances
- Mettre à jour les dépendances régulièrement
- Vérifier la compatibilité avec Obsidian
- Tester après chaque mise à jour majeure

## 🎨 Règles d'Interface

### UX/UI
- Messages d'erreur clairs et constructifs
- Indicateurs visuels pour l'état d'enregistrement
- Interface de paramètres intuitive
- Feedback utilisateur immédiat

### Accessibilité
- Support des lecteurs d'écran
- Contraste suffisant des couleurs
- Navigation au clavier
- Textes alternatifs pour les icônes

## 📊 Règles de Performance

### Optimisation
- Minimiser l'utilisation mémoire
- Optimiser les appels API
- Gérer les fichiers audio efficacement
- Éviter les fuites mémoire

### Monitoring
- Surveiller les performances d'enregistrement
- Optimiser les temps de transcription
- Gérer les erreurs réseau gracieusement

---

*Dernière mise à jour : Janvier 2025*
*Version : 1.0.0*
