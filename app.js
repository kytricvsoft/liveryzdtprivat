// 1) Buat project Supabase, lalu isi dua nilai di bawah ini.
const SUPABASE_URL = "https://agcmlotbxopqzvilymih.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_IKY0sgH2_p3HldkMN1x2DQ_u3hKqvvS";

const configured = !SUPABASE_URL.startsWith("PASTE_") && !SUPABASE_ANON_KEY.startsWith("PASTE_");
let db = null;
let supabaseReady = false;
let currentUser = null, isAdmin = false, allLiveries = [], favoriteIds = new Set();

const $ = (id) => document.getElementById(id);
const show = (id) => $(id).classList.remove("hidden");
const hide = (id) => $(id).classList.add("hidden");
const safe = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const notify = (message) => { $("notice").textContent = message; show("notice"); setTimeout(()=>hide("notice"),3500); };

async function loadSupabaseLibrary() {
  if (window.supabase && window.supabase.createClient) return true;
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.async = true;
    const timer = setTimeout(() => resolve(false), 9000);
    script.onload = () => { clearTimeout(timer); resolve(!!(window.supabase && window.supabase.createClient)); };
    script.onerror = () => { clearTimeout(timer); resolve(false); };
    document.head.appendChild(script);
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  // Tampilkan halaman secepatnya; jangan biarkan loader menunggu CDN.
  show("app");
  setTimeout(() => { $("loader").style.opacity = "0"; setTimeout(() => hide("loader"), 380); }, 250);
  if (!configured) { show("login-view"); $("login-error").textContent = "Website belum dikonfigurasi. Hubungi admin."; return; }
  supabaseReady = await loadSupabaseLibrary();
  if (!supabaseReady) { show("login-view"); $("login-error").textContent = "Halaman berhasil dibuka, tetapi layanan login gagal dimuat. Periksa koneksi lalu refresh."; return; }
  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  try {
    const {data:{session}, error} = await db.auth.getSession();
    if (error) throw error;
    if (session) await enterHub(session.user); else show("login-view");
  } catch (error) {
    console.error("Supabase startup error:", error);
    show("login-view"); $("login-error").textContent = "Tidak bisa menghubungi server login. Coba refresh beberapa saat lagi.";
  }
});

$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault(); $("login-error").textContent = "Memeriksa akun...";
  if (!db) { $("login-error").textContent = "Layanan login belum siap. Refresh halaman dulu."; return; }
  const username = $("login-email").value.trim().toLowerCase(), password = $("login-password").value;
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    $("login-error").textContent = "Username harus 3–30 karakter: huruf, angka, titik, garis bawah, atau strip.";
    return;
  }
  // Username member dipetakan ke email internal Supabase; member tidak perlu memberikan email pribadi.
  const email = `${username}@zdtmember.com`;
  try {
    const {data,error} = await db.auth.signInWithPassword({email,password});
    if (error) { $("login-error").textContent = "Login gagal. Periksa username dan password."; return; }
    await enterHub(data.user);
  } catch (error) {
    console.error("Login error:", error);
    $("login-error").textContent = "Koneksi ke server login bermasalah. Coba lagi nanti.";
  }
});

$("logout-btn").addEventListener("click", async () => { await db.auth.signOut(); location.reload(); });

async function enterHub(user) {
  currentUser = user;
  const {data:profile,error} = await db.from("profiles").select("role,display_name").eq("id",user.id).single();
  if (error || !profile) { await db.auth.signOut(); show("login-view"); $("login-error").textContent="Profil akun belum tersedia. Hubungi admin."; return; }
  isAdmin = profile.role === "admin";
  $("user-label").textContent = profile.display_name || user.email.split("@")[0];
  hide("login-view"); show("hub-view"); show("logout-btn");
  if (isAdmin) show("admin-tab");
  await loadFavorites(); await loadLiveries();
}

