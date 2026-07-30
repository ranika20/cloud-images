
# 1. משתמשים באימג' רשמי וקל משקל של Node.js
FROM node:20-alpine

# 2. מגדירים את תיקיית העבודה בתוך הקונטיינר
WORKDIR /app

# 3. מעתיקים קודם כל את קובצי ה-dependencies כדי לנצל את ה-Cache של Docker
COPY package*.json ./

# 4. מתקינים אך ורק את חבילות הייצור (Production Dependencies)
RUN npm ci --only=production

# 5. מעתיקים את שאר קוד המקור של האפליקציה לקונטיינר
COPY . .


# 6. חושפים את הפורט שעליו השרת שלך מאזין (למשל 3000 או 5000)
EXPOSE 3000

# 7. הפקודה שמריצה את האפליקציה
CMD ["node","--max-old-space-size=400", "app.js"]