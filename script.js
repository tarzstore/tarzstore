
/* ===== script block lines 3600-5520 ===== */
'use strict';

/* ── BANNER ASSET (Neon Noir) ── */
var BANNER_ASSET = {
  video: 'https://xxaenbqyeliyhrulyjuz.supabase.co/storage/v1/object/public/Videos/Thamnel.mp4',
  poster: 'https://xxaenbqyeliyhrulyjuz.supabase.co/storage/v1/object/public/Videos/my.jpg'
};

function setBannerAssets(){
  // Video baru di-load & diputar SETELAH halaman selesai render (window 'load'),
  // supaya poster image (ringan) yang jadi elemen LCP, bukan file video (berat).
  // Ini mencegah LCP jadi lambat tanpa harus buang fitur video sama sekali.
  const video = document.querySelector('.banner-video');
  if(!video) return;

  function loadAndPlayVideo(){
    if(video.getAttribute('src') === BANNER_ASSET.video) return;
    video.setAttribute('preload', 'auto');
    video.setAttribute('src', BANNER_ASSET.video);
    video.setAttribute('autoplay', '');
    video.load();
    video.play().catch(function(){ /* autoplay bisa diblokir browser, abaikan */ });
  }

  if(document.readyState === 'complete'){
    loadAndPlayVideo();
  } else {
    window.addEventListener('load', loadAndPlayVideo, { once:true });
  }
}

function initTheme(){
  setBannerAssets();
}

/* Toast kecil buat notifikasi; no-op elegan kalau container tidak ada */
function showToast(msg){
  try{
    let toast = document.getElementById('tarzToast');
    if(!toast){
      toast = document.createElement('div');
      toast.id = 'tarzToast';
      toast.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(20px);background:var(--card,#161616);color:var(--text,#f2f2f5);border:1px solid var(--border-strong,rgba(255,255,255,.1));padding:10px 18px;border-radius:999px;font-size:.85rem;font-family:inherit;z-index:99999;opacity:0;transition:opacity .3s ease,transform .3s ease;pointer-events:none;box-shadow:0 8px 24px rgba(0,0,0,.4);';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    requestAnimationFrame(function(){
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(function(){
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
    }, 2200);
  }catch(e){}
}

document.addEventListener('DOMContentLoaded', initTheme);

/* ── SIDE MENU (HAMBURGER) ── */
function toggleSideMenu(){
  const menu = document.getElementById('sideMenu');
  if(menu && menu.classList.contains('show')) closeSideMenu();
  else openSideMenu();
}
function openSideMenu(){
  const menu = document.getElementById('sideMenu');
  const overlay = document.getElementById('sideMenuOverlay');
  const btn = document.getElementById('hamburgerBtn');
  if(!menu || !overlay || !btn) return;
  menu.classList.add('show');
  overlay.classList.add('show');
  menu.setAttribute('aria-hidden','false');
  btn.setAttribute('aria-expanded','true');
  document.body.classList.add('side-menu-open');
}
function closeSideMenu(){
  const menu = document.getElementById('sideMenu');
  const overlay = document.getElementById('sideMenuOverlay');
  const btn = document.getElementById('hamburgerBtn');
  if(!menu || !overlay || !btn) return;
  menu.classList.remove('show');
  overlay.classList.remove('show');
  menu.setAttribute('aria-hidden','true');
  btn.setAttribute('aria-expanded','false');
  document.body.classList.remove('side-menu-open');
}
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape') closeSideMenu();
});

/* ── DROPDOWN SUBMENU DI SIDEBAR (mis: "Upload Produk" -> Upload Produk + Key Generate) ──
   Dianimasikan lewat JS (bukan max-height CSS statis) supaya transisi buka/tutup
   selalu mulus: height diukur dari scrollHeight konten asli, bukan angka tebakan. */
function toggleSideMenuDropdown(submenuId, toggleBtn){
  const submenu = document.getElementById(submenuId);
  if(!submenu || !toggleBtn) return;
  const isOpen = submenu.classList.contains('open');

  if(isOpen){
    // Tutup: set height eksplisit ke tinggi saat ini dulu, lalu ke 0 (biar transisi jalan)
    submenu.style.height = submenu.scrollHeight + 'px';
    submenu.offsetHeight; // force reflow
    requestAnimationFrame(()=>{
      submenu.style.height = '0px';
    });
    submenu.classList.remove('open');
    toggleBtn.classList.remove('open');
    toggleBtn.setAttribute('aria-expanded','false');
  } else {
    // Buka: animasikan dari 0 ke tinggi konten asli
    submenu.classList.add('open');
    toggleBtn.classList.add('open');
    toggleBtn.setAttribute('aria-expanded','true');
    submenu.style.height = submenu.scrollHeight + 'px';
  }

  // Setelah transisi selesai membuka, lepas height fixed jadi 'auto'
  // supaya kalau konten berubah ukuran (mis. resize layar) tetap pas.
  submenu.addEventListener('transitionend', function onEnd(e){
    if(e.propertyName !== 'height') return;
    submenu.removeEventListener('transitionend', onEnd);
    if(submenu.classList.contains('open')){
      submenu.style.height = 'auto';
    }
  });
}

/* ── TAB INDICATOR ── */
function updateIndicator(btn){
  const ind = document.getElementById('tabIndicator');
  const container = document.getElementById('tabsContainer');
  const r = btn.getBoundingClientRect();
  const cr = container.getBoundingClientRect();
  ind.style.left = (r.left - cr.left) + 'px';
  ind.style.width = r.width + 'px';
}
requestAnimationFrame(()=>{
  const active = document.querySelector('.tab-btn.active');
  if(active) updateIndicator(active);
});

/* ── TABS — with ARIA & keyboard support ── */
const tabBtns = document.querySelectorAll('.tab-btn');
function activateTab(btn, opts){
  opts = opts || {};
  const prevBtn = document.querySelector('.tab-btn.active');
  if(prevBtn && prevBtn !== btn){ prevBtn.classList.remove('active'); prevBtn.setAttribute('aria-selected','false'); }
  const prevActive = document.querySelector('.tab-content.active');
  if(prevActive) prevActive.classList.remove('active');
  btn.classList.add('active');
  btn.setAttribute('aria-selected','true');
  const target = document.getElementById(btn.dataset.tab);
  target.classList.add('active');
  /* updateIndicator dipindah ke rAF: memisahkan "baca layout"
     (getBoundingClientRect) dari perubahan class di atas supaya browser
     tidak dipaksa melakukan forced synchronous layout/reflow di frame
     yang sama — ini penyebab tersendat saat pindah tab.
     Kalau dipanggil dari sidebar (skipIndicator), ukuran di sini DISKIP
     karena pill .tabs masih animasi scale/opacity balik dari
     side-menu-open — ngukur sekarang bakal dapat geometri yang salah
     lalu "lompat" lagi begitu remeasure asli selesai. Cukup satu
     pengukuran final saja, dari switchTabFromSideMenu. */
  if(!opts.skipIndicator){
    requestAnimationFrame(()=>updateIndicator(btn));
  }
  /* Otomatis geser balik ke paling atas halaman tiap ganti tab, supaya
     user tidak "kejauhan" scroll-nya waktu pindah ke tab lain. */
  window.scrollTo({top:0, behavior:'smooth'});
}
/* Dipanggil dari link sidebar. Beda dengan klik tab biasa: di sini
   pill "Dynamic Island" (.tabs) sendiri sedang animasi scale/opacity
   balik dari state side-menu-open (durasi --t-mid = 320ms). Kalau
   updateIndicator langsung diukur di rAF berikutnya (~16ms), geometrinya
   masih transisi → pill nyangkut/lompat ke posisi yang salah dulu baru
   benar. Jadi di sini kita SKIP pengukuran langsung dan tunggu transisi
   kontainer .tabs selesai dulu baru ukur ulang, sekali saja. */
function switchTabFromSideMenu(tabId){
  const btn = document.getElementById(tabId);
  if(btn) activateTab(btn, {skipIndicator:true});
  closeSideMenu();
  const container = document.getElementById('tabsContainer');
  let done = false;
  const remeasure = ()=>{
    if(done) return;
    done = true;
    const a = document.querySelector('.tab-btn.active');
    if(a) updateIndicator(a);
  };
  if(container){
    const onEnd = (e)=>{
      if(e.target !== container) return;
      container.removeEventListener('transitionend', onEnd);
      remeasure();
    };
    container.addEventListener('transitionend', onEnd);
    // fallback jika transitionend tidak terpicu (mis. reduced-motion)
    setTimeout(remeasure, 360);
  } else {
    setTimeout(remeasure, 360);
  }
}
tabBtns.forEach((btn, idx)=>{
  btn.addEventListener('click', ()=>{
    if(btn.classList.contains('active')) return;
    activateTab(btn);
  });
  /* keyboard: arrow kiri/kanan untuk navigasi antar tab */
  btn.addEventListener('keydown', e=>{
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
      e.preventDefault();
      const dir = e.key==='ArrowRight' ? 1 : -1;
      const next = tabBtns[(idx + dir + tabBtns.length) % tabBtns.length];
      next.focus();
      next.click();
    }
  });
});

let _rt;
window.addEventListener('resize', ()=>{
  clearTimeout(_rt);
  _rt = setTimeout(()=>{ const a = document.querySelector('.tab-btn.active'); if(a) updateIndicator(a); }, 150);
}, {passive:true});

/* ── INTERSECTION OBSERVER ──
   Hanya untuk toggle ribbon shine (in-view) berdasar visibilitas kartu,
   supaya CPU/GPU tidak terus dipakai animasi ribbon yang sedang tidak
   terlihat sama sekali. Reveal-on-scroll (.visible) sudah dihapus karena
   jadi penyebab scroll terasa patah saat observer telat trigger. */
const io = new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    e.target.classList.toggle('in-view', e.isIntersecting);
  });
}, {threshold:0, rootMargin:'200px 0px 200px 0px'});
document.querySelectorAll('.card').forEach(c=> io.observe(c));

/* ── PAUSE BANNER VIDEO SAAT DI LUAR LAYAR ──
   Video autoplay+loop yang terus decode di background adalah salah satu
   penyebab terbesar scroll terasa patah-patah/berat di HP, karena GPU/CPU
   tetap sibuk decode frame walau video sudah nggak kelihatan. Pause saat
   keluar viewport, play lagi saat balik terlihat. Aman dipanggil walau
   video belum punya src (masih preload="none" sebelum window 'load'). */
(function(){
  const bv = document.querySelector('.banner-video');
  if(!bv) return;
  const vio = new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        if(bv.getAttribute('src')) bv.play().catch(()=>{});
      } else {
        bv.pause();
      }
    });
  }, {threshold:0.1});
  vio.observe(bv);
})();

/* ── STAT COUNTER ── */
function countUp(el){
  const target = +el.dataset.count, suffix = el.dataset.suffix||'', dur=1000, t0=performance.now();
  (function tick(now){
    const p=Math.min((now-t0)/dur,1), ease=1-Math.pow(1-p,3);
    el.textContent=Math.round(ease*target)+suffix;
    if(p<1) requestAnimationFrame(tick);
  })(t0);
}
const statIO = new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(!e.isIntersecting) return;
    const el = e.target;
    statIO.unobserve(el);
    (window.requestIdleCallback || requestAnimationFrame)(()=>countUp(el));
  });
},{threshold:.5});
document.querySelectorAll('[data-count]').forEach(el=>statIO.observe(el));

/* ── TOAST — no reflow ── */
let _toastTimer = null;
function showToast(msg, type=''){
  const toast = document.getElementById('toast');
  if(!toast) return;
  toast.textContent = msg;
  toast.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(()=>{ toast.classList.remove('show'); }, 2600);
}

/* ── MODAL STATE ── */
let _currentProduct = '';
let _selectedPackage = null;
let _isClosed = false;
let _specialMode = null;

/* ── CONFIG.JSON (link download) ──
   Semua link MediaFire kini disimpan di config.json, bukan di index.html.
   Untuk mengganti link, cukup edit config.json (key = nama produk / <h4>). */
let _appConfig = null;
let _configLoadFailed = false;

async function loadConfig(){
  try{
    const res = await fetch('config.json', {cache:'no-store'});
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if(!data || typeof data.downloads !== 'object'){
      throw new Error('Format config.json tidak valid (field "downloads" tidak ditemukan)');
    }
    /* Gabungkan dengan _appConfig yang mungkin sudah ada (misal sudah diisi
       lebih dulu oleh produk Supabase), bukan menimpa total, supaya urutan
       selesainya loadConfig() vs loadDbProducts() tidak saling menghapus data. */
    const prev = _appConfig || {};
    _appConfig = {
      ...data,
      downloads: { ...(data.downloads||{}), ...(prev.downloads||{}) },
      copyKeys: { ...(data.copyKeys||{}), ...(prev.copyKeys||{}) },
      getKeyLinks: { ...(data.getKeyLinks||{}), ...(prev.getKeyLinks||{}) }
    };
    _configLoadFailed = false;
  }catch(err){
    _configLoadFailed = true;
    console.error('Gagal memuat config.json:', err);
  }
}

/* Ambil link download untuk sebuah produk (dari config.json ATAU produk Supabase panel admin).
   _configLoadFailed hanya dicek sebagai fallback terakhir, bukan penghalang di awal,
   supaya produk Supabase (yang datanya sudah ada di _appConfig.downloads meski config.json gagal) tetap jalan. */
function getDownloadLink(productName){
  if(_appConfig && _appConfig.downloads && _appConfig.downloads[productName]){
    return _appConfig.downloads[productName];
  }
  if(_configLoadFailed){
    console.error('config.json gagal dimuat, link download tidak tersedia.');
  } else {
    console.error('Link download untuk produk "' + productName + '" belum tersedia.');
  }
  return '#';
}


/* Ambil "copy key" (kode proxy/config) untuk sebuah produk (config.json ATAU Supabase) */
function getProductCopyKey(productName){
  if(!_appConfig || !_appConfig.copyKeys) return null;
  return _appConfig.copyKeys[productName] || null;
}

/* Ambil label tampilan custom untuk "Key" (fallback ke "Key" kalau tidak diisi) */
function getProductKeyLabel(productName){
  if(_appConfig && _appConfig.keyLabels && _appConfig.keyLabels[productName]) return _appConfig.keyLabels[productName];
  return 'Key';
}

/* Ambil "user" (opsional, terpisah dari Key) untuk sebuah produk (Supabase) */
function getProductUserField(productName){
  if(!_appConfig || !_appConfig.userFields) return null;
  return _appConfig.userFields[productName] || null;
}

