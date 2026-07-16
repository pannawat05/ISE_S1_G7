import React, { useState, useEffect, useRef, useCallback } from 'react';

function Otp() {
  const [otpValues, setOtpValues] = useState<string[]>(new Array(6).fill(''));
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 นาที
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  const isExpired = timeLeft === 0;

  const inputRefs = useRef<HTMLInputElement[]>([]);

  // Timer: สร้าง interval แค่ครั้งเดียว ใช้ functional update แทนการผูก timeLeft เป็น dependency
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // แยก effect สำหรับจัดการตอนหมดเวลา ให้ทำงานแค่ครั้งเดียวตอน timeLeft แตะ 0
  useEffect(() => {
    if (timeLeft === 0) {
      alert('OTP has expired. Please request a new one.');
      window.location.href = '/signup';
    }
  }, [timeLeft]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleChange = (element: HTMLInputElement, index: number) => {
    if (isExpired) return;
    const value = element.value.replace(/[^0-9]/g, '');

    const newOtp = [...otpValues];
    newOtp[index] = value ? value.substring(value.length - 1) : '';
    setOtpValues(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (isExpired) return;
    if (e.key === 'Backspace') {
      const newOtp = [...otpValues];

      if (!otpValues[index] && index > 0) {
        newOtp[index - 1] = '';
        setOtpValues(newOtp);
        inputRefs.current[index - 1]?.focus();
      } else {
        newOtp[index] = '';
        setOtpValues(newOtp);
      }
    }
  };

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isExpired) return;

    const otpCode = otpValues.join('');
    if (otpCode.length < 6) {
      alert('กรุณากรอกรหัส OTP ให้ครบ 6 หลัก');
      return;
    }

    const signupDataStr = localStorage.getItem('signupData');

    if (!signupDataStr || signupDataStr === 'undefined') {
      alert('ไม่พบข้อมูลการสมัครสมาชิกของคุณ กรุณากลับไปสมัครใหม่อีกครั้ง');
      window.location.href = '/signup';
      return;
    }

    let email: string;
    let formData: { fname: string; lname: string; email: string; password: string } = {
      fname: '', lname: '', email: '', password: '',
    };

    try {
      formData = JSON.parse(signupDataStr);
      email = formData.email;
    } catch {
      alert('ข้อมูลเซสชันไม่ถูกต้อง กรุณาเริ่มใหม่อีกครั้ง');
      window.location.href = '/signup';
      return;
    }

    setIsSubmitting(true);

    fetch('http://localhost:5001/email/verifyotp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp: otpCode }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.message === 'OTP verified successfully') {
          return fetch('http://localhost:5001/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          })
            .then((response) => response.json())
            .then((signupRes) => {
              if (signupRes.message === 'Registration completed successfully') {
                alert('สมัครสมาชิกและยืนยันตัวตนสำเร็จ!');
                localStorage.removeItem('signupData');
                window.location.href = '/login';
              } else {
                alert(signupRes.error || 'การยืนยัน OTP ผ่านแล้ว แต่เกิดข้อผิดพลาดในการบันทึกข้อมูลระบบ');
                setIsSubmitting(false);
              }
            })
            .catch((error) => {
              console.error('Signup Error:', error);
              alert('เกิดข้อผิดพลาดในระบบฐานข้อมูล');
              setIsSubmitting(false);
            });
        } else {
          alert('รหัส OTP ไม่ถูกต้องหรือหมดอายุ: ' + (data.error || 'Invalid code'));
          setIsSubmitting(false);
        }
      })
      .catch((error) => {
        console.error('Network Error:', error);
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย กรุณาลองใหม่');
        setIsSubmitting(false);
      });
  }, [otpValues, isSubmitting, isExpired]);

  return (
    <div>
      <h1 className="text-center text-lg mt-4 font-semibold"> Enter OTP sent to your email </h1>
      <p className="text-center text-sm text-gray-500 mb-4">
        Code expires in <span className="font-bold text-red-500">{formatTime(timeLeft)}</span>
      </p>

      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify your identity</h2>
          <p className="text-sm text-gray-500 mb-6">We sent a 6-digit code to your email.</p>

          <form id="otp-form" className="space-y-6" onSubmit={handleSubmit}>
            <div className="flex justify-center gap-2" id="otp-container">
              {otpValues.map((value, index) => (
                <input
                  key={index}
                  ref={(el) => { if (el) inputRefs.current[index] = el; }}
                  type="text"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={1}
                  placeholder="•"
                  value={value}
                  disabled={isExpired || isSubmitting}
                  onChange={(e) => handleChange(e.target, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="otp-field w-12 h-14 text-center text-2xl font-extrabold bg-gray-50 text-gray-800 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all outline-none disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder-gray-300"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isExpired}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:ring-2 focus:ring-blue-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Verifying...' : 'Verify Code'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Otp;