let isNavigating = false;

/* частицы */
const canvas = document.getElementById('bgCanvas');
const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
let particles = [], mouse = {x: window.innerWidth/2, y: window.innerHeight/2};

function resize() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

if (ctx) {
  for (let i=0;i<60;i++){
    particles.push({
      x: Math.random()*canvas.width,
      y: Math.random()*canvas.height,
      r: Math.random()*2 + 0.6,
      dx: (Math.random()-0.5)*0.25,
      dy: (Math.random()-0.5)*0.25,
      alpha: 0.25 + Math.random()*0.7
    });
  }
  (function loop(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for (const p of particles){
      const px = (mouse.x / canvas.width - 0.5) * 10 * (p.r/2);
      const py = (mouse.y / canvas.height - 0.5) * 10 * (p.r/2);
      ctx.beginPath();
      ctx.fillStyle = `rgba(0,234,255,${p.alpha})`;
      ctx.shadowBlur = 6;
      ctx.shadowColor = 'rgba(0,234,255,0.9)';
      ctx.arc(p.x+px, p.y+py, p.r, 0, Math.PI*2);
      ctx.fill();
      p.x += p.dx; p.y += p.dy;
      if (p.x < -30) p.x = canvas.width + 30;
      if (p.x > canvas.width + 30) p.x = -30;
      if (p.y < -30) p.y = canvas.height + 30;
      if (p.y > canvas.height + 30) p.y = -30;
    }
    requestAnimationFrame(loop);
  })();
}

document.addEventListener('mousemove', e => {
  mouse.x = e.clientX; mouse.y = e.clientY;
});

const observer = new IntersectionObserver(entries => {
  entries.forEach(en => { if (en.isIntersecting) en.target.classList.add('visible'); });
}, { threshold: 0.15 });
document.querySelectorAll('.section').forEach(s => observer.observe(s));

/* анимка */
document.querySelectorAll('a').forEach(a=>{
  const href = a.getAttribute('href') || '';
  if (href.endsWith('.html')) {
    a.addEventListener('click', e=>{
      if (href.startsWith('http') || href.startsWith('#')) return;
      e.preventDefault();
      const overlay = document.querySelector('.page-transition');
      if (!overlay) { window.location.href = href; return; }
      overlay.classList.remove('hidden');
      setTimeout(()=> window.location.href = href, 420);
    });
  }
});
window.addEventListener('load', ()=> {
  const overlay = document.querySelector('.page-transition');
  if (overlay) setTimeout(()=> overlay.classList.add('hidden'), 180);
});

// УПРОЩЕННАЯ ПРОВЕРКА 404 (без fetch)
function checkPageExists() {
  // Только для несуществующих страниц
  const allowedPages = ['index.html', 'profile.html', '404.html', 'about.html', 'contact.html'];
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  
  if (!allowedPages.includes(currentPage) && currentPage !== '') {
    window.location.href = '404.html';
  }
}

// Запускаем проверку
setTimeout(checkPageExists, 500);

function showToast(text, type='success') {
  const t = document.createElement('div');
  t.className = 'toast ' + (type === 'error' ? 'error' : 'success');
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(()=> t.classList.add('show'), 40);
  setTimeout(()=> { t.classList.remove('show'); setTimeout(()=> t.remove(), 300); }, 3600);
}

// ЛОКАЛЬНОЕ ХРАНИЛИЩЕ
function hashSimple(s) {
  let h=2166136261;
  for(let i=0;i<s.length;i++) h = (h ^ s.charCodeAt(i)) * 16777619 >>> 0;
  return h.toString(16);
}

function loadUsers() { 
  return JSON.parse(localStorage.getItem('np_users') || '{}'); 
}

function saveUsers(u) { 
  localStorage.setItem('np_users', JSON.stringify(u)); 
}

function setSession(email) { 
  localStorage.setItem('np_session', email); 
}

function clearSession() { 
  localStorage.removeItem('np_session'); 
}

function getSession() { 
  return localStorage.getItem('np_session') || null; 
}

