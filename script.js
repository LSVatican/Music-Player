// GANTI DENGAN DATA DARI PROJECT SUPABASE-MU
const SUPABASE_URL = 'https://tyipijrsdnbsowltcptl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3vXZOMGldH_os9xeq1bVwQ_mHNyLPMq';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const musicList = document.getElementById('music-list');
const audioPlayer = document.getElementById('audio-player');

// 1. Deteksi Ukuran File Saat Pilih
if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            fileInfo.innerText = `Ukuran file: ${sizeMB} MB`;
        }
    });
}

// 2. Fungsi Unggah
async function uploadFile() {
    const file = fileInput.files[0];
    if (!file) return alert("Pilih file dulu!");

    const progressBar = document.getElementById('progress-bar');
    const container = document.getElementById('progress-container');
    container.classList.remove('hidden');

    const fileName = `${Date.now()}_${file.name}`;
    
    // Proses Upload ke Storage Supabase
    const { data, error } = await supabase.storage
        .from('musics') // Nama bucket di Supabase
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        alert("Gagal upload: " + error.message);
    } else {
        // Simpan metadata ke tabel Database
        const { error: dbError } = await supabase
            .from('music_list')
            .insert([{ 
                name: file.name, 
                url: fileName, 
                size: (file.size / (1024 * 1024)).toFixed(2) + " MB" 
            }]);
        
        alert("Berhasil diunggah!");
        window.location.href = "index.html";
    }
}

// 3. Load Daftar Lagu di Beranda
async function loadSongs() {
    if (!musicList) return;

    const { data, error } = await supabase
        .from('music_list')
        .select('*');

    if (error) return musicList.innerHTML = "Gagal memuat lagu.";
    
    musicList.innerHTML = "";
    data.forEach(song => {
        const card = document.createElement('div');
        card.className = 'music-card';
        card.innerHTML = `
            <div style="text-align: left;">
                <strong style="color: #ff85a2;">${song.name}</strong><br>
                <small>${song.size}</small>
            </div>
            <button class="btn-main" onclick="playMusic('${song.url}', '${song.name}')">Putar</button>
        `;
        musicList.appendChild(card);
    });
}

// 4. Fungsi Putar & Background Play
function playMusic(fileName, name) {
    const { data } = supabase.storage.from('musics').getPublicUrl(fileName);
    const url = data.publicUrl;

    document.getElementById('player-bar').classList.remove('hidden');
    document.getElementById('now-playing').innerText = "Memutar: " + name;
    
    audioPlayer.src = url;
    audioPlayer.play();

    // Integrasi Media Session (Agar bisa dikontrol di Lock Screen / Background)
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: name,
            artist: 'Music Player',
            album: 'LS Vatican Collection'
        });
    }
}

// Jalankan load lagu jika di index
if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
    loadSongs();
}
