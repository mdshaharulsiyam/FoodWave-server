const express = require('express')
const app = express()
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
require('dotenv').config()
const port = process.env.PORT || 5000
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const multer = require('multer')
//middleware
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json())
app.use('/uploads', express.static('uploads'))
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
const Foods = client.db('FoodWave').collection('Foods');
const Foodsrequest = client.db('FoodWave').collection('Foodsrequest');
const Feedback = client.db('FoodWave').collection('Feedback');
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
    app.post('/jwt', (req, res) => {
      const userInfo = req.body
      const token = jwt.sign(userInfo, process.env.ACCES_TOKEN_SECRET, { expiresIn: '1h' })
      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      })
        .send({ succes: true })
    })
    app.post('/clearjwt', async (req, res) => {
      res.clearCookie('tocken', { maxAge: 0 })
        .send({ succes: true })
    })
    app.post('/user', upload.single('file'), async (req, res) => {
      const filename = `${req.file.destination}${req.file.filename}`
      const { email } = req.body
      const data = {
        filename,
        email
      }
      const location = req.get('host')
      const insertdata = await Users.insertOne(data)
      const { insertedId } = insertdata
      const queary = { _id: insertedId }
      const result = await Users.findOne(queary)
      const modifiedData = {
        ...result,
        filename: `http://${location}/${result.filename}`,
      };
      res.send(modifiedData)
    })
    app.post('/foods', verifyToken, upload.single('file'), async (req, res) => {
      const foodimage = `${req.file.destination}${req.file.filename}`
      const { FoodName, location, Quantity, notes, username, useremail, status, userephoto, date } = req.body
      if (!req.user.email === useremail) {
        return res.status(403).send({ message: 'forbidden access' })
      } else {
        const modifiedData = { FoodName, location, Quantity, notes, username, useremail, status, userephoto, foodimage, date }
        const result = await Foods.insertOne(modifiedData)
        res.send(result)
      }
    })
    app.delete('/foods', verifyToken, async (req, res) => {
      const { id } = req.query;
      const queary = { _id: new ObjectId(id) }
      const query = { foodid: id }
      const result = await Foods.deleteOne(queary)
      const deletefromrequest = await Foodsrequest.deleteOne(query)
      res.send(result)

    })
    app.put('/foods', verifyToken, upload.single('file'), async (req, res) => {
      const { id } = req.query;
      const updateData = req.body;
      const foodimage = req.file ? `${req.file.destination}${req.file.filename}` : null;
      if (req.user.email !== updateData.useremail) {
        return res.status(403).send({ message: 'Forbidden access' });
      }
      const queary = { _id: new ObjectId(id) };
      const update = {
        $set: {
          ...updateData,
          foodimage: foodimage || updateData.foodimage,
        },
      };
      const result = await Foods.updateOne(queary, update);
      res.send(result)
    })

    app.post('/foodrequest', verifyToken, async (req, res) => {
      const data = req.body
      const result = await Foodsrequest.insertOne(data)
      res.send(result)
    })
    app.post('/feedback', verifyToken, async (req, res) => {
      const data = req.body
      const result = await Feedback.insertOne(data)
      res.send(result)
    })
    app.delete('/myrequest', verifyToken, async (req, res) => {
      const { id, email } = req.query;
      console.log(req.query)
      const query = { _id: new ObjectId(id), requestUser: email }
      if (!req.user.email === email) {
        return res.status(403).send({ message: 'forbidden access' })
      } else {
        const result = await Foodsrequest.deleteOne(query)
        return res.send(result)

      }
    })
    app.delete('/foodrequest', verifyToken, async (req, res) => {
      const { foodId, email, requester } = req.query;
      if (!req.user.email === email) {
        return res.status(403).send({ message: 'forbidden access' })
      } else {
        const update = {
          $set: {
            status: 'Deliverd'
          },
        };
        const update1 = {
          $set: {
            status: 'Deliverd'
          },
        };
        const query = { useremail: email, foodid: foodId, requestUser: requester }
        const updatequery = { _id: new ObjectId(foodId) }
        const updatequery1 = { foodid: foodId, }
        const updates = await Foods.updateOne(updatequery, update)
        const updates1 = await Foodsrequest.updateOne(updatequery1, update1)
        const result = await Foodsrequest.deleteOne(query)
        return res.send(result)
      }
    })
    app.get('/foodrequest', verifyToken, async (req, res) => {
      const { id, email } = req.query;
      if (!req.user.email === email) {
        return res.status(403).send({ message: 'forbidden access' })
      } else {
        const query = { useremail: email, foodid: id }
        const result = await Foodsrequest.find(query).toArray()
        const modifiedData = result.map(item => ({
          ...item,
          foodimage: item.foodimage.includes('http') ? item.foodimage : `http://${location}/${item.foodimage}`,
        }));
        return res.send(modifiedData)
      }
    })
    app.get('/requestfood', verifyToken, async (req, res) => {
      const { email } = req.query;
      if (!req.user.email === email) {
        return res.status(403).send({ message: 'forbidden access' })
      } else {
        const query = { useremail: email, }
        const result = await Foodsrequest.find(query).toArray()
        const modifiedData = result.map(item => ({
          ...item,
          foodimage: item.foodimage.includes('http') ? item.foodimage : `http://${location}/${item.foodimage}`,
        }));
        return res.send(modifiedData)
      }
    })
    app.get('/managefood', verifyToken, async (req, res) => {
      const location = req.get('host')
      const { id, email } = req.query;
      if (!req.user.email === email) {
        return res.status(403).send({ message: 'forbidden access' })
      } else {
        const query = { useremail: email, _id: new ObjectId(id) }
        const result = await Foods.findOne(query)
        const modifiedData = {
          ...result,
          foodimage: result.foodimage.includes('http') ? result.foodimage : `http://${location}/${result.foodimage}`,
        };
        return res.send(modifiedData)
      }
    })


    app.get('/myfood', verifyToken, async (req, res) => {
      const location = req.get('host')
      const { email } = req.query;
      if (!req.user.email === email) {
        return res.status(403).send({ message: 'forbidden access' })
      } else {
        const query = { useremail: email }
        const result = await Foods.find(query).toArray()
        const modifiedData = result.map(item => ({
          ...item,
          foodimage: item.foodimage.includes('http') ? item.foodimage : `http://${location}/${item.foodimage}`,
        }));
        return res.send(modifiedData)
      }
    })


    app.get('/foods', async (req, res) => {
      const { shortitem, shorby, search } = req.query;
      const currentDate = new Date();
      const year = currentDate.getUTCFullYear();
      const month = (currentDate.getUTCMonth() + 1).toString().padStart(2, "0");
      const day = currentDate.getUTCDate().toString().padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;
      let queary = { "date": { $gte: formattedDate } }
      if (search.length > 0) {
        queary = {
          "date": { $gte: formattedDate },
          "FoodName": { $regex: new RegExp(search, 'i') }
        }
      }
      const location = req.get('host');
      // console.log(shortitem, shorby, req.query)
      if (shortitem === 'none') {
        const result = await Foods.find(queary).toArray();
        const modifiedData = result.map(item => ({
          ...item,
          foodimage: item.foodimage.includes('http') ? item.foodimage : `http://${location}/${item.foodimage}`,
        }));
        res.send(modifiedData)
      }
      if (shortitem === 'date') {
        //sort by expierdsoon
        if (shorby === 'expierdsoon' || shorby === 'none') {
          const result = await Foods.find(queary).sort({ "date": 1 }).toArray();
          const modifiedData = result.map(item => ({
            ...item,
            foodimage: item.foodimage.includes('http') ? item.foodimage : `http://${location}/${item.foodimage}`,
          }));
          return res.send(modifiedData)
        } else {
          //  sort by expiard latter
          const result = await Foods.find(queary).sort({ "date": -1 }).toArray();
          const modifiedData = result.map(item => ({
            ...item,
            foodimage: item.foodimage.includes('http') ? item.foodimage : `http://${location}/${item.foodimage}`,
          }));
          return res.send(modifiedData)
        }
      }
      if (shortitem === 'quantity') {
        // sort by quantity largest
        if (shorby === 'largest' || shorby === 'none') {
          const result = await Foods.find(queary).sort({ "Quantity": -1 }).toArray();
          const modifiedData = result.map(item => ({
            ...item,
            foodimage: item.foodimage.includes('http') ? item.foodimage : `http://${location}/${item.foodimage}`,
          }));
          return res.send(modifiedData)
        } else {
          console.log('quantity smalest')
          // sort by quantity smalest
          const result = await Foods.find(queary).sort({ "Quantity": 1 }).toArray();
          const modifiedData = result.map(item => ({
            ...item,
            foodimage: item.foodimage.includes('http') ? item.foodimage : `http://${location}/${item.foodimage}`,
          }));
          return res.send(modifiedData)
        }
      }
    })
    app.get('/feturedfood', async (req, res) => {
      const location = req.get('host')
      const currentDate = new Date();
      const year = currentDate.getUTCFullYear();
      const month = (currentDate.getUTCMonth() + 1).toString().padStart(2, "0");
      const day = currentDate.getUTCDate().toString().padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;
      const queary = { "date": { $gte: formattedDate } }
      const result = await Foods.find(queary).sort({ "Quantity": -1 }).limit(6).toArray();
      const modifiedData = result.map(item => ({
        ...item,
        foodimage: item.foodimage.includes('http') ? item.foodimage : `http://${location}/${item.foodimage}`,
      }));
      res.send(modifiedData)
    })
    app.get('/singlefood', async (req, res) => {
      const location = req.get('host')
      const { id } = req.query;
      const queary = { _id: new ObjectId(id) }
      const result = await Foods.findOne(queary);
      const modifiedData = {
        ...result,
        foodimage: result.foodimage.includes('http') ? result.foodimage : `http://${location}/${result.foodimage}`,
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
app.listen(port, () => {
  console.log(`server is runing on port ${port}`)
})
run().catch(console.dir);