/* Ambil label tampilan custom untuk "User" (fallback ke "User" kalau tidak diisi) */
function getProductUserLabel(productName){
  if(_appConfig && _appConfig.userLabels && _appConfig.userLabels[productName]) return _appConfig.userLabels[productName];
  return 'User';
}

/* Ambil link GET KEY eksternal untuk sebuah produk (config.json ATAU Supabase) */
function getProductKeyLink(productName){
  if(!_appConfig || !_appConfig.getKeyLinks) return null;
  return _appConfig.getKeyLinks[productName] || null;
}

/* Ambil info akun (username/password) untuk sebuah produk dari config.json (null jika tidak ada) */
function getProductAccountInfo(productName){
  if(_configLoadFailed || !_appConfig || !_appConfig.accountInfo) return null;
  return _appConfig.accountInfo[productName] || null;
}

/* Ambil link Mediafire kedua "APK FREE FIRE" untuk sebuah produk (Supabase, opsional) */
function getProductFreefireLink(productName){
  if(!_appConfig || !_appConfig.freefireLinks) return null;
  return _appConfig.freefireLinks[productName] || null;
}

/* ── LABEL PRODUK (OPEN / CLOSE / UPDATE) ──
   Diatur lewat config.json → "productStatus": { "NAMA PRODUK": "close" | "update" | "open" }.
   - close  : label CLOSE, tombol install/buy dinonaktifkan.
   - update : label UPDATE, tombol tetap aktif (produk masih bisa diinstall).
   - open   : tanpa label (default jika tidak diset di config.json). */
function getProductStatus(productName){
  if(_configLoadFailed || !_appConfig || !_appConfig.productStatus) return null;
  return _appConfig.productStatus[productName] || null;
}

function renderProductStatuses(){
  document.querySelectorAll('#cheat .card').forEach(card=>{
    const h4 = card.querySelector('h4');
    if(!h4) return;
    const productName = h4.textContent.trim();
    const status = getProductStatus(productName);

    if(!status || status === 'open'){
      card.removeAttribute('data-status');
      const label = card.querySelector('.platform-label, .price-label');
      if(label) label.remove();
      return;
    }

    card.dataset.status = status;

    let label = card.querySelector('.platform-label');
    if(!label){
      const imgWrap = card.querySelector('.product-image');
      if(!imgWrap) return;
      label = document.createElement('span');
      imgWrap.insertBefore(label, imgWrap.firstChild);
    }
    label.className = 'platform-label ' + (card.dataset.platform || '');
    label.textContent = status === 'close' ? 'CLOSE' : 'UPDATE';
  });
}

/* Salin copy-key produk ke clipboard + tampilkan feedback pada tombol/toast */
function copyProductKeyInline(productName, btnEl){
  const key = getProductCopyKey(productName);
  if(!key) return;
  copyTextInline(key, btnEl);
}

/* Salin teks generik ke clipboard + tampilkan feedback pada tombol/toast */
function copyTextInline(text, btnEl){
  const done = () => {
    if(btnEl){
      const label = btnEl.querySelector('.copykey-btn-text');
      if(label){
        const original = label.textContent;
        label.textContent = 'Tersalin!';
        setTimeout(()=>{ label.textContent = original; }, 1800);
      }
    }
  };

  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done).catch(()=>{});
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try{ document.execCommand('copy'); done(); }
    catch(e){}
    document.body.removeChild(ta);
  }
}

/* Ambil icon SVG dari config.json (key = "downloadApk" / "buyKey"), fallback ke emoji jika belum siap */
function getIcon(iconKey, fallbackEmoji){
  if(_configLoadFailed || !_appConfig || !_appConfig.icons || !_appConfig.icons[iconKey]){
    return fallbackEmoji || '';
  }
  return _appConfig.icons[iconKey];
}

/* Isi semua placeholder <span class="js-icon" data-icon-key="..."> di HTML statis dengan SVG dari config.json */
function renderStaticIcons(){
  document.querySelectorAll('.js-icon[data-icon-key]').forEach(el => {
    const key = el.getAttribute('data-icon-key');
    el.innerHTML = getIcon(key, '');
  });
}

/* Muat config.json sesegera mungkin saat halaman dibuka, lalu render semua icon statis */
loadConfig().then(()=>{ renderStaticIcons(); renderProductStatuses(); });

const platformLabel = {android:'Android · No Root', ios:'iOS', pc:'Android · Root'};
const platformClass = {android:'android', ios:'ios', pc:'pc'};

