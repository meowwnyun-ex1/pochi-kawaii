import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import Thai translations
import thCommon from './locales/th/common.json';
import thSidebar from './locales/th/sidebar.json';
import thHeader from './locales/th/header.json';
import thImage from './locales/th/image.json';
import thAnnouncement from './locales/th/announcement.json';
import thLanguage from './locales/th/language.json';
import thError from './locales/th/error.json';
import thAdmin from './locales/th/admin.json';
import thFeedback from './locales/th/feedback.json';
import thCarousel from './locales/th/carousel.json';
import thDeveloping from './locales/th/developing.json';

// Import English translations
import enCommon from './locales/en/common.json';
import enSidebar from './locales/en/sidebar.json';
import enHeader from './locales/en/header.json';
import enImage from './locales/en/image.json';
import enAnnouncement from './locales/en/announcement.json';
import enLanguage from './locales/en/language.json';
import enError from './locales/en/error.json';
import enAdmin from './locales/en/admin.json';
import enFeedback from './locales/en/feedback.json';
import enCarousel from './locales/en/carousel.json';
import enDeveloping from './locales/en/developing.json';

// Import Japanese translations
import jpCommon from './locales/jp/common.json';
import jpSidebar from './locales/jp/sidebar.json';
import jpHeader from './locales/jp/header.json';
import jpImage from './locales/jp/image.json';
import jpAnnouncement from './locales/jp/announcement.json';
import jpLanguage from './locales/jp/language.json';
import jpError from './locales/jp/error.json';
import jpAdmin from './locales/jp/admin.json';
import jpFeedback from './locales/jp/feedback.json';
import jpCarousel from './locales/jp/carousel.json';
import jpDeveloping from './locales/jp/developing.json';

// Import Indonesian translations
import idCommon from './locales/id/common.json';
import idSidebar from './locales/id/sidebar.json';
import idHeader from './locales/id/header.json';
import idImage from './locales/id/image.json';
import idAnnouncement from './locales/id/announcement.json';
import idLanguage from './locales/id/language.json';
import idError from './locales/id/error.json';
import idAdmin from './locales/id/admin.json';
import idFeedback from './locales/id/feedback.json';
import idCarousel from './locales/id/carousel.json';
import idDeveloping from './locales/id/developing.json';

// Import Chinese translations
import zhCommon from './locales/zh/common.json';
import zhSidebar from './locales/zh/sidebar.json';
import zhHeader from './locales/zh/header.json';
import zhImage from './locales/zh/image.json';
import zhAnnouncement from './locales/zh/announcement.json';
import zhLanguage from './locales/zh/language.json';
import zhError from './locales/zh/error.json';
import zhAdmin from './locales/zh/admin.json';
import zhFeedback from './locales/zh/feedback.json';
import zhCarousel from './locales/zh/carousel.json';
import zhDeveloping from './locales/zh/developing.json';

// Import Korean translations
import koCommon from './locales/ko/common.json';
import koSidebar from './locales/ko/sidebar.json';
import koHeader from './locales/ko/header.json';
import koImage from './locales/ko/image.json';
import koAnnouncement from './locales/ko/announcement.json';
import koLanguage from './locales/ko/language.json';
import koError from './locales/ko/error.json';
import koAdmin from './locales/ko/admin.json';
import koFeedback from './locales/ko/feedback.json';
import koCarousel from './locales/ko/carousel.json';
import koDeveloping from './locales/ko/developing.json';

// Import Vietnamese translations
import viCommon from './locales/vi/common.json';
import viSidebar from './locales/vi/sidebar.json';
import viHeader from './locales/vi/header.json';
import viImage from './locales/vi/image.json';
import viAnnouncement from './locales/vi/announcement.json';
import viLanguage from './locales/vi/language.json';
import viError from './locales/vi/error.json';
import viAdmin from './locales/vi/admin.json';
import viFeedback from './locales/vi/feedback.json';
import viCarousel from './locales/vi/carousel.json';
import viDeveloping from './locales/vi/developing.json';

// Import Spanish translations
import esCommon from './locales/es/common.json';
import esSidebar from './locales/es/sidebar.json';
import esHeader from './locales/es/header.json';
import esImage from './locales/es/image.json';
import esAnnouncement from './locales/es/announcement.json';
import esLanguage from './locales/es/language.json';
import esError from './locales/es/error.json';
import esAdmin from './locales/es/admin.json';
import esFeedback from './locales/es/feedback.json';
import esCarousel from './locales/es/carousel.json';
import esDeveloping from './locales/es/developing.json';

