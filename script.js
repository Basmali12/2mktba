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

// تغيير النص عند اختيار الصورة
['img1', 'img2', 'img3', 'img4'].forEach((id, index) => {
    document.getElementById(id).addEventListener('change', function() {
        if(this.files[0]) document.getElementById(`label${index+1}`).innerText = "تم الاختيار ✔️";
    });
});

async function createA4Image() {
    const canvas = document.getElementById('a4-canvas');
    const ctx = canvas.getContext('2d');
    const imgs = [
        document.getElementById('img1').files[0],
        document.getElementById('img2').files[0],
        document.getElementById('img3').files[0],
        document.getElementById('img4').files[0]
    ];

    if (imgs.some(i => !i)) throw new Error("يرجى اختيار 4 صور بالكامل");

    // ملء الخلفية باللون الأبيض لورقة A4
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width / 2;
    const h = canvas.height / 2;

    for (let i = 0; i < 4; i++) {
        const imgObj = await createImageBitmap(imgs[i]);
        const x = (i % 2) * w;
        const y = Math.floor(i / 2) * h;
        // رسم الصورة مع الحفاظ على الأبعاد وملء الخلية
        ctx.drawImage(imgObj, x, y, w, h); 
    }

    return new Promise(res => canvas.toBlob(res, 'image/png', 1.0));
}

async function uploadToImgBB(blob) {
    const formData = new FormData();
    formData.append('image', blob);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData
    });
    const data = await res.json();
    return data.data.url;
}

document.getElementById('process-btn').onclick = async () => {
    const status = document.getElementById('status');
    const userName = document.getElementById('user-name').value;
    
    if(!userName) return alert("يرجى إدخال اسمك");

    try {
        status.innerText = "جاري تجهيز الألبوم ورفعه... يرجى الانتظار";
        const a4Blob = await createA4Image();
        const url = await uploadToImgBB(a4Blob);
        
        await push(ref(db, 'orders'), {
            customer: userName,
            imgUrl: url,
            timestamp: Date.now(),
            status: "جديد"
        });
        
        status.innerText = "تم إرسال الطلب بنجاح! شكراً لك.";
        status.style.color = "#4ade80";
    } catch (error) {
        status.innerText = error.message;
        status.style.color = "#ff4d4d";
    }
};