function openAuthModal(mode='login') {
  const modal = document.createElement('div'); 
  modal.className = 'auth-modal';
  modal.innerHTML = `
    <div class="auth-modal-inner">
      <button class="auth-close">✕</button>
      <h3>${mode === 'login' ? 'Вход' : 'Регистрация'}</h3>
      <form id="auth-form">
        ${mode === 'register' ? '<input id="auth-name" type="text" placeholder="Ваше имя" required />' : ''}
        <input id="auth-email" type="email" placeholder="E-mail" required />
        <input id="auth-pass" type="password" placeholder="Пароль" required />
        <div style="display:flex;gap:8px;justify-content:space-between;margin-top:6px;">
          <button class="btn" type="submit">${mode === 'login' ? 'Войти' : 'Зарегистрироваться'}</button>
          <button class="btn ghost" id="switch-auth" type="button">${mode === 'login' ? 'Регистрация' : 'Вход'}</button>
        </div>
      </form>
    </div>`;
  
  document.body.appendChild(modal);
  
  modal.querySelector('.auth-close').addEventListener('click', ()=> modal.remove());
  modal.querySelector('#switch-auth').addEventListener('click', ()=> { 
    modal.remove(); 
    openAuthModal(mode === 'login' ? 'register' : 'login'); 
  });

  modal.querySelector('#auth-form').addEventListener('submit', e => {
    e.preventDefault();
    const email = (modal.querySelector('#auth-email').value || '').trim().toLowerCase();
    const pass = modal.querySelector('#auth-pass').value || '';
    const nameField = modal.querySelector('#auth-name');
    const name = nameField ? (nameField.value || '').trim() : '';
    
    if (!email || !pass || (nameField && !name)) { 
      showToast('Заполните все поля','error'); 
      return; 
    }

    const users = loadUsers();
    
    if (mode === 'register') {
      if (users[email]) { 
        showToast('Email уже используется','error'); 
        return; 
      }
      
      users[email] = { 
        name, 
        email, 
        passHash: hashSimple(pass), 
        avatar: null, 
        requests: [] 
      };
      
      saveUsers(users);
      setSession(email);
      showToast('Регистрация прошла успешно','success');
      modal.remove();
      setTimeout(()=> location.href = 'profile.html', 500);
    } else {
      if (!users[email]) { 
        showToast('Пользователь не найден','error'); 
        return; 
      }
      
      if (users[email].passHash !== hashSimple(pass)) { 
        showToast('Неверный пароль','error'); 
        return; 
      }
      
      setSession(email);
      showToast('Вход выполнен','success');
      modal.remove();
      setTimeout(()=> location.href = 'profile.html', 400);
    }
  });
}

function renderProfile() {
  const session = getSession();
  const nameEl = document.getElementById('username');
  const emailEl = document.getElementById('user-email');
  const avatarEl = document.getElementById('avatar-img');
  const historyList = document.getElementById('history-list');

  if (!session) {
    if (nameEl) nameEl.textContent = 'Гость';
    if (emailEl) emailEl.textContent = 'Не авторизован';
    if (avatarEl) avatarEl.src = 'https://cdn-images.dzcdn.net/images/artist/c115cb1165e9a94a7df329b88bf33cc5/1900x1900-000000-81-0-0.jpg';
    if (historyList) historyList.innerHTML = `<li class="muted">Нет данных — войдите в аккаунт</li>`;
    document.getElementById('logout-btn').style.display = 'none';
    document.getElementById('edit-profile').style.display = 'none';
    return;
  }

  const users = loadUsers();
  const user = users[session];
  if (!user) { 
    clearSession(); 
    location.reload(); 
    return; 
  }

  if (nameEl) nameEl.textContent = user.name || 'Пользователь';
  if (emailEl) emailEl.textContent = user.email || '';
  if (avatarEl) avatarEl.src = user.avatar || avatarEl.src;
  document.getElementById('logout-btn').style.display = 'inline-block';
  document.getElementById('edit-profile').style.display = 'inline-block';

  if (historyList) {
    historyList.innerHTML = '';
    const arr = user.requests || [];
    if (!arr.length) {
      historyList.innerHTML = `<li class="muted">История пуста</li>`;
    } else {
      for (const it of arr) {
        const li = document.createElement('li');
        li.textContent = `${it.date} — ${it.message.slice(0,80)}`;
        historyList.appendChild(li);
      }
    }
  }
}

