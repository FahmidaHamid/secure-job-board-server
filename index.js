const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const admin = require("firebase-admin");

var serviceAccount = require("./career-bridge-authentication-firebase-adminsdk-fbsvc-7180bc9608");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWD}@cluster0.0laypje.mongodb.net/?appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
//const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.0laypje.mongodb.net/?appName=Cluster0`;
const app = express();
//middleware
app.use(
  cors({
    credentials: true, // Allow sending cookies/authorization headers
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Programming Hero Assignment 10");
});

const verifyFireBaseToken = async (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = req.headers.authorization.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  // verify token
  try {
    const userInfo = await admin.auth().verifyIdToken(token);
    req.token_email = userInfo.email;
    console.log("after token validation", userInfo);
    next();
  } catch {
    console.log("invalid token");
    return res.status(401).send({ message: "unauthorized access" });
  }
};

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
    const db = client.db("secureJobBoard");
    const jobCollection = db.collection("alljobs");
    const catCollection = db.collection("allcategories");
    const userCollection = db.collection("registeredusers");
    //find all jobs
    app.get("/all-jobs", async (req, res) => {
      const result = await jobCollection.find().toArray(); //promise
      //console.log(result);
      res.send(result);
    });

    //find a specific job, search with id
    app.get("/job/:id", async (req, res) => {
      const { id } = req.params;
      //console.log(id);
      try {
        const result = await jobCollection.findOne({ _id: new ObjectId(id) }); //promise
        console.log(result);
        res.send(result); //result may be a valid object or null
      } catch (err) {
        res.send(err);
      }
    });

    //find jobs based on category

    app.get("/jobs-by-cat/:id", async (req, res) => {
      const { id } = req.params;
      console.log(id);
      try {
        const possible_sub_cats = await catCollection.findOne(
          { _id: new ObjectId(id) },
          { sub_categories: 1 }
        );
        console.log("sub categories: ", possible_sub_cats);
        const result = await jobCollection
          .find({
            $or: [
              { category: { $in: possible_sub_cats.sub_categories } }, // Documents where status is either "pending" or "rejected"
              { category: possible_sub_cats.super_category }, // Documents where category is
            ],
          })
          .toArray();
        res.send(result);
      } catch (err) {
        res.send(err);
      }
    });

    app.get("/top-jobs", async (req, res) => {
      const result = await jobCollection
        .find({
          category: {
            $in: [
              /data science/i,
              /educa/i, // Exact string match
              /fashion/i, // Another JavaScript regex object
              /busi/i,
              /arch/i,
              /k-12/i,
            ],
          },
        })
        .sort({ expectedSalary: -1 })
        .toArray(); //promise
      //console.log(result);
      const mid = Math.ceil(result.length / 2);
      const newResult = [
        result[0],
        result[2],
        result[mid + 3],
        result[result.length - 1],
        result[mid],
        result[mid - 3],
      ];
      //console.log(result.length);

      res.send(newResult);
    });

    app.get("/all-categories", async (req, res) => {
      const result = await catCollection.find().toArray(); //promise
      //console.log(result);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const newUser = req.body;
      console.log(newUser);
      const result = await userCollection.insertOne(newUser);
      res.send(result);
    });

    app.get("/jobs-added", async (req, res) => {
      console.log(req);
      const email = req.query.email;
      console.log(email);
      //const query = {};
      if (email) {
        //query.email = email;
        //console.log(query);
        const cursor = jobCollection.find({ emailOfPostedBy: email });
        const result = await cursor.toArray();
        console.log(result);
        res.send(result);
      } else {
        res.send({});
      }
    });

    app.post("/all-jobs", verifyFireBaseToken, async (req, res) => {
      const newJob = req.body;
      console.log(newJob);
      const result = await jobCollection.insertOne(newJob); //promise
      //console.log(result);
      res.send(result);
    });

    app.delete("/all-jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.deleteOne(query);
      res.send(result);
      console.log("Delete a job from DB");
    });

    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
      console.log("Delete a user from DB");
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});
