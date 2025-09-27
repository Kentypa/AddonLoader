import { useState, useRef, useEffect } from "react";
import { useLanguage } from "../../hooks/useLanguage";

export function LanguageSelector() {
  const {
    currentLanguage,
    currentLanguageInfo,
    supportedLanguages,
    changeLanguage,
  } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLanguageSelect = (langCode: string) => {
    changeLanguage(langCode);
    setIsOpen(false);
  };

  const toggleDropdown = () => setIsOpen(!isOpen);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="flex items-center gap-2 px-4 py-2 rounded-xl shadow bg-blue-200 dark:bg-blue-700 text-gray-800 dark:text-gray-200 hover:bg-blue-300 dark:hover:bg-blue-600 transition-all duration-200 border border-blue-300 dark:border-blue-600 min-w-fit max-w-full justify-between"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{currentLanguageInfo.flag}</span>
          <span className="font-medium text-sm hidden sm:block">
            {currentLanguageInfo.name}
          </span>
        </div>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden animate-fadeIn min-w-max">
          <ul className="py-2" role="listbox">
            {supportedLanguages.map((lang) => (
              <li
                key={lang.code}
                role="option"
                aria-selected={currentLanguage === lang.code}
              >
                <button
                  onClick={() => handleLanguageSelect(lang.code)}
                  className={`flex items-center gap-3 w-full px-4 py-3 text-left transition-all duration-150 ${
                    currentLanguage === lang.code
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <span className="text-xl">{lang.flag}</span>
                  <div className="flex-1">
                    <div className="font-medium text-sm hidden sm:block whitespace-nowrap">
                      {lang.name}
                    </div>
                    <div className="text-xs opacity-70">
                      {lang.code.toUpperCase()}
                    </div>
                  </div>
                  {currentLanguage === lang.code && (
                    <svg
                      className="w-4 h-4 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
