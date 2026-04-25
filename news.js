const FEEDS = {
  shinchiku: 'https://news.google.com/rss/search?q=新築+建築+住宅&hl=ja&gl=JP&ceid=JP:ja',
  reform: 'https://news.google.com/rss/search?q=リフォーム+住宅+改築+改修&hl=ja&gl=JP&ceid=JP:ja'
};

const API_BASE = 'https://api.rss2json.com/v1/api.json';
const CACHE_TTL = 30 * 60 * 1000;

let activeTab = 'shinchiku';
const loading = { shinchiku: false, reform: false };

function getCached(key) {
  try {
    const item = JSON.parse(localStorage.getItem(key));
    if (item && Date.now() - item.ts < CACHE_TTL) return item.data;
  } catch {}
  return null;
}

function setCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

function stripHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function extractSource(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function renderSkeleton(container) {
  container.innerHTML = Array(6).fill(0).map(() => `
    <div class="news-card skeleton">
      <div class="skeleton-line title"></div>
      <div class="skeleton-line meta"></div>
      <div class="skeleton-line body"></div>
      <div class="skeleton-line body short"></div>
    </div>
  `).join('');
}

function renderError(container) {
  container.innerHTML = `
    <div class="news-error">
      <div class="news-error-icon">⚠️</div>
      <p>ニュースの取得に失敗しました</p>
      <p class="error-sub">しばらく経ってから更新ボタンを押してください</p>
    </div>
  `;
}

function renderNews(container, items) {
  if (!items || items.length === 0) {
    container.innerHTML = '<div class="news-empty">ニュースが見つかりませんでした</div>';
    return;
  }

  container.innerHTML = items.map(item => {
    const rawDesc = stripHtml(item.description || item.content || '');
    const desc = rawDesc.length > 120 ? rawDesc.slice(0, 120) + '…' : rawDesc;
    const source = item.author || extractSource(item.link);
    const date = formatDate(item.pubDate);
    return `
      <article class="news-card">
        <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="news-title">${escapeHtml(item.title)}</a>
        <div class="news-meta">
          ${source ? `<span class="news-source">${escapeHtml(source)}</span>` : ''}
          ${date ? `<span class="news-date">${date}</span>` : ''}
        </div>
        ${desc ? `<p class="news-desc">${escapeHtml(desc)}</p>` : ''}
      </article>
    `;
  }).join('');
}

function updateLastUpdated() {
  const el = document.getElementById('last-updated');
  const now = new Date();
  el.textContent = `最終更新: ${formatDate(now.toISOString())}`;
}

function setRefreshState(isLoading) {
  const btn = document.getElementById('refresh-btn');
  const icon = document.getElementById('refresh-icon');
  btn.disabled = isLoading;
  icon.classList.toggle('spinning', isLoading);
}

async function loadNews(category, forceRefresh = false) {
  if (loading[category]) return;
  loading[category] = true;

  const container = document.getElementById(`list-${category}`);

  if (!forceRefresh) {
    const cached = getCached(`news-${category}`);
    if (cached) {
      renderNews(container, cached);
      updateLastUpdated();
      loading[category] = false;
      return;
    }
  }

  renderSkeleton(container);
  setRefreshState(true);

  try {
    const url = `${API_BASE}?rss_url=${encodeURIComponent(FEEDS[category])}&count=20`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();
    if (data.status !== 'ok') throw new Error('Feed error');

    setCache(`news-${category}`, data.items);
    renderNews(container, data.items);
    updateLastUpdated();
  } catch {
    renderError(container);
  } finally {
    loading[category] = false;
    setRefreshState(false);
  }
}

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  document.querySelectorAll('.news-panel').forEach(p => {
    p.classList.add('hidden');
  });
  document.getElementById(`panel-${tab}`).classList.remove('hidden');

  const container = document.getElementById(`list-${tab}`);
  if (!container.hasChildNodes() || container.querySelector('.news-error')) {
    loadNews(tab);
  }
}

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

document.getElementById('refresh-btn').addEventListener('click', () => {
  localStorage.removeItem(`news-${activeTab}`);
  loadNews(activeTab, true);
});

loadNews('shinchiku');
