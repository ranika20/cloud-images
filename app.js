require("dotenv").config(); // טעינת משתני הסביבה מקובץ .env לתוך process.env
const express = require("express");
const multer = require("multer");

// ייבוא הפקודות הנדרשות מתוך ה-SDK של AWS S3:
// PutObjectCommand - להעלאת קבצים
// ListObjectsV2Command - לשליפת רשימת כל הקבצים בבאקט (לצורך הגלריה)
// DeleteObjectCommand - למחיקת קובץ מהבאקט
// HeadObjectCommand - לשליפת ה-Metadata (התיאור ששמרנו) של קובץ ספציפי
const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");

const app = express();
const port = process.env.PORT || 3000; // הגדרת הפורט - תומך בפורט של Render או ברירת מחדל 3000

// הגדרה קריטית: מאפשרת לשרת לקרוא מידע בפורמט JSON שנשלח מהדפדפן (למשל בקשות מחיקה)
app.use(express.json());

// 1. הגדרת החיבור המאובטח ל-S3 בעזרת מפתחות הגישה שלנו
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.S3_BUCKET;

// 2. הגדרת Multer לשמירת הקבצים המועלים בזיכרון השרת (RAM) באופן זמני
const upload = multer({ storage: multer.memoryStorage() });

// 3. הגדרת תיקיית public עבור הקבצים הסטטיים (HTML, CSS, JS) כדי שהדפדפן יוכל להציג אותם
app.use(express.static("public"));


// 4. נתיב העלאה (POST) - מקבל תמונה, שומר אותה עם תיאור ב-Metadata ומעלה ל-S3
app.post("/upload", upload.single("image"), async (req, res) => {
  console.log("=== 🚀 הבקשה הגיעה לשרת ===");

  try {
    // בדיקה אם הקובץ בכלל הגיע מהדפדפן
    if (!req.file) {
      console.log("❌ שגיאה: לא נמצא קובץ בבקשה שנתקבלה!");
      return res.status(400).json({ error: "No file uploaded." });
    }

    // קבלת התיאור שהמשתמש שלח בטופס (אם לא נשלח תיאור, נשתמש בברירת מחדל)
    const description = req.body.description || "No description provided";

    console.log(`📁 file received: ${req.file.originalname} (${req.file.size} bytes)`);
    console.log(`📝 Description: ${description}`);
    console.log("🔄 sending to AWS S3 with Metadata...");

    const uniqueName = `${Date.now()}-${req.file.originalname}`;

    // שליחת הקובץ ל-S3
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: uniqueName,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        Metadata: {
          // שומרים את התיאור בתוך ה-Metadata של הקובץ ב-S3. מקודדים אותו (encodeURIComponent) כדי לתמוך בעברית ותווים מיוחדים
          'description': encodeURIComponent(description)
        }
      })
    );

    // יצירת קישור יציב ללא בעיות SSL (מבנה Path-style שמונע את שגיאת ה-CERT_COMMON_NAME_INVALID)
    const imageUrl = `https://s3.${process.env.AWS_REGION}.amazonaws.com/${BUCKET}/${uniqueName}`;

    console.log("✅ file uploaded successfully to S3:", uniqueName);
    
    // החזרת תשובה חיובית לדפדפן
    return res.status(201).json({ 
      message: "Upload to S3 successful!", 
      url: imageUrl, 
      key: uniqueName 
    });

  } catch (error) {
    console.error("💥 file upload to S3 failed:", error);
    return res.status(500).json({ error: error.message || "Error uploading to S3" });
  }
});


// 5. נתיב שליפת הגלריה (GET) - שולף את רשימת כל הקבצים ומוציא את התיאור של כל קובץ
app.get("/images", async (req, res) => {
  try {
    console.log("🔄 שולף את רשימת הקבצים מ-S3...");

    // פנייה ל-S3 לקבלת רשימת הקבצים שנמצאים בתוך הבאקט
    const listData = await s3.send(
      new ListObjectsV2Command({ Bucket: BUCKET })
    );

    // אם הבאקט ריק לחלוטין ואין בו קבצים בכלל
    if (!listData.Contents) {
      return res.json([]);
    }

    // מעבר על כל קובץ שחזר ברשימה, ושליפת המידע המלא שלו (כולל התיאור)
    const images = await Promise.all(
      listData.Contents.map(async (file) => {
        
        let description = "No description provided";
        
        try {
          // שליפת ה-Metadata (המידע הפנימי של הקובץ) בעזרת פקודת HeadObjectCommand
          const headData = await s3.send(
            new HeadObjectCommand({ Bucket: BUCKET, Key: file.Key })
          );

          // אם קיים תיאור ב-Metadata, נפענח אותו בחזרה לטקסט רגיל (decodeURIComponent)
          if (headData.Metadata && headData.Metadata.description) {
            description = decodeURIComponent(headData.Metadata.description);
          }
        } catch (err) {
          console.error(`לא הצלחתי לשלוף Metadata עבור הקובץ ${file.Key}:`, err);
        }

        // 🌟 תיקון קריטי: בניית הכתובת הישירה בפורמט Path-style ללא נקודות בשם הבאקט כדי למנוע שגיאות SSL
        const url = `https://s3.${process.env.AWS_REGION}.amazonaws.com/${BUCKET}/${file.Key}`;

        return {
          key: file.Key,             // שם הקובץ הייחודי ב-S3 (נצטרך אותו למחיקה)
          url: url,                  // קישור תקין לתמונה בענן
          description: description,  // התיאור של התמונה
          lastModified: file.LastModified // תאריך השינוי האחרון (לצורך מיון)
        };
      })
    );

    // מיון המערך כך שהתמונות החדשות ביותר שהועלו יופיעו ראשונות בגלריה
    images.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    // החזרת מערך הגלריה לדפדפן בפורמט JSON
    return res.json(images);

  } catch (error) {
    console.error("💥 failed to list images from S3:", error);
    return res.status(500).json({ error: error.message || "Error listing images from S3" });
  }
});


// 6. נתיב מחיקה (DELETE) - מוחק תמונה ספציפית מהענן לפי המזהה (Key) שלה
app.delete("/images/:key", async (req, res) => {
  try {
    const fileKey = req.params.key; // מקבלים את שם הקובץ מתוך נתיב הכתובת
    console.log(`🗑️ בקשת מחיקה התקבלה עבור הקובץ: ${fileKey}`);

    // שליחת פקודת מחיקה ל-S3
    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: fileKey,
      })
    );

    console.log(`✅ הקובץ ${fileKey} נמחק בהצלחה מ-S3!`);
    return res.status(200).json({ message: "Image deleted successfully." });

  } catch (error) {
    console.error("❌ שגיאה במחיקת הקובץ מ-S3:", error);
    return res.status(500).json({ error: "Failed to delete image." });
  }
});


// הפעלת האזנה של השרת על הפורט שהוגדר
app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on port ${port}`);
});