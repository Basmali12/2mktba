import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getDatabase, ref, push } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAEX8BjlYjsHOxDwD-Wu9qyFyIR3Wb6RxQ",
    authDomain: "mtgr-24718.firebaseapp.com",
    databaseURL: "https://mtgr-24718-default-rtdb.firebaseio.com",
    projectId: "mtgr-24718",
    storageBucket: "mtgr-24718.firebasestorage.app",
    messagingSenderId: "385919783070",
    appId: "1:385919783070:web:64f2703ec8cc0fd1c5ab8f"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const IMGBB_API_KEY = "7765600ba5d52e397d9eb90496cc46c6";

let imagesData = [null, null, null, null];
let currentIdx = null;

const modal = document.getElementById('editor-modal');
const cropCanvas = document.getElementById('crop-canvas');
const ctx = cropCanvas.getContext('2d');
const zoomSlider = document.getElementById('zoom-slider');

let activeImg = null;
let posX = 0, posY = 0, scale = 1;
let isDragging = false;
let startX, startY;

// --- نظام التنبيهات الذكي والـ 3D ---
window.showCustomAlert = (title, message, type = "info") => {
    document.getElementById('alert-title').innerText = title;
    document.getElementById('alert-message').innerText = message;
    
    const icon = document.getElementById('alert-icon');
    const titleEl = document.getElementById('alert-title');
    
    if(type === "error") {
        icon.innerText = "⚠️";
        titleEl.style.color = "#ef4444";
    } else if (type === "success") {
        icon.innerText = "✅";
        titleEl.style.color = "#10b981";
    } else if (type === "loading") {
        icon.innerText = "⏳";
        titleEl.style.color = "#3b82f6";
    }
    
    document.getElementById('custom-alert').style.display = 'flex';
};

window.closeAlert = () => {
    document.getElementById('custom-alert').style.display = 'none';
};

// --- محرر الصور ---
window.openEditor = (idx) => {
    currentIdx = idx;
    modal.style.display = 'flex';
    if (!imagesData[idx]) {
        document.getElementById('file-input').click();
    } else {
        loadToEditor(imagesData[idx]);
    }
};

document.getElementById('file-input').onchange = (e) => {
    if(!e.target.files[0]) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            activeImg = img;
            scale = 1; posX = 0; posY = 0;
            zoomSlider.value = 1;
            loadToEditor({img, posX, posY, scale});
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(e.target.files[0]);
    e.target.value = ''; // تصفير الحقل ليتمكن من اختيار نفس الصورة مجدداً إن أراد
};

function loadToEditor(data) {
    activeImg = data.img;
    posX = data.posX; posY = data.posY; scale = data.scale;
    zoomSlider.value = scale;
    
    // دقة الكانفاس الداخلية (ثابتة للرسم)
    cropCanvas.width = 300;
    cropCanvas.height = 400; 
    drawEditor();
}

function drawEditor() {
    if (!activeImg) return;
    ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
    ctx.save();
    ctx.translate(cropCanvas.width/2 + posX, cropCanvas.height/2 + posY);
    ctx.scale(scale, scale);
    ctx.drawImage(activeImg, -activeImg.width/2, -activeImg.height/2);
    ctx.restore();
}

// التحكم باللمس لشاشات الهواتف
cropCanvas.addEventListener('touchstart', (e) => {
    isDragging = true;
    startX = e.touches[0].clientX - posX;
    startY = e.touches[0].clientY - posY;
}, {passive: true});

cropCanvas.addEventListener('touchend', () => isDragging = false);
cropCanvas.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    e.preventDefault(); // منع نزول الشاشة أثناء التحريك
    posX = e.touches[0].clientX - startX;
    posY = e.touches[0].clientY - startY;
    drawEditor();
}, {passive: false});

// التحكم بالماوس (للحاسوب إن وجد)
cropCanvas.onmousedown = (e) => { isDragging = true; startX = e.clientX - posX; startY = e.clientY - posY; };
window.onmouseup = () => isDragging = false;
window.onmousemove = (e) => {
    if (!isDragging) return;
    posX = e.clientX - startX; posY = e.clientY - startY;
    drawEditor();
};

