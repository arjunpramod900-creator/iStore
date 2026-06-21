const localsMiddleware = (req, res, next) => {

  res.locals.userId =
    req.session.userId || null;

  res.locals.adminId =
    req.session.adminId || null;

  next();

};

export default localsMiddleware;