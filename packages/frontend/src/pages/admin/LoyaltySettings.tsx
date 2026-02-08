import { useState, useEffect } from 'react';
import {
    Gift, Crown, Star, Users, Plus, Edit2, Trash2,
    TrendingUp, Settings, Save
} from 'lucide-react';
import { api } from '../../services/api';

interface LoyaltyTier {
    id: string;
    name: string;
    name_ja: string;
    min_points: number;
    discount_percent: number;
    point_multiplier: number;
    color: string;
    icon: string;
    benefits: string;
    is_active: boolean;
}

interface LoyaltyReward {
    id: string;
    name_vi: string;
    name_ja: string;
    points_required: number;
    reward_type: 'discount_percent' | 'discount_fixed' | 'free_item' | 'voucher';
    reward_value: number;
    product_id: string | null;
    product_name_vi?: string;
    is_active: boolean;
}

interface LoyaltyStats {
    active_members: number;
    total_points_outstanding: number;
    active_rewards: number;
    transactions_30d: number;
    tier_breakdown: Array<{
        name: string;
        color: string;
        icon: string;
        count: number;
    }>;
}

export default function LoyaltySettings() {
    const [activeTab, setActiveTab] = useState<'overview' | 'tiers' | 'rewards' | 'settings'>('overview');
    const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
    const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
    const [stats, setStats] = useState<LoyaltyStats | null>(null);
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [editingTier, setEditingTier] = useState<LoyaltyTier | null>(null);
    const [editingReward, setEditingReward] = useState<LoyaltyReward | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [tiersRes, rewardsRes, statsRes, settingsRes] = await Promise.all([
                api.getLoyaltyTiers(),
                api.getLoyaltyRewards(),
                api.getLoyaltyStats(),
                api.getSettings()
            ]);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
            setTiers((tiersRes as any).data || []);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
            setRewards((rewardsRes as any).data || []);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
            setStats((statsRes as any).data || null);

            // Filter loyalty settings - settings is an object { key: value }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
            const allSettings = (settingsRes as any).data || {};
            const loyaltySettings: Record<string, string> = {};
            Object.entries(allSettings).forEach(([key, value]) => {
                if (key.startsWith('loyalty_')) {
                    loyaltySettings[key] = String(value);
                }
            });
            setSettings(loyaltySettings);
        } catch (error) {
            console.error('Error loading loyalty data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveSetting = async (key: string, value: string) => {
        try {
            await api.updateSetting(key, value);
            setSettings(prev => ({ ...prev, [key]: value }));
        } catch (error) {
            console.error('Error saving setting:', error);
        }
    };

    const saveTier = async (tier: Partial<LoyaltyTier>) => {
        try {
            if (tier.id) {
                await api.updateLoyaltyTier(tier.id, tier);
            } else {
                await api.createLoyaltyTier(tier);
            }
            loadData();
            setEditingTier(null);
        } catch (error) {
            console.error('Error saving tier:', error);
        }
    };

    const saveReward = async (reward: Partial<LoyaltyReward>) => {
        try {
            if (reward.id) {
                await api.updateLoyaltyReward(reward.id, reward);
            } else {
                await api.createLoyaltyReward(reward);
            }
            loadData();
            setEditingReward(null);
        } catch (error) {
            console.error('Error saving reward:', error);
        }
    };

    const deleteReward = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa phần thưởng này?')) return;
        try {
            await api.deleteLoyaltyReward(id);
            loadData();
        } catch (error) {
            console.error('Error deleting reward:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Crown className="text-amber-500" />
                        Chương Trình Khách Hàng Thân Thiết
                    </h1>
                    <p className="text-slate-500 mt-1">Quản lý điểm thưởng, cấp bậc và ưu đãi</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${settings.loyalty_enabled === 'true' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {settings.loyalty_enabled === 'true' ? '● Đang hoạt động' : '○ Tắt'}
                    </span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                {[
                    { id: 'overview', label: 'Tổng quan', icon: TrendingUp },
                    { id: 'tiers', label: 'Cấp bậc', icon: Crown },
                    { id: 'rewards', label: 'Phần thưởng', icon: Gift },
                    { id: 'settings', label: 'Cài đặt', icon: Settings }
                ].map(tab => (
                    <button
                        key={tab.id}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === tab.id
                            ? 'bg-white text-purple-600 shadow-sm'
                            : 'text-slate-600 hover:text-slate-800'
                            }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && stats && (
                <div className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-5 text-white">
                            <Users className="w-8 h-8 mb-3 opacity-80" />
                            <p className="text-3xl font-bold">{stats.active_members || 0}</p>
                            <p className="text-purple-200">Thành viên tích cực</p>
                        </div>
                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white">
                            <Star className="w-8 h-8 mb-3 opacity-80" />
                            <p className="text-3xl font-bold">{(stats.total_points_outstanding || 0).toLocaleString()}</p>
                            <p className="text-amber-200">Điểm đang lưu hành</p>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
                            <Gift className="w-8 h-8 mb-3 opacity-80" />
                            <p className="text-3xl font-bold">{stats.active_rewards || 0}</p>
                            <p className="text-emerald-200">Phần thưởng chờ sử dụng</p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-5 text-white">
                            <TrendingUp className="w-8 h-8 mb-3 opacity-80" />
                            <p className="text-3xl font-bold">{stats.transactions_30d || 0}</p>
                            <p className="text-blue-200">Giao dịch 30 ngày</p>
                        </div>
                    </div>

                    {/* Tier Breakdown */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Crown className="text-amber-500" size={20} />
                            Phân bố thành viên theo cấp
                        </h3>
                        <div className="flex gap-4">
                            {stats.tier_breakdown?.map((tier, index) => (
                                <div
                                    key={index}
                                    className="flex-1 rounded-xl p-4 text-center"
                                    style={{ backgroundColor: tier.color + '15', borderColor: tier.color, borderWidth: 2 }}
                                >
                                    <span className="text-3xl mb-2 block">{tier.icon}</span>
                                    <p className="text-2xl font-bold" style={{ color: tier.color }}>{tier.count}</p>
                                    <p className="text-sm text-slate-600">{tier.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Tiers Tab */}
            {activeTab === 'tiers' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800">Cấp bậc thành viên</h3>
                        <button
                            onClick={() => setEditingTier({
                                id: '', name: '', name_ja: '', min_points: 0,
                                discount_percent: 0, point_multiplier: 1,
                                color: '#94a3b8', icon: '⭐', benefits: '', is_active: true
                            })}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                        >
                            <Plus size={18} /> Thêm cấp
                        </button>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {tiers.map(tier => (
                            <div key={tier.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition">
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                                    style={{ backgroundColor: tier.color + '20' }}
                                >
                                    {tier.icon}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-slate-800">{tier.name}</p>
                                    <p className="text-sm text-slate-500">
                                        Từ {tier.min_points.toLocaleString()} điểm •
                                        Giảm {tier.discount_percent}% •
                                        Nhân {tier.point_multiplier}x điểm
                                    </p>
                                </div>
                                <button
                                    onClick={() => setEditingTier(tier)}
                                    className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
                                >
                                    <Edit2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Rewards Tab */}
            {activeTab === 'rewards' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800">Phần thưởng có thể đổi</h3>
                        <button
                            onClick={() => setEditingReward({
                                id: '', name_vi: '', name_ja: '',
                                points_required: 100, reward_type: 'discount_percent',
                                reward_value: 5, product_id: null, is_active: true
                            })}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                        >
                            <Plus size={18} /> Thêm phần thưởng
                        </button>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {rewards.map(reward => (
                            <div key={reward.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white">
                                    <Gift size={24} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-slate-800">{reward.name_vi}</p>
                                    <p className="text-sm text-slate-500">
                                        {reward.points_required.toLocaleString()} điểm •
                                        {reward.reward_type === 'discount_percent' && ` Giảm ${reward.reward_value}%`}
                                        {reward.reward_type === 'discount_fixed' && ` Giảm ¥${reward.reward_value?.toLocaleString()}`}
                                        {reward.reward_type === 'free_item' && ` Món miễn phí`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setEditingReward(reward)}
                                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => deleteReward(reward.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {rewards.length === 0 && (
                            <div className="p-8 text-center text-slate-400">
                                <Gift size={48} className="mx-auto mb-3 opacity-50" />
                                <p>Chưa có phần thưởng nào</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-slate-800">Bật chương trình tích điểm</p>
                            <p className="text-sm text-slate-500">Khách hàng sẽ được tích điểm khi thanh toán</p>
                        </div>
                        <button
                            onClick={() => saveSetting('loyalty_enabled', settings.loyalty_enabled === 'true' ? 'false' : 'true')}
                            className={`w-14 h-8 rounded-full transition-all ${settings.loyalty_enabled === 'true' ? 'bg-purple-600' : 'bg-slate-300'}`}
                        >
                            <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all ${settings.loyalty_enabled === 'true' ? 'translate-x-7' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Điểm mỗi ¥100</label>
                            <input
                                type="number"
                                value={settings.loyalty_points_per_yen || '1'}
                                onChange={(e) => saveSetting('loyalty_points_per_yen', e.target.value)}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Đơn tối thiểu để tích điểm (¥)</label>
                            <input
                                type="number"
                                value={settings.loyalty_min_order_for_points || '0'}
                                onChange={(e) => saveSetting('loyalty_min_order_for_points', e.target.value)}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Điểm thưởng sinh nhật</label>
                            <input
                                type="number"
                                value={settings.loyalty_birthday_bonus || '100'}
                                onChange={(e) => saveSetting('loyalty_birthday_bonus', e.target.value)}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Điểm thưởng giới thiệu bạn</label>
                            <input
                                type="number"
                                value={settings.loyalty_referral_bonus || '50'}
                                onChange={(e) => saveSetting('loyalty_referral_bonus', e.target.value)}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Tier Modal */}
            {editingTier && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 m-4">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">
                            {editingTier.id ? 'Sửa cấp bậc' : 'Thêm cấp bậc'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tên (Tiếng Việt)</label>
                                <input
                                    type="text"
                                    value={editingTier.name}
                                    onChange={(e) => setEditingTier({ ...editingTier, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Điểm tối thiểu</label>
                                    <input
                                        type="number"
                                        value={editingTier.min_points}
                                        onChange={(e) => setEditingTier({ ...editingTier, min_points: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">% Giảm giá</label>
                                    <input
                                        type="number"
                                        value={editingTier.discount_percent}
                                        onChange={(e) => setEditingTier({ ...editingTier, discount_percent: parseFloat(e.target.value) })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nhân điểm (x)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={editingTier.point_multiplier}
                                        onChange={(e) => setEditingTier({ ...editingTier, point_multiplier: parseFloat(e.target.value) })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Màu</label>
                                    <input
                                        type="color"
                                        value={editingTier.color}
                                        onChange={(e) => setEditingTier({ ...editingTier, color: e.target.value })}
                                        className="w-full h-10 rounded-lg border border-slate-200 cursor-pointer"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Icon (emoji)</label>
                                <input
                                    type="text"
                                    value={editingTier.icon}
                                    onChange={(e) => setEditingTier({ ...editingTier, icon: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setEditingTier(null)}
                                className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={() => saveTier(editingTier)}
                                className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2"
                            >
                                <Save size={18} /> Lưu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Reward Modal */}
            {editingReward && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 m-4">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">
                            {editingReward.id ? 'Sửa phần thưởng' : 'Thêm phần thưởng'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tên phần thưởng</label>
                                <input
                                    type="text"
                                    value={editingReward.name_vi}
                                    onChange={(e) => setEditingReward({ ...editingReward, name_vi: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Điểm cần để đổi</label>
                                <input
                                    type="number"
                                    value={editingReward.points_required}
                                    onChange={(e) => setEditingReward({ ...editingReward, points_required: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Loại phần thưởng</label>
                                <select
                                    value={editingReward.reward_type}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    onChange={(e) => setEditingReward({ ...editingReward, reward_type: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                >
                                    <option value="discount_percent">Giảm giá %</option>
                                    <option value="discount_fixed">Giảm giá cố định (¥)</option>
                                    <option value="free_item">Món miễn phí</option>
                                    <option value="voucher">Voucher</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Giá trị {editingReward.reward_type === 'discount_percent' ? '(%)' : '(¥)'}
                                </label>
                                <input
                                    type="number"
                                    value={editingReward.reward_value}
                                    onChange={(e) => setEditingReward({ ...editingReward, reward_value: parseFloat(e.target.value) })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setEditingReward(null)}
                                className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={() => saveReward(editingReward)}
                                className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2"
                            >
                                <Save size={18} /> Lưu
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