function openModal(btn){
  const card = btn.closest('.card');
  const d = card.dataset;
  const productName = card.querySelector('h4').textContent.trim();
  let packages;
  try { packages = JSON.parse(d.packages || '[]'); } catch(e){ packages=[]; }

  _currentProduct = productName;
  _selectedPackage = packages[0] || null;
  _isClosed = d.status === 'close';
  _specialMode = d.special || null;

  const iconEl = document.getElementById('modalIcon');
  document.getElementById('modalHeader').style.display = '';
  iconEl.style.display = '';
  iconEl.classList.remove('modal-header-icon-lg');
  if(d.img){
    iconEl.innerHTML = `<img src="${d.img}" alt="${productName}" width="64" height="64" loading="lazy" decoding="async" onerror="this.style.display='none';this.parentElement.textContent='${(d.icon||'').replace(/'/g,"\\'")}'" >`;
  } else {
    iconEl.textContent = d.icon || '';
  }
  document.getElementById('modalProductName').textContent = productName;
  document.getElementById('modalProductDesc').textContent = d.desc || '';

  const badgeWrap = document.getElementById('modalBadges');
  badgeWrap.innerHTML = '';
  if(d.platform && platformLabel[d.platform]){
    const b = document.createElement('span');
    b.className = 'modal-badge ' + platformClass[d.platform];
    b.textContent = platformLabel[d.platform];
    badgeWrap.appendChild(b);
  }
  if(d.status && d.status !== 'open'){
    const s = document.createElement('span');
    s.className = 'modal-badge status-' + d.status;
    s.textContent = d.status === 'close' ? 'CLOSE' : 'UPDATE';
    badgeWrap.appendChild(s);
  }

  const grid = document.getElementById('priceOptions');
  const featureGrid = document.getElementById('featureOptions');
  const sectionLabel = document.getElementById('modalSectionLabel');
  const footer = document.getElementById('modalFooter');
  grid.innerHTML = '';
  featureGrid.innerHTML = '';

  if(_specialMode === 'bloodstrike'){
    /* ── MODE SPESIAL: 2 fitur (APK Mediafire + Buy Key WA), bukan paket harga ── */
    grid.style.display = 'none';
    featureGrid.style.display = 'flex';
    sectionLabel.textContent = 'Pilih Layanan';
    footer.style.display = 'none';

    const apkOpt = document.createElement('div');
    apkOpt.className = 'feature-opt';
    apkOpt.setAttribute('role','button');
    apkOpt.setAttribute('tabindex','0');
    apkOpt.innerHTML = `
      <div class="feature-icon">${getIcon('downloadApk','')}</div>
      <div class="feature-text">
        <div class="feature-title">APK CHEAT</div>
        <div class="feature-desc">DOWNLOAD APLIKASI CHEAT</div>
      </div>
      <span class="feature-arrow">${getIcon('featureArrow','')}</span>
    `;
    const goOpenKeyBs = () => openKeyModal(productName, getDownloadLink(productName), 'cheat');
    apkOpt.addEventListener('click', goOpenKeyBs);
    apkOpt.addEventListener('keydown', e=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); goOpenKeyBs(); } });
    featureGrid.appendChild(apkOpt);

    /* ── SALIN KEY (khusus produk yang punya copyKey di config.json, tampil di bawah APK CHEAT) ── */
    const copyKeyBs = getProductCopyKey(productName);
    if(copyKeyBs){
      const copyKeyWrapBs = document.createElement('div');
      copyKeyWrapBs.className = 'inline-copykey-wrap';
      const keyLabelBs = getProductKeyLabel(productName);
      copyKeyWrapBs.innerHTML = `
        <div class="inline-copykey-label">${String(keyLabelBs).replace(/</g,'&lt;')}</div>
        <div class="inline-copykey-row">
          <span class="inline-copykey-value">${String(copyKeyBs).replace(/</g,'&lt;')}</span>
          <button type="button" class="inline-copykey-btn" aria-label="Salin ${String(keyLabelBs).replace(/"/g,'&quot;')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span class="copykey-btn-text">Salin</span>
          </button>
        </div>
      `;
      copyKeyWrapBs.querySelector('.inline-copykey-btn').addEventListener('click', (e) => {
        copyProductKeyInline(productName, e.currentTarget);
      });
      featureGrid.appendChild(copyKeyWrapBs);
    }

    /* ── USER (opsional, terpisah dari Key, tampil di bawah Key) ── */
    const userFieldBs = getProductUserField(productName);
    if(userFieldBs){
      const userWrapBs = document.createElement('div');
      userWrapBs.className = 'inline-copykey-wrap';
      const userLabelBs = getProductUserLabel(productName);
      userWrapBs.innerHTML = `
        <div class="inline-copykey-label">${String(userLabelBs).replace(/</g,'&lt;')}</div>
        <div class="inline-copykey-row">
          <span class="inline-copykey-value">${String(userFieldBs).replace(/</g,'&lt;')}</span>
          <button type="button" class="inline-copykey-btn" aria-label="Salin ${String(userLabelBs).replace(/"/g,'&quot;')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span class="copykey-btn-text">Salin</span>
          </button>
        </div>
      `;
      userWrapBs.querySelector('.inline-copykey-btn').addEventListener('click', (e) => {
        copyTextInline(userFieldBs, e.currentTarget);
      });
      featureGrid.appendChild(userWrapBs);
    }

    /* ── AKUN (username/password) khusus produk yang punya accountInfo, tampil di bawah APK CHEAT ── */
    const accountBs = getProductAccountInfo(productName);
    if(accountBs){
      const accountWrapBs = document.createElement('div');
      accountWrapBs.className = 'inline-copykey-wrap';
      accountWrapBs.innerHTML = `
        <div class="inline-copykey-label">Username</div>
        <div class="inline-copykey-row" style="margin-bottom:12px;">
          <span class="inline-copykey-value">${String(accountBs.username||'').replace(/</g,'&lt;')}</span>
          <button type="button" class="inline-copykey-btn" data-field="username" aria-label="Salin Username">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span class="copykey-btn-text">Salin</span>
          </button>
        </div>
        <div class="inline-copykey-label">Password</div>
        <div class="inline-copykey-row">
          <span class="inline-copykey-value">${String(accountBs.password||'').replace(/</g,'&lt;')}</span>
          <button type="button" class="inline-copykey-btn" data-field="password" aria-label="Salin Password">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span class="copykey-btn-text">Salin</span>
          </button>
        </div>
      `;
      accountWrapBs.querySelectorAll('.inline-copykey-btn').forEach(btn=>{
        btn.addEventListener('click', (e) => {
          const field = e.currentTarget.getAttribute('data-field');
          copyTextInline(accountBs[field] || '', e.currentTarget);
        });
      });
      featureGrid.appendChild(accountWrapBs);
    }

    /* ── LIST FITUR (khusus mode special, tampil di bawah Buy Key) ── */
    let fiturList = [];
    try { fiturList = JSON.parse(d.fitur || '[]'); } catch(e){ fiturList = []; }
    if(fiturList.length){
      const fiturWrap = document.createElement('div');
      fiturWrap.className = 'fitur-list-wrap';
      const chips = fiturList.map(f => `
        <div class="fitur-chip">
          <span class="fitur-chip-dot" aria-hidden="true"></span>
          <span class="fitur-chip-label">${String(f).replace(/</g,'&lt;')}</span>
        </div>
      `).join('');
      fiturWrap.innerHTML = `
        <div class="fitur-list-head">
          <div class="fitur-list-head-icon"><svg width="15" height="15" viewBox="0 0 24 24"><path fill="currentColor" d="M13.8 22H5c-1.7 0-3-1.3-3-3v-1h11.1c-.1.3-.1.7-.1 1c0 1.1.3 2.1.8 3m0-6H5V5c0-1.7 1.3-3 3-3h11c1.7 0 3 1.3 3 3v1h-2V5c0-.6-.4-1-1-1s-1 .4-1 1v8.1c-1.8.3-3.3 1.4-4.2 2.9M8 8h7V6H8zm0 4h6v-2H8zm9 4v6l5-3z"/></svg></div>
          <div class="fitur-list-head-text">List Fitur</div>
          <div class="fitur-list-count">${fiturList.length} Fitur</div>
        </div>
        <div class="fitur-chip-grid">${chips}</div>
      `;
      featureGrid.appendChild(fiturWrap);
    }

    /* ── POSTER PREVIEW 3:2 (khusus mode special, tampil di bawah List Fitur) ── */
    if(d.poster){
      const posterWrap = document.createElement('div');
      posterWrap.className = 'poster-preview-wrap';
      posterWrap.innerHTML = `
        <div class="poster-preview-frame">
          <img src="${d.poster}" alt="Preview ${productName}" loading="lazy" decoding="async" onerror="this.closest('.poster-preview-wrap').style.display='none'">
        </div>
      `;
      featureGrid.appendChild(posterWrap);
    }

  } else if(_specialMode === 'aincrad'){
    /* ── MODE SPESIAL AINCRAD: 3 fitur (APK Client + Get Key eksternal + Get Password WA) ── */
    grid.style.display = 'none';
    featureGrid.style.display = 'flex';
    sectionLabel.textContent = 'Pilih Layanan';
    footer.style.display = 'none';

    const apkOpt = document.createElement('div');
    apkOpt.className = 'feature-opt';
    apkOpt.setAttribute('role','button');
    apkOpt.setAttribute('tabindex','0');
    apkOpt.innerHTML = `
      <div class="feature-icon">${getIcon('downloadApk','')}</div>
      <div class="feature-text">
        <div class="feature-title">APK CHEAT</div>
        <div class="feature-desc">DOWNLOAD APLIKASI CHEAT</div>
      </div>
      <span class="feature-arrow">${getIcon('featureArrow','')}</span>
    `;
    const goOpenKeyAc = () => openKeyModal(productName, getDownloadLink(productName), 'cheat');
    apkOpt.addEventListener('click', goOpenKeyAc);
    apkOpt.addEventListener('keydown', e=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); goOpenKeyAc(); } });
    featureGrid.appendChild(apkOpt);

    /* ── APK FREE FIRE (link Mediafire kedua, opsional, tampil tepat di bawah APK CHEAT) ── */
    const ffLinkAc = getProductFreefireLink(productName);
    if(ffLinkAc){
      const ffOptAc = document.createElement('div');
      ffOptAc.className = 'feature-opt';
      ffOptAc.setAttribute('role','button');
      ffOptAc.setAttribute('tabindex','0');
      ffOptAc.innerHTML = `
        <div class="feature-icon">${getIcon('downloadApk','')}</div>
        <div class="feature-text">
          <div class="feature-title">APK FREE FIRE</div>
          <div class="feature-desc">DOWNLOAD APLIKASI FREE FIRE</div>
        </div>
        <span class="feature-arrow">${getIcon('featureArrow','')}</span>
      `;
      const goOpenFfAc = () => openKeyModal(productName, ffLinkAc, 'cheat');
      ffOptAc.addEventListener('click', goOpenFfAc);
      ffOptAc.addEventListener('keydown', e=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); goOpenFfAc(); } });
      featureGrid.appendChild(ffOptAc);
    }

    const getKeyOpt = document.createElement('a');
    getKeyOpt.className = 'feature-opt';
    const keyLinkAc = getProductKeyLink(productName);
    if(keyLinkAc){
      getKeyOpt.href = keyLinkAc;
      getKeyOpt.target = '_blank';
      getKeyOpt.rel = 'noopener noreferrer';
      getKeyOpt.innerHTML = `
        <div class="feature-icon">${getIcon('buyKey','')}</div>
        <div class="feature-text">
          <div class="feature-title">GET KEY</div>
          <div class="feature-desc">AMBIL KEY UNTUK MEMBUKA CHEAT</div>
        </div>
        <span class="feature-arrow">${getIcon('featureArrow','')}</span>
      `;
      featureGrid.appendChild(getKeyOpt);
    }

    /* ── SALIN KEY (khusus produk yang punya copyKey, tampil di bawah APK CHEAT / GET KEY) ── */
    const copyKeyAc = getProductCopyKey(productName);
    if(copyKeyAc){
      const copyKeyWrapAc = document.createElement('div');
      copyKeyWrapAc.className = 'inline-copykey-wrap';
      const keyLabelAc = getProductKeyLabel(productName);
      copyKeyWrapAc.innerHTML = `
        <div class="inline-copykey-label">${String(keyLabelAc).replace(/</g,'&lt;')}</div>
        <div class="inline-copykey-row">
          <span class="inline-copykey-value">${String(copyKeyAc).replace(/</g,'&lt;')}</span>
          <button type="button" class="inline-copykey-btn" aria-label="Salin ${String(keyLabelAc).replace(/"/g,'&quot;')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span class="copykey-btn-text">Salin</span>
          </button>
        </div>
      `;
      copyKeyWrapAc.querySelector('.inline-copykey-btn').addEventListener('click', (e) => {
        copyProductKeyInline(productName, e.currentTarget);
      });
      featureGrid.appendChild(copyKeyWrapAc);
    }

    /* ── USER (opsional, terpisah dari Key, tampil di bawah Key) ── */
    const userFieldAc = getProductUserField(productName);
    if(userFieldAc){
      const userWrapAc = document.createElement('div');
      userWrapAc.className = 'inline-copykey-wrap';
      const userLabelAc = getProductUserLabel(productName);
      userWrapAc.innerHTML = `
        <div class="inline-copykey-label">${String(userLabelAc).replace(/</g,'&lt;')}</div>
        <div class="inline-copykey-row">
          <span class="inline-copykey-value">${String(userFieldAc).replace(/</g,'&lt;')}</span>
          <button type="button" class="inline-copykey-btn" aria-label="Salin ${String(userLabelAc).replace(/"/g,'&quot;')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span class="copykey-btn-text">Salin</span>
          </button>
        </div>
      `;
      userWrapAc.querySelector('.inline-copykey-btn').addEventListener('click', (e) => {
        copyTextInline(userFieldAc, e.currentTarget);
      });
      featureGrid.appendChild(userWrapAc);
    }

    /* ── LIST FITUR (khusus mode special, tampil di bawah fitur layanan) ── */
    let fiturListAc = [];
    try { fiturListAc = JSON.parse(d.fitur || '[]'); } catch(e){ fiturListAc = []; }
    if(fiturListAc.length){
      const fiturWrap = document.createElement('div');
      fiturWrap.className = 'fitur-list-wrap';
      const chips = fiturListAc.map(f => `
        <div class="fitur-chip">
          <span class="fitur-chip-dot" aria-hidden="true"></span>
          <span class="fitur-chip-label">${String(f).replace(/</g,'&lt;')}</span>
        </div>
      `).join('');
      fiturWrap.innerHTML = `
        <div class="fitur-list-head">
          <div class="fitur-list-head-icon"><svg width="15" height="15" viewBox="0 0 24 24"><path fill="currentColor" d="M13.8 22H5c-1.7 0-3-1.3-3-3v-1h11.1c-.1.3-.1.7-.1 1c0 1.1.3 2.1.8 3m0-6H5V5c0-1.7 1.3-3 3-3h11c1.7 0 3 1.3 3 3v1h-2V5c0-.6-.4-1-1-1s-1 .4-1 1v8.1c-1.8.3-3.3 1.4-4.2 2.9M8 8h7V6H8zm0 4h6v-2H8zm9 4v6l5-3z"/></svg></div>
          <div class="fitur-list-head-text">List Fitur</div>
        </div>
        <div class="fitur-chip-grid">${chips}</div>
      `;
      featureGrid.appendChild(fiturWrap);
    }

    /* ── NOTE (opsional, tampil di bawah List Fitur) ── */
    if(d.note){
      const noteWrap = document.createElement('div');
      noteWrap.className = 'note-wrap';
      noteWrap.innerHTML = `
        <div class="note-head">
          <div class="note-head-icon"><svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8"/></svg></div>
          <div class="note-head-text">Note</div>
        </div>
        <div class="note-body">${String(d.note).replace(/</g,'&lt;')}</div>
      `;
      featureGrid.appendChild(noteWrap);
    }

    /* ── POSTER PREVIEW 3:2 (khusus mode special, tampil di bawah List Fitur) ── */
    if(d.poster){
      const posterWrap = document.createElement('div');
      posterWrap.className = 'poster-preview-wrap';
      posterWrap.innerHTML = `
        <div class="poster-preview-frame">
          <img src="${d.poster}" alt="Preview ${productName}" loading="lazy" decoding="async" onerror="this.closest('.poster-preview-wrap').style.display='none'">
        </div>
      `;
      featureGrid.appendChild(posterWrap);
    }

  } else if(_specialMode === 'aincrad-nokey'){
    /* ── MODE SPESIAL AINCRAD TANPA GET KEY: 2 fitur (APK Client + Get Password WA) ── */
    grid.style.display = 'none';
    featureGrid.style.display = 'flex';
    sectionLabel.textContent = 'Pilih Layanan';
    footer.style.display = 'none';

    const apkOptNk = document.createElement('div');
    apkOptNk.className = 'feature-opt';
    apkOptNk.setAttribute('role','button');
    apkOptNk.setAttribute('tabindex','0');
    apkOptNk.innerHTML = `
      <div class="feature-icon">${getIcon('downloadApk','')}</div>
      <div class="feature-text">
        <div class="feature-title">APK CHEAT</div>
        <div class="feature-desc">DOWNLOAD APLIKASI CHEAT</div>
      </div>
      <span class="feature-arrow">${getIcon('featureArrow','')}</span>
    `;
    const goOpenKeyNk = () => openKeyModal(productName, getDownloadLink(productName), 'cheat');
    apkOptNk.addEventListener('click', goOpenKeyNk);
    apkOptNk.addEventListener('keydown', e=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); goOpenKeyNk(); } });
    featureGrid.appendChild(apkOptNk);

    /* ── APK FREE FIRE (link Mediafire kedua, opsional, tampil tepat di bawah APK CHEAT) ── */
    const ffLinkNk = getProductFreefireLink(productName);
    if(ffLinkNk){
      const ffOptNk = document.createElement('div');
      ffOptNk.className = 'feature-opt';
      ffOptNk.setAttribute('role','button');
      ffOptNk.setAttribute('tabindex','0');
      ffOptNk.innerHTML = `
        <div class="feature-icon">${getIcon('downloadApk','')}</div>
        <div class="feature-text">
          <div class="feature-title">APK FREE FIRE</div>
          <div class="feature-desc">DOWNLOAD APLIKASI FREE FIRE</div>
        </div>
        <span class="feature-arrow">${getIcon('featureArrow','')}</span>
      `;
      const goOpenFfNk = () => openKeyModal(productName, ffLinkNk, 'cheat');
      ffOptNk.addEventListener('click', goOpenFfNk);
      ffOptNk.addEventListener('keydown', e=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); goOpenFfNk(); } });
      featureGrid.appendChild(ffOptNk);
    }

    /* ── SALIN KEY (khusus produk yang punya copyKey di config.json, tampil di bawah APK CHEAT) ── */
    const copyKeyNk = getProductCopyKey(productName);
    if(copyKeyNk){
      const copyKeyWrapNk = document.createElement('div');
      copyKeyWrapNk.className = 'inline-copykey-wrap';
      const keyLabelNk = getProductKeyLabel(productName);
      copyKeyWrapNk.innerHTML = `
        <div class="inline-copykey-label">${String(keyLabelNk).replace(/</g,'&lt;')}</div>
        <div class="inline-copykey-row">
          <span class="inline-copykey-value">${String(copyKeyNk).replace(/</g,'&lt;')}</span>
          <button type="button" class="inline-copykey-btn" aria-label="Salin ${String(keyLabelNk).replace(/"/g,'&quot;')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span class="copykey-btn-text">Salin</span>
          </button>
        </div>
      `;
      copyKeyWrapNk.querySelector('.inline-copykey-btn').addEventListener('click', (e) => {
        copyProductKeyInline(productName, e.currentTarget);
      });
      featureGrid.appendChild(copyKeyWrapNk);
    }

    /* ── USER (opsional, terpisah dari Key, tampil di bawah Key) ── */
    const userFieldNk = getProductUserField(productName);
    if(userFieldNk){
      const userWrapNk = document.createElement('div');
      userWrapNk.className = 'inline-copykey-wrap';
      const userLabelNk = getProductUserLabel(productName);
      userWrapNk.innerHTML = `
        <div class="inline-copykey-label">${String(userLabelNk).replace(/</g,'&lt;')}</div>
        <div class="inline-copykey-row">
          <span class="inline-copykey-value">${String(userFieldNk).replace(/</g,'&lt;')}</span>
          <button type="button" class="inline-copykey-btn" aria-label="Salin ${String(userLabelNk).replace(/"/g,'&quot;')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span class="copykey-btn-text">Salin</span>
          </button>
        </div>
      `;
      userWrapNk.querySelector('.inline-copykey-btn').addEventListener('click', (e) => {
        copyTextInline(userFieldNk, e.currentTarget);
      });
      featureGrid.appendChild(userWrapNk);
    }

    /* ── LIST FITUR (khusus mode special, tampil di bawah fitur layanan) ── */
    let fiturListAcNk = [];
    try { fiturListAcNk = JSON.parse(d.fitur || '[]'); } catch(e){ fiturListAcNk = []; }
    if(fiturListAcNk.length){
      const fiturWrapNk = document.createElement('div');
      fiturWrapNk.className = 'fitur-list-wrap';
      const chipsNk = fiturListAcNk.map(f => `
        <div class="fitur-chip">
          <span class="fitur-chip-dot" aria-hidden="true"></span>
          <span class="fitur-chip-label">${String(f).replace(/</g,'&lt;')}</span>
        </div>
      `).join('');
      fiturWrapNk.innerHTML = `
        <div class="fitur-list-head">
          <div class="fitur-list-head-icon"><svg width="15" height="15" viewBox="0 0 24 24"><path fill="currentColor" d="M13.8 22H5c-1.7 0-3-1.3-3-3v-1h11.1c-.1.3-.1.7-.1 1c0 1.1.3 2.1.8 3m0-6H5V5c0-1.7 1.3-3 3-3h11c1.7 0 3 1.3 3 3v1h-2V5c0-.6-.4-1-1-1s-1 .4-1 1v8.1c-1.8.3-3.3 1.4-4.2 2.9M8 8h7V6H8zm0 4h6v-2H8zm9 4v6l5-3z"/></svg></div>
          <div class="fitur-list-head-text">List Fitur</div>
        </div>
        <div class="fitur-chip-grid">${chipsNk}</div>
      `;
      featureGrid.appendChild(fiturWrapNk);
    }

    /* ── NOTE (opsional, tampil di bawah List Fitur) ── */
    if(d.note){
      const noteWrapNk = document.createElement('div');
      noteWrapNk.className = 'note-wrap';
      noteWrapNk.innerHTML = `
        <div class="note-head">
          <div class="note-head-icon"><svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8"/></svg></div>
          <div class="note-head-text">Note</div>
        </div>
        <div class="note-body">${String(d.note).replace(/</g,'&lt;')}</div>
      `;
      featureGrid.appendChild(noteWrapNk);
    }

    /* ── POSTER PREVIEW 3:2 (khusus mode special, tampil di bawah List Fitur) ── */
    if(d.poster){
      const posterWrapNk = document.createElement('div');
      posterWrapNk.className = 'poster-preview-wrap';
      posterWrapNk.innerHTML = `
        <div class="poster-preview-frame">
          <img src="${d.poster}" alt="Preview ${productName}" loading="lazy" decoding="async" onerror="this.closest('.poster-preview-wrap').style.display='none'">
        </div>
      `;
      featureGrid.appendChild(posterWrapNk);
    }

  } else if(_specialMode === 'configff-empty'){
    /* ── MODE SPESIAL CONFIG FF: KOSONG total, terpisah dari mode lain.
       Logo ditampilkan besar (mengikuti foto premium), nama produk
       disembunyikan di popup, badge/label/footer tetap disembunyikan
       — supaya tidak ikut mengubah tampilan modal produk
       FREE FIRE / ALL GAME yang lain. Tombol X (tutup) tetap tampil normal. ── */
    grid.style.display = 'none';
    featureGrid.style.display = 'flex';
    sectionLabel.textContent = '';
    footer.style.display = 'none';
    badgeWrap.innerHTML = '';
    document.getElementById('modalProductName').textContent = '';
    document.getElementById('modalHeader').style.display = 'none';
    iconEl.classList.remove('modal-header-icon-lg');
    iconEl.innerHTML = '';
    iconEl.textContent = '';
    iconEl.style.display = 'none';

    /* ── DUA FOTO SEBARIS (2:3) + PANAH KANAN: Original -> Premium ── */
    if(d.posterOriginal && d.posterPremium){
      const dualWrapCf = document.createElement('div');
      dualWrapCf.className = 'dual-poster-wrap';
      dualWrapCf.innerHTML = `
        <div class="dual-poster-col">
          <div class="dual-poster-label">SEBELUM</div>
          <div class="dual-poster-frame">
            <img src="${d.posterOriginal}" alt="Original" loading="lazy" decoding="async" onerror="this.closest('.dual-poster-frame').style.display='none'">
          </div>
        </div>
        <div class="dual-poster-arrow" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14m0 0l-6-6m6 6l-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div class="dual-poster-col">
          <div class="dual-poster-label">SESUDAH</div>
          <div class="dual-poster-frame">
            <img src="${d.posterPremium}" alt="Premium" loading="lazy" decoding="async" onerror="this.closest('.dual-poster-frame').style.display='none'">
          </div>
        </div>
      `;
      featureGrid.appendChild(dualWrapCf);
    }

    /* ── TOMBOL DOWNLOAD CONFIG & TUTORIAL PASANG (mode CONFIG FF) ──
       Sama seperti produk lain: harus JOIN VIP dulu (lewat openKeyModal)
       sebelum link download/tutorial dibuka. ── */
    const cfBtnRow = document.createElement('div');
    cfBtnRow.className = 'configff-btn-row';

    const dlConfigOpt = document.createElement('button');
    dlConfigOpt.type = 'button';
    dlConfigOpt.className = 'simple-btn simple-btn-download';
    dlConfigOpt.innerHTML = `
      <span class="simple-btn-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5M5 19h14" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      Download Config
    `;
    dlConfigOpt.addEventListener('click', () => {
      openKeyModal(productName, d.configDownloadLink || '', 'cheat');
    });
    cfBtnRow.appendChild(dlConfigOpt);

    const tutorialOpt = document.createElement('button');
    tutorialOpt.type = 'button';
    tutorialOpt.className = 'simple-btn simple-btn-tutorial';
    tutorialOpt.innerHTML = `
      <span class="simple-btn-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H17l3 3v11.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8 11h8M8 15h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span>
      Tutorial Pasang
    `;
    tutorialOpt.addEventListener('click', () => {
      // Link tutorial pasang CONFIG FF permanen (sama untuk semua config, tidak diisi lewat admin)
      openKeyModal(productName, 'https://www.mediafire.com/file/jgd1w82c4b77qxa/Tutorial_Pasang_Config.mp4/file', 'cheat');
    });
    cfBtnRow.appendChild(tutorialOpt);

    featureGrid.appendChild(cfBtnRow);

  } else {
    /* ── MODE NORMAL: pilihan paket harga ── */
    grid.style.display = 'grid';
    featureGrid.style.display = 'none';
    sectionLabel.textContent = 'Pilih Paket Harga';
    footer.style.display = 'flex';
    grid.style.gridTemplateColumns = packages.length === 1 ? '1fr' : 'repeat(2,1fr)';

    packages.forEach((pkg, i) => {
      const el = document.createElement('div');
      el.className = 'price-opt' + (i === 0 ? ' selected' : '');
      el.setAttribute('role','button');
      el.setAttribute('tabindex','0');
      el.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      el.setAttribute('aria-label', pkg.name + ' — ' + pkg.price);
      el.innerHTML = `
        <div class="price-opt-check" aria-hidden="true">${getIcon('checkmark','')}</div>
        <div class="price-opt-duration">${pkg.name}</div>
        <div class="price-opt-amount">${pkg.price}</div>
      `;
      const selectPkg = () => {
        grid.querySelectorAll('.price-opt').forEach(o => {
          o.classList.remove('selected');
          o.setAttribute('aria-pressed','false');
        });
        el.classList.add('selected');
        el.setAttribute('aria-pressed','true');
        _selectedPackage = pkg;
      };
      el.addEventListener('click', selectPkg);
      el.addEventListener('keydown', e=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); selectPkg(); } });
      grid.appendChild(el);
    });

    const cta = document.getElementById('modalCta');
    if(_isClosed){
      cta.disabled = true;
      cta.setAttribute('aria-disabled','true');
      cta.style.cssText = 'opacity:.35;cursor:not-allowed;pointer-events:none;background:rgba(60,60,80,.6);box-shadow:none;';
      cta.innerHTML = 'Produk Sedang CLOSE';
    } else {
      cta.disabled = false;
      cta.removeAttribute('aria-disabled');
      cta.style.cssText = '';
      cta.innerHTML = getIcon('buyBtn','') + ' Beli Sekarang';
    }
  }

  const overlay = document.getElementById('modalOverlay');
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden','false');
  document.body.style.overflow = 'hidden';
  /* focus trap — fokus ke tombol close */
  setTimeout(()=>{ document.querySelector('.modal-close')?.focus(); }, 50);
}

