import Review from "../../models/Review.js";

export const addReview = async (req, res) => {
  try {
    const userId = req.session.userId;

    const { productId, variantId, rating, comment } = req.body;

    /* =====================================
           UPDATE IF REVIEW EXISTS
        ===================================== */

    const review = await Review.findOneAndUpdate(
      {
        userId,

        productId,

        isDeleted: false,
      },

      {
        userId,

        productId,

        variantId,

        rating,

        comment,
      },

      {
        returnDocument: "after",

        upsert: true,
      },
    );

    return res.status(200).json({
      success: true,

      message: "Review saved successfully",

      review,
    });
  } catch (error) {
    console.log("ADD REVIEW ERROR:", error);

    return res.status(500).json({
      success: false,

      message: "Something went wrong",
    });
  }
};
