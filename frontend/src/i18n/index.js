import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// Import Thai translations
import thCommon from './locales/th/common.json';
import thSidebar from './locales/th/sidebar.json';
import thArtifact from './locales/th/artifact.json';
import thCodeblock from './locales/th/codeblock.json';
import thMessage from './locales/th/message.json';
import thHeader from './locales/th/header.json';
import thImage from './locales/th/image.json';
import thFile from './locales/th/file.json';
import thAnnouncement from './locales/th/announcement.json';
import thLanguage from './locales/th/language.json';
import thError from './locales/th/error.json';
// Import English translations
import enCommon from './locales/en/common.json';
import enSidebar from './locales/en/sidebar.json';
import enArtifact from './locales/en/artifact.json';
import enCodeblock from './locales/en/codeblock.json';
import enMessage from './locales/en/message.json';
import enHeader from './locales/en/header.json';
import enImage from './locales/en/image.json';
import enAnnouncement from './locales/en/announcement.json';
import enLanguage from './locales/en/language.json';
import enError from './locales/en/error.json';
// Import Japanese translations
import jpCommon from './locales/jp/common.json';
import jpSidebar from './locales/jp/sidebar.json';
import jpArtifact from './locales/jp/artifact.json';
import jpCodeblock from './locales/jp/codeblock.json';
import jpMessage from './locales/jp/message.json';
import jpHeader from './locales/jp/header.json';
import jpImage from './locales/jp/image.json';
import jpAnnouncement from './locales/jp/announcement.json';
import jpLanguage from './locales/jp/language.json';
import jpError from './locales/jp/error.json';
// Import Indonesian translations
import idCommon from './locales/id/common.json';
import idSidebar from './locales/id/sidebar.json';
import idArtifact from './locales/id/artifact.json';
import idCodeblock from './locales/id/codeblock.json';
import idMessage from './locales/id/message.json';
import idHeader from './locales/id/header.json';
import idImage from './locales/id/image.json';
import idAnnouncement from './locales/id/announcement.json';
import idLanguage from './locales/id/language.json';
import idError from './locales/id/error.json';
// Import Chinese translations
import zhCommon from './locales/zh/common.json';
import zhSidebar from './locales/zh/sidebar.json';
import zhArtifact from './locales/zh/artifact.json';
import zhCodeblock from './locales/zh/codeblock.json';
import zhMessage from './locales/zh/message.json';
import zhHeader from './locales/zh/header.json';
import zhImage from './locales/zh/image.json';
import zhAnnouncement from './locales/zh/announcement.json';
import zhLanguage from './locales/zh/language.json';
import zhError from './locales/zh/error.json';
// Import Korean translations
import koCommon from './locales/ko/common.json';
import koSidebar from './locales/ko/sidebar.json';
import koArtifact from './locales/ko/artifact.json';
import koCodeblock from './locales/ko/codeblock.json';
import koMessage from './locales/ko/message.json';
import koHeader from './locales/ko/header.json';
import koImage from './locales/ko/image.json';
import koAnnouncement from './locales/ko/announcement.json';
import koLanguage from './locales/ko/language.json';
import koError from './locales/ko/error.json';
// Import Vietnamese translations
import viCommon from './locales/vi/common.json';
import viSidebar from './locales/vi/sidebar.json';
import viArtifact from './locales/vi/artifact.json';
import viCodeblock from './locales/vi/codeblock.json';
import viMessage from './locales/vi/message.json';
import viHeader from './locales/vi/header.json';
import viImage from './locales/vi/image.json';
import viAnnouncement from './locales/vi/announcement.json';
import viLanguage from './locales/vi/language.json';
import viError from './locales/vi/error.json';
// Import Spanish translations
import esCommon from './locales/es/common.json';
import esSidebar from './locales/es/sidebar.json';
import esArtifact from './locales/es/artifact.json';
import esCodeblock from './locales/es/codeblock.json';
import esMessage from './locales/es/message.json';
import esHeader from './locales/es/header.json';
import esImage from './locales/es/image.json';
import esAnnouncement from './locales/es/announcement.json';
import esLanguage from './locales/es/language.json';
import esError from './locales/es/error.json';
// Import Filipino translations
import filCommon from './locales/fil/common.json';
import filSidebar from './locales/fil/sidebar.json';
import filArtifact from './locales/fil/artifact.json';
import filCodeblock from './locales/fil/codeblock.json';
import filMessage from './locales/fil/message.json';
import filHeader from './locales/fil/header.json';
import filImage from './locales/fil/image.json';
import filAnnouncement from './locales/fil/announcement.json';
import filLanguage from './locales/fil/language.json';
import filError from './locales/fil/error.json';
// Import Hindi translations
import hiCommon from './locales/hi/common.json';
import hiSidebar from './locales/hi/sidebar.json';
import hiArtifact from './locales/hi/artifact.json';
import hiCodeblock from './locales/hi/codeblock.json';
import hiMessage from './locales/hi/message.json';
import hiHeader from './locales/hi/header.json';
import hiImage from './locales/hi/image.json';
import hiAnnouncement from './locales/hi/announcement.json';
import hiLanguage from './locales/hi/language.json';
import hiError from './locales/hi/error.json';
const resources = {
    th: {
        common: thCommon,
        sidebar: thSidebar,
        artifact: thArtifact,
        codeblock: thCodeblock,
        message: thMessage,
        header: thHeader,
        image: thImage,
        file: thFile,
        announcement: thAnnouncement,
        language: thLanguage,
        error: thError,
    },
    en: {
        common: enCommon,
        sidebar: enSidebar,
        artifact: enArtifact,
        codeblock: enCodeblock,
        message: enMessage,
        header: enHeader,
        image: enImage,
        announcement: enAnnouncement,
        language: enLanguage,
        error: enError,
    },
    jp: {
        common: jpCommon,
        sidebar: jpSidebar,
        artifact: jpArtifact,
        codeblock: jpCodeblock,
        message: jpMessage,
        header: jpHeader,
        image: jpImage,
        announcement: jpAnnouncement,
        language: jpLanguage,
        error: jpError,
    },
    id: {
        common: idCommon,
        sidebar: idSidebar,
        artifact: idArtifact,
        codeblock: idCodeblock,
        message: idMessage,
        header: idHeader,
        image: idImage,
        announcement: idAnnouncement,
        language: idLanguage,
        error: idError,
    },
    zh: {
        common: zhCommon,
        sidebar: zhSidebar,
        artifact: zhArtifact,
        codeblock: zhCodeblock,
        message: zhMessage,
        header: zhHeader,
        image: zhImage,
        announcement: zhAnnouncement,
        language: zhLanguage,
        error: zhError,
    },
    ko: {
        common: koCommon,
        sidebar: koSidebar,
        artifact: koArtifact,
        codeblock: koCodeblock,
        message: koMessage,
        header: koHeader,
        image: koImage,
        announcement: koAnnouncement,
        language: koLanguage,
        error: koError,
    },
    vi: {
        common: viCommon,
        sidebar: viSidebar,
        artifact: viArtifact,
        codeblock: viCodeblock,
        message: viMessage,
        header: viHeader,
        image: viImage,
        announcement: viAnnouncement,
        language: viLanguage,
        error: viError,
    },
    es: {
        common: esCommon,
        sidebar: esSidebar,
        artifact: esArtifact,
        codeblock: esCodeblock,
        message: esMessage,
        header: esHeader,
        image: esImage,
        announcement: esAnnouncement,
        language: esLanguage,
        error: esError,
    },
    fil: {
        common: filCommon,
        sidebar: filSidebar,
        artifact: filArtifact,
        codeblock: filCodeblock,
        message: filMessage,
        header: filHeader,
        image: filImage,
        announcement: filAnnouncement,
        language: filLanguage,
        error: filError,
    },
    hi: {
        common: hiCommon,
        sidebar: hiSidebar,
        artifact: hiArtifact,
        codeblock: hiCodeblock,
        message: hiMessage,
        header: hiHeader,
        image: hiImage,
        announcement: hiAnnouncement,
        language: hiLanguage,
        error: hiError,
    },
};
i18n
    .use(initReactI18next)
    .init({
    resources,
    lng: 'th', // default language
    fallbackLng: 'en',
    ns: ['common', 'sidebar', 'artifact', 'codeblock', 'message', 'header', 'image', 'file', 'announcement', 'language', 'error'],
    defaultNS: 'common',
    interpolation: {
        escapeValue: false, // react already safes from xss
    },
    react: {
        useSuspense: false,
    },
});
export default i18n;
