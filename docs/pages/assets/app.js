// docs/pages/assets/app.js

// ─── Active Sidebar Link ──────────────────────────
const currentPage = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.sidebar__link').forEach(link => {
  if (link.getAttribute('href') === currentPage) link.classList.add('active');
});

// ─── Lightbox + zoom/pan（限定 .diagram-container：mermaid + puml）─
const lightbox = document.createElement('div');
lightbox.className = 'lightbox';
lightbox.innerHTML = `
  <span class="lightbox__close">&#x2715;</span>
  <div class="lightbox__hint">滾輪縮放 · 拖曳平移 · +/− 鍵縮放 · 0 鍵 reset · ESC 關閉</div>
  <div class="lightbox__zoom-content"></div>
  <div class="lightbox__controls">
    <button class="lb-zoom-in" title="放大 (+)">+</button>
    <button class="lb-zoom-out" title="縮小 (−)">−</button>
    <button class="lb-reset" title="重置 (0)">⤺</button>
  </div>
`;
document.body.appendChild(lightbox);

const zoomContent = lightbox.querySelector('.lightbox__zoom-content');

let lbScale = 1, lbTx = 0, lbTy = 0;

function lbApply() {
  const child = zoomContent.firstElementChild;
  if (child) child.style.transform = `translate(${lbTx}px,${lbTy}px) scale(${lbScale})`;
}

function lbReset() {
  lbScale = 1; lbTx = 0; lbTy = 0;
  lbApply();
}

function lbClose() {
  lightbox.classList.remove('active');
  zoomContent.innerHTML = '';
  lbReset();
}

function lbZoomAt(cx, cy, factor) {
  // cursor-centered zoom
  lbTx = cx - (cx - lbTx) * factor;
  lbTy = cy - (cy - lbTy) * factor;
  lbScale *= factor;
  // clamp scale [0.1, 20]
  lbScale = Math.max(0.1, Math.min(20, lbScale));
  lbApply();
}

// Close handlers
lightbox.querySelector('.lightbox__close').addEventListener('click', lbClose);
lightbox.addEventListener('click', e => { if (e.target === lightbox) lbClose(); });

// Wheel zoom
zoomContent.addEventListener('wheel', e => {
  e.preventDefault();
  const rect = zoomContent.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  lbZoomAt(cx, cy, factor);
}, { passive: false });

// Mouse drag pan
let lbDragging = false, lbLastX = 0, lbLastY = 0;
zoomContent.addEventListener('mousedown', e => {
  lbDragging = true;
  zoomContent.classList.add('dragging');
  lbLastX = e.clientX; lbLastY = e.clientY;
  e.preventDefault();
});
window.addEventListener('mousemove', e => {
  if (!lbDragging) return;
  lbTx += e.clientX - lbLastX;
  lbTy += e.clientY - lbLastY;
  lbLastX = e.clientX; lbLastY = e.clientY;
  lbApply();
});
window.addEventListener('mouseup', () => {
  lbDragging = false;
  zoomContent.classList.remove('dragging');
});

// Keyboard shortcuts (only when lightbox active)
window.addEventListener('keydown', e => {
  if (!lightbox.classList.contains('active')) return;
  const rect = zoomContent.getBoundingClientRect();
  const cx = rect.width / 2, cy = rect.height / 2;
  if (e.key === '+' || e.key === '=') { lbZoomAt(cx, cy, 1.2); e.preventDefault(); }
  else if (e.key === '-' || e.key === '_') { lbZoomAt(cx, cy, 1/1.2); e.preventDefault(); }
  else if (e.key === '0') { lbReset(); e.preventDefault(); }
  else if (e.key === 'Escape') { lbClose(); }
});

// Touch zoom + pan (basic)
let lbTouchStart = null, lbPinchStart = null;
zoomContent.addEventListener('touchstart', e => {
  if (e.touches.length === 1) {
    lbTouchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, tx: lbTx, ty: lbTy };
  } else if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    lbPinchStart = { dist: Math.hypot(dx, dy), scale: lbScale };
  }
}, { passive: false });
zoomContent.addEventListener('touchmove', e => {
  e.preventDefault();
  if (e.touches.length === 1 && lbTouchStart) {
    lbTx = lbTouchStart.tx + (e.touches[0].clientX - lbTouchStart.x);
    lbTy = lbTouchStart.ty + (e.touches[0].clientY - lbTouchStart.y);
    lbApply();
  } else if (e.touches.length === 2 && lbPinchStart) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.hypot(dx, dy);
    lbScale = lbPinchStart.scale * (dist / lbPinchStart.dist);
    lbScale = Math.max(0.1, Math.min(20, lbScale));
    lbApply();
  }
}, { passive: false });
zoomContent.addEventListener('touchend', () => {
  lbTouchStart = null; lbPinchStart = null;
});

