const parseFrontmatter = (markdown) => {
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
};

const resolvePageLink = (target) => {
  const clean = target.replace(/\.md$/i, '').trim();
  if (clean === 'index') return '/index.html';
  if (clean === 'diary') return '/diary/';
  if (clean === 'projects') return '/projects/';
  if (clean === 'protein-peptide-project') return '/projects/?project=protein-peptide-project';
  if (/^\d{4}-\d{2}-\d{2}-/.test(clean)) return `/diary/#${encodeURIComponent(clean)}`;
  return `/notes/index.html?note=${encodeURIComponent(clean)}`;
};

const rewriteMarkdownLinks = (markdown) => {
  let text = markdown.replace(/\[\[([^\]]+)\]\]/g, (_, value) => {
    const name = value.trim();
    return `[${name.replace(/-/g, ' ')}](${resolvePageLink(name)})`;
  });

  text = text.replace(/\]\(([^)]+\.md)\)/gi, (_, target) => {
    return `](${resolvePageLink(target)})`;
  });

  return text;
};

const parseMarkdown = (markdown) => {
  const withoutFrontmatter = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
  return marked.parse(rewriteMarkdownLinks(withoutFrontmatter));
};

const renderPage = (title, htmlContent, extras = '') => {
  const app = document.getElementById('app');
  app.innerHTML = `
    <header class="site-header" aria-label="Site navigation">
      <a class="site-brand" href="/">Home</a>
      <nav aria-label="Main navigation">
        <a href="/diary/"${window.location.pathname.startsWith('/diary/') ? ' aria-current="page"' : ''}>Diary</a>
        <a href="/projects/"${window.location.pathname.startsWith('/projects/') ? ' aria-current="page"' : ''}>Projects</a>
      </nav>
    </header>
    <article class="page">
      <div class="article">
        ${htmlContent}
        ${extras}
      </div>
    </article>
  `;
};

const fetchJson = async (url) => {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  return response.json();
};

const fetchText = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  return response.text();
};

const buildGraph = async () => {
  const data = await fetchJson('/content/manifest.json');
  const nodes = [...data.articles, ...data.projects].map((item) => ({
    id: item.id,
    label: item.title,
    path: item.path,
    type: item.type,
    date: item.date,
  }));

  const edges = [];
  const lookup = new Map(nodes.map((node) => [node.id, node]));

  for (const node of nodes) {
    const text = await fetchText('/content/' + node.path);
    const matches = [
      ...[...text.matchAll(/\[\[([^\]]+)\]\]/g)].map((match) => match[1]),
      ...[...text.matchAll(/\]\(([^)]+\.md)(?:#[^)]*)?\)/gi)].map((match) => match[1]),
    ];

    for (const match of matches) {
      const target = match.split('/').pop().replace(/\.md$/i, '').trim();
      const key = [node.id, target].sort().join(':');
      if (lookup.has(target) && target !== node.id && !edges.some((edge) => edge.key === key)) {
        edges.push({ key, source: node.id, target });
      }
    }
  }

  const svg = d3.select('#graph');
  svg.selectAll('*').remove();
  const width = svg.node().clientWidth || 800;
  const height = svg.node().clientHeight || 360;
  svg.attr('viewBox', `0 0 ${width} ${height}`)
    .attr('aria-label', 'Interactive graph of articles and projects. Drag nodes to arrange, scroll to zoom, and select a node to open it.');

  const viewport = svg.append('g');
  const linkLayer = viewport.append('g');
  const nodeLayer = viewport.append('g');

  const zoom = d3.zoom()
    .scaleExtent([0.5, 3])
    .on('zoom', (event) => viewport.attr('transform', event.transform));
  svg.call(zoom);

  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(edges).id((node) => node.id).distance(125))
    .force('charge', d3.forceManyBody().strength(-360))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collide', d3.forceCollide(48));

  const link = linkLayer.selectAll('line')
    .data(edges)
    .join('line')
    .attr('class', 'graph-link');

  const nodeGroup = nodeLayer.selectAll('g')
    .data(nodes)
    .join('g')
    .attr('class', (node) => `graph-node ${node.type}`)
    .attr('role', 'link')
    .attr('tabindex', 0)
    .attr('aria-label', (node) => `${node.type}: ${node.label}`)
    .on('click', (event, node) => {
      if (event.defaultPrevented) return;
      window.location.href = node.type === 'article'
        ? `/diary/#${encodeURIComponent(node.id)}`
        : `/projects/?project=${encodeURIComponent(node.id)}`;
    })
    .on('keydown', (event, node) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        window.location.href = node.type === 'article'
          ? `/diary/#${encodeURIComponent(node.id)}`
          : `/projects/?project=${encodeURIComponent(node.id)}`;
      }
    })
    .on('pointerenter focus', (event, node) => {
      const connected = new Set([node.id]);
      edges.forEach((edge) => {
        if (edge.source.id === node.id) connected.add(edge.target.id);
        if (edge.target.id === node.id) connected.add(edge.source.id);
      });
      nodeGroup.classed('is-dimmed', (item) => !connected.has(item.id));
      link.classed('is-dimmed', (edge) => edge.source.id !== node.id && edge.target.id !== node.id);
    })
    .on('pointerleave blur', () => {
      nodeGroup.classed('is-dimmed', false);
      link.classed('is-dimmed', false);
    })
    .call(d3.drag()
      .on('start', (event, node) => {
        if (!event.active) simulation.alphaTarget(0.25).restart();
        node.fx = node.x;
        node.fy = node.y;
      })
      .on('drag', (event, node) => {
        node.fx = event.x;
        node.fy = event.y;
      })
      .on('end', (event, node) => {
        if (!event.active) simulation.alphaTarget(0);
      }));

  nodeGroup.each(function (node) {
    const group = d3.select(this);
    if (node.type === 'project') {
      group.append('rect').attr('x', -7).attr('y', -7).attr('width', 14).attr('height', 14);
    } else {
      group.append('circle').attr('r', 7);
    }
  });

  nodeGroup.append('text')
    .attr('class', 'graph-label')
    .attr('x', 11)
    .attr('y', 4)
    .text((node) => node.label);

  document.getElementById('graph-reset').addEventListener('click', () => {
    nodeGroup.each((node) => {
      node.fx = null;
      node.fy = null;
    });
    svg.call(zoom.transform, d3.zoomIdentity);
    simulation.alpha(1).restart();
  });

  const updateGraph = () => {
    link
      .attr('x1', (d) => d.source.x)
      .attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x)
      .attr('y2', (d) => d.target.y);

    nodeGroup.attr('transform', (node) => `translate(${node.x},${node.y})`);
  };

  simulation.tick(60);
  updateGraph();
  simulation.on('tick', updateGraph);
};

