const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
require("dotenv").config();

// middleware
app.use(cors());
app.use(express.json());

// Database Connection
const { MongoClient, ServerApiVersion } = require("mongodb");
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

    // service
    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    // pricing
    app.get('/pricing', async(req, res)=>{
        const query = {}
        const cursor = pricingCollection.find(query)
        const pricing = await cursor.toArray()
        res.send(pricing)
    })

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
