import { useState, useEffect } from 'react';
import {
    Store, Receipt, Printer, Shield, Bell, Monitor,
    CreditCard, Save, Loader2, Check, ChefHat
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';

// V3 Settings Components
import GeneralSettings from './settings/v3/GeneralSettings';
import DisplaySettings from './settings/v3/DisplaySettings';
import PrinterSettings from './settings/v3/PrinterSettings';
import SecuritySettings from './settings/v3/SecuritySettings';
import NotificationSettings from './settings/v3/NotificationSettings';
import PaymentSettings from './settings/v3/PaymentSettings';
import ReceiptSettings from './settings/v3/ReceiptSettings';
import StationManager from './StationManager';

type TabId = 'general' | 'display' | 'receipt' | 'printer' | 'payment' | 'security' | 'notifications' | 'stations';

export default function SettingsV3() {
    const [activeTab, setActiveTab] = useState<TabId>('general');

    // Data States
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const [allSettings, setAllSettings] = useState<any>({});

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const res = await api.getSettings();
            if (res.data) {
                setAllSettings(res.data);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.updateSettings(allSettings);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Lỗi lưu cài đặt');
        } finally {
            setIsSaving(false);
        }
    };

    const updateSection = (section: string, data: any) => {
        setAllSettings(prev => ({
            ...prev,
            [section]: data
        }));
    };

    const tabs = [
        { id: 'general' as TabId, label: 'Cửa hàng', icon: Store, description: 'Thông tin chung, ngôn ngữ' },
        { id: 'display' as TabId, label: 'Màn hình & Bàn', icon: Monitor, description: 'Quản lý màn hình khách, bếp' },
        { id: 'stations' as TabId, label: 'Bếp/Bar', icon: ChefHat, description: 'Quản lý trạm chế biến' },
        { id: 'receipt' as TabId, label: 'Hóa đơn', icon: Receipt, description: 'Logo, header, footer' },
        { id: 'printer' as TabId, label: 'Máy in', icon: Printer, description: 'Cấu hình in ấn' },
        { id: 'payment' as TabId, label: 'Thanh toán', icon: CreditCard, description: 'Phương thức thanh toán' },
        { id: 'security' as TabId, label: 'Bảo mật', icon: Shield, description: 'Phân quyền, mã PIN' },
        { id: 'notifications' as TabId, label: 'Thông báo', icon: Bell, description: 'Telegram bot' },
    ];

    const renderContent = () => {
        if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600" /></div>;

        switch (activeTab) {
            case 'general':
                return <GeneralSettings settings={allSettings.store_settings} onChange={d => updateSection('store_settings', d)} />;
            case 'display':
                return <DisplaySettings />;
            case 'receipt':
                return <ReceiptSettings settings={allSettings.receipt_settings} onChange={d => updateSection('receipt_settings', d)} />;
            case 'printer':
                return <PrinterSettings settings={allSettings.printer_settings} onChange={d => updateSection('printer_settings', d)} />;
            case 'payment':
                return <PaymentSettings />; // Payment manages its own state usually
            case 'security':
                return <SecuritySettings settings={allSettings.permission_settings} onChange={d => updateSection('permission_settings', d)} />;
            case 'notifications':
                return <NotificationSettings settings={allSettings.notification_settings} onChange={d => updateSection('notification_settings', d)} />;
            case 'stations':
                return <StationManager />;
            default:
                return <div>Select a tab</div>;
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* Top Navigation Bar - Horizontal Scroll */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
                <div className="px-4 md:px-8 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Cài đặt hệ thống</h1>
                            <p className="text-sm text-slate-500 hidden md:block">Quản lý cấu hình cửa hàng, thiết bị và tài khoản</p>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg ${saveSuccess
                                ? 'bg-green-500 text-white shadow-green-200'
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 hover:shadow-blue-300'
                                }`}
                        >
                            {isSaving ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : saveSuccess ? (
                                <Check size={20} />
                            ) : (
                                <Save size={20} />
                            )}
                            <span>{saveSuccess ? 'Đã lưu!' : 'Lưu thay đổi'}</span>
                        </button>
                    </div>

                    {/* Horizontal Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-all border ${isActive
                                        ? 'bg-slate-800 text-white border-slate-800 shadow-md ring-2 ring-slate-200 ring-offset-2'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                        }`}
                                >
                                    <Icon size={18} className={isActive ? 'text-white' : 'text-slate-500'} />
                                    <span className="font-medium text-sm">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8 pb-32">
                <div className="max-w-5xl mx-auto">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            {tabs.find(t => t.id === activeTab)?.label}
                        </h2>
                        <p className="text-slate-500 text-sm">{tabs.find(t => t.id === activeTab)?.description}</p>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.15 }}
                        >
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
                                {renderContent()}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
