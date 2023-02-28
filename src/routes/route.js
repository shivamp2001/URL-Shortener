const express = require("express");
const router = express.Router();
let { createShortUrl, getUrl } = require('../controllers/urlController')


router.post("/url/shorten", createShortUrl)
router.get("/:urlCode", getUrl)


module.exports = router;