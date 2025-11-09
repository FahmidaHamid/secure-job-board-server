const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

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
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Programming Hero Assignment 10");
});

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
        console.log(possible_sub_cats);
        const result = await jobCollection
          .find({
            category: { $in: possible_sub_cats.sub_categories },
          })
          .toArray();
        res.send(result);
      } catch (err) {
        res.send(err);
      }
    });

    app.get("/all-categories", async (req, res) => {
      const result = await catCollection.find().toArray(); //promise
      //console.log(result);
      res.send(result);
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