function closeModal(){
  const overlay = document.getElementById('modalOverlay');
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden','true');
  document.body.style.overflow = '';
}

function handleOverlayClick(e){
  /* Klik area luar modal produk sengaja tidak menutup modal -- hanya tombol X yang boleh. */
}

function buyNow(){
  if(_isClosed){ return; }
  if(!_selectedPackage){ return; }
  const msg = `Halo Tarz Store! Saya mau order:\n\n*Produk:* ${_currentProduct}\n*Paket:* ${_selectedPackage.name} — ${_selectedPackage.price}\n\nMohon diproses ya, terima kasih`;
  setTimeout(()=>{ closeModal(); window.open('https://wa.me/6281918665183?text='+encodeURIComponent(msg),'_blank','noopener,noreferrer'); }, 550);
}

/* ══════════════════════════════════════════
   VIP SYSTEM — 1 key VIP membuka SEMUA produk selamanya di device ini.
   Key bersifat sekali pakai secara global (divalidasi & "dihanguskan"
   oleh backend Google Apps Script begitu terpakai).
   ══════════════════════════════════════════ */
let _keyProduct = '';
let _keyDownloadLink = '#';
let _keySourceTab = null;

const VIP_WA_NUMBER = '6281918665183';
const VIP_PRICE_TEXT = 'RP 10.000';

/* cek apakah device ini sudah VIP (berlaku untuk SEMUA produk).
   Ada 2 mode: permanen (tarz_vip='true', tanpa batas waktu) dan
   trial (tarz_vip_expiry=timestamp, otomatis terkunci lagi setelah lewat). */
function isVipUnlocked(){
  try {
    if(localStorage.getItem('tarz_vip') === 'true') return true;

    const expiry = localStorage.getItem('tarz_vip_expiry');
    if(expiry){
      if(Date.now() < Number(expiry)){
        return true;
      } else {
        /* trial habis -> bersihkan supaya kembali terkunci */
        localStorage.removeItem('tarz_vip_expiry');
        return false;
      }
    }
    return false;
  } catch(e){ return false; }
}

/* akses permanen (key VIP biasa) */
function markVipUnlocked(){
  try {
    localStorage.setItem('tarz_vip', 'true');
    localStorage.removeItem('tarz_vip_expiry');
  } catch(e){ /* localStorage tidak tersedia, abaikan */ }
}

/* akses trial: berlaku sampai waktu tertentu (expiryTimestampMs), lalu otomatis terkunci lagi */
function markVipUnlockedTrial(expiryTimestampMs){
  try {
    localStorage.setItem('tarz_vip_expiry', String(expiryTimestampMs));
  } catch(e){ /* localStorage tidak tersedia, abaikan */ }
}

let _vipHeaderInterval = null;

/* format sisa waktu jadi teks singkat: "3j 12m", "45m 10d", "8d" dst */
function formatCountdown(ms){
  if(ms <= 0) return '0d';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if(h > 0) return h + 'j ' + m + 'm';
  if(m > 0) return m + 'm ' + s + 'd';
  return s + 'd';
}

/* update badge "VIP Rp10.000" di atas grid produk cheat sesuai status device saat ini:
   - belum VIP        -> tampilan normal "VIP Rp10.000"
   - VIP permanen      -> "VIP UNLOCK" / "kamu bisa akses semua cheat sekarang"
   - VIP trial aktif   -> "TRIAL VIP 2j 30m" (real-time countdown) / "kamu bisa akses semua cheat sekarang"
   - trial baru habis  -> otomatis balik ke tampilan normal */
function refreshVipHeaderBadge(){
  const pairs = [
    { titleEl: document.getElementById('vipHeaderTitle'), descEl: document.getElementById('vipHeaderDesc'), scope: 'cheat' }
  ].filter(p => p.titleEl && p.descEl);
  if(!pairs.length) return;

  if(_vipHeaderInterval){ clearInterval(_vipHeaderInterval); _vipHeaderInterval = null; }

  let isPermanent = false;
  let expiry = null;
  try {
    isPermanent = localStorage.getItem('tarz_vip') === 'true';
    const expiryRaw = localStorage.getItem('tarz_vip_expiry');
    expiry = expiryRaw ? Number(expiryRaw) : null;
  } catch(e){}

  const descFor = (scope) => scope === 'file' ? 'KAMU BISA AKSES SEMUA FILE HS SEKARANG' : 'KAMU BISA AKSES SEMUA CHEAT SEKARANG';
  const defaultDescFor = (scope) => scope === 'file' ? 'JOIN <b>VIP</b> AGAR BISA AKSES SEMUA CHEAT' : 'JOIN <b>VIP</b> AGAR BISA AKSES SEMUA CHEAT';

  if(isPermanent){
    pairs.forEach(p => {
      p.titleEl.innerHTML = 'MEMBER VIP';
      p.descEl.innerHTML = descFor(p.scope);
    });
    return;
  }

  if(expiry && Date.now() < expiry){
    /* Set desc & wrapper span sekali saja (innerHTML mahal jika diulang tiap detik).
       Countdown-nya sendiri lalu di-update tiap detik lewat textContent pada satu
       <span> kecil saja -> jauh lebih ringan daripada innerHTML seluruh judul tiap tick. */
    pairs.forEach(p => {
      p.titleEl.innerHTML = 'TRIAL VIP <span class="vip-countdown"></span>';
      p.descEl.innerHTML = descFor(p.scope);
    });
    const countdownEls = pairs.map(p => p.titleEl.querySelector('.vip-countdown'));

    const tick = () => {
      const remain = expiry - Date.now();
      if(remain <= 0){
        /* trial baru saja habis -> otomatis kembali normal, tanpa perlu reload halaman */
        clearInterval(_vipHeaderInterval);
        _vipHeaderInterval = null;
        try { localStorage.removeItem('tarz_vip_expiry'); } catch(e){}
        refreshVipHeaderBadge();
        return;
      }
      const label = formatCountdown(remain);
      countdownEls.forEach(el => { if(el) el.textContent = label; });
    };
    tick();
    /* Jangan tick saat tab tidak aktif (background tab) -> hemat CPU/baterai,
       lanjut update begitu tab dibuka lagi supaya angka tetap akurat. */
    _vipHeaderInterval = setInterval(() => {
      if(document.hidden) return;
      tick();
    }, 1000);
    document.addEventListener('visibilitychange', () => {
      if(!document.hidden && _vipHeaderInterval) tick();
    });
    return;
  }

  /* default: belum VIP sama sekali (atau trial sudah lama habis) */
  pairs.forEach(p => {
    p.titleEl.innerHTML = 'VIP <span>' + VIP_PRICE_TEXT + '</span>';
    p.descEl.innerHTML = defaultDescFor(p.scope);
  });
}

function downloadUnlockedProduct(){
  closeKeyModal();
  if(_keyDownloadLink && !_keyDownloadLink.endsWith('#')){
    window.open(_keyDownloadLink,'_blank','noopener,noreferrer');
  } else {
    showToast('Link download belum tersedia.','error');
  }
}

/* dipanggil dari tombol download tiap produk.
   kalau device sudah VIP -> langsung download, tanpa modal/key sama sekali.
   kalau belum VIP -> tampilkan modal ajakan join VIP. */
function openKeyModal(productName, downloadLink, sourceTab){
  _keyProduct = productName;
  _keyDownloadLink = downloadLink;
  _keySourceTab = sourceTab || null;

  if(isVipUnlocked()){
    closeModal();
    if(downloadLink && !downloadLink.endsWith('#')){
      window.open(downloadLink,'_blank','noopener,noreferrer');
    } else {
      showToast('Link download belum tersedia.','error');
    }
    return;
  }

  closeModal();

  const overlay = document.getElementById('keyOverlay');
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden','false');
  document.body.style.overflow = 'hidden';

  showVipGate();
}

