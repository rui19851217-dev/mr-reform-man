const STORAGE_KEY = 'mr-reform-customers';

function loadCustomers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCustomers(customers) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add('hidden'), 2500);
}

let searchQuery = '';

function renderTable() {
  const customers = loadCustomers();
  const tbody = document.getElementById('customer-list');
  const emptyState = document.getElementById('empty-state');
  const table = document.getElementById('customer-table');
  const countEl = document.getElementById('customer-count');

  const filtered = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.address.toLowerCase().includes(q);
  });

  countEl.textContent = `${filtered.length} 件 / 全 ${customers.length} 件`;

  if (filtered.length === 0) {
    table.classList.add('hidden');
    emptyState.classList.remove('hidden');
    emptyState.querySelector('p').textContent = customers.length === 0
      ? '顧客が登録されていません'
      : '検索条件に一致する顧客がいません';
    return;
  }

  table.classList.remove('hidden');
  emptyState.classList.add('hidden');

  tbody.innerHTML = filtered.map(c => `
    <tr>
      <td>${escape(c.name)}</td>
      <td>${escape(c.phone)}</td>
      <td>${escape(c.address)}</td>
      <td>${formatDate(c.createdAt)}</td>
      <td>
        <div class="actions">
          <button class="btn-edit" onclick="startEdit('${c.id}')">編集</button>
          <button class="btn-delete" onclick="deleteCustomer('${c.id}')">削除</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function escape(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function resetForm() {
  document.getElementById('customer-form').reset();
  document.getElementById('edit-id').value = '';
  document.getElementById('form-title').textContent = '顧客を追加';
  document.getElementById('submit-btn').textContent = '追加する';
  document.getElementById('cancel-btn').classList.add('hidden');
}

function startEdit(id) {
  const customers = loadCustomers();
  const c = customers.find(x => x.id === id);
  if (!c) return;

  document.getElementById('edit-id').value = c.id;
  document.getElementById('name').value = c.name;
  document.getElementById('phone').value = c.phone;
  document.getElementById('address').value = c.address;
  document.getElementById('form-title').textContent = '顧客を編集';
  document.getElementById('submit-btn').textContent = '更新する';
  document.getElementById('cancel-btn').classList.remove('hidden');

  document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
}

function deleteCustomer(id) {
  if (!confirm('この顧客を削除しますか？')) return;
  const customers = loadCustomers().filter(c => c.id !== id);
  saveCustomers(customers);
  renderTable();
  showToast('顧客を削除しました');
}

document.getElementById('customer-form').addEventListener('submit', e => {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const address = document.getElementById('address').value.trim();
  const editId = document.getElementById('edit-id').value;

  if (!name || !phone || !address) return;

  const customers = loadCustomers();

  if (editId) {
    const idx = customers.findIndex(c => c.id === editId);
    if (idx !== -1) {
      customers[idx] = { ...customers[idx], name, phone, address };
    }
    saveCustomers(customers);
    showToast('顧客情報を更新しました');
  } else {
    customers.push({ id: generateId(), name, phone, address, createdAt: new Date().toISOString() });
    saveCustomers(customers);
    showToast('顧客を追加しました');
  }

  resetForm();
  renderTable();
});

document.getElementById('cancel-btn').addEventListener('click', resetForm);

document.getElementById('search').addEventListener('input', e => {
  searchQuery = e.target.value;
  renderTable();
});

renderTable();
