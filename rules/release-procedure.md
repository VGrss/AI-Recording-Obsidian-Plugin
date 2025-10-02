# Procédure de Release Simplifiée

## 🚀 Release en 4 Étapes

### 1. Versioning
```bash
# Incrémenter la version (major.minor.patch)
npm version minor  # ou major/patch selon le type de changement
```

### 2. Déploiement Local
```bash
# Copier les fichiers vers le dossier Obsidian pour test
cp main.js manifest.json "/Users/victorgross/Library/Mobile Documents/iCloud~md~obsidian/Documents/Vic Brain/.obsidian/plugins/ai-recording-plugin/"
```

### 3. Test Local
- Tester le plugin dans Obsidian
- Vérifier que toutes les fonctionnalités marchent
- Valider que la nouvelle version fonctionne correctement

### 4. Déploiement GitHub et Documentation
```bash
# Commiter et pousser vers GitHub
git add .
git commit -m "Release v$(npm pkg get version | tr -d '"')"
git push origin main
git push origin --tags
```

## 📝 Mise à Jour Documentation
- Ajouter l'entrée dans `version-history.md`
- Mettre à jour `product-specs.md` si nouvelles fonctionnalités
- Mettre à jour `versions.json` avec la nouvelle version
- Vérifier que `manifest.json` est à jour