// Import Filipino translations
import filCommon from './locales/fil/common.json';
import filSidebar from './locales/fil/sidebar.json';
import filHeader from './locales/fil/header.json';
import filImage from './locales/fil/image.json';
import filAnnouncement from './locales/fil/announcement.json';
import filLanguage from './locales/fil/language.json';
import filError from './locales/fil/error.json';
import filAdmin from './locales/fil/admin.json';
import filFeedback from './locales/fil/feedback.json';
import filCarousel from './locales/fil/carousel.json';
import filDeveloping from './locales/fil/developing.json';

// Import Hindi translations
import hiCommon from './locales/hi/common.json';
import hiSidebar from './locales/hi/sidebar.json';
import hiHeader from './locales/hi/header.json';
import hiImage from './locales/hi/image.json';
import hiAnnouncement from './locales/hi/announcement.json';
import hiLanguage from './locales/hi/language.json';
import hiError from './locales/hi/error.json';
import hiAdmin from './locales/hi/admin.json';
import hiFeedback from './locales/hi/feedback.json';
import hiCarousel from './locales/hi/carousel.json';
import hiDeveloping from './locales/hi/developing.json';

const resources = {
  th: {
    common: thCommon,
    sidebar: thSidebar,
    header: thHeader,
    image: thImage,
    announcement: thAnnouncement,
    language: thLanguage,
    error: thError,
    admin: thAdmin,
    feedback: thFeedback,
    carousel: thCarousel,
    developing: thDeveloping,
  },
  en: {
    common: enCommon,
    sidebar: enSidebar,
    header: enHeader,
    image: enImage,
    announcement: enAnnouncement,
    language: enLanguage,
    error: enError,
    admin: enAdmin,
    feedback: enFeedback,
    carousel: enCarousel,
    developing: enDeveloping,
  },
  jp: {
    common: jpCommon,
    sidebar: jpSidebar,
    header: jpHeader,
    image: jpImage,
    announcement: jpAnnouncement,
    language: jpLanguage,
    error: jpError,
    admin: jpAdmin,
    feedback: jpFeedback,
    carousel: jpCarousel,
    developing: jpDeveloping,
  },
  id: {
    common: idCommon,
    sidebar: idSidebar,
    header: idHeader,
    image: idImage,
    announcement: idAnnouncement,
    language: idLanguage,
    error: idError,
    admin: idAdmin,
    feedback: idFeedback,
    carousel: idCarousel,
    developing: idDeveloping,
  },
  zh: {
    common: zhCommon,
    sidebar: zhSidebar,
    header: zhHeader,
    image: zhImage,
    announcement: zhAnnouncement,
    language: zhLanguage,
    error: zhError,
    admin: zhAdmin,
    feedback: zhFeedback,
    carousel: zhCarousel,
    developing: zhDeveloping,
  },
  ko: {
    common: koCommon,
    sidebar: koSidebar,
    header: koHeader,
    image: koImage,
    announcement: koAnnouncement,
    language: koLanguage,
    error: koError,
    admin: koAdmin,
    feedback: koFeedback,
    carousel: koCarousel,
    developing: koDeveloping,
  },
  vi: {
    common: viCommon,
    sidebar: viSidebar,
    header: viHeader,
    image: viImage,
    announcement: viAnnouncement,
    language: viLanguage,
    error: viError,
    admin: viAdmin,
    feedback: viFeedback,
    carousel: viCarousel,
    developing: viDeveloping,
  },
  es: {
    common: esCommon,
    sidebar: esSidebar,
    header: esHeader,
    image: esImage,
    announcement: esAnnouncement,
    language: esLanguage,
    error: esError,
    admin: esAdmin,
    feedback: esFeedback,
    carousel: esCarousel,
    developing: esDeveloping,
  },
  fil: {
    common: filCommon,
    sidebar: filSidebar,
    header: filHeader,
    image: filImage,
    announcement: filAnnouncement,
    language: filLanguage,
    error: filError,
    admin: filAdmin,
    feedback: filFeedback,
    carousel: filCarousel,
    developing: filDeveloping,
  },
  hi: {
    common: hiCommon,
    sidebar: hiSidebar,
    header: hiHeader,
    image: hiImage,
    announcement: hiAnnouncement,
    language: hiLanguage,
    error: hiError,
    admin: hiAdmin,
    feedback: hiFeedback,
    carousel: hiCarousel,
    developing: hiDeveloping,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'th', // default language
    fallbackLng: 'en',
    ns: ['common', 'sidebar', 'header', 'image', 'announcement', 'language', 'error', 'admin', 'feedback', 'carousel', 'developing'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
