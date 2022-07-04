const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();

// middleware
app.use(cors());
app.use(express.json());

// Database Connection

const uri = `mongodb+srv://${process.env.DATABASE_USER}:${process.env.DATABASE_PASSWORD}@cluster0.w5uoe.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    // service collection
    const serviceCollection = client
      .db("igniteVisibility")
      .collection("service");
    // pricing collection
    const pricingCollection = client
      .db("igniteVisibility")
      .collection("pricing");
    // review collection
    const reviewCollection = client
      .db("igniteVisibility")
      .collection("reviews");
    // Order collection
    const orderCollection = client.db('igniteVisibility').collection('order')

    // service
    // get all service
    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    // pricing
    // all pricing data
    app.get("/pricing", async (req, res) => {
      const query = {};
      const cursor = pricingCollection.find(query);
      const pricing = await cursor.toArray();
      res.send(pricing);
    });
    // load single pricing data dynamically
    app.get("/pricing/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id)};
      const singlePricing = await pricingCollection.findOne(query);
      res.send(singlePricing);
    });

    // Orders
    app.post('/order', async (req, res)=>{
        const order = req.body;
        const result = await orderCollection.insertOne(order)
        res.send(result)
    })

    // reviews
    app.get("/reviews", async (req, res) => {
      const query = {};
      const cursor = reviewCollection.find(query);
      const reviews = await cursor.toArray();
      res.send(reviews);
    });


  } finally {
    // await client.close()
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("ignite visibility backend server is ready.");
});

app.listen(port, () => {
  console.log("Listening from port", port);
});
