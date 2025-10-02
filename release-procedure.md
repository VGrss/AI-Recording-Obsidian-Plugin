# Procédure de Release - AI Recording Obsidian Plugin

## 🚀 Vue d'Ensemble

Cette procédure décrit le processus complet de release du plugin AI Recording Obsidian, de la préparation à la publication finale.

## 📋 Checklist Pré-Release

### Tests Obligatoires
- [ ] **Tests Fonctionnels**
  - [ ] Enregistrement audio fonctionne correctement
  - [ ] Transcription OpenAI génère du texte
  - [ ] Sauvegarde des fichiers audio
  - [ ] Création automatique des transcriptions
  - [ ] Interface de paramètres fonctionnelle
  - [ ] Commandes Obsidian intégrées

- [ ] **Tests de Performance**
  - [ ] Temps de transcription acceptable (< 30s pour 1min)
  - [ ] Consommation mémoire raisonnable (< 50MB)
  - [ ] Pas de fuites mémoire détectées
  - [ ] Plugin ne ralentit pas Obsidian

- [ ] **Tests de Compatibilité**
  - [ ] Compatible avec Obsidian 0.15.0+
  - [ ] Fonctionne sur Windows/Mac/Linux
  - [ ] Compatible avec différents navigateurs
  - [ ] Testé avec différents formats audio

- [ ] **Tests de Sécurité**
  - [ ] Clé API jamais exposée dans les logs
  - [ ] Données audio traitées localement
  - [ ] Permissions microphone demandées correctement
  - [ ] Aucune donnée sensible transmise

### Validation du Code
- [ ] **Code Review**
  - [ ] Code conforme aux règles du projet
  - [ ] Commentaires et documentation à jour
  - [ ] Pas de code mort ou commenté
  - [ ] Gestion d'erreurs appropriée

- [ ] **Linting et Formatting**
  - [ ] Aucune erreur TypeScript
  - [ ] Code formaté selon les standards
  - [ ] Imports organisés correctement
  - [ ] Types explicites partout

- [ ] **Build Validation**
  - [ ] `npm run build` réussit sans erreur
  - [ ] `main.js` généré correctement
  - [ ] Taille du bundle optimisée
  - [ ] Source maps générées

## 🔄 Processus de Release

### Étape 1 : Préparation
```bash
# 1. Vérifier le statut Git
git status

# 2. S'assurer d'être sur la branche main
git checkout main

# 3. Pull les derniers changements
git pull origin main

# 4. Installer les dépendances
npm install
```

### Étape 2 : Tests et Validation
```bash
# 1. Lancer les tests de build
npm run build

# 2. Vérifier la compilation TypeScript
npx tsc --noEmit

# 3. Tester le plugin en mode dev
npm run dev
```

### Étape 3 : Mise à Jour des Versions
```bash
# 1. Mettre à jour le numéro de version
npm version patch  # ou minor/major selon le type de release

# 2. Vérifier que les fichiers sont mis à jour
git status
```

### Étape 4 : Documentation
- [ ] Mettre à jour le `README.md` si nécessaire
- [ ] Mettre à jour le `CHANGELOG.md`
- [ ] Vérifier la documentation des nouvelles fonctionnalités
- [ ] Mettre à jour les captures d'écran si nécessaire

### Étape 5 : Commit et Tag
```bash
# 1. Commiter les changements
git add .
git commit -m "Release v1.0.0: Version initiale du plugin AI Recording"

# 2. Créer un tag de release
git tag -a v1.0.0 -m "Release version 1.0.0"

# 3. Pousser vers GitHub
git push origin main
git push origin v1.0.0
```

### Étape 6 : Publication GitHub
1. **Créer une Release sur GitHub**
   - Aller sur https://github.com/VGrss/AI-Recording-Obsidian-Plugin/releases
   - Cliquer sur "Create a new release"
   - Sélectionner le tag `v1.0.0`
   - Titre : "AI Recording Plugin v1.0.0"
   - Description : Copier le contenu du CHANGELOG

