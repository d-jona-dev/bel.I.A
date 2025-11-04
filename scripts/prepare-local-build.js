// scripts/prepare-local-build.js
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');

async function prepareLocalBuild() {
  const projectRoot = path.join(__dirname, '..');
  const buildDir = path.join(projectRoot, 'build-local');
  const publicDir = path.join(projectRoot, 'public');
  const downloadsDir = path.join(publicDir, 'downloads');
  const zipPath = path.join(downloadsDir, 'app-local.zip');
  
  console.log('Starting local build preparation...');

  // 1. Nettoyer dossier précédent
  console.log(`Cleaning up old build directory: ${buildDir}`);
  await fs.remove(buildDir);
  console.log(`Ensuring directories exist: ${buildDir}, ${downloadsDir}`);
  await fs.ensureDir(buildDir);
  await fs.ensureDir(downloadsDir);

  // 2. Copier les fichiers essentiels
  const filesToCopy = [
    'src',
    'public',
    'next.config.ts',
    'package.json',
    'tsconfig.json',
    'tailwind.config.ts',
    'postcss.config.js', // Assurez-vous d'inclure tous les fichiers de config
    'components.json'
  ];
  
  console.log('Copying essential files...');
  for (const file of filesToCopy) {
    const sourcePath = path.join(projectRoot, file);
    const destPath = path.join(buildDir, file);
    if (await fs.pathExists(sourcePath)) {
      await fs.copy(sourcePath, destPath);
      console.log(`  - Copied ${file}`);
    } else {
      console.warn(`  - Warning: ${file} not found, skipping.`);
    }
  }

  // 3. Supprimer les dépendances et références Firebase/Genkit/Ollama
  console.log('Modifying files for local version...');
  
  // Rendre le script lui-même vide dans le build pour ne pas l'inclure
  await fs.ensureDir(path.join(buildDir, 'scripts'));
  await fs.writeFile(path.join(buildDir, 'scripts/prepare-local-build.js'), '// This script is not part of the local build.');
  
  // Supprimer les fichiers liés à Genkit
  await fs.remove(path.join(buildDir, 'src/ai'));
  
  // Modifier package.json pour la version locale
  const packageJsonPath = path.join(buildDir, 'package.json');
  const packageJson = await fs.readJson(packageJsonPath);
  delete packageJson.dependencies['firebase'];
  delete packageJson.dependencies['@tanstack/react-query-firebase'];
  delete packageJson.dependencies['@genkit-ai/googleai'];
  delete packageJson.dependencies['@genkit-ai/next'];
  delete packageJson.dependencies['genkit'];

  delete packageJson.devDependencies['genkit-cli'];
  delete packageJson.devDependencies['tsx'];

  // Ajuster les scripts
  packageJson.scripts['dev'] = 'next dev -p 3000'; // Port standard pour le local
  delete packageJson.scripts['genkit:dev'];
  delete packageJson.scripts['genkit:watch'];
  delete packageJson.scripts['build-local'];

  await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  console.log('  - Modified package.json to remove Firebase/Genkit dependencies.');
  
  // Créer le dossier data/ pour les sauvegardes JSON locales
  const dataDir = path.join(buildDir, 'public/data');
  await fs.ensureDir(dataDir);
  console.log(`  - Created data directory: ${dataDir}`);
  // Créez des fichiers JSON vides si nécessaire pour simuler la BDD
  const emptyJson = JSON.stringify([], null, 2);
  await fs.writeFile(path.join(dataDir, 'characters.json'), emptyJson);
  await fs.writeFile(path.join(dataDir, 'stories.json'), emptyJson);
  
  // Modifier le code pour utiliser les fichiers JSON au lieu de Firebase/localStorage
  // Cette étape est délicate et doit être faite manuellement en général.
  // Ici, nous supposons que des modifications conditionnelles existent déjà dans le code source.
  // Par exemple, en vérifiant une variable d'environnement `IS_LOCAL_BUILD`.
  // Nous allons injecter un fichier `.env.local` pour définir cette variable.
  await fs.writeFile(path.join(buildDir, '.env.local'), 'IS_LOCAL_BUILD=true');
  console.log('  - Added .env.local file for build flags.');

  // 4. Ajouter un README_local.md
  console.log('Adding local README file...');
  const readmeContent = `
# Version locale de l'application
Ceci est une version autonome de l'application qui ne nécessite aucune connexion à des services externes comme Firebase.

## Installation et Lancement

1.  **Installer Node.js** (version 18 ou supérieure recommandée) depuis [https://nodejs.org/](https://nodejs.org/).
2.  Ouvrez un terminal ou une ligne de commande dans ce dossier.
3.  Exécutez la commande suivante pour installer les dépendances :
    \`\`\`bash
    npm install
    \`\`\`
4.  Une fois l'installation terminée, lancez l'application avec :
    \`\`\`bash
    npm run dev
    \`\`\`
5.  Ouvrez votre navigateur et allez à l'adresse [http://localhost:3000](http://localhost:3000).

## Utiliser l'IA en local avec Ollama

Cette version peut utiliser des modèles de langage (LLM) qui tournent sur votre propre machine, gratuitement et sans envoyer vos données sur internet. Pour cela, nous utilisons **Ollama**.

1.  **Installez Ollama** : Rendez-vous sur [https://ollama.com](https://ollama.com) et téléchargez l'application pour votre système d'exploitation (Windows, macOS, Linux).

2.  **Téléchargez un modèle** : Ouvrez un terminal et téléchargez un modèle. Nous vous recommandons de commencer par `llama3`.
    \`\`\`bash
    ollama run llama3
    \`\`\`
    Attendez la fin du téléchargement. Vous pouvez télécharger d'autres modèles comme `mistral` de la même manière.

3.  **Activez le modèle dans l'application** :
    *   Assurez-vous qu'Ollama est en cours d'exécution.
    *   Dans l'application, allez dans la page **"Histoires"**.
    *   Cliquez sur le bouton **"Configuration IA"**.
    *   Dans la section "Modèle de Langage (LLM)", sélectionnez **"Local (Ollama)"**.
    *   Dans la liste déroulante qui apparaît, choisissez le modèle que vous venez de télécharger (ex: `llama3`).

Et voilà ! L'application utilisera maintenant votre modèle local pour générer les aventures.

## Notes importantes

*   **Stockage des données** : Toutes les données (personnages, histoires, etc.) sont sauvegardées sous forme de fichiers JSON dans le sous-dossier \`public/data/\`.
*   **Génération d'images** : La génération d'images avec des services externes (comme Gemini) est toujours disponible via la "Configuration IA" si vous le souhaitez.
  `;
  await fs.writeFile(path.join(buildDir, 'README_local.md'), readmeContent);

  // 5. Créer le ZIP
  console.log(`Creating ZIP file at: ${zipPath}`);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => console.log(`ZIP created: ${path.basename(zipPath)} (${Math.round(archive.pointer() / 1024)} KB)`));
  archive.on('error', err => { throw err; });

  archive.pipe(output);
  archive.directory(buildDir, 'app-local'); // Mettre les fichiers dans un sous-dossier dans le zip
  await archive.finalize();

  // 6. Nettoyer le dossier temporaire
  console.log(`Cleaning up temporary build directory: ${buildDir}`);
  await fs.remove(buildDir);

  console.log('Local build process completed successfully!');
}

prepareLocalBuild().catch(err => {
  console.error('An error occurred during the local build process:', err);
  process.exit(1);
});