async function loadFavorites() {
  const {data,error} = await db.from("favorites").select("livery_id").eq("user_id",currentUser.id);
  if (!error) favoriteIds = new Set((data||[]).map(x=>x.livery_id));
}
async function loadLiveries() {
  const {data,error} = await db.from("liveries").select("id,name,image_url,created_at").order("created_at",{ascending:false});
  if (error) { notify("Gagal memuat livery. Cek pengaturan database."); return; }
  allLiveries = data || []; $("livery-count").textContent = `${allLiveries.length} LIVERY`;
  renderCards("livery-list",allLiveries,"empty-all"); renderCards("favorite-list",allLiveries.filter(x=>favoriteIds.has(x.id)),"empty-fav");
  if (isAdmin) renderManage();
}
function renderCards(target,items,emptyId) {
  const host=$(target); host.innerHTML="";
  if (!items.length) { show(emptyId); return; } hide(emptyId);
  items.forEach(item=>{
    const card=document.createElement("article"); card.className="livery-card";
    card.innerHTML=`<img class="livery-image" src="${safe(item.image_url)}" alt="${safe(item.name)}" loading="lazy">
      <div class="livery-info"><div class="livery-top"><h3 class="livery-title">${safe(item.name)}</h3>
      <button class="favorite-btn ${favoriteIds.has(item.id)?"saved":""}" aria-label="Favorit">${favoriteIds.has(item.id)?"★":"☆"}</button></div>
      <div class="livery-meta">ZDT COLLECTION</div><div class="copy-row">
      <button class="copy-btn" data-copy="body">SALIN BODY</button><button class="copy-btn" data-copy="glass">SALIN KACA</button></div></div>`;
    card.querySelector(".favorite-btn").addEventListener("click",()=>toggleFavorite(item.id));
    card.querySelector('[data-copy="body"]').addEventListener("click",()=>copyCode(item.id,"body"));
    card.querySelector('[data-copy="glass"]').addEventListener("click",()=>copyCode(item.id,"glass"));
    host.appendChild(card);
  });
}
async function toggleFavorite(id) {
  if (favoriteIds.has(id)) {
    const {error}=await db.from("favorites").delete().eq("user_id",currentUser.id).eq("livery_id",id);
    if (error) return notify("Gagal mengubah favorit."); favoriteIds.delete(id);
  } else {
    const {error}=await db.from("favorites").insert({user_id:currentUser.id,livery_id:id});
    if (error) return notify("Gagal menyimpan favorit."); favoriteIds.add(id);
  }
  renderCards("livery-list",allLiveries,"empty-all"); renderCards("favorite-list",allLiveries.filter(x=>favoriteIds.has(x.id)),"empty-fav");
}
async function copyCode(id,type) {
  const {data,error}=await db.from("liveries").select(type==="body"?"body_code":"glass_code").eq("id",id).single();
  if (error) return notify("Kode gagal diambil.");
  try { await navigator.clipboard.writeText(data[type==="body"?"body_code":"glass_code"]); notify(type==="body"?"Kode BODY berhasil disalin!":"Kode KACA berhasil disalin!"); }
  catch { notify("Browser tidak mengizinkan salin otomatis. Coba buka website lewat HTTPS."); }
}

document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active")); btn.classList.add("active");
  ["all","favorites","admin"].forEach(p=>$(p+"-page").classList.toggle("hidden",p!==btn.dataset.page));
}));

$("upload-form").addEventListener("submit",async e=>{
  e.preventDefault(); if(!isAdmin) return;
  const file=$("photo").files[0], name=$("livery-name").value.trim(), body=$("body-code").value.trim(), glass=$("glass-code").value.trim();
  if(!file) return;
  if(!file.type.startsWith("image/")) return $("upload-status").textContent="Pilih file gambar.";
  if(file.size>5*1024*1024) return $("upload-status").textContent="Ukuran foto maksimal 5 MB.";
  $("upload-btn").disabled=true; $("upload-status").textContent="Sedang mengupload...";
  const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"");
  const path=`${currentUser.id}/${crypto.randomUUID()}.${ext}`;
  const {error:uploadError}=await db.storage.from("livery-images").upload(path,file,{upsert:false,contentType:file.type});
  if(uploadError){$("upload-status").textContent="Upload foto gagal: "+uploadError.message;$("upload-btn").disabled=false;return;}
  const {data:{publicUrl}}=db.storage.from("livery-images").getPublicUrl(path);
  const {error:insertError}=await db.from("liveries").insert({name,body_code:body,glass_code:glass,image_url:publicUrl,storage_path:path,created_by:currentUser.id});
  if(insertError){await db.storage.from("livery-images").remove([path]);$("upload-status").textContent="Gagal menyimpan data: "+insertError.message;}
  else {$("upload-form").reset();$("upload-status").textContent="Livery berhasil ditambahkan!";notify("Livery baru sudah tampil untuk semua member.");await loadLiveries();}
  $("upload-btn").disabled=false;
});
async function renderManage() {
  const host=$("manage-list"); host.innerHTML="";
  allLiveries.forEach(item=>{
    const row=document.createElement("div");row.className="manage-item";
    row.innerHTML=`<span>${safe(item.name)}</span><button class="delete-btn">HAPUS</button>`;
    row.querySelector("button").addEventListener("click",()=>deleteLivery(item));host.appendChild(row);
  });
}
async function deleteLivery(item) {
  if(!confirm(`Hapus livery "${item.name}"?`)) return;
  const {error}=await db.from("liveries").delete().eq("id",item.id);
  if(error) return notify("Gagal menghapus livery.");
  if(item.storage_path) await db.storage.from("livery-images").remove([item.storage_path]);
  await loadFavorites();await loadLiveries();notify("Livery berhasil dihapus.");
}
