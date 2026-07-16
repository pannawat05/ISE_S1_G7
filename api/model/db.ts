import mysql from 'mysql2';
import dotenv from 'dotenv';

// โหลด .env เผื่อไว้กรณีรันแบบโลคอลปกติที่ไม่ได้ผ่าน Docker
dotenv.config();

// ใช้ mysql.createPool แทน createConnection เพื่อความเสถียรสูงสุดใน Docker Network
const db: mysql.Pool = mysql.createPool({
  // ตัวแปรเหล่านี้จะถูกดึงมาจากฝั่ง environment ของ docker-compose.yml อัตโนมัติ
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ตรวจสอบการเชื่อมต่อ
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ ไม่สามารถเชื่อมต่อ MySQL ผ่าน Docker Network ได้:', err.message);
    return;
  }
  console.log('✅ เชื่อมต่อ MySQL ภายใน Docker สำเร็จและพร้อมใช้งาน!');
  connection.release(); // คืน Connection กลับเข้า Pool เพื่อให้คำขออื่นใช้งานต่อ
});

export default db;