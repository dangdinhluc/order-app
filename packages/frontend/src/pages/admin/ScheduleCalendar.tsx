import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../components/Toast';
import {
    Calendar, Users, ChevronLeft, ChevronRight, Plus, Trash2, Save, Loader2
} from 'lucide-react';

interface ShiftType {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    color: string;
    is_active: boolean;
}

interface Schedule {
    id: string;
    user_id: string;
    user_name: string;
    shift_type_id: string;
    shift_name: string;
    shift_color: string;
    start_time: string;
    end_time: string;
    work_date: string;
    status: string;
    note?: string;
}

interface User {
    id: string;
    name: string;
    role: string;
}

export default function ScheduleCalendar() {
    const toast = useToast();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [staff, setStaff] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [selectedStaff, setSelectedStaff] = useState<string>('');
    const [selectedShift, setSelectedShift] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    // Get week dates
    const getWeekDates = (date: Date) => {
        const start = new Date(date);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday start
        start.setDate(diff);

        const week: Date[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            week.push(d);
        }
        return week;
    };

    const weekDates = getWeekDates(currentDate);
    const weekStart = weekDates[0].toISOString().split('T')[0];
    const weekEnd = weekDates[6].toISOString().split('T')[0];

    useEffect(() => {
        loadData();
    }, [weekStart, weekEnd]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Load shift types
            const shiftsRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/scheduling/shift-types`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const shiftsData = await shiftsRes.json();
            setShiftTypes(shiftsData.data || []);

            // Load schedules for this week
            const schedRes = await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/scheduling/schedules?start_date=${weekStart}&end_date=${weekEnd}`,
                { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
            );
            const schedData = await schedRes.json();
            setSchedules(schedData.data || []);

            const usersRes = await api.getUsers() as { data?: { users: User[] }, users?: User[] };
            const users = usersRes.data?.users || usersRes.users || [];
            setStaff(users.filter((u: User) => u.role !== 'kitchen'));
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('Lỗi', 'Không thể tải dữ liệu lịch làm');
        }
        setIsLoading(false);
    };

    const handlePrevWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentDate(newDate);
    };

    const handleNextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentDate(newDate);
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    const getSchedulesForDay = (date: string) => {
        return schedules.filter(s => s.work_date === date);
    };

    const handleAddSchedule = async () => {
        if (!selectedDay || !selectedStaff || !selectedShift) {
            toast.warning('Thiếu thông tin', 'Vui lòng chọn đầy đủ thông tin');
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/scheduling/schedules`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    user_id: selectedStaff,
                    shift_type_id: selectedShift,
                    work_date: selectedDay
                })
            });

            const data = await res.json();
            if (data.success) {
                toast.success('Thành công', 'Đã thêm lịch làm việc');
                setShowAddModal(false);
                setSelectedDay(null);
                setSelectedStaff('');
                setSelectedShift('');
                loadData();
            } else {
                throw new Error(data.message || 'Failed');
            }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            toast.error('Lỗi', error.message || 'Không thể thêm lịch');
        }
        setIsSaving(false);
    };

    const handleDeleteSchedule = async (scheduleId: string) => {
        if (!confirm('Xác nhận xóa lịch này?')) return;

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/scheduling/schedules/${scheduleId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            const data = await res.json();
            if (data.success) {
                toast.success('Đã xóa', 'Lịch làm việc đã được xóa');
                loadData();
            }
        } catch (error) {
            toast.error('Lỗi', 'Không thể xóa lịch');
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric' });
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Calendar className="text-blue-500" />
                        Lịch làm việc
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Quản lý ca làm việc của nhân viên</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrevWeek}
                        className="p-2 hover:bg-slate-100 rounded-lg transition"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={handleToday}
                        className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                        Hôm nay
                    </button>
                    <button
                        onClick={handleNextWeek}
                        className="p-2 hover:bg-slate-100 rounded-lg transition"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Week Header */}
            <div className="text-center text-lg font-semibold text-slate-700">
                Tuần {weekDates[0].toLocaleDateString('vi-VN', { day: 'numeric', month: 'long' })} - {weekDates[6].toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>

            {/* Shift Types Legend */}
            <div className="flex flex-wrap gap-3">
                {shiftTypes.map(shift => (
                    <div key={shift.id} className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border shadow-sm">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: shift.color }}></span>
                        <span className="text-sm font-medium">{shift.name}</span>
                        <span className="text-xs text-slate-500">{shift.start_time} - {shift.end_time}</span>
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                {/* Day Headers */}
                <div className="grid grid-cols-7 border-b">
                    {weekDates.map(date => (
                        <div
                            key={date.toISOString()}
                            className={`p-3 text-center border-r last:border-r-0 ${isToday(date) ? 'bg-blue-50' : ''}`}
                        >
                            <div className={`font-medium ${isToday(date) ? 'text-blue-600' : 'text-slate-700'}`}>
                                {formatDate(date)}
                            </div>
                            <div className={`text-xs ${isToday(date) ? 'text-blue-500' : 'text-slate-400'}`}>
                                {date.toLocaleDateString('vi-VN', { month: 'short' })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Schedule Cells */}
                <div className="grid grid-cols-7 min-h-[400px]">
                    {weekDates.map(date => {
                        const dateStr = date.toISOString().split('T')[0];
                        const daySchedules = getSchedulesForDay(dateStr);

                        return (
                            <div
                                key={dateStr}
                                className={`border-r last:border-r-0 p-2 space-y-2 ${isToday(date) ? 'bg-blue-50/50' : ''}`}
                            >
                                {daySchedules.map(schedule => (
                                    <div
                                        key={schedule.id}
                                        className="p-2 rounded-lg text-xs group relative"
                                        style={{ backgroundColor: schedule.shift_color + '20', borderLeft: `3px solid ${schedule.shift_color}` }}
                                    >
                                        <div className="font-medium text-slate-800">{schedule.user_name}</div>
                                        <div className="text-slate-500">{schedule.shift_name}</div>
                                        <div className="text-slate-400">{schedule.start_time} - {schedule.end_time}</div>

                                        <button
                                            onClick={() => handleDeleteSchedule(schedule.id)}
                                            className="absolute top-1 right-1 p-1 bg-red-100 text-red-500 rounded opacity-0 group-hover:opacity-100 transition"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}

                                {/* Add Button */}
                                <button
                                    onClick={() => {
                                        setSelectedDay(dateStr);
                                        setShowAddModal(true);
                                    }}
                                    className="w-full p-2 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:border-blue-400 hover:text-blue-500 transition flex items-center justify-center gap-1"
                                >
                                    <Plus size={14} />
                                    <span className="text-xs">Thêm</span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Add Schedule Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Users size={20} className="text-blue-500" />
                            Thêm lịch làm việc
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Ngày</label>
                                <input
                                    type="date"
                                    value={selectedDay || ''}
                                    onChange={e => setSelectedDay(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nhân viên</label>
                                <select
                                    value={selectedStaff}
                                    onChange={e => setSelectedStaff(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Chọn nhân viên</option>
                                    {staff.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Ca làm</label>
                                <select
                                    value={selectedShift}
                                    onChange={e => setSelectedShift(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Chọn ca</option>
                                    {shiftTypes.map(shift => (
                                        <option key={shift.id} value={shift.id}>
                                            {shift.name} ({shift.start_time} - {shift.end_time})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 px-4 py-2.5 border rounded-xl text-slate-600 hover:bg-slate-50 transition"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleAddSchedule}
                                disabled={isSaving}
                                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-slate-300 transition flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                Lưu
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
