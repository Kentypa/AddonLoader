import React from "react";

interface ErrorMessageProps {
  error: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ error }) => {
  return (
    <div className="p-3 bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-300 rounded-xl mb-4 shadow">
      {error}
    </div>
  );
};
