require("dotenv").config();
const express = require("express");
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const app = express();
const port = 3000;

// 1. הגדרת החיבור ל-S3
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.S3_BUCKET;

// 2. הגדרת Multer לקבלת קבצים בזיכרון
const upload = multer({ storage: multer.memoryStorage() });

// 3. הגדרת תיקיית public עבור ה-UI הסטטי
app.use(express.static("public"));

// 4. נתיב העלאה יחיד ומאובטח
app.post("/upload", upload.single("image"), async (req, res) => {
  console.log("=== 🚀 הבקשה הגיעה לשרת ===");

  try {
    // בדיקה אם הקובץ בכלל הגיע מהדפדפן
    if (!req.file) {
      console.log("❌ שגיאה: לא נמצא קובץ בבקשה שנתקבלה!");
      return res.status(400).json({ error: "No file uploaded." });
    }

    console.log(`📁 file received: ${req.file.originalname} (${req.file.size} bytes)`);
    console.log("🔄 sending to AWS S3...");

    const uniqueName = `${Date.now()}-${req.file.originalname}`;

    // שליחה ל-S3
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: uniqueName,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      })
    );

    console.log("✅ file uploaded successfully to S3:", uniqueName);
    return res.status(201).json({ message: "Upload to S3 successful!", filename: uniqueName });

  } catch (error) {
    console.error("💥file upload to S3 failed:", error);
    return res.status(500).json({ error: error.message || "Error uploading to S3" });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on http://localhost:${port}`);
});
