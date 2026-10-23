const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const contentDir = path.join(root, 'content');

function listMarkdownFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return {};

  const result = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }

  return result;
}

function buildManifest() {
  const allFiles = listMarkdownFiles(contentDir).filter((file) => !file.endsWith('manifest.json'));
  const manifest = { notes: [], diary: [], articles: [], projects: [], pages: [] };

  for (const file of allFiles) {
    const relativePath = path.relative(contentDir, file).replace(/\\/g, '/');
    const fileName = path.basename(file, '.md');
    const content = fs.readFileSync(file, 'utf8');
    const meta = parseFrontmatter(content);

    const item = {
      id: fileName,
      title: meta.title || fileName.replace(/-/g, ' '),
      path: relativePath,
      date: meta.date || null,
      tags: meta.tags ? meta.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
      published: meta.publish === 'true',
      type: relativePath.startsWith('diary/')
        ? (meta.type || 'article')
        : relativePath.startsWith('projects/')
          ? 'project'
          : relativePath.startsWith('notes/')
            ? 'note'
            : 'page',
    };

    if (item.type === 'article') {
      if (item.published) {
        manifest.articles.push(item);
        manifest.diary.push(item);
      }
    }
    else if (item.type === 'project') {
      if (item.published) manifest.projects.push(item);
    }
    else if (item.type === 'note') manifest.notes.push(item);
    else manifest.pages.push(item);
  }

  manifest.diary.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });

  manifest.notes.sort((a, b) => a.title.localeCompare(b.title));
  manifest.articles.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  manifest.projects.sort((a, b) => a.title.localeCompare(b.title));
  manifest.pages.sort((a, b) => a.title.localeCompare(b.title));

  fs.writeFileSync(path.join(contentDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Generated manifest with ${manifest.articles.length} articles, ${manifest.projects.length} projects, and ${manifest.notes.length} notes.`);
}

function buildPublicSite() {
  const manifest = JSON.parse(fs.readFileSync(path.join(contentDir, 'manifest.json'), 'utf8'));
  const outputDir = path.join(root, 'dist');
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  for (const entry of ['index.html', 'app.js', 'styles.css', 'diary', 'projects', 'notes']) {
    fs.cpSync(path.join(root, entry), path.join(outputDir, entry), { recursive: true });
  }

  const publicContentDir = path.join(outputDir, 'content');
  fs.mkdirSync(publicContentDir, { recursive: true });

  for (const file of ['index.md', 'diary.md', 'projects.md', 'manifest.json']) {
    fs.copyFileSync(path.join(contentDir, file), path.join(publicContentDir, file));
  }

  fs.cpSync(path.join(contentDir, 'notes'), path.join(publicContentDir, 'notes'), { recursive: true });

  for (const item of [...manifest.articles, ...manifest.projects]) {
    const source = path.join(contentDir, item.path);
    const destination = path.join(publicContentDir, item.path);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }

  console.log('Built public site in dist without unpublished diary entries or project details.');
}

buildManifest();
buildPublicSite();
