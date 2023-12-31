require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;


const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
}

app.use(cors(corsOptions))
app.use(express.json());


const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, meassage: 'unauthorized access' });
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, meassage: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pb98izq.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const dbConnect = async () => {
    try {
        client.connect();
        console.log("Database Connected Successfully✅");

    } catch (error) {
        console.log(error.name, error.message);
    }
}
dbConnect()



const clessesCollection = client.db('photography-school').collection('clesses');
const cartCollection = client.db('photography-school').collection('carts');
const usersCollection = client.db('photography-school').collection('users');


app.get('/', (req, res) => {
    res.send('summer is running')
});


app.post('/jwt', (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
    res.send({ token })
})


// varify admin warning 

const verifyAdmin = async (req, res, next) => {
    const email = req.decoded.email;
    const query = { email: email }
    const user = await usersCollection.findOne(query);
    if (user?.role !== 'Admin') {
        return res.status(403).send({ error: true, meassage: 'forbbiden meassage' })
    }
    next();
}

app.get('/clesses', async (req, res) => {
    const result = await clessesCollection.find().toArray();
    res.send(result)
})

app.get('/users', verifyJWT, async (req, res) => {
    const result = await usersCollection.find().toArray();
    res.send(result);
})

// user create  database 

app.post('/users', async (req, res) => {
    const user = req.body;

    const query = { email: user.email }
    const existingUser = await usersCollection.findOne(query)
    if (existingUser) {
        return res.send({ meassage: "user exists" })
    }
    const result = await usersCollection.insertOne(user);
    res.send(result)

})

// admin handle panel 

app.get('/users/admin/:email', verifyJWT, async (req, res) => {
    const email = req.params.email;

    if (req.decoded.email !== email) {
        res.send({ admin: false })
    }

    const query = { email: email }
    const user = await usersCollection.findOne(query);
    const result = { admin: user?.role === 'admin' }
    res.send(result)
})

app.patch('/users/admin/:id', async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) }
    const updateDoc = {
        $set: {
            role: 'admin'
        },
    };

    const result = await usersCollection.updateOne(filter, updateDoc);
    res.send(result)
});


// instructor panel 

app.patch('/users/instructor/:id', async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) }
    const updateDoc = {
        $set: {
            inst: 'instructor'
        },
    };

    const result = await usersCollection.updateOne(filter, updateDoc);
    res.send(result)
});
// cart collection

app.get('/carts', async (req, res) => {
    const email = req.query.email;
    // if (!email) {
    //     res.send([])
    // }

    // const decodedEmail = req.decoded.email;
    // if (email !== decodedEmail) {
    //     return res.status(403).send({ error: true, meassage: 'forbbiden access' })
    // }

    const query = { email: email };
    const result = await cartCollection.find(query).toArray();
    res.send(result);
});

app.post('/carts', async (req, res) => {
    const item = req.body;
    // console.log(item);
    const result = await cartCollection.insertOne(item);
    res.send(result)
});

app.delete('/carts/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) }
    const result = await cartCollection.deleteOne(query);
    res.send(result);
})

// create payment 

app.post('/create-payment-intent', async (req, res) => {
    const { price } = req.body;
    const amount = price * 100;
    // console.log(price);
    const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        current: 'usd',
        payment_methode_types: ['card']
    })
    res.send({
        clientSecret: paymentIntent.client_secret
    })
})







app.listen(port, () => {
    console.log(`summer port is running Port :${port}`);
})


