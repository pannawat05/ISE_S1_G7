# ใช้ Node.js LTS version บน Alpine Linux เพื่อให้ Image มีขนาดเล็ก
FROM node:20-alpine

# กำหนด Working Directory ใน Container
WORKDIR /app

# คัดลอก package.json และ package-lock.json เข้าไปก่อนเพื่อทำ Caching Dependencies
COPY package*.json ./

# ติดตั้ง Dependencies
RUN npm install

# คัดลอกโค้ดทั้งหมดของแอปพลิเคชันเข้าไป
COPY . .

# เปิดพอร์ตที่ Node.js จะใช้งาน (สมมติว่าเป็นพอร์ต 5001)
EXPOSE 5001

# คำสั่งสำหรับรันแอปพลิเคชัน
CMD ["npm", "start"]