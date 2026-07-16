export const adminNotFound = (req, res) => {
  res.status(404).render("admin/error-404");
};

export const userNotFound = (req, res) => {
  res.status(404).render("user/error-404");
};
