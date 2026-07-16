document.getElementById('uploadForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const fileInput = document.getElementById('imageInput');
    const messageDiv = document.getElementById('message');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const previewContainer = document.getElementById('previewContainer');
    const uploadBtn = document.getElementById('uploadBtn');
    
    if (fileInput.files.length === 0) return;

    const formData = new FormData();
    formData.append('image', fileInput.files[0]);

    // איפוס והצגת שורת התקדמות
    messageDiv.innerText = "";
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    progressBar.innerText = '0%';
    uploadBtn.disabled = true;

    // מעקב אחר אחוזים בזמן אמת באמצעות XMLHttpRequest
    const xhr = new XMLHttpRequest();
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

        if (xhr.status === 201) {
            const response = JSON.parse(xhr.responseText);
            messageDiv.innerText = "🎉 " + response.message;
            messageDiv.style.color = "green";
            
            // איפוס הטופס
            fileInput.value = "";
            previewContainer.style.display = 'none';
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
