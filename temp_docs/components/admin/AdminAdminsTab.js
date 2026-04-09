import React from 'react';
const AdminAdminsTab = ({ admins, newAdminEmail, onNewAdminEmailChange, onAddAdmin, onRemoveAdmin, currentUserEmail }) => {
    return (React.createElement("div", { className: "space-y-6" },
        React.createElement("div", { className: "bg-bg-secondary p-4 rounded-lg" },
            React.createElement("h3", { className: "font-bold mb-3" }, "\u05D4\u05D5\u05E1\u05E4\u05EA \u05DE\u05E0\u05D4\u05DC \u05D7\u05D3\u05E9"),
            React.createElement("div", { className: "flex gap-2" },
                React.createElement("input", { type: "email", placeholder: "email@example.com", className: "flex-grow p-2 rounded bg-bg-primary border border-gray-700", value: newAdminEmail, onChange: e => onNewAdminEmailChange(e.target.value) }),
                React.createElement("button", { onClick: onAddAdmin, className: "bg-accent px-4 rounded text-white font-bold" }, "\u05D4\u05D5\u05E1\u05E3")),
            React.createElement("p", { className: "text-xs text-text-secondary mt-2" }, "\u05E9\u05D9\u05DD \u05DC\u05D1: \u05D4\u05DE\u05D9\u05D9\u05DC \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA \u05EA\u05D5\u05D0\u05DD \u05DC\u05D7\u05E9\u05D1\u05D5\u05DF \u05D2\u05D5\u05D2\u05DC \u05E9\u05D0\u05D9\u05EA\u05D5 \u05D4\u05DE\u05E9\u05EA\u05DE\u05E9 \u05DE\u05EA\u05D7\u05D1\u05E8.")),
        React.createElement("div", null,
            React.createElement("h3", { className: "font-bold mb-3" },
                "\u05E8\u05E9\u05D9\u05DE\u05EA \u05DE\u05E0\u05D4\u05DC\u05D9\u05DD (",
                admins.length,
                ")"),
            React.createElement("div", { className: "space-y-2" }, admins.map(email => (React.createElement("div", { key: email, className: "flex justify-between items-center bg-bg-secondary p-3 rounded" },
                React.createElement("span", null, email),
                email !== currentUserEmail && (React.createElement("button", { onClick: () => onRemoveAdmin(email), className: "text-red-400 text-sm hover:underline" }, "\u05D4\u05E1\u05E8")),
                email === currentUserEmail && React.createElement("span", { className: "text-xs text-accent" }, "(\u05D0\u05EA\u05D4)"))))))));
};
export default AdminAdminsTab;
