import { ORDER_STATUS, PAYMENT_STATUS, RETURN_STATUS } from "../constants/orderEnums.js";

const localsMiddleware = (req, res, next) => {

  res.locals.userId =
    req.session.userId || null;

  res.locals.adminId =
    req.session.adminId || null;

  res.locals.ORDER_STATUS = ORDER_STATUS;
  res.locals.PAYMENT_STATUS = PAYMENT_STATUS;
  res.locals.RETURN_STATUS = RETURN_STATUS;

  next();

};

export default localsMiddleware;