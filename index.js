const express = require("express");
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const app = express();
app.use(cors());
app.use(express.json());






const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sltxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const ProductCollection = client.db('ElaraProductDB').collection('products')
    const usersCollection = client.db('ElaraProductDB').collection('users')
    const ordersCollection = client.db('ElaraProductDB').collection('orders')
    const cartProducts = client.db('ElaraProductDB').collection('cartProducts')

    // read data from database
    app.get('/products', async (req, res) => {
      const cursor = ProductCollection.find();
      const result = await cursor.toArray();
      res.send(result)
  })

  // reading single product
  app.get('/products/:id', async(req, res) => {
    const id = req.params.id;
    const query = {_id: new ObjectId(id)};
    const result = await ProductCollection.findOne(query);
    res.send(result);
  })


  // Add Products to Database
  app.post('/products', async (req, res) => {
    const newProduct = req.body;
    console.log(newProduct);
    const result = await ProductCollection.insertOne(newProduct)
        res.send(result);
  })


  app.get('/users', async(req, res) => {
    const cursor = usersCollection.find();
    const result = await cursor.toArray();
    res.send(result)
  })

  // for order

  app.get('/orders', async(req, res) => {
    const cursor = ordersCollection.find();
    const result = await cursor.toArray()
    res.send(result);
  })

  app.post('/users', async (req, res) => {
    const newUser = req.body;
    console.log(newUser);
    const result = await usersCollection.insertOne(newUser)
    res.send(result)
  })

  // orders
  app.post('/orders', async(req, res) => {
    const newOrder = req.body;
    console.log(newOrder);
    const result = await ordersCollection.insertOne(newOrder);
    res.send(result)
  })


  // Reading Single Order From DB
  app.get('/orders/:id', async(req, res) => {
    const id = req.params.id;
    const query = {_id: new ObjectId(id)};
    const result = await ordersCollection.findOne(query)
    res.send(result)
})

  // Update orders
  app.put('/orders/:id', async(req, res) => {
    const id = req.params.id;
    const filter = {_id: new ObjectId(id)}
    const options = {upsert : true}
    const updatedOrder = req.body
    const order = {
        $set: {
            name: updatedOrder.name,
            email: updatedOrder.email,
            phone: updatedOrder.phone,
            address: updatedOrder.address,
            note: updatedOrder.category,
            grandTotal: updatedOrder.grandTotal,
            // photo: updatedOrder.photo
        }
    }
    const result = await ordersCollection.updateOne(filter, order, options)
    res.send(result)
})

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('elara-int server is running');
})

app.listen(port, () => {
    console.log('elara-int server is running on port', port);
})