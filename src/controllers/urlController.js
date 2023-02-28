const urlModel = require('../models/urlModel')
const shortId = require('shortid')
const validURL = require('valid-url')
const axios = require("axios")
const redis = require("redis");

const { promisify } = require("util");
// ==> connect to redis
const redisClient = redis.createClient(
    10257,
    "redis-10257.c239.us-east-1-2.ec2.cloud.redislabs.com",
    { no_ready_check: true }
);
redisClient.auth("cShHMPK722O7fmMFpozvrCwn7GCxx5mR", function (err) {
    if (err) throw err;
});

redisClient.on("connect", async function () {
    console.log("Connected to Redis..");
});
const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);


// ==> create shorturl 
exports.createShortUrl = async function (req, res) {
    try {
        let longUrl = req.body.longUrl
       
        if (!longUrl) return res.status(400).json({ status: false, message: "Please provide longUrl" })
        if (!validURL.isUri(longUrl)) return res.status(400).json({ status: false, message: `This url ${longUrl} is not valid` })

        // ==> fetching data from cache
        let fromCacheData = await GET_ASYNC(`${longUrl}`)
        if (fromCacheData) {
            fromCacheData = JSON.parse(fromCacheData)
            return res.status(200).json({ status: true, message: "short url is already present/from cache", data: fromCacheData })
        }
        // ==> Axios call
        let option = {    
            method: 'get',
            url: longUrl
        }
        let validateUrl = await axios(option)
            .then(() => longUrl)
            .catch(() => null)

        if (!validateUrl) return res.status(400).json({ status: false, message: `This Link: ${longUrl} is not Valid URL.` })
      
            // ==> fetching data from database
            let findUrl = await urlModel.findOne({ longUrl: longUrl }).select({ _id: 0, longUrl: 1, shortUrl: 1, urlCode: 1 })
            await SET_ASYNC(`${longUrl}`, JSON.stringify(findUrl), "EX", 20)
            if (findUrl) return res.status(200).json({ status: true, message: "short url is already present/from database", data: findUrl })
        
        // ==> create new shorturl
        let baseUrl = "http://localhost:3000/"
        let shortUrl = shortId.generate().toLowerCase()
        let createShortUrl = baseUrl + shortUrl
        let obj = {
            longUrl: longUrl,
            shortUrl: createShortUrl,
            urlCode: shortUrl
        }
        await urlModel.create(obj)
        await SET_ASYNC(`${longUrl}`, JSON.stringify(obj), "EX", 20)
        return res.status(201).json({ status: true, data: obj })
    }
    catch (error) {
        return res.status(500).json({ status: false, message: error.message })
    }
}

// ==> Redirect to the original URL
exports.getUrl = async function (req, res) {
    try {
        let urlCode = req.params.urlCode
        let fromCacheData = await GET_ASYNC(`${urlCode}`)
        if (fromCacheData) {
            fromCacheData = JSON.parse(fromCacheData)
            return res.status(302).redirect(fromCacheData.longUrl)
        } else {
            let urlDetails = await urlModel.findOne({ urlCode: urlCode })
            if (!urlDetails) return res.status(404).json({ status: false, message: `This url ${urlCode} not found` })
            await SET_ASYNC(`${urlCode}`, JSON.stringify(urlDetails), "EX", 20)
            return res.status(302).redirect(urlDetails.longUrl)
        }
    }
    catch (error) {
        return res.status(500).json({ status: false, message: error.message })
    }
}


