import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";

function Otp() {
  const [otpValues, setOtpValues] = useState<string[]>(new Array(6).fill(""));
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const isExpired = timeLeft === 0;
  const inputRefs = useRef<HTMLInputElement[]>([]);

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

  useEffect(() => {
    if (timeLeft === 0) {
      alert("OTP has expired. Please request a new one.");
      window.location.href = "/signup";
    }
  }, [timeLeft]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const handleChange = (element: HTMLInputElement, index: number) => {
    if (isExpired) return;
    const value = element.value.replace(/[^0-9]/g, "");

    const newOtp = [...otpValues];
    newOtp[index] = value ? value.substring(value.length - 1) : "";
    setOtpValues(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (isExpired) return;
    if (e.key === "Backspace") {
      const newOtp = [...otpValues];

      if (!otpValues[index] && index > 0) {
        newOtp[index - 1] = "";
        setOtpValues(newOtp);
        inputRefs.current[index - 1]?.focus();
      } else {
        newOtp[index] = "";
        setOtpValues(newOtp);
      }
    }
  };

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting || isExpired) return;

      const otpCode = otpValues.join("");
      if (otpCode.length < 6) {
        alert("กรุณากรอกรหัส OTP ให้ครบ 6 หลัก");
        return;
      }

      const signupDataStr = localStorage.getItem("signupData");

      if (!signupDataStr || signupDataStr === "undefined") {
        alert("ไม่พบข้อมูลการสมัครสมาชิกของคุณ กรุณากลับไปสมัครใหม่อีกครั้ง");
        window.location.href = "/signup";
        return;
      }

      let email: string;
      let formData: {
        fname: string;
        lname: string;
        email: string;
        password: string;
      } = {
        fname: "",
        lname: "",
        email: "",
        password: "",
      };

      try {
        formData = JSON.parse(signupDataStr);
        email = formData.email;
      } catch {
        alert("ข้อมูลเซสชันไม่ถูกต้อง กรุณาเริ่มใหม่อีกครั้ง");
        window.location.href = "/signup";
        return;
      }

      setIsSubmitting(true);

      fetch("http://localhost:5001/email/verifyotp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpCode }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.message === "OTP verified successfully") {
            return fetch("http://localhost:5001/auth/signup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(formData),
            })
              .then((response) => response.json())
              .then((signupRes) => {
                if (signupRes.message === "Registration completed successfully") {
                  alert("สมัครสมาชิกและยืนยันตัวตนสำเร็จ!");
                  localStorage.removeItem("signupData");
                  window.location.href = "/signin";
                } else {
                  alert(
                    signupRes.error ||
                      "การยืนยัน OTP ผ่านแล้ว แต่เกิดข้อผิดพลาดในการบันทึกข้อมูลระบบ"
                  );
                  setIsSubmitting(false);
                }
              })
              .catch((error) => {
                console.error("Signup Error:", error);
                alert("เกิดข้อผิดพลาดในระบบฐานข้อมูล");
                setIsSubmitting(false);
              });
          } else {
            alert("รหัส OTP ไม่ถูกต้องหรือหมดอายุ: " + (data.error || "Invalid code"));
            setIsSubmitting(false);
          }
        })
        .catch((error) => {
          console.error("Network Error:", error);
          alert("เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย กรุณาลองใหม่");
          setIsSubmitting(false);
        });
    },
    [otpValues, isSubmitting, isExpired]
  );

  const otpInputClassName =
    "w-12 h-14 text-center text-2xl font-extrabold bg-elevated text-white border border-white/10 rounded-xl focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500 transition-all outline-none disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-gray-500";

  return (
    <div className="mt-auth-page">
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="mt-auth-card text-center">
        <div className="text-3xl mb-2">🔐✨</div>
        <h2 className="text-2xl font-extrabold mt-heading mb-2">
          ยืนยันตัวตนของคุณ
        </h2>
        <p className="text-sm text-gray-400 mb-2">
          กรอกรหัส OTP 6 หลักที่ส่งไปยังอีเมลของคุณ
        </p>
        <p className="text-sm text-gray-500 mb-6">
          รหัสหมดอายุใน{" "}
          <span className="font-bold text-violet-400">{formatTime(timeLeft)}</span>
        </p>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="flex justify-center gap-2">
            {otpValues.map((value, index) => (
              <input
                key={index}
                ref={(el) => {
                  if (el) inputRefs.current[index] = el;
                }}
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={1}
                placeholder="•"
                value={value}
                disabled={isExpired || isSubmitting}
                onChange={(e) => handleChange(e.target, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={otpInputClassName}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isExpired}
            className="w-full py-3 mt-btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm"
          >
            {isSubmitting ? "กำลังยืนยัน..." : "ยืนยันรหัส OTP 🔮"}
          </button>
        </form>

        <div className="text-center mt-6 text-xs text-gray-500">
          ไม่ได้รับรหัส?{" "}
          <Link to="/signup" className="mt-link font-medium underline underline-offset-4">
            กลับไปสมัครใหม่
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Otp;
