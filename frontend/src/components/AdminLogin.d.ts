interface AdminLoginProps {
    onLoginSuccess: (token: string) => void;
}
declare const AdminLogin: ({ onLoginSuccess }: AdminLoginProps) => any;
export default AdminLogin;