// Control buttons
lightbox.querySelector('.lb-zoom-in').addEventListener('click', e => {
  e.stopPropagation();
  const rect = zoomContent.getBoundingClientRect();
  lbZoomAt(rect.width / 2, rect.height / 2, 1.2);
});
lightbox.querySelector('.lb-zoom-out').addEventListener('click', e => {
  e.stopPropagation();
  const rect = zoomContent.getBoundingClientRect();
  lbZoomAt(rect.width / 2, rect.height / 2, 1 / 1.2);
});
lightbox.querySelector('.lb-reset').addEventListener('click', e => {
  e.stopPropagation();
  lbReset();
});

// Click-to-open: 限定 .diagram-container（mermaid + puml）
document.querySelectorAll('.diagram-container').forEach(el => {
  el.addEventListener('click', () => {
    const clone = el.cloneNode(true);
    zoomContent.innerHTML = '';
    zoomContent.appendChild(clone);
    lbReset();
    lightbox.classList.add('active');
    if (window.mermaid) mermaid.run({ nodes: zoomContent.querySelectorAll('.mermaid:not([data-processed])') });
  });
});

// ─── Client-side Search ───────────────────────────
let searchData = null;
async function initSearch() {
  try {
    const res = await fetch('search-data.json');
    if (res.ok) searchData = await res.json();
  } catch {}
}

const searchInput = document.querySelector('.search-input');
const searchResultsEl = document.querySelector('.search-results');

searchInput?.addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  if (!q || !searchData || !searchResultsEl) {
    if (searchResultsEl) searchResultsEl.style.display = 'none';
    return;
  }
  const hits = Object.values(searchData)
    .filter(d => d.title.toLowerCase().includes(q) || d.excerpt.toLowerCase().includes(q))
    .slice(0, 8);
  if (!hits.length) { searchResultsEl.style.display = 'none'; return; }
  searchResultsEl.innerHTML = hits.map(d =>
    `<a class="search-result-item" href="${d.url}">
      <div class="search-result-item__title">${d.title}</div>
      <div class="search-result-item__excerpt">${d.excerpt.slice(0,80)}…</div>
    </a>`).join('');
  searchResultsEl.style.display = 'block';
});

document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap') && searchResultsEl) {
    searchResultsEl.style.display = 'none';
  }
});

initSearch();

// ─── Sidebar Toggle & Resize ──────────────────
const sidebarToggle = document.getElementById('sidebarToggle');
const pageWrapper   = document.querySelector('.page-wrapper');
const sidebarEl     = document.querySelector('.sidebar');
const resizerEl     = document.getElementById('sidebarResizer');

if (localStorage.getItem('sidebar-collapsed') === 'true') {
  pageWrapper?.classList.add('sidebar-collapsed');
}
const savedW = localStorage.getItem('sidebar-width');
if (savedW) document.documentElement.style.setProperty('--sidebar-w', savedW);

sidebarToggle?.addEventListener('click', () => {
  const collapsed = pageWrapper.classList.toggle('sidebar-collapsed');
  localStorage.setItem('sidebar-collapsed', collapsed);
});

if (resizerEl && pageWrapper && sidebarEl) {
  let startX, startW;
  resizerEl.addEventListener('mousedown', e => {
    startX = e.clientX;
    startW = sidebarEl.offsetWidth;
    resizerEl.classList.add('dragging');
    document.body.style.cssText += 'user-select:none;cursor:col-resize;';
    const move = e => {
      const w = Math.max(140, Math.min(520, startW + e.clientX - startX));
      document.documentElement.style.setProperty('--sidebar-w', w + 'px');
    };
    const up = () => {
      resizerEl.classList.remove('dragging');
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      const w = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-w').trim();
      localStorage.setItem('sidebar-width', w);
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });
}
