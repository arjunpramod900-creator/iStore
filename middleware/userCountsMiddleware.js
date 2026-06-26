import Cart from "../models/Cart.js";
import Wishlist from "../models/Wishlist.js";

const userCountsMiddleware = async (
  req,
  res,
  next
) => {

  try {

    /* Skip admin routes */
    if (req.path.startsWith("/admin")) {
      return next();
    }

    res.locals.cartCount = 0;
    res.locals.wishlistCount = 0;

    if (!req.session.userId) {
      return next();
    }

    const [cart, wishlist] =
      await Promise.all([

        Cart.findOne({
          userId: req.session.userId,
        }).lean(),

        Wishlist.findOne({
          userId: req.session.userId,
        }).lean(),

      ]);

    /* Cart count = total quantity */
    res.locals.cartCount =
      cart?.items?.reduce(
        (sum, item) =>
          sum + item.quantity,
        0
      ) || 0;

    /* Wishlist count = total wishlist items */
    res.locals.wishlistCount =
      wishlist?.items?.length || 0;

    next();

  } catch (error) {

    next(error);

  }

};

export default userCountsMiddleware;