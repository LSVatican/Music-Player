const SUPABASE_URL = 'https://tyipijrsdnbsowltcptl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3vXZOMGldH_os9xeq1bVwQ_mHNyLPMq';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentAudio = new Audio();

// Inisialisasi Beranda
if (document.getElementById('music-list')) {
    loadSongs();
}

// Format Ukuran File
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Ambil Data Lagu
async function loadSongs() {
    const { data, error } = await supabase.from('songs').select('*');
    if (error) return console.error(error);

    const listContainer = document.getElementById('music-list');
    listContainer.innerHTML = '';

    data.forEach(song => {
        listContainer.innerHTML += `
            <div class="card">
                <div onclick="playMusic('${song.url}', '${song.name}')" style="flex: 1; cursor: pointer;">
                    <div style="font-weight: bold;">${song.name}</div>
                    <div style="font-size: 12px; color: #aaa;">Ukuran: ${song.size}</div>
                </div>
                <button onclick="confirmDelete(${song.id}, '${song.storage_path}')" style="background:none; border:none; color:red; cursor:pointer;">Hapus</button>
            </div>
        `;
    });
}

// Fitur Putar Musik (Background Play ready)
function playMusic(url, title) {
    currentAudio.src = url;
    currentAudio.play();
    document.getElementById('player-bar').style.display = 'block';
    document.getElementById('current-title').innerText = `Memutar: ${title}`;
    
    // Media Session API agar bisa dikontrol di lockscreen/notifikasi
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: title,
            artist: 'LS Vatican Player',
            album: 'Music Player'
        });
    }
}

currentAudio.ontimeupdate = () => {
    const prog = (currentAudio.currentTime / currentAudio.duration) * 100;
    document.getElementById('audio-progress').style.width = prog + '%';
};

// Fitur Unggah
async function handleUpload() {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];
    if (!file) return alert('Pilih file dulu!');

    const fileName = `${Date.now()}_${file.name}`;
    const fileSize = formatBytes(file.size);

    // Upload ke Storage
    const { data, error } = await supabase.storage
        .from('music-bucket')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
        });

    if (error) return alert('Gagal Upload Storage');

    // Dapatkan Public URL
    const { data: urlData } = supabase.storage.from('music-bucket').getPublicUrl(fileName);

    // Simpan ke Database
    const { error: dbError } = await supabase.from('songs').insert([
        { name: file.name, size: fileSize, url: urlData.publicUrl, storage_path: fileName }
    ]);

    if (dbError) alert('Gagal Simpan Database');
    else {
        alert('Berhasil!');
        window.location.href = 'index.html';
    }
}

// Fitur Hapus dengan Kode Verifikasi
async function confirmDelete(id, path) {
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const userInput = prompt(`Ketik kode berikut untuk menghapus: ${randomCode}`);

    if (userInput == randomCode) {
        // Hapus dari Storage
        await supabase.storage.from('music-bucket').remove([path]);
        // Hapus dari Table
        await supabase.from('songs').delete().eq('id', id);
        alert('Berhasil dihapus');
        loadSongs();
    } else {
        alert('Kode salah!');
    }
}

// Update info file saat dipilih di upload.html
if (document.getElementById('file-input')) {
    document.getElementById('file-input').onchange = function() {
        const file = this.files[0];
        if(file) document.getElementById('file-info').innerText = `Ukuran: ${formatBytes(file.size)}`;
    };
}
