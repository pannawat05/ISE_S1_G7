import React, { useState, useEffect } from 'react';
import cookies from 'js-cookie';

// 1. กำหนด Interface สำหรับข้อมูลโปรไฟล์ User ที่จะได้รับจาก API
interface UserProfile {
    firstname: string;
    lastname: string;
    email: string;
}

// 2. กำหนด Interface สำหรับโครงสร้างข้อมูลที่ Decoded ออกมาจาก JWT
interface DecodedToken {
    firstname?: string;
    lastname?: string;
    email?: string;
    userId?: number;
}

function OrganizeRegis() {
    // กำหนด Type ให้ State รองรับข้อมูลตาม Interface ที่ตั้งไว้
    const [userData, setUserData] = useState<UserProfile>({ firstname: '', lastname: '', email: '' });
    const [teamName, setTeamName] = useState<string>('');
    
    // แก้อาการ Parameter Action Type: รองรับทั้ง File และ null
    const [teamLogo, setTeamLogo] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const token = cookies.get('authToken');

        if (!token) {
            console.log('No auth token found');
            alert('กรุณาเข้าสู่ระบบก่อนสมัครเป็น Organizer');
            window.location.href = '/signin';
            return;
        }

        fetch('http://localhost:5001/auth/getuserdata', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then((data: { decoded?: DecodedToken }) => {
            if (data.decoded) {
                setUserData({
                    firstname: data.decoded.firstname || '',
                    lastname: data.decoded.lastname || '',
                    email: data.decoded.email || ''
                });
            }
            setIsLoading(false);
        })
        .catch(err => {
            console.error('Failed to fetch user data', err);
            setIsLoading(false);
        });
    }, []);

    // ระบุ Type ให้กับ Event ของการ Submit Form
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!teamName || !teamLogo) {
            alert('กรุณากรอกชื่อทีมและอัปโหลดโลโก้ให้ครบถ้วน');
            return;
        }

        const formData = new FormData();
        formData.append('teamName', teamName);
        formData.append('logo', teamLogo);
        formData.append('email', userData.email);

        try {
            const token = cookies.get('authToken');
            const response = await fetch('http://localhost:5001/auth/organizer-register', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token || ''}` 
                },
                body: formData
            });

            const result = await response.json();
            if (response.ok) {
                alert('สมัครเป็น Organizer สำเร็จเรียบร้อย!');
                window.location.href = '/'; // เปลี่ยนเส้นทางไปหน้า Home หลังจากสมัครสำเร็จ
            } else {
                alert(result.message || 'เกิดข้อผิดพลาดในการสมัคร');
            }
        } catch (error) {
            console.error('Error submitting registration:', error);
            alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        }
    };

    return (
        <div className="mt-auth-page min-h-screen py-12">
            <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="w-full max-w-xl mx-auto mt-surface p-8 space-y-8 relative z-10">
                <div className="text-center border-b border-white/5 pb-6">
                    <h1 className="text-3xl font-extrabold mt-heading tracking-tight">
                        Organizer Registration
                    </h1>
                    <p className="mt-2 text-sm text-gray-400">
                        สมัครสมาชิกเพื่อเริ่มต้นสร้างและจัดการองค์กรของคุณ
                    </p>
                </div>

                <section className="space-y-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-600/20 text-violet-400 text-xs font-semibold border border-violet-400/20">
                            1
                        </span>
                        Personal Info Check
                    </h2>

                    <div className="bg-elevated rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border border-white/10">
                        <div>
                            <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Firstname
                            </span>
                            <span className="text-sm font-semibold text-white mt-0.5 block">
                                {isLoading ? "กำลังโหลด..." : userData.firstname}
                            </span>
                        </div>
                        <div>
                            <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Lastname
                            </span>
                            <span className="text-sm font-semibold text-white mt-0.5 block">
                                {isLoading ? "กำลังโหลด..." : userData.lastname}
                            </span>
                        </div>
                        <div className="sm:col-span-2 border-t border-white/10 pt-3 mt-1">
                            <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Email Address
                            </span>
                            <span className="text-sm font-semibold text-white mt-0.5 block">
                                {isLoading ? "กำลังโหลด..." : userData.email}
                            </span>
                        </div>
                    </div>
                </section>

                <section className="space-y-4 pt-2">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-600/20 text-violet-400 text-xs font-semibold border border-violet-400/20">
                            2
                        </span>
                        Organization Info
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="mt-label">Organizer Team Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Alpha Tech Team"
                                value={teamName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setTeamName(e.target.value)
                                }
                                className="mt-input"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="mt-label">Upload Organizer Team Logo</label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-white/10 border-dashed rounded-xl hover:border-purple-500/40 transition-colors bg-elevated">
                                <div className="space-y-1 text-center">
                                    <svg
                                        className="mx-auto h-12 w-12 text-gray-500"
                                        stroke="currentColor"
                                        fill="none"
                                        viewBox="0 0 48 48"
                                        aria-hidden="true"
                                    >
                                        <path
                                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                    <div className="flex text-sm text-gray-400 justify-center">
                                        <label className="relative cursor-pointer bg-surface rounded-md font-medium mt-link focus-within:outline-none px-3 py-1 border border-white/10">
                                            <span>เลือกไฟล์รูปภาพ</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                    if (e.target.files && e.target.files.length > 0) {
                                                        setTeamLogo(e.target.files[0]);
                                                    }
                                                }}
                                                className="sr-only"
                                            />
                                        </label>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {teamLogo
                                            ? `เลือกไฟล์แล้ว: ${teamLogo.name}`
                                            : "PNG, JPG, GIF ขนาดไม่เกิน 5MB"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-3 mt-4 mt-btn-primary text-sm font-bold cursor-pointer"
                        >
                            Submit Registration
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
}

export default OrganizeRegis;