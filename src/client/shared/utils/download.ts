export const downloadFile = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
};
