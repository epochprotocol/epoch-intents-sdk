export const encodeBase64 = (data: any): string => {
  return btoa(JSON.stringify(data));
};
