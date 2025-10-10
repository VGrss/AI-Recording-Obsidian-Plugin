# Test de la Version 0.6.0 - Paramètres Complets

## 🎯 Objectif de cette version

Cette version introduit un **système de paramètres complet** permettant de configurer tous les aspects du plugin : transcription, résumé IA, export et paramètres divers.

## 📦 Installation pour Tests

La version 0.6.0 a été **déployée localement** dans votre Obsidian :
- ✅ Fichiers copiés dans `.obsidian/plugins/ai-recording-plugin/`
- ✅ Version 0.6.0 prête à être testée

### Pour activer la nouvelle version :

1. Ouvrir Obsidian
2. Aller dans **Paramètres** → **Plugins communautaires**
3. Désactiver puis réactiver **AI Recording Plugin**
   
   **OU**
   
   Recharger Obsidian avec **Cmd+R**

## 🧪 Tests à Effectuer

### 1. Accès aux Paramètres ✅

1. Ouvrir **Paramètres** → **AI Recording** (dans la liste des plugins)
2. Vérifier que l'onglet de paramètres s'affiche correctement
3. Vérifier la présence de toutes les sections :
   - 🎤 Transcription
   - 🤖 Résumé IA
   - 📁 Export et Fichiers
   - ⚙️ Divers

### 2. Section Transcription 🎤

**Tests :**
- [ ] Changer le **Provider** entre OpenAI et Local
- [ ] Vérifier que le champ **Clé API OpenAI** apparaît uniquement pour OpenAI
- [ ] Changer le **Modèle** (options différentes selon provider)
- [ ] Tester la sélection de **Langue** (auto, fr, en, etc.)
- [ ] Basculer entre mode **Rapide** et **Qualité**

**Vérification :**
- Les options changent dynamiquement selon le provider
- Les paramètres sont sauvegardés automatiquement

### 3. Section Résumé IA 🤖

**Tests :**
- [ ] Changer le **Provider** entre OpenAI, Anthropic et Local
- [ ] Vérifier l'apparition des champs API selon le provider :
  - OpenAI → Clé API OpenAI
  - Anthropic → Clé API Anthropic
  - Local → Pas de clé
- [ ] Tester les **Modèles** disponibles (changent selon provider)
- [ ] Modifier la **Longueur du résumé** (Court/Moyen/Long)
- [ ] Éditer le **Template de prompt** :
  - Modifier le template
  - Cliquer sur **Réinitialiser** pour restaurer le défaut
- [ ] Vérifier les variables : `{{transcript}}`, `{{language}}`, `{{datetime}}`, `{{duration}}`, `{{title}}`

**Vérification :**
- Le textarea du template est suffisamment grand (15 lignes)
- Le bouton de réinitialisation fonctionne
- Les modèles proposés correspondent au provider

### 4. Section Export 📁

**Tests :**
- [ ] Modifier le **Dossier des enregistrements**
- [ ] Changer le **Format audio** (WebM/M4A)
- [ ] Changer le **Format de transcription** (Markdown/Texte)
- [ ] Activer/Désactiver **Organiser par date**
- [ ] Activer/Désactiver **Découpage automatique**
- [ ] Modifier la **Taille maximale des segments** (slider 10-100 MB)
- [ ] Vérifier que la valeur du slider s'affiche dynamiquement

**Vérification :**
- Le slider est interactif avec tooltip
- Les toggles répondent correctement

### 5. Section Divers ⚙️

**Tests :**
- [ ] Activer/Désactiver l'**Avertissement initial**
- [ ] Modifier la **Suppression automatique** (slider 0-90 jours)
- [ ] Vérifier l'affichage "(jamais)" quand = 0
- [ ] Vérifier l'affichage "X jours" quand > 0
- [ ] Activer/Désactiver les **Raccourcis clavier**

**Vérification :**
- Le slider affiche correctement la valeur
- Le texte "(jamais)" ou "X jours" s'affiche à côté

### 6. Persistance des Paramètres 💾

**Tests :**
1. Modifier plusieurs paramètres dans différentes sections
2. Fermer les paramètres
3. Recharger Obsidian (**Cmd+R**)
4. Rouvrir les paramètres
5. [ ] Vérifier que tous les paramètres sont restaurés

**Vérification :**
- Tous les paramètres sont sauvegardés
- Les valeurs sont restaurées au redémarrage
- Aucune perte de configuration

### 7. Intégration avec le Plugin 🔌

**Tests :**
- [ ] Modifier le **Dossier des enregistrements** dans les paramètres
- [ ] Faire un enregistrement test
- [ ] Vérifier que le fichier est sauvegardé dans le nouveau dossier
- [ ] Vérifier dans la console que les paramètres sont chargés au démarrage

**Vérification :**
- Le plugin utilise bien les paramètres configurés
- Le dossier d'enregistrements est mis à jour dynamiquement

### 8. Interface Utilisateur 🎨

**Tests :**
- [ ] Vérifier que l'interface est claire et organisée
- [ ] Vérifier les descriptions des paramètres (texte d'aide)
- [ ] Vérifier que les sections sont bien séparées visuellement
- [ ] Vérifier que le footer "💡 Astuce" s'affiche en bas

**Vérification :**
- Interface moderne et cohérente avec Obsidian
- Descriptions claires et utiles
- Navigation facile entre les sections

## 🐛 Bugs à Reporter

Si vous trouvez des problèmes, notez :
1. **Quelle section** du paramètre
2. **Quelle action** vous avez effectuée
3. **Quel résultat** attendu vs obtenu
4. **Erreurs console** (Cmd+Option+I → Console)

## ✅ Critères de Validation

La version 0.6.0 est validée si :
- ✅ Tous les paramètres sont accessibles et modifiables
- ✅ L'interface change dynamiquement selon les sélections
- ✅ La persistance fonctionne correctement
- ✅ Le plugin utilise les paramètres configurés
- ✅ Aucune régression sur les fonctionnalités existantes

## 📝 Notes

- Les **clés API** ne sont pas encore utilisées (sera fait en 0.7 et 0.8)
- Le **découpage automatique** est déjà implémenté (Release 0.4)
- Les **raccourcis clavier** seront implémentés en 0.9

## 🚀 Prochaine Étape

Après validation de cette version :
→ **Release 0.7** : Intégration Transcription OpenAI (utilisation des clés API)

---

**Branche GitHub** : `feature/0.6-settings`  
**Lien PR** : https://github.com/VGrss/AI-Recording-Obsidian-Plugin/pull/new/feature/0.6-settings

