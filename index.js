
  const COLORS = [
    { name: 'none',   strip: 'transparent', bg: '#faf7f2' },
    { name: 'red',    strip: '#c0392b',      bg: '#fff5f5' },
    { name: 'blue',   strip: '#2980b9',      bg: '#f0f7ff' },
    { name: 'green',  strip: '#27ae60',      bg: '#f0fff5' },
    { name: 'yellow', strip: '#f39c12',      bg: '#fffcf0' },
    { name: 'purple', strip: '#8e44ad',      bg: '#faf0ff' },
  ];

  let selectedColor = 'none';
  let notes = JSON.parse(localStorage.getItem('notenest_notes') || '[]');
  let nextId = parseInt(localStorage.getItem('notenest_id') || '1');
  let searchQuery = '';
  let sortMode = 'newest';

  // Build color dots
  const dotsWrap = document.getElementById('color-dots');
  COLORS.forEach(c => {
    const dot = document.createElement('div');
    dot.className = 'color-dot' + (c.name === 'none' ? ' selected' : '');
    dot.style.background = c.name === 'none' ? '#ddd8cc' : c.strip;
    dot.title = c.name;
    dot.onclick = () => {
      selectedColor = c.name;
      document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
      dot.classList.add('selected');
    };
    dotsWrap.appendChild(dot);
  });

  function save() {
    localStorage.setItem('notenest_notes', JSON.stringify(notes));
    localStorage.setItem('notenest_id', nextId.toString());
  }

  function saveNote() {
    const title = document.getElementById('new-title').value.trim();
    const body  = document.getElementById('new-body').value.trim();
    if (!title && !body) { showToast('⚠️ Title அல்லது content எழுது!'); return; }

    const note = {
      id: nextId++,
      title: title || 'Untitled',
      body,
      color: selectedColor,
      pinned: false,
      createdAt: Date.now()
    };
    notes.unshift(note);
    save();

    document.getElementById('new-title').value = '';
    document.getElementById('new-body').value = '';
    selectedColor = 'none';
    document.querySelectorAll('.color-dot').forEach((d,i) => d.classList.toggle('selected', i===0));

    renderNotes();
    showToast('📝 Note saved!');
  }

  function deleteNote(id) {
    notes = notes.filter(n => n.id !== id);
    save();
    renderNotes();
    showToast('🗑️ Note deleted!');
  }

  function togglePin(id) {
    const n = notes.find(n => n.id === id);
    if (n) { n.pinned = !n.pinned; save(); renderNotes(); showToast(n.pinned ? '📌 Pinned!' : '📌 Unpinned!'); }
  }

  function highlight(text, query) {
    if (!query) return escapeHtml(text);
    const escaped = escapeHtml(text);
    const re = new RegExp('(' + escapeRe(query) + ')', 'gi');
    return escaped.replace(re, '<mark>$1</mark>');
  }

  function escapeHtml(t) {
    return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  }

  function formatDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'2-digit' }) +
           ' ' + d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
  }

  function getSorted(arr) {
    const a = [...arr];
    if (sortMode === 'newest')  return a.sort((x,y) => y.createdAt - x.createdAt);
    if (sortMode === 'oldest')  return a.sort((x,y) => x.createdAt - y.createdAt);
    if (sortMode === 'az')      return a.sort((x,y) => x.title.localeCompare(y.title));
    if (sortMode === 'pinned')  return a.sort((x,y) => (y.pinned?1:0) - (x.pinned?1:0));
    return a;
  }

  function makeCard(note) {
    const colorObj = COLORS.find(c => c.name === note.color) || COLORS[0];
    const div = document.createElement('div');
    div.className = 'note-card' + (note.pinned ? ' pinned' : '');
    div.style.background = colorObj.bg;
    div.style.setProperty('--strip-color', colorObj.strip);

    div.innerHTML = `
      ${note.pinned ? '<div class="pin-flag">📌 Pinned</div>' : ''}
      <div class="note-card-title">${highlight(note.title, searchQuery)}</div>
      <div class="note-card-body">${highlight(note.body || '', searchQuery)}</div>
      <div class="note-card-footer">
        <span class="note-date">${formatDate(note.createdAt)}</span>
        <div class="note-actions">
          <button class="icon-btn pin-btn ${note.pinned?'active':''}" onclick="togglePin(${note.id})" title="${note.pinned?'Unpin':'Pin'}">📌</button>
          <button class="icon-btn del-btn" onclick="deleteNote(${note.id})" title="Delete">🗑️</button>
        </div>
      </div>
    `;
    return div;
  }

  function renderNotes() {
    const query = searchQuery.toLowerCase();
    const filtered = notes.filter(n => {
      return n.title.toLowerCase().includes(query) || (n.body||'').toLowerCase().includes(query);
    });

    const sorted = getSorted(filtered);
    const pinned = sorted.filter(n => n.pinned);
    const rest   = sorted.filter(n => !n.pinned);

    // Pinned section
    const pinnedSection = document.getElementById('pinned-section');
    const pinnedGrid = document.getElementById('pinned-grid');
    pinnedGrid.innerHTML = '';
    if (pinned.length > 0) {
      pinnedSection.style.display = 'block';
      pinned.forEach(n => pinnedGrid.appendChild(makeCard(n)));
    } else {
      pinnedSection.style.display = 'none';
    }

    // All notes
    const grid = document.getElementById('notes-grid');
    const empty = document.getElementById('empty-state');
    grid.innerHTML = '';

    const allLabel = document.getElementById('all-label');
    allLabel.style.display = rest.length === 0 && pinned.length > 0 ? 'none' : 'flex';

    if (rest.length === 0 && pinned.length === 0) {
      empty.style.display = 'block';
      grid.appendChild(empty);
    } else {
      empty.style.display = 'none';
      rest.forEach(n => grid.appendChild(makeCard(n)));
    }

    // Badge
    const total = filtered.length;
    document.getElementById('count-badge').textContent =
      total + ' note' + (total !== 1 ? 's' : '') + (searchQuery ? ' found' : '');
  }

  // Events
  document.getElementById('search-input').addEventListener('input', e => {
    searchQuery = e.target.value.trim();
    renderNotes();
  });

  document.getElementById('sort-select').addEventListener('change', e => {
    sortMode = e.target.value;
    renderNotes();
  });

  document.getElementById('new-body').addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'Enter') saveNote();
  });

  function showToast(msg) {
    const c = document.getElementById('toast-container');
    const d = document.createElement('div');
    d.className = 'toast-msg';
    d.textContent = msg;
    c.appendChild(d);
    setTimeout(() => d.remove(), 2600);
  }

  renderNotes();