const renderHomePage = async () => {
  const markdown = await fetchText('/content/index.md');
  const data = await fetchJson('/content/manifest.json');
  const hasGraphContent = data.articles.length > 0 || data.projects.length > 0;
  const graph = hasGraphContent ? `
    <div class="graph-box">
      <div class="graph-heading">
        <div>
          <h2>Articles &amp; projects</h2>
          <p>Drag to arrange or pan · scroll to zoom · select an item to open it</p>
        </div>
        <button id="graph-reset" type="button">Reset view</button>
      </div>
      <div class="graph-legend" aria-label="Graph key">
        <span><i class="legend-article"></i> Article</span>
        <span><i class="legend-project"></i> Project</span>
      </div>
      <svg id="graph"></svg>
    </div>
  ` : '';

  renderPage('Home', parseMarkdown(markdown), graph);
  if (hasGraphContent) await buildGraph();
};

const renderDiaryPage = async () => {
  const intro = await fetchText('/content/diary.md');
  const data = await fetchJson('/content/manifest.json');
  const entries = await Promise.all(data.diary.map(async (item) => {
    const markdown = await fetchText('/content/' + item.path);
    const body = markdown
      .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
      .replace(/^# .+\r?\n+/, '');
    return `
      <section class="diary-entry" id="${item.id}">
        <h2>${item.title}</h2>
        ${item.date ? `<p class="entry-date"><time datetime="${item.date}">${item.date}</time></p>` : ''}
        ${parseMarkdown(body)}
      </section>
    `;
  }));

  renderPage('Diary', parseMarkdown(intro) + entries.join(''));
};

const renderProjectsPage = async () => {
  const data = await fetchJson('/content/manifest.json');
  const projectId = new URLSearchParams(window.location.search).get('project');

  if (projectId) {
    const project = data.projects.find((item) => item.id === projectId);
    if (!project) {
      renderPage('Projects', '<h1>Project not found</h1>');
      return;
    }

    const markdown = await fetchText('/content/' + project.path);
    renderPage(project.title, parseMarkdown(markdown));
    return;
  }

  const intro = await fetchText('/content/projects.md');
  const projectLinks = data.projects.map((project) => `
    <p><a href="/projects/?project=${encodeURIComponent(project.id)}">${project.title}</a></p>
  `).join('');
  renderPage('Projects', parseMarkdown(intro) + projectLinks);
};

const renderNotePage = async () => {
  const params = new URLSearchParams(window.location.search);
  const noteName = params.get('note') || 'ai-for-science';
  const markdownPath = `/content/notes/${noteName}.md`;

  try {
    const markdown = await fetchText(markdownPath);
    const parsed = parseMarkdown(markdown);
    renderPage(noteName, parsed, '');
  } catch (error) {
    renderPage('Not found', '<p>This note does not exist yet.</p>', '');
  }
};

const init = async () => {
  const path = window.location.pathname;

  if (path.startsWith('/diary/')) {
    await renderDiaryPage();
    return;
  }

  if (path.startsWith('/projects/')) {
    await renderProjectsPage();
    return;
  }

  if (path.startsWith('/notes/')) {
    await renderNotePage();
    return;
  }

  await renderHomePage();
};

init();
