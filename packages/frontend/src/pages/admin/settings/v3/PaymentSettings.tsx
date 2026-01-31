import { CreditCard } from 'lucide-react';
import PaymentMethodsManager from '../PaymentMethodsManager';

export default function PaymentSettings() {
    return (
        <div className="p-6 md:p-8 space-y-8">
            <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
                    <CreditCard className="text-blue-600" size={24} />
                    Phương thức Thanh toán
                </h3>
                <p className="text-slate-500">Quản lý các phương thức thanh toán được chấp nhận (Tiền mặt, Thẻ, QR...)</p>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
                <PaymentMethodsManager />
            </div>
        </div>
    );
}
