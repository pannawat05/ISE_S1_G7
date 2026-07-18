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
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8">
                
                {/* Header */}
                <div className="text-center border-b border-gray-100 pb-6">
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        Organizer Registration
                    </h1>
                    <p className="mt-2 text-sm text-gray-500">
                        สมัครสมาชิกเพื่อเริ่มต้นสร้างและจัดการองค์กรของคุณ
                    </p>
                </div>

                {/* Section 1: Personal Info */}
                <section className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold">1</span>
                        Personal Info Check
                    </h2>
                    
                    <div className="bg-gray-50 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border border-gray-100">
                        <div>
                            <span className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Firstname</span>
                            <span className="text-sm font-semibold text-gray-700 mt-0.5 block">
                                {isLoading ? "กำลังโหลด..." : userData.firstname}
                            </span>
                        </div>
                        <div>
                            <span className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Lastname</span>
                            <span className="text-sm font-semibold text-gray-700 mt-0.5 block">
                                {isLoading ? "กำลังโหลด..." : userData.lastname}
                            </span>
                        </div>
                        <div className="sm:col-span-2 border-t border-gray-200/60 pt-3 mt-1">
                            <span className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Email Address</span>
                            <span className="text-sm font-semibold text-gray-700 mt-0.5 block">
                                {isLoading ? "กำลังโหลด..." : userData.email}
                            </span>
                        </div>
                    </div>
                </section>

                {/* Section 2: Organization Form */}
                <section className="space-y-4 pt-2">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold">2</span>
                        Organization Info
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Input Team Name */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-gray-700">
                                Organizer Team Name
                            </label>
                            <input 
                                type="text" 
                                placeholder="e.g. Alpha Tech Team" 
                                value={teamName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTeamName(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                            />
                        </div>

                        {/* Input File Logo */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-gray-700">
                                Upload Organizer Team Logo
                            </label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-gray-400 transition-colors bg-gray-50/50">
                                <div className="space-y-1 text-center">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <div className="flex text-sm text-gray-600 justify-center">
                                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none px-1.5 shadow-sm border border-gray-200">
                                            <span>เลือกไฟล์รูปภาพ</span>
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                // แก้ไข e.target.files ที่อาจเป็น null (Object is possibly 'null' guard clause)
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
                                        {teamLogo ? `เลือกไฟล์แล้ว: ${teamLogo.name}` : "PNG, JPG, GIF ขนาดไม่เกิน 5MB"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button 
                            type="submit" 
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 active:bg-indigo-800 transition-all duration-150 mt-4 cursor-pointer"
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