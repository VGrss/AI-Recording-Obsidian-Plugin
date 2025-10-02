# AI Recording Obsidian Plugin

Un plugin Obsidian pour l'enregistrement audio avec traitement IA utilisant l'API OpenAI Whisper.

## Fonctionnalités

- 🎤 **Enregistrement audio** : Enregistrement audio directement dans Obsidian
- 🤖 **Transcription IA** : Transcription automatique avec OpenAI Whisper
- 🌍 **Multi-langues** : Support du français, anglais, espagnol et allemand
- 💾 **Sauvegarde** : Conservation des fichiers audio et transcriptions
- ⚙️ **Configuration** : Interface de paramètres intuitive

## Installation

### Installation manuelle

1. Téléchargez les fichiers du plugin
2. Placez-les dans le dossier `Vault/.obsidian/plugins/ai-recording-plugin/`
3. Activez le plugin dans les paramètres d'Obsidian

### Installation via BRAT (recommandé)

1. Installez le plugin [BRAT](https://github.com/TfTHacker/obsidian42-brat)
2. Ajoutez ce dépôt : `https://github.com/VGrss/AI-Recording-Obsidian-Plugin`

## Configuration

1. Ouvrez les paramètres du plugin dans Obsidian
2. Ajoutez votre clé API OpenAI
3. Configurez vos préférences :
   - Modèle de transcription (Whisper-1)
   - Langue de l'audio
   - Transcription automatique
   - Sauvegarde des fichiers audio

## Utilisation

### Enregistrement

- **Commande** : `Ctrl/Cmd + P` → "Commencer l'enregistrement audio"
- **Bouton** : Cliquez sur l'icône microphone dans la barre latérale
- **Arrêt** : Même commande ou bouton pour arrêter

### Résultats

- **Fichiers audio** : Sauvegardés dans votre vault (si activé)
- **Transcriptions** : Créées automatiquement en fichiers Markdown

## API OpenAI

Ce plugin utilise l'API OpenAI Whisper pour la transcription. Vous devez :

1. Créer un compte sur [OpenAI](https://platform.openai.com/)
2. Générer une clé API
3. Ajouter la clé dans les paramètres du plugin

## Développement

### Prérequis

- Node.js
- npm

### Installation des dépendances

```bash
npm install
```

### Développement

```bash
npm run dev
```

### Build de production

```bash
npm run build
```

## Structure du projet

```
├── main.ts              # Code principal du plugin
├── manifest.json        # Manifeste du plugin
├── package.json         # Dépendances npm
├── tsconfig.json        # Configuration TypeScript
├── esbuild.config.mjs   # Configuration de build
└── versions.json        # Compatibilité des versions
```

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :

1. Fork le projet
2. Créer une branche pour votre fonctionnalité
3. Commiter vos changements
4. Ouvrir une Pull Request

## Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## Support

Si vous rencontrez des problèmes ou avez des suggestions :

- Ouvrez une [issue](https://github.com/VGrss/AI-Recording-Obsidian-Plugin/issues)
- Contactez-moi sur GitHub : [@VGrss](https://github.com/VGrss)

## Changelog

### Version 1.0.0
- Enregistrement audio de base
- Transcription avec OpenAI Whisper
- Interface de paramètres
- Support multi-langues
- Sauvegarde des fichiers
