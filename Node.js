const { S3Client } = require("@aws-sdk/client-s3");
require('dotenv').config(); // מאפשר לקרוא מה-.env גם בריצה מקומית בלי דוקר

// ה-SDK של AWS יקרא אוטומטית את AWS_ACCESS_KEY_ID ו-AWS_SECRET_ACCESS_KEY
const s3 = new S3Client({
  region: process.env.AWS_REGION
});

// שם הבאקט שבו תשתמש להעלאה:
const bucketName = process.env.S3_BUCKET;