import React, { useState } from 'react';
import { Users, Ticket, Monitor, UserCheck } from 'lucide-react';

// 1. สร้าง Mock Data จำลองข้อมูลที่เพื่อนจะส่งมาให้
const mockAttendees = [
  { id: 1, name: 'John Doe', role: 'Customer', channel: 'Online', status: 'Checked-in' },
  { id: 2, name: 'Jane Smith', role: 'Customer', channel: 'Walk-in', status: 'Pending' },
  { id: 3, name: 'Admin Big', role: 'Staff', channel: 'Online', status: 'Checked-in' },
  { id: 4, name: 'Alice Bob', role: 'Customer', channel: 'Online', status: 'Pending' },
];

export default function Dashboard() {
  // State สำหรับจัดการ Filter
  const [filterRole, setFilterRole] = useState('All');

  // ลอจิกการกรองข้อมูล
  const filteredData = mockAttendees.filter(user => 
    filterRole === 'All' ? true : user.role === filterRole
  );

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">Attendee Dashboard</h1>

      {/* --- ส่วนที่ 1: การ์ดสรุปยอด (Summary Cards) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-neutral-800 p-4 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-gray-400">Total Attendees</p>
            <p className="text-2xl font-bold">{mockAttendees.length}</p>
          </div>
          <Users className="text-blue-500" size={32} />
        </div>
        <div className="bg-neutral-800 p-4 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-gray-400">Online Tickets</p>
            <p className="text-2xl font-bold">
              {mockAttendees.filter(u => u.channel === 'Online').length}
            </p>
          </div>
          <Monitor className="text-purple-500" size={32} />
        </div>
        <div className="bg-neutral-800 p-4 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-gray-400">Walk-in Tickets</p>
            <p className="text-2xl font-bold">
              {mockAttendees.filter(u => u.channel === 'Walk-in').length}
            </p>
          </div>
          <Ticket className="text-orange-500" size={32} />
        </div>
      </div>

      {/* --- ส่วนที่ 2: ระบบ Filter และตาราง --- */}
      <div className="bg-neutral-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Attendee List</h2>
          
          {/* Dropdown สำหรับกรอง Role */}
          <select 
            className="bg-neutral-700 text-white p-2 rounded outline-none"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="All">All Roles</option>
            <option value="Customer">Customer</option>
            <option value="Staff">Staff</option>
          </select>
        </div>

        {/* ตารางแสดงผล */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-700 text-gray-400">
                <th className="p-3">Name</th>
                <th className="p-3">Role</th>
                <th className="p-3">Channel</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((user) => (
                <tr key={user.id} className="border-b border-neutral-700 hover:bg-neutral-750">
                  <td className="p-3">{user.name}</td>
                  <td className="p-3">{user.role}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      user.channel === 'Online' ? 'bg-purple-500/20 text-purple-400' : 'bg-orange-500/20 text-orange-400'
                    }`}>
                      {user.channel}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      user.status === 'Checked-in' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}