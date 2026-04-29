const adminNoCache = (req, res, next) => {

/* Strong cache control */

res.setHeader(
"Cache-Control",
"no-store, no-cache, must-revalidate, proxy-revalidate, private"
)

res.setHeader(
"Pragma",
"no-cache"
)

res.setHeader(
"Expires",
"0"
)

res.setHeader(
"Surrogate-Control",
"no-store"
)

next()

}

export default adminNoCache