zoomSlider.oninput = (e) => { scale = parseFloat(e.target.value); drawEditor(); };

window.saveCrop = () => {
    if(!activeImg) return;
    imagesData[currentIdx] = { img: activeImg, posX, posY, scale };
    updatePreview(currentIdx);
    closeEditor();
};

window.closeEditor = () => modal.style.display = 'none';

function updatePreview(idx) {
    const pCanvas = document.getElementById(`prev-${idx}`);
    const pCtx = pCanvas.getContext('2d');
    pCanvas.width = 300; pCanvas.height = 400;
    
    const data = imagesData[idx];
    pCtx.save();
    pCtx.translate(pCanvas.width/2 + data.posX, pCanvas.height/2 + data.posY);
    pCtx.scale(data.scale, data.scale);
    pCtx.drawImage(data.img, -data.img.width/2, -data.img.height/2);
    pCtx.restore();
    
    document.getElementById(`label-${idx}`).style.display = 'none';
}

// --- معالجة الرفع (مع الضغط إلى JPEG) ---
document.getElementById('process-btn').onclick = async () => {
    const name = document.getElementById('user-name').value;
    
    if (!name) {
        showCustomAlert("بيانات ناقصة", "يرجى كتابة اسمك الكريم أولاً لكي نعرف طلبك.", "error");
        return;
    }
    if (imagesData.includes(null)) {
        showCustomAlert("صور ناقصة", "يرجى اختيار وضبط الـ 4 صور بالكامل قبل الإرسال.", "error");
        return;
    }

    showCustomAlert("جاري المعالجة", "يرجى الانتظار، جاري تجميع الألبوم ورفعه للمطبعة...", "loading");
    
    try {
        const a4Canvas = document.getElementById('a4-canvas');
        const a4Ctx = a4Canvas.getContext('2d');
        
        a4Ctx.fillStyle = "white";
        a4Ctx.fillRect(0, 0, 2480, 3508);

        const w = 2480 / 2;
        const h = 3508 / 2;

        imagesData.forEach((data, i) => {
            const x = (i % 2) * w;
            const y = Math.floor(i / 2) * h;
            a4Ctx.save();
            a4Ctx.beginPath();
            a4Ctx.rect(x, y, w, h);
            a4Ctx.clip();
            
            const ratio = w / 300;
            a4Ctx.translate(x + w/2 + (data.posX * ratio), y + h/2 + (data.posY * ratio));
            a4Ctx.scale(data.scale * ratio, data.scale * ratio);
            a4Ctx.drawImage(data.img, -data.img.width/2, -data.img.height/2);
            a4Ctx.restore();
        });

        // التحويل إلى JPEG بجودة 90% لتسريع الرفع لتجنب Failed to fetch
        a4Canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('image', blob);
            
            try {
                const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                    method: 'POST',
                    body: formData
                });
                
                if (!res.ok) throw new Error("مشكلة في الاتصال بالشبكة");

                const result = await res.json();
                if (result.success) {
                    await push(ref(db, 'orders'), {
                        customer: name,
                        imgUrl: result.data.url,
                        timestamp: Date.now()
                    });
                    
                    // تنبيه النجاح
                    showCustomAlert("تم بنجاح!", "تم إرسال الصور للمطبعة بنجاح. شكراً لك!", "success");
                    
                    // تصفير الواجهة بعد الإرسال
                    document.getElementById('user-name').value = '';
                    imagesData = [null, null, null, null];
                    for(let i=0; i<4; i++) {
                        const pCtx = document.getElementById(`prev-${i}`).getContext('2d');
                        pCtx.clearRect(0, 0, 300, 400);
                        document.getElementById(`label-${i}`).style.display = 'block';
                    }
                    
                } else {
                    throw new Error("سيرفر الصور رفض الملف");
                }
            } catch (err) {
                showCustomAlert("فشل الرفع", "تأكد من قوة اتصالك بالإنترنت وحاول مجدداً.", "error");
            }
        }, 'image/jpeg', 0.9);

    } catch (err) {
        showCustomAlert("حدث خطأ", err.message, "error");
    }
};
