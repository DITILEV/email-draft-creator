
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = 8080;

// הגדרת multer לשמירת קבצים
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage: storage });

// הגדרות בסיסיות
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// נתיב בסיסי
app.get('/', (req, res) => {
    res.json({ message: 'שרת Email Bridge פעיל!', status: 'OK' });
});

// בדיקה שהשרת עובד
app.get('/test', (req, res) => {
    res.json({ message: 'השרת עובד בהצלחה!' });
});

// קבלת נתוני הטופס
app.post('/create-drafts', upload.single('cvFile'), async (req, res) => {
    try {
        console.log('התקבלו נתונים:', req.body);
        console.log('קובץ מצורף:', req.file ? req.file.originalname : 'אין');
        
        const { subject, recipients, body } = req.body;
        const recipientsList = recipients.split(',').map(email => email.trim());
        
        console.log(`יוצר ${recipientsList.length} טיוטות מייל...`);
        
        // יצירת קבצי EML
        await createDrafts(subject, recipientsList, body, req.file);
        
        res.json({ 
            success: true, 
            message: 'טיוטות נוצרו ונפתחו ב-Outlook!',
            recipients: recipientsList.length
        });
        
    } catch (error) {
        console.error('שגיאה:', error);
        res.status(500).json({ 
            success: false, 
            message: 'שגיאה ביצירת הטיוטות: ' + error.message
        });
    }
});

// פונקציה ליצירת טיוטות
async function createDrafts(subject, recipients, body, attachmentFile) {
    const createdFiles = [];
    
    for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        
        // יצירת תוכן EML עם header מיוחד לטיוטה
        const emlContent = createEMLContent(subject, recipient, body, attachmentFile);
        
        // שמירת הקובץ
        const fileName = `draft_${Date.now()}_${i + 1}.eml`;
        const filePath = path.join(__dirname, '../temp', fileName);
        
        fs.writeFileSync(filePath, emlContent, 'utf8');
        createdFiles.push(filePath);
        
        console.log(`נוצר קובץ EML עבור ${recipient}`);
    }
    
    // עכשיו פותח את כל הקבצים
    for (const filePath of createdFiles) {
        exec(`start "" "${filePath}"`, (error) => {
            if (error) {
                console.error(`שגיאה בפתיחת ${path.basename(filePath)}:`, error);
            } else {
                console.log(`✅ נפתח ב-Outlook: ${path.basename(filePath)}`);
            }
        });
        
        // השהייה קצרה בין פתיחות
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // השהייה נוספת כדי לוודא שOutlook נפתח
    await new Promise(resolve => setTimeout(resolve, 2000));
}

// פונקציה ליצירת תוכן EML
function createEMLContent(subject, recipient, body, attachmentFile) {
    const now = new Date();
    const dateString = now.toUTCString();
    
    if (!attachmentFile) {
        // בלי קובץ מצורף
        return `X-Unsent: 1
Date: ${dateString}
From: <user@example.com>
To: <${recipient}>
Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8

${body}
`;
    }
    
    // עם קובץ מצורף
    const boundary = `----=_NextPart_${Date.now()}`;
    
    let emlContent = `X-Unsent: 1
Date: ${dateString}
From: <user@example.com>
To: <${recipient}>
Subject: ${subject}
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="${boundary}"

--${boundary}
Content-Type: text/plain; charset=utf-8

${body}

--${boundary}
Content-Type: application/octet-stream; name="${attachmentFile.originalname}"
Content-Transfer-Encoding: base64
Content-Disposition: attachment; filename="${attachmentFile.originalname}"

`;

    try {
        // קריאת הקובץ והמרה ל-base64
        const fileContent = fs.readFileSync(attachmentFile.path);
        const fileBase64 = fileContent.toString('base64');
        
        // חלוקה לשורות של 76 תווים
        const base64Lines = fileBase64.match(/.{1,76}/g) || [];
        emlContent += base64Lines.join('\r\n');
        
        emlContent += `\r\n\r\n--${boundary}--`;
        
    } catch (error) {
        console.error('שגיאה בקריאת הקובץ המצורף:', error);
        // אם יש בעיה בקובץ, נחזיר בלי הקובץ המצורף
        return `X-Unsent: 1
Date: ${dateString}
From: <user@example.com>
To: <${recipient}>
Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8

${body}
`;
    }
    
    return emlContent;
}

// הפעלת השרת
app.listen(PORT, () => {
    console.log(`השרת רץ על http://localhost:${PORT}`);
});