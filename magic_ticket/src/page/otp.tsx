import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/api/client";
import Swal from "sweetalert2";

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
      const redirect = async () => {
        await Swal.fire({
          toast: true,
          position: "top-end",
          icon: "error",
          title: "OTP หมดอายุ กรุณาขอรหัสใหม่",
          showConfirmButton: false,
          timer: 3500,
          timerProgressBar: true,
        });

        window.location.href = "/signup";
      };

      redirect();
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
        Swal.fire({
        toast: true,
        position: "top-end",
        icon: "warning",
        title: "กรุณากรอกรหัส OTP ให้ครบ 6 หลัก",
        showConfirmButton: false,
        timer: 3500,
        timerProgressBar: true,
      });
        return;
      }

      const signupDataStr = localStorage.getItem("signupData");

      if (!signupDataStr || signupDataStr === "undefined") {
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "error",
          title: "ไม่พบข้อมูลการสมัครสมาชิกของคุณ กรุณาสมัครใหม่",
          showConfirmButton: false,
          timer: 3500,
          timerProgressBar: true,
        }).then(() => {
          window.location.href = "/signup";
        });

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
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "error",
          title: "ข้อมูลเซสชันไม่ถูกต้อง กรุณาเริ่มใหม่",
          showConfirmButton: false,
          timer: 3500,
          timerProgressBar: true,
        }).then(() => {
          window.location.href = "/signup";
        });

        return;
      }

      setIsSubmitting(true);

      apiFetch<{ status?: number; error?: string }>("/email/verifyotp", {
        method: "POST",
        body: JSON.stringify({ email, otp: otpCode }),
      })
        .then((data) => {
          if (data.status === 200) {
            return apiFetch<{ status?: number; error?: string; message?: string }>(
              "/auth/signup",
              {
                method: "POST",
                body: JSON.stringify(formData),
              },
            )
              .then(async (signupRes) => {
                
                if (signupRes.status === 201) {
                  await Swal.fire({
                  toast: true,
                  position: "top-end",
                  icon: "success",
                  title: "สมัครสมาชิกและยืนยันตัวตนสำเร็จ!",
                  showConfirmButton: false,
                  timer: 2500,
                  timerProgressBar: true,
                });
                  localStorage.removeItem("signupData");
                  window.location.href = "/signin";
                } else {
                  Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "error",
                    title: signupRes.error || "เกิดข้อผิดพลาดในการสมัครสมาชิก กรุณาลองใหม่",
                    showConfirmButton: false,
                    timer: 3500,
                    timerProgressBar: true,
                  });
                  setIsSubmitting(false);
                }
              })
              .catch((error) => {
                console.error("Signup Error:", error);
                Swal.fire({
                  toast: true,
                  position: "top-end",
                  icon: "error",
                  title: error instanceof Error && error.message.trim() ? error.message : "เกิดข้อผิดพลาดในการสมัครสมาชิก กรุณาลองใหม่",
                  showConfirmButton: false,
                  timer: 3500,
                  timerProgressBar: true,
                });
                setIsSubmitting(false);
              });
          } else {
            Swal.fire({
              toast: true,
              position: "top-end",
              icon: "error",
              title: data.error || "รหัส OTP ไม่ถูกต้อง กรุณาลองใหม่",
              showConfirmButton: false,
              timer: 3500,
              timerProgressBar: true,
            });
            setIsSubmitting(false);
          }
        })
        .catch((error) => {
          console.error("Network Error:", error);
          Swal.fire({
            toast: true,
            position: "top-end",
            icon: "error",
            title: "เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย กรุณาลองใหม่",
            showConfirmButton: false,
            timer: 3500,
            timerProgressBar: true,
          });
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
