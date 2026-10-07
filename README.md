# AI Recording Obsidian Plugin

Un plugin Obsidian pour l'enregistrement audio avec traitement **100% local** : transcription avec Whisper (whisper.cpp) et résumé avec Llama (Ollama). Aucune donnée n'est envoyée dans le cloud.

## Fonctionnalités

- 🎤 **Enregistrement audio** : Enregistrement audio directement dans Obsidian
- 🤖 **Transcription locale** : Whisper via `whisper-server` (whisper.cpp)
- 📝 **Résumé et titre locaux** : Llama via Ollama
- 🧾 **Journal de traitement** : Chaque étape est journalisée (durées, réponses, erreurs) et copiable en un clic pour le débogage
- 🌍 **Multi-langues** : Auto-détection ou choix de la langue
- 💾 **Sauvegarde** : Une note Markdown et un fichier audio par enregistrement

## Prérequis (serveurs locaux)

Le plugin est réservé au bureau (macOS, Windows, Linux) : il dialogue avec deux serveurs locaux.

### Whisper (transcription)

```bash
brew install whisper-cpp
curl -L -o ggml-base.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
whisper-server -m ggml-base.bin --host 127.0.0.1 --port 8080
```

Par défaut le plugin appelle `http://127.0.0.1:8080`. Le modèle se choisit au lancement du serveur (`-m`).

### Ollama + Llama (résumé et titre)

```bash
brew install ollama
ollama pull llama3.2:3b
ollama serve
```

Par défaut le plugin utilise `http://127.0.0.1:11434` et le modèle `llama3.2:3b`. Pour un meilleur résumé, utilisez par exemple `llama3.1:8b` et indiquez-le dans les paramètres.

## Installation

### Installation manuelle

1. Téléchargez les fichiers du plugin
2. Placez-les dans le dossier `Vault/.obsidian/plugins/ai-recording-plugin/`
3. Activez le plugin dans les paramètres d'Obsidian

### Installation via BRAT (recommandé)

1. Installez le plugin [BRAT](https://github.com/TfTHacker/obsidian42-brat)
2. Ajoutez ce dépôt : `https://github.com/VGrss/AI-Recording-Obsidian-Plugin`

## Configuration

Ouvrez les paramètres du plugin dans Obsidian :

- **URL du serveur Whisper** et **langue**
- **URL d'Ollama**, **modèle Llama** et **longueur du résumé**
- **Traitement automatique** : transcrire, résumer et titrer dès la fin de l'enregistrement
- **Conserver le journal de traitement** et bouton **Copier le journal**

## Utilisation

### Enregistrement

- **Commande** : `Ctrl/Cmd + P` → "Commencer l'enregistrement audio"
- **Bouton** : Cliquez sur l'icône microphone dans la barre latérale
- **Arrêt** : Même commande ou bouton pour arrêter

### Résultats

- **Fichier audio** : `Audio - <Titre>.webm` dans le dossier des enregistrements
- **Note** : `<Titre>.md` avec le lecteur audio, le résumé et la transcription complète

### Journal de traitement (débogage)

Chaque traitement écrit un journal détaillé dans `.obsidian/plugins/ai-recording-plugin/processing-logs/`. Pour déboguer :

1. Cliquez sur **🧾 Journal** dans la carte de l'enregistrement (ou la commande « Copier le journal du dernier traitement »)
2. Collez le contenu dans votre agent IA de code

Le journal contient la configuration (sans contenu sensible), chaque étape avec sa durée, les réponses HTTP des serveurs et les erreurs avec leur pile d'appels.

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
