import React from 'react';


interface PosLayoutProps {
    children: React.ReactNode;
}

export default function PosLayout({ children }: PosLayoutProps) {
    return (
        <div className="h-screen w-screen bg-slate-50 flex flex-col overflow-hidden">
            {/* Main Content Area */}
            <main className="flex-1 h-full overflow-hidden relative flex flex-col">
                {children}
            </main>
        </div>
    );
}