2. **Attacher les fichiers**
   - Attacher `main.js` (fichier compilé)
   - Attacher `manifest.json`
   - Attacher `styles.css` (si applicable)

### Étape 7 : Publication Communauté Obsidian
1. **Préparer la soumission**
   - Créer un compte sur la communauté Obsidian
   - Préparer les captures d'écran
   - Rédiger la description du plugin

2. **Soumettre le plugin**
   - Suivre les guidelines de la communauté
   - Fournir tous les fichiers requis
   - Attendre la validation des modérateurs

## 📊 Types de Release

### Patch Release (1.0.1)
- **Quand** : Corrections de bugs mineurs
- **Processus** : `npm version patch`
- **Tests** : Tests fonctionnels de base
- **Documentation** : Mise à jour du CHANGELOG uniquement

### Minor Release (1.1.0)
- **Quand** : Nouvelles fonctionnalités, améliorations
- **Processus** : `npm version minor`
- **Tests** : Tests complets + nouveaux tests
- **Documentation** : README + CHANGELOG + nouvelles docs

### Major Release (2.0.0)
- **Quand** : Changements breaking, refactoring majeur
- **Processus** : `npm version major`
- **Tests** : Tests exhaustifs + tests de migration
- **Documentation** : Documentation complète + guide migration

## 🔍 Post-Release

### Monitoring
- [ ] **Surveiller les Issues GitHub**
  - Vérifier les rapports de bugs
  - Répondre aux questions utilisateurs
  - Documenter les problèmes connus

- [ ] **Analyser les Métriques**
  - Nombre de téléchargements
  - Feedback utilisateurs
  - Performance en production

### Maintenance
- [ ] **Hotfix si nécessaire**
  - Identifier les bugs critiques
  - Développer et tester les corrections
  - Publier un patch release rapidement

- [ ] **Planification suivante**
  - Analyser le feedback utilisateurs
  - Prioriser les nouvelles fonctionnalités
  - Planifier la prochaine release

## 🚨 Rollback Procedure

### En cas de problème majeur
1. **Identifier le problème**
   - Analyser les rapports d'erreur
   - Reproduire le problème
   - Évaluer l'impact

2. **Rollback immédiat**
   ```bash
   # Revenir à la version précédente
   git checkout v0.9.0
   git tag -a v1.0.1-hotfix -m "Hotfix for critical issue"
   git push origin v1.0.1-hotfix
   ```

3. **Communication**
   - Informer la communauté
   - Publier un communiqué
   - Fournir des instructions de rollback

## 📝 Templates

### Template de Release Notes
```markdown
## 🎉 AI Recording Plugin v1.0.0

### ✨ Nouvelles Fonctionnalités
- Enregistrement audio intégré
- Transcription automatique avec OpenAI Whisper
- Interface de paramètres complète
- Support multi-langues

### 🐛 Corrections
- Correction du bug de sauvegarde audio
- Amélioration de la gestion des erreurs

### 🔧 Améliorations
- Optimisation des performances
- Amélioration de l'interface utilisateur

### 📚 Documentation
- Guide d'installation mis à jour
- Nouvelle section FAQ
```

### Template de Communication Communauté
```markdown
🎤 **AI Recording Plugin v1.0.0** est maintenant disponible !

Transformez vos enregistrements audio en notes textuelles directement dans Obsidian grâce à l'IA.

✨ **Fonctionnalités principales :**
- Enregistrement audio intégré
- Transcription automatique (OpenAI Whisper)
- Support français/anglais/espagnol/allemand
- Interface intuitive

📥 **Installation :** [Lien vers la release]

Merci pour votre support ! 🚀
```

---

*Document créé : Janvier 2025*
*Dernière mise à jour : Janvier 2025*
*Version : 1.0*
