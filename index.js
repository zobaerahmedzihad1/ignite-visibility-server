const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// const { query } = require("express");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_PAYMENT_SECRET);

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

// verify jwt
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();

    const serviceCollection = client
      .db("igniteVisibility")
      .collection("service");
    const pricingCollection = client
      .db("igniteVisibility")
      .collection("pricing");
    const reviewCollection = client
      .db("igniteVisibility")
      .collection("reviews");
    const orderCollection = client.db("igniteVisibility").collection("order");
    const userCollection = client.db("igniteVisibility").collection("users");
    const paymentCollection = client
      .db("igniteVisibility")
      .collection("payments");

    // service
    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    // pricing
    app.get("/pricing", async (req, res) => {
      const query = {};
      const cursor = pricingCollection.find(query);
      const pricing = await cursor.toArray();
      res.send(pricing);
    });

    // load single pricing data dynamically
    app.get("/pricing/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const singlePricing = await pricingCollection.findOne(query);
      res.send(singlePricing);
    });

    // Orders
    app.post("/order", async (req, res) => {
      const order = req.body;
      const query = { email: order.email, serviceId: order.serviceId };
      const exists = await orderCollection.findOne(query);
      if (exists) {
        return res.send({ success: false, message: "Already You Have Booked" });
      }
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });

    // filter order by user gmail
    app.get("/order", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const orders = await orderCollection.find(query).toArray();
      res.send(orders);
    });

    // update order (payment)
    app.patch("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const result = await paymentCollection.insertOne(payment);
      const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
      res.send(updatedDoc);
    });

    // delete order
    app.delete("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });

    // all Orders
    app.get("/orders", verifyJWT, async (req, res) => {
      const query = {};
      const orders = await orderCollection.find(query).toArray();
      res.send(orders);
    });

    // payment
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const service = req.body;
      const price = service.currentPrice;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    // payment history
    app.get("/payment-history/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const payments = await paymentCollection.find(filter).toArray();
      res.send(payments);
    });

    app.get("/dashboard/payment/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.findOne(query);
      res.send(result);
    });

    // reviews
    app.get("/reviews", async (req, res) => {
      const query = {};
      const cursor = reviewCollection.find(query);
      const reviews = await cursor.toArray();
      res.send(reviews);
    });
    // post review
    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });
    // review count
    app.get("/review-count", async (req, res) => {
      const reviewCount = await reviewCollection.estimatedDocumentCount();
      res.send({ count: reviewCount });
    });
    // manage review
    app.get("/manage-reviews", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const query = {};
      const cursor = reviewCollection.find(query);
      let reviews;
      if (page || size) {
        reviews = await cursor
          .skip(page * size)
          .limit(size)
          .toArray();
      } else {
        reviews = await cursor.toArray();
      }
      res.send(reviews);
    });
    // delete review
    app.delete("/review-delete/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await reviewCollection.deleteOne(query);
      res.send(result);
    });

    // users
    app.get("/users", verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    // make admin
    app.put("/user/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      // console.log(email, "email");
      const filter = { email: email };
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        const updateDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        // console.log(result, "result");
        res.send(result);
      } else {
        res.status(403).send({ message: "Forbidden access." });
      }
    });

    // remove admin access
    app.put("/user/remove-admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      const filter = { email: email };
      if (requesterAccount.role === "admin") {
        const options = { upsert: true };
        const updateDoc = {
          $set: {
            role: " ",
          },
        };
        const result = await userCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.send(result);
      } else {
        res.status(403).send({ message: "Forbidden access." });
      }
    });

    app.get("/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user?.role === "admin";
      res.send({ admin: isAdmin });
    });

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const displayName = user.name;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          displayName: displayName,
        },
      };

      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
      );
      res.send({ result, token });
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
