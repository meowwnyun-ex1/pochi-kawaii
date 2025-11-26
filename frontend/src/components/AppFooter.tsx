interface AppFooterProps {
  showCarousel?: boolean;
}

const AppFooter = ({ showCarousel = false }: AppFooterProps) => {
  const copyrightText = '© 2025 Maemi-Chan Medical AI; Developed by Thammaphon Chittasuwanna (SDM)';

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-r from-gray-50 to-sky-50/30 border-t border-gray-200/50 shadow-sm">
      <div className="px-6 py-2">
        <div className="text-center text-xs text-gray-600 font-medium">
          <p>{copyrightText}</p>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;