function showVipGate(){
  document.getElementById('vipGateBody').classList.remove('hide');
  document.getElementById('vipKeyFormBody').classList.remove('show');
  document.getElementById('keySuccessWrap').classList.remove('show');
  document.getElementById('keyTitle').textContent = 'VIP RP 10.000';
  setKeyHeadDecorHidden(false);

  const productLabel = escapeHtml(_keyProduct || 'produk ini');
  document.getElementById('keySub').innerHTML = 'Silahkan <b>' + '</b> <b>JOIN VIP</b> agar bisa akses semua cheat';

  const joinVipBtn = document.getElementById('keyBtnJoinVip');
  if(joinVipBtn){
    joinVipBtn.style.display = (_keySourceTab === 'cheat' || _keySourceTab === 'file' || _keySourceTab === 'newproduct') ? 'flex' : 'none';
  }
  const joinVipWaBtn = document.getElementById('keyBtnJoinVipWa');
  if(joinVipWaBtn){
    joinVipWaBtn.style.display = (_keySourceTab === 'cheat' || _keySourceTab === 'file' || _keySourceTab === 'newproduct') ? 'flex' : 'none';
  }
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* markup asli form input key VIP — dipakai untuk restore jika sebelumnya body ini
   ditimpa oleh tampilan QRIS (showVipQrisLoading/renderVipQris) */
const VIP_KEYFORM_MARKUP = `
  <label class="key-input-label" for="keyInput">Key Akses</label>
  <div class="key-input-wrap">
    <input type="password" id="keyInput" class="key-input" placeholder="••••••••••" autocomplete="off" spellcheck="false" onkeydown="if(event.key==='Enter'){event.preventDefault();keyLogin();}">
    <button type="button" class="key-toggle-eye" onclick="toggleKeyEye()" aria-label="Tampilkan key" id="keyEyeBtn">
      <svg id="keyEyeIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>
    </button>
  </div>
  <div class="key-error-msg" id="keyErrorMsg">Key salah, coba lagi.</div>

  <button class="key-btn-login" id="keyLoginBtn" onclick="keyLogin()">
    <span class="key-spinner"></span>
    <span class="key-btn-label">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>
    </span>
    <span class="key-btn-label-text">VERIFIKASI KEY</span>
  </button>

  <button type="button" class="vip-back-link" onclick="showVipGate()">← kembali</button>
`;

function showVipKeyForm(){
  document.getElementById('vipGateBody').classList.add('hide');
  document.getElementById('vipKeyFormBody').classList.add('show');
  document.getElementById('keySuccessWrap').classList.remove('show');
  document.getElementById('keyTitle').textContent = 'Masukkan Key VIP';
  document.getElementById('keySub').textContent = 'Key hanya berlaku 1x pakai dan langsung hangus setelah digunakan';
  setKeyHeadDecorHidden(false);

  /* hentikan proses QRIS yang mungkin masih berjalan di background, lalu
     kembalikan HTML form key ke aslinya (bisa saja sebelumnya ditimpa QRIS) */
  clearInterval(_qrisPollTimer);
  clearInterval(_qrisCountdownTimer);
  _vipQrisImageUrl = null;
  _qrisExpiresAt = null;
  document.getElementById('vipKeyFormBody').innerHTML = VIP_KEYFORM_MARKUP;

  const input = document.getElementById('keyInput');
  const errMsg = document.getElementById('keyErrorMsg');
  const loginBtn = document.getElementById('keyLoginBtn');
  input.value = '';
  input.classList.remove('shake');
  input.type = 'password';
  errMsg.classList.remove('show');
  loginBtn.classList.remove('loading');
  setTimeout(()=>{ input.focus(); }, 150);
}

function closeKeyModal(){
  const overlay = document.getElementById('keyOverlay');
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden','true');
  document.body.style.overflow = '';
  _qrisPaymentActive = false;
  // PENTING: jangan matikan _qrisPollTimer di sini. Kalau user klik X / klik area luar /
  // tekan Escape SAAT lagi ada pembayaran QRIS pending, polling harus tetap jalan di
  // background supaya VIP tetap otomatis terbuka begitu pembayaran terdeteksi sukses —
  // menutup modal bukan berarti user membatalkan pembayaran (beda dengan cancelVipPayment()).
  // Timer countdown visual boleh dimatikan karena elemennya sudah tidak ada di layar.
  clearInterval(_qrisCountdownTimer);
}

function handleKeyOverlayClick(e){
  /* Klik area luar modal key/VIP sengaja tidak menutup modal -- hanya tombol X yang boleh. */
}

function toggleKeyEye(){
  const input = document.getElementById('keyInput');
  const icon = document.getElementById('keyEyeIcon');
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  icon.innerHTML = isHidden
    ? '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 4.22-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a20.4 20.4 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
    : '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/>';
}

/* URL SheetDB — validasi key VIP sekali pakai via Google Sheets
   (kolom: key, Produk, Status, Tipe, WaktuPakai).
   - Tipe "Permanen": sekali dipakai (Status="Sudah") -> akses terbuka SELAMANYA di device itu.
   - Tipe "Trial" atau "Trial <jam>" (contoh "Trial 1", "Trial 7", "Trial 24"): sekali dipakai
     (Status="Sudah", WaktuPakai=sekarang) -> akses terbuka SELAMA <jam> JAM saja di device itu,
     lalu otomatis terkunci lagi. Kalau angka jam tidak ditulis (cuma "Trial"), default 24 jam.
     Key itu sendiri tetap hangus permanen di server begitu dipakai (tidak bisa dipakai
     device/orang lain sama sekali, terlepas dari tipe permanen/trial). */
const KEY_API_URL = 'https://script.google.com/macros/s/AKfycbw4bx5UZtkoCrr3JalSeYlxrdZ50lJmRt1XHlqkXc1BrnUR362ezDur6mPfApeii8ht/exec';
const DEFAULT_TRIAL_HOURS = 24;

function keyLogin(){
  const input = document.getElementById('keyInput');
  const errMsg = document.getElementById('keyErrorMsg');
  const loginBtn = document.getElementById('keyLoginBtn');
  const entered = input.value.trim();

  if(!entered){
    errMsg.textContent = 'Key tidak boleh kosong.';
    errMsg.classList.add('show');
    input.classList.remove('shake');
    void input.offsetWidth;
    input.classList.add('shake');
    return;
  }

  loginBtn.classList.add('loading');
  errMsg.classList.remove('show');

  function fail(msg){
    loginBtn.classList.remove('loading');
    errMsg.textContent = msg;
    errMsg.classList.add('show');
    input.classList.remove('shake');
    void input.offsetWidth;
    input.classList.add('shake');
    input.select();
  }

  function success(isTrial, trialHours){
    if(isTrial){
      markVipUnlockedTrial(Date.now() + trialHours * 60 * 60 * 1000);
    } else {
      markVipUnlocked();
    }
    refreshVipHeaderBadge();
    const trialLabel = trialHours === 1 ? '1 jam' : trialHours + ' jam';
    document.getElementById('vipGateBody').classList.add('hide');
    const celebTitle = isTrial ? 'KEY TRIAL AKTIF!' : 'WELCOME TO VIP';
    const celebSub = isTrial
      ? 'Semua produk terbuka selama ' + trialLabel + '.'
      : 'Kamu sekarang bisa akses semua cheat.';
    showVipCelebration(celebTitle, celebSub);
  }

  /* Redeem key lewat Apps Script (satu request: cari + validasi + hanguskan key).
     LockService di server mencegah key yang sama dipakai 2 device sekaligus. */
  fetch(KEY_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // hindari CORS preflight di Apps Script
    body: JSON.stringify({ action: 'redeemKey', key: entered })
  })
  .then(res => {
    if(!res.ok) throw new Error('http-' + res.status);
    return res.json();
  })
  .then(result => {
    if(!result || !result.ok){
      fail((result && result.error) || 'Key salah, coba lagi.');
      return;
    }
    const trialHours = result.trialHours || DEFAULT_TRIAL_HOURS;
    success(!!result.isTrial, trialHours);
  })
  .catch(err => fail('Gagal menghubungi server. Cek koneksi internet kamu.'));
}

/* tombol "BELI VIP" (di dalam modal, konteks produk tertentu) -> WhatsApp */
function keyGetPassword(){
  const msg = `Halo Tarz Store! Saya mau join VIP (${VIP_PRICE_TEXT}) untuk akses semua cheat.\n\n\Mohon diproses ya, terima kasih`;
  setTimeout(()=>{ closeKeyModal(); window.open('https://wa.me/'+VIP_WA_NUMBER+'?text='+encodeURIComponent(msg),'_blank','noopener,noreferrer'); }, 420);
}



/* Escape sengaja tidak menutup modal key/VIP -- hanya tombol X yang boleh. */

/* ── PAUSE ANIMASI SAAT TAB TIDAK AKTIF ──
   Browser tetap menjalankan CSS animation & timer di background tab (throttled,
   tapi tidak nol), jadi begitu user kembali sering terasa "kejang" sesaat.
   Dengan pause eksplisit lewat class, tidak ada kerja yang menumpuk di background. */
document.addEventListener('visibilitychange', () => {
  document.body.classList.toggle('tab-hidden', document.hidden);
});

/* Escape sengaja tidak menutup modal produk -- hanya tombol X yang boleh. */

/* ══════════════════════════════════════════
   VIP AUTO-PAYMENT (BuatQris) — QRIS otomatis, tanpa chat admin
   ══════════════════════════════════════════ */

/* verifikasi ke server apakah token VIP di browser ini masih sah
   (menggantikan cek localStorage-saja, supaya tidak bisa dipalsukan lewat DevTools) */
async function isVipUnlockedAsync(){
  const token = localStorage.getItem('tarz_vip_token');
  if(!token) return false;
  try{
    const res = await fetch('/api/verify-vip?token=' + encodeURIComponent(token));
    const data = await res.json();
    if(data.vip === true) return true;
    if(data.vip === false){ localStorage.removeItem('tarz_vip_token'); return false; }
    return true; // data.vip === null -> server error, jangan kunci akses yang sudah ada
  }catch(e){
    return true; // offline/error -> jangan kunci user yang sudah pernah verify
  }
}

let _qrisPollTimer = null;
let _vipQrisImageUrl = null;

/* dipanggil dari tombol "JOIN VIP - Rp10.000" di dalam key modal (yang sudah terbuka) */
async function startVipPayment(){
  showVipQrisLoading();
  try{
    const res = await fetch('/api/create-payment', { method: 'POST' });
    const data = await res.json();
    if(!data.ok){
      showVipGate();
      return;
    }
    renderVipQris(data);
    pollVipPayment(data.orderId);
  }catch(e){
    showToast('Gagal terhubung ke server pembayaran.', 'error');
    showVipGate();
  }
}

/* dipanggil dari tombol "BUY VIP VIA WHATSAPP" di dalam key modal — langsung
   arahkan ke WhatsApp admin dengan pesan siap kirim, tanpa lewat QRIS */
function openVipWhatsApp(){
  const msg = `Halo Tarz Store! Saya mau join VIP (${VIP_PRICE_TEXT}) untuk akses semua cheat.\n\nMohon diproses ya, terima kasih`;
  setTimeout(()=>{
    window.open('https://wa.me/'+VIP_WA_NUMBER+'?text='+encodeURIComponent(msg),'_blank','noopener,noreferrer');
  }, 350);
}

/* dipanggil dari tombol "JOIN VIP" di file card (tab FILE HS) — key modal belum terbuka,
   jadi buka dulu overlay-nya baru langsung mulai proses pembayaran */
function openVipPaymentDirect(){
  _keyProduct = 'VIP Access';
  _keyDownloadLink = '#';
  _keySourceTab = 'file';

  const overlay = document.getElementById('keyOverlay');
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden','false');
  document.body.style.overflow = 'hidden';

  startVipPayment();
}

function showVipQrisLoading(){
  document.getElementById('vipGateBody').classList.add('hide');
  document.getElementById('vipKeyFormBody').classList.remove('show');
  document.getElementById('keySuccessWrap').classList.remove('show');
  document.getElementById('keyTitle').textContent = 'Menyiapkan QRIS...';
  document.getElementById('keySub').textContent = 'Mohon tunggu sebentar';
  setKeyHeadDecorHidden(true);

  const body = document.getElementById('vipKeyFormBody');
  body.classList.add('show');
  body.innerHTML = `
    <div class="qris-status-card" style="justify-content:center;">
      <div class="qris-status-spinner"></div>
      <div class="qris-status-text">
        <div class="qris-status-title">Menghubungkan ke server pembayaran</div>
        <div class="qris-status-sub">Mohon tunggu sebentar...</div>
      </div>
    </div>
  `;
}

/* sembunyikan/tampilkan eyebrow "ACCESS TERKUNCI" & icon gembok saat state pembayaran QRIS aktif */
function setKeyHeadDecorHidden(hidden){
  const eyebrow = document.querySelector('#keyBox .key-eyebrow');
  const badge = document.getElementById('keyIconBadge');
  if(eyebrow) eyebrow.style.display = hidden ? 'none' : '';
  if(badge) badge.style.display = hidden ? 'none' : '';
}

let _qrisExpiresAt = null;
let _qrisCountdownTimer = null;
let _qrisPaymentActive = false;

