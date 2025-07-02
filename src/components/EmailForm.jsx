
import { useState } from 'react';
import './EmailForm.css';

function EmailForm() {
  const [formData, setFormData] = useState({
    subject: '',
    recipients: '',
    body: '',
    cvFile: null
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'cvFile') {
      setFormData({...formData, [name]: files[0]});
    } else {
      setFormData({...formData, [name]: value});
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      console.log('שולח נתונים לשרת...');
      
      // יצירת FormData לשליחת קבצים
      const formDataToSend = new FormData();
      formDataToSend.append('subject', formData.subject);
      formDataToSend.append('recipients', formData.recipients);
      formDataToSend.append('body', formData.body);
      
      if (formData.cvFile) {
        formDataToSend.append('cvFile', formData.cvFile);
      }
      
      const response = await fetch('http://localhost:8080/create-drafts', {
        method: 'POST',
        body: formDataToSend // לא צריך headers עם FormData
      });

      console.log('תשובה מהשרת:', response);
      console.log('סטטוס:', response.status);
      
      const result = await response.json();
      console.log('JSON שהתקבל:', result);
      
      if (result.success) {
        alert(`🎉 ${result.message}\n✅ נוצרו ${result.recipients} טיוטות\n📧 Outlook אמור להיפתח עכשיו!`);
        
        // איפוס הטופס אחרי הצלחה
        setFormData({
          subject: '',
          recipients: '',
          body: '',
          cvFile: null
        });
        
        // איפוס גם את שדה הקובץ
        const fileInput = document.getElementById('cvFile');
        if (fileInput) fileInput.value = '';
      } else {
        alert('❌ שגיאה: ' + result.message);
      }
      
    } catch (error) {
      console.error('שגיאה:', error);
      alert('❌ שגיאה בחיבור לשרת: ' + error.message);
    }
  };

  return (
    <div className="email-form-container">
      <h2>📧 פרטי המייל</h2>
      
      <form onSubmit={handleSubmit} className="email-form">
        
        <div className="form-group">
          <label htmlFor="subject">נושא המייל:</label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            placeholder="לדוגמה: קורות חיים למשרת מפתח"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="recipients">כתובות מייל (מופרדות בפסיק):</label>
          <textarea
            id="recipients"
            name="recipients"
            value={formData.recipients}
            onChange={handleChange}
            placeholder="hr@company1.co.il, jobs@company2.co.il"
            rows="3"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="body">גוף ההודעה:</label>
          <textarea
            id="body"
            name="body"
            value={formData.body}
            onChange={handleChange}
            placeholder="שלום רב, מצורפים קורות החיים שלי למשרה..."
            rows="6"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="cvFile">קובץ קורות חיים:</label>
          <input
            type="file"
            id="cvFile"
            name="cvFile"
            onChange={handleChange}
            accept=".pdf,.doc,.docx"
            required
          />
        </div>

        <button type="submit" className="submit-btn">
          📨 צור טיוטות במייל
        </button>
        
      </form>
    </div>
  );
}

export default EmailForm;