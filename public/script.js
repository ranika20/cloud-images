// ברגע שהדף נטען במלואו, נמשוך ונציג את התמונות הקיימות בגלריה
document.addEventListener('DOMContentLoaded', function() {
    loadGallery();
});

document.getElementById('uploadForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const fileInput = document.getElementById('imageInput');
    const messageDiv = document.getElementById('message');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const previewContainer = document.getElementById('previewContainer');
    const uploadBtn = document.getElementById('uploadBtn');
    
    // שליפת שדה קלט התיאור החדש שהוספנו
    const descriptionInput = document.getElementById('descriptionInput');
    
    if (fileInput.files.length === 0) return;

    const formData = new FormData();
    formData.append('image', fileInput.files[0]);
    // הוספת התיאור לתוך המידע שנשלח בבקשה לשרת
    formData.append('description', descriptionInput ? descriptionInput.value : "");

    // איפוס והצגת שורת התקדמות
    messageDiv.innerText = "";
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    progressBar.innerText = '0%';
    uploadBtn.disabled = true;

    // מעקב אחר אחוזים בזמן אמת באמצעות XMLHttpRequest
    const xhr = new XMLHttpRequest();
    // שינוי חשוב: שינינו את הנתיב לכתובת יחסית '/upload' כדי שיעבוד גם ב-Render וגם מקומית!
    xhr.open('POST', '/upload', true);
    
    xhr.upload.addEventListener('progress', function(e) {
        if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            progressBar.style.width = percentComplete + '%';
            progressBar.innerText = percentComplete + '%';
        }
    });

    xhr.onload = function() {
        uploadBtn.disabled = false;
        progressContainer.style.display = 'none';

        // השרת עונה בסטטוס 201 (Created) לאחר העלאה מוצלחת
        if (xhr.status === 201) {
            const response = JSON.parse(xhr.responseText);
            messageDiv.innerText = "🎉 " + response.message;
            messageDiv.style.color = "green";
            
            // איפוס הטופס
            fileInput.value = "";
            if (descriptionInput) descriptionInput.value = ""; // איפוס תיבת התיאור
            previewContainer.style.display = 'none';

            // ריענון הגלריה כדי שהתמונה החדשה תופיע מיד בלי צורך ברענון ידני של הדף
            loadGallery();
        } else {
            const response = JSON.parse(xhr.responseText || '{}');
            messageDiv.innerText = "❌ Error: " + (response.error || "Upload failed.");
            messageDiv.style.color = "red";
        }
    };

    xhr.onerror = function() {
        uploadBtn.disabled = false;
        progressContainer.style.display = 'none';
        messageDiv.innerText = "🌐 Connection error.";
        messageDiv.style.color = "red";
    };

    xhr.send(formData);
});

// הצגת תצוגה מקדימה כשבוחרים קובץ
document.getElementById('imageInput').addEventListener('change', function(e) {
    const previewContainer = document.getElementById('previewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const files = e.target.files;

    if (files && files.length > 0) {
        const reader = new FileReader();
        reader.onload = function(event) {
            imagePreview.src = event.target.result;
            previewContainer.style.display = 'block';
        }
        reader.readAsDataURL(files[0]);
    } else {
        previewContainer.style.display = 'none';
    }
});

// פונקציה חדשה: טעינת רשימת התמונות מהשרת והצגתן בגלריה
function loadGallery() {
    const gallery = document.getElementById('gallery');
    const noImagesMessage = document.getElementById('noImagesMessage');
    
    if (!gallery) return;

    // פנייה לשרת לקבלת מערך התמונות והתיאורים מ-S3
    fetch('/images')
        .then(function(response) {
            return response.json();
        })
        .then(function(images) {
            // ניקוי אזור הגלריה מתמונות ישנות (לפני הרינדור מחדש)
            gallery.innerHTML = '';

            // אם אין תמונות בבאקט בכלל
            if (images.length === 0) {
                if (noImagesMessage) {
                    gallery.appendChild(noImagesMessage);
                    noImagesMessage.style.display = 'block';
                }
                return;
            }

            // יצירת אלמנט HTML לכל תמונה במערך שחזר מ-S3
            images.forEach(function(img) {
                const item = document.createElement('div');
                item.className = 'gallery-item';

                item.innerHTML = `
                    <img src="${img.url}" alt="${img.description}">
                    <div class="gallery-info">
                        <p class="gallery-description">${img.description}</p>
                        <button class="delete-btn" data-key="${img.key}">Delete</button>
                    </div>
                `;

                gallery.appendChild(item);
            });

            // הוספת מאזין לחיצה לכל אחד מכפתורי המחיקה (Delete) של התמונות
            const deleteButtons = document.querySelectorAll('.delete-btn');
            deleteButtons.forEach(function(button) {
                button.addEventListener('click', function(e) {
                    const key = e.target.getAttribute('data-key');
                    // הצגת תיבת אישור מוקפצת לפני מחיקה
                    if (confirm('Are you sure you want to delete this image?')) {
                        deleteImage(key);
                    }
                });
            });
        })
        .catch(function(error) {
            console.error('Error loading gallery:', error);
        });
}

// פונקציה חדשה: שליחת בקשת מחיקה לשרת
function deleteImage(key) {
    // שליחת בקשה מסוג DELETE עם שם הקובץ (Key) מקודד בנתיב
    fetch('/images/' + encodeURIComponent(key), {
        method: 'DELETE'
    })
    .then(function(response) {
        if (response.ok) {
            // אם המחיקה הצליחה, נטען מחדש את הגלריה המעודכנת
            loadGallery();
        } else {
            alert('Failed to delete image.');
        }
    })
    .catch(function(error) {
        console.error('Error deleting image:', error);
    });
}
