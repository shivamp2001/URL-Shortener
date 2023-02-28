const express = require('express');
const mongoose = require('mongoose');
const route = require('./routes/route.js')
const app = express();

app.use(express.json());

app.use((err, req, res, next) => {
  if (err.message === "Unexpected end of JSON input") {
    return res
      .status(400)
      .send({
        status: false,
        message: "ERROR Parsing Data, Please Provide a Valid JSON",
      });
  } else {
    next();
  }
});
mongoose.set('strictQuery', true);
mongoose.connect('mongodb+srv://shivamp2001:shivamp2001@mycluster.au9iv5p.mongodb.net/group1Database', { useNewUrlParser: true })
  .then(() => console.log('MongoDb is connected'))
  .catch(err => console.log(err));

app.use('/', route)

app.use((req, res) => {
  res.status(400).send({ status: false, message: 'Invalid URL' })
})

app.listen(3000, () => console.log('Express app is running on port 3000'));