function renderVipQris(data){
  document.getElementById('keyTitle').textContent = 'Scan & Bayar VIP';
  document.getElementById('keySub').innerHTML = 'Selesaikan pembayaran untuk membuka akses';
  setKeyHeadDecorHidden(true);

  _vipQrisImageUrl = data.qrImageUrl;
  _qrisExpiresAt = Date.now() + 15 * 60 * 1000;
  // Selama layar QRIS ini tampil, modal hanya boleh ditutup lewat tombol X --
  // klik area luar / tekan Escape diabaikan supaya user tidak menutup modal
  // secara tidak sengaja di tengah proses pembayaran.
  _qrisPaymentActive = true;

  // Simpan order aktif ke localStorage supaya kalau user menutup modal / tutup tab / refresh
  // sebelum status "success" terdeteksi, kita masih bisa lanjut cek statusnya nanti —
  // tanpa ini, order yang sudah dibayar tapi modalnya keburu ditutup akan hilang jejaknya.
  try{
    localStorage.setItem('tarz_vip_pending_order', JSON.stringify({
      orderId: data.orderId,
      expiresAt: _qrisExpiresAt
    }));
  }catch(e){}

  const body = document.getElementById('vipKeyFormBody');
  body.classList.add('show');
  body.innerHTML = `
    <div class="qris-pay-wrap">
      <div class="qris-amount-row">
        <span class="qris-amount-label">Rp</span>
        <span class="qris-amount-value">${data.amount.toLocaleString('id-ID')}</span>
      </div>
      ${data.orderId ? `<div class="qris-order-id">Order #${data.orderId}</div>` : `<div style="margin-bottom:12px;"></div>`}

      <div class="qris-code-frame">
        <span class="qris-code-corner-a"></span>
        <span class="qris-code-corner-b"></span>
        <img src="${data.qrImageUrl}" alt="QRIS VIP Tarz Store" decoding="async">
        <div class="qris-logo-badge"><img src="https://xxaenbqyeliyhrulyjuz.supabase.co/storage/v1/object/public/Videos/tarz.jpg" alt="Tarz" decoding="async"></div>
      </div>

      <div class="qris-timer-row" id="qrisTimerRow">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
        <span class="qris-timer-text" id="qrisTimerText">15:00</span>
      </div>

      <div class="qris-action-row">
        <button type="button" class="vip-qris-download-btn" onclick="downloadVipQris()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"/></svg>
          DOWNLOAD QRIS
        </button>
      </div>

      <div class="qris-status-card" id="qrisStatusCard">
        <div class="qris-status-spinner"></div>
        <div class="qris-status-text">
          <div class="qris-status-title" id="vipPayStatus">Menunggu pembayaran...</div>
          <div class="qris-status-sub">Status akan terupdate otomatis</div>
        </div>
      </div>

      <div class="qris-steps">
        <div class="qris-steps-title">Cara Bayar</div>
        <div class="qris-step"><span class="qris-step-num">1</span><span>Buka aplikasi e-wallet atau m-banking apa saja</span></div>
        <div class="qris-step"><span class="qris-step-num">2</span><span>Pilih menu <b style="color:var(--text)">Scan QRIS</b> lalu arahkan ke kode di atas</span></div>
        <div class="qris-step"><span class="qris-step-num">3</span><span>Periksa nominal, lalu selesaikan pembayaran</span></div>
      </div>

      <button type="button" class="vip-back-link" onclick="cancelVipPayment()">← batal pembayaran</button>
    </div>
  `;

  startQrisCountdown();
}

function startQrisCountdown(){
  clearInterval(_qrisCountdownTimer);
  const tick = () => {
    const remainMs = _qrisExpiresAt - Date.now();
    const timerText = document.getElementById('qrisTimerText');
    const timerRow = document.getElementById('qrisTimerRow');
    if(!timerText || !timerRow) { clearInterval(_qrisCountdownTimer); return; }
    if(remainMs <= 0){
      timerText.textContent = '00:00';
      timerRow.classList.add('urgent');
      clearInterval(_qrisCountdownTimer);
      return;
    }
    const totalSec = Math.floor(remainMs / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    timerText.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
    if(totalSec <= 120) timerRow.classList.add('urgent');
  };
  tick();
  _qrisCountdownTimer = setInterval(tick, 1000);
}

/* unduh gambar QRIS sebagai file .png ke perangkat user (bukan sekadar buka tab baru).
   _vipQrisImageUrl dari BuatQris berupa data URI base64 (data:image/png;base64,...),
   BUKAN url http biasa -> tidak boleh di-fetch() atau window.open() karena itu yang
   bikin sebagian browser (terutama in-app browser WA/IG) keluar dari halaman pembayaran. */
function downloadVipQris(){
  if(!_vipQrisImageUrl) return;
  try{
    if(_vipQrisImageUrl.startsWith('data:')){
      // data URI -> langsung jadikan href, tidak perlu fetch/blob sama sekali
      const a = document.createElement('a');
      a.href = _vipQrisImageUrl;
      a.download = 'QRIS-VIP-TarzStore.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
    // fallback kalau suatu saat qrImageUrl berupa URL http biasa (bukan data URI)
    fetch(_vipQrisImageUrl)
      .then(res => res.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = 'QRIS-VIP-TarzStore.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(()=>URL.revokeObjectURL(blobUrl), 4000);
      })
      .catch(() => {});
  }catch(e){}
}

function setQrisStatus(state, title, sub){
  const card = document.getElementById('qrisStatusCard');
  const titleEl = document.getElementById('vipPayStatus');
  if(!card || !titleEl) return;
  card.classList.remove('ok','error');
  let iconHtml = '';
  if(state === 'ok'){
    card.classList.add('ok');
    iconHtml = '<svg viewBox="0 0 24 24" fill="none" stroke="#00e5a0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;"><polyline points="20 6 9 17 4 12"/></svg>';
    card.querySelector('.qris-status-spinner').innerHTML = iconHtml;
  } else if(state === 'error'){
    card.classList.add('error');
    iconHtml = '<svg viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    card.querySelector('.qris-status-spinner').innerHTML = iconHtml;
  }
  titleEl.textContent = title;
  const subEl = card.querySelector('.qris-status-sub');
  if(subEl) subEl.textContent = sub || '';
}

/* silentMode=true dipakai saat poll jalan di background (modal QRIS sudah ditutup) —
   dalam mode ini kita TIDAK menyentuh elemen DOM qris (karena sudah tidak ada di layar),
   cukup deteksi sukses lalu buka VIP secara diam-diam + kasih toast notifikasi. */
async function pollVipPayment(orderId, silentMode){
  clearInterval(_qrisPollTimer);
  let elapsed = 0;
  _qrisPollTimer = setInterval(async () => {
    elapsed += 3;
    if(elapsed > 900){ // 15 menit
      clearInterval(_qrisPollTimer);
      clearInterval(_qrisCountdownTimer);
      try{ localStorage.removeItem('tarz_vip_pending_order'); }catch(e){}
      if(!silentMode) setQrisStatus('error', 'QRIS kedaluwarsa', 'Silakan buat ulang pembayaran.');
      return;
    }
    try{
      const res = await fetch('/api/check-status?orderId=' + encodeURIComponent(orderId));
      const data = await res.json();
      if(data.status === 'success'){
        clearInterval(_qrisPollTimer);
        clearInterval(_qrisCountdownTimer);
        try{ localStorage.removeItem('tarz_vip_pending_order'); }catch(e){}
        localStorage.setItem('tarz_vip_token', data.vipToken);
        markVipUnlocked();
        refreshVipHeaderBadge();
        if(silentMode){
          showVipCelebration();
        } else {
          setQrisStatus('ok', 'Pembayaran diterima!', 'Membuka akses VIP...');
          setTimeout(showVipCelebration, 600);
        }
      } else if(data.status === 'expired' || data.status === 'failed'){
        clearInterval(_qrisPollTimer);
        clearInterval(_qrisCountdownTimer);
        try{ localStorage.removeItem('tarz_vip_pending_order'); }catch(e){}
        if(!silentMode) setQrisStatus('error', data.status === 'expired' ? 'Pembayaran kedaluwarsa' : 'Pembayaran gagal', 'Silakan coba lagi.');
      }
    }catch(e){ /* diamkan, coba lagi di tick berikutnya */ }
  }, 3000);
}

/* Dipanggil saat halaman dimuat: kalau ada order pending tersimpan (user bayar lalu
   menutup modal sebelum status sukses terdeteksi), lanjutkan cek statusnya di background
   supaya VIP tetap otomatis terbuka begitu pembayaran terdeteksi -- tanpa perlu modal QRIS terbuka. */
function resumePendingVipOrderIfAny(){
  let pending = null;
  try{ pending = JSON.parse(localStorage.getItem('tarz_vip_pending_order') || 'null'); }catch(e){}
  if(!pending || !pending.orderId) return;
  if(Date.now() > pending.expiresAt){
    try{ localStorage.removeItem('tarz_vip_pending_order'); }catch(e){}
    return;
  }
  pollVipPayment(pending.orderId, true);
}

/* Cek status SEKALI SEKARANG JUGA (bukan tunggu interval 3 detik) untuk order pending
   di localStorage. Dipanggil tiap kali tab kembali terlihat (lihat visibilitychange di bawah),
   karena browser mobile sering MEMBEKUKAN setInterval saat tab tidak aktif/user pindah
   ke app lain (mis. buka GoPay/DANA untuk scan QRIS) -- begitu balik ke tab, interval lama
   itu tidak selalu otomatis lanjut tepat waktu, jadi kita paksa cek ulang langsung. */
async function checkPendingVipOrderNow(){
  let pending = null;
  try{ pending = JSON.parse(localStorage.getItem('tarz_vip_pending_order') || 'null'); }catch(e){}
  if(!pending || !pending.orderId) return;
  if(Date.now() > pending.expiresAt){
    try{ localStorage.removeItem('tarz_vip_pending_order'); }catch(e){}
    return;
  }
  try{
    const res = await fetch('/api/check-status?orderId=' + encodeURIComponent(pending.orderId));
    const data = await res.json();
    if(data.status === 'success'){
      clearInterval(_qrisPollTimer);
      try{ localStorage.removeItem('tarz_vip_pending_order'); }catch(e){}
      localStorage.setItem('tarz_vip_token', data.vipToken);
      markVipUnlocked();
      refreshVipHeaderBadge();
      // kalau modal QRIS kebetulan masih terbuka di layar, tampilkan juga layar suksesnya
      const statusCard = document.getElementById('qrisStatusCard');
      if(statusCard){
        setQrisStatus('ok', 'Pembayaran diterima!', 'Membuka akses VIP...');
        setTimeout(showVipCelebration, 600);
      } else {
        showVipCelebration();
      }
    } else if(data.status === 'expired' || data.status === 'failed'){
      clearInterval(_qrisPollTimer);
      try{ localStorage.removeItem('tarz_vip_pending_order'); }catch(e){}
    }
    // status masih 'pending' -> biarkan, interval reguler yang lanjut jalan
  }catch(e){ /* diamkan, coba lagi nanti */ }
}

/* Begitu user balik ke tab ini (habis pindah app buat bayar, atau buka Chrome recents lagi),
   langsung cek status sekarang juga -- jangan andalkan interval lama yang mungkin dibekukan. */
document.addEventListener('visibilitychange', () => {
  if(!document.hidden){
    checkPendingVipOrderNow();
  }
});
/* Beberapa browser Android tidak selalu fire visibilitychange dengan konsisten saat
   app-switch -> pageshow/focus sebagai jaring kedua, aman dipanggil berkali-kali. */
window.addEventListener('pageshow', checkPendingVipOrderNow);
window.addEventListener('focus', checkPendingVipOrderNow);

/* Tombol "batal pembayaran" eksplisit -> ini beda dari menutup modal (X / klik luar / escape):
   user secara sadar memilih membatalkan, jadi wajar polling dan order pending dihentikan. */
function cancelVipPayment(){
  clearInterval(_qrisPollTimer);
  clearInterval(_qrisCountdownTimer);
  _vipQrisImageUrl = null;
  _qrisExpiresAt = null;
  _qrisPaymentActive = false;
  try{ localStorage.removeItem('tarz_vip_pending_order'); }catch(e){}
  showVipGate();
}

/* Notifikasi meriah setelah pembayaran QRIS ATAU key VIP terdeteksi sukses.
   Tidak lagi auto-redirect ke link download (mediafire dsb) -- cukup tampilkan
   kartu selamat + confetti, lalu tombol OKE menutup modal key sepenuhnya dan
   user kembali ke tampilan awal halaman. */
function showVipCelebration(title, sub){
  _vipQrisImageUrl = null;
  closeKeyModal();
  const titleEl = document.getElementById('vipCelebrateTitle');
  const subEl = document.getElementById('vipCelebrateSub');
  if(titleEl) titleEl.textContent = title || 'WELCOME TO VIP';
  if(subEl) subEl.textContent = sub || 'Kamu sekarang bisa akses semua cheat';
  spawnVipConfetti();
  const overlay = document.getElementById('vipCelebrateOverlay');
  overlay.classList.add('show');
  overlay.setAttribute('aria-hidden','false');
  document.body.style.overflow = 'hidden';
}

function closeVipCelebration(){
  const overlay = document.getElementById('vipCelebrateOverlay');
  overlay.classList.remove('show');
  overlay.setAttribute('aria-hidden','true');
  document.body.style.overflow = '';
  const confettiWrap = document.getElementById('vipCelebrateConfetti');
  if(confettiWrap) confettiWrap.innerHTML = '';
}

function spawnVipConfetti(){
  const wrap = document.getElementById('vipCelebrateConfetti');
  if(!wrap) return;
  wrap.innerHTML = '';
  const shades = ['#ffffff','#e4e4e4','#bdbdbd','#8f8f8f'];
  const pieceCount = 60;
  for(let i=0;i<pieceCount;i++){
    const piece = document.createElement('div');
    piece.className = 'vip-confetti-piece';
    const left = Math.random()*100;
    const drift = (Math.random()*160 - 80) + 'px';
    const spin = (Math.random()*720 + 360) + 'deg';
    const duration = (Math.random()*1.6 + 2.2).toFixed(2) + 's';
    const delay = (Math.random()*0.5).toFixed(2) + 's';
    const shade = shades[Math.floor(Math.random()*shades.length)];
    const isSquare = Math.random() > 0.5;
    piece.style.left = left + '%';
    piece.style.background = shade;
    piece.style.opacity = (Math.random()*0.5 + 0.5).toFixed(2);
    piece.style.setProperty('--drift', drift);
    piece.style.setProperty('--spin', spin);
    piece.style.animationDuration = duration;
    piece.style.animationDelay = delay;
    piece.style.borderRadius = isSquare ? '1px' : '50%';
    wrap.appendChild(piece);
  }
}

/* Klik area luar & tombol Escape sengaja tidak menutup notifikasi VIP -- hanya tombol OKE yang boleh. */

/* tampilkan status VIP/trial yang benar di badge atas grid produk, begitu halaman dibuka */
isVipUnlockedAsync().then(vip => { if(vip) markVipUnlocked(); refreshVipHeaderBadge(); });
resumePendingVipOrderIfAny();

/* ── PROTEKSI SAVE/DOWNLOAD MEDIA ──
   Blokir context menu (klik kanan / tahan lama) khusus di atas <img> dan <video>,
   termasuk yang dibuat dinamis lewat JS (event delegation di document).
   Catatan: ini hanya mempersulit save via UI browser, bukan proteksi mutlak —
   screenshot, screen recording, atau devtools tetap bisa mengambil media. */
document.addEventListener('contextmenu', function(e){
  const t = e.target;
  if(t && (t.tagName === 'IMG' || t.tagName === 'VIDEO')){
    e.preventDefault();
  }
}, {passive:false});
/* cegah drag-to-save juga untuk elemen dinamis */
document.addEventListener('dragstart', function(e){
  const t = e.target;
  if(t && (t.tagName === 'IMG' || t.tagName === 'VIDEO')){
    e.preventDefault();
  }
}, {passive:false});


/* ===== script block lines 5531-5674 ===== */
(function(){
  const LOBBYFF_API_BASE = 'https://apii.nexadev.my.id/fakeff';

  const overlay = document.getElementById('lobbyffModalOverlay');
  const resultImg = document.getElementById('lobbyffResultImg');
  const loadingEl = document.getElementById('lobbyffLoading');
  const nameInput = document.getElementById('lobbyffNameInput');
  const generateBtn = document.getElementById('lobbyffGenerateBtn');
  if(!overlay || !resultImg || !nameInput) return;

  // canvas tersembunyi, dipakai untuk menggambar ulang gambar hasil API
  // (bukan lewat CSS) supaya file yang diunduh identik dengan preview
  // dan supaya bisa diekspor sebagai PNG lewat toDataURL.
  const hiddenCanvas = document.createElement('canvas');
  const hiddenCtx = hiddenCanvas.getContext('2d');

  let imgLoaded = false;
  let currentUrl = '';
  let canvasReady = false; // false kalau gambar cross-origin "menodai" canvas

  function setLoading(msg){
    imgLoaded = false;
    resultImg.style.display = 'none';
    if(loadingEl){ loadingEl.textContent = msg; loadingEl.classList.remove('hide'); }
  }

  window.generateLobbyFF = function(){
    const name = (nameInput.value || '').trim();
    if(!name){
      if(typeof showToast === 'function') showToast('Ketik nama Free Fire kamu dulu.', 'error');
      return;
    }
    if(generateBtn) generateBtn.disabled = true;
    setLoading('Membuat lobby...');

    const url = `${LOBBYFF_API_BASE}?usn=${encodeURIComponent(name)}&t=${Date.now()}`;
    currentUrl = url;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function(){
      if(url !== currentUrl) return; // hasil generate lama, abaikan

      // gambar apa adanya (ukuran asli) ke canvas tersembunyi
      hiddenCanvas.width = img.naturalWidth;
      hiddenCanvas.height = img.naturalHeight;
      hiddenCtx.clearRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);
      hiddenCtx.drawImage(img, 0, 0);

      try{
        // cek apakah canvas masih "bersih" (server mengizinkan CORS)
        hiddenCanvas.toDataURL('image/png');
        canvasReady = true;
      } catch(e){
        canvasReady = false; // canvas ternoda, fallback ke URL langsung saat unduh
      }

      // preview pakai object-fit:contain supaya persis sama seperti hasil unduhan
      resultImg.src = img.src;
      resultImg.style.display = 'block';
      if(loadingEl) loadingEl.classList.add('hide');
      imgLoaded = true;
      if(generateBtn) generateBtn.disabled = false;
    };
    img.onerror = function(){
      if(url !== currentUrl) return;
      setLoading('Gagal membuat lobby. Coba lagi.');
      if(generateBtn) generateBtn.disabled = false;
      if(typeof showToast === 'function') showToast('Gagal membuat lobby, coba lagi.', 'error');
    };
    img.src = url;
  };

  window.openLobbyFFModal = function(){
    void overlay.offsetHeight;
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  };
  window.closeLobbyFFModal = function(){
    overlay.classList.remove('show');
    document.body.style.overflow = '';
  };
  /* Escape sengaja tidak menutup modal Lobby FF -- hanya tombol X yang boleh. */

  window.downloadLobbyFF = function(){
    if(!imgLoaded){
      if(typeof showToast === 'function') showToast('Generate dulu gambarnya sebelum disimpan.', 'error');
      return;
    }
    const name = (nameInput.value || '').trim();
    const fileSafeName = name ? name.replace(/[^a-z0-9]+/gi, '_') : 'lobby';
    const fileName = `FreeFire-${fileSafeName}.png`;

    // jalur utama: canvas bersih -> ekspor PNG asli lewat blob (paling andal
    // untuk memicu download beneran, termasuk di browser mobile).
    if(canvasReady){
      hiddenCanvas.toBlob(function(blob){
        if(!blob){
          downloadViaFetch(fileName);
          return;
        }
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(()=> URL.revokeObjectURL(blobUrl), 4000);
        if(typeof showToast === 'function') showToast('Gambar berhasil disimpan!', 'success');
      }, 'image/png');
      return;
    }

    // fallback: canvas ternoda (server tidak kirim header CORS) -> fetch
    // manual jadi blob. Kalau ini juga gagal (mis. server blokir fetch lintas
    // origin sepenuhnya), baru buka tab baru sebagai jalan terakhir.
    downloadViaFetch(fileName);
  };

  function downloadViaFetch(fileName){
    fetch(currentUrl, { mode: 'cors' })
      .then(res => {
        if(!res.ok) throw new Error('Gagal mengambil gambar');
        return res.blob();
      })
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(()=> URL.revokeObjectURL(blobUrl), 4000);
        if(typeof showToast === 'function') showToast('Gambar berhasil disimpan!', 'success');
      })
      .catch(() => {
        // jalan terakhir: buka gambar di tab baru, user simpan manual
        window.open(currentUrl, '_blank', 'noopener,noreferrer');
        if(typeof showToast === 'function') showToast('Gambar dibuka di tab baru, tekan lama untuk menyimpan.', 'error');
      });
  }
})();

/* ===== script block lines 5681-5899 ===== */
(function(){
  const overlay = document.getElementById('ttdlModalOverlay');
  const urlInput = document.getElementById('ttdlUrlInput');
  const fetchBtn = document.getElementById('ttdlFetchBtn');
  const statusBox = document.getElementById('ttdlStatus');
  const errorBox = document.getElementById('ttdlError');
  const resultBox = document.getElementById('ttdlResult');
  const previewVideo = document.getElementById('ttdlPreviewVideo');
  const videoPreviewWrap = document.getElementById('ttdlVideoPreview');
  const videoActions = document.getElementById('ttdlVideoActions');
  const videoLink = document.getElementById('ttdlVideoLink');
  const audioLink = document.getElementById('ttdlAudioLink');
  const photoBlock = document.getElementById('ttdlPhotoBlock');
  const carouselTrack = document.getElementById('ttdlCarouselTrack');
  const carouselDots = document.getElementById('ttdlCarouselDots');
  const photoLink = document.getElementById('ttdlPhotoLink');
  const photoLinkLabel = document.getElementById('ttdlPhotoLinkLabel');
  const photoAudioLink = document.getElementById('ttdlPhotoAudioLink');

  let photoUrls = [];
  let activePhotoIndex = 0;

  function resetTtdlUI(){
    errorBox.classList.remove('show');
    errorBox.textContent = '';
    resultBox.classList.remove('show');
    videoPreviewWrap.classList.remove('active');
    videoActions.classList.remove('active');
    photoBlock.classList.remove('active');
    carouselTrack.innerHTML = '';
    carouselDots.innerHTML = '';
    photoUrls = [];
    activePhotoIndex = 0;
  }

  function showTtdlError(msg){
    errorBox.textContent = msg;
    errorBox.classList.add('show');
  }

  window.openTtdlModal = function(){
    overlay.style.display = 'flex';
    void overlay.offsetHeight;
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  };
  window.closeTtdlModal = function(){
    overlay.classList.remove('show');
    document.body.style.overflow = '';
  };
  /* Escape sengaja tidak menutup modal TikTok Downloader -- hanya tombol X yang boleh. */

  window.pasteTtdlUrl = async function(){
    const pasteBtn = document.getElementById('ttdlPasteBtn');
    try{
      const text = await navigator.clipboard.readText();
      if(text){
        urlInput.value = text.trim();
        pasteBtn.classList.add('pasted');
        setTimeout(()=>pasteBtn.classList.remove('pasted'), 900);
      }
    } catch(err){
      urlInput.focus();
    }
  };

  // Mencoba beberapa kemungkinan bentuk field foto dari API, karena
  // bentuk persisnya bisa berbeda untuk konten carousel vs video.
  function extractPhotoUrls(info){
    if(Array.isArray(info.photo) && info.photo.length){
      return info.photo.filter(u => typeof u === 'string');
    }
    if(Array.isArray(info.images) && info.images.length){
      return info.images.filter(u => typeof u === 'string');
    }
    if(Array.isArray(info.photos) && info.photos.length){
      return info.photos.filter(u => typeof u === 'string');
    }
    if(Array.isArray(info.slides) && info.slides.length){
      return info.slides.filter(u => typeof u === 'string');
    }
    return [];
  }

  function renderCarousel(urls){
    carouselTrack.innerHTML = '';
    carouselDots.innerHTML = '';

    urls.forEach((src, i) => {
      const slide = document.createElement('div');
      slide.className = 'ttdl-carousel-slide';
      const img = document.createElement('img');
      img.src = src;
      img.alt = 'Foto ' + (i + 1);
      img.loading = i === 0 ? 'eager' : 'lazy';
      slide.appendChild(img);
      carouselTrack.appendChild(slide);

      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'ttdl-carousel-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', 'Foto ' + (i + 1));
      dot.addEventListener('click', () => {
        const slideEl = carouselTrack.children[i];
        if(slideEl) slideEl.scrollIntoView({ behavior:'smooth', inline:'center', block:'nearest' });
      });
      carouselDots.appendChild(dot);
    });

    updateActivePhotoUI(0);
  }

  function updateActivePhotoUI(index){
    activePhotoIndex = index;
    [...carouselDots.children].forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
    const total = photoUrls.length;
    photoLinkLabel.textContent = total > 1
      ? 'Unduh Foto Ini (' + (index + 1) + '/' + total + ')'
      : 'Unduh Foto Ini';
    const src = photoUrls[index];
    if(src){
      photoLink.href = src;
      const safeIndex = String(index + 1).padStart(2, '0');
      photoLink.setAttribute('download', 'TikTokPhoto-' + safeIndex + '.jpg');
    }
  }

  // Deteksi foto aktif berdasarkan posisi scroll carousel (untuk swipe manual).
  let scrollRaf = null;
  carouselTrack.addEventListener('scroll', () => {
    if(scrollRaf) cancelAnimationFrame(scrollRaf);
    scrollRaf = requestAnimationFrame(() => {
      const trackWidth = carouselTrack.clientWidth;
      if(!trackWidth) return;
      const index = Math.round(carouselTrack.scrollLeft / trackWidth);
      const clamped = Math.max(0, Math.min(index, photoUrls.length - 1));
      if(clamped !== activePhotoIndex) updateActivePhotoUI(clamped);
    });
  }, { passive:true });

  window.fetchTtdl = async function(){
    const url = (urlInput.value || '').trim();
    if(!url){
      showTtdlError('Tempel tautan TikTok dulu, ya.');
      return;
    }

    resetTtdlUI();
    statusBox.classList.add('show');
    fetchBtn.disabled = true;

    // Fetch lewat serverless function sendiri (/api/ttdl) supaya tidak kena
    // masalah CORS/blokir saat request langsung dari browser ke API pihak ketiga.
    const targetUrl = '/api/ttdl?url=' + encodeURIComponent(url);

    try{
      let data = null;

      try{
        const res = await fetch(targetUrl);
        if(res.ok){
          const json = await res.json();
          if(json) data = json;
        }
      } catch(innerErr){
        // biarkan data tetap null, ditangani di bawah
      }

      if(!data){
        throw new Error('Tidak bisa menjangkau server pengambil video. Coba lagi sebentar lagi.');
      }
      if(!data.status || !data.data){
        throw new Error('Tautan tidak bisa diproses. Pastikan tautannya benar dan videonya publik.');
      }

      const info = data.data;
      const isPhotoPost = info.photo === true || (Array.isArray(info.photo) && info.photo.length > 0);
      const urls = isPhotoPost ? extractPhotoUrls(info) : [];

      if(isPhotoPost && urls.length){
        photoUrls = urls;
        renderCarousel(urls);
        photoBlock.classList.add('active');
        if(info.audio){
          photoAudioLink.href = info.audio;
          photoAudioLink.style.display = 'flex';
        } else {
          photoAudioLink.style.display = 'none';
        }
      } else if(info.video){
        previewVideo.src = info.videoWM || info.video;
        videoLink.href = info.video;
        if(info.audio){
          audioLink.href = info.audio;
          audioLink.style.display = 'flex';
        } else {
          audioLink.style.display = 'none';
        }
        videoPreviewWrap.classList.add('active');
        videoActions.classList.add('active');
      } else {
        throw new Error('Video maupun foto tidak ditemukan untuk tautan ini.');
      }

      resultBox.classList.add('show');
    } catch(err){
      showTtdlError(err.message || 'Terjadi kesalahan. Coba lagi sebentar lagi.');
    } finally{
      statusBox.classList.remove('show');
      fetchBtn.disabled = false;
    }
  };

  urlInput.addEventListener('keydown', e=>{
    if(e.key === 'Enter'){ e.preventDefault(); fetchTtdl(); }
  });
})();

/* ===== script block lines 5906-6006 ===== */
(function(){
  const overlay = document.getElementById('sffModalOverlay');
  const idInput = document.getElementById('sffIdInput');
  const fetchBtn = document.getElementById('sffFetchBtn');
  const statusBox = document.getElementById('sffStatus');
  const errorBox = document.getElementById('sffError');
  const resultBox = document.getElementById('sffResult');
  const resultName = document.getElementById('sffResultName');
  const resultId = document.getElementById('sffResultId');

  function resetSffUI(){
    errorBox.classList.remove('show');
    errorBox.textContent = '';
    resultBox.classList.remove('show');
  }

  function showSffError(msg){
    errorBox.textContent = msg;
    errorBox.classList.add('show');
  }

  window.openSffModal = function(){
    overlay.style.display = 'flex';
    void overlay.offsetHeight;
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  };
  window.closeSffModal = function(){
    overlay.classList.remove('show');
    document.body.style.overflow = '';
  };
  /* Escape sengaja tidak menutup modal Free Fire Stalker -- hanya tombol X yang boleh. */

  window.pasteSffId = async function(){
    const pasteBtn = document.getElementById('sffPasteBtn');
    try{
      const text = await navigator.clipboard.readText();
      if(text){
        idInput.value = text.trim();
        pasteBtn.classList.add('pasted');
        setTimeout(()=>pasteBtn.classList.remove('pasted'), 900);
      }
    } catch(err){
      idInput.focus();
    }
  };

  window.fetchSff = async function(){
    const id = (idInput.value || '').trim();
    if(!id){
      showSffError('Masukkan User ID Free Fire dulu, ya.');
      return;
    }
    if(!/^\d+$/.test(id)){
      showSffError('User ID hanya berupa angka.');
      return;
    }

    resetSffUI();
    statusBox.classList.add('show');
    fetchBtn.disabled = true;

    // Fetch lewat serverless function sendiri (/api/ff) supaya tidak kena
    // masalah CORS/blokir saat request langsung dari browser ke API pihak ketiga.
    const targetUrl = '/api/ff?id=' + encodeURIComponent(id);

    try{
      let data = null;

      try{
        const res = await fetch(targetUrl);
        if(res.ok){
          const json = await res.json();
          if(json) data = json;
        }
      } catch(innerErr){
        // biarkan data tetap null, ditangani di bawah
      }

      if(!data){
        throw new Error('Tidak bisa menjangkau server. Coba lagi sebentar lagi.');
      }
      if(!data.status || !data.data || !data.data.username){
        throw new Error('User ID tidak ditemukan. Pastikan ID-nya benar.');
      }

      resultName.textContent = data.data.username;
      resultId.textContent = 'ID: ' + id;
      resultBox.classList.add('show');
    } catch(err){
      showSffError(err.message || 'Terjadi kesalahan. Coba lagi sebentar lagi.');
    } finally{
      statusBox.classList.remove('show');
      fetchBtn.disabled = false;
    }
  };

  idInput.addEventListener('keydown', e=>{
    if(e.key === 'Enter'){ e.preventDefault(); fetchSff(); }
  });
})();

/* ===== script block lines 6013-6162 ===== */
(function(){
  const overlay = document.getElementById('ttsModalOverlay');
  const usernameInput = document.getElementById('ttsUsernameInput');
  const fetchBtn = document.getElementById('ttsFetchBtn');
  const statusBox = document.getElementById('ttsStatus');
  const errorBox = document.getElementById('ttsError');
  const resultBox = document.getElementById('ttsResult');

  const avatarImg = document.getElementById('ttsAvatarImg');
  const avatarFallback = document.getElementById('ttsAvatarFallback');
  const nameEl = document.getElementById('ttsName');
  const usernameEl = document.getElementById('ttsUsername');
  const verifiedBadge = document.getElementById('ttsVerifiedBadge');
  const privateTag = document.getElementById('ttsPrivateTag');
  const bioEl = document.getElementById('ttsBio');
  const postsEl = document.getElementById('ttsPosts');
  const followersEl = document.getElementById('ttsFollowers');
  const followingEl = document.getElementById('ttsFollowing');
  const likesEl = document.getElementById('ttsLikes');
  const resultIdEl = document.getElementById('ttsResultId');

  function resetTtsUI(){
    errorBox.classList.remove('show');
    errorBox.textContent = '';
    resultBox.classList.remove('show');
    avatarImg.style.display = 'none';
    avatarImg.src = '';
    avatarFallback.style.display = 'flex';
    verifiedBadge.style.display = 'none';
    privateTag.style.display = 'none';
    bioEl.style.display = 'none';
    bioEl.textContent = '';
  }

  function showTtsError(msg){
    errorBox.textContent = msg;
    errorBox.classList.add('show');
  }

  window.openTtsModal = function(){
    overlay.style.display = 'flex';
    void overlay.offsetHeight;
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  };
  window.closeTtsModal = function(){
    overlay.classList.remove('show');
    document.body.style.overflow = '';
  };
  /* Escape sengaja tidak menutup modal TikTok Stalker -- hanya tombol X yang boleh. */

  window.pasteTtsUsername = async function(){
    const pasteBtn = document.getElementById('ttsPasteBtn');
    try{
      const text = await navigator.clipboard.readText();
      if(text){
        usernameInput.value = text.trim().replace(/^@/, '');
        pasteBtn.classList.add('pasted');
        setTimeout(()=>pasteBtn.classList.remove('pasted'), 900);
      }
    } catch(err){
      usernameInput.focus();
    }
  };

  // Format angka besar jadi ringkas (contoh: 5800000 -> 5.8JT, 163800 -> 163.8RB)
  function formatCount(n){
    if(typeof n !== 'number' || isNaN(n)) return '0';
    if(n >= 1000000000) return (n / 1000000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if(n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'JT';
    if(n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'RB';
    return String(n);
  }

  window.fetchTts = async function(){
    const rawUsername = (usernameInput.value || '').trim().replace(/^@/, '');
    if(!rawUsername){
      showTtsError('Masukkan username TikTok dulu, ya.');
      return;
    }

    resetTtsUI();
    statusBox.classList.add('show');
    fetchBtn.disabled = true;

    // Fetch lewat serverless function sendiri (/api/tiktokstalker) supaya tidak
    // kena masalah CORS/blokir saat request langsung dari browser ke API pihak ketiga.
    const targetUrl = '/api/tiktokstalker?username=' + encodeURIComponent(rawUsername);

    try{
      let data = null;

      try{
        const res = await fetch(targetUrl);
        if(res.ok){
          const json = await res.json();
          if(json) data = json;
        }
      } catch(innerErr){
        // biarkan data tetap null, ditangani di bawah
      }

      if(!data){
        throw new Error('Tidak bisa menjangkau server. Coba lagi sebentar lagi.');
      }
      if(!data.status || !data.data || !data.data.username){
        throw new Error('Username tidak ditemukan.');
      }

      const info = data.data;

      if(info.photo){
        avatarImg.src = info.photo;
        avatarImg.style.display = 'block';
        avatarFallback.style.display = 'none';
        avatarImg.onerror = () => {
          avatarImg.style.display = 'none';
          avatarFallback.style.display = 'flex';
        };
      }

      nameEl.textContent = info.name || info.username;
      usernameEl.textContent = '@' + info.username;
      verifiedBadge.style.display = info.verified ? 'flex' : 'none';
      privateTag.style.display = info.private ? 'inline-block' : 'none';

      if(info.bio && info.bio.trim()){
        bioEl.textContent = info.bio;
        bioEl.style.display = 'block';
      }

      postsEl.textContent = formatCount(info.posts);
      followersEl.textContent = formatCount(info.followers);
      followingEl.textContent = formatCount(info.following);
      likesEl.textContent = formatCount(info.likes);
      resultIdEl.textContent = 'ID: ' + info.id;

      resultBox.classList.add('show');
    } catch(err){
      showTtsError(err.message || 'Terjadi kesalahan. Coba lagi sebentar lagi.');
    } finally{
      statusBox.classList.remove('show');
      fetchBtn.disabled = false;
    }
  };

  usernameInput.addEventListener('keydown', e=>{
    if(e.key === 'Enter'){ e.preventDefault(); fetchTts(); }
  });
})();

/* ===== script block lines 6173-6358 ===== */
(function(){
  const NP_SUPABASE_URL = 'https://bvblcdnmbzncoqeoqkoc.supabase.co';
  const NP_SUPABASE_KEY = 'sb_publishable_II7ZGSsImxo10OqzRy3U4A_JWQ4rg46';

  function npInit(){
  const npClient = window.supabase.createClient(NP_SUPABASE_URL, NP_SUPABASE_KEY);

  function npEscape(str){
    if(!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function npAttr(str){
    return npEscape(str).replace(/"/g, '&quot;');
  }

  async function loadDbProducts(){
    const cheatGrid = document.getElementById('cheatGrid');
    const allgameGrid = document.getElementById('allgameGrid');
    const configffGrid = document.getElementById('configffGrid');
    if(!cheatGrid || !allgameGrid) return;

    const { data, error } = await npClient
      .from('products')
      .select('*')
      .order('sort_order', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if(error || !data){
      console.error('Gagal memuat produk dari Supabase:', error && error.message);
      return;
    }

    /* Pastikan _appConfig sudah ada (bisa saja config.json masih memuat).
       PENTING: pakai variabel global `_appConfig` (dideklarasikan dengan `let` di script
       lain), BUKAN `window._appConfig` — di script non-module, `let` di top-level TIDAK
       otomatis jadi properti `window`, jadi kalau ditulis `window._appConfig = {}` di sini,
       itu membuat objek terpisah yang tidak pernah dibaca oleh getDownloadLink() dkk,
       sehingga link download produk Supabase selalu dianggap "belum tersedia".
       Karena script ini dimuat setelah script yang mendeklarasikan `_appConfig`,
       variabel itu sudah ada di scope global dan bisa diakses langsung di sini. */
    if(!_appConfig) _appConfig = {};
    if(!_appConfig.downloads) _appConfig.downloads = {};
    if(!_appConfig.copyKeys) _appConfig.copyKeys = {};
    if(!_appConfig.getKeyLinks) _appConfig.getKeyLinks = {};
    if(!_appConfig.freefireLinks) _appConfig.freefireLinks = {};
    if(!_appConfig.userFields) _appConfig.userFields = {};
    if(!_appConfig.keyLabels) _appConfig.keyLabels = {};
    if(!_appConfig.userLabels) _appConfig.userLabels = {};
    /* Jangan paksa _configLoadFailed = false di sini: kalau config.json memang gagal
       dimuat, produk LAMA (yang link-nya cuma ada di config.json) tetap harus
       menampilkan error, bukan diam-diam dianggap berhasil. Produk Supabase sendiri
       tidak bergantung pada _configLoadFailed karena getDownloadLink() akan tetap
       menemukan link-nya di _appConfig.downloads yang sudah kita isi di bawah. */

    data.forEach(p => {
      const name = (p.name || '').trim();
      if(!name) return;
      if(p.download_link) _appConfig.downloads[name] = p.download_link;
      if(p.copy_key) _appConfig.copyKeys[name] = p.copy_key;
      if(p.get_key_link) _appConfig.getKeyLinks[name] = p.get_key_link;
      if(p.download_link_2) _appConfig.freefireLinks[name] = p.download_link_2;
      if(p.user_field) _appConfig.userFields[name] = p.user_field;
      if(p.key_label) _appConfig.keyLabels[name] = p.key_label;
      if(p.user_label) _appConfig.userLabels[name] = p.user_label;
    });

    let cheatHtml = '';
    let allgameHtml = '';
    let configffHtml = '';
    let cheatIndex = 0;
    let allgameIndex = 0;
    let configffIndex = 0;

    data.forEach(p => {
      const name = p.name || '';

      /* ── PRODUK TAB CONFIG FF: kartu spesial dual-poster (sebelum/sesudah),
         tidak pakai fitur/platform/key seperti produk biasa. ── */
      if(p.tab === 'configff'){
        const imgUrl = p.image_url || ''; // foto SESUDAH / foto config
        const imgBefore = p.download_link_2 || ''; // foto SEBELUM (dititipkan di kolom download_link_2)
        const dlLink = npAttr(p.download_link || '');

        /* Kartu Config FF pertama disisipkan paling atas grid (afterbegin) —
           berpotensi jadi elemen LCP. Muat cepat, jangan lazy. */
        const cfIsFirst = (configffIndex === 0);
        configffIndex++;
        const cfLoadingAttr = cfIsFirst ? 'fetchpriority="high"' : 'loading="lazy"';

        const cfCardHtml = `
      <div class="card"
        data-special="configff-empty"
        data-img="${npAttr(imgUrl)}" data-label="CONFIG FF"
        data-icon="" data-platform=""
        data-fitur='[]'
        data-poster=""
        data-config-download-link="${dlLink}"
        data-poster-original="${npAttr(imgBefore)}" data-poster-premium="${npAttr(imgUrl)}">
        <div class="product-image" data-label="CONFIG FF">
          <img src="${npAttr(imgUrl)}" alt="${npAttr(name)}" onerror="this.classList.add('img-error')" ${cfLoadingAttr} decoding="async" width="300" height="450">
        </div>
        <h4>${npEscape(name)}</h4>        <button class="buy-btn" onclick="openModal(this)" style="display:flex;align-items:center;justify-content:center;gap:6px;"><span class="js-icon" data-icon-key="installBtn"></span>INSTALL</button>
      </div>`;

        configffHtml += cfCardHtml;
        return;
      }

      let features = [];
      if(Array.isArray(p.features)) features = p.features;
      else if(typeof p.features === 'string'){
        try { features = JSON.parse(p.features); } catch(e){ features = []; }
      }
      const fiturAttr = npAttr(JSON.stringify(features));
      const noteAttr = npAttr(p.note || '');
      const platform = p.platform || 'android';
      const imgUrl = p.image_url || '';
      /* Kalau produk punya Get Key link -> pakai mode "aincrad" (APK + tombol GET KEY + fitur).
         Kalau tidak -> "aincrad-nokey" (APK + Key salin (jika ada) + fitur), sama seperti produk lama. */
      const specialMode = p.get_key_link ? 'aincrad' : 'aincrad-nokey';

      /* Kartu identik dengan produk lama:
         klik INSTALL -> openModal(this) -> tampil APK CHEAT (download) + Key/Get Key (jika ada) + List Fitur. */
      /* Kartu produk baru disisipkan paling atas grid (afterbegin) — kartu pertama
         di tiap tab berpotensi jadi elemen LCP (terlihat langsung tanpa scroll).
         Muat cepat khusus kartu pertama, sisanya tetap lazy seperti biasa. */
      const targetIsAllgame = (p.tab === 'allgame');
      const isFirstInTab = targetIsAllgame ? (allgameIndex === 0) : (cheatIndex === 0);
      if(targetIsAllgame) allgameIndex++; else cheatIndex++;
      const loadingAttr = isFirstInTab ? 'fetchpriority="high"' : 'loading="lazy"';

      const cardHtml = `
      <div class="card"
        data-special="${specialMode}"
        data-img="${npAttr(imgUrl)}" data-label="${npAttr(name)}"
        data-icon="" data-platform="${npAttr(platform)}"
        data-fitur='${fiturAttr}'
        data-note="${noteAttr}"
        data-poster="">
        <div class="product-image" data-label="${npAttr(name)}">
          <img src="${npAttr(imgUrl)}" alt="${npAttr(name)}" onerror="this.classList.add('img-error')" ${loadingAttr} decoding="async" width="300" height="200">
        </div>
        <h4>${npEscape(name)}</h4>        <button class="buy-btn" onclick="openModal(this)" style="display:flex;align-items:center;justify-content:center;gap:6px;"><span class="js-icon" data-icon-key="installBtn"></span>INSTALL</button>
      </div>`;

      if(p.tab === 'allgame') allgameHtml += cardHtml;
      else cheatHtml += cardHtml; // default: freefire
    });

    /* 'afterbegin' -> produk baru dari Supabase disisipkan di PALING ATAS grid,
       sebelum 18 produk lama yang hardcoded, supaya produk paling baru selalu
       tampil paling depan (bukan numpuk di bawah). */
    if(cheatHtml) cheatGrid.insertAdjacentHTML('afterbegin', cheatHtml);
    if(allgameHtml) allgameGrid.insertAdjacentHTML('afterbegin', allgameHtml);
    if(configffHtml && configffGrid) configffGrid.insertAdjacentHTML('afterbegin', configffHtml);

    /* Update jumlah di tab-count setelah produk baru masuk ke grid */
    const cheatCountEl = document.getElementById('cheatCount');
    if(cheatCountEl) cheatCountEl.textContent = cheatGrid.querySelectorAll('.card').length;
    const allgameCountEl = document.getElementById('allgameCount');
    if(allgameCountEl) allgameCountEl.textContent = allgameGrid.querySelectorAll('.card').length;
    const configffCountEl = document.getElementById('configffCount');
    if(configffCountEl && configffGrid) configffCountEl.textContent = configffGrid.querySelectorAll('.card').length;

    /* Icon (installBtn dll) dan status produk perlu di-render ulang untuk kartu yang baru ditambahkan */
    if(typeof renderStaticIcons === 'function') renderStaticIcons();
    if(typeof renderProductStatuses === 'function') renderProductStatuses();
  }

  loadDbProducts();
  } // end npInit

  // Script Supabase pakai `defer`, jadi baru siap setelah HTML selesai di-parse.
  // Jalankan npInit begitu window.supabase tersedia (event onload di tag <script>,
  // dgn fallback polling kalau event kelewat karena race condition).
  // PENTING: pakai guard `npInitCalled` supaya npInit() (dan loadDbProducts() di
  // dalamnya) TIDAK PERNAH terpanggil dua kali. Tanpa guard ini, kalau
  // window.supabase sudah tersedia tepat saat polling jalan sebelum event
  // 'npSupabaseReady' sempat ditangkap, kedua jalur (listener + polling) bisa
  // sama-sama memanggil npInit(), sehingga loadDbProducts() meng-insert kartu
  // produk Supabase ke grid dua kali (produk tampil dobel).
  let npInitCalled = false;
  function npInitOnce(){
    if(npInitCalled) return;
    npInitCalled = true;
    npInit();
  }

  if(window.supabase){
    npInitOnce();
  } else {
    window.addEventListener('npSupabaseReady', npInitOnce, {once:true});
    let tries = 0;
    const poll = setInterval(()=>{
      tries++;
      if(window.supabase){ clearInterval(poll); npInitOnce(); }
      else if(tries > 100){ clearInterval(poll); }
    }, 100);
  }
})();
