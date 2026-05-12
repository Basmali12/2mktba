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

// --- شاشة البداية (Splash Screen) ---
setTimeout(() => {
    document.getElementById('splash-screen').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('splash-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
    }, 1000);
}, 2500);

let templates = [];
let currentEditInfo = { templateIndex: null, imageIndex: null };

// --- إنشاء قالب جديد ---
window.addNewTemplate = () => {
    const tempIndex = templates.length;
    templates.push([null, null, null, null]);
    
    const container = document.getElementById('templates-container');
    const tempDiv = document.createElement('div');
    tempDiv.className = 'template-card';
    tempDiv.innerHTML = `
        <h3 class="template-title">صفحة رقم ${tempIndex + 1}</h3>
        <div class="upload-grid">
            ${[0,1,2,3].map(i => `
                <div class="drop-zone" onclick="openEditor(${tempIndex}, ${i})">
                    <span id="label-${tempIndex}-${i}">+ صورة ${i+1}</span>
                    <canvas id="prev-${tempIndex}-${i}" class="preview-canvas"></canvas>
                </div>
            `).join('')}
        </div>
    `;
    container.appendChild(tempDiv);
};

// إضافة قالب أول افتراضي عند فتح التطبيق
addNewTemplate();

// --- المتغيرات للمحرر ---
const modal = document.getElementById('editor-modal');
const cropCanvas = document.getElementById('crop-canvas');
const ctx = cropCanvas.getContext('2d');
const zoomSlider = document.getElementById('zoom-slider');
let activeImg = null, posX = 0, posY = 0, scale = 1, isDragging = false, startX, startY;

// فتح المحرر
window.openEditor = (tIdx, iIdx) => {
    currentEditInfo = { templateIndex: tIdx, imageIndex: iIdx };
    modal.style.display = 'flex';
    const data = templates[tIdx][iIdx];
    if (!data) { 
        document.getElementById('file-input').click(); 
    } else { 
        loadToEditor(data); 
    }
};

// اختيار الصورة
document.getElementById('file-input').onchange = (e) => {
    if(!e.target.files[0]) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            activeImg = img; scale = 1; posX = 0; posY = 0; zoomSlider.value = 1;
            loadToEditor({img, posX, posY, scale});
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(e.target.files[0]);
    e.target.value = ''; // تصفير الحقل لاختيار نفس الصورة إن لزم الأمر
};

function loadToEditor(data) {
    activeImg = data.img; posX = data.posX; posY = data.posY; scale = data.scale;
    zoomSlider.value = scale; cropCanvas.width = 300; cropCanvas.height = 400; 
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

// أحداث اللمس والماوس للتحريك داخل المحرر
cropCanvas.addEventListener('touchstart', (e) => { 
    isDragging = true; 
    startX = e.touches[0].clientX - posX; 
    startY = e.touches[0].clientY - posY; 
}, {passive: true});

cropCanvas.addEventListener('touchend', () => isDragging = false);

cropCanvas.addEventListener('touchmove', (e) => {
    if (!isDragging) return; 
    e.preventDefault();
    posX = e.touches[0].clientX - startX; 
    posY = e.touches[0].clientY - startY; 
    drawEditor();
}, {passive: false});

// دعم الماوس للحاسوب
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
    const tIdx = currentEditInfo.templateIndex;
    const iIdx = currentEditInfo.imageIndex;
    templates[tIdx][iIdx] = { img: activeImg, posX, posY, scale };
    
    const pCanvas = document.getElementById(`prev-${tIdx}-${iIdx}`);
    const pCtx = pCanvas.getContext('2d');
    pCanvas.width = 300; pCanvas.height = 400;
    pCtx.save();
    pCtx.translate(pCanvas.width/2 + posX, pCanvas.height/2 + posY);
    pCtx.scale(scale, scale);
    pCtx.drawImage(activeImg, -activeImg.width/2, -activeImg.height/2);
    pCtx.restore();
    
    document.getElementById(`label-${tIdx}-${iIdx}`).style.display = 'none';
    window.closeEditor();
};

window.closeEditor = () => modal.style.display = 'none';