function openEditProfile() {
  const session = getSession();
  if (!session) { openAuthModal('login'); return; }
  
  const users = loadUsers(); 
  const user = users[session];

  const modal = document.createElement('div'); 
  modal.className='auth-modal';
  modal.innerHTML = `<div class="auth-modal-inner">
    <button class="auth-close">✕</button>
    <h3>Редактировать профиль</h3>
    <form id="edit-form">
      <input id="edit-name" type="text" placeholder="Имя" value="${user.name || ''}" />
      <input id="edit-avatar" type="file" accept="image/*" />
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
        <button class="btn" type="submit">Сохранить</button>
        <button class="btn ghost" id="cancel-edit" type="button">Отмена</button>
      </div>
    </form>
  </div>`;
  
  document.body.appendChild(modal);
  modal.querySelector('.auth-close').addEventListener('click', ()=> modal.remove());
  modal.querySelector('#cancel-edit').addEventListener('click', ()=> modal.remove());

  modal.querySelector('#edit-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = modal.querySelector('#edit-name').value.trim();
    const fileInput = modal.querySelector('#edit-avatar');
    
    if (fileInput.files && fileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = function(ev){
        user.avatar = ev.target.result;
        user.name = name || user.name;
        users[session] = user; 
        saveUsers(users);
        showToast('Профиль обновлён','success'); 
        modal.remove(); 
        renderProfile();
      };
      reader.readAsDataURL(fileInput.files[0]);
    } else {
      user.name = name || user.name;
      users[session] = user; 
      saveUsers(users);
      showToast('Имя обновлено','success'); 
      modal.remove(); 
      renderProfile();
    }
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  document.querySelectorAll('.profile-icon').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const session = getSession();
      if (session) { location.href = 'profile.html'; return; }
      openAuthModal('login');
    });
  });

  const regBtn = document.getElementById('open-register');
  if (regBtn) regBtn.addEventListener('click', ()=> openAuthModal('register'));

  const toReg = document.getElementById('to-register');
  if (toReg) toReg.addEventListener('click', ()=> openAuthModal('login'));

  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', e => {
      e.preventDefault();
      const name = (contactForm.querySelector('#name') || {}).value || '';
      const email = (contactForm.querySelector('#email') || {}).value || '';
      const message = (contactForm.querySelector('#message') || {}).value || '';
      
      if (!name.trim() || !email.trim() || !message.trim()) { 
        showToast('Заполните все поля','error'); 
        return; 
      }

      const session = getSession();
      if (session) {
        const users = loadUsers();
        const user = users[session];
        if (user) {
          user.requests = user.requests || [];
          user.requests.unshift({ 
            date: (new Date()).toLocaleString(), 
            message 
          });
          saveUsers(users);
        }
      } else {
        const reqs = JSON.parse(localStorage.getItem('np_requests') || '[]');
        reqs.unshift({ 
          date: (new Date()).toLocaleString(), 
          name, 
          email, 
          message 
        });
        localStorage.setItem('np_requests', JSON.stringify(reqs));
      }
      
      showToast('Сообщение отправлено','success');
      contactForm.reset();
      setTimeout(()=> { if (session) location.href = 'profile.html'; }, 600);
    });
  }

  if (location.pathname.endsWith('profile.html')) {
    renderProfile();
    document.getElementById('login-open')?.addEventListener('click', ()=> openAuthModal('login'));
    document.getElementById('logout-btn')?.addEventListener('click', ()=> {
      clearSession(); 
      showToast('Вы вышли','success'); 
      setTimeout(()=> location.reload(), 400);
    });
    document.getElementById('edit-profile')?.addEventListener('click', ()=> openEditProfile());
  }
});

document.addEventListener('click', e => {
  const faq = e.target.closest('.faq-item');
  if (faq) faq.classList.toggle('open');
});