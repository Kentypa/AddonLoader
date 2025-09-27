export const convertLfToCrlf = (text: string) => {
  return text.replace(/(?<!\r)\n/g, "\r\n");
};
