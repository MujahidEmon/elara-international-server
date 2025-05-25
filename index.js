const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: ["https://elara-international.web.app", "http://localhost:5173", "https://elara-int-admin.web.app"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sltxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    const ProductCollection = client
      .db("ElaraProductDB")
      .collection("products");
    const usersCollection = client.db("ElaraProductDB").collection("users");
    const ordersCollection = client.db("ElaraProductDB").collection("orders");
    const cartProducts = client.db("ElaraProductDB").collection("cartProducts");

    // Get all products
    app.get("/products", async (req, res) => {
      try {
        const category = req.query.category;
        const query = category ? { category } : {}; // short form
        const products = await ProductCollection.find(query).toArray();
        res.status(200).json(products);
      } catch (error) {
        console.error("Failed to fetch products:", error.message);
        res.status(500).json({ message: "Server error. Try again later." });
      }
    });

    app.get("/categories", async (req, res) => {
      try {
        const categories = await ProductCollection.distinct("category");
        res.send(categories);
      } catch (error) {
        console.error("Failed to get categories", error);
        res.status(500).send({ error: "Failed to fetch categories" });
      }
    });

    // Get cart products by user email
    app.get("/cartProducts/:email", async (req, res) => {
      const email = req.params.email;
      if (!email) return res.status(400).send({ error: "Email required" });

      try {
        const cartItems = await cartProducts
          .find({ email })
          .sort({ addedAt: -1 })
          .toArray();
        res.send(cartItems);
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Server error" });
      }
    });

    // Get single product by id
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await ProductCollection.findOne(query);
      res.send(result);
    });

    // Add new product to products collection
    app.post("/products", async (req, res) => {
      const newProduct = req.body;
      console.log(newProduct);
      const result = await ProductCollection.insertOne(newProduct);
      res.send(result);
    });

    // ======= Fixed Cart Add Endpoint =======
    app.post("/cartProducts", async (req, res) => {
      const { email, productId } = req.body;

      if (!email || !productId) {
        return res
          .status(400)
          .send({ error: "Email and productId are required" });
      }

      try {
        // Find product details for given productId
        const product = await ProductCollection.findOne({
          _id: new ObjectId(productId),
        });
        if (!product) {
          return res.status(404).send({ error: "Product not found" });
        }

        // Check if this product is already in user's cart
        const existingCartItem = await cartProducts.findOne({
          email,
          productId: new ObjectId(productId),
        });

        if (existingCartItem) {
          // If exists, increment quantity by 1
          await cartProducts.updateOne(
            { _id: existingCartItem._id },
            { $inc: { quantity: 1 } }
          );
          return res.send({ message: "Product quantity increased in cart" });
        } else {
          // Else insert new cart item with quantity 1
          const newCartItem = {
            email,
            productId: new ObjectId(productId),
            productName: product.productName,
            price: product.price,
            image: product.image,
            quantity: 1,
            addedAt: new Date(),
          };

          const insertResult = await cartProducts.insertOne(newCartItem);
          return res.send({
            message: "Product added to cart",
            insertedId: insertResult.insertedId,
          });
        }
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Server error" });
      }
    });

    // Bulk add cart products (optional, you can remove or keep)
    app.post("/cartProducts/bulk", async (req, res) => {
      const { email, products } = req.body;

      if (!email || !Array.isArray(products)) {
        return res.status(400).send({ error: "Invalid input" });
      }

      try {
        const results = [];

        for (const prod of products) {
          const productId = prod._id || prod.productId;
          const product = await ProductCollection.findOne({
            _id: new ObjectId(productId),
          });
          if (!product) continue;

          const existingCartItem = await cartProducts.findOne({
            email,
            productId: new ObjectId(productId),
          });

          if (existingCartItem) {
            await cartProducts.updateOne(
              { _id: existingCartItem._id },
              { $inc: { quantity: 1 } }
            );
            results.push({ productId, status: "quantity incremented" });
          } else {
            const newCartItem = {
              email,
              productId: new ObjectId(productId),
              productName: product.productName,
              price: product.price,
              image: product.image,
              quantity: 1,
              addedAt: new Date(),
            };
            await cartProducts.insertOne(newCartItem);
            results.push({ productId, status: "added" });
          }
        }

        res.send({ message: "Bulk add processed", results });
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Server error" });
      }
    });

    // Users endpoints
    app.get("/users", async (req, res) => {
      const cursor = usersCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const newUser = req.body;
      console.log(newUser);
      const result = await usersCollection.insertOne(newUser);
      res.send(result);
    });

    // Orders endpoints
    app.get("/orders", async (req, res) => {
      let query = {};
      if (req.query.status) {
        query = { status: req.query.status };
      }
      const cursor = ordersCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.put("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedOrder = req.body;
      const order = {
        $set: {
          name: updatedOrder.name,
          email: updatedOrder.email,
          phone: updatedOrder.phone,
          address: updatedOrder.address,
          note: updatedOrder.note,
          status: updatedOrder.status,
        },
      };
      const result = await ordersCollection.updateOne(filter, order, options);
      res.send(result);
    });

    // delete order
    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await ordersCollection.deleteOne(query);
      res.send(result);
    });

    // Increase quantity
    app.patch("/cartProducts/increase/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const result = await cartProducts.updateOne(
          { _id: new ObjectId(id) },
          { $inc: { quantity: 1 } }
        );
        res.send({ message: "Quantity increased", result });
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Failed to increase quantity" });
      }
    });

    // Decrease quantity or remove if 1
    app.patch("/cartProducts/decrease/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const item = await cartProducts.findOne({ _id: new ObjectId(id) });

        if (!item) {
          return res.status(404).send({ error: "Cart item not found" });
        }

        if (item.quantity > 1) {
          const result = await cartProducts.updateOne(
            { _id: new ObjectId(id) },
            { $inc: { quantity: -1 } }
          );
          res.send({ message: "Quantity decreased", result });
        } else {
          await cartProducts.deleteOne({ _id: new ObjectId(id) });
          res.send({ message: "Item removed from cart" });
        }
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Failed to decrease quantity" });
      }
    });

    // Delete cart item by _id
    app.delete("/cartProducts/:id", async (req, res) => {
      const id = req.params.id;

      try {
        const result = await cartProducts.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 1) {
          res.send({ message: "Item deleted successfully" });
        } else {
          res.status(404).send({ error: "Item not found" });
        }
      } catch (error) {
        console.error("Delete error:", error);
        res.status(500).send({ error: "Server error" });
      }
    });

    // Clear all cart products for a user after placing an order
    app.delete("/cartProducts/clear/:email", async (req, res) => {
      const email = req.params.email;

      if (!email) {
        return res.status(400).send({ error: "Email is required" });
      }

      try {
        // Delete all cart items that match the email
        const result = await cartProducts.deleteMany({ email });

        res.send({
          success: true,
          message: "User's cart cleared successfully",
          deletedCount: result.deletedCount,
        });
      } catch (error) {
        console.error("Error clearing cart:", error);
        res.status(500).send({ error: "Server error while clearing cart" });
      }
    });

    app.post("/orders", async (req, res) => {
      const newOrder = req.body;
      console.log(newOrder);
      const result = await ordersCollection.insertOne(newOrder);
      res.send(result);
    });

    app.get("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await ordersCollection.findOne(query);
      res.send(result);
    });

    app.put("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedOrder = req.body;
      const order = {
        $set: {
          name: updatedOrder.name,
          email: updatedOrder.email,
          phone: updatedOrder.phone,
          address: updatedOrder.address,
          note: updatedOrder.category,
          grandTotal: updatedOrder.grandTotal,
          // photo: updatedOrder.photo
        },
      };
      const result = await ordersCollection.updateOne(filter, order, options);
      res.send(result);
    });

    // index.js or server.js
    app.get("/ping", (req, res) => {
      res.status(200).json({ message: "Server is awake!" });
    });
  } finally {
    // Do not close client here because app is running continuously
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("elara-int server is running");
});

app.listen(port, () => {
  console.log(`elara-int server is running on port ${port}`);
});
