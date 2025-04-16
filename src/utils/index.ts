export const encodeBase64 = (data: any): string => {
  return Buffer.from(JSON.stringify(data)).toString("base64");
};
