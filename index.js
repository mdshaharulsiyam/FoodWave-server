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
  origin: ['https://imaginative-ganache-4b307c.netlify.app', 'http://localhost:5173'],
  credentials: true,
  optionSuccessStatus: 200
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
    next();
  })
}

// database tables

const Users = client.db('FoodWave').collection('Users');
const Foods = client.db('FoodWave').collection('Foods');
const Foodsrequest = client.db('FoodWave').collection('Foodsrequest');
const Feedback = client.db('FoodWave').collection('Feedback');

// upload file 


//queary

async function run() {
  try {
    // jwt 
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
    // cleaer jwt
    app.post('/clearjwt', async (req, res) => {
      res.clearCookie('tocken', { maxAge: 0 })
        .send({ succes: true })
    })


    // insaert food data

    app.post('/foods', verifyToken, async (req, res) => {
      const { useremail } = req.query
      const data = req.body
      if (!req.user.email === useremail) {
        return res.status(403).send({ message: 'forbidden access' })
      } else {
        const result = await Foods.insertOne(data)
        res.send(result)
      }
    })

    // delete food data 

    app.delete('/foods', verifyToken, async (req, res) => {
      const { id } = req.query;
      const queary = { _id: new ObjectId(id) }
      const query = { foodid: id }
      const result = await Foods.deleteOne(queary)
      const deletefromrequest = await Foodsrequest.deleteOne(query)
      res.send(result)

    })

    //update food data

    app.put('/foods', verifyToken, async (req, res) => {
      const { id } = req.query;
      const updateData = req.body;
      if (req.user.email !== updateData.useremail) {
        return res.status(403).send({ message: 'Forbidden access' });
      }
      const queary = { _id: new ObjectId(id) };
      const update = {
        $set: {
          ...updateData,
        },
      };
      const result = await Foods.updateOne(queary, update);
      res.send(result)
    })

    // insert food request

    app.post('/foodrequest', verifyToken, async (req, res) => {
      const data = req.body
      const {requestUser,foodid}=data
      const query = { requestUser: requestUser, foodid : foodid}
      const getfood = await Foodsrequest.find(query).toArray()
      if (getfood.length >0) {
        return  res.send({massage : 'food already aded'})
      }

      const result = await Foodsrequest.insertOne(data)
      res.send(result)
    })
    app.post('/feedback', verifyToken, async (req, res) => {
      const data = req.body
      const result = await Feedback.insertOne(data)
      res.send(result)
    })
    app.get('/feedback', async (req, res) => {
      const result = await Feedback.find({}).sort({ _id: -1 }).toArray();
      res.send(result)
    })

    //cancel food request

    app.delete('/myrequest', verifyToken, async (req, res) => {
      const { id, email } = req.query;
      const query = { _id: new ObjectId(id), requestUser: email }
      if (!req.user.email === email) {
        return res.status(403).send({ message: 'forbidden access' })
      } else {
        const result = await Foodsrequest.deleteOne(query)
        return res.send(result)

      }
    })

    // deliverd food 

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
        const result = await Foodsrequest.deleteOne(query)
        if (result) {
          const updatequery = { _id: new ObjectId(foodId) }
          const updatequery1 = { foodid: foodId, }
          const updates = await Foods.updateOne(updatequery, update)
          const updates1 = await Foodsrequest.updateOne(updatequery1, update1)
        }
        return res.send(result)
      }
    })

    // get food request for singe food

    app.get('/foodrequest', verifyToken, async (req, res) => {
      const { id, email } = req.query;
      if (!req.user.email === email) {
        return res.status(403).send({ message: 'forbidden access' })
      } else {
        const query = { useremail: email, foodid: id }
        const result = await Foodsrequest.find(query).toArray()
        return res.send(result)
      }
    })

    //get my food request

    app.get('/requestfood', verifyToken, async (req, res) => {
      const { email } = req.query;
      if (!req.user.email === email) {
        return res.status(403).send({ message: 'forbidden access' })
      } else {
        const query = { requestUser: email, }
        const result = await Foodsrequest.find(query).toArray()
        return res.send(result)
      }
    })

    // get my added single food

    app.get('/managefood', verifyToken, async (req, res) => {
      const { id, email } = req.query;
      if (!req.user.email === email) {
        return res.status(403).send({ message: 'forbidden access' })
      } else {
        const query = { useremail: email, _id: new ObjectId(id) }
        const result = await Foods.findOne(query)
        return res.send(result)
      }
    })

    // get my all added foods

    app.get('/myfood', verifyToken, async (req, res) => {
      const { email } = req.query;
      if (!req.user.email === email) {
        return res.status(403).send({ message: 'forbidden access' })
      } else {
        const query = { useremail: email }
        const result = await Foods.find(query).toArray()
        return res.send(result)
      }
    })

    //get totat count of food
    app.get('/foodcount', async (req, res) => {
      const foodCount = await Foods.countDocuments()
      res.json(foodCount)
    })

    // get all foods

    app.get('/foods', async (req, res) => {
      const { shortitem, shorby, search, page, limit } = req.query;
      const limitint = Number(limit)
      const pageint = Number(page)
      // const currentDate = new Date();
      // const year = currentDate.getUTCFullYear();
      // const month = (currentDate.getUTCMonth() + 1).toString().padStart(2, "0");
      // const day = currentDate.getUTCDate().toString().padStart(2, "0");
      // const formattedDate = `${year}-${month}-${day}`;
      let queary = {}
      // "date": { $gte: formattedDate }
      if (search?.length > 0) {
        queary = {
          // "date": { $gte: formattedDate },
          "FoodName": { $regex: new RegExp(search, 'i') }
        }
      }
      if (shortitem === 'none') {
        const result = await Foods.find(queary).skip(pageint * limitint).limit(limitint).toArray();
        res.send(result)
      }
      if (shortitem === 'date') {
        //sort by expierdsoon
        if (shorby === 'expierdsoon' || shorby === 'none') {
          const result = await Foods.find(queary).sort({ "date": 1 }).skip(pageint * limitint).limit(limitint).toArray();
          return res.send(result)
        } else {
          //  sort by expiard latter
          const result = await Foods.find(queary).sort({ "date": -1 }).skip(pageint * limitint).limit(limitint).toArray();
          return res.send(result)
        }
      }
      if (shortitem === 'quantity') {
        // sort by quantity largest
        if (shorby === 'largest' || shorby === 'none') {
          const result = await Foods.find(queary).sort({ "Quantity": -1 }).skip(pageint * limitint).limit(limitint).toArray();
          return res.send(result)
        } else {
          // sort by quantity smalest
          const result = await Foods.find(queary).sort({ "Quantity": 1 }).skip(pageint * limitint).limit(limitint).toArray();
          return res.send(result)
        }
      }
    })

    // get fetured food

    app.get('/feturedfood', async (req, res) => {
      // const currentDate = new Date();
      // const year = currentDate.getUTCFullYear();
      // const month = (currentDate.getUTCMonth() + 1).toString().padStart(2, "0");
      // const day = currentDate.getUTCDate().toString().padStart(2, "0");
      // const formattedDate = `${year}-${month}-${day}`;
      // const queary = { "date": { $gte: formattedDate } }
      const result = await Foods.find({}).sort({ "Quantity": -1 }).limit(6).toArray();
      res.send(result)
    })
    app.get('/singlefood', async (req, res) => {
      const { id } = req.query;
      const queary = { _id: new ObjectId(id) }
      const result = await Foods.findOne(queary);
      res.send(result)
    })


  } finally {
  }
}

run().catch(console.dir);
app.get('/', (req, res) => {
  res.send('FoodWave server is running')
})
app.listen(port, () => {
  console.log(`server is runing on port ${port}`)
})