# ZDT LIVERY HUB — Cara online ke Netlify

Website ini memakai Supabase untuk login, database, favorit, dan penyimpanan foto. File HTML saja tidak bisa membuat login aman atau menyimpan koleksi bersama tanpa backend.

## 1. Buat database Supabase (gratis untuk mulai)
1. Buka https://supabase.com lalu buat project baru.
2. Tunggu project selesai dibuat.
3. Buka **SQL Editor → New query**.
4. Buka file `supabase/schema.sql`, salin seluruh isinya, tempel ke SQL Editor, lalu tekan **Run**.
5. Buka **Project Settings → API**. Salin `Project URL` dan `anon / publishable key` (jangan pernah pakai `service_role` key di website).

## 2. Sambungkan website ke Supabase
1. Buka `app.js`.
2. Ganti `PASTE_SUPABASE_PROJECT_URL` dengan Project URL.
3. Ganti `PASTE_SUPABASE_ANON_PUBLIC_KEY` dengan anon/publishable key.
4. Simpan file.

## 3. Buat akun admin KYY
1. Di Supabase buka **Authentication → Users → Add user → Create new user**.
2. Masukkan email dan password KYY, lalu buat user.
3. Kembali ke **SQL Editor**, jalankan query ini dengan email akun KYY:
   `update public.profiles p set role = 'admin' from auth.users u where p.id = u.id and u.email = 'EMAIL_KYY';`
4. Login di website menggunakan email dan password tadi. Tab **Upload** akan muncul.
5. Buat akun member lewat **Authentication → Users → Add user → Create new user**. Setiap akun baru otomatis ber-role `member`. Berikan email dan password ke member. Tidak ada tombol daftar publik.

## 4. Upload ke Netlify
1. Ekstrak ZIP ini.
2. Pastikan `index.html`, `style.css`, `app.js`, `netlify.toml`, dan folder `supabase` berada langsung di folder utama project.
3. Buka https://app.netlify.com/drop dan upload folder project (atau ZIP project).
4. Netlify akan memberikan alamat website. Buka alamat itu untuk login.

## Cara penggunaan
- Admin login → tab **Upload** → pilih satu foto, isi nama, kode body, dan kode kaca → Upload Livery.
- Semua member yang login akan melihat livery baru.
- Member login memakai username (tanpa email) dan password. Username dibuat admin dari bagian depan email internal, misalnya `drifter01@zdtmember.com` berarti username `drifter01`. Member tekan ☆ untuk menyimpan favorit.
- Tombol **SALIN BODY** dan **SALIN KACA** menyalin kode ke clipboard.
- Admin bisa menghapus livery dari bagian Kelola Livery.

## Catatan penting
- Jangan pernah menaruh Supabase `service_role` key di `app.js` atau file website.
- Foto maksimal 5 MB, format JPG/PNG/WEBP.
- Untuk keamanan, jangan membagikan password admin. Buat akun terpisah untuk tiap member.
- URL dan key Supabase pada `app.js` harus diisi sebelum deploy; kalau belum, website hanya menampilkan pesan setup dan login belum aktif.
- Supabase dan Netlify punya batas penggunaan paket gratis yang dapat berubah. Cek dashboard masing-masing untuk pemakaian.

## Sistem username (tanpa email pribadi)
- Website memetakan username menjadi email internal Supabase dengan domain `@zdtmember.com`.
- Saat membuat member, buka Authentication → Users → Add user.
- Isi email internal, misalnya `anggota01@zdtmember.com`, dan password yang akan diberikan secara pribadi.
- Pastikan email confirmation dimatikan/akun dikonfirmasi saat dibuat oleh admin.
- Beritahu member username `anggota01`; mereka tidak perlu memberikan atau memakai email pribadi.
- Akun admin lama yang memakai email asli perlu dibuat ulang dengan username internal, atau tetap login menggunakan email setelah penyesuaian kode khusus admin. Versi ini menggunakan format username untuk semua akun.
- Jangan memakai alamat email asli anggota sebagai email internal.