// نظام التنبيهات الذكي المخصص
window.showAlert = (title, msg) => {
    document.getElementById('alert-title').innerText = title;
    document.getElementById('alert-message').innerText = msg;
    document.getElementById('custom-alert').style.display = 'flex';
};

// --- الرفع النهائي (باستخدام Base64 لحل مشكلة Failed to fetch) ---
document.getElementById('process-btn').onclick = async () => {
    const name = document.getElementById('user-name').value;
    if (!name) return window.showAlert("بيانات ناقصة", "يرجى كتابة اسمك الكريم أولاً.");
    
    // التحقق من اكتمال جميع القوالب
    for (let t = 0; t < templates.length; t++) {
        if (templates[t].includes(null)) return window.showAlert("صور ناقصة", `الصفحة رقم ${t+1} غير مكتملة، يرجى ملء الـ 4 صور.`);
    }

    const progressModal = document.getElementById('progress-modal');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    progressModal.style.display = 'flex';
    
    const uploadedUrls = [];
    const a4Canvas = document.getElementById('a4-canvas');
    const a4Ctx = a4Canvas.getContext('2d');

    try {
        for (let t = 0; t < templates.length; t++) {
            progressText.innerText = `جاري معالجة ورفع الصفحة ${t+1} من ${templates.length}`;
            
            a4Ctx.fillStyle = "white";
            a4Ctx.fillRect(0, 0, 2480, 3508);

            // تحسين بصري بسيط لجودة الطباعة
            a4Ctx.imageSmoothingEnabled = true;
            a4Ctx.imageSmoothingQuality = 'high';
            a4Ctx.filter = 'contrast(1.05) saturate(1.1)';

            const w = 2480 / 2;
            const h = 3508 / 2;
            const gap = 30; // الفراغ الأبيض بين الصور

            templates[t].forEach((data, i) => {
                const x = (i % 2) * w;
                const y = Math.floor(i / 2) * h;
                
                a4Ctx.save();
                a4Ctx.beginPath();
                a4Ctx.rect(x + gap, y + gap, w - (gap*2), h - (gap*2));
                a4Ctx.clip();
                
                const ratio = (w - gap*2) / 300;
                a4Ctx.translate(x + gap + (w - gap*2)/2 + (data.posX * ratio), y + gap + (h - gap*2)/2 + (data.posY * ratio));
                a4Ctx.scale(data.scale * ratio, data.scale * ratio);
                a4Ctx.drawImage(data.img, -data.img.width/2, -data.img.height/2);
                a4Ctx.restore();
            });

            // استخراج الصورة كنص Base64 بجودة 0.8 لتسريع الرفع وتجنب انقطاع الاتصال
            const dataUrl = a4Canvas.toDataURL('image/jpeg', 0.8);
            const base64Data = dataUrl.split(',')[1]; 

            const formData = new FormData();
            formData.append('image', base64Data);
            
            // رفع الصورة باستخدام fetch مع معالجة الأخطاء
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { 
                method: 'POST', 
                body: formData 
            }).catch(err => { 
                throw new Error("تعذر الوصول لسيرفر الصور، يرجى فحص الإنترنت وإلغاء أي مانع إعلانات."); 
            });
            
            if (!res.ok) throw new Error("السيرفر رفض الصورة، تأكد من استقرار الشبكة.");
            
            const result = await res.json();
            if(!result.success) throw new Error(result.error.message || "حدث خطأ غير معروف في سيرفر الرفع");
            
            uploadedUrls.push(result.data.url);
            
            // تحديث شريط التقدم
            const percent = ((t + 1) / templates.length) * 100;
            progressBar.style.width = percent + '%';
        }

        // إرسال الطلب لقاعدة البيانات Firebase
        progressText.innerText = "جاري إرسال الطلب للإدارة...";
        await push(ref(db, 'orders'), {
            customer: name,
            pages: uploadedUrls, 
            timestamp: Date.now()
        });

        progressModal.style.display = 'none';
        window.showAlert("نجاح!", "تم إرسال الألبوم بالكامل بنجاح. شكراً لك!");
        
        // تحديث الصفحة بعد 3 ثواني للزبون التالي
        setTimeout(() => location.reload(), 3000); 

    } catch (err) {
        progressModal.style.display = 'none';
        window.showAlert("حدث خطأ", err.message);
    }
};
