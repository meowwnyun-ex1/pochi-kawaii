import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import logger from '@/utils/logger';
const LanguageContext = createContext(undefined);
const SUPPORTED_LANGUAGES = ['th', 'en', 'jp', 'id', 'zh', 'ko', 'vi', 'es', 'fil', 'hi'];
const DEFAULT_LANGUAGE = 'th';
export const LanguageProvider = ({ children }) => {
    const { t: i18nT, ready } = useTranslation();
    const [language, setLanguageState] = useState(() => {
        const savedLang = localStorage.getItem('pochi_language');
        return (savedLang && SUPPORTED_LANGUAGES.includes(savedLang)) ? savedLang : DEFAULT_LANGUAGE;
    });
    useEffect(() => {
        if (ready) {
            i18n.changeLanguage(language);
            if (typeof document !== 'undefined') {
                document.documentElement.lang = language;
            }
        }
    }, [language, ready]);
    const setLanguage = useCallback((lang) => {
        if (!SUPPORTED_LANGUAGES.includes(lang)) {
            logger.warn(`Language ${lang} is not supported`, 'LanguageContext');
            return;
        }
        setLanguageState(lang);
        localStorage.setItem('pochi_language', lang);
        i18n.changeLanguage(lang);
        if (typeof document !== 'undefined') {
            document.documentElement.lang = lang;
        }
    }, []);
    const t = useCallback((key, options) => {
        if (!ready)
            return key;
        try {
            const translation = i18nT(key, options);
            if (typeof translation === 'string') {
                if (translation === key) {
                    const fallbackTranslation = i18nT(key, { ...options, ns: 'common' });
                    return typeof fallbackTranslation === 'string' ? fallbackTranslation : key;
                }
                return translation;
            }
            if (translation && typeof translation === 'object') {
                return JSON.stringify(translation);
            }
            return key;
        }
        catch (error) {
            logger.warn(`Translation error for key "${key}"`, 'LanguageContext', error);
            return key;
        }
    }, [i18nT, ready]);
    const config = React.useMemo(() => ({
        carousel_texts: {
            feedback_from_users: {
                th: 'ความคิดเห็นจากผู้ใช้',
                en: 'Feedback from Users',
                jp: 'ユーザーのフィードバック',
                id: 'Masukan dari Pengguna',
                zh: '用户反馈',
                ko: '사용자 피드백',
                vi: 'Phản hồi từ người dùng',
                es: 'Comentarios de usuarios',
                fil: 'Feedback mula sa mga user',
                hi: 'उपयोगकर्ता प्रतिक्रिया',
            },
            items_count: {
                th: 'รายการ',
                en: 'items',
                jp: '件',
                id: 'item',
                zh: '项',
                ko: '항목',
                vi: 'mục',
                es: 'elementos',
                fil: 'mga item',
                hi: 'आइटम',
            },
            collapse_button: {
                th: 'ซ่อน',
                en: 'Hide',
                jp: '隠す',
                id: 'Sembunyikan',
                zh: '隐藏',
                ko: '숨기기',
                vi: 'Ẩn',
                es: 'Ocultar',
                fil: 'Itago',
                hi: 'छुपाएं',
            },
            expand_button: {
                th: 'แสดง',
                en: 'Show',
                jp: '表示',
                id: 'Tampilkan',
                zh: '显示',
                ko: '표시',
                vi: 'Hiển thị',
                es: 'Mostrar',
                fil: 'Ipakita',
                hi: 'दिखाएं',
            },
            updating: {
                th: 'กำลังอัพเดท...',
                en: 'Updating...',
                jp: '更新中...',
                id: 'Memperbarui...',
                zh: '更新中...',
                ko: '업데이트 중...',
                vi: 'Đang cập nhật...',
                es: 'Actualizando...',
                fil: 'Nag-update...',
                hi: 'अपडेट हो रहा है...',
            },
        },
        language_switcher: {
            selectLanguage: {
                th: 'เลือกภาษา',
                en: 'Select Language',
                jp: '言語を選択',
                id: 'Pilih Bahasa',
                zh: '选择语言',
                ko: '언어 선택',
                vi: 'Chọn ngôn ngữ',
                es: 'Seleccionar idioma',
                fil: 'Pumili ng Wika',
                hi: 'भाषा चुनें',
            },
            active: {
                th: 'ใช้งาน',
                en: 'Active',
                jp: '使用中',
                id: 'Aktif',
                zh: '活跃',
                ko: '활성',
                vi: 'Hoạt động',
                es: 'Activo',
                fil: 'Aktibo',
                hi: 'सक्रिय',
            },
            aiNote: {
                th: 'AI ตอบตามภาษาคำถาม',
                en: 'AI responds in question language',
                jp: 'AIは質問の言語で回答',
                id: 'AI merespons dalam bahasa pertanyaan',
                zh: 'AI用问题语言回答',
                ko: 'AI가 질문 언어로 응답',
                vi: 'AI trả lời bằng ngôn ngữ câu hỏi',
                es: 'AI responde en el idioma de la pregunta',
                fil: 'Ang AI ay tumutugon sa wika ng tanong',
                hi: 'AI प्रश्न की भाषा में जवाब देता है',
            },
        },
        admin_panel: {
            panel_title: { th: 'แผงควบคุมผู้ดูแลระบบ', en: 'Admin Control Panel', jp: '管理者コントロールパネル', id: 'Panel Kontrol Admin', zh: '管理员控制面板', ko: '관리자 제어판', vi: 'Bảng điều khiển quản trị', es: 'Panel de control de administrador', fil: 'Admin Control Panel', hi: 'एडमिन नियंत्रण पैनल' },
            login_title: { th: 'เข้าสู่ระบบผู้ดูแล', en: 'Admin Login', jp: '管理者ログイン', id: 'Login Admin', zh: '管理员登录', ko: '관리자 로그인', vi: 'Đăng nhập quản trị', es: 'Inicio de sesión de administrador', fil: 'Admin Login', hi: 'एडमिन लॉगिन' },
            password_label: { th: 'รหัสผ่านผู้ดูแล', en: 'Admin Password', jp: '管理者パスワード', id: 'Kata Sandi Admin', zh: '管理员密码', ko: '관리자 비밀번호', vi: 'Mật khẩu quản trị', es: 'Contraseña de administrador', fil: 'Admin Password', hi: 'एडमिन पासवर्ड' },
            password_placeholder: { th: 'กรุณาใส่รหัสผ่าน', en: 'Enter password', jp: 'パスワードを入力', id: 'Masukkan kata sandi', zh: '输入密码', ko: '비밀번호 입력', vi: 'Nhập mật khẩu', es: 'Ingrese contraseña', fil: 'Ilagay ang password', hi: 'पासवर्ड दर्ज करें' },
            login_button: { th: 'เข้าสู่ระบบ', en: 'Login', jp: 'ログイン', id: 'Masuk', zh: '登录', ko: '로그인', vi: 'Đăng nhập', es: 'Iniciar sesión', fil: 'Mag-login', hi: 'लॉगिन' },
            logging_in: { th: 'กำลังเข้าสู่ระบบ...', en: 'Logging in...', jp: 'ログイン中...', id: 'Masuk...', zh: '登录中...', ko: '로그인 중...', vi: 'Đang đăng nhập...', es: 'Iniciando sesión...', fil: 'Nag-login...', hi: 'लॉगिन हो रहा है...' },
            login_success: { th: 'เข้าสู่ระบบสำเร็จ!', en: 'Login successful!', jp: 'ログイン成功！', id: 'Login berhasil!', zh: '登录成功！', ko: '로그인 성공！', vi: 'Đăng nhập thành công!', es: '¡Inicio de sesión exitoso!', fil: 'Matagumpay na login!', hi: 'लॉगिन सफल!' },
            invalid_password: { th: 'รหัสผ่านไม่ถูกต้อง!', en: 'Invalid password!', jp: 'パスワードが無効です！', id: 'Kata sandi tidak valid!', zh: '密码无效！', ko: '잘못된 비밀번호！', vi: 'Mật khẩu không hợp lệ!', es: '¡Contraseña inválida!', fil: 'Hindi wasto ang password!', hi: 'अमान्य पासवर्ड!' },
            logout: { th: 'ออกจากระบบ', en: 'Logout', jp: 'ログアウト', id: 'Keluar', zh: '登出', ko: '로그아웃', vi: 'Đăng xuất', es: 'Cerrar sesión', fil: 'Mag-logout', hi: 'लॉगआउट' },
            logout_success: { th: 'ออกจากระบบสำเร็จ!', en: 'Logged out successfully!', jp: 'ログアウト成功！', id: 'Berhasil keluar!', zh: '登出成功！', ko: '로그아웃 성공！', vi: 'Đăng xuất thành công!', es: '¡Sesión cerrada exitosamente!', fil: 'Matagumpay na logout!', hi: 'सफलतापूर्वक लॉगआउट!' },
            manage_feedback: { th: 'จัดการความคิดเห็น', en: 'Manage Feedback', jp: 'フィードバック管理', id: 'Kelola Masukan', zh: '管理反馈', ko: '피드백 관리', vi: 'Quản lý phản hồi', es: 'Gestionar comentarios', fil: 'Pamahalaan ang Feedback', hi: 'प्रतिक्रिया प्रबंधित करें' },
            total_feedback: { th: 'ความคิดเห็นทั้งหมด', en: 'Total Feedback', jp: '総フィードバック', id: 'Total Masukan', zh: '总反馈', ko: '총 피드백', vi: 'Tổng phản hồi', es: 'Comentarios totales', fil: 'Kabuuang Feedback', hi: 'कुल प्रतिक्रिया' },
            displayed: { th: 'แสดงแล้ว', en: 'Displayed', jp: '表示済み', id: 'Ditampilkan', zh: '已显示', ko: '표시됨', vi: 'Đã hiển thị', es: 'Mostrado', fil: 'Ipinakita', hi: 'प्रदर्शित' },
            feedback_list: { th: 'รายการความคิดเห็น', en: 'Feedback List', jp: 'フィードバック一覧', id: 'Daftar Masukan', zh: '反馈列表', ko: '피드백 목록', vi: 'Danh sách phản hồi', es: 'Lista de comentarios', fil: 'Listahan ng Feedback', hi: 'प्रतिक्रिया सूची' },
            refresh: { th: 'รีเฟรช', en: 'Refresh', jp: '更新', id: 'Muat ulang', zh: '刷新', ko: '새로고침', vi: 'Làm mới', es: 'Actualizar', fil: 'I-refresh', hi: 'रीफ्रेश' },
            name: { th: 'ชื่อ', en: 'Name', jp: '名前', id: 'Nama', zh: '姓名', ko: '이름', vi: 'Tên', es: 'Nombre', fil: 'Pangalan', hi: 'नाम' },
            feedback: { th: 'ความคิดเห็น', en: 'Feedback', jp: 'フィードバック', id: 'Masukan', zh: '反馈', ko: '피드백', vi: 'Phản hồi', es: 'Comentario', fil: 'Feedback', hi: 'प्रतिक्रिया' },
            time: { th: 'เวลา', en: 'Time', jp: '時間', id: 'Waktu', zh: '时间', ko: '시간', vi: 'Thời gian', es: 'Hora', fil: 'Oras', hi: 'समय' },
            management: { th: 'การจัดการ', en: 'Actions', jp: '操作', id: 'Tindakan', zh: '操作', ko: '작업', vi: 'Hành động', es: 'Acciones', fil: 'Mga Aksyon', hi: 'कार्रवाई' },
            no_feedback: { th: 'ยังไม่มีความคิดเห็น', en: 'No feedback', jp: 'フィードバックなし', id: 'Tidak ada masukan', zh: '无反馈', ko: '피드백 없음', vi: 'Không có phản hồi', es: 'Sin comentarios', fil: 'Walang feedback', hi: 'कोई प्रतिक्रिया नहीं' },
            delete_confirm: { th: 'ยืนยันการลบ', en: 'Confirm Delete', jp: '削除の確認', id: 'Konfirmasi Hapus', zh: '确认删除', ko: '삭제 확인', vi: 'Xác nhận xóa', es: 'Confirmar eliminación', fil: 'Kumpirmahin ang Pagtanggal', hi: 'हटाने की पुष्टि करें' },
            delete_button: { th: 'ลบ', en: 'Delete', jp: '削除', id: 'Hapus', zh: '删除', ko: '삭제', vi: 'Xóa', es: 'Eliminar', fil: 'Tanggalin', hi: 'हटाएं' },
            delete_success: { th: 'ลบสำเร็จ!', en: 'Deleted successfully!', jp: '削除成功！', id: 'Berhasil dihapus!', zh: '删除成功！', ko: '삭제 성공！', vi: 'Xóa thành công!', es: '¡Eliminado exitosamente!', fil: 'Matagumpay na natanggal!', hi: 'सफलतापूर्वक हटाया गया!' },
            delete_error: { th: 'ไม่สามารถลบได้!', en: 'Cannot delete!', jp: '削除できません！', id: 'Tidak dapat menghapus!', zh: '无法删除！', ko: '삭제할 수 없습니다！', vi: 'Không thể xóa!', es: '¡No se puede eliminar!', fil: 'Hindi matatanggal!', hi: 'हटाया नहीं जा सकता!' },
        },
        feedback_guidelines: {
            th: [],
            en: [],
            jp: [],
            id: [],
            zh: [],
            ko: [],
            vi: [],
            es: [],
            fil: [],
            hi: [],
        },
    }), []);
    const contextValue = React.useMemo(() => ({
        language,
        setLanguage,
        t,
        config,
        loading: !ready,
        error: null,
    }), [language, setLanguage, t, config, ready]);
    return _jsx(LanguageContext.Provider, { value: contextValue, children: children });
};
export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider');
    }
    return context;
};
