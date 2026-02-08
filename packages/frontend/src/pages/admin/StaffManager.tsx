import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { User } from '../../services/api';
import { Plus, Pencil, Trash2, KeyRound, User as UserIcon } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';

export default function StaffManager() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [
        userForm, setUserForm
    ] = useState<Partial<User> & { password?: string, pin_code?: string }>({
        name: '',
        email: '',
        role: 'cashier',
        is_active: true,
    });
    const [pinForm, setPinForm] = useState({ pin_code: '' });
    const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

    // Initial Load
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await api.getUsers();
            if (res.data) setUsers(res.data.users);
        } catch (error) {
            console.error('Failed to load users', error);
        } finally {
            setLoading(false);
        }
    };

    // Handlers
    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingUser) {
                await api.updateUser(editingUser.id, userForm);
            } else {
                await api.createUser(userForm);
            }
            setIsModalOpen(false);
            setEditingUser(null);
            setUserForm({ name: '', email: '', role: 'cashier', is_active: true });
            loadData();
        } catch (error) {
            alert('Failed to save user');
        }
    };

    const handleResetPin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        try {
            await api.resetUserPin(editingUser.id, pinForm.pin_code);
            setIsPinModalOpen(false);
            setPinForm({ pin_code: '' });
            alert('PIN updated successfully');
        } catch (error) {
            alert('Failed to update PIN');
        }
    };

    const handleDeleteUser = async (id: string) => {
        setDeleteUserId(id);
    };

    const confirmDeleteUser = async () => {
        if (!deleteUserId) return;
        try {
            await api.deleteUser(deleteUserId);
            loadData();
        } catch (error) {
            alert('Failed to delete user');
        } finally {
            setDeleteUserId(null);
        }
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setUserForm({ ...user });
        setIsModalOpen(true);
    };

    const openPinModal = (user: User) => {
        setEditingUser(user);
        setIsPinModalOpen(true);
    };

    const openCreateModal = () => {
        setEditingUser(null);
        setUserForm({ name: '', email: '', role: 'cashier', is_active: true, password: '', pin_code: '' });
        setIsModalOpen(true);
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">Quản lý Nhân viên</h1>
                <button
                    onClick={openCreateModal}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
                >
                    <Plus size={20} /> Thêm Nhân viên
                </button>
            </div>

            {/* User List - Mobile Cards / Desktop Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {/* Desktop Table - Hidden on mobile */}
                <table className="hidden md:table w-full text-left">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="p-4 font-semibold text-slate-600">Tên</th>
                            <th className="p-4 font-semibold text-slate-600">Email</th>
                            <th className="p-4 font-semibold text-slate-600">Vai trò</th>
                            <th className="p-4 font-semibold text-slate-600">Trạng thái</th>
                            <th className="p-4 font-semibold text-slate-600 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50">
                                <td className="p-4 font-medium flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                                        <UserIcon size={20} />
                                    </div>
                                    {user.name}
                                </td>
                                <td className="p-4 text-slate-500">{user.email}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize 
                                        ${user.role === 'owner' ? 'bg-blue-50 text-blue-800' :
                                            user.role === 'kitchen' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                        {user.is_active ? 'Hoạt động' : 'Vô hiệu'}
                                    </span>
                                </td>
                                <td className="p-4 text-right space-x-2">
                                    <button onClick={() => openPinModal(user)} className="text-slate-400 hover:text-orange-500" title="Change PIN">
                                        <KeyRound size={18} />
                                    </button>
                                    <button onClick={() => openEditModal(user)} className="text-slate-400 hover:text-blue-600" title="Edit">
                                        <Pencil size={18} />
                                    </button>
                                    <button onClick={() => handleDeleteUser(user.id)} className="text-slate-400 hover:text-red-500" title="Deactivate">
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Mobile Card View - Visible only on mobile */}
                <div className="md:hidden divide-y">
                    {users.map(user => (
                        <div key={user.id} className="p-4 space-y-3">
                            {/* Header: Avatar + Name + Status */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                                        <UserIcon size={24} />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-slate-800">{user.name}</div>
                                        <div className="text-sm text-slate-500">{user.email}</div>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                    {user.is_active ? 'Hoạt động' : 'Vô hiệu'}
                                </span>
                            </div>

                            {/* Role Badge */}
                            <div className="flex items-center justify-between">
                                <span className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize 
                                    ${user.role === 'owner' ? 'bg-blue-50 text-blue-800' :
                                        user.role === 'kitchen' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                                    {user.role === 'owner' ? 'Chủ quán' : user.role === 'kitchen' ? 'Bếp' : 'Thu ngân'}
                                </span>

                                {/* Action Buttons - Touch Friendly */}
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => openPinModal(user)}
                                        className="p-2.5 rounded-lg bg-orange-50 text-orange-600 active:bg-orange-100"
                                        title="Đổi PIN"
                                    >
                                        <KeyRound size={18} />
                                    </button>
                                    <button
                                        onClick={() => openEditModal(user)}
                                        className="p-2.5 rounded-lg bg-blue-50 text-blue-600 active:bg-blue-100"
                                        title="Sửa"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteUser(user.id)}
                                        className="p-2.5 rounded-lg bg-red-50 text-red-600 active:bg-red-100"
                                        title="Xóa"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* User Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg p-6">
                        <h2 className="text-xl font-bold mb-4">{editingUser ? 'Sửa Nhân viên' : 'Thêm Nhân viên Mới'}</h2>
                        <form onSubmit={handleSaveUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tên</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={userForm.name}
                                    onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={userForm.email}
                                    onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                                />
                            </div>

                            {!editingUser && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu</label>
                                        <input
                                            type="password"
                                            required
                                            minLength={6}
                                            className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                            value={userForm.password}
                                            onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Mã PIN (6 số)</label>
                                        <input
                                            type="text"
                                            pattern="\d{6}"
                                            maxLength={6}
                                            title="6 digit PIN"
                                            className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                            value={userForm.pin_code || ''}
                                            onChange={e => setUserForm({ ...userForm, pin_code: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Vai trò</label>
                                <select
                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={userForm.role}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    onChange={e => setUserForm({ ...userForm, role: e.target.value as any })}
                                >
                                    <option value="cashier">Thu ngân</option>
                                    <option value="kitchen">Bếp</option>
                                    <option value="owner">Chủ quán</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={userForm.is_active}
                                    onChange={e => setUserForm({ ...userForm, is_active: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="is_active" className="text-sm text-slate-700">Tài khoản hoạt động</label>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    {editingUser ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PIN Modal */}
            {isPinModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-sm p-6">
                        <h2 className="text-xl font-bold mb-4">Đổi mã PIN</h2>
                        <form onSubmit={handleResetPin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Mã PIN mới (6 số)</label>
                                <input
                                    type="text"
                                    required
                                    pattern="\d{6}"
                                    maxLength={6}
                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
                                    value={pinForm.pin_code}
                                    onChange={e => setPinForm({ pin_code: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsPinModalOpen(false)}
                                    className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Cập nhật PIN
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete User Confirmation */}
            <ConfirmModal
                isOpen={!!deleteUserId}
                title="Vô hiệu hóa người dùng"
                message="Bạn có chắc muốn vô hiệu hóa người dùng này không?"
                confirmText="Vô hiệu hóa"
                cancelText="Hủy"
                variant="danger"
                onConfirm={confirmDeleteUser}
                onCancel={() => setDeleteUserId(null)}
            />
        </div>
    );
}
