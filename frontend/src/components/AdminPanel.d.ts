interface AdminPanelProps {
    authToken: string;
    onLogout: () => void;
}
declare const AdminPanel: ({ authToken, onLogout }: AdminPanelProps) => any;
export default AdminPanel;
