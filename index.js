const express = require("express");
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');


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


    // read data from database
    app.get('/products', async (req, res) => {
      const cursor = ProductCollection.find();
      const result = await cursor.toArray();
      res.send(result)
  })


  // Add Products to Database
  app.post('/products', async (req, res) => {
    const newProduct = req.body;
    console.log(newProduct);
    const result = await ProductCollection.insertOne(newProduct)
        res.send(result);
  })

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('elara-int server is runnig');
})

app.listen(port, () => {
    console.log('elara-int server is running on port', port);
})