const express = require('express')
const app = express()
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
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
app.use('/uploads',express.static('uploads'))
app.use(cookieParser())
//database cunnection
const client = new MongoClient(`${process.env.DB_URI}`, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
// verify token 
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
      return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCES_TOKEN_SECRET, (err, decoded) => {
      if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
      }
      req.user = decoded;
      console.log(req.user)
      next();
  })
}
// database tables
const Users = client.db('FoodWave').collection('Users');
// upload file 
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage });
//queary
async function run() {
  try {
    client.connect();
    app.post('/jwt',(req,res)=>{
      const userInfo = req.body
      const token = jwt.sign(userInfo, process.env.ACCES_TOKEN_SECRET,{expiresIn:'1h'})
      res.cookie('token',token,{
        httpOnly:true,
        secure:true,
        sameSite: 'none'
      })
      .send({succes: true})
    })
    app.post('/clearjwt',async(req,res)=>{
      res.clearCookie('tocken',{maxAge:0})
      .send({succes: true})
    })
    app.post('/user', upload.single('file'), async(req,res)=>{
      const filename = `${req.file.destination}${req.file.filename}`
      const {email}=req.body
      const data = {
        filename,
        email
      }
      const location = req.get('host')
      const insertdata = await Users.insertOne(data)
      const {insertedId}=insertdata
      const queary = {_id : insertedId}
      const result = await Users.findOne(queary)
      const modifiedData = {
        ...result,
        filename: `http://${location}/${result.filename}`,
      };
      res.send(modifiedData)
    })

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