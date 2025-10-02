# Spécifications Produit - AI Recording Plugin

## 🎯 Vue d'Ensemble
Plugin Obsidian pour l'enregistrement audio avec transcription IA et résumé automatique.

**Objectif** : Enregistrer de l'audio → Transcrire avec IA → Résumer intelligemment

**Plateformes** : Desktop et Mobile (selon permissions microphone)

**Accès** : Bouton microphone dans le ribbon → Sidebar à droite

---

## 🎨 Interface Utilisateur

### Sidebar Layout
**2 zones empilées :**

#### Zone de Contrôle (haut)
- **Boutons** : Start / Pause / Resume / Stop
- **Avertissement** : ⚠️ avant le premier enregistrement
- **Indicateurs** : Timer + État (Idle/Recording/Paused/Processing/Ready/Error)

#### Zone Historique (bas, scrollable)
- **Cartes** : Enregistrements triés du plus récent au plus ancien
- **Header** : Titre auto (date+heure), durée, statut
- **Onglets** : Summary | Transcript
- **Actions** : Copy, Expand/Collapse, Delete
- **États** : Animations + messages "Uploading", "Transcribing", "Summarizing"

### Flux Utilisateur
1. **Start** : Clic micro → Sidebar → Bouton Start
2. **Control** : Pause/Resume pendant l'enregistrement
3. **Stop** : Arrête et crée une carte
4. **Processing** : Messages temps réel (upload → transcription → résumé)
5. **Résultats** : Accès aux onglets + copie presse-papiers

### Design
- **Style** : Moderne (shadcn-like)
- **UX** : Tooltips, badges, hover states
- **Raccourcis** : Configurables (start/stop, pause/resume, focus)

---

## ⚙️ Paramètres

### Transcription (STT)
- **Provider** : Cloud (OpenAI Whisper) ou Local (Whisper local)
- **Modèle** : Liste déroulante adaptée au provider
- **Options** : Langue (auto/forcée), mode rapide/qualité

### Résumé IA
- **Provider** : Cloud (GPT-4o) ou Local (LLM open source)
- **Modèle** : Sélection selon le provider
- **Template** : Prompt éditable avec variables :
  - `{{transcript}}`, `{{language}}`, `{{datetime}}`, `{{duration}}`, `{{title}}`
- **Défaut** : Orienté Contexte/Décisions/Actions/Risques
- **Longueur** : Court/Moyen/Long configurable

### Export & Fichiers
- **Découpage** : Automatique pour fichiers lourds (segments traités indépendamment)
- **Formats** : Audio (.m4a/.webm), Transcript (.txt/.md), Résumé (.md)
- **Organisation** : Fichiers regroupés par date
- **Export** : Note unique combinée (option)

### Divers
- **Avertissement** : Initial activable/désactivable
- **Suppression** : Audio original supprimé après délai (optionnel)

---

## 🔄 États du Système

| État | Description |
|------|-------------|
| **IDLE** | Prêt à enregistrer |
| **RECORDING** | Enregistrement actif |
| **PAUSED** | Enregistrement suspendu |
| **STOPPING/PROCESSING** | Upload + traitement |
| **READY** | Résultats disponibles |
| **ERROR** | Problème détecté (retry possible) |

**Messages** : "Uploading audio...", "Transcribing...", "Summarizing..."

---

## 💾 Données & Stockage

### Structure des Enregistrements
- **Identifiants** : Titre, date, durée, statut
- **Contenu** : Transcripts et résumés
- **Stockage** : Vault Obsidian avec découpage automatique
- **Index** : Organisation pour affichage

### Multi-Provider
- **Architecture** : Support multiple providers dès le départ
- **Choix indépendant** : Transcription et résumé séparés
- **Types** : 
  - Cloud : OpenAI, Anthropic, autres APIs
  - Local : Whisper CPU/GPU, LLM open source via API locale
- **Adaptation** : Selon disponibilité et type de provider

---

## 🚨 Gestion des Erreurs

| Problème | Solution |
|----------|----------|
| **Fichier trop lourd** | Découpage automatique + traitement par lots |
| **Erreur réseau/API** | Affichage clair + bouton Retry |
| **Permissions micro refusées** | Message d'alerte explicite |
| **Prompt invalide** | Fallback sur prompt par défaut |

---

## ✅ Critères d'Acceptation

- [ ] Enregistrement audio avec état temps réel
- [ ] Chaque enregistrement génère une carte avec transcript + summary
- [ ] Transcript et résumé copiables facilement
- [ ] Settings permettent de choisir provider/modèle pour chaque tâche
- [ ] Fichiers lourds découpés et traités automatiquement
- [ ] Basculement entre modèles locaux et cloud

