import React from 'react';
import { RefreshCw } from 'lucide-react';

interface SupabaseSyncIndicatorProps {
    isSyncing: boolean;
    lastSync?: Date;
}

const SupabaseSyncIndicator: React.FC<SupabaseSyncIndicatorProps> = ({ isSyncing, lastSync }) => {
    if (!isSyncing && !lastSync) return null;

    return (
        <div className="fixed bottom-4 right-4 flex items-center space-x-2 bg-white p-2 rounded-full shadow-lg border border-slate-200 animate-in">
            <div className={`${isSyncing ? 'animate-spin text-blue-500' : 'text-slate-400'}`}>
                <RefreshCw size={18} />
            </div>
            <span className="text-xs font-medium text-slate-600">
                {isSyncing ? 'Sincronizando...' : `Sincronizado às ${lastSync?.toLocaleTimeString()}`}
            </span>
        </div>
    );
};

export default SupabaseSyncIndicator;
