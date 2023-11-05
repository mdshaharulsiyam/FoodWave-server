const express = require('express')
const app = express()
require('dotenv').config()
const port = process.env.PORT || 5000
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const multer  = require('multer')
//middleware
app.use(cors({
  origin:['http://localhost:5173'],
  credentials:true
}));
app.use(express.json())

//database cunnection
const client = new MongoClient(`${process.env.DB_URI}`, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
// database tables
const Users = client.db('FoodWave').collection('Users');
// upload file 
const upload = multer({ storage });
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
//queary
async function run() {
  try {
    client.connect();


    //test database cunnecton
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
  }
}


app.get('/', (req, res) => {
    res.send('FoodWave server is running')
  })
  app.listen(port,()=>{
    console.log(`server is runing on port ${port}`)
  })
  run().catch(console.dir);