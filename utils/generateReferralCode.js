const generateReferralCode = (name = "") => {
  const prefix = name
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 3)
    .toUpperCase();

  const random = Math.random().toString(36).substring(2, 8).toUpperCase();

  return `${prefix}${random}`;
};

export default generateReferralCode;
