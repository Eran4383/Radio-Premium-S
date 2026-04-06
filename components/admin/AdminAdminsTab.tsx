import React from 'react';

interface AdminAdminsTabProps {
    admins: string[];
    newAdminEmail: string;
    onNewAdminEmailChange: (email: string) => void;
    onAddAdmin: () => void;
    onRemoveAdmin: (email: string) => void;
    currentUserEmail: string | null;
}

const AdminAdminsTab: React.FC<AdminAdminsTabProps> = ({
    admins,
    newAdminEmail,
    onNewAdminEmailChange,
    onAddAdmin,
    onRemoveAdmin,
    currentUserEmail
}) => {
    return (
        <div className="space-y-6">
            <div className="bg-bg-secondary p-4 rounded-lg">
                <h3 className="font-bold mb-3">הוספת מנהל חדש</h3>
                <div className="flex gap-2">
                    <input 
                        type="email" 
                        placeholder="email@example.com" 
                        className="flex-grow p-2 rounded bg-bg-primary border border-gray-700"
                        value={newAdminEmail}
                        onChange={e => onNewAdminEmailChange(e.target.value)}
                    />
                    <button onClick={onAddAdmin} className="bg-accent px-4 rounded text-white font-bold">הוסף</button>
                </div>
                <p className="text-xs text-text-secondary mt-2">
                    שים לב: המייל חייב להיות תואם לחשבון גוגל שאיתו המשתמש מתחבר.
                </p>
            </div>

            <div>
                <h3 className="font-bold mb-3">רשימת מנהלים ({admins.length})</h3>
                <div className="space-y-2">
                    {admins.map(email => (
                        <div key={email} className="flex justify-between items-center bg-bg-secondary p-3 rounded">
                            <span>{email}</span>
                            {email !== currentUserEmail && (
                                <button onClick={() => onRemoveAdmin(email)} className="text-red-400 text-sm hover:underline">הסר</button>
                            )}
                            {email === currentUserEmail && <span className="text-xs text-accent">(אתה)</span>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminAdminsTab;
